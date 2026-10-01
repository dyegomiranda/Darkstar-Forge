/**
 * Estilo ARCANO — astrolábio: aros de latão com marcas de graus gravadas,
 * esmalte azul-noite (tingido pela cor do deck) salpicado de estrelas,
 * órbitas, luas crescentes e rosas-dos-ventos.
 */
import { darken, lighten, mix, tone } from '../color';
import type { Defs } from '../defs';
import { vivid, type Palette } from '../palette';
import { circle, inset, pill, rng, roundRect, star, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center, fadeLine, metalBand, metalSolid } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Cinzel';
const BODY = 'Cormorant Garamond';
const IVORY = '#f3ead2';
const ENGRAVE = '#2e1f0a';

/** Esmalte azul-noite puxado para a cor do deck. */
const night = (c: string) => mix(darken(tone(c, { s: 0.55 }), 0.7), '#0a0d24', 0.5);

/** Esmalte com brilho central + poeira de estrelas dentro da caixa `b`. */
function enamel(a: PieceArgs, d: string, b: Box, seed: number, stars = 1): string {
  const { defs, pal } = a;
  const cid = defs.add(`encl:${seed}:${b.x}:${b.y}`, (id) => `<clipPath id="${id}"><path d="${d}"/></clipPath>`);
  const rnd = rng(seed);
  let dots = '';
  const n = Math.round((b.w * b.h) / 1400 * stars);
  for (let i = 0; i < n; i++) {
    const x = b.x + rnd() * b.w, y = b.y + rnd() * b.h, r = rnd() < 0.08 ? 1.6 : 0.5 + rnd() * 0.7;
    dots += `<path d="${circle(x, y, r)}" fill="#fff" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`;
  }
  return `<g opacity="${a.opacity}"><path d="${d}" fill="${a.fill ?? defs.hue(pal, night)}"/>` +
    `<path d="${d}" fill="${defs.radial([[0, lighten(vivid(pal.base), 0.1), 0.35], [0.7, pal.base, 0.05], [1, '#000', 0.4]], 0.5, 0.45, 0.7)}"/>` +
    `<g clip-path="url(#${cid})">${dots}</g></g>`;
}

/** Marcas de graus gravadas num anel (raio externo `r`). */
function dialTicks(cx: number, cy: number, r: number, n: number, len: number, color: string, w = 1, ext = 0): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const l = i % 6 === 0 ? len * 1.8 : len;
    // cápsula: cada metade gira em torno do seu próprio centro
    const x = cx + (Math.cos(a) > 1e-9 ? ext : Math.cos(a) < -1e-9 ? -ext : 0);
    d += `M${(x + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}L${(x + Math.cos(a) * (r - l)).toFixed(1)} ${(cy + Math.sin(a) * (r - l)).toFixed(1)}`;
  }
  // trechos retos da cápsula: marcas no mesmo passo do arco
  const step = (2 * Math.PI * r) / n;
  for (let k = 0, x = cx - ext + step; x < cx + ext - step / 2; x += step, k++) {
    const l = k % 6 === 5 ? len * 1.8 : len;
    d += `M${x.toFixed(1)} ${(cy - r).toFixed(1)}v${l.toFixed(1)}M${x.toFixed(1)} ${(cy + r).toFixed(1)}v${(-l).toFixed(1)}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" opacity=".85"/>`;
}

/** Marcas de régua ao longo de uma linha horizontal. */
function rulerTicks(x: number, y: number, w: number, color: string, dir = 1): string {
  let d = '';
  for (let i = 0, k = 0; i <= w; i += 9, k++) d += `M${(x + i).toFixed(1)} ${y}v${dir * (k % 5 === 0 ? 6 : 3)}`;
  return `<path d="${d}" stroke="${color}" stroke-width="1" fill="none" opacity=".8"/>`;
}

/** Lua crescente aberta para a direita: círculo R menos círculo 0,8R deslocado 0,45R. */
function crescent(cx: number, cy: number, R: number): string {
  const d = 0.45 * R, r2 = 0.8 * R;
  const x = (d * d + R * R - r2 * r2) / (2 * d);
  const h = Math.sqrt(R * R - x * x);
  const f = (n: number) => n.toFixed(2);
  return `M${f(cx + x)} ${f(cy - h)}A${R} ${R} 0 1 0 ${f(cx + x)} ${f(cy + h)}A${f(r2)} ${f(r2)} 0 1 1 ${f(cx + x)} ${f(cy - h)}Z`;
}

/** Rosa-dos-ventos de 8 pontas. */
const compass = (cx: number, cy: number, r: number) => star(cx, cy, r, r * 0.22, 4) + star(cx, cy, r * 0.62, r * 0.16, 4, 45);

function brass(a: PieceArgs): Palette {
  // o "metal" padrão do Arcano é latão (ouro); se o usuário escolheu outro, respeita
  return a.pal;
}

/** Painel de esmalte com aro de latão, ticks gravados e rosas-dos-ventos nos cantos. */
function panel(a: PieceArgs, b: Box, r: number, rim: number, content: Box, text: TextLook, opts: { corners?: boolean; ticks?: boolean; seed: number; zodiac?: boolean }): PieceOut {
  const { defs } = a;
  const pal = brass(a);
  const outer = roundRect(b, r);
  const ib = inset(b, rim);
  const inner = roundRect(ib, Math.max(2, r - rim));
  let svg = `<g filter="${defs.shadow(4, 7, 0.6)}">${metalBand(defs, pal, outer + inner, 2)}</g>` + enamel(a, inner, ib, opts.seed);
  if (opts.zodiac) {
    const cid = defs.add(`zod:${b.x}:${b.y}`, (id) => `<clipPath id="${id}"><path d="${inner}"/></clipPath>`);
    const zc = { x: b.x + b.w / 2, y: b.y + b.h + 60 };
    const R = b.w * 0.48;
    svg += `<g clip-path="url(#${cid})" opacity=".22">` +
      `<path d="${circle(zc.x, zc.y, R)}${circle(zc.x, zc.y, R - 22)}" fill="none" stroke="${lighten(IVORY, 0)}" stroke-width="1"/>` +
      dialTicks(zc.x, zc.y, R, 72, 8, IVORY) +
      `<path d="${circle(zc.x, zc.y, R * 0.6)}" fill="none" stroke="${IVORY}" stroke-width=".8" stroke-dasharray="3 5"/></g>`;
  }
  svg += `<path d="${roundRect(inset(b, rim + 5), Math.max(2, r - rim - 5))}" fill="none" stroke="${defs.metal(pal)[0]}" stroke-width="1" opacity=".65"/>`;
  if (opts.ticks) svg += rulerTicks(ib.x + r, ib.y + 1, ib.w - 2 * r, lighten(IVORY, 0)) + rulerTicks(ib.x + r, ib.y + ib.h - 1, ib.w - 2 * r, IVORY, -1);
  if (opts.corners) {
    const s = Math.min(16, b.h * 0.2);
    svg += `<g filter="${defs.shadow(2, 2, 0.6)}">` + metalSolid(defs, pal, compass(b.x + 2, b.y + 2, s) + compass(b.x + b.w - 2, b.y + 2, s) + compass(b.x + 2, b.y + b.h - 2, s) + compass(b.x + b.w - 2, b.y + b.h - 2, s), 1) + `</g>`;
  }
  return { svg, content, text, iconColor: '#ecd28f' };
}

/** Astrolábio (custo, classe). */
function astrolabe(a: PieceArgs, small = false): PieceOut {
  const { box: b, defs } = a;
  const pal = brass(a);
  const { cx, cy } = center(b);
  // caixa larga (vários custos) = astrolábio esticado em cápsula
  const ext = Math.max(0, (b.w - b.h) / 2);
  const r = Math.min(b.w, b.h) / 2 + (small ? -2 : 6);
  const rim = small ? 6 : 11;
  const ri = r - rim;
  const disc = pill(cx, cy, ri, ext);
  // miolo LISO (só um degradê suave): nada de desenho atrás do número/símbolo
  const { pal: p0 } = a;
  const deep = night(p0.base);
  const points = small ? '' : [0, 90, 180, 270].map((ang) => {
    const t = (ang - 90) * (Math.PI / 180);
    const dx = ang === 90 ? ext : ang === 270 ? -ext : 0;
    const x = cx + dx + Math.cos(t) * (r + 4), y = cy + Math.sin(t) * (r + 4);
    return star(x, y, 9, 2.6, 4);
  }).join('');
  const svg =
    (points ? `<g filter="${defs.shadow(2, 2, 0.55)}">${metalSolid(defs, pal, points, 1)}</g>` : '') +
    `<g filter="${defs.shadow(4, 6, 0.65)}">${metalBand(defs, pal, pill(cx, cy, r, ext) + disc, 2.4)}</g>` +
    dialTicks(cx, cy, r - 1.5, small ? 36 : 72, small ? 2.5 : 4, ENGRAVE, 1, ext) +
    `<path d="${disc}" fill="${defs.radial([[0, lighten(deep, 0.16)], [0.75, deep], [1, darken(deep, 0.45)]], 0.5, 0.42, 0.62)}" fill-opacity="${a.opacity}"/>` +
    `<path d="${pill(cx, cy, ri - 4, ext)}" fill="none" stroke="${defs.metal(pal)[0]}" stroke-width="1.2" opacity=".7"/>`;
  const ci = ri * 0.78;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: ci * 2 + ext * 2, h: ci * 2 }, text: { family: TITLE, weight: 600, color: IVORY, glow: '#b8913a' }, iconColor: '#ecd28f' };
}

export const arcano: PieceStyle[] = [
  {
    style: 'arcano', kind: 'header', opacity: 0.95, metal: 'gold',
    render(a) {
      const { box: b0, defs } = a;
      const b = { x: b0.x + 6, y: b0.y + 6, w: b0.w - 12, h: b0.h - 12 };
      const p = panel(a, b, b.h / 2, 6, { x: b.x + 54, y: b.y + 4, w: b.w - 108, h: b.h - 8 }, { family: TITLE, weight: 600, color: IVORY, tracking: 0.02, glow: '#8a6a24' }, { seed: 3, ticks: false });
      const cy = b.y + b.h / 2;
      // luas crescentes nas pontas, de costas uma para a outra
      p.svg += `<g filter="${defs.shadow(3, 3, 0.6)}">` +
        metalSolid(defs, a.pal, crescent(b.x + 26, cy, 20), 1.2) +
        `<g transform="translate(${2 * (b.x + b.w - 26)} 0) scale(-1 1)">${metalSolid(defs, a.pal, crescent(b.x + b.w - 26, cy, 20), 1.2)}</g></g>` +
        `<path d="${star(b.x + b.w / 2, b.y + 1, 8, 2.2, 4)}" fill="#fff4cf"/>`;
      return p;
    },
  },
  { style: 'arcano', kind: 'cost', opacity: 1, metal: 'gold', render: (a) => astrolabe(a) },
  { style: 'arcano', kind: 'class', opacity: 1, metal: 'gold', render: (a) => astrolabe(a) },
  {
    style: 'arcano', kind: 'set', opacity: 1, metal: 'gold',
    render(a) {
      const { cx, cy } = center(a.box);
      const svg = `<g filter="${a.defs.shadow(2, 3, 0.6)}">${metalSolid(a.defs, a.pal, compass(cx, cy, a.box.w * 0.46), 1)}</g>` +
        `<path d="${circle(cx, cy, a.box.w * 0.12)}" fill="${night(a.pal.base)}"/>`;
      return { svg, content: inset(a.box, a.box.w * 0.35), text: { family: TITLE, color: IVORY } };
    },
  },
  {
    style: 'arcano', kind: 'typeBar', opacity: 0.95, metal: 'gold',
    render(a) {
      const b = inset(a.box, 14, 9);
      const p = panel(a, b, 10, 5, { x: b.x + 44, y: b.y + 3, w: b.w - 110, h: b.h - 6 }, { family: TITLE, weight: 600, color: IVORY, tracking: 0.04, glow: '#8a6a24' }, { seed: 11 });
      p.svg += `<g filter="${a.defs.shadow(2, 2, 0.6)}">${metalSolid(a.defs, a.pal, compass(b.x + 24, b.y + b.h / 2, 14), 1)}</g>`;
      p.gem = { x: b.x + b.w - 48, y: b.y + b.h / 2 - 13, w: 26, h: 26 };
      return p;
    },
  },
  {
    style: 'arcano', kind: 'rules', opacity: 0.94, metal: 'gold',
    render(a) {
      const b = a.box;
      return panel(a, b, 18, 8, inset(b, 38, 30), { family: BODY, weight: 600, color: IVORY }, { seed: 21, corners: true, ticks: true, zodiac: true });
    },
    divider(a, x, y, w) {
      const c = '#e7c878';
      return fadeLine(a.defs, x, y, w, c, 1.2, 0.8) + `<path d="${crescent(x + w / 2, y, 7)}" fill="${c}"/>` +
        `<path d="${star(x + w / 2 - 22, y, 4, 1.2, 4)}${star(x + w / 2 + 22, y, 4, 1.2, 4)}" fill="${c}"/>`;
    },
    flavor: () => ({ family: BODY, italic: true, weight: 600, color: '#cdbf9e' }),
  },
  {
    style: 'arcano', kind: 'stat', opacity: 0.95, metal: 'gold',
    render(a) {
      const b = inset(a.box, 3, 5);
      return panel(a, b, b.h / 2, 5, inset(b, 12, 6), { family: TITLE, weight: 700, color: IVORY, glow: '#8a6a24' }, { seed: Math.round(b.x) });
    },
  },
  {
    style: 'arcano', kind: 'footer', opacity: 0.9, metal: 'gold',
    render(a) {
      const b = inset(a.box, 2, 3);
      return panel(a, b, b.h / 2, 3, inset(b, 16, 3), { family: BODY, weight: 600, color: '#e3d6b6' }, { seed: 71 });
    },
  },
  {
    style: 'arcano', kind: 'frame', opacity: 1, metal: 'gold',
    render(a) {
      const { box: b, defs, pal } = a;
      const ib = inset(b, 14);
      const inner = roundRect(ib, 24);
      const svg = `<path d="M0 0H${b.w}V${b.h}H0Z${inner}" fill-rule="evenodd" fill="${night(pal.base)}"/>` +
        metalBand(defs, pal, roundRect(inset(b, 8), 28) + inner, 1.6) +
        rulerTicks(ib.x + 30, ib.y - 4, ib.w - 60, ENGRAVE) +
        `<g filter="${defs.shadow(2, 3, 0.6)}">${metalSolid(defs, pal, compass(ib.x + 6, ib.y + 6, 20) + compass(ib.x + ib.w - 6, ib.y + 6, 20) + compass(ib.x + 6, ib.y + ib.h - 6, 20) + compass(ib.x + ib.w - 6, ib.y + ib.h - 6, 20), 1)}</g>`;
      return { svg, content: ib, text: { family: BODY, color: IVORY } };
    },
  },
];
