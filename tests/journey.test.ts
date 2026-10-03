import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { applyResult, choose, foeLevel, foeStart, isBoss, journeyDeck, newJourney, unlocksAt, xpReward, xpToNext, DECK_SIZE } from '../src/game/journey';
import type { CardDef } from '../src/game/types';

const defs = (i: number): CardDef[] => PROTO_DECKS[i].cards.map((c, k) => ({ id: `${PROTO_DECKS[i].color}-${k}`, name: c.name, game: c.game }));

describe('Jornada', () => {
  it('cada nível pede mais XP e cada etapa dá mais XP', () => {
    for (let l = 1; l < 12; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
    for (let s = 1; s < 12; s++) if (!isBoss(s) && !isBoss(s + 1)) expect(xpReward(s + 1, true)).toBeGreaterThan(xpReward(s, true));
    expect(xpReward(5, true)).toBeGreaterThan(xpReward(6, true)); // o chefe dá mais
    expect(xpReward(3, false)).toBeLessThan(xpReward(3, true));
  });

  it('vencer avança a etapa e soma XP; perder mantém a etapa; o nível novo espera a escolha', () => {
    const j = newJourney();
    applyResult(j, false);
    expect([j.stage, j.losses, j.level]).toEqual([1, 1, 1]);
    let ups = 0;
    for (let i = 0; i < 6; i++) ups += applyResult(j, true).levels;
    expect(j.stage).toBe(7);
    expect(j.level).toBe(1 + ups);
    expect(j.level).toBeGreaterThan(2);
    expect(j.pending).toBe(ups);
    choose(j, 'vigor'); choose(j, 'vida');
    expect([j.vigor, j.vida, j.pending]).toEqual([1, 3, ups - 2]);
  });

  it('o deck acompanha o nível: só cartas liberadas, sempre 40', () => {
    for (let i = 0; i < PROTO_DECKS.length; i++) for (const lv of [1, 2, 3, 5, 8]) {
      const d = journeyDeck(defs(i), lv);
      expect(d.every((c) => c.game.level <= lv)).toBe(true);
      expect(d.reduce((n, c) => n + c.game.copies, 0)).toBeGreaterThanOrEqual(DECK_SIZE);
    }
    // não mexe nas cartas originais
    expect(PROTO_DECKS[0].cards.reduce((n, c) => n + c.game.copies, 0)).toBe(40);
  });

  it('diz o que cada nível libera (cartas e evoluções)', () => {
    const u = unlocksAt(defs(0), 3);
    expect(u.cards.map((c) => c.name[1])).toContain('Devastating Blow');
    expect(u.ranks.map((c) => c.name[1])).toContain('Brutal Strike');
  });

  it('o oponente cresce com as etapas e o chefe é mais forte', () => {
    expect(foeLevel(1)).toBe(1);
    expect(foeLevel(9)).toBeGreaterThan(foeLevel(3));
    const h = PROTO_DECKS[0].hero;
    expect(foeStart(h, 5).vida).toBeGreaterThan(foeStart(h, 4).vida);
    const s = foeStart(h, 9);
    expect(s.vigor + s.mana + s.vida / 3).toBe(s.level - 1);
  });
});
