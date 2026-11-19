import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const S = await loadTs(new URL('../lib/state-compare.ts', import.meta.url));
const C = await loadTs(new URL('../lib/cost-ratio.ts', import.meta.url));
const { MIN_RECORDS } = await loadTs(new URL('../lib/drug-mix.ts', import.meta.url));
const { REGIONS, TILE_GRID } = await loadTs(new URL('../lib/regions.ts', import.meta.url));
const data = JSON.parse(
  readFileSync(new URL('../public/data/prescriber-summary/drug-mix.json', import.meta.url), 'utf8'),
);
const codes = new Set(REGIONS.flatMap((region) => region.states));
const us = data.areas.find((area) => area.code === 'US');

// National rows match the Week 12 national view exactly.
const national = S.nationalRows(data);
const week12 = C.ratioRows(data, us).rows;
assert.equal(national.size, week12.length);
for (const row of week12) assert.equal(national.get(row.name).ratio, row.ratio, `${row.name} national ratio`);

// Each specialty across states matches that state's own Week 12 row, and every state has a tile.
let cells = 0;
for (const specialty of data.specialties) {
  const values = S.specialtyAcrossStates(data, specialty, codes);
  assert.equal(values.length, 51, `${specialty}: 50 states and DC`);
  for (const value of values) {
    assert.ok(TILE_GRID[value.code], `${value.code} has a tile`);
    const area = data.areas.find((item) => item.code === value.code);
    const own = C.ratioRows(data, area).rows.find((row) => row.name === specialty) ?? null;
    if (own === null) assert.equal(value.row, null, `${value.code} ${specialty} hidden in both views`);
    else {
      assert.equal(value.row.ratio, own.ratio, `${value.code} ${specialty} ratio`);
      assert.ok(value.row.row.records >= MIN_RECORDS);
    }
    cells += 1;
  }
  const ranked = S.rankStates(values);
  ranked.slice(1).forEach((value, i) => assert.ok(ranked[i].row.ratio >= value.row.ratio, 'ranked descending'));
}

// One low-coverage outlier (Virginia pharmacists, 0.3×) must not set the colour scale.
const pharm = S.rankStates(S.specialtyAcrossStates(data, 'Pharmacist', codes));
const [pLo, pHi] = S.colorDomain(pharm);
assert.ok(pharm.at(-1).row.ratio < 1 && pharm.at(-1).row.lowCoverage, 'Virginia pharmacist outlier is flagged');
assert.ok(pLo > 1, `pharmacist colour scale starts above the outlier (${pLo.toFixed(2)})`);
assert.ok(pHi >= pLo);
for (const specialty of data.specialties) {
  const ranked = S.rankStates(S.specialtyAcrossStates(data, specialty, codes));
  if (!ranked.length) continue;
  const [lo, hi] = S.colorDomain(ranked);
  assert.ok(lo > 0 && hi >= lo && Number.isFinite(hi), `${specialty} colour domain`);
}

// Comparison words, title and colour.
assert.equal(S.compareWords(110, 100), '10% higher than');
assert.equal(S.compareWords(80, 100), '20% lower than');
assert.equal(S.compareWords(101.5, 100), 'about the same as');
assert.match(S.headline('United States', 41.8, true), /^A brand-name claim costs about 42 times/);
assert.match(S.headline('Massachusetts', 42.2, false), /^In Massachusetts, a brand-name claim costs about 42 times/);
assert.equal(S.multipleColor(10, 10, 100), '#f6ead6');
assert.equal(S.multipleColor(100, 10, 100), '#8a2f12');
assert.equal(S.multipleColor(5, 10, 100), '#f6ead6', 'clamped below');
// Tile text always meets 4.5:1 across the ramp.
let worst = Infinity;
for (let i = 0; i <= 100; i += 1) {
  const fill = S.multipleColor(10 * 10 ** (i / 100), 10, 100);
  worst = Math.min(worst, S.contrast(fill, S.tileText(fill)));
}
assert.ok(worst >= 4.5, `tile text contrast ${worst.toFixed(2)} ≥ 4.5`);

const rheum = S.rankStates(S.specialtyAcrossStates(data, 'Rheumatology', codes));
console.log(
  `State comparison checks passed: ${cells} specialty-state cells; tile contrast ≥ ${worst.toFixed(2)}:1. Rheumatology highest in ${rheum[0].name} (${rheum[0].row.ratio.toFixed(1)}×), lowest in ${rheum.at(-1).name} (${rheum.at(-1).row.ratio.toFixed(1)}×).`,
);
