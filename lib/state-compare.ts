/** Week 13 state-versus-nation comparison. Pure functions; checked by scripts/check_state_compare.mjs. */

import { MIN_RECORDS, mixRow, type DrugMixData } from './drug-mix';
import { toRatioRow, type RatioRow } from './cost-ratio';

export const NATION = 'US';

/** Every specialty's national row, keyed by specialty name. */
export function nationalRows(data: DrugMixData) {
  const us = data.areas.find((area) => area.code === NATION);
  const rows = new Map<string, RatioRow>();
  if (!us) return rows;
  us.specialties.forEach((tuple, index) => {
    if (!tuple || tuple[0] < MIN_RECORDS) return;
    const row = toRatioRow(mixRow(data.specialties[index], tuple));
    if (row) rows.set(row.name, row);
  });
  return rows;
}

export type StateValue = {
  code: string;
  name: string;
  /** Null when the state has fewer than MIN_RECORDS records for this specialty, or no usable split. */
  row: RatioRow | null;
};

/** One specialty across the 50 states and DC, in the order of `stateCodes`' areas. */
export function specialtyAcrossStates(data: DrugMixData, specialty: string, stateCodes: Set<string>) {
  const index = data.specialties.indexOf(specialty);
  const values: StateValue[] = [];
  for (const area of data.areas) {
    if (!stateCodes.has(area.code)) continue;
    const tuple = index >= 0 ? area.specialties[index] : null;
    const row = tuple && tuple[0] >= MIN_RECORDS ? toRatioRow(mixRow(specialty, tuple)) : null;
    values.push({ code: area.code, name: area.name, row });
  }
  return values;
}

/** Shown states ranked by multiple, highest first. */
export function rankStates(values: StateValue[]) {
  return values
    .filter((value): value is StateValue & { row: RatioRow } => value.row !== null)
    .sort((a, b) => b.row.ratio - a.row.ratio || a.name.localeCompare(b.name));
}

/**
 * Colour-scale bounds for a specialty's map. Uses states with good generic coverage when at least
 * five have it, and drops values more than 4× from the median, so one outlier cannot wash out the
 * rest; anything outside the bounds is clamped to the end colours.
 */
export function colorDomain(ranked: { row: RatioRow }[]): [number, number] {
  const solid = ranked.filter((value) => !value.row.lowCoverage);
  const basis = solid.length >= 5 ? solid : ranked;
  const all = basis.map((value) => value.row.ratio).sort((a, b) => a - b);
  const median = all[all.length >> 1];
  // Values more than four times from the median are clamped too.
  const ratios = all.filter((ratio) => ratio >= median / 4 && ratio <= median * 4);
  return [Math.min(...ratios), Math.max(...ratios)];
}

/** A state's multiple relative to the nation's: +0.12 means 12% higher. */
export const relativeTo = (value: number, nation: number) => value / nation - 1;

/** "12% higher than", "8% lower than" or "about the same as" (within ±2%). */
export function compareWords(value: number, nation: number) {
  const diff = relativeTo(value, nation);
  if (Math.abs(diff) < 0.02) return 'about the same as';
  return `${Math.round(Math.abs(diff) * 100)}% ${diff > 0 ? 'higher' : 'lower'} than`;
}

/** The page title, which must follow the selected place. */
export function headline(placeName: string, ratio: number, isNation: boolean) {
  const times = Math.round(ratio);
  return isNation
    ? `A brand-name claim costs about ${times} times as much as a generic claim`
    : `In ${placeName}, a brand-name claim costs about ${times} times as much as a generic claim`;
}

/**
 * Sequential colour for a multiple on a log scale between `low` and `high`.
 * Light sand to deep rust, interpolated in RGB; returns a hex string.
 */
export function multipleColor(value: number, low: number, high: number) {
  const from = [246, 234, 214];
  const to = [138, 47, 18];
  const span = Math.log(high) - Math.log(low);
  const t = span > 0 ? Math.min(1, Math.max(0, (Math.log(value) - Math.log(low)) / span)) : 0.5;
  return `#${from
    .map((start, i) => Math.round(start + (to[i] - start) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
export const DARK_TEXT = '#000000';

/** Whichever of dark ink or white has more contrast on the tile's fill. */
export function tileText(fill: string) {
  return contrast(fill, DARK_TEXT) >= contrast(fill, '#ffffff') ? DARK_TEXT : '#ffffff';
}
