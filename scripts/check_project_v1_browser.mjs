/** Local browser regression for Week 6. Does not post or submit anything. */
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
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const shots = process.env.SCREENSHOT_DIR || 'docs/assets';
await mkdir(shots, { recursive: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:3016/';
const jump = (id) =>
  page.evaluate(
    (id) => document.getElementById(id).scrollIntoView({ behavior: 'instant' }),
    id,
  );
async function settings() {
  await page
    .getByRole('button', { name: 'Copy comparison link', exact: true })
    .click();
  const link = await page
    .getByLabel('Comparison link', { exact: false })
    .inputValue();
  return JSON.parse(new URL(link).searchParams.get('comparison')).settings;
}
try {
  await page.goto(`${base}#week-6`, { waitUntil: 'networkidle' });
  await page.locator('#week-6').waitFor();
  await jump('week-6');
  await page.screenshot({ path: `${shots}/week-06-project-v1.png` });
  const example = page.getByRole('button', { name: /Primary care · MA \/ NY/ });
  await example.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.id === 'geo-pair');
  assert.match(
    await page.locator('#geo-pair h3').innerText(),
    /Massachusetts vs. New York/,
  );
  await page
    .locator('#geo-pair')
    .screenshot({ path: `${shots}/week-06-comparison.png` });
  let current = await settings();
  assert.equal(current.stateA, 'MA');
  assert.equal(current.stateB, 'NY');
  assert.equal(current.group.length, 3);
  assert.equal(current.metric, 'costPerClaim');
  assert.equal(current.minimum, 50);
  await page
    .getByRole('button', { name: 'Start an evidence note', exact: true })
    .click();
  await page
    .getByLabel('What did you notice?', { exact: true })
    .fill(
      'Review test: compare the displayed primary-care values and investigate the difference without treating cost as a measure of care quality.',
    );
  await page
    .getByRole('button', { name: 'Save to notebook', exact: true })
    .click();
  assert.equal(await page.locator('.notebook-entry').count(), 1);
  await page
    .getByRole('button', { name: /Cancer specialties · CA \/ TX/ })
    .click();
  current = await settings();
  assert.equal(current.metric, 'claimsPerProvider');
  assert.equal(current.stateA, 'CA');
  assert.equal(current.group.length, 2);
  assert.match(
    await page.locator('.evidence-state').innerText(),
    /workspace has changed/,
  );
  assert.equal(await page.locator('.notebook-entry').count(), 1);
  await page
    .getByRole('button', { name: /Specialty ranks · FL \/ NY/ })
    .click();
  current = await settings();
  assert.equal(current.pairMode, 'ranks');
  assert.equal(current.metric, 'costPerClaim');
  assert.equal(current.stateA, 'FL');
  await page.locator('.notebook-entry > summary').click();
  await page
    .getByRole('button', { name: 'Reopen comparison', exact: true })
    .click();
  current = await settings();
  assert.equal(current.stateA, 'MA');
  assert.equal(current.pairMode, 'values');
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#week-6').waitFor();
  assert.equal(await page.locator('.notebook-entry').count(), 1);
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), stored);
  await page.locator('.course-index > summary').click();
  await page.getByRole('link', { name: /Week 06 Project V1/ }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'week-6');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await jump('week-6');
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Overflow at ${width}px`,
    );
    assert.equal(await page.locator('#week-6 button').count(), 3);
    if (width === 390)
      await page.screenshot({ path: `${shots}/week-06-mobile.png` });
  }
  assert.deepEqual(errors, []);
  console.log(
    'Week 6 passed: direct anchor, keyboard launch/focus, three examples, notebook preservation/restoration/reload, coursework link, 320/390/768/1440px layouts, and no browser errors.',
  );
} finally {
  await browser.close();
}
