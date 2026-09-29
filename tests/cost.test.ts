import { describe, expect, it } from 'vitest';
import { costTotal, normalizeCard, normalizeCost, setTotal } from '../src/model/cost';
import { applyScoring } from '../src/model/scoring';
import { cardInput } from '../src/render/card';
import { planCost } from '../src/render/costSeal';
import { card, deck } from './fixtures';

const ctx = { deck: deck(), lang: 'pt-BR' as const, mediaUrl: () => '' };
const numW = (t: string, size: number) => t.length * size * 0.6;

describe('custos (vários recursos por carta)', () => {
  it('carta antiga (um custo só, ou sem custo) vira lista', () => {
    expect(normalizeCost({ resource: 'mana', amount: 3 })).toEqual([{ resource: 'mana', amount: 3, show: 'number' }]);
    expect(normalizeCost(null)).toEqual([]);
    expect(normalizeCost(undefined)).toEqual([]);
    const old = normalizeCard(card({ cost: { resource: 'vigor', amount: 2 } as never }));
    expect(costTotal(old)).toBe(2);
  });

  it('custo total é a soma', () => {
    expect(costTotal(card({ cost: [{ resource: 'vigor', amount: 2 }, { resource: 'mana', amount: 1 }] }))).toBe(3);
    expect(costTotal(card({ cost: [] }))).toBe(0);
  });

  it('no automático, só a primeira parte muda para o total bater', () => {
    expect(setTotal([{ resource: 'vigor', amount: 1 }, { resource: 'mana', amount: 2 }], 5).map((p) => p.amount)).toEqual([3, 2]);
    expect(setTotal([{ resource: 'vigor', amount: 1 }, { resource: 'mana', amount: 4 }], 2).map((p) => p.amount)).toEqual([0, 4]);
    const c = applyScoring(card({ stats: { atk: 4, def: 4 }, cost: [{ resource: 'vigor', amount: 1 }, { resource: 'mana', amount: 1 }], costMode: 'auto' }));
    expect(costTotal(c)).toBe(4);
  });

  it('a pré-visualização recebe cópias novas de custo e ATK/DEF (senão não redesenha)', () => {
    const c = card({ stats: { atk: 2, def: 3 } });
    const a = cardInput(c, ctx);
    expect(a.cost).not.toBe(c.cost);
    expect(a.cost![0]).not.toBe(c.cost[0]);
    expect(a.stats).not.toBe(c.stats);
    c.cost[0].amount = 5;
    c.stats!.atk = 9;
    const b = cardInput(c, ctx);
    expect(b.cost![0].amount).toBe(5);
    expect(b.stats!.atk).toBe(9);
    expect(a.cost![0].amount).toBe(1);
  });

  it('selo: mais custos → símbolos menores; muitos → duas fileiras', () => {
    const one = planCost([{ resource: 'vigor', amount: 3 }], 80, numW, 46, 280);
    const two = planCost([{ resource: 'vigor', amount: 2 }, { resource: 'mana', amount: 1 }], 80, numW, 46, 280);
    expect(one.rows).toBe(1);
    expect(two.units[0].s).toBeLessThan(one.units[0].s);
    expect(two.width).toBeGreaterThan(one.width);
    const rep = planCost([{ resource: 'vigor', amount: 3, show: 'repeat' }], 80, numW, 46, 280);
    expect(rep.units).toHaveLength(3);
    expect(rep.units.every((u) => !u.num)).toBe(true);
    const many = planCost([{ resource: 'vigor', amount: 6, show: 'repeat' }, { resource: 'mana', amount: 6, show: 'repeat' }], 80, numW, 46, 200);
    expect(many.rows).toBe(2);
    expect(many.width).toBeLessThanOrEqual(200);
  });
});
