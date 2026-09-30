/**
 * Estilo VAZIO — cromo polido com brilho na cor da classe. Referência:
 * "Dracanis — TCG Template Vol. 2 (Void)", Pixarts: moldura de metal com cantos
 * em degrau, soquetes redondos, custo em gema facetada, faixa com pontas de
 * andorinha e painéis escuros com filete luminoso.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { banner, chamfer, circle, diamond, inset, pill, pillPoint, poly, ring, roundRect, type Box, type Pt } from '../shapes';
import { CARD_W, type Skeleton } from '../layout';
import type { TextLook } from '../text';
import type { Defs } from '../defs';
import { center, gem, metalBand } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const SERIF = 'Marcellus';
/** Números e regras: letra sem serifa (na Marcellus o 0 parece O e o 1 parece I). */
const SANS = 'Noto Sans';
const INK = '#f1edff';

const accent = (pal: Palette) => lighten(vivid(pal.base), 0.25);

/**
 * Faixa de metal com relevo e sombra. No padrão do estilo é aço escuro polido
 * (como na referência: escuro, com fios de luz); com outro metal escolhido na
 * Aparência, usa esse metal.
 */
function chrome(a: PieceArgs, d: string, depth = 2.2, shadow = true): string {
  let band: string;
  if (a.pal.metal === 'silver') {
    const g = a.defs.linear([[0, '#e9ebf4'], [0.1, '#9ea2b6'], [0.32, '#3b3e4f'], [0.5, '#1c1d28'], [0.68, '#3d4052'], [0.9, '#a3a7bb'], [1, '#eef0f8']]);
    const tint = a.defs.hue(a.pal, (c) => vivid(c), 0.22);
    band = `<g filter="${a.defs.bevel(depth, 0.95)}"><path d="${d}" fill="${g}" fill-rule="evenodd"/><path d="${d}" fill="${tint}" fill-rule="evenodd"/></g>`;
  } else band = metalBand(a.defs, a.pal, d, depth);
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


const text = (weight = 400): TextLook => ({ family: SERIF, weight, color: INK });

// ───────────── esqueleto (arranjo da referência) ─────────────
// topo: placa com número e coleção entre dois soquetes (edição e classe);
// janela da arte; faixa do nome entre a gema do custo e a da raridade;
// linha de tipo; painel de regras; placa de baixo com ATK e DEF.
const T = 18; // espessura da moldura
export function vazioLayout(rulesH: number): Partial<Skeleton> {
  const rules = { x: 62, y: 918 - rulesH, w: 626, h: rulesH };
  const typeBar = { x: 130, y: rules.y - 50, w: 490, h: 44 };
  const header = { x: 118, y: typeBar.y - 78, w: 514, h: 72 };
  const cy = header.y + header.h / 2;
  return {
    rules, typeBar, header,
    cost: { x: 20, y: cy - 62, w: 124, h: 124 },
    footer: { x: 170, y: 26, w: 410, h: 56 },
    set: { x: 30, y: 16, w: 84, h: 84 },
    class: { x: 636, y: 16, w: 84, h: 84 },
    atk: { x: 58, y: 946, w: 150, h: 70 },
    def: { x: 542, y: 946, w: 150, h: 70 },
  };
}

/** Janela da arte: retângulo de cantos chanfrados, do topo até o meio da faixa do nome. */
function artWindow(S: Skeleton): Box {
  return { x: T + 26, y: 98, w: CARD_W - 2 * (T + 26), h: S.header.y + S.header.h / 2 - 98 };
}

/** Placa de cima (número e coleção): larga em cima, afunila embaixo. */
function topPlate(b: Box, t: number): string {
  const c = 22 - t;
  return poly([[b.x + t, b.y + t], [b.x + b.w - t, b.y + t], [b.x + b.w - c - t, b.y + b.h - t], [b.x + c + t, b.y + b.h - t]]);
}

/** Gema redonda facetada (raridade, na ponta direita da faixa do nome). */
function roundGem(defs: Defs, cx: number, cy: number, r: number, color: string): string {
  const pts = (rr: number, n = 10, rot = 0): Pt[] => Array.from({ length: n }, (_, k) => [cx + rr * Math.cos(rot + (k * 2 * Math.PI) / n), cy + rr * Math.sin(rot + (k * 2 * Math.PI) / n)] as Pt);
  const o = pts(r - 7), t = pts((r - 7) * 0.55, 10, Math.PI / 10);
  let f = '';
  for (let k = 0; k < 10; k++) {
    const k2 = (k + 1) % 10;
    const sh = [0.45, 0.3, 0.1, -0.1, -0.3, -0.42, -0.3, -0.1, 0.15, 0.35][k];
    f += `<path d="${poly([o[k], o[k2], t[k], t[(k + 9) % 10]])}" fill="${sh > 0 ? lighten(color, sh) : darken(color, -sh)}"/>`;
  }
  return `<g filter="${defs.shadow(3, 5, 0.7)}"><path d="${ring(circle(cx, cy, r), circle(cx, cy, r - 7))}" fill="${defs.linear([[0, '#f4f5fa'], [0.45, '#8a8ea0'], [0.55, '#5a5d6d'], [1, '#e3e5ee']])}"/></g>` +
    `<path d="${circle(cx, cy, r - 7)}" fill="${darken(color, 0.5)}"/>` + f +
    `<path d="${poly(t)}" fill="${defs.radial([[0, lighten(color, 0.5)], [0.8, color], [1, darken(color, 0.2)]], 0.4, 0.35, 0.8)}"/>` +
    `<path d="${diamond(cx - r * 0.28, cy - r * 0.34, 4, 2.5)}" fill="#fff" opacity=".8"/>`;
}

export const vazio: PieceStyle[] = [
  {
    // faixa do nome: fita azul-noite de pontas em seta, com fio de cromo
    style: 'vazio', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const inner = banner(inset(b, 7, 7), 28);
      const c = vivid(a.pal.base);
      const svg =
        chrome(a, banner(b, 34) + inner, 1.8) +
        `<g opacity="${a.opacity}"><path d="${inner}" fill="${a.defs.hue(a.pal, (x) => mix(darken(vivid(x), 0.45), '#10195a', 0.55))}"/>` +
        `<path d="${inner}" fill="${a.defs.linear([[0, '#ffffff', 0.28], [0.45, '#ffffff', 0.04], [0.55, '#000', 0.12], [1, '#000', 0.35]])}"/></g>` +
        glowLine(a, banner(inset(b, 12, 12), 24), 1, 0.5) +
        gem(b.x + b.w / 2, b.y + b.h - 3, 6, 8, c);
      return { svg, content: inset(b, 70, 12), text: { family: SERIF, weight: 400, color: '#ffffff', glow: darken(c, 0.4) } };
    },
  },
  { style: 'vazio', kind: 'cost', opacity: 1, metal: 'silver', render: (a) => facetGem(a, a.box) },
  { style: 'vazio', kind: 'class', opacity: 1, metal: 'silver', render: (a) => socket(a, a.box) },
  { style: 'vazio', kind: 'set', opacity: 1, metal: 'silver', render: (a) => socket(a, a.box, true) },
  {
    // linha de tipo: texto claro centralizado entre dois fios que somem
    style: 'vazio', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const { cy } = center(b);
      const c = accent(a.pal);
      const fade = (x0: number, x1: number, rev: boolean) =>
        `<rect x="${x0}" y="${cy - 0.8}" width="${x1 - x0}" height="1.6" fill="${a.defs.linear(rev ? [[0, c, 0.7], [1, c, 0]] : [[0, c, 0], [1, c, 0.7]], 'h')}"/>`;
      const svg = `<rect x="${b.x}" y="${b.y + 4}" width="${b.w}" height="${b.h - 8}" rx="6" fill="${a.defs.linear([[0, '#07060f', 0], [0.5, '#07060f', 0.55 * a.opacity], [1, '#07060f', 0]], 'h')}"/>` +
        fade(b.x - 30, b.x + 70, false) + fade(b.x + b.w - 70, b.x + b.w + 30, true);
      // a raridade vai numa gema redonda na ponta direita da faixa do nome
      const S = a.layout;
      const gy = S ? S.header.y + S.header.h / 2 : b.y - 40;
      return { svg, content: inset(b, 76, 6), text: { family: SANS, weight: 500, color: '#d9d5ec' }, align: 'center', gem: { x: 622, y: gy - 44, w: 88, h: 88 } };
    },
    gemRender: (box, color, defs) => roundGem(defs, box.x + box.w / 2, box.y + box.h / 2, box.w / 2, color),
  },
  {
    style: 'vazio', kind: 'rules', opacity: 0.94, metal: 'silver',
    render(a) {
      const b = a.box;
      const inner = chamfer(inset(b, 5), 16);
      const svg =
        chrome(a, chamfer(b, 20) + inner, 1.6) +
        voidFill(a, inner) +
        glowLine(a, chamfer(inset(b, 11), 12), 1, 0.45);
      return { svg, content: inset(b, 34, 24), text: { family: SANS, weight: 400, color: '#ebe7f7' } };
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
      const hex = (k: number) => poly([[b.x + k, cy], [b.x + 18 + k * 0.6, b.y + k], [b.x + b.w - 18 - k * 0.6, b.y + k], [b.x + b.w - k, cy], [b.x + b.w - 18 - k * 0.6, b.y + b.h - k], [b.x + 18 + k * 0.6, b.y + b.h - k]]);
      const svg = chrome(a, hex(0) + hex(6)) + voidFill(a, hex(6), 0.1) + glowLine(a, hex(10), 1, 0.5);
      return { svg, content: inset(b, 22, 9), text: { family: SANS, weight: 700, color: '#ffffff' } };
    },
  },
  {
    // placa de cima: número da carta e coleção
    style: 'vazio', kind: 'footer', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const svg = chrome(a, topPlate(b, 0) + topPlate(b, 6), 1.8) + voidFill(a, topPlate(b, 6), 0.1) + glowLine(a, topPlate(b, 10), 1, 0.45);
      return { svg, content: inset(b, 34, 8), text: { family: SERIF, weight: 400, color: '#e4e0f2' } };
    },
  },
  {
    style: 'vazio', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const S = a.layout;
      const c = vivid(a.pal.base);
      const inner = inset(b, T);
      const win = S ? artWindow(S) : inset(b, 44);
      const winD = chamfer(win, 22);
      const barY = win.y + win.h;
      // fundo: vazio azul-noite tingido pela classe, com uma névoa luminosa
      const under = `<path d="${roundRect(b, CARD_RADIUS)}" fill="${a.defs.hue(a.pal, (x) => mix(darken(vivid(x), 0.84), '#05050d', 0.4))}"/>` +
        `<path d="${roundRect(b, CARD_RADIUS)}" fill="${a.defs.radial([[0, c, 0.22], [1, c, 0]], 0.5, 0.78, 0.6)}"/>`;
      // coluna de losangos na lateral da janela
      let rail = '';
      for (let i = 0; i < 5; i++) rail += gem(win.x + 20, win.y + 50 + i * 40, 7, 10, i < 3 ? lighten(c, 0.1) : darken(c, 0.55));
      // placa de baixo, angulosa, onde ficam ATK e DEF
      const bp = { x: b.x + 30, y: 932, w: b.w - 60, h: 92 };
      const plate = poly([[bp.x + 30, bp.y], [bp.x + bp.w - 30, bp.y], [bp.x + bp.w, bp.y + 34], [bp.x + bp.w - 18, bp.y + bp.h], [bp.x + 18, bp.y + bp.h], [bp.x, bp.y + 34]]);
      const svg =
        // borda de fora: aço escuro com fios de luz nas beiradas e brilho fino na cor da classe
        `<path d="${roundRect(b, CARD_RADIUS) + chamfer(inner, 26)}" fill-rule="evenodd" fill="${a.pal.metal === 'silver' ? mix('#23242f', c, 0.12) : a.defs.metal(a.pal)[0]}"/>` +
        `<path d="${roundRect(inset(b, 1.5), CARD_RADIUS - 1.5)}" fill="none" stroke="#c9ccda" stroke-width="2" opacity=".75"/>` +
        `<path d="${chamfer(inset(inner, -1.5), 27)}" fill="none" stroke="#dfe2ee" stroke-width="2.2" opacity=".85"/>` +
        `<path d="${roundRect(inset(b, 8), CARD_RADIUS - 8)}" fill="none" stroke="#6d7184" stroke-width="1" opacity=".6"/>` +
        glowLine(a, chamfer(inset(inner, 3), 23), 1.4, 0.8) +
        // janela da arte com aro de cromo e filete
        chrome(a, chamfer(inset(win, -6), 25) + winD, 1.8) +
        glowLine(a, chamfer(inset(win, 3), 19), 1.1, 0.6) +
        // barra de cromo atrás da faixa do nome
        chrome(a, `M${inner.x} ${barY - 9}H${inner.x + inner.w}V${barY + 9}H${inner.x}Z`, 1.6) +
        glowLine(a, `M${inner.x + 4} ${barY}H${inner.x + inner.w - 4}`, 1, 0.5) +
        chrome(a, plate, 2) + voidFill(a, poly([[bp.x + 36, bp.y + 7], [bp.x + bp.w - 36, bp.y + 7], [bp.x + bp.w - 8, bp.y + 36], [bp.x + bp.w - 22, bp.y + bp.h - 7], [bp.x + 22, bp.y + bp.h - 7], [bp.x + 8, bp.y + 36]]), 0.05) +
        gem(b.x + b.w / 2, bp.y + bp.h / 2, 9, 13, c) + rail;
      return { svg, content: inset(b, T + 8), text: text(), under, artClip: winD };
    },
  },
];
