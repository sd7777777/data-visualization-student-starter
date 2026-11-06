/**
 * Week 11 regional lens: value tones, distributions and state-to-region comparison.
 * Pure functions built on lib/regions.ts; checked by scripts/check_regional_lens.mjs.
 */

import { LOW_COVERAGE, mixRow, type DrugMixData, type MixRow } from './drug-mix';
import {
  ALL_SPECIALTIES,
  REGIONS,
  regionOf,
  regionSummaries,
  statePoints,
  type Region,
  type RegionId,
  type RegionSummary,
  type StatePoint,
} from './regions';

// ── Measures ──

export type Measure = 'cost' | 'claims';

export const MEASURES: Record<Measure, { label: string; short: string }> = {
  cost: { label: 'Brand-name share of drug cost', short: 'drug cost' },
  claims: { label: 'Brand-name share of claims', short: 'claims' },
};

export const measureValue = (row: MixRow, measure: Measure) =>
  measure === 'claims' ? row.brandClaimShare : row.brandCostShare;

export const summaryValue = (summary: RegionSummary, measure: Measure) =>
  measure === 'claims' ? summary.claimShare : summary.costShare;

// ── Colour: hue carries the region, lightness carries the value ──

type Rgb = [number, number, number];

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const fromLinear = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];
const rgbToHex = (rgb: Rgb) =>
  `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** sRGB hex to OKLCH lightness, chroma and hue (radians). */
export function hexToOklch(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(a, B), h: Math.atan2(B, a) };
}

/** Linear sRGB for an OKLCH colour; values outside 0–1 mean it is out of gamut. */
function oklchToLinear(L: number, C: number, h: number): Rgb {
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** Lightness at the low and high end of the value scale: higher values are darker. */
export const TONE_LIGHTNESS: [number, number] = [0.93, 0.42];
const TONE_CHROMA: [number, number] = [0.05, 0.15];

/**
 * One region's colour for a position t (0–1) on the value scale. Lightness depends only on t,
 * so every region reads the same at the same value. Chroma is reduced only as far as the
 * sRGB gamut needs, which keeps the region's hue.
 */
export function regionTone(regionColor: string, t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const { h } = hexToOklch(regionColor);
  const L =
    TONE_LIGHTNESS[0] + (TONE_LIGHTNESS[1] - TONE_LIGHTNESS[0]) * clamped;
  let C = TONE_CHROMA[0] + (TONE_CHROMA[1] - TONE_CHROMA[0]) * clamped;
  if (!inGamut(oklchToLinear(L, C, h))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(L, mid, h))) lo = mid;
      else hi = mid;
    }
    C = lo;
  }
  return rgbToHex(oklchToLinear(L, C, h).map(fromLinear) as Rgb);
}

const relativeLuminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
};
/** Black or white, whichever is legible on this fill. One of them always reaches 4.5:1. */
export const inkOn = (fill: string) =>
  contrastRatio(fill, '#000000') >= contrastRatio(fill, '#ffffff')
    ? '#000000'
    : '#ffffff';

/** R-7 quantile of ascending values, matching spreadsheets and d3-array. */
export function quantile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * p;
  const low = Math.floor(at);
  const high = Math.min(low + 1, sorted.length - 1);
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low);
}

export const TONE_STEPS = 5;
const MIN_TONE_SPAN = 0.01;

export type ToneScale = {
  lo: number;
  hi: number;
  /** Position 0–1 on the scale. Values beyond the 5th–95th percentiles sit at the ends. */
  at: (value: number) => number;
  /** Legend step 0 to TONE_STEPS − 1. */
  step: (value: number) => number;
  /** Upper bound of each legend step's value range is edges[i + 1]. */
  edges: number[];
};

/**
 * The value scale shared by every region in the current view. It spans the 5th–95th
 * percentile of plotted states, so one extreme state cannot wash out the rest.
 */
export function toneScale(values: number[]): ToneScale {
  const sorted = [...values].sort((a, b) => a - b);
  let lo = quantile(sorted, 0.05) ?? 0;
  let hi = quantile(sorted, 0.95) ?? 1;
  if (hi - lo < MIN_TONE_SPAN) {
    const mid = (lo + hi) / 2;
    lo = mid - MIN_TONE_SPAN / 2;
    hi = mid + MIN_TONE_SPAN / 2;
  }
  const at = (value: number) => Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
  return {
    lo,
    hi,
    at,
    step: (value) => Math.min(TONE_STEPS - 1, Math.floor(at(value) * TONE_STEPS)),
    edges: Array.from(
      { length: TONE_STEPS + 1 },
      (_, i) => lo + ((hi - lo) * i) / TONE_STEPS,
    ),
  };
}

/** CSS-ready gradient stops [position 0–1, colour] for a region's tone along an axis. */
export function toneStops(
  regionColor: string,
  scale: ToneScale,
  domain: [number, number],
  count = 9,
) {
  const [start, end] = domain;
  return Array.from({ length: count }, (_, i) => {
    const position = i / (count - 1);
    return [
      position,
      regionTone(regionColor, scale.at(start + (end - start) * position)),
    ] as const;
  });
}

// ── Distributions ──

export type BoxStats = {
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

export function boxStats(values: number[]): BoxStats | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: sorted[0],
    q1: quantile(sorted, 0.25)!,
    median: quantile(sorted, 0.5)!,
    q3: quantile(sorted, 0.75)!,
    max: sorted.at(-1)!,
  };
}

/**
 * Beeswarm offsets. Marks keep their exact x position and move the shortest distance
 * off the centre line that avoids every placed mark. Deterministic for a given input.
 */
export function dodge(
  items: { id: string; x: number }[],
  spacing: number,
): Map<string, number> {
  const placed: { x: number; y: number }[] = [];
  const offsets = new Map<string, number>();
  const step = spacing / 3;
  const ordered = [...items].sort(
    (a, b) => a.x - b.x || a.id.localeCompare(b.id),
  );
  for (const item of ordered) {
    let y = 0;
    for (let tries = 0; tries < 400; tries += 1) {
      const magnitude = step * Math.ceil(tries / 2);
      y = (tries % 2 ? magnitude : -magnitude) || 0;
      if (placed.every((p) => Math.hypot(p.x - item.x, p.y - y) >= spacing - 1e-6))
        break;
    }
    placed.push({ x: item.x, y });
    offsets.set(item.id, y);
  }
  return offsets;
}

// ── One view: states, summaries and the shared scale ──

export type LensView = {
  states: StatePoint[];
  hidden: number;
  summaries: RegionSummary[];
  scale: ToneScale;
  boxes: Record<RegionId, { cost: BoxStats | null; claims: BoxStats | null }>;
};

export function lensView(
  data: DrugMixData,
  specialty: string,
  measure: Measure,
): LensView {
  const { points: states, hidden } = statePoints(data, specialty);
  const boxes = Object.fromEntries(
    REGIONS.map((region) => {
      const mine = states.filter((s) => s.region.id === region.id);
      return [
        region.id,
        {
          cost: boxStats(mine.map((s) => s.row.brandCostShare)),
          claims: boxStats(mine.map((s) => s.row.brandClaimShare)),
        },
      ];
    }),
  ) as LensView['boxes'];
  return {
    states,
    hidden,
    summaries: regionSummaries(states),
    scale: toneScale(states.map((s) => measureValue(s.row, measure))),
    boxes,
  };
}

/** The whole-country row for one specialty, or for all specialties. */
export function nationalRow(data: DrugMixData, specialty: string) {
  const us = data.areas[0];
  if (specialty === ALL_SPECIALTIES) return mixRow(specialty, us.total);
  const tuple = us.specialties[data.specialties.indexOf(specialty)];
  return tuple ? mixRow(specialty, tuple) : null;
}

// ── Every specialty ──

export type SpecialtyRow = {
  specialty: string;
  nationalValue: number;
  national: MixRow;
  medians: { region: Region; value: number; count: number }[];
  leader: RegionId;
  spread: number;
  lowCoverage: boolean;
};

/**
 * One row per specialty where all four regions have enough states for a median,
 * for the chosen measure. "All specialties" is returned separately so sorting keeps it on top.
 */
export function specialtyRows(data: DrugMixData, measure: Measure) {
  const build = (specialty: string, national: MixRow): SpecialtyRow | null => {
    const summaries = regionSummaries(statePoints(data, specialty).points);
    if (summaries.some((s) => summaryValue(s, measure) === null)) return null;
    const medians = summaries.map((s) => ({
      region: s.region,
      value: summaryValue(s, measure)!,
      count: s.count,
    }));
    const values = medians.map((m) => m.value);
    return {
      specialty,
      national,
      nationalValue: measureValue(national, measure),
      medians,
      leader: medians.reduce((a, b) => (b.value > a.value ? b : a)).region.id,
      spread: Math.max(...values) - Math.min(...values),
      lowCoverage: national.claimCoverage < LOW_COVERAGE,
    };
  };
  const rows: SpecialtyRow[] = [];
  let skipped = 0;
  data.specialties.forEach((specialty, index) => {
    const tuple = data.areas[0].specialties[index];
    const row = tuple ? build(specialty, mixRow(specialty, tuple)) : null;
    if (row) rows.push(row);
    else skipped += 1;
  });
  rows.sort(
    (a, b) => b.spread - a.spread || a.specialty.localeCompare(b.specialty),
  );
  return {
    overall: build(ALL_SPECIALTIES, mixRow(ALL_SPECIALTIES, data.areas[0].total))!,
    rows,
    skipped,
  };
}

export const leaderTally = (rows: SpecialtyRow[]) => {
  const tally = Object.fromEntries(REGIONS.map((r) => [r.id, 0])) as Record<
    RegionId,
    number
  >;
  for (const row of rows) tally[row.leader] += 1;
  return tally;
};

// ── One state against the regions ──

export type StateAcross = {
  code: string;
  name: string;
  region: Region;
  /** Value and difference from the national share per specialty; null below the record threshold. */
  values: Map<string, { value: number; vsNational: number; vsRegion: number } | null>;
  compared: number;
  aboveNational: number;
  aboveRegion: number;
};

/** Compare one state with the national share and its own region's median, specialty by specialty. */
export function stateAcross(
  data: DrugMixData,
  code: string,
  rows: SpecialtyRow[],
  measure: Measure,
  overall?: SpecialtyRow,
): StateAcross | null {
  const region = regionOf(code);
  const area = data.areas.find((a) => a.code === code);
  if (!region || !area) return null;
  const values: StateAcross['values'] = new Map();
  let compared = 0;
  let aboveNational = 0;
  let aboveRegion = 0;
  const entry = (row: SpecialtyRow) => {
    const point = statePoints(data, row.specialty).points.find(
      (p) => p.code === code,
    );
    if (!point) return null;
    const value = measureValue(point.row, measure);
    const own = row.medians.find((m) => m.region.id === region.id)!.value;
    return {
      value,
      vsNational: value - row.nationalValue,
      vsRegion: value - own,
    };
  };
  for (const row of rows) {
    const result = entry(row);
    values.set(row.specialty, result);
    if (!result) continue;
    compared += 1;
    if (result.vsNational > 0) aboveNational += 1;
    if (result.vsRegion > 0) aboveRegion += 1;
  }
  // The all-specialties row is drawn too, but it is not one of the counted specialties.
  if (overall) values.set(overall.specialty, entry(overall));
  return { code, name: area.name, region, values, compared, aboveNational, aboveRegion };
}

/** Where a state sits among all plotted states and within its region (1 = highest). */
export function stateRanks(states: StatePoint[], code: string, measure: Measure) {
  const me = states.find((s) => s.code === code);
  if (!me) return null;
  const rank = (group: StatePoint[]) =>
    [...group]
      .sort((a, b) => measureValue(b.row, measure) - measureValue(a.row, measure))
      .findIndex((s) => s.code === code) + 1;
  const mine = states.filter((s) => s.region.id === me.region.id);
  return {
    national: rank(states),
    nationalOf: states.length,
    region: rank(mine),
    regionOf: mine.length,
  };
}

export type RowSort = 'spread' | 'name' | 'state';

export function sortSpecialtyRows(
  rows: SpecialtyRow[],
  sort: RowSort,
  across: StateAcross | null,
) {
  const sorted = [...rows];
  if (sort === 'name')
    sorted.sort((a, b) => a.specialty.localeCompare(b.specialty));
  else if (sort === 'state' && across)
    sorted.sort((a, b) => {
      const av = across.values.get(a.specialty)?.vsNational;
      const bv = across.values.get(b.specialty)?.vsNational;
      if (av === undefined && bv === undefined)
        return a.specialty.localeCompare(b.specialty);
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return bv - av;
    });
  else
    sorted.sort(
      (a, b) => b.spread - a.spread || a.specialty.localeCompare(b.specialty),
    );
  return sorted;
}

// ── Clearing a selection ──

export type Selection = { pinnedState: string | null; pinned: RegionId[] };

/** A click on empty space closes the topmost selection: the pinned state, then pinned regions. */
export function clickAway(selection: Selection): Selection {
  if (selection.pinnedState) return { ...selection, pinnedState: null };
  return { ...selection, pinned: [] };
}

// ── Shareable view ──

export const DEFAULT_SPECIALTY = 'Psychiatry';
export type LensLayout = 'strips' | 'scatter';

export const parseMeasure = (value: string | null): Measure =>
  value === 'claims' ? 'claims' : 'cost';
export const parseLayout = (value: string | null): LensLayout =>
  value === 'scatter' ? 'scatter' : 'strips';
export const parseSort = (value: string | null): RowSort =>
  value === 'name' || value === 'state' ? value : 'spread';

/** Values for a downloadable table of the plotted states. */
export function stateTableRows(view: LensView) {
  return [...view.states]
    .sort(
      (a, b) =>
        REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) ||
        b.row.brandCostShare - a.row.brandCostShare,
    )
    .map((s) => ({
      code: s.code,
      name: s.name,
      region: s.region,
      records: s.row.records,
      claimShare: s.row.brandClaimShare,
      costShare: s.row.brandCostShare,
      brandPerClaim: s.row.brandCostPerClaim,
      genericPerClaim: s.row.genericCostPerClaim,
      coverage: s.row.claimCoverage,
    }));
}
