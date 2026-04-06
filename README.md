# Code Per Day

A GitHub Action that generates beautiful SVG charts showing your daily code additions and deletions. Embed them in your profile README for a visual breakdown of your coding activity.

Uses the GitHub GraphQL API to fetch commit data across all repositories you've contributed to — including private repos when you provide a PAT with `repo` scope. **Only additions and deletions counts are exposed — no file names, repo names, or code content.**

## Preview

| Dark | Tokyo Night | Dracula |
|------|-------------|---------|
| ![dark](https://raw.githubusercontent.com/mpge/code-per-day/main/examples/code-per-day-dark.svg) | ![tokyonight](https://raw.githubusercontent.com/mpge/code-per-day/main/examples/code-per-day-tokyonight.svg) | ![dracula](https://raw.githubusercontent.com/mpge/code-per-day/main/examples/code-per-day-dracula.svg) |

## Quick Start

### 1. Create a Personal Access Token

Go to [GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/tokens?type=beta) and create a token with:
- **Repository access**: All repositories (for private repo support) or just public
- **Permissions**: Contents (read-only), Metadata (read-only)

> For classic tokens, select the `repo` scope (or `public_repo` for public-only).

### 2. Add the secret

In your profile repository (`username/username`), go to **Settings > Secrets and variables > Actions** and add a new secret named `CPD_TOKEN` with your PAT.

### 3. Add the workflow

Create `.github/workflows/code-per-day.yml` in your profile repo:

```yaml
name: Code Per Day

on:
  schedule:
    - cron: "0 4 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: mpge/code-per-day@v1
        with:
          github_token: ${{ secrets.CPD_TOKEN }}
          theme: dark
          period: "30"
          output_path: ./code-per-day
          all_themes: "false"

      - name: Commit
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add code-per-day/
          git diff --cached --quiet || (git commit -m "chore: update code-per-day" && git push)
```

### 4. Embed in your README

```markdown
![Code Per Day](./code-per-day/code-per-day-dark.svg)
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `github_token` | *required* | GitHub PAT. Use `repo` scope for private repos. |
| `username` | authenticated user | GitHub username to generate charts for |
| `theme` | `dark` | Theme name (see below) |
| `period` | `30` | Number of days to chart (30, 90, 365) |
| `output_path` | `./code-per-day` | Output directory for SVG files |
| `all_themes` | `false` | Generate an SVG for every built-in theme |
| `chart_type` | `bars` | Chart style: `bars` or `area` |
| `animations` | `true` | Enable CSS entrance animations |

## Themes

| Theme | Description |
|-------|-------------|
| `dark` | GitHub dark default |
| `light` | Clean light theme |
| `dracula` | Dracula color scheme |
| `tokyonight` | Tokyo Night palette |
| `nord` | Nord color palette |
| `ocean` | Deep blue ocean tones |
| `sunset` | Warm purple/orange gradients |
| `forest` | Green forest tones |
| `midnight` | Deep navy midnight |
| `radical` | Vibrant pink/yellow neon |
| `transparent` | Transparent background (works on any surface) |
| `github-dark` | GitHub's native dark theme colors |

Use `all_themes: "true"` to generate all themes at once, then pick the one you like.

## Privacy

This action only reads **commit additions and deletions counts** through the GitHub GraphQL API. It does **not** expose:
- Repository names or URLs
- File paths or names
- Code content or diffs
- Commit messages

The generated SVG contains only aggregated numerical data (total additions/deletions per day) and your username.

## Chart Types

### Bars (default)
Vertical bars — additions rise above the baseline, deletions fall below.

### Area
Smooth filled area chart with the same above/below layout.

## License

MIT
