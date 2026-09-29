/** Contexto de desenho de uma carta a partir do estado do app. */
import { app } from '../../store/project.svelte';
import { mediaUrl, ensureAll } from '../../store/media';
import type { Card } from '../../model/types';
import { cardInput, lookMediaIds, mergeLook, renderKey, type CardContext } from '../../render/card';
import { compose } from '../../render/compose';
import { cachedUrl, requestImage } from '../../render/queue';

export function ctxFor(card: Card): CardContext | null {
  const deck = app.deck(card.deckId);
  if (!deck) return null;
  return { deck, edition: app.edition(deck.editionId), lang: app.lang, mediaUrl };
}

/**
 * Pré-desenha em segundo plano (prioridade baixa) as cartas ainda sem imagem.
 * O que está na tela continua passando na frente.
 */
export function warmCache(cards: Card[]): void {
  cards.forEach((card, i) => {
    const ctx = ctxFor(card);
    if (!ctx) return;
    const key = renderKey(card, ctx);
    if (cachedUrl(key)) return;
    void ensureCardMedia(card).then(() => requestImage(key, () => compose(cardInput(card, ctxFor(card)!)), 500 + i)).catch(() => undefined);
  });
}

/** Garante que as imagens usadas pela carta (arte, logo da edição, peças de imagem) estejam prontas. */
export async function ensureCardMedia(card: Card): Promise<void> {
  const deck = app.deck(card.deckId);
  const ids = [card.art.mediaId, app.edition(deck?.editionId)?.setMediaId, ...(deck ? lookMediaIds(mergeLook(deck.look, card.look)) : [])].filter(Boolean) as string[];
  if (ids.length) await ensureAll(ids);
}
