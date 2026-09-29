import type { Specialty, Summary } from './prescriber';

export const shareMeasures = ['providers', 'claims', 'cost'] as const;
export type ShareMeasure = (typeof shareMeasures)[number];
export const weaveMeasures = [
  'costPerClaim',
  'claimsPerProvider',
  'opioidShare',
  'antibioticShare',
] as const;
export type WeaveMeasure = (typeof weaveMeasures)[number];
export const measureNames = {
  providers: 'Provider records',
  claims: 'Claims',
  cost: 'Drug cost',
  costPerClaim: 'Cost / claim',
  claimsPerProvider: 'Claims / provider',
  opioidShare: 'Reported opioid share',
  antibioticShare: 'Reported antibiotic share',
};
export function readMeasure(row: Summary, metric: WeaveMeasure) {
  return metric === 'claimsPerProvider'
    ? row.providers > 0
      ? row.claims / row.providers
      : 0
    : row[metric];
}

/** Retain the chosen specialty and account for every record in each area total. */
export function shareBands(
  rows: Specialty[],
  totals: Summary,
  selected: string,
  order: ShareMeasure,
) {
  const names = [...rows]
    .sort(
      (a, b) => b[order] - a[order] || a.specialty.localeCompare(b.specialty),
    )
    .slice(0, 8)
    .map((row) => row.specialty);
  if (
    rows.some((row) => row.specialty === selected) &&
    !names.includes(selected)
  )
    names.push(selected);
  const chosen = names.map((name) =>
    rows.find((row) => row.specialty === name)!,
  );
  const bands = chosen.map((row) => ({
    name: row.specialty,
    remainder: false,
    values: Object.fromEntries(
      shareMeasures.map((metric) => [metric, row[metric]]),
    ) as Record<ShareMeasure, number>,
  }));
  bands.push({
    name: 'All other specialties',
    remainder: true,
    values: Object.fromEntries(
      shareMeasures.map((metric) => [
        metric,
        Math.max(
          0,
          totals[metric] - chosen.reduce((sum, row) => sum + row[metric], 0),
        ),
      ]),
    ) as Record<ShareMeasure, number>,
  });
  return bands.map((band) => ({
    ...band,
    shares: Object.fromEntries(
      shareMeasures.map((metric) => [
        metric,
        totals[metric] > 0 ? band.values[metric] / totals[metric] : 0,
      ]),
    ) as Record<ShareMeasure, number>,
  }));
}

/** Equal values share a rank; the next rank skips the tied positions. */
export function weaveRanks(rows: Specialty[]) {
  const orders = Object.fromEntries(
    weaveMeasures.map((metric) => [
      metric,
      rows.map((row) => readMeasure(row, metric)).sort((a, b) => b - a),
    ]),
  ) as Record<WeaveMeasure, number[]>;
  return rows.map((row) => ({
    row,
    ranks: Object.fromEntries(
      weaveMeasures.map((metric) => [
        metric,
        orders[metric].indexOf(readMeasure(row, metric)) + 1,
      ]),
    ) as Record<WeaveMeasure, number>,
  }));
}
export function orbitExtent(ratios: number[]) {
  return Math.max(
    1,
    Math.ceil(
      Math.max(
        0,
        ...ratios
          .filter((value) => value > 0 && Number.isFinite(value))
          .map((value) => Math.abs(Math.log2(value))),
      ),
    ),
  );
}
export function orbitRadius(ratio: number, extent: number) {
  return 195 + (Math.log2(ratio) / extent) * 112;
}
