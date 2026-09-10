# Part D Field Notes

An interactive portfolio project for exploring 2024 Medicare Part D prescriber patterns by geography and clinical specialty. The project is designed to grow through a semester of visualization assignments without accumulating a maze of disconnected pages.

## Current milestone

- Streams 1,416,883 provider records into a 608 KB browser-ready analysis file.
- Uses D3 scales for an interactive specialty scatterplot, median references, an equal-area state tile map, a ranked lollipop comparison, and provider distributions.
- Supports national, state, and territory exploration with keyboard-accessible marks and exact-value inspection.
- Includes a searchable inventory and classification of all 84 CMS source fields.
- Keeps the attached Canvas assignment evidence in a dedicated coursework route.
- Exports as a static site compatible with GitHub Pages.

## Project map

```text
app/
  page.tsx                  Main analytical narrative
  lab/page.tsx              Dataset profile and field inventory
  coursework/page.tsx       Canvas brief crosswalk and task analysis
  globals.css               Shared visual theme and typography
components/
  site-header.tsx           Shared navigation
lib/
  prescriber.ts             Shared data types and formatters
src/assignments/
  index.ts                  Starter-style assignment registry
  week-01/                  Live explorer and D3 visualizations
  week-02/                  Dataset lab assignment
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

The site is deliberately split into three routes: a portfolio-facing narrative, an inspectable data lab, and course evidence. New assignments can add a view or extend an existing route without turning the main story into a checklist.

## Work locally

The project uses Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal. Visualization logic lives in `components/analysis-charts.tsx`; global layout and type choices live in `app/globals.css`.

## Refresh the data

Download the current provider-level CSV from the [CMS dataset page](https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider), then run:

```bash
python3 scripts/prepare_data.py /path/to/provider-file.csv public/data/prescriber-summary/summary.json
```

The preprocessing script streams the source rather than loading the 750 MB file into memory. Keep the source CSV outside the repository; only commit the compact JSON result.

## Publish with GitHub Desktop

1. In GitHub Desktop, choose **File → Add local repository** and select this folder.
2. If prompted, create a repository here, then publish it to GitHub.
3. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Push to `main`. The included workflow builds and publishes the static site.

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
