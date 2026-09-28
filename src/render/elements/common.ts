/** Peças de ornamento reaproveitadas pelos estilos. */
import { darken, lighten, mix } from '../color';
import { layers, type Defs } from '../defs';
import type { Palette } from '../palette';
import { circle, diamond, poly, type Box } from '../shapes';

/** Faixa de metal com relevo (a forma é externa+interna, evenodd). */
export function metalBand(defs: Defs, pal: Palette, d: string, depth = 2.5, extra = ''): string {
  return `<g filter="${defs.bevel(depth)}"${extra}>${layers(d, defs.metal(pal), ' fill-rule="evenodd"')}</g>`;
}

/** Forma sólida de metal com relevo (cravos, espinhos). */
export function metalSolid(defs: Defs, pal: Palette, d: string, depth = 1.6): string {
  return `<g filter="${defs.bevel(depth, 0.9)}">${layers(d, defs.metal(pal))}</g>`;
}

/** Joia lapidada em losango, com quatro facetas e um brilho. */
export function gem(cx: number, cy: number, rx: number, ry: number, color: string): string {
  const t = [cx, cy - ry], r = [cx + rx, cy], b = [cx, cy + ry], l = [cx - rx, cy];
  const c = [cx, cy - ry * 0.12];
  const tri = (p: number[], q: number[], fill: string) => `<path d="${poly([[p[0], p[1]], [q[0], q[1]], [c[0], c[1]]] as [number, number][])}" fill="${fill}"/>`;
  return `<g>` +
    `<path d="${diamond(cx, cy, rx + 1.6, ry + 1.6)}" fill="${darken(color, 0.72)}"/>` +
    tri(l, t, lighten(color, 0.55)) + tri(t, r, lighten(color, 0.18)) +
    tri(r, b, darken(color, 0.38)) + tri(b, l, darken(color, 0.12)) +
    `<path d="${diamond(cx - rx * 0.28, cy - ry * 0.4, rx * 0.16, ry * 0.12)}" fill="#fff" opacity=".85"/>` +
    `</g>`;
}

/** Joia redonda (cabochão). */
export function cabochon(cx: number, cy: number, r: number, color: string, defs: Defs): string {
  const fill = defs.radial([[0, lighten(color, 0.55)], [0.45, color], [1, darken(color, 0.6)]], 0.38, 0.32, 0.7);
  return `<path d="${circle(cx, cy, r + 1.4)}" fill="${darken(color, 0.75)}"/>` +
    `<path d="${circle(cx, cy, r)}" fill="${fill}"/>` +
    `<path d="${circle(cx - r * 0.32, cy - r * 0.36, r * 0.22)}" fill="#fff" opacity=".7"/>`;
}

/** Linha que some nas pontas (divisores, filetes). */
export function fadeLine(defs: Defs, x: number, y: number, w: number, color: string, width = 1.5, opacity = 1): string {
  const g = defs.linear([[0, color, 0], [0.2, color, opacity], [0.8, color, opacity], [1, color, 0]], 'h');
  return `<rect x="${x}" y="${+(y - width / 2).toFixed(2)}" width="${w}" height="${width}" fill="${g}"/>`;
}

/** Cores de raridade (joia na barra de tipo). */
export const RARITY_COLORS: Record<string, string> = {
  common: '#e9e4dc',
  uncommon: '#4aa3ff',
  rare: '#f2c440',
  unique: '#ff6a1a',
};

export function rarityGem(box: Box, rarity: string): string {
  const c = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return gem(cx, cy, box.w * 0.36, box.h * 0.46, c);
}

export const textShadow = (defs: Defs, color = '#000', opacity = 0.85, blur = 1.6, dy = 1.4) =>
  defs.url(`tshadow:${color}:${opacity}:${blur}:${dy}`, (id) =>
    `<filter id="${id}" x="-10%" y="-30%" width="120%" height="160%" color-interpolation-filters="sRGB">` +
    `<feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="${color}" flood-opacity="${opacity}"/></filter>`);

export const center = (b: Box) => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2 });

/** Rebites (cabeças de prego) de metal com brilho. */
export function rivets(defs: Defs, pts: [number, number][], r: number, tone = '#8d9096'): string {
  const fill = defs.radial([[0, lighten(tone, 0.7)], [0.35, tone], [1, darken(tone, 0.7)]], 0.35, 0.3, 0.75);
  return pts.map(([x, y]) =>
    `<path d="${circle(x, y + r * 0.35, r)}" fill="#000" opacity=".5"/><path d="${circle(x, y, r)}" fill="${fill}"/>`).join('');
}

/** Pedra escura (ardósia) levemente tingida pela cor do deck. */
export function stone(defs: Defs, pal: Palette, d: string, opacity = 1): string {
  const base = mix(darken(pal.base, 0.82), '#1b1a1d', 0.55);
  return `<path d="${d}" fill="${base}" fill-opacity="${opacity}" filter="${defs.grain(lighten(base, 0.35), 0.6, 0.35, 11)}"/>` +
    `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.08], [0.3, '#fff', 0], [1, '#000', 0.35]])}"/>`;
}

export { mix };
