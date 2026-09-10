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
    <div className="figure-head"><div><span className="figure-no">FIG. 04</span><h2>{distribution.label}</h2></div><p>Fixed, documented bins over every provider row. Bar height uses a log scale so the long tail remains legible.</p></div>
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
    <header className="page-head"><div><span className="kicker">DATASET LAB / LOAD + SUMMARIZE</span><h1>What is actually in the file?</h1></div><p>This page makes the preprocessing inspectable: shape, distributions, field types, missing values, and CMS suppression markers. The 750 MB source is reduced to a public 608 KB analytical file for the browser.</p></header>
    <section className="lab-grid"><div><span>ROWS</span><strong>{data.meta.rows.toLocaleString()}</strong></div><div><span>COLUMNS</span><strong>{data.meta.columns}</strong></div><div><span>SUPPRESSION MARKERS</span><strong>{compact.format(suppressedCells)}</strong></div></section>

    <section className="section-wrap">
      <div className="section-intro"><span className="figure-no">DISTRIBUTION</span><h2>The typical provider and the tail are far apart.</h2><p>Choose a measure. These counts come from the Python streaming pass across every record, not a sample and not placeholder data.</p></div>
      <div className="lab-controls"><div className="control-field">MEASURE<Select value={distribution} onValueChange={(v) => setDistribution(v ?? 'claims')}><SelectTrigger aria-label="Distribution measure"><SelectValue/></SelectTrigger><SelectContent>{data.distributions.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent></Select></div></div>
      <Histogram data={data} active={distribution}/>
    </section>

    <section className="section-wrap">
      <div className="section-intro"><span className="figure-no">84-FIELD INVENTORY</span><h2>Every attribute, classified.</h2><p>Search the original CMS field names or plain-language labels. Missing means blank; markers count CMS “*” and “#” cells used for suppression or counter-suppression.</p></div>
      <div className="lab-controls"><label htmlFor="schema-search">SEARCH<input id="schema-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try opioid, cost, state…"/></label><div className="control-field">FIELD GROUP<Select value={group} onValueChange={(v) => setGroup(v ?? 'All groups')}><SelectTrigger aria-label="Field group"><SelectValue/></SelectTrigger><SelectContent>{groups.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="schema-table" role="table" aria-label="CMS field inventory">
        <div className="schema-row schema-head" role="row"><span>FIELD / LABEL</span><span>GROUP</span><span>CLASSIFICATION</span><span>MISSING / MARKERS</span></div>
        {fields.map((field) => <div className="schema-row" role="row" key={field.name}><span><code>{field.name}</code><br/>{field.label}</span><span>{field.group}</span><span>{field.classification}</span><span>{field.missing.toLocaleString()} / {field.markers.toLocaleString()}</span></div>)}
      </div>
      {fields.length === 0 && <p>No fields match this filter.</p>}
    </section>
    <footer><p><b>Reproducible reduction.</b> The repository includes the Python preparation script, browser-ready JSON, and generation notes. Re-run the script when CMS publishes a new year.</p><div><a href="./coursework">Assignment evidence →</a><a href="./">Return to explorer →</a></div></footer>
  </main>;
}
