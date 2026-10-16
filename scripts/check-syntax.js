// `npm run lint`: syntax-checks every JavaScript file of the project (no extra dependency).
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const roots = ['script.js', 'i18n.js', 'server', 'scripts', 'tests'];
const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => walk(path.join(p, f)));
  else if (/\.(m?js)$/.test(p)) files.push(p);
};
roots.forEach(walk);

let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failed++;
    console.error(`✗ ${file}\n${error.stderr}`);
  }
}
console.log(`${files.length - failed}/${files.length} files OK`);
process.exit(failed ? 1 : 0);
