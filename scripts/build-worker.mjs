import { readdir, readFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'vite';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const assets = {};
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'server' || entry.name.startsWith('.') || entry.name === '_headers') continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else assets['/' + path.relative('dist', file).replaceAll('\\', '/')] = { type: types[path.extname(file)] || 'application/octet-stream', data: (await readFile(file)).toString('base64') };
  }
}
await collect('dist');
await build({ configFile: false, plugins: [{ name: 'moris-embedded-assets', resolveId: id => id === 'virtual:moris-assets' ? '\0moris-assets' : undefined, load: id => id === '\0moris-assets' ? `export default ${JSON.stringify(assets)}` : undefined }], build: { outDir: 'dist/server', emptyOutDir: false, target: 'es2022', minify: false, lib: { entry: 'server/index.ts', formats: ['es'], fileName: () => 'index.js' } } });
await mkdir('dist/.openai', { recursive: true });
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
