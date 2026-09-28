/**
 * Estilo ARCANO — vidro escuro com linhas finas luminosas, marcas rúnicas nas
 * bordas, cantos em losango e selos como círculos de conjuração.
 */
import { darken, lighten, mix, tone } from '../color';
import { glowOf, vivid, type Palette } from '../palette';
import { chamfer, circle, diamond, inset, poly, star, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center, fadeLine } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Marcellus';
const BODY = 'Cormorant Garamond';
const INK = '#eef3ff';

/** Linha luminosa: ou na cor do deck, ou em metal escolhido. */
function lum(a: PieceArgs): string {
  const { defs, pal } = a;
  return pal.metal === 'deck' ? defs.hue(pal, (c) => lighten(vivid(c), 0.25)) : defs.metal(pal)[0];
}

function glassFill(a: PieceArgs, d: string): string {
  const { defs, pal } = a;
  const deep = (c: string) => mix(darken(tone(c, { s: 0.7 }), 0.8), '#05060d', 0.4);
  return `<path d="${d}" fill="${defs.hue(pal, deep)}" fill-opacity="${a.opacity}"/>` +
    `<path d="${d}" fill="${defs.linear([[0, lighten(vivid(pal.base), 0.4), 0.2], [0.08, vivid(pal.base), 0.06], [0.5, pal.base, 0], [1, vivid(pal.base), 0.12]])}"/>`;
}

/**
 * Faixa de runas: glifos inventados (haste + galhos), determinísticos pela posição,
 * centralizados em `cx`. Parecem escrita antiga sem ser nenhum alfabeto real.
 */
function runes(cx: number, y: number, count: number, h: number, color: string): string {
  const step = h * 0.95;
  let d = '';
  const x0 = cx - ((count - 1) * step) / 2;
  for (let i = 0; i < count; i++) {
    const x = x0 + i * step;
    const k = (i * 7 + 3) % 11;
    const t = y - h / 2, b = y + h / 2, m = y;
    const w = h * 0.3;
    d += `M${x} ${t}V${b}`; // haste
    if (k % 2) d += `M${x} ${t + h * 0.2}L${x + w} ${t}`;
    if (k % 3 === 0) d += `M${x} ${m}L${x - w} ${m - h * 0.25}`;
    if (k % 3 === 1) d += `M${x} ${m}L${x + w} ${m + h * 0.25}`;
    if (k % 4 === 2) d += `M${x - w} ${b}L${x} ${b - h * 0.25}L${x + w} ${b}`;
    if (k % 5 === 4) d += `M${x - w} ${t + h * 0.35}H${x + w}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
}

/** Tracinhos de régua ao longo de uma linha horizontal (de fora para dentro). */
function ticks(x: number, y: number, w: number, step: number, color: string, len = 5): string {
  let d = '';
  for (let i = step, n = 0; i < w - step / 2; i += step, n++) {
    const l = n % 4 === 0 ? len * 1.8 : len;
    d += `M${(x + i).toFixed(1)} ${y}v${l}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="1.1" opacity=".8" fill="none"/>`;
}

function cornerGems(b: Box, color: string, s = 6): string {
  return [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
    .map(([x, y]) => `<path d="${diamond(x, y, s, s)}" fill="${color}"/><path d="${diamond(x, y, s * 0.45, s * 0.45)}" fill="#fff" opacity=".8"/>`).join('');
}

function panel(a: PieceArgs, b: Box, cut: number, content: Box, text: TextLook, withRunes = true): PieceOut {
  const { defs, pal } = a;
  const outer = chamfer(b, cut);
  const inner = chamfer(inset(b, 6), Math.max(2, cut - 4));
  const L = lum(a);
  const g = glowOf(pal.base);
  const svg =
    `<g filter="${defs.shadow(4, 10, 0.6)}">${glassFill(a, outer)}</g>` +
    `<g filter="${defs.glow(g, 5, 1)}"><path d="${outer}" fill="none" stroke="${L}" stroke-width="2"/></g>` +
    `<path d="${inner}" fill="none" stroke="${L}" stroke-width=".8" opacity=".55"/>` +
    (withRunes
      ? `<g filter="${defs.glow(g, 2.5, 0.9)}">` +
        ticks(b.x + cut, b.y + 6, b.w - cut * 2, 14, lighten(g, 0.35)) +
        ticks(b.x + cut, b.y + b.h - 6, b.w - cut * 2, 14, lighten(g, 0.35), -5) +
        runes(b.x + b.w / 2, b.y + b.h - 17, 11, 11, lighten(g, 0.45)) + `</g>`
      : '') +
    `<g filter="${defs.glow(g, 3, 0.9)}">${cornerGems(inset(b, cut * 0.3), lighten(g, 0.2), 5)}</g>`;
  return { svg, glass: outer, content, text };
}

/** Círculo de conjuração (custo, classe, edição). */
function sigil(a: PieceArgs, small = false): PieceOut {
  const { box: b, defs, pal } = a;
  const { cx, cy } = center(b);
  const r = b.w / 2 - 3;
  const g = glowOf(pal.base);
  const L = lum(a);
  let marks = '';
  const n = small ? 12 : 24;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const r1 = r - 5, r2 = r - (i % 3 === 0 ? 13 : 9);
    marks += `M${(cx + Math.cos(ang) * r1).toFixed(1)} ${(cy + Math.sin(ang) * r1).toFixed(1)}L${(cx + Math.cos(ang) * r2).toFixed(1)} ${(cy + Math.sin(ang) * r2).toFixed(1)}`;
  }
  const svg =
    `<g filter="${defs.shadow(3, 8, 0.6)}"><path d="${circle(cx, cy, r)}" fill="${defs.radial([[0, darken(vivid(pal.base), 0.45)], [0.7, darken(pal.base, 0.82)], [1, '#04050a']], 0.5, 0.45, 0.6)}" fill-opacity="${Math.max(0.85, a.opacity)}"/></g>` +
    (small ? '' : `<path d="${star(cx, cy, r * 0.84, r * 0.48, 6, 0)}" fill="none" stroke="${lighten(g, 0.2)}" stroke-width="1" opacity=".42"/>`) +
    `<g filter="${defs.glow(g, 4, 0.9)}"><path d="${circle(cx, cy, r)}" fill="none" stroke="${L}" stroke-width="2"/>` +
    `<path d="${marks}" stroke="${lighten(g, 0.2)}" stroke-width="1.2" fill="none" opacity=".8"/></g>` +
    `<path d="${circle(cx, cy, r - 16)}" fill="none" stroke="${L}" stroke-width=".8" opacity=".5"/>` +
    (small ? '' : `<g filter="${defs.glow(g, 3, 1)}"><path d="${diamond(cx, cy - r, 6, 8)}" fill="${lighten(g, 0.3)}"/><path d="${diamond(cx, cy + r, 6, 8)}" fill="${lighten(g, 0.3)}"/></g>`);
  const ci = (r - 16) * 0.92;
  return { svg, content: { x: cx - ci, y: cy - ci, w: ci * 2, h: ci * 2 }, text: { family: TITLE, weight: 400, color: INK, glow: g } };
}

const glowText = (pal: Palette, family = TITLE, weight = 400): TextLook => ({ family, weight, color: INK, glow: darken(glowOf(pal.base), 0.2) });

export const arcano: PieceStyle[] = [
  {
    style: 'arcano', kind: 'header', opacity: 0.8, metal: 'deck',
    render(a) {
      const b = { ...a.box, x: a.box.x - 16, w: a.box.w + 32, y: a.box.y + 6, h: a.box.h - 12 };
      return panel(a, b, 18, { x: b.x + 60, y: b.y + 8, w: b.w - 120, h: b.h - 16 }, { ...glowText(a.pal), tracking: 0.03 });
    },
  },
  { style: 'arcano', kind: 'cost', opacity: 0.9, metal: 'deck', render: (a) => sigil(a) },
  { style: 'arcano', kind: 'class', opacity: 0.9, metal: 'deck', render: (a) => sigil(a) },
  { style: 'arcano', kind: 'set', opacity: 0.9, metal: 'deck', render: (a) => sigil(a, true) },
  {
    style: 'arcano', kind: 'typeBar', opacity: 0.82, metal: 'deck',
    render(a) {
      const b = inset(a.box, 8, 8);
      const p = panel(a, b, 16, { x: b.x + 30, y: b.y + 4, w: b.w - 110, h: b.h - 8 }, { ...glowText(a.pal), tracking: 0.04 }, false);
      p.gem = { x: b.x + b.w - 62, y: b.y + b.h / 2 - 13, w: 26, h: 26 };
      return p;
    },
  },
  {
    style: 'arcano', kind: 'rules', opacity: 0.78, metal: 'deck',
    render(a) {
      const b = a.box;
      return panel(a, b, 22, inset(b, 38, 30), { family: BODY, weight: 500, color: INK });
    },
    divider(a, x, y, w) {
      const g = glowOf(a.pal.base);
      const cx = x + w / 2;
      return `<g filter="${a.defs.glow(g, 3, 0.8)}">` + fadeLine(a.defs, x, y, w, lighten(g, 0.2), 1, 0.8) +
        `<path d="${circle(cx, y, 5)}" fill="none" stroke="${lighten(g, 0.3)}" stroke-width="1.2"/>` +
        `<path d="${circle(cx - 16, y, 1.8)}${circle(cx + 16, y, 1.8)}" fill="${lighten(g, 0.3)}"/></g>`;
    },
    flavor: (pal) => ({ family: BODY, italic: true, weight: 600, color: mix(INK, glowOf(pal.base), 0.35) }),
  },
  {
    style: 'arcano', kind: 'stat', opacity: 0.85, metal: 'deck',
    render(a) {
      const b = inset(a.box, 4);
      return panel(a, b, 16, inset(b, 12, 8), glowText(a.pal), false);
    },
  },
  {
    style: 'arcano', kind: 'footer', opacity: 0.7, metal: 'deck',
    render(a) {
      const b = inset(a.box, 2, 4);
      const { defs, pal } = a;
      const g = glowOf(pal.base);
      const svg = `<path d="${chamfer(b, 10)}" fill="#04050a" fill-opacity="${a.opacity}"/>` +
        `<g filter="${defs.glow(g, 3, 0.7)}"><path d="${chamfer(b, 10)}" fill="none" stroke="${lum(a)}" stroke-width="1"/></g>`;
      return { svg, content: inset(b, 12, 2), text: { family: BODY, weight: 600, color: mix(INK, g, 0.25) } };
    },
  },
  {
    style: 'arcano', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const g = glowOf(pal.base);
      const outer = `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`;
      const inner = chamfer(inset(b, 12), 26);
      const L = lum(a);
      const svg =
        `<path d="${outer + inner}" fill-rule="evenodd" fill="#05060b"/>` +
        `<path d="${inner}" fill="${defs.radial([[0.55, '#000', 0], [1, darken(pal.base, 0.8), 0.6]], 0.5, 0.5, 0.75)}"/>` +
        `<g filter="${defs.glow(g, 4, 0.9)}"><path d="${inner}" fill="none" stroke="${L}" stroke-width="1.6"/></g>` +
        `<path d="${chamfer(inset(b, 6), 30)}" fill="none" stroke="${L}" stroke-width=".7" opacity=".4"/>` +
        `<g filter="${defs.glow(g, 3, 1)}">${cornerGems({ x: 12 + 8, y: 12 + 8, w: b.w - 40, h: b.h - 40 }, lighten(g, 0.2), 7)}</g>` +
        `<path d="${poly([[b.w / 2 - 40, 12], [b.w / 2, 20], [b.w / 2 + 40, 12]], false)}" fill="none" stroke="${L}" stroke-width="1" opacity=".6"/>`;
      return { svg, content: inset(b, 16), text: { family: BODY, color: INK } };
    },
  },
];
