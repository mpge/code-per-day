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
 * Check if a commit was authored by the given user.
 * Matches by node ID, login, email (including noreply), or name.
 */
function isCommitByAuthor(commitAuthor, authorId, authorLogin) {
  if (!commitAuthor) return false;

  // Match by GitHub user node ID
  if (commitAuthor.user?.id === authorId) return true;

  // Match by GitHub login
  if (commitAuthor.user?.login === authorLogin) return true;

  // Match by email containing the login (e.g. squash merge committer email)
  if (commitAuthor.email && commitAuthor.email.includes(authorLogin)) return true;

  // Match GitHub noreply email pattern: {id}+{login}@users.noreply.github.com
  const noreplyPattern = new RegExp(`\\b${authorLogin}@users\\.noreply\\.github\\.com$`, 'i');
  if (commitAuthor.email && noreplyPattern.test(commitAuthor.email)) return true;

  // Match by git author name (fallback for some bot/action commits)
  if (commitAuthor.name === authorLogin) return true;

  return false;
}

/**
 * Fetch commit additions/deletions for a single repo.
 * Fetches all commits (no server-side author filter) and filters client-side
 * to catch squash merges, web UI commits, and other edge cases.
 */
async function getRepoCommitStats(gql, owner, name, since, authorId, authorLogin) {
  const commits = [];
  let hasNext = true;
  let cursor = null;

  while (hasNext) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const query = `query($owner: String!, $name: String!, $since: GitTimestamp!) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(since: $since, first: 100${afterClause}) {
                nodes {
                  additions
                  deletions
                  committedDate
                  message
                  author {
                    user { login id }
                    email
                    name
                  }
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
      });

      const history = result.repository?.defaultBranchRef?.target?.history;
      if (!history) break;

      for (const node of history.nodes) {
        if (isCommitByAuthor(node.author, authorId, authorLogin)) {
          commits.push({
            additions: node.additions,
            deletions: node.deletions,
            date: node.committedDate,
          });
        }
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
 * Fetch merged PRs authored by the user and collect their additions/deletions.
 * This catches contributions from squash-merged PRs that may not appear as
 * commits authored by the user on the default branch.
 */
async function getPullRequestStats(gql, login, since) {
  const prs = [];
  let hasNext = true;
  let cursor = null;
  const sinceDate = since.toISOString().slice(0, 10);

  while (hasNext) {
    const searchQuery = `author:${login} type:pr is:merged merged:>=${sinceDate}`;

    try {
      const result = await gql(
        `query($searchQuery: String!, $cursor: String) {
          search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
            nodes {
              ... on PullRequest {
                additions
                deletions
                mergedAt
                repository { nameWithOwner }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`,
        { searchQuery, cursor }
      );

      for (const node of result.search.nodes) {
        if (node.mergedAt) {
          prs.push({
            additions: node.additions,
            deletions: node.deletions,
            date: node.mergedAt,
            repo: node.repository?.nameWithOwner,
          });
        }
      }

      hasNext = result.search.pageInfo.hasNextPage;
      cursor = result.search.pageInfo.endCursor;
    } catch (err) {
      console.warn(`  Skipping PR search: ${err.message}`);
      break;
    }
  }

  return prs;
}

/**
 * Fetch the contribution calendar (green squares) which includes ALL
 * contributions across all branches, PRs, and repos.
 * Returns a Map<string, number> of date -> contribution count.
 */
async function getContributionCalendar(gql, login, from, to) {
  const { user } = await gql(
    `query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }`,
    { login, from: from.toISOString(), to: to.toISOString() }
  );

  const calendar = new Map();
  for (const week of user.contributionsCollection.contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      calendar.set(day.date, day.contributionCount);
    }
  }
  return calendar;
}

/**
 * Merge PR stats with commit stats, avoiding double-counting.
 * For each date, take the maximum of commit-based and PR-based totals.
 */
function mergeCommitAndPRStats(commits, prStats) {
  // Group commits by date
  const commitsByDate = new Map();
  for (const c of commits) {
    const dateKey = c.date.slice(0, 10);
    if (!commitsByDate.has(dateKey)) {
      commitsByDate.set(dateKey, { additions: 0, deletions: 0 });
    }
    const entry = commitsByDate.get(dateKey);
    entry.additions += c.additions;
    entry.deletions += c.deletions;
  }

  // Group PRs by merge date
  const prsByDate = new Map();
  for (const pr of prStats) {
    const dateKey = pr.date.slice(0, 10);
    if (!prsByDate.has(dateKey)) {
      prsByDate.set(dateKey, { additions: 0, deletions: 0 });
    }
    const entry = prsByDate.get(dateKey);
    entry.additions += pr.additions;
    entry.deletions += pr.deletions;
  }

  // Merge: for each date, take the max of commits vs PR totals
  // This avoids double-counting while capturing missed contributions
  const allDates = new Set([...commitsByDate.keys(), ...prsByDate.keys()]);
  const merged = [];

  for (const dateKey of allDates) {
    const commitData = commitsByDate.get(dateKey) || { additions: 0, deletions: 0 };
    const prData = prsByDate.get(dateKey) || { additions: 0, deletions: 0 };

    merged.push({
      additions: Math.max(commitData.additions, prData.additions),
      deletions: Math.max(commitData.deletions, prData.deletions),
      date: `${dateKey}T12:00:00Z`,
    });
  }

  return merged;
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

  // Fetch contribution calendar (for accurate streak counting)
  const calendar = await getContributionCalendar(gql, login, yearAgo, now);
  console.log(`Contribution calendar: ${calendar.size} days loaded`);

  const repos = await getContributedRepos(gql, login, fetchSince, now);
  console.log(`Found ${repos.length} repositories with contributions`);

  // Fetch commit stats from each repo (client-side author filtering)
  const allCommits = [];
  for (const repo of repos) {
    console.log(`  Fetching ${repo.nameWithOwner} (${repo.totalCommits} commits)...`);
    const commits = await getRepoCommitStats(gql, repo.owner, repo.name, fetchSince, id, login);
    allCommits.push(...commits);
  }

  console.log(`Total commits fetched: ${allCommits.length}`);

  // Fetch merged PR stats to capture squash-merged contributions
  console.log(`Fetching merged PRs for @${login}...`);
  const prStats = await getPullRequestStats(gql, login, fetchSince);
  console.log(`Total merged PRs fetched: ${prStats.length}`);

  // Merge commit and PR data, deduplicating by date
  const mergedData = mergeCommitAndPRStats(allCommits, prStats);
  console.log(`Total daily entries after merge: ${mergedData.length}`);

  return { login, commits: mergedData, since, now, yearAgo, calendar };
}

module.exports = { fetchAllCommitData };
