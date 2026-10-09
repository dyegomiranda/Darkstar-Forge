/** Só troca arte oficial identificada; arte enviada pelo jogador continua intacta. */
import assets from '../data/rework-art.json';
import hashes from '../data/builtin-art-hashes.json';
import type { Card } from '../model/types';
const paths = assets as Record<string, string>;
const builtin = hashes as Record<string, string>;
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Arte atual de uma carta reconhecida do catálogo Protótipo. */
export function prototypeAsset(card: Card): string | undefined {
  if (card.id.startsWith('eq-') && card.gear && card.deckId.startsWith('proto-')) return paths[card.id];
  if (card.deckId.startsWith('proto-') && card.game) return paths[slug(card.text['en-US'].name)];
}

/** Atualização única do catálogo, autorizada a substituir suas artes antigas. */
export function withPrototypeArt(card: Card): Card {
  const asset = prototypeAsset(card);
  return asset ? { ...card, art: { asset, icon: card.art.icon, zoom: 1, x: 0, y: 0, mirror: false } } : card;
}

export function reworkAsset(card: Card): string | undefined {
  if (card.art.mediaId) return paths[builtin[card.art.mediaId]];
  if (card.art.asset) {
    const match = /^art\/proto\/([a-z0-9-]+)\.webp$/.exec(card.art.asset);
    const current = /^art\/rework\/cards(?:-hd)?\/([a-z0-9-]+)\.png$/.exec(card.art.asset);
    return match ? paths[match[1]] : current ? paths[current[1]] : undefined;
  }
  return prototypeAsset(card);
}
