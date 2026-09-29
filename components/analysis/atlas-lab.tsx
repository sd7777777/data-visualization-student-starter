'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG marks expose keyboard-operable button roles. */
import { useState, type KeyboardEvent } from 'react';
import type { Dataset, SpecialtyProfile, Summary } from '@/lib/prescriber';
import { compact } from '@/lib/prescriber';
import {
  atlasRows,
  atlasTiles,
  atlasValue,
  hexPoints,
  petalMetrics,
  petalPath,
  ridgeBins,
  statePetals,
  type AtlasMetric,
} from '@/lib/atlas-analysis';
import { measureNames } from '@/lib/wonder-analysis';
import { ChartViewport } from './chart-viewport';
import { FaIcon } from '@/components/fa-icon';

const colors = ['#176558', '#497b91', '#00866a', '#ac553e'];
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const exact = (value: number, metric: AtlasMetric) =>
  `${metric === 'costPerClaim' ? '$' : ''}${number.format(value)}${metric.endsWith('Share') ? '%' : ''}`;
const activate = (event: KeyboardEvent<SVGElement>, action: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};
const colorFor = (ratio: number) =>
  ratio < 0.5
    ? '#00775f'
    : ratio < 0.8
      ? '#86baa6'
      : ratio <= 1.2
        ? '#e0e4dc'
        : ratio <= 2
          ? '#d6a185'
          : '#984530';

export function AtlasLab({
  data,
  mode,
  selected,
  onSelect,
}: {
  data: Dataset;
  mode: 'hex' | 'petals' | 'ridges';
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [minimum, setMinimum] = useState(50);
  const [metric, setMetric] = useState<AtlasMetric>('costPerClaim');
  const [state, setState] = useState('CA');
  const profile =
    data.specialtyProfiles.find((p) => p.specialty === selected) ??
    data.specialtyProfiles[0];
  if (!profile) return <p>No specialty profiles are available.</p>;
  const rows = atlasRows(profile, minimum);
  const current = rows.find((row) => row.code === state) ?? rows[0];
  return (
    <>
      <div className="wonder-controls">
        <label>
          Specialty
          <select
            aria-label="Atlas specialty"
            value={profile.specialty}
            onChange={(e) => onSelect(e.target.value)}
          >
            {data.specialtyProfiles.map((p) => (
              <option key={p.specialty}>{p.specialty}</option>
            ))}
          </select>
        </label>
        <label>
          Minimum provider records
          <select
            aria-label="Atlas minimum provider records"
            value={minimum}
            onChange={(e) => setMinimum(Number(e.target.value))}
          >
            {[1, 50, 250, 1000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()} per state
              </option>
            ))}
          </select>
        </label>
        {mode !== 'petals' && (
          <label>
            Measure
            <select
              aria-label="Atlas measure"
              value={metric}
              onChange={(e) => setMetric(e.target.value as AtlasMetric)}
            >
              {petalMetrics.map((m) => (
                <option key={m} value={m}>
                  {measureNames[m]}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode !== 'ridges' && (
          <label>
            Inspect a state
            <select
              aria-label="Atlas state"
              value={current?.code ?? ''}
              disabled={!rows.length}
              onChange={(e) => setState(e.target.value)}
            >
              {!rows.length && (
                <option value="">No states meet the threshold</option>
              )}
              {[...rows]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>
      {selected !== profile.specialty && (
        <p className="wonder-footnote">
          State detail is available for the 18 leading national specialties.
          Showing {profile.specialty}; choose a specialty above to link the
          page.
        </p>
      )}
      {mode === 'hex' && (
        <HexAtlas
          profile={profile}
          minimum={minimum}
          metric={metric}
          state={current?.code}
          onState={setState}
        />
      )}
      {mode === 'petals' && (
        <PetalGarden
          profile={profile}
          minimum={minimum}
          state={current?.code}
          onState={setState}
        />
      )}
      {mode === 'ridges' && (
        <ClaimMountains
          profiles={data.specialtyProfiles}
          selected={profile.specialty}
          minimum={minimum}
          metric={metric}
          onSelect={onSelect}
        />
      )}
      <p className="wonder-footnote">
        50 states + DC; territories are excluded. Each view uses the selected
        specialty’s records. Provider thresholds affect displayed states, not
        national benchmarks. Reported drug-category shares are conservative
        lower bounds because CMS suppresses some values.
      </p>
    </>
  );
}

function HexAtlas({
  profile,
  minimum,
  metric,
  state,
  onState,
}: {
  profile: SpecialtyProfile;
  minimum: number;
  metric: AtlasMetric;
  state?: string;
  onState: (code: string) => void;
}) {
  const [sized, setSized] = useState(false);
  const rows = atlasRows(profile, minimum);
  const current = rows.find((row) => row.code === state);
  const national = atlasValue(profile.national, metric);
  const maxProviders = Math.max(1, ...rows.map((row) => row.providers));
  return (
    <>
      <div className="atlas-intro">
        <h4>Compare states without land-area differences</h4>
        <p>
          Color compares each state with the national value for{' '}
          {profile.specialty}. Switch on record sizing to see where the
          specialty’s provider records cluster.
        </p>
      </div>
      <div className="wonder-actions">
        <button
          type="button"
          aria-pressed={sized}
          onClick={() => setSized(!sized)}
        >
          <FaIcon name="group" /> Size hexagons by provider records
        </button>
        <span>{rows.length} of 51 places meet the threshold</span>
      </div>
      <div
        className="atlas-color-key"
        aria-label="Color legend: state value divided by national value"
      >
        {['Below 0.5×', '0.5–0.8×', '0.8–1.2×', '1.2–2×', 'Above 2×'].map(
          (label, i) => (
            <span key={label}>
              <i
                style={{
                  background: [
                    '#00775f',
                    '#86baa6',
                    '#e0e4dc',
                    '#d6a185',
                    '#984530',
                  ][i],
                }}
              />
              {label}
            </span>
          ),
        )}
        <span>
          <i className="atlas-missing" />
          Unavailable / filtered
        </span>
      </div>
      <ChartViewport>
        <svg
          viewBox="0 0 1000 560"
          className="wonder-svg atlas-map"
          role="group"
          aria-label={`Hexagonal state atlas of ${measureNames[metric]} for ${profile.specialty}`}
        >
          <text x="40" y="30" className="wonder-axis-title">
            {measureNames[metric]} · national {exact(national, metric)}
          </text>
          <text x="40" y="55" className="wonder-axis-note">
            {sized
              ? 'Inner hexagon area = provider records; outlines show equal state cells.'
              : 'Equal-area cells · geographic positions are schematic.'}
          </text>
          {atlasTiles.map(([code, col, rowIndex]) => {
            const row = rows.find((r) => r.code === code);
            const value = row ? atlasValue(row, metric) : null;
            const ratio =
              value !== null && national > 0 ? value / national : null;
            const radius =
              row && sized ? 30 * Math.sqrt(row.providers / maxProviders) : 30;
            const fill = row && ratio !== null ? colorFor(ratio) : '#f8f7f0';
            const active = code === state;
            const description = row
              ? `${row.name}: ${exact(value!, metric)}, ${ratio === null ? 'national ratio unavailable' : `${number.format(ratio)} times national`}, ${row.providers.toLocaleString()} provider records`
              : `${code}: unavailable or below ${minimum} provider records`;
            return (
              <g
                key={code}
                transform={`translate(${55 + col * 68 + (rowIndex % 2) * 14},${120 + rowIndex * 56})`}
                role="button"
                aria-label={description}
                aria-disabled={!row}
                aria-pressed={active}
                tabIndex={row ? 0 : -1}
                className={row ? 'wonder-mark' : ''}
                onClick={() => row && onState(code)}
                onFocus={() => row && onState(code)}
                onKeyDown={(e) => activate(e, () => row && onState(code))}
              >
                <title>{description}</title>
                <polygon
                  points={hexPoints(32)}
                  fill="var(--panel)"
                  stroke={active ? 'var(--purple)' : 'var(--rule)'}
                  strokeWidth={active ? 3 : 1}
                  strokeDasharray={row ? undefined : '3 3'}
                />
                {row && <polygon points={hexPoints(radius)} fill={fill} />}
                <text y="5" textAnchor="middle" className="atlas-state-label">
                  {code}
                </text>
                {active && <circle cx="0" cy="40" r="3" fill="var(--purple)" />}
              </g>
            );
          })}
          <text x="40" y="535" className="wonder-axis-note">
            AK and HI are insets. Cell positions do not encode distance or state
            boundaries.
          </text>
        </svg>
      </ChartViewport>
      {current ? (
        <div className="wonder-readout" aria-live="polite">
          <div>
            <span>Selected place</span>
            <strong>{current.name}</strong>
            <small>{profile.specialty}</small>
          </div>
          <div>
            <span>{measureNames[metric]}</span>
            <strong>{exact(atlasValue(current, metric), metric)}</strong>
          </div>
          <div>
            <span>Relative to national</span>
            <strong>
              {national > 0
                ? `${number.format(atlasValue(current, metric) / national)}×`
                : 'Unavailable'}
            </strong>
          </div>
          <div>
            <span>Provider records</span>
            <strong>{current.providers.toLocaleString()}</strong>
          </div>
        </div>
      ) : (
        <p className="atlas-empty">
          No states meet this threshold. Lower the minimum provider count to
          restore the map.
        </p>
      )}
      <p className="wonder-footnote">
        1× means equal to the national value. Color bins are fixed across
        specialties. Size uses a separate scale for each selected specialty;
        labels remain legible even when a hexagon is tiny.
      </p>
    </>
  );
}

function PetalGarden({
  profile,
  minimum,
  state,
  onState,
}: {
  profile: SpecialtyProfile;
  minimum: number;
  state?: string;
  onState: (code: string) => void;
}) {
  const [order, setOrder] = useState<'distinctive' | 'alphabetical'>(
    'distinctive',
  );
  const petals = statePetals(profile, minimum);
  const ranked = [...petals].sort((a, b) =>
    order === 'alphabetical'
      ? a.row.name.localeCompare(b.row.name)
      : b.distinctiveness - a.distinctiveness ||
        a.row.name.localeCompare(b.row.name),
  );
  const chosen = petals.find((p) => p.row.code === state);
  const visible = ranked.slice(0, 12);
  const pinned = chosen && !visible.includes(chosen);
  if (pinned) visible.splice(11, 1, chosen);
  return (
    <>
      <div className="atlas-intro">
        <h4>Four measures for each state</h4>
        <p>
          Four petals reveal a state’s prescribing profile. A larger petal means
          a higher percentile among the {petals.length} eligible states for this
          specialty. It does not mean better care.
        </p>
      </div>
      <div className="atlas-petal-key">
        {petalMetrics.map((metric, i) => (
          <span key={metric}>
            <i style={{ background: colors[i] }} />
            {['↑', '→', '↓', '←'][i]} {measureNames[metric]}
          </span>
        ))}
      </div>
      <div className="wonder-actions">
        <button
          type="button"
          aria-pressed={order === 'distinctive'}
          onClick={() => setOrder('distinctive')}
        >
          <FaIcon name="shuffle" /> Most distinctive profiles
        </button>
        <button
          type="button"
          aria-pressed={order === 'alphabetical'}
          onClick={() => setOrder('alphabetical')}
        >
          Alphabetical
        </button>
        <span>
          Showing {visible.length} of {petals.length}
          {pinned ? ' · selected state pinned last' : ''}
        </span>
      </div>
      {visible.length ? (
        <div className="petal-garden">
          {visible.map(({ row, percentiles }, index) => (
            <button
              className="petal-card"
              key={row.code}
              type="button"
              aria-pressed={state === row.code}
              onClick={() => onState(row.code)}
              aria-label={`${row.name}. ${petalMetrics.map((metric, i) => `${measureNames[metric]}: ${exact(atlasValue(row, metric), metric)}, percentile ${number.format(percentiles[i])}`).join('; ')}`}
            >
              <span className="petal-card-heading">
                <b>{row.name}</b>
                <small>
                  {pinned && index === visible.length - 1 ? 'PINNED' : row.code}
                </small>
              </span>
              <svg viewBox="-80 -80 160 160" aria-hidden="true">
                <circle r="62" fill="var(--paper)" stroke="var(--grid)" />
                {percentiles.map((p, i) => (
                  <path
                    key={petalMetrics[i]}
                    d={petalPath(p, i)}
                    fill={colors[i]}
                    fillOpacity="0.83"
                  />
                ))}
                <circle
                  r={62 * Math.sqrt(0.5)}
                  fill="none"
                  stroke="var(--ink)"
                  strokeDasharray="3 4"
                  opacity="0.5"
                />
                <circle r="5" fill="var(--panel)" />
              </svg>
              <span className="petal-card-caption">
                {compact.format(row.providers)} provider records
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="atlas-empty">
          No states meet this threshold. Lower the minimum provider count to
          grow the garden.
        </p>
      )}
      <p className="wonder-footnote">
        Petal area = percentile (0–100); dashed circle = 50th percentile, outer
        circle = 100th. Ties share their midpoint percentile. “Most distinctive”
        sorts by the sum of distances from the 50th percentile across four
        measures. Select any eligible state above to bring it into the garden.
      </p>
      {chosen && (
        <div className="petal-detail" aria-live="polite">
          <h4>{chosen.row.name} · exact values</h4>
          <div>
            {petalMetrics.map((metric, i) => (
              <div key={metric}>
                <span style={{ color: colors[i] }}>{measureNames[metric]}</span>
                <strong>{exact(atlasValue(chosen.row, metric), metric)}</strong>
                <small>
                  {number.format(chosen.percentiles[i])} percentile ·{' '}
                  {petals.length} eligible places
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ClaimMountains({
  profiles,
  selected,
  minimum,
  metric,
  onSelect,
}: {
  profiles: SpecialtyProfile[];
  selected: string;
  minimum: number;
  metric: AtlasMetric;
  onSelect: (name: string) => void;
}) {
  const [all, setAll] = useState(false);
  const [relative, setRelative] = useState(true);
  const [inspection, setInspection] = useState<{
    specialty: string;
    bin: number;
  } | null>(null);
  const ordered = [...profiles].sort(
    (a, b) => b.national.cost - a.national.cost,
  );
  const visible = ordered.slice(0, all ? ordered.length : 7);
  const chosen = profiles.find((p) => p.specialty === selected);
  if (chosen && !visible.includes(chosen)) visible.push(chosen);
  const plottedValue = (row: Summary, profile: SpecialtyProfile) =>
    relative
      ? atlasValue(row, metric) / atlasValue(profile.national, metric)
      : atlasValue(row, metric);
  const axisLabel = (value: number) =>
    relative ? `${Number(value.toFixed(2))}×` : exact(value, metric);
  const series = visible.map((profile) => ({
    profile,
    rows:
      relative && atlasValue(profile.national, metric) <= 0
        ? []
        : atlasRows(profile, minimum),
  }));
  const values = series.flatMap((s) =>
    s.rows.map((row) => plottedValue(row, s.profile)),
  );
  const maximum = relative
    ? Math.max(1, Math.ceil(Math.max(0, ...values) * 2) / 2)
    : Math.max(1, ...values) * 1.001;
  const bins = series.map((s) =>
    ridgeBins(
      s.rows.map((row) => plottedValue(row, s.profile)),
      maximum,
    ),
  );
  const peak = Math.max(1, ...bins.flat());
  const left = 310,
    plotWidth = 620,
    step = 88,
    first = 130;
  const height = first + series.length * step + 45;
  const context = `${metric}|${minimum}|${all}|${relative}|${selected}`;
  const [inspectionContext, setInspectionContext] = useState(context);
  const activeSeries =
    inspectionContext === context
      ? series.find((s) => s.profile.specialty === inspection?.specialty)
      : undefined;
  const activeBin = inspection?.bin ?? 0;
  const members =
    activeSeries?.rows.filter(
      (row) =>
        Math.min(
          19,
          Math.floor((plottedValue(row, activeSeries.profile) / maximum) * 20),
        ) === activeBin,
    ) ?? [];
  const inspect = (specialty: string, bin: number) => {
    setInspection({ specialty, bin });
    setInspectionContext(context);
  };
  return (
    <>
      <div className="atlas-intro">
        <h4>Distribution of state values</h4>
        <p>
          Each mountain is a histogram of state values for one specialty. Peaks
          reveal common ranges; isolated peaks reveal separated groups. All rows
          share the same horizontal scale and height scale.{' '}
          {relative
            ? 'Values are divided by each specialty’s national value: 1× is the benchmark.'
            : 'Absolute values retain their original units.'}
        </p>
      </div>
      <div className="wonder-actions">
        <button
          type="button"
          aria-pressed={relative}
          onClick={() => setRelative(!relative)}
        >
          <FaIcon name="compare" />
          {relative
            ? 'Relative to national · show absolute'
            : 'Absolute values · show national multiples'}
        </button>
        <button type="button" aria-pressed={all} onClick={() => setAll(!all)}>
          <FaIcon name="fields" />
          {all ? 'Show a smaller set' : 'Show all 18 specialties'}
        </button>
        <span>{visible.length} specialties · one state = one observation</span>
      </div>
      <ChartViewport>
        <svg
          viewBox={`0 0 1000 ${height}`}
          className="wonder-svg ridge-svg"
          role="group"
          aria-label={`State distribution mountains for ${measureNames[metric]}`}
        >
          <text x="20" y="28" className="wonder-axis-title">
            {measureNames[metric]}
            {relative
              ? ' · multiples of the national value'
              : ' · absolute values'}
          </text>
          <text x="20" y="54" className="wonder-axis-note">
            20 equal-width bins · peak height scale: 0–{peak} states · click or
            focus a bin to inspect
          </text>
          {Array.from({ length: 5 }, (_, i) => (
            <g key={i}>
              <line
                x1={left + (i * plotWidth) / 4}
                x2={left + (i * plotWidth) / 4}
                y1="92"
                y2={height - 60}
                stroke="var(--grid)"
              />
              <text
                x={left + (i * plotWidth) / 4}
                y="84"
                textAnchor="middle"
                className="wonder-axis-note"
              >
                {axisLabel((i * maximum) / 4)}
              </text>
            </g>
          ))}
          {series.map(({ profile, rows }, i) => {
            const baseline = first + i * step + 45;
            const width = plotWidth / 20;
            const points = bins[i]
              .map(
                (count, j) =>
                  `${left + (j + 0.5) * width},${baseline - (count / peak) * 58}`,
              )
              .join(' L ');
            const national = atlasValue(profile.national, metric);
            const nationalX =
              left + ((relative ? 1 : national) / maximum) * plotWidth;
            const active = selected === profile.specialty;
            return (
              <g key={profile.specialty}>
                <g
                  role="button"
                  tabIndex={0}
                  className="wonder-mark"
                  aria-label={`Trace ${profile.specialty}, ${rows.length} eligible states`}
                  aria-pressed={active}
                  onClick={() => onSelect(profile.specialty)}
                  onKeyDown={(e) =>
                    activate(e, () => onSelect(profile.specialty))
                  }
                >
                  <rect
                    x="8"
                    y={baseline - 55}
                    width="285"
                    height="60"
                    rx="5"
                    fill={active ? 'var(--wash)' : 'transparent'}
                  />
                  <text x="20" y={baseline - 27} className="ridge-specialty">
                    {profile.specialty.length > 31
                      ? `${profile.specialty.slice(0, 29)}…`
                      : profile.specialty}
                  </text>
                  <text x="20" y={baseline - 5} className="wonder-axis-note">
                    {rows.length} states ·{' '}
                    {active ? 'selected' : 'select specialty'}
                  </text>
                  <title>{profile.specialty}</title>
                </g>
                <line
                  x1={left}
                  x2={left + plotWidth}
                  y1={baseline}
                  y2={baseline}
                  stroke="var(--rule)"
                />
                <path
                  d={`M ${left} ${baseline} L ${points} L ${left + plotWidth} ${baseline} Z`}
                  fill={active ? 'var(--purple)' : colors[i % 4]}
                  fillOpacity={active ? 0.8 : 0.4}
                  stroke={active ? 'var(--purple)' : colors[i % 4]}
                  strokeWidth="1.5"
                />
                {rows.length > 0 && nationalX <= left + plotWidth && (
                  <g>
                    <line
                      x1={nationalX}
                      x2={nationalX}
                      y1={baseline - 61}
                      y2={baseline + 4}
                      stroke="var(--ink)"
                      strokeDasharray="3 3"
                    />
                    <title>National: {exact(national, metric)}</title>
                  </g>
                )}
                {!rows.length && (
                  <text
                    x={left + 20}
                    y={baseline - 15}
                    className="wonder-axis-note"
                  >
                    No eligible states
                  </text>
                )}
                {bins[i].map((count, j) => (
                  <rect
                    key={j}
                    x={left + j * width}
                    y={baseline - 64}
                    width={width}
                    height="68"
                    fill="transparent"
                    stroke={
                      activeSeries?.profile.specialty === profile.specialty &&
                      activeBin === j
                        ? 'var(--ink)'
                        : 'none'
                    }
                    className="wonder-mark ridge-bin"
                    role="button"
                    tabIndex={count ? 0 : -1}
                    aria-label={`${profile.specialty}: ${axisLabel((j * maximum) / 20)} to ${axisLabel(((j + 1) * maximum) / 20)}, ${count} states`}
                    onClick={() => inspect(profile.specialty, j)}
                    onFocus={() => inspect(profile.specialty, j)}
                    onKeyDown={(e) =>
                      activate(e, () => inspect(profile.specialty, j))
                    }
                  />
                ))}
              </g>
            );
          })}
          <text x={left} y={height - 20} className="wonder-axis-note">
            Dashed vertical marks = national values (weighted by the underlying
            totals).
          </text>
        </svg>
      </ChartViewport>
      <div className="ridge-readout" aria-live="polite">
        {activeSeries ? (
          <>
            <strong>
              {activeSeries.profile.specialty} · {members.length}{' '}
              {members.length === 1 ? 'state' : 'states'}
            </strong>
            <span>
              {axisLabel((activeBin * maximum) / 20)} ≤ value{' '}
              {activeBin === 19 ? '≤' : '<'}{' '}
              {axisLabel(((activeBin + 1) * maximum) / 20)} (displayed bounds
              rounded)
            </span>
            <p>
              {members.length
                ? members
                    .map(
                      (row) =>
                        `${row.name} ${exact(atlasValue(row, metric), metric)}`,
                    )
                    .join(' · ')
                : 'No states in this range.'}
            </p>
          </>
        ) : (
          <>
            <strong>Inspect a mountain</strong>
            <p>
              Click a range or use Tab to focus an occupied bin. Its states and
              exact values appear here.
            </p>
          </>
        )}
      </div>
      <p className="wonder-footnote">
        Peaks connect bin centers; they are not a smoothed probability estimate.
        Each state carries equal weight regardless of record count. The smaller
        set contains seven specialties with the highest national total drug
        cost, plus your selection when needed. Scales recalculate when the
        measure, threshold, comparison scale, or displayed specialties change. A
        missing or zero national benchmark excludes a specialty from the
        relative view.
      </p>
    </>
  );
}
