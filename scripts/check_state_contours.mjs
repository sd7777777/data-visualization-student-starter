import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const cache = new Map();
function moduleUrl(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  let code = url.pathname.endsWith('.json')
    ? `export default ${readFileSync(url, 'utf8')};`
    : ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  code = code.replace(/from ['"]([^'"]+)['"]/g, (_, path) => {
    const resolved = path.startsWith('.') ? moduleUrl(new URL(`${path}.ts`, url)) : path.endsWith('.json') ? moduleUrl(new URL(import.meta.resolve(path))) : import.meta.resolve(path);
    return `from ${JSON.stringify(resolved)}`;
  });
  const result = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  cache.set(url.href, result);
  return result;
}
const { stateShapes, mapRows, mapBand, mapCsv } = await import(moduleUrl(new URL('../lib/state-contours.ts', import.meta.url)));
const data = JSON.parse(readFileSync(new URL('../public/data/prescriber-summary/summary.json', import.meta.url)));
assert.equal(stateShapes.length, 51);
assert.equal(new Set(stateShapes.map(shape => shape.name)).size, 51);
for (const shape of stateShapes) {
  assert(shape.path.startsWith('M'));
  assert(!/NaN|Infinity/.test(shape.path));
  assert(shape.centroid.every(Number.isFinite));
  assert(shape.centroid[0] >= 0 && shape.centroid[0] <= 975);
  assert(shape.centroid[1] >= 0 && shape.centroid[1] <= 610);
}
assert.deepEqual([0,0.499,0.5,0.799,0.8,1.2,1.201,2,2.001].map(mapBand),[0,0,1,1,2,2,3,3,4]);
let cases = 0;
for (const profile of data.specialtyProfiles) {
  for (const metric of ['costPerClaim','claimsPerProvider','opioidShare','antibioticShare']) {
    const get = row => metric === 'claimsPerProvider' ? row.claims / row.providers : row[metric];
    for (const minimum of [1,50,250,1000,Number.MAX_SAFE_INTEGER]) {
      const rows = mapRows(profile, metric, minimum);
      assert.equal(rows.length, 51);
      for (const item of rows) {
        const original = profile.states.find(row => row.name === item.name);
        assert(original, `Missing state join: ${item.name}`);
        if (original.providers >= minimum) {
          assert.equal(item.status, 'included');
          assert.equal(item.value, get(original));
          assert.equal(item.ratio, get(profile.national) > 0 ? get(original) / get(profile.national) : null);
        } else {
          assert.equal(item.status, 'below threshold');
          assert.equal(item.value, null);
          assert.equal(item.ratio, null);
        }
      }
      const csv = mapCsv(profile, metric, minimum, data.meta.year);
      assert.equal(csv.split('\r\n').length,52);
      assert(!csv.includes('NaN') && !csv.includes('undefined'));
      cases++;
    }
  }
}
const sample = data.specialtyProfiles[0];
const missing = mapRows({...sample,states:[]}, 'costPerClaim', 50);
assert(missing.every(row => row.status === 'unavailable' && row.value === null && row.ratio === null));
const zero = mapRows({...sample,national:{...sample.national,costPerClaim:0}},'costPerClaim',1);
assert(zero.every(row => row.ratio === null));
const quoted = mapCsv({...sample,specialty:'A, "quoted" specialty'},'costPerClaim',50,2024);
assert(quoted.includes('"A, ""quoted"" specialty"'));
console.log(`State contours: 51 valid shapes and state joins; ${cases} metric/filter cases; exact ratios, boundary bins, missing data, zero benchmarks, CSV coverage and escaping passed.`);
