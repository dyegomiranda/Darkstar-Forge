/**
 * Esqueleto da carta: onde cada peça fica (espaço 750×1050, proporção MTG 63×88 mm).
 * A caixa de regras cresce para cima; a barra de tipo acompanha.
 */
import type { Box } from './shapes';

export const CARD_W = 750;
export const CARD_H = 1050;
export const CARD_RADIUS = 34;

export interface Skeleton {
  card: Box;
  cost: Box;
  class: Box;
  header: Box;
  typeBar: Box;
  rules: Box;
  atk: Box;
  def: Box;
  footer: Box;
  set: Box;
}

export const RULES_BOTTOM = 944;
export const RULES_MIN_H = 200;
export const RULES_MAX_H = 560;
const TYPE_H = 64;
const TYPE_OVERLAP = 12;

export function skeleton(rulesH: number): Skeleton {
  const h = Math.max(RULES_MIN_H, Math.min(RULES_MAX_H, rulesH));
  const rules = { x: 48, y: RULES_BOTTOM - h, w: 654, h };
  return {
    card: { x: 0, y: 0, w: CARD_W, h: CARD_H },
    cost: { x: 30, y: 40, w: 116, h: 116 },
    class: { x: 604, y: 40, w: 116, h: 116 },
    header: { x: 112, y: 58, w: 526, h: 80 },
    typeBar: { x: 34, y: rules.y - TYPE_H + TYPE_OVERLAP, w: 682, h: TYPE_H },
    rules,
    atk: { x: 462, y: 958, w: 128, h: 72 },
    def: { x: 600, y: 958, w: 128, h: 72 },
    footer: { x: 24, y: 975, w: 266, h: 40 },
    set: { x: 343, y: 962, w: 64, h: 64 },
  };
}
