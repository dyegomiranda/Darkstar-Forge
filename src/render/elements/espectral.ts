/**
 * Estilo ESPECTRAL — prata com filigrana de espinhos. Referência: "Trading Card
 * Game Template Vol. 5", Pixarts: moldura escura fina com espinhos de prata
 * curvando nos cantos, plaquinhas claras com pontas escuras, painel de texto
 * claro (lilás na cor da classe) e orbes vítreos nos cantos.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { banner, bezier, diamond, inset, pill, poly, roundRect, spike, tapered, type Box, type Pt } from '../shapes';
import type { TextLook } from '../text';
import { center, gem, metalBand, metalSolid } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Cinzel';
const BODY = 'Noto Sans';

const deep = (pal: Palette) => mix(darken(vivid(pal.base), 0.72), '#120d1a', 0.4);
const ink = (pal: Palette) => mix(darken(vivid(pal.base), 0.78), '#1b1424', 0.45);
/** Tom claro do painel (lilás na referência; aqui, a cor da classe bem clara). */
const pale = (c: string) => mix(lighten(vivid(c), 0.8), '#f6f3fa', 0.45);

/** Aro de prata com relevo. */
function silver(a: PieceArgs, d: string, depth = 1.8, shadow = true): string {
  const band = metalBand(a.defs, a.pal, d, depth);
  return shadow ? `<g filter="${a.defs.shadow(3, 5, 0.55)}">${band}</g>` : band;
}

/** Painel claro (texto escuro por cima). */
function lightPanel(a: PieceArgs, d: string): string {
  const { defs, pal } = a;
  return `<g opacity="${a.opacity}"><g filter="${defs.innerShadow(8, 0.3, darken(vivid(pal.base), 0.4))}">` +
    `<path d="${d}" fill="${defs.hue(pal, pale)}"/></g>` +
    `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.35], [0.4, '#fff', 0], [1, darken(vivid(pal.base), 0.3), 0.18]])}"/></g>`;
}

/** Painel escuro (rodapé, pontas das plaquinhas). */
function darkPanel(a: PieceArgs, d: string): string {
  const { defs, pal } = a;
  return `<g opacity="${a.opacity}"><path d="${d}" fill="${defs.hue(pal, (c) => mix(darken(vivid(c), 0.7), '#120d1a', 0.4))}"/>` +
    `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.12], [0.5, '#fff', 0], [1, '#000', 0.3]])}"/></g>`;
}

/**
 * Espinho curvo de prata saindo de (x, y). `sx`/`sy` = para onde ele se curva
 * (±1), `s` = tamanho. Um ramo principal que enrola + dois espinhos laterais.
 */
function thorn(a: PieceArgs, x: number, y: number, sx: number, sy: number, s: number): string {
  const P = (dx: number, dy: number): Pt => [x + sx * dx * s, y + sy * dy * s];
  const main = bezier(P(0, 0), P(0.9, -0.1), P(1.25, 0.35), P(0.9, 0.7), 26);
  const back = bezier(P(0, 0), P(-0.1, 0.9), P(0.35, 1.25), P(0.7, 0.9), 26);
  const d = tapered(main, 9 * s / 60, 1) + tapered(back, 9 * s / 60, 1) +
    spike(...P(0.55, -0.02), sy < 0 ? 180 : 0, 16 * s / 60, 3.4 * s / 60, 2) +
    spike(...P(-0.02, 0.55), sx < 0 ? 90 : 270, 16 * s / 60, 3.4 * s / 60, 2) +
    diamond(...P(0.05, 0.05), 7 * s / 60, 7 * s / 60);
  return `<g filter="${a.defs.shadow(2, 3, 0.6)}"><path d="${d}" fill="none" stroke="#120d1a" stroke-width="2.4" stroke-linejoin="round"/>${metalSolid(a.defs, a.pal, d, 1.2)}</g>`;
}

/** Orbe vítreo com aro de prata (custo, classe); caixa larga vira cápsula. */
function orb(a: PieceArgs, box: Box, small = false): PieceOut {
  const { defs, pal } = a;
  const { cx, cy } = center(box);
  const R = Math.min(box.w, box.h) / 2 - (small ? 6 : 2);
  const ext = Math.max(0, (box.w - box.h) / 2);
  const ri = R - (small ? 5 : 7);
  const c = vivid(pal.base);
  const svg =
    silver(a, pill(cx, cy, R, ext) + pill(cx, cy, ri, ext), small ? 1.4 : 2) +
    `<path d="${pill(cx, cy, ri, ext)}" fill="${defs.radial([[0, lighten(c, 0.35)], [0.55, c], [1, darken(c, 0.55)]], 0.42, 0.34, 0.7)}" opacity="${a.opacity}"/>` +
    `<path d="${pill(cx, cy, ri, ext)}" fill="${defs.radial([[0.75, '#000', 0], [1, '#000', 0.35]])}"/>` +
    `<ellipse cx="${cx - ext - ri * 0.28}" cy="${cy - ri * 0.5}" rx="${ri * 0.42 + ext * 0.4}" ry="${ri * 0.2}" fill="#fff" opacity=".35"/>`;
  const ci = ri * 0.74;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: { family: TITLE, weight: 700, color: '#ffffff', glow: darken(c, 0.55) }, iconColor: '#ffffff' };
}

/** Plaquinha clara de pontas escuras (nome, tipo). */
function plaque(a: PieceArgs, b: Box, tip: number): { svg: string; inner: Box } {
  const { cy } = center(b);
  const innerB = inset(b, 6, 6);
  const inner = banner(innerB, tip - 5);
  const tips = poly([[innerB.x, cy], [innerB.x + tip - 5, innerB.y], [innerB.x + tip + 10, innerB.y], [innerB.x + tip + 10, innerB.y + innerB.h], [innerB.x + tip - 5, innerB.y + innerB.h]]) +
    poly([[innerB.x + innerB.w, cy], [innerB.x + innerB.w - tip + 5, innerB.y], [innerB.x + innerB.w - tip - 10, innerB.y], [innerB.x + innerB.w - tip - 10, innerB.y + innerB.h], [innerB.x + innerB.w - tip + 5, innerB.y + innerB.h]]);
  const svg = silver(a, banner(b, tip) + inner) + lightPanel(a, inner) + darkPanel(a, tips) +
    `<path d="${tips}" fill="none" stroke="${lighten(vivid(a.pal.base), 0.4)}" stroke-width="1" opacity=".5"/>`;
  return { svg, inner: { x: innerB.x + tip + 13, y: innerB.y, w: innerB.w - 2 * (tip + 13), h: innerB.h } };
}

const title = (pal: Palette, weight = 700): TextLook => ({ family: TITLE, weight, color: ink(pal), caps: true, tracking: 0.02 });

export const espectral: PieceStyle[] = [
  {
    style: 'espectral', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 4, 8);
      const { svg, inner } = plaque(a, b, 20);
      return { svg: svg + gem(b.x + b.w / 2, b.y + b.h - 1, 6, 8, vivid(a.pal.base)), content: inset(inner, 0, 4), text: title(a.pal) };
    },
  },
  { style: 'espectral', kind: 'cost', opacity: 1, metal: 'silver', render: (a) => orb(a, a.box) },
  { style: 'espectral', kind: 'class', opacity: 1, metal: 'silver', render: (a) => orb(a, a.box) },
  {
    style: 'espectral', kind: 'set', opacity: 1, metal: 'silver',
    render(a) {
      const { cx, cy } = center(a.box);
      const r = Math.min(a.box.w, a.box.h) / 2;
      const svg = silver(a, diamond(cx, cy, r, r) + diamond(cx, cy, r - 6, r - 6), 1.4) + darkPanel(a, diamond(cx, cy, r - 6, r - 6));
      return { svg, content: inset(a.box, r * 0.55), text: title(a.pal) };
    },
  },
  {
    style: 'espectral', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 18, 4);
      const { svg, inner } = plaque(a, b, 22);
      return { svg, content: { ...inner, w: inner.w - 34 }, text: title(a.pal, 600), gem: { x: inner.x + inner.w - 26, y: b.y + b.h / 2 - 13, w: 26, h: 26 } };
    },
  },
  {
    style: 'espectral', kind: 'rules', opacity: 0.94, metal: 'silver',
    render(a) {
      const b = a.box;
      const { cx } = center(b);
      const inner = roundRect(inset(b, 5), 8);
      const svg =
        silver(a, roundRect(b, 12) + inner) + lightPanel(a, inner) +
        `<path d="${roundRect(inset(b, 11), 5)}" fill="none" stroke="${darken(vivid(a.pal.base), 0.2)}" stroke-width="1" opacity=".3"/>` +
        thorn(a, b.x - 4, b.y - 4, 1, 1, 34) + thorn(a, b.x + b.w + 4, b.y - 4, -1, 1, 34) +
        gem(cx, b.y + b.h - 1, 8, 11, vivid(a.pal.base));
      return { svg, content: inset(b, 34, 26), text: { family: BODY, weight: 400, color: ink(a.pal) } };
    },
    divider(a, x, y, w) {
      const c = darken(vivid(a.pal.base), 0.2);
      const g = a.defs.linear([[0, c, 0], [0.2, c, 0.6], [0.8, c, 0.6], [1, c, 0]], 'h');
      return `<rect x="${x}" y="${y - 0.6}" width="${w}" height="1.2" fill="${g}"/>` + gem(x + w / 2, y, 4, 6, vivid(a.pal.base));
    },
    flavor: (pal) => ({ family: BODY, weight: 400, italic: true, color: mix(darken(vivid(pal.base), 0.35), '#3b3048', 0.35) }),
  },
  {
    style: 'espectral', kind: 'stat', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 2, 4);
      const { cx, cy } = center(b);
      const r = b.h / 2, ext = b.w / 2 - r;
      const c = vivid(a.pal.base);
      const svg = silver(a, pill(cx, cy, r, ext) + pill(cx, cy, r - 6, ext)) +
        `<path d="${pill(cx, cy, r - 6, ext)}" fill="${a.defs.linear([[0, lighten(c, 0.2)], [0.5, c], [1, darken(c, 0.5)]])}" opacity="${a.opacity}"/>` +
        `<path d="${pill(cx, cy - r * 0.35, r * 0.35, ext * 0.8)}" fill="#fff" opacity=".22"/>`;
      return { svg, content: inset(b, 16, 8), text: { family: TITLE, weight: 700, color: '#ffffff', glow: darken(c, 0.55) } };
    },
  },
  {
    style: 'espectral', kind: 'footer', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const inner = banner(inset(b, 4, 4), 12);
      const svg = silver(a, banner(b, 16) + inner, 1.4) + darkPanel(a, inner);
      return { svg, content: inset(b, 22, 6), text: { family: BODY, weight: 400, color: '#e4def0' } };
    },
  },
  {
    style: 'espectral', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const T = 18;
      const outer = roundRect(b, CARD_RADIUS), inner = roundRect(inset(b, T), 12);
      const svg =
        `<path d="${outer + inner}" fill-rule="evenodd" fill="${deep(a.pal)}"/>` +
        silver(a, outer + roundRect(inset(b, 3), CARD_RADIUS - 3), 1, false) +
        silver(a, roundRect(inset(b, T - 3), 14) + inner, 1, false) +
        thorn(a, b.x + 10, b.y + 10, 1, 1, 70) + thorn(a, b.x + b.w - 10, b.y + 10, -1, 1, 70) +
        thorn(a, b.x + 10, b.y + b.h - 10, 1, -1, 70) + thorn(a, b.x + b.w - 10, b.y + b.h - 10, -1, -1, 70);
      return { svg, content: inset(b, T), text: title(a.pal) };
    },
  },
];
