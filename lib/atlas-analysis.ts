import type { SpecialtyProfile, Summary } from './prescriber';

// Schematic positions adapted from the explorer's existing state tile map.
// Geography is approximate; cell area never represents land area.
export const atlasTiles: [string, number, number][] = [
  ['AK', 0, 0],
  ['ME', 12, 0],
  ['WA', 1, 1],
  ['MT', 3, 1],
  ['ND', 4, 1],
  ['MN', 5, 1],
  ['WI', 6, 1],
  ['MI', 8, 1],
  ['NY', 9, 1],
  ['VT', 10, 1],
  ['NH', 11, 1],
  ['MA', 12, 1],
  ['OR', 1, 2],
  ['ID', 2, 2],
  ['WY', 3, 2],
  ['SD', 4, 2],
  ['IA', 5, 2],
  ['IL', 6, 2],
  ['IN', 7, 2],
  ['OH', 8, 2],
  ['PA', 9, 2],
  ['NJ', 10, 2],
  ['CT', 11, 2],
  ['RI', 12, 2],
  ['CA', 1, 3],
  ['NV', 2, 3],
  ['UT', 3, 3],
  ['CO', 4, 3],
  ['NE', 5, 3],
  ['MO', 6, 3],
  ['KY', 7, 3],
  ['WV', 8, 3],
  ['VA', 9, 3],
  ['MD', 10, 3],
  ['DE', 11, 3],
  ['AZ', 2, 4],
  ['NM', 3, 4],
  ['KS', 4, 4],
  ['OK', 5, 4],
  ['AR', 6, 4],
  ['TN', 7, 4],
  ['NC', 8, 4],
  ['SC', 9, 4],
  ['DC', 10, 4],
  ['HI', 0, 5],
  ['TX', 4, 5],
  ['LA', 5, 5],
  ['MS', 6, 5],
  ['AL', 7, 5],
  ['GA', 8, 5],
  ['FL', 9, 6],
];
const codes = new Set(atlasTiles.map(([code]) => code));
export const petalMetrics = [
  'costPerClaim',
  'claimsPerProvider',
  'opioidShare',
  'antibioticShare',
] as const;
export type AtlasMetric = (typeof petalMetrics)[number];
export function atlasValue(row: Summary, metric: AtlasMetric) {
  return metric === 'claimsPerProvider'
    ? row.providers
      ? row.claims / row.providers
      : 0
    : row[metric];
}
export function atlasRows(profile: SpecialtyProfile, minimum: number) {
  return profile.states.filter(
    (row) => codes.has(row.code) && row.providers >= minimum,
  );
}
/** Midrank percentile: ties share their midpoint; a singleton is at 50. */
export function percentileOf(values: number[], value: number) {
  if (!values.length) return 0;
  return (
    (100 *
      (values.filter((v) => v < value).length +
        values.filter((v) => v === value).length / 2)) /
    values.length
  );
}
export function statePetals(profile: SpecialtyProfile, minimum: number) {
  const rows = atlasRows(profile, minimum);
  const values = petalMetrics.map((metric) =>
    rows.map((row) => atlasValue(row, metric)),
  );
  return rows.map((row) => {
    const percentiles = petalMetrics.map((metric, i) =>
      percentileOf(values[i], atlasValue(row, metric)),
    );
    return {
      row,
      percentiles,
      distinctiveness: percentiles.reduce(
        (sum, value) => sum + Math.abs(value - 50),
        0,
      ),
    };
  });
}
/** Equal-width bins, including the right endpoint in the final bin. */
export function ridgeBins(values: number[], maximum: number, count = 20) {
  const bins = Array.from({ length: count }, () => 0);
  for (const value of values) {
    if (Number.isFinite(value) && value >= 0 && value <= maximum)
      bins[Math.min(count - 1, Math.floor((value / maximum) * count))]++;
  }
  return bins;
}
export function hexPoints(radius: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = ((i * 60 - 30) * Math.PI) / 180;
    return `${radius * Math.cos(angle)},${radius * Math.sin(angle)}`;
  }).join(' ');
}
/** Fixed-angle sector area is proportional to percentile, not its square. */
export function petalPath(percentile: number, index: number, radius = 62) {
  const r = radius * Math.sqrt(Math.max(0, percentile) / 100);
  const a = ((index * 90 - 128) * Math.PI) / 180;
  const b = ((index * 90 - 52) * Math.PI) / 180;
  return `M 0 0 L ${r * Math.cos(a)} ${r * Math.sin(a)} A ${r} ${r} 0 0 1 ${r * Math.cos(b)} ${r * Math.sin(b)} Z`;
}
