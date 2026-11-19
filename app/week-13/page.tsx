import StateCompare from '@/src/assignments/week-13/StateCompare';
export const dynamic = 'force-static';
export const metadata = {
  title: 'Brand vs. generic, state vs. nation · Week 13',
  description:
    'How many times more a Medicare Part D brand-name claim costs than a generic claim, by specialty, with any state compared against the national average.',
};
export default function Page() {
  return <StateCompare />;
}
