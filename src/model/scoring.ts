/**
 * Pontuação de balanceamento: ATK + DEF + mecânicas → custo sugerido.
 * Cartas com efeitos de jogo (Mesa de teste) são pontuadas pelos efeitos (ver game/value.ts),
 * com desconto pelo nível e pelo atributo exigidos.
 *
 * Toda carta já vale FREE_POINTS só por ser uma carta na mão; cada
 * POINTS_PER_COST pontos acima disso custam +1. Ex.: criatura 2/2 = 4 pontos → custo 2;
 * 3 de dano = 5 pontos → custo 2. Carta mais barata que o sugerido está
 * "acima da curva" e sobe de raridade.
 */
import mechanicsData from '../data/mechanics.json';
import type { Card, RarityId } from './types';
import { costTotal, hasCost, setTotal } from './cost';
import { gameValue } from '../game/value';

export interface Mechanic { id: string; name: string; en: string; points: number; tags: string[]; desc: string }

export const MECHANICS: Mechanic[] = mechanicsData as Mechanic[];
const byId = new Map(MECHANICS.map((m) => [m.id, m]));
export const mechanic = (id: string) => byId.get(id);

/** Quantos pontos valem 1 de custo. */
export const POINTS_PER_COST = 2;
/** Pontos que a carta tem "de graça" (custo 0). */
export const FREE_POINTS = 1;

export interface Evaluation {
  score: number;
  breakdown: { label: string; points: number }[];
  suggestedCost: number;
  /** Raridade que o custo atual implica. */
  suggestedRarity: RarityId;
}

type Scorable = Pick<Card, 'stats' | 'mechanics' | 'cost'> & Pick<Partial<Card>, 'game'>;

export function evaluate(card: Scorable, labels = { atk: 'Ataque', def: 'Defesa' }): Evaluation {
  const breakdown: Evaluation['breakdown'] = [];
  let score = 0;
  // carta com efeitos de jogo (Mesa): a pontuação sai dos efeitos, do nível e do atributo exigidos
  if (card.game) {
    for (const l of gameValue(card.game)) { score += l.points; breakdown.push(l); }
    score = Math.max(0, score);
    const suggestedCost = costForScore(score);
    const actual = hasCost(card) ? costTotal(card) : suggestedCost;
    return { score, breakdown, suggestedCost, suggestedRarity: rarityFor(suggestedCost, actual) };
  }
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
  const actual = hasCost(card) ? costTotal(card) : suggestedCost;
  return { score, breakdown, suggestedCost, suggestedRarity: rarityFor(suggestedCost, actual) };
}

export function costForScore(score: number): number {
  return score <= FREE_POINTS ? 0 : Math.ceil((score - FREE_POINTS) / POINTS_PER_COST);
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
  if (hasCost(card) && card.costMode === 'auto') card.cost = setTotal(card.cost, ev.suggestedCost);
  if (card.rarityMode === 'auto') card.rarity = rarityFor(ev.suggestedCost, hasCost(card) ? costTotal(card) : ev.suggestedCost);
  return card;
}
