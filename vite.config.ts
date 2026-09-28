import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mkdirSync, writeFileSync } from 'node:fs';
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

export default defineConfig({
  base: './',
  plugins: [svelte(), snaps()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), mostruario: resolve(import.meta.dirname, 'mostruario.html') },
    },
  },
});
