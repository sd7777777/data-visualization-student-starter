'use client';

import { useEffect, useState } from 'react';
import { shapePath, type Region } from '@/lib/regions';

export const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
export const pct0 = (value: number) => `${Math.round(value * 100)}%`;
export const signedPoints = (value: number, unit = ' pts') =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(1)}${unit}`;
export const ordinal = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;

/** Width of an element, tracked with ResizeObserver. A callback ref, because the element appears only after data loads. */
export function useWidth<T extends HTMLElement>(fallback: number) {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width] as const;
}

export function Glyph({ region, size = 14 }: { region: Region; size?: number }) {
  return (
    <svg
      className="rl11-glyph"
      width={size}
      height={size}
      viewBox="-8 -8 16 16"
      aria-hidden="true"
    >
      <path d={shapePath(region.shape, 5.6)} fill={region.color} />
    </svg>
  );
}

/** Pads a value range for an axis, staying inside 0–100%. */
export const padDomain = (lo: number, hi: number): [number, number] => {
  const span = Math.max(hi - lo, 0.04);
  return [Math.max(0, lo - span * 0.08), Math.min(1, hi + span * 0.08)];
};

export const tickLabel = (tick: number, ticks: number[]) =>
  `${(tick * 100).toFixed(ticks.length > 1 && ticks[1] - ticks[0] < 0.01 ? 1 : 0)}%`;
