import type { Area } from './prescriber';

export const storyMetrics = ['providers', 'claims', 'cost'] as const;
export const STORY_DOTS = 400;

/** One fixed cohort, ranked by total cost; every denominator is the full area. */
export function buildScrollStory(area: Area) {
  const cohort = [...area.specialties]
    .sort((a, b) => b.cost - a.cost || a.specialty.localeCompare(b.specialty))
    .slice(0, 5);
  const measures = storyMetrics.map((metric) => {
    const value = cohort.reduce((sum, row) => sum + row[metric], 0);
    const total = area.summary[metric];
    const share = total > 0 ? value / total : 0;
    return {
      metric,
      value,
      total,
      share,
      dots: Math.round(share * STORY_DOTS),
    };
  });
  return { cohort, measures };
}

/** Deterministic decorative opening; quantitative scenes use an equal-dot grid. */
export function storyDot(index: number, grid: boolean) {
  if (grid)
    return {
      x: 43 + (index % 20) * 17.6,
      y: 43 + Math.floor(index / 20) * 17.6,
    };
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const radius = 13 + Math.sqrt(index / STORY_DOTS) * 183;
  return {
    x: 210 + Math.cos(angle) * radius,
    y: 210 + Math.sin(angle) * radius,
  };
}
