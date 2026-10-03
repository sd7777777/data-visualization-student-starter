'use client';

import { useEffect, useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import {
  ARCHIVE,
  ORIGINAL,
  amount,
  comparison,
  items,
  kindInfo,
  mosaic,
  type Kind,
} from './data';
import './trillion-atlas.css';

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function TrillionAtlas() {
  const [filter, setFilter] = useState<Kind | 'all'>('all');
  const [mode, setMode] = useState<'mosaic' | 'rank'>('mosaic');
  const [selected, setSelected] = useState('one-percent');
  const [left, setLeft] = useState('us-gdp');
  const [right, setRight] = useState('military');
  const [notice, setNotice] = useState('');
  const [back, setBack] = useState('./');
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const p = new URLSearchParams(location.search);
      if (items.some((d) => d.id === p.get('a'))) setLeft(p.get('a')!);
      if (items.some((d) => d.id === p.get('b'))) setRight(p.get('b')!);
      setBack(location.pathname.replace(/week-7(?:\.html)?\/?$/, ''));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const shown = useMemo(
    () => items.filter((d) => filter === 'all' || d.kind === filter),
    [filter],
  );
  const tiles = useMemo(() => mosaic(shown), [shown]);
  const focus = items.find((d) => d.id === selected)!;
  const a = items.find((d) => d.id === left)!;
  const b = items.find((d) => d.id === right)!;
  const result = comparison(a, b);
  const compareScale = scaleLinear()
    .domain([0, Math.max(a.value, b.value)])
    .range([0, 100]);
  const rankScale = scaleLinear()
    .domain([0, Math.max(...shown.map((d) => d.value))])
    .range([0, 100]);
  function setCategory(next: Kind | 'all') {
    setFilter(next);
    if (next !== 'all' && focus.kind !== next)
      setSelected(items.find((d) => d.kind === next)!.id);
  }
  function exportCsv() {
    const rows = [
      [
        'label',
        'trillion_USD',
        'type',
        'time_basis',
        'reference_edition',
        'note',
        'source',
      ],
      ...shown.map((d) => [
        d.label,
        String(d.value),
        kindInfo[d.kind].label,
        d.basis,
        '2018-08-16',
        d.note,
        ARCHIVE,
      ]),
    ];
    download(
      'trillion-atlas-2018-reference.csv',
      rows
        .map((r) => r.map((s) => '"' + s.replaceAll('"', '""') + '"').join(','))
        .join('\r\n'),
      'text/csv;charset=utf-8',
    );
    setNotice(`Downloaded ${shown.length} rows.`);
  }
  async function share() {
    const url = new URL(location.href);
    url.hash = 'compare';
    url.search = '';
    url.searchParams.set('a', left);
    url.searchParams.set('b', right);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice('Comparison link copied.');
    } catch {
      setNotice(`Copy this comparison link: ${url.href}`);
    }
  }
  return (
    <div className="ta">
      <a className="ta-skip" href="#atlas">
        Skip to the atlas
      </a>
      <header className="ta-header">
        <a className="ta-brand" href={back}>
          ← Coursework
        </a>
        <nav aria-label="Atlas navigation">
          <a href="#atlas">Chart</a>
          <a href="#compare">Compare</a>
          <a href="#sources">Sources</a>
        </nav>
        <span className="ta-course">Week 07</span>
      </header>
      <main id="top">
        <div className="ta-heading">
          <h1 id="ta-title">Trillion Atlas</h1>
          <p>Compare 20 historical dollar amounts.</p>
          <span>2018 reference · US$ trillions · $1T = 1,000 billion</span>
        </div>
        <section id="atlas" className="ta-section" aria-labelledby="ta-title">
          <p className="ta-instruction">
            Area shows the amount; color shows its type. Select a block for
            details.
          </p>
          <div className="ta-toolbar">
            <fieldset className="ta-filters" aria-label="Filter by money type">
              <button
                aria-pressed={filter === 'all'}
                onClick={() => setCategory('all')}
              >
                Everything <small>20</small>
              </button>
              {(Object.keys(kindInfo) as Kind[]).map((k) => (
                <button
                  key={k}
                  aria-pressed={filter === k}
                  onClick={() => setCategory(k)}
                >
                  <i style={{ background: kindInfo[k].color }} />
                  {kindInfo[k].label}
                </button>
              ))}
            </fieldset>
            <fieldset className="ta-view" aria-label="Chart view">
              <button
                aria-pressed={mode === 'mosaic'}
                onClick={() => setMode('mosaic')}
              >
                ▦ Mosaic
              </button>
              <button
                aria-pressed={mode === 'rank'}
                onClick={() => setMode('rank')}
              >
                ☰ Ranked bars
              </button>
            </fieldset>
          </div>
          <p className="ta-reading-note">
            {filter === 'all'
              ? 'These amounts have different time bases and overlap. Compare scale; do not add them.'
              : kindInfo[filter].explanation +
                ' Categories may still overlap and use different observation years.'}{' '}
            {mode === 'mosaic'
              ? 'The mosaic refits when filtered.'
              : 'All bars begin at zero.'}
          </p>
          <div className="ta-atlas-layout">
            <div className="ta-chart-wrap">
              {mode === 'mosaic' ? (
                <div
                  className="ta-mosaic"
                  aria-label="Proportional area comparison, in trillions of US dollars"
                >
                  {tiles.map(({ item: d, x, y, w, h }) => (
                    <button
                      key={d.id}
                      className={`ta-tile ${w < 120 || h < 80 ? 'ta-tile-small' : ''}`}
                      style={{
                        left: `${x / 10}%`,
                        top: `${y / 6.2}%`,
                        width: `${w / 10}%`,
                        height: `${h / 6.2}%`,
                        background: kindInfo[d.kind].color,
                        color: kindInfo[d.kind].ink,
                      }}
                      aria-label={`${d.label}, ${amount(d.value)}, ${kindInfo[d.kind].label}`}
                      aria-pressed={selected === d.id}
                      onClick={() => setSelected(d.id)}
                    >
                      <b
                        style={{
                          fontSize: `clamp(12px, ${Math.min(4, w / 50, h / 26)}vw, ${Math.min(48, w / 4, h / 3)}px)`,
                        }}
                      >
                        {d.value}
                        <span>T</span>
                      </b>
                      {w >= 95 && h >= 62 && (
                        <span className="ta-tile-name">{d.short}</span>
                      )}
                      {w >= 230 && h >= 130 && (
                        <small>
                          {kindInfo[d.kind].label} <span>↗</span>
                        </small>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ta-ranking">
                  {[...shown]
                    .sort((x, y) => y.value - x.value)
                    .map((d) => (
                      <button
                        key={d.id}
                        aria-pressed={selected === d.id}
                        onClick={() => setSelected(d.id)}
                        className="ta-rank-row"
                      >
                        <span>{d.short}</span>
                        <span className="ta-bar-track">
                          <i
                            style={{
                              width: `${rankScale(d.value)}%`,
                              background: kindInfo[d.kind].color,
                            }}
                          />
                        </span>
                        <b>{amount(d.value)}</b>
                      </button>
                    ))}
                </div>
              )}
              <div className="ta-chart-footer">
                <span>
                  {shown.length} historical reference values ·{' '}
                  {mode === 'mosaic' ? 'linear area' : 'linear length'}
                </span>
                <button onClick={exportCsv}>Download data ↓</button>
              </div>
            </div>
            <aside className="ta-inspector" aria-live="polite">
              <p className="ta-eyebrow">Selected amount</p>
              <span
                className="ta-type"
                style={{
                  background: kindInfo[focus.kind].color,
                  color: kindInfo[focus.kind].ink,
                }}
              >
                {kindInfo[focus.kind].label}
              </span>
              <p className="ta-inspector-value">{amount(focus.value)}</p>
              <h3>{focus.label}</h3>
              <p className="ta-basis">{focus.basis}</p>
              <p>{focus.note}</p>
              <button
                className="ta-primary"
                onClick={() => {
                  setLeft(focus.id);
                  document
                    .getElementById('compare')
                    ?.scrollIntoView({ behavior: 'auto' });
                  document
                    .getElementById('compare-a')
                    ?.focus({ preventScroll: true });
                }}
              >
                Compare this amount <span aria-hidden="true">↗</span>
              </button>
              <a className="ta-source-link" href={ARCHIVE}>
                See the original 2018 value ↗
              </a>
            </aside>
          </div>
        </section>
        <section
          id="compare"
          className="ta-section ta-compare"
          aria-labelledby="compare-title"
        >
          <div className="ta-section-head">
            <h2 id="compare-title">Compare two amounts</h2>
            <button className="ta-outline" onClick={share}>
              Copy comparison link ↗
            </button>
          </div>
          <div className="ta-compare-grid">
            <div className="ta-compare-controls">
              {[
                { key: 'a', value: left, set: setLeft },
                { key: 'b', value: right, set: setRight },
              ].map(({ key, value, set }) => (
                <label key={key} htmlFor={`compare-${key}`}>
                  <span>AMOUNT {key.toUpperCase()}</span>
                  <select
                    id={`compare-${key}`}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  >
                    {items.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label} · {amount(d.value)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                className="ta-swap"
                onClick={() => {
                  setLeft(right);
                  setRight(left);
                }}
              >
                ⇄ Swap amounts
              </button>
            </div>
            <div className="ta-ratio" aria-live="polite">
              <b>
                {result.ratio.toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}
                <span>×</span>
              </b>
              <p>
                <strong>{a.label}</strong> is{' '}
                {result.ratio.toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}{' '}
                times the amount of <strong>{b.label.toLowerCase()}</strong> in
                the reference.
              </p>
            </div>
          </div>
          <div className="ta-compare-bars">
            {[a, b].map((d, i) => (
              <div key={i}>
                <div>
                  <span>
                    {i === 0 ? 'A' : 'B'} / {d.label}
                  </span>
                  <b>{amount(d.value)}</b>
                </div>
                <div className="ta-compare-track">
                  <i
                    style={{
                      width: `${compareScale(d.value)}%`,
                      background: kindInfo[d.kind].color,
                    }}
                  />
                </div>
                <small>{d.basis}</small>
              </div>
            ))}
          </div>
          <p className="ta-caution" aria-live="polite">
            <b>
              {left === right
                ? 'Same amount selected.'
                : !result.sameKind
                  ? 'Different kinds of money.'
                  : !result.sameBasis
                    ? 'Different measurement bases.'
                    : 'Scale comparison only.'}
            </b>{' '}
            {left === right
              ? 'Choose a different amount to compare.'
              : !result.sameKind
                ? 'The ratio compares size only. Stocks, annual activity and investment estimates have different time bases.'
                : 'Scope and observation dates may differ; see the source notes.'}
          </p>
        </section>
        <section
          id="sources"
          className="ta-section ta-sources"
          aria-labelledby="sources-title"
        >
          <h2 id="sources-title">Sources & notes</h2>
          <p>
            Inspired by David McCandless’s <a href={ORIGINAL}>Trillions</a>,
            Information is Beautiful. All 20 values come from the{' '}
            <a href={ARCHIVE}>August 16, 2018 graphic</a>. They are historical,
            not current estimates.
          </p>
          <details className="ta-reading">
            <summary>Data and method</summary>
            <p>
              Amounts overlap: country GDP is included in world GDP, and some
              investment estimates span several years. Do not add the blocks.
              The source does not supply every observation date or definition;
              individual notes flag these gaps. No inflation adjustment is
              applied.
            </p>
            <p>
              Tile area is proportional to value. Filtering rescales the mosaic.
              Ranked bars and pair comparisons use zero-based linear D3 scales.
              Select small blocks for their full labels, or switch to Ranked
              bars. Categories are added for this recreation.
            </p>
          </details>
        </section>
        <footer className="ta-footer">
          <b>TRILLION ATLAS</b>
          <span>Week 07 · Recreate an Inspirational Piece</span>
          <a href="#top">Back to the top ↑</a>
        </footer>
        <output className="ta-notice">
          {notice && (
            <>
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                ×
              </button>
            </>
          )}
        </output>
      </main>
    </div>
  );
}
