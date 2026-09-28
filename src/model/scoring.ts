/**
 * Pontuação de balanceamento: ATK + DEF + mecânicas → custo sugerido.
 * Carta mais barata que o sugerido está "acima da curva" e sobe de raridade.
 */
import mechanicsData from '../data/mechanics.json';
import type { Card, RarityId } from './types';

export interface Mechanic { id: string; name: string; points: number; tags: string[]; desc: string }

export const MECHANICS: Mechanic[] = mechanicsData as Mechanic[];
const byId = new Map(MECHANICS.map((m) => [m.id, m]));
export const mechanic = (id: string) => byId.get(id);

/** Quantos pontos valem 1 de custo. */
export const POINTS_PER_COST = 3;

export interface Evaluation {
  score: number;
  breakdown: { label: string; points: number }[];
  suggestedCost: number;
  /** Raridade que o custo atual implica. */
  suggestedRarity: RarityId;
}

type Scorable = Pick<Card, 'stats' | 'mechanics' | 'cost'>;

export function evaluate(card: Scorable, labels = { atk: 'Ataque', def: 'Defesa' }): Evaluation {
  const breakdown: Evaluation['breakdown'] = [];
  let score = 0;
  if (card.stats) {
    if (card.stats.atk) { score += card.stats.atk; breakdown.push({ label: `${labels.atk} ${card.stats.atk}`, points: card.stats.atk }); }
    if (card.stats.def) { score += card.stats.def; breakdown.push({ label: `${labels.def} ${card.stats.def}`, points: card.stats.def }); }
  }
  for (const id of card.mechanics) {
    const m = byId.get(id);
    if (!m) continue;
    score += m.points;
    breakdown.push({ label: m.name, points: m.points });
  }
  score = Math.max(0, score);
  const suggestedCost = costForScore(score);
  const actual = card.cost?.amount ?? suggestedCost;
  return { score, breakdown, suggestedCost, suggestedRarity: rarityFor(suggestedCost, actual) };
}

export function costForScore(score: number): number {
  return score <= 0 ? 0 : Math.max(1, Math.ceil(score / POINTS_PER_COST));
}

/** Quanto mais barata que o sugerido, mais rara. */
export function rarityFor(suggested: number, actual: number): RarityId {
  const diff = suggested - actual;
  if (diff <= 0) return 'common';
  if (diff === 1) return 'uncommon';
  if (diff === 2) return 'rare';
  return 'unique';
}

/**
 * Aplica o que estiver em modo automático. Não mexe no que o usuário fixou:
 * custo manual fica como está; raridade manual fica como está.
 */
export function applyScoring<T extends Card>(card: T): T {
  const ev = evaluate(card);
  if (card.cost && card.costMode === 'auto') card.cost = { ...card.cost, amount: ev.suggestedCost };
  if (card.rarityMode === 'auto') card.rarity = rarityFor(ev.suggestedCost, card.cost?.amount ?? ev.suggestedCost);
  return card;
}
