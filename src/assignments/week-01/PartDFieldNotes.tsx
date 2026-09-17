'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteHeader } from '@/components/site-header';
import { CategorySharePlot, ConcentrationCurve, CostProviderBalance, DistributionHistogram, FieldMissingnessPlot, FieldTypeBars, SpecialtyComposition, SpecialtyFingerprint, SpecialtyRanking, StateComparison, StateTileMap, type ConcentrationMetric, type Metric, type RankMetric } from './analysis-charts';
import { LegibilityScatter, type AxisScale, type ZoomLevel } from '../week-04/LegibilityScatter';
import { compact, dollars, money, percent, type Dataset } from '@/lib/prescriber';

type Lens = 'economics' | 'categories';

export default function PartDFieldNotes() {
  const [data, setData] = useState<Dataset | null>(null);
  const [areaCode, setAreaCode] = useState('US');
  const [lens, setLens] = useState<Lens>('economics');
  const [axisScale, setAxisScale] = useState<AxisScale>('log');
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const [zoomTarget, setZoomTarget] = useState('');
  const [selected, setSelected] = useState('');
  const [profileName, setProfileName] = useState('Nurse Practitioner');
  const [metric, setMetric] = useState<Metric>('costPerClaim');
  const [rankMetric, setRankMetric] = useState<RankMetric>('cost');
  const [concentrationMetric, setConcentrationMetric] = useState<ConcentrationMetric>('cost');
  const [distribution, setDistribution] = useState('claims');
  const [selectedState, setSelectedState] = useState('CA');
  useEffect(() => { void fetch('./data/prescriber-summary/summary.json').then((r) => r.json()).then((payload) => setData(payload as Dataset)); }, []);
  const area = useMemo(() => data?.areas.find((d) => d.code === areaCode) ?? data?.areas[0], [data, areaCode]);
  const specialty = area?.specialties.find((d) => d.specialty === selected) ?? area?.specialties[0];
  const profile = data?.specialtyProfiles.find((d) => d.specialty === profileName) ?? data?.specialtyProfiles[0];
  const activeState = profile?.states.some((d) => d.code === selectedState) ? selectedState : (profile?.states[0]?.code ?? '');

  useEffect(() => {
    if (!data || !document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const validAreas = new Set(data.areas.map((d) => d.code));
    void Promise.resolve(document.modelContext.registerTool({
      name: 'set_prescriber_view', title: 'Set prescriber explorer view', description: 'Change the visible geography and analytical lens in the Medicare Part D explorer.',
      inputSchema: { type: 'object', properties: { geography: { type: 'string' }, lens: { type: 'string', enum: ['economics', 'categories'] } }, required: ['geography', 'lens'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) { const v = input as { geography?: unknown; lens?: unknown }; if (typeof v.geography !== 'string' || !validAreas.has(v.geography)) throw new Error('Unknown geography.'); if (v.lens !== 'economics' && v.lens !== 'categories') throw new Error('Unknown lens.'); setAreaCode(v.geography); setLens(v.lens); return { geography: v.geography, lens: v.lens }; },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [data]);

  if (!data || !area || !specialty || !profile) return <main className="loading">READING 1,416,883 CMS RECORDS…</main>;

  return <main>
    <SiteHeader />
    <section className="masthead">
      <div><p className="kicker">WEEK 01 · REPOSITORY SETUP</p><h1>Prescriber explorer</h1></div>
      <p className="standfirst">Explore 1.4 million provider records by specialty and state. Values describe Medicare Part D activity, not quality of care.</p>
    </section>

    <nav className="week-directory" aria-label="Canvas assignment index">
      <a href="#week-1"><b>Week 01</b><span>Repository Setup</span><small>site shell · source files · deployment</small></a>
      <a href="#week-2"><b>Week 02</b><span>Load &amp; Summarize a Dataset</span><small>row/column summary · field types · README</small></a>
      <a href="#week-3"><b>Week 03</b><span>First Visual</span><small>Original D3 scatterplot</small></a>
      <a href="#week-4"><b>Week 04</b><span>Legibility revision</span><small>axes · scale choice · zoom · validation</small></a>
    </nav>

    <section className="week-two-summary" id="week-2">
      <div className="assignment-band"><b>WEEK 02</b><span>Load &amp; Summarize a Dataset</span><a href="#data">open full data summary ↓</a></div>
      <div className="stat-strip" aria-label="Dataset overview"><div><span>Provider records</span><strong>{area.summary.providers.toLocaleString()}</strong></div><div><span>Claims</span><strong>{compact.format(area.summary.claims)}</strong></div><div><span>Drug cost</span><strong>{money.format(area.summary.cost)}</strong></div><div><span>Source fields</span><strong>{data.meta.columns}</strong></div><div><span>Browser file</span><strong>608 KB</strong></div></div>
    </section>

    <nav className="section-directory" aria-label="Explorer sections"><span>project extensions:</span><a href="#scale">scale</a><a href="#composition">composition</a><a href="#mix">clinical mix</a><a href="#place">geography</a><a href="#records">records</a><a href="#data">data quality</a><a href="#task-analysis">task analysis</a><a href="#validation">validation</a></nav>

    <section id="week-3" className="section-wrap">
      <div className="story-question assignment-question"><b>WEEK 03 / FIRST VISUAL</b><h2>How do price and prescribing volume relate?</h2><p>The <a href="https://github.com/sd7777777/data-visualization-student-starter/blob/main/src/assignments/week-01/analysis-charts.tsx" target="_blank" rel="noreferrer">original chart source</a> is preserved; the visible chart is the Week 04 revision below.</p></div>
      <p className="revision-line" id="week-4"><b>WEEK 04 / LEGIBILITY REVISION</b><span>Read the plot on its own; switch scales to check whether the apparent relationship changes.</span></p>
      <div className="control-rail">
        <div className="control-field"><span>GEOGRAPHY</span><Select value={areaCode} onValueChange={(v) => { setAreaCode(v ?? 'US'); setZoom(1); }}><SelectTrigger aria-label="Geography"><SelectValue/></SelectTrigger><SelectContent>{data.areas.map((d) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="control-field"><span>VIEW</span><Tabs value={lens} onValueChange={(v) => { setLens(v as Lens); setZoom(1); }}><TabsList><TabsTrigger value="economics">Cost × volume</TabsTrigger><TabsTrigger value="categories">Drug categories</TabsTrigger></TabsList></Tabs></div>
        {lens === 'economics' && <div className="control-field"><span>AXIS SCALE</span><Tabs value={axisScale} onValueChange={(v) => { setAxisScale(v as AxisScale); setZoom(1); }}><TabsList><TabsTrigger value="log">Log</TabsTrigger><TabsTrigger value="linear">Linear</TabsTrigger></TabsList></Tabs></div>}
        <div className="control-field"><span>ZOOM AROUND SELECTION</span><Tabs value={String(zoom)} onValueChange={(v) => { setZoom(Number(v) as ZoomLevel); setZoomTarget(specialty.specialty); }}><TabsList><TabsTrigger value="1">1×</TabsTrigger><TabsTrigger value="2">2×</TabsTrigger><TabsTrigger value="4">4×</TabsTrigger></TabsList></Tabs></div>
        <p>Hover, focus, or click a circle for details.</p>
      </div>
      <div className="analysis-grid">
        <LegibilityScatter specialties={area.specialties} geography={area.name} selected={specialty.specialty} onSelect={setSelected} lens={lens} axisScale={axisScale} zoom={zoom} zoomTarget={zoomTarget || specialty.specialty}/>
        <aside className="inspection"><span className="eyebrow">SELECTED · {area.code}</span><h2>{specialty.specialty}</h2><p>{area.name}</p><dl>
          <div><dt>Provider records</dt><dd>{specialty.providers.toLocaleString()}</dd></div><div><dt>Total claims</dt><dd>{compact.format(specialty.claims)}</dd></div><div><dt>Total drug cost</dt><dd>{money.format(specialty.cost)}</dd></div><div><dt>Cost / claim</dt><dd>{dollars.format(specialty.costPerClaim)}</dd></div><div><dt>Claims / provider</dt><dd>{Math.round(specialty.claims / specialty.providers).toLocaleString()}</dd></div><div><dt>Reported opioid share</dt><dd>{percent.format(specialty.opioidShare)}%</dd></div>
        </dl><p className="note">Provider means one CMS row/NPI record. Rates based on suppressed subgroup values are conservative.</p></aside>
      </div>
    </section>

    <section id="scale" className="section-wrap simple-views">
      <div className="story-question"><b>EXTENSION / SCALE</b><h2>How concentrated are cost and claims?</h2><p>Hover or focus any mark to carry that specialty through the page.</p></div>
      <div className="dual-controls"><div className="rank-controls"><span>CURVE</span><Tabs value={concentrationMetric} onValueChange={(v) => setConcentrationMetric(v as ConcentrationMetric)}><TabsList><TabsTrigger value="cost">Cost</TabsTrigger><TabsTrigger value="claims">Claims</TabsTrigger></TabsList></Tabs></div><div className="rank-controls"><span>RANK</span><Tabs value={rankMetric} onValueChange={(v) => setRankMetric(v as RankMetric)}><TabsList><TabsTrigger value="cost">Cost</TabsTrigger><TabsTrigger value="claims">Claims</TabsTrigger><TabsTrigger value="providers">Providers</TabsTrigger></TabsList></Tabs></div></div>
      <div className="small-multiples"><ConcentrationCurve specialties={area.specialties} totals={area.summary} metric={concentrationMetric} selected={specialty.specialty} onSelect={setSelected}/><SpecialtyRanking specialties={area.specialties} metric={rankMetric} selected={specialty.specialty} onSelect={setSelected}/></div>
    </section>

    <section id="composition" className="section-wrap">
      <div className="story-question"><b>EXTENSION / COMPOSITION</b><h2>Which specialties account for a disproportionate share of cost?</h2><p>These views compare specialty drug cost with provider-record counts.</p></div>
      <div className="small-multiples"><SpecialtyComposition specialties={area.specialties} totalCost={area.summary.cost} selected={specialty.specialty} onSelect={setSelected}/><CostProviderBalance specialties={area.specialties} totalCost={area.summary.cost} totalProviders={area.summary.providers} selected={specialty.specialty} onSelect={setSelected}/></div>
    </section>

    <section id="mix" className="section-wrap mix-section">
      <div className="story-question"><b>EXTENSION / CLINICAL MIX</b><h2>How does the selected specialty differ from the field?</h2><p>Category shares and percentiles are descriptive; they are not quality measures.</p></div>
      <div className="small-multiples"><CategorySharePlot specialties={area.specialties} selected={specialty.specialty} onSelect={setSelected}/><SpecialtyFingerprint specialties={area.specialties} selected={specialty.specialty}/></div>
    </section>

    <section id="place" className="section-wrap story-section">
      <div className="story-question"><b>EXTENSION / GEOGRAPHY</b><h2>Where do state-level values differ?</h2><p>Choose a specialty and measure. Higher means more of the selected measure, not better care.</p></div>
      <div className="control-rail two-up">
        <div className="control-field"><span>SPECIALTY</span><Select value={profile.specialty} onValueChange={(v) => setProfileName(v ?? profile.specialty)}><SelectTrigger aria-label="Specialty"><SelectValue/></SelectTrigger><SelectContent>{data.specialtyProfiles.map((d) => <SelectItem key={d.specialty} value={d.specialty}>{d.specialty}</SelectItem>)}</SelectContent></Select></div>
        <div className="control-field"><span>MEASURE</span><Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}><TabsList><TabsTrigger value="costPerClaim">Cost / claim</TabsTrigger><TabsTrigger value="claimsPerProvider">Claims / provider</TabsTrigger><TabsTrigger value="opioidShare">Opioid share</TabsTrigger></TabsList></Tabs></div>
      </div>
      <div className="geography-views"><StateTileMap profile={profile} metric={metric} selected={activeState} onSelect={setSelectedState}/><StateComparison profile={profile} metric={metric}/></div>
    </section>

    <section id="records" className="section-wrap provider-section">
      <div className="story-question"><b>EXTENSION / RECORDS</b><h2>Which records have the largest drug-cost totals?</h2><p>{area.name}. Descriptive, not a performance ranking.</p></div>
      <div className="provider-table" role="table" aria-label="Highest cost provider records">
        <div className="provider-row provider-head" role="row"><span>Provider / specialty</span><span>Claims</span><span>Cost / claim</span><span>Total drug cost</span></div>
        {area.topProviders.slice(0, 10).map((p, i) => <div className="provider-row" role="row" key={p.npi}><span><b>{String(i + 1).padStart(2, '0')} · {p.name}</b><small>{p.specialty} · {p.city}, {p.state} · NPI {p.npi}</small></span><span>{p.claims.toLocaleString()}</span><span>{dollars.format(p.costPerClaim)}</span><span>{money.format(p.cost)}</span></div>)}
      </div>
    </section>

    <section id="data" className="section-wrap data-section">
      <div className="story-question assignment-question"><b>WEEK 02 / DATA SUMMARY</b><h2>What does the source file look like?</h2><p>{data.meta.rows.toLocaleString()} rows · {data.meta.columns} classified fields · full file, not a sample.</p></div>
      <div className="data-controls"><span>DISTRIBUTION</span><Select value={distribution} onValueChange={(v) => setDistribution(v ?? 'claims')}><SelectTrigger aria-label="Distribution measure"><SelectValue/></SelectTrigger><SelectContent>{data.distributions.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="small-multiples"><DistributionHistogram data={data} active={distribution}/><FieldTypeBars data={data}/></div>
      <div className="single-chart"><FieldMissingnessPlot data={data}/></div>
      <p className="data-note"><a href="./data/prescriber-summary/README.md">Dataset documentation</a> · <a href="./data/prescriber-summary/summary.json">Browser-ready JSON</a></p>
    </section>

    <section id="task-analysis" className="section-wrap task-analysis">
      <div className="task-analysis-head"><span>PROJECT PLANNING</span><h2>Task Analysis</h2><p>Questions the explorer should help answer, independent of any particular chart form.</p></div>
      <ol className="task-list">
        <li><b>01</b><div><h3>Examine relationships</h3><p>Determine whether prescribing volume and cost move together, then identify specialties that depart from the overall pattern.</p></div></li>
        <li><b>02</b><div><h3>Assess concentration</h3><p>Identify which specialties account for the largest shares of claims and drug cost, and judge how concentrated those totals are.</p></div></li>
        <li><b>03</b><div><h3>Compare clinical mix</h3><p>Compare reported drug-category shares across specialties and find unusually high, low, or contrasting patterns.</p></div></li>
        <li><b>04</b><div><h3>Compare places</h3><p>Determine how a selected specialty varies across states and identify places that differ meaningfully from the national benchmark.</p></div></li>
        <li><b>05</b><div><h3>Investigate records</h3><p>Find high-cost provider records and distinguish whether their totals are associated with claim volume, cost per claim, or specialty.</p></div></li>
        <li><b>06</b><div><h3>Judge data fitness</h3><p>Assess field types, missingness, suppression, and distributions before deciding which comparisons the data can support.</p></div></li>
      </ol>
    </section>

    <section id="validation" className="section-wrap task-analysis validation-section">
      <div className="task-analysis-head"><span>WEEK 04 / CHAPTER 4</span><h2>Validation</h2><p>Four levels to test with a hypothetical healthcare analytics user; these checks are proposed, not completed.</p></div>
      <ol className="task-list">
        <li><b>01 · DOMAIN</b><div><h3>Is this the right problem?</h3><p>Ask an analyst whether finding cost and volume differences by specialty and place supports a real research question. Confirm they would not mistake these measures for care quality.</p></div></li>
        <li><b>02 · ABSTRACTION</b><div><h3>Are the data and tasks right?</h3><p>Check that provider records, specialty aggregates, rates, and suppressed values match the questions “compare,” “rank,” and “find outliers.” Recalculate a few results from CMS rows.</p></div></li>
        <li><b>03 · IDIOM</b><div><h3>Can people read and use it?</h3><p>Give readers an outlier-finding task without instructions. Watch for confusion about circle area, log versus linear axes, the state tiles, and what zoom changes.</p></div></li>
        <li><b>04 · ALGORITHM</b><div><h3>Does it stay correct and responsive?</h3><p>Compare preprocessing totals with the source file, test filters and zoom across geographies, and measure load and interaction time on a phone and laptop.</p></div></li>
      </ol>
      <p className="validation-source">Framework: Tamara Munzner, <a href="https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/" target="_blank" rel="noreferrer">A Nested Model for Visualization Design and Validation</a>, and <a href="https://www.taylorfrancis.com/chapters/mono/10.1201/b17511-4/analysis-four-levels-validation-tamara-munzner" target="_blank" rel="noreferrer">Chapter 4</a>.</p>
    </section>

    <footer><p>Part D records cover prescriptions paid under the program, not a clinician’s full practice. Drug cost excludes manufacturer rebates.</p><div><a href="./downloads/part-d-prescriber-source.zip" download>Download site files (.zip)</a><a href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider" target="_blank" rel="noreferrer">CMS source</a></div></footer>
  </main>;
}
