import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Só em desenvolvimento: POST /__snap?name=x.png grava a imagem em .snaps/ (conferência visual). */
function snaps(): Plugin {
  return {
    name: 'forge-snaps',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__snap', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name')?.replace(/[^\w.-]/g, '_') || 'snap.png';
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const dir = resolve(import.meta.dirname, '.snaps');
          mkdirSync(dir, { recursive: true });
          writeFileSync(resolve(dir, name), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

/** Versão do programa (package.json) + commit e data da compilação, mostrados na barra lateral. */
function buildInfo(): { version: string; build: string } {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')) as { version: string };
  let commit = '';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: import.meta.dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* sem git */ }
  const date = new Date().toISOString().slice(0, 10);
  return { version: pkg.version, build: [commit, date].filter(Boolean).join(' · ') };
}
const info = buildInfo();

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(info.version), __APP_BUILD__: JSON.stringify(info.build) },
  plugins: [svelte(), snaps()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), mostruario: resolve(import.meta.dirname, 'mostruario.html') },
    },
  },
});
