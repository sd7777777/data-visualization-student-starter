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

The primary field uses position for the two measures being compared because position supports more accurate comparison than color or area. D3 logarithmic scales preserve long-tailed variation; circle area uses a square-root scale for provider count and remains secondary. Orange identifies the active mark, and a coordinated detail panel supplies exact values for pointer or keyboard focus.

The two lenses deliberately ask different questions:

- **Cost × volume:** operational and economic profile using cost per claim and claims per provider.
- **Focused categories:** clinical mix using reported opioid and antibiotic claim shares.

## Responsible interpretation

CMS states that the dataset covers Medicare Part D activity, not a provider's complete practice, and does not indicate quality of care. Some subgroup values are suppressed when counts are small. The project describes patterns and investigation starting points; it does not assign provider quality, risk, or performance scores.

## Likely next milestones

- Introduce a map only when the spatial question is clear enough to justify it.
- Add multi-year comparison after establishing a stable transformation pipeline across CMS releases.
- Add annotation for a small number of source-backed findings.
- Add the student's hand-drawn exploration sketches and design notes.
- Run keyboard, color-contrast, and mobile usability checks before final presentation.
