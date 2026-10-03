import { describe, expect, it } from 'vitest';
import { PROTO_DECKS, buildHero } from '../src/game/decks';
import { apply, heroHp, heroPos, newGame, reachable, unitAt, type Side } from '../src/game/engine';
import { GEAR } from '../src/game/gear';
import type { CardDef, HeroDef } from '../src/game/types';

const side = (i: number, hero?: Partial<HeroDef>): Side => {
  const d = PROTO_DECKS[i];
  const cards: CardDef[] = d.cards.map((c, k) => ({ id: `${d.color}-${k}`, name: c.name, game: c.game }));
  return { hero: { ...d.hero, ...hero }, cards };
};

describe('catálogo de equipamentos', () => {
  it('nenhuma peça repete outra: cada uma tem um perfil próprio', () => {
    const profile = (g: (typeof GEAR)[number]) => JSON.stringify({ slot: g.slot, weapon: g.weapon, armor: g.armor, resist: g.resist, hp: g.hp, strike: g.strike, vigor: g.vigor, mana: g.mana, attrs: g.attrs, dual: g.dual, req: g.req });
    const seen = new Map<string, string>();
    for (const g of GEAR) {
      const p = profile(g);
      expect(seen.get(p), `${g.name[0]} repete ${seen.get(p)}`).toBeUndefined();
      seen.set(p, g.name[0]);
    }
  });
  it('equipar não custa nada e toda peça faz algo no jogo', () => {
    for (const g of GEAR) {
      const does = !!g.weapon || !!g.armor || !!g.resist || !!g.hp || !!g.strike || !!g.vigor || !!g.mana || Object.values(g.attrs ?? {}).some(Boolean);
      expect(does, g.name[0]).toBe(true);
    }
  });
  it('peças pesadas cobram: armadura de placas tira Mana e Vigor e pede Força', () => {
    const plate = GEAR.find((g) => g.key === 'plate')!;
    expect(plate.armor).toBeGreaterThan(3);
    expect(plate.mana).toBeLessThan(0);
    expect(plate.vigor).toBeLessThan(0);
    expect(plate.req?.[0]).toBe('for');
  });
  it('Vigor, Mana e atributos das peças entram no herói (sem passar de zero)', () => {
    const base = structuredClone(PROTO_DECKS[1].hero) as unknown as Parameters<typeof buildHero>[0];
    const h = buildHero({ ...base, baseHp: 30, vigor: 0, mana: 1, gear: [{ slot: 'chest', name: ['x', 'x'], info: ['', ''], mana: -2, vigor: 1, attrs: { int: 1 } }] });
    expect(h.mana).toBe(0);
    expect(h.vigor).toBe(1);
    expect(h.attrs.int).toBe((base.attrs.int ?? 0) + 1);
  });
});

describe('regras novas de golpe', () => {
  it('arma de haste golpeia corpo a corpo da retaguarda', () => {
    const s = newGame(side(0, { row: 1, weapon: { name: ['Alabarda', 'Halberd'], dmg: 5, via: 'melee', hands: 2, reach: true } }), side(1), { seed: 3 });
    expect(heroPos(s, 0).row).toBe(1);
    expect(reachable(s, 0, 'melee', heroPos(s, 0)).length).toBeGreaterThan(0);
    const s2 = newGame(side(0, { row: 1 }), side(1), { seed: 3 });
    expect(reachable(s2, 0, 'melee', heroPos(s2, 0))).toEqual([]);
  });
  it('ataque furtivo só soma contra alvo Marcado ou Afligido; o golpe divino soma dano mágico', () => {
    const vex = PROTO_DECKS.findIndex((d) => d.hero.id === 'vex');
    const sneak = PROTO_DECKS[vex].cards.findIndex((c) => c.game.effects.some((e) => e.k === 'strike' && e.sneak));
    const hit = (marked: boolean) => {
      // (alvo sem armadura, para a conta não esbarrar no dano mínimo)
      const s = newGame(side(vex), side(1, { armor: 0 }), { seed: 9 });
      const foe = heroPos(s, 1);
      if (marked) unitAt(s, foe)!.marked = true;
      s.players[0].hand.unshift({ uid: 'x', cardId: `purple-${sneak}` });
      s.players[0].vigor = 5;
      const before = heroHp(s, 1);
      expect(apply(s, { t: 'play', uid: 'x', target: foe })).toBeNull();
      if (s.pending) apply(s, { t: 'pass' });
      return before - heroHp(s, 1);
    };
    // marcado: +1 da Marca e +3 do ataque furtivo
    expect(hit(true) - hit(false)).toBe(4);

    const ald = PROTO_DECKS.findIndex((d) => d.hero.id === 'aldric');
    const smite = PROTO_DECKS[ald].cards.findIndex((c) => c.game.effects.some((e) => e.k === 'strike' && e.smite));
    const s = newGame(side(ald), side(1), { seed: 9 });
    s.players[0].hand.unshift({ uid: 'y', cardId: `white-${smite}` });
    s.players[0].vigor = 5; s.players[0].mana = 5;
    const before = heroHp(s, 1);
    expect(apply(s, { t: 'play', uid: 'y', target: heroPos(s, 1) })).toBeNull();
    if (s.pending) apply(s, { t: 'pass' });
    expect(s.fx.filter((e) => e.k === 'dmg' && e.via === 'magic').length).toBeGreaterThan(0);
    expect(before - heroHp(s, 1)).toBeGreaterThan(0);
  });
});
