import { describe, expect, it } from 'vitest';
import { applyScoring, costForScore, evaluate, rarityFor } from '../src/model/scoring';
import { card } from './fixtures';

describe('pontuação', () => {
  it('ATK + DEF + mecânicas somam pontos; a cada 3 pontos, +1 de custo', () => {
    const ev = evaluate(card({ stats: { atk: 3, def: 2 }, mechanics: ['haste'] })); // 3 + 2 + 2
    expect(ev.score).toBe(7);
    expect(ev.suggestedCost).toBe(3);
    expect(costForScore(0)).toBe(0);
    expect(costForScore(1)).toBe(1);
  });

  it('custo automático segue a pontuação', () => {
    const c = applyScoring(card({ stats: { atk: 4, def: 4 }, costMode: 'auto' }));
    expect(c.cost?.amount).toBe(3);
  });

  it('custo digitado à mão (manual) nunca é sobrescrito', () => {
    const c = applyScoring(card({ stats: { atk: 4, def: 4 }, cost: { resource: 'vigor', amount: 1 }, costMode: 'manual' }));
    expect(c.cost?.amount).toBe(1);
  });

  it('quanto mais barata que o sugerido, mais rara (raridade automática)', () => {
    expect(rarityFor(3, 3)).toBe('common');
    expect(rarityFor(3, 2)).toBe('uncommon');
    expect(rarityFor(3, 1)).toBe('rare');
    expect(rarityFor(4, 1)).toBe('unique');
    const c = applyScoring(card({ stats: { atk: 4, def: 4 }, cost: { resource: 'vigor', amount: 1 }, costMode: 'manual', rarityMode: 'auto' }));
    expect(c.rarity).toBe('rare');
  });

  it('raridade manual é respeitada', () => {
    const c = applyScoring(card({ rarity: 'unique', rarityMode: 'manual' }));
    expect(c.rarity).toBe('unique');
  });
});
