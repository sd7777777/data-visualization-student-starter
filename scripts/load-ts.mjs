import { readFileSync } from 'node:fs';
import ts from 'typescript';

/** Load pure project TypeScript, resolving local runtime dependencies for Node checks. */
export function moduleUrl(path, replacements = {}) {
  let code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  for (const [from, to] of Object.entries(replacements))
    code = code.replaceAll(from, to);
  code = code.replace(/from (['"])(\.\.?\/[^'"]+)\1/g, (_, quote, relative) => {
    const dependency = new URL(
      relative.endsWith('.ts') ? relative : `${relative}.ts`,
      path,
    );
    return `from ${JSON.stringify(moduleUrl(dependency))}`;
  });
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
export const loadTs = (path, replacements) =>
  import(moduleUrl(path, replacements));
