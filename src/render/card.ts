/**
 * Ponte entre o modelo (Card/Deck/Edition) e o motor de desenho (compose).
 */
import { colorHex, DECK_SIZE } from '../model/catalog';
import { hash } from '../model/id';
import type { Card, Deck, Edition, Lang } from '../model/types';
import type { ComposeInput, Look } from './compose';

/** Muda quando o desenho muda (invalida o cache de imagens). */
export const RENDER_VERSION = 'r4';

/** Tema final = tema do deck + ajustes da carta (a carta ganha). */
export function mergeLook(base: Look, over?: Partial<Look>): Look {
  if (!over) return base;
  const pieces = { ...base.pieces };
  for (const [k, v] of Object.entries(over.pieces ?? {})) {
    pieces[k as keyof typeof pieces] = { ...pieces[k as keyof typeof pieces], ...v } as never;
  }
  const icons = { ...base.icons, ...over.icons };
  for (const k of ['cost', 'class', 'atk', 'def'] as const) {
    if (base.icons?.[k] || over.icons?.[k]) icons[k] = { ...base.icons?.[k], ...over.icons?.[k] };
  }
  return { ...base, ...over, style: over.style ?? base.style, pieces, icons };
}

export interface CardContext {
  deck: Deck;
  edition?: Edition;
  lang: Lang;
  /** Resolve o id de mídia para uma URL utilizável pelo navegador. */
  mediaUrl: (id: string) => string | undefined;
}

const pad = (n: number) => String(n).padStart(3, '0');

export function footerText(card: Card, ctx: CardContext): string {
  const code = ctx.edition?.code ?? '';
  return `${pad(card.n)}/${pad(DECK_SIZE)} · ${ctx.lang === 'pt-BR' ? 'PT-BR' : 'EN'}${code ? ` · ${code}` : ''}`;
}

export function typeLine(card: Card, lang: Lang): string {
  const t = card.text[lang] ?? card.text['pt-BR'];
  return [t.type, t.subtype].filter(Boolean).join(' | ');
}

/** Entrada do compose; `forKey` troca URLs por ids estáveis (chave de cache). */
export function cardInput(card: Card, ctx: CardContext, forKey = false): ComposeInput {
  const t = card.text[ctx.lang] ?? card.text['pt-BR'];
  const src = card.art.mediaId ? (forKey ? card.art.mediaId : ctx.mediaUrl(card.art.mediaId)) : undefined;
  const set = ctx.edition?.setMediaId;
  return {
    uid: `k${card.id.slice(-8)}`,
    colors: card.colors.map(colorHex),
    colorId: card.colors[0] ?? ctx.deck.colors[0],
    art: src ? { src, zoom: card.art.zoom, x: card.art.x, y: card.art.y, mirror: card.art.mirror } : undefined,
    name: t.name,
    typeLine: typeLine(card, ctx.lang),
    rules: t.rules,
    flavor: t.flavor,
    footer: footerText(card, ctx),
    // Cópias: o $state do Svelte muda os números dentro do mesmo objeto, e a
    // pré-visualização só percebe a mudança se receber valores novos.
    cost: card.cost.map((p) => ({ resource: p.resource, amount: p.amount, show: p.show ?? 'number' })),
    stats: card.stats ? { atk: card.stats.atk, def: card.stats.def } : null,
    rarity: card.rarity,
    look: mergeLook(ctx.deck.look, card.look),
    setIcon: set ? (forKey ? set : ctx.mediaUrl(set)) : '/brand/logo.png',
  };
}

export function renderKey(card: Card, ctx: CardContext): string {
  return `${RENDER_VERSION}-${hash(JSON.stringify(cardInput(card, ctx, true)))}`;
}
