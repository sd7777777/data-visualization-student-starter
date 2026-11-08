'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG rows and the segmented control have no native equivalent here; role and tabIndex make them operable. */

import { scaleLog } from 'd3-scale';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaIcon } from '@/components/fa-icon';
import {
  DEFAULT_GEOGRAPHY,
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
import { REGIONS } from '@/lib/regions';
import { pct, useWidth } from '../week-11/shared';
import './cost-ratio.css';

const STATE_CODES = new Set(REGIONS.flatMap((region) => region.states));
const BRAND = 'var(--orange)';
const GENERIC = 'var(--teal)';

function tickLabel(value: number) {
  return value >= 1000 ? `$${value / 1000}k` : `$${value}`;
}

export default function CostRatio() {
  const [data, setData] = useState<DrugMixData | null>(null);
  const [failed, setFailed] = useState(false);
  const [geography, setGeography] = useState(DEFAULT_GEOGRAPHY);
  const [sort, setSort] = useState<RatioSort>('ratio');
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [base, setBase] = useState('./');
  const [chartRef, chartWidth] = useWidth<HTMLDivElement>(820);

  useEffect(() => {
    const root = location.pathname.replace(/week-12(?:\.html)?\/?$/, '');
    const params = new URLSearchParams(location.search);
    fetch(`${root}data/prescriber-summary/drug-mix.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<DrugMixData>;
      })
      .then((loaded) => {
        const wanted = params.get('geo')?.toUpperCase();
        if (wanted && (wanted === DEFAULT_GEOGRAPHY || STATE_CODES.has(wanted))) setGeography(wanted);
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
    if (geography !== DEFAULT_GEOGRAPHY) params.set('geo', geography);
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

  const areas = useMemo(
    () => (data ? stateAreas(data, STATE_CODES) : []),
    [data],
  );
  const area = data?.areas.find((item) => item.code === geography) ?? null;
  const view = useMemo(
    () => (data && area ? ratioRows(data, area) : null),
    [data, area],
  );
  const rows = useMemo(() => (view ? sortRatioRows(view.rows, sort) : []), [sort, view]);
  const total = area ? areaTotal(area) : null;

  // One scale for every place, so switching geography moves the marks and not the axis.
  const domain = useMemo<[number, number]>(() => {
    if (!data) return [10, 10000];
    const us = data.areas.find((item) => item.code === DEFAULT_GEOGRAPHY);
    const values = [...areas, ...(us ? [us] : [])].flatMap((item) =>
      ratioRows(data, item).rows.flatMap((row) => [row.generic, row.brand]),
    );
    return [Math.min(...values) / 1.15, Math.max(...values) * 1.2];
  }, [areas, data]);

  const toggle = useCallback((name: string) => {
    setPinned((current) => (current === name ? null : name));
  }, []);

  if (failed)
    return <main className="cr12 cr12-empty">The Part D summary could not be loaded.</main>;
  if (!data || !area || !view || !total)
    return <main className="cr12 cr12-empty">Loading Part D data…</main>;

  const narrow = chartWidth < 620;
  const margin = narrow
    ? { left: 12, right: 54, top: 32, bottom: 44 }
    : { left: 236, right: 66, top: 32, bottom: 48 };
  const rowHeight = narrow ? 46 : 26;
  const height = margin.top + rows.length * rowHeight + margin.bottom;
  const x = scaleLog()
    .domain(domain)
    .range([margin.left, Math.max(margin.left + 80, chartWidth - margin.right)]);
  const ticks = logTicks(domain[0], domain[1]);

  const focusName = hovered ?? pinned;
  const shown = rows.find((row) => row.name === focusName) ?? null;
  const card = shown ?? rows[0];
  const lead = sortRatioRows(rows, 'ratio')[0];
  const last = sortRatioRows(rows, 'ratio').at(-1) ?? lead;
  const topBrand = sortRatioRows(rows, 'brand')[0];
  const place = geography === DEFAULT_GEOGRAPHY ? 'Medicare Part D' : `${area.name}’s Part D prescribers`;

  return (
    <main className="cr12">
      <header className="cr12-top">
        <a href={base}>← Explorer</a>
        <a href={`${base}${process.env.NODE_ENV === 'development' ? 'week-11' : 'week-11.html'}`}>
          Week 11 regional lens
        </a>
      </header>

      <section className="cr12-intro" aria-labelledby="cr12-title">
        <p className="cr12-eyebrow">WEEK 12 · TRY VIZHUB · CMS {data.meta.year}</p>
        <h1 id="cr12-title">
          A brand-name claim costs about {Math.round(total.ratio)} times as much as a generic claim
        </h1>
        <p>
          Across {place}, a brand-name claim averaged <b>{formatPerClaim(total.brand)}</b> and a generic claim{' '}
          <b>{formatPerClaim(total.generic)}</b>. The multiple runs from{' '}
          <b>{formatMultiple(last.ratio)}</b> in {last.label} to <b>{formatMultiple(lead.ratio)}</b> in {lead.label}
          {topBrand.name !== lead.name ? (
            <>
              , while the most expensive brand-name claims are in {topBrand.label} (
              {formatPerClaim(topBrand.brand)})
            </>
          ) : null}
          .
        </p>
      </section>

      <div className="cr12-controls">
        <label>
          <span>Place</span>
          <select
            value={geography}
            onChange={(event) => {
              setGeography(event.target.value);
              setHovered(null);
            }}
          >
            <option value={DEFAULT_GEOGRAPHY}>United States</option>
            {areas.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
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
            <i style={{ background: GENERIC }} /> Generic cost per claim
          </li>
          <li>
            <i style={{ background: BRAND }} /> Brand-name cost per claim
          </li>
        </ul>
      </div>

      <section className="cr12-layout">
        <div ref={chartRef} className="cr12-chart">
          <svg
            width={chartWidth}
            height={height}
            role="group"
            aria-label={`Cost per claim for generic and brand-name drugs by specialty, ${area.name}`}
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

        <aside className="cr12-card" aria-live="polite">
          <p className="cr12-eyebrow">{pinned === card.name ? 'PINNED' : shown ? 'HOVERING' : 'HIGHEST MULTIPLE'}</p>
          <h2>{card.name}</h2>
          <p className="cr12-multiple">
            {formatMultiple(card.ratio)}
            <small>brand-name vs. generic, per claim</small>
          </p>
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
              <dt>Brand-name share of claims</dt>
              <dd>{pct(card.row.brandClaimShare)}</dd>
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
            <div>
              <dt>Provider records</dt>
              <dd>{card.row.records.toLocaleString('en-US')}</dd>
            </div>
          </dl>
          {card.lowCoverage ? (
            <p className="cr12-flag">
              † Only {pct(card.row.claimCoverage)} of claims have a reported generic split here, so this multiple is less
              certain.
            </p>
          ) : null}
          <p className="cr12-hint">Hover or focus a row to compare. Click or press Enter to pin. Esc clears.</p>
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
                  <td>{pct(row.row.claimCoverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <section className="cr12-notes" aria-label="About this page">
        <div>
          <h2>How it was made</h2>
          <p>
            This chart began as a VizHub prototype, one of 20 generated from a state-by-specialty extract of the project’s
            data. I chose it because it turns a share of spending into a price comparison that a reader can picture.
          </p>
          <p>
            Porting it into this repository meant fixing what the prototype got wrong. It subtracted generics from all
            claims, which counted suppressed generics as brand-name, and it drew a “1× equal” line at $1 per claim on a
            dollar axis. It also clipped long specialty names and let its footnote overlap the last rows.
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
            Costs are gross of manufacturer rebates, which mainly reduce brand-name prices. Nothing here shows whether a
            generic was available or appropriate.
          </p>
        </div>
        <div>
          <h2>Data</h2>
          <p>
            CMS Medicare Part D Prescribers by Provider, {data.meta.year}, covering the 30 highest-cost specialties.
            Brand-name includes CMS’s small “other” category. Records with suppressed generic values are excluded rather
            than imputed. The United States view pools all records, including territories.
          </p>
          <p>
            <a href="https://github.com/sd7777777/data-visualization-student-starter/tree/main/src/assignments/week-12">
              Source and method <FaIcon name="external" />
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

function Row({
  row,
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
  return (
    <g
      className={`cr12-row${dim ? ' dim' : ''}${active ? ' active' : ''}`}
      style={{ transform: `translateY(${y}px)` }}
      role="button"
      tabIndex={0}
      aria-pressed={pinned}
      aria-label={`${row.name}: generic ${formatPerClaim(row.generic)}, brand-name ${formatPerClaim(row.brand)}, ${formatMultiple(row.ratio)}`}
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
      <text className="cr12-ratio" x={width - 10} y={mid} dy="0.34em" textAnchor="end">
        {formatMultiple(row.ratio)}
      </text>
    </g>
  );
}
