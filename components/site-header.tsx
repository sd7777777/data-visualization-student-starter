import { ArrowUpRight } from 'lucide-react';
import { assignments } from '@/src/assignments';

export function SiteHeader({ section = 'explorer', base = '.' }: { section?: 'explorer' | 'lab' | 'coursework'; base?: '.' | '..' }) {
  const currentPath = section === 'explorer' ? '/' : `/${section}`;
  return <header className="site-header">
    <a className="wordmark" href={`${base}/`} aria-label="Part D field notes home"><span>573</span> PART D / FIELD NOTES</a>
    <nav aria-label="Primary navigation">
      {assignments.map((assignment) => <a key={assignment.id} href={assignment.path === '/' ? `${base}/` : `${base}${assignment.path}`} aria-current={currentPath === assignment.path ? 'page' : undefined}>{assignment.navLabel}</a>)}
      <a className="source-link" href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider" target="_blank" rel="noreferrer">CMS source <ArrowUpRight size={13}/></a>
    </nav>
  </header>;
}
