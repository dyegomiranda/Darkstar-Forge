import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { addXp, applyResult, available, choose, foeLevel, foeStart, generateMap, journeyDeck, minionOf, newJourney, rewardChoices, rng, unlocksAt, xpReward, xpToNext, DECK_SIZE, LAYERS } from '../src/game/journey';
import type { CardDef } from '../src/game/types';

const defs = (i: number): CardDef[] => PROTO_DECKS[i].cards.map((c, k) => ({ id: `${PROTO_DECKS[i].color}-${k}`, name: c.name, game: c.game }));
const FOES = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ id, biome: ['floresta', 'neve', 'cripta', 'deserto', 'campo', 'masmorra'][i] }));
const BOSS = { id: 'dragon', biome: 'vulcao' };

describe('Jornada', () => {
  it('cada nível pede mais XP; mais fundo no mapa dá mais XP; o chefe dá o dobro', () => {
    for (let l = 1; l < 12; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
    for (let d = 1; d < 20; d++) expect(xpReward(d + 1, true)).toBeGreaterThan(xpReward(d, true));
    expect(xpReward(8, true, true)).toBe(2 * xpReward(8, true));
    expect(xpReward(3, false)).toBeLessThan(xpReward(3, true));
  });

  it('o mapa muda a cada semente e é sempre jogável: todo caminho chega ao chefe', () => {
    const shapes = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateMap(seed, FOES, BOSS);
      shapes.add(m.nodes.map((n) => `${n.layer}.${n.lane}.${n.kind[0]}`).join(' '));
      const boss = m.nodes[m.nodes.length - 1];
      expect(boss.kind).toBe('boss');
      expect(available(m).length).toBeGreaterThanOrEqual(2);
      expect(available(m).every((n) => n.layer === 0 && n.kind !== 'training' && n.kind !== 'boss')).toBe(true);
      // de qualquer ponto, andando só para frente, chega-se ao chefe
      for (const n of m.nodes) { let at = n; while (at.kind !== 'boss') { expect(at.next.length, `semente ${seed}, nó ${at.id}`).toBeGreaterThan(0); expect(m.nodes[at.next[0]].layer).toBe(at.layer + 1); at = m.nodes[at.next[0]]; } }
      const trains = m.nodes.filter((n) => n.kind === 'training');
      expect(trains.length).toBeGreaterThanOrEqual(3);
      // nunca dois treinos seguidos
      for (const t of trains) expect(t.next.some((c) => m.nodes[c].kind === 'training')).toBe(false);
      expect(m.nodes.every((n) => !!n.biome)).toBe(true);
      // um mini-chefe por bioma, no máximo: nenhum herói se repete
      const elites = m.nodes.filter((n) => n.kind === 'elite').map((n) => n.foe);
      expect(new Set(elites).size).toBe(elites.length);
      expect(elites.length).toBeGreaterThanOrEqual(3);
      expect(m.nodes.every((n) => n.x > 0 && n.x < 1 && n.y > 0 && n.y < 1)).toBe(true);
    }
    expect(shapes.size).toBeGreaterThan(35);
    expect(generateMap(7, FOES, BOSS)).toEqual(generateMap(7, FOES, BOSS));
  });

  it('vencer conclui o ponto e abre os seguintes; perder mantém o lugar; vencer o chefe encerra o mapa', () => {
    const j = newJourney();
    j.map = generateMap(11, FOES, BOSS);
    const first = available(j.map)[0];
    applyResult(j, first, false);
    expect([j.map.at, j.losses, j.wins]).toEqual([null, 1, 0]);
    expect(applyResult(j, first, false, true).xp).toBe(0); // desistir não dá XP
    applyResult(j, first, true);
    expect(j.map.at).toBe(first.id);
    expect(available(j.map).map((n) => n.id)).toEqual(first.next);
    let at = first;
    while (at.kind !== 'boss') { at = j.map!.nodes[at.next[0]]; applyResult(j, at, true); }
    expect(j.map).toBeUndefined();
    expect(j.tier).toBe(1);
    expect(j.wins).toBe(LAYERS + 1);
    expect(j.level).toBeGreaterThan(2);
    const p = j.pending;
    choose(j, 'vigor'); choose(j, 'vida');
    expect([j.vigor, j.vida, j.pending]).toEqual([1, 3, p - 2]);
    const k = newJourney(); expect(addXp(k, 40)).toBe(1);
  });

  it('o deck acompanha o nível: só cartas liberadas, 40 cartas, nunca mais de 4 cópias', () => {
    for (let i = 0; i < PROTO_DECKS.length; i++) for (const lv of [1, 2, 3, 5, 8]) {
      const d = journeyDeck(defs(i), lv);
      expect(d.every((c) => c.game.level <= lv && c.game.copies <= 4), PROTO_DECKS[i].color).toBe(true);
      expect(d.reduce((n, c) => n + c.game.copies, 0), `${PROTO_DECKS[i].color} nível ${lv}`).toBe(DECK_SIZE);
    }
    // não mexe nas cartas originais
    expect(PROTO_DECKS[0].cards.reduce((n, c) => n + c.game.copies, 0)).toBe(40);
  });

  it('diz o que cada nível libera (cartas e evoluções)', () => {
    const u = unlocksAt(defs(0).filter((c) => c.game.copies > 0), 3);
    expect(u.cards.map((c) => c.name[1])).toContain('Devastating Blow');
    expect(u.ranks.map((c) => c.name[1])).toContain('Brutal Strike');
  });

  it('recompensas: até 3 cartas, nunca uma que o jogador já tem 4 cópias, de preferência do nível do herói', () => {
    const pool = [1, 1, 1, 1, 2, 3, 4, 5].map((level, i) => ({ id: `c${i}`, level }));
    const have = (id: string) => (id === 'c0' ? 4 : 0);
    for (let s = 1; s < 30; s++) {
      const got = rewardChoices(pool, 1, have, rng(s));
      expect(got.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3']);
    }
    expect(rewardChoices(pool, 5, () => 4, rng(1))).toEqual([]);
    expect(rewardChoices(pool, 3, have, rng(2))[0].level).toBe(3);
  });

  it('o oponente cresce com a profundidade e o chefe é mais forte', () => {
    expect(foeLevel(1)).toBe(1);
    expect(foeLevel(9)).toBeGreaterThan(foeLevel(3));
    const h = PROTO_DECKS[0].hero;
    expect(foeStart(h, 8, true).vida).toBeGreaterThan(foeStart(h, 8).vida);
    const mn = minionOf(h, 'm', 'Orc');
    expect(mn.maxHp).toBeLessThan(h.maxHp * 0.7);
    expect(mn.attrs.for).toBe(h.attrs.for - 1);
    expect(xpReward(4, true, false, true)).toBeGreaterThan(xpReward(4, true));
    const s = foeStart(h, 9);
    expect(s.vigor + s.mana + s.vida / 3).toBe(s.level - 1);
  });
});
