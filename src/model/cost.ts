/**
 * Custo das cartas: uma lista de partes (recurso + quantidade).
 *
 * Ex.: 2 de Vigor + 1 de Mana. Lista vazia = carta sem custo.
 * O custo total (soma) é o que vale na pontuação, no filtro e na curva.
 * Cartas antigas guardavam um único custo ({ resource, amount } ou null):
 * `normalizeCost` converte qualquer formato para a lista.
 */
import type { Card, CostPart, ResourceId } from './types';

/** Quantos custos diferentes cabem numa carta. */
export const MAX_COST_PARTS = 4;

/** Soma das quantidades. */
export function costTotal(card: Pick<Card, 'cost'>): number {
  return (card.cost ?? []).reduce((s, p) => s + p.amount, 0);
}

export function hasCost(card: Pick<Card, 'cost'>): boolean {
  return (card.cost?.length ?? 0) > 0;
}

/** Aceita o formato antigo (objeto ou null) e o novo (lista); devolve sempre a lista. */
export function normalizeCost(raw: unknown): CostPart[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  return list
    .filter((p): p is { resource: string; amount: unknown; show?: unknown } => !!p && typeof p === 'object' && typeof (p as { resource?: unknown }).resource === 'string')
    .map((p) => ({
      resource: p.resource as ResourceId,
      amount: Math.max(0, Math.round(Number(p.amount) || 0)),
      show: p.show === 'repeat' ? 'repeat' as const : 'number' as const,
    }));
}

/** Corrige uma carta vinda do banco ou de um backup (qualquer versão). */
export function normalizeCard<T extends Card>(card: T): T {
  card.cost = normalizeCost(card.cost as unknown);
  return card;
}

/**
 * Faz o total virar `target` mexendo só na primeira parte
 * (as outras ficam como o usuário deixou). Nunca fica negativo.
 */
export function setTotal(cost: CostPart[], target: number): CostPart[] {
  if (!cost.length) return cost;
  const rest = cost.slice(1).reduce((s, p) => s + p.amount, 0);
  return [{ ...cost[0], amount: Math.max(0, target - rest) }, ...cost.slice(1).map((p) => ({ ...p }))];
}

/** Texto curto: "2 Vigor + 1 Mana". */
export function costLabel(cost: CostPart[], name: (r: ResourceId) => string): string {
  return cost.map((p) => `${p.amount} ${name(p.resource)}`).join(' + ');
}
