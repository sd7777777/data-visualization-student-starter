'use client';

import { useState } from 'react';
import { FaIcon, type FaIconName } from '@/components/fa-icon';
import { dollars, compact, type Area } from '@/lib/prescriber';

const prompts: { id: 'cost' | 'volume' | 'mix'; icon: FaIconName; label: string; hint: string }[] = [
  { id: 'cost', icon: 'cost', label: 'Follow the cost', hint: 'Find the highest cost per claim among the displayed specialties.' },
  { id: 'volume', icon: 'records', label: 'Find the volume', hint: 'Start with the specialty accounting for the most claims in this view.' },
  { id: 'mix', icon: 'clinical', label: 'Explore drug mix', hint: 'Compare reported opioid and antibiotic shares across specialties.' },
];

export function ExplorePrompts({ area, onExplore }: { area: Area; onExplore: (name: string, lens: 'economics' | 'categories') => void }) {
  const [active, setActive] = useState<(typeof prompts)[number]['id']>('cost');
  const prompt = prompts.find(p => p.id === active)!;
  const metric = active === 'cost' ? 'costPerClaim' : active === 'volume' ? 'claims' : 'opioidShare';
  const candidate = area.specialties.reduce((best, item) => item[metric] > best[metric] ? item : best);
  return <section className="explore-prompts" aria-label="Guided chart exploration">
    <div className="prompt-heading"><span className="prompt-emblem"><FaIcon name="explore" /></span><div><b>TRY A LENS</b><p>A different question. A new way in.</p></div></div>
    <div className="prompt-options" role="group" aria-label="Exploration question">
      {prompts.map(p => <button type="button" key={p.id} aria-pressed={active === p.id} onClick={() => setActive(p.id)}><FaIcon name={p.icon} />{p.label}<span className="prompt-check"><FaIcon name={active === p.id ? 'check' : 'next'} /></span></button>)}
    </div>
    <div className="prompt-result" key={`${area.code}-${active}`}><div><span>{area.name} · displayed specialties</span><h3>{candidate.specialty}</h3><p>{prompt.hint}</p></div><div className="prompt-action"><strong>{active === 'cost' ? dollars.format(candidate.costPerClaim) : active === 'volume' ? compact.format(candidate.claims) : `${candidate.opioidShare.toFixed(1)}%`}</strong><span>{active === 'cost' ? 'per claim' : active === 'volume' ? 'claims' : 'reported opioid share'}</span><button type="button" onClick={() => onExplore(candidate.specialty, active === 'mix' ? 'categories' : 'economics')}>Show in chart <FaIcon name="next" /></button></div></div>
  </section>;
}
