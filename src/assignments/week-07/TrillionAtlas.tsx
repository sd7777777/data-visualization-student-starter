'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Focusable scroll region supports keyboard panning when zoomed. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import {
  ARCHIVE,
  ORIGINAL,
  amount,
  comparison,
  items,
  kindInfo,
  mosaic,
  mosaicSize,
  groupedMosaic,
  type Kind,
} from './data';
import './trillion-atlas.css';

export default function TrillionAtlas() {
  const [filter, setFilter] = useState<Kind | 'all'>('all');
  const [selected, setSelected] = useState('one-percent');
  const [grouped, setGrouped] = useState(false);
  const [grid, setGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState({ width: 1400, height: 850 });
  const [left, setLeft] = useState('us-gdp');
  const [right, setRight] = useState('military');
  const [compareOpen, setCompareOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [back, setBack] = useState('./');
  const detail = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(node);
    const frame = requestAnimationFrame(() => {
      const p = new URLSearchParams(location.search);
      if (items.some((d) => d.id === p.get('a'))) {
        setLeft(p.get('a')!);
        setCompareOpen(true);
      }
      if (items.some((d) => d.id === p.get('b'))) setRight(p.get('b')!);
      setBack(location.pathname.replace(/week-7(?:\.html)?\/?$/, ''));
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  const shown = useMemo(
    () => items.filter((d) => filter === 'all' || d.kind === filter),
    [filter],
  );
  const { width, height } = mosaicSize(shown, size.width, size.height, zoom);
  const tiles = useMemo(
    () =>
      grouped
        ? groupedMosaic(shown, width, height)
        : mosaic(shown, 0, 0, width, height),
    [shown, width, height, grouped],
  );
  const unit = Math.sqrt(
    (width * height) / shown.reduce((n, d) => n + d.value, 0),
  );
  const focus = items.find((d) => d.id === selected)!;
  const a = items.find((d) => d.id === left)!;
  const b = items.find((d) => d.id === right)!;
  const ratio = comparison(a, b);
  const bars = scaleLinear()
    .domain([0, Math.max(a.value, b.value)])
    .range([0, 100]);
  const matches = shown.filter((d) =>
    d.label.toLowerCase().includes(query.toLowerCase()),
  );
  function chooseFilter(next: Kind | 'all') {
    setFilter(next);
    setZoom(1);
    setQuery('');
    if (next !== 'all' && focus.kind !== next)
      setSelected(items.find((d) => d.kind === next)!.id);
    viewport.current?.scrollTo(0, 0);
  }
  function changeZoom(next: number) {
    setZoom(next);
    // Keep the selected rectangle visible when expanding the canvas.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const node = document.getElementById(`tile-${selected}`),
          frame = viewport.current;
        if (node && frame)
          frame.scrollTo({
            left:
              node.offsetLeft + node.offsetWidth / 2 - frame.clientWidth / 2,
            top:
              node.offsetTop + node.offsetHeight / 2 - frame.clientHeight / 2,
            behavior: 'instant',
          });
      }),
    );
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
    const url = URL.createObjectURL(
      new Blob(
        [
          rows
            .map((r) =>
              r.map((v) => '"' + v.replaceAll('"', '""') + '"').join(','),
            )
            .join('\r\n'),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trillion-atlas-2018-reference.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setNotice(`Copy this link: ${url.href}`);
    }
  }
  function openTile(id: string) {
    setSelected(id);
    detail.current?.showModal();
  }
  function compareSelected() {
    detail.current?.close();
    setLeft(selected);
    setCompareOpen(true);
    requestAnimationFrame(() => {
      document.getElementById('compare-a')?.focus();
    });
  }
  return (
    <main className="ta" id="top">
      <header className="ta-header">
        <div>
          <h1>Trillions</h1>
          <span>33 amounts · 2018 reference · US$</span>
        </div>
        <a href={back}>← Coursework</a>
      </header>
      <section id="atlas" aria-label="Trillion-dollar mosaic">
        <div className="ta-toolbar">
          <fieldset className="ta-filters" aria-label="Filter by type">
            <button
              aria-pressed={filter === 'all'}
              onClick={() => chooseFilter('all')}
            >
              All 33
            </button>
            {(Object.keys(kindInfo) as Kind[]).map((k) => (
              <button
                key={k}
                aria-pressed={filter === k}
                onClick={() => chooseFilter(k)}
              >
                <i style={{ background: kindInfo[k].color }} />
                {kindInfo[k].label}
              </button>
            ))}
          </fieldset>
          <div className="ta-tools">
            <label>
              <input
                type="checkbox"
                checked={grouped}
                onChange={(e) => setGrouped(e.target.checked)}
              />{' '}
              Group by type
            </label>
            <label>
              <input
                type="checkbox"
                checked={grid}
                onChange={(e) => setGrid(e.target.checked)}
              />{' '}
              $1T grid
            </label>
            <label className="ta-zoom">
              Zoom
              <select
                aria-label="Mosaic zoom"
                value={zoom}
                onChange={(e) => changeZoom(Number(e.target.value))}
              >
                {[0, 1, 1.5, 2, 3].map((z) => (
                  <option key={z} value={z}>
                    {z === 0 ? 'Fit all' : `${z * 100}%`}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="search"
              aria-label="Find an amount"
              placeholder="Find amount…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="ta-chart-caption">
          <span>
            Twice the area = twice the dollars ·{' '}
            {grid ? 'one full grid square = $1 trillion' : 'grid hidden'} ·{' '}
            {query
              ? `${matches.length} matches`
              : grouped
                ? 'grouped by type'
                : 'ordered by amount'}
          </span>
          <span>
            {zoom === 0 ? 'All tiles in view' : 'Scroll to explore'} · Click for
            details · Amounts overlap.
          </span>
        </div>
        <section
          ref={viewport}
          className="ta-viewport"
          aria-label="Zoomable mosaic; scroll to explore"
          tabIndex={0}
        >
          <div className="ta-mosaic" style={{ width, height }}>
            {tiles.map((t) => {
              const d = t.item,
                small = t.w < 100 || t.h < 80,
                tiny = t.w < 65 || t.h < 55;
              const padding = tiny ? 3 : small ? 5 : 10;
              const valueFont = Math.max(
                9,
                Math.min(
                  66,
                  (t.w - padding * 2 - 8) /
                    (String(d.value).length * 0.62 + 1.2),
                  t.h / 3,
                ),
              );
              const detailed = t.w > 260 && t.h > 240;
              const label = t.w > 260 && t.h > 180 ? d.label : d.short;
              const availableHeight = Math.max(
                10,
                t.h - padding * 2 - valueFont * 1.1 - 10 - (detailed ? 40 : 0),
              );
              const availableWidth = Math.max(15, t.w - padding * 2 - 5);
              let labelFont = Math.min(21, Math.max(9, t.w / 11));
              while (
                labelFont > 9 &&
                Math.ceil((label.length * labelFont * 0.58) / availableWidth) *
                  labelFont *
                  1.14 >
                  availableHeight
              )
                labelFont -= 0.5;
              const labelLines = Math.max(
                1,
                Math.floor(availableHeight / (labelFont * 1.14)),
              );
              const match =
                !query || d.label.toLowerCase().includes(query.toLowerCase());
              return (
                <button
                  key={d.id}
                  id={`tile-${d.id}`}
                  className={`ta-tile ${small ? 'ta-small' : ''} ${tiny ? 'ta-tiny' : ''} ${match ? '' : 'ta-dim'}`}
                  style={{
                    left: t.x,
                    top: t.y,
                    width: t.w,
                    height: t.h,
                    backgroundColor: kindInfo[d.kind].color,
                    color: kindInfo[d.kind].ink,
                    backgroundImage: grid
                      ? 'linear-gradient(to right, #172b4520 1px, transparent 1px),linear-gradient(to bottom, #172b4520 1px, transparent 1px)'
                      : 'none',
                    backgroundSize: `${unit}px ${unit}px`,
                    backgroundPosition: '-1px -1px',
                  }}
                  aria-label={`${d.label}, ${amount(d.value)}, ${kindInfo[d.kind].label}`}
                  aria-pressed={selected === d.id}
                  title={`${d.label} · ${amount(d.value)} · ${d.basis}`}
                  aria-haspopup="dialog"
                  onClick={() => openTile(d.id)}
                >
                  <div
                    className="ta-tile-label"
                    style={{ backgroundColor: kindInfo[d.kind].color }}
                  >
                    <span className="ta-value-row">
                      <span
                        className="ta-emoji"
                        aria-hidden="true"
                        style={{ fontSize: Math.max(9, valueFont * 0.65) }}
                      >
                        {d.emoji}
                      </span>
                      <b
                        style={{
                          fontSize: valueFont,
                        }}
                      >
                        {d.value}
                        <span>T</span>
                      </b>
                    </span>
                    <span
                      className="ta-name"
                      style={{
                        fontSize: labelFont,
                        WebkitLineClamp: labelLines,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {detailed && (
                    <span
                      className="ta-tile-detail"
                      style={{ backgroundColor: kindInfo[d.kind].color }}
                    >
                      <span>{d.basis.replace(' · 2018 reference', '')}</span>
                      <strong>
                        ${(d.value * 1e12).toLocaleString('en-US')}
                      </strong>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
        <div className="ta-selection" aria-live="polite">
          <div>
            <strong>{focus.label}</strong>
            <b>{amount(focus.value)}</b>
            <span>{focus.basis}</span>
          </div>
          <div className="ta-selection-actions">
            <button onClick={compareSelected}>Compare selected</button>
            <button onClick={exportCsv}>CSV ↓</button>
          </div>
          <p>
            {focus.note} <a href={ARCHIVE}>Source ↗</a>
          </p>
        </div>
      </section>
      <div className="ta-bottom">
        <details
          id="compare"
          open={compareOpen}
          onToggle={(e) => setCompareOpen(e.currentTarget.open)}
        >
          <summary>Compare two amounts</summary>
          <div className="ta-compare-controls">
            {[
              { id: 'a', value: left, set: setLeft },
              { id: 'b', value: right, set: setRight },
            ].map(({ id, value, set }) => (
              <label key={id}>
                Amount {id.toUpperCase()}
                <select
                  id={`compare-${id}`}
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
              onClick={() => {
                setLeft(right);
                setRight(left);
              }}
            >
              Swap amounts
            </button>
            <button onClick={share}>Copy comparison link</button>
          </div>
          <p className="ta-ratio">
            <b>
              {ratio.ratio.toLocaleString('en-US', {
                maximumFractionDigits: 2,
              })}
              ×
            </b>{' '}
            {a.label} / {b.label}
          </p>
          <div className="ta-compare-bars">
            {[a, b].map((d, i) => (
              <div key={i}>
                <span>
                  {d.label} · {amount(d.value)}
                </span>
                <div>
                  <i
                    style={{
                      width: `${bars(d.value)}%`,
                      background: kindInfo[d.kind].color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="ta-caution">
            {left === right
              ? 'Same amount selected.'
              : !ratio.sameKind
                ? 'Different kinds of money.'
                : !ratio.sameBasis
                  ? 'Different measurement bases.'
                  : 'Scale comparison only.'}{' '}
            Scope and dates may differ.
          </p>
        </details>
        <details id="sources">
          <summary>Sources & method</summary>
          <p>
            Recreated from David McCandless’s <a href={ORIGINAL}>Trillions</a> /
            Information is Beautiful. All 33 amounts are transcribed from the{' '}
            <a href={ARCHIVE}>August 16, 2018 graphic</a>. They are historical
            values; some source definitions and observation dates are missing.
          </p>
          <p>
            Area is linear in dollars. Each full grid square has the area of
            $1T; squares clipped at block edges are partial units. The grid is a
            scale reference, not a breakdown into subcategories. The layout
            favors square-shaped tiles. At 100%, a $1T area is at least 48 × 48
            pixels; the canvas scrolls to keep small amounts readable. Fit all
            compresses the full chart into the viewport. Grouping rearranges the
            same amounts without changing their area scale. Filtering rescales
            the mosaic. Zoom enlarges all dimensions equally. Color indicates
            the descriptive categories added here.
          </p>
          <p>
            Amounts overlap and mix time bases, including daily turnover, annual
            GDP and accumulated wealth. Do not add them or interpret a size
            ratio as equivalent spending power. No inflation adjustment is
            applied.
          </p>
        </details>
      </div>
      <dialog
        ref={detail}
        className="ta-detail"
        aria-labelledby="ta-detail-title"
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          const controls =
            e.currentTarget.querySelectorAll<HTMLElement>('button, a[href]');
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <div
          className="ta-detail-top"
          style={{
            background: kindInfo[focus.kind].color,
            color: kindInfo[focus.kind].ink,
          }}
        >
          <button
            className="ta-detail-close"
            aria-label="Close details"
            onClick={() => detail.current?.close()}
          >
            ×
          </button>
          <span className="ta-detail-emoji" aria-hidden="true">
            {focus.emoji}
          </span>
          <span className="ta-detail-kind">{kindInfo[focus.kind].label}</span>
          <h2 id="ta-detail-title">{focus.label}</h2>
          <strong className="ta-detail-value">{amount(focus.value)}</strong>
          <span className="ta-detail-dollars">
            ${(focus.value * 1e12).toLocaleString('en-US')}
          </span>
        </div>
        <div className="ta-detail-body">
          <p className="ta-detail-basis">{focus.basis}</p>
          <p>{focus.note}</p>
          <div className="ta-detail-actions">
            <button onClick={compareSelected}>Compare this amount →</button>
            <button
              onClick={() => {
                detail.current?.close();
                changeZoom(3);
              }}
            >
              Zoom to this tile ⤢
            </button>
          </div>
          <a href={ARCHIVE} target="_blank" rel="noreferrer">
            Original 2018 source ↗
          </a>
        </div>
      </dialog>
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
  );
}
