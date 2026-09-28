/**
 * Estilo GÓTICO — ferro negro com rebites, arcos pontiagudos, pedra escura e
 * rosáceas de vitral na cor da classe. Letra gótica nos títulos.
 */
import { darken, lighten } from '../color';
import { layers, type Defs } from '../defs';
import { vivid, type Palette } from '../palette';
import { arch, circle, heater, inset, quatrefoil, rect, type Box, type Pt } from '../shapes';
import type { TextLook } from '../text';
import { center, fadeLine, metalBand, rivets, stone } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Grenze Gotisch';
const BODY = 'EB Garamond';
const INK = '#efe7da';

/** Ferro com relevo + um véu da cor do deck. */
function iron(defs: Defs, pal: Palette, d: string, depth = 2.2): string {
  return metalBand(defs, pal, d, depth) +
    `<path d="${d}" fill-rule="evenodd" fill="${defs.hue(pal, vivid)}" opacity=".2"/>`;
}

/** Vitral: cunhas coloridas com chumbo escuro entre elas, recortado pela forma `clip`. */
function vitral(defs: Defs, pal: Palette, cx: number, cy: number, r: number, clip: string, key: string): string {
  const cid = defs.add(`vclip:${key}:${cx}:${cy}`, (id) => `<clipPath id="${id}"><path d="${clip}"/></clipPath>`);
  const n = 12;
  let wedges = '';
  let lead = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const R = r * 1.4;
    const p0: Pt = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R];
    const p1: Pt = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R];
    const c = pal.colors[i % pal.colors.length];
    const shades = [lighten(vivid(c), 0.3), vivid(c), darken(vivid(c), 0.25), lighten(vivid(c), 0.1)];
    wedges += `<path d="M${cx} ${cy}L${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}Z" fill="${shades[i % 4]}"/>`;
    lead += `M${cx} ${cy}L${p0[0].toFixed(1)} ${p0[1].toFixed(1)}`;
  }
  const glassShine = defs.radial([[0, '#fff', 0.55], [0.5, '#fff', 0.05], [1, '#000', 0.35]], 0.35, 0.3, 0.8);
  return `<g clip-path="url(#${cid})">${wedges}` +
    `<path d="${circle(cx, cy, r * 1.4)}" fill="${glassShine}"/>` +
    `<path d="${lead}${circle(cx, cy, r * 0.82)}" fill="none" stroke="#141112" stroke-width="3"/>` +
    `</g>`;
}

function rosette(a: PieceArgs, small = false): PieceOut {
  const { box: b, defs, pal } = a;
  const { cx, cy } = center(b);
  const r = b.w / 2 + (small ? 2 : 10);
  const outer = quatrefoil(cx, cy, r);
  const inner = quatrefoil(cx, cy, r - 9);
  const disc = r * (small ? 0.42 : 0.5);
  const svg =
    `<g filter="${defs.shadow(4, 6, 0.65)}">${iron(defs, pal, outer + inner, 2.4)}</g>` +
    vitral(defs, pal, cx, cy, r - 9, inner, a.box.x + '') +
    `<path d="${circle(cx, cy, disc + 5)}" fill="#1a1718"/>` +
    iron(defs, pal, circle(cx, cy, disc + 5) + circle(cx, cy, disc), 1.4) +
    `<path d="${circle(cx, cy, disc)}" fill="${defs.radial([[0, '#2b2426'], [1, '#0b090a']])}"/>`;
  return { svg, content: { x: cx - disc, y: cy - disc, w: disc * 2, h: disc * 2 }, text: { family: TITLE, weight: 700, color: INK } };
}

/** Cantoneiras de ferro em L com rebites (caixa de regras, rodapé). */
function brackets(defs: Defs, pal: Palette, b: Box, arm: number, t: number): string {
  const L = (x: number, y: number, sx: number, sy: number) =>
    `M${x} ${y}h${sx * arm}v${sy * t}h${-sx * (arm - t)}v${sy * (arm - t)}h${-sx * t}Z`;
  const d = L(b.x, b.y, 1, 1) + L(b.x + b.w, b.y, -1, 1) + L(b.x, b.y + b.h, 1, -1) + L(b.x + b.w, b.y + b.h, -1, -1);
  const rv: [number, number][] = [];
  for (const [x, y, sx, sy] of [[b.x, b.y, 1, 1], [b.x + b.w, b.y, -1, 1], [b.x, b.y + b.h, 1, -1], [b.x + b.w, b.y + b.h, -1, -1]]) {
    rv.push([x + sx * (arm - t / 2 - 2), y + sy * t / 2], [x + sx * t / 2, y + sy * (arm - t / 2 - 2)], [x + sx * t / 2, y + sy * t / 2]);
  }
  return `<g filter="${defs.shadow(3, 3, 0.6)}">${layers(d, defs.metal(pal))}</g>` +
    `<path d="${d}" fill="${defs.hue(pal, vivid)}" opacity=".18"/>` + rivets(defs, rv, t * 0.22);
}

const title = (size = 1): TextLook => ({ family: TITLE, weight: 600, color: INK, tracking: 0.01 * size });

export const gotico: PieceStyle[] = [
  {
    style: 'gotico', kind: 'header', opacity: 1, metal: 'iron',
    render(a) {
      const { box: b0, defs, pal } = a;
      const b = { x: b0.x - 6, y: b0.y - 14, w: b0.w + 12, h: b0.h + 14 };
      const outer = arch(b, 26);
      const inner = arch(inset(b, 9, 9), 20);
      const { cx } = center(b);
      const rv: [number, number][] = [];
      for (let x = b.x + 24; x < b.x + b.w - 10; x += 44) rv.push([x, b.y + b.h - 4.5]);
      const svg =
        `<g filter="${defs.shadow(5, 6, 0.6)}">${iron(defs, pal, outer + inner, 2.6)}</g>` +
        stone(defs, pal, inner, a.opacity) +
        `<path d="${arch(inset(b, 15, 15), 15)}" fill="none" stroke="${vivid(pal.base)}" stroke-width="1.4" opacity=".75"/>` +
        rivets(defs, rv, 3.2) +
        `<path d="${quatrefoil(cx, b.y + 21, 8)}" fill="${vivid(pal.base)}" stroke="#111" stroke-width="1.5"/>`;
      return { svg, content: { x: b.x + 58, y: b.y + 26, w: b.w - 116, h: b.h - 36 }, text: title() };
    },
  },
  { style: 'gotico', kind: 'cost', opacity: 1, metal: 'iron', render: (a) => rosette(a) },
  { style: 'gotico', kind: 'class', opacity: 1, metal: 'iron', render: (a) => rosette(a) },
  { style: 'gotico', kind: 'set', opacity: 1, metal: 'iron', render: (a) => rosette(a, true) },
  {
    style: 'gotico', kind: 'typeBar', opacity: 1, metal: 'iron',
    render(a) {
      const { box: b0, defs, pal } = a;
      const b = inset(b0, 22, 8);
      const { cy } = center(b);
      const r = b.h / 2 + 6;
      // barra com "dobradiças" redondas nas pontas
      const bar = rect(b) + circle(b.x, cy, r) + circle(b.x + b.w, cy, r);
      const innerBar = rect(inset(b, 0, 7));
      const svg =
        `<g filter="${defs.shadow(5, 6, 0.6)}">${layers(bar, defs.metal(pal))}` +
        `<path d="${bar}" fill="${defs.hue(pal, vivid)}" opacity=".2"/></g>` +
        stone(defs, pal, innerBar, a.opacity) +
        vitral(defs, pal, b.x, cy, r - 6, circle(b.x, cy, r - 6), 'tl') + vitral(defs, pal, b.x + b.w, cy, r - 6, circle(b.x + b.w, cy, r - 6), 'tr') +
        `<path d="${circle(b.x, cy, r - 6)}${circle(b.x + b.w, cy, r - 6)}" fill="none" stroke="#141112" stroke-width="2.5"/>` +
        fadeLine(defs, b.x + 30, b.y + b.h - 10, b.w - 60, vivid(pal.base), 1, 0.7);
      return {
        svg, content: { x: b.x + r + 10, y: b.y + 4, w: b.w - 2 * r - 70, h: b.h - 8 }, text: title(),
        gem: { x: b.x + b.w - r - 46, y: cy - 12, w: 24, h: 24 },
      };
    },
  },
  {
    style: 'gotico', kind: 'rules', opacity: 0.94, metal: 'iron',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = rect(b);
      const inner = rect(inset(b, 7));
      const svg =
        `<g filter="${defs.shadow(6, 8, 0.6)}">${iron(defs, pal, outer + inner, 2)}</g>` +
        stone(defs, pal, inner, a.opacity) +
        `<path d="${rect(inset(b, 16))}" fill="none" stroke="${vivid(pal.base)}" stroke-width="1.2" opacity=".6"/>` +
        brackets(defs, pal, inset(b, -4), 64, 16);
      return { svg, content: inset(b, 36, 30), text: { family: BODY, weight: 500, color: INK } };
    },
    divider(a, x, y, w) {
      const c = vivid(a.pal.base);
      const cx = x + w / 2;
      return fadeLine(a.defs, x, y, w, c, 1.2, 0.8) +
        [cx - 26, cx, cx + 26].map((px, i) => `<path d="${quatrefoil(px, y, i === 1 ? 8 : 5)}" fill="${c}" stroke="#111" stroke-width="1"/>`).join('');
    },
    flavor: () => ({ family: BODY, italic: true, weight: 400, color: '#c9bca9' }),
  },
  {
    style: 'gotico', kind: 'stat', opacity: 1, metal: 'iron',
    render(a) {
      const { box: b0, defs, pal, variant } = a;
      const b = { x: b0.x + 18, y: b0.y - 10, w: b0.w - 36, h: b0.h + 16 };
      const outer = heater(b);
      const inner = heater(inset(b, 6, 6));
      const field = variant === 'atk'
        ? `<path d="${inner}" fill="${defs.hue(pal, (c) => darken(vivid(c), 0.35))}"/>`
        : stone(defs, pal, inner);
      const svg = `<g filter="${defs.shadow(4, 5, 0.6)}">${iron(defs, pal, outer + inner, 2.2)}</g>` + field +
        `<path d="${inner}" fill="${defs.linear([[0, '#fff', 0.18], [0.4, '#fff', 0], [1, '#000', 0.3]])}"/>`;
      return { svg, content: { x: b.x + 4, y: b.y + 8, w: b.w - 8, h: b.h * 0.62 }, text: { family: TITLE, weight: 700, color: INK } };
    },
  },
  {
    style: 'gotico', kind: 'footer', opacity: 1, metal: 'iron',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = rect(b);
      const inner = rect(inset(b, 5));
      const svg = `<g filter="${defs.shadow(3, 4, 0.5)}">${iron(defs, pal, outer + inner, 1.6)}</g>` + stone(defs, pal, inner) +
        rivets(defs, [[b.x + 9, b.y + b.h / 2], [b.x + b.w - 9, b.y + b.h / 2]], 3);
      return { svg, content: inset(b, 20, 4), text: { family: BODY, weight: 500, color: '#d8ccbb' } };
    },
  },
  {
    style: 'gotico', kind: 'frame', opacity: 1, metal: 'iron',
    render(a) {
      const { box: b, defs, pal } = a;
      const outer = rect(b);
      const inner = arch(inset(b, 16), 60);
      const rv: [number, number][] = [];
      for (let y = 80; y < b.h - 20; y += 60) rv.push([8, y], [b.w - 8, y]);
      for (let x = 60; x < b.w - 20; x += 60) rv.push([x, b.h - 8]);
      const svg = iron(defs, pal, outer + inner, 2.4) + rivets(defs, rv, 3.4);
      return { svg, content: inset(b, 16), text: { family: BODY, color: INK } };
    },
  },
];
