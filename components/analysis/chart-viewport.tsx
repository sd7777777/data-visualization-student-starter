/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to focus and scroll this chart viewport. */
import type { ReactNode } from 'react';

/** Keep SVG labels readable on small screens instead of shrinking the chart. */
export function ChartViewport({ children }: { children: ReactNode }) {
  return (
    <section
      className="chart-viewport"
      tabIndex={0}
      aria-label="Chart; scroll horizontally on smaller screens"
    >
      {children}
    </section>
  );
}
