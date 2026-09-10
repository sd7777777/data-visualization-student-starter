import { SiteHeader } from '@/components/site-header';

export const dynamic = 'force-static';

const assignments = [
  { week: 'WEEK 01', title: 'Repository Setup', status: 'Deployment-ready', items: ['The project is a single Git repository with a visible, substantial front-end modification.', 'A GitHub Actions workflow builds and publishes the static export to GitHub Pages.', 'The README gives a GitHub Desktop publishing path and local Node setup.', 'Final submission still needs your GitHub repository URL, live Pages URL, and screenshot/write-up.'] },
  { week: 'WEEK 02', title: 'Load & Summarize a Dataset', status: 'Implemented', items: ['Public browser file is 608 KB—well below the 8 MB limit.', 'Dataset shape is visible: 1,416,883 rows × 84 columns.', 'All 84 attributes are classified and searchable in the Data lab.', 'README documents the CMS source, concept, and regeneration workflow.'] },
  { week: 'WEEK 03', title: 'First Visual', status: 'Implemented', items: ['Specialty scatterplot uses D3 log and square-root scales.', 'Axes, units, medians, legend logic, and source note are explicit.', 'Mouse, touch, and keyboard interaction reveal exact values.', 'The visual is connected to the investigation—not decoration.'] },
  { week: 'PROJECT', title: 'Final Project Exploration 1', status: 'In progress', items: ['Domain, audience, questions, data source, and limitations are documented.', 'Multiple visual directions now exist: scatter, tile map, lollipop comparison, histogram, and record table.', 'Related CMS documentation is linked from the repository and site.', 'Hand-drawn sketch photographs remain a student-authored deliverable.'] },
  { week: 'PROJECT', title: 'Task Analysis', status: 'Implemented', items: ['Tasks are phrased as user goals independent of a chart type.', 'Each task maps to a concrete interaction and visible evidence.', 'The analysis separates lookup, comparison, ranking, and distribution.'] },
];

export default function Coursework() {
  return <main>
    <SiteHeader section="coursework"/>
    <header className="page-head"><div><span className="kicker">COURSE EVIDENCE / CS 573</span><h1>The assignments live inside the product.</h1></div><p>This is a working crosswalk between the attached Canvas briefs and the portfolio site. It keeps course evidence visible without turning the public-facing explorer into a class checklist.</p></header>
    <section className="section-wrap">
      <div className="assignment-list">{assignments.map((a) => <article className="assignment" key={`${a.week}-${a.title}`}><div className="week">{a.week}</div><div><h2>{a.title}</h2><ul>{a.items.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="status">{a.status.toUpperCase()}</div></article>)}</div>
    </section>
    <section className="section-wrap">
      <div className="section-intro"><span className="figure-no">REPOSITORY HANDOFF</span><h2>Prepared for the Week 01 submission.</h2><p>The course brief asks for three shareable items. The project supplies the working code and Pages automation; your GitHub account supplies the final links.</p></div>
      <div className="task-grid">
        <article className="task-card"><span className="eyebrow">01 / REPOSITORY</span><h3>Publish this folder with GitHub Desktop.</h3><p>Add the local repository, publish it to your account, and keep the default branch named <code>main</code>.</p></article>
        <article className="task-card"><span className="eyebrow">02 / LIVE PAGE</span><h3>Enable GitHub Actions for Pages.</h3><p>Choose GitHub Actions as the Pages source. The included workflow builds the same three-route static site automatically.</p></article>
        <article className="task-card"><span className="eyebrow">03 / DISCORD</span><h3>Share one screenshot, both links, and a short description.</h3><p>Describe the project as an interactive analysis of 1.4 million 2024 Medicare Part D provider records using Python preprocessing and D3.</p></article>
        <article className="task-card"><span className="eyebrow">04 / CANVAS</span><h3>Submit the repository URL, Pages URL, and the same write-up.</h3><p>These account-specific URLs cannot be generated until you publish the repository, so the site does not invent them.</p></article>
      </div>
    </section>
    <section className="section-wrap">
      <div className="section-intro"><span className="figure-no">TASK ABSTRACTION</span><h2>What a healthcare analyst should be able to do.</h2><p>The chart type is deliberately absent from these goal statements. That keeps future design changes tied to real analytical needs.</p></div>
      <div className="task-grid">
        <article className="task-card"><span className="eyebrow">COMPARE</span><h3>Find specialties with unusually high cost relative to prescribing volume.</h3><p>Change geography and inspect position against the specialty medians; read exact cost-per-claim and claims-per-provider values.</p></article>
        <article className="task-card"><span className="eyebrow">CHARACTERIZE</span><h3>Describe how a specialty’s intensity varies geographically.</h3><p>Select a specialty and metric; compare the highest state-level aggregates while keeping the national context in view.</p></article>
        <article className="task-card"><span className="eyebrow">LOCATE</span><h3>Identify provider records that account for the largest drug-cost totals.</h3><p>Filter by geography, then move from the specialty field to the ordered provider-record table.</p></article>
        <article className="task-card"><span className="eyebrow">AUDIT</span><h3>Determine whether a field is usable before analyzing it.</h3><p>Search the field inventory, identify its data type and group, and inspect blank and suppression-marker counts.</p></article>
      </div>
      <aside className="sketch-note"><h3>Student-authored item still needed: hand-drawn sketches</h3><p>The exploration brief specifically asks for photographs or scans of several hand-drawn ideas with notes. Those should remain visibly yours. Add the images to <code>public/sketches/</code>; this page is prepared to become their gallery in a later iteration.</p></aside>
    </section>
    <section className="section-wrap">
      <div className="section-intro"><span className="figure-no">DESIGN LOGIC</span><h2>A story built in analytical levels.</h2><p>The reading order is intentional and extensible.</p></div>
      <div className="task-grid"><article className="task-card"><span className="eyebrow">01 / FIELD</span><h3>See relationships.</h3><p>Specialties establish the overall structure and reveal that scale, cost, and category mix do not move together.</p></article><article className="task-card"><span className="eyebrow">02 / PLACE</span><h3>See pattern, then rank it.</h3><p>The equal-area tile map preserves small states and territories; the adjacent dot plot makes the highest aggregates precisely comparable.</p></article><article className="task-card"><span className="eyebrow">03 / RECORD</span><h3>Trace concentration.</h3><p>Provider rows make large totals concrete without presenting them as performance judgments.</p></article><article className="task-card"><span className="eyebrow">04 / DATA</span><h3>Audit the evidence.</h3><p>Distributions and field completeness expose the source structure beneath every visual claim.</p></article></div>
    </section>
    <footer><p>This page will grow as new Canvas briefs arrive. The project structure separates reusable data logic, chart components, course evidence, and deployment configuration so future assignments do not require a rebuild.</p><div><a href="./lab">Open the data lab →</a><a href="./">Open the explorer →</a></div></footer>
  </main>;
}
