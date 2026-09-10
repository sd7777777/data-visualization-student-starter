export function SiteHeader(_props: { section?: 'explorer' | 'lab' | 'coursework'; base?: '.' | '..' } = {}) {
  return <header className="site-header" id="top">
    <a className="wordmark" href="#top" aria-label="Part D prescriber explorer home">part d prescriber index</a>
    <nav aria-label="Primary navigation">
      <a href="#relationship">charts</a><a href="#place">states</a><a href="#data">data</a><a href="./downloads/part-d-prescriber-source.zip" download>download</a>
      <a className="source-link" href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider" target="_blank" rel="noreferrer">CMS data ↗</a>
    </nav>
  </header>;
}
