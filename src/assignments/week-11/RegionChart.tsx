'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- the chart SVG is a labelled image that snaps the pointer to the nearest mark; keyboard access to the same states is through the tile map and the state menu. */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { scaleLinear } from 'd3-scale';
import { costMultiple, type MixRow } from '@/lib/drug-mix';
import { dollars } from '@/lib/prescriber';
import {
  MEASURES,
  dodge,
  measureValue,
  regionTone,
  stateRanks,
  toneStops,
  type BoxStats,
  type LensLayout,
  type LensView,
  type Measure,
} from '@/lib/regional-lens';
import { REGIONS, shapePath, type RegionId, type StatePoint } from '@/lib/regions';
import { Glyph, ordinal, padDomain, pct, tickLabel } from './shared';

type Props = {
  view: LensView;
  national: MixRow;
  measure: Measure;
  layout: LensLayout;
  specialty: string;
  width: number;
  /** Is this region emphasised by the legend? */
  isLit: (id: RegionId) => boolean;
  /** Is this state emphasised by the legend, including a value step? */
  isStateLit: (state: StatePoint) => boolean;
  /** Regions the legend has picked out, for median crosshairs. */
  litRegions: Set<RegionId>;
  hoverCode: string | null;
  pinnedCode: string | null;
  onHover: (code: string | null) => void;
  onTogglePin: (code: string) => void;
  onClickAway: () => void;
};

const HIT_RADIUS = 22;

/** A box-style mark for one region's states along an axis: range line, middle-half band, median tick. */
function MarginalBox({
  stats,
  scale,
  across,
  at,
  color,
  dim,
}: {
  stats: BoxStats;
  scale: (value: number) => number;
  across: boolean;
  at: number;
  color: string;
  dim: boolean;
}) {
  const [a, b, q1, q3, m] = [
    scale(stats.min),
    scale(stats.max),
    scale(stats.q1),
    scale(stats.q3),
    scale(stats.median),
  ];
  const fill = dim ? 'var(--rl-dim)' : color;
  return across ? (
    <g>
      <line x1={a} x2={b} y1={at} y2={at} stroke={fill} strokeWidth={1.25} />
      <rect x={q1} width={Math.max(1, q3 - q1)} y={at - 3.5} height={7} rx={2} fill={fill} opacity={0.45} />
      <line x1={m} x2={m} y1={at - 5.5} y2={at + 5.5} stroke={fill} strokeWidth={2.5} />
    </g>
  ) : (
    <g>
      <line y1={a} y2={b} x1={at} x2={at} stroke={fill} strokeWidth={1.25} />
      <rect y={Math.min(q1, q3)} height={Math.max(1, Math.abs(q3 - q1))} x={at - 3.5} width={7} rx={2} fill={fill} opacity={0.45} />
      <line y1={m} y2={m} x1={at - 5.5} x2={at + 5.5} stroke={fill} strokeWidth={2.5} />
    </g>
  );
}

/** One chart with two layouts. Marks keep their identity and glide between them. */
export function RegionChart({
  view,
  national,
  measure,
  layout,
  specialty,
  width,
  isLit,
  isStateLit,
  litRegions,
  hoverCode,
  pinnedCode,
  onHover,
  onTogglePin,
  onClickAway,
}: Props) {
  const W = Math.max(280, width);
  const narrow = W < 560;
  const H = narrow ? 560 : Math.round(Math.min(680, Math.max(500, W * 0.8)));
  const r = narrow ? 5.5 : 7.5;
  const { states, summaries, boxes, scale } = view;

  // Short stagger only while the layout changes, so hover and specialty changes stay immediate.
  const [morphing, setMorphing] = useState(false);
  const previous = useRef(layout);
  useEffect(() => {
    if (previous.current === layout) return;
    previous.current = layout;
    setMorphing(true);
    const timer = setTimeout(() => setMorphing(false), 1000);
    return () => clearTimeout(timer);
  }, [layout]);

  // ── Layout 1: one strip per region along the chosen measure ──
  const strips = useMemo(() => {
    const m = { left: narrow ? 8 : 128, right: 16, top: 30, bottom: 42 };
    const rowH = (H - m.top - m.bottom) / REGIONS.length;
    const values = [
      ...states.map((s) => measureValue(s.row, measure)),
      measureValue(national, measure),
    ];
    const x = scaleLinear()
      .domain(padDomain(Math.min(...values), Math.max(...values)))
      .range([m.left, W - m.right])
      .nice();
    const spots = new Map<string, [number, number]>();
    const rows = REGIONS.map((region, i) => {
      const top = m.top + rowH * i;
      const mine = states.filter((s) => s.region.id === region.id);
      const labelH = narrow ? 18 : 0;
      const cy = top + labelH + (rowH - labelH - 10) / 2;
      const offsets = dodge(
        mine.map((s) => ({ id: s.code, x: x(measureValue(s.row, measure)) })),
        r * 2 + 1.5,
      );
      const room = (rowH - labelH - 10) / 2 - r - 2;
      const widest = Math.max(1, ...[...offsets.values()].map(Math.abs));
      const squeeze = widest > room ? room / widest : 1;
      for (const s of mine)
        spots.set(s.code, [
          x(measureValue(s.row, measure)),
          cy + (offsets.get(s.code) ?? 0) * squeeze,
        ]);
      return { region, top, cy, rowH };
    });
    return { m, x, rows, spots, ticks: x.ticks(narrow ? 4 : 8) };
  }, [H, W, measure, narrow, national, r, states]);

  // ── Layout 2: claims against cost, with each region's distribution along both axes ──
  const scatter = useMemo(() => {
    const m = {
      left: narrow ? 42 : 58,
      right: narrow ? 56 : 92,
      top: narrow ? 56 : 68,
      bottom: 44,
    };
    const xs = [...states.map((s) => s.row.brandClaimShare), national.brandClaimShare];
    const ys = [...states.map((s) => s.row.brandCostShare), national.brandCostShare];
    const x = scaleLinear()
      .domain(padDomain(Math.min(...xs), Math.max(...xs)))
      .range([m.left, W - m.right])
      .nice();
    const y = scaleLinear()
      .domain(padDomain(Math.min(...ys), Math.max(...ys)))
      .range([H - m.bottom, m.top])
      .nice();
    const spots = new Map<string, [number, number]>(
      states.map((s) => [s.code, [x(s.row.brandClaimShare), y(s.row.brandCostShare)]]),
    );
    return { m, x, y, spots, xTicks: x.ticks(narrow ? 4 : 7), yTicks: y.ticks(narrow ? 4 : 6) };
  }, [H, W, narrow, national, states]);

  const spots = layout === 'strips' ? strips.spots : scatter.spots;
  const focusCode = hoverCode ?? pinnedCode;

  // Labels: each region's extremes, then emphasised states. A label is placed only where it
  // clears other labels and marks, so it never sits on top of a state it does not name.
  const labelled = useMemo(() => {
    type Side = 'top' | 'left' | 'right';
    const out = new Map<string, Side>();
    const taken: [number, number][] = [];
    const boxFor = ([x, y]: [number, number], side: Side): [number, number] =>
      side === 'top' ? [x, y - r - 9] : [x + (side === 'left' ? -1 : 1) * (r + 16), y];
    const clear = (code: string, [cx, cy]: [number, number]) => {
      if (cx < 14 || cx > W - 14 || cy < 10) return false;
      if (taken.some(([x, y]) => Math.abs(x - cx) < 25 && Math.abs(y - cy) < 15)) return false;
      for (const [other, [x, y]] of spots)
        if (other !== code && Math.abs(x - cx) < 12 + r && Math.abs(y - cy) < 7 + r) return false;
      return true;
    };
    const place = (code: string, sides: Side[]) => {
      const spot = spots.get(code);
      if (!spot || out.has(code)) return;
      for (const side of sides) {
        const box = boxFor(spot, side);
        if (clear(code, box)) {
          out.set(code, side);
          taken.push(box);
          return;
        }
      }
    };
    if (layout === 'scatter')
      taken.push([scatter.x(national.brandClaimShare) + 24, scatter.y(national.brandCostShare)]);
    // Room for the ring's own label, which sits a little higher than a normal one.
    if (focusCode && spots.get(focusCode))
      taken.push([spots.get(focusCode)![0], spots.get(focusCode)![1] - r - 14]);
    for (const region of REGIONS) {
      const mine = states
        .filter((s) => s.region.id === region.id && isStateLit(s))
        .sort((a, b) => measureValue(b.row, measure) - measureValue(a.row, measure));
      if (!mine.length) continue;
      if (layout === 'strips') {
        place(mine[0].code, ['right', 'top']);
        place(mine.at(-1)!.code, ['left', 'top']);
      } else {
        place(mine[0].code, ['top', 'right', 'left']);
        place(mine.at(-1)!.code, ['top', 'right', 'left']);
      }
    }
    if (litRegions.size && !narrow)
      states.filter(isStateLit).forEach((s) => place(s.code, ['top', 'right', 'left']));
    return out;
  }, [W, focusCode, isStateLit, layout, litRegions.size, measure, narrow, national, r, scatter, spots, states]);

  // Snap to the nearest mark, so a tight cluster never needs pixel-accurate pointing.
  const nearest = (event: MouseEvent<SVGSVGElement>, radius = HIT_RADIUS) => {
    const box = event.currentTarget.getBoundingClientRect();
    const [px, py] = [event.clientX - box.left, event.clientY - box.top];
    let best: string | null = null;
    let distance = radius;
    for (const [code, [x, y]] of spots) {
      const d = Math.hypot(x - px, y - py);
      if (d < distance) {
        distance = d;
        best = code;
      }
    }
    return best;
  };

  const hovered = hoverCode ? (states.find((s) => s.code === hoverCode) ?? null) : null;
  const hoverSpot = hovered ? spots.get(hovered.code) : null;
  const hoverRanks = hovered ? stateRanks(states, hovered.code, measure) : null;
  const multiple = hovered ? costMultiple(hovered.row) : null;
  const toneDomain = strips.x.domain() as [number, number];
  const litMedians = summaries.filter(
    (s) => litRegions.has(s.region.id) && s.costShare !== null,
  );
  const usValue = measureValue(national, measure);

  return (
    <div className="rl11-plot">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        className={`${morphing ? 'morphing' : ''}${hoverCode ? ' has-hover' : ''}`}
        aria-label={`${specialty}: ${states.length} states. ${MEASURES[measure].label}, ${layout === 'strips' ? 'one row per Census region' : 'claims against cost'}. Keyboard users can reach the same states through the map tiles and the state menu.`}
        onPointerMove={(event: PointerEvent<SVGSVGElement>) => {
          if (event.pointerType === 'touch') return;
          const code = nearest(event);
          if (code !== hoverCode) onHover(code);
        }}
        onPointerLeave={() => onHover(null)}
        onClick={(event) => {
          const code = nearest(event, HIT_RADIUS + 6);
          if (code) onTogglePin(code);
          else onClickAway();
        }}
      >
        <defs>
          {REGIONS.map((region) => (
            <linearGradient key={region.id} id={`rl11-ramp-${region.id}`}>
              {toneStops(region.color, scale, toneDomain).map(([position, color]) => (
                <stop key={position} offset={position} stopColor={color} />
              ))}
            </linearGradient>
          ))}
        </defs>

        {/* Strips backdrop */}
        <g className={`rl11-layer${layout === 'strips' ? ' on' : ''}`} aria-hidden="true">
          {strips.ticks.map((tick) => (
            <g key={`sx${tick}`}>
              <line x1={strips.x(tick)} x2={strips.x(tick)} y1={strips.m.top - 4} y2={H - strips.m.bottom} className="rl11-gridline" />
              <text x={strips.x(tick)} y={H - strips.m.bottom + 18} textAnchor="middle" className="rl11-tick">
                {tickLabel(tick, strips.ticks)}
              </text>
            </g>
          ))}
          <text x={W - strips.m.right} y={H - 6} textAnchor="end" className="rl11-axis">
            {MEASURES[measure].label} →
          </text>
          {strips.rows.map(({ region, top, cy, rowH }, i) => {
            const stats = boxes[region.id][measure];
            const summary = summaries[i];
            const on = isLit(region.id);
            const median = measure === 'cost' ? summary.costShare : summary.claimShare;
            return (
              <g key={region.id} className={on ? 'rl11-strip' : 'rl11-strip dim'}>
                {i > 0 && <line x1={0} x2={W} y1={top} y2={top} className="rl11-rule" />}
                {narrow ? (
                  <text x={strips.m.left} y={top + 14} className="rl11-strip-name">
                    {region.name}
                    <tspan className="rl11-strip-median" dx={8}>
                      {median === null ? 'median needs 3 states' : `median ${pct(median)}`}
                    </tspan>
                  </text>
                ) : (
                  <g transform={`translate(0,${cy})`}>
                    <path transform="translate(8,-9)" d={shapePath(region.shape, 5.6)} fill={on ? region.color : 'var(--rl-dim)'} />
                    <text x={20} y={-4} className="rl11-strip-name">
                      {region.name}
                    </text>
                    <text x={0} y={18} className="rl11-strip-value">
                      {median === null ? '—' : pct(median)}
                    </text>
                    <text x={0} y={32} className="rl11-strip-median">
                      {median === null ? 'needs 3 states' : `median, ${summary.count} states`}
                    </text>
                  </g>
                )}
                {stats && (
                  <g>
                    <rect
                      x={strips.x(stats.q1)}
                      width={Math.max(1, strips.x(stats.q3) - strips.x(stats.q1))}
                      y={cy - Math.min(rowH * 0.36, 40)}
                      height={Math.min(rowH * 0.72, 80)}
                      rx={5}
                      className="rl11-band"
                      style={{ '--region': region.color } as CSSProperties}
                    />
                    {stats.n >= 3 && (
                      <line
                        x1={strips.x(stats.median)}
                        x2={strips.x(stats.median)}
                        y1={cy - Math.min(rowH * 0.36, 40) - 3}
                        y2={cy + Math.min(rowH * 0.36, 40) + 3}
                        stroke={on ? regionTone(region.color, 1) : 'var(--rl-dim)'}
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                )}
                <rect
                  x={strips.m.left}
                  width={W - strips.m.left - strips.m.right}
                  y={top + rowH - 8}
                  height={4}
                  rx={2}
                  fill={on ? `url(#rl11-ramp-${region.id})` : 'var(--rl-dim-soft)'}
                />
              </g>
            );
          })}
          <g className="rl11-us">
            <line x1={strips.x(usValue)} x2={strips.x(usValue)} y1={strips.m.top - 8} y2={H - strips.m.bottom} />
            <text x={strips.x(usValue)} y={strips.m.top - 13} textAnchor="middle">
              U.S. {pct(usValue)}
            </text>
          </g>
        </g>

        {/* Scatter backdrop */}
        <g className={`rl11-layer${layout === 'scatter' ? ' on' : ''}`} aria-hidden="true">
          {scatter.xTicks.map((tick) => (
            <g key={`x${tick}`}>
              <line x1={scatter.x(tick)} x2={scatter.x(tick)} y1={scatter.m.top} y2={H - scatter.m.bottom} className="rl11-gridline" />
              <text x={scatter.x(tick)} y={H - scatter.m.bottom + 18} textAnchor="middle" className="rl11-tick">
                {tickLabel(tick, scatter.xTicks)}
              </text>
            </g>
          ))}
          {scatter.yTicks.map((tick) => (
            <g key={`y${tick}`}>
              <line x1={scatter.m.left} x2={W - scatter.m.right} y1={scatter.y(tick)} y2={scatter.y(tick)} className="rl11-gridline" />
              <text x={scatter.m.left - 8} y={scatter.y(tick) + 4} textAnchor="end" className="rl11-tick">
                {tickLabel(tick, scatter.yTicks)}
              </text>
            </g>
          ))}
          <text x={W - scatter.m.right} y={H - 6} textAnchor="end" className="rl11-axis">
            Brand-name share of claims →
          </text>
          <text x={scatter.m.left} y={scatter.m.top - 8} className="rl11-axis">
            ↑ Brand-name share of drug cost
          </text>

          {/* Each region's distribution along each axis */}
          {REGIONS.map((region, i) => {
            const on = isLit(region.id);
            const rowY = 8 + i * ((scatter.m.top - 28) / 4);
            const colX = W - scatter.m.right + 16 + i * ((scatter.m.right - 24) / 4);
            const stats = boxes[region.id];
            return (
              <g key={region.id}>
                <path transform={`translate(${scatter.m.left - 12},${rowY})`} d={shapePath(region.shape, 4)} fill={on ? region.color : 'var(--rl-dim)'} />
                {stats.claims && (
                  <MarginalBox stats={stats.claims} scale={scatter.x} across at={rowY} color={region.color} dim={!on} />
                )}
                <path transform={`translate(${colX},${scatter.m.top - 8})`} d={shapePath(region.shape, 4)} fill={on ? region.color : 'var(--rl-dim)'} />
                {stats.cost && (
                  <MarginalBox stats={stats.cost} scale={scatter.y} across={false} at={colX} color={region.color} dim={!on} />
                )}
              </g>
            );
          })}

          {litMedians.map((s) => (
            <g key={s.region.id} className="rl11-cross">
              <line x1={scatter.m.left} x2={W - scatter.m.right} y1={scatter.y(s.costShare!)} y2={scatter.y(s.costShare!)} stroke={s.region.color} />
              <line x1={scatter.x(s.claimShare!)} x2={scatter.x(s.claimShare!)} y1={scatter.m.top} y2={H - scatter.m.bottom} stroke={s.region.color} />
              <text x={W - scatter.m.right - 4} y={scatter.y(s.costShare!) - 6} textAnchor="end" className="rl11-cross-label">
                {s.region.name} median {pct(s.costShare!)}
              </text>
            </g>
          ))}
          <g className="rl11-us-cross" transform={`translate(${scatter.x(national.brandClaimShare)},${scatter.y(national.brandCostShare)})`}>
            <path d="M-8,0H8M0,-8V8" />
            <text x={11} y={4}>
              U.S.
            </text>
          </g>
        </g>

        {/* Marks are shared by both layouts and stay in a fixed DOM order so they can glide. */}
        <g aria-hidden="true">
          {states.map((s, i) => {
            const spot = spots.get(s.code);
            if (!spot) return null;
            const on = isStateLit(s);
            const focused = s.code === focusCode;
            const value = measureValue(s.row, measure);
            return (
              <g
                key={s.code}
                className={`rl11-dot${on ? '' : ' dim'}${focused ? ' focus' : ''}`}
                data-code={s.code}
                style={
                  {
                    transform: `translate(${spot[0]}px, ${spot[1]}px)`,
                    '--delay': `${(i % 17) * 22}ms`,
                  } as CSSProperties
                }
              >
                <path
                  d={shapePath(s.region.shape, r)}
                  fill={on ? regionTone(s.region.color, scale.at(value)) : 'var(--rl-dim-soft)'}
                  stroke={on ? regionTone(s.region.color, 1) : 'var(--rl-dim)'}
                />
              </g>
            );
          })}
          {states.map((s) => {
            const spot = spots.get(s.code);
            const side = labelled.get(s.code);
            if (!spot || !side || !isStateLit(s) || s.code === focusCode) return null;
            return (
              <g key={s.code} className="rl11-tag" style={{ transform: `translate(${spot[0]}px, ${spot[1]}px)` }}>
                <text
                  x={side === 'top' ? 0 : side === 'left' ? -(r + 5) : r + 5}
                  y={side === 'top' ? -(r + 5) : 4}
                  textAnchor={side === 'top' ? 'middle' : side === 'left' ? 'end' : 'start'}
                  className="rl11-label"
                >
                  {s.code}
                </text>
              </g>
            );
          })}
          {focusCode && spots.get(focusCode) && (
            <g
              className="rl11-ring"
              style={{ transform: `translate(${spots.get(focusCode)![0]}px, ${spots.get(focusCode)![1]}px)` }}
            >
              <circle r={r + 5} />
              <text y={-(r + 10)} textAnchor="middle">
                {focusCode}
              </text>
            </g>
          )}
        </g>
      </svg>

      {hovered && hoverSpot && hoverRanks && (
        <div
          className="rl11-tip"
          style={
            {
              left: Math.min(Math.max(hoverSpot[0], 132), W - 132),
              top: hoverSpot[1],
              '--region': hovered.region.color,
            } as CSSProperties
          }
          data-below={hoverSpot[1] < 230 ? 'true' : undefined}
          role="status"
        >
          <b>
            <Glyph region={hovered.region} /> {hovered.name}
          </b>
          <span>
            {hovered.region.name}: {ordinal(hoverRanks.region)} of {hoverRanks.regionOf} by {MEASURES[measure].short}
          </span>
          <dl>
            <dt>Brand-name share of drug cost</dt>
            <dd>{pct(hovered.row.brandCostShare)}</dd>
            <dt>Brand-name share of claims</dt>
            <dd>{pct(hovered.row.brandClaimShare)}</dd>
          </dl>
          {multiple && (
            <dl className="rl11-tip-cost">
              <dt>Brand-name cost per claim</dt>
              <dd>{dollars.format(hovered.row.brandCostPerClaim!)}</dd>
              <dt>Generic cost per claim</dt>
              <dd>{dollars.format(hovered.row.genericCostPerClaim!)}</dd>
            </dl>
          )}
          <em>{hovered.code === pinnedCode ? 'Click to unpin' : 'Click to pin and compare'}</em>
        </div>
      )}
    </div>
  );
}
