/**
 * Estilo ENERGIA — inspirado nas cartas de monstros "tipo V" (referência: modelo
 * editável da Etsy, ArtQuesta): corpo preto com faixa prateada em "V" no canto,
 * barra do nome em degradê da cor do tipo para o branco, esferas de energia
 * (símbolo preto sobre esfera colorida) e barras pretas com curvas prateadas.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS, CARD_W, type Skeleton } from '../layout';
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

// ───────────── esqueleto (arranjo da referência) ─────────────
// custo pequeno no canto (onde fica o "BÁSICO"); nome grande à esquerda; esfera
// do tipo no canto direito; cunha prateada em "V"; pílula vermelha da
// habilidade (tipo); regras numa faixa clara; barra preta com ATK/DEF.
const B = 14; // borda preta
export function energiaLayout(rulesH: number): Partial<Skeleton> {
  const rules = { x: 34, y: 930 - rulesH, w: 682, h: rulesH };
  return {
    cost: { x: 26, y: 26, w: 96, h: 66 },
    header: { x: 124, y: 26, w: 510, h: 66 },
    class: { x: 646, y: 22, w: 76, h: 76 },
    typeBar: { x: 34, y: rules.y - 54, w: 682, h: 48 },
    rules,
    atk: { x: 40, y: 950, w: 170, h: 50 },
    def: { x: 218, y: 950, w: 170, h: 50 },
    set: { x: 672, y: 994, w: 40, h: 40 },
    footer: { x: 34, y: 1004, w: 420, h: 26 },
  };
}

export const energia: PieceStyle[] = [
  {
    // nome: faixa em degradê da cor do tipo para o branco, letra preta grossa e inclinada
    style: 'energia', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const c = typeColor(a.pal);
      const d = `M${b.x} ${b.y + 8}H${b.x + b.w - 20}L${b.x + b.w} ${b.y + b.h / 2}L${b.x + b.w - 20} ${b.y + b.h - 8}H${b.x}Z`;
      const svg = `<g opacity="${a.opacity}"><path d="${d}" fill="${a.fill ?? a.defs.linear([[0, lighten(c, 0.15), 0.95], [0.55, lighten(c, 0.6), 0.9], [1, '#ffffff', 0.85]], 'h')}"/></g>` +
        `<path d="M${b.x} ${b.y + b.h - 10}H${b.x + b.w - 22}" stroke="${darken(c, 0.35)}" stroke-width="2" opacity=".5"/>`;
      return { svg, content: { x: b.x + 14, y: b.y + 6, w: b.w - 40, h: b.h - 12 }, text: { family: SANS, weight: 800, italic: true, color: INK }, align: 'left' };
    },
  },
  {
    // custo: plaquinha preta com as esferas de energia (como o "BÁSICO" da referência)
    style: 'energia', kind: 'cost', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const d = `M${b.x} ${b.y + 6}H${b.x + b.w - 12}L${b.x + b.w} ${b.y + b.h / 2}L${b.x + b.w - 12} ${b.y + b.h - 6}H${b.x}Z`;
      const svg = `<g filter="${a.defs.shadow(2, 3, 0.6)}"><path d="${d}" fill="${BLACK}" opacity="${a.opacity}"/></g>` +
        `<path d="${d}" fill="none" stroke="#c9ccd4" stroke-width="1.5" opacity=".7"/>`;
      return { svg, content: inset(b, 10, 10), text: text('#ffffff', 800), costOrbs: true };
    },
  },
  { style: 'energia', kind: 'class', opacity: 1, metal: 'silver', render: (a) => energy(a, a.box) },
  {
    style: 'energia', kind: 'set', opacity: 1, metal: 'silver',
    render: (a) => ({ svg: '', content: a.box, text: text('#ffffff') }),
  },
  {
    // habilidade: pílula vermelha com o tipo, e um fio até a borda
    style: 'energia', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const { cy } = center(b);
      const w = Math.min(b.w - 80, 440);
      const pillD = `M${b.x + 18} ${b.y + 6}H${b.x + w}L${b.x + w + 18} ${cy}L${b.x + w} ${b.y + b.h - 6}H${b.x + 18}L${b.x} ${cy}Z`;
      const svg = `<g filter="${a.defs.shadow(2, 3, 0.5)}"><path d="${pillD}" fill="${a.defs.linear([[0, '#e5363a'], [1, '#a3141a']])}" opacity="${a.opacity}"/></g>` +
        `<path d="${pillD}" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>` +
        `<rect x="${b.x + w + 24}" y="${cy - 1}" width="${b.w - w - 64}" height="2" fill="${a.defs.linear([[0, '#e5363a', 0.8], [1, '#e5363a', 0]], 'h')}"/>`;
      return { svg, content: { x: b.x + 26, y: b.y + 6, w: w - 20, h: b.h - 12 }, text: { family: SANS, weight: 800, italic: true, color: '#ffffff' }, gem: { x: b.x + b.w - 32, y: cy - 14, w: 28, h: 28 } };
    },
  },
  {
    // regras: faixa clara translúcida (cor do tipo bem clara), letra preta
    style: 'energia', kind: 'rules', opacity: 0.88, metal: 'silver',
    render(a) {
      const b = a.box;
      const c = typeColor(a.pal);
      const d = roundRect(b, 10);
      const svg = `<g opacity="${a.opacity}"><path d="${d}" fill="${a.fill ?? a.defs.linear([[0, mix(lighten(c, 0.82), '#fff', 0.4), 0.82], [1, mix(lighten(c, 0.7), '#fff', 0.2), 0.95]])}"/></g>` +
        `<path d="${d}" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`;
      return { svg, content: inset(b, 24, 20), text: { family: SANS, weight: 500, color: INK } };
    },
    divider(a, x, y, w) {
      return `<rect x="${x}" y="${y - 0.8}" width="${w}" height="1.6" fill="${INK}" opacity=".35"/>`;
    },
    flavor: () => ({ family: SANS, weight: 400, italic: true, color: '#3a3a40' }),
  },
  {
    // ATK/DEF: células na barra preta de baixo (como fraqueza/resistência)
    style: 'energia', kind: 'stat', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const r = (b.h - 8) / 2;
      const svg = `<rect x="${b.x}" y="${b.y + 4}" width="${b.w}" height="${b.h - 8}" rx="${r}" fill="#26262c" opacity="${a.opacity}"/>` +
        `<rect x="${b.x}" y="${b.y + 4}" width="${b.w}" height="${b.h - 8}" rx="${r}" fill="none" stroke="#8e929c" stroke-width="1.2" opacity=".7"/>`;
      return { svg, content: inset(b, 16, 6), text: text('#ffffff', 800) };
    },
  },
  {
    style: 'energia', kind: 'footer', opacity: 1, metal: 'silver',
    render: (a) => ({ svg: '', content: a.box, text: { family: SANS, weight: 500, color: '#d6d7dc' } }),
  },
  {
    style: 'energia', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const outer = roundRect(b, CARD_RADIUS);
      const win = roundRect(inset(b, B), CARD_RADIUS - B);
      const silver = { ...a.pal, metal: a.pal.metal === 'deck' ? 'silver' as const : a.pal.metal };
      // cunha prateada em "V" no canto de cima, logo abaixo do nome
      const v = poly([[B, 100], [104, 100], [178, 300], [138, 300], [72, 124], [B, 124]]) + poly([[B, 136], [52, 136], [96, 262], [B, 330]]);
      const bottomBar = `M${B} 940H${CARD_W - B}V${1050 - B}H${B}Z`;
      const curve = bezier([B, 946], [250, 930], [500, 954], [CARD_W - B, 936], 30);
      const svg =
        `<path d="${outer + win}" fill-rule="evenodd" fill="${BLACK}"/>` +
        `<path d="${roundRect(inset(b, B - 3), CARD_RADIUS - B + 3)}" fill="none" stroke="#d7dae2" stroke-width="3"/>` +
        `<path d="${roundRect(inset(b, B - 6), CARD_RADIUS - B + 6)}" fill="none" stroke="#7d818c" stroke-width="1"/>` +
        // sombra atrás do nome, para ler sobre qualquer arte
        `<rect x="${B}" y="${B}" width="${CARD_W - 2 * B}" height="104" fill="${a.defs.linear([[0, '#000', 0.6], [1, '#000', 0]])}"/>` +
        `<g filter="${a.defs.shadow(2, 3, 0.6)}">${metalSolid(a.defs, silver, v, 1.2)}</g>` +
        // barra preta de baixo com a curva prateada
        `<path d="${bottomBar}" fill="${BLACK}" opacity=".95"/>` + swoosh(a, curve, 5, 2);
      return { svg, content: inset(b, B), text: text(), artClip: win };
    },
  },
];
