# Workspace refinement — September 28, 2026

This pass makes the existing one-page explorer more direct. The data, analytical calculations, ten alternative chart modes, notebook, and coursework source history remain available.

## Interface

- A compact title, geography picker, four totals, and source caveat replace the photo-led opening, repeated statistics, question cards, and discovery prompts.
- The first chart controls now begin about 610px down a 1440px desktop viewport, previously about 5,057px. The closed-overview page is roughly 28% shorter in the checked layout.
- Maps and charts use a labeled native selector instead of ten large cards. Titles describe the comparison or encoding.
- Compare places follows the map section. The sticky navigation follows the same section order.
- The guided overview and coursework links live in expandable sections near the end. Resources and search still reach them directly. Tasks and Validation remain at the end.
- Headings, controls, borders, spacing, and selected states use the shared sans-serif and teal visual system. Decorative scroll reveals and photo transitions no longer run on the main page.

## Fixes

- Active tab styling now matches Base UI's actual `data-active` attribute.
- Geography and distribution menus show full labels immediately, including on first load.
- Geography changes reset zoom and discard an unavailable specialty selection, so returning to an earlier geography does not unexpectedly restore it.
- Section navigation opens enclosing disclosures before scrolling and moving keyboard focus. Initial deep links, search destinations, repeated same-hash links, and Week 4/5 links all work.
- The chapter tracker ignores content inside closed disclosures and updates on disclosure changes.
- Resources closes on Escape, outside clicks, and internal navigation.
- Provider records use a native table with labeled headers. All four columns remain available on phones via a keyboard-scrollable region.
- Chart instructions name the colors actually used by the current palette.

## Verification

All eight data/calculation suites, TypeScript, production export, and lint on changed interface modules were checked. `scripts/check_workspace_browser.mjs` exercises chart modes, active tabs, geography and zoom changes, group handoff, map/territory navigation, fuzzy search, optional-content links, menu dismissal, notebook persistence, actual CSV export, four screen widths, and mobile keyboard scrolling. It uses an isolated browser context, so it does not modify the user's saved notes.

To run browser checks with Playwright installed:

```sh
BASE_URL=http://localhost:3014/ node scripts/check_workspace_browser.mjs
```

Optional `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and `SCREENSHOT_DIR` variables support an external Playwright installation, a local Chrome executable, and screenshot output. The current review screenshots are in the handoff's `review/refinement/` folder.

These changes are local and uncommitted. Nothing has been published.

## Restored creative visualization choices — September 28

The compact selector hid the discoverability and original names of the ten Wonder lab views. Restored the visible choice cards and Wonder lab chapter label while retaining the dropdown. Cards open and focus their chart, with a visible selected state and keyboard focus outline. Original names also appear in search; descriptive names remain searchable aliases. Layout uses three columns on desktop, two on tablets, and one on phones.

Verified all ten chart renders and selected states, keyboard activation and destination focus, dropdown synchronization, both search naming schemes, and layouts at 320, 390, 768, and 1440px without page overflow. TypeScript and production export passed. Screenshots are in `../../review/restored-visualizations/`. Data calculations are unchanged.
