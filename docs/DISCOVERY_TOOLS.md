# Free tools, one visual language

The latest extension adds State contours to Wonder lab and Find anything to the header and sticky chapter bar. Both use the explorer’s shared colors, FontAwesome symbols, typography and selection state.

## State contours

U.S. Atlas 3.0.1 provides simplified 2017 Census state boundaries. TopoJSON Client 3.1.0 decodes the bundled geometry; D3 Geo 3.1.1 draws and positions it. No API key, map server, paid service or runtime CDN is used. Full upstream licenses are included in `public/data/open-source-notices.txt`, linked from the map and footer.

The map covers 50 states plus DC for the 18 national specialty profiles. Four measures reuse the existing atlas definitions. Color uses the same five national-relative bins as the other atlas views: below 0.5, 0.5 to below 0.8, 0.8 through 1.2, above 1.2 through 2, and above 2 times national. National aggregates stay fixed when the provider threshold changes. Filtered or unavailable values use stripes, never zero. Alaska and Hawaii are inset; Alaska has a reduced scale. Land area is geographic, not prescribing volume.

Select a shape with a pointer or Enter/Space, use the state dropdown, or use the small-state buttons. The detail panel reports the value, national comparison, provider count and coverage. Find largest relative difference uses absolute distance of the state/national ratio from 1 among eligible states. It is descriptive, not statistical significance. Explore state specialties applies the geography and specialty to the main explorer. If that specialty is absent from the geography’s top-32 summary, the main explorer uses its existing first-specialty fallback.

The CSV includes all 51 places, the specialty, year, metric, national benchmark, ratio, threshold and coverage status. Filtered values remain blank. The map does not include territories; prescribing data remain CMS 2024 regardless of boundary vintage.

## Find anything

The existing MIT-licensed cmdk package supplies search and keyboard navigation, composed with the existing Base UI dialog through the project’s UI wrappers. Shared chapter and visualization metadata keep labels consistent. It searches chapters, all ten Wonder lab modes, the current geography’s available specialties, and all 63 geographies. Matching uses case-insensitive words in labels and relevant keywords. Click Find anything or press Command/Ctrl K; use arrows and Enter to choose. Escape closes the dialog and returns focus. Selecting a result moves focus to its destination and respects reduced motion when scrolling. Search is entirely local.

## Verification

`node scripts/check_state_contours.mjs` validates all 51 state joins and geometry, 360 metric/filter cases, ratio-bin boundaries, missing data, zero national denominators, and CSV coverage/escaping. Existing interaction, geography, wonder, atlas, composition and scroll-story checks pass, alongside TypeScript and the production static build.

Browser review covered desktop and 390px menu layouts, state selection by keyboard and dropdown, an empty map at a high threshold, measure switching, outlier discovery, geography search, map-to-main-explorer handoff, actual CSV download, and Escape/focus return. The browser-downloaded CSV was checked for 51 unique states and the selected filters. System reduced motion was enabled during review. This is implementation verification, not a user study.
