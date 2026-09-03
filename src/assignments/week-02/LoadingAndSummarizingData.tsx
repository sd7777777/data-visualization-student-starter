import { useEffect, useMemo, useState } from 'react';

interface BeeColonyRow {
  year: number;
  months: string;
  state: string;
  colonyN: number | null;
  colonyMax: number | null;
  colonyLost: number | null;
  colonyLostPct: number | null;
  colonyAdded: number | null;
  colonyReno: number | null;
  colonyRenoPct: number | null;
}

const DATA_URL = `${import.meta.env.BASE_URL}data/bee-colony-loss/bee-colony-loss.csv`;
const ALL_STATES = 'All states';
const DEFAULT_STATE = 'Ohio';
const AGGREGATE_STATES = new Set(['Other States', 'United States']);

function toNumber(value: string) {
  return value === 'NA' || value === '' ? null : Number(value);
}

function parseCsv(csv: string): BeeColonyRow[] {
  const lines = csv.trim().split(/\r?\n/);
  lines.shift();

  return lines.filter(Boolean).map((line) => {
    const [year, months, state, colonyN, colonyMax, colonyLost, colonyLostPct, colonyAdded, colonyReno, colonyRenoPct] = line.split(',');
    return {
      year: Number(year),
      months,
      state,
      colonyN: toNumber(colonyN),
      colonyMax: toNumber(colonyMax),
      colonyLost: toNumber(colonyLost),
      colonyLostPct: toNumber(colonyLostPct),
      colonyAdded: toNumber(colonyAdded),
      colonyReno: toNumber(colonyReno),
      colonyRenoPct: toNumber(colonyRenoPct),
    };
  });
}

function compactNumber(value: number | null) {
  return value === null ? '—' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function integerNumber(value: number | null) {
  return value === null ? '—' : value.toLocaleString('en-US');
}

function percent(value: number | null) {
  return value === null ? '—' : `${value}%`;
}

function average(values: Array<number | null>) {
  const validValues = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return validValues.length ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length : 0;
}

function periodKey(row: BeeColonyRow) {
  return `${row.year} ${row.months}`;
}

function quarterLabel(period: string) {
  const [year, months] = period.split(' ');
  const quarter = months === 'January-March' ? 'Q1' : months === 'April-June' ? 'Q2' : months === 'July-September' ? 'Q3' : 'Q4';
  return `${year} ${quarter}`;
}

function makeSegments(values: Array<number | null>, x: (index: number) => number, y: (value: number) => number) {
  const segments: string[] = [];
  let segment = '';
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      if (segment) segments.push(segment);
      segment = '';
      return;
    }
    segment += `${segment ? 'L' : 'M'} ${x(index)} ${y(value)} `;
  });
  if (segment) segments.push(segment);
  return segments;
}

function TrendChart({ rows, selectedState }: { rows: BeeColonyRow[]; selectedState: string }) {
  const width = 760;
  const height = 270;
  const margin = { top: 20, right: 18, bottom: 42, left: 42 };
  const reportRows = rows.filter((row) => !AGGREGATE_STATES.has(row.state));
  const periods = [...new Set(reportRows.map(periodKey))];
  const annualAverages = periods.map((period) => ({
    period,
    value: average(reportRows.filter((row) => periodKey(row) === period).map((row) => row.colonyLostPct)),
  }));
  const selectedValues = selectedState === ALL_STATES
    ? []
    : periods.map((period) => reportRows.find((row) => row.state === selectedState && periodKey(row) === period)?.colonyLostPct ?? null);
  const maxValue = Math.max(60, ...annualAverages.map((row) => row.value), ...selectedValues.filter((value): value is number => value !== null));
  const x = (index: number) => margin.left + (index / Math.max(1, periods.length - 1)) * (width - margin.left - margin.right);
  const y = (value: number) => height - margin.bottom - (value / maxValue) * (height - margin.top - margin.bottom);
  const averageSegments = makeSegments(annualAverages.map((row) => row.value), x, y);
  const stateSegments = makeSegments(selectedValues, x, y);

  return (
    <div className="chart-wrap">
      <div className="chart-heading">
        <div><p className="eyebrow">Quarterly view</p><h3>Reported colony loss</h3></div>
        <span className="legend"><i className="legend-dot average-dot" /> All-state average {selectedState !== ALL_STATES && <><i className="legend-dot state-dot" /> {selectedState}</>}</span>
      </div>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart showing quarterly average colony loss, with the selected state highlighted when one is chosen.">
        {[0, 20, 40, 60].map((tick) => <g key={tick}>
          <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="grid-line" />
          <text x={margin.left - 10} y={y(tick) + 4} textAnchor="end" className="axis-label">{tick}%</text>
        </g>)}
        {averageSegments.map((segment) => <path key={segment} d={segment} className="average-line" />)}
        {annualAverages.map((row, index) => <circle key={row.period} cx={x(index)} cy={y(row.value)} r="3.5" className="average-point"><title>{row.period}: {row.value.toFixed(1)}% average loss</title></circle>)}
        {stateSegments.map((segment) => <path key={segment} d={segment} className="state-line" />)}
        {selectedValues.map((value, index) => value === null ? null : <circle key={`${periods[index]}-selected`} cx={x(index)} cy={y(value)} r="4" className="state-point"><title>{selectedState}, {periods[index]}: {value}% loss</title></circle>)}
        {periods.map((period, index) => index % 4 === 0 || index === periods.length - 1 ? <text key={period} x={x(index)} y={height - 10} textAnchor="middle" className="axis-label">{quarterLabel(period)}</text> : null)}
      </svg>
      <p className="chart-note">The source begins in 2015 and ends in April–June 2021. A missing value is shown as a gap instead of being treated as zero.</p>
    </div>
  );
}

function ColonyBars({ rows }: { rows: BeeColonyRow[] }) {
  const reportRows = rows.filter((row) => !AGGREGATE_STATES.has(row.state));
  const latestPeriod = [...new Set(reportRows.map(periodKey))].at(-1) ?? '';
  const latestRows = reportRows.filter((row) => periodKey(row) === latestPeriod).sort((a, b) => (b.colonyN ?? 0) - (a.colonyN ?? 0)).slice(0, 5);
  const max = latestRows[0]?.colonyN ?? 1;

  return (
    <div className="bars-card">
      <div className="chart-heading">
        <div><p className="eyebrow">Latest quarter</p><h3>Where colonies are concentrated</h3></div>
        <span className="small-label">{quarterLabel(latestPeriod)}</span>
      </div>
      <div className="bar-list">
        {latestRows.map((row) => <div className="bar-row" key={row.state}>
          <div className="bar-label"><span>{row.state}</span><strong>{compactNumber(row.colonyN)}</strong></div>
          <div className="bar-track"><span style={{ width: `${((row.colonyN ?? 0) / max) * 100}%` }} /></div>
        </div>)}
      </div>
      <p className="chart-note">This compares managed colonies reported in the latest quarter, not the total wild bee population.</p>
    </div>
  );
}

export function LoadingAndSummarizingData() {
  const [rows, setRows] = useState<BeeColonyRow[]>([]);
  const [stateFilter, setStateFilter] = useState(DEFAULT_STATE);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
        return response.text();
      })
      .then((csv) => {
        setRows(parseCsv(csv));
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const states = useMemo(() => [...new Set(rows.map((row) => row.state).filter((state) => !AGGREGATE_STATES.has(state)))].sort(), [rows]);
  const filteredRows = stateFilter === ALL_STATES ? rows.filter((row) => !AGGREGATE_STATES.has(row.state)) : rows.filter((row) => row.state === stateFilter);
  const averageLoss = average(filteredRows.map((row) => row.colonyLostPct));
  const peakRow = filteredRows.reduce<BeeColonyRow | undefined>((peak, row) => row.colonyLostPct !== null && (!peak || (peak.colonyLostPct ?? -1) < row.colonyLostPct) ? row : peak, undefined);
  const selectedLatest = filteredRows.at(-1);
  const reportRowCount = rows.filter((row) => !AGGREGATE_STATES.has(row.state)).length;

  return (
    <main className="assignment-page week-two-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="kicker">Week 2 · Dataset exploration</p>
          <h1>Ohio in the <span>hive</span></h1>
          <p className="hero-lede">A first look at where managed bee colonies are concentrated, how quarterly losses move, and how Ohio compares with the wider set of reporting states.</p>
          <div className="source-chip"><span className="bee-mark">✦</span> USDA/NASS survey data · 2015–2021</div>
        </div>
        <div className="hero-stamp" aria-hidden="true"><span>bee</span><strong>atlas</strong><small>field notes / 02</small></div>
      </section>

      {status === 'loading' && <div className="notice-card">Loading the dataset…</div>}
      {status === 'error' && <div className="notice-card error-card">The dataset could not be loaded. Check that {DATA_URL} exists in the public folder.</div>}
      {status === 'ready' && <>
        <section className="summary-grid" aria-label="Dataset summary">
          <div className="summary-card accent-card"><span>Rows loaded</span><strong>{rows.length.toLocaleString()}</strong><small>{reportRowCount.toLocaleString()} state rows + aggregate rows</small></div>
          <div className="summary-card"><span>Columns</span><strong>10</strong><small>time, place, counts, and percentages</small></div>
          <div className="summary-card"><span>States</span><strong>{states.length}</strong><small>Ohio is selected by default</small></div>
          <div className="summary-card"><span>Average loss</span><strong>{averageLoss.toFixed(1)}%</strong><small>across the current selection</small></div>
        </section>

        <section className="control-strip">
          <div><p className="eyebrow">Explore the sample</p><h2>Filter by state</h2></div>
          <label className="select-label" htmlFor="state-filter">State
            <select id="state-filter" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
              <option>{ALL_STATES}</option>
              {states.map((state) => <option key={state}>{state}</option>)}
            </select>
          </label>
          {peakRow && <p className="peak-note">Highest reported loss in view: <strong>{peakRow.state}</strong>, {peakRow.year} {peakRow.months} at <strong>{percent(peakRow.colonyLostPct)}</strong>.</p>}
        </section>

        <section className="visual-grid">
          <TrendChart rows={rows} selectedState={stateFilter} />
          <ColonyBars rows={rows} />
        </section>

        <section className="data-table-card">
          <div className="table-heading"><div><p className="eyebrow">Parsed records</p><h2>{stateFilter === ALL_STATES ? 'A sample of the records' : `${stateFilter} by quarter`}</h2></div><span>{filteredRows.length.toLocaleString()} visible rows</span></div>
          <div className="table-scroll"><table><thead><tr><th>Year</th><th>Quarter</th><th>State</th><th>Colonies</th><th>Lost</th><th>Loss rate</th><th>Added</th></tr></thead><tbody>
            {filteredRows.slice(0, 12).map((row) => <tr key={`${row.year}-${row.months}-${row.state}`}><td>{row.year}</td><td>{row.months}</td><td><span className="state-dot-table" />{row.state}</td><td>{integerNumber(row.colonyN)}</td><td>{integerNumber(row.colonyLost)}</td><td>{percent(row.colonyLostPct)}</td><td>{integerNumber(row.colonyAdded)}</td></tr>)}
          </tbody></table></div>
          <p className="table-note">Showing the first 12 rows of the current selection. Full dataset: <a href={DATA_URL}>download the CSV</a>{selectedLatest ? ` · latest visible record: ${selectedLatest.year} ${selectedLatest.months}` : ''}.</p>
        </section>
      </>}
      <footer className="assignment-footer">A larger dataset makes the next question possible: what does an Ohio season look like beside the national pattern?</footer>
    </main>
  );
}
