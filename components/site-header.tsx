import { assignments } from '@/src/assignments';

export function SiteHeader({ section = 'explorer', base = '.' }: { section?: 'explorer' | 'lab' | 'coursework'; base?: '.' | '..' }) {
  const currentPath = section === 'explorer' ? '/' : `/${section}`;
  return <header className="site-header">
    <a className="wordmark" href={`${base}/`} aria-label="Part D prescriber explorer home">Part D prescribers</a>
    <nav aria-label="Primary navigation">
      {assignments.map((assignment) => <a key={assignment.id} href={assignment.path === '/' ? `${base}/` : `${base}${assignment.path}`} aria-current={currentPath === assignment.path ? 'page' : undefined}>{assignment.navLabel}</a>)}
      <a className="source-link" href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider" target="_blank" rel="noreferrer">CMS data ↗</a>
    </nav>
  </header>;
}
