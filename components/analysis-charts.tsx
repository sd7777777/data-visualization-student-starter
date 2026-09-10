'use client';

import { median } from 'd3-array';
import { scaleLinear, scaleLog, scaleQuantize, scaleSqrt } from 'd3-scale';
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

export type Metric = 'costPerClaim' | 'claimsPerProvider' | 'opioidShare';

const stateTiles = [
  ['AK',0,0],['ME',12,0],['WA',1,1],['MT',3,1],['ND',4,1],['MN',5,1],['WI',6,1],['MI',8,1],['NY',9,1],['VT',10,1],['NH',11,1],['MA',12,1],
  ['OR',1,2],['ID',2,2],['WY',3,2],['SD',4,2],['IA',5,2],['IL',6,2],['IN',7,2],['OH',8,2],['PA',9,2],['NJ',10,2],['CT',11,2],['RI',12,2],
  ['CA',1,3],['NV',2,3],['UT',3,3],['CO',4,3],['NE',5,3],['MO',6,3],['KY',7,3],['WV',8,3],['VA',9,3],['MD',10,3],['DE',11,3],
  ['AZ',2,4],['NM',3,4],['KS',4,4],['OK',5,4],['AR',6,4],['TN',7,4],['NC',8,4],['SC',9,4],['DC',10,4],
  ['HI',0,5],['TX',4,5],['LA',5,5],['MS',6,5],['AL',7,5],['GA',8,5],['FL',9,6],['PR',11,6],['VI',12,6],['AS',8,7],['GU',9,7],['MP',10,7],
] as const;

const metricValue = (d: SpecialtyProfile['states'][number] | SpecialtyProfile['national'], metric: Metric) => metric === 'claimsPerProvider' ? d.claims / d.providers : d[metric];
const metricTitle = (metric: Metric) => metric === 'costPerClaim' ? 'total drug cost / claim' : metric === 'opioidShare' ? 'reported opioid claim share' : 'claims / provider';
const metricFormatter = (metric: Metric) => metric === 'costPerClaim' ? (v: number) => `$${whole.format(v)}` : metric === 'opioidShare' ? (v: number) => `${oneDecimal.format(v)}%` : (v: number) => whole.format(v);

export function StateTileMap({ profile, metric, selected, onSelect }: { profile: SpecialtyProfile; metric: Metric; selected: string; onSelect: (code: string) => void }) {
  const byCode = new Map(profile.states.map((d) => [d.code, d]));
  const plotted = stateTiles.map(([code]) => byCode.get(code)).filter((d): d is SpecialtyProfile['states'][number] => Boolean(d));
  const values = plotted.map((d) => metricValue(d, metric));
  const min = Math.min(...values), max = Math.max(...values);
  const color = scaleQuantize<string>().domain([min, max]).range(['#d9e4e7','#a9c6d2','#73a5b8','#36748f','#123f5a']);
  const active = byCode.get(selected) ?? plotted[0];
  const activeValue = metricValue(active, metric);
  const nationalValue = metricValue(profile.national, metric);
  const delta = nationalValue ? (activeValue / nationalValue - 1) * 100 : 0;
  const fmt = metricFormatter(metric);
  const tile = 49, gap = 5, originX = 38, originY = 36;
  return <figure className="chart-panel tile-map-panel">
    <div className="figure-head"><div><span className="figure-no">FIG. 02</span><h2>Where the measure changes</h2></div><p>Equal-area tiles make small states and territories selectable. Color is binned from the lowest to highest reported aggregate.</p></div>
    <div className="map-readout" aria-live="polite"><span>{active.name.toUpperCase()}</span><strong>{fmt(activeValue)}</strong><em>{Math.abs(delta).toFixed(1)}% {delta >= 0 ? 'above' : 'below'} the national specialty aggregate</em></div>
    <svg viewBox="0 0 780 490" role="img" aria-label={`Tile map of ${metricTitle(metric)} for ${profile.specialty}`}>
      {stateTiles.map(([code, col, row]) => {
        const datum = byCode.get(code);
        const fill = datum ? color(metricValue(datum, metric)) : '#e5e7e3';
        const isActive = active.code === code;
        return <g key={code} transform={`translate(${originX + col * (tile + gap)},${originY + row * (tile + gap)})`} role="button" tabIndex={datum ? 0 : -1} aria-label={datum ? `${datum.name}: ${fmt(metricValue(datum, metric))}` : `${code}: no value`} onMouseEnter={() => datum && onSelect(code)} onFocus={() => datum && onSelect(code)} onClick={() => datum && onSelect(code)} className={datum ? 'tile-group' : 'tile-group unavailable'}>
          <rect width={tile} height={tile} rx="1" fill={isActive ? '#db5b27' : fill} className={isActive ? 'state-tile active' : 'state-tile'}/><text x={tile/2} y={tile/2 + 4} textAnchor="middle" className="tile-label">{code}</text>
        </g>;
      })}
      <g transform="translate(38,455)"><text className="legend-label" y="10">LOW</text>{color.range().map((swatch, i) => <rect key={swatch} x={38 + i * 34} width="34" height="12" fill={swatch}/>)}<text className="legend-label" x="218" y="10">HIGH</text><text className="legend-label" x="310" y="10">{metricTitle(metric).toUpperCase()}</text></g>
    </svg>
    <figcaption>Tile position is schematic. Armed Forces and foreign/unknown records are excluded from the map but remain in national totals.</figcaption>
  </figure>;
}

export function StateComparison({ profile, metric }: { profile: SpecialtyProfile; metric: Metric }) {
  const width = 900, height = 460;
  const m = { top: 22, right: 38, bottom: 60, left: 132 };
  const value = (d: SpecialtyProfile['states'][number]) => metricValue(d, metric);
  const states = [...profile.states].sort((a, b) => value(b) - value(a)).slice(0, 15);
  const x = scaleLinear().domain([0, Math.max(...states.map(value))]).nice().range([m.left, width - m.right]);
  const step = (height - m.top - m.bottom) / states.length;
  const formatter = metricFormatter(metric);
  return <figure className="chart-panel compact-chart">
    <div className="figure-head"><div><span className="figure-no">FIG. 03</span><h2>{profile.specialty}: state variation</h2></div><p>Top 15 states or territories for the selected measure. Values are aggregates, not quality scores.</p></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`State comparison for ${profile.specialty}`}>
      {x.ticks(5).map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1={m.top} y2={height - m.bottom} className="gridline"/><text x={x(tick)} y={height - m.bottom + 22} textAnchor="middle" className="tick">{formatter(tick)}</text></g>)}
      {states.map((d, i) => { const yy = m.top + i * step + step / 2; return <g key={d.code}><text x={m.left - 12} y={yy + 4} textAnchor="end" className="state-label">{d.name}</text><line x1={m.left} x2={x(value(d))} y1={yy} y2={yy} className="stem"/><circle cx={x(value(d))} cy={yy} r="5.5" className="state-dot"/><text x={x(value(d)) + 11} y={yy + 4} className="value-label">{formatter(value(d))}</text></g>; })}
      <text x={(m.left + width - m.right) / 2} y={height - 12} textAnchor="middle" className="axis-label">{metric === 'costPerClaim' ? 'TOTAL DRUG COST / CLAIM' : metric === 'opioidShare' ? 'REPORTED OPIOID CLAIM SHARE' : 'CLAIMS / PROVIDER'}</text>
    </svg>
  </figure>;
}
