import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { apply, emptySlots, heroPos, legalActions, newGame, unitAt, MAX_AFFLICT, type Side } from '../src/game/engine';
import { effectsText } from '../src/game/text';
import type { CardDef, Unit } from '../src/game/types';

const side = (i: number): Side => {
  const d = PROTO_DECKS[i];
  const cards: CardDef[] = d.cards.map((c, k) => ({ id: `${d.color}-${k}`, name: c.name, game: c.game }));
  return { hero: d.hero, cards };
};
const imp = (id: string): Unit => ({ id, name: ['Diabrete', 'Imp'], atk: 2, def: 3, dmg: 0, keys: [], isHero: false, exhausted: false, afflicted: 0, marked: false, warded: false, buff: 0 });

describe('acúmulos e movimento', () => {
  it('a Aflição acumula: cada acúmulo tira 1 PV no começo do turno; a cura limpa tudo', () => {
    const s = newGame(side(0), side(1), { seed: 4 });
    const h = unitAt(s, heroPos(s, 1))!;
    h.afflicted = 3;
    const before = h.dmg;
    apply(s, { t: 'end' }); // começa o turno do jogador 1
    expect(unitAt(s, heroPos(s, 1))!.dmg - before).toBe(3);
    expect(MAX_AFFLICT).toBe(3);
  });

  it('o texto avisa o que acumula e o que não acumula', () => {
    expect(effectsText([{ k: 'afflict', tgt: 'enemy' }], 'pt-BR')).toContain('acumula até 3');
    expect(effectsText([{ k: 'mark', tgt: 'enemy' }], 'pt-BR')).toContain('não acumula');
    expect(effectsText([{ k: 'stance', mods: { strike: 1 } }], 'pt-BR')).toContain('Uma postura por vez');
  });

  it('mover vale para qualquer peça no campo, 1 vez por turno', () => {
    const s = newGame(side(0), side(1), { seed: 5 });
    s.players[0].board[1][0] = imp('i1');
    const from = { p: 0 as const, row: 1, col: 0 };
    expect(legalActions(s).some((a) => a.t === 'move' && a.from?.row === 1 && a.from.col === 0)).toBe(true);
    const to = emptySlots(s, 0).find((q) => q.row === 0)!;
    expect(apply(s, { t: 'move', from, to })).toBeNull();
    expect(unitAt(s, to)?.id).toBe('i1');
    expect(apply(s, { t: 'move', to: emptySlots(s, 0)[0] })).toMatch(/Já moveu/);
  });
});
