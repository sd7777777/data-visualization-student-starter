import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const {
  REGIONS,
  TILE_GRID,
  ALL_SPECIALTIES,
  MIN_REGION_STATES,
  regionOf,
  statePoints,
  regionSummaries,
  median,
  fingerprints,
  leaderCounts,
  emphasised,
  togglePinned,
  parseRegions,
  shapePath,
} = await loadTs(new URL('../lib/regions.ts', import.meta.url));
const { MIN_RECORDS } = await loadTs(new URL('../lib/drug-mix.ts', import.meta.url));
const { STATE_CODES } = await loadTs(
  new URL('../lib/geography-analysis.ts', import.meta.url),
);
const mix = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/drug-mix.json', import.meta.url),
    'utf8',
  ),
);

// Every state and DC belongs to exactly one region and has one tile; territories have neither.
const assigned = REGIONS.flatMap((r) => r.states);
assert.equal(assigned.length, 51);
assert.equal(new Set(assigned).size, 51);
const abc = (a, b) => a.localeCompare(b);
assert.deepEqual([...assigned].sort(abc), [...STATE_CODES].sort(abc));
assert.deepEqual(Object.keys(TILE_GRID).sort(abc), [...STATE_CODES].sort(abc));
const cells = Object.values(TILE_GRID).map(([c, r]) => `${c},${r}`);
assert.equal(new Set(cells).size, 51, 'tiles do not overlap');
for (const code of ['PR', 'GU', 'VI', 'US', 'ZZ']) assert.equal(regionOf(code), null);
assert.equal(regionOf('DC').id, 'south');
assert.equal(new Set(REGIONS.map((r) => r.color)).size, 4);
assert.equal(new Set(REGIONS.map((r) => r.shape)).size, 4);

// Medians.
assert.equal(median([]), null);
assert.equal(median([3, 1, 2]), 2);
assert.equal(median([4, 1, 3, 2]), 2.5);

// State points: all specialties covers every state; thresholds hold for each specialty.
const all = statePoints(mix, ALL_SPECIALTIES);
assert.equal(all.points.length + all.hidden, 51);
let pointChecks = 0;
for (const specialty of [ALL_SPECIALTIES, ...mix.specialties]) {
  const { points, hidden } = statePoints(mix, specialty);
  assert.equal(points.length + hidden, 51, specialty);
  for (const p of points) {
    assert.ok(p.row.records >= MIN_RECORDS);
    assert.ok(p.row.brandClaimShare >= 0 && p.row.brandClaimShare <= 1);
    assert.ok(p.row.brandCostShare >= 0 && p.row.brandCostShare <= 1);
    assert.equal(p.region.id, regionOf(p.code).id);
    pointChecks += 1;
  }
  // Region summaries partition the points and respect the minimum.
  const summaries = regionSummaries(points);
  assert.equal(
    summaries.reduce((sum, s) => sum + s.count, 0),
    points.length,
  );
  for (const s of summaries) {
    if (s.count < MIN_REGION_STATES) assert.equal(s.costShare, null);
    else {
      const mine = points.filter((p) => p.region.id === s.region.id);
      const costs = mine.map((p) => p.row.brandCostShare);
      assert.ok(s.costShare >= Math.min(...costs) && s.costShare <= Math.max(...costs));
      const below = costs.filter((c) => c < s.costShare).length;
      const above = costs.filter((c) => c > s.costShare).length;
      assert.ok(below <= mine.length / 2 && above <= mine.length / 2);
    }
  }
}

// Fingerprints: complete regions only, sorted by spread, leaders counted once.
const { rows, skipped } = fingerprints(mix);
assert.equal(rows.length + skipped, mix.specialties.length);
for (const [i, row] of rows.entries()) {
  assert.ok(row.summaries.every((s) => s.costShare !== null));
  const top = Math.max(...row.summaries.map((s) => s.costShare));
  assert.equal(row.summaries.find((s) => s.region.id === row.leader).costShare, top);
  if (i) assert.ok(rows[i - 1].spread >= row.spread);
}
const counts = leaderCounts(rows);
assert.equal(
  Object.values(counts).reduce((a, b) => a + b, 0),
  rows.length,
);
// The published finding: the South leads most often.
assert.equal(
  Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
  'south',
);

// Legend state.
assert.deepEqual([...emphasised(null, [])], []);
assert.deepEqual([...emphasised('west', ['south'])], ['west']);
assert.deepEqual([...emphasised(null, ['south', 'west'])], ['south', 'west']);
assert.deepEqual(togglePinned([], 'west'), ['west']);
assert.deepEqual(togglePinned(['west'], 'northeast'), ['northeast', 'west']);
assert.deepEqual(togglePinned(['northeast', 'west'], 'west'), ['northeast']);
assert.deepEqual(parseRegions('west,bogus,south'), ['south', 'west']);
assert.deepEqual(parseRegions(null), []);
for (const r of REGIONS) assert.match(shapePath(r.shape, 6), /^M.*Z$/);

console.log(
  `Regions: 51 states/DC, ${pointChecks} state points across ${mix.specialties.length + 1} views, ${rows.length} fingerprints (${skipped} skipped); leaders ${JSON.stringify(counts)}.`,
);
