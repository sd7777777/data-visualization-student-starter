'use client';

import type { CSSProperties } from 'react';
import { scaleLinear } from 'd3-scale';
import { FaIcon } from '@/components/fa-icon';
import { costMultiple, type MixRow } from '@/lib/drug-mix';
import { dollars } from '@/lib/prescriber';
import {
  MEASURES,
  measureValue,
  stateRanks,
  summaryValue,
  type LensView,
  type Measure,
  type StateAcross,
} from '@/lib/regional-lens';
import { ALL_SPECIALTIES, REGIONS, shapePath } from '@/lib/regions';
import { Glyph, ordinal, pct } from './shared';

export function StateMenu({
  value,
  names,
  onChange,
  label = 'Compare a state',
}: {
  value: string | null;
  names: { code: string; name: string }[];
  onChange: (code: string | null) => void;
  label?: string;
}) {
  return (
    <label className="rl11-state-menu">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Choose a state…</option>
        {names.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The pinned state against all four regional medians and the country, on one shared scale. */
export function StateCard({
  view,
  national,
  measure,
  specialty,
  across,
  rowCount,
  pinnedCode,
  stateNames,
  onPick,
  onClose,
}: {
  view: LensView;
  national: MixRow;
  measure: Measure;
  specialty: string;
  across: StateAcross | null;
  rowCount: number;
  pinnedCode: string | null;
  stateNames: { code: string; name: string }[];
  onPick: (code: string | null) => void;
  onClose: () => void;
}) {
  if (!pinnedCode || !across)
    return (
      <aside className="rl11-card rl11-state empty" aria-label="State comparison">
        <div className="rl11-card-head">
          <span className="rl11-eyebrow">ONE STATE AGAINST THE REGIONS</span>
          <h2>Pick a state to compare it with all four regions.</h2>
          <p>Click a mark or a tile, or choose one here. It stays selected as you change specialty.</p>
        </div>
        <div className="rl11-state-pick">
          <StateMenu value={null} names={stateNames} onChange={onPick} label="State" />
        </div>
      </aside>
    );

  const state = view.states.find((s) => s.code === pinnedCode) ?? null;
  const scope = specialty === ALL_SPECIALTIES ? 'all specialties' : specialty;

  const entries: { key: string; label: string; value: number; region?: (typeof REGIONS)[number]; strong?: boolean; us?: boolean }[] =
    state
      ? [
          { key: 'state', label: state.name, value: measureValue(state.row, measure), region: state.region, strong: true },
          { key: 'us', label: 'U.S.', value: measureValue(national, measure), us: true },
          ...view.summaries.flatMap((s) => {
            const value = summaryValue(s, measure);
            return value === null
              ? []
              : [{ key: s.region.id, label: `${s.region.name} median`, value, region: s.region }];
          }),
        ].sort((a, b) => b.value - a.value)
      : [];
  const values = entries.map((e) => e.value);
  const span = Math.max(Math.max(...values) - Math.min(...values), 0.01);
  const x = scaleLinear()
    .domain([Math.min(...values) - span * 0.06, Math.max(...values) + span * 0.06])
    .range([6, 94]);
  const ranks = state ? stateRanks(view.states, state.code, measure) : null;
  const multiple = state ? costMultiple(state.row) : null;

  return (
    <aside
      className="rl11-card rl11-state"
      aria-label={`${across.name} compared with the regions`}
      style={{ '--region': across.region.color } as CSSProperties}
    >
      <div className="rl11-state-head">
        <div>
          <h2>
            <Glyph region={across.region} size={17} /> {across.name}
          </h2>
          <p>
            {across.region.name}
            {ranks && ` · ${ordinal(ranks.national)} of ${ranks.nationalOf} states`} · {scope}, {MEASURES[measure].short}
          </p>
        </div>
        <button type="button" className="rl11-close" onClick={onClose} aria-label={`Clear ${across.name}`}>
          <FaIcon name="close" />
        </button>
      </div>

      {state ? (
        <>
          <ul className="rl11-compare" aria-label={`${MEASURES[measure].label}: ${across.name} against the regional medians`}>
            {entries.map((e) => (
              <li key={e.key} className={e.strong ? 'strong' : e.us ? 'us' : ''}>
                <span className="rl11-compare-label">{e.label}</span>
                <span className="rl11-compare-track" aria-hidden="true">
                  <svg viewBox="-8 -8 16 16" width={e.strong ? 15 : 12} height={e.strong ? 15 : 12} style={{ left: `${x(e.value)}%` }}>
                    {e.us ? (
                      <path d="M-5,0H5M0,-5V5" stroke="var(--ink)" strokeWidth={2.5} />
                    ) : (
                      <path d={shapePath(e.region!.shape, 5.6)} fill={e.region!.color} stroke={e.strong ? 'var(--ink)' : 'none'} strokeWidth={1.6} />
                    )}
                  </svg>
                </span>
                <span className="rl11-compare-value">{pct(e.value)}</span>
              </li>
            ))}
          </ul>
          {multiple && (
            <dl className="rl11-per-claim">
              <dt>Cost per claim</dt>
              <dd>
                brand-name <b>{dollars.format(state.row.brandCostPerClaim!)}</b>, generic <b>{dollars.format(state.row.genericCostPerClaim!)}</b>
              </dd>
              <dt>Provider records</dt>
              <dd>
                <b>{state.row.records.toLocaleString('en-US')}</b>
              </dd>
            </dl>
          )}
        </>
      ) : (
        <p className="rl11-state-none">
          {across.name} has fewer than 50 {scope} records, so it is not plotted for this specialty.
        </p>
      )}

      <a className="rl11-state-across" href="#rl11-every">
        <span>
          Above the U.S. share in <b>{across.aboveNational} of {across.compared}</b> specialties, and above the {across.region.name} median in <b>{across.aboveRegion}</b>
          {across.compared < rowCount ? ` (${rowCount - across.compared} have too few records)` : ''}.
        </span>
        <FaIcon name="down" />
      </a>
    </aside>
  );
}
