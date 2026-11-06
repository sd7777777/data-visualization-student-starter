/** Local browser regression for the Week 11 regional lens. Does not post or submit anything. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
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
// Dev server: http://127.0.0.1:3021/week-11 · static export: .../week-11.html
const url = process.env.PAGE_URL || 'http://127.0.0.1:3021/week-11';
const errors = [];

let previous = null;
async function open(width, height, query = '', options = {}) {
  await previous?.close();
  const context = (previous = await browser.newContext({
    viewport: { width, height },
    reducedMotion: options.motion ? 'no-preference' : 'reduce',
    deviceScaleFactor: 2,
    acceptDownloads: true,
    hasTouch: Boolean(options.touch),
    permissions: ['clipboard-read', 'clipboard-write'],
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
  await page.locator('.rl11-key').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  return page;
}
const urlHas = async (page, pattern, message) => {
  await page.waitForFunction((source) => new RegExp(source).test(location.href), pattern.source, { timeout: 2000 }).catch(() => {});
  assert.match(page.url(), pattern, message);
};
const urlLacks = async (page, pattern, message) => {
  await page.waitForFunction((source) => !new RegExp(source).test(location.href), pattern.source, { timeout: 2000 }).catch(() => {});
  assert.doesNotMatch(page.url(), pattern, message);
};
const order = ['Northeast', 'Midwest', 'South', 'West'];
const key = (page, name) => page.locator('.rl11-key').nth(order.indexOf(name));
const dimmed = (page) =>
  page.$$eval('.rl11-key', (keys) => keys.map((k) => k.classList.contains('dim')));
const lightness = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const toHex = (rgb) =>
  `#${rgb.match(/\d+/g).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
const dotAt = (page, code) =>
  page.evaluate((c) => {
    const dot = document.querySelector(`.rl11-dot[data-code="${c}"]`);
    const svg = document.querySelector('.rl11-plot > svg').getBoundingClientRect();
    const box = dot.getBoundingClientRect();
    const path = dot.querySelector('path').getBoundingClientRect();
    return {
      x: path.x + path.width / 2,
      y: path.y + path.height / 2,
      within: box.x >= svg.x - 30 && box.right <= svg.right + 30,
    };
  }, code);

try {
  // ── First view: defaults to a specialty with a visible regional split ──
  const page = await open(1440, 1000);
  assert.equal(await page.inputValue('.rl11-stepper select'), 'Psychiatry');
  assert.equal(await page.locator('.rl11-key').count(), 4);
  assert.equal(await page.locator('.rl11-tile').count(), 51);
  assert.equal(await page.locator('.rl11-dot').count(), 50);
  assert.equal(await page.locator('.rl11-tile.empty').count(), 1);
  assert.match(await page.locator('.rl11-main h2').innerText(), /South has the highest median share of drug cost \(82\.7%\), the West the lowest \(78\.1%\)/);
  assert.match(await page.locator('.rl11-intro').innerText(), /cost in 15 of 28 specialties, but the highest share of claims in only 8/);
  assert.match(await page.locator('.rl11-every-head').innerText(), /South in 15 of 28/);

  // Instructor feedback: hue is the region and lightness the value, on one scale.
  const tile = async (code) => {
    const el = page.locator('.rl11-tile', { has: page.locator(`b:text-is("${code}")`) });
    return toHex(await el.evaluate((node) => getComputedStyle(node).backgroundColor));
  };
  // Texas 82.7% and Hawaii 85.4% are both higher than Maryland 74.4% and Idaho 72.9%: darker in each region.
  assert.ok(lightness(await tile('MD')) > lightness(await tile('TX')), 'South: lower value is lighter');
  assert.ok(lightness(await tile('ID')) > lightness(await tile('HI')), 'West: lower value is lighter');
  assert.notEqual(await tile('TX'), await tile('NY'), 'regions differ in hue');
  // The legend cells count every plotted state exactly once.
  const counted = await page.$$eval('.rl11-cell', (cells) =>
    cells.reduce((sum, c) => sum + Number(c.textContent || 0), 0),
  );
  assert.equal(counted, 50);
  await page.waitForTimeout(100);

  // Legend hover previews one region in every view, without pinning it.
  await key(page, 'South').hover();
  assert.deepEqual(await dimmed(page), [true, true, false, true]);
  assert.equal(await page.locator('.rl11-dot:not(.dim)').count(), 17);
  assert.equal(await page.locator('.rl11-tile:not(.dim)').count(), 17);
  assert.match(await page.locator('.rl11-main h2').innerText(), /Psychiatry in the South: median 82\.7%/);
  await page.mouse.move(5, 5);
  assert.deepEqual(await dimmed(page), [false, false, false, false]);

  // A value step in the legend picks out just those states.
  const cell = page.locator('.rl11-matrix-row', { hasText: 'South' }).locator('.rl11-cell').last();
  const inStep = Number(await cell.textContent());
  await cell.hover();
  assert.equal(await page.locator('.rl11-dot:not(.dim)').count(), inStep);
  assert.equal(await page.locator('.rl11-tile:not(.dim)').count(), inStep);
  await page.mouse.move(5, 5);
  assert.equal(await page.locator('.rl11-dot.dim').count(), 0);

  // Regions pin with mouse and keyboard, and the URL follows.
  await key(page, 'South').click();
  await page.mouse.move(5, 5);
  assert.equal(await key(page, 'South').getAttribute('aria-pressed'), 'true');
  await urlHas(page, /regions=south/);
  await key(page, 'West').focus();
  await page.keyboard.press('Space');
  await page.locator('.rl11-intro h1').hover();
  await key(page, 'West').blur();
  await urlHas(page, /regions=south%2Cwest|regions=south,west/);
  assert.equal(await page.locator('.rl11-dot:not(.dim)').count(), 29);

  // Peer feedback: pinning a state from a mark, snapping to the nearest one.
  const tx = await dotAt(page, 'TX');
  await page.mouse.move(tx.x + 3, tx.y + 2);
  const tip = page.locator('.rl11-tip');
  assert.match(await tip.innerText(), /Texas[\s\S]*South: 9th of 17 by drug cost/);
  // Peer feedback: the per-claim numbers say what they are.
  assert.match(await tip.innerText(), /Brand-name cost per claim\s*\$1,916/);
  assert.match(await tip.innerText(), /Generic cost per claim\s*\$28/);
  assert.doesNotMatch(await tip.innerText(), /Per claim\s*\$\S+ vs\./);
  await page.mouse.click(tx.x + 3, tx.y + 2);
  await page.locator('.rl11-intro h1').hover();
  await urlHas(page, /state=TX/);
  const card = page.locator('.rl11-state');
  assert.match(await card.innerText(), /Texas/);
  assert.match(await card.innerText(), /13th of 50 states/);
  assert.match(await card.innerText(), /South median\s*82\.7%/);
  assert.match(await card.innerText(), /West median\s*78\.1%/);
  assert.match(await card.innerText(), /brand-name \$1,916, generic \$28/);
  assert.match(await card.innerText(), /20 of 28 specialties, and above the South median in 12/);

  // Peer feedback: the pinned state carries into the chart of every specialty.
  assert.equal(await page.locator('.rl11-state-mark').count(), 29);
  assert.match(await page.locator('.rl11-every h2').innerText(), /Texas against the four regions/);
  assert.match(await page.locator('.rl11-every-head').innerText(), /above the U\.S\. share in 20 of 28 specialties and above the South median in 12/);
  assert.match(await page.locator('.rl11-row', { hasText: 'Psychiatry' }).textContent(), /\+2\.8 pts/);

  // Peer feedback: the pin survives a specialty change.
  await page.getByRole('button', { name: /^Load Urology\./ }).click();
  assert.equal(await page.inputValue('.rl11-stepper select'), 'Urology');
  assert.match(await card.innerText(), /Texas/);
  await urlHas(page, /state=TX/);
  await page.selectOption('.rl11-stepper select', 'Psychiatry');

  await page.locator('.rl11-grid').scrollIntoViewIfNeeded();
  await page.locator('.rl11-intro h1').hover();
  const legend = await page.locator('.rl11-bar').boundingBox();
  const grid = await page.locator('.rl11-grid').boundingBox();
  await page.screenshot({
    path: `${shots}/week-11-regions.png`,
    fullPage: true,
    clip: {
      x: legend.x - 6,
      y: (await page.evaluate(() => scrollY)) + legend.y - 6,
      width: grid.x + grid.width - legend.x + 12,
      height: grid.y + grid.height - legend.y + 12,
    },
  });

  // Peer feedback: clicking empty space closes the topmost selection, then the next.
  await page.locator('.rl11-intro h1').click();
  await urlLacks(page, /state=/, 'first click clears the state');
  await urlHas(page, /regions=/, 'regions stay after the first click');
  assert.equal(await page.locator('.rl11-state-mark').count(), 0);
  await page.locator('.rl11-intro h1').click();
  await urlLacks(page, /regions=/, 'second click clears the regions');

  // Clicking empty chart space also clears it, while a click on the state card does not.
  await page.locator('.rl11-tile', { has: page.locator('b:text-is("CA")') }).click();
  await urlHas(page, /state=CA/);
  await page.locator('.rl11-compare').click();
  await urlHas(page, /state=CA/, 'the card itself is not empty space');
  await page.locator('.rl11-plot > svg').scrollIntoViewIfNeeded();
  const chart = await page.locator('.rl11-plot > svg').boundingBox();
  await page.mouse.click(chart.x + 6, chart.y + chart.height - 6);
  await urlLacks(page, /state=/, 'empty chart space clears the state');

  // Escape clears everything; the close button closes the card.
  await key(page, 'Midwest').click();
  await page.locator('.rl11-tile', { has: page.locator('b:text-is("OH")') }).click();
  await page.keyboard.press('Escape');
  await urlLacks(page, /regions=|state=/);
  await page.locator('.rl11-tile', { has: page.locator('b:text-is("OH")') }).click();
  await page.locator('.rl11-close').click();
  await urlLacks(page, /state=/);
  await page.mouse.move(5, 5);

  // Peer feedback: a layout where regions separate, one click from the Week 10 scatterplot.
  const stripY = (await dotAt(page, 'TX')).y;
  const wyoming = await page.locator('.rl11-tile.empty').innerText();
  assert.match(wyoming, /WY/);
  const westRow = (await dotAt(page, 'WA')).y;
  assert.ok(westRow > stripY, 'each region has its own row');
  await page.getByRole('button', { name: 'Claims vs. cost', exact: true }).click();
  await page.mouse.move(5, 5);
  await urlHas(page, /view=scatter/);
  assert.notEqual((await dotAt(page, 'TX')).y, stripY, 'marks move to the second layout');
  assert.equal(await page.locator('.rl11-dot').count(), 50);
  assert.match(await page.locator('.rl11-main-head').innerText(), /full range/);
  await key(page, 'South').hover();
  assert.match(await page.locator('.rl11-cross-label').textContent(), /South median 82\.7%/);
  await page.mouse.move(5, 5);
  await page.locator('.rl11-grid').scrollIntoViewIfNeeded();
  await page.locator('.rl11-main').screenshot({ path: `${shots}/week-11-scatter.png` });
  await page.getByRole('button', { name: 'By region', exact: true }).click();

  // The measure switch applies to every view.
  await page.getByRole('button', { name: 'Claims', exact: true }).click();
  await page.mouse.move(5, 5);
  await urlHas(page, /m=claims/);
  assert.match(await page.locator('.rl11-main h2').innerText(), /Midwest has the highest median share of claims \(6\.2%\)/);
  assert.match(await page.locator('.rl11-every-head').innerText(), /South in 8 of 28 specialties, Northeast in 9, Midwest in 5, West in 6/);
  await page.getByRole('button', { name: 'Drug cost', exact: true }).click();

  // Specialty controls, keyboard rows, row detail and sorting.
  await page.getByRole('button', { name: 'Next specialty' }).click();
  assert.notEqual(await page.inputValue('.rl11-stepper select'), 'Psychiatry');
  const neurology = page.getByRole('button', { name: /^Load Neurology\./ });
  await neurology.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.inputValue('.rl11-stepper select'), 'Neurology');
  assert.match(await page.locator('.rl11-row-tip').innerText(), /Neurology[\s\S]*South median\s*91\.1%/);
  await neurology.blur();

  // A low-coverage specialty says so, and keeps its out-of-axis value printed.
  await page.selectOption('.rl11-stepper select', 'Emergency Medicine');
  assert.match(await page.locator('.rl11-main-head').innerText(), /suppresses generic values/);
  assert.match(await page.locator('.rl11-row', { hasText: 'Emergency Medicine' }).textContent(), /†/);
  assert.match(await page.locator('.rl11-row', { hasText: 'Emergency Medicine' }).locator('.rl11-beyond').textContent(), /−8\.\d/);
  await page.selectOption('.rl11-stepper select', 'Psychiatry');

  // A state without enough records stays pinned and explains itself.
  await page.selectOption('.rl11-state select', 'WY');
  assert.match(await page.locator('.rl11-state').innerText(), /Wyoming has fewer than 50 Psychiatry records/);
  assert.equal(await page.locator('.rl11-tip').count(), 0);
  await page.keyboard.press('Escape');

  // A preset sets up a complete view; state sort orders the rows by its difference.
  await page.getByRole('button', { name: 'Georgia across every specialty' }).click();
  await page.mouse.move(5, 5);
  await urlHas(page, /state=GA/);
  await urlHas(page, /sort=state/);
  assert.equal(await page.inputValue('.rl11-every-controls label:nth-child(2) select'), 'state');
  const deltas = await page.$$eval('.rl11-row:not(.overall) .rl11-row-delta', (nodes) =>
    nodes
      .map((n) => Number(n.textContent.replace('−', '-').replace(/[^\d.+-]/g, '')))
      .filter((n) => !Number.isNaN(n)),
  );
  assert.equal(deltas.length, 28);
  const rowY = await page.$$eval('.rl11-row:not(.overall)', (rows) =>
    rows.map((r) => [r.getBoundingClientRect().y, Number(r.querySelector('.rl11-row-delta').textContent.replace('−', '-').replace(/[^\d.+-]/g, ''))]),
  );
  rowY.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < rowY.length; i += 1)
    assert.ok(rowY[i - 1][1] >= rowY[i][1] - 1e-9, 'rows follow the state difference');
  assert.match(await page.locator('.rl11-every-head').innerText(), /above the U\.S\. share in 26 of 28 specialties and above the South median in 25/);
  await page.locator('.rl11-every').screenshot({ path: `${shots}/week-11-specialties.png` });
  await page.keyboard.press('Escape');

  // CSV matches the visible states and the table.
  await page.locator('.rl11-table summary').click();
  assert.equal(await page.locator('.rl11-table tbody tr').count(), 50);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download CSV' }).click(),
  ]);
  assert.equal(download.suggestedFilename(), 'part-d-brand-share-by-state-psychiatry.csv');
  const csv = (await readFile(await download.path(), 'utf8')).trim().split('\r\n');
  assert.equal(csv.length, 51);
  assert.match(csv[0], /brand_share_of_cost_pct/);
  const texasRow = csv.find((line) => line.replaceAll('"', '').startsWith('Texas,'));
  assert.match(texasRow.replaceAll('"', ''), /^Texas,South,Psychiatry,2024,1296,6\.44,82\.74,1915\.59,27\.51,/);
  await page.locator('.rl11-table summary').click();

  // Shared links restore the view, and invalid ones fall back.
  const shared = await open(1280, 900, '?s=Dermatology&m=claims&view=scatter&regions=northeast&state=MA&sort=name');
  assert.equal(await shared.inputValue('.rl11-stepper select'), 'Dermatology');
  assert.equal(await key(shared, 'Northeast').getAttribute('aria-pressed'), 'true');
  assert.match(await shared.locator('.rl11-state').innerText(), /Massachusetts/);
  assert.equal(await shared.getByRole('button', { name: 'Claims vs. cost', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await shared.getByRole('button', { name: 'Claims', exact: true }).getAttribute('aria-pressed'), 'true');
  const bogus = await open(1280, 900, '?s=Nope&regions=mars&state=ZZ&m=bad&view=bad&sort=bad');
  assert.equal(await bogus.inputValue('.rl11-stepper select'), 'Psychiatry');
  assert.deepEqual(await dimmed(bogus), [false, false, false, false]);
  assert.equal(await bogus.locator('.rl11-state.empty').count(), 1);
  const everything = await open(1280, 900, '?s=All%20specialties');
  assert.equal(await everything.inputValue('.rl11-stepper select'), 'All specialties');
  assert.equal(await everything.locator('.rl11-dot').count(), 51);

  // Marks really glide between layouts when motion is allowed.
  const moving = await open(1440, 1000, '', { motion: true });
  const start = await dotAt(moving, 'TX');
  await moving.getByRole('button', { name: 'Claims vs. cost', exact: true }).click();
  await moving.waitForTimeout(250);
  const during = await dotAt(moving, 'TX');
  await moving.waitForTimeout(1300);
  const end = await dotAt(moving, 'TX');
  assert.ok(Math.hypot(end.x - start.x, end.y - start.y) > 20, 'the mark moves');
  assert.ok(
    Math.hypot(during.x - start.x, during.y - start.y) > 0.5 &&
      Math.hypot(during.x - end.x, during.y - end.y) > 0.5,
    'it passes through a position between the layouts',
  );

  // Layouts: no horizontal page overflow; charts fit their cards; headline shot.
  for (const width of [320, 390, 768, 1024, 1440]) {
    const p = await open(width, 900, '?regions=south&state=TX');
    const fit = await p.evaluate(() => {
      const fits = (sel) => {
        const svg = document.querySelector(`${sel} > svg`);
        return svg.getBoundingClientRect().width <= svg.parentElement.clientWidth + 1;
      };
      const offscreen = [...document.querySelectorAll('.rl11-tile')].filter((t) => {
        const box = t.getBoundingClientRect();
        return box.right > innerWidth + 1 || box.x < -1;
      }).length;
      const overflowing = [...document.querySelectorAll('.rl11-tile small')].filter((s) => {
        const tile = s.closest('button').getBoundingClientRect();
        const text = s.getBoundingClientRect();
        return text.width > tile.width + 0.5;
      }).length;
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        plot: fits('.rl11-plot'),
        every: fits('.rl11-every-plot'),
        offscreen,
        overflowing,
      };
    });
    assert.ok(fit.overflow <= 0, `${width}px overflow ${fit.overflow}`);
    assert.ok(fit.plot && fit.every, `${width}px charts fit`);
    assert.equal(fit.offscreen, 0, `${width}px tiles on screen`);
    assert.equal(fit.overflowing, 0, `${width}px tile labels fit`);
    if (width === 390) {
      await p.locator('.rl11-main').scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${shots}/week-11-mobile.png`, fullPage: false });
    }
  }
  // A clean full view for the write-up: South pinned, Texas compared, nothing hovered.
  const hero = await open(1440, 1000, '?regions=south,west');
  await hero.locator('.rl11-tile', { has: hero.locator('b:text-is("TX")') }).click();
  await hero.mouse.move(5, 5);
  await hero.evaluate(() => {
    document.activeElement?.blur();
    document.querySelector('.rl11-bar').scrollIntoView({ block: 'start' });
  });
  await hero.waitForTimeout(150);
  await hero.screenshot({ path: `${shots}/week-11-overview.png`, fullPage: false });

  assert.deepEqual(errors, []);
  console.log('Week 11 browser checks passed: hue and lightness map, legend counts and steps, region and state pins, nearest-mark hover, labeled per-claim costs, state carried into every specialty, pin across specialties, click-away and Escape, layout morph, measure switch, sorting, keyboard rows, CSV, shared and invalid links, 320/390/768/1024/1440px layouts.');
} finally {
  await browser.close();
}
