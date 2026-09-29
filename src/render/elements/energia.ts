/**
 * Estilo ENERGIA — inspirado nas cartas de monstros "tipo V" (referência: modelo
 * editável da Etsy, ArtQuesta): corpo preto com faixa prateada em "V" no canto,
 * barra do nome em degradê da cor do tipo para o branco, esferas de energia
 * (símbolo preto sobre esfera colorida) e barras pretas com curvas prateadas.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { bezier, circle, inset, pill, poly, roundRect, tapered, type Box, type Pt } from '../shapes';
import type { TextLook } from '../text';
import { center, metalSolid } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const SANS = 'Noto Sans';
const BLACK = '#0c0c0e';
const INK = '#141416';

/** Cor do tipo (a cor da classe, viva). */
const typeColor = (pal: Palette) => vivid(pal.base);

/** Traço prateado que afina (as curvas e o "V"). */
function swoosh(a: PieceArgs, pts: Pt[], w0: number, w1 = 0.6): string {
  return metalSolid(a.defs, { ...a.pal, metal: a.pal.metal === 'deck' ? 'silver' : a.pal.metal }, tapered(pts, w0, w1), 1);
}

/** Barra preta com as pontas em curva prateada ( ) — tipo, ATK/DEF, rodapé. */
function blackBar(a: PieceArgs, b: Box, curves = true): string {
  const { cy } = center(b);
  const r = b.h / 2;
  const body = pill(b.x + b.w / 2, cy, r, b.w / 2 - r);
  let s = `<g filter="${a.defs.shadow(2, 4, 0.5)}"><path d="${body}" fill="${BLACK}" opacity="${a.opacity}"/></g>` +
    `<path d="${body}" fill="${a.defs.linear([[0, '#fff', 0.14], [0.45, '#fff', 0], [1, '#000', 0]])}"/>`;
  if (curves) {
    const arc = (x: number, dir: 1 | -1) => bezier([x + dir * r * 0.55, b.y + 2], [x - dir * r * 0.15, b.y + b.h * 0.3], [x - dir * r * 0.15, b.y + b.h * 0.7], [x + dir * r * 0.55, b.y + b.h - 2], 16);
    s += swoosh(a, arc(b.x + r * 0.5, 1), b.h * 0.2, b.h * 0.05) + swoosh(a, arc(b.x + b.w - r * 0.5, -1), b.h * 0.2, b.h * 0.05);
  }
  return s;
}

/** Esfera de energia: cor do tipo com brilho; o símbolo preto vai por cima. */
function energy(a: PieceArgs, box: Box, small = false): PieceOut {
  const { defs, pal } = a;
  const { cx, cy } = center(box);
  const R = Math.min(box.w, box.h) / 2 - (small ? 8 : 6);
  const ext = Math.max(0, (box.w - box.h) / 2);
  const c = typeColor(pal);
  const svg =
    `<g filter="${defs.shadow(2, 4, 0.55)}"><path d="${pill(cx, cy, R + 4, ext)}" fill="${BLACK}"/></g>` +
    `<path d="${pill(cx, cy, R, ext)}" fill="${defs.hue(pal, (k) => vivid(k))}" opacity="${a.opacity}"/>` +
    `<path d="${pill(cx, cy, R, ext)}" fill="${defs.radial([[0, '#fff', 0.75], [0.35, '#fff', 0.15], [0.8, '#000', 0], [1, '#000', 0.35]], 0.38, 0.3, 0.75)}"/>` +
    `<path d="${pill(cx, cy + R * 0.25, R * 0.8, ext)}" fill="${defs.linear([[0, '#fff', 0], [1, lighten(c, 0.3), 0.35]])}"/>`;
  const ci = R * 0.78;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: { family: SANS, weight: 700, color: INK }, iconColor: INK };
}

const text = (color = INK, weight = 700): TextLook => ({ family: SANS, weight, color });

export const energia: PieceStyle[] = [
  {
    style: 'energia', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const { defs, pal } = a;
      const b = inset(a.box, -4, 12);
      const r = b.h / 2;
      const c = typeColor(pal);
      // barra reta à esquerda e arredondada à direita, do tipo para o branco
      const d = `M${b.x} ${b.y}H${b.x + b.w - r}A${r} ${r} 0 0 1 ${b.x + b.w - r} ${b.y + b.h}H${b.x}Z`;
      const svg =
        `<g filter="${defs.shadow(2, 4, 0.5)}"><path d="${d}" fill="${BLACK}" transform="translate(0 3)"/></g>` +
        `<g opacity="${a.opacity}"><path d="${d}" fill="${defs.linear([[0, c], [0.42, lighten(c, 0.35)], [0.75, '#eeeeef'], [1, '#d9d9dc']], 'h')}"/>` +
        (pal.hybrid ? `<path d="${d}" fill="${defs.hue(pal, (k) => vivid(k), 0.55)}"/>` : '') +
        `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.5], [0.45, '#fff', 0.05], [1, '#000', 0.12]])}"/></g>` +
        `<path d="${d}" fill="none" stroke="${darken(c, 0.5)}" stroke-width="1.2" opacity=".5"/>`;
      return { svg, content: { x: b.x + 48, y: b.y + 2, w: b.w - 90, h: b.h - 4 }, text: text() };
    },
  },
  {
    style: 'energia', kind: 'cost', opacity: 1, metal: 'silver',
    render(a) {
      // placa clara onde as esferas/símbolos de custo aparecem (como a fileira de energias de um ataque)
      const { cx, cy } = center(a.box);
      const R = Math.min(a.box.w, a.box.h) / 2 - 8;
      const ext = Math.max(0, (a.box.w - a.box.h) / 2);
      const svg =
        `<g filter="${a.defs.shadow(2, 4, 0.55)}"><path d="${pill(cx, cy, R + 5, ext)}" fill="${BLACK}"/></g>` +
        `<path d="${pill(cx, cy, R, ext)}" fill="${a.defs.radial([[0, '#ffffff'], [0.7, '#e6e6e9'], [1, '#b9b9bf']], 0.4, 0.3, 0.8)}" opacity="${a.opacity}"/>`;
      const ci = R * 0.8;
      return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: text(), costOrbs: true };
    },
  },
  { style: 'energia', kind: 'class', opacity: 1, metal: 'silver', render: (a) => energy(a, a.box) },
  {
    style: 'energia', kind: 'set', opacity: 1, metal: 'silver',
    render(a) {
      const { cx, cy } = center(a.box);
      const r = Math.min(a.box.w, a.box.h) / 2 - 6;
      const svg = `<path d="${circle(cx, cy, r + 3)}" fill="${BLACK}"/>` + metalSolid(a.defs, a.pal, circle(cx, cy, r) + circle(cx, cy, r - 4), 0.8) +
        `<path d="${circle(cx, cy, r - 4)}" fill="#1b1b1f"/>`;
      return { svg, content: inset(a.box, 16), text: text('#fff') };
    },
  },
  {
    style: 'energia', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 14, 12);
      const r = b.h / 2;
      return {
        svg: blackBar(a, b), content: { x: b.x + r * 1.6, y: b.y + 1, w: b.w - r * 3.2 - 34, h: b.h - 2 },
        text: { family: SANS, weight: 600, color: '#ffffff' }, gem: { x: b.x + b.w - r * 1.6 - 28, y: b.y + b.h / 2 - 12, w: 24, h: 24 },
      };
    },
  },
  {
    style: 'energia', kind: 'rules', opacity: 0.86, metal: 'silver',
    render(a) {
      const { defs, pal } = a;
      const b = a.box;
      const c = typeColor(pal);
      // texto direto sobre a arte: véu claro que vira a cor do tipo embaixo
      const d = roundRect(b, 14);
      const svg =
        `<g opacity="${a.opacity}"><path d="${d}" fill="${defs.linear([[0, '#ffffff', 0.9], [0.7, mix(c, '#ffffff', 0.7), 0.92], [1, mix(c, '#ffffff', 0.45), 0.95]])}"/></g>` +
        `<path d="${d}" fill="none" stroke="${BLACK}" stroke-width="2" opacity=".55"/>`;
      return { svg, content: inset(b, 28, 22), text: text(INK, 400) };
    },
    divider(a, x, y, w) {
      return `<rect x="${x}" y="${y - 1}" width="${w}" height="2" rx="1" fill="${BLACK}" opacity=".35"/>`;
    },
    flavor: (pal) => ({ family: SANS, weight: 400, italic: true, color: mix(darken(vivid(pal.base), 0.55), INK, 0.4) }),
  },
  {
    style: 'energia', kind: 'stat', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 2, 6);
      const { cx, cy } = center(b);
      const ring = pill(cx, cy, b.h / 2 - 2, b.w / 2 - b.h / 2);
      return { svg: blackBar(a, b, false) + `<path d="${ring}" fill="none" stroke="#c9ccd2" stroke-width="2" opacity=".8"/>`, content: inset(b, 16, 4), text: text('#ffffff') };
    },
  },
  {
    style: 'energia', kind: 'footer', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 0, 2);
      return { svg: blackBar(a, b, false), content: inset(b, 16, 4), text: text('#e9e9ec', 400) };
    },
  },
  {
    style: 'energia', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const T = 22;
      const outer = roundRect(b, CARD_RADIUS), inner = roundRect(inset(b, T), 8);
      // "V" prateado no canto de cima à esquerda e curva no canto de baixo à direita
      const tip: Pt = [b.x + 34, b.y + 250];
      const vL = bezier([b.x + 16, b.y + 24], [b.x + 18, b.y + 90], [b.x + 26, b.y + 170], tip, 20);
      const vR = bezier([b.x + 210, b.y + 18], [b.x + 140, b.y + 70], [b.x + 70, b.y + 170], tip, 20);
      const vR2 = bezier([b.x + 250, b.y + 18], [b.x + 170, b.y + 80], [b.x + 90, b.y + 170], [b.x + 50, b.y + 238], 20);
      const br = bezier([b.x + b.w - 16, b.y + b.h - 250], [b.x + b.w - 14, b.y + b.h - 120], [b.x + b.w - 90, b.y + b.h - 22], [b.x + b.w - 250, b.y + b.h - 16], 24);
      const svg =
        `<path d="${outer + inner}" fill-rule="evenodd" fill="${BLACK}"/>` +
        `<path d="${outer + inner}" fill-rule="evenodd" fill="${a.defs.linear([[0, '#fff', 0.08], [0.5, '#fff', 0], [1, '#fff', 0.05]], 'd')}"/>` +
        `<path d="${poly([[b.x + 12, b.y + 20], [b.x + 230, b.y + 14], tip])}" fill="${BLACK}"/>` +
        swoosh(a, vL, 16, 3) + swoosh(a, vR, 18, 3) + swoosh(a, vR2, 7, 1) + swoosh(a, br, 5, 14);
      return { svg, content: inset(b, T), text: text('#fff') };
    },
  },
];
