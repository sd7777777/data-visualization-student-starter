import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const {
  MIN_RECORDS,
  mixRow,
  areaRows,
  sortRows,
  stateRows,
  costMultiple,
  mixCsv,
} = await loadTs(new URL('../lib/drug-mix.ts', import.meta.url));
const { STATE_CODES } = await loadTs(
  new URL('../lib/geography-analysis.ts', import.meta.url),
);
const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../public/data/prescriber-summary/${name}`, import.meta.url),
      'utf8',
    ),
  );
const mix = read('drug-mix.json');
const summary = read('summary.json');

// Totals reconcile with the main summary for every geography.
assert.equal(mix.meta.rows, summary.meta.rows);
assert.equal(mix.areas.length, summary.areas.length);
for (const area of summary.areas) {
  const match = mix.areas.find((item) => item.code === area.code);
  assert(match, `missing ${area.code}`);
  const [
    records,
    claims,
    cost,
    coveredRecords,
    coveredClaims,
    coveredCost,
    genericClaims,
    genericCost,
  ] = match.total;
  assert.equal(records, area.summary.providers);
  assert(Math.abs(claims - area.summary.claims) <= 1);
  assert(Math.abs(cost - area.summary.cost) <= 1);
  assert(
    coveredRecords <= records &&
      coveredClaims <= claims &&
      coveredCost <= cost + 1,
  );
  assert(genericClaims <= coveredClaims && genericCost <= coveredCost + 1);
  assert.equal(match.specialties.length, mix.specialties.length);
}
assert.equal(mix.areas[0].code, 'US');

// Specialties are the national top 30 by cost, and retained cost share is consistent.
const national = mix.areas[0];
const costs = national.specialties.map((tuple) => tuple[2]);
assert.deepEqual(
  costs,
  [...costs].sort((a, b) => b - a),
);
assert(
  Math.abs(
    costs.reduce((a, b) => a + b, 0) / national.total[2] -
      mix.meta.retainedCostShare,
  ) < 1e-3,
);

// Specialty tuples within an area never exceed the area total.
let rowsChecked = 0;
for (const area of mix.areas) {
  const sums = [0, 0, 0];
  for (const tuple of area.specialties) {
    if (!tuple) continue;
    for (let i = 0; i < 3; i += 1) sums[i] += tuple[i];
    const row = mixRow('x', tuple);
    for (const key of [
      'brandClaimShare',
      'brandCostShare',
      'claimCoverage',
      'costCoverage',
    ])
      assert(row[key] >= 0 && row[key] <= 1.000001, `${area.code} ${key}`);
    assert(Math.abs(row.brandCost - (tuple[5] - tuple[7])) < 1e-6);
    rowsChecked += 1;
  }
  assert(
    sums[0] <= area.total[0] &&
      sums[1] <= area.total[1] + 30 &&
      sums[2] <= area.total[2] + 30,
  );
}

// National headline: brand-name share of claims and cost.
const us = mixRow('All', national.total);
assert(us.brandClaimShare > 0.14 && us.brandClaimShare < 0.16);
assert(us.brandCostShare > 0.87 && us.brandCostShare < 0.89);
assert(us.claimCoverage > 0.99 && us.costCoverage > 0.98);
assert(costMultiple(us) > 40 && costMultiple(us) < 44);
assert(mix.meta.otherShareOfNonGeneric.claims < 0.06);
assert(mix.meta.otherShareOfNonGeneric.cost < 0.01);

// Threshold, sorting, and per-state rows.
let sortsChecked = 0;
for (const area of mix.areas) {
  const { rows, excluded } = areaRows(mix, area);
  assert(rows.every((row) => row.records >= MIN_RECORDS));
  assert.equal(rows.length + excluded, area.specialties.filter(Boolean).length);
  for (const sort of ['brandCost', 'costShare', 'claimShare', 'gap']) {
    const sorted = sortRows(rows, sort);
    assert.equal(sorted.length, rows.length);
    const value = (row) =>
      sort === 'brandCost'
        ? row.brandCost
        : sort === 'costShare'
          ? row.brandCostShare
          : sort === 'claimShare'
            ? row.brandClaimShare
            : row.brandCostShare - row.brandClaimShare;
    for (let i = 1; i < sorted.length; i += 1)
      assert(value(sorted[i - 1]) >= value(sorted[i]));
    sortsChecked += 1;
  }
}
for (const specialty of mix.specialties) {
  const states = stateRows(mix, specialty, STATE_CODES);
  assert.equal(states.length, 51);
  assert(states.every((s) => s.row === null || s.row.records >= MIN_RECORDS));
}

// CSV: one header plus one line per row, with formula-like text neutralised.
const { rows } = areaRows(mix, national);
const csv = mixCsv('United States', 2024, rows);
assert.equal(csv.split('\r\n').length, rows.length + 1);
assert(csv.startsWith('"geography","year","specialty"'));
assert(
  mixCsv('=HYPERLINK()', 2024, rows.slice(0, 1)).includes(`"'=HYPERLINK()"`),
);

console.log(
  `Drug mix checks passed: ${mix.areas.length} geographies, ${rowsChecked} specialty rows, ${sortsChecked} sorted views, ${mix.specialties.length} state comparisons.`,
);
