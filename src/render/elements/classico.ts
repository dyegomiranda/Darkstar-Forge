/**
 * Estilo CLÁSSICO — limpo e elegante: painéis arredondados de cor profunda,
 * filete de metal com relevo sutil e brilho discreto. Foco na arte.
 */
import { darken, lighten } from '../color';
import { vivid } from '../palette';
import { circle, inset, roundRect, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center, fadeLine, metalBand } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Cormorant Garamond';
const BODY = 'Noto Sans';
const INK = '#fbf7f0';

function panel(a: PieceArgs, b: Box, r: number, content: Box, text: TextLook, rim = 4): PieceOut {
  const { defs, pal } = a;
  const outer = roundRect(b, r);
  const inner = roundRect(inset(b, rim), Math.max(2, r - rim));
  const fill = defs.hue(pal, (c) => darken(vivid(c), 0.62));
  const svg =
    `<g filter="${defs.shadow(4, 8, 0.55)}"><path d="${outer}" fill="${fill}" fill-opacity="${a.opacity}"/></g>` +
    `<path d="${inner}" fill="${defs.linear([[0, '#fff', 0.1], [0.5, '#fff', 0], [1, '#000', 0.25]])}"/>` +
    metalBand(defs, pal, outer + inner, 1.2) +
    `<path d="${roundRect(inset(b, rim + 3), Math.max(2, r - rim - 3))}" fill="none" stroke="${lighten(vivid(pal.base), 0.5)}" stroke-width=".7" opacity=".3"/>`;
  return { svg, content, text };
}

function disc(a: PieceArgs, small = false): PieceOut {
  const { box: b, defs, pal } = a;
  const { cx, cy } = center(b);
  const r = b.w / 2 - (small ? 6 : 4);
  const ri = r - (small ? 4 : 6);
  const svg =
    `<g filter="${defs.shadow(3, 6, 0.55)}">` + metalBand(defs, pal, circle(cx, cy, r) + circle(cx, cy, ri), 1.6) + `</g>` +
    `<path d="${circle(cx, cy, ri)}" fill="${defs.radial([[0, darken(vivid(pal.base), 0.45)], [1, darken(pal.base, 0.85)]], 0.5, 0.4, 0.65)}" fill-opacity="${Math.max(0.9, a.opacity)}"/>` +
    `<path d="${circle(cx, cy, ri - 3)}" fill="none" stroke="#fff" stroke-width=".6" opacity=".18"/>`;
  const ci = ri * 0.86;
  return { svg, content: { x: cx - ci, y: cy - ci, w: ci * 2, h: ci * 2 }, text: { family: TITLE, weight: 700, color: INK } };
}

export const classico: PieceStyle[] = [
  {
    style: 'classico', kind: 'header', opacity: 0.88, metal: 'gold',
    render(a) {
      const b = { ...a.box, x: a.box.x - 10, w: a.box.w + 20, y: a.box.y + 8, h: a.box.h - 16 };
      return panel(a, b, b.h / 2, { x: b.x + 44, y: b.y + 4, w: b.w - 88, h: b.h - 8 }, { family: TITLE, weight: 700, color: INK });
    },
  },
  { style: 'classico', kind: 'cost', opacity: 0.95, metal: 'gold', render: (a) => disc(a) },
  { style: 'classico', kind: 'class', opacity: 0.95, metal: 'gold', render: (a) => disc(a) },
  { style: 'classico', kind: 'set', opacity: 0.95, metal: 'gold', render: (a) => disc(a, true) },
  {
    style: 'classico', kind: 'typeBar', opacity: 0.9, metal: 'gold',
    render(a) {
      const b = { ...a.box, x: a.box.x + 14, w: a.box.w - 28, y: a.box.y + 8, h: a.box.h - 16 };
      const p = panel(a, b, 10, { x: b.x + 24, y: b.y + 4, w: b.w - 90, h: b.h - 8 }, { family: BODY, weight: 600, color: INK });
      p.gem = { x: b.x + b.w - 52, y: b.y + b.h / 2 - 12, w: 24, h: 24 };
      return p;
    },
  },
  {
    style: 'classico', kind: 'rules', opacity: 0.84, metal: 'gold',
    render(a) {
      const b = { ...a.box, x: a.box.x + 14, w: a.box.w - 28 };
      return panel(a, b, 14, inset(b, 30, 26), { family: BODY, weight: 400, color: INK });
    },
    divider(a, x, y, w) {
      return fadeLine(a.defs, x, y, w, lighten(vivid(a.pal.base), 0.4), 1, 0.5);
    },
    flavor: () => ({ family: TITLE, italic: true, weight: 600, color: '#e3dacd' }),
  },
  {
    style: 'classico', kind: 'stat', opacity: 0.92, metal: 'gold',
    render(a) {
      const b = inset(a.box, 6);
      return panel(a, b, 12, inset(b, 10, 6), { family: TITLE, weight: 700, color: INK });
    },
  },
  {
    style: 'classico', kind: 'footer', opacity: 0, metal: 'gold',
    render(a) {
      // só o texto, com sombra — o clássico deixa o rodapé limpo
      return { svg: '', content: inset(a.box, 8, 4), text: { family: BODY, weight: 400, color: '#e9e2d8' } };
    },
  },
  {
    style: 'classico', kind: 'frame', opacity: 1, metal: 'gold',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`;
      const inner = roundRect(inset(b, 16), 22);
      const svg = `<path d="${outer + inner}" fill-rule="evenodd" fill="#0c0a09"/>` +
        metalBand(defs, pal, inner + roundRect(inset(b, 20), 18), 1);
      return { svg, content: inset(b, 20), text: { family: BODY, color: INK } };
    },
  },
];
