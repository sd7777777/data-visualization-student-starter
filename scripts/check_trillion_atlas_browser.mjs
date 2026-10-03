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
  assert.equal(await page.locator('.ta-tile').count(), 20);
  assert.ok(
    (await page.locator('.ta-toolbar').boundingBox()).y < 300,
    'Chart controls should appear without a long introduction',
  );
  await page.screenshot({
    path: `${shots}/week-07-desktop.png`,
    fullPage: true,
  });
  await page.locator('#atlas').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/week-07-atlas.png` });
  await page
    .getByRole('button', { name: 'Annual activity', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.ta-tile').count(), 9);
  await page
    .getByRole('button', {
      name: 'US GDP, $19.4T, Annual activity',
      exact: true,
    })
    .click();
  assert.match(await page.locator('.ta-inspector h3').innerText(), /^US GDP$/);
  await page
    .getByRole('button', { name: 'Compare this amount', exact: false })
    .click();
  assert.equal(await page.locator('#compare-a').inputValue(), 'us-gdp');
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    'compare-a',
  );
  await page.locator('#compare-a').selectOption('one-percent');
  await page.locator('#compare-b').selectOption('paris');
  assert.match(
    await page.locator('.ta-caution').innerText(),
    /Different kinds/,
  );
  assert.match(await page.locator('.ta-ratio>b').innerText(), /7.7/);
  await page.getByRole('button', { name: /Swap amounts/ }).click();
  assert.equal(await page.locator('#compare-a').inputValue(), 'paris');
  await page.locator('#compare-b').selectOption('paris');
  assert.match(await page.locator('.ta-caution').innerText(), /Same amount/);
  const dlPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download data', exact: false })
    .click();
  const dl = await dlPromise;
  await dl.saveAs(`${shots}/verified-download.csv`);
  const csv = await readFile(`${shots}/verified-download.csv`, 'utf8');
  assert.equal(csv.split('\r\n').length, 10);
  assert.match(csv, /2018-08-16/);
  assert.match(csv, /trillions-2x1276/);
  await page.getByRole('button', { name: 'Everything', exact: false }).click();
  await page.getByRole('button', { name: 'Ranked bars', exact: false }).click();
  assert.equal(await page.locator('.ta-rank-row').count(), 20);
  assert.match(await page.locator('.ta-rank-row').first().innerText(), /127T/);
  await page.getByRole('button', { name: 'Mosaic', exact: false }).click();
  await page.goto(base, { waitUntil: 'networkidle' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Page overflow at ${width}`,
    );
    await page.locator('#atlas').scrollIntoViewIfNeeded();
    if (width === 390)
      await page.screenshot({
        path: `${shots}/week-07-mobile.png`,
        fullPage: true,
      });
  }
  await page.goto(`${base}?a=world&b=us-gdp#compare`, {
    waitUntil: 'networkidle',
  });
  assert.equal(await page.locator('#compare-a').inputValue(), 'world');
  assert.equal(await page.locator('#compare-b').inputValue(), 'us-gdp');
  await page.goto(`${base}?a=invalid&b=invalid`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#compare-a').inputValue(), 'us-gdp');
  assert.deepEqual(errors, []);
  console.log(
    'Passed: filters, keyboard, details, comparison focus, ratios, swap, same-value warning, real CSV export, ranking, 320/390/768/1440px, valid/invalid links, no page errors.',
  );
} finally {
  await browser.close();
}
