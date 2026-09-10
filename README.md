# Medicare Part D Prescriber Explorer

An interactive, one-page exploration of 2024 Medicare Part D prescriber patterns by geography and clinical specialty.

## Current milestone

- Streams 1,416,883 provider records into a 608 KB browser-ready analysis file.
- Uses D3 scales and SVG for 12 views covering relationships, concentration, composition, clinical mix, geography, distributions, field types, and missingness.
- Supports national, state, and territory exploration with keyboard-accessible marks and exact-value inspection.
- Keeps every public visualization and control on one page.
- Exports as a static site compatible with GitHub Pages.

## Project map

```text
app/
  page.tsx                  One-page explorer entry point
  globals.css               Shared visual theme and typography
components/
  site-header.tsx           Shared navigation
lib/
  prescriber.ts             Shared data types and formatters
src/assignments/
  index.ts                  Starter-style assignment registry
  week-01/                  Live explorer and D3 visualizations
  week-02/                  Data preparation assignment source
  week-03/                  First Visual export and documentation
public/data/
  prescriber-summary/       Browser-ready dataset and documentation
scripts/
  prepare_data.py           Repeatable CMS preprocessing pipeline
docs/
  PROJECT_DIRECTION.md      Research, task, and design rationale
.github/workflows/
  deploy-pages.yml          GitHub Pages deployment
```

The public site is one page. Assignment source folders remain separate so new work can be added without mixing preprocessing, charts, and page layout.

## Canvas assignment map

- **Week 1 — Repository Setup:** the page shell, starter-compatible source structure, downloadable files, and GitHub Pages workflow.
- **Week 2 — Load & Summarize a Dataset:** the dataset strip near the top and the data-quality section, including row/column counts, attribute classifications, distributions, missingness, browser-ready JSON, and dataset README.
- **Week 3 — First Visual:** Figure 01, an interactive D3 scatterplot connecting specialty-level prescribing volume with cost or reported drug-category share.
- **Project extensions:** Figures 02–12 continue the same dataset story. They are labeled separately so they are not confused with the three graded milestones.

## Work locally

The project uses Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal. Visualization logic lives in `src/assignments/week-01/analysis-charts.tsx`; global layout and type choices live in `app/globals.css`.

## Refresh the data

Download the current provider-level CSV from the [CMS dataset page](https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider), then run:

```bash
python3 scripts/prepare_data.py /path/to/provider-file.csv public/data/prescriber-summary/summary.json
```

The preprocessing script streams the source rather than loading the 750 MB file into memory. Keep the source CSV outside the repository; only commit the compact JSON result.

## Publish with GitHub Desktop

1. Fork [Curran's student starter](https://github.com/curran/data-visualization-student-starter) on GitHub.
2. In GitHub Desktop, choose **File → Add local repository** and select this project folder.
3. Point the repository's primary remote to your fork, then push `main`.
4. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.

The site header also provides a ZIP download of the tracked source files. Using the existing local folder in GitHub Desktop is preferable because it preserves the starter's Git history.

For a project repository, the deployment workflow adds the repository name to exported asset paths. User sites named `username.github.io` stay at the domain root.

### Canvas: Repository Setup and starter fork

The attached Week 1 brief asks for a fork of [Curran's student starter](https://github.com/curran/data-visualization-student-starter), a modified `src/assignments/week-01`, a working GitHub Pages URL, and a short screenshot/link/write-up shared in Discord and Canvas. The live explorer and D3 source now reside in that required directory, later assignments have their own directories, and `src/assignments/index.ts` is the assignment registry.

The local Git branch also contains the starter's upstream history. This means it can be pushed as a fast-forward update after you create the actual fork on GitHub. The visible “forked from” badge can only be created by GitHub, so do not publish this as an unrelated new repository if that relationship is being graded. See `docs/STARTER_FORK_HANDOFF.md` for the exact handoff.

After connecting this branch to your fork and enabling Pages, submit:

1. Your GitHub repository URL.
2. The GitHub Pages URL created by the workflow.
3. A screenshot and brief description of the interactive Medicare Part D analysis.

The site does not invent the first two URLs because they depend on your GitHub account and fork name.

## Data interpretation

CMS suppresses some values between 1 and 10, including counter-suppression in some subgroups. The visualization excludes missing subgroup values, so reported opioid and antibiotic shares are conservative lower-bound estimates. Total drug cost combines amounts paid by Part D plans, beneficiaries, government subsidies, and third parties; it is not Medicare payment alone and excludes manufacturer rebates.

This public dataset is descriptive. It does not measure care quality and does not represent a provider's entire practice.
