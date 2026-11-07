import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkout = path.join(root, 'sites', 'moris');
const manifest = JSON.parse(await readFile(path.join(root, '.openai', 'hosting.json'), 'utf8'));
if (!manifest.project_id || manifest.static || manifest.d1 !== 'DB') throw new Error('Preserve the existing Site identity and reminder database binding before preparing source.');
await mkdir(checkout, { recursive: true });
const existing = await readFile(path.join(checkout, '.openai', 'hosting.json'), 'utf8').catch(() => null);
if (existing && JSON.parse(existing).project_id !== manifest.project_id) throw new Error('This checkout belongs to a different Site. Preserve it.');

const files = ['package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts', '.gitignore', 'README.md', 'scripts/browser-check.cjs', 'scripts/evolution-check.cjs', 'scripts/reminder-check.cjs', 'scripts/companion-check.cjs', 'scripts/build-worker.mjs', 'scripts/preview-worker.mjs', 'scripts/make-icons.py', 'docs/qa.md', 'docs/deployment.md', 'docs/design-directions.md', 'docs/reminders.md', 'docs/companion-iteration.md', '.openai/hosting.json'];
for (const file of files) {
  await mkdir(path.dirname(path.join(checkout, file)), { recursive: true });
  await cp(path.join(root, file), path.join(checkout, file), { force: true });
}
for (const directory of ['src', 'public', 'server', 'drizzle']) await cp(path.join(root, directory), path.join(checkout, directory), { recursive: true, force: true });

async function inventory(directory, base = directory) {
  const entries = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Source trees must not contain symlinks.');
    if (entry.isDirectory()) entries.push(...await inventory(full, base));
    else entries.push([path.relative(base, full).replaceAll('\\', '/'), createHash('sha256').update(await readFile(full)).digest('hex')]);
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
}
for (const directory of ['src', 'public', 'server', 'drizzle']) {
  if (JSON.stringify(await inventory(path.join(root, directory))) !== JSON.stringify(await inventory(path.join(checkout, directory)))) throw new Error(`The ${directory} copy has extra or changed files. Reconcile the checkout before publishing.`);
}
console.log(JSON.stringify({ project_id: manifest.project_id, checkout_path: checkout, verified_source_copy: true }));
