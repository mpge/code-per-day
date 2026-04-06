// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT

const { graphql } = require("@octokit/graphql");

/**
 * Create an authenticated graphql client.
 */
function createClient(token) {
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

/**
 * Get the authenticated user's login and numeric ID.
 */
async function getAuthenticatedUser(gql) {
  const { viewer } = await gql(`{
    viewer { login id databaseId }
  }`);
  return viewer;
}

/**
 * Get repositories the user contributed to within a date range.
 * Uses contributionsCollection so it includes private repos the token can see.
 */
async function getContributedRepos(gql, login, from, to) {
  const repos = [];
  let hasNext = true;
  let cursor = null;

  // contributionsCollection.commitContributionsByRepository caps at 100
  const { user } = await gql(
    `query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          commitContributionsByRepository(maxRepositories: 100) {
            repository {
              nameWithOwner
              owner { login }
              name
              defaultBranchRef { name }
              isPrivate
            }
            contributions { totalCount }
          }
        }
      }
    }`,
    { login, from: from.toISOString(), to: to.toISOString() }
  );

  for (const entry of user.contributionsCollection.commitContributionsByRepository) {
    if (!entry.repository.defaultBranchRef) continue; // skip empty repos
    repos.push({
      owner: entry.repository.owner.login,
      name: entry.repository.name,
      nameWithOwner: entry.repository.nameWithOwner,
      branch: entry.repository.defaultBranchRef.name,
      isPrivate: entry.repository.isPrivate,
      totalCommits: entry.contributions.totalCount,
    });
  }

  return repos;
}

/**
 * Fetch commit additions/deletions for a single repo, filtered to the given author.
 * Pages through all results within the date range.
 */
async function getRepoCommitStats(gql, owner, name, since, authorId) {
  const commits = [];
  let hasNext = true;
  let cursor = null;

  while (hasNext) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const query = `query($owner: String!, $name: String!, $since: GitTimestamp!, $authorId: ID!) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(since: $since, author: { id: $authorId }, first: 100${afterClause}) {
                nodes {
                  additions
                  deletions
                  committedDate
                  message
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      }
    }`;

    try {
      const result = await gql(query, {
        owner,
        name,
        since: since.toISOString(),
        authorId,
      });

      const history = result.repository?.defaultBranchRef?.target?.history;
      if (!history) break;

      for (const node of history.nodes) {
        commits.push({
          additions: node.additions,
          deletions: node.deletions,
          date: node.committedDate,
        });
      }

      hasNext = history.pageInfo.hasNextPage;
      cursor = history.pageInfo.endCursor;
    } catch (err) {
      // Silently skip repos we can't access (token scope issues)
      console.warn(`  Skipping ${owner}/${name}: ${err.message}`);
      break;
    }
  }

  return commits;
}

/**
 * Main entry: fetch all commit data for the user across contributed repos.
 * Returns raw array of { additions, deletions, date } objects.
 */
async function fetchAllCommitData(token, username, days) {
  const gql = createClient(token);

  // Resolve user
  let login, id;
  if (username) {
    const { user } = await gql(
      `query($login: String!) { user(login: $login) { login id } }`,
      { login: username }
    );
    login = user.login;
    id = user.id;
  } else {
    const viewer = await getAuthenticatedUser(gql);
    login = viewer.login;
    id = viewer.id;
  }

  console.log(`Fetching data for @${login} (last ${days} days)`);

  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - days);

  // Also fetch a full year for yearly average calculation
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const fetchSince = days >= 365 ? since : yearAgo;

  const repos = await getContributedRepos(gql, login, fetchSince, now);
  console.log(`Found ${repos.length} repositories with contributions`);

  const allCommits = [];
  for (const repo of repos) {
    console.log(`  Fetching ${repo.nameWithOwner} (${repo.totalCommits} commits)...`);
    const commits = await getRepoCommitStats(gql, repo.owner, repo.name, fetchSince, id);
    allCommits.push(...commits);
  }

  console.log(`Total commits fetched: ${allCommits.length}`);
  return { login, commits: allCommits, since, now, yearAgo };
}

module.exports = { fetchAllCommitData };
