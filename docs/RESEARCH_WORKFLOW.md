# Connected research workflow — September 28, 2026

This local round connects discovery, comparison, and saved evidence. All source history, ten Wonder lab visualizations, dataset definitions, coursework sections, Task Analysis, and Validation remain available. Nothing was committed, pushed, or published.

## Comparison finder

The new finder sits below the shared comparison controls. Choose a first place, measure, provider-record threshold, specialty group or search, and territory scope. Switch between the most similar places and largest contrasts; show five suggestions or the full ranking. Selecting a suggestion sets place B and selects the specialty with the largest gap in that pair. An explicit link opens the detailed paired chart. The specialty inspection panel and global search also lead to the finder.

For cost per claim and claims per provider, each specialty's symmetric percentage gap is `200 × abs(A − B) / (A + B)`. Two zero values have zero gap; one zero and one positive value have a 200% gap. For opioid share, use the absolute difference in percentage points. The score is the arithmetic mean of those gaps, with equal weight per specialty. It is not the percentage change from A, a significance test, a demographic match, or a quality measure. The definition is visible beside the results, with further methodology in a disclosure.

The reference set contains the selected specialties that meet the threshold in place A and have a finite, nonnegative measure. A candidate must have an eligible value for **every specialty in this same set** to enter the ranking. This prevents partial coverage from making a place look more similar. Empty sets produce no ranking. Ties use place codes alphabetically. Scores are calculated before display rounding; changing the first place can change the eligible set even though each individual gap is symmetric.

The CSV includes every candidate, including excluded places, alongside matched/required profile counts, the exact basis, gap units, threshold, source, and year. Excluded scores remain blank. Scores describe these stored aggregates, with the original source limitations; patient and medication mix are not adjusted. Reported opioid shares may be understated by suppression.

## Reproducible comparisons

Copy comparison link creates a versioned URL with the comparison workspace's year, measure, two places, inspected specialty, group, search, threshold, territory scope, ordering, log scale, comparison mode, and click target. It preserves the site's base path, including GitHub Pages repository paths. The URL contains no notebook observations. This feature shares the **Compare places workspace**, not the independent settings of every Wonder lab chart or the scatterplot.

Loading validates the version, year, supported values, string/array limits, geography scope, specialty names, and duplicate groups. Invalid links show an explanation and open a usable default workspace. Copying also reveals a selectable link for browsers where clipboard access is unavailable. This is a captured link; copy again after edits. A localhost link is explicitly labeled as local and requires the preview to remain running.

New notebook records include validated comparison settings. Reopen comparison restores those settings without altering the captured evidence or observation. Earlier notes remain readable and exportable; notes without saved settings cannot restore a workspace. Notes from another dataset year retain their evidence but cannot silently restore against different data.

## Portable notebooks

Export backup produces version-1 JSON, including complete evidence, observations, summaries, and any saved comparison settings. Import backup checks a local JSON file and previews new and duplicate counts before merging. No upload or network service is involved. Existing notes are never replaced.

Identical year/context/observation records are skipped. A reused ID with different content is assigned a fresh ID so both records survive. Capacity is checked before writing; an import exceeding 40 notes is rejected as a whole. Files are limited to 7 MB. The browser's storage is reread immediately before a write to preserve other tabs' changes. Corrupt existing storage or failed writes preserve existing data and explain the problem. Text and PNG exports remain available alongside the portable backup.

## Discoverability and cleanup

- Ten locally drawn SVG encoding sketches give the Wonder lab gallery a visual identity. They are decorative illustrations, explicitly labeled as structure rather than measured data.
- Question filters organize geography, spending, and ranking views; All views is the default, and the complete dropdown remains available.
- Alternative atlas/composition chart families load on demand. The default map remains immediately available.
- Shared comparison state supports restoration without remounting or discarding the notebook draft. Hover previews and selection feedback expire when their relevant settings change.
- A same-place notice explains a comparison that would otherwise show all zero gaps. Global specialty search now visibly applies to the whole comparison workspace, including the finder.
- Shared download handling attaches/removes the link and releases the object URL after the download starts.
- README now describes the current interface and points to historical design notes rather than presenting old layouts as current.

## Verification

`pnpm check` runs all nine calculation/persistence suites and TypeScript. The new `scripts/check_research_workflow.mjs` verifies 1,284 complete-dataset configurations, hand-calculated symmetric gaps, invalid/zero values, strict complete-coverage ranking, deterministic sorting, CSV units, link round-trips and invalid input, backward-compatible notes, collision-safe merges, repeated imports, capacity rejection, and immutability. Existing 660 distribution layouts, 3,060 rank comparisons, 13,608 evidence coverage cases, and the other chart suites remain covered.

Browser checks cover keyboard suggestion selection, changing sort direction, territory/measure/threshold/search filters, restored links, saved-note reopening, actual JSON export and import, duplicate detection, invalid-file rejection, all ten chart modes, and 320/390/768/1440px layouts. System reduced motion was enabled during review. These are implementation checks, not an end-user study.

The production export passed, including a browser smoke check under `/part-d-explorer/` with both deferred chart families and a restored comparison link. The initial application chunk is about 469 KiB, down from about 522 KiB before separating those chart families. No chunk-size warning remains. Changed-module lint also passed. Run `pnpm build` to reproduce the static export. Review images and the verified test backup are in the handoff's `review/research-workflow/`. The current development preview is `http://localhost:3015/`.
