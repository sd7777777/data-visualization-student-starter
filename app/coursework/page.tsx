import { SiteHeader } from '@/components/site-header';

export const dynamic = 'force-static';

const questions = [
  ['Compare', 'Which specialties combine high cost per claim with high prescribing volume?'],
  ['Locate', 'Where do state-level specialty values differ from the national aggregate?'],
  ['Rank', 'Which specialties and provider records account for the largest totals?'],
  ['Audit', 'Which source fields are complete enough to use?'],
];

const milestones = [
  ['01', 'Repository setup', 'Starter-compatible assignment folders, shared navigation, and GitHub Pages workflow.'],
  ['02', 'Load and summarize', 'Python reduction of 1,416,883 rows and a searchable 84-field inventory.'],
  ['03', 'First visual', 'D3 scales, labeled axes, keyboard-accessible marks, and source notes.'],
  ['04', 'Project exploration', 'Specialty, geography, distribution, and record-level views built from one prepared dataset.'],
];

export default function Methods() {
  return <main>
    <SiteHeader section="coursework"/>
    <header className="page-head"><div><span className="kicker">PROJECT NOTES</span><h1>Methods</h1></div><p>How the data was reduced, what the charts answer, and where interpretation should stop.</p></header>

    <section className="section-wrap methods-grid">
      <article>
        <h2>Source</h2>
        <p>CMS Medicare Part D Prescribers by Provider, calendar year 2024. The source contains one record per NPI and 84 fields.</p>
        <p><a href="https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/medicare-part-d-prescribers-by-provider" target="_blank" rel="noreferrer">Open the CMS dataset ↗</a></p>
      </article>
      <article>
        <h2>Preparation</h2>
        <p>A Python script streams the full CSV, checks missing and suppression markers, and writes a small JSON summary for the browser. The charts use D3 scales and native SVG.</p>
      </article>
      <article>
        <h2>Limits</h2>
        <p>Part D records do not describe a clinician’s full practice or quality of care. Drug cost excludes manufacturer rebates. Suppressed category values are treated as unavailable.</p>
      </article>
    </section>

    <section className="section-wrap">
      <div className="plain-section-head"><h2>Questions</h2><p>The interface is organized around four user tasks.</p></div>
      <div className="question-list">{questions.map(([verb, question]) => <article key={verb}><b>{verb}</b><p>{question}</p></article>)}</div>
    </section>

    <section className="section-wrap">
      <div className="plain-section-head"><h2>Course milestones</h2><p>Each stage remains in the repository so future assignments can extend the same project.</p></div>
      <ol className="milestone-list">{milestones.map(([number, title, detail]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{detail}</p></div></li>)}</ol>
    </section>

    <footer><p>Prepared from CMS public-use data. Analysis code and generated summaries are kept with the site.</p><div><a href="../lab">Data lab</a><a href="../">Explorer</a></div></footer>
  </main>;
}
