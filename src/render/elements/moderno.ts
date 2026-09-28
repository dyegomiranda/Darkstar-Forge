/**
 * Estilo MODERNO — design gráfico chapado: blocos de cor sólida, cortes
 * diagonais, sombra dura deslocada, sem ornamento. Tipografia condensada.
 */
import { darken, lighten, luminance } from '../color';
import type { Defs } from '../defs';
import { vivid, type Palette } from '../palette';
import { circle, diamond, inset, parallelogram, poly, rect } from '../shapes';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const FONT = 'Barlow Condensed';
const INK = '#ffffff';

/** Cor chapada (em híbrida, divisão reta e nítida — sem degradê). */
function flat(defs: Defs, pal: Palette, t: (c: string) => string = vivid): string {
  if (!pal.hybrid) return t(pal.base);
  const n = pal.colors.length;
  return defs.linear(pal.colors.flatMap((c, i) => [[i / n, t(c)], [(i + 1) / n, t(c)]] as [number, string][]), 'h');
}

/** Forma com sombra dura (cópia escura deslocada) + forma na cor. */
function slab(a: PieceArgs, d: string, fill: string, dx = 7, dy = 7): string {
  return `<path d="${d}" fill="#000" opacity=".55" transform="translate(${dx} ${dy})"/>` +
    `<path d="${d}" fill="${fill}" fill-opacity="${a.opacity}"/>`;
}

/** Tinta que contrasta com a cor chapada (amarelo/prata pedem texto escuro). */
const inkOn = (c: string) => (luminance(vivid(c)) > 0.42 ? '#141414' : INK);

export const moderno: PieceStyle[] = [
  {
    style: 'moderno', kind: 'header', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b0, defs, pal } = a;
      const b = { x: b0.x - 10, y: b0.y + 6, w: b0.w + 20, h: b0.h - 12 };
      const d = parallelogram(b, 22);
      const svg = slab(a, d, flat(defs, pal)) +
        `<path d="${parallelogram({ x: b.x + b.w - 90, y: b.y, w: 90, h: b.h }, 22)}" fill="#000" opacity=".22"/>` +
        `<rect x="${b.x + 30}" y="${b.y + b.h - 7}" width="${b.w * 0.45}" height="3" fill="${INK}" opacity=".85"/>`;
      return {
        svg, content: { x: b.x + 36, y: b.y + 2, w: b.w - 130, h: b.h - 8 },
        text: { family: FONT, weight: 700, color: inkOn(pal.base), caps: true, tracking: 0.04 },
      };
    },
  },
  {
    style: 'moderno', kind: 'cost', opacity: 1, metal: 'deck',
    render(a) {
      const { cx, cy } = center(a.box);
      const r = a.box.w / 2 + 6;
      const svg = slab(a, diamond(cx, cy, r, r), '#101010', 6, 6) +
        `<path d="${diamond(cx, cy, r - 7, r - 7)}" fill="${flat(a.defs, a.pal)}"/>`;
      const ci = r * 0.62;
      return { svg, content: { x: cx - ci, y: cy - ci * 0.8, w: ci * 2, h: ci * 1.6 }, text: { family: FONT, weight: 700, color: inkOn(a.pal.base) } };
    },
  },
  {
    style: 'moderno', kind: 'class', opacity: 1, metal: 'deck',
    render(a) {
      const { cx, cy } = center(a.box);
      const r = a.box.w / 2 - 2;
      const svg = slab(a, circle(cx, cy, r), '#101010', 6, 6) +
        `<path d="${circle(cx, cy, r)}" fill="none" stroke="${flat(a.defs, a.pal)}" stroke-width="7"/>`;
      const ci = r * 0.72;
      return { svg, content: { x: cx - ci, y: cy - ci, w: ci * 2, h: ci * 2 }, text: { family: FONT, weight: 700, color: INK }, iconColor: '#ffffff' };
    },
  },
  {
    style: 'moderno', kind: 'set', opacity: 1, metal: 'deck',
    render(a) {
      const { cx, cy } = center(a.box);
      const r = a.box.w / 2 - 6;
      const svg = `<path d="${circle(cx, cy, r)}" fill="#101010"/><path d="${circle(cx, cy, r)}" fill="none" stroke="${flat(a.defs, a.pal)}" stroke-width="3"/>`;
      return { svg, content: inset(a.box, 14), text: { family: FONT, color: INK } };
    },
  },
  {
    style: 'moderno', kind: 'typeBar', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b0 } = a;
      const b = { x: b0.x + 14, y: b0.y + 12, w: b0.w * 0.62, h: b0.h - 20 };
      const svg = slab(a, parallelogram(b, 14), '#111111', 5, 5) +
        `<rect x="${b.x + 2}" y="${b.y}" width="8" height="${b.h}" fill="${flat(a.defs, a.pal)}"/>`;
      return {
        svg, content: { x: b.x + 24, y: b.y + 2, w: b.w - 44, h: b.h - 4 },
        text: { family: FONT, weight: 600, color: INK, caps: true, tracking: 0.08 },
        gem: { x: b.x + b.w + 10, y: b.y + b.h / 2 - 13, w: 26, h: 26 },
      };
    },
    gemRender: (g, color) => `<path d="${diamond(g.x + g.w / 2, g.y + g.h / 2, g.w / 2, g.h / 2)}" fill="${color}" stroke="#111" stroke-width="3"/>`,
  },
  {
    style: 'moderno', kind: 'rules', opacity: 0.92, metal: 'deck',
    render(a) {
      const { box: b0, defs, pal } = a;
      const b = inset(b0, 14, 0);
      const cut = 34;
      const d = poly([[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h - cut], [b.x + b.w - cut, b.y + b.h], [b.x, b.y + b.h]]);
      const svg = slab(a, d, '#121212', 8, 8) +
        `<rect x="${b.x}" y="${b.y}" width="10" height="${b.h}" fill="${flat(defs, pal)}"/>` +
        `<path d="${poly([[b.x + b.w - cut + 8, b.y + b.h], [b.x + b.w, b.y + b.h - cut + 8], [b.x + b.w, b.y + b.h]])}" fill="${flat(defs, pal)}"/>`;
      return { svg, content: { x: b.x + 34, y: b.y + 26, w: b.w - 60, h: b.h - 50 }, text: { family: FONT, weight: 500, color: '#f2f2f2' } };
    },
    divider(a, x, y) {
      return `<rect x="${x}" y="${y - 2}" width="46" height="4" fill="${flat(a.defs, a.pal)}"/>`;
    },
    flavor: () => ({ family: FONT, italic: true, weight: 500, color: '#b8b8b8' }),
  },
  {
    style: 'moderno', kind: 'stat', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b0, defs, pal, variant } = a;
      const b = inset(b0, 4, 6);
      const fill = variant === 'atk' ? flat(defs, pal) : flat(defs, pal, (c) => lighten(darken(vivid(c), 0.1), 0));
      const svg = slab(a, parallelogram(b, 16), variant === 'atk' ? fill : '#161616', 5, 5) +
        (variant === 'def' ? `<path d="${parallelogram(b, 16)}" fill="none" stroke="${fill}" stroke-width="4"/>` : '');
      const ink = variant === 'atk' ? inkOn(pal.base) : INK;
      return { svg, content: { x: b.x + 14, y: b.y + 2, w: b.w - 28, h: b.h - 4 }, text: { family: FONT, weight: 700, color: ink } };
    },
  },
  {
    style: 'moderno', kind: 'footer', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b } = a;
      return { svg: `<rect x="${b.x + 8}" y="${b.y + b.h / 2 - 1}" width="3" height="14" fill="${flat(a.defs, a.pal)}" transform="translate(0 -6)"/>`, content: { x: b.x + 18, y: b.y, w: b.w - 24, h: b.h }, text: { family: FONT, weight: 600, color: '#e6e6e6', caps: true, tracking: 0.06 } };
    },
  },
  {
    style: 'moderno', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const svg = `<path d="${rect(b)}${rect(inset(b, 14))}" fill-rule="evenodd" fill="#111"/>` +
        `<path d="${poly([[0, 0], [160, 0], [0, 160]])}" fill="${flat(defs, pal)}"/>` +
        `<path d="${poly([[b.w, b.h], [b.w - 160, b.h], [b.w, b.h - 160]])}" fill="${flat(defs, pal)}"/>`;
      return { svg, content: inset(b, 14), text: { family: FONT, color: INK } };
    },
  },
];

