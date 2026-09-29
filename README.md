# Medicare Part D Prescriber Explorer

An interactive, one-page exploration of 2024 Medicare Part D prescriber patterns by geography and clinical specialty.

## Current interface

A connected research workspace for exploring CMS 2024 data. The opening geography selector leads directly to the specialty scatterplot. Wonder lab offers ten illustrated chart choices, with filters for geography, spending, and ranking questions. Compare places links a comparison finder, specialty/state matrix, distribution, paired values or ranks, and a portable field notebook.

## Current capabilities

- Explore 63 source geographies, up to 32 leading specialties per geography, and state profiles for 18 national specialties.
- Inspect one specialty or build a group with rectangular brushing or a keyboard-accessible checkbox picker.
- Find similar places or larger contrasts using equally weighted specialty gaps. Rankings require the same complete comparison set in every candidate; missing values never become zero.
- Carry a suggested place and its largest specialty gap into the existing linked charts. Open the finder directly from a specialty inspection or Search.
- Copy a comparison link that restores places, measure, record threshold, territory scope, group, search, ordering, inspected specialty, and chart mode. Links work at a GitHub Pages repository path; local preview links remain local.
- Capture fixed evidence, save up to 40 browser-local discoveries, reopen a saved comparison, and export text, PNG cards, or portable JSON backups. Import previews merge without overwriting existing discoveries and skip duplicate content.
- Read exact values and coverage with large chart labels, independent chart scrolling, keyboard controls, and reduced-motion support.
- Keep coursework history, the optional guided overview, Task Analysis, Validation, and data limitations on the same page.

See [research workflow notes](docs/RESEARCH_WORKFLOW.md) for the new calculations, restoration rules, and verification. No data service or new dependency was added in this round.

## Project map

```text
app/
  page.tsx                  One-page explorer entry point
  globals.css               Shared visual theme and typography
  geography-studio.css      Linked comparison workspace styling
  explorer-refresh.css      Editorial design layer, spacing, and motion
components/
  site-header.tsx           Shared navigation
  reading-nav.tsx           Active chapter navigation
  analysis/geography-studio.tsx  Heatmap, distribution, and paired comparison
  analysis/rank-ladder.tsx   Alternate place-to-place specialty ranking
lib/
  prescriber.ts             Shared data types and formatters
  geography-analysis.ts     Pure metric, layout, coverage, and CSV functions
src/assignments/
  index.ts                  Starter-style assignment registry
  week-01/                  Live explorer and D3 visualizations
  week-02/                  Data preparation assignment source
  week-03/                  First Visual export and documentation
  week-04/                  Legibility revision of the first visual
  week-05/                  Group selection and linked comparison
  week-06/                  Project V1 guided comparison workflow
public/data/
  prescriber-summary/       Browser-ready dataset and documentation
scripts/
  prepare_data.py           Repeatable CMS preprocessing pipeline
  check_geography.mjs       Layout, calculation, coverage, and CSV tests
docs/
  PROJECT_DIRECTION.md      Research, task, and design rationale
  GEOGRAPHY_WORKSPACE.md     New comparison design and implementation notes
  assets/                   Actual screenshots and a north-star sketch
.github/workflows/
  deploy-pages.yml          GitHub Pages deployment
```

The public site is one page. Assignment source folders remain separate so new work can be added without mixing preprocessing, charts, and page layout.

## Canvas assignment map

- **Week 1 — Repository Setup:** the page shell, starter-compatible source structure, downloadable files, and GitHub Pages workflow.
- **Week 2 — Load & Summarize a Dataset:** the dataset strip near the top and the data-quality section, including row/column counts, attribute classifications, distributions, missingness, browser-ready JSON, and dataset README.
- **Week 3 — First Visual:** Figure 01, an interactive D3 scatterplot connecting specialty-level prescribing volume with cost or reported drug-category share.
- **Week 4 — Legibility and Validation:** a preserved copy of the first visual, improved axes and chart title, linear/log scale comparison, selected-point zoom, hover-only labeling, and a four-level validation plan.
- **Week 5 — Interaction and Updated Sketches:** a new copy of Week 4 adds rectangle selection, keyboard/touch selection by name, linked exact-value comparison, and weighted group summaries. The [updated proposal](docs/PROJECT_DIRECTION.md) includes screenshots and a new end-of-course sketch.
- **Week 6 — Project V1:** [guided comparison workflow](src/assignments/week-06/README.md) with three starting questions, linked geographic views, and a field notebook. [Open Week 6](https://sd7777777.github.io/data-visualization-student-starter/#week-6). The [project document](docs/PROJECT_DIRECTION.md) now distinguishes the implemented workflow from future evaluation.
- **Project extensions:** Figures 02–13 continue the same dataset story and are labeled separately from the weekly milestones. The [linked geography workspace](docs/GEOGRAPHY_WORKSPACE.md) replaces the earlier tile map and ranked-state view; their source remains preserved.

## Work locally

The project uses Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal. The original visualization logic lives in `src/assignments/week-01/analysis-charts.tsx`; the current first chart lives in `src/assignments/week-05/InteractionScatter.tsx`. Week 4 remains unchanged in its own directory. Global layout and type choices live in `app/globals.css`.

## Refresh the data

Run `pnpm check` for all nine calculation/persistence suites and TypeScript, then `pnpm build` for the static export. The interaction checks cover brushing geometry, weighted calculations, and all 63 geographies. Geography checks verify metric definitions, CSV escaping and coverage, and 660 deterministic distribution layouts with no dot overlaps or horizontal-value changes. Browser checks should also cover selection by mouse and keyboard, switching scales, geography reset, group handoff, CSV download, and narrow-screen horizontal scrolling.

Download the current provider-level CSV from the [CMS dataset page](https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider), then run:

```bash
python3 scripts/prepare_data.py /path/to/provider-file.csv public/data/prescriber-summary/summary.json
```

The preprocessing script streams the source rather than loading the 750 MB file into memory. Keep the source CSV outside the repository; only commit the compact JSON result.

## Publish with GitHub Desktop

The repository is already connected to [your starter fork](https://github.com/sd7777777/data-visualization-student-starter), and [GitHub Pages](https://sd7777777.github.io/data-visualization-student-starter/) is enabled. Open this folder in GitHub Desktop, review changes, commit, and push `main`; the Pages workflow builds and deploys automatically.

The site header also provides a ZIP download of the current source files, including uncommitted work. This ZIP does not include Git history or installed dependencies. A handoff folder copied with `.git` does retain the starter's history; use only one working copy going forward to avoid divergent edits.

For a project repository, the deployment workflow adds the repository name to exported asset paths. User sites named `username.github.io` stay at the domain root.

### Canvas: Repository Setup and starter fork

The attached Week 1 brief asks for a fork of [Curran's student starter](https://github.com/curran/data-visualization-student-starter), a modified `src/assignments/week-01`, a working GitHub Pages URL, and a short screenshot/link/write-up shared in Discord and Canvas. The live explorer and D3 source now reside in that required directory, later assignments have their own directories, and `src/assignments/index.ts` is the assignment registry.

The repository is already a fork of Curran’s starter and retains its upstream history. Continue committing to this fork in GitHub Desktop; there is no need to create another repository. `docs/STARTER_FORK_HANDOFF.md` preserves the initial setup notes.

Project links:

1. [GitHub repository](https://github.com/sd7777777/data-visualization-student-starter)
2. [Hosted explorer](https://sd7777777.github.io/data-visualization-student-starter/)
3. [Updated project proposal](docs/PROJECT_DIRECTION.md)

## Data interpretation

The scatterplot retains up to 32 highest-total-cost specialties in each geography. Membership changes by geography; displayed correlations describe that subset. Group ratios divide summed measures, and group cost share uses the full geography total. State profiles cover the top 18 national specialties. Provider detail is limited to ten highest-cost records per geography.

CMS suppresses some values between 1 and 10, including counter-suppression in some subgroups. The visualization excludes missing subgroup values, so reported opioid and antibiotic shares are conservative lower-bound estimates. Total drug cost combines amounts paid by Part D plans, beneficiaries, government subsidies, and third parties; it is not Medicare payment alone and excludes manufacturer rebates.

This public dataset is descriptive. It does not measure care quality and does not represent a provider's entire practice.

## Design and implementation history

Earlier implementation notes document the development of the current explorer. Some screenshots and descriptions show previous layouts:

- [Wonder lab](docs/WONDER_LAB.md): ten alternative visual encodings and their calculation limits.
- [Geography workspace](docs/GEOGRAPHY_WORKSPACE.md): shared national benchmarks, coverage, and linked comparison logic.
- [Field notebook](docs/FIELD_NOTEBOOK.md): fixed evidence, PNG cards, and local persistence.
- [Discovery tools](docs/DISCOVERY_TOOLS.md): state geometry, local search, and licensing.
- [Guided story](docs/SCROLL_STORY.md): dot accounting and scroll-driven narrative.
- [Workspace refinement](docs/WORKSPACE_REFINEMENT.md): compact layout, navigation fixes, and browser checks.
- [Design refresh](docs/DESIGN_REFRESH.md) and [field design](docs/FIELD_DESIGN.md): earlier visual directions.
