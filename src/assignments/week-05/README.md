# Week 05 — Interaction and Updated Sketches

The current Figure 01 is a copy and extension of Week 04, which remains unchanged in its original directory.

## Interaction

- Choose **Select group**, then drag a rectangle around circle centers. A new brush replaces the group; dragging in either direction works.
- Click circles to add/remove group members, or use the name-picker checkboxes with touch or the keyboard. Enter/Space also toggles focused circles in group mode.
- The linked table shows exact specialty values. Group summaries divide summed cost/claims and claims/provider records; cost share uses the complete geography total.
- Hover/focus inspects one specialty without changing the group. Group membership survives lens, scale, and zoom changes; changing geography clears it.
- Escape cancels an in-progress brush. Clear group removes the selection.

The scatterplot covers up to 32 highest-total-cost specialties per geography, not every specialty. Circle area is proportional to provider records, with larger transparent interaction targets for small marks.

[Hosted assignment](https://sd7777777.github.io/data-visualization-student-starter/#week-5) · [Source](InteractionScatter.tsx) · [Screenshot](../../../docs/assets/week-05-interaction.png)

## Updated Sketches

[Updated project proposal](../../../docs/PROJECT_DIRECTION.md) includes actual Week 04/05 screenshots and a new proposed end-of-course sketch. Future geographic linking and evidence-note export are explicitly separated from built features.

## Verification

`node scripts/check_interaction.mjs` tests brush geometry, weighted ratios, and valid data across all 63 geographies. Manual browser checks covered forward/reverse brushing in Safari, keyboard checkboxes, group retention through scale/zoom/lens changes, geography reset, and selection at a 390px viewport.
