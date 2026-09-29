import type { SpecialtyProfile, Summary } from './prescriber';
import type { EvidenceSummary } from './evidence-notebook';

export type GeographyMetric =
  | 'costPerClaim'
  | 'claimsPerProvider'
  | 'opioidShare';
export type StateRow = SpecialtyProfile['states'][number];
export const STATE_CODES = new Set(
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(
    ' ',
  ),
);
export const TERRITORY_CODES = new Set(['AS', 'GU', 'MP', 'PR', 'VI']);
export const metricLabels: Record<GeographyMetric, string> = {
  costPerClaim: 'Cost / claim',
  claimsPerProvider: 'Claims / provider',
  opioidShare: 'Reported opioid share',
};
export function metricValue(row: Summary, metric: GeographyMetric) {
  return metric === 'claimsPerProvider'
    ? row.claims / row.providers
    : row[metric];
}

export function comparisonCardSummary(
  profile: SpecialtyProfile | undefined,
  metric: GeographyMetric,
  minimum: number,
  codes: [string, string],
  nameOf: (code: string) => string,
): EvidenceSummary {
  return {
    specialty: profile?.specialty ?? 'No matching specialty',
    metric,
    minimum,
    national: profile ? metricValue(profile.national, metric) : null,
    places: codes.map((code) => {
      const row = profile?.states.find((state) => state.code === code);
      const coverage = status(row, minimum);
      return {
        name: nameOf(code),
        code,
        coverage,
        providers: row?.providers ?? null,
        value: row && coverage === 'included' ? metricValue(row, metric) : null,
      };
    }),
  };
}

/** Compare the same eligible subset; ranks are ordinal, with alphabetical tie breaks. */
export function rankComparison(
  profiles: SpecialtyProfile[],
  stateA: string,
  stateB: string,
  metric: GeographyMetric,
  minimum: number,
) {
  const eligible = profiles.flatMap((profile) => {
    const a = profile.states.find((row) => row.code === stateA);
    const b = profile.states.find((row) => row.code === stateB);
    return a &&
      b &&
      status(a, minimum) === 'included' &&
      status(b, minimum) === 'included'
      ? [
          {
            specialty: profile.specialty,
            valueA: metricValue(a, metric),
            valueB: metricValue(b, metric),
          },
        ]
      : [];
  });
  const orderA = [...eligible].sort(
    (a, b) => b.valueA - a.valueA || a.specialty.localeCompare(b.specialty),
  );
  const orderB = [...eligible].sort(
    (a, b) => b.valueB - a.valueB || a.specialty.localeCompare(b.specialty),
  );
  return orderA.map((row, i) => ({
    ...row,
    rankA: i + 1,
    rankB: orderB.findIndex((other) => other.specialty === row.specialty) + 1,
  }));
}
export function difference(
  value: number,
  national: number,
  metric: GeographyMetric,
) {
  return metric === 'opioidShare'
    ? value - national
    : national > 0
      ? 100 * (value / national - 1)
      : null;
}
export function status(
  row: StateRow | undefined,
  minimum: number,
): 'included' | 'below threshold' | 'not reported' {
  return !row
    ? 'not reported'
    : row.providers < minimum
      ? 'below threshold'
      : 'included';
}
export function includedStates(
  profile: SpecialtyProfile,
  minimum: number,
  territories: boolean,
) {
  return profile.states.filter(
    (row) =>
      (STATE_CODES.has(row.code) ||
        (territories && TERRITORY_CODES.has(row.code))) &&
      status(row, minimum) === 'included',
  );
}

/** Deterministic circle packing: preserve x exactly and choose the closest collision-free y. */
export function packDots(
  points: { code: string; x: number }[],
  radius = 5,
  gap = 1,
) {
  const distance = radius * 2 + gap;
  const placed: { code: string; x: number; y: number }[] = [];
  for (const point of [...points].sort(
    (a, b) => a.x - b.x || a.code.localeCompare(b.code),
  )) {
    const neighbors = placed.filter(
      (other) => Math.abs(other.x - point.x) < distance,
    );
    const candidates = [0];
    for (const other of neighbors) {
      const dy = Math.sqrt(
        Math.max(0, distance ** 2 - (point.x - other.x) ** 2),
      );
      candidates.push(other.y + dy, other.y - dy);
    }
    candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    const y =
      candidates.find((candidate) =>
        neighbors.every(
          (other) =>
            (point.x - other.x) ** 2 + (candidate - other.y) ** 2 >=
            distance ** 2 - 1e-6,
        ),
      ) ?? 0;
    placed.push({ ...point, y });
  }
  return placed;
}

export function csvCell(value: string | number | null) {
  if (value === null) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+@\-\t\r\n]/.test(text))
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function comparisonCsv(
  profiles: SpecialtyProfile[],
  codes: string[],
  metric: GeographyMetric,
  minimum: number,
  year: number,
  source: string,
) {
  const rows: (string | number | null)[][] = [
    [
      'year',
      'specialty',
      'geography',
      'metric',
      'value',
      'national_value',
      metric === 'opioidShare'
        ? 'difference_percentage_points'
        : 'difference_percent',
      'provider_records',
      'status',
      'minimum_provider_records',
      'source',
    ],
  ];
  for (const profile of profiles)
    for (const code of codes) {
      const row = profile.states.find((d) => d.code === code);
      const state = status(row, minimum);
      const value =
        row && state === 'included' ? metricValue(row, metric) : null;
      const national = metricValue(profile.national, metric);
      rows.push([
        year,
        profile.specialty,
        code,
        metric,
        value,
        national,
        value === null ? null : difference(value, national, metric),
        row?.providers ?? null,
        state,
        minimum,
        source,
      ]);
    }
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Plain-text evidence preserves coverage and the settings behind a comparison. */
export function comparisonEvidence({
  profiles,
  group,
  search,
  specialty,
  stateA,
  stateB,
  metric,
  minimum,
  territories,
  logarithmic,
  order,
  pairMode,
  year,
  source,
  nameOf,
}: {
  profiles: SpecialtyProfile[];
  group: string[];
  search: string;
  specialty: string;
  stateA: string;
  stateB: string;
  metric: GeographyMetric;
  minimum: number;
  territories: boolean;
  logarithmic: boolean;
  order: 'alphabetical' | 'value';
  pairMode: 'values' | 'ranks';
  year: number;
  source: string;
  nameOf: (code: string) => string;
}) {
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 3,
    }).format(value);
  const unit =
    metric === 'costPerClaim'
      ? 'USD per claim'
      : metric === 'claimsPerProvider'
        ? 'claims per provider record'
        : '%';
  const deltaUnit = metric === 'opioidShare' ? 'percentage points' : '%';
  const ranks =
    pairMode === 'ranks'
      ? rankComparison(profiles, stateA, stateB, metric, minimum)
      : [];
  const lines = [
    `Medicare Part D comparison evidence · ${year}`,
    `Source: CMS Medicare Part D Prescribers by Provider\n${source}`,
    '',
    'COMPARISON SETTINGS',
    `Measure: ${metricLabels[metric]} (${unit})`,
    `Place A: ${nameOf(stateA)} (${stateA}); Place B: ${nameOf(stateB)} (${stateB})`,
    `Minimum provider records per specialty/place: ${minimum}`,
    `Place scope: ${territories ? '50 states, DC and AS, GU, MP, PR, VI' : '50 states and DC'}`,
    `Carried group: ${group.length ? group.join('; ') : 'None; all available profiles'}`,
    `Specialty search: ${search.trim() || 'None'}`,
    `Displayed specialties (${profiles.length}): ${profiles.map((p) => p.specialty).join('; ') || 'None'}`,
    `Inspected specialty: ${specialty || 'None'}`,
    `Distribution scale: ${logarithmic ? 'logarithmic' : 'linear'}; matrix order: ${order}`,
    `Paired view: ${pairMode}`,
    '',
    `PAIRED EVIDENCE · values in ${unit}; rounded to at most 3 decimals`,
  ];
  if (!profiles.length)
    lines.push('No specialties match the current group and search.');
  for (const profile of profiles) {
    const national = metricValue(profile.national, metric);
    lines.push(
      '',
      profile.specialty,
      `National aggregate: ${format(national)} ${unit}`,
    );
    for (const [label, code] of [
      ['A', stateA],
      ['B', stateB],
    ]) {
      const row = profile.states.find((r) => r.code === code);
      const coverage = status(row, minimum);
      const prefix = `${label} · ${nameOf(code)} (${code})`;
      if (!row || coverage !== 'included') {
        lines.push(
          `${prefix}: ${coverage}; provider records: ${row ? format(row.providers) : 'not reported'}; value omitted.`,
        );
        continue;
      }
      const value = metricValue(row, metric);
      const delta = difference(value, national, metric);
      lines.push(
        `${prefix}: ${format(value)} ${unit}; ${format(row.providers)} provider records; ${delta === null ? 'national-relative difference unavailable' : `${format(delta)} ${deltaUnit} versus national`}.`,
      );
    }
    if (pairMode === 'ranks') {
      const rank = ranks.find((r) => r.specialty === profile.specialty);
      lines.push(
        rank
          ? `Rank A: ${rank.rankA}; rank B: ${rank.rankB}; among ${ranks.length} eligible specialties.`
          : 'Not ranked: requires included values in both places.',
      );
    }
  }
  lines.push(
    '',
    'INTERPRETATION LIMITS',
    'Profiles cover the 18 highest-total-cost national specialties. Carried specialties absent from the displayed list may be unsupported or excluded by search.',
    'National benchmarks include all source geographies and use aggregated totals, not an average of place ratios.',
    'Cost per claim = total drug cost / total claims. Claims per provider = claims / provider-record count. Reported opioid share = observed opioid claims / all claims × 100.',
    'Economic differences = (place / national − 1) × 100 percent. Opioid differences = place − national in percentage points.',
    'Missing and filtered values are omitted, never treated as zero. The record threshold is an exploration filter, not a reliability test.',
    'Suppressed opioid counts are not imputed; reported shares are lower bounds. Cost excludes manufacturer rebates and combines multiple payer sources.',
    'Ranks use only displayed specialties included in both places; rank 1 is the largest value, not best quality. Ties are ordered alphabetically.',
    'These are descriptive 2024 aggregates, not trends or causal effects. Patient and medication mix are not adjusted. Comparisons do not establish care quality or prescribing appropriateness.',
  );
  return lines.join('\n');
}
