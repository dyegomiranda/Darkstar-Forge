/**
 * Imagens das cartas para a biblioteca: cada carta é desenhada uma vez em alta
 * resolução e guardada (memória + banco). Da segunda vez em diante, abre na hora.
 *
 * A fila desenha primeiro o que está na tela (prioridade menor = antes) e
 * poucas de cada vez, para a interface nunca travar.
 */
import { getRender, putRender } from '../store/db';
import { rasterize } from './raster';

/** Largura da imagem guardada: dobro da carta, para inspeção em telas 2×. */
export const CACHE_WIDTH = 1500;

interface Job { key: string; build: () => string; prio: number; resolve: (u: string) => void; reject: (e: unknown) => void }

const ready = new Map<string, string>(); // chave → URL de objeto
const jobs = new Map<string, Job>();
const waiting = new Map<string, Promise<string>>();
let running = 0;
const MAX_PARALLEL = 2;

/** URL pronta (síncrono), se já existir. */
export function cachedUrl(key: string): string | undefined {
  return ready.get(key);
}

/**
 * Pede a imagem de uma carta. `build` devolve o SVG (só é chamado se precisar
 * desenhar). `prio` pode ser atualizado chamando de novo com outro valor.
 */
export function requestImage(key: string, build: () => string, prio: number): Promise<string> {
  const hit = ready.get(key);
  if (hit) return Promise.resolve(hit);
  const job = jobs.get(key);
  if (job) { job.prio = Math.min(job.prio, prio); job.build = build; }
  // O pedido continua compartilhado enquanto o desenho está em execução.
  const pending = waiting.get(key);
  if (pending) return pending;
  const p = new Promise<string>((resolve, reject) => {
    jobs.set(key, { key, build, prio, resolve, reject });
  });
  waiting.set(key, p);
  pump();
  return p;
}

/** Diminui a prioridade de cartas que saíram da tela. */
export function deprioritize(key: string, prio = 1000): void {
  const j = jobs.get(key);
  if (j) j.prio = Math.max(j.prio, prio);
}

function next(): Job | undefined {
  let best: Job | undefined;
  for (const j of jobs.values()) if (!best || j.prio < best.prio) best = j;
  return best;
}

function pump(): void {
  while (running < MAX_PARALLEL) {
    const job = next();
    if (!job) return;
    jobs.delete(job.key);
    running++;
    void run(job).finally(() => { running--; pump(); });
  }
}

async function run(job: Job): Promise<void> {
  try {
    // Cache é uma otimização: uma falha de leitura não pode esconder a carta.
    let blob: Blob | undefined;
    try { blob = await getRender(job.key); } catch { /* desenha sem cache */ }
    if (!blob) {
      blob = await rasterize(job.build(), CACHE_WIDTH, 'image/png');
      void putRender(job.key, blob).catch(() => undefined);
    }
    const url = URL.createObjectURL(blob);
    ready.set(job.key, url);
    job.resolve(url);
  } catch (e) {
    console.error('Falha ao desenhar carta', job.key, e);
    job.reject(e);
  } finally {
    waiting.delete(job.key);
  }
}

/** Libera da memória as imagens que não são mais usadas (o banco continua com elas). */
export function forget(keys: Iterable<string>): void {
  for (const k of keys) {
    const u = ready.get(k);
    if (u) { URL.revokeObjectURL(u); ready.delete(k); }
  }
}
