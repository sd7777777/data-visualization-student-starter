'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteHeader } from '@/components/site-header';
import { CategorySharePlot, ConcentrationCurve, SpecialtyFingerprint, SpecialtyRanking, SpecialtyScatter, StateComparison, StateTileMap, type ConcentrationMetric, type Metric, type RankMetric } from './analysis-charts';
import { compact, dollars, money, percent, type Dataset } from '@/lib/prescriber';

type Lens = 'economics' | 'categories';

export default function PartDFieldNotes() {
  const [data, setData] = useState<Dataset | null>(null);
  const [areaCode, setAreaCode] = useState('US');
  const [lens, setLens] = useState<Lens>('economics');
  const [selected, setSelected] = useState('');
  const [profileName, setProfileName] = useState('Nurse Practitioner');
  const [metric, setMetric] = useState<Metric>('costPerClaim');
  const [rankMetric, setRankMetric] = useState<RankMetric>('cost');
  const [concentrationMetric, setConcentrationMetric] = useState<ConcentrationMetric>('cost');
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
      <div><p className="kicker">CMS MEDICARE PART D · 2024</p><h1>Prescriber explorer</h1></div>
      <p className="standfirst">Explore 1.4 million provider records by specialty and state. Values describe Medicare Part D activity, not quality of care.</p>
    </section>

    <section className="stat-strip" aria-label="Dataset overview">
      <div><span>Provider records</span><strong>{area.summary.providers.toLocaleString()}</strong></div><div><span>Claims</span><strong>{compact.format(area.summary.claims)}</strong></div><div><span>Drug cost</span><strong>{money.format(area.summary.cost)}</strong></div><div><span>Source fields</span><strong>{data.meta.columns}</strong></div>
    </section>

    <nav className="section-directory" aria-label="Explorer sections"><span>jump to:</span><a href="#relationship">01 relationship</a><a href="#scale">02 scale</a><a href="#mix">03 clinical mix</a><a href="#place">04 geography</a><a href="#records">05 provider records</a></nav>

    <section id="relationship" className="section-wrap">
      <div className="story-question"><b>01 / relationship</b><h2>How do price and prescribing volume relate?</h2></div>
      <div className="control-rail">
        <div className="control-field"><span>GEOGRAPHY</span><Select value={areaCode} onValueChange={(v) => setAreaCode(v ?? 'US')}><SelectTrigger aria-label="Geography"><SelectValue/></SelectTrigger><SelectContent>{data.areas.map((d) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="control-field"><span>VIEW</span><Tabs value={lens} onValueChange={(v) => setLens(v as Lens)}><TabsList><TabsTrigger value="economics">Cost × volume</TabsTrigger><TabsTrigger value="categories">Drug categories</TabsTrigger></TabsList></Tabs></div>
        <p>Hover, focus, or click a mark for details.</p>
      </div>
      <div className="analysis-grid">
        <SpecialtyScatter specialties={area.specialties} selected={specialty.specialty} onSelect={setSelected} lens={lens}/>
        <aside className="inspection"><span className="eyebrow">SELECTED · {area.code}</span><h2>{specialty.specialty}</h2><p>{area.name}</p><dl>
          <div><dt>Provider records</dt><dd>{specialty.providers.toLocaleString()}</dd></div><div><dt>Total claims</dt><dd>{compact.format(specialty.claims)}</dd></div><div><dt>Total drug cost</dt><dd>{money.format(specialty.cost)}</dd></div><div><dt>Cost / claim</dt><dd>{dollars.format(specialty.costPerClaim)}</dd></div><div><dt>Claims / provider</dt><dd>{Math.round(specialty.claims / specialty.providers).toLocaleString()}</dd></div><div><dt>Reported opioid share</dt><dd>{percent.format(specialty.opioidShare)}%</dd></div>
        </dl><p className="note">Provider means one CMS row/NPI record. Rates based on suppressed subgroup values are conservative.</p></aside>
      </div>
    </section>

    <section id="scale" className="section-wrap simple-views">
      <div className="story-question"><b>02 / scale</b><h2>How concentrated are cost and claims?</h2><p>Hover or focus any mark to carry that specialty through the page.</p></div>
      <div className="dual-controls"><div className="rank-controls"><span>CURVE</span><Tabs value={concentrationMetric} onValueChange={(v) => setConcentrationMetric(v as ConcentrationMetric)}><TabsList><TabsTrigger value="cost">Cost</TabsTrigger><TabsTrigger value="claims">Claims</TabsTrigger></TabsList></Tabs></div><div className="rank-controls"><span>RANK</span><Tabs value={rankMetric} onValueChange={(v) => setRankMetric(v as RankMetric)}><TabsList><TabsTrigger value="cost">Cost</TabsTrigger><TabsTrigger value="claims">Claims</TabsTrigger><TabsTrigger value="providers">Providers</TabsTrigger></TabsList></Tabs></div></div>
      <div className="small-multiples"><ConcentrationCurve specialties={area.specialties} metric={concentrationMetric} selected={specialty.specialty} onSelect={setSelected}/><SpecialtyRanking specialties={area.specialties} metric={rankMetric} selected={specialty.specialty} onSelect={setSelected}/></div>
    </section>

    <section id="mix" className="section-wrap mix-section">
      <div className="story-question"><b>03 / clinical mix</b><h2>How does the selected specialty differ from the field?</h2><p>Category shares and percentiles are descriptive; they are not quality measures.</p></div>
      <div className="small-multiples"><CategorySharePlot specialties={area.specialties} selected={specialty.specialty} onSelect={setSelected}/><SpecialtyFingerprint specialties={area.specialties} selected={specialty.specialty}/></div>
    </section>

    <section id="place" className="section-wrap story-section">
      <div className="story-question"><b>04 / geography</b><h2>Where do state-level values differ?</h2><p>Choose a specialty and measure. Higher means more of the selected measure, not better care.</p></div>
      <div className="control-rail two-up">
        <div className="control-field"><span>SPECIALTY</span><Select value={profile.specialty} onValueChange={(v) => setProfileName(v ?? profile.specialty)}><SelectTrigger aria-label="Specialty"><SelectValue/></SelectTrigger><SelectContent>{data.specialtyProfiles.map((d) => <SelectItem key={d.specialty} value={d.specialty}>{d.specialty}</SelectItem>)}</SelectContent></Select></div>
        <div className="control-field"><span>MEASURE</span><Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}><TabsList><TabsTrigger value="costPerClaim">Cost / claim</TabsTrigger><TabsTrigger value="claimsPerProvider">Claims / provider</TabsTrigger><TabsTrigger value="opioidShare">Opioid share</TabsTrigger></TabsList></Tabs></div>
      </div>
      <div className="geography-views"><StateTileMap profile={profile} metric={metric} selected={activeState} onSelect={setSelectedState}/><StateComparison profile={profile} metric={metric}/></div>
    </section>

    <section id="records" className="section-wrap provider-section">
      <div className="story-question"><b>05 / provider records</b><h2>Which records have the largest drug-cost totals?</h2><p>{area.name}. Descriptive, not a performance ranking.</p></div>
      <div className="provider-table" role="table" aria-label="Highest cost provider records">
        <div className="provider-row provider-head" role="row"><span>Provider / specialty</span><span>Claims</span><span>Cost / claim</span><span>Total drug cost</span></div>
        {area.topProviders.slice(0, 10).map((p, i) => <div className="provider-row" role="row" key={p.npi}><span><b>{String(i + 1).padStart(2, '0')} · {p.name}</b><small>{p.specialty} · {p.city}, {p.state} · NPI {p.npi}</small></span><span>{p.claims.toLocaleString()}</span><span>{dollars.format(p.costPerClaim)}</span><span>{money.format(p.cost)}</span></div>)}
      </div>
    </section>

    <footer><p>Part D records cover prescriptions paid under the program, not a clinician’s full practice. Drug cost excludes manufacturer rebates.</p><div><a href="./lab">Data lab</a><a href="./coursework">Methods</a></div></footer>
  </main>;
}
