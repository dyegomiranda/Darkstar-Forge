/**
 * Estilo ARCANO — sem caixas duras: névoa escura que se funde à arte,
 * constelações, runas luminosas e selos de cristal hexagonal lapidado.
 */
import { darken, lighten, mix } from '../color';
import type { Defs } from '../defs';
import { glowOf, vivid, type Palette } from '../palette';
import { circle, hexagon, inset, rect, rng, star, type Box, type Pt } from '../shapes';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Marcellus';
const BODY = 'Cormorant Garamond';
const INK = '#f1f4ff';

const glowC = (pal: Palette) => lighten(glowOf(pal.base), 0.25);

/** Estrela de 4 pontas com brilho. */
const spark = (x: number, y: number, r: number, color: string) =>
  `<path d="${star(x, y, r, r * 0.22, 4)}" fill="${color}"/><path d="${circle(x, y, r * 0.22)}" fill="#fff"/>`;

/** Constelação: estrelas ligadas por linhas finas, entre (x0,y0) e (x1,y1). */
function constellation(defs: Defs, pal: Palette, x0: number, y0: number, x1: number, y1: number, n: number, seed: number, amp = 10): string {
  const rnd = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push([x0 + (x1 - x0) * t + (i && i < n - 1 ? (rnd() - 0.5) * 12 : 0), y0 + (y1 - y0) * t + (i && i < n - 1 ? (rnd() - 0.5) * 2 * amp : 0)]);
  }
  const g = glowC(pal);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  return `<g filter="${defs.glow(glowOf(pal.base), 2.5, 0.9)}">` +
    `<path d="${line}" fill="none" stroke="${g}" stroke-width=".9" opacity=".7"/>` +
    pts.map((p, i) => spark(p[0], p[1], i % 3 === 0 ? 5.5 : 3, g)).join('') + `</g>`;
}

/** Névoa escura de bordas suaves (dá leitura ao texto sem desenhar caixa). */
function mist(defs: Defs, pal: Palette, b: Box, opacity: number, soft = 14): string {
  const tint = mix(darken(pal.base, 0.85), '#04040a', 0.5);
  return `<path d="${rect(inset(b, soft * 0.6))}" fill="${tint}" fill-opacity="${opacity}" filter="${defs.blur(soft)}"/>`;
}

/** Cristal hexagonal lapidado. */
function crystal(a: PieceArgs, cx: number, cy: number, r: number, pointy = true): string {
  const { defs, pal } = a;
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = ((pointy ? -90 : 0) + i * 60) * (Math.PI / 180);
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  const shade = [0.45, 0.25, -0.1, -0.35, -0.2, 0.15];
  let facets = '';
  for (let i = 0; i < 6; i++) {
    const c = pal.colors[i < 3 ? 0 : pal.colors.length - 1];
    const s = shade[i];
    const col = s > 0 ? lighten(vivid(c), s) : darken(vivid(c), -s);
    const p = pts[i], q = pts[(i + 1) % 6];
    facets += `<path d="M${cx} ${cy}L${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}Z" fill="${col}"/>`;
  }
  const ir = r * 0.62;
  return `<g filter="${defs.glow(glowOf(pal.base), 7, 0.75)}"><path d="${hexagon(cx, cy, r + 2, pointy)}" fill="${lighten(glowOf(pal.base), 0.4)}"/></g>` +
    `<g opacity="${Math.max(0.8, a.opacity)}">${facets}</g>` +
    `<path d="${hexagon(cx, cy, r, pointy)}" fill="${defs.linear([[0, '#fff', 0.35], [0.45, '#fff', 0], [1, '#000', 0.3]])}"/>` +
    `<path d="${hexagon(cx, cy, ir, pointy)}" fill="${mix(darken(pal.base, 0.85), '#05050c', 0.4)}" fill-opacity=".82"/>` +
    `<path d="${hexagon(cx, cy, ir, pointy)}" fill="none" stroke="${lighten(glowOf(pal.base), 0.5)}" stroke-width="1.2" opacity=".8"/>` +
    `<path d="M${pts[5][0].toFixed(1)} ${pts[5][1].toFixed(1)}L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}L${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/>`;
}

function gemSeal(a: PieceArgs, small = false): PieceOut {
  const { cx, cy } = center(a.box);
  const r = a.box.w / 2 + (small ? -4 : 4);
  const ir = r * 0.62;
  let svg = crystal(a, cx, cy, r);
  if (!small) svg += spark(cx, cy - r - 8, 6, glowC(a.pal)) + spark(cx, cy + r + 8, 4, glowC(a.pal));
  return { svg, content: { x: cx - ir * 0.95, y: cy - ir * 0.85, w: ir * 1.9, h: ir * 1.7 }, text: { family: TITLE, weight: 400, color: INK, glow: glowOf(a.pal.base) } };
}

/** Runas luminosas (glifos inventados, determinísticos). */
function runes(cx: number, y: number, count: number, h: number, color: string): string {
  const step = h * 0.95;
  let d = '';
  const x0 = cx - ((count - 1) * step) / 2;
  for (let i = 0; i < count; i++) {
    const x = x0 + i * step;
    const k = (i * 7 + 3) % 11;
    const t = y - h / 2, b = y + h / 2, m = y, w = h * 0.3;
    d += `M${x} ${t}V${b}`;
    if (k % 2) d += `M${x} ${t + h * 0.2}L${x + w} ${t}`;
    if (k % 3 === 0) d += `M${x} ${m}L${x - w} ${m - h * 0.25}`;
    if (k % 3 === 1) d += `M${x} ${m}L${x + w} ${m + h * 0.25}`;
    if (k % 4 === 2) d += `M${x - w} ${b}L${x} ${b - h * 0.25}L${x + w} ${b}`;
    if (k % 5 === 4) d += `M${x - w} ${t + h * 0.35}H${x + w}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
}

export const arcano: PieceStyle[] = [
  {
    style: 'arcano', kind: 'header', opacity: 0.75, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const band = { x: b.x - 30, y: b.y + 4, w: b.w + 60, h: b.h - 8 };
      const svg = mist(defs, pal, band, a.opacity, 12) +
        constellation(defs, pal, b.x + 20, b.y + 6, b.x + b.w - 20, b.y + 10, 9, 3, 6) +
        constellation(defs, pal, b.x + 60, b.y + b.h - 6, b.x + b.w - 60, b.y + b.h - 4, 7, 9, 4);
      return { svg, content: { x: b.x + 10, y: b.y + 12, w: b.w - 20, h: b.h - 24 }, text: { family: TITLE, weight: 400, color: INK, glow: glowOf(pal.base), tracking: 0.03 } };
    },
  },
  { style: 'arcano', kind: 'cost', opacity: 0.95, metal: 'deck', render: (a) => gemSeal(a) },
  { style: 'arcano', kind: 'class', opacity: 0.95, metal: 'deck', render: (a) => gemSeal(a) },
  {
    style: 'arcano', kind: 'set', opacity: 0.95, metal: 'deck',
    render(a) {
      const { cx, cy } = center(a.box);
      const g = glowC(a.pal);
      const svg = `<g filter="${a.defs.glow(glowOf(a.pal.base), 6, 0.9)}">${spark(cx, cy, a.box.w * 0.5, g)}</g>` +
        `<path d="${circle(cx, cy, a.box.w * 0.3)}" fill="none" stroke="${g}" stroke-width="1" opacity=".6"/>`;
      return { svg, content: inset(a.box, a.box.w * 0.3), text: { family: TITLE, color: INK } };
    },
  },
  {
    style: 'arcano', kind: 'typeBar', opacity: 0.7, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const g = glowC(pal);
      const y = b.y + b.h - 12;
      const line = defs.linear([[0, g, 0], [0.08, g, 1], [0.7, g, 0.8], [1, g, 0]], 'h');
      const svg = mist(defs, pal, { x: b.x + 10, y: b.y + 6, w: b.w - 20, h: b.h - 10 }, a.opacity, 10) +
        `<g filter="${defs.glow(glowOf(pal.base), 3, 0.9)}"><rect x="${b.x + 20}" y="${y - 0.8}" width="${b.w - 40}" height="1.6" fill="${line}"/>` +
        spark(b.x + 40, y, 7, g) + `</g>`;
      return {
        svg, content: { x: b.x + 58, y: b.y + 6, w: b.w - 150, h: b.h - 18 },
        text: { family: TITLE, weight: 400, color: INK, glow: glowOf(pal.base), tracking: 0.05, caps: true },
        gem: { x: b.x + b.w - 70, y: b.y + b.h / 2 - 16, w: 26, h: 26 },
      };
    },
  },
  {
    style: 'arcano', kind: 'rules', opacity: 0.82, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const tint = mix(darken(pal.base, 0.86), '#04040a', 0.5);
      const veil = defs.linear([[0, tint, 0], [0.18, tint, a.opacity * 0.85], [1, tint, a.opacity]]);
      const g = glowC(pal);
      const side = defs.linear([[0, g, 0], [0.3, g, 0.8], [1, g, 0.1]]);
      const svg =
        `<rect x="${b.x - 48}" y="${b.y - 40}" width="${b.w + 96}" height="${b.h + 160}" fill="${veil}"/>` +
        `<g filter="${defs.glow(glowOf(pal.base), 3, 0.8)}"><rect x="${b.x}" y="${b.y + 10}" width="1.4" height="${b.h - 20}" fill="${side}"/>` +
        `<rect x="${b.x + b.w - 1.4}" y="${b.y + 10}" width="1.4" height="${b.h - 20}" fill="${side}"/>` +
        runes(b.x + b.w / 2, b.y + b.h - 14, 13, 11, g) + `</g>` +
        constellation(defs, pal, b.x + 14, b.y + 40, b.x + 70, b.y + 16, 4, 21, 8) +
        constellation(defs, pal, b.x + b.w - 14, b.y + 40, b.x + b.w - 70, b.y + 16, 4, 5, 8);
      return { svg, content: inset(b, 30, 30), text: { family: BODY, weight: 600, color: INK } };
    },
    divider(a, x, y, w) {
      const g = glowC(a.pal);
      const cx = x + w / 2;
      const line = a.defs.linear([[0, g, 0], [0.5, g, 0.9], [1, g, 0]], 'h');
      return `<g filter="${a.defs.glow(glowOf(a.pal.base), 3, 0.9)}"><rect x="${x + 40}" y="${y - 0.6}" width="${w - 80}" height="1.2" fill="${line}"/>${spark(cx, y, 8, g)}</g>`;
    },
    flavor: (pal) => ({ family: BODY, italic: true, weight: 600, color: mix(INK, glowOf(pal.base), 0.4) }),
  },
  {
    style: 'arcano', kind: 'stat', opacity: 0.95, metal: 'deck',
    render(a) {
      const { box: b } = a;
      const { cx, cy } = center(b);
      const r = b.h / 2 + 4;
      // cristal deitado atrás, com o número dentro; o ícone fica à esquerda
      const svg = crystal(a, cx + 18, cy, r, false);
      return { svg, content: { x: b.x - 6, y: b.y + 8, w: b.w + 8, h: b.h - 16 }, text: { family: TITLE, weight: 400, color: INK, glow: glowOf(a.pal.base) } };
    },
  },
  {
    style: 'arcano', kind: 'footer', opacity: 0.6, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      return { svg: mist(defs, pal, b, a.opacity, 8), content: inset(b, 12, 4), text: { family: BODY, weight: 600, color: mix(INK, glowOf(pal.base), 0.3) } };
    },
  },
  {
    style: 'arcano', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const g = glowC(pal);
      const i = inset(b, 16);
      const svg =
        `<path d="${rect(b)}${rect(inset(b, 16))}" fill-rule="evenodd" fill="#05050b"/>` +
        `<g filter="${defs.glow(glowOf(pal.base), 4, 0.9)}"><path d="${rect(i)}" fill="none" stroke="${g}" stroke-width="1.4"/>` +
        spark(i.x, i.y, 12, g) + spark(i.x + i.w, i.y, 12, g) + spark(i.x, i.y + i.h, 12, g) + spark(i.x + i.w, i.y + i.h, 12, g) + `</g>`;
      return { svg, content: i, text: { family: BODY, color: INK } };
    },
  },
];
