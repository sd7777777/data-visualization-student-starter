'use client';

import { useEffect } from 'react';

/** Progressive enhancement: content is always visible without motion or JS. */
export function ScrollReveals() {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (
        preference.matches ||
        !('IntersectionObserver' in window) ||
        !Element.prototype.animate
      )
        return;

      observer = new IntersectionObserver(
        (entries) => {
          entries
            .filter((entry) => entry.isIntersecting)
            .forEach((entry, index) => {
              observer?.unobserve(entry.target);
              entry.target.classList.add('is-revealed');
              // Never animate a control while the reader is using it.
              if (entry.target.contains(document.activeElement)) return;
              const animation = entry.target.animate(
                [
                  { opacity: 0.4, transform: 'translateY(22px)' },
                  { opacity: 1, transform: 'translateY(0)' },
                ],
                {
                  duration: 620,
                  delay: Math.min(index * 65, 195),
                  easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
                  fill: 'backwards',
                },
              );
              animations.add(animation);
              animation.onfinish = () => animations.delete(animation);
            });
        },
        { threshold: 0, rootMargin: '0px 0px -35px 0px' },
      );
      document
        .querySelectorAll(
          '.place-context, .place-leaders > button, .discovery-bridge, .entry-paths > a, .stat-strip > div, .story-question, .studio-heading, .chart-panel, .studio-figure, .task-analysis-head, .task-list > li',
        )
        .forEach((element) => observer?.observe(element));
    };
    setup();
    preference.addEventListener('change', setup);
    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener('change', setup);
    };
  }, []);
  return null;
}
