import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { apply, cannotPlay, emptySlots, heroHp, heroPos, legalActions, newGame, playableRanks, unitAt, MAX_AFFLICT, MAX_COLS, type Side } from '../src/game/engine';
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

  it('evolução: liberada pelo nível, cobra o custo dela e o jogador pode jogar a versão básica', () => {
    const foeSide = side(1);
    const s = newGame(side(0), { ...foeSide, hero: { ...foeSide.hero, armor: 0 } }, { seed: 6 });
    const k = PROTO_DECKS[0].cards.findIndex((c) => c.name[1] === 'Brutal Strike');
    s.players[0].hand.unshift({ uid: 'x', cardId: `red-${k}` }, { uid: 'y', cardId: `red-${k}` });
    expect(playableRanks(s, 0, 'x')).toEqual([0]);
    expect(cannotPlay(s, 0, 'x', 1)).toMatch(/nível 3/);
    s.players[0].level = 3;
    expect(playableRanks(s, 0, 'x')).toEqual([0, 1]);
    const foe = heroPos(s, 1), v = s.players[0].vigor, hp = heroHp(s, 1);
    expect(apply(s, { t: 'play', uid: 'x', rank: 1, target: foe })).toBeNull();
    if (s.pending) apply(s, { t: 'pass' });
    expect(v - s.players[0].vigor).toBe(2);
    const strong = hp - heroHp(s, 1);
    const hp2 = heroHp(s, 1);
    expect(apply(s, { t: 'play', uid: 'y', target: foe })).toBeNull();
    if (s.pending) apply(s, { t: 'pass' });
    expect(strong - (hp2 - heroHp(s, 1))).toBe(2);
  });

  it('abrir o campo: a carta dá uma coluna a mais (até o limite)', () => {
    const s = newGame(side(2), side(1), { seed: 6 });
    const k = PROTO_DECKS[2].cards.findIndex((c) => c.name[1] === 'Hunting Grounds');
    s.players[0].hand.unshift({ uid: 'x', cardId: `green-${k}` });
    s.players[0].vigor = 3;
    expect(apply(s, { t: 'play', uid: 'x' })).toBeNull();
    if (s.pending) apply(s, { t: 'pass' });
    expect(s.players[0].board.map((r) => r.length)).toEqual([4, 4]);
    expect(emptySlots(s, 0).length).toBe(7);
    expect(MAX_COLS).toBe(5);
  });

  it('progressão: heróis entram no nível dado, sem XP na partida; vida reduzida no modo de teste', () => {
    const s = newGame(side(0), side(1), { seed: 6, start: [{ level: 4, vigor: 2, mana: 0, vida: 3 }, undefined], hpScale: 0.6 });
    expect(s.players[0].level).toBe(4);
    expect(s.players[0].maxVigor).toBe(PROTO_DECKS[0].hero.vigor + 2);
    expect(heroHp(s, 0)).toBe(Math.round((PROTO_DECKS[0].hero.maxHp + 3) * 0.6));
    apply(s, { t: 'end' }); apply(s, { t: 'end' });
    expect(s.players[0].xp).toBe(0);
  });
});
