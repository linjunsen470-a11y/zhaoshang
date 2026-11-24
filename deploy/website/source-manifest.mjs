// Run against both the release sources and the tools image built with the live app.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const changed = new Set([
  'page.tsx', 'layout.tsx', 'globals.css', 'LeadForm.tsx', 'MiniProgramSearch.tsx', 'dining-room.webp',
  'lunch-hour.webp', 'serving-counter.webp', 'claypot-meal.webp', 'jinyi.webp', 'police-filing.webp'
].map(name => 'app/(frontend)/' + name));
function list(file) {
  if (statSync(file).isDirectory()) {
    return readdirSync(file).sort().flatMap(entry => list(file + '/' + entry));
  }
  return changed.has(file) || file.endsWith('/.gitkeep') ? [] : [file];
}
const paths = ['app', 'collections', 'lib', 'patches', 'public', 'next.config.ts', 'payload.config.ts',
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'postcss.config.mjs', 'tsconfig.json', '.npmrc'];
for (const file of paths.flatMap(list)) {
  const bytes = readFileSync(file);
  const data = bytes.includes(0) ? bytes : bytes.toString('utf8').replaceAll('\r\n', '\n');
  console.log(createHash('sha256').update(data).digest('hex') + '  ' + file);
}
