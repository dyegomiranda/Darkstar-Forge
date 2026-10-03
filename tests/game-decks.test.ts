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
  it('cada evolução segue a mesma regra, exige nível maior e vale mais que a versão anterior', async () => {
    const { gamePoints, rankGame } = await import('../src/game/value');
    const bad: string[] = [];
    for (const d of PROTO_DECKS) for (const c of d.cards) (c.game.ranks ?? []).forEach((r, i) => {
      const g = rankGame(c.game, i + 1), prev = rankGame(c.game, i);
      if ((r.vigor ?? 0) + (r.mana ?? 0) !== ruleCost(g)) bad.push(`${c.name[0]} Nv ${r.level}: custo fora da regra`);
      if (r.level <= prev.level) bad.push(`${c.name[0]} Nv ${r.level}: nível não cresce`);
      if (gamePoints({ ...g, level: 1 }) <= gamePoints({ ...prev, level: 1 })) bad.push(`${c.name[0]} Nv ${r.level}: não vale mais que a anterior`);
    });
    expect(bad).toEqual([]);
  });
});

describe('curva de poder', () => {
  it('nenhuma carta vale menos que outra mais barata e de nível menor (ou igual) do mesmo deck', async () => {
    const { gameValue } = await import('../src/game/value');
    // o valor dos efeitos, sem os descontos (nível, atributo): é o poder da carta na mesa
    const raw = (g: Parameters<typeof gameValue>[0]) => gameValue(g).filter((l) => !/Exige|Reação|Item/.test(l.label)).reduce((n, l) => n + l.points, 0);
    const bad: string[] = [];
    for (const d of PROTO_DECKS) {
      const cs = d.cards.filter((c) => c.game.kind !== 'item' && c.game.kind !== 'reacao').map((c) => ({ n: c.name[0], lv: c.game.level, cost: (c.game.vigor ?? 0) + (c.game.mana ?? 0), raw: raw(c.game) }));
      for (const a of cs) for (const b of cs) if (a !== b && a.lv <= b.lv && a.cost <= b.cost && (a.lv < b.lv || a.cost < b.cost) && a.raw > b.raw) bad.push(`${d.hero.name}: ${a.n} (nível ${a.lv}, custo ${a.cost}) vale mais que ${b.n} (nível ${b.lv}, custo ${b.cost})`);
    }
    expect(bad).toEqual([]);
  });
});

describe('equipamento vem das cartas vestidas', () => {
  it('o herói pronto, montado pelas cartas de equipamento, é igual ao do modelo', async () => {
    const { heroBaseOf, presetSlots, protoEquipment } = await import('../src/model/equipment');
    const { buildHero, HERO_BASES } = await import('../src/game/decks');
    const cards = Object.fromEntries(protoEquipment('proto1').cards.map((c) => [c.id, c]));
    for (const b of HERO_BASES) {
      const ch = { id: b.id, name: b.name, raceId: '', classColors: [], level: 1, hp: 30, stats: {} as never, slots: presetSlots(b.id), notes: '', play: b };
      const a = buildHero(heroBaseOf(ch, cards)), ref = buildHero(b);
      expect([a.maxHp, a.armor, a.resist, a.weapon.dmg, a.weapon.via]).toEqual([ref.maxHp, ref.armor, ref.resist, ref.weapon.dmg, ref.weapon.via]);
      expect(a.weapon.name).toEqual(ref.weapon.name);
    }
  });

  it('sem arma vestida o golpe é o desarmado; trocar a carta muda o herói', async () => {
    const { heroBaseOf, presetSlots, protoEquipment } = await import('../src/model/equipment');
    const { buildHero, HERO_BASES } = await import('../src/game/decks');
    const cards = Object.fromEntries(protoEquipment('proto1').cards.map((c) => [c.id, c]));
    const b = HERO_BASES[0];
    const slots = presetSlots(b.id);
    const full = buildHero(heroBaseOf({ id: 'x', name: 'X', raceId: '', classColors: [], level: 1, hp: 30, stats: {} as never, slots, notes: '', play: b }, cards));
    delete slots.mainHand; delete slots.chest;
    const bare = buildHero(heroBaseOf({ id: 'x', name: 'X', raceId: '', classColors: [], level: 1, hp: 30, stats: {} as never, slots, notes: '', play: b }, cards));
    // desarmado: golpe 1, mais o que as outras peças vestidas somam ao golpe
    expect(bare.weapon.name[0]).toBe('Desarmado');
    expect(bare.weapon.dmg).toBeLessThan(full.weapon.dmg);
    expect(bare.maxHp).toBeLessThan(full.maxHp);
    expect(bare.armor).toBeLessThan(full.armor);
  });

  it('ficha antiga: arma e peças viram cartas vestidas; o que foi alterado ganha carta própria', async () => {
    const { migrateGear, protoEquipment, heroBaseOf } = await import('../src/model/equipment');
    const { buildHero, HERO_BASES } = await import('../src/game/decks');
    const cards = Object.fromEntries(protoEquipment('proto1').cards.map((c) => [c.id, c]));
    const play = structuredClone(HERO_BASES[1]);
    const gi = play.gear.findIndex((g) => g.slot !== 'weapon');
    play.gear[gi] = { ...play.gear[gi], name: ['Chapéu torto', 'Crooked hat'], resist: 2 };
    const ch = { id: 'k', name: 'K', raceId: '', classColors: [], level: 1, hp: 30, stats: {} as never, slots: {}, notes: '', play };
    let n = 100;
    const made = migrateGear(ch, cards, 'proto-equipment', () => ++n);
    expect(made).toHaveLength(1);
    expect(made[0].text['pt-BR'].name).toBe('Chapéu torto');
    for (const c of made) cards[c.id] = c;
    expect(Object.keys(ch.slots)).toHaveLength(1 + play.gear.filter((g) => g.slot !== 'weapon').length);
    const a = buildHero(heroBaseOf(ch, cards)), ref = buildHero(play);
    expect([a.maxHp, a.armor, a.resist, a.weapon.dmg]).toEqual([ref.maxHp, ref.armor, ref.resist, ref.weapon.dmg]);
  });
});
