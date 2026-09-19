'use client';

import { useId, useRef, useState, type PointerEvent } from 'react';
import { median } from 'd3-array';
import { scaleLinear, scaleLog, scaleSqrt } from 'd3-scale';
import type { Specialty } from '@/lib/prescriber';
import type { Lens } from '../week-01/analysis-charts';
import { boxBetween, groupSummary, insideBox, type Point, type SelectionBox } from './selection';

export type AxisScale = 'log' | 'linear';
export type ZoomLevel = 1 | 2 | 4;

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function zoomDomain(domain: [number, number], center: number, factor: ZoomLevel, logarithmic: boolean): [number, number] {
  if (factor === 1) return domain;
  const convert = logarithmic ? Math.log : (value: number) => value;
  const invert = logarithmic ? Math.exp : (value: number) => value;
  const low = convert(domain[0]);
  const high = convert(domain[1]);
  const span = (high - low) / factor;
  const middle = Math.max(low + span / 2, Math.min(high - span / 2, convert(center)));
  return [invert(middle - span / 2), invert(middle + span / 2)];
}

function spacedTicks(ticks: number[], position: (value: number) => number, start: number, end: number, minimumGap: number) {
  let last = -Infinity;
  return ticks.filter((tick) => {
    const pixel = position(tick);
    if (pixel < start - 1 || pixel > end + 1 || pixel - last < minimumGap) return false;
    last = pixel;
    return true;
  });
}

function correlation(rows: Specialty[], transform: (value: number) => number) {
  if (rows.length < 3) return null;
  const points = rows.map((d) => [transform(d.costPerClaim), transform(d.claims / d.providers)]);
  if (points.some((point) => !Number.isFinite(point[0]) || !Number.isFinite(point[1]))) return null;
  const averageX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const averageY = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const cross = points.reduce((sum, point) => sum + (point[0] - averageX) * (point[1] - averageY), 0);
  const spreadX = points.reduce((sum, point) => sum + (point[0] - averageX) ** 2, 0);
  const spreadY = points.reduce((sum, point) => sum + (point[1] - averageY) ** 2, 0);
  return spreadX && spreadY ? cross / Math.sqrt(spreadX * spreadY) : null;
}

export function InteractionScatter({ specialties, geography, geographyCost, selected, onSelect, lens, axisScale, zoom, zoomTarget }: {
  specialties: Specialty[];
  geography: string;
  geographyCost: number;
  selected: string;
  onSelect: (value: string) => void;
  lens: Lens;
  axisScale: AxisScale;
  zoom: ZoomLevel;
  zoomTarget: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mode, setMode] = useState<'inspect' | 'group'>('inspect');
  const [members, setMembers] = useState<string[]>([]);
  const [brushBox, setBrushBox] = useState<SelectionBox | null>(null);
  const [sort, setSort] = useState<'costPerClaim' | 'claimsPerProvider' | 'name'>('costPerClaim');
  const drag = useRef<{ start: Point; specialty: string | null; pointerId: number } | null>(null);
  const chartId = useId().replaceAll(':', '');
  const width = 900;
  const height = 570;
  const margin = { top: 79, right: 42, bottom: 91, left: 105 };
  const right = width - margin.right;
  const bottom = height - margin.bottom;
  const logarithmic = lens === 'economics' && axisScale === 'log';
  const xValue = (d: Specialty) => lens === 'economics' ? d.costPerClaim : d.opioidShare;
  const yValue = (d: Specialty) => lens === 'economics' ? d.claims / d.providers : d.antibioticShare;
  const xValues = specialties.map(xValue);
  const yValues = specialties.map(yValue);
  const makeScale = (values: number[], reversed: boolean) => {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const domain: [number, number] = logarithmic
      ? [low === high ? low / 1.5 : low, low === high ? high * 1.5 : high]
      : [0, high || 1];
    const scale = logarithmic ? scaleLog().domain(domain).nice() : scaleLinear().domain(domain).nice();
    return scale.range(reversed ? [bottom, margin.top] : [margin.left, right]);
  };
  const fullX = makeScale(xValues, false);
  const fullY = makeScale(yValues, true);
  const focus = specialties.find((d) => d.specialty === zoomTarget) ?? specialties[0];
  const x = (logarithmic ? scaleLog() : scaleLinear())
    .domain(zoomDomain(fullX.domain() as [number, number], xValue(focus), zoom, logarithmic))
    .range([margin.left, right]);
  const y = (logarithmic ? scaleLog() : scaleLinear())
    .domain(zoomDomain(fullY.domain() as [number, number], yValue(focus), zoom, logarithmic))
    .range([bottom, margin.top]);
  const r = scaleSqrt().domain([0, Math.max(...specialties.map((d) => d.providers))]).range([0, 20]);
  const xTicks = spacedTicks(x.ticks(8), x, margin.left, right, 75);
  const yTicks = spacedTicks(y.ticks(8).sort((a, b) => b - a), y, margin.top, bottom, 50);
  const xMedian = median(specialties, xValue) ?? 0;
  const yMedian = median(specialties, yValue) ?? 0;
  const xLabel = lens === 'economics' ? 'Total drug cost per claim (USD)' : 'Reported opioid claims / all claims (%)';
  const yLabel = lens === 'economics' ? 'Claims per provider record' : 'Reported antibiotic claims / all claims (%)';
  const formatX = (value: number) => lens === 'economics' ? `$${compact.format(value)}` : `${decimal.format(value)}%`;
  const formatY = (value: number) => lens === 'economics' ? compact.format(value) : `${decimal.format(value)}%`;
  const visible = specialties.filter((d) => xValue(d) >= x.domain()[0] && xValue(d) <= x.domain()[1] && yValue(d) >= y.domain()[0] && yValue(d) <= y.domain()[1]).sort((a, b) => b.providers - a.providers);
  const hoveredDatum = visible.find((d) => d.specialty === hovered);
  const medianVisible = xMedian >= x.domain()[0] && xMedian <= x.domain()[1] && yMedian >= y.domain()[0] && yMedian <= y.domain()[1];
  const rawCorrelation = correlation(specialties, (value) => value);
  const logCorrelation = correlation(specialties, Math.log);
  const rows = specialties.filter((d) => members.includes(d.specialty)).sort((a, b) => sort === 'name' ? a.specialty.localeCompare(b.specialty) : sort === 'claimsPerProvider' ? b.claims / b.providers - a.claims / a.providers : b.costPerClaim - a.costPerClaim);
  const totals = groupSummary(rows, geographyCost);
  const toggle = (name: string) => setMembers((current) => current.includes(name) ? current.filter((value) => value !== name) : [...current, name]);
  const position = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };
  const clamp = (point: Point) => ({ x: Math.max(margin.left, Math.min(right, point.x)), y: Math.max(margin.top, Math.min(bottom, point.y)) });
  const cancelDrag = () => { drag.current = null; setBrushBox(null); };
  const finishDrag = (event: PointerEvent<SVGSVGElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const point = position(event);
    if (point) {
      const box = boxBetween(active.start, clamp(point));
      if (Math.hypot(box.width, box.height) > 5) {
        setMembers(visible.filter((d) => insideBox({ x: x(xValue(d)), y: y(yValue(d)) }, box)).map((d) => d.specialty));
      } else if (active.specialty) toggle(active.specialty);
    }
    cancelDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <figure className="chart-panel revised-scatter">
    <div className="figure-head"><div><span className="figure-no">01 · WEEK 05 INTERACTION</span><h2>{lens === 'economics' ? 'Compare cost and prescribing volume' : 'Compare reported drug-category shares'}</h2></div><p>Collect a group of specialties, then compare their exact values below.</p></div>
    <div className="selection-toolbar">
      <div className="mode-buttons" role="group" aria-label="Chart interaction"><button type="button" aria-pressed={mode === 'inspect'} onClick={() => { setMode('inspect'); cancelDrag(); }}>Inspect</button><button type="button" aria-pressed={mode === 'group'} onClick={() => { setMode('group'); cancelDrag(); }}>Select group</button></div>
      <p id={`${chartId}-instructions`}>{mode === 'group' ? 'Drag a box to replace the group. Click a circle to add or remove it. Escape cancels a drag.' : 'Hover or focus a circle for details. Choose Select group to drag a comparison box.'} <a href={`#${chartId}-choose`}>Or choose by name ↓</a></p>
    </div>
    <div className="scatter-viewport"><svg viewBox={`0 0 ${width} ${height}`} role="group" aria-labelledby={`${chartId}-title ${chartId}-desc`} aria-describedby={`${chartId}-instructions`} className={`scatter ${mode === 'group' ? 'group-mode' : ''}`}
      onPointerDown={(event) => {
        if (mode !== 'group' || event.button !== 0 || !event.isPrimary) return;
        const point = position(event);
        if (!point || !insideBox(point, { x: margin.left, y: margin.top, width: right - margin.left, height: bottom - margin.top })) return;
        event.preventDefault();
        event.currentTarget.focus();
        const mark = (event.target as Element).closest('[data-specialty]');
        drag.current = { start: point, specialty: mark?.getAttribute('data-specialty') ?? null, pointerId: event.pointerId };
        setHovered(null);
        setBrushBox(boxBetween(point, point));
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => { const point = position(event); if (drag.current?.pointerId === event.pointerId && point) setBrushBox(boxBetween(drag.current.start, clamp(point))); }}
      onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
      onKeyDown={(event) => { if (event.key === 'Escape') cancelDrag(); }} tabIndex={mode === 'group' ? 0 : -1}>
      <title id={`${chartId}-title`}>Medicare Part D specialty comparison in {geography}</title>
      <desc id={`${chartId}-desc`}>{xLabel} against {yLabel}; {logarithmic ? 'logarithmic' : 'linear'} axes, {zoom} times zoom. Circle area represents provider records. {rows.length} specialties in the comparison group.</desc>
      <defs><clipPath id={`${chartId}-clip`}><rect x={margin.left} y={margin.top} width={right - margin.left} height={bottom - margin.top}/></clipPath></defs>
      <text x={margin.left} y="31" className="plot-title">{lens === 'economics' ? 'Cost per claim vs. claims per provider' : 'Opioid vs. antibiotic claim share'}</text>
      <text x={margin.left} y="52" className="plot-subtitle">{geography} · 2024 Medicare Part D · {logarithmic ? 'log' : 'linear'} scale · {zoom}× zoom</text>
      {hoveredDatum && <text x={right} y="72" textAnchor="end" className="plot-hover">{hoveredDatum.specialty}</text>}
      {xTicks.map((tick) => <g key={`x-${tick}`}><line x1={x(tick)} x2={x(tick)} y1={margin.top} y2={bottom} className="gridline"/><text x={x(tick)} y={bottom + 24} textAnchor="middle" className="tick">{formatX(tick)}</text></g>)}
      {yTicks.map((tick) => <g key={`y-${tick}`}><line x1={margin.left} x2={right} y1={y(tick)} y2={y(tick)} className="gridline"/><text x={margin.left - 13} y={y(tick) + 5} textAnchor="end" className="tick">{formatY(tick)}</text></g>)}
      <path d={`M${margin.left},${margin.top}V${bottom}H${right}`} className="plot-axis"/>
      {medianVisible && <g clipPath={`url(#${chartId}-clip)`}><line x1={x(xMedian)} x2={x(xMedian)} y1={margin.top} y2={bottom} className="median-line"/><line x1={margin.left} x2={right} y1={y(yMedian)} y2={y(yMedian)} className="median-line"/></g>}
      <g clipPath={`url(#${chartId}-clip)`}>
        {visible.map((d) => <g key={d.specialty} data-specialty={d.specialty} transform={`translate(${x(xValue(d))},${y(yValue(d))})`} role="button" tabIndex={0} aria-pressed={mode === 'group' ? members.includes(d.specialty) : undefined} aria-label={`${d.specialty}: ${formatX(xValue(d))} on the horizontal axis, ${formatY(yValue(d))} on the vertical axis, ${d.providers.toLocaleString()} provider records`} onMouseEnter={() => { if (!drag.current) { setHovered(d.specialty); onSelect(d.specialty); } }} onMouseLeave={() => setHovered(null)} onFocus={() => { setHovered(d.specialty); onSelect(d.specialty); }} onBlur={() => setHovered(null)} onClick={(event) => { if (mode === 'inspect') onSelect(d.specialty); else if (event.detail === 0) toggle(d.specialty); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (mode === 'group') toggle(d.specialty); else onSelect(d.specialty); } }} className="mark-group">
          <circle r={Math.max(7, r(d.providers))} fill="transparent"/><circle r={r(d.providers)} className={`mark ${members.includes(d.specialty) ? 'in-group' : members.length ? 'outside-group' : ''} ${d.specialty === selected ? 'inspected' : ''}`}/><title>{d.specialty}: {formatX(xValue(d))}, {formatY(yValue(d))}</title>
        </g>)}
      </g>
      {brushBox && <rect {...brushBox} className="selection-box" pointerEvents="none"/>}
      <text x={(margin.left + right) / 2} y={height - 23} textAnchor="middle" className="axis-label">{xLabel}</text>
      <text transform={`translate(27 ${(margin.top + bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">{yLabel}</text>
      <circle cx={margin.left + 7} cy={height - 53} r="7" className="mark"/><text x={margin.left + 24} y={height - 49} className="plot-legend">Circle area = provider records</text>
      <line x1={right - 184} x2={right - 154} y1={height - 53} y2={height - 53} className="median-line"/><text x={right - 146} y={height - 49} className="plot-legend">Specialty medians</text>
    </svg></div>
    <section className="group-comparison" aria-labelledby={`${chartId}-group-heading`}>
      <div className="comparison-heading"><h3 id={`${chartId}-group-heading`}>Your comparison group</h3><button type="button" disabled={!members.length} onClick={() => setMembers([])}>Clear group</button></div>
      <p role="status" className="group-status">{rows.length} of {specialties.length} plotted specialties selected{zoom > 1 ? ` · ${rows.filter((row) => !visible.includes(row)).length} selected outside this zoom` : ''}. <span className="group-key">Purple = in group</span>; dark outline = inspected.</p>
      {rows.length > 0 ? <>
        <dl className="group-metrics"><div><dt>Group cost / claim</dt><dd>{totals.costPerClaim === null ? '—' : `$${decimal.format(totals.costPerClaim)}`}</dd></div><div><dt>Group claims / provider</dt><dd>{totals.claimsPerProvider === null ? '—' : decimal.format(totals.claimsPerProvider)}</dd></div><div><dt>Share of {geography} cost</dt><dd>{totals.costShare === null ? '—' : `${decimal.format(totals.costShare)}%`}</dd></div></dl>
        <div className="comparison-sort"><label htmlFor={`${chartId}-sort`}>Order rows</label><select id={`${chartId}-sort`} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="costPerClaim">Cost / claim ↓</option><option value="claimsPerProvider">Claims / provider ↓</option><option value="name">Specialty A–Z</option></select></div>
        <div className="comparison-table-wrap" tabIndex={0} role="region" aria-label="Scrollable selected specialty comparison"><table className="comparison-table"><caption>{geography} · 2024 · selected specialty aggregates</caption><thead><tr><th scope="col">Specialty</th><th scope="col">Provider records</th><th scope="col">Claims</th><th scope="col">Cost / claim</th><th scope="col">Claims / provider</th></tr></thead><tbody>{rows.map((d) => <tr key={d.specialty}><th scope="row"><button type="button" onClick={() => onSelect(d.specialty)}>{d.specialty}</button></th><td>{d.providers.toLocaleString()}</td><td>{d.claims.toLocaleString()}</td><td>${decimal.format(d.costPerClaim)}</td><td>{decimal.format(d.claims / d.providers)}</td></tr>)}</tbody></table></div>
        <p className="comparison-note">Group ratios use summed cost, claims, and provider records—not averages of specialty ratios. Cost share uses all specialties in {geography}, including those not plotted.</p>
      </> : <p className="empty-comparison">Which specialties combine high cost with low volume? Select a group to examine the differences.</p>}
      <details id={`${chartId}-choose`} className="name-selection"><summary>Choose specialties by name (keyboard &amp; touch)</summary><div className="specialty-choices">{[...specialties].sort((a, b) => a.specialty.localeCompare(b.specialty)).map((d) => <label key={d.specialty}><input type="checkbox" checked={members.includes(d.specialty)} onChange={() => toggle(d.specialty)}/><span>{d.specialty}</span></label>)}</div></details>
    </section>
    <figcaption>CMS Medicare Part D Prescribers by Provider, 2024. Up to 32 highest-total-cost specialties per geography; this subset changes with geography. {lens === 'economics' && rawCorrelation !== null && logCorrelation !== null ? `Across these ${specialties.length} aggregates, unweighted Pearson r is ${rawCorrelation.toFixed(2)} on raw values and ${logCorrelation.toFixed(2)} on log-transformed values; neither establishes economies of scale. ` : ''}{logarithmic ? 'Log spacing shows a wide range; switch to linear to compare absolute differences.' : 'Linear spacing shows absolute differences.'} Zoom centers on the inspected specialty when a zoom control is pressed. Groups persist across scales and views; changing geography clears the group.</figcaption>
  </figure>;
}
