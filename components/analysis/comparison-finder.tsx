'use client';

import { useMemo, useState } from 'react';
import type { Dataset, SpecialtyProfile } from '@/lib/prescriber';
import { findComparisons, finderCsv } from '@/lib/comparison-finder';
import { metricLabels, type GeographyMetric } from '@/lib/geography-analysis';
import { downloadFile } from '@/lib/download';
import { FaIcon } from '@/components/fa-icon';

const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function ComparisonFinder({
  data,
  profiles,
  codes,
  stateA,
  stateB,
  metric,
  minimum,
  onChoose,
}: {
  data: Dataset;
  profiles: SpecialtyProfile[];
  codes: string[];
  stateA: string;
  stateB: string;
  metric: GeographyMetric;
  minimum: number;
  onChoose: (code: string, specialty: string) => void;
}) {
  const [direction, setDirection] = useState<'similar' | 'different'>(
    'similar',
  );
  const [expanded, setExpanded] = useState(false);
  const feedbackKey = (secondPlace: string) =>
    JSON.stringify([
      profiles.map((p) => p.specialty),
      codes,
      stateA,
      secondPlace,
      metric,
      minimum,
    ]);
  const [feedback, setFeedback] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const message = feedback?.key === feedbackKey(stateB) ? feedback.message : '';
  const setMessage = (message: string, secondPlace = stateB) =>
    setFeedback({ key: feedbackKey(secondPlace), message });
  const result = useMemo(
    () => findComparisons(profiles, codes, stateA, metric, minimum),
    [profiles, codes, stateA, metric, minimum],
  );
  const ordered = [...result.ranked].sort(
    (a, b) =>
      (direction === 'similar' ? a.score! - b.score! : b.score! - a.score!) ||
      a.code.localeCompare(b.code),
  );
  const shown = expanded ? ordered : ordered.slice(0, 5);
  const nameOf = (code: string) =>
    data.areas.find((a) => a.code === code)?.name ?? code;
  const maximum = Math.max(1, ...result.ranked.map((row) => row.score!));
  const unit = metric === 'opioidShare' ? 'pp' : '%';
  return (
    <section
      className="comparison-finder"
      id="comparison-finder"
      aria-labelledby="finder-heading"
    >
      <header className="finder-header">
        <div>
          <span className="eyebrow">
            <FaIcon name="explore" /> FIND A COMPARISON
          </span>
          <h3 id="finder-heading">
            {direction === 'similar'
              ? `Which places resemble ${nameOf(stateA)}?`
              : `Where does ${nameOf(stateA)} differ most?`}
          </h3>
          <p>
            Compare the same specialty profiles, then carry a place into the
            linked charts.
          </p>
        </div>
        <fieldset
          className="finder-switch"
          aria-label="Comparison finder order"
        >
          <button
            type="button"
            aria-pressed={direction === 'similar'}
            onClick={() => setDirection('similar')}
          >
            Most similar
          </button>
          <button
            type="button"
            aria-pressed={direction === 'different'}
            onClick={() => setDirection('different')}
          >
            Largest contrasts
          </button>
        </fieldset>
      </header>
      <div className="finder-context">
        <span>
          <b>{metricLabels[metric]}</b> · {result.basis.length} comparable{' '}
          {result.basis.length === 1 ? 'specialty' : 'specialties'}
        </span>
        <span>
          {result.ranked.length} of {result.candidates.length} other places have
          complete coverage
        </span>
      </div>
      {!result.basis.length ? (
        <div className="finder-empty">
          <b>No eligible profiles for {nameOf(stateA)}.</b>
          <p>
            Lower the record threshold, change the first place, or clear the
            specialty filter.
          </p>
        </div>
      ) : !shown.length ? (
        <div className="finder-empty">
          <b>No other place covers the full comparison set.</b>
          <p>
            Lower the record threshold or narrow your specialty group. Partial
            profiles are excluded from this ranking.
          </p>
        </div>
      ) : (
        <>
          <div className="finder-column-labels" aria-hidden="true">
            <span>Place</span>
            <span>Average gap from {stateA}</span>
            <span>Explore</span>
          </div>
          <ol className="finder-results">
            {shown.map((row, index) => (
              <li
                key={row.code}
                className={row.code === stateB ? 'is-comparison' : ''}
              >
                <div className="finder-place">
                  <span className="finder-number">{index + 1}</span>
                  <div>
                    <b>{nameOf(row.code)}</b>
                    <small>
                      {row.matched} / {result.basis.length}{' '}
                      {result.basis.length === 1 ? 'specialty' : 'specialties'}
                      {row.code === stateB ? ' · Place B' : ''}
                    </small>
                  </div>
                </div>
                <div className="finder-score">
                  <span className="finder-track" aria-hidden="true">
                    <span
                      style={{ width: `${(100 * row.score!) / maximum}%` }}
                    />
                  </span>
                  <b>
                    {decimal.format(row.score!)}
                    {unit}
                  </b>
                </div>
                <button
                  type="button"
                  aria-label={`Compare ${nameOf(stateA)} with ${nameOf(row.code)}`}
                  onClick={() => {
                    onChoose(row.code, row.gaps[0].specialty);
                    setMessage(
                      `${nameOf(row.code)} is now place B. The largest specialty gap, ${row.gaps[0].specialty}, is selected in the linked charts.`,
                      row.code,
                    );
                  }}
                >
                  <FaIcon name={row.code === stateB ? 'check' : 'compare'} />
                  <span>{row.code === stateB ? 'Selected' : 'Compare'}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="finder-actions">
            {ordered.length > 5 && (
              <button type="button" onClick={() => setExpanded(!expanded)}>
                {expanded
                  ? 'Show top five'
                  : `Show all ${ordered.length} places`}
              </button>
            )}
            <a href="#geo-pair">
              Open the detailed comparison <FaIcon name="next" />
            </a>
            <button
              type="button"
              onClick={() => {
                downloadFile(
                  finderCsv(
                    result,
                    stateA,
                    metric,
                    minimum,
                    data.meta.year,
                    data.meta.source,
                  ),
                  `part-d-${data.meta.year}-${stateA}-comparison-finder.csv`,
                  'text/csv;charset=utf-8',
                );
                setMessage(
                  'Finder data download requested, including places excluded for incomplete coverage.',
                );
              }}
            >
              <FaIcon name="download" /> Download finder data
            </button>
          </div>
        </>
      )}
      <output className="finder-feedback" aria-live="polite">
        {message}
      </output>
      <p className="finder-definition">
        {metric === 'opioidShare'
          ? 'Average absolute gap in percentage points.'
          : 'Average symmetric gap: difference ÷ the average of both values.'}{' '}
        Each specialty has equal weight. Lower means more similar on this
        measure.
      </p>
      <details className="finder-method">
        <summary>What does “similar” mean here?</summary>
        <p>
          {metric === 'opioidShare'
            ? 'The score is the average absolute difference in reported opioid share, in percentage points. Suppression can understate these shares.'
            : 'For each specialty, the gap is the absolute difference divided by the average of the two values, expressed as a percentage. For example, $100 and $200 have a 66.7% gap. The score averages those gaps equally across specialties.'}{' '}
          Smaller gaps mean more similar values on this measure. These are
          descriptive comparisons, not statistical tests or care-quality scores.
        </p>
        <p>
          Only specialties meeting the threshold in place A define the
          comparison set. Every ranked place must cover that entire set; missing
          and filtered values are never treated as zero. Changing the measure,
          first place, threshold, group, or search changes the ranking. Ties use
          place codes alphabetically. Patient and medication mix are not
          adjusted.
        </p>
        {result.basis.length > 0 && (
          <p>
            <b>
              Comparison set ({result.basis.length} of {profiles.length}{' '}
              selected):
            </b>{' '}
            {result.basis.join(' · ')}
          </p>
        )}
      </details>
    </section>
  );
}
