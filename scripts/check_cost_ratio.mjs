import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const C = await loadTs(new URL('../lib/cost-ratio.ts', import.meta.url));
const { MIN_RECORDS } = await loadTs(new URL('../lib/drug-mix.ts', import.meta.url));
const { REGIONS } = await loadTs(new URL('../lib/regions.ts', import.meta.url));
const data = JSON.parse(
  readFileSync(new URL('../public/data/prescriber-summary/drug-mix.json', import.meta.url), 'utf8'),
);
const close = (a, b, tolerance = 1e-9, message = '') =>
  assert.ok(Math.abs(a - b) <= tolerance, `${message} ${a} vs ${b}`);

const us = data.areas.find((area) => area.code === 'US');
const { rows } = C.ratioRows(data, us);
assert.equal(rows.length, 30, 'all 30 national specialties are usable');

// Every row recomputed from the raw tuple, using covered totals, not all claims.
let cases = 0;
for (const area of data.areas) {
  const usable = C.ratioRows(data, area);
  const indexOf = new Map(data.specialties.map((name, i) => [name, i]));
  for (const row of usable.rows) {
    const [records, , , , coveredClaims, coveredCost, genericClaims, genericCost] =
      area.specialties[indexOf.get(row.name)];
    assert.ok(records >= MIN_RECORDS, `${area.code} ${row.name} has enough records`);
    const generic = genericCost / genericClaims;
    const brand = (coveredCost - genericCost) / (coveredClaims - genericClaims);
    close(row.generic, generic, 1e-9, 'generic per claim');
    close(row.brand, brand, 1e-9, 'brand per claim');
    close(row.ratio, brand / generic, 1e-9, 'ratio');
    assert.ok(row.ratio > 0 && Number.isFinite(row.ratio), 'ratio is positive and finite');
    cases += 1;
  }
  const specialties = area.specialties.filter(Boolean).length;
  assert.equal(usable.rows.length + usable.excluded, specialties, `${area.code} rows are all accounted for`);
}

// The published prototype subtracted generics from all claims. That is the bug this port fixes.
const emergency = rows.find((row) => row.name === 'Emergency Medicine');
const tuple = us.specialties[data.specialties.indexOf('Emergency Medicine')];
const prototype = (tuple[2] - tuple[7]) / (tuple[1] - tuple[6]) / (tuple[7] / tuple[6]);
assert.ok(
  Math.abs(prototype - emergency.ratio) > 1,
  'all-claims and covered-claims ratios differ materially where coverage is low',
);
assert.ok(emergency.lowCoverage, 'Emergency Medicine is flagged as low coverage');

// Sorting.
for (const sort of ['ratio', 'brand', 'generic']) {
  const sorted = C.sortRatioRows(rows, sort);
  assert.equal(sorted.length, rows.length);
  sorted.slice(1).forEach((row, i) => assert.ok(sorted[i][sort] >= row[sort], `${sort} descending`));
}
assert.equal(C.parseRatioSort('brand'), 'brand');
assert.equal(C.parseRatioSort('nonsense'), 'ratio');
assert.equal(C.ratioRank(rows, C.sortRatioRows(rows, 'ratio')[0].name), 1);
assert.equal(C.ratioRank(rows, 'Not a specialty'), null);

// Whole-geography totals and the state list.
const total = C.areaTotal(us);
close(
  total.ratio,
  ((us.total[5] - us.total[7]) / (us.total[4] - us.total[6])) / (us.total[7] / us.total[6]),
  1e-9,
  'US total ratio',
);
const stateCodes = new Set(REGIONS.flatMap((region) => region.states));
assert.equal(stateCodes.size, 51);
assert.equal(C.stateAreas(data, stateCodes).length, 51, 'every state and DC is selectable');

// Display.
assert.equal(C.formatMultiple(179.8), '180×');
assert.equal(C.formatMultiple(42), '42.0×');
assert.equal(C.formatPerClaim(29.21), '$29.21');
assert.equal(C.formatPerClaim(5257.4), '$5,257');
assert.equal(C.shortLabel('Psychiatry'), 'Psychiatry');
assert.ok(C.shortLabel('Student in an Organized Health Care Education/Training Program').length < 32);
assert.deepEqual(C.logTicks(9, 12000), [10, 30, 100, 300, 1000, 3000, 10000]);

const top = C.sortRatioRows(rows, 'ratio')[0];
console.log(
  `Cost ratio checks passed: ${cases} geography-specialty rows. US ${total.ratio.toFixed(1)}×; highest ${top.name} ${top.ratio.toFixed(1)}×.`,
);
