export type Kind = 'flow' | 'stock' | 'estimate';
export interface MoneyItem {
  id: string;
  label: string;
  short: string;
  value: number;
  kind: Kind;
  basis: string;
  note: string;
}
export const ORIGINAL =
  'https://informationisbeautiful.net/visualizations/trillions-what-is-a-trillion-dollars/';
export const ARCHIVE =
  'https://infobeautiful4.s3.amazonaws.com/2018/08/trillions-2x1276.png';
export const kindInfo: Record<
  Kind,
  { label: string; color: string; ink: string; explanation: string }
> = {
  flow: {
    label: 'Annual activity',
    color: '#c9ee71',
    ink: '#152214',
    explanation: 'Money spent or output produced over a year.',
  },
  stock: {
    label: 'Accumulated value',
    color: '#b2a7ee',
    ink: '#211641',
    explanation: 'Wealth, debt or asset value at a point in time.',
  },
  estimate: {
    label: 'Investment estimates',
    color: '#ffb391',
    ink: '#451d10',
    explanation: 'Proposed investment over a stated or unspecified horizon.',
  },
};
// Transcribed from the dated 16 August 2018 graphic linked by the author.
// These are historical reference values, NOT present-day estimates. Individual
// observation years and methodologies are not supplied in that image.
export const items: MoneyItem[] = [
  {
    id: 'military',
    label: 'All military budgets',
    short: 'Military budgets',
    value: 1.7,
    kind: 'flow',
    basis: 'Annual budgets · 2018 reference',
    note: 'Worldwide military budgets as labeled in the original. Individual observation year is not shown.',
  },
  {
    id: 'india',
    label: 'India GDP',
    short: 'India GDP',
    value: 2.4,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'GDP measures production during a year, not a country’s accumulated wealth.',
  },
  {
    id: 'uk',
    label: 'UK GDP',
    short: 'UK GDP',
    value: 2.6,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'france',
    label: 'France GDP',
    short: 'France GDP',
    value: 2.6,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'germany',
    label: 'Germany GDP',
    short: 'Germany GDP',
    value: 3.7,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'japan',
    label: 'Japan GDP',
    short: 'Japan GDP',
    value: 4.9,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'china',
    label: 'China GDP',
    short: 'China GDP',
    value: 11.9,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'China is also included in world GDP. These blocks must not be added together.',
  },
  {
    id: 'us-gdp',
    label: 'US GDP',
    short: 'US GDP',
    value: 19.4,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'The US is also included in world GDP. This is annual economic output, not money held by the government.',
  },
  {
    id: 'world',
    label: 'World GDP',
    short: 'World GDP',
    value: 75.6,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Includes the individual countries elsewhere in this atlas. Do not interpret the mosaic as shares of one budget.',
  },
  {
    id: 'billionaires',
    label: 'All billionaires’ wealth',
    short: 'Billionaire wealth',
    value: 6.5,
    kind: 'stock',
    basis: 'Wealth snapshot · 2018 reference',
    note: 'The original labels this “All billionaires.” Asset valuations are not available cash.',
  },
  {
    id: 'household',
    label: 'US household debt',
    short: 'Household debt',
    value: 13,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'The original includes mortgages, car loans and other household borrowing.',
  },
  {
    id: 'us-debt',
    label: 'US government debt',
    short: 'US government debt',
    value: 20,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'An accumulated liability, not a yearly expense. The original does not specify an observation date.',
  },
  {
    id: 'central',
    label: 'Money in the world’s central banks',
    short: 'Central banks',
    value: 21,
    kind: 'stock',
    basis: 'Monetary snapshot · 2018 reference',
    note: 'Retains the source’s wording. The underlying accounting definition is not supplied in the image.',
  },
  {
    id: 'fortune',
    label: 'Combined value of Fortune 500 companies',
    short: 'Fortune 500 value',
    value: 27.6,
    kind: 'stock',
    basis: 'Valuation snapshot · 2018 reference',
    note: 'The source says “combined value”; it does not define the valuation method in the graphic.',
  },
  {
    id: 'global-debt',
    label: 'Total global debt',
    short: 'Global debt',
    value: 63,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'Retains the historical source label. Its coverage is not specified in the image; do not treat this as a verified all-sector debt total.',
  },
  {
    id: 'one-percent',
    label: 'Wealth of the 1%',
    short: 'Wealth of the 1%',
    value: 127,
    kind: 'stock',
    basis: 'Wealth snapshot · 2018 reference',
    note: 'The original graphic does not define the population or asset coverage. This value is reproduced for design study, not presented as a current estimate.',
  },
  {
    id: 'low-carbon',
    label: 'Deploy low-carbon technology worldwide',
    short: 'Low-carbon tech',
    value: 4.7,
    kind: 'estimate',
    basis: 'Investment estimate · horizon unspecified',
    note: 'The original does not state the spending horizon or price year. Do not annualize this amount.',
  },
  {
    id: 'efficiency',
    label: 'Make buildings, transport and industry energy efficient',
    short: 'Energy efficiency',
    value: 8.8,
    kind: 'estimate',
    basis: 'Investment estimate · horizon unspecified',
    note: 'The original does not state the spending horizon. This estimate may overlap other climate investments.',
  },
  {
    id: 'paris',
    label: 'Meet Paris climate targets by 2030',
    short: 'Paris climate targets',
    value: 16.5,
    kind: 'estimate',
    basis: 'Investment estimate · through 2030',
    note: 'A historical estimate of investment to meet climate targets, not an annual expense or a current project quote.',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure for global growth before 2030',
    short: 'Global infrastructure',
    value: 89,
    kind: 'estimate',
    basis: 'Investment estimate · before 2030',
    note: 'The reference describes infrastructure investment required before 2030. It is not an annual budget.',
  },
];
export const amount = (value: number) =>
  `$${Number(value.toFixed(2)).toLocaleString('en-US')}T`;
export interface Tile {
  item: MoneyItem;
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Balanced binary area partition. No nonlinear transform or invented minimum area. */
export function mosaic(
  data: MoneyItem[],
  x = 0,
  y = 0,
  w = 1000,
  h = 620,
): Tile[] {
  if (!data.length) return [];
  if (data.length === 1) return [{ item: data[0], x, y, w, h }];
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((n, d) => n + d.value, 0);
  let split = 1,
    sum = sorted[0].value;
  while (
    split < sorted.length - 1 &&
    Math.abs(sum + sorted[split].value - total / 2) < Math.abs(sum - total / 2)
  )
    sum += sorted[split++].value;
  const p = sum / total;
  return w >= h
    ? [
        ...mosaic(sorted.slice(0, split), x, y, w * p, h),
        ...mosaic(sorted.slice(split), x + w * p, y, w * (1 - p), h),
      ]
    : [
        ...mosaic(sorted.slice(0, split), x, y, w, h * p),
        ...mosaic(sorted.slice(split), x, y + h * p, w, h * (1 - p)),
      ];
}
export function comparison(a: MoneyItem, b: MoneyItem) {
  return {
    ratio: a.value / b.value,
    sameKind: a.kind === b.kind,
    sameBasis: a.basis === b.basis,
  };
}
