'use client';

/* SVG marks need explicit interactive semantics and keyboard equivalents. */
/* eslint-disable jsx-a11y/prefer-tag-over-role */
import { useMemo, useState } from 'react';
import {
  rankComparison,
  metricLabels,
  type GeographyMetric,
} from '@/lib/geography-analysis';
import type { SpecialtyProfile } from '@/lib/prescriber';

export function RankLadder({
  profiles,
  stateA,
  stateB,
  metric,
  minimum,
  year,
  selected,
  onSelect,
}: {
  profiles: SpecialtyProfile[];
  stateA: string;
  stateB: string;
  metric: GeographyMetric;
  minimum: number;
  year: number;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = useMemo(
    () => rankComparison(profiles, stateA, stateB, metric, minimum),
    [profiles, stateA, stateB, metric, minimum],
  );
  const active = hover ?? selected;
  const largest = [...rows].sort(
    (a, b) =>
      Math.abs(b.rankB - b.rankA) - Math.abs(a.rankB - a.rankA) ||
      a.specialty.localeCompare(b.specialty),
  )[0];
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const fmt = (v: number) =>
    `${metric === 'costPerClaim' ? '$' : ''}${number.format(v)}${metric === 'opioidShare' ? '%' : ''}`;
  const y = (rank: number) => 76 + (rank - 1) * 52;
  const height = Math.max(170, 116 + rows.length * 52);
  if (!rows.length)
    return (
      <p className="studio-empty">
        No specialties pass the threshold in both places. Lower the threshold or
        choose other places.
      </p>
    );
  return (
    <div className="rank-ladder">
      <p className="rank-explainer">
        <b>Same specialties. Different order.</b> Rank 1 is the highest value,
        not the best outcome.{' '}
        {largest && Math.abs(largest.rankB - largest.rankA) > 0 ? (
          <span>
            Largest shift:{' '}
            <button onClick={() => onSelect(largest.specialty)}>
              {largest.specialty}
            </button>
            , #{largest.rankA} → #{largest.rankB}.
          </span>
        ) : (
          <span>The ordering is the same in these places.</span>
        )}
      </p>
      <div className="studio-svg-scroll">
        <svg
          viewBox={`0 0 1080 ${height}`}
          role="group"
          aria-label={`${metricLabels[metric]}, ${year}: specialty ranks between ${stateA} and ${stateB}`}
        >
          <text
            x="540"
            y="25"
            textAnchor="middle"
            className="studio-axis-title"
          >
            {metricLabels[metric]} · {year}
          </text>
          <text
            x="540"
            y="46"
            textAnchor="middle"
            className="studio-axis-title"
          >
            Rank within eligible specialties
          </text>
          <text x="304" y="25" textAnchor="end" className="rank-column-title">
            A · {stateA}
          </text>
          <text x="776" y="25" className="rank-column-title">
            B · {stateB}
          </text>
          <text x="304" y="46" textAnchor="end" className="studio-axis-title">
            Specialty · exact value
          </text>
          <text x="776" y="46" className="studio-axis-title">
            Specialty · exact value
          </text>
          <line
            x1="340"
            x2="340"
            y1="64"
            y2={y(rows.length) + 12}
            className="gridline"
          />
          <line
            x1="740"
            x2="740"
            y1="64"
            y2={y(rows.length) + 12}
            className="gridline"
          />
          {[...rows]
            .sort(
              (a, b) =>
                Number(a.specialty === active) - Number(b.specialty === active),
            )
            .map((row) => (
              <g
                key={row.specialty}
                role="button"
                tabIndex={0}
                aria-pressed={row.specialty === selected}
                aria-label={`${row.specialty}: ${stateA} rank ${row.rankA}, ${fmt(row.valueA)}; ${stateB} rank ${row.rankB}, ${fmt(row.valueB)}`}
                className={`rank-route ${row.specialty === active ? 'is-active' : ''}`}
                onMouseEnter={() => setHover(row.specialty)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(row.specialty)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(row.specialty)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(row.specialty);
                  }
                }}
              >
                <path
                  d={`M340,${y(row.rankA)} C480,${y(row.rankA)} 600,${y(row.rankB)} 740,${y(row.rankB)}`}
                  className="rank-hit"
                />
                <path
                  d={`M340,${y(row.rankA)} C480,${y(row.rankA)} 600,${y(row.rankB)} 740,${y(row.rankB)}`}
                  className="rank-thread"
                />
                <circle cx="340" cy={y(row.rankA)} r="6" fill="#497b91" />
                <path
                  d={`M740,${y(row.rankB) - 6}l6,6l-6,6l-6,-6Z`}
                  fill="#ac553e"
                />
                <text
                  x="320"
                  y={y(row.rankA) + 4}
                  textAnchor="end"
                  className="rank-position"
                >
                  {row.rankA}
                </text>
                <text x="760" y={y(row.rankB) + 4} className="rank-position">
                  {row.rankB}
                </text>
                <text
                  x="290"
                  y={y(row.rankA) - 4}
                  textAnchor="end"
                  className="rank-specialty"
                >
                  {row.specialty}
                </text>
                <text
                  x="290"
                  y={y(row.rankA) + 20}
                  textAnchor="end"
                  className="rank-exact"
                >
                  {fmt(row.valueA)}
                </text>
                <text x="790" y={y(row.rankB) - 4} className="rank-specialty">
                  {row.specialty}
                </text>
                <text x="790" y={y(row.rankB) + 20} className="rank-exact">
                  {fmt(row.valueB)}
                </text>
              </g>
            ))}
        </svg>
      </div>
      <p className="rank-footnote">
        Ranks use only the {rows.length} displayed specialties with data above
        the threshold in both places. Filters can change ranks. Equal values are
        ordered alphabetically. Lines connect two places, not two points in
        time.{' '}
        <a href="#geo-distribution">
          Inspect the selected specialty’s distribution ↑
        </a>
      </p>
    </div>
  );
}
