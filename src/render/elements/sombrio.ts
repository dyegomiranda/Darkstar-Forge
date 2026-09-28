/**
 * Estilo SOMBRIO — vidro fumê sobre a arte (desfocada por trás), filetes finos
 * na cor da classe, cantos cortados e pequenas volutas. Referência: Deck Vermelho.png.
 */
import { darken, lighten } from '../color';
import { smoke, vivid, type Palette } from '../palette';
import { banner, chamfer, circle, diamond, inset, notched, spiral, tapered, type Box, type Pt } from '../shapes';
import { center, fadeLine } from './common';
import type { TextLook } from '../text';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Cinzel';
const BODY = 'EB Garamond';
const INK = '#f2ece4';

/** Vidro fumê: tinta escura na cor do deck + brilho no topo + granulado. */
function glass(a: PieceArgs, d: string): string {
  const { defs, pal } = a;
  return `<path d="${d}" fill="${defs.hue(pal, smoke)}" fill-opacity="${a.opacity}" filter="${defs.grain(darken(pal.base, 0.5), 0.35, 0.9)}"/>` +
    `<path d="${d}" fill="${defs.linear([[0, lighten(pal.base, 0.3), 0.14], [0.35, pal.base, 0.02], [1, '#000', 0.3]])}"/>`;
}

/** Filete: traço colorido (ou metal) com brilho suave; o 2º contorno é mais fino e mais apagado. */
function line(a: PieceArgs, outer: string, inner: string, w = 2.4): string {
  const { defs, pal } = a;
  const stroke = pal.metal === 'deck' ? defs.hue(pal, vivid) : defs.metal(pal)[0];
  return `<g filter="${defs.glow(vivid(pal.base), 3, 0.45)}"><path d="${outer}" fill="none" stroke="${stroke}" stroke-width="${w}"/></g>` +
    `<path d="${inner}" fill="none" stroke="${stroke}" stroke-width="${w * 0.45}" opacity=".7"/>`;
}

/** Voluta de canto (pequena espiral de filigrana). */
function curl(pal: Palette, x: number, y: number, sx: 1 | -1, sy: 1 | -1, s = 1): string {
  const c = vivid(pal.base);
  const pts: Pt[] = spiral(x + sx * 12 * s, y + sy * 12 * s, 10 * s, 1.1, sx === 1 ? Math.PI : 0, sx * sy === 1 ? 1 : -1, 30);
  const stem: Pt[] = [[x, y], [x + sx * 6 * s, y + sy * 2 * s], [x + sx * 10 * s, y + sy * 6 * s]];
  return `<path d="${tapered([...stem, ...pts], 3.2 * s, 0.4)}" fill="${c}" opacity=".85"/>`;
}

function corners(pal: Palette, b: Box, s = 1): string {
  return curl(pal, b.x + 4, b.y + 4, 1, 1, s) + curl(pal, b.x + b.w - 4, b.y + 4, -1, 1, s) +
    curl(pal, b.x + 4, b.y + b.h - 4, 1, -1, s) + curl(pal, b.x + b.w - 4, b.y + b.h - 4, -1, -1, s);
}

function plate(a: PieceArgs, outer: string, inner: string, content: Box, text: TextLook = { family: BODY, weight: 600, color: INK }): PieceOut {
  const { defs } = a;
  return {
    svg: `<g filter="${defs.shadow(4, 8, 0.55)}">${glass(a, outer)}</g>` + line(a, outer, inner),
    glass: outer,
    content,
    text,
  };
}

function badge(a: PieceArgs, small = false): PieceOut {
  const { box: b, defs, pal } = a;
  const { cx, cy } = center(b);
  const r = b.w / 2 - (small ? 4 : 2);
  const c = vivid(pal.base);
  const svg =
    `<g filter="${defs.shadow(4, 8, 0.6)}"><path d="${circle(cx, cy, r)}" fill="${defs.radial([[0, darken(c, 0.55)], [1, '#070506']], 0.5, 0.4, 0.65)}" fill-opacity="${Math.max(a.opacity, 0.85)}"/></g>` +
    line(a, circle(cx, cy, r), circle(cx, cy, r - 6), small ? 2 : 2.8) +
    (small ? '' : `<path d="${diamond(cx, cy + r + 1, 5, 6)}" fill="${c}"/>`);
  const ci = r * 0.78;
  return { svg, content: { x: cx - ci, y: cy - ci, w: ci * 2, h: ci * 2 }, text: { family: BODY, weight: 600, color: INK } };
}

export const sombrio: PieceStyle[] = [
  {
    style: 'sombrio', kind: 'header', opacity: 0.72, metal: 'deck',
    render(a) {
      const { box: b, pal } = a;
      const bb = { ...b, x: b.x - 24, w: b.w + 48, y: b.y + 4, h: b.h - 8 };
      const outer = chamfer(bb, 14);
      const inner = chamfer(inset(bb, 6), 10);
      const { cx } = center(bb);
      const p = plate(a, outer, inner, { x: bb.x + 80, y: bb.y + 6, w: bb.w - 160, h: bb.h - 12 },
        { family: TITLE, weight: 600, color: INK, caps: false, tracking: 0.04 });
      p.svg += `<path d="${diamond(cx, bb.y + bb.h, 7, 7)}" fill="${vivid(pal.base)}"/>` + fadeLine(a.defs, cx - 120, bb.y + bb.h - 12, 240, vivid(pal.base), 1, 0.4);
      return p;
    },
  },
  { style: 'sombrio', kind: 'cost', opacity: 0.85, metal: 'deck', render: (a) => badge(a) },
  { style: 'sombrio', kind: 'class', opacity: 0.85, metal: 'deck', render: (a) => badge(a) },
  { style: 'sombrio', kind: 'set', opacity: 0.85, metal: 'deck', render: (a) => badge(a, true) },
  {
    style: 'sombrio', kind: 'typeBar', opacity: 0.8, metal: 'deck',
    render(a) {
      const { box: b } = a;
      const bb = inset(b, 4, 6);
      const outer = banner(bb, 24);
      const inner = banner(inset(bb, 6, 5), 20);
      const p = plate(a, outer, inner, { x: bb.x + 40, y: bb.y + 4, w: bb.w - 120, h: bb.h - 8 },
        { family: TITLE, weight: 600, color: INK, caps: true, tracking: 0.05 });
      p.gem = { x: bb.x + bb.w - 66, y: bb.y + bb.h / 2 - 13, w: 26, h: 26 };
      return p;
    },
  },
  {
    style: 'sombrio', kind: 'rules', opacity: 0.74, metal: 'deck',
    render(a) {
      const { box: b, pal } = a;
      const outer = notched(b, 14);
      const inner = notched(inset(b, 7), 10);
      const p = plate(a, outer, inner, inset(b, 38, 30), { family: BODY, weight: 500, color: INK });
      p.svg += corners(pal, inset(b, 10), 1.1);
      return p;
    },
    divider(a, x, y, w) {
      return fadeLine(a.defs, x, y, w, vivid(a.pal.base), 1.2, 0.7) + `<path d="${diamond(x + w / 2, y, 5, 5)}" fill="${vivid(a.pal.base)}"/>`;
    },
    flavor: () => ({ family: BODY, italic: true, weight: 400, color: '#cfc3b6' }),
  },
  {
    style: 'sombrio', kind: 'stat', opacity: 0.8, metal: 'deck',
    render(a) {
      const { box: b } = a;
      const bb = inset(b, 3);
      const outer = chamfer(bb, 13);
      const inner = chamfer(inset(bb, 5), 10);
      return plate(a, outer, inner, inset(bb, 12, 8), { family: BODY, weight: 600, color: INK });
    },
  },
  {
    style: 'sombrio', kind: 'footer', opacity: 0.6, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      // rodapé discreto: só texto sobre uma sombra, com um filete embaixo
      const svg = `<path d="${chamfer(inset(b, 2, 4), 8)}" fill="#000" fill-opacity="${a.opacity * 0.6}" filter="${defs.blur(4)}"/>` +
        fadeLine(defs, b.x + 10, b.y + b.h - 4, b.w - 20, vivid(pal.base), 1, 0.6);
      return { svg, content: inset(b, 12, 4), text: { family: BODY, weight: 500, color: '#d9cfc4' } };
    },
  },
  {
    style: 'sombrio', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`;
      const inner = notched(inset(b, 14), 18);
      const stroke = defs.hue(pal, vivid);
      const svg =
        `<path d="${outer + inner}" fill-rule="evenodd" fill="${defs.linear([[0, '#16110f'], [1, '#050404']])}"/>` +
        `<path d="${inner}" fill="${defs.radial([[0.6, '#000', 0], [1, '#000', 0.55]], 0.5, 0.5, 0.75)}"/>` +
        `<g filter="${defs.glow(vivid(pal.base), 2.5, 0.5)}"><path d="${inner}" fill="none" stroke="${stroke}" stroke-width="2"/></g>` +
        `<path d="${notched(inset(b, 8), 22)}" fill="none" stroke="${stroke}" stroke-width=".8" opacity=".45"/>` +
        corners(pal, inset(b, 16), 1.3);
      return { svg, content: inset(b, 16), text: { family: BODY, color: INK } };
    },
  },
];
