import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { newGame, type Side } from '../src/game/engine';
import { botAction, botTurn, DIFFICULTIES, EDGE, type Difficulty } from '../src/game/bot';
import type { CardDef } from '../src/game/types';

const side = (i: number): Side => ({ hero: PROTO_DECKS[i].hero, cards: PROTO_DECKS[i].cards.map((c, k): CardDef => ({ id: `${i}-${k}`, name: c.name, game: c.game })) });

/** Joga uma série curta: o nível `lv` (deck a) contra o Difícil (deck b), alternando quem começa. Devolve as vitórias de `lv`. */
function series(lv: Difficulty, games: number): number {
  let wins = 0;
  for (let k = 0; k < games; k++) {
    const a = k % 4, b = (k + 1 + (k >> 2)) % 4 === a ? (a + 2) % 4 : (k + 1 + (k >> 2)) % 4, first = (k % 2) as 0 | 1;
    const e = EDGE[lv];
    const mine: Side = e ? { ...side(a), hero: { ...side(a).hero, maxHp: side(a).hero.maxHp + e.hp }, extraCards: e.cards } : side(a);
    const s = first === 0 ? newGame(mine, side(b), { seed: 900 + k }) : newGame(side(b), mine, { seed: 900 + k });
    let guard = 0;
    while (s.winner === undefined && guard++ < 200) botTurn(s, 40, s.active === first ? lv : 'hard');
    if (s.winner === first) wins++;
  }
  return wins;
}

describe('bot: níveis de dificuldade', () => {
  it('há cinco níveis, do Muito fácil ao Muito difícil', () => {
    expect(DIFFICULTIES.map((d) => d.id)).toEqual(['veryEasy', 'easy', 'normal', 'hard', 'veryHard']);
  });

  it('todos os níveis jogam partidas inteiras sem erro', () => {
    for (const d of DIFFICULTIES) {
      const s = newGame(side(0), side(1), { seed: 77 });
      let guard = 0;
      while (s.winner === undefined && guard++ < 200) botTurn(s, 40, d.id);
      expect(s.winner, d.id).not.toBeUndefined();
    }
  });

  it('a mão inicial do Muito difícil tem uma carta a mais', () => {
    const s = newGame({ ...side(0), extraCards: EDGE.veryHard!.cards }, side(1), { seed: 5, mulligan: true });
    expect(s.players[0].hand.length).toBe(8);
    expect(s.players[1].hand.length).toBe(7);
  });

  it('os níveis fáceis perdem quase sempre para o Difícil; o Muito difícil ganha mais do que perde', () => {
    const n = 24;
    expect(series('veryEasy', n)).toBeLessThanOrEqual(4);
    expect(series('easy', n)).toBeLessThan(n / 2);
    expect(series('veryHard', n)).toBeGreaterThan(n / 2);
  }, 120000);
});

it('o vigia sem recuo ainda escolhe atacar, sem alterar o estado ao decidir', () => {
 const s=newGame({...side(0), cards:[]},{...side(1), cards:[]},{seed:42});
 const before=structuredClone(s);
 expect(botAction(s,'hard',true,{movement:false}).t).toBe('strike');
 expect(s).toEqual(before);
});
