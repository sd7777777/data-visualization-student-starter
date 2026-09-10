'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, CircleHelp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteHeader } from '@/components/site-header';
import { SpecialtyScatter, StateComparison, StateTileMap, type Metric } from './analysis-charts';
import { compact, dollars, money, percent, type Dataset } from '@/lib/prescriber';

type Lens = 'economics' | 'categories';

export default function PartDFieldNotes() {
  const [data, setData] = useState<Dataset | null>(null);
  const [areaCode, setAreaCode] = useState('US');
  const [lens, setLens] = useState<Lens>('economics');
  const [selected, setSelected] = useState('');
  const [profileName, setProfileName] = useState('Nurse Practitioner');
  const [metric, setMetric] = useState<Metric>('costPerClaim');
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
      <div><p className="kicker">MEDICARE PART D PRESCRIBERS / 2024</p><h1>How scale, price, and clinical mix reshape the prescribing field.</h1></div>
      <div className="standfirst"><p>This is an exploratory analysis of provider-level Part D records—not a scorecard. Start with specialties, then move down to states and individual provider records.</p><a href="#field">Begin with the field <ArrowDown size={15}/></a></div>
    </section>

    <section className="stat-strip" aria-label="Dataset overview">
      <div><span>Provider records</span><strong>{area.summary.providers.toLocaleString()}</strong></div><div><span>Part D claims</span><strong>{compact.format(area.summary.claims)}</strong></div><div><span>Total drug cost</span><strong>{money.format(area.summary.cost)}</strong></div><div><span>Fields in source</span><strong>{data.meta.columns}</strong></div>
    </section>

    <section id="field" className="section-wrap">
      <div className="control-rail">
        <div className="control-field"><span>GEOGRAPHY</span><Select value={areaCode} onValueChange={(v) => setAreaCode(v ?? 'US')}><SelectTrigger aria-label="Geography"><SelectValue/></SelectTrigger><SelectContent>{data.areas.map((d) => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="control-field"><span>VIEW</span><Tabs value={lens} onValueChange={(v) => setLens(v as Lens)}><TabsList><TabsTrigger value="economics">Cost × volume</TabsTrigger><TabsTrigger value="categories">Drug categories</TabsTrigger></TabsList></Tabs></div>
        <p><CircleHelp size={15}/> Hover or keyboard-focus a mark to inspect it.</p>
      </div>
      <div className="analysis-grid">
        <SpecialtyScatter specialties={area.specialties} selected={specialty.specialty} onSelect={setSelected} lens={lens}/>
        <aside className="inspection"><span className="eyebrow">ACTIVE MARK / {area.code}</span><h2>{specialty.specialty}</h2><p>{area.name}</p><dl>
          <div><dt>Provider records</dt><dd>{specialty.providers.toLocaleString()}</dd></div><div><dt>Total claims</dt><dd>{compact.format(specialty.claims)}</dd></div><div><dt>Total drug cost</dt><dd>{money.format(specialty.cost)}</dd></div><div><dt>Cost / claim</dt><dd>{dollars.format(specialty.costPerClaim)}</dd></div><div><dt>Claims / provider</dt><dd>{Math.round(specialty.claims / specialty.providers).toLocaleString()}</dd></div><div><dt>Reported opioid share</dt><dd>{percent.format(specialty.opioidShare)}%</dd></div>
        </dl><p className="note">Provider means one CMS row/NPI record. Rates based on suppressed subgroup values are conservative.</p></aside>
      </div>
    </section>

    <section className="section-wrap story-section">
      <div className="section-intro"><span className="figure-no">SECOND CUT</span><h2>National scale can hide local intensity.</h2><p>Select a major specialty and compare its state-level aggregate. A high position means more of the selected measure—not better care.</p></div>
      <div className="control-rail two-up">
        <div className="control-field"><span>SPECIALTY</span><Select value={profile.specialty} onValueChange={(v) => setProfileName(v ?? profile.specialty)}><SelectTrigger aria-label="Specialty"><SelectValue/></SelectTrigger><SelectContent>{data.specialtyProfiles.map((d) => <SelectItem key={d.specialty} value={d.specialty}>{d.specialty}</SelectItem>)}</SelectContent></Select></div>
        <div className="control-field"><span>MEASURE</span><Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}><TabsList><TabsTrigger value="costPerClaim">Cost / claim</TabsTrigger><TabsTrigger value="claimsPerProvider">Claims / provider</TabsTrigger><TabsTrigger value="opioidShare">Opioid share</TabsTrigger></TabsList></Tabs></div>
      </div>
      <div className="geography-views"><StateTileMap profile={profile} metric={metric} selected={activeState} onSelect={setSelectedState}/><StateComparison profile={profile} metric={metric}/></div>
    </section>

    <section className="section-wrap provider-section">
      <div className="section-intro"><span className="figure-no">RECORD LEVEL</span><h2>Where total cost concentrates.</h2><p>These are the largest provider-record totals in {area.name}. The ordering is descriptive and is not a performance ranking.</p></div>
      <div className="provider-table" role="table" aria-label="Highest cost provider records">
        <div className="provider-row provider-head" role="row"><span>Provider / specialty</span><span>Claims</span><span>Cost / claim</span><span>Total drug cost</span></div>
        {area.topProviders.slice(0, 10).map((p, i) => <div className="provider-row" role="row" key={p.npi}><span><b>{String(i + 1).padStart(2, '0')} · {p.name}</b><small>{p.specialty} · {p.city}, {p.state} · NPI {p.npi}</small></span><span>{p.claims.toLocaleString()}</span><span>{dollars.format(p.costPerClaim)}</span><span>{money.format(p.cost)}</span></div>)}
      </div>
    </section>

    <footer><p><b>Interpretation boundary.</b> These records cover prescriptions paid under Medicare Part D, not a clinician’s full practice or quality of care. Drug cost combines plan, beneficiary, subsidy, and third-party payments and excludes manufacturer rebates.</p><div><a href="./lab">Inspect the data lab →</a><a href="./coursework">View assignment evidence →</a></div></footer>
  </main>;
}
