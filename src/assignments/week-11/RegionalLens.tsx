'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- segmented controls and legend keys sit directly in flex and grid containers, which a fieldset would break; role="group" labels them. */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FaIcon } from '@/components/fa-icon';
import { costMultiple, type DrugMixData } from '@/lib/drug-mix';
import { csvCell } from '@/lib/geography-analysis';
import { dollars } from '@/lib/prescriber';
import {
  DEFAULT_SPECIALTY,
  MEASURES,
  clickAway,
  lensView,
  leaderTally,
  measureValue,
  nationalRow,
  parseLayout,
  parseMeasure,
  parseSort,
  regionTone,
  specialtyRows,
  stateAcross,
  stateTableRows,
  summaryValue,
  type LensLayout,
  type Measure,
  type RowSort,
} from '@/lib/regional-lens';
import {
  ALL_SPECIALTIES,
  MIN_REGION_STATES,
  TILE_GRID,
  emphasised,
  parseRegions,
  regionOf,
  togglePinned,
  type RegionId,
  type StatePoint,
} from '@/lib/regions';
import { RegionChart } from './RegionChart';
import { SpecialtyChart } from './SpecialtyChart';
import { StateCard } from './StateCard';
import { ToneMap, type ToneStep } from './ToneMap';
import { Glyph, pct, pct0, signedPoints, useWidth } from './shared';
import './regional-lens.css';

const IGNORE_CLICK_AWAY =
  'a,button,input,select,textarea,label,summary,details,[role="button"],.rl11-bar,.rl11-plot svg,.rl11-tiles,.rl11-matrix,.rl11-state';

type Preset = {
  label: string;
  specialty?: string;
  measure?: Measure;
  layout?: LensLayout;
  regions?: RegionId[];
  state?: string;
  sort?: RowSort;
};
const PRESETS: Preset[] = [
  { label: 'Psychiatry: South vs. West', specialty: 'Psychiatry', regions: ['south', 'west'] },
  { label: 'Urology: the Northeast stands apart', specialty: 'Urology', regions: ['northeast'] },
  { label: 'Georgia across every specialty', state: 'GA', sort: 'state' },
  { label: 'The same regions, by claims', measure: 'claims' },
];

/** Week 11: the regional lens rebuilt around the feedback on Week 10. */
export default function RegionalLens() {
  const [data, setData] = useState<DrugMixData | null | undefined>(undefined);
  const [specialty, setSpecialty] = useState(DEFAULT_SPECIALTY);
  const [measure, setMeasure] = useState<Measure>('cost');
  const [layout, setLayout] = useState<LensLayout>('strips');
  const [sort, setSort] = useState<RowSort>('spread');
  const [pinned, setPinned] = useState<RegionId[]>([]);
  const [hoverRegion, setHoverRegion] = useState<RegionId | null>(null);
  const [hoverState, setHoverState] = useState<string | null>(null);
  const [pinnedState, setPinnedState] = useState<string | null>(null);
  const [toneStep, setToneStep] = useState<ToneStep | null>(null);
  const [base, setBase] = useState('./');
  const [copied, setCopied] = useState(false);
  const [plotRef, plotWidth] = useWidth<HTMLDivElement>(780);

  // Load the data and restore a shared view.
  useEffect(() => {
    const root = location.pathname.replace(/week-11(?:\.html)?\/?$/, '');
    const params = new URLSearchParams(location.search);
    fetch(`${root}data/prescriber-summary/drug-mix.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<DrugMixData>;
      })
      .then((loaded) => {
        const wanted = params.get('s');
        if (wanted === ALL_SPECIALTIES || (wanted && loaded.specialties.includes(wanted)))
          setSpecialty(wanted);
        setMeasure(parseMeasure(params.get('m')));
        setLayout(parseLayout(params.get('view')));
        setSort(parseSort(params.get('sort')));
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
    if (specialty !== DEFAULT_SPECIALTY) params.set('s', specialty);
    if (measure !== 'cost') params.set('m', measure);
    if (layout !== 'strips') params.set('view', layout);
    if (pinned.length) params.set('regions', pinned.join(','));
    if (pinnedState) params.set('state', pinnedState);
    if (sort !== 'spread') params.set('sort', sort);
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }, [data, layout, measure, pinned, pinnedState, sort, specialty]);

  const clearAll = useCallback(() => {
    setPinned([]);
    setPinnedState(null);
    setHoverRegion(null);
    setToneStep(null);
  }, []);

  const selection = useRef({ pinnedState, pinned });
  useEffect(() => {
    selection.current = { pinnedState, pinned };
  }, [pinnedState, pinned]);
  const selectionClickAway = useCallback(() => {
    const next = clickAway(selection.current);
    setPinnedState(next.pinnedState);
    setPinned(next.pinned);
  }, []);

  // Escape clears everything. A click on empty space closes the topmost selection.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearAll();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest || target.closest(IGNORE_CLICK_AWAY)) return;
      if (window.getSelection && !window.getSelection()?.isCollapsed) return;
      selectionClickAway();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [clearAll, selectionClickAway]);

  const view = useMemo(
    () => (data ? lensView(data, specialty, measure) : null),
    [data, measure, specialty],
  );
  const national = useMemo(
    () => (data ? nationalRow(data, specialty) : null),
    [data, specialty],
  );
  const table = useMemo(() => (data ? specialtyRows(data, measure) : null), [data, measure]);
  const tallies = useMemo(
    () =>
      data
        ? {
            cost: leaderTally(specialtyRows(data, 'cost').rows),
            claims: leaderTally(specialtyRows(data, 'claims').rows),
          }
        : null,
    [data],
  );
  const across = useMemo(
    () =>
      data && table && pinnedState
        ? stateAcross(data, pinnedState, table.rows, measure, table.overall)
        : null,
    [data, measure, pinnedState, table],
  );
  const stateNames = useMemo(
    () =>
      data
        ? data.areas
            .filter((a) => regionOf(a.code))
            .map((a) => ({ code: a.code, name: a.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [data],
  );

  const lit = useMemo(
    () => (toneStep ? new Set<RegionId>([toneStep.region]) : emphasised(hoverRegion, pinned)),
    [hoverRegion, pinned, toneStep],
  );
  const isLit = useCallback((id: RegionId) => lit.size === 0 || lit.has(id), [lit]);
  const isStateLit = useCallback(
    (s: StatePoint) =>
      isLit(s.region.id) &&
      (!toneStep || !view || view.scale.step(measureValue(s.row, measure)) === toneStep.step),
    [isLit, measure, toneStep, view],
  );

  if (!data || !view || !national || !table || !tallies)
    return (
      <main className="rl11" aria-busy={data === undefined}>
        <p className="rl11-empty">
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
  const togglePin = (code: string) => setPinnedState((c) => (c === code ? null : code));
  const applyPreset = (preset: Preset) => {
    setSpecialty(preset.specialty ?? specialty);
    setMeasure(preset.measure ?? 'cost');
    setPinned(preset.regions ?? []);
    setPinnedState(preset.state ?? null);
    setSort(preset.sort ?? 'spread');
    setLayout('strips');
  };

  const allNational = nationalRow(data, ALL_SPECIALTIES)!;
  const scopeWord = specialty === ALL_SPECIALTIES ? '' : `${specialty} `;
  const ranked = view.summaries
    .filter((s) => summaryValue(s, measure) !== null)
    .sort((a, b) => summaryValue(b, measure)! - summaryValue(a, measure)!);

  const headline = (() => {
    const short = MEASURES[measure].short;
    if (lit.size === 1 && !toneStep) {
      const s = view.summaries.find((x) => lit.has(x.region.id))!;
      const value = summaryValue(s, measure);
      if (value === null)
        return `${specialty} in the ${s.region.name}: only ${s.count} ${s.count === 1 ? 'state has' : 'states have'} enough records for a comparison.`;
      return `${specialty} in the ${s.region.name}: median ${pct(value)} of ${short}, ${signedPoints(value - measureValue(national, measure))} vs. the U.S.`;
    }
    if (ranked.length < 2)
      return `Too few states have enough ${scopeWord}records to compare regions.`;
    const top = ranked[0];
    const low = ranked.at(-1)!;
    return `${specialty}: the ${top.region.name} has the highest median share of ${short} (${pct(summaryValue(top, measure)!)}), the ${low.region.name} the lowest (${pct(summaryValue(low, measure)!)}).`;
  })();

  const describeState = (s: StatePoint) => {
    const multiple = costMultiple(s.row);
    return `${s.name}, ${s.region.name}: brand-name drugs are ${pct(s.row.brandClaimShare)} of ${scopeWord}claims and ${pct(s.row.brandCostShare)} of drug cost.${multiple ? ` Brand-name cost per claim ${dollars.format(s.row.brandCostPerClaim!)}, generic cost per claim ${dollars.format(s.row.genericCostPerClaim!)}.` : ''}`;
  };

  const downloadCsv = () => {
    const header = ['state', 'census_region', 'specialty', 'year', 'provider_records', 'brand_share_of_claims_pct', 'brand_share_of_cost_pct', 'brand_cost_per_claim', 'generic_cost_per_claim', 'claim_coverage_pct'];
    const lines = stateTableRows(view).map((r) => [
      r.name,
      r.region.name,
      specialty,
      data.meta.year,
      r.records,
      Number((r.claimShare * 100).toFixed(2)),
      Number((r.costShare * 100).toFixed(2)),
      r.brandPerClaim === null ? null : Number(r.brandPerClaim.toFixed(2)),
      r.genericPerClaim === null ? null : Number(r.genericPerClaim.toFixed(2)),
      Number((r.coverage * 100).toFixed(2)),
    ]);
    const csv = [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `part-d-brand-share-by-state-${specialty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const lowCoverage = national.claimCoverage < 0.95;

  return (
    <main className="rl11">
      <header className="rl11-top">
        <a href={base}>← Explorer</a>
        <span>
          <a href={`${base}${process.env.NODE_ENV === 'development' ? 'week-10' : 'week-10.html'}`}>Week 10 version</a>
          <a href={`${base}#week-8`}>Week 8 original</a>
        </span>
      </header>

      <section className="rl11-intro" aria-labelledby="rl11-title">
        <p className="rl11-eyebrow">
          WEEK 11 · ITERATE YOUR PROJECT · CMS {data.meta.year}
        </p>
        <h1 id="rl11-title">Does the brand-name gap have a region?</h1>
        <p>
          Brand-name drugs are {pct0(allNational.brandClaimShare)} of Medicare Part D claims but {pct0(allNational.brandCostShare)} of drug cost. The South has the highest median share of <b>cost</b> in {tallies.cost.south} of {table.rows.length} specialties, but the highest share of <b>claims</b> in only {tallies.claims.south}.
        </p>
        <div className="rl11-presets" role="group" aria-label="Places to start">
          <span>Start with</span>
          {PRESETS.map((preset) => (
            <button key={preset.label} type="button" onClick={() => applyPreset(preset)}>
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <div className="rl11-bar">
        <label className="rl11-specialty">
          <span>Specialty</span>
          <span className="rl11-stepper">
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

        <div className="rl11-field">
          <span id="rl11-measure-label">Measure</span>
          <div className="rl11-seg" role="group" aria-labelledby="rl11-measure-label">
            {(['cost', 'claims'] as Measure[]).map((m) => (
              <button key={m} type="button" aria-pressed={measure === m} onClick={() => setMeasure(m)}>
                {m === 'cost' ? 'Drug cost' : 'Claims'}
              </button>
            ))}
          </div>
        </div>

        <div className="rl11-keys" role="group" aria-label="Census regions: hover to preview, click to keep highlighted">
          {view.summaries.map((s) => {
            const on = pinned.includes(s.region.id);
            const median = summaryValue(s, measure);
            const stops = Array.from({ length: 6 }, (_, i) => regionTone(s.region.color, i / 5)).join(',');
            return (
              <button
                key={s.region.id}
                type="button"
                className={`rl11-key${isLit(s.region.id) ? '' : ' dim'}${on ? ' on' : ''}`}
                style={{ '--region': s.region.color, '--ramp': `linear-gradient(90deg,${stops})` } as CSSProperties}
                aria-pressed={on}
                aria-label={`${s.region.name}: median ${median === null ? 'unavailable' : pct(median)}, ${s.count} states`}
                onMouseEnter={() => setHoverRegion(s.region.id)}
                onMouseLeave={() => setHoverRegion(null)}
                onFocus={() => setHoverRegion(s.region.id)}
                onBlur={() => setHoverRegion(null)}
                onClick={() => setPinned((p) => togglePinned(p, s.region.id))}
              >
                <span className="rl11-key-name">
                  <Glyph region={s.region} size={13} /> {s.region.name}
                  {on && <FaIcon name="check" />}
                </span>
                <span className="rl11-key-value">{median === null ? '—' : pct(median)}</span>
                <span className="rl11-key-ramp" aria-hidden="true">
                  {median !== null && <i style={{ left: `${view.scale.at(median) * 100}%` }} />}
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" className="rl11-quiet rl11-reset" onClick={clearAll} disabled={!pinned.length && !pinnedState}>
          <FaIcon name="reset" /> Show all
        </button>
      </div>
      <p className="rl11-hint">
        Hover a region to preview, click to keep. Click empty space to clear the last selection, or press Esc to clear everything.
      </p>

      <div className="rl11-grid">
        <figure className="rl11-card rl11-main">
          <div className="rl11-main-head">
            <div>
              <span className="rl11-eyebrow">ACROSS STATES</span>
              <h2 aria-live="polite">{headline}</h2>
              <p>
                {layout === 'strips'
                  ? `Each mark is a state. The shaded band is the middle half of a region’s states and the thick line its median.`
                  : `Each mark is a state. Along the edges, each region’s line is its full range, the bar its middle half and the tick its median.`}
                {view.hidden > 0 &&
                  ` ${view.hidden} ${view.hidden === 1 ? 'state has' : 'states have'} fewer than 50 ${scopeWord}records and ${view.hidden === 1 ? 'is' : 'are'} not plotted.`}
                {lowCoverage &&
                  ` CMS suppresses generic values for ${pct0(1 - national.claimCoverage)} of these claims, so read this specialty with care.`}
              </p>
            </div>
            <div className="rl11-field">
              <span id="rl11-layout-label">Layout</span>
              <div className="rl11-seg" role="group" aria-labelledby="rl11-layout-label">
                <button type="button" aria-pressed={layout === 'strips'} onClick={() => setLayout('strips')}>
                  By region
                </button>
                <button type="button" aria-pressed={layout === 'scatter'} onClick={() => setLayout('scatter')}>
                  Claims vs. cost
                </button>
              </div>
            </div>
          </div>
          <div className="rl11-plot-wrap" ref={plotRef}>
            <RegionChart
              view={view}
              national={national}
              measure={measure}
              layout={layout}
              specialty={specialty}
              width={plotWidth}
              isLit={isLit}
              isStateLit={isStateLit}
              litRegions={toneStep ? new Set() : lit}
              hoverCode={hoverState}
              pinnedCode={pinnedState}
              onHover={setHoverState}
              onTogglePin={togglePin}
              onClickAway={selectionClickAway}
            />
          </div>
        </figure>

        <div className="rl11-side">
          <ToneMap
            view={view}
            measure={measure}
            specialty={specialty}
            focusCode={hoverState ?? pinnedState}
            pinnedCode={pinnedState}
            isStateLit={isStateLit}
            isRegionLit={isLit}
            toneStep={toneStep}
            describeState={describeState}
            onHoverState={setHoverState}
            onTogglePin={togglePin}
            onToneStep={setToneStep}
          />

          <StateCard
            view={view}
            national={national}
            measure={measure}
            specialty={specialty}
            across={across}
            rowCount={table.rows.length}
            pinnedCode={pinnedState}
            stateNames={stateNames}
            onPick={setPinnedState}
            onClose={() => setPinnedState(null)}
          />
        </div>
      </div>

      <SpecialtyChart
        overall={table.overall}
        rows={table.rows}
        skipped={table.skipped}
        measure={measure}
        specialty={specialty}
        sort={sort === 'state' && !across ? 'spread' : sort}
        across={across}
        pinnedCode={pinnedState}
        stateNames={stateNames}
        isLit={isLit}
        onSpecialty={setSpecialty}
        onSort={setSort}
        onPick={setPinnedState}
      />

      <details className="rl11-card rl11-table">
        <summary>
          <FaIcon name="records" /> Table of all {view.states.length} plotted states
        </summary>
        <div className="rl11-table-tools">
          <button type="button" className="rl11-quiet" onClick={downloadCsv}>
            <FaIcon name="download" /> Download CSV
          </button>
          <button
            type="button"
            className="rl11-quiet"
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
        <div className="rl11-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">State</th>
                <th scope="col">Region</th>
                <th scope="col">Records</th>
                <th scope="col">Brand-name share of claims</th>
                <th scope="col">Brand-name share of cost</th>
                <th scope="col">Brand-name cost per claim</th>
                <th scope="col">Generic cost per claim</th>
              </tr>
            </thead>
            <tbody>
              {stateTableRows(view)
                .filter((s) => isLit(s.region.id))
                .map((s) => (
                  <tr key={s.code}>
                    <th scope="row">{s.name}</th>
                    <td>
                      <Glyph region={s.region} size={12} /> {s.region.name}
                    </td>
                    <td>{s.records.toLocaleString('en-US')}</td>
                    <td>{pct(s.claimShare)}</td>
                    <td>{pct(s.costShare)}</td>
                    <td>{s.brandPerClaim === null ? '—' : dollars.format(s.brandPerClaim)}</td>
                    <td>{s.genericPerClaim === null ? '—' : dollars.format(s.genericPerClaim)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>

      <section className="rl11-notes" aria-label="What changed and data notes">
        <div>
          <b>What changed from Week 10</b>
          <ul>
            <li>The map now uses hue for the region and lightness for the value, on one scale across regions. Its legend also counts the states in each step.</li>
            <li>Regions get their own rows, so tight clusters no longer hide the pattern. The Week 10 scatterplot is one click away, and marks glide between the two. It now shows each region’s distribution along both axes.</li>
            <li>A pinned state stays in view and carries into the chart of every specialty, against all four regional medians.</li>
            <li>Clicking empty space clears a selection, and per-claim costs are labeled brand-name and generic.</li>
            <li>A measure switch compares cost share with claim share across the whole page.</li>
          </ul>
        </div>
        <div>
          <b>Data</b>
          <p>
            CMS Medicare Part D Prescribers by Provider, {data.meta.year}. Brand-name follows CMS: New Drug Application and Biologics License Application products, including authorized generics and CMS’s small “other” category. Drug cost is gross of manufacturer rebates, which mainly reduce brand-name cost. Records with suppressed generic values are excluded. States need 50+ provider records to be plotted and a region needs {MIN_REGION_STATES}+ plotted states for a median.
          </p>
          <p>
            Medians count each state once, while the U.S. figure pools all claims. Lightness spans the 5th to 95th percentile of plotted states in the current view. These are descriptive differences between places, not evidence about why prescribing differs or whether a generic was available or appropriate.
          </p>
          <p>
            <a href="https://github.com/sd7777777/data-visualization-student-starter/tree/main/src/assignments/week-11">
              Source and method <FaIcon name="external" />
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
