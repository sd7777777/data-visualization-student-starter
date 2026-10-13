/** Local browser regression for Week 8 brand/generic view. Does not post or submit anything. */
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
const shots = process.env.SCREENSHOT_DIR || 'docs/assets';
await mkdir(shots, { recursive: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:3021/';
const errors = [];

async function open(width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}#week-8`, { waitUntil: 'networkidle' });
  await page.locator('#brand-flip').waitFor();
  return page;
}
// Clear hover and focus rings so screenshots show the resting state.
async function rest(page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
}
const show = (page, id) =>
  page.evaluate(
    (id) => document.getElementById(id).scrollIntoView({ behavior: 'instant' }),
    id,
  );

try {
  const page = await open(1440, 1100);
  const title = page.locator('#brand-gap-title');
  assert.match(await title.innerText(), /15% of claims, 88% of drug cost/);
  await show(page, 'week-8');
  await page.locator('#week-8 .story-question').waitFor();
  await page
    .locator('#brand-flip')
    .screenshot({ path: `${shots}/week-08-flip.png` });
  // Headline, controls and the flip together, for the Discord post and README.
  const top = await page.locator('#week-8').boundingBox();
  const flip = await page.locator('#brand-flip').boundingBox();
  await page.screenshot({
    path: `${shots}/week-08-overview.png`,
    fullPage: true,
    clip: {
      x: top.x,
      y: top.y + (await page.evaluate(() => window.scrollY)) + 6,
      width: top.width,
      height: flip.y + flip.height - top.y + 10,
    },
  });

  // Sorting by gap puts the widest claim/cost gap first.
  await page.getByRole('button', { name: 'Largest gap', exact: true }).click();
  const firstRow = page.locator('#brand-specialties .brand-row').first();
  assert.match(await firstRow.getAttribute('aria-label'), /^Dermatology in/);

  // Keyboard selection of a specialty drives the state comparison.
  const rheumatology = page
    .locator('#brand-specialties')
    .getByRole('button', { name: /^Rheumatology in United States:/ });
  await rheumatology.focus();
  await page.keyboard.press('Enter');
  assert.equal(await rheumatology.getAttribute('aria-pressed'), 'true');
  assert.match(
    await page.locator('#brand-states h3').innerText(),
    /^Rheumatology/,
  );
  await rest(page);
  await page
    .locator('#brand-specialties')
    .screenshot({ path: `${shots}/week-08-specialties.png` });

  // Selecting a state makes it the page geography everywhere.
  // Only states with at least 50 Rheumatology records are plotted; the rest are counted.
  const mix = JSON.parse(
    await readFile('public/data/prescriber-summary/drug-mix.json', 'utf8'),
  );
  const index = mix.specialties.indexOf('Rheumatology');
  const eligible = mix.areas.filter(
    (area) =>
      /^[A-Z]{2}$/.test(area.code) &&
      area.code !== 'US' &&
      area.specialties[index]?.[0] >= 50 &&
      !['AS', 'GU', 'MP', 'PR', 'VI', 'AA', 'AE', 'AP', 'XX', 'ZZ'].includes(
        area.code,
      ),
  ).length;
  assert.equal(
    await page.locator('#brand-states .brand-state').count(),
    eligible,
  );
  assert.match(
    await page.locator('#brand-states output').innerText(),
    new RegExp(`${51 - eligible} places have fewer than 50 records`),
  );
  const ma = page
    .locator('#brand-states')
    .getByRole('button', { name: /^Rheumatology in Massachusetts:/ });
  await ma.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => document.querySelector('#week-8 select')?.value === 'MA',
  );
  assert.equal(await page.locator('#week-3 select').first().inputValue(), 'MA');
  assert.equal(await ma.getAttribute('aria-pressed'), 'true');
  assert.match(
    await page.locator('#week-8 .story-question p').innerText(),
    /^Massachusetts · [\d,]+ provider records\./,
  );
  await rest(page);
  await page
    .locator('#brand-states')
    .screenshot({ path: `${shots}/week-08-states.png` });

  // CSV contains one row per displayed specialty.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Specialty CSV' }).click(),
  ]);
  assert.equal(
    download.suggestedFilename(),
    'part-d-brand-generic-ma-2024.csv',
  );
  const csv = await readFile(await download.path(), 'utf8');
  const rows = await page.locator('#brand-specialties .brand-row').count();
  assert.equal(csv.trim().split('\r\n').length, rows + 1);
  assert.match(csv, /"Massachusetts","2024","Rheumatology"/);

  // Back to the nation through the section's own selector.
  await page.locator('#week-8 select').selectOption('US');
  assert.match(await title.innerText(), /15% of claims/);

  // A territory with too few records degrades to an explanation, not an error.
  await page.locator('#week-8 select').selectOption('AS');
  await page
    .locator('#brand-specialties .studio-empty', { hasText: 'American Samoa' })
    .waitFor();
  assert.match(await title.innerText(), /of claims, \d+% of drug cost/);

  for (const [width, height] of [
    [320, 800],
    [390, 844],
    [768, 1024],
  ]) {
    const narrow = await open(width, height);
    const overflow = await narrow.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.equal(overflow, 0, `horizontal page overflow at ${width}px`);
    const track = await narrow
      .locator('#brand-flip .flip-track')
      .first()
      .boundingBox();
    assert(track && track.x >= 0 && track.x + track.width <= width + 0.5);
    if (width === 390) {
      await show(narrow, 'brand-flip');
      await narrow
        .locator('#brand-flip')
        .screenshot({ path: `${shots}/week-08-mobile.png` });
    }
    await narrow.context().close();
  }
  // A missing drug-mix file leaves the rest of the explorer working.
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const failed = await context.newPage();
    await failed.route('**/drug-mix.json', (route) =>
      route.fulfill({ status: 404 }),
    );
    await failed.goto(`${base}#week-8`, { waitUntil: 'networkidle' });
    await failed
      .locator('#week-8', { hasText: 'could not be loaded' })
      .waitFor();
    await failed.locator('#place').waitFor();
    await context.close();
  }
  // A slow file does not hold up the page; Week 8 fills in when it arrives.
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const slow = await context.newPage();
    await slow.route('**/drug-mix.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      await route.continue();
    });
    const started = Date.now();
    await slow.goto(base);
    await slow
      .locator('#week-8', { hasText: 'Loading brand and generic data' })
      .waitFor();
    assert(Date.now() - started < 6900, 'page waited for the slow file');
    await slow.locator('#brand-flip').waitFor({ timeout: 15000 });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    'Week 8 browser checks passed: headline, sort, keyboard specialty and state selection, linked geography, CSV, territory fallback, missing and slow data files, and 320/390/768/1440px layouts.',
  );
} finally {
  await browser.close();
}
