import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';
const settings = await loadTs(
  new URL('../lib/comparison-settings.ts', import.meta.url),
);
const finder = await loadTs(
  new URL('../lib/comparison-finder.ts', import.meta.url),
);
const notebook = await loadTs(
  new URL('../lib/evidence-notebook.ts', import.meta.url),
);
const { STATE_CODES, TERRITORY_CODES } = await loadTs(
  new URL('../lib/geography-analysis.ts', import.meta.url),
);
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/summary.json', import.meta.url),
    'utf8',
  ),
);
const approx = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

// Hand-calculated fixtures: swapping places cannot change a specialty's gap.
approx(finder.profileGap(100, 200, 'costPerClaim'), 200 / 3);
approx(finder.profileGap(200, 100, 'costPerClaim'), 200 / 3);
assert.equal(finder.profileGap(0, 0, 'costPerClaim'), 0);
assert.equal(finder.profileGap(0, 20, 'costPerClaim'), 200);
assert.equal(finder.profileGap(2, 7, 'opioidShare'), 5);
assert.equal(finder.profileGap(NaN, 7, 'costPerClaim'), null);
assert.equal(finder.profileGap(-1, 7, 'costPerClaim'), null);
const row = (code, value, providers = 100) => ({
  code,
  name: code,
  providers,
  claims: value * providers,
  cost: value * value * providers,
  costPerClaim: value,
  opioidShare: value,
});
const fixture = [
  {
    specialty: 'Alpha',
    states: [row('CA', 100), row('NY', 200), row('TX', 100), row('FL', 100)],
  },
  {
    specialty: 'Beta',
    states: [
      row('CA', 200),
      row('NY', 100),
      row('TX', 200),
      row('FL', 200, 49),
    ],
  },
];
const exact = finder.findComparisons(
  fixture,
  ['CA', 'NY', 'TX', 'FL'],
  'CA',
  'costPerClaim',
  50,
);
assert.deepEqual(
  exact.ranked.map((r) => r.code),
  ['TX', 'NY'],
);
assert.equal(exact.ranked[0].score, 0);
approx(exact.ranked[1].score, 200 / 3);
assert.equal(
  exact.candidates.find((r) => r.code === 'FL').score,
  null,
  'partial coverage never ranks as similar',
);
assert.equal(
  finder.findComparisons([], ['CA', 'TX'], 'CA', 'costPerClaim', 0).ranked
    .length,
  0,
);
assert.deepEqual(
  finder
    .findComparisons(fixture, ['CA', 'TX', 'TX'], 'CA', 'costPerClaim', 50)
    .ranked.map((r) => r.code),
  ['TX'],
);

let checks = 0;
for (const territories of [false, true]) {
  const codes = [...STATE_CODES, ...(territories ? TERRITORY_CODES : [])];
  for (const stateA of codes)
    for (const metric of ['costPerClaim', 'claimsPerProvider', 'opioidShare'])
      for (const minimum of [0, 50, 200, 1000]) {
        const result = finder.findComparisons(
          data.specialtyProfiles,
          codes,
          stateA,
          metric,
          minimum,
        );
        assert.equal(result.candidates.length, codes.length - 1);
        assert.ok(
          result.ranked.every(
            (r) =>
              r.code !== stateA &&
              r.matched === result.basis.length &&
              r.score >= 0 &&
              Number.isFinite(r.score),
          ),
        );
        assert.ok(
          result.candidates.every(
            (r) =>
              r.score !== null ||
              r.matched < result.basis.length ||
              !result.basis.length,
          ),
        );
        assert.ok(
          result.ranked.every(
            (r, i) => !i || r.score >= result.ranked[i - 1].score,
          ),
        );
        for (const candidate of result.ranked)
          for (const gap of candidate.gaps)
            approx(gap.gap, finder.profileGap(gap.valueB, gap.valueA, metric));
        if (metric !== 'opioidShare')
          assert.ok(result.ranked.every((r) => r.score <= 200));
        checks++;
      }
}
const csv = finder.finderCsv(exact, 'CA', 'costPerClaim', 50, 2024, '=source');
assert.ok(csv.includes('insufficient coverage'));
assert.ok(csv.includes('symmetric percent'));
assert.ok(csv.includes("'=source"));

const original = {
  ...settings.defaultComparison(),
  stateA: 'PR',
  stateB: 'NY',
  territories: true,
  minimum: 200,
  metric: 'opioidShare',
  pairMode: 'ranks',
  order: 'value',
  search: 'Nurse',
  group: ['Nurse Practitioner', 'Internal Medicine'],
};
const link = settings.comparisonLink(
  'https://example.test/project/?unrelated=1#mix',
  original,
);
assert.equal(new URL(link).pathname, '/project/');
assert.equal(new URL(link).hash, '#place');
assert.deepEqual(
  settings.readComparisonLink(new URL(link).search, data),
  original,
);
assert.equal(settings.readComparisonLink('', data), null);
for (const invalid of [
  { ...original, year: 2023 },
  { ...original, stateA: 'XX' },
  { ...original, territories: false },
  { ...original, minimum: 50.5 },
  { ...original, group: ['Nurse Practitioner', 'Nurse Practitioner'] },
  { ...original, group: ['Not a specialty'] },
  { ...original, specialty: '<script>' },
  { ...original, search: 'a'.repeat(101) },
  { ...original, metric: 'unknown' },
])
  assert.throws(() => settings.validateComparison(invalid, data));
assert.throws(() => settings.readComparisonLink('?comparison=%7Bbad', data));
assert.throws(() => settings.readComparisonLink('?comparison=', data));
assert.throws(() =>
  settings.readComparisonLink(new URL(link).search + '&comparison={}', data),
);
assert.throws(() =>
  settings.readComparisonLink('?comparison=' + 'x'.repeat(12001), data),
);
assert.equal(
  settings.validateComparison({ ...original, extra: 'drop' }, data).extra,
  undefined,
);

const note = {
  id: 'note',
  captured: '2026-09-28T14:00:00.000Z',
  year: 2024,
  context: 'Golden evidence',
  observation: 'Original thought',
  summary: {
    specialty: 'Nurse Practitioner',
    metric: 'costPerClaim',
    national: 100,
    minimum: 50,
    places: [
      {
        name: 'California',
        code: 'CA',
        value: 100,
        providers: 100,
        coverage: 'included',
      },
      {
        name: 'Texas',
        code: 'TX',
        value: null,
        providers: 20,
        coverage: 'below threshold',
      },
    ],
  },
};
assert.deepEqual(
  notebook.parseNotebook(notebook.serializeNotebook([note])),
  [note],
  'old notes remain readable',
);
const modern = { ...note, settings: settings.defaultComparison() };
assert.deepEqual(notebook.parseNotebook(notebook.serializeNotebook([modern])), [
  modern,
]);
assert.throws(() =>
  notebook.serializeNotebook([
    { ...modern, settings: { ...modern.settings, year: 2023 } },
  ]),
);
const incoming = [
  { ...modern, observation: 'Another thought' },
  { ...modern, id: 'duplicate-content' },
];
const snapshot = JSON.stringify([modern, incoming]);
const merged = notebook.mergeNotebook([modern], incoming);
assert.equal(merged.added, 1);
assert.equal(merged.duplicates, 1);
assert.equal(merged.notes.length, 2);
assert.notEqual(
  merged.notes[0].id,
  'note',
  'ID collisions retain both discoveries',
);
assert.equal(
  JSON.stringify([modern, incoming]),
  snapshot,
  'merge must never mutate source records',
);
assert.equal(
  notebook.mergeNotebook(merged.notes, incoming).added,
  0,
  'reimport is idempotent',
);
const full = Array.from({ length: 40 }, (_, i) => ({
  ...note,
  id: `n-${i}`,
  observation: `Observation ${i}`,
}));
assert.throws(() => notebook.mergeNotebook(full, [modern]), /exceed/);
assert.equal(full.length, 40);
assert.throws(
  () => notebook.parseNotebook(' '.repeat(notebook.NOTEBOOK_FILE_LIMIT + 1)),
  /7 MB/,
);
console.log(
  `Passed ${checks} full-dataset comparison configurations, hand-calculated gap/coverage cases, link validation and round-trips, and atomic notebook import checks.`,
);
