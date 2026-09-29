/**
 * Estilo VAZIO — cromo polido com brilho na cor da classe. Referência:
 * "Dracanis — TCG Template Vol. 2 (Void)", Pixarts: moldura de metal com cantos
 * em degrau, soquetes redondos, custo em gema facetada, faixa com pontas de
 * andorinha e painéis escuros com filete luminoso.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { bannerSwallow, chamfer, diamond, inset, pill, pillPoint, poly, roundRect, type Box, type Pt } from '../shapes';
import type { TextLook } from '../text';
import { center, gem, metalBand } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const SERIF = 'Marcellus';
/** Números e regras: letra sem serifa (na Marcellus o 0 parece O e o 1 parece I). */
const SANS = 'Noto Sans';
const INK = '#f1edff';

const accent = (pal: Palette) => lighten(vivid(pal.base), 0.25);

/** Faixa de cromo com relevo e sombra. */
function chrome(a: PieceArgs, d: string, depth = 2.2, shadow = true): string {
  const band = metalBand(a.defs, a.pal, d, depth);
  return shadow ? `<g filter="${a.defs.shadow(3, 6, 0.65)}">${band}</g>` : band;
}

/** Miolo escuro do "vazio": quase preto tingido pela classe, com névoa luminosa embaixo. */
function voidFill(a: PieceArgs, d: string, lift = 0): string {
  const { defs, pal } = a;
  return `<g opacity="${a.opacity}">` +
    `<path d="${d}" fill="${defs.hue(pal, (c) => mix(darken(vivid(c), 0.8 - lift), '#07060f', 0.35))}"/>` +
    `<path d="${d}" fill="${defs.radial([[0, vivid(pal.base), 0.24], [1, vivid(pal.base), 0]], 0.5, 1, 0.75)}"/>` +
    `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.1], [0.18, '#fff', 0], [1, '#000', 0.25]])}"/></g>`;
}

/** Filete luminoso (brilho na cor da classe). */
function glowLine(a: PieceArgs, d: string, width = 1.6, opacity = 0.85): string {
  return `<path d="${d}" fill="none" stroke="${accent(a.pal)}" stroke-width="${width}" opacity="${opacity}" filter="${a.defs.glow(vivid(a.pal.base), 3, 0.9)}"/>`;
}

/** Octógono (ou octógono esticado, para vários custos). */
function octa(cx: number, cy: number, r: number, ext: number): Pt[] {
  return Array.from({ length: 8 }, (_, k) => pillPoint(cx, cy, r, ext, ((22.5 + 45 * k) * Math.PI) / 180));
}

/** Gema facetada com aro de cromo (custo). */
function facetGem(a: PieceArgs, box: Box): PieceOut {
  const { defs, pal } = a;
  const { cx, cy } = center(box);
  const R = Math.min(box.w, box.h) / 2 + 2;
  const ext = Math.max(0, (box.w - box.h) / 2);
  const outer = octa(cx, cy, R, ext), inner = octa(cx, cy, R - 8, ext), table = octa(cx, cy, (R - 8) * 0.56, ext * 0.8);
  const c = vivid(pal.base);
  const shades = [lighten(c, 0.5), lighten(c, 0.22), c, darken(c, 0.2), darken(c, 0.42), darken(c, 0.3), c, lighten(c, 0.3)];
  let facets = '';
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    facets += `<path d="${poly([inner[k], inner[k2], table[k2], table[k]])}" fill="${shades[(k + 5) % 8]}" opacity="${a.opacity}"/>`;
  }
  const svg =
    chrome(a, poly(outer) + poly(inner), 2.4) +
    `<path d="${poly(inner)}" fill="${darken(c, 0.55)}" opacity="${a.opacity}"/>` + facets +
    `<path d="${poly(table)}" fill="${defs.radial([[0, lighten(c, 0.45)], [0.7, c], [1, darken(c, 0.25)]], 0.4, 0.35, 0.8)}" opacity="${a.opacity}"/>` +
    `<path d="${poly(inner)}" fill="none" stroke="${lighten(c, 0.6)}" stroke-width="1" opacity=".55"/>` +
    `<path d="${diamond(cx - ext - (R - 8) * 0.35, cy - (R - 8) * 0.45, 5, 3)}" fill="#fff" opacity=".7"/>`;
  const ci = (R - 8) * 0.64;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: { family: SANS, weight: 700, color: '#ffffff', glow: darken(c, 0.5) } };
}

/** Soquete redondo de cromo (classe, edição). */
function socket(a: PieceArgs, box: Box, small = false): PieceOut {
  const { cx, cy } = center(box);
  const R = Math.min(box.w, box.h) / 2 - (small ? 4 : 0);
  // caixa larga (várias classes): soquete em cápsula
  const ext = Math.max(0, (box.w - box.h) / 2);
  const ri = R - (small ? 6 : 10);
  const svg =
    chrome(a, pill(cx, cy, R, ext) + pill(cx, cy, ri, ext), small ? 1.6 : 2.4) +
    voidFill(a, pill(cx, cy, ri, ext)) +
    glowLine(a, pill(cx, cy, ri - 3, ext), 1.2, 0.7);
  const ci = ri * 0.8;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: { family: SERIF, weight: 400, color: INK }, iconColor: '#ece6ff' };
}

/** Placa do nome: topo reto, cantos de baixo chanfrados e abas nas pontas. */
function namePlate(b: Box, t: number): string {
  const c = 16 - t * 0.6;
  return poly([[b.x + t, b.y + t], [b.x + b.w - t, b.y + t], [b.x + b.w - t, b.y + b.h - c - t], [b.x + b.w - c - t, b.y + b.h - t],
    [b.x + c + t, b.y + b.h - t], [b.x + t, b.y + b.h - c - t]]);
}

const text = (weight = 400): TextLook => ({ family: SERIF, weight, color: INK });

export const vazio: PieceStyle[] = [
  {
    style: 'vazio', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 0, 6);
      const { cx } = center(b);
      const svg =
        chrome(a, namePlate(b, 0) + namePlate(b, 7)) +
        voidFill(a, namePlate(b, 7), 0.08) +
        glowLine(a, namePlate(b, 11), 1.1, 0.55) +
        gem(cx, b.y + b.h - 2, 7, 9, vivid(a.pal.base));
      return { svg, content: inset(b, 60, 12), text: { ...text(), glow: darken(vivid(a.pal.base), 0.3) } };
    },
  },
  { style: 'vazio', kind: 'cost', opacity: 1, metal: 'silver', render: (a) => facetGem(a, a.box) },
  { style: 'vazio', kind: 'class', opacity: 1, metal: 'silver', render: (a) => socket(a, a.box) },
  { style: 'vazio', kind: 'set', opacity: 1, metal: 'silver', render: (a) => socket(a, a.box, true) },
  {
    style: 'vazio', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const { cy } = center(b);
      const inner = bannerSwallow(inset(b, 8, 7), 24, 9);
      const svg =
        chrome(a, bannerSwallow(b, 30, 12) + inner) +
        voidFill(a, inner, 0.22) +
        glowLine(a, bannerSwallow(inset(b, 13, 12), 20, 7), 1, 0.5);
      return { svg, content: { x: b.x + 56, y: b.y + 8, w: b.w - 150, h: b.h - 16 }, text: text(), gem: { x: b.x + b.w - 84, y: cy - 14, w: 28, h: 28 } };
    },
  },
  {
    style: 'vazio', kind: 'rules', opacity: 0.92, metal: 'silver',
    render(a) {
      const b = a.box;
      const { cx } = center(b);
      const inner = chamfer(inset(b, 7), 18);
      const c = vivid(a.pal.base);
      const svg =
        chrome(a, chamfer(b, 22) + inner, 2) +
        voidFill(a, inner) +
        glowLine(a, chamfer(inset(b, 13), 14), 1, 0.45) +
        gem(cx - 22, b.y + 2, 5, 7, c) + gem(cx, b.y + 1, 7, 9, c) + gem(cx + 22, b.y + 2, 5, 7, c);
      return { svg, content: inset(b, 34, 26), text: { family: SANS, weight: 400, color: '#ebe7f7' } };
    },
    divider(a, x, y, w) {
      const c = accent(a.pal);
      const g = a.defs.linear([[0, c, 0], [0.25, c, 0.8], [0.75, c, 0.8], [1, c, 0]], 'h');
      return `<rect x="${x}" y="${y - 0.7}" width="${w}" height="1.4" fill="${g}"/>` + gem(x + w / 2, y, 5, 7, vivid(a.pal.base));
    },
    flavor: (pal) => ({ family: 'Cormorant Garamond', weight: 600, italic: true, color: lighten(vivid(pal.base), 0.55) }),
  },
  {
    style: 'vazio', kind: 'stat', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 2, 4);
      const { cy } = center(b);
      const hex = (k: number) => poly([[b.x + k, cy], [b.x + 16 + k * 0.6, b.y + k], [b.x + b.w - 16 - k * 0.6, b.y + k], [b.x + b.w - k, cy], [b.x + b.w - 16 - k * 0.6, b.y + b.h - k], [b.x + 16 + k * 0.6, b.y + b.h - k]]);
      const svg = chrome(a, hex(0) + hex(7)) + voidFill(a, hex(7), 0.1) + glowLine(a, hex(11), 1, 0.5);
      return { svg, content: inset(b, 18, 8), text: { family: SANS, weight: 700, color: '#ffffff' } };
    },
  },
  {
    style: 'vazio', kind: 'footer', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const inner = chamfer(inset(b, 5), 9);
      const svg = chrome(a, chamfer(b, 12) + inner, 1.6) + voidFill(a, inner);
      return { svg, content: inset(b, 16, 6), text: { family: SANS, weight: 400, color: '#d9d4ea' } };
    },
  },
  {
    style: 'vazio', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const T = 20;
      const outer = roundRect(b, CARD_RADIUS);
      // cantos de dentro em degrau
      const s = 26;
      const ib = inset(b, T);
      const inner = poly([[ib.x + s, ib.y], [ib.x + ib.w - s, ib.y], [ib.x + ib.w - s, ib.y + 8], [ib.x + ib.w - 8, ib.y + 8], [ib.x + ib.w - 8, ib.y + s], [ib.x + ib.w, ib.y + s],
        [ib.x + ib.w, ib.y + ib.h - s], [ib.x + ib.w - 8, ib.y + ib.h - s], [ib.x + ib.w - 8, ib.y + ib.h - 8], [ib.x + ib.w - s, ib.y + ib.h - 8], [ib.x + ib.w - s, ib.y + ib.h],
        [ib.x + s, ib.y + ib.h], [ib.x + s, ib.y + ib.h - 8], [ib.x + 8, ib.y + ib.h - 8], [ib.x + 8, ib.y + ib.h - s], [ib.x, ib.y + ib.h - s],
        [ib.x, ib.y + s], [ib.x + 8, ib.y + s], [ib.x + 8, ib.y + 8], [ib.x + s, ib.y + 8]]);
      const c = vivid(a.pal.base);
      // coluna de losangos na lateral esquerda (como a trilha de raridade da referência)
      let rail = '';
      for (let i = 0; i < 5; i++) rail += gem(b.x + T, 300 + i * 52, 7, 10, i < 3 ? c : darken(c, 0.55));
      const svg = metalBand(a.defs, a.pal, outer + inner, 2.4) +
        glowLine(a, inner, 1.4, 0.7) + rail;
      return { svg, content: inset(b, T + 8), text: text() };
    },
  },
];
