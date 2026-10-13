'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG marks expose keyboard-operable button roles; the flip bars form one chart image. */

import { Fragment, useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { FaIcon } from '@/components/fa-icon';
import { downloadFile } from '@/lib/download';
import {
  LOW_COVERAGE,
  MIN_RECORDS,
  areaRows,
  costMultiple,
  mixCsv,
  mixRow,
  sortRows,
  stateRows,
  type DrugMixData,
  type MixRow,
  type MixSort,
} from '@/lib/drug-mix';
import { STATE_CODES, TERRITORY_CODES } from '@/lib/geography-analysis';
import { compact, dollars, money } from '@/lib/prescriber';

/** Segments narrower than this share are labelled outside the bar. */
const MIN_INSIDE = 0.25;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const wholePct = (value: number) => `${Math.round(value * 100)}%`;
/** Percent tick label with a decimal only when ticks are closer than one point. */
const tickLabel = (tick: number, ticks: number[]) =>
  `${(tick * 100).toFixed(ticks.length > 1 && ticks[1] - ticks[0] < 0.01 ? 1 : 0)}%`;
const times = (value: number | null) =>
  value === null
    ? '—'
    : `${value >= 10 ? Math.round(value) : value.toFixed(1)}×`;

const sorts: [MixSort, string][] = [
  ['brandCost', 'Brand spending'],
  ['costShare', 'Cost share'],
  ['claimShare', 'Claim share'],
  ['gap', 'Largest gap'],
];

function describe(row: MixRow, place: string) {
  const multiple = costMultiple(row);
  return `${row.name} in ${place}: brand-name drugs are ${pct(row.brandClaimShare)} of claims and ${pct(row.brandCostShare)} of drug cost (${money.format(row.brandCost)}).${
    multiple
      ? ` A brand-name claim averaged ${dollars.format(row.brandCostPerClaim!)} versus ${dollars.format(row.genericCostPerClaim!)} for a generic claim, ${times(multiple)} as much.`
      : ''
  }`;
}

/** Week 8 iteration: where brand-name and generic drugs diverge between claims and cost. */
export function BrandGap({
  data,
  areaCode,
  onArea,
  selected,
  onSelect,
}: {
  /** Loaded with the main summary; undefined while loading, null on failure. */
  data: DrugMixData | null | undefined;
  areaCode: string;
  onArea: (code: string) => void;
  selected: string;
  onSelect: (specialty: string) => void;
}) {
  const [sort, setSort] = useState<MixSort>('brandCost');
  const [hovered, setHovered] = useState('');

  const area = data?.areas.find((d) => d.code === areaCode) ?? data?.areas[0];
  const total = useMemo(
    () => (area ? mixRow('All specialties', area.total) : null),
    [area],
  );
  const { rows, excluded } = useMemo(
    () => (data && area ? areaRows(data, area) : { rows: [], excluded: 0 }),
    [data, area],
  );
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  // The page-wide selection when available here, otherwise the largest brand spender.
  const focusName =
    rows.find((row) => row.name === selected)?.name ??
    (data?.specialties.includes(selected)
      ? selected
      : (sortRows(rows, 'brandCost')[0]?.name ?? data?.specialties[0] ?? ''));
  const states = useMemo(
    () => (data ? stateRows(data, focusName, STATE_CODES) : []),
    [data, focusName],
  );
  const national = useMemo(() => {
    if (!data) return null;
    const tuple =
      data.areas[0].specialties[data.specialties.indexOf(focusName)];
    return tuple ? mixRow(focusName, tuple) : null;
  }, [data, focusName]);

  if (!data || !area || !total)
    return (
      <section
        id="week-8"
        className="section-wrap brand-gap"
        aria-busy={data === undefined}
      >
        <p className="studio-empty">
          {data === undefined
            ? 'Loading brand and generic data…'
            : 'The brand and generic summary could not be loaded.'}
        </p>
      </section>
    );

  const year = data.meta.year;
  const other = data.meta.otherShareOfNonGeneric;
  const lowCoverage = sorted.filter((row) => row.claimCoverage < LOW_COVERAGE);
  const inspected =
    rows.find((row) => row.name === hovered) ??
    rows.find((row) => row.name === focusName);

  // Specialty dumbbell geometry.
  const rowHeight = 32;
  const top = 70;
  const x = scaleLinear().domain([0, 1]).range([300, 760]);
  const chartHeight = top + sorted.length * rowHeight + 24;

  // State scatter geometry, padded around the observed values.
  const plotted = states.filter((s) => s.row);
  const values = plotted.flatMap((s) => [s.row!]);
  if (national) values.push(national);
  const xs = values.map((v) => v.brandClaimShare);
  const ys = values.map((v) => v.brandCostShare);
  const pad = (lo: number, hi: number) => {
    const span = Math.max(hi - lo, 0.04);
    return [Math.max(0, lo - span * 0.12), Math.min(1, hi + span * 0.12)];
  };
  const sx = scaleLinear()
    .domain(pad(Math.min(...xs), Math.max(...xs)))
    .range([90, 1040])
    .nice();
  const sy = scaleLinear()
    .domain(pad(Math.min(...ys), Math.max(...ys)))
    .range([400, 40])
    .nice();
  // Label outliers first; skip labels that would collide with one already placed.
  const cx = sx((sx.domain()[0] + sx.domain()[1]) / 2);
  const cy = sy((sy.domain()[0] + sy.domain()[1]) / 2);
  // Label boxes as [centre x, centre y, half width]; the national label is reserved first.
  const placed: [number, number, number][] = national
    ? [[sx(national.brandClaimShare) + 30, sy(national.brandCostShare), 20]]
    : [];
  const labelled = new Set<string>();
  [...plotted]
    .sort((a, b) => {
      if (a.code === areaCode) return -1;
      if (b.code === areaCode) return 1;
      const d = (s: (typeof plotted)[number]) =>
        Math.hypot(
          sx(s.row!.brandClaimShare) - cx,
          sy(s.row!.brandCostShare) - cy,
        );
      return d(b) - d(a);
    })
    .forEach((s) => {
      const px = sx(s.row!.brandClaimShare);
      const py = sy(s.row!.brandCostShare) - 15;
      const clear = placed.every(
        ([qx, qy, half]) =>
          Math.abs(qx - px) > half + 14 || Math.abs(qy - py) > 16,
      );
      if (clear || s.code === areaCode) {
        placed.push([px, py, 14]);
        labelled.add(s.code);
      }
    });
  const extremes = (key: 'brandCostShare' | 'brandClaimShare') => {
    const ordered = [...plotted].sort((a, b) => a.row![key] - b.row![key]);
    return [ordered[0], ordered.at(-1)!];
  };
  const [costLow, costHigh] = extremes('brandCostShare');
  const [claimLow, claimHigh] = extremes('brandClaimShare');
  const missingStates = states.length - plotted.length;

  const flip = [
    { label: 'Claims', brand: total.brandClaimShare },
    { label: 'Drug cost', brand: total.brandCostShare },
  ];
  const brandClaims =
    total.claims * total.claimCoverage * total.brandClaimShare;

  return (
    <section
      id="week-8"
      className="section-wrap brand-gap"
      aria-labelledby="brand-gap-title"
    >
      <div className="story-question">
        <b>
          <span className="chapter-icon">
            <FaIcon name="clinical" />
          </span>{' '}
          WEEK 08 · BRAND & GENERIC · CMS {year}
        </b>
        <h2 id="brand-gap-title">
          Brand-name drugs: {wholePct(total.brandClaimShare)} of claims,{' '}
          {wholePct(total.brandCostShare)} of drug cost
        </h2>
        <p>
          {area.name} · {total.records.toLocaleString()} provider records.
          Generic drugs fill most prescriptions, while brand-name drugs account
          for most spending. Which specialties carry that gap, and does it hold
          from state to state?
        </p>
      </div>

      <div className="brand-controls">
        <label>
          <span>
            <FaIcon name="place" /> Geography
          </span>
          <select value={area.code} onChange={(e) => onArea(e.target.value)}>
            {data.areas
              .filter(
                (d) =>
                  d.code === 'US' ||
                  STATE_CODES.has(d.code) ||
                  TERRITORY_CODES.has(d.code),
              )
              .map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          className="brand-download"
          onClick={() =>
            downloadFile(
              mixCsv(area.name, year, sorted),
              `part-d-brand-generic-${area.code.toLowerCase()}-${year}.csv`,
              'text/csv;charset=utf-8',
            )
          }
        >
          <FaIcon name="download" /> Specialty CSV
        </button>
      </div>

      <figure className="studio-figure brand-figure" id="brand-flip">
        <div className="studio-figure-head">
          <div>
            <span className="eyebrow">1 / THE FLIP</span>
            <h3>The same prescriptions, counted two ways</h3>
          </div>
          <div className="brand-legend" aria-hidden="true">
            <span className="generic-key">Generic</span>
            <span className="brand-key">Brand-name</span>
          </div>
        </div>
        <div
          className="flip-chart"
          role="img"
          aria-label={`${area.name}, ${year}: brand-name drugs are ${pct(total.brandClaimShare)} of claims and ${pct(total.brandCostShare)} of drug cost; generic drugs are ${pct(1 - total.brandClaimShare)} of claims and ${pct(1 - total.brandCostShare)} of cost.`}
        >
          {flip.map((bar, i) => {
            const generic = 1 - bar.brand;
            return (
              <Fragment key={bar.label}>
                <span className="flip-name">{bar.label}</span>
                {/* Narrow segments are labelled just above the bar. */}
                <span className="flip-outside" aria-hidden="true">
                  <span className="generic-text">
                    {generic < MIN_INSIDE ? `Generic ${pct(generic)}` : ''}
                  </span>
                  <span className="brand-text">
                    {bar.brand < MIN_INSIDE
                      ? `Brand-name ${pct(bar.brand)}`
                      : ''}
                  </span>
                </span>
                <span className="flip-track" aria-hidden="true">
                  <span
                    className="flip-generic"
                    style={{ width: `${generic * 100}%` }}
                  >
                    {generic >= MIN_INSIDE && `Generic ${pct(generic)}`}
                  </span>
                  <span
                    className="flip-brand"
                    style={{ width: `${bar.brand * 100}%` }}
                  >
                    {bar.brand >= MIN_INSIDE && `Brand-name ${pct(bar.brand)}`}
                  </span>
                </span>
                {i === 0 && (
                  <svg
                    className="flip-band"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <polygon
                      points={`${generic * 100},0 100,0 100,10 ${(1 - flip[1].brand) * 100},10`}
                    />
                  </svg>
                )}
              </Fragment>
            );
          })}
        </div>
        <div className="brand-stats">
          <p>
            <b>{dollars.format(total.brandCostPerClaim ?? 0)}</b>
            <span>average brand-name claim</span>
          </p>
          <p>
            <b>{dollars.format(total.genericCostPerClaim ?? 0)}</b>
            <span>average generic claim</span>
          </p>
          <p>
            <b>{times(costMultiple(total))}</b>
            <span>cost per claim, brand vs. generic</span>
          </p>
          <p>
            <b>{money.format(total.brandCost)}</b>
            <span>
              brand-name spending on {compact.format(brandClaims)} claims
            </span>
          </p>
        </div>
      </figure>

      <figure className="studio-figure brand-figure" id="brand-specialties">
        <div className="studio-figure-head">
          <div>
            <span className="eyebrow">2 / BY SPECIALTY</span>
            <h3>Where the gap is widest</h3>
          </div>
          <div className="brand-legend" aria-hidden="true">
            <span className="claim-key">Share of claims</span>
            <span className="cost-key">Share of cost</span>
          </div>
        </div>
        <div
          className="compare-mode brand-sort"
          role="group"
          aria-label="Sort specialties"
        >
          {sorts.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {sorted.length > 0 ? (
          <div className="studio-svg-scroll">
            <svg
              viewBox={`0 0 1080 ${chartHeight}`}
              role="group"
              aria-label={`Brand-name share of claims and of drug cost for ${sorted.length} specialties in ${area.name}, ${year}`}
            >
              <text x="12" y="20" className="studio-axis-title">
                Specialty · {area.name}
              </text>
              <text
                x={x(0.5)}
                y="20"
                textAnchor="middle"
                className="studio-axis-title"
              >
                Brand-name share (%)
              </text>
              <text
                x="880"
                y="20"
                textAnchor="middle"
                className="studio-axis-title"
              >
                Brand spend
              </text>
              <text
                x="1010"
                y="20"
                textAnchor="middle"
                className="studio-axis-title"
              >
                Per-claim ×
              </text>
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                <g key={tick}>
                  <line
                    x1={x(tick)}
                    x2={x(tick)}
                    y1="48"
                    y2={chartHeight - 14}
                    className="gridline"
                  />
                  <text
                    x={x(tick)}
                    y="42"
                    textAnchor="middle"
                    className="studio-tick"
                  >
                    {tick * 100}
                  </text>
                </g>
              ))}
              {[total.brandClaimShare, total.brandCostShare].map((value, i) => (
                <g key={i}>
                  <line
                    x1={x(value)}
                    x2={x(value)}
                    y1="48"
                    y2={chartHeight - 14}
                    className="brand-reference"
                  />
                  <text
                    x={x(value)}
                    y={chartHeight - 2}
                    textAnchor="middle"
                    className="studio-tick"
                  >
                    all: {wholePct(value)}
                  </text>
                </g>
              ))}
              {sorted.map((row, index) => {
                const y = top + index * rowHeight;
                const active = row.name === focusName;
                const flagged = row.claimCoverage < LOW_COVERAGE;
                const choose = () => onSelect(row.name);
                return (
                  <g
                    key={row.name}
                    className="pair-chart-row brand-row"
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={describe(row, area.name)}
                    onClick={choose}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        choose();
                      }
                    }}
                    onPointerEnter={() => setHovered(row.name)}
                    onPointerLeave={() => setHovered('')}
                    onFocus={() => setHovered(row.name)}
                    onBlur={() => setHovered('')}
                  >
                    <rect
                      x="0"
                      y={y - 15}
                      width="1080"
                      height={rowHeight - 1}
                      className={
                        active ? 'brand-row-bg active' : 'brand-row-bg'
                      }
                    />
                    <text x="12" y={y + 5} className="pair-name">
                      {row.name.length > 30
                        ? `${row.name.slice(0, 29)}…`
                        : row.name}
                      {flagged ? ' †' : ''}
                    </text>
                    <line
                      x1={x(row.brandClaimShare)}
                      x2={x(row.brandCostShare)}
                      y1={y}
                      y2={y}
                      className="brand-connector"
                    />
                    <circle
                      cx={x(row.brandClaimShare)}
                      cy={y}
                      r="6"
                      className="claim-dot"
                    />
                    <circle
                      cx={x(row.brandCostShare)}
                      cy={y}
                      r="7"
                      className="cost-dot"
                    />
                    <text
                      x="880"
                      y={y + 5}
                      textAnchor="middle"
                      className="pair-value"
                    >
                      {money.format(row.brandCost)}
                    </text>
                    <text
                      x="1010"
                      y={y + 5}
                      textAnchor="middle"
                      className="pair-value"
                    >
                      {times(costMultiple(row))}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <p className="studio-empty">
            No leading specialty has {MIN_RECORDS} or more provider records in{' '}
            {area.name}.
          </p>
        )}
        {inspected && (
          <output className="matrix-readout brand-readout">
            {describe(inspected, area.name)}
          </output>
        )}
        <figcaption>
          Hollow dots show the brand-name share of claims; filled dots show the
          share of drug cost. “Per-claim ×” compares average brand-name and
          generic cost per claim. Shows specialties among the{' '}
          {data.meta.specialtyCount} highest-cost nationally (
          {wholePct(data.meta.retainedCostShare)} of national drug cost) with at
          least {MIN_RECORDS} provider records here
          {excluded ? `; ${excluded} fall below that threshold` : ''}.
          {lowCoverage.length > 0 &&
            ` † Generic values are suppressed for more than ${100 - LOW_COVERAGE * 100}% of claims in ${lowCoverage.length === 1 ? 'this specialty' : 'these specialties'}.`}
        </figcaption>
      </figure>

      <figure className="studio-figure brand-figure" id="brand-states">
        <div className="studio-figure-head">
          <div>
            <span className="eyebrow">3 / ACROSS STATES</span>
            <h3>{focusName}: does the gap hold everywhere?</h3>
          </div>
          <div className="brand-legend" aria-hidden="true">
            <span className="state-key">State</span>
            <span className="national-key">National</span>
          </div>
        </div>
        <p className="matrix-instruction">
          Choose a specialty above. Each state sits by its brand-name share of
          claims (across) and of cost (up). Select a state to make it the
          geography for this page.
        </p>
        {plotted.length < 2 ? (
          <p className="studio-empty">
            Too few states have {MIN_RECORDS}+ {focusName} provider records to
            compare.
          </p>
        ) : (
          <>
            <div className="studio-svg-scroll">
              <svg
                viewBox="0 0 1080 450"
                role="group"
                aria-label={`${focusName}: brand-name share of claims against share of drug cost for ${plotted.length} states, ${year}`}
              >
                {sx.ticks(6).map((tick, _, ticks) => (
                  <g key={`x${tick}`}>
                    <line
                      x1={sx(tick)}
                      x2={sx(tick)}
                      y1="30"
                      y2="404"
                      className="gridline"
                    />
                    <text
                      x={sx(tick)}
                      y="422"
                      textAnchor="middle"
                      className="studio-tick"
                    >
                      {tickLabel(tick, ticks)}
                    </text>
                  </g>
                ))}
                {sy.ticks(5).map((tick, _, ticks) => (
                  <g key={`y${tick}`}>
                    <line
                      x1="86"
                      x2="1044"
                      y1={sy(tick)}
                      y2={sy(tick)}
                      className="gridline"
                    />
                    <text
                      x="78"
                      y={sy(tick) + 4}
                      textAnchor="end"
                      className="studio-tick"
                    >
                      {tickLabel(tick, ticks)}
                    </text>
                  </g>
                ))}
                <text
                  x="1040"
                  y="444"
                  textAnchor="end"
                  className="studio-axis-title"
                >
                  Brand-name share of claims →
                </text>
                <text x="12" y="20" className="studio-axis-title">
                  ↑ Brand-name share of drug cost
                </text>
                {plotted.map((s) => {
                  const px = sx(s.row!.brandClaimShare);
                  const py = sy(s.row!.brandCostShare);
                  const active = s.code === area.code;
                  return (
                    <g
                      key={s.code}
                      className={active ? 'brand-state active' : 'brand-state'}
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                      aria-label={describe(s.row!, s.name)}
                      onClick={() => onArea(s.code)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onArea(s.code);
                        }
                      }}
                    >
                      <title>{describe(s.row!, s.name)}</title>
                      <circle cx={px} cy={py} r={active ? 9 : 6} />
                      {(labelled.has(s.code) || active) && (
                        <text x={px} y={py - 11} textAnchor="middle">
                          {s.code}
                        </text>
                      )}
                    </g>
                  );
                })}
                {national && (
                  <g className="brand-national">
                    <path
                      d={`M${sx(national.brandClaimShare)},${sy(national.brandCostShare) - 9}l9,9l-9,9l-9,-9Z`}
                    />
                    <text
                      x={sx(national.brandClaimShare) + 13}
                      y={sy(national.brandCostShare) + 4}
                    >
                      U.S.
                    </text>
                  </g>
                )}
              </svg>
            </div>
            <output className="matrix-readout brand-readout">
              Brand-name share of {focusName} drug cost ranges from{' '}
              {pct(costLow.row!.brandCostShare)} ({costLow.name}) to{' '}
              {pct(costHigh.row!.brandCostShare)} ({costHigh.name}); its share
              of claims ranges from {pct(claimLow.row!.brandClaimShare)} (
              {claimLow.name}) to {pct(claimHigh.row!.brandClaimShare)} (
              {claimHigh.name}).
              {missingStates > 0 &&
                ` ${missingStates} ${missingStates === 1 ? 'place has' : 'places have'} fewer than ${MIN_RECORDS} records and ${missingStates === 1 ? 'is' : 'are'} not shown.`}
            </output>
          </>
        )}
        <figcaption>
          Brand-name follows CMS: FDA New Drug Application and Biologics License
          Application products, including authorized generics. It also includes
          CMS’s small “other” category ({pct(other.claims)} of these claims and{' '}
          {pct(other.cost)} of their cost nationally). Generic means an
          Abbreviated New Drug Application product. Drug cost is the gross
          amount paid by plans, beneficiaries, subsidies and third parties; it
          excludes manufacturer rebates, which mainly reduce brand-name costs,
          so the net brand-name share is lower. Records with suppressed generic
          values are left out ({pct(total.claimCoverage)} of claims remain).
          These shares describe prescribing, not whether a generic was available
          or appropriate.
        </figcaption>
      </figure>
    </section>
  );
}
