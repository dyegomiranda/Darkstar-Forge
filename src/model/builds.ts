/**
 * Decks de batalha montados pelo jogador (o "inventário de decks"). Um deck montado é uma
 * lista de cartas do "inventário de habilidades" (as cartas de jogo da biblioteca) com a
 * quantidade de cada uma. Regras: 40 cartas, no máximo 4 cópias de cada.
 */
import type { Build, Card } from './types';

export const DECK_SIZE = 40, MAX_COPIES = 4;

export const buildCount = (b: Build): number => Object.values(b.cards).reduce((n, x) => n + x, 0);

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
