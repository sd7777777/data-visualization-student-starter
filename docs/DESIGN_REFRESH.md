# Design and interaction refresh — September 26, 2026

Local-only development. Nothing in this refresh has been committed, pushed, published, or submitted to Canvas.

## Reading experience

The page uses a light neutral background, dark ink, white chart surfaces, and consistent purple, blue, teal, magenta, and small gold accents. Typography stays within Arial/Helvetica. More space separates chapters, controls, figures, and explanations. The main scatterplot now gets the full reading width; its inspected-specialty details sit below it instead of squeezing the plot.

Three opening questions lead to concentration, place comparison, or data quality. Weekly source links remain available in the collapsible coursework trail and in their original page sections. A sticky, horizontally scrollable chapter navigator marks the current section. Its passive scroll listener batches geometry checks into one animation frame; it has no timer or scrolling state that rerenders every chart.

The design layer is `app/explorer-refresh.css`, scoped to `.explorer-refresh`. Earlier styles and weekly chart implementations are retained. It includes small hover responses, short chart-entry transitions, and progressive scroll-linked chapter animation where supported. Reduced-motion preferences disable decorative motion; animations do not represent time trends.

## New analytical interaction

The two-place comparison has two display choices:

- **Compare values:** the existing common-scale dumbbell plot of differences from each specialty's national benchmark.
- **Compare ranks:** a paired rank ladder, ordered by the selected raw measure in each place. Hover, focus, or select a specialty to follow its connecting line. Selecting one updates the distribution and matrix; the explicit distribution link takes the reader there without unexpected jumps while selecting.

Rank 1 means the largest value, not better quality. Only specialties passing the threshold in both places enter the ranking. Search/group filters can change rank. Tied values have a deterministic alphabetical order, disclosed below the chart. Missing values are never zero-filled. A short data-driven statement identifies the largest rank change. The view has keyboard-operable SVG marks and exact-value accessible labels.

The distribution also has a **Next specialty** control for browsing without repeatedly opening the menu. Its scales and collision layout are memoized, so hovering a dot does not repack the layout. Rank calculations are memoized independently of hover state. The readability pass adds the official FontAwesome Free solid icon package; icons are bundled SVGs with text labels and do not require a remote font service.

## Portability

The build configuration now treats `.openai/hosting.json` and the Sites build plugin as optional. A source ZIP or plain checkout without the old hosting metadata can build for GitHub Pages. The GitHub Pages workflow and repository-path transformation remain intact. The existing project still uses React, TypeScript, vinext/Vite, D3, and static export.

## Checks

- `node scripts/check_geography.mjs`: 660 no-overlap distribution layouts; 3,060 rank comparisons across state, measure, and threshold combinations; swap symmetry; alphabetical ties; empty results; coverage and CSV guards.
- `node scripts/check_interaction.mjs`: brush geometry, weighted group calculations, and all 63 source geographies.
- TypeScript and targeted lint checks for the new modules.
- Browser checks: rank selection with Enter, linked distribution updates, switching modes, next-specialty navigation, empty filtered results, scroll navigation, and 390px screen width without page overflow.
- Static production build, plus a portable source-copy build without local hosting metadata.

The original project has existing repository-wide lint findings, including older SVG accessibility-rule false positives and legacy markup. Targeted checks of the new modules do not imply that the entire historical codebase is lint-clean. End-user usability validation remains proposed, not completed.

## Safari desktop readability pass

Small-multiple charts now stack at full reading width, with generous separation between figures. The previous half-width SVGs reduced labels to roughly 7–8 screen pixels. Shared chart labels now render at about 18px at the desktop reading width; chart titles, controls, exact values, captions, and supporting notes are enlarged too. SVG gutters and rank-row spacing accommodate the larger text. Arial/Helvetica and the existing semantic colors remain.

Each chart keeps a readable minimum width on smaller screens and scrolls inside its own focusable viewport, with a visible scroll instruction. Interactive chart groups expose their marks to assistive technology, and Enter/Space activate specialty selections. Explicit linked-view scrolling respects reduced-motion preferences. FontAwesome Free icons identify downloads, inspection, grouping, reset, swapping, browsing, and comparison modes; visible text or an accessible name carries each action.

The interpretation, metric definitions, suppression handling, assignment history, and data remain unchanged. Local source downloads are refreshed after verification.

Verified locally after the readability pass: native Safari desktop, 390px page width without overflow, no overlapping or clipped labels in the default charts and rank view, Enter/Space linked selection, scale and zoom switching, empty-result reset, group handoff, and an actual 102-row CSV download for two specialties across 51 places. Calculation checks, TypeScript, targeted lint, and the static build passed.


## Icons and scroll motion

FontAwesome now provides visual cues across the header, opening question cards, dataset summary, all nine chapters, and the comparison workspace. The opening icon trail has a brief, finite animation. Cards lift and tilt their icons on hover or keyboard focus. A gradient reading-progress line tracks the page beneath the sticky chapter navigation.

`components/scroll-reveals.tsx` uses IntersectionObserver and the Web Animations API for one-time, staggered entrances. Content remains visible if motion is disabled or these APIs are unavailable. The observer disconnects and active entrance animations cancel when reduced motion is enabled; native anchor scrolling also respects the preference. Reveals do not alter chart data geometry.

Verified: TypeScript, lint for the changed supporting components, existing interaction/geography checks, production export, desktop and 390px layout without page overflow, chapter navigation/progress, chart lens switching, and no browser console errors in that review. The main page still has five existing lint findings concerning legacy table roles and download links.

### Interactive discovery pass — September 26, 2026

- Added an icon-led question panel for cost, claims, and drug mix. Its candidate and value are computed from the current geography's displayed specialties; Show in chart selects that specialty, applies the matching lens, and resets zoom.
- Added Next specialty and Surprise me actions to the inspection panel, plus a direct link to its clinical mix. These actions keep comparison groups intact.
- Dataset totals expand to explain their definitions. Added icons to chart controls, metric tabs, and inspected values.
- Added brief result, value, disclosure, and selection animations, with hover/press feedback. Existing reduced-motion rules disable all new animation and transitions.
- Verified keyboard activation, question-to-chart handoff, specialty browsing, disclosures, desktop layout, and a 390px viewport with no page overflow. TypeScript, interaction checks, 3,060 rank comparisons, 660 geography layouts, and the static build passed. Screenshot: `../../review/interaction-refresh/explore-lenses.png` in the handoff folder.
