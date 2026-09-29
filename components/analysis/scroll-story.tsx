'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG is an accessible chart image. */
/* oxlint-disable next/no-html-link-for-pages -- The dataset README is a downloadable static asset. */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { FaIcon } from '@/components/fa-icon';
import { buildScrollStory, STORY_DOTS, storyDot } from '@/lib/scroll-story';
import { compact, money, percent, type Area } from '@/lib/prescriber';
import { scrollToSection } from '@/lib/scroll-to-section';

const labels = [
  'The whole picture',
  'Provider records',
  'Prescription claims',
  'Total drug cost',
];

export function ScrollStory({
  area,
  onCompare,
}: {
  area: Area;
  onCompare: (names: string[]) => void;
}) {
  const { cohort, measures } = useMemo(() => buildScrollStory(area), [area]);
  const [active, setActive] = useState(0);
  const [still, setStill] = useState(false);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    let visible = false;
    const steps = Array.from(
      element.querySelectorAll<HTMLElement>('.scroll-story-step'),
    );
    const update = () => {
      frame = 0;
      if (!visible) return;
      const focus = window.innerHeight * 0.55;
      let next = 0;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].getBoundingClientRect().top <= focus) next = i;
      }
      setActive(next);
      const bounds = element.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(
          1,
          (focus - bounds.top) /
            Math.max(1, bounds.height - window.innerHeight * 0.5),
        ),
      );
      element.style.setProperty('--story-progress', String(progress));
    };
    const schedule = () => {
      if (!frame && visible) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(element);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const current = active ? measures[active - 1] : null;
  const share = (index: number) =>
    `${percent.format(measures[index].share * 100)}%`;

  return (
    <section
      id="scroll-story"
      ref={root}
      className="scroll-story"
      data-still={still}
      aria-labelledby="scroll-story-title"
    >
      <header className="scroll-story-heading">
        <div>
          <p className="story-overline">
            <span /> A SCROLL THROUGH THE DATA / 2024
          </p>
          <h2 id="scroll-story-title">
            One system.
            <br />
            <em>Different perspectives.</em>
          </h2>
        </div>
        <div>
          <p>
            Follow the same five specialties through three ways of measuring
            their footprint.
          </p>
          <a href="#story-step-0">
            Scroll to unfold <FaIcon name="down" />
          </a>
          <a className="story-skip" href="#week-3">
            Skip to the explorer <FaIcon name="next" />
          </a>
        </div>
      </header>

      <div className="scroll-story-layout">
        <div className="scroll-story-stage">
          <div className="story-stage-top">
            <span>NATIONAL LENS · {area.code}</span>
            <button
              type="button"
              aria-pressed={still || reduced}
              disabled={reduced}
              onClick={() => setStill(!still)}
            >
              {reduced ? 'Reduced motion' : still ? 'Motion off' : 'Motion on'}{' '}
              <FaIcon name="tune" />
            </button>
          </div>
          <div className="story-stage-title">
            <span>{String(active + 1).padStart(2, '0')} / 04</span>
            <h3>{labels[active]}</h3>
          </div>
          <div className="story-dot-canvas">
            <svg
              viewBox="0 0 420 420"
              role="img"
              aria-label={
                current
                  ? `${percent.format(current.share * 100)} percent of national ${labels[active].toLowerCase()} belong to the five highlighted specialties. Each dot is 0.25 percentage points, rounded.`
                  : 'Decorative field of dots introducing the national dataset; these are not individual provider records.'
              }
            >
              <circle
                className="story-orbit-ring"
                cx="210"
                cy="210"
                r="204"
                fill="none"
                strokeDasharray="2 10"
              />
              {Array.from({ length: STORY_DOTS }, (_, index) => {
                const point = storyDot(index, active > 0);
                const highlighted = current
                  ? index < current.dots
                  : index % 5 !== 0;
                return (
                  <circle
                    key={index}
                    r={active ? 5.5 : 3 + (index % 3) * 0.7}
                    className="story-dot"
                    style={
                      {
                        transform: `translate(${point.x}px, ${point.y}px)`,
                        fill: highlighted
                          ? active === 2
                            ? '#087e73'
                            : '#176558'
                          : '#d5dfd1',
                        '--dot-delay': `${(index % 20) * 9}ms`,
                      } as CSSProperties
                    }
                  />
                );
              })}
            </svg>
            {!active && (
              <div className="story-orbit-label">
                <strong>{compact.format(area.summary.providers)}</strong>
                <span>provider records</span>
              </div>
            )}
          </div>
          <div className="story-stage-result">
            <strong>
              {current
                ? `${percent.format(current.share * 100)}%`
                : compact.format(area.summary.claims)}
            </strong>
            <span>
              {current
                ? `of all ${active === 1 ? 'provider records' : active === 2 ? 'claims' : 'drug cost'}`
                : 'prescription claims nationwide'}
            </span>
          </div>
          <p className="story-dot-key">
            {current ? (
              <>
                <i
                  style={{ background: active === 2 ? '#087e73' : '#176558' }}
                />{' '}
                These five specialties <i /> All others · 1 dot ≈ 0.25%
              </>
            ) : (
              'A field of possibilities. Scroll to bring the pattern into focus.'
            )}
          </p>
          <nav className="story-scene-nav" aria-label="Guided story scenes">
            {labels.map((label, index) => (
              <button
                type="button"
                key={label}
                aria-label={`Read scene ${index + 1}: ${label}`}
                aria-current={active === index ? 'step' : undefined}
                onClick={() => {
                  if (still)
                    document
                      .getElementById(`story-step-${index}`)
                      ?.scrollIntoView({ behavior: 'instant' });
                  else scrollToSection(`story-step-${index}`);
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>
                  {['Overview', 'Providers', 'Claims', 'Cost'][index]}
                </span>
              </button>
            ))}
          </nav>
          <div className="story-stage-progress" aria-hidden="true">
            <span />
          </div>
        </div>

        <div className="scroll-story-narrative">
          <article
            id="story-step-0"
            className="scroll-story-step"
            data-active={active === 0}
          >
            <span className="story-step-number">01 / ZOOM OUT</span>
            <h3>
              Big numbers.
              <br />A bigger story.
            </h3>
            <p>
              {money.format(area.summary.cost)} in drug cost.{' '}
              {compact.format(area.summary.claims)} prescription claims. But
              totals alone don’t tell us how prescribing is distributed.
            </p>
            <p>
              Let’s follow the{' '}
              <b>five specialties with the highest national drug-cost totals</b>
              . The group stays the same as the measure changes.
            </p>
            <div className="story-cohort">
              <span>THE FIVE WE’LL FOLLOW</span>
              {cohort.map((row, i) => (
                <div key={row.specialty}>
                  <span>0{i + 1}</span>
                  <b>{row.specialty}</b>
                </div>
              ))}
            </div>
          </article>
          <article
            id="story-step-1"
            className="scroll-story-step"
            data-active={active === 1}
          >
            <span className="story-step-number">02 / COUNT THE RECORDS</span>
            <h3>
              Start with
              <br />
              <em>who prescribes.</em>
            </h3>
            <p>
              These five specialties represent{' '}
              <b>{share(0)} of provider records</b> in the national file.
            </p>
            <p>
              The dots now form a grid. Teal shows our group; pale dots show
              every other specialty. Each dot represents about a quarter of a
              percentage point.
            </p>
            <div className="story-fact">
              <strong>{compact.format(measures[0].value)}</strong>
              <span>provider records in this group</span>
            </div>
            <p className="story-small">
              A provider record is a CMS row/NPI record, not a count of
              patients.
            </p>
          </article>
          <article
            id="story-step-2"
            className="scroll-story-step"
            data-active={active === 2}
          >
            <span className="story-step-number">03 / FOLLOW THE VOLUME</span>
            <h3>
              Same specialties.
              <br />
              <em>More of the claims.</em>
            </h3>
            <p>
              Change the measure and the pattern expands: the group accounts for{' '}
              <b>{share(1)} of all claims</b>.
            </p>
            <p>
              Provider share and claim share answer different questions. Claims
              include both original prescriptions and refills.
            </p>
            <div className="story-fact story-fact-teal">
              <strong>{compact.format(measures[1].value)}</strong>
              <span>claims attributed to the same group</span>
            </div>
          </article>
          <article
            id="story-step-3"
            className="scroll-story-step"
            data-active={active === 3}
          >
            <span className="story-step-number">
              04 / CHANGE THE PERSPECTIVE
            </span>
            <h3>
              Volume isn’t
              <br />
              <em>the whole value.</em>
            </h3>
            <p>
              These specialties account for <b>{share(2)} of drug cost</b>,
              compared with {share(1)} of claims. The difference reflects their
              aggregate cost per claim.
            </p>
            <div className="story-share-summary">
              {measures.map((measure, i) => (
                <div key={measure.metric}>
                  <span>{['Providers', 'Claims', 'Cost'][i]}</span>
                  <div>
                    <i style={{ width: `${measure.share * 100}%` }} />
                  </div>
                  <b>{share(i)}</b>
                </div>
              ))}
            </div>
            <p className="story-small">
              Total drug cost includes payments from plans, beneficiaries,
              subsidies, and third parties. It excludes manufacturer rebates and
              does not measure care quality.
            </p>
            <button
              type="button"
              className="story-compare"
              onClick={() => onCompare(cohort.map((row) => row.specialty))}
            >
              Compare this group across states <FaIcon name="next" />
            </button>
          </article>
        </div>
      </div>
      <footer className="scroll-story-source">
        <span>
          <FaIcon name="info" /> National totals remain fixed while you explore
          other geographies below. Dot counts are rounded; percentages use the
          underlying totals.
        </span>
        <a href="./data/prescriber-summary/README.md">
          Source &amp; method <FaIcon name="next" />
        </a>
      </footer>
    </section>
  );
}

export function DiscoveryBridge({ onExplore }: { onExplore: () => void }) {
  return (
    <aside
      className="discovery-bridge"
      aria-labelledby="discovery-bridge-title"
    >
      <div className="discovery-ribbons" aria-hidden="true">
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              pathLength="1"
              d={`M -60 ${260 - i * 25} C 290 ${-160 + i * 26}, 560 ${490 - i * 35}, 1260 ${20 + i * 30}`}
            />
          ))}
        </svg>
      </div>
      <div>
        <p className="story-overline">FROM LOOKING TO FINDING</p>
        <h2 id="discovery-bridge-title">
          Every pattern opens
          <br />
          <em>another question.</em>
        </h2>
        <p>
          You’ve seen the shapes. Now follow a specialty through the numbers.
        </p>
        <button type="button" onClick={onExplore}>
          Follow the selected specialty <FaIcon name="next" />
        </button>
        <span>
          Continue into concentration, composition, and clinical mix ↓
        </span>
      </div>
    </aside>
  );
}
