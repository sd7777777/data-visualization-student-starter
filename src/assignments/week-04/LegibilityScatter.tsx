'use client';

import { useId, useState } from 'react';
import { median } from 'd3-array';
import { scaleLinear, scaleLog, scaleSqrt } from 'd3-scale';
import type { Specialty } from '@/lib/prescriber';
import type { Lens } from '../week-01/analysis-charts';

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

export function LegibilityScatter({ specialties, geography, selected, onSelect, lens, axisScale, zoom, zoomTarget }: {
  specialties: Specialty[];
  geography: string;
  selected: string;
  onSelect: (value: string) => void;
  lens: Lens;
  axisScale: AxisScale;
  zoom: ZoomLevel;
  zoomTarget: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
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
  const r = scaleSqrt().domain([0, Math.max(...specialties.map((d) => d.providers))]).range([4, 20]);
  const xTicks = spacedTicks(x.ticks(8), x, margin.left, right, 75);
  const yTicks = spacedTicks(y.ticks(8).sort((a, b) => b - a), y, margin.top, bottom, 50);
  const xMedian = median(specialties, xValue) ?? 0;
  const yMedian = median(specialties, yValue) ?? 0;
  const xLabel = lens === 'economics' ? 'Total drug cost per claim (USD)' : 'Reported opioid claims / all claims (%)';
  const yLabel = lens === 'economics' ? 'Claims per provider record' : 'Reported antibiotic claims / all claims (%)';
  const formatX = (value: number) => lens === 'economics' ? `$${compact.format(value)}` : `${decimal.format(value)}%`;
  const formatY = (value: number) => lens === 'economics' ? compact.format(value) : `${decimal.format(value)}%`;
  const visible = specialties.filter((d) => xValue(d) >= x.domain()[0] && xValue(d) <= x.domain()[1] && yValue(d) >= y.domain()[0] && yValue(d) <= y.domain()[1]);
  const hoveredDatum = visible.find((d) => d.specialty === hovered);
  const medianVisible = xMedian >= x.domain()[0] && xMedian <= x.domain()[1] && yMedian >= y.domain()[0] && yMedian <= y.domain()[1];
  const rawCorrelation = correlation(specialties, (value) => value);
  const logCorrelation = correlation(specialties, Math.log);

  return <figure className="chart-panel revised-scatter">
    <div className="figure-head"><div><span className="figure-no">01 · WEEK 04 REVISION</span><h2>Cost and prescribing volume by specialty</h2></div><p>One circle per specialty; area represents provider-record count.</p></div>
    <div className="scatter-viewport"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`} className="scatter">
      <title id={`${chartId}-title`}>Medicare Part D specialty comparison in {geography}</title>
      <desc id={`${chartId}-desc`}>{xLabel} against {yLabel}; {logarithmic ? 'logarithmic' : 'linear'} axes, {zoom} times zoom. Select a circle to inspect its values.</desc>
      <defs><clipPath id={`${chartId}-clip`}><rect x={margin.left} y={margin.top} width={right - margin.left} height={bottom - margin.top}/></clipPath></defs>
      <text x={margin.left} y="31" className="plot-title">{lens === 'economics' ? 'Cost per claim vs. claims per provider' : 'Opioid vs. antibiotic claim share'}</text>
      <text x={margin.left} y="52" className="plot-subtitle">{geography} · 2024 Medicare Part D · {logarithmic ? 'log' : 'linear'} scale · {zoom}× zoom</text>
      {hoveredDatum && <text x={right} y="52" textAnchor="end" className="plot-hover">{hoveredDatum.specialty}</text>}
      {xTicks.map((tick) => <g key={`x-${tick}`}><line x1={x(tick)} x2={x(tick)} y1={margin.top} y2={bottom} className="gridline"/><text x={x(tick)} y={bottom + 24} textAnchor="middle" className="tick">{formatX(tick)}</text></g>)}
      {yTicks.map((tick) => <g key={`y-${tick}`}><line x1={margin.left} x2={right} y1={y(tick)} y2={y(tick)} className="gridline"/><text x={margin.left - 13} y={y(tick) + 5} textAnchor="end" className="tick">{formatY(tick)}</text></g>)}
      <path d={`M${margin.left},${margin.top}V${bottom}H${right}`} className="plot-axis"/>
      {medianVisible && <g clipPath={`url(#${chartId}-clip)`}><line x1={x(xMedian)} x2={x(xMedian)} y1={margin.top} y2={bottom} className="median-line"/><line x1={margin.left} x2={right} y1={y(yMedian)} y2={y(yMedian)} className="median-line"/></g>}
      <g clipPath={`url(#${chartId}-clip)`}>
        {visible.map((d) => <g key={d.specialty} transform={`translate(${x(xValue(d))},${y(yValue(d))})`} role="button" tabIndex={0} aria-label={`${d.specialty}: ${formatX(xValue(d))} on the horizontal axis, ${formatY(yValue(d))} on the vertical axis, ${d.providers.toLocaleString()} provider records`} onMouseEnter={() => { setHovered(d.specialty); onSelect(d.specialty); }} onMouseLeave={() => setHovered(null)} onFocus={() => { setHovered(d.specialty); onSelect(d.specialty); }} onBlur={() => setHovered(null)} onClick={() => onSelect(d.specialty)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(d.specialty); } }} className="mark-group">
          <circle r={r(d.providers)} className={d.specialty === selected ? 'mark active' : 'mark'}/><title>{d.specialty}: {formatX(xValue(d))}, {formatY(yValue(d))}</title>
        </g>)}
      </g>
      <text x={(margin.left + right) / 2} y={height - 23} textAnchor="middle" className="axis-label">{xLabel}</text>
      <text transform={`translate(27 ${(margin.top + bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">{yLabel}</text>
      <circle cx={margin.left + 7} cy={height - 53} r="7" className="mark"/><text x={margin.left + 24} y={height - 49} className="plot-legend">Circle area = provider records</text>
      <line x1={right - 184} x2={right - 154} y1={height - 53} y2={height - 53} className="median-line"/><text x={right - 146} y={height - 49} className="plot-legend">Specialty medians</text>
    </svg></div>
    <figcaption>CMS Medicare Part D Prescribers by Provider, 2024. {lens === 'economics' && rawCorrelation !== null && logCorrelation !== null ? `Across ${specialties.length} specialty aggregates, Pearson r is ${rawCorrelation.toFixed(2)} on raw values and ${logCorrelation.toFixed(2)} on log-transformed values; neither establishes economies of scale. ` : ''}{logarithmic ? 'Log spacing shows a wide range; switch to linear to compare absolute differences.' : 'Linear spacing shows absolute differences.'} Zoom is centered on the specialty selected when you press a zoom control.</figcaption>
  </figure>;
}
