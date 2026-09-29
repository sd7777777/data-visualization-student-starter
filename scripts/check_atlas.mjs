import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(
  new URL('../lib/atlas-analysis.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const {
  atlasTiles,
  atlasRows,
  atlasValue,
  petalMetrics,
  statePetals,
  percentileOf,
  ridgeBins,
  petalPath,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/summary.json', import.meta.url),
    'utf8',
  ),
);
assert.equal(atlasTiles.length, 51);
assert.equal(new Set(atlasTiles.map(([code]) => code)).size, 51);
assert.equal(new Set(atlasTiles.map(([, x, y]) => `${x},${y}`)).size, 51);
assert.equal(percentileOf([1, 2, 2, 3], 2), 50);
assert.equal(percentileOf([7], 7), 50);
assert.equal(percentileOf([], 1), 0);
assert.deepEqual(ridgeBins([0, 5, 10], 10, 2), [1, 2]);
assert.deepEqual(ridgeBins([], 10, 2), [0, 0]);
let checked = 0;
for (const profile of data.specialtyProfiles) {
  for (const minimum of [1, 50, 250, 1000, Number.MAX_SAFE_INTEGER]) {
    const rows = atlasRows(profile, minimum);
    assert(
      rows.every(
        (row) =>
          row.providers >= minimum &&
          atlasTiles.some(([code]) => code === row.code),
      ),
    );
    const petals = statePetals(profile, minimum);
    assert.equal(petals.length, rows.length);
    for (const petal of petals)
      for (const [i, p] of petal.percentiles.entries()) {
        assert(p >= 0 && p <= 100);
        assert(!/NaN|Infinity/.test(petalPath(p, i)));
        const v = atlasValue(petal.row, petalMetrics[i]);
        const lower = rows.filter(
          (row) => atlasValue(row, petalMetrics[i]) < v,
        ).length;
        const tied = rows.filter(
          (row) => atlasValue(row, petalMetrics[i]) === v,
        ).length;
        assert.equal(p, (100 * (lower + tied / 2)) / rows.length);
      }
    for (const metric of petalMetrics) {
      const values = rows.map((row) => atlasValue(row, metric));
      const maximum = Math.max(1, ...values) * 1.001;
      const bins = ridgeBins(values, maximum);
      assert.equal(
        bins.reduce((a, b) => a + b, 0),
        rows.length,
      );
      assert(bins.every((n) => Number.isInteger(n) && n >= 0));
      const national = atlasValue(profile.national, metric);
      if (national > 0) {
        const ratios = values.map((value) => value / national);
        const bound = Math.max(1, Math.ceil(Math.max(0, ...ratios) * 2) / 2);
        assert.equal(
          ridgeBins(ratios, bound).reduce((a, b) => a + b, 0),
          rows.length,
        );
      }
      checked++;
    }
  }
}
console.log(
  `Atlas: 51 unique map cells; ${checked} distribution accounting cases; percentile ties, empty states, threshold filters, and petal geometry passed.`,
);
