/**
 * Decks de batalha montados pelo jogador (o "inventário de decks") e a posse das cartas
 * (o "inventário de habilidades").
 *
 * Regras do deck: 40 cartas, no máximo 4 cópias de cada (e nunca mais do que o jogador tem).
 * Um deck é de 1 ou 2 classes: leva cartas dessas classes, itens (de qualquer classe) e cartas de chefes.
 *
 * Posse: as cartas dos decks iniciais de classe e os itens já valem 4 cópias. As cartas de
 * recompensa (as que não vêm no deck inicial) e as dos chefes começam em 0: o jogador ganha
 * 1 cópia por vez (Jornada), até 4.
 */
import type { Build, Card, ColorId, Deck } from './types';

export const DECK_SIZE = 40, MAX_COPIES = 4;

export const buildCount = (b: Build): number => Object.values(b.cards).reduce((n, x) => n + x, 0);

/** Quantas cópias da carta o jogador tem. */
export function ownedCopies(card: Card | undefined, deck: Deck | undefined, owned: Record<string, number> | undefined): number {
  if (!card?.game || !deck) return 0;
  if (deck.kind === 'resources') return MAX_COPIES;
  if (deck.kind === 'class' && card.game.copies > 0) return MAX_COPIES;
  return Math.min(MAX_COPIES, owned?.[card.id] ?? 0);
}

/** Classes de um deck montado (os antigos, sem classe gravada: as classes das cartas que ele tem, as 2 mais comuns). */
export function buildColors(b: Build, cards: Record<string, Card>, decks: Deck[]): ColorId[] {
  if (b.colors?.length) return b.colors;
  const count = new Map<ColorId, number>();
  for (const [id, n] of Object.entries(b.cards)) {
    const c = cards[id], d = decks.find((x) => x.id === c?.deckId);
    if (c && d?.kind === 'class') count.set(d.colors[0], (count.get(d.colors[0]) ?? 0) + n);
  }
  return [...count.entries()].sort((a, z) => z[1] - a[1]).slice(0, 2).map((x) => x[0]);
}

/** O deck serve a um herói dessas classes? (todas as classes do deck precisam ser do herói) */
export const buildFits = (b: Build, heroColors: ColorId[]): boolean => !b.colors?.length || b.colors.every((c) => heroColors.includes(c));

/** A carta pode entrar num deck dessas classes? */
export function cardFits(card: Card, deck: Deck | undefined, colors: ColorId[]): boolean {
  if (!card.game || !deck) return false;
  return deck.kind === 'resources' || deck.kind === 'monster' || (deck.kind === 'class' && colors.includes(deck.colors[0]));
}

/** As cartas do deck montado, cada uma com as suas cópias (cartas apagadas da biblioteca ficam de fora). */
export function buildCards(b: Build, cards: Record<string, Card>): Card[] {
  const out: Card[] = [];
  for (const [id, n] of Object.entries(b.cards)) {
    const c = cards[id];
    if (c?.game && n > 0) out.push({ ...c, game: { ...c.game, copies: n } });
  }
  return out;
}

/** O que falta para o deck valer numa batalha (texto), ou null se está pronto. */
export function buildProblem(b: Build, cards: Record<string, Card>): [string, string] | null {
  const n = buildCards(b, cards).reduce((t, c) => t + (c.game?.copies ?? 0), 0);
  if (n !== DECK_SIZE) return [`${n} de ${DECK_SIZE} cartas`, `${n} of ${DECK_SIZE} cards`];
  return null;
}
