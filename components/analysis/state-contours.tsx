'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG states expose keyboard-operable button roles. */
import { useId, useMemo, useState } from 'react';
import type { Dataset } from '@/lib/prescriber';
import {
  atlasValue,
  petalMetrics,
  type AtlasMetric,
} from '@/lib/atlas-analysis';
import { STATE_CODES } from '@/lib/geography-analysis';
import { measureNames } from '@/lib/wonder-analysis';
import { mapRows, mapBands, mapBand, mapCsv } from '@/lib/state-contours';
import { scrollToSection } from '@/lib/scroll-to-section';
import { FaIcon } from '@/components/fa-icon';
import { ChartViewport } from './chart-viewport';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const exact = (value: number, metric: AtlasMetric) =>
  `${metric === 'costPerClaim' ? '$' : ''}${number.format(value)}${metric.endsWith('Share') ? '%' : ''}`;
const smallStates = [
  'Rhode Island',
  'Connecticut',
  'Delaware',
  'District of Columbia',
  'Maryland',
  'Massachusetts',
  'New Jersey',
  'Vermont',
  'New Hampshire',
];

export function StateContours({
  data,
  geographyCode,
  selected,
  onSelect,
  onExplore,
}: {
  data: Dataset;
  geographyCode: string;
  selected: string;
  onSelect: (name: string) => void;
  onExplore: (code: string, specialty: string) => void;
}) {
  const [metric, setMetric] = useState<AtlasMetric>('costPerClaim');
  const [minimum, setMinimum] = useState(50);
  // Local inspection persists until a different geography is chosen elsewhere.
  const [inspection, setInspection] = useState<{
    geography: string;
    name: string;
  } | null>(null);
  const incomingPlace = STATE_CODES.has(geographyCode)
    ? data.areas.find((area) => area.code === geographyCode)?.name
    : undefined;
  const state =
    inspection?.geography === geographyCode
      ? inspection.name
      : (incomingPlace ?? 'California');
  const setState = (name: string) =>
    setInspection({ geography: geographyCode, name });
  const [downloaded, setDownloaded] = useState(false);
  const patternId = useId().replace(/:/g, '');
  const profile =
    data.specialtyProfiles.find((p) => p.specialty === selected) ??
    data.specialtyProfiles[0];
  const rows = useMemo(
    () => (profile ? mapRows(profile, metric, minimum) : []),
    [profile, metric, minimum],
  );
  if (!profile) return <p>No state profiles are available.</p>;
  const current = rows.find((row) => row.name === state) ?? rows[0];
  const included = rows
    .filter((row) => row.value !== null)
    .sort((a, b) => b.value! - a.value! || a.name.localeCompare(b.name));
  const benchmark = atlasValue(profile.national, metric);
  const biggest = [...included]
    .filter((row) => row.ratio !== null)
    .sort((a, b) => Math.abs(b.ratio! - 1) - Math.abs(a.ratio! - 1))[0];
  function download() {
    const url = URL.createObjectURL(
      new Blob([mapCsv(profile, metric, minimum, data.meta.year)], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `part-d-state-contours-${metric}-${data.meta.year}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }
  return (
    <>
      <div className="wonder-controls">
        <label>
          Specialty
          <select
            aria-label="Map specialty"
            value={profile.specialty}
            onChange={(event) => onSelect(event.target.value)}
          >
            {data.specialtyProfiles.map((p) => (
              <option key={p.specialty}>{p.specialty}</option>
            ))}
          </select>
        </label>
        <label>
          Measure
          <select
            aria-label="Map measure"
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value as AtlasMetric);
              setDownloaded(false);
            }}
          >
            {petalMetrics.map((m) => (
              <option key={m} value={m}>
                {measureNames[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minimum provider records
          <select
            aria-label="Map minimum provider records"
            value={minimum}
            onChange={(event) => {
              setMinimum(Number(event.target.value));
              setDownloaded(false);
            }}
          >
            {[1, 50, 250, 1000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()} per state
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected !== profile.specialty && (
        <p className="wonder-footnote">
          State profiles cover the 18 leading national specialties. Showing{' '}
          {profile.specialty}; select a specialty above to link the page.
        </p>
      )}
      <div className="contour-intro">
        <div>
          <h4>State values relative to the nation</h4>
          <p>
            For {profile.specialty}, color compares{' '}
            <b>{measureNames[metric].toLowerCase()}</b> with the same specialty
            nationwide.
          </p>
        </div>
        <span className="contour-coverage">
          <b>
            {included.length}
            <small> / 51</small>
          </b>
          states + DC shown
        </span>
      </div>
      <div
        className="contour-legend"
        aria-label="Color scale: multiples of national specialty value"
      >
        {mapBands.map((band) => (
          <span key={band.label}>
            <i style={{ background: band.color }} />
            {band.label}
          </span>
        ))}
        <span>
          <i className="contour-hatch" />
          Unavailable / filtered
        </span>
      </div>
      <div className="contour-layout">
        <div className="contour-map">
          <ChartViewport>
            <svg
              viewBox="0 0 975 625"
              role="group"
              aria-label={`${profile.specialty}: ${measureNames[metric]} by state. Select a state for exact values.`}
            >
              <defs>
                <pattern
                  id={patternId}
                  width="7"
                  height="7"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="7" height="7" fill="#f8f7f0" />
                  <path
                    d="M-1 1 1-1 M0 7 7 0 M6 8 8 6"
                    stroke="#b8c7bb"
                    strokeWidth="1.4"
                  />
                </pattern>
              </defs>
              {rows.map((item) => (
                <path
                  key={item.name}
                  d={item.path}
                  className="contour-state"
                  fill={
                    item.ratio === null
                      ? `url(#${patternId})`
                      : mapBands[mapBand(item.ratio)].color
                  }
                  stroke="#fff"
                  strokeWidth="1.5"
                  role="button"
                  tabIndex={0}
                  aria-pressed={current.name === item.name}
                  aria-label={`${item.name}: ${item.value === null ? item.status : exact(item.value, metric)}, ${item.ratio === null ? 'no national comparison' : `${number.format(item.ratio)} times national`}`}
                  onClick={() => setState(item.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setState(item.name);
                    }
                  }}
                >
                  <title>
                    {item.name}:{' '}
                    {item.value === null
                      ? item.status
                      : exact(item.value, metric)}
                  </title>
                </path>
              ))}
              {rows
                .filter((item) => item.row && !smallStates.includes(item.name))
                .map((item) => (
                  <text
                    key={item.name}
                    x={item.centroid[0]}
                    y={item.centroid[1] + 4}
                    className="contour-label"
                    aria-hidden="true"
                  >
                    {item.row!.code}
                  </text>
                ))}
              <path
                d={current.path}
                fill="none"
                stroke="#176558"
                strokeWidth="3.5"
                pointerEvents="none"
              />
              <text x="28" y="614" className="contour-map-note">
                Alaska and Hawaii are repositioned; Alaska is reduced in scale.
              </text>
            </svg>
          </ChartViewport>
          <div
            className="contour-small-states"
            aria-label="Small states and DC"
          >
            {rows
              .filter((row) => smallStates.includes(row.name))
              .map((row) => (
                <button
                  type="button"
                  key={row.name}
                  onClick={() => setState(row.name)}
                  aria-pressed={current.name === row.name}
                  aria-label={`Inspect ${row.name}`}
                >
                  <i
                    style={{
                      background:
                        row.ratio === null
                          ? '#f0f2f6'
                          : mapBands[mapBand(row.ratio)].color,
                    }}
                  />
                  {row.row?.code ?? row.name}
                </button>
              ))}
          </div>
        </div>
        <aside className="contour-detail">
          <label>
            Inspect a state
            <select
              aria-label="Map state"
              value={current.name}
              onChange={(event) => setState(event.target.value)}
            >
              {[...rows]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((row) => (
                  <option key={row.name}>{row.name}</option>
                ))}
            </select>
          </label>
          <div aria-live="polite" aria-atomic="true">
            <p className="wonder-kicker">{profile.specialty}</p>
            <h4>{current.name}</h4>
            <strong className="contour-value">
              {current.value === null
                ? 'Not shown'
                : exact(current.value, metric)}
            </strong>
            <p>{measureNames[metric]}</p>
            <div className="contour-relative">
              {current.ratio === null
                ? 'No national comparison'
                : `${number.format(Math.abs(current.ratio - 1) * 100)}% ${current.ratio >= 1 ? 'above' : 'below'} national`}
            </div>
            <dl>
              <div>
                <dt>National specialty value</dt>
                <dd>{exact(benchmark, metric)}</dd>
              </div>
              <div>
                <dt>Provider records</dt>
                <dd>
                  {current.row?.providers.toLocaleString() ?? 'Unavailable'}
                </dd>
              </div>
              <div>
                <dt>Coverage</dt>
                <dd>
                  {current.status === 'included'
                    ? 'Meets threshold'
                    : current.status === 'below threshold'
                      ? `Below ${minimum.toLocaleString()} records`
                      : 'Not in summary'}
                </dd>
              </div>
            </dl>
          </div>
          {current.row && (
            <button
              type="button"
              className="contour-explore"
              onClick={() => {
                onExplore(current.row!.code, profile.specialty);
                requestAnimationFrame(() => scrollToSection('explorer-chart'));
              }}
            >
              Explore {current.row.code} specialties <FaIcon name="next" />
            </button>
          )}
        </aside>
      </div>
      <div className="contour-actions">
        <button
          type="button"
          disabled={!biggest}
          onClick={() => biggest && setState(biggest.name)}
        >
          <FaIcon name="explore" /> Find largest relative difference
        </button>
        <button type="button" onClick={download}>
          <FaIcon name="download" /> Download map data
        </button>
        <span role="status">
          {downloaded
            ? 'CSV downloaded · includes coverage for all 51 places'
            : 'Select a state, or choose its name for precise values.'}
        </span>
      </div>
      {!included.length && (
        <p className="wonder-note" role="status">
          No states meet this threshold. Lower the minimum provider records to
          reveal the map.
        </p>
      )}
      <p className="wonder-footnote">
        1× = the national specialty aggregate; the filter never changes that
        benchmark. Land area does not represent prescribing volume. Territories
        are excluded. Reported opioid and antibiotic shares are lower bounds
        because of suppression; this is not a care-quality score.
      </p>
      <p className="contour-credit">
        Map shapes:{' '}
        <a
          href="https://github.com/topojson/us-atlas"
          target="_blank"
          rel="noreferrer"
        >
          U.S. Atlas
        </a>
        , based on 2017 Census boundaries. Prescribing data: CMS{' '}
        {data.meta.year}.{' '}
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- Static text asset, not an app route. */}
        <a href="./data/open-source-notices.txt">Open-source credits</a>
      </p>
    </>
  );
}
