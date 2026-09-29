import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { scaleLinear, scaleLog } from 'd3-scale';

const source = readFileSync(
  new URL('../lib/geography-analysis.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const {
  difference,
  status,
  includedStates,
  metricValue,
  packDots,
  comparisonCsv,
  comparisonEvidence,
  csvCell,
  STATE_CODES,
  rankComparison,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/summary.json', import.meta.url),
    'utf8',
  ),
);
assert.equal(STATE_CODES.size, 51);
assert.equal(difference(150, 100, 'costPerClaim'), 50);
assert.equal(difference(50, 100, 'claimsPerProvider'), -50);
assert.equal(difference(5, 2, 'opioidShare'), 3);
assert.equal(difference(10, 0, 'costPerClaim'), null);
assert.equal(status(undefined, 0), 'not reported');
assert.equal(status({ providers: 49 }, 50), 'below threshold');
assert.equal(status({ providers: 50 }, 50), 'included');
assert.equal(csvCell('=1+2'), '"\'=1+2"');
assert.equal(csvCell('a,"b"'), '"a,""b"""');
assert.equal(csvCell(-4), '"-4"');

let layouts = 0;
for (const profile of data.specialtyProfiles)
  for (const minimum of [0, 50, 200, 1000])
    for (const territories of [false, true])
      for (const metric of [
        'costPerClaim',
        'claimsPerProvider',
        'opioidShare',
      ]) {
        const rows = includedStates(profile, minimum, territories);
        assert.ok(rows.every((row) => row.providers >= minimum));
        assert.ok(
          rows.every(
            (row) => !['AA', 'AE', 'AP', 'FM', 'ZZ', 'XX'].includes(row.code),
          ),
        );
        for (const log of metric === 'opioidShare' ? [false] : [false, true]) {
          const values = rows.map((row) => metricValue(row, metric));
          assert.ok(values.every(Number.isFinite));
          if (!values.length) continue;
          const low = Math.min(...values),
            high = Math.max(...values);
          const x = log
            ? scaleLog()
                .domain([low / 1.15, high * 1.15])
                .range([70, 870])
            : scaleLinear()
                .domain([0, high || 1])
                .range([70, 870]);
          const points = rows.map((row) => ({
            code: row.code,
            x: x(metricValue(row, metric)),
          }));
          const dots = packDots(points, 5, 2);
          assert.deepEqual(
            dots,
            packDots([...points].reverse(), 5, 2),
            'Packing must be deterministic',
          );
          assert.equal(dots.length, rows.length);
          for (const dot of dots)
            assert.equal(
              dot.x,
              points.find((point) => point.code === dot.code).x,
              'Packing must preserve x exactly',
            );
          for (let i = 0; i < dots.length; i++)
            for (let j = i + 1; j < dots.length; j++)
              assert.ok(
                Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y) >=
                  12 - 1e-5,
                'Dots overlap',
              );
          layouts++;
        }
      }
const duplicates = Array.from({ length: 56 }, (_, i) => ({
  code: String(i).padStart(2, '0'),
  x: 100,
}));
assert.equal(new Set(packDots(duplicates).map((dot) => dot.y)).size, 56);
const p = data.specialtyProfiles.find(
  (profile) => profile.specialty === 'Nurse Practitioner',
);
const csv = comparisonCsv(
  [p],
  ['CA', 'AS', 'MISSING'],
  'opioidShare',
  50,
  2024,
  data.meta.source,
);
assert.equal(csv.split('\r\n').length, 4);
assert.ok(csv.includes('difference_percentage_points'));
assert.ok(csv.includes('below threshold'));
assert.ok(csv.includes('not reported'));
assert.ok(csv.includes(data.meta.source));
let rankChecks = 0;
for (const a of STATE_CODES)
  for (const b of ['CA', 'TX', 'NY', 'DC', 'WY']) {
    for (const metric of ['costPerClaim', 'claimsPerProvider', 'opioidShare']) {
      for (const minimum of [0, 50, 200, 1000]) {
        const ranks = rankComparison(
          data.specialtyProfiles,
          a,
          b,
          metric,
          minimum,
        );
        assert.deepEqual(
          ranks,
          rankComparison(
            [...data.specialtyProfiles].reverse(),
            a,
            b,
            metric,
            minimum,
          ),
        );
        assert.deepEqual(
          ranks.map((row) => row.rankA),
          ranks.map((_, i) => i + 1),
        );
        assert.deepEqual(
          ranks.map((row) => row.rankB).sort((x, y) => x - y),
          ranks.map((_, i) => i + 1),
        );
        assert.ok(
          ranks.every(
            (row) => Number.isFinite(row.valueA) && Number.isFinite(row.valueB),
          ),
        );
        const swapped = rankComparison(
          data.specialtyProfiles,
          b,
          a,
          metric,
          minimum,
        );
        for (const row of ranks) {
          const reversed = swapped.find(
            (other) => other.specialty === row.specialty,
          );
          assert.equal(row.rankA, reversed.rankB);
          assert.equal(row.rankB, reversed.rankA);
        }
        rankChecks++;
      }
    }
  }
const equalProfiles = ['Beta', 'Alpha'].map((specialty) => ({
  specialty,
  states: [
    { code: 'CA', providers: 50, costPerClaim: 10 },
    { code: 'TX', providers: 50, costPerClaim: 10 },
  ],
}));
assert.deepEqual(
  rankComparison(equalProfiles, 'CA', 'TX', 'costPerClaim', 50).map(
    (row) => row.specialty,
  ),
  ['Alpha', 'Beta'],
);
assert.deepEqual(
  rankComparison(equalProfiles, 'CA', 'TX', 'costPerClaim', 51),
  [],
);
console.log(
  `Rank comparison checks passed: ${rankChecks} place/metric/threshold combinations, swap symmetry, stable ties, and empty states.`,
);
console.log(
  `Geography checks passed: ${layouts} layouts without overlapping dots; all measures, thresholds, coverage and CSV guards verified.`,
);

// Evidence must preserve units and coverage rather than turn exclusions into zeros.
const evidenceProfile = {
  specialty: 'Example',
  national: {
    providers: 100,
    claims: 1000,
    cost: 100000,
    costPerClaim: 100,
    opioidShare: 2,
  },
  states: [
    {
      code: 'CA',
      providers: 50,
      claims: 1000,
      cost: 150000,
      costPerClaim: 150,
      opioidShare: 5,
    },
    {
      code: 'TX',
      providers: 49,
      claims: 490,
      cost: 24500,
      costPerClaim: 50,
      opioidShare: 1,
    },
  ],
};
const evidenceSettings = {
  profiles: [evidenceProfile],
  group: ['Example', 'Unsupported'],
  search: '',
  specialty: 'Example',
  stateA: 'CA',
  stateB: 'TX',
  metric: 'costPerClaim',
  minimum: 50,
  territories: false,
  logarithmic: false,
  order: 'alphabetical',
  pairMode: 'values',
  year: 2024,
  source: 'https://example.com/cms',
  nameOf: (code) => code,
};
const evidence = comparisonEvidence(evidenceSettings);
assert.ok(
  evidence.includes(
    '150 USD per claim; 50 provider records; 50 % versus national',
  ),
);
assert.ok(
  evidence.includes(
    'TX (TX): below threshold; provider records: 49; value omitted.',
  ),
);
assert.ok(!evidence.includes('50 USD per claim; 49'));
assert.ok(evidence.includes('Example; Unsupported'));
assert.ok(evidence.includes('https://example.com/cms'));
const opioidEvidence = comparisonEvidence({
  ...evidenceSettings,
  metric: 'opioidShare',
  stateB: 'ZZ',
});
assert.ok(opioidEvidence.includes('3 percentage points versus national'));
assert.ok(
  opioidEvidence.includes(
    'ZZ (ZZ): not reported; provider records: not reported; value omitted.',
  ),
);
const rankEvidence = comparisonEvidence({
  ...evidenceSettings,
  minimum: 0,
  pairMode: 'ranks',
});
assert.ok(
  rankEvidence.includes('Rank A: 1; rank B: 1; among 1 eligible specialties.'),
);
assert.ok(
  comparisonEvidence({ ...evidenceSettings, profiles: [] }).includes(
    'No specialties match',
  ),
);
assert.ok(
  comparisonEvidence({
    ...evidenceSettings,
    metric: 'claimsPerProvider',
  }).includes('20 claims per provider record'),
);
console.log(
  'Evidence notes: economic and percentage-point units, coverage, empty results and ranks verified.',
);
