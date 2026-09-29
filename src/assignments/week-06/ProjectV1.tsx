'use client';

import type { ComponentProps } from 'react';
import { GeographyStudio } from '@/components/analysis/geography-studio';
import {
  defaultComparison,
  type ComparisonSettings,
} from '@/lib/comparison-settings';
import { scrollToSection } from '@/lib/scroll-to-section';

const examples: {
  title: string;
  question: string;
  settings: Partial<ComparisonSettings>;
}[] = [
  {
    title: 'Primary care · MA / NY',
    question:
      'Does the cost-per-claim gap point the same way for three primary-care specialties?',
    settings: {
      stateA: 'MA',
      stateB: 'NY',
      specialty: 'Internal Medicine',
      group: ['Internal Medicine', 'Family Practice', 'Nurse Practitioner'],
    },
  },
  {
    title: 'Cancer specialties · CA / TX',
    question:
      'How does prescribing volume per provider record differ between these two places?',
    settings: {
      stateA: 'CA',
      stateB: 'TX',
      metric: 'claimsPerProvider',
      specialty: 'Hematology-Oncology',
      group: ['Hematology-Oncology', 'Medical Oncology'],
    },
  },
  {
    title: 'Specialty ranks · FL / NY',
    question:
      'Which specialties change cost-per-claim rank within this three-specialty group?',
    settings: {
      stateA: 'FL',
      stateB: 'NY',
      specialty: 'Cardiology',
      group: ['Cardiology', 'Neurology', 'Rheumatology'],
      pairMode: 'ranks',
    },
  },
];

/** Week 6 assembles the proposal's select → compare → record workflow. */
export function ProjectV1(props: ComponentProps<typeof GeographyStudio>) {
  return (
    <>
      <section
        id="week-6"
        className="section-wrap project-v1"
        aria-labelledby="project-v1-title"
      >
        <div className="project-v1-heading">
          <div>
            <span className="eyebrow">
              WEEK 06 · PROJECT V1 · CMS {props.data.meta.year}
            </span>
            <h2 id="project-v1-title">From a question to a saved comparison</h2>
            <p>
              Choose an example, inspect the linked charts, then capture your
              observation in the field notebook.
            </p>
          </div>
          <a href="#geo-evidence">Open field notebook →</a>
        </div>
        <div className="project-v1-examples">
          {examples.map((example) => (
            <button
              key={example.title}
              type="button"
              onClick={() => {
                props.onSettings({
                  ...defaultComparison(props.data.meta.year),
                  ...example.settings,
                });
                props.onNotice(
                  `${example.title}: example loaded. Compare the exact values and coverage before recording an observation.`,
                );
                requestAnimationFrame(() => scrollToSection('geo-pair'));
              }}
            >
              <b>{example.title}</b>
              <span>{example.question}</span>
              <small>Explore comparison →</small>
            </button>
          ))}
        </div>
        <p className="project-v1-note">
          Examples replace the current chart settings; saved notes stay intact.
          Each uses at least 50 provider records per specialty and place. These
          are questions to investigate, not claims about care quality.
        </p>
      </section>
      <GeographyStudio {...props} />
    </>
  );
}
