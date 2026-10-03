import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
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
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: 'reduce',
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const base = process.env.BASE_URL || 'http://localhost:3017/week-7';
const shots = process.env.SCREENSHOT_DIR || '../review/week-07';
await mkdir(shots, { recursive: true });
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.ta-tile').first().waitFor();
  assert.equal(await page.locator('.ta-tile').count(), 33);
  const chart = await page.locator('.ta-viewport').boundingBox();
  assert.ok(
    chart.y < 180 && chart.width > 1380,
    'Mosaic must dominate the first screen',
  );
  assert.equal(await page.locator('#compare').evaluate((e) => e.open), false);
  assert.equal(await page.locator('#sources').evaluate((e) => e.open), false);
  await page.screenshot({ path: `${shots}/week-07-atlas.png` });
  await page.screenshot({
    path: `${shots}/week-07-desktop.png`,
    fullPage: true,
  });
  const plain = await page.locator('#tile-world').boundingBox();
  await page.getByLabel('Group by type', { exact: true }).check();
  const grouped = await page.locator('#tile-world').boundingBox();
  assert.ok(
    Math.abs(plain.width * plain.height - grouped.width * grouped.height) < 5,
    'Grouping changed area',
  );
  await page.getByLabel('$1T grid', { exact: true }).uncheck();
  assert.equal(
    await page
      .locator('#tile-world')
      .evaluate((e) => getComputedStyle(e).backgroundImage),
    'none',
  );
  await page.getByLabel('$1T grid', { exact: true }).check();
  await page.getByLabel('Find an amount').fill('foreign exchange');
  assert.equal(await page.locator('.ta-tile:not(.ta-dim)').count(), 1);
  await page.locator('#tile-fx').click();
  assert.match(
    await page.locator('.ta-selection').innerText(),
    /Daily activity/,
  );
  await page.getByLabel('Find an amount').fill('');
  const small = await page.locator('#tile-fx').boundingBox();
  await page.getByLabel('Mosaic zoom').selectOption('2');
  await page.waitForFunction(
    () => document.querySelector('.ta-mosaic').clientWidth > 2000,
  );
  const big = await page.locator('#tile-fx').boundingBox();
  assert.ok(Math.abs(big.width / small.width - 2) < 0.01);
  assert.ok(
    await page
      .locator('.ta-viewport')
      .evaluate(
        (e) => e.scrollWidth > e.clientWidth && e.scrollHeight > e.clientHeight,
      ),
  );
  await page.screenshot({ path: `${shots}/week-07-zoom.png` });
  await page.getByLabel('Mosaic zoom').selectOption('1');
  await page.getByRole('button', { name: 'Activity', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.ta-tile').count(), 13);
  await page.locator('#tile-us-gdp').click();
  assert.match(
    await page.locator('.ta-selection strong').innerText(),
    /^US GDP$/,
  );
  await page
    .getByRole('button', { name: 'Compare selected', exact: true })
    .click();
  assert.equal(await page.locator('#compare').evaluate((e) => e.open), true);
  assert.equal(await page.locator('#compare-a').inputValue(), 'us-gdp');
  await page.locator('#compare-a').selectOption('one-percent');
  await page.locator('#compare-b').selectOption('paris');
  assert.match(
    await page.locator('.ta-caution').innerText(),
    /Different kinds/,
  );
  assert.match(await page.locator('.ta-ratio>b').innerText(), /7.7/);
  await page.getByRole('button', { name: 'Swap amounts', exact: true }).click();
  assert.equal(await page.locator('#compare-a').inputValue(), 'paris');
  await page.locator('#compare-b').selectOption('paris');
  assert.match(await page.locator('.ta-caution').innerText(), /Same amount/);
  const dlPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV ↓', exact: true }).click();
  const dl = await dlPromise;
  await dl.saveAs(`${shots}/verified-download.csv`);
  const csv = await readFile(`${shots}/verified-download.csv`, 'utf8');
  assert.equal(csv.split('\r\n').length, 14);
  assert.match(csv, /2018-08-16/);
  await page.goto(base, { waitUntil: 'networkidle' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForFunction(
      () =>
        Math.abs(
          document.querySelector('.ta-mosaic').clientWidth -
            document.querySelector('.ta-viewport').clientWidth,
        ) < 2,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Page overflow ${width}`,
    );
    if (width === 390)
      await page.screenshot({
        path: `${shots}/week-07-mobile.png`,
        fullPage: true,
      });
  }
  await page.goto(`${base}?a=world&b=us-gdp#compare`, {
    waitUntil: 'networkidle',
  });
  assert.equal(await page.locator('#compare').evaluate((e) => e.open), true);
  assert.equal(await page.locator('#compare-a').inputValue(), 'world');
  assert.equal(await page.locator('#compare-b').inputValue(), 'us-gdp');
  await page.goto(`${base}?a=invalid&b=invalid`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#compare-a').inputValue(), 'us-gdp');
  assert.deepEqual(errors, []);
  console.log(
    'Passed: 33-value mosaic, chart prominence, group area invariance, grid, search, zoom and scroll, keyboard filtering, selection, comparisons, CSV, collapsed extras, responsive layouts, shared URLs, no page errors.',
  );
} finally {
  await browser.close();
}
