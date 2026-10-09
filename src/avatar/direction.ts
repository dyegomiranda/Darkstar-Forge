import type { Dir } from './lpc';
export type Facing = Dir | 'ne' | 'se' | 'sw' | 'nw';
export const EIGHT_DIRECTIONS: Facing[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
export function facing(dx: number, dy: number, previous: Facing = 's'): Facing {
  if (!dx && !dy) return previous;
  return EIGHT_DIRECTIONS[(Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8];
}
/** Compatibilidade com o acervo LPC de quatro vistas; novos atlas podem fornecer a ordem das oito linhas. */
export function directionRow(direction: Facing, rows: readonly Facing[] = ['n', 'w', 's', 'e']): number {
  const exact = rows.indexOf(direction);
  if (exact >= 0) return exact;
  const fallback: Record<Facing, Dir> = { n: 'n', ne: 'e', e: 'e', se: 'e', s: 's', sw: 'w', w: 'w', nw: 'w' };
  return Math.max(0, rows.indexOf(fallback[direction]));
}
