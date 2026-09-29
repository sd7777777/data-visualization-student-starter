'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG chart marks use keyboard-operable button roles. */
import {
  lazy,
  Suspense,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import type { Area, Dataset, SpecialtyProfile } from '@/lib/prescriber';
import { compact, dollars, money } from '@/lib/prescriber';
import { STATE_CODES } from '@/lib/geography-analysis';
import { scrollToSection } from '@/lib/scroll-to-section';
import {
  measureNames,
  orbitExtent,
  orbitRadius,
  readMeasure,
  shareBands,
  shareMeasures,
  weaveMeasures,
  weaveRanks,
  type ShareMeasure,
  type WeaveMeasure,
} from '@/lib/wonder-analysis';
import {
  wonderModes as modes,
  type WonderMode,
} from '@/lib/explorer-navigation';
import { StateContours } from './state-contours';
import { ChartViewport } from './chart-viewport';
import { FaIcon } from '@/components/fa-icon';
import { ViewGlyph } from './view-glyph';

// Alternative chart families load when opened; the default state map stays eager.
const AtlasLab = lazy(() =>
  import('./atlas-lab').then((module) => ({ default: module.AtlasLab })),
);
const SpendingMosaic = lazy(() =>
  import('./composition-lab').then((module) => ({
    default: module.SpendingMosaic,
  })),
);
const ConcentrationLens = lazy(() =>
  import('./composition-lab').then((module) => ({
    default: module.ConcentrationLens,
  })),
);
const CostSkyline = lazy(() =>
  import('./composition-lab').then((module) => ({
    default: module.CostSkyline,
  })),
);

// Match the explorer palette; the residual category stays neutral.
const colors = [
  'var(--purple)',
  'var(--teal)',
  'var(--navy)',
  'var(--orange)',
  '#a76600',
  '#087f99',
  '#8a48a8',
  '#526bc0',
  '#ad5072',
  'var(--muted)',
];
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const valueText = (value: number, metric: WeaveMeasure) =>
  metric === 'costPerClaim'
    ? dollars.format(value)
    : `${number.format(value)}${metric.endsWith('Share') ? '%' : ''}`;
function activate(event: KeyboardEvent<SVGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

// A hover preview expires when the linked selection changes elsewhere.
function usePreviewSelection(selected: string) {
  const [entry, setEntry] = useState<{
    name: string;
    selection: string;
  } | null>(null);
  return [
    entry?.selection === selected ? entry.name : null,
    (name: string | null) =>
      setEntry(name === null ? null : { name, selection: selected }),
  ] as const;
}

export function WonderLab({
  data,
  area,
  selected,
  onSelect,
  onArea,
  mode,
  onMode,
}: {
  mode: WonderMode;
  onMode: (mode: WonderMode) => void;
  data: Dataset;
  area: Area;
  selected: string;
  onSelect: (name: string) => void;
  onArea: (code: string) => void;
}) {
  const active = modes.find((item) => item.id === mode)!;
  const [family, setFamily] = useState('all');
  const families = [
    {
      id: 'all',
      label: 'All views',
      modes: modes.map((item) => item.id) as string[],
    },
    {
      id: 'places',
      label: 'Compare places',
      modes: ['map', 'hex', 'petals', 'ridges', 'orbit'],
    },
    {
      id: 'shares',
      label: 'Understand spending',
      modes: ['mosaic', 'skyline', 'concentration', 'currents'],
    },
    { id: 'ranks', label: 'Follow rankings', modes: ['weave'] },
  ];
  const visibleModes = modes.filter((item) =>
    families.find((item) => item.id === family)!.modes.includes(item.id),
  );
  return (
    <section id="wonder-lab" className="section-wrap wonder-lab">
      <header className="story-question">
        <b>
          <FaIcon name="shuffle" /> WONDER LAB
        </b>
        <h2>Creative ways to see the data</h2>
        <p>
          Explore mosaics, mountains, gardens, and more. Choose a view to
          compare specialty shares, state values, or rankings.
        </p>
      </header>
      <div
        className="gallery-filters"
        role="group"
        aria-label="Find a visualization by question"
      >
        {families.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={family === item.id}
            onClick={() => setFamily(item.id)}
          >
            {item.label} <span>{item.modes.length}</span>
          </button>
        ))}
      </div>
      <div
        className="wonder-modes"
        role="group"
        aria-label="Creative data visualizations"
      >
        {visibleModes.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.name}
            aria-pressed={mode === item.id}
            aria-controls="wonder-stage"
            onClick={() => {
              onMode(item.id);
              scrollToSection('wonder-stage');
            }}
          >
            <ViewGlyph mode={item.id} />
            <span className="wonder-mode-label">
              <FaIcon name={item.icon} /> {item.eyebrow}
            </span>
            <b>{item.name}</b>
            <small>{item.description}</small>
            <span className="view-action">
              {mode === item.id ? (
                <>
                  <FaIcon name="check" /> Current view
                </>
              ) : (
                <>
                  Explore view <FaIcon name="next" />
                </>
              )}
            </span>
          </button>
        ))}
      </div>
      <p className="gallery-count" aria-live="polite">
        {visibleModes.length} of {modes.length} views · Illustrations show chart
        structure, not measured values.
      </p>
      <div className="chart-view-picker">
        <label htmlFor="chart-view">Chart type</label>
        <select
          id="chart-view"
          value={mode}
          onChange={(event) => onMode(event.target.value as WonderMode)}
        >
          {modes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <p>{active.description}</p>
      </div>
      <div className="wonder-stage" id="wonder-stage" tabIndex={-1}>
        <div className="wonder-stage-head">
          <div>
            <p className="wonder-kicker">{active.eyebrow}</p>
            <h3>
              <FaIcon name={active.icon} /> {active.name}
            </h3>
          </div>
          <span className="wonder-source">
            CMS {data.meta.year} · Linked exploration
          </span>
        </div>
        {(mode === 'currents' ||
          mode === 'weave' ||
          mode === 'mosaic' ||
          mode === 'concentration' ||
          mode === 'skyline') && (
          <div className="wonder-controls">
            <label>
              Geography
              <select
                aria-label="Chart geography"
                value={area.code}
                onChange={(event) => onArea(event.target.value)}
              >
                {data.areas.map((row) => (
                  <option value={row.code} key={row.code}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Specialty
              <select
                aria-label="Chart specialty"
                value={selected}
                onChange={(event) => onSelect(event.target.value)}
              >
                {area.specialties.map((row) => (
                  <option key={row.specialty}>{row.specialty}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <Suspense
          fallback={
            <p className="chart-loading" role="status">
              Loading {active.name}…
            </p>
          }
        >
          {mode === 'map' && (
            <StateContours
              data={data}
              geographyCode={area.code}
              selected={selected}
              onSelect={(name) => {
                if (!area.specialties.some((row) => row.specialty === name))
                  onArea('US');
                onSelect(name);
              }}
              onExplore={(code, name) => {
                onArea(code);
                onSelect(name);
              }}
            />
          )}
          {(mode === 'hex' || mode === 'petals' || mode === 'ridges') && (
            <AtlasLab
              data={data}
              mode={mode}
              selected={selected}
              onSelect={(name) => {
                if (!area.specialties.some((row) => row.specialty === name))
                  onArea('US');
                onSelect(name);
              }}
            />
          )}
          {mode === 'skyline' && (
            <CostSkyline
              key={area.code}
              area={area}
              selected={selected}
              onSelect={onSelect}
            />
          )}
          {mode === 'mosaic' && (
            <SpendingMosaic
              key={area.code}
              area={area}
              selected={selected}
              onSelect={onSelect}
            />
          )}
          {mode === 'concentration' && (
            <ConcentrationLens
              key={area.code}
              area={area}
              selected={selected}
              onSelect={onSelect}
            />
          )}
          {mode === 'currents' && (
            <ShareCurrents
              key={area.code}
              area={area}
              selected={selected}
              onSelect={onSelect}
            />
          )}
          {mode === 'orbit' && (
            <StateOrbit
              profiles={data.specialtyProfiles}
              selected={selected}
              onSelect={onSelect}
            />
          )}
          {mode === 'weave' && (
            <RankWeave
              key={area.code}
              area={area}
              selected={selected}
              onSelect={onSelect}
            />
          )}
        </Suspense>
      </div>
      <p className="wonder-footnote">
        Shapes describe prescribing patterns, not care quality. Focus a mark or
        tap it for details. These are different views of one year, not changes
        over time.
      </p>
    </section>
  );
}

function ShareCurrents({
  area,
  selected,
  onSelect,
}: {
  area: Area;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [order, setOrder] = useState<ShareMeasure>('cost');
  const [hover, setHover] = usePreviewSelection(selected);
  const id = useId().replaceAll(':', '');
  const bands = useMemo(
    () => shareBands(area.specialties, area.summary, selected, order),
    [area, selected, order],
  );
  const current =
    bands.find((row) => row.name === (hover ?? selected)) ?? bands[0];
  const offsets = shareMeasures.map((metric) => {
    let sum = 0;
    return bands.map((row) => {
      const start = sum;
      sum += row.shares[metric] * 390;
      return { start: 95 + start, end: 95 + sum };
    });
  });
  const xs = [85, 465, 845];
  return (
    <>
      <div className="wonder-controls">
        <label>
          Bring the largest shares to the top
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as ShareMeasure)}
          >
            {shareMeasures.map((metric) => (
              <option key={metric} value={metric}>
                {measureNames[metric]}
              </option>
            ))}
          </select>
        </label>
        <p>
          Ribbon thickness = share of each column’s total. Trace the bright
          ribbon across.
        </p>
      </div>
      <ChartViewport>
        <svg
          viewBox="0 0 930 550"
          className="wonder-svg"
          role="group"
          aria-label={`Share comparison for ${area.name}. Each column sums to 100 percent.`}
        >
          <defs>
            {bands.map((row, index) => (
              <linearGradient
                key={row.name}
                id={`${id}-${index}`}
                x1="0"
                x2="1"
              >
                <stop
                  stopColor={row.remainder ? 'var(--muted)' : colors[index]}
                  stopOpacity=".45"
                />
                <stop
                  offset="1"
                  stopColor={row.remainder ? 'var(--muted)' : colors[index]}
                  stopOpacity=".95"
                />
              </linearGradient>
            ))}
          </defs>
          {shareMeasures.map((metric, column) => (
            <g key={metric}>
              <text
                x={xs[column]}
                y="32"
                textAnchor="middle"
                className="wonder-axis-title"
              >
                {measureNames[metric]}
              </text>
              <text
                x={xs[column]}
                y="59"
                textAnchor="middle"
                className="wonder-axis-note"
              >
                {metric === 'cost'
                  ? money.format(area.summary[metric])
                  : compact.format(area.summary[metric])}{' '}
                · 100%
              </text>
            </g>
          ))}
          {bands.map((row, index) => {
            const picked = row.name === current.name;
            return (
              <g
                key={row.name}
                role="button"
                tabIndex={0}
                aria-label={`${row.name}: ${shareMeasures.map((metric) => `${number.format(row.shares[metric] * 100)}% of ${measureNames[metric]}`).join(', ')}`}
                aria-pressed={picked}
                onMouseEnter={() => setHover(row.name)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(row.name)}
                onBlur={() => setHover(null)}
                onClick={() => {
                  setHover(row.name);
                  if (!row.remainder) onSelect(row.name);
                }}
                onKeyDown={(event) =>
                  activate(event, () => {
                    setHover(row.name);
                    if (!row.remainder) onSelect(row.name);
                  })
                }
                className="wonder-mark"
                opacity={picked ? 1 : 0.32}
              >
                {[0, 1].map((column) => {
                  const a = offsets[column][index];
                  const b = offsets[column + 1][index];
                  const x = xs[column];
                  const end = xs[column + 1];
                  return (
                    <path
                      key={column}
                      d={`M ${x} ${a.start} C ${x + 170} ${a.start}, ${end - 170} ${b.start}, ${end} ${b.start} L ${end} ${b.end} C ${end - 170} ${b.end}, ${x + 170} ${a.end}, ${x} ${a.end} Z`}
                      fill={`url(#${id}-${index})`}
                      stroke={
                        picked
                          ? row.remainder
                            ? 'var(--muted)'
                            : colors[index]
                          : 'var(--panel)'
                      }
                      strokeWidth={picked ? 1.5 : 0.7}
                    />
                  );
                })}
                {xs.map((x, column) => (
                  <rect
                    key={x}
                    x={x - 5}
                    y={offsets[column][index].start}
                    width="10"
                    height={Math.max(
                      0.5,
                      offsets[column][index].end - offsets[column][index].start,
                    )}
                    fill={row.remainder ? 'var(--muted)' : colors[index]}
                  />
                ))}
              </g>
            );
          })}
          <text
            x="465"
            y="528"
            textAnchor="middle"
            className="wonder-axis-note"
          >
            Each ribbon keeps its identity. Its width changes with its share.
          </text>
        </svg>
      </ChartViewport>
      <div className="wonder-readout" aria-live="polite">
        <div>
          <span>FOLLOWING</span>
          <strong>{current.name}</strong>
        </div>
        {shareMeasures.map((metric) => (
          <div key={metric}>
            <span>{measureNames[metric]}</span>
            <strong>{number.format(current.shares[metric] * 100)}%</strong>
            <small>
              {metric === 'cost'
                ? money.format(current.values[metric])
                : compact.format(current.values[metric])}
            </small>
          </div>
        ))}
      </div>
      <div className="wonder-legend">
        {bands.map((row, index) => (
          <button
            key={row.name}
            type="button"
            aria-pressed={current.name === row.name}
            onClick={() => {
              setHover(row.name);
              if (!row.remainder) onSelect(row.name);
            }}
            onMouseEnter={() => setHover(row.name)}
            onMouseLeave={() => setHover(null)}
          >
            <i
              style={{
                background: row.remainder ? 'var(--muted)' : colors[index],
              }}
            />
            {row.name}
          </button>
        ))}
      </div>
      <p className="wonder-note">
        Shows the eight largest specialties by{' '}
        {measureNames[order].toLowerCase()}, plus your selection when needed.
        “All other specialties” includes everything outside those ribbons,
        including specialties omitted from the browser summary. Connections
        compare aggregate shares; they do not track individual people,
        prescriptions, or payments.
      </p>
    </>
  );
}

function StateOrbit({
  profiles,
  selected,
  onSelect,
}: {
  profiles: SpecialtyProfile[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [local, setLocal] = useState(() =>
    profiles.some((row) => row.specialty === selected)
      ? selected
      : 'Nurse Practitioner',
  );
  const [metric, setMetric] = useState<'costPerClaim' | 'claimsPerProvider'>(
    'costPerClaim',
  );
  const [minimum, setMinimum] = useState(50);
  const [sort, setSort] = useState(false);
  const [code, setCode] = useState('CA');
  const profile =
    profiles.find((row) => row.specialty === local) ?? profiles[0];
  const benchmark = readMeasure(profile.national, metric);
  const states = useMemo(
    () =>
      profile.states
        .filter(
          (row) =>
            STATE_CODES.has(row.code) &&
            row.providers >= minimum &&
            benchmark > 0 &&
            readMeasure(row, metric) > 0,
        )
        .map((row) => ({ ...row, ratio: readMeasure(row, metric) / benchmark }))
        .sort((a, b) =>
          sort
            ? b.ratio - a.ratio || a.code.localeCompare(b.code)
            : a.code.localeCompare(b.code),
        ),
    [profile, minimum, benchmark, metric, sort],
  );
  const extent = orbitExtent(states.map((row) => row.ratio));
  const focused = states.find((row) => row.code === code) ?? states[0];
  const pickExtreme = () => {
    const extreme = [...states].sort(
      (a, b) => Math.abs(Math.log2(b.ratio)) - Math.abs(Math.log2(a.ratio)),
    )[0];
    if (extreme) setCode(extreme.code);
  };
  return (
    <>
      <div className="wonder-controls">
        <label>
          Specialty with state detail
          <select
            aria-label="Orbit specialty"
            value={profile.specialty}
            onChange={(event) => {
              setLocal(event.target.value);
              onSelect(event.target.value);
            }}
          >
            {profiles.map((row) => (
              <option key={row.specialty}>{row.specialty}</option>
            ))}
          </select>
        </label>
        <label>
          Measure
          <select
            aria-label="Orbit measure"
            value={metric}
            onChange={(event) => setMetric(event.target.value as typeof metric)}
          >
            <option value="costPerClaim">Cost / claim</option>
            <option value="claimsPerProvider">Claims / provider</option>
          </select>
        </label>
        <label>
          Minimum provider records: {minimum}
          <input
            aria-label="Orbit minimum provider records"
            type="range"
            min="0"
            max="500"
            step="25"
            value={minimum}
            onChange={(event) => setMinimum(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="wonder-actions">
        <button
          type="button"
          aria-pressed={sort}
          onClick={() => setSort(!sort)}
        >
          {sort ? 'Order: largest ratio first' : 'Order: state abbreviation'}{' '}
          <FaIcon name="reset" />
        </button>
        <button type="button" onClick={pickExtreme} disabled={!states.length}>
          <FaIcon name="inspect" /> Find the furthest outlier
        </button>
        <span>
          <i className="orbit-key below" /> Below national{' '}
          <i className="orbit-key above" /> Above national
        </span>
      </div>
      {states.length ? (
        <>
          <ChartViewport>
            <svg
              viewBox="0 0 930 755"
              className="wonder-svg wonder-orbit"
              role="group"
              aria-label={`National differences for ${profile.specialty}, ${measureNames[metric]}. Radius is a logarithmic ratio to the national specialty value.`}
            >
              {[-extent, -extent / 2, 0, extent / 2, extent].map(
                (exponent, index) => {
                  const radius = orbitRadius(2 ** exponent, extent);
                  return (
                    <g key={index}>
                      <circle
                        cx="465"
                        cy="377"
                        r={radius}
                        fill="none"
                        stroke={
                          exponent === 0 ? 'var(--purple)' : 'var(--rule)'
                        }
                        strokeWidth={exponent === 0 ? 2 : 1}
                        strokeDasharray={exponent === 0 ? undefined : '3 6'}
                      />
                      <text
                        x="471"
                        y={377 - radius - 7}
                        className="wonder-ring-label"
                      >
                        {number.format(2 ** exponent)}×
                        {exponent === 0 ? ' national' : ''}
                      </text>
                    </g>
                  );
                },
              )}
              {states.map((row, index) => {
                const angle =
                  (index / states.length) * Math.PI * 2 - Math.PI / 2;
                const point = (r: number) => ({
                  x: 465 + Math.cos(angle) * r,
                  y: 377 + Math.sin(angle) * r,
                });
                const start = point(195);
                const end = point(orbitRadius(row.ratio, extent));
                const label = point(335);
                const active = focused?.code === row.code;
                const color = row.ratio >= 1 ? 'var(--orange)' : 'var(--teal)';
                return (
                  <g
                    key={row.code}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={`${row.name}: ${valueText(readMeasure(row, metric), metric)}, ${number.format(row.ratio)} times national, ${row.providers.toLocaleString()} provider records`}
                    className="wonder-mark"
                    onMouseEnter={() => setCode(row.code)}
                    onFocus={() => setCode(row.code)}
                    onClick={() => setCode(row.code)}
                    onKeyDown={(event) =>
                      activate(event, () => setCode(row.code))
                    }
                  >
                    <line
                      x1={point(76).x}
                      y1={point(76).y}
                      x2={point(315).x}
                      y2={point(315).y}
                      stroke={active ? 'var(--strong-rule)' : 'var(--grid)'}
                      strokeWidth="1"
                    />
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={color}
                      strokeWidth={active ? 6 : 3}
                      opacity={active ? 1 : 0.65}
                    />
                    <circle
                      cx={end.x}
                      cy={end.y}
                      r={active ? 8 : 4.5}
                      fill={color}
                      stroke={active ? 'var(--ink)' : 'var(--panel)'}
                      strokeWidth="2"
                    />
                    <circle cx={end.x} cy={end.y} r="12" fill="transparent" />
                    <text
                      x={label.x}
                      y={label.y + 5}
                      textAnchor="middle"
                      style={{
                        fill: active ? 'var(--purple)' : 'var(--muted)',
                        fontSize: 16,
                      }}
                      fontSize="14"
                      fontWeight={active ? 800 : 400}
                    >
                      {row.code}
                    </text>
                  </g>
                );
              })}
              <circle cx="465" cy="377" r="70" fill="var(--wash)" />
              <text
                x="465"
                y="359"
                textAnchor="middle"
                className="wonder-orbit-center"
              >
                {focused.code}
              </text>
              <text
                x="465"
                y="391"
                textAnchor="middle"
                className="wonder-orbit-ratio"
              >
                {number.format(focused.ratio)}×
              </text>
              <text
                x="465"
                y="414"
                textAnchor="middle"
                className="wonder-axis-note"
              >
                national
              </text>
            </svg>
          </ChartViewport>
          <div className="wonder-readout" aria-live="polite">
            <div>
              <span>{profile.specialty}</span>
              <strong>{focused.name}</strong>
            </div>
            <div>
              <span>{measureNames[metric]}</span>
              <strong>{valueText(readMeasure(focused, metric), metric)}</strong>
            </div>
            <div>
              <span>National specialty value</span>
              <strong>{valueText(benchmark, metric)}</strong>
            </div>
            <div>
              <span>Provider records</span>
              <strong>{focused.providers.toLocaleString()}</strong>
            </div>
          </div>
        </>
      ) : (
        <p className="wonder-empty">
          No states meet this threshold. Lower the minimum provider count to
          bring them back.
        </p>
      )}
      <p className="wonder-note">
        {states.length} of 51 places (50 states + DC) shown. Territories,
        missing values, zero values, and places below your threshold are
        excluded. The teal ring is the national specialty value; inward means
        lower, outward means higher. Radius uses a log ratio, so half and twice
        the benchmark are equally far from the ring. The radial scale adapts to
        the included states; angle shows order, not geography. State detail is
        available for {profiles.length} specialties.
      </p>
    </>
  );
}

function RankWeave({
  area,
  selected,
  onSelect,
}: {
  area: Area;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [axes, setAxes] = useState<WeaveMeasure[]>([...weaveMeasures]);
  const [solo, setSolo] = useState(false);
  const [hover, setHover] = usePreviewSelection(selected);
  const ranked = useMemo(
    () => weaveRanks(area.specialties),
    [area.specialties],
  );
  const current =
    ranked.find((row) => row.row.specialty === (hover ?? selected)) ??
    ranked[0];
  const xs = [110, 345, 580, 815];
  const y = (rank: number) =>
    100 + ((rank - 1) / Math.max(1, ranked.length - 1)) * 390;
  const reordered = [...ranked.filter((row) => row !== current), current];
  const tangled = () => {
    const found = [...ranked].sort(
      (a, b) =>
        Math.max(...Object.values(b.ranks)) -
        Math.min(...Object.values(b.ranks)) -
        (Math.max(...Object.values(a.ranks)) -
          Math.min(...Object.values(a.ranks))),
    )[0];
    if (found) {
      setHover(null);
      onSelect(found.row.specialty);
    }
  };
  return (
    <>
      <div className="wonder-actions">
        <button
          type="button"
          aria-pressed={solo}
          onClick={() => setSolo(!solo)}
        >
          <FaIcon name={solo ? 'group' : 'inspect'} />{' '}
          {solo ? 'Show all threads' : 'Isolate this thread'}
        </button>
        <button
          type="button"
          onClick={() => setAxes([...axes.slice(1), axes[0]])}
        >
          <FaIcon name="reset" /> Rotate the axes
        </button>
        <button type="button" onClick={tangled}>
          <FaIcon name="inspect" /> Find the biggest rank swing
        </button>
      </div>
      <ChartViewport>
        <svg
          viewBox="0 0 930 575"
          className="wonder-svg"
          role="group"
          aria-label={`Specialty ranks for ${area.name}. Rank 1 is the largest value. Equal values share a rank.`}
        >
          {[1, Math.ceil(ranked.length / 2), ranked.length]
            .filter((rank, index, rows) => rows.indexOf(rank) === index)
            .map((rank) => (
              <g key={rank}>
                <line
                  x1="75"
                  x2="845"
                  y1={y(rank)}
                  y2={y(rank)}
                  stroke="var(--rule)"
                  strokeDasharray="3 6"
                />
                <text
                  x="55"
                  y={y(rank) + 5}
                  textAnchor="end"
                  className="wonder-axis-note"
                >
                  {rank}
                </text>
              </g>
            ))}
          {axes.map((metric, index) => (
            <g key={metric}>
              <text
                x={xs[index]}
                y="35"
                textAnchor="middle"
                className="wonder-axis-title"
              >
                {measureNames[metric].replace('Reported ', '')}
              </text>
              <text
                x={xs[index]}
                y="60"
                textAnchor="middle"
                className="wonder-axis-note"
              >
                {valueText(readMeasure(current.row, metric), metric)}
              </text>
              <line
                x1={xs[index]}
                x2={xs[index]}
                y1="85"
                y2="510"
                stroke="var(--strong-rule)"
              />
            </g>
          ))}
          {reordered.map((item) => {
            const active = item === current;
            const points = axes.map((metric, index) => ({
              x: xs[index],
              y: y(item.ranks[metric]),
            }));
            const path = points
              .map((point, index) =>
                index
                  ? `C ${points[index - 1].x + 95} ${points[index - 1].y}, ${point.x - 95} ${point.y}, ${point.x} ${point.y}`
                  : `M ${point.x} ${point.y}`,
              )
              .join(' ');
            const color = active ? 'var(--purple)' : 'var(--navy)';
            if (solo && !active) return null;
            return (
              <g
                key={item.row.specialty}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`${item.row.specialty}: ${axes.map((metric) => `${measureNames[metric]} rank ${item.ranks[metric]}, ${valueText(readMeasure(item.row, metric), metric)}`).join('; ')}`}
                onMouseEnter={() => setHover(item.row.specialty)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(item.row.specialty)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(item.row.specialty)}
                onKeyDown={(event) =>
                  activate(event, () => onSelect(item.row.specialty))
                }
                className="wonder-mark"
              >
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={active ? 4 : 1.5}
                  opacity={active ? 1 : 0.18}
                />
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                />
                {points.map((point, index) => (
                  <g key={index}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 7 : 3}
                      fill={color}
                      opacity={active ? 1 : 0.3}
                    />
                    {active && (
                      <text
                        x={point.x + 13}
                        y={point.y - 11}
                        className="wonder-rank-label"
                      >
                        #{item.ranks[axes[index]]}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })}
          <text
            x="465"
            y="554"
            textAnchor="middle"
            className="wonder-axis-note"
          >
            Higher on an axis = larger value. Crossings reveal a change in rank.
          </text>
        </svg>
      </ChartViewport>
      <div className="wonder-readout" aria-live="polite">
        <div>
          <span>TRACING · {ranked.length} SPECIALTIES</span>
          <strong>{current.row.specialty}</strong>
        </div>
        <div>
          <span>Highest rank</span>
          <strong>#{Math.min(...Object.values(current.ranks))}</strong>
        </div>
        <div>
          <span>Lowest rank</span>
          <strong>#{Math.max(...Object.values(current.ranks))}</strong>
        </div>
        <div>
          <span>Rank spread</span>
          <strong>
            {Math.max(...Object.values(current.ranks)) -
              Math.min(...Object.values(current.ranks))}{' '}
            places
          </strong>
        </div>
      </div>
      <p className="wonder-note">
        Ranked within the {ranked.length} specialties in this geography’s
        browser summary, not all CMS specialties. Rank 1 means the largest
        value, not better care. Ties share a rank and skip subsequent positions.
        Curves connect rankings, not intermediate measurements. Reported opioid
        and antibiotic shares use suppressed subgroup totals and can understate
        actual shares. Teal highlights the thread you are tracing; blue shows
        the other specialties.
      </p>
    </>
  );
}
