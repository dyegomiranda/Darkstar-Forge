import { describe, expect, it } from 'vitest';
import pf from '../src/data/pf-cards.json';
import { normalizeCost } from '../src/model/cost';
import { evaluate, mechanic } from '../src/model/scoring';

type PfCard = { deck: string; cost: { amount: number }; stats: { atk: number; def: number } | null; rarity: string; mechanics: string[] };
const cards = pf as PfCard[];

describe('coleção Classes (Pathfinder)', () => {
  it('toda mecânica usada existe na tabela', () => {
    for (const c of cards) for (const m of c.mechanics) expect(mechanic(m), m).toBeTruthy();
  });

  it('a raridade de cada carta bate com a tabela de pontuação', () => {
    for (const c of cards) expect(evaluate({ ...c, cost: normalizeCost(c.cost) } as never).suggestedRarity).toBe(c.rarity);
  });

  it('todos os decks têm a mesma distribuição de raridade e valor parecido', () => {
    const decks = [...new Set(cards.map((c) => c.deck))];
    const value = (d: string) => {
      const xs = cards.filter((c) => c.deck === d);
      return xs.reduce((s, c) => s + evaluate({ ...c, cost: normalizeCost(c.cost) } as never).score - (1 + 2 * c.cost.amount), 0) / xs.length;
    };
    for (const d of decks) {
      const r = cards.filter((c) => c.deck === d).map((c) => c.rarity).sort().join();
      expect(r, d).toBe('common,common,common,common,rare,uncommon,uncommon,uncommon,unique');
    }
    const vs = decks.map(value);
    expect(Math.max(...vs) - Math.min(...vs)).toBeLessThan(0.5);
  });
});
