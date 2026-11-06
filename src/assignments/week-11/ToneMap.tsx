'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- tiles and legend cells sit directly in CSS grids, which a fieldset would break; role="group" labels them. */

import type { CSSProperties } from 'react';
import { MEASURES, TONE_STEPS, inkOn, measureValue, regionTone, type LensView, type Measure } from '@/lib/regional-lens';
import { REGIONS, TILE_GRID, regionOf, type RegionId, type StatePoint } from '@/lib/regions';
import { Glyph, pct } from './shared';

export type ToneStep = { region: RegionId; step: number };

const COLUMNS = 11;
const ROWS = 8;

/** Lines along tile edges where the region changes, in grid units. */
function regionEdges() {
  const at = new Map(Object.entries(TILE_GRID).map(([code, [c, r]]) => [`${c},${r}`, code]));
  const region = (c: number, r: number) => {
    const code = at.get(`${c},${r}`);
    return code ? regionOf(code)!.id : null;
  };
  const segments: [number, number, number, number][] = [];
  for (let c = 0; c <= COLUMNS; c += 1)
    for (let r = 0; r < ROWS; r += 1)
      if (region(c - 1, r) !== region(c, r)) segments.push([c, r, c, r + 1]);
  for (let r = 0; r <= ROWS; r += 1)
    for (let c = 0; c < COLUMNS; c += 1)
      if (region(c, r - 1) !== region(c, r)) segments.push([c, r, c + 1, r]);
  return segments;
}
const REGION_EDGES = regionEdges();

export function ToneMap({
  view,
  measure,
  specialty,
  focusCode,
  pinnedCode,
  isStateLit,
  isRegionLit,
  toneStep,
  describeState,
  onHoverState,
  onTogglePin,
  onToneStep,
}: {
  view: LensView;
  measure: Measure;
  specialty: string;
  focusCode: string | null;
  pinnedCode: string | null;
  isStateLit: (state: StatePoint) => boolean;
  isRegionLit: (id: RegionId) => boolean;
  toneStep: ToneStep | null;
  describeState: (state: StatePoint) => string;
  onHoverState: (code: string | null) => void;
  onTogglePin: (code: string) => void;
  onToneStep: (step: ToneStep | null) => void;
}) {
  const byCode = new Map(view.states.map((s) => [s.code, s]));
  const { scale } = view;
  const counts = REGIONS.map((region) => {
    const tally = Array.from({ length: TONE_STEPS }, () => 0);
    for (const s of view.states)
      if (s.region.id === region.id) tally[scale.step(measureValue(s.row, measure))] += 1;
    return tally;
  });

  return (
    <figure className="rl11-card rl11-map">
      <div className="rl11-card-head">
        <span className="rl11-eyebrow">WHERE IT IS</span>
        <h2>Hue is the region. Darker is a higher share.</h2>
      </div>
      <div className="rl11-tiles-wrap">
        <div
          className="rl11-tiles"
          role="group"
          aria-label={`${specialty}: ${MEASURES[measure].label} by state, colored by Census region. Select a state to pin it.`}
        >
          {Object.entries(TILE_GRID).map(([code, [col, row]]) => {
            const s = byCode.get(code);
            const region = REGIONS.find((r) => r.states.includes(code))!;
            const on = s ? isStateLit(s) : isRegionLit(region.id);
            const fill = s ? regionTone(region.color, scale.at(measureValue(s.row, measure))) : null;
            const lit = Boolean(s && on);
            return (
              <button
                key={code}
                type="button"
                className={`rl11-tile${lit ? '' : ' dim'}${s ? '' : ' empty'}${code === focusCode ? ' focus' : ''}`}
                style={
                  {
                    gridColumn: col + 1,
                    gridRow: row + 1,
                    ...(lit ? { background: fill!, color: inkOn(fill!) } : {}),
                  } as CSSProperties
                }
                aria-pressed={code === pinnedCode}
                aria-label={s ? describeState(s) : `${code} (${region.name}): fewer than 50 records`}
                disabled={!s}
                onMouseEnter={() => s && onHoverState(code)}
                onMouseLeave={() => onHoverState(null)}
                onFocus={() => s && onHoverState(code)}
                onBlur={() => onHoverState(null)}
                onClick={() => onTogglePin(code)}
              >
                <b>{code}</b>
                <small>{s ? pct(measureValue(s.row, measure)) : '—'}</small>
              </button>
            );
          })}
          <svg className="rl11-edges" viewBox={`0 0 ${COLUMNS} ${ROWS}`} preserveAspectRatio="none" aria-hidden="true">
            {REGION_EDGES.map(([x1, y1, x2, y2]) => (
              <line key={`${x1},${y1},${x2},${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </svg>
        </div>
      </div>

      <div className="rl11-matrix" role="group" aria-label="Color legend: number of states in each region and value step. Hover or focus a cell to pick out those states.">
        {REGIONS.map((region, i) => (
          <div key={region.id} className={`rl11-matrix-row${isRegionLit(region.id) ? '' : ' dim'}`}>
            <span className="rl11-matrix-name">
              <Glyph region={region} size={12} /> {region.name}
            </span>
            {counts[i].map((count, step) => {
              const fill = regionTone(region.color, (step + 0.5) / TONE_STEPS);
              const low = scale.edges[step];
              const high = scale.edges[step + 1];
              const active = toneStep?.region === region.id && toneStep.step === step;
              return (
                <button
                  key={step}
                  type="button"
                  className={`rl11-cell${active ? ' on' : ''}`}
                  style={{ background: fill, color: inkOn(fill) }}
                  aria-label={`${region.name}, ${pct(low)} to ${pct(high)}: ${count} ${count === 1 ? 'state' : 'states'}`}
                  disabled={!count}
                  onMouseEnter={() => onToneStep({ region: region.id, step })}
                  onMouseLeave={() => onToneStep(null)}
                  onFocus={() => onToneStep({ region: region.id, step })}
                  onBlur={() => onToneStep(null)}
                >
                  {count || ''}
                </button>
              );
            })}
          </div>
        ))}
        <div className="rl11-matrix-scale" aria-hidden="true">
          <span>≤ {pct(scale.lo)}</span>
          <span>{MEASURES[measure].short}, states in each step</span>
          <span>≥ {pct(scale.hi)}</span>
        </div>
      </div>
    </figure>
  );
}
