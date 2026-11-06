import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const L = await loadTs(new URL('../lib/regional-lens.ts', import.meta.url));
const R = await loadTs(new URL('../lib/regions.ts', import.meta.url));
const { MIN_RECORDS } = await loadTs(new URL('../lib/drug-mix.ts', import.meta.url));
const data = JSON.parse(
  readFileSync(new URL('../public/data/prescriber-summary/drug-mix.json', import.meta.url), 'utf8'),
);
const close = (a, b, tolerance = 1e-9, message = '') =>
  assert.ok(Math.abs(a - b) <= tolerance, `${message} ${a} vs ${b}`);

// ── Colour: hue is the region, lightness is the value ──
const hueGap = (a, b) => {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
};
let toneCases = 0;
for (const region of R.REGIONS) {
  const baseHue = L.hexToOklch(region.color).h;
  let last = Infinity;
  for (let i = 0; i <= 50; i += 1) {
    const t = i / 50;
    const tone = L.regionTone(region.color, t);
    const { L: lightness, h, C } = L.hexToOklch(tone);
    // Lightness falls as the value rises, and is the same for every region at the same value.
    assert.ok(lightness < last, `${region.id} lightness falls at t=${t}`);
    last = lightness;
    const expected = L.TONE_LIGHTNESS[0] + (L.TONE_LIGHTNESS[1] - L.TONE_LIGHTNESS[0]) * t;
    close(lightness, expected, 0.006, `${region.id} lightness at t=${t}`);
    // The hue stays the region's hue, within 8-bit rounding at low chroma.
    assert.ok(C > 0.02, `${region.id} keeps chroma at t=${t}`);
    assert.ok(hueGap(h, baseHue) < 0.16, `${region.id} hue at t=${t}: ${hueGap(h, baseHue)}`);
    // Tile text is always legible.
    assert.ok(L.contrastRatio(tone, L.inkOn(tone)) >= 4.5, `${region.id} text contrast at t=${t}`);
    toneCases += 1;
  }
  assert.equal(L.regionTone(region.color, -3), L.regionTone(region.color, 0));
  assert.equal(L.regionTone(region.color, 3), L.regionTone(region.color, 1));
}
close(L.contrastRatio('#000000', '#ffffff'), 21, 1e-9);

// ── Quantiles and box statistics, against hand-worked cases ──
assert.equal(L.quantile([], 0.5), null);
assert.equal(L.quantile([1, 2, 3, 4], 0.5), 2.5);
close(L.quantile([1, 2, 3, 4, 5], 0.25), 2);
close(L.quantile([10, 20], 0.05), 10.5);
assert.deepEqual(L.boxStats([3, 1, 2, 5, 4]), { n: 5, min: 1, q1: 2, median: 3, q3: 4, max: 5 });
assert.equal(L.boxStats([]), null);

// ── The value scale ──
const flat = L.toneScale([0.5, 0.5, 0.5]);
assert.ok(flat.hi - flat.lo >= 0.01 - 1e-12, 'a flat view still has a usable scale');
const sample = L.toneScale(Array.from({ length: 101 }, (_, i) => i / 100));
close(sample.lo, 0.05, 1e-9);
close(sample.hi, 0.95, 1e-9);
assert.equal(sample.at(0), 0);
assert.equal(sample.at(1), 1);
close(sample.at(0.5), 0.5);
assert.equal(sample.step(0), 0);
assert.equal(sample.step(1), L.TONE_STEPS - 1);
assert.equal(sample.edges.length, L.TONE_STEPS + 1);

// ── Beeswarm: exact x, no overlap, deterministic ──
const items = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, x: 100 + (i % 5) * 3 }));
const swarm = L.dodge(items, 16);
for (const a of items)
  for (const b of items) {
    if (a.id >= b.id) continue;
    const d = Math.hypot(a.x - b.x, swarm.get(a.id) - swarm.get(b.id));
    assert.ok(d >= 16 - 1e-6, `${a.id}/${b.id} overlap at ${d}`);
  }
assert.deepEqual([...L.dodge(items, 16)], [...swarm]);
const byId = (a, b) => a[0].localeCompare(b[0]);
assert.deepEqual(
  [...L.dodge([...items].reverse(), 16)].sort(byId),
  [...swarm].sort(byId),
  'input order does not change the layout',
);
assert.equal(L.dodge([{ id: 'one', x: 5 }], 10).get('one'), 0);

// ── Every view: 31 specialty options × 2 measures ──
const options = [R.ALL_SPECIALTIES, ...data.specialties];
let viewCases = 0;
let swarmCases = 0;
for (const measure of ['cost', 'claims']) {
  for (const specialty of options) {
    const view = L.lensView(data, specialty, measure);
    const { points, hidden } = R.statePoints(data, specialty);
    assert.equal(view.states.length, points.length);
    assert.equal(view.hidden, hidden);
    assert.equal(view.states.length + view.hidden, 51);
    assert.ok(view.scale.hi > view.scale.lo);
    // Steps partition the plotted states.
    const counts = Array.from({ length: L.TONE_STEPS }, () => 0);
    for (const s of view.states) {
      const value = L.measureValue(s.row, measure);
      assert.ok(s.row.records >= MIN_RECORDS);
      const t = view.scale.at(value);
      assert.ok(t >= 0 && t <= 1);
      const step = view.scale.step(value);
      assert.ok(Number.isInteger(step) && step >= 0 && step < L.TONE_STEPS);
      counts[step] += 1;
    }
    assert.equal(counts.reduce((a, b) => a + b, 0), view.states.length);
    for (const region of R.REGIONS) {
      const mine = view.states.filter((s) => s.region.id === region.id);
      const box = view.boxes[region.id][measure];
      if (!mine.length) {
        assert.equal(box, null);
        continue;
      }
      assert.equal(box.n, mine.length);
      const values = mine.map((s) => L.measureValue(s.row, measure));
      assert.equal(box.min, Math.min(...values));
      assert.equal(box.max, Math.max(...values));
      assert.ok(box.min <= box.q1 && box.q1 <= box.median && box.median <= box.q3 && box.q3 <= box.max);
      const summary = view.summaries.find((s) => s.region.id === region.id);
      const median = L.summaryValue(summary, measure);
      // The median marked on the strips matches the Week 10 regional median.
      if (median !== null) close(box.median, median, 1e-12, `${specialty} ${region.id}`);
      assert.equal(summary.count, mine.length);
      // Beeswarm for this row at the plotted spacing keeps marks apart.
      const scaled = mine.map((s) => ({ id: s.code, x: L.measureValue(s.row, measure) * 2000 }));
      const offsets = L.dodge(scaled, 16.5);
      for (const a of scaled)
        for (const b of scaled)
          if (a.id < b.id)
            assert.ok(Math.hypot(a.x - b.x, offsets.get(a.id) - offsets.get(b.id)) >= 16.5 - 1e-6);
      swarmCases += 1;
    }
    viewCases += 1;
  }
}

// ── Every specialty, for each measure ──
for (const measure of ['cost', 'claims']) {
  const { overall, rows, skipped } = L.specialtyRows(data, measure);
  assert.equal(rows.length, 28);
  assert.equal(skipped, 2);
  assert.equal(overall.specialty, R.ALL_SPECIALTIES);
  const tally = L.leaderTally(rows);
  assert.equal(Object.values(tally).reduce((a, b) => a + b, 0), rows.length);
  for (const row of rows) {
    assert.equal(row.medians.length, 4);
    const values = row.medians.map((m) => m.value);
    close(row.spread, Math.max(...values) - Math.min(...values));
    const top = row.medians.find((m) => m.region.id === row.leader);
    assert.equal(top.value, Math.max(...values));
    assert.equal(row.nationalValue, L.measureValue(row.national, measure));
    assert.equal(row.lowCoverage, row.national.claimCoverage < 0.95);
  }
  for (let i = 1; i < rows.length; i += 1)
    assert.ok(rows[i - 1].spread >= rows[i].spread, 'rows start by spread');
  const byName = L.sortSpecialtyRows(rows, 'name', null).map((r) => r.specialty);
  assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b)));
  assert.equal(new Set(byName).size, rows.length);
}

// The headline comparison on the page: Week 10's cost tally is unchanged, and claims differ.
const costRows = L.specialtyRows(data, 'cost').rows;
const claimRows = L.specialtyRows(data, 'claims').rows;
assert.deepEqual(L.leaderTally(costRows), R.leaderCounts(R.fingerprints(data).rows), 'cost tally matches Week 10');
assert.deepEqual(L.leaderTally(costRows), { northeast: 6, midwest: 4, south: 15, west: 3 });
assert.deepEqual(L.leaderTally(claimRows), { northeast: 9, midwest: 5, south: 8, west: 6 });

// ── One state against the regions, recomputed independently ──
let stateCases = 0;
for (const measure of ['cost', 'claims']) {
  const { overall, rows } = L.specialtyRows(data, measure);
  for (const region of R.REGIONS) {
    for (const code of region.states) {
      const across = L.stateAcross(data, code, rows, measure, overall);
      assert.equal(across.code, code);
      assert.equal(across.region.id, region.id);
      assert.equal(across.values.size, rows.length + 1, 'overall row is kept');
      let compared = 0;
      let aboveNational = 0;
      let aboveRegion = 0;
      for (const row of rows) {
        const point = R.statePoints(data, row.specialty).points.find((p) => p.code === code);
        const entry = across.values.get(row.specialty);
        if (!point) {
          assert.equal(entry, null);
          continue;
        }
        const value = L.measureValue(point.row, measure);
        const own = row.medians.find((m) => m.region.id === region.id).value;
        close(entry.value, value);
        close(entry.vsNational, value - row.nationalValue);
        close(entry.vsRegion, value - own);
        compared += 1;
        if (value > row.nationalValue) aboveNational += 1;
        if (value > own) aboveRegion += 1;
      }
      assert.equal(across.compared, compared);
      assert.equal(across.aboveNational, aboveNational);
      assert.equal(across.aboveRegion, aboveRegion);
      stateCases += 1;
    }
  }
}
assert.equal(L.stateAcross(data, 'PR', costRows, 'cost'), null, 'territories have no Census region');
const georgia = L.stateAcross(data, 'GA', costRows, 'cost');
assert.deepEqual([georgia.compared, georgia.aboveNational, georgia.aboveRegion], [28, 26, 25]);

// State sort: highest difference first, states without enough records last.
const vermont = L.stateAcross(data, 'VT', costRows, 'cost');
const sorted = L.sortSpecialtyRows(costRows, 'state', vermont);
const diffs = sorted.map((row) => vermont.values.get(row.specialty)?.vsNational ?? null);
const firstMissing = diffs.indexOf(null);
assert.ok(firstMissing > 0 && diffs.slice(firstMissing).every((d) => d === null));
for (let i = 1; i < firstMissing; i += 1) assert.ok(diffs[i - 1] >= diffs[i]);
assert.deepEqual(
  L.sortSpecialtyRows(costRows, 'state', null).map((r) => r.specialty),
  L.sortSpecialtyRows(costRows, 'spread', null).map((r) => r.specialty),
  'no state means the default order',
);

// Ranks.
const psychiatry = L.lensView(data, 'Psychiatry', 'cost');
const texas = L.stateRanks(psychiatry.states, 'TX', 'cost');
assert.equal(texas.nationalOf, 50);
assert.equal(texas.regionOf, 17);
assert.equal(texas.national, 13);
assert.equal(texas.region, 9);
assert.equal(L.stateRanks(psychiatry.states, 'ZZ', 'cost'), null);
close(L.nationalRow(data, R.ALL_SPECIALTIES).brandCostShare, 0.88, 0.005);
assert.equal(L.nationalRow(data, 'Nope'), null);

// ── Clearing: click on empty space closes the topmost selection ──
assert.deepEqual(L.clickAway({ pinnedState: 'TX', pinned: ['south'] }), { pinnedState: null, pinned: ['south'] });
assert.deepEqual(L.clickAway({ pinnedState: null, pinned: ['south'] }), { pinnedState: null, pinned: [] });
assert.deepEqual(L.clickAway({ pinnedState: null, pinned: [] }), { pinnedState: null, pinned: [] });

// ── Parsing a shared view ──
assert.equal(L.parseMeasure('claims'), 'claims');
assert.equal(L.parseMeasure('junk'), 'cost');
assert.equal(L.parseLayout('scatter'), 'scatter');
assert.equal(L.parseLayout(null), 'strips');
assert.equal(L.parseSort('state'), 'state');
assert.equal(L.parseSort('junk'), 'spread');
assert.ok(data.specialties.includes(L.DEFAULT_SPECIALTY));

console.log(
  `Regional lens checks passed: ${toneCases} tones, ${viewCases} views, ${swarmCases} regional beeswarms, ${stateCases} state comparisons.`,
);
