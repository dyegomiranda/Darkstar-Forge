import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { ICONS } from '../src/render/icons/game-icons';

describe('decks de teste', () => {
  it('cada deck tem 40 cartas (contando cópias), no máximo 4 cópias', () => {
    for (const d of PROTO_DECKS) {
      expect(d.cards.reduce((n, c) => n + c.game.copies, 0), d.color).toBe(40);
      for (const c of d.cards) expect(c.game.copies, c.name[0]).toBeLessThanOrEqual(4);
    }
  });
  it('todos os símbolos usados existem', () => {
    const icons = PROTO_DECKS.flatMap((d) => [d.hero.icon, ...d.cards.map((c) => c.icon), ...d.cards.flatMap((c) => c.game.effects.flatMap((e) => (e.k === 'summon' && e.unit.icon ? [e.unit.icon] : [])))]);
    expect(icons.filter((i) => !ICONS[i])).toEqual([]);
  });
  it('o herói atende os requisitos de atributo das cartas do próprio deck', () => {
    for (const d of PROTO_DECKS) for (const c of d.cards) if (c.game.attr) expect(d.hero.attrs[c.game.attr[0]], `${d.hero.name}: ${c.name[0]}`).toBeGreaterThanOrEqual(c.game.attr[1]);
  });
});

import { ruleCost } from '../src/game/value';
describe('regra de custo', () => {
  it('toda carta do Protótipo custa exatamente o que a regra dá (Vigor + Mana)', () => {
    const off = PROTO_DECKS.flatMap((d) => d.cards.filter((c) => (c.game.vigor ?? 0) + (c.game.mana ?? 0) !== ruleCost(c.game)).map((c) => `${c.name[0]}: custa ${(c.game.vigor ?? 0) + (c.game.mana ?? 0)}, a regra dá ${ruleCost(c.game)}`));
    expect(off).toEqual([]);
  });
});
