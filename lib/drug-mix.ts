/** Week 8 brand/generic calculations. Pure functions; checked by scripts/check_drug_mix.mjs. */

import { csvCell } from './geography-analysis';

/** records, claims, cost, coveredRecords, coveredClaims, coveredCost, genericClaims, genericCost */
export type MixTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type DrugMixArea = {
  code: string;
  name: string;
  total: MixTuple;
  specialties: (MixTuple | null)[];
};
export type DrugMixData = {
  meta: {
    year: number;
    rows: number;
    specialtyCount: number;
    retainedCostShare: number;
    otherShareOfNonGeneric: { claims: number; cost: number };
    source: string;
  };
  specialties: string[];
  areas: DrugMixArea[];
};

export type MixRow = {
  name: string;
  records: number;
  claims: number;
  cost: number;
  /** Share of claims / cost whose generic subgroup is reported (0–1). */
  claimCoverage: number;
  costCoverage: number;
  /** Brand-name (incl. CMS "other") share of covered claims / cost (0–1). */
  brandClaimShare: number;
  brandCostShare: number;
  brandCost: number;
  brandCostPerClaim: number | null;
  genericCostPerClaim: number | null;
};

export type MixSort = 'brandCost' | 'costShare' | 'claimShare' | 'gap';

/** Minimum provider records for a geography × specialty row to be compared. */
export const MIN_RECORDS = 50;
/** Rows below this claim coverage are flagged rather than hidden. */
export const LOW_COVERAGE = 0.95;

export function mixRow(name: string, tuple: MixTuple): MixRow {
  const [
    records,
    claims,
    cost,
    ,
    coveredClaims,
    coveredCost,
    genericClaims,
    genericCost,
  ] = tuple;
  const brandClaims = coveredClaims - genericClaims;
  const brandCost = coveredCost - genericCost;
  return {
    name,
    records,
    claims,
    cost,
    claimCoverage: claims ? coveredClaims / claims : 0,
    costCoverage: cost ? coveredCost / cost : 0,
    brandClaimShare: coveredClaims ? brandClaims / coveredClaims : 0,
    brandCostShare: coveredCost ? brandCost / coveredCost : 0,
    brandCost,
    brandCostPerClaim: brandClaims > 0 ? brandCost / brandClaims : null,
    genericCostPerClaim: genericClaims > 0 ? genericCost / genericClaims : null,
  };
}

/** Specialty rows for one geography, keeping only rows with enough records. */
export function areaRows(data: DrugMixData, area: DrugMixArea) {
  const rows: MixRow[] = [];
  let excluded = 0;
  area.specialties.forEach((tuple, i) => {
    if (!tuple) return;
    if (tuple[0] < MIN_RECORDS) excluded += 1;
    else rows.push(mixRow(data.specialties[i], tuple));
  });
  return { rows, excluded };
}

export function sortRows(rows: MixRow[], sort: MixSort) {
  const value = (row: MixRow) =>
    sort === 'brandCost'
      ? row.brandCost
      : sort === 'costShare'
        ? row.brandCostShare
        : sort === 'claimShare'
          ? row.brandClaimShare
          : row.brandCostShare - row.brandClaimShare;
  return [...rows].sort(
    (a, b) => value(b) - value(a) || a.name.localeCompare(b.name),
  );
}

/** Each place's value for one specialty, for the state comparison scatter. */
export function stateRows(
  data: DrugMixData,
  specialty: string,
  codes: Set<string>,
) {
  const index = data.specialties.indexOf(specialty);
  return data.areas
    .filter((area) => codes.has(area.code))
    .map((area) => {
      const tuple = index >= 0 ? area.specialties[index] : null;
      return {
        code: area.code,
        name: area.name,
        row: tuple && tuple[0] >= MIN_RECORDS ? mixRow(specialty, tuple) : null,
      };
    });
}

/** How many times more a brand claim costs than a generic claim. */
export function costMultiple(row: MixRow) {
  return row.brandCostPerClaim && row.genericCostPerClaim
    ? row.brandCostPerClaim / row.genericCostPerClaim
    : null;
}

export function mixCsv(areaName: string, year: number, rows: MixRow[]) {
  const header = [
    'geography',
    'year',
    'specialty',
    'provider_records',
    'claims',
    'total_drug_cost',
    'brand_and_other_claim_share_pct',
    'brand_and_other_cost_share_pct',
    'brand_and_other_cost',
    'brand_and_other_cost_per_claim',
    'generic_cost_per_claim',
    'claim_coverage_pct',
    'cost_coverage_pct',
  ];
  const round = (value: number | null, digits = 2) =>
    value === null ? null : Number(value.toFixed(digits));
  const lines = rows.map((row) => [
    areaName,
    year,
    row.name,
    row.records,
    row.claims,
    row.cost,
    round(row.brandClaimShare * 100),
    round(row.brandCostShare * 100),
    Math.round(row.brandCost),
    round(row.brandCostPerClaim),
    round(row.genericCostPerClaim),
    round(row.claimCoverage * 100),
    round(row.costCoverage * 100),
  ]);
  return [header, ...lines]
    .map((line) => line.map(csvCell).join(','))
    .join('\r\n');
}
