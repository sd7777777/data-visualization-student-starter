'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG marks support keyboard activation. */
import { useId, useState, type KeyboardEvent } from 'react';
import type { Area } from '@/lib/prescriber';
import { compact, money } from '@/lib/prescriber';
import {
  concentrationRows,
  costIntensity,
  mosaicItems,
  mosaicLayout,
  skylineItems,
  skylineLayout,
} from '@/lib/composition-analysis';
import {
  measureNames,
  shareMeasures,
  type ShareMeasure,
} from '@/lib/wonder-analysis';
import { ChartViewport } from './chart-viewport';
import { FaIcon } from '@/components/fa-icon';

const percent = (value: number) =>
  value > 0 && value < 0.001 ? '<0.1%' : `${(value * 100).toFixed(1)}%`;
const amount = (value: number, metric: ShareMeasure) =>
  (metric === 'cost' ? money : compact).format(value);
const exact = (value: number, metric: ShareMeasure) =>
  `${metric === 'cost' ? '$' : ''}${value.toLocaleString('en-US')}`;
const palette = ['#006b58', '#087f99', '#586b63', '#176558', '#984530'];
const seriesColors = {
  providers: '#007c64',
  claims: '#497b91',
  cost: '#984530',
};
function intensityColor(ratio: number | null) {
  return ratio === null
    ? '#586b63'
    : palette[
        ratio < 0.5
          ? 0
          : ratio < 0.8
            ? 1
            : ratio <= 1.2
              ? 2
              : ratio <= 2
                ? 3
                : 4
      ];
}
function activate(event: KeyboardEvent<SVGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}
function wrapLabel(name: string, width: number) {
  const max = Math.max(5, Math.floor((width - 26) / 9));
  const lines: string[] = [];
  for (const word of name.split(' ')) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= max)
      lines[last] += ` ${word}`;
    else lines.push(word.length > max ? `${word.slice(0, max - 1)}…` : word);
  }
  return lines
    .slice(0, 3)
    .map((line, i) =>
      i === 2 && lines.length > 3 ? `${line.slice(0, -1)}…` : line,
    );
}

type Props = { area: Area; selected: string; onSelect: (name: string) => void };

export function SpendingMosaic({ area, selected, onSelect }: Props) {
  const [metric, setMetric] = useState<ShareMeasure>('cost');
  const [residualSelection, setResidualSelection] = useState<string | null>(
    null,
  );
  const id = useId().replaceAll(':', '');
  const items = mosaicItems(area.specialties, area.summary);
  const tiles = mosaicLayout(items, metric);
  const current =
    (residualSelection === selected
      ? items.find((item) => item.remainder)
      : items.find((item) => item.name === selected)) ?? items[0];
  const ratio = current ? costIntensity(current.values, area.summary) : null;
  const choose = (name: string, remainder: boolean) => {
    setResidualSelection(remainder ? selected : null);
    if (!remainder) onSelect(name);
  };
  return (
    <>
      <div className="atlas-intro">
        <h4>Share of the geography total</h4>
        <p>
          Each rectangle is a specialty. Its area shows its share of{' '}
          {measureNames[metric].toLowerCase()} in {area.name}. Switch the sizing
          measure to see the balance shift; color always compares cost per claim
          with this geography’s overall average.
        </p>
      </div>
      <div className="wonder-actions" aria-label="Mosaic sizing measure">
        {shareMeasures.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={metric === value}
            onClick={() => setMetric(value)}
          >
            <FaIcon name={value === 'cost' ? 'compare' : 'group'} />
            {measureNames[value]}
          </button>
        ))}
        <span>Rectangle area = share of the full total</span>
      </div>
      <div
        className="atlas-color-key"
        aria-label="Cost per claim compared with the geography average"
      >
        {['Below 0.5×', '0.5–0.8×', '0.8–1.2×', '1.2–2×', 'Above 2×'].map(
          (label, i) => (
            <span key={label}>
              <i style={{ background: palette[i] }} />
              {label}
            </span>
          ),
        )}
        <span>Striped = all other specialties</span>
      </div>
      <ChartViewport>
        <svg
          viewBox="0 0 1000 590"
          className="wonder-svg mosaic-svg"
          role="group"
          aria-label={`Specialty mosaic sized by ${measureNames[metric]} in ${area.name}`}
        >
          <defs>
            <pattern
              id={`${id}-hatch`}
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M-2 2L2-2 M0 10L10 0 M8 12L12 8"
                stroke="white"
                strokeOpacity=".18"
                strokeWidth="2"
              />
            </pattern>
            {tiles.map((tile, i) => (
              <clipPath key={tile.name} id={`${id}-clip-${i}`}>
                <rect
                  x={tile.x + 23}
                  y={tile.y + 3}
                  width={Math.max(0, tile.width - 6)}
                  height={Math.max(0, tile.height - 6)}
                />
              </clipPath>
            ))}
          </defs>
          {tiles.map((tile, i) => {
            const active = current?.name === tile.name;
            const share =
              area.summary[metric] > 0
                ? tile.values[metric] / area.summary[metric]
                : 0;
            const label = `${tile.name}: ${exact(tile.values[metric], metric)}, ${percent(share)} of ${measureNames[metric].toLowerCase()}`;
            const lines = wrapLabel(tile.name, tile.width);
            const detailed = tile.width > 115 && tile.height > 108;
            return (
              <g
                key={tile.name}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={active}
                className="wonder-mark mosaic-tile"
                onClick={() => choose(tile.name, tile.remainder)}
                onKeyDown={(e) =>
                  activate(e, () => choose(tile.name, tile.remainder))
                }
              >
                <title>{label}</title>
                <rect
                  x={tile.x + 20}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  fill={intensityColor(
                    costIntensity(tile.values, area.summary),
                  )}
                  stroke="white"
                  strokeWidth="3"
                />
                {tile.remainder && (
                  <rect
                    x={tile.x + 20}
                    y={tile.y}
                    width={tile.width}
                    height={tile.height}
                    fill={`url(#${id}-hatch)`}
                    pointerEvents="none"
                  />
                )}
                {active && (
                  <rect
                    x={tile.x + 24}
                    y={tile.y + 4}
                    width={Math.max(0, tile.width - 8)}
                    height={Math.max(0, tile.height - 8)}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                  />
                )}
                <g clipPath={`url(#${id}-clip-${i})`} pointerEvents="none">
                  {detailed ? (
                    <>
                      <text
                        x={tile.x + 35}
                        y={tile.y + 31}
                        className="mosaic-name"
                      >
                        {lines.map((line, j) => (
                          <tspan key={j} x={tile.x + 35} dy={j ? 21 : 0}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                      <text
                        x={tile.x + 35}
                        y={tile.y + tile.height - 19}
                        className="mosaic-share"
                      >
                        {percent(share)}
                      </text>
                    </>
                  ) : tile.width > 45 && tile.height > 35 ? (
                    <text
                      x={tile.x + 20 + tile.width / 2}
                      y={tile.y + tile.height / 2 + 5}
                      textAnchor="middle"
                      className="mosaic-small"
                    >
                      {percent(share)}
                    </text>
                  ) : null}
                </g>
              </g>
            );
          })}
          <text x="20" y="556" className="wonder-axis-note">
            {tiles.length} tiles · select any rectangle or choose its name below
          </text>
          <text x="20" y="582" className="wonder-axis-note">
            Total {measureNames[metric].toLowerCase()}:{' '}
            {exact(area.summary[metric], metric)}
          </text>
        </svg>
      </ChartViewport>
      {current && (
        <div className="wonder-readout" aria-live="polite">
          <div>
            <span>
              {current.remainder ? 'Grouped remainder' : 'Selected specialty'}
            </span>
            <strong>{current.name}</strong>
            <small>{area.name}</small>
          </div>
          <div>
            <span>{measureNames[metric]}</span>
            <strong>{amount(current.values[metric], metric)}</strong>
            <small>{exact(current.values[metric], metric)}</small>
          </div>
          <div>
            <span>Share of total</span>
            <strong>
              {percent(
                area.summary[metric] > 0
                  ? current.values[metric] / area.summary[metric]
                  : 0,
              )}
            </strong>
          </div>
          <div>
            <span>Cost / claim vs. average</span>
            <strong>
              {ratio === null ? 'Unavailable' : `${ratio.toFixed(2)}×`}
            </strong>
            <small>1× = this geography’s average</small>
          </div>
        </div>
      )}
      <details className="composition-directory">
        <summary>Find a small tile · all {items.length} categories</summary>
        <div className="wonder-legend">
          {items.map((item) => (
            <button
              type="button"
              key={item.name}
              aria-pressed={current?.name === item.name}
              onClick={() => choose(item.name, item.remainder)}
            >
              <i
                style={{
                  background: intensityColor(
                    costIntensity(item.values, area.summary),
                  ),
                }}
              />
              {item.name} ·{' '}
              {percent(
                area.summary[metric] > 0
                  ? item.values[metric] / area.summary[metric]
                  : 0,
              )}
            </button>
          ))}
        </div>
      </details>
      <p className="wonder-footnote">
        The summary lists up to 32 specialties per geography. The striped tile
        reconciles the remaining specialties to the full total; it is a group,
        not one specialty. Tiles rearrange when sizing changes. Borders separate
        proportional rectangles. Higher cost per claim may reflect drug mix and
        is not a care-quality score.
      </p>
    </>
  );
}

export function ConcentrationLens({ area, selected, onSelect }: Props) {
  const [order, setOrder] = useState<ShareMeasure>('cost');
  const [count, setCount] = useState(5);
  const id = useId().replaceAll(':', '');
  const rows = concentrationRows(area.specialties, area.summary, order);
  const n = Math.min(Math.max(1, count), rows.length);
  const current = rows[n - 1];
  const selectedRank = rows.find(
    (item) => item.row.specialty === selected,
  )?.rank;
  const x = (rank: number) => 88 + (rank / Math.max(1, rows.length)) * 805;
  const y = (share: number) => 425 - share * 350;
  const path = (metric: ShareMeasure) =>
    `M ${x(0)} ${y(0)} ${rows.map((item) => `L ${x(item.rank)} ${y(item.shares[metric])}`).join(' ')}`;
  const eighty = rows.find((item) => item.shares[order] >= 0.8);
  if (!current)
    return (
      <p className="wonder-empty">
        No specialty values are available for this geography.
      </p>
    );
  return (
    <>
      <div className="atlas-intro">
        <h4>Cumulative share by specialty</h4>
        <p>
          Add the available specialties from largest to smallest and watch three
          totals accumulate. Every line follows the same specialty order. A
          steep start means much of the activity sits in the first few
          specialties.
        </p>
      </div>
      <div className="wonder-controls">
        <label>
          Order specialties by
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as ShareMeasure)}
          >
            {shareMeasures.map((metric) => (
              <option key={metric} value={metric}>
                {measureNames[metric]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Include the first {n} of {rows.length} specialties
          <input
            aria-label="Number of leading specialties"
            type="range"
            min="1"
            max={rows.length}
            value={n}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="concentration-story" aria-live="polite">
        <strong>
          {n}
          <small>
            leading available {n === 1 ? 'specialty' : 'specialties'}
          </small>
        </strong>
        <span>account for</span>
        <strong style={{ color: seriesColors[order] }}>
          {percent(current.shares[order])}
          <small>
            of all {measureNames[order].toLowerCase()} in {area.name}
          </small>
        </strong>
      </div>
      <div className="atlas-color-key">
        {shareMeasures.map((metric) => (
          <span key={metric}>
            <i style={{ background: seriesColors[metric] }} />
            {measureNames[metric]} · {percent(current.shares[metric])}
          </span>
        ))}
      </div>
      <ChartViewport>
        <svg
          viewBox="0 0 1000 525"
          className="wonder-svg concentration-svg"
          role="group"
          aria-label={`Cumulative specialty shares ordered by ${measureNames[order]} in ${area.name}`}
        >
          <defs>
            <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={seriesColors[order]}
                stopOpacity=".2"
              />
              <stop
                offset="100%"
                stopColor={seriesColors[order]}
                stopOpacity=".02"
              />
            </linearGradient>
          </defs>
          <text x="88" y="30" className="wonder-axis-title">
            Cumulative share of the full geography total
          </text>
          <rect
            x={x(0)}
            y="75"
            width={x(n) - x(0)}
            height="350"
            fill="var(--wash)"
            opacity=".5"
          />
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((tick) => (
            <g key={tick}>
              <line
                x1="88"
                x2="893"
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0.8 ? 'var(--strong-rule)' : 'var(--grid)'}
                strokeDasharray={tick === 0.8 ? '5 5' : undefined}
              />
              <text
                x="72"
                y={y(tick) + 5}
                textAnchor="end"
                className="wonder-axis-note"
              >
                {Math.round(tick * 100)}%
              </text>
            </g>
          ))}
          <path
            d={`${path(order)} L ${x(rows.length)} ${y(0)} Z`}
            fill={`url(#${id}-area)`}
          />
          {shareMeasures.map((metric) => (
            <path
              key={metric}
              d={path(metric)}
              fill="none"
              stroke={seriesColors[metric]}
              strokeWidth={metric === order ? 4 : 2.5}
              strokeDasharray={
                metric === 'providers'
                  ? '8 4'
                  : metric === 'claims'
                    ? '3 4'
                    : undefined
              }
            />
          ))}
          <line
            x1={x(n)}
            x2={x(n)}
            y1="60"
            y2="435"
            stroke="var(--ink)"
            strokeDasharray="4 4"
          />
          <text
            x={x(n)}
            y="53"
            textAnchor="middle"
            className="wonder-axis-title"
          >
            Top {n}
          </text>
          {shareMeasures.map((metric) => (
            <circle
              key={metric}
              cx={x(n)}
              cy={y(current.shares[metric])}
              r="6"
              fill={seriesColors[metric]}
              stroke="white"
              strokeWidth="2"
            />
          ))}
          {rows.map((item) => (
            <g
              key={item.row.specialty}
              role="button"
              tabIndex={0}
              className="wonder-mark concentration-stop"
              aria-pressed={n === item.rank}
              aria-label={`Include top ${item.rank}: through ${item.row.specialty}; ${percent(item.shares[order])} of ${measureNames[order]}`}
              onClick={() => setCount(item.rank)}
              onKeyDown={(e) => activate(e, () => setCount(item.rank))}
            >
              <rect
                x={x(item.rank) - Math.min(13, 390 / rows.length)}
                y="75"
                width={Math.min(26, 780 / rows.length)}
                height="375"
                fill="transparent"
              />
              <circle
                cx={x(item.rank)}
                cy={y(item.shares[order])}
                r={item.rank === selectedRank ? 6 : 3}
                fill={seriesColors[order]}
                stroke={item.rank === selectedRank ? 'var(--ink)' : 'white'}
                strokeWidth="1.5"
              />
              <title>
                {item.row.specialty} · rank {item.rank}
              </title>
            </g>
          ))}
          {[
            ...new Set([
              0,
              ...Array.from({ length: 4 }, (_, i) =>
                Math.round(((i + 1) * rows.length) / 4),
              ),
            ]),
          ].map((tick) => (
            <text
              key={tick}
              x={x(tick)}
              y="469"
              textAnchor="middle"
              className="wonder-axis-note"
            >
              {tick}
            </text>
          ))}
          <text
            x="490"
            y="508"
            textAnchor="middle"
            className="wonder-axis-title"
          >
            Number of specialties included · largest{' '}
            {measureNames[order].toLowerCase()} first
          </text>
        </svg>
      </ChartViewport>
      <div className="wonder-actions">
        <button
          type="button"
          disabled={!eighty}
          onClick={() => eighty && setCount(eighty.rank)}
        >
          <FaIcon name="explore" />
          {eighty
            ? `Find the 80% point · ${eighty.rank} specialties`
            : '80% not reached by available specialties'}
        </button>
        <button
          type="button"
          disabled={!selectedRank}
          onClick={() => selectedRank && setCount(selectedRank)}
        >
          <FaIcon name="next" />
          Jump to selected specialty
        </button>
      </div>
      <div className="wonder-readout" aria-live="polite">
        <div>
          <span>Last specialty added · #{n}</span>
          <strong>{current.row.specialty}</strong>
          <small>
            {amount(current.row[order], order)}{' '}
            {measureNames[order].toLowerCase()}
          </small>
          <button
            className="composition-trace"
            type="button"
            onClick={() => onSelect(current.row.specialty)}
          >
            Trace this specialty <FaIcon name="next" />
          </button>
        </div>
        {shareMeasures.map((metric) => (
          <div key={metric}>
            <span>Combined {measureNames[metric].toLowerCase()}</span>
            <strong style={{ color: seriesColors[metric] }}>
              {percent(current.shares[metric])}
            </strong>
            <small>{exact(current.totals[metric], metric)}</small>
          </div>
        ))}
      </div>
      <p className="wonder-footnote">
        The available {rows.length} specialties cover{' '}
        {percent(rows.at(-1)!.shares.cost)} of drug cost,{' '}
        {percent(rows.at(-1)!.shares.claims)} of claims, and{' '}
        {percent(rows.at(-1)!.shares.providers)} of provider records. Omitted
        specialties are not ranked, so curves may end below 100%. The
        denominator always includes the full geography. This describes
        concentration across specialties, not individual prescribers or changes
        over time.
      </p>
    </>
  );
}

export function CostSkyline({ area, selected, onSelect }: Props) {
  const [denominator, setDenominator] = useState<'claims' | 'providers'>(
    'claims',
  );
  const [residualSelection, setResidualSelection] = useState<string | null>(
    null,
  );
  const items = skylineItems(area.specialties, area.summary, selected);
  const towers = skylineLayout(items, denominator);
  const current =
    (residualSelection === selected
      ? towers.find((item) => item.remainder)
      : towers.find((item) => item.name === selected)) ?? towers[0];
  const peak = Math.max(1, ...towers.map((item) => item.height));
  const maximum = Math.ceil(peak / 100) * 100;
  const average =
    area.summary[denominator] > 0
      ? area.summary.cost / area.summary[denominator]
      : 0;
  const unit = denominator === 'claims' ? 'claim' : 'provider record';
  const x = (fraction: number) => 90 + fraction * 820;
  const y = (value: number) => 430 - (value / maximum) * 340;
  const choose = (name: string, remainder: boolean) => {
    setResidualSelection(remainder ? selected : null);
    if (!remainder) onSelect(name);
  };
  const id = useId().replaceAll(':', '');
  return (
    <>
      <div className="atlas-intro">
        <h4>Claims and unit cost</h4>
        <p>
          Width shows share of{' '}
          {denominator === 'claims' ? 'claims' : 'provider records'}; height
          shows drug cost per {unit}. Rectangle area represents share of total
          drug cost.
        </p>
      </div>
      <div className="wonder-actions" aria-label="Skyline width measure">
        {(['claims', 'providers'] as const).map((metric) => (
          <button
            type="button"
            key={metric}
            aria-pressed={denominator === metric}
            onClick={() => setDenominator(metric)}
          >
            <FaIcon name="compare" />
            Width = {measureNames[metric].toLowerCase()}
          </button>
        ))}
      </div>
      <div className="skyline-key">
        <span>
          <i style={{ background: '#176558' }} />
          Above overall cost / {unit}
        </span>
        <span>
          <i style={{ background: '#007c64' }} />
          At or below overall cost / {unit}
        </span>
        <span>Striped = grouped remainder · outlined = selected</span>
      </div>
      <ChartViewport>
        <svg
          viewBox="0 0 1000 530"
          className="wonder-svg skyline-svg"
          role="group"
          aria-label={`Volume × cost: width represents ${measureNames[denominator]}, height represents cost per ${unit}`}
        >
          <defs>
            <pattern
              id={`${id}-stripe`}
              width="9"
              height="9"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 9L9 0"
                stroke="white"
                strokeOpacity=".4"
                strokeWidth="2"
              />
            </pattern>
          </defs>
          <text x="90" y="29" className="wonder-axis-title">
            Height = drug cost per {unit} · linear scale
          </text>
          <text x="90" y="55" className="wonder-axis-note">
            Area = total drug cost · each number identifies a specialty below
          </text>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1="90"
                x2="910"
                y1={y(maximum * tick)}
                y2={y(maximum * tick)}
                stroke="var(--grid)"
              />
              <text
                x="75"
                y={y(maximum * tick) + 5}
                textAnchor="end"
                className="wonder-axis-note"
              >
                {money.format(maximum * tick)}
              </text>
            </g>
          ))}
          {towers.map((tower, i) => (
            <g
              key={tower.name}
              role="button"
              tabIndex={0}
              aria-pressed={current?.name === tower.name}
              className="wonder-mark skyline-tower"
              aria-label={`${i + 1}. ${tower.name}: ${percent(tower.width)} of ${measureNames[denominator].toLowerCase()}, $${tower.height.toLocaleString('en-US', { maximumFractionDigits: 2 })} per ${unit}, ${money.format(tower.values.cost)} total drug cost`}
              onClick={() => choose(tower.name, tower.remainder)}
              onKeyDown={(e) =>
                activate(e, () => choose(tower.name, tower.remainder))
              }
            >
              <rect
                x={x(tower.offset)}
                y={y(tower.height)}
                width={tower.width * 820}
                height={430 - y(tower.height)}
                fill={tower.height > average ? '#176558' : '#007c64'}
                stroke="white"
                strokeWidth="1.5"
              />
              {tower.remainder && (
                <rect
                  x={x(tower.offset)}
                  y={y(tower.height)}
                  width={tower.width * 820}
                  height={430 - y(tower.height)}
                  fill={`url(#${id}-stripe)`}
                />
              )}
              {current?.name === tower.name && (
                <rect
                  x={x(tower.offset)}
                  y={y(tower.height)}
                  width={tower.width * 820}
                  height={430 - y(tower.height)}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="2.5"
                />
              )}
              <rect
                x={x(tower.offset)}
                y="440"
                width={tower.width * 820}
                height="28"
                fill="transparent"
              />
              {tower.width * 820 >= 24 && (
                <text
                  x={x(tower.offset + tower.width / 2)}
                  y="461"
                  textAnchor="middle"
                  className="wonder-axis-note"
                >
                  {i + 1}
                </text>
              )}
              <title>
                {tower.name}: {percent(tower.values.cost / area.summary.cost)}{' '}
                of drug cost
              </title>
            </g>
          ))}
          <line
            x1="90"
            x2="910"
            y1={y(average)}
            y2={y(average)}
            stroke="var(--ink)"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            pointerEvents="none"
          />
          <text x="910" y="492" textAnchor="end" className="wonder-axis-note">
            Dashed line: overall average {money.format(average)} / {unit}
          </text>
          <text x="90" y="520" className="wonder-axis-title">
            Widths together = 100% of {measureNames[denominator].toLowerCase()}{' '}
            in {area.name}
          </text>
        </svg>
      </ChartViewport>
      {current && (
        <div className="wonder-readout" aria-live="polite">
          <div>
            <span>
              {current.remainder ? 'Grouped remainder' : 'Selected specialty'}
            </span>
            <strong>{current.name}</strong>
            <small>{area.name}</small>
          </div>
          <div>
            <span>
              Width · share of {measureNames[denominator].toLowerCase()}
            </span>
            <strong>{percent(current.width)}</strong>
            <small>{exact(current.values[denominator], denominator)}</small>
          </div>
          <div>
            <span>Height · cost / {unit}</span>
            <strong>{money.format(current.height)}</strong>
            <small>
              $
              {current.height.toLocaleString('en-US', {
                maximumFractionDigits: 2,
              })}
            </small>
          </div>
          <div>
            <span>Area · share of drug cost</span>
            <strong>{percent(current.values.cost / area.summary.cost)}</strong>
            <small>{exact(current.values.cost, 'cost')}</small>
          </div>
        </div>
      )}
      <div
        className="wonder-legend skyline-directory"
        aria-label="Skyline specialty key"
      >
        {towers.map((tower, i) => (
          <button
            key={tower.name}
            type="button"
            aria-pressed={current?.name === tower.name}
            onClick={() => choose(tower.name, tower.remainder)}
          >
            <b>{i + 1}</b>
            {tower.name}
          </button>
        ))}
      </div>
      <p className="wonder-footnote">
        The 12 largest available specialties by drug cost appear separately,
        plus your selected specialty if needed. All remaining specialties form
        one striped tower. Order follows total cost, not geography. Very thin
        towers remain accessible in the name key. Height rescales when the width
        measure or selection changes; compare shapes within a single view.
        Dollar totals are rounded in the source summary and can differ by a few
        dollars.
      </p>
    </>
  );
}
