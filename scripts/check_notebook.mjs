import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';
const load = (path, replace) => loadTs(new URL(path, import.meta.url), replace);
const {
  parseNotebook,
  serializeNotebook,
  addEvidence,
  evidenceText,
  notebookText,
  NOTEBOOK_LIMIT,
} = await load('../lib/evidence-notebook.ts');
const { comparisonCardSummary, metricValue, status } = await load(
  '../lib/geography-analysis.ts',
);
const { createDiscoverySearch } = await load('../lib/discovery-search.ts', {
  "'fuse.js'": JSON.stringify(import.meta.resolve('fuse.js')),
});
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/summary.json', import.meta.url),
    'utf8',
  ),
);
let cases = 0;
for (const profile of data.specialtyProfiles) {
  for (const metric of ['costPerClaim', 'claimsPerProvider', 'opioidShare']) {
    for (const minimum of [0, 50, 1000, 1000000]) {
      for (const area of data.areas) {
        const summary = comparisonCardSummary(
          profile,
          metric,
          minimum,
          [area.code, 'CA'],
          (code) => code,
        );
        const row = profile.states.find((r) => r.code === area.code);
        assert.equal(summary.places[0].coverage, status(row, minimum));
        assert.equal(
          summary.places[0].value,
          row && row.providers >= minimum ? metricValue(row, metric) : null,
        );
        assert.equal(summary.national, metricValue(profile.national, metric));
        cases++;
      }
    }
  }
}
const summary = comparisonCardSummary(
  undefined,
  'opioidShare',
  50,
  ['CA', 'TX'],
  (code) => code,
);
assert.equal(summary.national, null);
assert.ok(summary.places.every((p) => p.value === null));
const base = {
  id: 'one',
  captured: '2026-09-27T18:00:00.000Z',
  year: 2024,
  context: 'CMS source\nNational & coverage\nOriginal values',
  observation: 'My question',
  summary,
};
const first = addEvidence([], base);
assert.deepEqual(parseNotebook(serializeNotebook(first)), first);
assert.deepEqual(parseNotebook(null), []);
assert.equal(
  addEvidence(first, { ...base, id: 'two' }).length,
  1,
  'duplicate content is not saved twice',
);
assert.equal(
  addEvidence(first, { ...base, id: 'two', observation: 'Another question' })
    .length,
  2,
);
assert.throws(() => parseNotebook('{oops'));
assert.throws(() =>
  parseNotebook(JSON.stringify({ version: 2, notes: first })),
);
assert.throws(() =>
  parseNotebook(JSON.stringify({ version: 1, notes: [...first, ...first] })),
);
assert.throws(() =>
  parseNotebook(
    JSON.stringify({
      version: 1,
      notes: [{ ...base, summary: { ...summary, places: [] } }],
    }),
  ),
);
assert.throws(() =>
  addEvidence([], { ...base, observation: 'x'.repeat(1201) }),
);
const full = Array.from({ length: NOTEBOOK_LIMIT }, (_, i) => ({
  ...base,
  id: String(i),
  observation: `Question ${i}`,
}));
assert.throws(
  () => addEvidence(full, { ...base, id: 'over-limit' }),
  /40 notes/,
);
const changedContext = 'New workspace data';
assert.ok(evidenceText(base).includes('Original values'));
assert.ok(!evidenceText(base).includes(changedContext));
assert.ok(notebookText(first).includes('My question'));
const snapshot = structuredClone(base);
addEvidence(first, { ...base, id: 'new', observation: 'A new note' });
assert.deepEqual(
  base,
  snapshot,
  'saving another note does not mutate captured evidence',
);
const search = createDiscoverySearch([
  { value: 'place California CA' },
  { value: 'place Texas TX' },
  { value: 'specialty Nurse Practitioner' },
  { value: 'specialty Cardiology' },
  {
    value: 'visual State contours',
    keywords: ['map geography usa united states'],
  },
  {
    value: 'tool Field notebook',
    keywords: ['saved discoveries evidence notes cards'],
  },
]);
assert.ok(search('californa').has('place California CA'));
assert.ok(search('nurse practitoner').has('specialty Nurse Practitioner'));
assert.ok(search('practitoner nurse').has('specialty Nurse Practitioner'));
assert.ok(search('map').has('visual State contours'));
assert.deepEqual([...search('CA').keys()], ['place California CA']);
assert.equal(search('zzqxxwvv').size, 0);
assert.equal(search('  ').size, 6);
assert.ok(search('notebok').has('tool Field notebook'));
console.log(
  `Passed ${cases} snapshot/coverage cases, notebook round-trip/validation/capacity/immutability checks, and fuzzy-search cases.`,
);
