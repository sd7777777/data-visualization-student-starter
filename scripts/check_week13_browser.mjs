/** Local browser regression for the Week 13 state-vs-nation page. Does not post or submit anything. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(
  modulePath.startsWith('/') ? pathToFileURL(modulePath).href : modulePath
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const shots = process.env.SCREENSHOT_DIR || 'docs/assets';
await mkdir(shots, { recursive: true });
// Dev server: http://127.0.0.1:3021/week-13 · static export: .../week-13.html
const url = process.env.PAGE_URL || 'http://127.0.0.1:3021/week-13';
const errors = [];

let previous = null;
async function open(width, height, query = '') {
  await previous?.close();
  const context = (previous = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  }));
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !m.location().url.endsWith('/favicon.ico') &&
      errors.push(`${m.text()} ${m.location().url}`),
  );
  await page.goto(`${url}${query}`, { waitUntil: 'networkidle' });
  await page.locator('.cr12-row').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);
  return page;
}
const urlHas = async (page, pattern) => {
  await page.waitForFunction((source) => new RegExp(source).test(location.href), pattern.source, { timeout: 2000 }).catch(() => {});
  assert.match(page.url(), pattern);
};
const title = (page) => page.locator('h1').innerText();
const select = (page) => page.locator('.cr12-controls select');

// National view: no rings, one multiple column with a header, guide present.
let page = await open(1440, 1000);
assert.match(await title(page), /^A brand-name claim costs about 42 times/);
assert.equal(await page.locator('.cr12-row').count(), 30);
assert.equal(await page.locator('.cr13-ghost').count(), 0, 'no U.S. rings in the U.S. view');
assert.equal(await page.locator('.cr13-colhead').first().textContent(), 'Brand ÷');
assert.equal(await page.locator('.cr13-guide li').count(), 3);
assert.equal(await page.locator('.cr13-tile').count(), 51, 'every state and DC has a tile');
assert.match(await page.locator('#cr13-map-title').innerText(), /^Rheumatology in every state/);
await page.screenshot({ path: `${shots}/week-13-overview.png` });

// The title follows the place (the Week 12 bug found in the user test).
await select(page).selectOption('TX');
await urlHas(page, /geo=TX/);
assert.match(await title(page), /^In Texas, a brand-name claim costs about \d+ times/);
assert.equal(await page.locator('.cr13-ghost').count(), await page.locator('.cr12-row').count(), 'one ring pair per row');
assert.equal(await page.locator('.cr13-us').count(), await page.locator('.cr12-row').count(), 'U.S. column');
assert.ok(await page.locator('.cr13-tile.selected').count() === 1);
assert.match(await page.locator('.cr13-verdict').innerText(), /(higher|lower) than|about the same as/);

// Back to United States.
await page.getByRole('button', { name: 'Back to United States' }).click();
await urlHas(page, /week-13(\.html)?$/);
assert.match(await title(page), /^A brand-name claim/);

// Pinning a specialty drives the map; clicking a tile changes place and keeps the pin.
const psych = page.locator('.cr12-row', { hasText: 'Psychiatry' }).first();
await psych.click();
await page.mouse.move(2, 2);
await page.waitForTimeout(120);
assert.match(await page.locator('#cr13-map-title').innerText(), /^Psychiatry in every state/);
await page.locator('.cr13-tile', { hasText: 'MA' }).hover();
assert.match(await page.locator('.cr13-map-caption').innerText(), /^Massachusetts ranks \d+ of \d+/);
await page.locator('.cr13-tile', { hasText: 'MA' }).click();
await urlHas(page, /geo=MA/);
await urlHas(page, /s=Psychiatry/);
assert.equal(await select(page).inputValue(), 'MA');
await page.mouse.move(2, 2);
await page.waitForTimeout(150);
assert.equal(await page.locator('.cr13-card h2').innerText(), 'Psychiatry');
assert.match(await page.locator('.cr13-card .cr12-eyebrow').innerText(), /PINNED · MASSACHUSETTS/);
await page.screenshot({ path: `${shots}/week-13-state.png` });
await page.locator('.cr13-map').screenshot({ path: `${shots}/week-13-map.png` });
// Clicking the selected tile again returns to the nation.
await page.locator('.cr13-tile.selected').click();
await urlHas(page, /^(?!.*geo=)/);
assert.equal(await select(page).inputValue(), 'US');

// Keyboard on tiles and rows.
await page.locator('.cr13-tile', { hasText: 'CA' }).focus();
await page.keyboard.press('Enter');
await urlHas(page, /geo=CA/);
await page.keyboard.press('Escape');
await page.waitForTimeout(120);
assert.equal(await page.locator('.cr12-row[aria-pressed="true"]').count(), 0, 'Esc clears the pin');

// A scroll clears a stale hover so the pinned row returns to the card.
page = await open(1280, 800, '?s=Neurology');
await page.locator('.cr12-row', { hasText: 'Dermatology' }).first().hover();
assert.equal(await page.locator('.cr13-card h2').innerText(), 'Dermatology');
await page.evaluate(() => window.scrollBy(0, 200));
await page.waitForTimeout(150);
assert.equal(await page.locator('.cr13-card h2').innerText(), 'Neurology');

// Table gets a U.S. column for a state.
page = await open(1280, 900, '?geo=NY&sort=brand&s=Dermatology');
await page.locator('.cr12-table summary').click();
assert.ok((await page.locator('.cr12-table thead th').allInnerTexts()).includes('U.S. multiple'));
assert.equal(await page.getByRole('button', { name: 'Brand cost', exact: true }).getAttribute('aria-pressed'), 'true');

// Layout: nothing clipped, no sideways page scroll.
for (const [width, height, query] of [
  [320, 640, '?geo=MA'],
  [390, 844, '?geo=MA&s=Psychiatry'],
  [768, 1024, '?geo=MA'],
  [1024, 768, '?geo=MA'],
  [1440, 900, '?geo=MA'],
  [1440, 900, ''],
]) {
  page = await open(width, height, query);
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    clipped: [...document.querySelectorAll('.cr12-label,.cr12-ratio,.cr13-us,.cr13-colhead')].filter((text) => {
      const svg = text.ownerSVGElement.getBoundingClientRect();
      const box = text.getBoundingClientRect();
      return box.left < svg.left - 0.5 || box.right > svg.right + 0.5;
    }).length,
    mapOverflow: (() => {
      const map = document.querySelector('.cr13-map');
      const svg = map.querySelector('svg').getBoundingClientRect();
      const box = map.getBoundingClientRect();
      return svg.right - box.right;
    })(),
    // The state and U.S. multiple columns must not overlap.
    overlap: [...document.querySelectorAll('.cr12-row')].filter((row) => {
      const own = row.querySelector('.cr12-ratio')?.getBoundingClientRect();
      const us = row.querySelector('.cr13-us')?.getBoundingClientRect();
      return own && us && own.right > us.left - 4;
    }).length,
  }));
  assert.ok(layout.overflow <= 0, `no horizontal page scroll at ${width}px (${layout.overflow})`);
  assert.equal(layout.clipped, 0, `no clipped row text at ${width}px`);
  assert.ok(layout.mapOverflow <= 0, `map fits its panel at ${width}px`);
  assert.equal(layout.overlap, 0, `multiple columns do not overlap at ${width}px`);
  if (width === 390) await page.screenshot({ path: `${shots}/week-13-mobile.png`, fullPage: true });
}

assert.deepEqual(errors, [], 'no page or console errors');
await previous?.close();
await browser.close();
console.log('Week 13 browser regression passed at six layouts.');
