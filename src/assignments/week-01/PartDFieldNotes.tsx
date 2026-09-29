'use client';

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Focusable table region supports keyboard horizontal scrolling. */
/* oxlint-disable next/no-html-link-for-pages -- Relative URLs below link to static data files, not application routes. */

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExplorerOpening } from '@/components/explorer-opening';
import { SiteHeader } from '@/components/site-header';
import { ExplorerSearch } from '@/components/explorer-search';
import { STATE_CODES, TERRITORY_CODES } from '@/lib/geography-analysis';
import type { WonderMode } from '@/lib/explorer-navigation';
import { ReadingNav } from '@/components/reading-nav';
import { FaIcon } from '@/components/fa-icon';
import { scrollToSection } from '@/lib/scroll-to-section';
import {
  CategorySharePlot,
  ConcentrationCurve,
  CostProviderBalance,
  DistributionHistogram,
  FieldMissingnessPlot,
  FieldTypeBars,
  SpecialtyComposition,
  SpecialtyFingerprint,
  SpecialtyRanking,
  type ConcentrationMetric,
  type RankMetric,
} from './analysis-charts';
import { ScrollStory } from '@/components/analysis/scroll-story';
import { WonderLab } from '@/components/analysis/wonder-lab';
import { ProjectV1 } from '../week-06/ProjectV1';
import {
  defaultComparison,
  readComparisonLink,
} from '@/lib/comparison-settings';
import {
  InteractionScatter,
  type AxisScale,
  type ZoomLevel,
} from '../week-05/InteractionScatter';
import {
  compact,
  dollars,
  money,
  percent,
  type Dataset,
} from '@/lib/prescriber';

type Lens = 'economics' | 'categories';

export default function PartDFieldNotes() {
  const [wonderMode, setWonderMode] = useState<WonderMode>('map');
  const [searchOpen, setSearchOpen] = useState(false);
  const [data, setData] = useState<Dataset | null>(null);
  const [areaCode, setAreaCode] = useState('US');
  const [lens, setLens] = useState<Lens>('economics');
  const [axisScale, setAxisScale] = useState<AxisScale>('log');
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const [zoomTarget, setZoomTarget] = useState('');
  const [selected, setSelected] = useState('');
  const [comparisonSettings, setComparisonSettings] =
    useState(defaultComparison);
  const [comparisonNotice, setComparisonNotice] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [rankMetric, setRankMetric] = useState<RankMetric>('cost');
  const [concentrationMetric, setConcentrationMetric] =
    useState<ConcentrationMetric>('cost');
  const [distribution, setDistribution] = useState('claims');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('./data/prescriber-summary/summary.json', {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Dataset unavailable');
        return r.json();
      })
      .then((raw) => {
        const payload = raw as Dataset;
        try {
          const settings = readComparisonLink(window.location.search, payload);
          if (settings) {
            setComparisonSettings(settings);
            setComparisonNotice(
              'Shared comparison restored. All comparison filters and places are ready.',
            );
          } else setComparisonSettings(defaultComparison(payload.meta.year));
        } catch (error) {
          setComparisonNotice(
            `${error instanceof Error ? error.message : 'This comparison link could not be read.'} The default workspace is available below.`,
          );
        }
        setData(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!data) return;
    // Anchors do not exist during the initial data-loading render.
    const navigate = () =>
      scrollToSection(window.location.hash.slice(1), { behavior: 'instant' });
    const frame = requestAnimationFrame(navigate);
    const followAnchor = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href^="#"]')
          : null;
      const id = anchor?.hash.slice(1);
      if (!id || !document.getElementById(id)) return;
      event.preventDefault();
      if (window.location.hash !== anchor!.hash)
        window.history.pushState(null, '', anchor!.hash);
      scrollToSection(id);
      anchor?.closest('details.header-resources')?.removeAttribute('open');
    };
    window.addEventListener('hashchange', navigate);
    document.addEventListener('click', followAnchor);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', navigate);
      document.removeEventListener('click', followAnchor);
    };
  }, [data]);
  const area = useMemo(
    () => data?.areas.find((d) => d.code === areaCode) ?? data?.areas[0],
    [data, areaCode],
  );
  const specialty =
    area?.specialties.find((d) => d.specialty === selected) ??
    area?.specialties[0];

  useEffect(() => {
    if (!data || !document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const validAreas = new Set(data.areas.map((d) => d.code));
    void Promise.resolve(
      document.modelContext.registerTool(
        {
          name: 'set_prescriber_view',
          title: 'Set prescriber explorer view',
          description:
            'Change the visible geography and analytical lens in the Medicare Part D explorer.',
          inputSchema: {
            type: 'object',
            properties: {
              geography: { type: 'string' },
              lens: { type: 'string', enum: ['economics', 'categories'] },
            },
            required: ['geography', 'lens'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const v = input as { geography?: unknown; lens?: unknown };
            if (typeof v.geography !== 'string' || !validAreas.has(v.geography))
              throw new Error('Unknown geography.');
            if (v.lens !== 'economics' && v.lens !== 'categories')
              throw new Error('Unknown lens.');
            setAreaCode(v.geography);
            setSelected((current) => {
              const next = data.areas.find(
                (item) => item.code === v.geography,
              )!;
              return next.specialties.some((item) => item.specialty === current)
                ? current
                : (next.specialties[0]?.specialty ?? '');
            });
            setLens(v.lens);
            setZoom(1);
            setZoomTarget('');
            return { geography: v.geography, lens: v.lens };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [data]);

  function changeArea(code: string) {
    const next = data?.areas.find((item) => item.code === code);
    if (!next) return;
    setAreaCode(code);
    setSelected((current) =>
      next.specialties.some((item) => item.specialty === current)
        ? current
        : (next.specialties[0]?.specialty ?? ''),
    );
    setZoom(1);
    setZoomTarget('');
  }

  if (loadError)
    return (
      <main className="loading">
        <div>
          <p>
            The dataset could not be loaded. Check your connection, then retry.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Retry loading
          </button>
        </div>
      </main>
    );
  if (!data || !area || !specialty)
    return <main className="loading">Loading prescriber data…</main>;

  return (
    <main className="explorer-refresh">
      <a className="skip-link" href="#explorer-chart">
        Skip to charts
      </a>
      <SiteHeader onSearch={() => setSearchOpen(true)} />
      <ExplorerOpening
        data={data}
        area={area}
        onArea={changeArea}
        onMap={() => {
          setWonderMode('map');
          requestAnimationFrame(() =>
            scrollToSection(
              area.code === 'US' || STATE_CODES.has(area.code)
                ? 'wonder-stage'
                : 'explorer-chart',
            ),
          );
        }}
      />

      <ReadingNav>
        <ExplorerSearch
          data={data}
          area={area}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onArea={changeArea}
          onSelect={(name) => {
            setSelected(name);
            setZoom(1);
          }}
          onMode={setWonderMode}
        />
      </ReadingNav>
      <section id="week-3" className="section-wrap">
        <div className="story-question assignment-question">
          <b>
            <span className="chapter-icon">
              <FaIcon name="chart" />
            </span>{' '}
            SPECIALTY COMPARISON
          </b>
          <h2>Cost and prescribing volume</h2>
          <p>
            {area.name} · Up to 32 highest-cost specialties. Select a point to
            inspect its values, or select a group to compare.
          </p>
        </div>
        <div className="control-rail" id="explorer-chart">
          <div className="control-field">
            <span>
              <FaIcon name="place" /> GEOGRAPHY
            </span>
            <select
              aria-label="Geography"
              value={areaCode}
              onChange={(event) => changeArea(event.target.value)}
            >
              {data.areas.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="control-field">
            <span>
              <FaIcon name="tune" /> VIEW
            </span>
            <Tabs
              value={lens}
              onValueChange={(v) => {
                setLens(v as Lens);
                setZoom(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="economics">
                  <FaIcon name="cost" /> Cost × volume
                </TabsTrigger>
                <TabsTrigger value="categories">
                  <FaIcon name="clinical" /> Drug categories
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {lens === 'economics' && (
            <div className="control-field">
              <span>
                <FaIcon name="chart" /> AXIS SCALE
              </span>
              <Tabs
                value={axisScale}
                onValueChange={(v) => {
                  setAxisScale(v as AxisScale);
                  setZoom(1);
                }}
              >
                <TabsList>
                  <TabsTrigger value="log">Log</TabsTrigger>
                  <TabsTrigger value="linear">Linear</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          <div className="control-field">
            <span>
              <FaIcon name="inspect" /> ZOOM AROUND INSPECTED SPECIALTY
            </span>
            <Tabs
              value={String(zoom)}
              onValueChange={(v) => {
                setZoom(Number(v) as ZoomLevel);
                setZoomTarget(specialty.specialty);
              }}
            >
              <TabsList>
                <TabsTrigger value="1">1×</TabsTrigger>
                <TabsTrigger value="2">2×</TabsTrigger>
                <TabsTrigger value="4">4×</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p>
            <FaIcon name="info" /> Hover, focus, or click a circle for details.
          </p>
        </div>
        <div className="analysis-grid">
          <InteractionScatter
            key={area.code}
            specialties={area.specialties}
            geography={area.name}
            geographyCost={area.summary.cost}
            selected={specialty.specialty}
            onSelect={setSelected}
            lens={lens}
            axisScale={axisScale}
            zoom={zoom}
            zoomTarget={zoomTarget || specialty.specialty}
            onCompareGroup={(names) => {
              setComparisonSettings((current) => ({
                ...current,
                group: names,
                search: '',
              }));
              requestAnimationFrame(() => scrollToSection('place'));
            }}
          />
          <aside className="inspection">
            <span className="eyebrow">
              <FaIcon name="inspect" /> INSPECTED · {area.code}
            </span>
            <h2 key={specialty.specialty} className="selection-title">
              {specialty.specialty}
            </h2>
            <p>{area.name}</p>
            <div className="inspection-actions">
              <button
                type="button"
                onClick={() => {
                  const index = area.specialties.findIndex(
                    (item) => item.specialty === specialty.specialty,
                  );
                  setSelected(
                    area.specialties[(index + 1) % area.specialties.length]
                      .specialty,
                  );
                  setZoom(1);
                }}
              >
                <FaIcon name="next" /> Next specialty
              </button>
              <button
                type="button"
                onClick={() => {
                  const others = area.specialties.filter(
                    (item) => item.specialty !== specialty.specialty,
                  );
                  if (others.length)
                    setSelected(
                      others[Math.floor(Math.random() * others.length)]
                        .specialty,
                    );
                  setZoom(1);
                }}
              >
                <FaIcon name="shuffle" /> Random specialty
              </button>
              <a href="#mix">
                <FaIcon name="clinical" /> See clinical mix
              </a>
              {data.specialtyProfiles.some(
                (p) => p.specialty === specialty.specialty,
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    setComparisonSettings((current) => ({
                      ...current,
                      group: [specialty.specialty],
                      search: '',
                      specialty: specialty.specialty,
                      stateA:
                        STATE_CODES.has(area.code) ||
                        TERRITORY_CODES.has(area.code)
                          ? area.code
                          : current.stateA,
                      territories:
                        TERRITORY_CODES.has(area.code) || current.territories,
                    }));
                    requestAnimationFrame(() =>
                      scrollToSection('comparison-finder'),
                    );
                  }}
                >
                  <FaIcon name="compare" /> Find places to compare
                </button>
              )}
            </div>
            <dl>
              <div>
                <dt>
                  <FaIcon name="providers" /> Provider records
                </dt>
                <dd>{specialty.providers.toLocaleString()}</dd>
              </div>
              <div>
                <dt>
                  <FaIcon name="records" /> Total claims
                </dt>
                <dd>{compact.format(specialty.claims)}</dd>
              </div>
              <div>
                <dt>
                  <FaIcon name="cost" /> Total drug cost
                </dt>
                <dd>{money.format(specialty.cost)}</dd>
              </div>
              <div>
                <dt>
                  <FaIcon name="cost" /> Cost / claim
                </dt>
                <dd>{dollars.format(specialty.costPerClaim)}</dd>
              </div>
              <div>
                <dt>
                  <FaIcon name="providers" /> Claims / provider
                </dt>
                <dd>
                  {Math.round(
                    specialty.claims / specialty.providers,
                  ).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt>
                  <FaIcon name="clinical" /> Reported opioid share
                </dt>
                <dd>{percent.format(specialty.opioidShare)}%</dd>
              </div>
            </dl>
            <p className="note">
              Inspection follows one specialty; it does not change your
              comparison group. Provider means one CMS row/NPI record. Rates
              based on suppressed subgroup values are conservative.
            </p>
          </aside>
        </div>
      </section>

      <WonderLab
        mode={wonderMode}
        onMode={setWonderMode}
        data={data}
        area={area}
        selected={specialty.specialty}
        onSelect={setSelected}
        onArea={changeArea}
      />

      <ProjectV1
        data={data}
        settings={comparisonSettings}
        onSettings={setComparisonSettings}
        notice={comparisonNotice}
        onNotice={setComparisonNotice}
      />

      <section id="scale" className="section-wrap simple-views">
        <div className="story-question">
          <b>
            <span className="chapter-icon">
              <FaIcon name="cost" />
            </span>{' '}
            CONCENTRATION
          </b>
          <h2>Concentration by specialty</h2>
          <p>
            Hover or focus any mark to carry that specialty through the page.
          </p>
        </div>
        <div className="dual-controls">
          <div className="rank-controls">
            <span>CURVE</span>
            <Tabs
              value={concentrationMetric}
              onValueChange={(v) =>
                setConcentrationMetric(v as ConcentrationMetric)
              }
            >
              <TabsList>
                <TabsTrigger value="cost">
                  <FaIcon name="cost" /> Cost
                </TabsTrigger>
                <TabsTrigger value="claims">
                  <FaIcon name="records" /> Claims
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="rank-controls">
            <span>RANK</span>
            <Tabs
              value={rankMetric}
              onValueChange={(v) => setRankMetric(v as RankMetric)}
            >
              <TabsList>
                <TabsTrigger value="cost">
                  <FaIcon name="cost" /> Cost
                </TabsTrigger>
                <TabsTrigger value="claims">
                  <FaIcon name="records" /> Claims
                </TabsTrigger>
                <TabsTrigger value="providers">
                  <FaIcon name="providers" /> Providers
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="small-multiples">
          <ConcentrationCurve
            specialties={area.specialties}
            totals={area.summary}
            metric={concentrationMetric}
            selected={specialty.specialty}
            onSelect={setSelected}
          />
          <SpecialtyRanking
            specialties={area.specialties}
            metric={rankMetric}
            selected={specialty.specialty}
            onSelect={setSelected}
          />
        </div>
      </section>

      <section id="composition" className="section-wrap">
        <div className="story-question">
          <b>
            <span className="chapter-icon">
              <FaIcon name="share" />
            </span>{' '}
            COST SHARE
          </b>
          <h2>Cost share and provider share</h2>
          <p>
            These views compare specialty drug cost with provider-record counts.
          </p>
        </div>
        <div className="small-multiples">
          <SpecialtyComposition
            specialties={area.specialties}
            totalCost={area.summary.cost}
            selected={specialty.specialty}
            onSelect={setSelected}
          />
          <CostProviderBalance
            specialties={area.specialties}
            totalCost={area.summary.cost}
            totalProviders={area.summary.providers}
            selected={specialty.specialty}
            onSelect={setSelected}
          />
        </div>
      </section>

      <section id="mix" className="section-wrap mix-section">
        <div className="story-question">
          <b>
            <span className="chapter-icon">
              <FaIcon name="clinical" />
            </span>{' '}
            CLINICAL MIX
          </b>
          <h2>Drug categories by specialty</h2>
          <p>
            Category shares and percentiles are descriptive; they are not
            quality measures.
          </p>
        </div>
        <div className="small-multiples">
          <CategorySharePlot
            specialties={area.specialties}
            selected={specialty.specialty}
            onSelect={setSelected}
          />
          <SpecialtyFingerprint
            specialties={area.specialties}
            selected={specialty.specialty}
          />
        </div>
      </section>

      <section id="records" className="section-wrap provider-section">
        <div className="story-question">
          <b>
            <span className="chapter-icon">
              <FaIcon name="providers" />
            </span>{' '}
            PROVIDER RECORDS
          </b>
          <h2>Highest-cost provider records</h2>
          <p>{area.name}. Descriptive, not a performance ranking.</p>
        </div>
        <p className="table-scroll-note">
          Scroll the table horizontally on smaller screens to see every measure.
        </p>
        <section
          className="provider-table"
          tabIndex={0}
          aria-label="Provider records; scroll horizontally for all columns"
        >
          <table
            className="provider-data-table"
            aria-label="Highest cost provider records"
          >
            <thead>
              <tr>
                <th scope="col">Provider / specialty</th>
                <th scope="col">Claims</th>
                <th scope="col">Cost / claim</th>
                <th scope="col">Total drug cost</th>
              </tr>
            </thead>
            <tbody>
              {area.topProviders.slice(0, 10).map((p, i) => (
                <tr key={p.npi}>
                  <th scope="row">
                    <b>
                      {String(i + 1).padStart(2, '0')} · {p.name}
                    </b>
                    <small>
                      {p.specialty} · {p.city}, {p.state} · NPI {p.npi}
                    </small>
                  </th>
                  <td>{p.claims.toLocaleString()}</td>
                  <td>{dollars.format(p.costPerClaim)}</td>
                  <td>{money.format(p.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>

      <section id="data" className="section-wrap data-section">
        <div className="story-question assignment-question">
          <b>
            <span className="chapter-icon">
              <FaIcon name="data" />
            </span>{' '}
            SOURCE & COVERAGE
          </b>
          <h2>Data and limitations</h2>
          <p>
            {data.meta.rows.toLocaleString()} rows · {data.meta.columns}{' '}
            classified fields · full file, not a sample.
          </p>
        </div>
        <div className="source-summary" id="week-2">
          <p>
            <b>Coverage.</b> Specialty charts retain up to 32 highest-cost
            specialties per geography; state profiles cover the top 18 national
            specialties. Provider detail includes ten highest-cost records per
            geography.
          </p>
          <p>
            <b>Interpretation.</b> CMS suppresses some small subgroup counts.
            Reported drug-category shares are conservative lower bounds. Total
            drug cost includes payments by plans, beneficiaries, subsidies, and
            third parties; it excludes manufacturer rebates.
          </p>
        </div>
        <div className="data-controls">
          <span>DISTRIBUTION</span>
          <select
            aria-label="Distribution measure"
            value={distribution}
            onChange={(event) => setDistribution(event.target.value)}
          >
            {data.distributions.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="small-multiples">
          <DistributionHistogram data={data} active={distribution} />
          <FieldTypeBars data={data} />
        </div>
        <div className="single-chart">
          <FieldMissingnessPlot data={data} />
        </div>
        <p className="data-note">
          <a href="./data/prescriber-summary/README.md">
            Dataset documentation
          </a>{' '}
          ·{' '}
          <a href="./data/prescriber-summary/summary.json">
            Browser-ready JSON
          </a>
        </p>
      </section>

      <details className="optional-overview">
        <summary>
          Guided overview <span>How records, claims, and cost differ</span>
        </summary>
        <ScrollStory
          area={data.areas.find((item) => item.code === 'US') ?? data.areas[0]}
          onCompare={(names) => {
            setComparisonSettings((current) => ({
              ...current,
              group: names,
              search: '',
            }));
            requestAnimationFrame(() => scrollToSection('place'));
          }}
        />
      </details>

      <details className="course-index">
        <summary>
          <FaIcon name="book" /> Coursework trail{' '}
          <span>Weeks 01–06 · sources and assignment milestones</span>
        </summary>
        <nav className="week-directory" aria-label="Canvas assignment index">
          <a href="#week-1">
            <b>Week 01</b>
            <span>Repository Setup</span>
            <small>site shell · source files · deployment</small>
          </a>
          <a href="#week-2">
            <b>Week 02</b>
            <span>Load &amp; Summarize a Dataset</span>
            <small>row/column summary · field types · README</small>
          </a>
          <a href="#week-3">
            <b>Week 03</b>
            <span>First Visual</span>
            <small>Original D3 scatterplot</small>
          </a>
          <a href="#week-4">
            <b>Week 04</b>
            <span>Legibility revision</span>
            <small>axes · scale choice · zoom · validation</small>
          </a>
          <a href="#week-5">
            <b>Week 05</b>
            <span>Interaction &amp; updated sketches</span>
            <small>group selection · comparison · proposal</small>
          </a>
          <a href="#week-6">
            <b>Week 06</b>
            <span>Project V1</span>
            <small>guided comparisons · linked charts · field notebook</small>
          </a>
        </nav>
        <p className="revision-line" id="week-4">
          <b>WEEK 04 / LEGIBILITY</b>
          <span>
            Titles, readable axes, scale choice, and zoom.{' '}
            <a href="https://github.com/sd7777777/data-visualization-student-starter/blob/main/src/assignments/week-04/LegibilityScatter.tsx">
              Preserved Week 04 source
            </a>
            .
          </span>
        </p>
        <p className="revision-line" id="week-5">
          <b>WEEK 05 / INTERACTION</b>
          <span>
            Brush a group to compare specialties.{' '}
            <a href="https://github.com/sd7777777/data-visualization-student-starter/blob/main/src/assignments/week-05/InteractionScatter.tsx">
              New source
            </a>{' '}
            ·{' '}
            <a href="https://github.com/sd7777777/data-visualization-student-starter/blob/main/docs/PROJECT_DIRECTION.md">
              Updated proposal &amp; sketch
            </a>
            .
          </span>
        </p>
      </details>

      <section id="task-analysis" className="section-wrap task-analysis">
        <div className="task-analysis-head">
          <span>
            <span className="chapter-icon">
              <FaIcon name="tasks" />
            </span>{' '}
            PROJECT PLANNING
          </span>
          <h2>Task Analysis</h2>
          <p>
            Questions the explorer should help answer, independent of any
            particular chart form.
          </p>
        </div>
        <ol className="task-list">
          <li>
            <b>01</b>
            <div>
              <h3>Examine relationships</h3>
              <p>
                Determine whether prescribing volume and cost move together,
                then identify specialties that depart from the overall pattern.
              </p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <h3>Assess concentration</h3>
              <p>
                Identify which specialties account for the largest shares of
                claims and drug cost, and judge how concentrated those totals
                are.
              </p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <h3>Compare clinical mix</h3>
              <p>
                Compare reported drug-category shares across specialties and
                find unusually high, low, or contrasting patterns.
              </p>
            </div>
          </li>
          <li>
            <b>04</b>
            <div>
              <h3>Compare places</h3>
              <p>
                Determine how a selected specialty varies across states and
                identify places that differ meaningfully from the national
                benchmark.
              </p>
            </div>
          </li>
          <li>
            <b>05</b>
            <div>
              <h3>Investigate records</h3>
              <p>
                Find high-cost provider records and distinguish whether their
                totals are associated with claim volume, cost per claim, or
                specialty.
              </p>
            </div>
          </li>
          <li>
            <b>06</b>
            <div>
              <h3>Judge data fitness</h3>
              <p>
                Assess field types, missingness, suppression, and distributions
                before deciding which comparisons the data can support.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section
        id="validation"
        className="section-wrap task-analysis validation-section"
      >
        <div className="task-analysis-head">
          <span>
            <span className="chapter-icon">
              <FaIcon name="validate" />
            </span>{' '}
            WEEK 04 / CHAPTER 4
          </span>
          <h2>Validation</h2>
          <p>
            Four levels to test with a hypothetical healthcare analytics user;
            these checks are proposed, not completed.
          </p>
        </div>
        <ol className="task-list">
          <li>
            <b>01 · DOMAIN</b>
            <div>
              <h3>Is this the right problem?</h3>
              <p>
                Ask an analyst whether finding cost and volume differences by
                specialty and place supports a real research question. Confirm
                they would not mistake these measures for care quality.
              </p>
            </div>
          </li>
          <li>
            <b>02 · ABSTRACTION</b>
            <div>
              <h3>Are the data and tasks right?</h3>
              <p>
                Check that provider records, specialty aggregates, rates, and
                suppressed values match the questions “compare,” “rank,” and
                “find outliers.” Recalculate a few results from CMS rows.
              </p>
            </div>
          </li>
          <li>
            <b>03 · IDIOM</b>
            <div>
              <h3>Can people read and use it?</h3>
              <p>
                Give readers an outlier-finding task without instructions. Watch
                for confusion about circle area, log versus linear axes,
                national-relative heatmap colors, and what zoom changes.
              </p>
            </div>
          </li>
          <li>
            <b>04 · ALGORITHM</b>
            <div>
              <h3>Does it stay correct and responsive?</h3>
              <p>
                Compare preprocessing totals with the source file, test filters
                and zoom across geographies, and measure load and interaction
                time on a phone and laptop.
              </p>
            </div>
          </li>
        </ol>
        <p className="validation-source">
          Framework: Tamara Munzner,{' '}
          <a
            href="https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/"
            target="_blank"
            rel="noreferrer"
          >
            A Nested Model for Visualization Design and Validation
          </a>
          , and{' '}
          <a
            href="https://www.taylorfrancis.com/chapters/mono/10.1201/b17511-4/analysis-four-levels-validation-tamara-munzner"
            target="_blank"
            rel="noreferrer"
          >
            Chapter 4
          </a>
          .
        </p>
      </section>

      <footer>
        <p>
          Part D records cover prescriptions paid under the program, not a
          clinician’s full practice. Drug cost excludes manufacturer rebates.
        </p>
        <div>
          <a href="./downloads/part-d-prescriber-source.zip" download>
            <FaIcon name="download" /> Download site files (.zip)
          </a>
          <a
            href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider"
            target="_blank"
            rel="noreferrer"
          >
            CMS source
          </a>
          <a href="./data/open-source-notices.txt">Open-source credits</a>
        </div>
      </footer>
    </main>
  );
}
