import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Compile the actual shared helpers; no browser or third-party test runner needed.
const source = readFileSync(new URL('../src/assignments/week-05/selection.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { boxBetween, insideBox, groupSummary } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

for (const [start, end] of [[{ x: 1, y: 2 }, { x: 7, y: 8 }], [{ x: 7, y: 8 }, { x: 1, y: 2 }], [{ x: 1, y: 8 }, { x: 7, y: 2 }], [{ x: 7, y: 2 }, { x: 1, y: 8 }]]) {
  const box = boxBetween(start, end);
  assert.deepEqual(box, { x: 1, y: 2, width: 6, height: 6 });
  assert.equal(insideBox({ x: 1, y: 8 }, box), true);
  assert.equal(insideBox({ x: 4, y: 5 }, box), true);
  assert.equal(insideBox({ x: 0.99, y: 5 }, box), false);
}
assert.equal(groupSummary([], 0).costPerClaim, null);
assert.equal(groupSummary([], 0).costShare, null);
const weighted = groupSummary([{ providers: 2, claims: 10, cost: 100 }, { providers: 3, claims: 90, cost: 1800 }], 3800);
assert.equal(weighted.costPerClaim, 19);
assert.equal(weighted.claimsPerProvider, 20);
assert.equal(weighted.costShare, 50);

const data = JSON.parse(readFileSync(new URL('../public/data/prescriber-summary/summary.json', import.meta.url), 'utf8'));
for (const area of data.areas) {
  assert.ok(area.specialties.length > 0 && area.specialties.length <= 32);
  assert.equal(new Set(area.specialties.map(d => d.specialty)).size, area.specialties.length);
  for (const row of area.specialties) {
    assert.ok(row.providers > 0 && row.claims > 0 && row.costPerClaim > 0);
    assert.ok(Number.isFinite(row.opioidShare) && Number.isFinite(row.antibioticShare));
  }
  const group = groupSummary(area.specialties, area.summary.cost);
  assert.ok(group.costShare >= 0 && group.costShare < 100.001); // Source totals are rounded to whole dollars.
}
const national = data.areas.find(area => area.code === 'US');
const oncology = national.specialties.filter(d => ['Hematology', 'Hematology-Oncology', 'Medical Oncology'].includes(d.specialty));
const comparison = groupSummary(oncology, national.summary.cost);
assert.equal(oncology.length, 3);
assert.equal(comparison.claims, 12253790);
assert.equal(comparison.providers, 13814);
assert.equal(comparison.costPerClaim.toFixed(1), '2552.3');
assert.equal(comparison.claimsPerProvider.toFixed(1), '887.1');
assert.equal(comparison.costShare.toFixed(1), '10.8');
console.log(`Interaction checks passed: reverse brushing, boundary points, weighted summaries, and ${data.areas.length} geographies.`);
