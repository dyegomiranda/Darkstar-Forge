/**
 * Banco local (IndexedDB). Uma linha por carta — salvar uma carta não regrava
 * o projeto inteiro. Imagens ficam como Blob (não texto base64), com id = hash
 * do conteúdo, então a mesma arte nunca é guardada duas vezes.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { withoutPathfinder } from '../model/retireCollection';
import type { Card, Project } from '../model/types';

export interface MediaRow { id: string; blob: Blob; name: string; type: string; addedAt: number }
export interface RenderRow { key: string; blob: Blob; at: number }

interface ForgeDB extends DBSchema {
  project: { key: string; value: Project };
  cards: { key: string; value: Card; indexes: { deckId: string } };
  media: { key: string; value: MediaRow };
  renders: { key: string; value: RenderRow; indexes: { at: number } };
}

const DB_NAME = 'darkstar-forge';
let dbp: Promise<IDBPDatabase<ForgeDB>> | null = null;

export function db(): Promise<IDBPDatabase<ForgeDB>> {
  dbp ??= openDB<ForgeDB>(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('project');
      d.createObjectStore('cards', { keyPath: 'id' }).createIndex('deckId', 'deckId');
      d.createObjectStore('media', { keyPath: 'id' });
      d.createObjectStore('renders', { keyPath: 'key' }).createIndex('at', 'at');
    },
  });
  return dbp;
}

export async function loadAll(): Promise<{ project?: Project; cards: Card[] }> {
  const d = await db();
  const [project, cards] = await Promise.all([d.get('project', 'main'), d.getAll('cards')]);
  return { project, cards };
}

export async function saveProject(p: Project): Promise<void> {
  await (await db()).put('project', structuredClone(p), 'main');
}

export async function saveCards(cards: Card[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('cards', 'readwrite');
  await Promise.all([...cards.map((c) => tx.store.put(structuredClone(c))), tx.done]);
}

export async function deleteCards(ids: string[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('cards', 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

/** Troca o conteúdo inteiro numa transação: uma falha preserva os dados anteriores. */
export async function replaceProject(project: Project, cards: Card[], media: MediaRow[] = []): Promise<void> {
  const tx = (await db()).transaction(['project', 'cards', 'media', 'renders'], 'readwrite');
  const writes: Promise<unknown>[] = [];
  try {
    writes.push(
      tx.objectStore('project').clear(), tx.objectStore('cards').clear(),
      tx.objectStore('media').clear(), tx.objectStore('renders').clear(),
    );
    writes.push(tx.objectStore('project').put(structuredClone(project), 'main'));
    for (const card of cards) writes.push(tx.objectStore('cards').put(structuredClone(card)));
    for (const row of media) writes.push(tx.objectStore('media').put(row));
    await Promise.all([...writes, tx.done]);
  } catch (error) {
    try { tx.abort(); } catch { /* a transação já pode ter sido abortada pelo banco */ }
    await Promise.allSettled([...writes, tx.done]);
    throw error;
  }
}

/** Apaga tudo (projeto, cartas, mídia e cache). */
export async function wipe(): Promise<void> {
  const d = await db();
  await Promise.all((['project', 'cards', 'media', 'renders'] as const).map((s) => d.clear(s)));
}

// ───────────── mídia ─────────────

async function sha1(blob: Blob): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Guarda uma imagem e devolve o id (o mesmo arquivo sempre dá o mesmo id). */
export async function putMedia(blob: Blob, name = ''): Promise<string> {
  const id = await sha1(blob);
  const d = await db();
  if (!(await d.getKey('media', id))) await d.put('media', { id, blob, name, type: blob.type, addedAt: Date.now() });
  return id;
}

export async function getMedia(id: string): Promise<MediaRow | undefined> {
  return (await db()).get('media', id);
}

export async function listMedia(): Promise<MediaRow[]> {
  return (await db()).getAll('media');
}

export async function deleteMedia(ids: string[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('media', 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

// ───────────── cache de imagens das cartas ─────────────

export async function getRender(key: string): Promise<Blob | undefined> {
  return (await (await db()).get('renders', key))?.blob;
}

export async function putRender(key: string, blob: Blob): Promise<void> {
  await (await db()).put('renders', { key, blob, at: Date.now() });
}

/** Mantém o cache enxuto: remove as imagens que nenhuma carta usa mais. */
export async function pruneRenders(keep: Set<string>): Promise<number> {
  const d = await db();
  const keys = await d.getAllKeys('renders');
  const stale = keys.filter((k) => !keep.has(k));
  const tx = d.transaction('renders', 'readwrite');
  await Promise.all([...stale.map((k) => tx.store.delete(k)), tx.done]);
  return stale.length;
}

/** Tira do cache as imagens feitas por uma versão anterior do desenho (a chave começa pela versão). */
export async function pruneOldRenders(prefix: string): Promise<number> {
  const d = await db();
  const stale = (await d.getAllKeys('renders')).filter((k) => !String(k).startsWith(prefix));
  if (!stale.length) return 0;
  const tx = d.transaction('renders', 'readwrite');
  await Promise.all([...stale.map((k) => tx.store.delete(k)), tx.done]);
  return stale.length;
}

export async function storageEstimate(): Promise<{ used: number; quota: number }> {
  const e = await navigator.storage?.estimate?.();
  return { used: e?.usage ?? 0, quota: e?.quota ?? 0 };
}

/** Retira Classes e apenas as mídias exclusivas dela numa transação. */
export async function retirePathfinder(): Promise<void> {
  const d = await db();
  const tx = d.transaction(['project', 'cards', 'media', 'renders'], 'readwrite');
  const project = await tx.objectStore('project').get('main');
  if (project) {
    const cards = await tx.objectStore('cards').getAll();
    const result = withoutPathfinder(project, cards);
    if (result.project !== project) {
      const keep = new Set(result.cards.map(c => c.id));
      await tx.objectStore('project').put(result.project, 'main');
      for (const c of cards) if (!keep.has(c.id)) await tx.objectStore('cards').delete(c.id);
      for (const id of result.mediaIds) await tx.objectStore('media').delete(id);
      await tx.objectStore('renders').clear();
    }
  }
  await tx.done;
}
