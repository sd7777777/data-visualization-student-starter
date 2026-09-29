/** Run with Playwright installed; PLAYWRIGHT_MODULE and CHROME_PATH support external runtimes. */
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
const base = process.env.BASE_URL || 'http://localhost:3014/';
const shots = process.env.SCREENSHOT_DIR;
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
async function screenshot(name) {
  if (!shots) return;
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}
async function navigate(id) {
  await page.evaluate((id) => {
    document
      .getElementById(id)
      .scrollIntoView({ behavior: 'instant', block: 'start' });
  }, id);
}
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.opening-pulse').waitFor();
  assert.equal(
    await page.locator('.optional-overview').getAttribute('open'),
    null,
  );
  const firstChartTop = await page
    .locator('#explorer-chart')
    .evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(
    firstChartTop < 800,
    `First chart controls are too far down: ${firstChartTop}`,
  );
  await screenshot('desktop');
  assert.equal(
    await page
      .locator('#explorer-chart')
      .getByLabel('Geography', { exact: true })
      .inputValue(),
    'US',
  );
  assert.equal(
    await page
      .locator('#explorer-chart')
      .getByLabel('Geography', { exact: true })
      .locator('option:checked')
      .innerText(),
    'United States',
  );
  const log = page.getByRole('tab', { name: 'Log', exact: true });
  assert.equal(await log.getAttribute('aria-selected'), 'true');
  assert.equal(
    await log.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgb(23, 101, 88)',
  );
  await page.getByRole('tab', { name: 'Linear', exact: true }).click();
  assert.equal(
    await page
      .getByRole('tab', { name: 'Linear', exact: true })
      .getAttribute('aria-selected'),
    'true',
  );
  await log.click();
  await page.getByRole('tab', { name: '2×', exact: true }).click();
  await page.selectOption('#opening-geography', 'NY');
  assert.equal(
    await page
      .getByRole('tab', { name: '1×', exact: true })
      .getAttribute('aria-selected'),
    'true',
  );
  assert.equal(
    await page
      .locator('#explorer-chart')
      .getByLabel('Geography', { exact: true })
      .inputValue(),
    'NY',
  );
  await page
    .getByRole('button', { name: 'Open New York map', exact: true })
    .click();
  assert.equal(
    await page.getByLabel('Map state', { exact: true }).inputValue(),
    'New York',
  );
  await navigate('wonder-lab');
  await screenshot('maps');
  const options = await page
    .locator('#chart-view option')
    .evaluateAll((items) => items.map((item) => item.value));
  assert.equal(options.length, 10);
  for (const mode of options) {
    await page.selectOption('#chart-view', mode);
    assert.ok(
      (await page.locator('#wonder-stage svg:not(.fa-icon)').count()) > 0,
      `Missing chart: ${mode}`,
    );
  }
  await page.selectOption('#chart-view', 'map');
  await page.selectOption('#opening-geography', 'US');
  await page.locator('.name-selection > summary').click();
  await page
    .locator('.name-selection')
    .getByRole('checkbox', { name: 'Cardiology', exact: true })
    .check();
  await page
    .locator('.name-selection')
    .getByRole('checkbox', { name: 'Internal Medicine', exact: true })
    .check();
  await page
    .getByRole('button', {
      name: 'Compare this group across states',
      exact: false,
    })
    .focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('.carried-group').innerText(), /2 of 2/);
  await page.locator('.carried-group').getByRole('button').click();
  await page.locator('.carried-group').waitFor({ state: 'detached' });
  // An unavailable specialty must not silently reappear when returning to a geography.
  const dataset = await page.evaluate(async () =>
    (await fetch('./data/prescriber-summary/summary.json')).json(),
  );
  const us = dataset.areas.find((row) => row.code === 'US');
  const small = dataset.areas.find(
    (row) =>
      row.specialties.length &&
      us.specialties.some(
        (s) => !row.specialties.some((t) => t.specialty === s.specialty),
      ),
  );
  const unavailable = us.specialties.find(
    (s) => !small.specialties.some((t) => t.specialty === s.specialty),
  ).specialty;
  await page.selectOption('#opening-geography', 'US');
  await page.selectOption('#chart-view', 'mosaic');
  await page
    .getByLabel('Chart specialty', { exact: true })
    .selectOption(unavailable);
  await page.selectOption('#opening-geography', small.code);
  assert.notEqual(
    await page.locator('.inspection h2').innerText(),
    unavailable,
  );
  await page.selectOption('#opening-geography', 'US');
  assert.notEqual(
    await page.locator('.inspection h2').innerText(),
    unavailable,
  );
  await page.selectOption('#opening-geography', 'PR');
  await page
    .getByRole('button', { name: 'Open Puerto Rico chart', exact: true })
    .click();
  assert.equal(
    await page
      .locator('#explorer-chart')
      .getByLabel('Geography', { exact: true })
      .inputValue(),
    'PR',
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    'explorer-chart',
  );
  // Search can reveal the optional story and transfer keyboard focus into it.
  await page.locator('.header-search').click();
  const search = page.getByRole('dialog').getByRole('combobox');
  await search.fill('guided overview');
  await page.getByRole('option', { name: /Guided overview/ }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('.optional-overview').open &&
      document.activeElement.id === 'scroll-story',
  );
  await page.locator('.optional-overview > summary').click();
  await page.locator('.header-resources summary').click();
  await page.keyboard.press('Escape');
  assert.equal(
    await page.locator('.header-resources').getAttribute('open'),
    null,
  );
  await page.locator('.header-resources summary').click();
  await page.locator('.opening-copy h1').click();
  assert.equal(
    await page.locator('.header-resources').getAttribute('open'),
    null,
  );
  await page.locator('.header-resources summary').click();
  await page.locator('.header-resources a[href="#scroll-story"]').click();
  assert.equal(
    await page.locator('.optional-overview').getAttribute('open'),
    '',
  );
  assert.equal(
    await page.locator('.header-resources').getAttribute('open'),
    null,
  );
  await page.locator('.optional-overview > summary').click();
  await page.locator('.header-resources summary').click();
  await page.locator('.header-resources a[href="#scroll-story"]').click(); // Repeated same-hash links also expand.
  assert.equal(
    await page.locator('.optional-overview').getAttribute('open'),
    '',
  );
  await page.goto(`${base}#week-4`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelector('.course-index')?.open,
  );
  assert.equal(await page.evaluate(() => document.activeElement.id), 'week-4');
  await page.goto(`${base}#scroll-story`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelector('.optional-overview')?.open,
  );
  await page.locator('.optional-overview > summary').click();
  await page.selectOption('#opening-geography', 'US');
  await navigate('place');
  await page.waitForFunction(
    () =>
      document
        .querySelector('.reading-nav [aria-current]')
        ?.getAttribute('href') === '#place',
  );
  await screenshot('comparison');
  await page
    .getByRole('button', { name: 'Start an evidence note', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Save to notebook', exact: true })
    .click();
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .locator('.notebook-count')
    .filter({ hasText: '1 saved' })
    .waitFor();
  await page.selectOption('#chart-view', 'map');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download map data/ }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), 'utf8');
  assert.ok(csv.includes('California') && csv.includes('New York'));
  await page.locator('.header-search').click();
  await page.getByRole('dialog').getByRole('combobox').fill('Califronia');
  await page.getByRole('option', { name: /California/ }).waitFor();
  await page.keyboard.press('Escape');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Page overflows at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await screenshot('mobile');
  await navigate('records');
  const table = page.getByRole('table', {
    name: 'Highest cost provider records',
  });
  assert.equal(await table.getByRole('columnheader').count(), 4);
  assert.equal(await table.getByRole('cell').count(), 30);
  assert.equal(
    await table
      .getByRole('columnheader', { name: 'Claims', exact: true })
      .evaluate((el) => getComputedStyle(el).display),
    'table-cell',
  );
  await page.locator('.provider-table').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(
    () => document.querySelector('.provider-table').scrollLeft > 0,
  );
  await screenshot('mobile-records');
  assert.equal(
    await page
      .locator('.field-opening')
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    `PASS: controls at ${Math.round(firstChartTop)}px; 10 chart modes; geography/zoom resets; map and territory handoffs; fuzzy search; hidden-section deep links; menu dismissal; notebook persistence; CSV; 4 viewport widths; mobile table keyboard scrolling; no browser errors.`,
  );
} finally {
  await browser.close();
}
