import RegionalLens from '@/src/assignments/week-11/RegionalLens';
export const dynamic = 'force-static';
export const metadata = {
  title: 'Regional lens · Week 11',
  description:
    'Does the Medicare Part D brand-name cost gap have a region? States by Census region, with hue for the region and lightness for the value.',
};
export default function Page() {
  return <RegionalLens />;
}
