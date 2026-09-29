'use client';

import { FaIcon } from '@/components/fa-icon';
import { STATE_CODES } from '@/lib/geography-analysis';
import {
  compact,
  dollars,
  money,
  type Area,
  type Dataset,
} from '@/lib/prescriber';

export function ExplorerOpening({
  data,
  area,
  onArea,
  onMap,
}: {
  data: Dataset;
  area: Area;
  onArea: (code: string) => void;
  onMap: () => void;
}) {
  const hasMap = area.code === 'US' || STATE_CODES.has(area.code);
  return (
    <section className="field-opening" aria-labelledby="opening-title">
      <div className="opening-copy">
        <p className="opening-kicker">CMS public data · {data.meta.year}</p>
        <h1 id="opening-title">Medicare Part D prescribing</h1>
        <p className="opening-description">
          Compare claims, drug costs, and specialties across states and
          territories.
        </p>
      </div>
      <div className="opening-place">
        <label htmlFor="opening-geography">
          <FaIcon name="place" /> Geography
        </label>
        <div>
          <select
            id="opening-geography"
            value={area.code}
            onChange={(event) => onArea(event.target.value)}
          >
            {data.areas.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onMap}
            aria-label={`Open ${area.name} ${hasMap ? 'map' : 'chart'}`}
          >
            {hasMap ? 'View map' : 'View chart'} <FaIcon name="next" />
          </button>
        </div>
        <p>
          Applies to the specialty charts below.{' '}
          <a href="#place">Compare two places</a>
        </p>
      </div>
      <div
        className="opening-pulse"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`${area.name} totals`}
      >
        <div>
          <strong>{compact.format(area.summary.providers)}</strong>
          <span>Provider records</span>
        </div>
        <div>
          <strong>{compact.format(area.summary.claims)}</strong>
          <span>Prescription claims</span>
        </div>
        <div>
          <strong>{money.format(area.summary.cost)}</strong>
          <span>Total drug cost</span>
        </div>
        <div>
          <strong>{dollars.format(area.summary.costPerClaim)}</strong>
          <span>Cost per claim</span>
        </div>
      </div>
      <p className="opening-note">
        Descriptive data; not a measure of care quality. Drug cost excludes
        manufacturer rebates. <a href="#data">Source and limitations</a>
      </p>
    </section>
  );
}
