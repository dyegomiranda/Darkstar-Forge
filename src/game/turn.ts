/** Informação pública sobre o turno: usa as mesmas regras que validam as jogadas. */
import { legalActions, playableRanks } from './engine';
import type { GameState } from './types';

export function turnOptions(s: GameState, p: 0 | 1): { cards: number; strike: boolean; attackers: number; move: boolean } {
  if (s.active !== p || s.setup || s.pending || s.winner !== undefined || s.players[p].pendingLevels)
    return { cards: 0, strike: false, attackers: 0, move: false };
  const actions = legalActions(s);
  return {
    cards: s.players[p].hand.filter((c) => playableRanks(s, p, c.uid).length > 0).length,
    strike: actions.some((a) => a.t === 'strike'),
    attackers: new Set(actions.flatMap((a) => a.t === 'attack' ? [`${a.from.row}:${a.from.col}`] : [])).size,
    move: actions.some((a) => a.t === 'move'),
  };
}
