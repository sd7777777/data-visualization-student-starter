import type { Specialty } from '@/lib/prescriber';

export type Point = { x: number; y: number };
export type SelectionBox = { x: number; y: number; width: number; height: number };

export function boxBetween(start: Point, end: Point): SelectionBox {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

/** Select circle centers, not hit-target edges; inclusive for boundary points. */
export function insideBox(point: Point, box: SelectionBox) {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
}

/** Ratios of summed measures preserve claim/provider weighting. */
export function groupSummary(rows: Specialty[], geographyCost: number) {
  const totals = rows.reduce((sum, row) => ({ providers: sum.providers + row.providers, claims: sum.claims + row.claims, cost: sum.cost + row.cost }), { providers: 0, claims: 0, cost: 0 });
  return { ...totals, costPerClaim: totals.claims ? totals.cost / totals.claims : null, claimsPerProvider: totals.providers ? totals.claims / totals.providers : null, costShare: geographyCost > 0 ? 100 * totals.cost / geographyCost : null };
}
