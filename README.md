# Part D Fieldnotes

An interactive portfolio project for exploring 2024 Medicare Part D prescriber patterns by geography and clinical specialty. The project is designed to grow through a semester of visualization assignments without accumulating a maze of disconnected pages.

## Current milestone

- Streams 1,416,883 provider records into a 427 KB browser-ready summary.
- Compares specialties through an interactive bubble field.
- Switches between cost/volume and focused drug-category lenses.
- Filters the complete experience by state, territory, or national view.
- Adds provider-level context without presenting cost as a quality ranking.
- Uses a static build that is compatible with GitHub Pages.

## Project map

```text
app/
  page.tsx                  Main experience and visualization logic
  globals.css               Shared visual theme and typography
public/data/
  prescriber-summary/       Browser-ready dataset and documentation
scripts/
  prepare_data.py           Repeatable CMS preprocessing pipeline
docs/
  PROJECT_DIRECTION.md      Research, task, and design rationale
.github/workflows/
  deploy-pages.yml          GitHub Pages deployment
```

The site currently stays in one main page on purpose. New assignments should improve or add coordinated views to the same exploration before creating another route.

## Work locally

The project uses Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal. Most edits happen in `app/page.tsx`; global color and type choices live in `app/globals.css`.

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

## Data interpretation

CMS suppresses some values between 1 and 10, including counter-suppression in some subgroups. The visualization excludes missing subgroup values, so reported opioid and antibiotic shares are conservative lower-bound estimates. Total drug cost combines amounts paid by Part D plans, beneficiaries, government subsidies, and third parties; it is not Medicare payment alone and excludes manufacturer rebates.

This public dataset is descriptive. It does not measure care quality and does not represent a provider's entire practice.
