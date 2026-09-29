import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(
  new URL('../lib/scroll-story.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { buildScrollStory, STORY_DOTS, storyDot } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/prescriber-summary/summary.json', import.meta.url),
    'utf8',
  ),
);
for (const area of data.areas) {
  const original = JSON.stringify(area);
  const { cohort, measures } = buildScrollStory(area);
  assert.equal(cohort.length, Math.min(5, area.specialties.length));
  assert(cohort.every((r, i) => i === 0 || cohort[i - 1].cost >= r.cost));
  for (const m of measures) {
    assert.equal(m.total, area.summary[m.metric]);
    assert.equal(
      m.value,
      cohort.reduce((sum, r) => sum + r[m.metric], 0),
    );
    assert(m.share >= 0 && m.share <= 1);
    assert(Math.abs(m.dots / STORY_DOTS - m.share) <= 0.5 / STORY_DOTS);
  }
  assert.equal(
    JSON.stringify(area),
    original,
    'Story must not reorder shared chart data',
  );
}
for (const grid of [true, false]) {
  const positions = new Set();
  for (let i = 0; i < STORY_DOTS; i++) {
    const { x, y } = storyDot(i, grid);
    assert(x >= 6 && x <= 414 && y >= 6 && y <= 414, 'Dots fit their viewport');
    positions.add(`${x},${y}`);
  }
  assert.equal(positions.size, STORY_DOTS);
}
const national = buildScrollStory(data.areas.find((a) => a.code === 'US'));
assert.deepEqual(
  national.measures.map((m) => Number((m.share * 100).toFixed(1))),
  [47.5, 72.8, 59.4],
);
assert.equal(
  buildScrollStory({
    specialties: [],
    summary: { providers: 0, claims: 0, cost: 0 },
  }).measures[0].share,
  0,
);
console.log(
  `Scroll story: ${data.areas.length} cohorts, full-area denominators, dot rounding and both layouts passed.`,
);
