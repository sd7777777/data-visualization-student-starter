import RegionalLens from '@/src/assignments/week-10/RegionalLens';
export const dynamic = 'force-static';
export const metadata = {
  title: 'Regional lens · Week 10',
  description:
    'Does the Medicare Part D brand-name cost gap have a region? An interactive color legend for the Week 8 state comparison.',
};
export default function Page() {
  return <RegionalLens />;
}
