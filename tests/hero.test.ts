import { describe, expect, it } from 'vitest';
import { blankHero, BUILDS, buildStats, canLower, canRaise, gameAttrs, pointsLeft, setRace, STAT_MAX, STAT_POINTS, statBase, STATS, upgradeHero } from '../src/model/hero';
import { presetHeroes } from '../src/model/seed';
import { heroBaseOf } from '../src/model/equipment';
import type { Deck } from '../src/model/types';

const deck = (id: string, color: string): Deck => ({ id, editionId: 'e', name: { 'pt-BR': id, 'en-US': id }, kind: 'class', colors: [color as never], look: { style: 'neutro' } as never, order: 0 });
const DECKS = [deck('proto-red', 'red'), deck('proto-blue', 'blue')];

describe('ficha do herói', () => {
  it('herói novo: humano, sem pontos gastos, pronto para batalhar e com boneco', () => {
    const c = blankHero('blue', DECKS);
    expect(c.raceId).toBe('human');
    expect(pointsLeft(c)).toBe(STAT_POINTS);
    expect(c.play?.deckId).toBe('proto-blue');
    expect(c.play!.vigor + c.play!.mana).toBe(3);
    expect(c.avatar).toBeTruthy();
    expect(c.slots).toEqual({});
  });

  it('os pontos acabam: não dá para distribuir além do total nem passar do máximo', () => {
    const c = blankHero('red', DECKS);
    // humano: FOR começa em 12
    expect(statBase(c, 'str')).toBe(12);
    while (canRaise(c, 'str')) c.stats.str++;
    expect(c.stats.str).toBe(STAT_MAX);
    for (const s of ['dex', 'con', 'int', 'wis'] as const) while (canRaise(c, s)) c.stats[s]++;
    expect(pointsLeft(c)).toBe(0);
    expect(canRaise(c, 'cha')).toBe(false);
    // baixar abaixo do valor de partida é permitido (até 2), mas não devolve pontos
    while (canLower(c, 'cha')) c.stats.cha--;
    expect(c.stats.cha).toBe(statBase(c, 'cha') - 2);
    expect(pointsLeft(c)).toBe(0);
  });

  it('trocar a ancestralidade troca os bônus e preserva o que foi distribuído', () => {
    const c = blankHero('red', DECKS);
    c.stats.con += 4;
    const spent = STAT_POINTS - pointsLeft(c);
    const hp = c.play!.baseHp;
    setRace(c, 'dwarf'); // +2 CON, +2 SAB, −2 CAR; aguenta mais que o humano
    expect(STAT_POINTS - pointsLeft(c)).toBe(spent);
    expect(c.stats.con).toBe(10 + 2 + 4);
    expect(c.stats.cha).toBe(8);
    expect(c.play!.baseHp).toBe(hp + 2);
  });

  it('os atributos de jogo são os modificadores da ficha (o que as cartas pedem)', () => {
    const c = blankHero('red', DECKS);
    c.stats = { str: 18, dex: 12, con: 16, int: 10, wis: 13, cha: 8 };
    expect(gameAttrs(c)).toEqual({ for: 4, des: 1, con: 3, int: 0, sab: 1, car: 0 });
    expect(heroBaseOf(c, {}).attrs.for).toBe(4);
  });

  it('os 4 heróis prontos cabem nas regras: 18 pontos, sem estourar', () => {
    for (const h of presetHeroes()) {
      expect(pointsLeft(h), h.name).toBe(0);
      expect(gameAttrs(h), h.name).toEqual(h.play!.attrs);
    }
  });

  it('sugestões de atributos: gastam os 18 pontos, sem passar do máximo, em qualquer ancestralidade', () => {
    for (const race of ['human', 'elf', 'dwarf', 'orc', 'tiefling', '']) {
      for (const b of BUILDS) {
        const c = blankHero('red', DECKS);
        setRace(c, race);
        c.stats = buildStats(c, b);
        expect(pointsLeft(c), `${b.id}/${race}`).toBe(0);
        for (const st of STATS) expect(c.stats[st.id], `${b.id}/${race}/${st.id}`).toBeLessThanOrEqual(STAT_MAX);
      }
    }
  });

  it('ficha antiga sem dados de jogo ganha os da classe e passa a poder batalhar', () => {
    const c = blankHero('blue', DECKS);
    delete c.play;
    upgradeHero(c, DECKS);
    expect(c.play?.deckId).toBe('proto-blue');
  });

  it('ficha antiga com atributos de jogo soltos: eles passam para a ficha', () => {
    const c = blankHero('red', DECKS);
    c.raceId = '';
    c.stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    c.play!.attrs = { for: 3, des: 0, con: 2, int: 0, sab: 0, car: 0 };
    upgradeHero(c, DECKS);
    expect(gameAttrs(c)).toEqual({ for: 3, des: 0, con: 2, int: 0, sab: 0, car: 0 });
  });
});
