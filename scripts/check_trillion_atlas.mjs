import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';
const { items, mosaic, comparison } = await loadTs(
  new URL('../src/assignments/week-07/data.ts', import.meta.url),
);
assert.equal(items.length, 20);
assert.equal(new Set(items.map((d) => d.id)).size, 20);
for (const group of [
  items,
  ...['flow', 'stock', 'estimate'].map((k) =>
    items.filter((d) => d.kind === k),
  ),
  [items[0]],
  [],
]) {
  for (const [w, h] of [
    [1000, 620],
    [320, 500],
    [1400, 300],
  ]) {
    const tiles = mosaic(group, 0, 0, w, h);
    const total = group.reduce((n, d) => n + d.value, 0);
    assert.equal(tiles.length, group.length);
    let area = 0;
    for (const t of tiles) {
      assert.ok(
        t.x >= 0 && t.y >= 0 && t.x + t.w <= w + 1e-8 && t.y + t.h <= h + 1e-8,
      );
      assert.ok(Math.abs((t.w * t.h) / (w * h) - t.item.value / total) < 1e-10);
      area += t.w * t.h;
      for (const other of tiles)
        if (t !== other) {
          const overlapW =
            Math.min(t.x + t.w, other.x + other.w) - Math.max(t.x, other.x);
          const overlapH =
            Math.min(t.y + t.h, other.y + other.h) - Math.max(t.y, other.y);
          assert.ok(overlapW < 1e-8 || overlapH < 1e-8, 'Tiles overlap');
        }
    }
    if (group.length) assert.ok(Math.abs(area - w * h) < 1e-7);
  }
}
assert.equal(comparison(items[7], items[0]).ratio, 19.4 / 1.7);
assert.equal(comparison(items[7], items[0]).sameKind, true);
assert.equal(comparison(items[15], items[18]).sameKind, false);
console.log(
  'Passed: 20 records; 18 layout cases; proportional area, bounds, no overlaps, conservation and ratio/type semantics.',
);
