/**
 * Estilo ORNADO — metal laqueado com relevo, pergaminho claro, cravos e joias.
 * Referência: card1.png / card2.png.
 */
import { darken, lighten, mix } from '../color';
import { layers } from '../defs';
import { inkOnPaper, paper, vivid, type Palette } from '../palette';
import { banner, bezier, chamfer, circle, inset, spike, tapered, type Box, type Pt } from '../shapes';
import { center, fadeLine, gem, metalBand, metalSolid } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const SERIF = 'EB Garamond';
const LIGHT_INK = '#fbf3ea';

/** Miolo de pergaminho: cor + textura + vinheta na cor do deck + sombra interna. */
function parchment(a: PieceArgs, d: string): string {
  const { defs, pal } = a;
  const base = paper(pal.base);
  return `<g filter="${defs.innerShadow(9, 0.35, darken(pal.base, 0.55))}">` +
    `<path d="${d}" fill="${base}" fill-opacity="${a.opacity}" filter="${defs.paper(mix(darken(pal.base, 0.2), '#8a6a50', 0.5), 0.32)}"/></g>` +
    `<path d="${d}" fill="${defs.radial([[0.5, pal.base, 0], [1, darken(pal.base, 0.2), 0.28]], 0.5, 0.5, 0.72)}"/>`;
}

/** Miolo de laca escura na cor do deck (barra de tipo, ATK/DEF, rodapé). */
function lacquer(a: PieceArgs, d: string): string {
  const { defs, pal } = a;
  return `<g opacity="${a.opacity}"><path d="${d}" fill="${defs.hue(pal, (c) => darken(vivid(c), 0.42))}" filter="${defs.grain('#000', 0.5, 0.55)}"/>` +
    `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.2], [0.45, '#fff', 0.03], [0.55, '#000', 0.1], [1, '#000', 0.4]])}"/></g>` +
    `<path d="${d}" fill="none" stroke="${darken(pal.base, 0.8)}" stroke-width="1.2" opacity=".6"/>`;
}

/** Chamas/gavinhas saindo da ponta do cabeçalho (como no card1). `dir` 1 = para a direita. */
function wisps(pal: Palette, x: number, top: number, h: number, dir: 1 | -1): string {
  const c = vivid(pal.base);
  const cy = top + h / 2;
  const specs: [number, number, number, number][] = [
    // [y inicial rel., alcance, curvatura, espessura]
    [-0.34, 118, -1, 6.5], [-0.12, 92, 1, 5], [0.1, 104, -1, 5.5], [0.3, 128, 1, 6.5], [-0.42, 70, 1, 3.5], [0.4, 78, -1, 3.5],
  ];
  let out = '';
  for (const [ry, reach, curl, wd] of specs) {
    const y = cy + ry * h;
    const p0: Pt = [x, y];
    const p1: Pt = [x + dir * reach * 0.35, y + curl * h * 0.34];
    const p2: Pt = [x + dir * reach * 0.7, y - curl * h * 0.28];
    const p3: Pt = [x + dir * reach, y + curl * h * 0.12];
    const pts = bezier(p0, p1, p2, p3, 30);
    out += `<path d="${tapered(pts, wd * 1.5, 0.3, 0.8)}" fill="${darken(c, 0.35)}" opacity=".9"/>`;
    out += `<path d="${tapered(pts.slice(0, 24), wd * 0.7, 0.1, 1)}" fill="${c}" opacity=".85"/>`;
  }
  return out;
}

/** Medalhão com cravos (custo, classe, edição). */
function medallion(a: PieceArgs, size: 'big' | 'small'): PieceOut {
  const { box: b, defs, pal } = a;
  const { cx, cy } = center(b);
  const r = b.w / 2;
  const big = size === 'big';
  const ri = r * 0.8;
  let sp = '';
  const S = (ang: number, len: number, wid: number) => { sp += spike(cx, cy, ang, r * len, r * wid, r * 0.2); };
  S(0, 1.55, 0.2); S(180, 1.55, 0.2);
  if (big) { S(90, 1.2, 0.16); S(270, 1.2, 0.16); [45, 135, 225, 315].forEach((g) => S(g, 1.13, 0.12)); }
  else { S(90, 1.28, 0.18); S(270, 1.28, 0.18); }
  const disc = defs.radial([[0, darken(vivid(pal.base), 0.3)], [0.65, darken(pal.base, 0.72)], [1, '#0c0506']], 0.5, 0.42, 0.62);
  const svg =
    `<g filter="${defs.shadow(3, 4, 0.55)}">` +
    metalSolid(defs, pal, sp, 1.4) +
    metalBand(defs, pal, circle(cx, cy, r) + circle(cx, cy, ri), big ? 3 : 2) +
    `</g>` +
    `<path d="${circle(cx, cy, ri)}" fill="${disc}" filter="${defs.innerShadow(r * 0.12, 0.7)}"/>` +
    `<path d="${circle(cx, cy, ri - 2)}" fill="none" stroke="${lighten(vivid(pal.base), 0.25)}" stroke-width="1.3" opacity=".45"/>` +
    `<path d="${circle(cx, cy, r + 0.5)}" fill="none" stroke="${darken(pal.base, 0.8)}" stroke-width="1.4" opacity=".7"/>` +
    (big ? gem(cx, cy - r * 1.08, r * 0.1, r * 0.13, lighten(vivid(pal.base), 0.1)) + gem(cx, cy + r * 1.08, r * 0.1, r * 0.13, lighten(vivid(pal.base), 0.1)) : '');
  const ci = ri * 0.86;
  return {
    svg,
    content: { x: cx - ci, y: cy - ci, w: ci * 2, h: ci * 2 },
    text: { family: SERIF, weight: 700, color: LIGHT_INK },
  };
}

export const ornado: PieceStyle[] = [
  {
    style: 'ornado', kind: 'header', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = banner(b, 22);
      const inner = banner(inset(b, 8, 7), 17);
      const { cx } = center(b);
      const svg =
        `<g filter="${defs.shadow(4, 5, 0.5)}">` + metalBand(defs, pal, outer + inner, 2.6) + `</g>` +
        parchment(a, inner) +
        `<path d="${banner(inset(b, 13, 12), 13)}" fill="none" stroke="${darken(vivid(pal.base), 0.15)}" stroke-width="1.1" opacity=".55"/>` +
        wisps(pal, b.x + 12, b.y + 6, b.h - 12, 1) + wisps(pal, b.x + b.w - 12, b.y + 6, b.h - 12, -1) +
        fadeLine(defs, cx - 150, b.y + 3.5, 300, lighten(vivid(pal.base), 0.35), 1.2, 0.8) +
        gem(cx, b.y + 2, 8, 11, vivid(pal.base)) + gem(cx, b.y + b.h - 2, 6, 8, vivid(pal.base));
      return {
        svg,
        content: { x: b.x + 70, y: b.y + 10, w: b.w - 140, h: b.h - 20 },
        text: { family: SERIF, weight: 600, color: inkOnPaper(pal.base) },
      };
    },
  },
  { style: 'ornado', kind: 'cost', opacity: 1, metal: 'deck', render: (a) => medallion(a, 'big') },
  { style: 'ornado', kind: 'class', opacity: 1, metal: 'deck', render: (a) => medallion(a, 'big') },
  { style: 'ornado', kind: 'set', opacity: 1, metal: 'deck', render: (a) => medallion(a, 'small') },
  {
    style: 'ornado', kind: 'typeBar', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const { cx, cy } = center(b);
      const outer = banner(b, 30);
      const inner = banner(inset(b, 8, 7), 24);
      const c = vivid(pal.base);
      const spikes = spike(b.x + 14, cy, 270, 34, 9, 6) + spike(b.x + b.w - 14, cy, 90, 34, 9, 6);
      const svg =
        `<g filter="${defs.shadow(5, 6, 0.6)}">` + metalSolid(defs, pal, spikes) + metalBand(defs, pal, outer + inner, 2.6) + `</g>` +
        lacquer(a, inner) +
        `<path d="${banner(inset(b, 13, 12), 19)}" fill="none" stroke="${lighten(c, 0.3)}" stroke-width="1" opacity=".35"/>` +
        gem(cx, b.y + 1, 9, 12, c) + gem(cx, b.y + b.h - 1, 8, 10, c);
      return {
        svg,
        content: { x: b.x + 48, y: b.y + 8, w: b.w - 130, h: b.h - 16 },
        text: { family: SERIF, weight: 600, color: LIGHT_INK },
        gem: { x: b.x + b.w - 78, y: cy - 15, w: 30, h: 30 },
      };
    },
  },
  {
    style: 'ornado', kind: 'rules', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = chamfer(b, 20);
      const inner = chamfer(inset(b, 10), 13);
      const c = vivid(pal.base);
      const { cx, cy } = center(b);
      let sp = '';
      sp += spike(b.x + 7, b.y + 7, 315, 30, 8, 5) + spike(b.x + b.w - 7, b.y + 7, 45, 30, 8, 5);
      sp += spike(b.x + 7, b.y + b.h - 7, 225, 30, 8, 5) + spike(b.x + b.w - 7, b.y + b.h - 7, 135, 30, 8, 5);
      sp += spike(b.x + 4, cy, 270, 26, 8, 5) + spike(b.x + b.w - 4, cy, 90, 26, 8, 5);
      sp += spike(cx, b.y + b.h - 3, 180, 24, 8, 5);
      const svg =
        `<g filter="${defs.shadow(6, 8, 0.6)}">` + metalSolid(defs, pal, sp) + metalBand(defs, pal, outer + inner, 3) + `</g>` +
        parchment(a, inner) +
        `<path d="${chamfer(inset(b, 18), 9)}" fill="none" stroke="${darken(c, 0.1)}" stroke-width="1.3" opacity=".5"/>` +
        gem(cx, b.y + b.h - 3, 8, 10, c) + gem(b.x + 4, cy, 6, 8, c) + gem(b.x + b.w - 4, cy, 6, 8, c);
      return {
        svg,
        content: inset(b, 40, 30),
        text: { family: SERIF, weight: 500, color: inkOnPaper(pal.base) },
      };
    },
    divider(a, x, y, w) {
      const c = vivid(a.pal.base);
      return fadeLine(a.defs, x, y, w, darken(c, 0.1), 1.6, 0.85) + gem(x + w / 2, y, 6, 8, c);
    },
    flavor: (pal) => ({ family: SERIF, italic: true, weight: 400, color: mix(inkOnPaper(pal.base), paper(pal.base), 0.18) }),
  },
  {
    style: 'ornado', kind: 'stat', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const { cy } = center(b);
      const outer = chamfer(b, 16);
      const inner = chamfer(inset(b, 7), 11);
      const sp = spike(b.x + 4, cy, 270, 18, 7, 4) + spike(b.x + b.w - 4, cy, 90, 18, 7, 4);
      const svg =
        `<g filter="${defs.shadow(4, 5, 0.6)}">` + metalSolid(defs, pal, sp) + metalBand(defs, pal, outer + inner, 2.4) + `</g>` +
        lacquer(a, inner) +
        `<path d="${chamfer(inset(b, 11), 8)}" fill="none" stroke="${lighten(vivid(pal.base), 0.3)}" stroke-width="1" opacity=".3"/>`;
      return { svg, content: inset(b, 14, 8), text: { family: SERIF, weight: 700, color: LIGHT_INK } };
    },
  },
  {
    style: 'ornado', kind: 'footer', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = banner(b, 16);
      const inner = banner(inset(b, 5, 5), 13);
      const svg =
        `<g filter="${defs.shadow(3, 4, 0.5)}">` + metalBand(defs, pal, outer + inner, 1.8) + `</g>` + lacquer(a, inner);
      return { svg, content: inset(b, 20, 6), text: { family: SERIF, weight: 500, color: mix(LIGHT_INK, pal.base, 0.1) } };
    },
  },
  {
    style: 'ornado', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`;
      const inner = roundedInner(b, 11, 26);
      const svg = metalBand(defs, pal, outer + inner, 2.2) +
        `<path d="${inner}" fill="none" stroke="${darken(pal.base, 0.8)}" stroke-width="2" opacity=".8"/>` +
        layers(roundedInner(b, 16, 22), [`none`], ` stroke="${lighten(vivid(pal.base), 0.3)}" stroke-width="1" opacity=".35"`);
      return { svg, content: inset(b, 16), text: { family: SERIF, color: LIGHT_INK } };
    },
  },
];

/** Contorno interno arredondado de uma moldura. */
export function roundedInner(b: Box, t: number, r: number): string {
  const x = b.x + t, y = b.y + t, w = b.w - 2 * t, h = b.h - 2 * t;
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
