'use client';

import { median } from 'd3-array';
import { scaleLinear, scaleLog, scaleSqrt } from 'd3-scale';
import type { Specialty, SpecialtyProfile } from '@/lib/prescriber';

type Lens = 'economics' | 'categories';
const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function SpecialtyScatter({ specialties, selected, onSelect, lens }: { specialties: Specialty[]; selected: string; onSelect: (value: string) => void; lens: Lens }) {
  const width = 900, height = 510;
  const m = { top: 30, right: 26, bottom: 62, left: 76 };
  const xValue = (d: Specialty) => lens === 'economics' ? d.costPerClaim : Math.max(d.opioidShare, .01);
  const yValue = (d: Specialty) => lens === 'economics' ? d.claims / d.providers : Math.max(d.antibioticShare, .01);
  const xDomain = [Math.min(...specialties.map(xValue)), Math.max(...specialties.map(xValue))] as [number, number];
  const yDomain = [Math.min(...specialties.map(yValue)), Math.max(...specialties.map(yValue))] as [number, number];
  const x = scaleLog().domain(xDomain).nice().range([m.left, width - m.right]);
  const y = scaleLog().domain(yDomain).nice().range([height - m.bottom, m.top]);
  const r = scaleSqrt().domain([0, Math.max(...specialties.map((d) => d.providers))]).range([4, 22]);
  const xTicks = x.ticks(6).filter((tick) => tick >= x.domain()[0] && tick <= x.domain()[1]);
  const yTicks = y.ticks(6).filter((tick) => tick >= y.domain()[0] && tick <= y.domain()[1]);
  const xMedian = median(specialties, xValue) ?? 1;
  const yMedian = median(specialties, yValue) ?? 1;
  const label = lens === 'economics' ? (v: number) => `$${short.format(v)}` : (v: number) => `${oneDecimal.format(v)}%`;
  const selectedDatum = specialties.find((d) => d.specialty === selected);
  return <figure className="chart-panel">
    <div className="figure-head"><div><span className="figure-no">FIG. 01</span><h2>{lens === 'economics' ? 'Price and prescribing volume are separate stories' : 'Focused categories occupy distinct clinical territory'}</h2></div><p>Each mark is a specialty. Circle area represents provider records. Both axes use logarithmic scales.</p></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="scatter-title scatter-desc" className="scatter">
      <title id="scatter-title">Specialty comparison scatter plot</title><desc id="scatter-desc">Interactive scatter plot of the highest-cost specialties in the selected geography.</desc>
      {xTicks.map((tick) => <g key={`x-${tick}`}><line x1={x(tick)} x2={x(tick)} y1={m.top} y2={height - m.bottom} className="gridline"/><text x={x(tick)} y={height - m.bottom + 22} textAnchor="middle" className="tick">{label(tick)}</text></g>)}
      {yTicks.map((tick) => <g key={`y-${tick}`}><line x1={m.left} x2={width - m.right} y1={y(tick)} y2={y(tick)} className="gridline"/><text x={m.left - 12} y={y(tick) + 4} textAnchor="end" className="tick">{lens === 'economics' ? short.format(tick) : `${oneDecimal.format(tick)}%`}</text></g>)}
      <line x1={x(xMedian)} x2={x(xMedian)} y1={m.top} y2={height - m.bottom} className="median-line"/><line x1={m.left} x2={width - m.right} y1={y(yMedian)} y2={y(yMedian)} className="median-line"/>
      <text x={x(xMedian) + 5} y={m.top + 12} className="median-label">specialty median</text>
      {specialties.map((d) => { const active = d.specialty === selected; return <g key={d.specialty} transform={`translate(${x(xValue(d))},${y(yValue(d))})`} role="button" tabIndex={0} aria-label={`${d.specialty}, ${d.providers.toLocaleString()} providers`} onMouseEnter={() => onSelect(d.specialty)} onFocus={() => onSelect(d.specialty)} onClick={() => onSelect(d.specialty)} className="mark-group"><circle r={r(d.providers)} className={active ? 'mark active' : 'mark'}/></g>; })}
      {selectedDatum && <g transform={`translate(${x(xValue(selectedDatum))},${y(yValue(selectedDatum))})`} className="active-label"><line y1={-r(selectedDatum.providers) - 3} y2={-r(selectedDatum.providers) - 20}/><rect x={-88} y={-r(selectedDatum.providers) - 50} width="176" height="25"/><text y={-r(selectedDatum.providers) - 33} textAnchor="middle">{selectedDatum.specialty.length > 27 ? `${selectedDatum.specialty.slice(0, 27)}…` : selectedDatum.specialty}</text></g>}
      <text x={(m.left + width - m.right) / 2} y={height - 13} textAnchor="middle" className="axis-label">{lens === 'economics' ? 'TOTAL DRUG COST / CLAIM →' : 'REPORTED OPIOID CLAIM SHARE →'}</text>
      <text transform={`translate(18 ${(m.top + height - m.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">{lens === 'economics' ? 'CLAIMS / PROVIDER →' : 'REPORTED ANTIBIOTIC CLAIM SHARE →'}</text>
    </svg>
    <figcaption>Source: CMS Medicare Part D Prescribers by Provider, 2024. Category shares omit suppressed values.</figcaption>
  </figure>;
}

type Metric = 'costPerClaim' | 'claimsPerProvider' | 'opioidShare';
export function StateComparison({ profile, metric }: { profile: SpecialtyProfile; metric: Metric }) {
  const width = 900, height = 460;
  const m = { top: 22, right: 38, bottom: 60, left: 132 };
  const value = (d: SpecialtyProfile['states'][number]) => metric === 'claimsPerProvider' ? d.claims / d.providers : d[metric];
  const states = [...profile.states].sort((a, b) => value(b) - value(a)).slice(0, 15);
  const x = scaleLinear().domain([0, Math.max(...states.map(value))]).nice().range([m.left, width - m.right]);
  const step = (height - m.top - m.bottom) / states.length;
  const formatter = metric === 'costPerClaim' ? (v: number) => `$${whole.format(v)}` : metric === 'opioidShare' ? (v: number) => `${oneDecimal.format(v)}%` : (v: number) => whole.format(v);
  return <figure className="chart-panel compact-chart">
    <div className="figure-head"><div><span className="figure-no">FIG. 02</span><h2>{profile.specialty}: state variation</h2></div><p>Top 15 states or territories for the selected measure. Values are aggregates, not quality scores.</p></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`State comparison for ${profile.specialty}`}>
      {x.ticks(5).map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1={m.top} y2={height - m.bottom} className="gridline"/><text x={x(tick)} y={height - m.bottom + 22} textAnchor="middle" className="tick">{formatter(tick)}</text></g>)}
      {states.map((d, i) => { const yy = m.top + i * step + step / 2; return <g key={d.code}><text x={m.left - 12} y={yy + 4} textAnchor="end" className="state-label">{d.name}</text><line x1={m.left} x2={x(value(d))} y1={yy} y2={yy} className="stem"/><circle cx={x(value(d))} cy={yy} r="5.5" className="state-dot"/><text x={x(value(d)) + 11} y={yy + 4} className="value-label">{formatter(value(d))}</text></g>; })}
      <text x={(m.left + width - m.right) / 2} y={height - 12} textAnchor="middle" className="axis-label">{metric === 'costPerClaim' ? 'TOTAL DRUG COST / CLAIM' : metric === 'opioidShare' ? 'REPORTED OPIOID CLAIM SHARE' : 'CLAIMS / PROVIDER'}</text>
    </svg>
  </figure>;
}
