import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(
  new URL('../lib/wonder-analysis.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const {
  shareBands,
  shareMeasures,
  weaveRanks,
  weaveMeasures,
  readMeasure,
  orbitExtent,
  orbitRadius,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/summary.json', import.meta.url),
    'utf8',
  ),
);
let combinations = 0;
for (const area of data.areas) {
  for (const selected of area.specialties)
    for (const order of shareMeasures) {
      const bands = shareBands(
        area.specialties,
        area.summary,
        selected.specialty,
        order,
      );
      assert(bands.some((band) => band.name === selected.specialty));
      assert.equal(new Set(bands.map((band) => band.name)).size, bands.length);
      for (const metric of shareMeasures) {
        assert(
          Math.abs(
            bands.reduce((sum, band) => sum + band.values[metric], 0) -
              area.summary[metric],
          ) < 0.01,
        );
        assert(
          Math.abs(
            bands.reduce((sum, band) => sum + band.shares[metric], 0) - 1,
          ) < 1e-10,
        );
        assert(
          bands.every(
            (band) => band.shares[metric] >= 0 && band.shares[metric] <= 1,
          ),
        );
      }
      combinations++;
    }
  for (const item of weaveRanks(area.specialties))
    for (const metric of weaveMeasures) {
      assert.equal(
        item.ranks[metric],
        1 +
          area.specialties.filter(
            (other) =>
              readMeasure(other, metric) > readMeasure(item.row, metric),
          ).length,
      );
    }
}
const example = data.areas[0].specialties[0];
const tied = weaveRanks([
  { ...example, specialty: 'A' },
  { ...example, specialty: 'B' },
  { ...example, specialty: 'C', costPerClaim: 0 },
]);
assert.deepEqual(
  tied.map((item) => item.ranks.costPerClaim),
  [1, 1, 3],
);
assert.deepEqual(weaveRanks([]), []);
assert.equal(orbitRadius(1, 2), 195);
assert.equal(orbitRadius(2, 2) - 195, 195 - orbitRadius(0.5, 2));
for (const profile of data.specialtyProfiles)
  for (const metric of ['costPerClaim', 'claimsPerProvider']) {
    const ratios = profile.states
      .map(
        (row) =>
          readMeasure(row, metric) / readMeasure(profile.national, metric),
      )
      .filter((value) => value > 0);
    const extent = orbitExtent(ratios);
    for (const ratio of ratios)
      assert(
        orbitRadius(ratio, extent) >= 83 && orbitRadius(ratio, extent) <= 307,
      );
  }
console.log(
  `Wonder lab: ${combinations} share-conservation cases, ranks across ${data.areas.length} geographies, ties, and orbit scales passed.`,
);
