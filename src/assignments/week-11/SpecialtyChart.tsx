'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG cannot hold HTML buttons, so each row is a focusable role="button" with Enter and Space. */

import { useMemo, useState, type CSSProperties } from 'react';
import { scaleLinear } from 'd3-scale';
import {
  MEASURES,
  leaderTally,
  quantile,
  sortSpecialtyRows,
  type Measure,
  type RowSort,
  type SpecialtyRow,
  type StateAcross,
} from '@/lib/regional-lens';
import { ALL_SPECIALTIES, REGIONS, shapePath, type RegionId } from '@/lib/regions';
import { StateMenu } from './StateCard';
import { Glyph, pct, signedPoints, useWidth } from './shared';

const ROW_H = 28;
const TOP = 34;

const axisSpan = (rows: SpecialtyRow[], across: StateAcross | null) => {
  const medians = rows
    .filter((row) => !row.lowCoverage)
    .flatMap((row) => row.medians.map((m) => Math.abs(m.value - row.nationalValue)));
  const span = Math.max(...medians, 0.01) * 1.1;
  if (!across) return span;
  const state = rows
    .filter((row) => !row.lowCoverage)
    .flatMap((row) => {
      const entry = across.values.get(row.specialty);
      return entry ? [Math.abs(entry.vsNational)] : [];
    })
    .sort((a, b) => a - b);
  const typical = quantile(state, 0.9) ?? 0;
  return Math.max(span, Math.min(typical * 1.1, span * 2));
};

/** Every specialty: the four regional medians against the national share, with an optional state overlaid. */
export function SpecialtyChart({
  overall,
  rows,
  skipped,
  measure,
  specialty,
  sort,
  across,
  pinnedCode,
  stateNames,
  isLit,
  onSpecialty,
  onSort,
  onPick,
}: {
  overall: SpecialtyRow;
  rows: SpecialtyRow[];
  skipped: number;
  measure: Measure;
  specialty: string;
  sort: RowSort;
  across: StateAcross | null;
  pinnedCode: string | null;
  stateNames: { code: string; name: string }[];
  isLit: (id: RegionId) => boolean;
  onSpecialty: (name: string) => void;
  onSort: (sort: RowSort) => void;
  onPick: (code: string | null) => void;
}) {
  const [ref, measured] = useWidth<HTMLDivElement>(1100);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const W = Math.max(280, measured);
  const narrow = W < 620;
  const labelW = narrow ? 118 : 262;
  const rightW = narrow ? 40 : 124;

  const ordered = useMemo(
    () => [overall, ...sortSpecialtyRows(rows, sort, across)],
    [across, overall, rows, sort],
  );
  const tally = useMemo(() => leaderTally(rows), [rows]);

  // The axis follows well-covered rows, so one low-coverage specialty cannot flatten the other 27.
  // Anything beyond it sits at the edge with its value printed.
  const span = axisSpan(ordered, across);
  const x = scaleLinear()
    .domain([-span, span])
    .range([labelW + (narrow ? 22 : 34), W - rightW - (narrow ? 22 : 34)])
    .nice();
  const [axisLo, axisHi] = x.domain();
  const place = (value: number) => x(Math.min(axisHi, Math.max(axisLo, value)));
  const beyond = (value: number) => value < axisLo || value > axisHi;
  const H = TOP + ordered.length * ROW_H + 8;
  const hovered = hoverRow ? ordered.find((r) => r.specialty === hoverRow) : null;
  const hoverIndex = hovered ? ordered.indexOf(hovered) : -1;
  const hoverState = hovered && across ? across.values.get(hovered.specialty) : null;

  return (
    <figure className="rl11-card rl11-every" id="rl11-every">
      <div className="rl11-card-head rl11-every-head">
        <div>
          <span className="rl11-eyebrow">EVERY SPECIALTY</span>
          <h2>
            {across
              ? `${across.name} against the four regions, specialty by specialty`
              : 'Does the regional pattern hold across specialties?'}
          </h2>
          <p>
            {across ? (
              <>
                The outlined diamond is {across.name}. It is above the U.S. share in{' '}
                <b>{across.aboveNational} of {across.compared}</b> specialties and above the {across.region.name} median in{' '}
                <b>{across.aboveRegion}</b>.
              </>
            ) : (
              <>
                Highest median {MEASURES[measure].short} share: South in <b>{tally.south}</b> of {rows.length} specialties, Northeast in <b>{tally.northeast}</b>, Midwest in <b>{tally.midwest}</b>, West in <b>{tally.west}</b>.
              </>
            )}{' '}
            Select a row to load that specialty above.
          </p>
        </div>
        <div className="rl11-every-controls">
          <StateMenu value={pinnedCode} names={stateNames} onChange={onPick} label="Overlay a state" />
          <label className="rl11-state-menu">
            <span>Sort rows</span>
            <select value={sort} onChange={(e) => onSort(e.target.value as RowSort)}>
              <option value="spread">Largest regional spread</option>
              <option value="name">Specialty name</option>
              <option value="state" disabled={!across}>
                {across ? `${across.name} vs. U.S.` : 'State vs. U.S. (pick a state)'}
              </option>
            </select>
          </label>
        </div>
      </div>
      <div className="rl11-every-plot" ref={ref}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label={`Regional medians of ${MEASURES[measure].label.toLowerCase()} relative to the national share, for ${rows.length} specialties.${across ? ` ${across.name} is overlaid.` : ''}`}
        >
          {x.ticks(narrow ? 3 : 8).map((tick) => (
            <g key={tick} aria-hidden="true">
              <line x1={x(tick)} x2={x(tick)} y1={26} y2={H - 6} className={tick === 0 ? 'rl11-zero' : 'rl11-gridline'} />
              <text x={x(tick)} y={16} textAnchor="middle" className="rl11-tick">
                {tick === 0 ? (narrow ? 'U.S.' : 'U.S. share') : `${tick > 0 ? '+' : '−'}${Math.abs(tick * 100).toFixed(0)}`}
              </text>
            </g>
          ))}
          <text x={W - 8} y={16} textAnchor="end" className="rl11-axis" aria-hidden="true">
            {across ? (narrow ? across.code : `${across.code} vs. U.S.`) : narrow ? 'Top' : 'Highest region'}
          </text>
          {ordered.map((row, i) => {
            const y = TOP + i * ROW_H + ROW_H / 2;
            const ds = row.medians.map((m) => m.value - row.nationalValue);
            const active = row.specialty === specialty;
            const leader = REGIONS.find((g) => g.id === row.leader)!;
            const stateEntry = across?.values.get(row.specialty) ?? null;
            const title = row.specialty.length > (narrow ? 15 : 34)
              ? `${row.specialty.slice(0, narrow ? 14 : 33)}…`
              : row.specialty;
            return (
              <g
                key={row.specialty}
                className={`rl11-row${active ? ' active' : ''}${row.specialty === ALL_SPECIALTIES ? ' overall' : ''}`}
                style={{ transform: `translateY(${y}px)` } as CSSProperties}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`Load ${row.specialty}. ${row.medians.map((m) => `${m.region.name} ${pct(m.value)}`).join(', ')}; U.S. ${pct(row.nationalValue)}.${stateEntry && across ? ` ${across.name} ${pct(stateEntry.value)}.` : ''}`}
                onClick={() => onSpecialty(row.specialty)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSpecialty(row.specialty);
                  }
                }}
                onMouseEnter={() => setHoverRow(row.specialty)}
                onMouseLeave={() => setHoverRow(null)}
                onFocus={() => setHoverRow(row.specialty)}
                onBlur={() => setHoverRow(null)}
              >
                <rect x={0} y={-ROW_H / 2} width={W} height={ROW_H} rx={4} className="rl11-row-bg" />
                <text x={6} y={5} className="rl11-row-label">
                  {title}
                  {row.lowCoverage ? ' †' : ''}
                </text>
                <line x1={place(Math.min(...ds))} x2={place(Math.max(...ds))} y1={0} y2={0} className="rl11-range" />
                {[...row.medians]
                  .sort((a, b) => Number(isLit(a.region.id)) - Number(isLit(b.region.id)))
                  .map((m) => (
                    <path
                      key={m.region.id}
                      transform={`translate(${place(m.value - row.nationalValue)},0)`}
                      d={shapePath(m.region.shape, 6)}
                      className={isLit(m.region.id) ? 'rl11-mark' : 'rl11-mark dim'}
                      fill={isLit(m.region.id) ? m.region.color : undefined}
                    />
                  ))}
                {stateEntry && (
                  <path
                    className="rl11-state-mark"
                    transform={`translate(${place(stateEntry.vsNational)},0)`}
                    d="M0,-9L9,0L0,9L-9,0Z"
                  />
                )}
                {[...row.medians.map((m) => m.value - row.nationalValue), ...(stateEntry ? [stateEntry.vsNational] : [])]
                  .filter(beyond)
                  .sort((a, b) => a - b)
                  .filter((value, n, all) => n === (value < 0 ? 0 : all.length - 1))
                  .map((value) => (
                    <text
                      key={value}
                      x={place(value) + (value < 0 ? -12 : 12)}
                      y={4}
                      textAnchor={value < 0 ? 'end' : 'start'}
                      className="rl11-beyond"
                    >
                      {signedPoints(value, '')}
                    </text>
                  ))}
                {across ? (
                  <text x={W - 8} y={5} textAnchor="end" className={`rl11-row-delta${stateEntry ? '' : ' none'}`}>
                    {stateEntry ? signedPoints(stateEntry.vsNational, narrow ? '' : ' pts') : '—'}
                  </text>
                ) : narrow ? (
                  <path
                    transform={`translate(${W - 18},0)`}
                    d={shapePath(leader.shape, 5.5)}
                    fill={isLit(leader.id) ? leader.color : 'var(--rl-dim)'}
                  />
                ) : (
                  <text x={W - 8} y={5} textAnchor="end" className={isLit(leader.id) ? 'rl11-row-leader' : 'rl11-row-leader dim'}>
                    {leader.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hovered && (
          <div
            className="rl11-row-tip"
            style={{ top: TOP + hoverIndex * ROW_H + ROW_H / 2 }}
            data-above={hoverIndex > ordered.length - 7 ? 'true' : undefined}
            data-left={narrow ? 'true' : undefined}
            role="status"
          >
            <b>{hovered.specialty}</b>
            <ul>
              {[...hovered.medians]
                .sort((a, b) => b.value - a.value)
                .map((m) => (
                  <li key={m.region.id}>
                    <span>
                      <Glyph region={m.region} size={11} /> {m.region.name} median
                    </span>
                    <span>{pct(m.value)}</span>
                  </li>
                ))}
              <li className="us">
                <span>U.S.</span>
                <span>{pct(hovered.nationalValue)}</span>
              </li>
              {across && (
                <li className="state">
                  <span>{across.name}</span>
                  <span>{hoverState ? pct(hoverState.value) : 'too few records'}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <figcaption>
        Percentage points from the national share of {MEASURES[measure].short}. Each mark is a region’s median state; marks beyond the axis sit at its edge with their value. {skipped} specialties lack 3+ states in every region and are left out.{' '}
        † CMS suppresses generic values for more than 5% of these claims, so read them with care.
      </figcaption>
    </figure>
  );
}
