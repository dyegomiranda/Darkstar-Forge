/**
 * Importa artes em lote: cada arquivo vai para a carta certa pelo NOME.
 *
 *  - `<deck>_<número>.png`  → ex.: `pf-red_003.png` = carta nº 3 do deck pf-red
 *    (é o nome que o script do ComfyUI gera — ver docs/artes.md)
 *  - `<nome da carta>.png`  → ex.: `corte-duplo.png` ou `Corte Duplo.jpg`
 *    (sem acentos/maiúsculas; procura na coleção aberta primeiro)
 */
import { app } from '../store/project.svelte';
import { importImage } from '../store/media';
import type { Card } from '../model/types';

/** "Corte Duplo!" → "corte-duplo" (sem acentos, só letras e números). */
export function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Acha a carta de um arquivo (ou undefined). `editionId` = coleção aberta, que tem prioridade no nome. */
export function matchCard(fileName: string, cards: Card[], deckEdition: (deckId: string) => string | undefined, editionId?: string): Card | undefined {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '');
  const m = base.match(/^(.+)_(\d{1,3})$/);
  if (m) {
    const n = +m[2];
    const byNum = cards.find((c) => c.deckId.toLowerCase() === m[1].toLowerCase() && c.n === n);
    if (byNum) return byNum;
  }
  const s = slug(base);
  const same = cards.filter((c) => Object.values(c.text).some((t) => slug(t.name) === s));
  return same.find((c) => deckEdition(c.deckId) === editionId) ?? same[0];
}

export interface ArtImportResult { matched: { file: string; card: string }[]; unmatched: string[] }

export async function importArtBatch(files: File[]): Promise<ArtImportResult> {
  const cards = Object.values(app.cards);
  const edOf = (deckId: string) => app.deck(deckId)?.editionId;
  const out: ArtImportResult = { matched: [], unmatched: [] };
  const changed: Card[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const card = matchCard(f.name, cards, edOf, app.editionId);
    if (!card) { out.unmatched.push(f.name); continue; }
    const mediaId = await importImage(f, f.name);
    changed.push({ ...card, art: { mediaId, zoom: 1, x: 0, y: 0, mirror: false } });
    out.matched.push({ file: f.name, card: card.text[app.lang]?.name ?? card.text['pt-BR'].name });
  }
  if (changed.length) app.putCards(changed);
  return out;
}
