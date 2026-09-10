'use client';

import { useEffect, useMemo, useState } from 'react';
import { scaleLog } from 'd3-scale';
import { SiteHeader } from '@/components/site-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { compact, type Dataset } from '@/lib/prescriber';

function Histogram({ data, active }: { data: Dataset; active: string }) {
  const distribution = data.distributions.find((d) => d.key === active) ?? data.distributions[0];
  const max = Math.max(...distribution.bins.map((d) => d.count));
  const y = scaleLog().domain([1, max]).range([2, 225]);
  return <figure className="histogram">
    <div className="figure-head"><div><span className="figure-no">08</span><h2>{distribution.label}</h2></div><p>All provider records. Bar height uses a log scale so the long tail remains visible.</p></div>
    <div className="histogram-bars">{distribution.bins.map((bin) => <div className="hist-bar" key={bin.label}><b>{compact.format(bin.count)}</b><i style={{ height: y(Math.max(1, bin.count)) }}/><span>{bin.label}</span></div>)}</div>
    <figcaption>n = {data.meta.rows.toLocaleString()} provider records. Zero and missing totals fall into the first applicable bin.</figcaption>
  </figure>;
}

export default function DataLab() {
  const [data, setData] = useState<Dataset | null>(null);
  const [distribution, setDistribution] = useState('claims');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All groups');
  useEffect(() => { void fetch('./data/prescriber-summary/summary.json').then((r) => r.json()).then((payload) => setData(payload as Dataset)); }, []);
  const groups = useMemo(() => data ? ['All groups', ...Array.from(new Set(data.schema.map((d) => d.group)))] : [], [data]);
  const fields = useMemo(() => data?.schema.filter((d) => (group === 'All groups' || d.group === group) && `${d.name} ${d.label}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, query, group]);
  if (!data) return <main className="loading">BUILDING DATA PROFILE…</main>;
  const suppressedCells = data.schema.reduce((sum, d) => sum + d.markers, 0);
  return <main>
    <SiteHeader section="lab"/>
    <header className="page-head"><div><span className="kicker">DATA CHECK</span><h1>Data lab</h1></div><p>File shape, distributions, field types, missing values, and CMS suppression markers. A 750 MB source file is reduced to 608 KB for the browser.</p></header>
    <section className="lab-grid"><div><span>ROWS</span><strong>{data.meta.rows.toLocaleString()}</strong></div><div><span>COLUMNS</span><strong>{data.meta.columns}</strong></div><div><span>SUPPRESSION MARKERS</span><strong>{compact.format(suppressedCells)}</strong></div></section>

    <section className="section-wrap">
      <div className="plain-section-head"><h2>Distributions</h2><p>Choose a measure. Counts come from a Python pass across every record.</p></div>
      <div className="lab-controls"><div className="control-field">MEASURE<Select value={distribution} onValueChange={(v) => setDistribution(v ?? 'claims')}><SelectTrigger aria-label="Distribution measure"><SelectValue/></SelectTrigger><SelectContent>{data.distributions.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent></Select></div></div>
      <Histogram data={data} active={distribution}/>
    </section>

    <section className="section-wrap">
      <div className="plain-section-head"><h2>Field inventory</h2><p>Search the 84 CMS fields. Missing means blank; markers count “*” and “#” suppression cells.</p></div>
      <div className="lab-controls"><label htmlFor="schema-search">SEARCH<input id="schema-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try opioid, cost, state…"/></label><div className="control-field">FIELD GROUP<Select value={group} onValueChange={(v) => setGroup(v ?? 'All groups')}><SelectTrigger aria-label="Field group"><SelectValue/></SelectTrigger><SelectContent>{groups.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="schema-table" role="table" aria-label="CMS field inventory">
        <div className="schema-row schema-head" role="row"><span>FIELD / LABEL</span><span>GROUP</span><span>CLASSIFICATION</span><span>MISSING / MARKERS</span></div>
        {fields.map((field) => <div className="schema-row" role="row" key={field.name}><span><code>{field.name}</code><br/>{field.label}</span><span>{field.group}</span><span>{field.classification}</span><span>{field.missing.toLocaleString()} / {field.markers.toLocaleString()}</span></div>)}
      </div>
      {fields.length === 0 && <p>No fields match this filter.</p>}
    </section>
    <footer><p>The repository includes the Python preparation script, browser-ready JSON, and generation notes.</p><div><a href="./coursework">Methods</a><a href="./">Explorer</a></div></footer>
  </main>;
}
