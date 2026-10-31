'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- the scatter and fingerprint SVGs are labelled images; keyboard access is through the tiles, legend and specialty buttons. */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { scaleLinear } from 'd3-scale';
import { FaIcon } from '@/components/fa-icon';
import { costMultiple, mixRow, type DrugMixData } from '@/lib/drug-mix';
import { dollars } from '@/lib/prescriber';
import {
  ALL_SPECIALTIES,
  MIN_REGION_STATES,
  REGIONS,
  TILE_GRID,
  emphasised,
  fingerprints,
  leaderCounts,
  parseRegions,
  regionSummaries,
  shapePath,
  statePoints,
  togglePinned,
  type Region,
  type RegionId,
  type StatePoint,
} from '@/lib/regions';
import './regional-lens.css';

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const points = (value: number) =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(1)} pts`;
const tickLabel = (tick: number, ticks: number[]) =>
  `${(tick * 100).toFixed(ticks.length > 1 && ticks[1] - ticks[0] < 0.01 ? 1 : 0)}%`;
const ordinal = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;

/** Width of an element, tracked with ResizeObserver. A callback ref, because the element appears only after data loads. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width] as const;
}

function Glyph({ region, size = 14 }: { region: Region; size?: number }) {
  return (
    <svg
      className="rl-glyph"
      width={size}
      height={size}
      viewBox="-8 -8 16 16"
      aria-hidden="true"
    >
      <path d={shapePath(region.shape, 5.6)} fill={region.color} />
    </svg>
  );
}

/** Week 10: the Week 8 state scatter, copied and given an interactive regional colour legend. */
export default function RegionalLens() {
  const [data, setData] = useState<DrugMixData | null | undefined>(undefined);
  const [specialty, setSpecialty] = useState(ALL_SPECIALTIES);
  const [pinned, setPinned] = useState<RegionId[]>([]);
  const [hoverRegion, setHoverRegion] = useState<RegionId | null>(null);
  const [hoverState, setHoverState] = useState<string | null>(null);
  const [pinnedState, setPinnedState] = useState<string | null>(null);
  const [base, setBase] = useState('./');
  const [copied, setCopied] = useState(false);
  const [plotRef, plotWidth] = useWidth<HTMLDivElement>(760);
  const [printRef, printWidth] = useWidth<HTMLDivElement>(1100);

  // Load data and restore a shared view (?s=Psychiatry&regions=south,west&state=TX).
  useEffect(() => {
    const root = location.pathname.replace(/week-10(?:\.html)?\/?$/, '');
    const params = new URLSearchParams(location.search);
    fetch(`${root}data/prescriber-summary/drug-mix.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<DrugMixData>;
      })
      .then((loaded) => {
        const wanted = params.get('s');
        if (wanted && loaded.specialties.includes(wanted)) setSpecialty(wanted);
        setPinned(parseRegions(params.get('regions')));
        const state = params.get('state')?.toUpperCase();
        if (state && TILE_GRID[state]) setPinnedState(state);
        setBase(root);
        setData(loaded);
      })
      .catch(() => setData(null));
  }, []);

  // Keep the address bar shareable.
  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams();
    if (specialty !== ALL_SPECIALTIES) params.set('s', specialty);
    if (pinned.length) params.set('regions', pinned.join(','));
    if (pinnedState) params.set('state', pinnedState);
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }, [data, specialty, pinned, pinnedState]);

  // Escape clears pinned regions and the pinned state from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPinned([]);
      setPinnedState(null);
      setHoverRegion(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const { points: states, hidden } = useMemo(
    () => (data ? statePoints(data, specialty) : { points: [], hidden: 0 }),
    [data, specialty],
  );
  const summaries = useMemo(() => regionSummaries(states), [states]);
  const national = useMemo(() => {
    if (!data) return null;
    if (specialty === ALL_SPECIALTIES) return mixRow(specialty, data.areas[0].total);
    const tuple = data.areas[0].specialties[data.specialties.indexOf(specialty)];
    return tuple ? mixRow(specialty, tuple) : null;
  }, [data, specialty]);
  const prints = useMemo(
    () => (data ? fingerprints(data) : { rows: [], skipped: 0 }),
    [data],
  );
  const leaders = useMemo(() => leaderCounts(prints.rows), [prints]);

  const lit = emphasised(hoverRegion, pinned);
  const isLit = (id: RegionId) => lit.size === 0 || lit.has(id);
  const focusCode = hoverState ?? pinnedState;
  const byCode = new Map(states.map((s) => [s.code, s]));
  const focus = focusCode ? (byCode.get(focusCode) ?? null) : null;

  if (!data || !national)
    return (
      <main className="rl" aria-busy={data === undefined}>
        <p className="rl-empty">
          {data === undefined
            ? 'Loading brand-name and generic data…'
            : 'The brand-name and generic summary could not be loaded.'}
        </p>
      </main>
    );

  const options = [ALL_SPECIALTIES, ...data.specialties];
  const step = (by: number) => {
    const i = options.indexOf(specialty);
    setSpecialty(options[(i + by + options.length) % options.length]);
  };
  const clearAll = () => {
    setPinned([]);
    setPinnedState(null);
    setHoverRegion(null);
  };

  // ── Scatter geometry (copied from Week 8, sized to its container) ──
  const W = Math.max(300, plotWidth);
  const narrow = W < 560;
  const H = Math.round(Math.min(520, Math.max(340, W * 0.6)));
  const m = { left: narrow ? 46 : 62, right: 18, top: 30, bottom: 48 };
  const values = [...states.map((s) => s.row), national];
  const pad = (lo: number, hi: number) => {
    const span = Math.max(hi - lo, 0.04);
    return [Math.max(0, lo - span * 0.1), Math.min(1, hi + span * 0.1)];
  };
  const xs = values.map((v) => v.brandClaimShare);
  const ys = values.map((v) => v.brandCostShare);
  const sx = scaleLinear()
    .domain(pad(Math.min(...xs), Math.max(...xs)))
    .range([m.left, W - m.right])
    .nice();
  const sy = scaleLinear()
    .domain(pad(Math.min(...ys), Math.max(...ys)))
    .range([H - m.bottom, m.top])
    .nice();
  const xTicks = sx.ticks(narrow ? 4 : 7);
  const yTicks = sy.ticks(narrow ? 4 : 6);
  const at = (s: StatePoint) => [sx(s.row.brandClaimShare), sy(s.row.brandCostShare)];

  // Labels: the focused state, then lit states farthest from the centre; skip collisions.
  const [cx, cy] = [(m.left + W - m.right) / 2, (m.top + H - m.bottom) / 2];
  const placed: [number, number, number][] = [
    [sx(national.brandClaimShare) + 24, sy(national.brandCostShare), 18],
  ];
  const labelled = new Set<string>();
  [...states]
    .filter((s) => isLit(s.region.id) || s.code === focusCode)
    .sort((a, b) => {
      if (a.code === focusCode) return -1;
      if (b.code === focusCode) return 1;
      const d = (s: StatePoint) => Math.hypot(at(s)[0] - cx, at(s)[1] - cy);
      return d(b) - d(a);
    })
    .forEach((s) => {
      const [px, py0] = at(s);
      const py = py0 - 14;
      const clear = placed.every(
        ([qx, qy, half]) => Math.abs(qx - px) > half + 13 || Math.abs(qy - py) > 15,
      );
      if (clear || s.code === focusCode) {
        placed.push([px, py, 13]);
        labelled.add(s.code);
      }
    });
  // Dimmed marks first so lit marks and the focused state sit on top.
  const drawOrder = [...states].sort(
    (a, b) =>
      Number(isLit(a.region.id)) - Number(isLit(b.region.id)) ||
      Number(a.code === focusCode) - Number(b.code === focusCode),
  );
  const litMedians = summaries.filter(
    (s) => lit.size > 0 && lit.has(s.region.id) && s.costShare !== null,
  );

  // ── Readout ──
  const ranked = summaries
    .filter((s) => s.costShare !== null)
    .sort((a, b) => b.costShare! - a.costShare!);
  const sentence = (() => {
    if (lit.size === 1) {
      const s = summaries.find((x) => lit.has(x.region.id))!;
      const mine = states
        .filter((p) => p.region.id === s.region.id)
        .sort((a, b) => b.row.brandCostShare - a.row.brandCostShare);
      if (!mine.length)
        return `${s.region.name}: no state has ${specialty === ALL_SPECIALTIES ? '' : `${specialty} `}records above the threshold.`;
      const median =
        s.costShare === null
          ? `Only ${s.count} ${s.count === 1 ? 'state is' : 'states are'} shown, too few for a regional median.`
          : `Median brand-name share of drug cost: ${pct(s.costShare)} (${points(s.costShare - national.brandCostShare)} vs. national). Median share of claims: ${pct(s.claimShare!)}.`;
      return `${specialty} in the ${s.region.name}: ${s.count} ${s.count === 1 ? 'state' : 'states'}. ${median} Highest: ${mine[0].name} (${pct(mine[0].row.brandCostShare)}); lowest: ${mine.at(-1)!.name} (${pct(mine.at(-1)!.row.brandCostShare)}).`;
    }
    if (ranked.length < 2)
      return `Too few states have enough ${specialty} records to compare regions.`;
    const top = ranked[0];
    const low = ranked.at(-1)!;
    return `${specialty}: the ${top.region.name} has the highest median brand-name share of drug cost (${pct(top.costShare!)}) and the ${low.region.name} the lowest (${pct(low.costShare!)}), a ${Math.abs((top.costShare! - low.costShare!) * 100).toFixed(1)}-point spread.`;
  })();

  // ── Fingerprint geometry: each region's median minus the national share ──
  const PW = Math.max(300, printWidth);
  const printNarrow = PW < 620;
  const labelW = printNarrow ? 132 : 250;
  const rightW = printNarrow ? 34 : 120;
  const rowH = 26;
  const allSummaries = regionSummaries(statePoints(data, ALL_SPECIALTIES).points);
  const allNational = mixRow(ALL_SPECIALTIES, data.areas[0].total);
  const printRows = [
    {
      specialty: ALL_SPECIALTIES,
      national: allNational,
      summaries: allSummaries,
      leader: [...allSummaries].sort((a, b) => b.costShare! - a.costShare!)[0].region.id,
    },
    ...prints.rows,
  ];
  const deltas = printRows.flatMap((r) =>
    r.summaries.map((s) => s.costShare! - r.national.brandCostShare),
  );
  const span = Math.max(...deltas.map(Math.abs)) * 1.08;
  const dx = scaleLinear()
    .domain([-span, span])
    .range([labelW + 12, PW - rightW - 8])
    .nice();
  const printH = 34 + printRows.length * rowH + 8;

  const describeState = (s: StatePoint) => {
    const multiple = costMultiple(s.row);
    return `${s.name} (${s.region.name}): brand-name drugs are ${pct(s.row.brandClaimShare)} of ${specialty === ALL_SPECIALTIES ? '' : `${specialty} `}claims and ${pct(s.row.brandCostShare)} of drug cost${multiple ? `; a brand-name claim averaged ${dollars.format(s.row.brandCostPerClaim!)} vs. ${dollars.format(s.row.genericCostPerClaim!)} generic` : ''}.`;
  };
  const rankInRegion = (s: StatePoint) => {
    const mine = states
      .filter((p) => p.region.id === s.region.id)
      .sort((a, b) => b.row.brandCostShare - a.row.brandCostShare);
    return [mine.findIndex((p) => p.code === s.code) + 1, mine.length];
  };

  const tip = focus
    ? (() => {
        const [px, py] = at(focus);
        const [rank, of] = rankInRegion(focus);
        const multiple = costMultiple(focus.row);
        return { px, py, rank, of, multiple };
      })()
    : null;

  return (
    <main className="rl">
      <header className="rl-top">
        <a href={base}>← Explorer</a>
        <a href={`${base}#week-8`}>Week 8 original</a>
      </header>

      <section className="rl-intro" aria-labelledby="rl-title">
        <p className="rl-eyebrow">WEEK 10 · ADD A NEW INTERACTION · CMS {data.meta.year}</p>
        <h1 id="rl-title">Does the brand-name gap have a region?</h1>
        <p>
          Brand-name drugs are about 15% of Medicare Part D claims but 88% of drug
          cost. In Week 8 every state sat on one scatterplot in one color, so
          geography was invisible. This copy adds an <b>interactive color legend</b>:
          hover a Census region to light up its states in the scatterplot, the map
          and the specialty chart. Click a region to keep it on, or click several
          to compare them.
        </p>
      </section>

      <div className="rl-controls">
        <label>
          <span>Specialty</span>
          <span className="rl-stepper">
            <button type="button" onClick={() => step(-1)} aria-label="Previous specialty">
              ‹
            </button>
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              {options.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => step(1)} aria-label="Next specialty">
              ›
            </button>
          </span>
        </label>
        <button
          type="button"
          className="rl-quiet"
          onClick={() => {
            void navigator.clipboard?.writeText(location.href).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          <FaIcon name="link" /> {copied ? 'Link copied' : 'Copy link to this view'}
        </button>
      </div>

      <section className="rl-legend" aria-label="Census regions: hover to preview, click to keep highlighted">
        <div className="rl-legend-head">
          <b>Census region</b>
          <span>Hover to preview · click to keep · Esc to clear</span>
          <button type="button" className="rl-quiet" onClick={clearAll} disabled={!pinned.length && !pinnedState}>
            <FaIcon name="reset" /> Show all
          </button>
        </div>
        <div className="rl-legend-items">
          {summaries.map((s) => {
            const on = pinned.includes(s.region.id);
            return (
              <button
                key={s.region.id}
                type="button"
                className={`rl-key${isLit(s.region.id) ? '' : ' dim'}${on ? ' on' : ''}`}
                style={{ '--region': s.region.color } as CSSProperties}
                aria-pressed={on}
                onMouseEnter={() => setHoverRegion(s.region.id)}
                onMouseLeave={() => setHoverRegion(null)}
                onFocus={() => setHoverRegion(s.region.id)}
                onBlur={() => setHoverRegion(null)}
                onClick={() => setPinned((p) => togglePinned(p, s.region.id))}
              >
                <span className="rl-key-name">
                  <Glyph region={s.region} size={16} /> {s.region.name}
                  {on && <FaIcon name="check" />}
                </span>
                <span className="rl-key-value">
                  {s.costShare === null ? '—' : pct(s.costShare)}
                  <small>median share of cost</small>
                </span>
                <span className="rl-key-meta">
                  {s.count} {s.count === 1 ? 'state' : 'states'}
                  {s.claimShare !== null && ` · ${pct(s.claimShare)} of claims`}
                </span>
                <span className="rl-key-meta">
                  Highest in {leaders[s.region.id]} of {prints.rows.length} specialties
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="rl-grid">
        <figure className="rl-card rl-scatter">
          <div className="rl-card-head">
            <span className="rl-eyebrow">ACROSS STATES</span>
            <h2>{specialty}: brand-name share of claims vs. drug cost</h2>
          </div>
          <div className="rl-plot" ref={plotRef} onMouseLeave={() => setHoverState(null)}>
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`${specialty}: ${states.length} states placed by brand-name share of claims and of drug cost, colored by Census region. ${sentence}`}
            >
              {xTicks.map((tick) => (
                <g key={`x${tick}`}>
                  <line x1={sx(tick)} x2={sx(tick)} y1={m.top - 6} y2={H - m.bottom} className="rl-gridline" />
                  <text x={sx(tick)} y={H - m.bottom + 18} textAnchor="middle" className="rl-tick">
                    {tickLabel(tick, xTicks)}
                  </text>
                </g>
              ))}
              {yTicks.map((tick) => (
                <g key={`y${tick}`}>
                  <line x1={m.left - 4} x2={W - m.right} y1={sy(tick)} y2={sy(tick)} className="rl-gridline" />
                  <text x={m.left - 8} y={sy(tick) + 4} textAnchor="end" className="rl-tick">
                    {tickLabel(tick, yTicks)}
                  </text>
                </g>
              ))}
              <text x={W - m.right} y={H - 8} textAnchor="end" className="rl-axis">
                Brand-name share of claims →
              </text>
              <text x={8} y={16} className="rl-axis">
                ↑ Brand-name share of drug cost
              </text>

              {litMedians.map((s) => (
                <g key={`median-${s.region.id}`} className="rl-median">
                  <line
                    x1={m.left}
                    x2={W - m.right}
                    y1={sy(s.costShare!)}
                    y2={sy(s.costShare!)}
                    stroke={s.region.color}
                  />
                  <line
                    x1={sx(s.claimShare!)}
                    x2={sx(s.claimShare!)}
                    y1={m.top - 6}
                    y2={H - m.bottom}
                    stroke={s.region.color}
                  />
                </g>
              ))}

              {drawOrder.map((s) => {
                const [px, py] = at(s);
                const on = isLit(s.region.id);
                const focused = s.code === focusCode;
                return (
                  <g
                    key={s.code}
                    className={`rl-dot${on ? '' : ' dim'}${focused ? ' focus' : ''}`}
                    transform={`translate(${px},${py})`}
                    onMouseEnter={() => setHoverState(s.code)}
                    onClick={() => setPinnedState((c) => (c === s.code ? null : s.code))}
                  >
                    <circle r={13} className="rl-hit" />
                    <path
                      d={shapePath(s.region.shape, focused ? 9 : 6.5)}
                      fill={on ? s.region.color : undefined}
                    />
                  </g>
                );
              })}
              {states
                .filter((s) => labelled.has(s.code))
                .map((s) => {
                  const [px, py] = at(s);
                  return (
                    <text
                      key={`label-${s.code}`}
                      x={px}
                      y={py - (s.code === focusCode ? 15 : 12)}
                      textAnchor="middle"
                      className={`rl-label${s.code === focusCode ? ' focus' : ''}`}
                    >
                      {s.code}
                    </text>
                  );
                })}
              {litMedians.map((s) => (
                <text
                  key={`median-label-${s.region.id}`}
                  x={W - m.right - 4}
                  y={sy(s.costShare!) - 6}
                  textAnchor="end"
                  className="rl-median-label"
                >
                  {s.region.name} median {pct(s.costShare!)}
                </text>
              ))}
              <g className="rl-national" transform={`translate(${sx(national.brandClaimShare)},${sy(national.brandCostShare)})`}>
                <path d="M-8,0H8M0,-8V8" />
                <text x={11} y={4}>
                  U.S.
                </text>
              </g>
            </svg>
            {focus && tip && (
              <div
                className="rl-tip"
                style={{
                  left: Math.min(Math.max(tip.px, 120), W - 120),
                  top: tip.py,
                  '--region': focus.region.color,
                } as CSSProperties}
                data-below={tip.py < 170 ? 'true' : undefined}
                role="status"
              >
                <b>
                  <Glyph region={focus.region} /> {focus.name}
                </b>
                <span>
                  {focus.region.name} · {ordinal(tip.rank)} of {tip.of} by cost share
                </span>
                <dl>
                  <dt>Share of cost</dt>
                  <dd>{pct(focus.row.brandCostShare)}</dd>
                  <dt>Share of claims</dt>
                  <dd>{pct(focus.row.brandClaimShare)}</dd>
                  {tip.multiple && (
                    <>
                      <dt>Per claim</dt>
                      <dd>
                        {dollars.format(focus.row.brandCostPerClaim!)} vs.{' '}
                        {dollars.format(focus.row.genericCostPerClaim!)}
                      </dd>
                    </>
                  )}
                  <dt>Records</dt>
                  <dd>{focus.row.records.toLocaleString('en-US')}</dd>
                </dl>
              </div>
            )}
          </div>
          <output className="rl-readout" aria-live="polite">
            {sentence}
            {hidden > 0 &&
              ` ${hidden} ${hidden === 1 ? 'state has' : 'states have'} fewer than 50 ${specialty === ALL_SPECIALTIES ? '' : `${specialty} `}records and ${hidden === 1 ? 'is' : 'are'} not plotted.`}
          </output>
        </figure>

        <figure className="rl-card rl-map">
          <div className="rl-card-head">
            <span className="rl-eyebrow">WHERE THE REGIONS ARE</span>
            <h2>Brand-name share of drug cost</h2>
          </div>
          <div className="rl-tiles" role="group" aria-label="States by Census region. Select a state to pin it in the scatterplot.">
            {Object.entries(TILE_GRID).map(([code, [col, row]]) => {
              const s = byCode.get(code);
              const region = REGIONS.find((r) => r.states.includes(code))!;
              const on = isLit(region.id);
              return (
                <button
                  key={code}
                  type="button"
                  className={`rl-tile${on ? '' : ' dim'}${s ? '' : ' empty'}${code === focusCode ? ' focus' : ''}`}
                  style={{
                    gridColumn: col + 1,
                    gridRow: row + 1,
                    '--region': region.color,
                  } as CSSProperties}
                  aria-pressed={code === pinnedState}
                  aria-label={s ? describeState(s) : `${code} (${region.name}): fewer than 50 records`}
                  disabled={!s}
                  onMouseEnter={() => s && setHoverState(code)}
                  onMouseLeave={() => setHoverState(null)}
                  onFocus={() => s && setHoverState(code)}
                  onBlur={() => setHoverState(null)}
                  onClick={() => setPinnedState((c) => (c === code ? null : code))}
                >
                  <b>{code}</b>
                  <small>{s ? `${Math.round(s.row.brandCostShare * 100)}%` : '—'}</small>
                </button>
              );
            })}
          </div>
          <figcaption>
            Tiles follow Census regions; each shows the state’s brand-name share of{' '}
            {specialty === ALL_SPECIALTIES ? 'all' : specialty} drug cost. “—” marks
            states with fewer than 50 records. Hover or focus a tile to find it in the
            scatterplot; select it to pin it.
          </figcaption>
        </figure>
      </div>

      <figure className="rl-card rl-prints">
        <div className="rl-card-head">
          <span className="rl-eyebrow">EVERY SPECIALTY</span>
          <h2>Is the pattern specialty-specific?</h2>
          <p>
            Each row places the four regional medians relative to that specialty’s
            national share of drug cost. The legend controls this chart too. Select a
            row to load that specialty above. {prints.skipped} specialties lack{' '}
            {MIN_REGION_STATES}+ states in every region and are left out.
          </p>
        </div>
        <div className="rl-print-plot" ref={printRef}>
          <svg
            width={PW}
            height={printH}
            viewBox={`0 0 ${PW} ${printH}`}
            role="img"
            aria-label={`Regional medians of brand-name share of drug cost relative to national for ${prints.rows.length} specialties. The South is highest in ${leaders.south}.`}
          >
            {dx.ticks(printNarrow ? 3 : 8).map((tick) => (
              <g key={tick}>
                <line x1={dx(tick)} x2={dx(tick)} y1={26} y2={printH - 6} className={tick === 0 ? 'rl-zero' : 'rl-gridline'} />
                <text x={dx(tick)} y={16} textAnchor="middle" className="rl-tick">
                  {tick === 0 ? (printNarrow ? '0' : 'national') : `${tick > 0 ? '+' : ''}${(tick * 100).toFixed(0)}`}
                </text>
              </g>
            ))}
            <text x={PW - 8} y={16} textAnchor="end" className="rl-axis">
              {printNarrow ? 'Top' : 'Highest region'}
            </text>
            {printRows.map((r, i) => {
              const y = 34 + i * rowH + rowH / 2;
              const ds = r.summaries.map((s) => s.costShare! - r.national.brandCostShare);
              const active = r.specialty === specialty;
              const leader = REGIONS.find((g) => g.id === r.leader)!;
              return (
                <g
                  key={r.specialty}
                  className={`rl-print-row${active ? ' active' : ''}`}
                  onClick={() => setSpecialty(r.specialty)}
                >
                  <rect x={0} y={y - rowH / 2} width={PW} height={rowH} className="rl-row-bg" />
                  <text x={4} y={y + 4} className="rl-row-label">
                    {r.specialty.length > (printNarrow ? 17 : 34)
                      ? `${r.specialty.slice(0, printNarrow ? 16 : 33)}…`
                      : r.specialty}
                  </text>
                  <line x1={dx(Math.min(...ds))} x2={dx(Math.max(...ds))} y1={y} y2={y} className="rl-range" />
                  {[...r.summaries]
                    .sort((a, b) => Number(isLit(a.region.id)) - Number(isLit(b.region.id)))
                    .map((s) => (
                      <path
                        key={s.region.id}
                        transform={`translate(${dx(s.costShare! - r.national.brandCostShare)},${y})`}
                        d={shapePath(s.region.shape, 5.5)}
                        className={isLit(s.region.id) ? 'rl-print-mark' : 'rl-print-mark dim'}
                        fill={isLit(s.region.id) ? s.region.color : undefined}
                      >
                        <title>
                          {`${s.region.name}: ${pct(s.costShare!)} (${points(s.costShare! - r.national.brandCostShare)} vs. national ${pct(r.national.brandCostShare)}), ${s.count} states`}
                        </title>
                      </path>
                    ))}
                  {printNarrow ? (
                    <path
                      transform={`translate(${PW - 18},${y})`}
                      d={shapePath(leader.shape, 5.5)}
                      fill={isLit(leader.id) ? leader.color : 'var(--dim)'}
                    >
                      <title>{`Highest: ${leader.name}`}</title>
                    </path>
                  ) : (
                    <text x={PW - 8} y={y + 4} textAnchor="end" className={isLit(leader.id) ? 'rl-row-leader' : 'rl-row-leader dim'}>
                      {leader.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <figcaption>
          Percentage points: a region’s median state minus the national share for that
          specialty. Hover a mark for its value. The South has the highest regional
          median in {leaders.south} of {prints.rows.length} specialties, the Northeast
          in {leaders.northeast}, the Midwest in {leaders.midwest} and the West in{' '}
          {leaders.west}. Medians weight every state equally, matching the dots above.
        </figcaption>
      </figure>

      <details className="rl-card rl-table">
        <summary>
          <FaIcon name="records" /> Table of all {states.length} plotted states
        </summary>
        <div className="rl-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">State</th>
                <th scope="col">Region</th>
                <th scope="col">Records</th>
                <th scope="col">Brand share of claims</th>
                <th scope="col">Brand share of cost</th>
              </tr>
            </thead>
            <tbody>
              {[...states]
                .filter((s) => isLit(s.region.id))
                .sort(
                  (a, b) =>
                    REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) ||
                    b.row.brandCostShare - a.row.brandCostShare,
                )
                .map((s) => (
                  <tr key={s.code}>
                    <th scope="row">{s.name}</th>
                    <td>
                      <Glyph region={s.region} size={12} /> {s.region.name}
                    </td>
                    <td>{s.row.records.toLocaleString('en-US')}</td>
                    <td>{pct(s.row.brandClaimShare)}</td>
                    <td>{pct(s.row.brandCostShare)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>

      <footer className="rl-notes">
        <p>
          <b>What changed from Week 8.</b> The state scatterplot is copied from the Week 8
          “Across states” view. New: Census-region color with a matching marker shape,
          the interactive legend with regional medians, a linked tile map, linked
          hover between map and plot, the every-specialty comparison, and shareable
          links.
        </p>
        <p>
          <b>Data.</b> CMS Medicare Part D Prescribers by Provider, {data.meta.year}.
          Brand-name follows CMS: New Drug Application and Biologics License
          Application products, including authorized generics and CMS’s small “other”
          category. Drug cost is gross of manufacturer rebates, which mainly reduce
          brand-name cost. Records with suppressed generic values are excluded.
          States need 50+ provider records to be plotted and a region needs{' '}
          {MIN_REGION_STATES}+ plotted states for a median. These are descriptive
          differences between places, not evidence about why prescribing differs or
          whether a generic was available or appropriate.
        </p>
        <p>
          <a href="https://github.com/sd7777777/data-visualization-student-starter/tree/main/src/assignments/week-10">
            Source and method <FaIcon name="external" />
          </a>
        </p>
      </footer>
    </main>
  );
}
