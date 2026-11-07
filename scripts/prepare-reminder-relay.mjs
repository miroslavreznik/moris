import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const destination = path.resolve('sites/moris-reminders-relay');
const manifest = JSON.parse(await readFile(path.join(destination, '.openai/hosting.json'), 'utf8'));
if (!manifest.project_id) throw new Error('Register the reminder relay before preparing its source.');
await mkdir(destination, { recursive: true });
await cp('server/public-reminder-relay.ts', path.join(destination, 'relay.ts'));
// Keep the dependency lock identical to the app. The relay build needs only Vite.
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
pkg.scripts = { build: 'vite build' };
await writeFile(path.join(destination, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
await cp('package-lock.json', path.join(destination, 'package-lock.json'));
await writeFile(path.join(destination, 'vite.config.ts'), `import { defineConfig } from 'vite';\nexport default defineConfig({ build: { outDir: 'dist/server', target: 'es2022', lib: { entry: 'relay.ts', formats: ['es'], fileName: () => 'index.js' } } });\n`);
await writeFile(path.join(destination, '.gitignore'), 'node_modules/\ndist/\n.env*\n*.log\n');
await writeFile(path.join(destination, 'README.md'), '# Moris notification relay\n\nPublic API for the Moris GitHub Pages installation. It forwards only config, subscription and test requests to the existing private Moris service. Runtime credentials stay in Sites secrets. Dispatch, user headers, cookies and arbitrary paths are never forwarded. The existing private service and its daily sender remain unchanged.\n');
console.log(JSON.stringify({ project_id: manifest.project_id, checkout_path: destination }));
