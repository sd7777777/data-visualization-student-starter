/** Week 12 brand-to-generic cost ratio. Pure functions; checked by scripts/check_cost_ratio.mjs. */

import {
  LOW_COVERAGE,
  areaRows,
  costMultiple,
  mixRow,
  type DrugMixArea,
  type DrugMixData,
  type MixRow,
} from './drug-mix';

export type RatioSort = 'ratio' | 'brand' | 'generic';
export const RATIO_SORTS: { id: RatioSort; label: string }[] = [
  { id: 'ratio', label: 'Multiple' },
  { id: 'brand', label: 'Brand cost' },
  { id: 'generic', label: 'Generic cost' },
];
export const DEFAULT_GEOGRAPHY = 'US';

export type RatioRow = {
  name: string;
  /** Shortened for the row label. `name` stays in the detail card and for screen readers. */
  label: string;
  generic: number;
  brand: number;
  ratio: number;
  /** True when under LOW_COVERAGE of claims have a reported generic split. */
  lowCoverage: boolean;
  row: MixRow;
};

const LABELS: Record<string, string> = {
  'Advanced Heart Failure and Transplant Cardiology': 'Heart failure & transplant cardiology',
  'Clinical Cardiac Electrophysiology': 'Cardiac electrophysiology',
  'Student in an Organized Health Care Education/Training Program': 'Students in training programs',
  'Critical Care (Intensivists)': 'Critical care',
  'Allergy/ Immunology': 'Allergy & immunology',
};
export const shortLabel = (name: string) => LABELS[name] ?? name;

export function toRatioRow(row: MixRow): RatioRow | null {
  const ratio = costMultiple(row);
  if (ratio === null || row.brandCostPerClaim === null || row.genericCostPerClaim === null) return null;
  return {
    name: row.name,
    label: shortLabel(row.name),
    generic: row.genericCostPerClaim,
    brand: row.brandCostPerClaim,
    ratio,
    lowCoverage: row.claimCoverage < LOW_COVERAGE,
    row,
  };
}

/** Specialties with enough records and a positive cost per claim on both sides. */
export function ratioRows(data: DrugMixData, area: DrugMixArea) {
  const { rows, excluded } = areaRows(data, area);
  const ratios: RatioRow[] = [];
  let unusable = 0;
  for (const row of rows) {
    const ratioRow = toRatioRow(row);
    if (ratioRow) ratios.push(ratioRow);
    else unusable += 1;
  }
  return { rows: ratios, excluded: excluded + unusable };
}

export function sortRatioRows(rows: RatioRow[], sort: RatioSort) {
  return [...rows].sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name));
}

/** The whole geography, every specialty included. */
export function areaTotal(area: DrugMixArea) {
  return toRatioRow(mixRow(area.name, area.total));
}

/** Where a row's multiple sits among one geography's specialties (1 = highest). */
export function ratioRank(rows: RatioRow[], name: string) {
  const ranked = sortRatioRows(rows, 'ratio');
  const index = ranked.findIndex((row) => row.name === name);
  return index < 0 ? null : index + 1;
}

/** Places in the file that are one of the 50 states or DC. */
export function stateAreas(data: DrugMixData, stateCodes: Set<string>) {
  return data.areas
    .filter((area) => stateCodes.has(area.code))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const parseRatioSort = (value: string | null): RatioSort =>
  RATIO_SORTS.some((sort) => sort.id === value) ? (value as RatioSort) : 'ratio';

export const formatMultiple = (value: number) =>
  `${value >= 100 ? Math.round(value) : value.toFixed(1)}×`;

export const formatPerClaim = (value: number) =>
  `$${value.toLocaleString('en-US', {
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: value < 100 ? 2 : 0,
  })}`;

/** Log-axis tick marks at 1–3–10 steps inside the domain. */
export function logTicks(low: number, high: number) {
  const ticks: number[] = [];
  for (let power = Math.floor(Math.log10(low)); power <= Math.ceil(Math.log10(high)); power += 1) {
    for (const step of [1, 3]) {
      const tick = step * 10 ** power;
      if (tick >= low && tick <= high) ticks.push(tick);
    }
  }
  return ticks;
}
