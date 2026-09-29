'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { chapters } from '@/lib/explorer-navigation';
import { FaIcon } from '@/components/fa-icon';

export function ReadingNav({ children }: { children?: ReactNode }) {
  const [active, setActive] = useState('');
  const progress = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const sections = chapters.map(([id]) => document.getElementById(id));
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance =
        document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current)
        progress.current.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0})`;
      const current = sections
        .filter(
          (section) =>
            section &&
            section.getClientRects().length > 0 &&
            section.getBoundingClientRect().top <= window.innerHeight * 0.35,
        )
        .at(-1);
      setActive(current?.id ?? '');
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('toggle', schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('toggle', schedule, true);
    };
  }, []);
  return (
    <nav className="reading-nav" aria-label="Explorer chapters">
      <span ref={progress} className="reading-progress" aria-hidden="true" />
      <a className="reading-home" href="#week-1" aria-label="Back to top">
        <FaIcon name="up" />
      </a>
      <div>
        {chapters.slice(0, 8).map(([id, label, icon]) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? 'location' : undefined}
          >
            <FaIcon name={icon} /> {label}
          </a>
        ))}
      </div>
      {children}
    </nav>
  );
}
