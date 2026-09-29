import { spawnSync } from 'node:child_process';
const suites = [
  'interaction',
  'geography',
  'wonder',
  'atlas',
  'composition',
  'scroll_story',
  'state_contours',
  'notebook',
  'research_workflow',
];
for (const suite of suites) {
  const result = spawnSync(process.execPath, [`scripts/check_${suite}.mjs`], {
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error(`Check failed: ${suite}`, result.error ?? '');
    process.exit(result.status ?? 1);
  }
}
console.log(`All ${suites.length} calculation and persistence suites passed.`);
