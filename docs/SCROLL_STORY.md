# Guided long-scroll story

Added September 27, 2026. The opening “One system. Different perspectives.” chapter is a four-scene guided story above Relationships. It holds a dot visualization alongside scrolling prose on desktop and uses a compact sticky visualization on phones. The national five-specialty cohort remains fixed when the explorer geography changes.

## Data and encodings

The cohort comprises the five national specialties with the largest total drug costs: Nurse Practitioner, Internal Medicine, Family Practice, Hematology-Oncology, and Physician Assistant. Values come from the existing 2024 CMS summary. Shares divide the cohort's summed count/cost by the full national total, including specialties outside the displayed subset. Provider, claim, and cost shares are 47.5%, 72.8%, and 59.4% respectively.

The opening sunflower is decorative, not provider-level data. Quantitative scenes use 400 equal dots, one dot per 0.25 percentage points. Counts round to the nearest dot, with a maximum error of 0.125 percentage points. Percentage labels are calculated from source totals, not rounded dot counts. Color identifies the cohort; all other specialties stay pale. Changes between scenes represent measures, not time.

## Interaction and motion

Native scrolling selects a scene when its narrative reaches 55% of the viewport height. Scroll work is scheduled once per animation frame and suspended offscreen. React updates only when the active scene changes; a CSS progress bar follows the overall story. The initial field reorganizes into a grid with staggered transforms, and the highlighted share changes at each scene. No scroll interception or new dependencies.

Scene buttons support keyboard and touch. A skip link goes straight to Relationships. The final action transfers the five names to the existing comparison workspace, where all five have state profiles. A ribbon interlude after Wonder lab draws once on arrival and leads into concentration.

OS reduced-motion preferences remove animated transitions and shorten narrative spacing while preserving the sticky visual. A local Motion off control suppresses story transitions and makes scene jumps instant. All narrative values are present as text, with a descriptive SVG label and an explicit rounding note.

## Verification

`node scripts/check_scroll_story.mjs` verifies 63 cohorts, full-total denominators, rounding error bounds, nonmutation, empty data, and the bounds/uniqueness of all 400 dot positions in both layouts. Existing interaction, geography, Wonder lab, atlas and composition checks pass. TypeScript, targeted lint and a production build pass. Browser review covers desktop, 390px, keyboard scene selection, the reduced-motion layout and five-specialty comparison transfer.
