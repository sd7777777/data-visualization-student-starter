# Linked geography workspace

Local development extension, September 26, 2026. This document does not imply that the extension has been published or submitted for a course assignment.

## Three questions, three views

1. **Where do specialties differ from their national values?** A specialty-by-place matrix shows regional patterns without giving large states more visual weight. Compare color within a row; colors represent differences from that specialty's national aggregate, not absolute prices across specialties.
2. **Is a selected place unusual?** A beeswarm-style distribution preserves every horizontal value while separating overlapping marks vertically. The unweighted middle 50% of included places provides context; the weighted national aggregate is a separate dashed reference, not a mean of state ratios. Vertical position has no analytical meaning.
3. **Which specialties differ most between two places?** A dumbbell plot ranks absolute gaps in national-relative values on a shared symmetric scale. Exact raw values accompany the points. These are comparisons, not changes over time or causal effects.

## Interaction

Select a measure, record-count threshold, and two places. Clicking a matrix cell sets a specialty and place A or B; clicking a distribution mark sets the comparison place. Clicking a paired row returns to that specialty's distribution. Place selection also works through ordinary menus, so precise mouse pointing is optional.

The heatmap uses a single tab stop for its cells, arrow-key navigation, and Enter to select. Row headings offer direct specialty selection. The distribution and paired rows accept Enter/Space and expose exact values to assistive technology. Fixed readouts avoid tooltips covering adjacent marks. Narrow screens scroll each chart independently while retaining heatmap row labels.

A scatterplot comparison group can be carried into the workspace. The handoff explicitly reports unsupported specialties rather than silently dropping them. Workspace filters are independent of the main page's geography selection. Reset restores all 18 profiles, California/Texas, cost per claim, and a 50-record threshold.

## Calculations and scope

- Cost per claim: total drug cost / claims, using the browser dataset's stored ratio.
- Claims per provider: claims / provider-record count.
- Reported opioid share: reported opioid claims / total claims × 100; suppressed claims can understate this measure.
- Economic-measure difference: `(place / national − 1) × 100`, in percent.
- Opioid-share difference: `place − national`, in percentage points.
- Heatmap colors cap at ±100% or ±10 percentage points. Numeric readouts do not cap values.
- Thresholds filter on provider-record count, not claim count. This is an exploration filter, not a confidence or reliability test.
- Scope: 50 states and DC by default; optional AS, GU, MP, PR, VI. Foreign, unknown, armed-forces, and freely associated state codes remain outside these plots but inside national benchmarks.
- State profiles cover the 18 highest-total-cost national specialties. They are not the same subset as the scatterplot's top 32 specialties per geography.
- Missing and filtered values are distinct. Neither is plotted as zero. The downloadable CSV retains inclusion status, provider counts, benchmark, difference units, threshold, year, and source.

These aggregate comparisons do not adjust for patient or medication mix and cannot identify care quality, prescribing appropriateness, or economies of scale.

## Implementation and checks

React coordinates shared selection state. D3 supplies linear/logarithmic scales, the diverging color scale, and quantiles. SVG renders the distribution and paired comparison; a native HTML table renders the matrix. No additional chart library, network service, or package was added.

The deterministic layout sorts by horizontal position and code, tests tangent positions against nearby marks, then chooses the closest collision-free vertical position. It never jitters x. At most 56 places are packed, making the quadratic worst-case search small and predictable.

Pure calculations and export logic live in `lib/geography-analysis.ts`; UI lives in `components/analysis/geography-studio.tsx`; styles live in `app/geography-studio.css`. The previous geographical chart source is retained in the Week 1 file for comparison.

Run `node scripts/check_geography.mjs` to check formulas, coverage flags, escaping, a 56-point coincident-value stress case, and 660 combinations of specialty, threshold, territory scope, measure, and scale. Tests assert pairwise separation, input-order independence, and unchanged x coordinates. Also run the existing interaction tests, type checks, and static build before publishing.

Useful next evaluation: ask a reader to find an unusual state, explain its national-relative value, compare it with another state, and export the evidence without assistance. Observe whether the heatmap's relative scale or the distribution's national reference is misunderstood before adding another view.


## Evidence notes — September 26, 2026

The fourth workspace step captures an evidence note with the current pair of places, measure, record threshold, territory scope, carried group, search, inspected specialty, scale, ordering, and comparison mode. It lists paired values and national-relative differences for every displayed specialty, plus ranks when viewing ranks. Missing and below-threshold values stay labeled and omitted. The note includes the CMS URL, year, capture time, formulas and interpretation limits.

A capture is fixed until the reader explicitly chooses **Capture current comparison**. Changing workspace settings shows a notice while preserving both the earlier evidence and the observation. Refreshing the evidence preserves the observation and asks the reader to review it. Drafts are held only in the current page session; copy or download the plain-text note to keep it. A scrollable preview supports keyboard review. No service, storage permission or dependency was added.

Verified: evidence formulas and coverage cases, existing 660 layout and 3,060 rank checks, interaction checks across 63 geographies, TypeScript, targeted lint, production export, keyboard capture, change detection, explicit recapture, preserved observation, clipboard content, and the actual downloaded file. Desktop and 390px browser reviews show no horizontal page overflow; screenshots are in the handoff's `review/evidence-notes/`. No browser console errors occurred during this review. User studies remain outstanding.
