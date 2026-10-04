export type Kind = 'flow' | 'stock' | 'estimate' | 'total';
export interface MoneyItem {
  id: string;
  label: string;
  short: string;
  emoji: string;
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
  total: {
    label: 'Multiyear totals',
    color: '#fbbf54',
    ink: '#3a2605',
    explanation: 'Losses, spending or changes accumulated over several years.',
  },
  flow: {
    label: 'Activity',
    color: '#8ec5ff',
    ink: '#102f50',
    explanation: 'Activity measured over a stated or unspecified period.',
  },
  stock: {
    label: 'Accumulated value',
    color: '#c4b0f0',
    ink: '#30204e',
    explanation: 'Wealth, debt or asset value at a point in time.',
  },
  estimate: {
    label: 'Costs / estimates',
    color: '#63d9bf',
    ink: '#0a3a32',
    explanation: 'Costs and investment estimates with varying horizons.',
  },
};
// Transcribed from the dated 16 August 2018 graphic linked by the author.
// These are historical reference values, NOT present-day estimates. Individual
// observation years and methodologies are not supplied in that image.
export const items: MoneyItem[] = [
  {
    id: 'military',
    emoji: '🛡️',
    label: 'All military budgets',
    short: 'Military budgets',
    value: 1.7,
    kind: 'flow',
    basis: 'Annual budgets · 2018 reference',
    note: 'Worldwide military budgets as labeled in the original. Individual observation year is not shown.',
  },
  {
    id: 'india',
    emoji: '🇮🇳',
    label: 'India GDP',
    short: 'India GDP',
    value: 2.4,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'GDP measures production during a year, not a country’s accumulated wealth.',
  },
  {
    id: 'uk',
    emoji: '🇬🇧',
    label: 'UK GDP',
    short: 'UK GDP',
    value: 2.6,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'france',
    emoji: '🇫🇷',
    label: 'France GDP',
    short: 'France GDP',
    value: 2.6,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'germany',
    emoji: '🇩🇪',
    label: 'Germany GDP',
    short: 'Germany GDP',
    value: 3.7,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'japan',
    emoji: '🇯🇵',
    label: 'Japan GDP',
    short: 'Japan GDP',
    value: 4.9,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Historical nominal-dollar GDP value from the reference graphic.',
  },
  {
    id: 'china',
    emoji: '🇨🇳',
    label: 'China GDP',
    short: 'China GDP',
    value: 11.9,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'China is also included in world GDP. These blocks must not be added together.',
  },
  {
    id: 'us-gdp',
    emoji: '🇺🇸',
    label: 'US GDP',
    short: 'US GDP',
    value: 19.4,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'The US is also included in world GDP. This is annual economic output, not money held by the government.',
  },
  {
    id: 'world',
    emoji: '🌍',
    label: 'World GDP',
    short: 'World GDP',
    value: 75.6,
    kind: 'flow',
    basis: 'Annual output · 2018 reference',
    note: 'Includes the individual countries elsewhere in this atlas. Do not interpret the mosaic as shares of one budget.',
  },
  {
    id: 'billionaires',
    emoji: '💎',
    label: 'All billionaires’ wealth',
    short: 'Billionaire wealth',
    value: 6.5,
    kind: 'stock',
    basis: 'Wealth snapshot · 2018 reference',
    note: 'The original labels this “All billionaires.” Asset valuations are not available cash.',
  },
  {
    id: 'household',
    emoji: '🏠',
    label: 'US household debt',
    short: 'Household debt',
    value: 13,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'The original includes mortgages, car loans and other household borrowing.',
  },
  {
    id: 'us-debt',
    emoji: '🇺🇸',
    label: 'US government debt',
    short: 'US government debt',
    value: 20,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'An accumulated liability, not a yearly expense. The original does not specify an observation date.',
  },
  {
    id: 'central',
    emoji: '🏦',
    label: 'Money in the world’s central banks',
    short: 'Central banks',
    value: 21,
    kind: 'stock',
    basis: 'Monetary snapshot · 2018 reference',
    note: 'Retains the source’s wording. The underlying accounting definition is not supplied in the image.',
  },
  {
    id: 'fortune',
    emoji: '🏢',
    label: 'Combined value of Fortune 500 companies',
    short: 'Fortune 500 value',
    value: 27.6,
    kind: 'stock',
    basis: 'Valuation snapshot · 2018 reference',
    note: 'The source says “combined value”; it does not define the valuation method in the graphic.',
  },
  {
    id: 'global-debt',
    emoji: '🌐',
    label: 'Total global debt',
    short: 'Global debt',
    value: 63,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'Retains the historical source label. Its coverage is not specified in the image; do not treat this as a verified all-sector debt total.',
  },
  {
    id: 'one-percent',
    emoji: '💰',
    label: 'Wealth of the 1%',
    short: 'Wealth of the 1%',
    value: 127,
    kind: 'stock',
    basis: 'Wealth snapshot · 2018 reference',
    note: 'The original graphic does not define the population or asset coverage. This value is reproduced for design study, not presented as a current estimate.',
  },
  {
    id: 'low-carbon',
    emoji: '🌱',
    label: 'Deploy low-carbon technology worldwide',
    short: 'Low-carbon tech',
    value: 4.7,
    kind: 'estimate',
    basis: 'Investment estimate · horizon unspecified',
    note: 'The original does not state the spending horizon or price year. Do not annualize this amount.',
  },
  {
    id: 'efficiency',
    emoji: '💡',
    label: 'Make buildings, transport and industry energy efficient',
    short: 'Energy efficiency',
    value: 8.8,
    kind: 'estimate',
    basis: 'Investment estimate · horizon unspecified',
    note: 'The original does not state the spending horizon. This estimate may overlap other climate investments.',
  },
  {
    id: 'paris',
    emoji: '🌡️',
    label: 'Meet Paris climate targets by 2030',
    short: 'Paris climate targets',
    value: 16.5,
    kind: 'estimate',
    basis: 'Investment estimate · through 2030',
    note: 'A historical estimate of investment to meet climate targets, not an annual expense or a current project quote.',
  },
  {
    id: 'infrastructure',
    emoji: '🏗️',
    label: 'Infrastructure for global growth before 2030',
    short: 'Global infrastructure',
    value: 89,
    kind: 'estimate',
    basis: 'Investment estimate · before 2030',
    note: 'The reference describes infrastructure investment required before 2030. It is not an annual budget.',
  },
  {
    id: 'apple',
    emoji: '🍎',
    label: 'Apple — trillion-dollar reference',
    short: 'Apple',
    value: 1,
    kind: 'stock',
    basis: 'Reference valuation · 2018 graphic',
    note: 'The Apple-logo $1 trillion block is the reference unit shown in the original graphic.',
  },
  {
    id: 'corruption',
    emoji: '🤝',
    label: 'Corruption in developing countries',
    short: 'Corruption',
    value: 1,
    kind: 'flow',
    basis: 'Activity estimate · period unspecified',
    note: 'The original gives no accounting definition or observation period for this estimate.',
  },
  {
    id: 'sdgs',
    emoji: '🎯',
    label: 'Reach the UN Sustainable Development Goals',
    short: 'UN development goals',
    value: 1.4,
    kind: 'estimate',
    basis: 'Cost estimate · horizon unspecified',
    note: 'The original does not specify the spending period or geographic coverage.',
  },
  {
    id: 'laundering',
    emoji: '🧺',
    label: 'Money laundered globally',
    short: 'Money laundering',
    value: 1.6,
    kind: 'flow',
    basis: 'Activity estimate · period unspecified',
    note: 'The original does not supply an observation date or period.',
  },
  {
    id: 'fashion',
    emoji: '👕',
    label: 'Global fashion industry',
    short: 'Fashion industry',
    value: 2.4,
    kind: 'flow',
    basis: 'Industry activity · basis unspecified',
    note: 'The image does not specify whether this is revenue or another industry measure.',
  },
  {
    id: 'internet',
    emoji: '💻',
    label: 'Top 20 internet companies',
    short: 'Top 20 internet firms',
    value: 3,
    kind: 'stock',
    basis: 'Company value · basis unspecified',
    note: 'The original does not define the valuation method or list the companies.',
  },
  {
    id: 'wars',
    emoji: '⚔️',
    label: 'Cost of the Iraq and Afghanistan wars',
    short: 'Iraq & Afghanistan wars',
    value: 3,
    kind: 'total',
    basis: 'Cumulative cost · start/end unspecified',
    note: 'The source does not state the dates or included cost categories.',
  },
  {
    id: 'fx',
    emoji: '💱',
    label: 'Daily foreign exchange market',
    short: 'Foreign exchange',
    value: 5.3,
    kind: 'flow',
    basis: 'Daily activity · 2018 reference',
    note: 'A daily turnover figure, not annual output. Repeated transactions are counted; this is not a stock of wealth.',
  },
  {
    id: 'developing-debt',
    emoji: '🌏',
    label: 'Debt of low- and middle-income countries',
    short: 'Developing-country debt',
    value: 6.7,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'Retains the label in the original; the image does not provide the observation date or debt coverage.',
  },
  {
    id: 'crisis',
    emoji: '📉',
    label: 'Cost of the 2007–08 financial crisis',
    short: 'Financial crisis losses',
    value: 15,
    kind: 'total',
    basis: 'Cumulative losses · 2007–08 crisis',
    note: 'The original names the crisis but does not specify the full period over which losses were estimated.',
  },
  {
    id: 'eu-debt',
    emoji: '🇪🇺',
    label: 'EU governments’ debt',
    short: 'EU government debt',
    value: 15.2,
    kind: 'stock',
    basis: 'Debt snapshot · 2018 reference',
    note: 'Historical source value; the observation date and included debt instruments are not given in the image.',
  },
  {
    id: 'offshore',
    emoji: '🏝️',
    label: 'Wealth hidden offshore by the rich',
    short: 'Offshore wealth',
    value: 26.5,
    kind: 'stock',
    basis: 'Wealth estimate · 2018 reference',
    note: 'An estimate from the original graphic; uncertainty bounds and asset coverage are not supplied.',
  },
  {
    id: 'debt-increase',
    emoji: '📈',
    label: 'Worldwide debt increase since the financial crisis',
    short: 'Debt increase since crisis',
    value: 57,
    kind: 'total',
    basis: 'Accumulated change · since financial crisis',
    note: 'A change in debt over time, not an additional independent stock. Do not add it to total global debt.',
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

/** Group by descriptive type without changing the common area-per-dollar scale. */
export function groupedMosaic(
  data: MoneyItem[],
  width: number,
  height: number,
): Tile[] {
  const groups = (Object.keys(kindInfo) as Kind[])
    .map((kind) => ({
      id: kind,
      emoji: '',
      label: kindInfo[kind].label,
      short: kindInfo[kind].label,
      value: data
        .filter((d) => d.kind === kind)
        .reduce((n, d) => n + d.value, 0),
      kind,
      basis: '',
      note: '',
    }))
    .filter((d) => d.value > 0);
  return mosaic(groups, 0, 0, width, height).flatMap((g) =>
    mosaic(
      data.filter((d) => d.kind === g.item.kind),
      g.x,
      g.y,
      g.w,
      g.h,
    ),
  );
}
