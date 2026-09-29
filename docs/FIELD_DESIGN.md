# Field design refresh — September 28, 2026

The one-page explorer now uses warm ivory surfaces, forest and teal accents, and serif narrative headings. Analytical views retain distinct slate, teal, terracotta and amber marks. Map colors and legends use the same divergent scale; exported notebook cards inherit the shared theme. Historical assignment source folders are preserved.

## New entry points

- A geography picker in the opening updates the existing shared geography, live provider/claim/cost totals and cost per claim. The adjacent arrow opens State contours for the US and 50 states plus DC; territories and other geographies open the relationship chart, since the map covers only states and DC.
- State contours follows incoming geography changes while allowing independent inspection within the map.
- A photographed place snapshot shows the three largest drug-cost specialties among those retained for the selected geography. Each percentage divides specialty cost by the full geography drug-cost total. Clicking a specialty opens the existing relationship chart in its economics view.
- Proposal, source download and methodology links are grouped under Resources. Existing search, coursework, comparison and notebook functionality remain available.

## Photography

Both images are bundled locally, so the page does not depend on a third-party image server. Together they add about 511 KB. The pharmacy image is prioritized; the town image loads lazily. Dimensions reserve space before loading.

- `public/images/pharmacy.jpg`: Ivan S, [pharmacist facing medication shelves](https://www.pexels.com/photo/back-view-of-a-pharmacist-standing-in-front-of-a-cabinet-full-of-medication-9629685/), Pexels. This is illustrative photography, not an identified provider in the CMS dataset.
- `public/images/main-street.jpg`: [Lanesboro, Minnesota streetscape](https://www.pexels.com/photo/road-in-small-town-in-countryside-13777907/), Pexels. The caption identifies the photographed location; it stays fixed as analytical geography changes.
- Images were downloaded September 28, 2026 from their free stock-photo listings under the [Pexels license](https://www.pexels.com/license/). Source links also appear alongside the photographs.

## Motion and accessibility

The opening uses short entrance and image-settling animations. The overview indicator pulses only twice. Totals transition when geography changes; snapshot bars transition in width, and the new snapshot joins existing scroll reveals. All new animations honor system reduced-motion preferences, which disable the opening animations and bar transitions. No new animation loops indefinitely.

Native labels, selects, buttons and details preserve keyboard behavior. Live totals are announced politely. The new controls do not alter CMS calculations, suppression rules or existing interpretation limits.

## Verification

All eight existing calculation suites, TypeScript and static production build passed. Browser review covered 320, 390, 768 and 1440px widths without page-level horizontal overflow; loaded local photos; geography changes; specialty drilldown; map handoff; typo-tolerant search; keyboard resources; and reduced-motion behavior. Review screenshots are in the handoff's `review/field-redesign/` folder. No end-user study was performed.
