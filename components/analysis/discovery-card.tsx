'use client';

import { useEffect, useRef, useState } from 'react';
import { FaIcon } from '@/components/fa-icon';
import type { EvidenceRecord } from '@/lib/evidence-notebook';
import { metricLabels } from '@/lib/geography-analysis';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function DiscoveryCard({ note }: { note: EvidenceRecord }) {
  const card = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<{
    url: string;
    filename: string;
    signature: string;
  } | null>(null);
  const signature = JSON.stringify(note);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  const { summary } = note;
  const format = (value: number) =>
    `${summary.metric === 'costPerClaim' ? '$' : ''}${number.format(value)}${summary.metric === 'opioidShare' ? '%' : ''}`;
  const maximum = Math.max(
    summary.national ?? 0,
    ...summary.places.map((p) => p.value ?? 0),
    1,
  );
  const exportImage = async () => {
    if (!card.current || exporting) return;
    setExporting(true);
    setMessage('Preparing your discovery card…');
    let clone: HTMLDivElement | null = null;
    try {
      // Measure a fixed-width copy so phone and desktop exports never crop text.
      clone = card.current.cloneNode(true) as HTMLDivElement;
      Object.assign(clone.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: '760px',
        maxWidth: 'none',
        margin: '0',
      });
      clone.setAttribute('aria-hidden', 'true');
      card.current.parentElement!.appendChild(clone);
      // Load the free export library only when a reader asks for an image.
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(clone, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        width: 760,
        height: clone.offsetHeight,
        style: {
          position: 'static',
          left: 'auto',
          top: 'auto',
          boxShadow: 'none',
        },
      });
      if (!blob) throw new Error('Image rendering failed');
      const url = URL.createObjectURL(blob);
      const filename = `part-d-${note.year}-${summary.places.map((p) => p.code).join('-')}-discovery.png`;
      setImage({ url, filename, signature });
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setMessage('Discovery card image download requested.');
    } catch {
      setMessage(
        'Image export is unavailable in this browser. Download the complete evidence as text instead.',
      );
    } finally {
      clone?.remove();
      setExporting(false);
    }
  };
  return (
    <div className="discovery-card-wrap">
      <div className="discovery-card" ref={card}>
        <div className="discovery-card-masthead">
          <span>
            <FaIcon name="explore" /> PART D EXPLORER
          </span>
          <span>FIELD NOTE / {note.year}</span>
        </div>
        <div className="discovery-card-content">
          <span className="discovery-card-kicker">
            ONE SPECIALTY. TWO PERSPECTIVES.
          </span>
          <h4>{summary.specialty}</h4>
          <p className="discovery-card-measure">
            {metricLabels[summary.metric]}
            {summary.metric === 'costPerClaim'
              ? ' · USD'
              : summary.metric === 'claimsPerProvider'
                ? ' · per provider record'
                : ' · % of all claims'}
          </p>
          <div className="discovery-card-bars">
            {summary.places.map((place, index) => (
              <div
                className={`discovery-card-place place-${index}`}
                key={`${index}-${place.code}`}
              >
                <div>
                  <span>
                    {index === 0 ? '● A' : '◆ B'} · {place.name}
                  </span>
                  <strong>
                    {place.value === null ? 'Unavailable' : format(place.value)}
                  </strong>
                </div>
                <div className="discovery-bar-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${((place.value ?? 0) / maximum) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {place.providers === null
                    ? 'Provider records not reported'
                    : `${place.providers.toLocaleString('en-US')} provider records`}
                  {place.coverage !== 'included' ? ` · ${place.coverage}` : ''}
                </small>
              </div>
            ))}
            <div className="discovery-card-national">
              <div>
                <span>National specialty aggregate</span>
                <strong>
                  {summary.national === null
                    ? 'Unavailable'
                    : format(summary.national)}
                </strong>
              </div>
              <div className="discovery-bar-track" aria-hidden="true">
                <span
                  style={{
                    width: `${((summary.national ?? 0) / maximum) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          {note.observation.trim() && (
            <div className="discovery-card-observation">
              <b>
                <FaIcon name="write" /> MY OBSERVATION
              </b>
              <p>{note.observation}</p>
            </div>
          )}
          <p className="discovery-card-method">
            Bars start at zero; values rounded to one decimal. Minimum{' '}
            {summary.minimum.toLocaleString('en-US')} provider records per
            specialty/place. Filtered or missing values are omitted. The
            national benchmark uses aggregate totals across all source
            geographies.
          </p>
        </div>
        <div className="discovery-card-source">
          <b>
            Source: CMS Medicare Part D Prescribers by Provider · {note.year}
          </b>
          <span>
            data.cms.gov · Captured {note.captured.slice(0, 10)} (UTC)
          </span>
          <span>
            Descriptive, not a measure of care quality. Patient and medication
            mix are not adjusted. Cost excludes manufacturer rebates. Reported
            opioid shares are lower bounds due to suppression.
          </span>
          <span>
            This card shows the inspected specialty. The complete evidence note
            preserves every displayed specialty and all comparison settings.
          </span>
        </div>
      </div>
      <div className="discovery-card-export">
        <button type="button" onClick={exportImage} disabled={exporting}>
          <FaIcon name="image" />{' '}
          {exporting ? 'Creating image…' : 'Download card (.png)'}
        </button>
        <small>A full-width image, ready for your notes or slides.</small>
        {image?.signature === signature && (
          <a href={image.url} download={image.filename}>
            Save generated image
          </a>
        )}
      </div>
      <output className="evidence-feedback" aria-live="polite">
        {message}
      </output>
    </div>
  );
}
