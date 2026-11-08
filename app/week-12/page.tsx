import CostRatio from '@/src/assignments/week-12/CostRatio';
export const dynamic = 'force-static';
export const metadata = {
  title: 'Brand vs. generic cost per claim · Week 12',
  description:
    'How many times more a Medicare Part D brand-name claim costs than a generic claim, by specialty. Started as a VizHub prototype.',
};
export default function Page() {
  return <CostRatio />;
}
