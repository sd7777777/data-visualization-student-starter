'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CircleHelp, Sparkles } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Summary = { providers: number; claims: number; cost: number; costPerClaim: number; opioidShare: number; antibioticShare: number; averageRisk: number | null };
type Specialty = Summary & { specialty: string };
type Provider = { npi: string; name: string; city: string; state: string; specialty: string; claims: number; cost: number; costPerClaim: number; opioidRate: number | null };
type Area = { code: string; name: string; summary: Summary; specialties: Specialty[]; topProviders: Provider[] };
type Dataset = { meta: { title: string; year: number; rows: number; columns: number; source: string; note: string }; areas: Area[] };

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function logScale(value: number, values: number[], start: number, end: number) {
  const safe = values.filter((item) => item > 0);
  const min = Math.log10(Math.min(...safe));
  const max = Math.log10(Math.max(...safe));
  if (min === max) return (start + end) / 2;
  return start + ((Math.log10(Math.max(value, 0.01)) - min) / (max - min)) * (end - start);
}

function linearScale(value: number, values: number[], start: number, end: number) {
  const max = Math.max(...values, 1);
  return start + (value / max) * (end - start);
}

function DataField({ specialties, selected, onSelect, lens }: { specialties: Specialty[]; selected: string; onSelect: (name: string) => void; lens: string }) {
  const width = 820;
  const height = 500;
  const pad = { left: 74, right: 34, top: 42, bottom: 62 };
  const xValues = specialties.map((d) => lens === 'access' ? d.opioidShare : d.costPerClaim);
  const yValues = specialties.map((d) => lens === 'access' ? d.antibioticShare : d.claims / d.providers);
  const providerValues = specialties.map((d) => d.providers);

  const x = (d: Specialty) => lens === 'access'
    ? linearScale(d.opioidShare, xValues, pad.left, width - pad.right)
    : logScale(d.costPerClaim, xValues, pad.left, width - pad.right);
  const y = (d: Specialty) => {
    const value = lens === 'access' ? d.antibioticShare : d.claims / d.providers;
    return lens === 'access'
      ? linearScale(value, yValues, height - pad.bottom, pad.top)
      : logScale(value, yValues, height - pad.bottom, pad.top);
  };
  const radius = (d: Specialty) => 5 + Math.sqrt(d.providers / Math.max(...providerValues, 1)) * 19;

  return (
    <div className="relative min-h-[420px] w-full overflow-hidden rounded-[1.75rem] bg-[#081d2e] shadow-[0_30px_80px_rgba(3,21,33,0.28)]">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="field-title field-desc" className="h-full min-h-[420px] w-full">
        <title id="field-title">Specialty prescribing field</title>
        <desc id="field-desc">An interactive scatter plot comparing the leading provider specialties in the selected geography.</desc>
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#57e6d6" stopOpacity=".95" />
            <stop offset="100%" stopColor="#1ea99e" stopOpacity=".68" />
          </radialGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((line) => {
          const px = pad.left + ((width - pad.left - pad.right) / 4) * line;
          const py = pad.top + ((height - pad.top - pad.bottom) / 4) * line;
          return <g key={line}><line x1={px} y1={pad.top} x2={px} y2={height - pad.bottom} stroke="#d8f3f0" strokeOpacity=".1" /><line x1={pad.left} y1={py} x2={width - pad.right} y2={py} stroke="#d8f3f0" strokeOpacity=".1" /></g>;
        })}
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="#b8d1d5" strokeOpacity=".6" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#b8d1d5" strokeOpacity=".6" />
        <text x={(pad.left + width - pad.right) / 2} y={height - 18} textAnchor="middle" className="fill-[#a9c5c7] text-[13px] font-medium">{lens === 'access' ? 'Reported opioid share →' : 'Cost per claim →'}</text>
        <text transform={`translate(20 ${(pad.top + height - pad.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="fill-[#a9c5c7] text-[13px] font-medium">{lens === 'access' ? 'Reported antibiotic share →' : 'Claims per provider →'}</text>
        {specialties.map((d, index) => {
          const active = d.specialty === selected;
          return (
            <g key={d.specialty} transform={`translate(${x(d)} ${y(d)})`} onMouseEnter={() => onSelect(d.specialty)} onFocus={() => onSelect(d.specialty)} onClick={() => onSelect(d.specialty)} role="button" tabIndex={0} aria-label={`${d.specialty}: ${d.providers.toLocaleString()} providers`} className="cursor-pointer outline-none">
              {active && <circle r={radius(d) + 9} fill="none" stroke="#ffd166" strokeWidth="2" strokeDasharray="4 5" />}
              <circle r={radius(d)} fill={active ? '#ffd166' : 'url(#glow)'} fillOpacity={active ? 1 : 0.64 + (index % 4) * 0.08} stroke={active ? '#fff4c7' : '#8df0e6'} strokeOpacity=".75" strokeWidth="1.4" className="transition-all duration-200 hover:fill-opacity-100" />
              {active && <text y={-(radius(d) + 14)} textAnchor="middle" className="pointer-events-none fill-white text-[12px] font-semibold">{d.specialty.length > 28 ? `${d.specialty.slice(0, 27)}…` : d.specialty}</text>}
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#bcd4d5] backdrop-blur"><span className="size-2 rounded-full bg-[#57e6d6]" /> Circle size = providers</div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<Dataset | null>(null);
  const [areaCode, setAreaCode] = useState('US');
  const [lens, setLens] = useState('economics');
  const [selected, setSelected] = useState('');

  useEffect(() => { fetch('./data/prescriber-summary/summary.json').then((response) => response.json()).then((payload: Dataset) => setData(payload)); }, []);

  useEffect(() => {
    if (!data || !document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const validAreas = new Set(data.areas.map((item) => item.code));
    void Promise.resolve(document.modelContext.registerTool({
      name: 'set_prescriber_view',
      title: 'Set prescriber explorer view',
      description: 'Change the visible geography and analytical lens in the Medicare Part D explorer.',
      inputSchema: {
        type: 'object',
        properties: {
          geography: { type: 'string', description: 'CMS state/territory code or US.' },
          lens: { type: 'string', enum: ['economics', 'access'] },
        },
        required: ['geography', 'lens'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const candidate = input as { geography?: unknown; lens?: unknown };
        if (typeof candidate.geography !== 'string' || !validAreas.has(candidate.geography)) throw new Error('Unknown geography code.');
        if (candidate.lens !== 'economics' && candidate.lens !== 'access') throw new Error('Lens must be economics or access.');
        setAreaCode(candidate.geography);
        setLens(candidate.lens);
        const geography = data.areas.find((item) => item.code === candidate.geography)?.name;
        return { geography, lens: candidate.lens };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [data]);

  const area = useMemo(() => data?.areas.find((item) => item.code === areaCode) ?? data?.areas[0], [data, areaCode]);
  const specialty = area?.specialties.find((item) => item.specialty === selected) ?? area?.specialties[0];

  useEffect(() => { if (area?.specialties[0]) setSelected(area.specialties[0].specialty); }, [areaCode, area]);

  if (!data || !area || !specialty) {
    return <main className="grid min-h-screen place-items-center bg-[#eef5f3] text-[#09283c]"><div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em]"><span className="size-3 animate-pulse rounded-full bg-[#008b82]" /> Reading the 2024 CMS summary</div></main>;
  }

  return (
    <main className="min-h-screen bg-[#eef5f3] text-[#09283c]">
      <header className="border-b border-[#abc5c1]/70 bg-[#eef5f3]/95">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#explore" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-full bg-[#09283c] text-[#68eee0]"><Sparkles className="size-4" /></span><span>Part D Fieldnotes</span></a>
          <nav aria-label="Primary" className="flex items-center gap-5 text-sm font-medium">
            <a href="#explore" className="hidden hover:text-[#007a73] sm:block">Explore</a><a href="#providers" className="hidden hover:text-[#007a73] md:block">Providers</a><a href="#method" className="hidden hover:text-[#007a73] sm:block">Method</a>
            <a href={data.meta.source} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full border border-[#789c98] px-4 py-2 hover:bg-white">CMS source <ArrowUpRight className="size-3.5" /></a>
          </nav>
        </div>
      </header>

      <section id="explore" className="mx-auto max-w-[1480px] px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <div className="mb-8 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#007a73]">CMS Medicare Part D · {data.meta.year}</p><h1 className="max-w-4xl font-[family-name:var(--font-heading)] text-[clamp(2.6rem,6vw,6.4rem)] leading-[.89] tracking-[-0.055em]">Where prescribing patterns diverge.</h1></div>
          <div className="max-w-xl border-l-2 border-[#f5bd36] pl-5 text-base leading-7 text-[#36596a] lg:justify-self-end">Explore how clinical specialties differ in prescription volume, drug cost, and focused drug categories. Each circle is a specialty, built from provider-level CMS records.</div>
        </div>

        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#abc5c1] bg-white/75 p-4 shadow-[0_14px_36px_rgba(9,40,60,.07)] sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.13em] text-[#476878]">Geography
              <Select value={areaCode} onValueChange={(value) => setAreaCode(value ?? 'US')}><SelectTrigger className="h-11 min-w-56 border-[#91b2ae] bg-white px-3 text-base font-semibold"><SelectValue /></SelectTrigger><SelectContent>{data.areas.map((item) => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent></Select>
            </label>
            <div className="grid gap-1.5"><span className="text-xs font-bold uppercase tracking-[0.13em] text-[#476878]">Analytical lens</span><Tabs value={lens} onValueChange={setLens}><TabsList className="h-11 bg-[#dceae7] p-1"><TabsTrigger value="economics" className="px-4">Cost × volume</TabsTrigger><TabsTrigger value="access" className="px-4">Focused categories</TabsTrigger></TabsList></Tabs></div>
          </div>
          <p className="flex items-center gap-2 text-sm text-[#567483]"><CircleHelp className="size-4" /> Hover, focus, or click a circle for detail.</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <DataField specialties={area.specialties} selected={specialty.specialty} onSelect={setSelected} lens={lens} />
          <aside aria-live="polite" className="flex flex-col rounded-[1.75rem] border border-[#abc5c1] bg-white p-6 shadow-[0_18px_48px_rgba(9,40,60,.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#008b82]">Selected specialty</p><h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl leading-[1.05] tracking-tight">{specialty.specialty}</h2><p className="mt-3 text-sm text-[#5a7683]">{area.name} · leading specialties by total Part D drug cost</p>
            <dl className="mt-7 divide-y divide-[#d5e3e0] border-y border-[#d5e3e0]">{[
              ['Providers', specialty.providers.toLocaleString()], ['Total claims', compact.format(specialty.claims)], ['Drug cost', money.format(specialty.cost)], ['Cost / claim', dollars.format(specialty.costPerClaim)], ['Reported opioid share', `${specialty.opioidShare.toFixed(1)}%`], ['Avg. HCC risk score', specialty.averageRisk?.toFixed(2) ?? 'Suppressed'],
            ].map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-4 py-3"><dt className="text-sm text-[#5a7683]">{label}</dt><dd className="font-mono text-sm font-bold tabular-nums text-[#09283c]">{value}</dd></div>)}</dl>
            <div className="mt-auto pt-6"><p className="text-xs leading-5 text-[#6a818b]">Reported subgroup shares exclude suppressed values. Treat them as conservative estimates, not clinical quality measures.</p></div>
          </aside>
        </div>

        <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-[#abc5c1] bg-[#abc5c1] sm:grid-cols-3">{[
          ['Provider records', compact.format(area.summary.providers)], ['Part D claims', compact.format(area.summary.claims)], ['Total drug cost', money.format(area.summary.cost)],
        ].map(([label, value]) => <div key={label} className="bg-[#f8fbfa] px-5 py-5"><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5a7683]">{label}</p><p className="mt-2 font-[family-name:var(--font-heading)] text-3xl tracking-tight">{value}</p></div>)}</div>

        <section id="providers" className="scroll-mt-6 pt-20">
          <div className="mb-7 grid gap-5 md:grid-cols-[.8fr_1.2fr] md:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007a73]">Provider lens</p><h2 className="mt-2 font-[family-name:var(--font-heading)] text-4xl tracking-tight sm:text-5xl">Follow the cost concentration.</h2></div>
            <p className="max-w-2xl text-base leading-7 text-[#476878] md:justify-self-end">The highest-cost provider records offer a second level of detail beneath the specialty view. They are starting points for investigation, not performance rankings.</p>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-[#abc5c1] bg-white">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#d5e3e0] bg-[#dceae7]/55 px-5 py-3 text-xs font-bold uppercase tracking-[0.13em] text-[#5a7683] sm:grid-cols-[minmax(240px,1.1fr)_minmax(180px,.8fr)_120px]">
              <span>Provider</span><span className="hidden sm:block">Drug cost relative to this list</span><span className="text-right">Total drug cost</span>
            </div>
            {area.topProviders.slice(0, 7).map((provider, index) => {
              const maxCost = area.topProviders[0]?.cost || 1;
              return <article key={provider.npi} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[#e0ebe9] px-5 py-4 last:border-0 sm:grid-cols-[minmax(240px,1.1fr)_minmax(180px,.8fr)_120px]">
                <div className="min-w-0"><div className="flex items-center gap-3"><span className="font-mono text-xs text-[#008b82]">{String(index + 1).padStart(2, '0')}</span><h3 className="truncate font-semibold">{provider.name}</h3></div><p className="mt-1 truncate pl-8 text-sm text-[#66808b]">{provider.specialty} · {provider.city}, {provider.state}</p></div>
                <div className="hidden h-2 overflow-hidden rounded-full bg-[#dceae7] sm:block"><div className="h-full rounded-full bg-[#0ca99e]" style={{ width: `${Math.max(4, provider.cost / maxCost * 100)}%` }} /></div>
                <div className="text-right font-mono text-sm font-bold tabular-nums">{money.format(provider.cost)}</div>
              </article>;
            })}
          </div>
        </section>
      </section>

      <section id="method" className="border-t border-[#abc5c1] bg-[#09283c] px-5 py-12 text-[#e8f5f3] sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1480px] gap-8 md:grid-cols-[1fr_1.6fr]"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#68eee0]">Reading the field</p><h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl tracking-tight">Context before conclusions.</h2></div><div className="grid gap-5 text-sm leading-6 text-[#b9d0d3] sm:grid-cols-2"><p>The dataset covers prescriptions paid under Medicare Part D and does not represent a clinician’s entire practice or the quality of care they provide.</p><p>Drug cost includes amounts paid by plans, beneficiaries, subsidies, and third parties. It is not the amount paid by Medicare alone and excludes manufacturer rebates.</p></div></div>
      </section>
    </main>
  );
}
