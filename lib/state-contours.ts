import { geoIdentity, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import topologyData from 'us-atlas/states-albers-10m.json';
import type { SpecialtyProfile } from './prescriber';
import { atlasValue, type AtlasMetric } from './atlas-analysis';
import { csvCell } from './geography-analysis';

const topology = topologyData as unknown as Topology<{
  states: GeometryCollection<{ name: string }>;
}>;
const states = feature(topology, topology.objects.states);
const path = geoPath(
  geoIdentity().fitExtent(
    [
      [15, 15],
      [960, 590],
    ],
    states,
  ),
);
export const stateShapes = states.features.map((state) => ({
  name: state.properties.name,
  path: path(state) ?? '',
  centroid: path.centroid(state),
}));
export const mapBands = [
  { label: 'Below 0.5×', color: '#00775f' },
  { label: '0.5–<0.8×', color: '#86baa6' },
  { label: '0.8–1.2×', color: '#e0e4dc' },
  { label: '>1.2–2×', color: '#d6a185' },
  { label: 'Above 2×', color: '#984530' },
];
export function mapBand(ratio: number) {
  return ratio < 0.5
    ? 0
    : ratio < 0.8
      ? 1
      : ratio <= 1.2
        ? 2
        : ratio <= 2
          ? 3
          : 4;
}
export function mapRows(
  profile: SpecialtyProfile,
  metric: AtlasMetric,
  minimum: number,
) {
  const benchmark = atlasValue(profile.national, metric);
  return stateShapes.map((shape) => {
    const row = profile.states.find((state) => state.name === shape.name);
    const status = !row
      ? 'unavailable'
      : row.providers < minimum
        ? 'below threshold'
        : 'included';
    const value = row && status === 'included' ? atlasValue(row, metric) : null;
    return {
      ...shape,
      row,
      status,
      value,
      ratio: value !== null && benchmark > 0 ? value / benchmark : null,
    };
  });
}
export function mapCsv(
  profile: SpecialtyProfile,
  metric: AtlasMetric,
  minimum: number,
  year: number,
) {
  const headers = [
    'year',
    'specialty',
    'state',
    'code',
    'measure',
    'value',
    'national_value',
    'ratio_to_national',
    'provider_records',
    'minimum_records',
    'status',
  ];
  return [
    headers,
    ...mapRows(profile, metric, minimum).map((item) => [
      year,
      profile.specialty,
      item.name,
      item.row?.code ?? '',
      metric,
      item.value,
      atlasValue(profile.national, metric),
      item.ratio,
      item.row?.providers ?? null,
      minimum,
      item.status,
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}
