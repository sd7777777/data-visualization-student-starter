# Project direction

## Audience

The primary audience is a healthcare strategy, operations, analytics, or product leader evaluating how well a candidate can turn a difficult public dataset into a useful, responsible analytical experience. A secondary audience is a student or researcher exploring Part D prescribing patterns.

## Questions the project supports

1. Which specialties occupy unusual combinations of prescription volume and cost per claim?
2. How do those specialty profiles change across states and territories?
3. Which specialties have comparatively high reported opioid or antibiotic claim shares?
4. How widely does a large specialty vary across states on the same measure?
5. Which provider records contribute most to drug cost within the selected geography?
6. Which source fields are sufficiently complete for a follow-up analysis?

## Task abstraction

- **Discover:** locate specialties that stand apart from the overall field.
- **Compare:** evaluate several specialties using common cost, volume, and focused-category measures.
- **Filter:** narrow the field by geography and analytical lens.
- **Inspect:** reveal precise values for an individual specialty.
- **Connect:** move from specialty-level patterns to the provider records contributing to them.
- **Contextualize:** interpret the findings within CMS suppression and population limitations.

These tasks stay independent of the current chart type so the visualization can evolve during the course.

## Data abstraction

The source is a provider table with one row per NPI. It combines categorical attributes (specialty, entity type), spatial identifiers (state, ZIP, RUCA), quantitative attributes (claims, fills, days supplied, cost, beneficiary counts, risk score), and a calendar-year time attribute. The browser file contains geography × specialty aggregates, state profiles for 18 major specialties, whole-file distributions, a 10-record provider detail layer per geography, and completeness metadata for all 84 fields.

## Visual rationale

The primary field uses position for the two measures being compared because position supports more accurate comparison than color or area. D3 logarithmic scales preserve long-tailed variation; a linear option reveals absolute differences. Circle area uses a square-root scale for provider count and remains secondary. Orange identifies the active mark, and a coordinated detail panel supplies exact values for pointer or keyboard focus. The Week 04 copy adds collision-filtered ticks, 1×–4× zoom, and a hover label that disappears on exit.

The two lenses deliberately ask different questions:

- **Cost × volume:** operational and economic profile using cost per claim and claims per provider.
- **Focused categories:** clinical mix using reported opioid and antibiotic claim shares.

## Responsible interpretation

CMS states that the dataset covers Medicare Part D activity, not a provider's complete practice, and does not indicate quality of care. Some subgroup values are suppressed when counts are small. The project describes patterns and investigation starting points; it does not assign provider quality, risk, or performance scores.

## Likely next milestones

- Evaluate whether a real boundary map would answer the spatial question better than the current equal-area tiles; source and size of GeoJSON need validation first.
- Add multi-year comparison after establishing a stable transformation pipeline across CMS releases.
- Add annotation for a small number of source-backed findings.
- Add the student's hand-drawn exploration sketches and design notes.
- Run keyboard, color-contrast, and mobile usability checks before final presentation.

## Course repository structure

The site is organized as one repository with a reproducible data preparation script, reusable D3 chart components, one public page, and an included GitHub Pages deployment workflow. The explorer and original chart source sit in `src/assignments/week-01`, the data lab sits in `src/assignments/week-02`, the Week 03 export preserves the original first visual, and the Week 04 folder contains its legibility revision. The local history descends from Curran's starter and is connected to the GitHub-created fork.

## Validation plan (Munzner, Chapter 4)

1. **Domain situation:** Check with a healthcare analytics reader whether specialty and geography comparisons answer a real research question without implying care quality.
2. **Task and data abstraction:** Confirm the comparison and outlier tasks match the dataset's row unit, aggregated measures, and suppression limits; recalculate source samples.
3. **Visual encoding and interaction idiom:** Observe readers finding an outlier and explaining circle area, log/linear scales, zoom, and schematic state tiles without prompting.
4. **Algorithm:** Reconcile Python summary totals with the CMS file, then test load speed and interaction responsiveness on a phone and laptop.

These are proposed checks, not results from completed user studies.
