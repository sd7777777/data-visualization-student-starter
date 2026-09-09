import { ArrowUpRight } from 'lucide-react';

export function SiteHeader({ section = 'explorer', base = '.' }: { section?: 'explorer' | 'lab' | 'coursework'; base?: '.' | '..' }) {
  const links = [
    { id: 'explorer', href: `${base}/`, label: 'Explorer' },
    { id: 'lab', href: `${base}/lab`, label: 'Data lab' },
    { id: 'coursework', href: `${base}/coursework`, label: 'Coursework' },
  ] as const;
  return <header className="site-header">
    <a className="wordmark" href={`${base}/`} aria-label="Part D field notes home"><span>573</span> PART D / FIELD NOTES</a>
    <nav aria-label="Primary navigation">
      {links.map((link) => <a key={link.id} href={link.href} aria-current={section === link.id ? 'page' : undefined}>{link.label}</a>)}
      <a className="source-link" href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider" target="_blank" rel="noreferrer">CMS source <ArrowUpRight size={13}/></a>
    </nav>
  </header>;
}
