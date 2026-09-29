import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(
  new URL('../lib/composition-analysis.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const {
  mosaicItems,
  mosaicLayout,
  concentrationRows,
  costIntensity,
  skylineItems,
  skylineLayout,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/summary.json', import.meta.url),
    'utf8',
  ),
);
const measures = ['providers', 'claims', 'cost'];
const close = (a, b, tolerance = 1e-8) =>
  assert(Math.abs(a - b) < tolerance, `${a} != ${b}`);
let layouts = 0;
for (const area of data.areas) {
  const items = mosaicItems(area.specialties, area.summary);
  for (const denominator of ['claims', 'providers']) {
    const skyline = skylineLayout(
      skylineItems(
        area.specialties,
        area.summary,
        area.specialties.at(-1).specialty,
      ),
      denominator,
    );
    close(
      skyline.reduce((sum, tower) => sum + tower.width, 0),
      1,
    );
    close(
      skyline.reduce((sum, tower) => sum + tower.width * tower.height, 0),
      skyline.reduce((sum, tower) => sum + tower.values.cost, 0) /
        area.summary[denominator],
      0.000001,
    );
    skyline.forEach((tower) =>
      assert(Number.isFinite(tower.height) && tower.height >= 0),
    );
    assert(
      skyline.some((tower) => tower.name === area.specialties.at(-1).specialty),
    );
  }
  for (const metric of measures) {
    close(
      items.reduce((s, item) => s + item.values[metric], 0),
      area.summary[metric],
      metric === 'cost' ? 2.01 : 0.01,
    );
    const tiles = mosaicLayout(items, metric);
    assert.equal(
      tiles.length,
      items.filter((item) => item.values[metric] > 0).length,
    );
    close(
      tiles.reduce((s, tile) => s + tile.width * tile.height, 0),
      960 * 520,
      0.001,
    );
    for (const tile of tiles) {
      assert([tile.x, tile.y, tile.width, tile.height].every(Number.isFinite));
      assert(tile.x >= 0 && tile.y >= 0 && tile.width > 0 && tile.height > 0);
      assert(
        tile.x + tile.width <= 960.000001 && tile.y + tile.height <= 520.000001,
      );
      close(
        (tile.width * tile.height) / (960 * 520),
        tile.values[metric] /
          items.reduce((sum, item) => sum + item.values[metric], 0),
      );
      for (const other of tiles) {
        if (tile === other) continue;
        const overlapX =
          Math.min(tile.x + tile.width, other.x + other.width) -
          Math.max(tile.x, other.x);
        const overlapY =
          Math.min(tile.y + tile.height, other.y + other.height) -
          Math.max(tile.y, other.y);
        assert(overlapX < 0.000001 || overlapY < 0.000001, 'Tiles overlap');
      }
    }
    const rows = concentrationRows(area.specialties, area.summary, metric);
    assert.equal(rows.length, area.specialties.length);
    rows.forEach((entry, i) => {
      if (i) assert(rows[i - 1].row[metric] >= entry.row[metric]);
      for (const measure of measures) {
        const expected = rows
          .slice(0, i + 1)
          .reduce((sum, item) => sum + item.row[measure], 0);
        close(entry.totals[measure], expected, 0.01);
        close(
          entry.shares[measure],
          Math.min(1, expected / area.summary[measure]),
        );
        assert(
          entry.shares[measure] >= 0 && entry.shares[measure] <= 1.0000001,
        );
        if (i) assert(entry.shares[measure] >= rows[i - 1].shares[measure]);
      }
    });
    layouts++;
  }
}
const zero = {
  providers: 0,
  claims: 0,
  cost: 0,
  costPerClaim: 0,
  opioidShare: 0,
  antibioticShare: 0,
  averageRisk: null,
};
assert.deepEqual(mosaicItems([], zero), []);
assert.deepEqual(mosaicLayout([], 'cost'), []);
assert.deepEqual(concentrationRows([], zero, 'cost'), []);
assert.equal(costIntensity(zero, zero), null);
const a = { ...zero, specialty: 'A', cost: 80, claims: 20, providers: 2 };
const b = { ...zero, specialty: 'B', cost: 20, claims: 80, providers: 8 };
const total = { ...zero, cost: 100, claims: 100, providers: 10 };
assert.equal(costIntensity(a, total), 4);
const example = concentrationRows([b, a], total, 'cost');
assert.deepEqual(example[0].shares, { cost: 0.8, claims: 0.2, providers: 0.2 });
assert.equal(example.find((item) => item.shares.cost >= 0.8).rank, 1);
assert.equal(mosaicLayout(mosaicItems([a], a), 'cost')[0].width, 960);
assert.deepEqual(
  concentrationRows(
    [{ ...a, specialty: 'Z' }, a],
    { ...total, cost: 160 },
    'cost',
  ).map((item) => item.row.specialty),
  ['A', 'Z'],
);
console.log(
  `Composition: ${layouts} proportional, non-overlapping mosaics and cumulative curves across ${data.areas.length} geographies; 126 skylines, remainder conservation, ties, empty data and intensity checks passed.`,
);
