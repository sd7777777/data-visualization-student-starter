/** Local browser regression for the Week 10 regional lens. Does not post or submit anything. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(
  modulePath.startsWith('/') ? pathToFileURL(modulePath).href : modulePath
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const shots = process.env.SCREENSHOT_DIR || 'docs/assets';
await mkdir(shots, { recursive: true });
// Dev server: http://127.0.0.1:3021/week-10 · static export: .../week-10.html
const url = process.env.PAGE_URL || 'http://127.0.0.1:3021/week-10';
const errors = [];

let previous = null;
async function open(width, height, query = '') {
  // One page at a time keeps the single local static server responsive.
  await previous?.close();
  const context = (previous = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  }));
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  // The browser's automatic /favicon.ico request is outside the project path.
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !m.location().url.endsWith('/favicon.ico') &&
      errors.push(`${m.text()} ${m.location().url}`),
  );
  await page.goto(`${url}${query}`, { waitUntil: 'networkidle' });
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  await page
    .locator('.rl-key')
    .first()
    .waitFor({ timeout: 15000 })
    .catch(async (error) => {
      const text = await page.locator('main').innerText().catch(() => '');
      throw new Error(`${query}: ${text.slice(0, 120)} | failed: ${failed.join(', ')} | errors: ${errors.join('; ')}`, { cause: error });
    });
  // Let ResizeObserver size the charts.
  await page.waitForTimeout(300);
  return page;
}
const dimmed = (page) =>
  page.$$eval('.rl-key', (keys) =>
    keys.map((k) => k.classList.contains('dim')),
  );
const order = ['Northeast', 'Midwest', 'South', 'West'];
const key = (page, name) => page.locator('.rl-key').nth(order.indexOf(name));

try {
  const page = await open(1440, 1100);
  assert.equal(await page.locator('.rl-key').count(), 4);
  assert.equal(await page.locator('.rl-tile').count(), 51);
  assert.equal(await page.locator('.rl-dot').count(), 51);
  assert.deepEqual(await dimmed(page), [false, false, false, false]);
  assert.match(await key(page, 'South').innerText(), /Highest in 15 of 28/);

  // Hover previews one region in every view, without pinning it.
  await key(page, 'South').hover();
  assert.deepEqual(await dimmed(page), [true, true, false, true]);
  assert.equal(await page.locator('.rl-dot:not(.dim)').count(), 17);
  assert.equal(await page.locator('.rl-tile:not(.dim)').count(), 17);
  assert.match(await page.locator('.rl-median-label').textContent(), /South median 88\.9%/);
  assert.match(await page.locator('.rl-readout').innerText(), /in the South: 17 states/);
  await page.mouse.move(5, 5);
  assert.deepEqual(await dimmed(page), [false, false, false, false]);
  assert.equal(await page.locator('.rl-median-label').count(), 0);

  // Click pins; a second region adds to the selection; URL follows.
  await key(page, 'South').click();
  await page.mouse.move(5, 5);
  assert.equal(await key(page, 'South').getAttribute('aria-pressed'), 'true');
  assert.match(page.url(), /regions=south/);
  await key(page, 'West').focus();
  await page.keyboard.press('Space');
  await page.mouse.move(5, 5);
  await page.locator('h1').click();
  assert.match(page.url(), /regions=south%2Cwest|regions=south,west/);
  assert.equal(await page.locator('.rl-median-label').count(), 2);
  assert.equal(await page.locator('.rl-dot:not(.dim)').count(), 30);

  // Specialty menu, stepper and the fingerprint rows all switch the specialty.
  await page.selectOption('.rl-stepper select', 'Psychiatry');
  assert.match(page.url(), /s=Psychiatry/);
  assert.match(await page.locator('.rl-scatter h2').innerText(), /^Psychiatry/);
  await page.getByRole('button', { name: 'Next specialty' }).click();
  assert.equal(await page.inputValue('.rl-stepper select'), 'Ophthalmology');
  await page.locator('.rl-print-row', { hasText: 'Psychiatry' }).click();
  assert.equal(await page.inputValue('.rl-stepper select'), 'Psychiatry');

  // Linked hover: a tile focuses its dot and opens the tooltip in the scatter.
  await page.locator('.rl-tile', { hasText: 'TX' }).hover();
  assert.match(await page.locator('.rl-tip').innerText(), /Texas[\s\S]*South · \d+(st|nd|rd|th) of 17/);
  assert.equal(await page.locator('.rl-dot.focus').count(), 1);
  assert.equal(await page.locator('.rl-label.focus').textContent(), 'TX');
  // Selecting a tile pins it, so the tooltip stays for the screenshots.
  await page.locator('.rl-tile', { hasText: 'TX' }).click();
  await page.mouse.move(5, 5);
  assert.match(page.url(), /state=TX/);
  assert.match(await page.locator('.rl-tip').innerText(), /Texas/);
  await page.locator('.rl-legend').screenshot({ path: `${shots}/week-10-legend.png` });
  const top = await page.locator('.rl-legend').boundingBox();
  const grid = await page.locator('.rl-grid').boundingBox();
  await page.screenshot({
    path: `${shots}/week-10-overview.png`,
    fullPage: true,
    clip: {
      x: top.x - 6,
      y: top.y - 6,
      width: grid.x + grid.width - top.x + 12,
      height: grid.y + grid.height - top.y + 12,
    },
  });
  await page.locator('.rl-prints').screenshot({ path: `${shots}/week-10-specialties.png` });

  // Escape clears every pin.
  await page.keyboard.press('Escape');
  await page.mouse.move(5, 5);
  assert.deepEqual(await dimmed(page), [false, false, false, false]);
  assert.doesNotMatch(page.url(), /regions=|state=/);

  // Shared links restore the view.
  const shared = await open(1280, 900, '?s=Dermatology&regions=northeast&state=MA');
  assert.equal(await shared.inputValue('.rl-stepper select'), 'Dermatology');
  assert.equal(await key(shared, 'Northeast').getAttribute('aria-pressed'), 'true');
  assert.match(await shared.locator('.rl-tip').innerText(), /Massachusetts/);
  const bogus = await open(1280, 900, '?s=Nope&regions=mars');
  assert.equal(await bogus.inputValue('.rl-stepper select'), 'All specialties');
  assert.deepEqual(await dimmed(bogus), [false, false, false, false]);

  // Layouts: no horizontal page overflow; charts fit their cards.
  for (const width of [320, 390, 768, 1440]) {
    const p = await open(width, 900, '?s=Psychiatry&regions=south');
    const fit = await p.evaluate(() => {
      const fits = (sel) => {
        const svg = document.querySelector(`${sel} svg`);
        return svg.getBoundingClientRect().width <= svg.parentElement.clientWidth + 1;
      };
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        scatter: fits('.rl-plot'),
        prints: fits('.rl-print-plot'),
      };
    });
    assert.ok(fit.overflow <= 0, `${width}px overflow ${fit.overflow}`);
    assert.ok(fit.scatter && fit.prints, `${width}px charts fit`);
    if (width === 390) {
      await p.locator('.rl-legend').scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${shots}/week-10-mobile.png`, fullPage: false });
    }
  }
  assert.deepEqual(errors, []);
  console.log('Week 10 browser checks passed: legend hover/pin/keyboard, linked tiles and tooltip, specialty controls, shared links, Escape, 320/390/768/1440px layouts.');
} finally {
  await browser.close();
}
