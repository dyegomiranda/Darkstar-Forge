import { describe, expect, it } from 'vitest';
import { newGame, apply, heroPos } from '../src/game/engine';
import { PROTO_DECKS } from '../src/game/decks';
import { turnOptions } from '../src/game/turn';
const side = (i: number) => ({ hero: PROTO_DECKS[i].hero, cards: PROTO_DECKS[i].cards.map((c, k) => ({ id: `${i}-${k}`, name: c.name, game: c.game })) });

describe('guia de turno', () => {
  it('reconhece o golpe gratuito e deixa de oferecê-lo depois de usado', () => {
    const s = newGame(side(0), side(0), { seed: 3 });
    expect(turnOptions(s, 0).strike).toBe(true);
    expect(apply(s, { t: 'strike', target: heroPos(s, 1) })).toBeNull();
    expect(turnOptions(s, 0).strike).toBe(false);
    expect(turnOptions(s, 1).cards).toBe(0);
  });
  it('não oferece jogadas durante mão inicial, escolha de nível ou depois da vitória', () => {
    const s = newGame(side(0), side(1), { seed: 1, mulligan: true });
    expect(turnOptions(s, 0).strike).toBe(false);
    s.setup = undefined;
    s.players[0].pendingLevels = 1;
    expect(turnOptions(s, 0).cards).toBe(0);
    s.players[0].pendingLevels = 0;
    s.winner = 0;
    expect(turnOptions(s, 0)).toEqual({ cards: 0, strike: false, attackers: 0, move: false });
  });
});
