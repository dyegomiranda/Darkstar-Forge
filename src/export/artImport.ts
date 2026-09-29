/**
 * Importa artes em lote: cada arquivo vai para a carta certa pelo NOME.
 *
 *  - `<deck>_<número>.png`  → ex.: `pf-red_003.png` = carta nº 3 do deck pf-red
 *    (é o nome que o script do ComfyUI gera — ver docs/artes.md)
 *  - `<nome da carta>.png`  → ex.: `corte-duplo.png` ou `Corte Duplo.jpg`
 *    (sem acentos/maiúsculas; procura na coleção aberta primeiro)
 *  - variações: `pf-red_001__v2.png`, `pf-red_001__v3.png`… são versões da mesma carta;
 *    quando uma carta tem mais de uma, a Biblioteca pede para escolher a melhor.
 */
import { app } from '../store/project.svelte';
import { importImage } from '../store/media';
import type { Card } from '../model/types';

/** "Corte Duplo!" → "corte-duplo" (sem acentos, só letras e números). */
export function slug(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Acha a carta de um arquivo (ou undefined). `editionId` = coleção aberta, que tem prioridade no nome. */
export function matchCard(fileName: string, cards: Card[], deckEdition: (deckId: string) => string | undefined, editionId?: string): Card | undefined {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '').replace(/__v\d+$/i, '');
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

/** Imagens que correspondem a uma carta (várias = variações para escolher). */
export interface ArtGroup { card: Card; files: File[] }

/** Agrupa os arquivos por carta; a versão sem `__vN` vem primeiro. */
export function groupArtFiles(files: File[]): { groups: ArtGroup[]; unmatched: string[] } {
  const cards = Object.values(app.cards);
  const edOf = (deckId: string) => app.deck(deckId)?.editionId;
  const byCard = new Map<string, ArtGroup>();
  const unmatched: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const card = matchCard(f.name, cards, edOf, app.editionId);
    if (!card) { unmatched.push(f.name); continue; }
    const g = byCard.get(card.id) ?? { card, files: [] };
    g.files.push(f);
    byCard.set(card.id, g);
  }
  const variant = (f: File) => +(f.name.match(/__v(\d+)\.[a-z0-9]+$/i)?.[1] ?? 1);
  const groups = [...byCard.values()];
  for (const g of groups) g.files.sort((a, b) => variant(a) - variant(b));
  // mesma ordem da barra lateral (deck), depois o número da carta
  const order = (deckId: string) => app.deck(deckId)?.order ?? 99;
  groups.sort((a, b) => order(a.card.deckId) - order(b.card.deckId) || a.card.n - b.card.n);
  return { groups, unmatched };
}

/**
 * Coloca a imagem escolhida em cada carta. Cada carta é gravada assim que recebe a
 * arte (fechar no meio não perde o que já entrou) e um arquivo com problema não
 * impede os outros. `onStep` recebe quantas já foram; `stop()` true interrompe.
 */
export async function applyArt(
  choices: { card: Card; file: File }[],
  onStep?: (done: number) => void,
  stop?: () => boolean,
): Promise<{ done: number; failed: string[] }> {
  let done = 0;
  const failed: string[] = [];
  for (const [i, { card, file }] of choices.entries()) {
    if (stop?.()) break;
    try {
      const mediaId = await importImage(file, file.name);
      app.putCard({ ...(app.cards[card.id] ?? card), art: { mediaId, zoom: 1, x: 0, y: 0, mirror: false } });
      done++;
    } catch (e) {
      console.error('Arte não importada:', file.name, e);
      failed.push(file.name);
    }
    onStep?.(i + 1);
  }
  return { done, failed };
}
