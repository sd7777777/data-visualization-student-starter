/** Week 10 regional lens. Pure functions; checked by scripts/check_regions.mjs. */

import { MIN_RECORDS, mixRow, type DrugMixData, type MixRow } from './drug-mix';

export type RegionId = 'northeast' | 'midwest' | 'south' | 'west';
export type RegionShape = 'triangle' | 'square' | 'circle' | 'diamond';
export type Region = {
  id: RegionId;
  name: string;
  /** Okabe–Ito derived; validated for colour-vision deficiency on white. */
  color: string;
  /** Secondary encoding so region is never shown by colour alone. */
  shape: RegionShape;
  states: string[];
};

/** U.S. Census Bureau regions. DC is in the South. Territories are not assigned. */
export const REGIONS: Region[] = [
  {
    id: 'northeast',
    name: 'Northeast',
    color: '#0072b2',
    shape: 'triangle',
    states: 'CT ME MA NH RI VT NJ NY PA'.split(' '),
  },
  {
    id: 'midwest',
    name: 'Midwest',
    color: '#0a9a6e',
    shape: 'square',
    states: 'IL IN MI OH WI IA KS MN MO NE ND SD'.split(' '),
  },
  {
    id: 'south',
    name: 'South',
    color: '#d55e00',
    shape: 'circle',
    states: 'DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX'.split(' '),
  },
  {
    id: 'west',
    name: 'West',
    color: '#c37ab0',
    shape: 'diamond',
    states: 'AZ CO ID MT NV NM UT WY AK CA HI OR WA'.split(' '),
  },
];

const byState = new Map(
  REGIONS.flatMap((region) => region.states.map((code) => [code, region])),
);
export const regionOf = (code: string) => byState.get(code) ?? null;
export const regionById = (id: string) =>
  REGIONS.find((region) => region.id === id) ?? null;

/** Tile-grid positions [column, row] for the 50 states and DC. */
export const TILE_GRID: Record<string, [number, number]> = {
  AK: [0, 0], ME: [10, 0],
  VT: [9, 1], NH: [10, 1],
  WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2],
  WI: [6, 2], MI: [7, 2], NY: [8, 2], RI: [9, 2], MA: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3],
  OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4],
  WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5],
  SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
  HI: [0, 7], TX: [3, 7], FL: [8, 7],
};

/** "All specialties" uses each place's total rather than one specialty column. */
export const ALL_SPECIALTIES = 'All specialties';
/** A region median needs at least this many plotted states. */
export const MIN_REGION_STATES = 3;

export type StatePoint = {
  code: string;
  name: string;
  region: Region;
  row: MixRow;
};

/** Each state's brand-name shares for one specialty (or all), with at least MIN_RECORDS records. */
export function statePoints(data: DrugMixData, specialty: string) {
  const index = data.specialties.indexOf(specialty);
  const points: StatePoint[] = [];
  let hidden = 0;
  for (const area of data.areas) {
    const region = regionOf(area.code);
    if (!region) continue;
    const tuple =
      specialty === ALL_SPECIALTIES
        ? area.total
        : index >= 0
          ? area.specialties[index]
          : null;
    if (!tuple || tuple[0] < MIN_RECORDS) hidden += 1;
    else
      points.push({ code: area.code, name: area.name, region, row: mixRow(specialty, tuple) });
  }
  return { points, hidden };
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type RegionSummary = {
  region: Region;
  count: number;
  /** Medians of state shares; null below MIN_REGION_STATES states. */
  claimShare: number | null;
  costShare: number | null;
};

/** Unweighted medians of state values, so each dot counts once, matching the scatter. */
export function regionSummaries(points: StatePoint[]): RegionSummary[] {
  return REGIONS.map((region) => {
    const mine = points.filter((p) => p.region.id === region.id);
    const enough = mine.length >= MIN_REGION_STATES;
    return {
      region,
      count: mine.length,
      claimShare: enough ? median(mine.map((p) => p.row.brandClaimShare)) : null,
      costShare: enough ? median(mine.map((p) => p.row.brandCostShare)) : null,
    };
  });
}

export type Fingerprint = {
  specialty: string;
  national: MixRow;
  summaries: RegionSummary[];
  /** Region with the highest median brand-name share of cost. */
  leader: RegionId;
  /** Highest minus lowest region median, in share units. */
  spread: number;
};

/**
 * One row per specialty where every region has enough states for a median,
 * ordered by spread. Specialties without four comparable regions are counted, not shown.
 */
export function fingerprints(data: DrugMixData) {
  const rows: Fingerprint[] = [];
  let skipped = 0;
  for (const [index, specialty] of data.specialties.entries()) {
    const tuple = data.areas[0].specialties[index];
    const summaries = regionSummaries(statePoints(data, specialty).points);
    if (!tuple || summaries.some((s) => s.costShare === null)) {
      skipped += 1;
      continue;
    }
    const costs = summaries.map((s) => s.costShare!);
    const top = summaries.reduce((a, b) => (b.costShare! > a.costShare! ? b : a));
    rows.push({
      specialty,
      national: mixRow(specialty, tuple),
      summaries,
      leader: top.region.id,
      spread: Math.max(...costs) - Math.min(...costs),
    });
  }
  rows.sort((a, b) => b.spread - a.spread || a.specialty.localeCompare(b.specialty));
  return { rows, skipped };
}

/** How many fingerprint rows each region leads. */
export function leaderCounts(rows: Fingerprint[]) {
  const counts = Object.fromEntries(REGIONS.map((r) => [r.id, 0])) as Record<RegionId, number>;
  for (const row of rows) counts[row.leader] += 1;
  return counts;
}

/** The set of regions to emphasise: a hovered legend entry wins, then pinned entries, else none (all shown). */
export function emphasised(hovered: RegionId | null, pinned: RegionId[]) {
  if (hovered) return new Set<RegionId>([hovered]);
  return new Set<RegionId>(pinned);
}

/** Toggle one region in a pinned list, keeping legend order. */
export function togglePinned(pinned: RegionId[], id: RegionId) {
  const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
  return REGIONS.map((r) => r.id).filter((r) => next.includes(r));
}

/** Parse ?regions=south,west, ignoring unknown values. */
export function parseRegions(value: string | null) {
  if (!value) return [] as RegionId[];
  const wanted = value.split(',');
  return REGIONS.map((r) => r.id).filter((id) => wanted.includes(id));
}

/** SVG path for a region's marker, centred on 0,0 with roughly equal area to a circle of radius r. */
export function shapePath(shape: RegionShape, r: number) {
  switch (shape) {
    case 'circle':
      return `M${-r},0a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
    case 'square': {
      const s = r * 0.886;
      return `M${-s},${-s}H${s}V${s}H${-s}Z`;
    }
    case 'diamond': {
      const d = r * 1.253;
      return `M0,${-d}L${d},0L0,${d}L${-d},0Z`;
    }
    case 'triangle': {
      const t = r * 1.347;
      return `M0,${-t}L${t * 0.866},${t * 0.5}L${-t * 0.866},${t * 0.5}Z`;
    }
  }
}
