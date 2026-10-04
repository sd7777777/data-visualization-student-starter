import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';
const { items, mosaic, groupedMosaic, mosaicSize, comparison } = await loadTs(
  new URL('../src/assignments/week-07/data.ts', import.meta.url),
);
assert.equal(items.length, 33);
assert.equal(new Set(items.map((d) => d.id)).size, 33);
for (const group of [
  items,
  ...['flow', 'stock', 'estimate', 'total'].map((k) =>
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
    for (const tiles of [
      mosaic(group, 0, 0, w, h),
      groupedMosaic(group, w, h),
    ]) {
      const total = group.reduce((n, d) => n + d.value, 0);
      assert.equal(tiles.length, group.length);
      let area = 0;
      for (const t of tiles) {
        assert.ok(
          t.x >= 0 &&
            t.y >= 0 &&
            t.x + t.w <= w + 1e-8 &&
            t.y + t.h <= h + 1e-8,
        );
        assert.ok(
          Math.abs((t.w * t.h) / (w * h) - t.item.value / total) < 1e-10,
        );
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
}
assert.equal(comparison(items[7], items[0]).ratio, 19.4 / 1.7);
assert.equal(comparison(items[7], items[0]).sameKind, true);
assert.equal(comparison(items[15], items[18]).sameKind, false);
console.log(
  'Passed: 33 records; 42 plain/grouped layout cases; proportional area, bounds, no overlaps, conservation and ratio/type semantics.',
);

const sourceValues = [
  1.7, 2.4, 2.6, 2.6, 3.7, 4.9, 11.9, 19.4, 75.6, 6.5, 13, 20, 21, 27.6, 63,
  127, 4.7, 8.8, 16.5, 89, 1, 1, 1.4, 1.6, 2.4, 3, 3, 5.3, 6.7, 15, 15.2, 26.5,
  57,
];
assert.deepEqual(
  items.map((d) => d.value),
  sourceValues,
);

// User-visible sizing: near-square rectangles and usable small cells without inflated values.
for (const [vw, vh] of [
  [302, 640],
  [750, 785],
  [1402, 925],
]) {
  const { width, height } = mosaicSize(items, vw, vh, 1);
  const tiles = mosaic(items, 0, 0, width, height);
  assert.ok(
    tiles.every((t) => Math.max(t.w / t.h, t.h / t.w) < 3),
    'Avoid skinny tiles',
  );
  assert.ok(
    tiles.every((t) => Math.min(t.w, t.h) >= 40),
    'Small tiles stay usable',
  );
  const apple = tiles.find((t) => t.item.id === 'apple');
  const wealthy = tiles.find((t) => t.item.id === 'one-percent');
  assert.ok(
    Math.abs((wealthy.w * wealthy.h) / (apple.w * apple.h) - 127) < 1e-8,
  );
  assert.ok(apple.w * apple.h >= 48 * 48 - 1e-8);
  assert.deepEqual(mosaicSize(items, vw, vh, 0), { width: vw, height: vh });
}
console.log(
  'Passed: readable sizing, bounded aspect ratios, exact 127:1 area ratio, $1T minimum area and fit overview.',
);
