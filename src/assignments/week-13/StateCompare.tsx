'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG rows and map tiles have no native equivalent here; role and tabIndex make them operable. */

import { scaleLog } from 'd3-scale';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaIcon } from '@/components/fa-icon';
import {
  RATIO_SORTS,
  areaTotal,
  formatMultiple,
  formatPerClaim,
  logTicks,
  parseRatioSort,
  ratioRank,
  ratioRows,
  sortRatioRows,
  stateAreas,
  type RatioRow,
  type RatioSort,
} from '@/lib/cost-ratio';
import type { DrugMixData } from '@/lib/drug-mix';
import { REGIONS, TILE_GRID } from '@/lib/regions';
import {
  NATION,
  compareWords,
  headline,
  multipleColor,
  nationalRows,
  colorDomain,
  rankStates,
  specialtyAcrossStates,
  tileText,
} from '@/lib/state-compare';
import { pct, useWidth } from '../week-11/shared';
import '../week-12/cost-ratio.css';
import './state-compare.css';

const STATE_CODES = new Set(REGIONS.flatMap((region) => region.states));
const BRAND = 'var(--orange)';
const GENERIC = 'var(--teal)';
const dev = process.env.NODE_ENV === 'development';

function tickLabel(value: number) {
  return value >= 1000 ? `$${value / 1000}k` : `$${value}`;
}

export default function StateCompare() {
  const [data, setData] = useState<DrugMixData | null>(null);
  const [failed, setFailed] = useState(false);
  const [geography, setGeography] = useState(NATION);
  const [sort, setSort] = useState<RatioSort>('ratio');
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [base, setBase] = useState('./');
  const [chartRef, chartWidth] = useWidth<HTMLDivElement>(820);

  useEffect(() => {
    const root = location.pathname.replace(/week-13(?:\.html)?\/?$/, '');
    const params = new URLSearchParams(location.search);
    fetch(`${root}data/prescriber-summary/drug-mix.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<DrugMixData>;
      })
      .then((loaded) => {
        const wanted = params.get('geo')?.toUpperCase();
        if (wanted && (wanted === NATION || STATE_CODES.has(wanted))) setGeography(wanted);
        setSort(parseRatioSort(params.get('sort')));
        const specialty = params.get('s');
        if (specialty && loaded.specialties.includes(specialty)) setPinned(specialty);
        setBase(root);
        setData(loaded);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams();
    if (geography !== NATION) params.set('geo', geography);
    if (sort !== 'ratio') params.set('sort', sort);
    if (pinned) params.set('s', pinned);
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }, [data, geography, pinned, sort]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A scroll can leave a hover behind without a mouseleave; clear it so the pinned row comes back.
  useEffect(() => {
    const clear = () => setHovered(null);
    window.addEventListener('scroll', clear, { passive: true });
    return () => window.removeEventListener('scroll', clear);
  }, []);

  const areas = useMemo(() => (data ? stateAreas(data, STATE_CODES) : []), [data]);
  const national = useMemo(() => (data ? nationalRows(data) : new Map<string, RatioRow>()), [data]);
  const nationArea = data?.areas.find((item) => item.code === NATION) ?? null;
  const nationTotal = nationArea ? areaTotal(nationArea) : null;
  const area = data?.areas.find((item) => item.code === geography) ?? null;
  const view = useMemo(() => (data && area ? ratioRows(data, area) : null), [data, area]);
  const rows = useMemo(() => (view ? sortRatioRows(view.rows, sort) : []), [sort, view]);
  const total = area ? areaTotal(area) : null;

  const domain = useMemo<[number, number]>(() => {
    if (!data) return [10, 10000];
    const us = data.areas.find((item) => item.code === NATION);
    const values = [...areas, ...(us ? [us] : [])].flatMap((item) =>
      ratioRows(data, item).rows.flatMap((row) => [row.generic, row.brand]),
    );
    return [Math.min(...values) / 1.15, Math.max(...values) * 1.2];
  }, [areas, data]);

  const toggle = useCallback((name: string) => {
    setPinned((current) => (current === name ? null : name));
  }, []);
  const choosePlace = useCallback((code: string) => {
    setGeography(code);
    setHovered(null);
  }, []);

  if (failed) return <main className="cr12 cr12-empty">The Part D summary could not be loaded.</main>;
  if (!data || !area || !view || !total || !nationTotal)
    return <main className="cr12 cr12-empty">Loading Part D data…</main>;

  const isNation = geography === NATION;
  const narrow = chartWidth < 620;
  const twoColumns = !isNation && !narrow;
  const margin = narrow
    ? { left: 12, right: 54, top: 40, bottom: 44 }
    : { left: 236, right: twoColumns ? 128 : 74, top: 40, bottom: 48 };
  const rowHeight = narrow ? 46 : 26;
  const height = margin.top + rows.length * rowHeight + margin.bottom;
  const x = scaleLog()
    .domain(domain)
    .range([margin.left, Math.max(margin.left + 80, chartWidth - margin.right)]);
  const ticks = logTicks(domain[0], domain[1]);

  const focusName = hovered ?? pinned;
  const shown = rows.find((row) => row.name === focusName) ?? null;
  const card = shown ?? rows[0];
  const cardNation = national.get(card.name) ?? null;
  const lead = sortRatioRows(rows, 'ratio')[0];
  const last = sortRatioRows(rows, 'ratio').at(-1) ?? lead;
  const place = isNation ? 'Medicare Part D' : `${area.name}’s Part D prescribers`;
  const higher = isNation
    ? 0
    : rows.filter((row) => {
        const us = national.get(row.name);
        return us ? row.ratio > us.ratio : false;
      }).length;

  return (
    <main className="cr12 cr13">
      <header className="cr12-top">
        <a href={base}>← Explorer</a>
        <a href={`${base}${dev ? 'week-12' : 'week-12.html'}`}>Week 12 version</a>
      </header>

      <section className="cr12-intro" aria-labelledby="cr13-title">
        <p className="cr12-eyebrow">WEEK 13 · ITERATE · CMS {data.meta.year}</p>
        <h1 id="cr13-title">{headline(area.name, total.ratio, isNation)}</h1>
        <p>
          Across {place}, a brand-name claim averaged <b>{formatPerClaim(total.brand)}</b> and a generic claim{' '}
          <b>{formatPerClaim(total.generic)}</b>
          {isNation ? null : (
            <>
              , a multiple of <b>{formatMultiple(total.ratio)}</b>, {compareWords(total.ratio, nationTotal.ratio)} the
              national {formatMultiple(nationTotal.ratio)}
            </>
          )}
          . The multiple runs from <b>{formatMultiple(last.ratio)}</b> in {last.label} to{' '}
          <b>{formatMultiple(lead.ratio)}</b> in {lead.label}
          {isNation ? null : (
            <>
              ; {higher} of {rows.length} specialties are above their national multiple
            </>
          )}
          .
        </p>
      </section>

      <section className="cr13-guide" aria-label="How to read this chart">
        <svg width="230" height="44" aria-hidden="true">
          <line x1="30" x2="160" y1="26" y2="26" className="cr12-link" />
          <circle cx="30" cy="26" r="6" fill={GENERIC} />
          <circle cx="160" cy="26" r="6" fill={BRAND} />
          <text x="30" y="11" textAnchor="middle">generic</text>
          <text x="160" y="11" textAnchor="middle">brand-name</text>
          <text x="226" y="30" textAnchor="end" className="cr13-guide-x">
            54×
          </text>
        </svg>
        <ul>
          <li>
            <b>Each row is a specialty.</b> The dots are its average cost for one claim, which is one prescription fill.
          </li>
          <li>
            <b>The column on the right</b> divides the brand-name dot by the generic dot. The axis is logarithmic, so a
            longer bar always means a bigger multiple.
          </li>
          <li>
            <b>Click a specialty</b> (or press Enter) to pin it. The map then shows that specialty in every state. Click
            a state to compare it with the nation.
          </li>
        </ul>
      </section>

      <div className="cr12-controls">
        <label>
          <span>Place</span>
          <select value={geography} onChange={(event) => choosePlace(event.target.value)}>
            <option value={NATION}>United States</option>
            {areas.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {isNation ? null : (
          <button type="button" className="cr13-reset" onClick={() => choosePlace(NATION)}>
            <FaIcon name="reset" /> Back to United States
          </button>
        )}
        <div className="cr12-sort" role="group" aria-label="Sort specialties by">
          <span>Sort by</span>
          <div className="cr12-seg">
            {RATIO_SORTS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={sort === option.id}
                onClick={() => setSort(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="cr12-legend" aria-label="Legend">
          <li>
            <i style={{ background: GENERIC }} /> Generic per claim
          </li>
          <li>
            <i style={{ background: BRAND }} /> Brand-name per claim
          </li>
          {isNation ? null : (
            <li>
              <i className="cr13-ghost-key" /> U.S. average
            </li>
          )}
        </ul>
      </div>

      <section className="cr12-layout cr13-layout">
        <div ref={chartRef} className="cr12-chart">
          <svg
            width={chartWidth}
            height={height}
            role="group"
            aria-label={`Cost per claim for generic and brand-name drugs by specialty, ${area.name}${
              isNation ? '' : ', with United States averages as hollow rings'
            }`}
          >
            {ticks.map((tick) => (
              <g key={tick} transform={`translate(${x(tick)},0)`}>
                <line className="cr12-grid" y1={margin.top - 6} y2={height - margin.bottom} />
                <text className="cr12-tick" y={margin.top - 12} textAnchor="middle">
                  {tickLabel(tick)}
                </text>
                <text className="cr12-tick" y={height - margin.bottom + 16} textAnchor="middle">
                  {tickLabel(tick)}
                </text>
              </g>
            ))}
            {twoColumns ? (
              <>
                <text className="cr13-colhead" x={chartWidth - 66} y={margin.top - 24} textAnchor="end">
                  {geography}
                </text>
                <text className="cr13-colhead" x={chartWidth - 10} y={margin.top - 24} textAnchor="end">
                  U.S.
                </text>
                <text className="cr13-colsub" x={chartWidth - 10} y={margin.top - 10} textAnchor="end">
                  brand ÷ generic
                </text>
              </>
            ) : (
              <>
                <text className="cr13-colhead" x={chartWidth - 10} y={margin.top - 24} textAnchor="end">
                  {narrow ? '÷' : 'Brand ÷'}
                </text>
                <text className="cr13-colsub" x={chartWidth - 10} y={margin.top - 10} textAnchor="end">
                  {narrow ? '' : 'generic'}
                </text>
              </>
            )}
            <text
              className="cr12-axis"
              x={(x.range()[0] + x.range()[1]) / 2}
              y={height - 8}
              textAnchor="middle"
            >
              Average drug cost per claim (log scale)
            </text>
            {rows.map((row, index) => (
              <Row
                key={row.name}
                row={row}
                nation={isNation ? null : (national.get(row.name) ?? null)}
                twoColumns={twoColumns}
                index={index}
                x={x}
                y={margin.top + index * rowHeight}
                width={chartWidth}
                height={rowHeight}
                narrow={narrow}
                labelEnd={margin.left - 12}
                dim={shown !== null && shown.name !== row.name}
                active={shown?.name === row.name}
                pinned={pinned === row.name}
                onHover={setHovered}
                onToggle={toggle}
              />
            ))}
          </svg>
        </div>

        <aside className="cr13-side">
          <div className="cr12-card cr13-card" aria-live="polite">
            <p className="cr12-eyebrow">
              {pinned === card.name ? 'PINNED' : shown ? 'HOVERING' : 'HIGHEST MULTIPLE'}
              {isNation ? '' : ` · ${area.name.toUpperCase()}`}
            </p>
            <h2>{card.name}</h2>
            <p className="cr12-multiple">
              {formatMultiple(card.ratio)}
              <small>brand-name vs. generic, per claim</small>
            </p>
            {isNation || !cardNation ? (
              <dl>
                <div>
                  <dt>Brand-name per claim</dt>
                  <dd>{formatPerClaim(card.brand)}</dd>
                </div>
                <div>
                  <dt>Generic per claim</dt>
                  <dd>{formatPerClaim(card.generic)}</dd>
                </div>
                <div>
                  <dt>Brand-name share of cost</dt>
                  <dd>{pct(card.row.brandCostShare)}</dd>
                </div>
                <div>
                  <dt>Rank by multiple</dt>
                  <dd>
                    {ratioRank(rows, card.name)} of {rows.length}
                  </dd>
                </div>
              </dl>
            ) : (
              <>
                <p className="cr13-verdict">
                  <b>{compareWords(card.ratio, cardNation.ratio)}</b> the national {formatMultiple(cardNation.ratio)}
                </p>
                <table className="cr13-vs">
                  <thead>
                    <tr>
                      <th scope="col">Per claim</th>
                      <th scope="col">{geography}</th>
                      <th scope="col">U.S.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Brand-name</th>
                      <td>{formatPerClaim(card.brand)}</td>
                      <td>{formatPerClaim(cardNation.brand)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Generic</th>
                      <td>{formatPerClaim(card.generic)}</td>
                      <td>{formatPerClaim(cardNation.generic)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Multiple</th>
                      <td>{formatMultiple(card.ratio)}</td>
                      <td>{formatMultiple(cardNation.ratio)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
            {card.lowCoverage ? (
              <p className="cr12-flag">
                † Only {pct(card.row.claimCoverage)} of claims have a reported generic split here, so this multiple is
                less certain.
              </p>
            ) : null}
          </div>
          <StateMap
            data={data}
            specialty={card.name}
            label={card.label}
            nation={cardNation}
            selected={geography}
            onChoose={(code) => choosePlace(code === geography ? NATION : code)}
          />
        </aside>
      </section>

      {view.excluded ? (
        <p className="cr12-note">
          {view.excluded} {view.excluded === 1 ? 'specialty' : 'specialties'} with fewer than 50 provider records in{' '}
          {area.name} {view.excluded === 1 ? 'is' : 'are'} not shown.
        </p>
      ) : null}

      <details className="cr12-table">
        <summary>All {rows.length} specialties as a table</summary>
        <div>
          <table>
            <thead>
              <tr>
                <th scope="col">Specialty</th>
                <th scope="col">Generic per claim</th>
                <th scope="col">Brand-name per claim</th>
                <th scope="col">Multiple</th>
                {isNation ? null : <th scope="col">U.S. multiple</th>}
                <th scope="col">Share of claims with a generic split</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row">
                    {row.name}
                    {row.lowCoverage ? ' †' : ''}
                  </th>
                  <td>{formatPerClaim(row.generic)}</td>
                  <td>{formatPerClaim(row.brand)}</td>
                  <td>{formatMultiple(row.ratio)}</td>
                  {isNation ? null : (
                    <td>{national.has(row.name) ? formatMultiple(national.get(row.name)!.ratio) : '—'}</td>
                  )}
                  <td>{pct(row.row.claimCoverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <section className="cr12-notes" aria-label="About this page">
        <div>
          <h2>What changed this week</h2>
          <p>
            Week 12 showed one place at a time, so a state view could not say whether it was high or low. Picking a state
            now keeps the national averages on every row as hollow rings, adds a U.S. column, and compares the two in the
            side card.
          </p>
          <p>
            A new state map shows the focused specialty in every state. Hovering or pinning a row updates it, and
            clicking a state changes the place. The title now follows the place, a short guide explains how to read a
            row, and the multiple column has a header.
          </p>
        </div>
        <div>
          <h2>What it can’t say</h2>
          <p>
            These are averages over different drugs, not a brand-name drug compared with its own generic. Brand-name
            claims include drugs that have no generic, and a claim can be a 30-day or 90-day fill. A high multiple can
            come from unusually cheap generics as much as from expensive brand-name drugs.
          </p>
          <p>
            Costs are gross of manufacturer rebates, which mainly reduce brand-name prices. A state’s difference from the
            nation can reflect its mix of patients and drugs, not prices alone.
          </p>
        </div>
        <div>
          <h2>Data</h2>
          <p>
            CMS Medicare Part D Prescribers by Provider, {data.meta.year}, covering the 30 highest-cost specialties.
            Brand-name includes CMS’s small “other” category. Records with suppressed generic values are excluded rather
            than imputed. A state specialty needs 50 provider records. The United States pools all records, including
            territories.
          </p>
          <p>
            <a href="https://github.com/sd7777777/data-visualization-student-starter/tree/main/src/assignments/week-13">
              Source and method <FaIcon name="external" />
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

function StateMap({
  data,
  specialty,
  label,
  nation,
  selected,
  onChoose,
}: {
  data: DrugMixData;
  specialty: string;
  label: string;
  nation: RatioRow | null;
  selected: string;
  onChoose: (code: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [ref, width] = useWidth<HTMLElement>(300);
  const values = useMemo(() => specialtyAcrossStates(data, specialty, STATE_CODES), [data, specialty]);
  const ranked = useMemo(() => rankStates(values), [values]);
  if (!ranked.length) return null;
  const high = ranked[0];
  const low = ranked.at(-1)!;
  const [lo, hi] = colorDomain(ranked);
  const clampedLow = low.row.ratio < lo;
  const clampedHigh = high.row.ratio > hi;
  const anyFlag = ranked.some((value) => value.row.lowCoverage);
  const gap = 3;
  const size = Math.min(44, Math.floor((width - 10 * gap) / 11));
  const mapWidth = 11 * size + 10 * gap;
  const mapHeight = 8 * size + 7 * gap;
  const focus = values.find((value) => value.code === (hover ?? (selected === NATION ? null : selected)));
  const rank = focus?.row ? ranked.findIndex((value) => value.code === focus.code) + 1 : null;
  const tick = (value: number) =>
    hi > lo ? ((Math.log(value) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * 100 : 50;

  return (
    <section className="cr13-map" aria-labelledby="cr13-map-title" ref={ref}>
      <h2 id="cr13-map-title">{label} in every state</h2>
      <p className="cr13-map-sub">
        Darker tiles have a bigger multiple. Click a state to compare it with the nation.
        {anyFlag ? ' † Under 95% of claims have a generic split.' : ''}
      </p>
      <svg width={mapWidth} height={mapHeight} role="group" aria-label={`${label} multiple by state`}>
        {values.map((value) => {
          const cell = TILE_GRID[value.code];
          if (!cell) return null;
          const fill = value.row ? multipleColor(value.row.ratio, lo, hi) : 'var(--paper)';
          const ink = value.row ? tileText(fill) : 'var(--muted)';
          const isSelected = value.code === selected;
          return (
            <g
              key={value.code}
              className={`cr13-tile${isSelected ? ' selected' : ''}${value.row ? '' : ' empty'}`}
              transform={`translate(${cell[0] * (size + gap)},${cell[1] * (size + gap)})`}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={
                value.row
                  ? `${value.name}: ${formatMultiple(value.row.ratio)}${value.row.lowCoverage ? ', low generic coverage' : ''}`
                  : `${value.name}: fewer than 50 provider records`
              }
              onMouseEnter={() => setHover(value.code)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(value.code)}
              onBlur={() => setHover(null)}
              onClick={() => onChoose(value.code)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onChoose(value.code);
                }
              }}
            >
              <rect width={size} height={size} rx={3} fill={fill} />
              <text x={size / 2} y={size / 2} dy="0.35em" textAnchor="middle" fill={ink}>
                {value.code}
                {value.row?.lowCoverage ? '†' : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="cr13-ramp" aria-hidden="true">
        <span
          style={{
            background: `linear-gradient(90deg, ${multipleColor(lo, lo, hi)}, ${multipleColor(
              Math.sqrt(lo * hi),
              lo,
              hi,
            )}, ${multipleColor(hi, lo, hi)})`,
          }}
        />
        {nation ? <i style={{ left: `${Math.min(100, Math.max(0, tick(nation.ratio)))}%` }} title="U.S." /> : null}
        <small>
          <b>
            {clampedLow ? '≤ ' : ''}
            {formatMultiple(lo)}
          </b>
          {nation ? <em>U.S. {formatMultiple(nation.ratio)}</em> : null}
          <b>
            {clampedHigh ? '≥ ' : ''}
            {formatMultiple(hi)}
          </b>
        </small>
      </div>
      <p className="cr13-map-caption" aria-live="polite">
        {focus ? (
          focus.row ? (
            <>
              <b>{focus.name}</b> ranks {rank} of {ranked.length} at {formatMultiple(focus.row.ratio)}: brand-name{' '}
              {formatPerClaim(focus.row.brand)}, generic {formatPerClaim(focus.row.generic)}.
              {focus.row.lowCoverage ? ` † Only ${pct(focus.row.row.claimCoverage)} of claims have a generic split.` : ''}
            </>
          ) : (
            <>
              <b>{focus.name}</b> has fewer than 50 provider records in {label}.
            </>
          )
        ) : (
          <>
            Highest in <b>{high.name}</b> ({formatMultiple(high.row.ratio)}), lowest in <b>{low.name}</b> (
            {formatMultiple(low.row.ratio)}).{' '}
            {ranked.length} of {values.length} states have enough records.
          </>
        )}
      </p>
    </section>
  );
}

function Row({
  row,
  nation,
  twoColumns,
  index,
  x,
  y,
  width,
  height,
  narrow,
  labelEnd,
  dim,
  active,
  pinned,
  onHover,
  onToggle,
}: {
  row: RatioRow;
  nation: RatioRow | null;
  twoColumns: boolean;
  index: number;
  x: (value: number) => number;
  y: number;
  width: number;
  height: number;
  narrow: boolean;
  labelEnd: number;
  dim: boolean;
  active: boolean;
  pinned: boolean;
  onHover: (name: string | null) => void;
  onToggle: (name: string) => void;
}) {
  const mid = narrow ? height - 14 : height / 2;
  const genericX = x(row.generic);
  const brandX = x(row.brand);
  const vs = nation ? `; U.S. ${formatMultiple(nation.ratio)}` : '';
  return (
    <g
      className={`cr12-row${dim ? ' dim' : ''}${active ? ' active' : ''}`}
      style={{ transform: `translateY(${y}px)` }}
      role="button"
      tabIndex={0}
      aria-pressed={pinned}
      aria-label={`${row.name}: generic ${formatPerClaim(row.generic)}, brand-name ${formatPerClaim(row.brand)}, ${formatMultiple(row.ratio)}${vs}`}
      onMouseEnter={() => onHover(row.name)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(row.name)}
      onBlur={() => onHover(null)}
      onClick={() => onToggle(row.name)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle(row.name);
        }
      }}
    >
      <rect className={index % 2 ? 'even' : 'odd'} width={width} height={height} />
      <text
        className="cr12-label"
        x={narrow ? 12 : labelEnd}
        y={narrow ? 15 : mid}
        dy={narrow ? 0 : '0.34em'}
        textAnchor={narrow ? 'start' : 'end'}
      >
        {row.label}
        {row.lowCoverage ? ' †' : ''}
      </text>
      {nation ? (
        <g className="cr13-ghost">
          <circle cx={x(nation.generic)} cy={mid} r={7} />
          <circle cx={x(nation.brand)} cy={mid} r={7} />
        </g>
      ) : null}
      <line x1={genericX} x2={brandX} y1={mid} y2={mid} className="cr12-link" />
      <circle cx={genericX} cy={mid} r={pinned ? 6.5 : 5} fill={GENERIC} />
      <circle cx={brandX} cy={mid} r={pinned ? 6.5 : 5} fill={BRAND} />
      {active ? (
        <>
          <text className="cr12-value" x={genericX} y={mid - 9} textAnchor="middle">
            {formatPerClaim(row.generic)}
          </text>
          <text className="cr12-value" x={brandX} y={mid - 9} textAnchor="middle">
            {formatPerClaim(row.brand)}
          </text>
        </>
      ) : null}
      <text
        className="cr12-ratio"
        x={twoColumns ? width - 66 : width - 10}
        y={mid}
        dy="0.34em"
        textAnchor="end"
      >
        {formatMultiple(row.ratio)}
      </text>
      {twoColumns && nation ? (
        <text className="cr13-us" x={width - 10} y={mid} dy="0.34em" textAnchor="end">
          {formatMultiple(nation.ratio)}
        </text>
      ) : null}
    </g>
  );
}
