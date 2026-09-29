'use client';

/* SVG has no native group/button elements; its keyboard-operated marks need roles. */
/* eslint-disable jsx-a11y/prefer-tag-over-role */
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { quantileSorted } from 'd3-array';
import { scaleLinear, scaleLog } from 'd3-scale';
import type { Dataset, SpecialtyProfile } from '@/lib/prescriber';
import { RankLadder } from './rank-ladder';
import { EvidenceNote } from './evidence-note';
import { ComparisonFinder } from './comparison-finder';
import {
  comparisonLink,
  defaultComparison,
  validateComparison,
  type ComparisonSettings,
} from '@/lib/comparison-settings';
import { downloadFile } from '@/lib/download';
import { FaIcon } from '@/components/fa-icon';
import { scrollToSection } from '@/lib/scroll-to-section';
import {
  comparisonCsv,
  comparisonEvidence,
  comparisonCardSummary,
  difference,
  includedStates,
  metricLabels,
  metricValue,
  packDots,
  STATE_CODES,
  TERRITORY_CODES,
  status,
  type GeographyMetric,
} from '@/lib/geography-analysis';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const short = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const valueLabel = (value: number, metric: GeographyMetric) =>
  `${metric === 'costPerClaim' ? '$' : ''}${number.format(value)}${metric === 'opioidShare' ? '%' : ''}`;
const deltaLabel = (value: number, metric: GeographyMetric) => {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${number.format(rounded || 0)}${metric === 'opioidShare' ? ' pp' : '%'}`;
};

export function GeographyStudio({
  data,
  settings,
  onSettings,
  notice,
  onNotice,
}: {
  data: Dataset;
  settings: ComparisonSettings;
  onSettings: Dispatch<SetStateAction<ComparisonSettings>>;
  notice: string;
  onNotice: (notice: string) => void;
}) {
  const id = useId().replaceAll(':', '');
  const {
    metric,
    specialty,
    stateA,
    stateB,
    target,
    minimum,
    territories,
    order,
    logarithmic: log,
    pairMode,
    group,
    search,
  } = settings;
  const field =
    <K extends keyof ComparisonSettings>(key: K) =>
    (value: ComparisonSettings[K]) =>
      onSettings((current) => ({ ...current, [key]: value }));
  const setMetric = field('metric'),
    setSpecialty = field('specialty'),
    setStateA = field('stateA'),
    setStateB = field('stateB');
  const setTarget = field('target'),
    setMinimum = field('minimum'),
    setTerritories = field('territories'),
    setOrder = field('order');
  const setLog = field('logarithmic'),
    setPairMode = field('pairMode');
  const onClearGroup = () =>
    onSettings((current) => ({ ...current, group: [], search: '' }));
  const [shareUrl, setShareUrl] = useState('');
  const hoverKey = JSON.stringify(settings);
  const [hoverEntry, setHoverEntry] = useState<{
    key: string;
    value: { specialty: string; code: string };
  } | null>(null);
  const hover = hoverEntry?.key === hoverKey ? hoverEntry.value : null;
  const setHover = (value: { specialty: string; code: string } | null) =>
    setHoverEntry(value ? { key: hoverKey, value } : null);
  const [focusedCell, setFocusedCell] = useState('');
  const [exported, setExported] = useState(false);
  const grid = useRef<HTMLTableElement>(null);
  const allProfiles = data.specialtyProfiles;
  const supported = group.filter((name) =>
    allProfiles.some((p) => p.specialty === name),
  );
  const profiles = useMemo(
    () =>
      allProfiles.filter(
        (p) =>
          (!group.length || group.includes(p.specialty)) &&
          p.specialty.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [allProfiles, group, search],
  );
  const profile =
    profiles.find((p) => p.specialty === specialty) ?? profiles[0];
  const capturedSettings = {
    ...settings,
    specialty: profile?.specialty ?? specialty,
    logarithmic: log && metric !== 'opioidShare',
  };
  const restore = (value: ComparisonSettings) => {
    onSettings(validateComparison(value, data));
    setHover(null);
    setFocusedCell('');
    setShareUrl('');
    onNotice(
      'Saved comparison reopened. The original evidence and observation remain in your notebook.',
    );
    requestAnimationFrame(() => scrollToSection('place'));
  };
  const locations = useMemo(
    () =>
      data.areas
        .filter(
          (d) =>
            STATE_CODES.has(d.code) ||
            (territories && TERRITORY_CODES.has(d.code)),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.areas, territories],
  );
  const codes = useMemo(() => {
    const sorted = locations.map((d) => d.code);
    if (order === 'value' && profile)
      sorted.sort((a, b) => {
        const ra = profile.states.find((d) => d.code === a),
          rb = profile.states.find((d) => d.code === b);
        const va =
          ra && status(ra, minimum) === 'included'
            ? metricValue(ra, metric)
            : -Infinity;
        const vb =
          rb && status(rb, minimum) === 'included'
            ? metricValue(rb, metric)
            : -Infinity;
        return vb - va || a.localeCompare(b);
      });
    return sorted;
  }, [locations, order, profile, minimum, metric]);
  const nameOf = (code: string) =>
    data.areas.find((d) => d.code === code)?.name ?? code;
  const choose = (name: string, code: string) => {
    setSpecialty(name);
    if (target === 'A') setStateA(code);
    else setStateB(code);
  };
  const inspectDistribution = (name: string) => {
    setSpecialty(name);
    requestAnimationFrame(() => scrollToSection('geo-distribution'));
  };
  const limit = metric === 'opioidShare' ? 10 : 100;
  const color = scaleLinear<string>()
    .domain([-limit, 0, limit])
    .range(['#00866a', '#f4f5ee', '#ac553e'])
    .clamp(true);
  const national = profile ? metricValue(profile.national, metric) : 0;
  const valid = useMemo(
    () => (profile ? includedStates(profile, minimum, territories) : []),
    [profile, minimum, territories],
  );
  const hoverProfile = allProfiles.find(
    (p) => p.specialty === hover?.specialty,
  );
  const hoverRow = hoverProfile?.states.find((row) => row.code === hover?.code);
  const activeCell =
    codes.includes(focusedCell.split('|')[1]) &&
    profiles.some((p) => p.specialty === focusedCell.split('|')[0])
      ? focusedCell
      : profile
        ? `${profile.specialty}|${stateA}`
        : '';
  const tabCell = profiles.some((p) =>
    codes.some((code) => `${p.specialty}|${code}` === activeCell),
  )
    ? activeCell
    : profiles[0]
      ? `${profiles[0].specialty}|${codes[0]}`
      : '';
  const values = useMemo(
    () => valid.map((row) => metricValue(row, metric)).sort((a, b) => a - b),
    [valid, metric],
  );
  const canLog = metric !== 'opioidShare';
  const logarithmic = log && canLog;
  const lo = Math.min(national, ...values),
    hi = Math.max(national, ...values);
  const x = useMemo(
    () =>
      logarithmic
        ? scaleLog()
            .domain([Math.max(0.01, lo / 1.15), Math.max(0.02, hi * 1.15)])
            .range([70, 870])
        : scaleLinear()
            .domain([0, hi > 0 ? hi * 1.07 : 1])
            .nice()
            .range([70, 870]),
    [logarithmic, lo, hi],
  );
  const dots = useMemo(
    () =>
      packDots(
        valid.map((row) => ({
          code: row.code,
          x: x(metricValue(row, metric)),
        })),
        5,
        2,
      ),
    [valid, x, metric],
  );
  const amplitude = Math.max(38, ...dots.map((dot) => Math.abs(dot.y)));
  const baseline = amplitude + 40;
  const axisY = baseline + amplitude + 24;
  const height = axisY + 58;
  const q1 = quantileSorted(values, 0.25),
    q3 = quantileSorted(values, 0.75);
  const ticks = x.ticks(8).reduce<number[]>((kept, tick) => {
    const pixel = x(tick);
    const lastPixel = kept.length ? x(kept[kept.length - 1]) : -Infinity;
    return pixel < 70 || pixel > 870 || pixel - lastPixel < 70
      ? kept
      : [...kept, tick];
  }, []);
  const pairRows = profiles
    .map((p) => {
      const a = p.states.find((row) => row.code === stateA),
        b = p.states.find((row) => row.code === stateB);
      const base = metricValue(p.national, metric);
      const da =
        a && status(a, minimum) === 'included'
          ? difference(metricValue(a, metric), base, metric)
          : null;
      const db =
        b && status(b, minimum) === 'included'
          ? difference(metricValue(b, metric), base, metric)
          : null;
      return {
        p,
        a,
        b,
        da,
        db,
        gap: da !== null && db !== null ? Math.abs(da - db) : -1,
      };
    })
    .sort(
      (a, b) => b.gap - a.gap || a.p.specialty.localeCompare(b.p.specialty),
    );
  const extent = Math.max(
    metric === 'opioidShare' ? 1 : 10,
    ...pairRows.flatMap((row) => [
      Math.abs(row.da ?? 0),
      Math.abs(row.db ?? 0),
    ]),
  );
  const pairX = scaleLinear()
    .domain([-extent * 1.1, extent * 1.1])
    .nice()
    .range([260, 740]);
  const differenceUnit = metric === 'opioidShare' ? 'percentage points' : '%';
  const comparable = pairRows.filter(
    (row) => row.da !== null && row.db !== null,
  );
  const widest = comparable[0];
  const selectedValue = (code: string) => {
    const row = profile?.states.find((d) => d.code === code);
    return row && status(row, minimum) === 'included'
      ? valueLabel(metricValue(row, metric), metric)
      : `${status(row, minimum)}${row ? ` (${row.providers.toLocaleString()} records)` : ''}`;
  };
  const cellDescription = (p: SpecialtyProfile, code: string) => {
    const row = p.states.find((d) => d.code === code),
      state = status(row, minimum);
    if (!row) return `${p.specialty}, ${nameOf(code)}: not reported`;
    if (state !== 'included')
      return `${p.specialty}, ${nameOf(code)}: ${row.providers} provider records, below ${minimum}-record threshold`;
    const value = metricValue(row, metric),
      delta = difference(value, metricValue(p.national, metric), metric);
    return `${p.specialty}, ${nameOf(code)}: ${valueLabel(value, metric)}, ${delta === null ? 'no benchmark' : deltaLabel(delta, metric) + ' versus national specialty aggregate'}, ${row.providers.toLocaleString()} provider records`;
  };
  const gridKeys = (
    event: KeyboardEvent<HTMLButtonElement>,
    row: number,
    column: number,
  ) => {
    let r = row,
      c = column;
    if (event.key === 'ArrowRight') c++;
    else if (event.key === 'ArrowLeft') c--;
    else if (event.key === 'ArrowDown') r++;
    else if (event.key === 'ArrowUp') r--;
    else if (event.key === 'Home') c = 0;
    else if (event.key === 'End') c = codes.length - 1;
    else return;
    event.preventDefault();
    r = Math.max(0, Math.min(profiles.length - 1, r));
    c = Math.max(0, Math.min(codes.length - 1, c));
    grid.current
      ?.querySelector<HTMLButtonElement>(
        `button[data-row="${r}"][data-column="${c}"]`,
      )
      ?.focus();
  };
  const evidenceContext = useMemo(
    () =>
      comparisonEvidence({
        profiles,
        group,
        search,
        specialty: profile?.specialty ?? '',
        stateA,
        stateB,
        metric,
        minimum,
        territories,
        logarithmic,
        order,
        pairMode,
        year: data.meta.year,
        source: data.meta.source,
        nameOf: (code) =>
          data.areas.find((area) => area.code === code)?.name ?? code,
      }),
    [
      profiles,
      group,
      search,
      profile,
      stateA,
      stateB,
      metric,
      minimum,
      territories,
      logarithmic,
      order,
      pairMode,
      data,
    ],
  );

  const download = () => {
    const csv = comparisonCsv(
      profiles,
      codes,
      metric,
      minimum,
      data.meta.year,
      data.meta.source,
    );
    downloadFile(
      csv,
      `part-d-${data.meta.year}-${metric}-state-comparison.csv`,
      'text/csv;charset=utf-8',
    );
    setExported(true);
  };

  return (
    <section id="place" className="section-wrap geo-studio">
      <div className="studio-heading">
        <div>
          <span className="eyebrow">
            <span className="chapter-icon">
              <FaIcon name="place" />
            </span>{' '}
            COMPARISON WORKSPACE · {data.meta.year}
          </span>
          <h2>Same specialty. Different places.</h2>
          <p>
            Find a useful comparison, follow it through the charts, and save the
            evidence.
          </p>
        </div>
        <a href="#comparison-finder">Find a comparison</a>
        <a href="#geo-matrix">1 · patterns</a>
        <a href="#geo-distribution">2 · distribution</a>
        <a href="#geo-pair">3 · comparison</a>
        <a href="#geo-evidence">4 · field notebook</a>
      </div>
      {notice && (
        <div className="comparison-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => onNotice('')}>
            Dismiss
          </button>
        </div>
      )}
      <div className="studio-controls">
        <label>
          Measure
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as GeographyMetric)}
          >
            {Object.entries(metricLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find a specialty
          <input
            type="search"
            placeholder="e.g. cardiology"
            value={search}
            maxLength={100}
            onChange={(e) => field('search')(e.target.value)}
          />
        </label>
        <label>
          Minimum provider records
          <select
            value={minimum}
            onChange={(e) => setMinimum(Number(e.target.value))}
          >
            <option value="0">All reported</option>
            <option value="50">50 per specialty / place</option>
            <option value="200">200 per specialty / place</option>
            <option value="1000">1,000 per specialty / place</option>
          </select>
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={territories}
            onChange={(e) => {
              setTerritories(e.target.checked);
              if (!e.target.checked) {
                if (!STATE_CODES.has(stateA)) setStateA('CA');
                if (!STATE_CODES.has(stateB)) setStateB('TX');
              }
            }}
          />
          Include U.S. territories
        </label>
        <button type="button" onClick={download} disabled={!profiles.length}>
          <FaIcon name="download" /> Download these data
        </button>
        <button
          type="button"
          onClick={async () => {
            const url = comparisonLink(window.location.href, capturedSettings);
            setShareUrl(url);
            try {
              await navigator.clipboard.writeText(url);
              onNotice(
                'Comparison link copied. It includes the places, filters and chart settings; notebook observations stay private.',
              );
            } catch {
              onNotice('Select and copy the comparison link below.');
            }
          }}
        >
          <FaIcon name="link" /> Copy comparison link
        </button>
        <button
          type="button"
          onClick={() => {
            onSettings(defaultComparison(data.meta.year));
            setHover(null);
            setFocusedCell('');
            setExported(false);
            setShareUrl('');
            onNotice('Workspace reset. Saved discoveries are unchanged.');
          }}
        >
          <FaIcon name="reset" /> Reset workspace
        </button>
      </div>
      {shareUrl && (
        <div className="comparison-share">
          <label htmlFor={`${id}-share`}>
            Comparison link{' '}
            <span>
              Opens this captured setup. Copy again after changing filters.
            </span>
          </label>
          <input
            id={`${id}-share`}
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <small>
            {['localhost', '127.0.0.1', '[::1]'].includes(
              typeof window === 'undefined' ? '' : window.location.hostname,
            )
              ? 'Local preview link: works on this computer while the preview is running.'
              : 'Opens on this site with the comparison settings restored.'}{' '}
            No observations are included.
          </small>
        </div>
      )}
      <p className="studio-scope">
        {locations.length} places · {profiles.length} of 18 available
        specialties · national benchmarks include all source geographies.
        Filters affect this workspace only.{' '}
        <output>
          {exported
            ? 'CSV requested; includes units, coverage and source.'
            : ''}
        </output>
      </p>
      {group.length > 0 && (
        <div className="carried-group">
          <b>Your comparison group:</b> {supported.length} of {group.length}{' '}
          specialties have state profiles
          {group.length > supported.length
            ? `; ${group.filter((name) => !supported.includes(name)).join(', ')} not available`
            : ''}
          .{' '}
          <button type="button" onClick={onClearGroup}>
            Show all 18 specialties
          </button>
        </div>
      )}
      <div className="pair-controls">
        <label>
          <span className="state-a">A ●</span> First place
          <select value={stateA} onChange={(e) => setStateA(e.target.value)}>
            {locations.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-label="Swap comparison places"
          onClick={() => {
            setStateA(stateB);
            setStateB(stateA);
          }}
        >
          <FaIcon name="compare" />
        </button>
        <label>
          <span className="state-b">B ◆</span> Second place
          <select value={stateB} onChange={(e) => setStateB(e.target.value)}>
            {locations.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Click a mark to set</legend>
          <label>
            <input
              type="radio"
              name={`${id}-target`}
              checked={target === 'A'}
              onChange={() => setTarget('A')}
            />
            Place A
          </label>
          <label>
            <input
              type="radio"
              name={`${id}-target`}
              checked={target === 'B'}
              onChange={() => setTarget('B')}
            />
            Place B
          </label>
        </fieldset>
      </div>

      {stateA === stateB && (
        <p className="comparison-notice">
          Both places are {nameOf(stateA)}. Choose a different place below to
          explore a contrast.
        </p>
      )}
      <ComparisonFinder
        data={data}
        profiles={profiles}
        codes={locations.map((row) => row.code)}
        stateA={stateA}
        stateB={stateB}
        metric={metric}
        minimum={minimum}
        onChoose={(code, name) =>
          onSettings((current) => ({
            ...current,
            stateB: code,
            specialty: name,
            target: 'B',
          }))
        }
      />

      <figure className="studio-figure" id="geo-matrix">
        <div className="studio-figure-head">
          <div>
            <span>08 / FIND A PATTERN</span>
            <h3>Where does each specialty differ from its national value?</h3>
          </div>
          <label>
            Order places
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
            >
              <option value="alphabetical">State name A–Z</option>
              <option value="value">Selected specialty: high → low</option>
            </select>
          </label>
        </div>
        <div className="heat-legend">
          <b>Difference from national specialty aggregate</b>
          <span className="heat-gradient" />
          <span>{metric === 'opioidShare' ? '−10 pp' : '−100%'} or less</span>
          <span>0</span>
          <span>{metric === 'opioidShare' ? '+10 pp' : '+100%'} or more</span>
          <small>
            Hatched = below threshold · × = not reported. Color is capped;
            readouts are exact.
          </small>
        </div>
        <p className="matrix-instruction">
          Click a cell to set the specialty and place {target}. Tab into the
          grid, use arrow keys to explore, then Enter to select. Scroll sideways
          for more states.
        </p>
        {profiles.length ? (
          <div className="matrix-scroll">
            <table className="geo-matrix" ref={grid}>
              <caption>
                {metricLabels[metric]} · {data.meta.year} · differences in{' '}
                {differenceUnit}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Specialty / place →</th>
                  {codes.map((code) => (
                    <th
                      scope="col"
                      key={code}
                      className={
                        code === stateA
                          ? 'column-a'
                          : code === stateB
                            ? 'column-b'
                            : ''
                      }
                    >
                      <abbr title={nameOf(code)}>{code}</abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, ri) => (
                  <tr
                    key={p.specialty}
                    className={
                      p.specialty === profile?.specialty
                        ? 'selected-specialty'
                        : ''
                    }
                  >
                    <th scope="row">
                      <button
                        type="button"
                        aria-pressed={p.specialty === profile?.specialty}
                        onClick={() => setSpecialty(p.specialty)}
                      >
                        {p.specialty}
                      </button>
                    </th>
                    {codes.map((code, ci) => {
                      const row = p.states.find((d) => d.code === code),
                        state = status(row, minimum);
                      const delta = row
                        ? difference(
                            metricValue(row, metric),
                            metricValue(p.national, metric),
                            metric,
                          )
                        : null;
                      const key = `${p.specialty}|${code}`;
                      return (
                        <td key={code}>
                          <button
                            type="button"
                            data-row={ri}
                            data-column={ci}
                            tabIndex={key === tabCell ? 0 : -1}
                            className={`heat-cell ${state.replaceAll(' ', '-')} ${p.specialty === profile?.specialty && (code === stateA || code === stateB) ? 'chosen-cell' : ''}`}
                            style={
                              state === 'included' && delta !== null
                                ? { backgroundColor: color(delta) }
                                : undefined
                            }
                            aria-label={cellDescription(p, code)}
                            aria-pressed={
                              p.specialty === profile?.specialty &&
                              code === (target === 'A' ? stateA : stateB)
                            }
                            onClick={() => choose(p.specialty, code)}
                            onMouseEnter={() =>
                              setHover({ specialty: p.specialty, code })
                            }
                            onMouseLeave={() => setHover(null)}
                            onFocus={() => {
                              setFocusedCell(key);
                              setHover({ specialty: p.specialty, code });
                            }}
                            onBlur={() => setHover(null)}
                            onKeyDown={(e) => gridKeys(e, ri, ci)}
                          >
                            {state === 'not reported' ? '×' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="studio-empty">
            No matching state profiles.{' '}
            {group.length ? (
              <button onClick={onClearGroup}>
                Clear the scatterplot group filter
              </button>
            ) : (
              'Try a different specialty name.'
            )}
          </p>
        )}
        <output className="matrix-readout">
          {hoverProfile && hover
            ? cellDescription(hoverProfile, hover.code)
            : profile
              ? `Selected: ${profile.specialty} · A: ${nameOf(stateA)} · B: ${nameOf(stateB)}. Hover or focus a cell for exact values.`
              : 'No specialty selected.'}
          {hoverRow && status(hoverRow, minimum) === 'below threshold'
            ? ' Hidden by your filter, not missing data.'
            : ''}
          {profile && <a href="#geo-distribution">Inspect distribution ↓</a>}
        </output>
        <figcaption>
          Each row has its own national specialty benchmark; color compares
          relative differences, not absolute prices across specialties.{' '}
          {metric === 'opioidShare'
            ? 'Opioid differences use percentage points. Suppressed subgroup counts make reported shares conservative.'
            : 'Difference = (place value ÷ national specialty value − 1) × 100.'}
        </figcaption>
      </figure>

      {profile && (
        <>
          <figure className="studio-figure" id="geo-distribution">
            <div className="studio-figure-head">
              <div>
                <span>09 / INSPECT THE DISTRIBUTION</span>
                <h3>{profile.specialty}: is the difference unusual?</h3>
              </div>
              <label>
                Specialty
                <select
                  value={profile.specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p.specialty}>{p.specialty}</option>
                  ))}
                </select>
              </label>
              {canLog && (
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={log}
                    onChange={(e) => setLog(e.target.checked)}
                  />
                  Log scale
                </label>
              )}
              <button
                className="specialty-step"
                type="button"
                onClick={() =>
                  setSpecialty(
                    profiles[
                      (profiles.findIndex(
                        (p) => p.specialty === profile.specialty,
                      ) +
                        1) %
                        profiles.length
                    ].specialty,
                  )
                }
              >
                <FaIcon name="next" /> Next specialty
              </button>
            </div>
            <div className="swarm-summary">
              <b>
                {valid.length} of {locations.length} places pass the filter
              </b>
              <span>One dot = one place, not one provider</span>
              <span>Gray band = middle 50% of places</span>
            </div>
            <div className="selected-place-values">
              <span className="state-a">
                ● A · {nameOf(stateA)}: {selectedValue(stateA)}
              </span>
              <span className="state-b">
                ◆ B · {nameOf(stateB)}: {selectedValue(stateB)}
              </span>
            </div>
            {valid.length ? (
              <div className="studio-svg-scroll">
                <svg
                  viewBox={`0 0 940 ${height}`}
                  role="group"
                  aria-label={`${profile.specialty}, ${metricLabels[metric]} distribution, ${data.meta.year}, ${logarithmic ? 'log' : 'linear'} scale`}
                >
                  <text x="70" y="20" className="studio-axis-title">
                    {metricLabels[metric]} · {data.meta.year} ·{' '}
                    {logarithmic ? 'logarithmic' : 'linear'} scale
                  </text>
                  {q1 !== undefined && q3 !== undefined && (
                    <rect
                      x={x(q1)}
                      y="30"
                      width={Math.max(1, x(q3) - x(q1))}
                      height={axisY - 30}
                      fill="#edf0f6"
                    />
                  )}
                  <line
                    x1={x(national)}
                    x2={x(national)}
                    y1="30"
                    y2={axisY}
                    className="studio-national"
                  />
                  {dots.map((dot) => {
                    const row = valid.find((d) => d.code === dot.code)!;
                    const selected = dot.code === stateA || dot.code === stateB;
                    return (
                      <g
                        key={dot.code}
                        role="button"
                        tabIndex={0}
                        aria-label={cellDescription(profile, dot.code)}
                        aria-pressed={
                          dot.code === (target === 'A' ? stateA : stateB)
                        }
                        className="swarm-dot"
                        onMouseEnter={() =>
                          setHover({
                            specialty: profile.specialty,
                            code: dot.code,
                          })
                        }
                        onMouseLeave={() => setHover(null)}
                        onFocus={() =>
                          setHover({
                            specialty: profile.specialty,
                            code: dot.code,
                          })
                        }
                        onBlur={() => setHover(null)}
                        onClick={() => choose(profile.specialty, dot.code)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            choose(profile.specialty, dot.code);
                          }
                        }}
                      >
                        <circle
                          cx={dot.x}
                          cy={baseline + dot.y}
                          r="9"
                          fill="transparent"
                        />
                        {dot.code === stateB && dot.code !== stateA ? (
                          <path
                            className="swarm-mark"
                            d={`M${dot.x},${baseline + dot.y - 5}l5,5l-5,5l-5,-5Z`}
                            fill="#ac553e"
                            stroke="#203e36"
                            strokeWidth="2"
                          />
                        ) : (
                          <circle
                            className="swarm-mark"
                            cx={dot.x}
                            cy={baseline + dot.y}
                            r="5"
                            fill={
                              dot.code === stateA
                                ? '#497b91'
                                : dot.code === stateB
                                  ? '#ac553e'
                                  : '#00866a'
                            }
                            stroke={selected ? '#203e36' : '#fff'}
                            strokeWidth={selected ? 2 : 1}
                          />
                        )}
                        <title>
                          {nameOf(dot.code)}:{' '}
                          {valueLabel(metricValue(row, metric), metric)}
                        </title>
                      </g>
                    );
                  })}
                  {dots
                    .filter((dot) => dot.code === stateA || dot.code === stateB)
                    .map((dot) => {
                      const isA = dot.code === stateA;
                      const labelY = isA
                        ? baseline - amplitude - 8
                        : baseline + amplitude + 16;
                      return (
                        <g
                          key={`label-${dot.code}`}
                          pointerEvents="none"
                          aria-hidden="true"
                        >
                          <line
                            x1={dot.x}
                            x2={dot.x}
                            y1={baseline + dot.y + (isA ? -7 : 7)}
                            y2={labelY + (isA ? 5 : -12)}
                            stroke={isA ? '#497b91' : '#ac553e'}
                            strokeDasharray="2 3"
                            opacity="0.5"
                          />
                          <text
                            x={dot.x}
                            y={labelY}
                            textAnchor="middle"
                            className="swarm-place-label"
                          >
                            {isA ? 'A' : 'B'} · {dot.code}
                          </text>
                        </g>
                      );
                    })}
                  <line
                    x1="70"
                    x2="870"
                    y1={axisY}
                    y2={axisY}
                    className="studio-axis"
                  />
                  {ticks.map((tick) => (
                    <g key={tick}>
                      <line
                        x1={x(tick)}
                        x2={x(tick)}
                        y1={axisY}
                        y2={axisY + 6}
                        className="studio-axis"
                      />
                      <text
                        x={x(tick)}
                        y={axisY + 24}
                        textAnchor="middle"
                        className="studio-tick"
                      >
                        {metric === 'costPerClaim' ? '$' : ''}
                        {short.format(tick)}
                        {metric === 'opioidShare' ? '%' : ''}
                      </text>
                    </g>
                  ))}
                  <text x="70" y={height - 6} className="studio-axis-title">
                    Dashed line: national specialty aggregate{' '}
                    {valueLabel(national, metric)}
                  </text>
                </svg>
              </div>
            ) : (
              <p className="studio-empty">
                No places pass this threshold. Lower the minimum provider count
                to restore the distribution.
              </p>
            )}
            <output className="matrix-readout">
              {hoverProfile && hover && hover.specialty === profile.specialty
                ? cellDescription(profile, hover.code)
                : 'Click a dot to set a comparison place. Vertical displacement only separates overlapping dots; it does not encode another measure.'}
            </output>
            <figcaption>
              The band is the unweighted 25th–75th percentile across included
              places, not a confidence interval. The national line is a weighted
              aggregate from source totals, not the mean of state ratios.
              Excluding small groups is an exploration filter, not a statistical
              reliability guarantee.
            </figcaption>
          </figure>

          <figure className="studio-figure" id="geo-pair">
            <div className="studio-figure-head">
              <div>
                <span>10 / COMPARE LIKE WITH LIKE</span>
                <h3>
                  {nameOf(stateA)} vs. {nameOf(stateB)}
                </h3>
              </div>
              <p>
                <span className="state-a">● A · {stateA}</span>{' '}
                <span className="state-b">◆ B · {stateB}</span>
                <br />
                {pairMode === 'values'
                  ? 'Longest gaps first · click a row to inspect'
                  : 'Highest values first · follow a specialty across places'}
              </p>
            </div>
            <div
              className="compare-mode"
              role="group"
              aria-label="Comparison display"
            >
              <button
                type="button"
                aria-pressed={pairMode === 'values'}
                onClick={() => setPairMode('values')}
              >
                <FaIcon name="chart" /> Compare values
              </button>
              <button
                type="button"
                aria-pressed={pairMode === 'ranks'}
                onClick={() => setPairMode('ranks')}
              >
                <FaIcon name="compare" /> Compare ranks
              </button>
            </div>
            {stateA === stateB && (
              <p className="studio-empty">
                You selected the same place twice. Choose a different place for
                B to compare.
              </p>
            )}
            {pairMode === 'ranks' ? (
              <RankLadder
                profiles={profiles}
                stateA={stateA}
                stateB={stateB}
                metric={metric}
                minimum={minimum}
                year={data.meta.year}
                selected={profile.specialty}
                onSelect={setSpecialty}
              />
            ) : (
              <>
                {stateA !== stateB && (
                  <div className="pair-finding">
                    <b>
                      {comparable.length} of {profiles.length} specialties meet
                      the threshold in both places.
                    </b>
                    {widest ? (
                      <span>
                        Widest gap on this scale:{' '}
                        <button
                          type="button"
                          onClick={() =>
                            inspectDistribution(widest.p.specialty)
                          }
                        >
                          {widest.p.specialty}
                        </button>{' '}
                        — {stateA}:{' '}
                        {valueLabel(metricValue(widest.a!, metric), metric)};{' '}
                        {stateB}:{' '}
                        {valueLabel(metricValue(widest.b!, metric), metric)}.
                      </span>
                    ) : (
                      <span>
                        Lower the threshold or choose different places to
                        compare.
                      </span>
                    )}
                  </div>
                )}
                <div className="studio-svg-scroll">
                  <svg
                    viewBox={`0 0 1080 ${100 + pairRows.length * 34}`}
                    role="group"
                    aria-label={`Paired specialty differences: ${nameOf(stateA)} versus ${nameOf(stateB)}, ${metricLabels[metric]}, ${data.meta.year}`}
                  >
                    <text x="12" y="20" className="studio-axis-title">
                      Specialty · {data.meta.year}
                    </text>
                    <text
                      x="500"
                      y="20"
                      textAnchor="middle"
                      className="studio-axis-title"
                    >
                      Difference from national specialty value ({differenceUnit}
                      )
                    </text>
                    <text
                      x="920"
                      y="20"
                      textAnchor="middle"
                      className="studio-axis-title"
                    >
                      Exact {metricLabels[metric].toLowerCase()} · A / B
                    </text>
                    {pairX.ticks(5).map((tick) => (
                      <g key={tick}>
                        <line
                          x1={pairX(tick)}
                          x2={pairX(tick)}
                          y1="45"
                          y2={65 + pairRows.length * 34}
                          className={
                            tick === 0 ? 'studio-national' : 'gridline'
                          }
                        />
                        <text
                          x={pairX(tick)}
                          y="40"
                          textAnchor="middle"
                          className="studio-tick"
                        >
                          {tick > 0 ? '+' : ''}
                          {short.format(tick)}
                        </text>
                      </g>
                    ))}
                    {pairRows.map(({ p, a, b, da, db }, index) => {
                      const y = 68 + index * 34;
                      return (
                        <g
                          key={p.specialty}
                          className="pair-chart-row"
                          role="button"
                          tabIndex={0}
                          aria-pressed={p.specialty === profile.specialty}
                          aria-label={`${cellDescription(p, stateA)}. ${cellDescription(p, stateB)}`}
                          onClick={() => inspectDistribution(p.specialty)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              inspectDistribution(p.specialty);
                            }
                          }}
                        >
                          <rect
                            x="0"
                            y={y - 16}
                            width="1080"
                            height="33"
                            fill={
                              p.specialty === profile.specialty
                                ? '#e7eee5'
                                : 'transparent'
                            }
                          />
                          <text x="12" y={y + 4} className="pair-name">
                            {p.specialty}
                          </text>
                          {da !== null && db !== null && (
                            <line
                              x1={pairX(da)}
                              x2={pairX(db)}
                              y1={y}
                              y2={y}
                              stroke="#8994aa"
                              strokeWidth="3"
                            />
                          )}
                          {da !== null && (
                            <circle
                              cx={pairX(da)}
                              cy={y}
                              r="5"
                              fill="#497b91"
                              stroke="#fff"
                            />
                          )}
                          {db !== null && (
                            <path
                              d={`M${pairX(db)},${y - 6}l6,6l-6,6l-6,-6Z`}
                              fill="#ac553e"
                              stroke="#fff"
                            />
                          )}
                          <text x="808" y={y + 4} className="pair-value">
                            {a && da !== null
                              ? valueLabel(metricValue(a, metric), metric)
                              : status(a, minimum)}
                          </text>
                          <text x="956" y={y + 4} className="pair-value">
                            {b && db !== null
                              ? valueLabel(metricValue(b, metric), metric)
                              : status(b, minimum)}
                          </text>
                        </g>
                      );
                    })}
                    <text
                      x="260"
                      y={90 + pairRows.length * 34}
                      className="studio-axis-title"
                    >
                      ← Below national
                    </text>
                    <text
                      x="740"
                      y={90 + pairRows.length * 34}
                      textAnchor="end"
                      className="studio-axis-title"
                    >
                      Above national →
                    </text>
                  </svg>
                </div>
                <figcaption>
                  Every row compares the same specialty between two places.
                  Connecting lines show differences, not movement over time or
                  causation. Missing and filtered values are labeled instead of
                  plotted as zero. These measures do not assess care quality.
                </figcaption>
              </>
            )}
          </figure>
        </>
      )}
      <EvidenceNote
        settings={capturedSettings}
        onRestore={restore}
        year={data.meta.year}
        context={evidenceContext}
        summary={comparisonCardSummary(
          profile,
          metric,
          minimum,
          [stateA, stateB],
          nameOf,
        )}
      />
      <details className="studio-methods">
        <summary>How to read these views · data and calculation notes</summary>
        <p>
          Source: CMS Medicare Part D Prescribers by Provider, {data.meta.year}.
          State profiles cover the 18 highest-total-cost national specialties.
          The scatterplot’s top-32-per-geography subset is different. Foreign,
          unknown, armed-forces and freely associated state codes are not
          plotted here; they remain in national benchmarks.
        </p>
        <p>
          Cost per claim divides total drug cost by total claims; claims per
          provider divides claims by provider-record count. Opioid share uses
          reported claims and can be understated by suppression. Cost excludes
          manufacturer rebates. A place is an aggregate, not a typical provider
          or patient.
        </p>
        <p>
          Dots use deterministic collision avoidance without changing their
          horizontal values. All three views share the measure, coverage
          threshold and comparison places. The CSV preserves source/year,
          benchmark, units and inclusion status for every displayed
          specialty/place.
        </p>
      </details>
    </section>
  );
}
