import TrillionAtlas from '@/src/assignments/week-07/TrillionAtlas';
export const dynamic = 'force-static';
export const metadata = {
  title: 'Trillion Atlas · Week 7',
  description:
    'An interactive study of trillion-dollar scale, inspired by David McCandless. Historical 2018 reference edition.',
};
export default function Page() {
  return <TrillionAtlas />;
}
