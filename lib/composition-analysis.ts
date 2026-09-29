import type { Specialty, Summary } from './prescriber';
import type { ShareMeasure } from './wonder-analysis';

export type MosaicItem = {
  name: string;
  remainder: boolean;
  values: Record<ShareMeasure, number>;
};
export type MosaicTile = MosaicItem & {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Keep all available specialties; reconcile omitted categories to area totals. */
export function mosaicItems(rows: Specialty[], total: Summary): MosaicItem[] {
  const items: MosaicItem[] = rows.map((row) => ({
    name: row.specialty,
    remainder: false,
    values: { providers: row.providers, claims: row.claims, cost: row.cost },
  }));
  const values = { providers: 0, claims: 0, cost: 0 };
  for (const metric of ['providers', 'claims', 'cost'] as const)
    values[metric] = Math.max(
      0,
      total[metric] - rows.reduce((sum, row) => sum + row[metric], 0),
    );
  if (Object.values(values).some((value) => value > 0))
    items.push({ name: 'All other specialties', remainder: true, values });
  return items;
}

/** Balanced binary treemap: unpadded rectangle area is exactly proportional to value. */
export function mosaicLayout(
  items: MosaicItem[],
  metric: ShareMeasure,
  width = 960,
  height = 520,
): MosaicTile[] {
  const sorted = items
    .filter((item) => item.values[metric] > 0)
    .sort(
      (a, b) =>
        b.values[metric] - a.values[metric] || a.name.localeCompare(b.name),
    );
  function split(
    rows: MosaicItem[],
    x: number,
    y: number,
    w: number,
    h: number,
  ): MosaicTile[] {
    if (!rows.length) return [];
    if (rows.length === 1) return [{ ...rows[0], x, y, width: w, height: h }];
    const total = rows.reduce((sum, row) => sum + row.values[metric], 0);
    let sum = rows[0].values[metric],
      cut = 1;
    while (
      cut < rows.length - 1 &&
      Math.abs(sum + rows[cut].values[metric] - total / 2) <
        Math.abs(sum - total / 2)
    ) {
      sum += rows[cut].values[metric];
      cut++;
    }
    const fraction = sum / total;
    return w >= h
      ? [
          ...split(rows.slice(0, cut), x, y, w * fraction, h),
          ...split(rows.slice(cut), x + w * fraction, y, w * (1 - fraction), h),
        ]
      : [
          ...split(rows.slice(0, cut), x, y, w, h * fraction),
          ...split(rows.slice(cut), x, y + h * fraction, w, h * (1 - fraction)),
        ];
  }
  return width > 0 && height > 0 ? split(sorted, 0, 0, width, height) : [];
}

/** One common ordering across all curves; omitted specialties are never ranked as one specialty. */
export function concentrationRows(
  rows: Specialty[],
  total: Summary,
  order: ShareMeasure,
) {
  const running = { providers: 0, claims: 0, cost: 0 };
  return [...rows]
    .sort(
      (a, b) => b[order] - a[order] || a.specialty.localeCompare(b.specialty),
    )
    .map((row, index) => {
      const shares = { providers: 0, claims: 0, cost: 0 };
      for (const metric of ['providers', 'claims', 'cost'] as const) {
        // Whole-dollar rounding can put specialty sums $1–$2 above area totals.
        running[metric] += row[metric];
        shares[metric] =
          total[metric] > 0 ? Math.min(1, running[metric] / total[metric]) : 0;
      }
      return { row, rank: index + 1, totals: { ...running }, shares };
    });
}

export function costIntensity(
  values: Record<ShareMeasure, number>,
  total: Summary,
) {
  return values.claims > 0 && total.claims > 0 && total.cost > 0
    ? values.cost / values.claims / (total.cost / total.claims)
    : null;
}

/** Width × height encodes cost: denominator share × dollars per denominator. */
export function skylineItems(
  rows: Specialty[],
  total: Summary,
  selected: string,
) {
  const ordered = [...rows].sort(
    (a, b) => b.cost - a.cost || a.specialty.localeCompare(b.specialty),
  );
  const chosen = ordered.slice(0, 12);
  const extra = ordered.find((row) => row.specialty === selected);
  if (extra && !chosen.includes(extra)) chosen.push(extra);
  return mosaicItems(chosen, total);
}
export function skylineLayout(
  items: MosaicItem[],
  denominator: 'claims' | 'providers',
) {
  const available = items.filter((item) => item.values[denominator] > 0);
  const total = available.reduce(
    (sum, item) => sum + item.values[denominator],
    0,
  );
  let offset = 0;
  return available.map((item) => {
    const width = item.values[denominator] / total;
    const tower = {
      ...item,
      offset,
      width,
      height: item.values.cost / item.values[denominator],
    };
    offset += width;
    return tower;
  });
}
