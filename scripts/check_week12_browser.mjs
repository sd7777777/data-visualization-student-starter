/** Local browser regression for the Week 12 cost-per-claim page. Does not post or submit anything. */
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
// Dev server: http://127.0.0.1:3021/week-12 · static export: .../week-12.html
const url = process.env.PAGE_URL || 'http://127.0.0.1:3021/week-12';
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
// Rows keep DOM order and sort with transforms, so read them in on-screen order.
const ordered = (page) =>
  page.$$eval('.cr12-row', (rows) =>
    rows
      .map((row) => ({
        y: new DOMMatrix(getComputedStyle(row).transform).m42,
        label: row.querySelector('.cr12-label').textContent,
        ratio: row.querySelector('.cr12-ratio').textContent,
      }))
      .sort((a, b) => a.y - b.y),
  );
const urlHas = async (page, pattern) => {
  await page.waitForFunction((source) => new RegExp(source).test(location.href), pattern.source, { timeout: 2000 }).catch(() => {});
  assert.match(page.url(), pattern);
};

let page = await open(1440, 1100);
await page.screenshot({ path: `${shots}/week-12-overview.png`, fullPage: false });
assert.match(await page.locator('h1').innerText(), /about 42 times/);
let rows = await ordered(page);
assert.equal(rows.length, 30, 'thirty national specialties');
assert.equal(rows[0].label, 'Rheumatology');
assert.equal(rows[0].ratio, '181×');
assert.ok(rows.some((row) => row.label === 'Emergency Medicine †'), 'low coverage is flagged');
assert.equal(await page.locator('.cr12-card h2').innerText(), 'Rheumatology');

// Sorting changes the order and the address bar.
await page.getByRole('button', { name: 'Brand cost', exact: true }).click();
await urlHas(page, /sort=brand/);
rows = await ordered(page);
assert.equal(rows[0].label, 'Hematology');

// Geography.
await page.locator('.cr12-controls select').selectOption('CA');
await urlHas(page, /geo=CA/);
assert.match(await page.locator('.cr12-intro').innerText(), /California’s Part D prescribers/);
await page.locator('.cr12-controls select').selectOption('US');
await page.getByRole('button', { name: 'Multiple', exact: true }).click();

// Hover dims others and shows values; click pins; Esc clears.
const rheum = page.locator('.cr12-row', { hasText: 'Dermatology' }).first();
await rheum.hover();
await page.waitForTimeout(120);
assert.equal(await page.locator('.cr12-card h2').innerText(), 'Dermatology');
assert.equal(await page.locator('.cr12-card .cr12-eyebrow').innerText(), 'HOVERING');
assert.equal(await page.locator('.cr12-row.active .cr12-value').count(), 2);
assert.ok((await page.locator('.cr12-row.dim').count()) === 29);
await rheum.click();
await page.mouse.move(2, 2);
await page.waitForTimeout(120);
assert.equal(await page.locator('.cr12-card .cr12-eyebrow').innerText(), 'PINNED');
assert.equal(await rheum.getAttribute('aria-pressed'), 'true');
await urlHas(page, /s=Dermatology/);
await page.screenshot({ path: `${shots}/week-12-pinned.png`, fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(120);
assert.equal(await rheum.getAttribute('aria-pressed'), 'false');

// Keyboard.
const first = page.locator('.cr12-row').first();
await first.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(120);
assert.equal(await first.getAttribute('aria-pressed'), 'true');
await page.keyboard.press('Escape');

// Table alternative.
await page.locator('.cr12-table summary').click();
assert.equal(await page.locator('.cr12-table tbody tr').count(), 30);

// Shared link restores the view.
page = await open(1280, 900, '?geo=CA&sort=generic&s=Psychiatry');
assert.equal(await page.locator('.cr12-controls select').inputValue(), 'CA');
assert.equal(await page.getByRole('button', { name: 'Generic cost', exact: true }).getAttribute('aria-pressed'), 'true');
assert.equal(await page.locator('.cr12-card h2').innerText(), 'Psychiatry');

// Layout: nothing clipped, no sideways page scroll, every label inside the chart.
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
]) {
  page = await open(width, height);
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    clipped: [...document.querySelectorAll('.cr12-label,.cr12-ratio')].filter((text) => {
      const svg = text.ownerSVGElement.getBoundingClientRect();
      const box = text.getBoundingClientRect();
      return box.left < svg.left - 0.5 || box.right > svg.right + 0.5;
    }).length,
  }));
  assert.ok(layout.overflow <= 0, `no horizontal page scroll at ${width}px (${layout.overflow})`);
  assert.equal(layout.clipped, 0, `no clipped row text at ${width}px`);
  if (width === 390) await page.screenshot({ path: `${shots}/week-12-mobile.png`, fullPage: true });
}

assert.deepEqual(errors, [], 'no page or console errors');
await previous?.close();
await browser.close();
console.log('Week 12 browser regression passed at five widths.');
