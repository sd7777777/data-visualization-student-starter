import type { SpecialtyProfile } from './prescriber';
import {
  metricValue,
  status,
  csvCell,
  type GeographyMetric,
} from './geography-analysis';

/** Symmetric, bounded, scale-free gaps; subgroup shares retain percentage-point units. */
export function profileGap(a: number, b: number, metric: GeographyMetric) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null;
  if (metric === 'opioidShare') return Math.abs(a - b);
  return a + b === 0 ? 0 : (200 * Math.abs(a - b)) / (a + b);
}

export function findComparisons(
  profiles: SpecialtyProfile[],
  codes: string[],
  stateA: string,
  metric: GeographyMetric,
  minimum: number,
) {
  const basis = profiles.flatMap((profile) => {
    const row = profile.states.find((s) => s.code === stateA);
    const value = row ? metricValue(row, metric) : NaN;
    return row &&
      status(row, minimum) === 'included' &&
      profileGap(value, value, metric) !== null
      ? [{ profile, value }]
      : [];
  });
  const candidates = [...new Set(codes)]
    .filter((code) => code !== stateA)
    .map((code) => {
      const gaps = basis
        .flatMap(({ profile, value }) => {
          const row = profile.states.find((s) => s.code === code);
          const other = row ? metricValue(row, metric) : NaN;
          const gap = profileGap(value, other, metric);
          return row && status(row, minimum) === 'included' && gap !== null
            ? [
                {
                  specialty: profile.specialty,
                  gap,
                  valueA: value,
                  valueB: other,
                },
              ]
            : [];
        })
        .sort(
          (a, b) => b.gap - a.gap || a.specialty.localeCompare(b.specialty),
        );
      // Every ranked place uses the exact same basis. Never rank partial coverage.
      return {
        code,
        matched: gaps.length,
        score:
          basis.length && gaps.length === basis.length
            ? gaps.reduce((sum, row) => sum + row.gap, 0) / basis.length
            : null,
        gaps,
      };
    });
  const ranked = candidates
    .filter((row) => row.score !== null)
    .sort((a, b) => a.score! - b.score! || a.code.localeCompare(b.code));
  return {
    basis: basis.map((row) => row.profile.specialty),
    candidates,
    ranked,
  };
}

export function finderCsv(
  result: ReturnType<typeof findComparisons>,
  stateA: string,
  metric: GeographyMetric,
  minimum: number,
  year: number,
  source: string,
) {
  const rows: (string | number | null)[][] = [
    [
      'year',
      'reference_place',
      'candidate_place',
      'metric',
      'average_gap',
      'gap_unit',
      'matched_specialties',
      'required_specialties',
      'status',
      'minimum_provider_records',
      'basis_specialties',
      'source',
    ],
  ];
  for (const row of result.candidates)
    rows.push([
      year,
      stateA,
      row.code,
      metric,
      row.score,
      metric === 'opioidShare' ? 'percentage points' : 'symmetric percent',
      row.matched,
      result.basis.length,
      row.score === null ? 'insufficient coverage' : 'ranked',
      minimum,
      result.basis.join('; '),
      source,
    ]);
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
