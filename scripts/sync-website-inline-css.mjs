import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  throw new Error('Usage: node scripts/sync-website-inline-css.mjs [--check]');
}

const normalize = text => text.replace(/\r\n/g, '\n');
const css = normalize(await readFile(new URL('../website/css/style.css', import.meta.url), 'utf8')).trimEnd();
if (/<\/style/i.test(css)) throw new Error('CSS contains a closing style tag');

const embedded = `  <style data-source="css/style.css">\n${css}\n  </style>`;
const existing = /^  <style data-source="css\/style\.css">\n[\s\S]*?^  <\/style>$/gm;
const updates = [];
for (const page of ['index', 'about', 'services', 'contact']) {
  const file = new URL(`../website/${page}.html`, import.meta.url);
  const html = normalize(await readFile(file, 'utf8'));
  if ([...html.matchAll(existing)].length !== 1) {
    throw new Error(`${page}.html must contain exactly one embedded stylesheet`);
  }
  const updated = html.replace(existing, () => embedded);
  if (updated !== html) updates.push({ page, file, updated });
}

if (args[0] === '--check' && updates.length) {
  throw new Error(`Inline CSS is out of date: ${updates.map(update => update.page).join(', ')}`);
}
if (args[0] !== '--check') {
  for (const update of updates) await writeFile(update.file, update.updated, 'utf8');
}
