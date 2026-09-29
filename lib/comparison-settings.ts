import type { Dataset } from './prescriber';
import type { GeographyMetric } from './geography-analysis';

export type ComparisonSettings = {
  year: number;
  metric: GeographyMetric;
  specialty: string;
  stateA: string;
  stateB: string;
  target: 'A' | 'B';
  minimum: number;
  territories: boolean;
  order: 'alphabetical' | 'value';
  logarithmic: boolean;
  pairMode: 'values' | 'ranks';
  search: string;
  group: string[];
};

export const defaultComparison = (year = 2024): ComparisonSettings => ({
  year,
  metric: 'costPerClaim',
  specialty: 'Nurse Practitioner',
  stateA: 'CA',
  stateB: 'TX',
  target: 'A',
  minimum: 50,
  territories: false,
  order: 'alphabetical',
  logarithmic: false,
  pairMode: 'values',
  search: '',
  group: [],
});

const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const string = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;
const states = new Set(
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(
    ' ',
  ),
);
const territories = new Set(['AS', 'GU', 'MP', 'PR', 'VI']);

/** Strict, bounded input validation for links and portable notebook records. */
export function isComparisonSettings(v: unknown): v is ComparisonSettings {
  if (!object(v)) return false;
  const place = (code: unknown) =>
    typeof code === 'string' &&
    (states.has(code) || (v.territories === true && territories.has(code)));
  return (
    Number.isInteger(v.year) &&
    Number(v.year) >= 2000 &&
    Number(v.year) <= 2100 &&
    typeof v.metric === 'string' &&
    ['costPerClaim', 'claimsPerProvider', 'opioidShare'].includes(
      String(v.metric),
    ) &&
    string(v.specialty, 300) &&
    v.specialty.length > 0 &&
    place(v.stateA) &&
    place(v.stateB) &&
    typeof v.target === 'string' &&
    ['A', 'B'].includes(v.target) &&
    [0, 50, 200, 1000].includes(Number(v.minimum)) &&
    typeof v.minimum === 'number' &&
    typeof v.territories === 'boolean' &&
    typeof v.order === 'string' &&
    ['alphabetical', 'value'].includes(v.order) &&
    typeof v.logarithmic === 'boolean' &&
    typeof v.pairMode === 'string' &&
    ['values', 'ranks'].includes(v.pairMode) &&
    string(v.search, 100) &&
    Array.isArray(v.group) &&
    v.group.length <= 32 &&
    v.group.every((name) => string(name, 300) && name.length > 0) &&
    new Set(v.group).size === v.group.length
  );
}

export function validateComparison(
  value: unknown,
  data: Dataset,
): ComparisonSettings {
  if (!isComparisonSettings(value))
    throw new Error('This comparison contains unsupported settings.');
  if (value.year !== data.meta.year)
    throw new Error(
      `This comparison uses ${value.year} data; this explorer uses ${data.meta.year}.`,
    );
  const profiles = new Set(data.specialtyProfiles.map((p) => p.specialty));
  const names = new Set(
    data.areas.flatMap((a) => a.specialties.map((s) => s.specialty)),
  );
  if (
    !profiles.has(value.specialty) ||
    value.group.some((name) => !names.has(name))
  )
    throw new Error(
      'A specialty in this comparison is unavailable in this dataset.',
    );
  // Whitelist fields so extra imported properties never enter application state.
  return {
    year: value.year,
    metric: value.metric,
    specialty: value.specialty,
    stateA: value.stateA,
    stateB: value.stateB,
    target: value.target,
    minimum: value.minimum,
    territories: value.territories,
    order: value.order,
    logarithmic: value.logarithmic,
    pairMode: value.pairMode,
    search: value.search,
    group: [...value.group],
  };
}

export function readComparisonLink(
  search: string,
  data: Dataset,
): ComparisonSettings | null {
  const params = new URLSearchParams(search);
  if (!params.has('comparison')) return null;
  const raw = params.get('comparison')!;
  if (raw.length > 12000 || params.getAll('comparison').length !== 1)
    throw new Error('This comparison link is too large or ambiguous.');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('This comparison link could not be read.');
  }
  if (!object(value) || value.version !== 1)
    throw new Error('This comparison link uses an unsupported version.');
  return validateComparison(value.settings, data);
}

export function comparisonLink(base: string, settings: ComparisonSettings) {
  if (!isComparisonSettings(settings))
    throw new Error('The comparison could not be linked.');
  const url = new URL(base);
  url.search = '';
  url.searchParams.set('comparison', JSON.stringify({ version: 1, settings }));
  url.hash = 'place';
  return url.href;
}
