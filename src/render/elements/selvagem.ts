/**
 * Estilo SELVAGEM — madeira com veios, casca de borda irregular, couro
 * costurado, cipós com folhas, selos de tronco cortado e pedras.
 */
import { darken, lighten, mix, parseHex } from '../color';
import type { Defs } from '../defs';
import { vivid, type Palette } from '../palette';
import { bezier, inset, organic, rng, tapered, type Box, type Pt } from '../shapes';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Uncial Antiqua';
const BODY = 'EB Garamond';
const LIGHT = '#f4e8d2';
const DARK = '#2e1d10';

const BARK = '#2b1b10';
const woodTone = (pal: Palette) => mix('#6b4426', darken(pal.base, 0.35), 0.22);
const leafTone = (pal: Palette) => mix(vivid(pal.base), '#4f7d2c', 0.62);

/** Filtro de veios de madeira (ruído esticado na horizontal). */
function grain(defs: Defs, color: string, amount = 0.55, seed = 5): string {
  const { r, g, b } = parseHex(color);
  const [R, G, B] = [r, g, b].map((v) => (v / 255).toFixed(3));
  return defs.url(`woodgrain:${color}:${amount}:${seed}`, (id) =>
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.006 0.11" numOctaves="3" seed="${seed}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 ${R} 0 0 0 0 ${G} 0 0 0 0 ${B} ${(2.6 * amount).toFixed(2)} 0 0 0 ${(-1.05 * amount).toFixed(2)}" result="v"/>` +
    `<feMerge result="m"><feMergeNode in="SourceGraphic"/><feMergeNode in="v"/></feMerge>` +
    `<feComposite in="m" in2="SourceAlpha" operator="in"/></filter>`);
}

function wood(a: PieceArgs, d: string, seed = 5): string {
  const { defs, pal } = a;
  const w = a.fill ?? woodTone(pal);
  // a opacidade vale para a textura inteira (veios e sombreado também), não só para a cor de base
  return `<g opacity="${a.opacity}"><path d="${d}" fill="${w}" filter="${grain(defs, darken(w, 0.55), 0.6, seed)}"/>` +
    `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.14], [0.3, '#fff', 0], [1, '#000', 0.35]])}"/></g>`;
}

function leather(a: PieceArgs, d: string): string {
  const { defs, pal } = a;
  const base = a.fill ?? mix('#dcc29b', lighten(pal.base, 0.55), 0.12);
  return `<g opacity="${a.opacity}"><path d="${d}" fill="${base}" filter="${defs.paper(darken(base, 0.45), 0.5, 13)}"/>` +
    `<path d="${d}" fill="${defs.radial([[0.55, '#000', 0], [1, '#3b2412', 0.4]], 0.5, 0.5, 0.75)}"/></g>`;
}

/** Folha (lente com nervura). */
function leaf(x: number, y: number, len: number, ang: number, color: string): string {
  const a = (ang * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
  const w = len * 0.36;
  const tip: Pt = [x + ux * len, y + uy * len];
  const m1: Pt = [x + ux * len * 0.5 + px * w, y + uy * len * 0.5 + py * w];
  const m2: Pt = [x + ux * len * 0.5 - px * w, y + uy * len * 0.5 - py * w];
  const f = (n: number) => n.toFixed(1);
  return `<path d="M${f(x)} ${f(y)}Q${f(m1[0])} ${f(m1[1])} ${f(tip[0])} ${f(tip[1])}Q${f(m2[0])} ${f(m2[1])} ${f(x)} ${f(y)}Z" fill="${color}" stroke="${darken(color, 0.5)}" stroke-width=".8"/>` +
    `<path d="M${f(x)} ${f(y)}L${f(tip[0] - ux * len * 0.15)} ${f(tip[1] - uy * len * 0.15)}" stroke="${darken(color, 0.4)}" stroke-width=".8"/>`;
}

/** Cipó que corre de p0 a p3 com folhas alternadas. */
function vine(pal: Palette, p0: Pt, p1: Pt, p2: Pt, p3: Pt, leaves: number, seed: number, size = 24): string {
  const pts = bezier(p0, p1, p2, p3, 40);
  const rnd = rng(seed);
  const c = leafTone(pal);
  let out = `<path d="${tapered(pts, size * 0.32, 1.5)}" fill="${darken(c, 0.5)}"/>`;
  for (let i = 1; i <= leaves; i++) {
    const k = Math.floor((i / (leaves + 1)) * (pts.length - 1));
    const [x, y] = pts[k];
    const [nx, ny] = pts[Math.min(pts.length - 1, k + 1)];
    const dir = (Math.atan2(ny - y, nx - x) * 180) / Math.PI;
    const side = i % 2 ? 55 : -55;
    out += leaf(x, y, size * (0.75 + rnd() * 0.5), dir + side + (rnd() - 0.5) * 20, i % 3 ? c : lighten(c, 0.15));
  }
  return out;
}

/**
 * Placa de casca: aro escuro irregular + miolo. O aro é um ANEL (não uma placa
 * inteira por baixo), então deixar o miolo transparente mostra a arte, não a casca.
 */
function barkPanel(a: PieceArgs, b: Box, seed: number, inner: (d: string) => string, rim = 9): string {
  const { defs } = a;
  const outer = organic(b, 3.5, seed, 22);
  const innerD = organic(inset(b, rim), 2.5, seed + 1, 22);
  return `<g filter="${defs.shadow(5, 6, 0.6)}"><path d="${outer}${innerD}" fill-rule="evenodd" fill="${BARK}" filter="${grain(defs, '#000', 0.9, seed)}"/></g>` +
    inner(innerD) +
    `<path d="${innerD}" fill="none" stroke="#000" stroke-width="2" opacity=".55"/>`;
}

/** Fatia de tronco (custo, classe). */
function slice(a: PieceArgs, small = false): PieceOut {
  const { box: b, defs, pal } = a;
  const { cx, cy } = center(b);
  const r = Math.min(b.w, b.h) / 2 + (small ? -2 : 2);
  // caixa larga (vários custos): tora cortada no comprido (anéis em cápsula)
  const ext = Math.max(0, (b.w - b.h) / 2);
  const rnd = rng(Math.round(cx));
  const ring = (rr: number) => {
    const pts: Pt[] = [];
    const e = ext * (rr / r);
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const j = rr * (1 + (rnd() - 0.5) * 0.06);
      const c = Math.cos(ang);
      pts.push([cx + (c > 1e-9 ? e : c < -1e-9 ? -e : 0) + c * j, cy + Math.sin(ang) * j]);
      // trecho reto de cima/baixo: pontos extras para o contorno continuar irregular
      if (e > 8 && (i === 4 || i === 13)) {
        const top = i === 13 ? -1 : 1;
        for (let k = 1; k < 4; k++) pts.push([cx + (top > 0 ? e : -e) * (1 - k / 2), cy + top * rr * (1 + (rnd() - 0.5) * 0.05)]);
      }
    }
    return pts;
  };
  const toD = (pts: Pt[]) => {
    let d = '';
    pts.forEach((p, i) => { d += `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; });
    return d + 'Z';
  };
  const light = mix('#c8995f', lighten(pal.base, 0.4), 0.15);
  let rings = '';
  for (let k = 0.82; k > 0.1; k -= 0.14) rings += `<path d="${toD(ring(r * k))}" fill="none" stroke="${darken(light, 0.35)}" stroke-width="${(1.6 * k + 0.4).toFixed(2)}" opacity=".7"/>`;
  const svg =
    `<g filter="${defs.shadow(4, 5, 0.6)}"><path d="${toD(ring(r))}" fill="${BARK}"/></g>` +
    `<path d="${toD(ring(r * 0.88))}" fill="${defs.radial([[0, lighten(light, 0.15)], [0.8, light], [1, darken(light, 0.3)]])}"/>` +
    rings +
    `<path d="M${cx} ${cy}L${(cx + r * 0.2).toFixed(1)} ${(cy - r * 0.8).toFixed(1)}" stroke="${darken(light, 0.5)}" stroke-width="1.2" opacity=".6"/>` +
    (small ? '' : vine(pal, [cx - ext - r * 0.9, cy + r * 0.6], [cx - ext - r * 1.3, cy + r * 1.2], [cx - ext - r * 0.2, cy + r * 1.4], [cx - ext + r * 0.4, cy + r * 1.05], 3, Math.round(cy), 14));
  const ci = r * 0.62;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: ci * 2 + ext * 2, h: ci * 2 }, text: { family: TITLE, weight: 400, color: DARK } };
}

export const selvagem: PieceStyle[] = [
  {
    style: 'selvagem', kind: 'header', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b0, pal } = a;
      const b = { x: b0.x - 4, y: b0.y + 4, w: b0.w + 8, h: b0.h - 8 };
      let svg = barkPanel(a, b, 7, (d) => wood(a, d, 7));
      svg += vine(pal, [b.x + 10, b.y + 6], [b.x + 70, b.y - 18], [b.x + 150, b.y + 10], [b.x + 210, b.y - 2], 5, 11);
      svg += vine(pal, [b.x + b.w - 10, b.y + b.h - 4], [b.x + b.w - 70, b.y + b.h + 16], [b.x + b.w - 140, b.y + b.h - 6], [b.x + b.w - 200, b.y + b.h + 4], 4, 17);
      return { svg, content: { x: b.x + 40, y: b.y + 8, w: b.w - 80, h: b.h - 16 }, text: { family: TITLE, weight: 400, color: LIGHT } };
    },
  },
  { style: 'selvagem', kind: 'cost', opacity: 1, metal: 'deck', render: (a) => slice(a) },
  { style: 'selvagem', kind: 'class', opacity: 1, metal: 'deck', render: (a) => slice(a) },
  { style: 'selvagem', kind: 'set', opacity: 1, metal: 'deck', render: (a) => slice(a, true) },
  {
    style: 'selvagem', kind: 'typeBar', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b0, defs } = a;
      const b = inset(b0, 10, 9);
      let svg = barkPanel(a, b, 23, (d) => wood(a, d, 23), 6);
      // amarras de corda nas pontas
      for (const x of [b.x + 34, b.x + b.w - 34]) {
        let rope = '';
        for (let y = b.y - 4; y < b.y + b.h + 2; y += 6) rope += `<path d="M${x - 9} ${y}l18 5" stroke="#a88455" stroke-width="4.5" stroke-linecap="round"/><path d="M${x - 9} ${y}l18 5" stroke="#5d4121" stroke-width="1" opacity=".6"/>`;
        svg += `<g filter="${defs.shadow(2, 2, 0.6)}">${rope}</g>`;
      }
      return {
        svg, content: { x: b.x + 56, y: b.y + 4, w: b.w - 150, h: b.h - 8 }, text: { family: TITLE, weight: 400, color: LIGHT },
        gem: { x: b.x + b.w - 84, y: b.y + b.h / 2 - 13, w: 26, h: 26 },
      };
    },
    gemRender: (g, color) => leaf(g.x - 2, g.y + g.h / 2 + 6, g.w + 6, -35, color),
  },
  {
    style: 'selvagem', kind: 'rules', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, pal } = a;
      let svg = barkPanel(a, b, 31, (d) => leather(a, d), 11);
      // costura
      svg += `<path d="${organic(inset(b, 20), 2, 32, 22)}" fill="none" stroke="#6b4a2b" stroke-width="2" stroke-dasharray="9 6" opacity=".75"/>`;
      svg += vine(pal, [b.x - 6, b.y + b.h - 30], [b.x - 20, b.y + b.h * 0.5], [b.x + 10, b.y + 40], [b.x + 2, b.y + 6], 6, 41, 18);
      svg += vine(pal, [b.x + b.w + 6, b.y + b.h - 10], [b.x + b.w - 40, b.y + b.h + 16], [b.x + b.w - 120, b.y + b.h - 2], [b.x + b.w - 190, b.y + b.h + 6], 5, 43, 16);
      return { svg, content: inset(b, 38, 32), text: { family: BODY, weight: 500, color: DARK } };
    },
    divider(a, x, y, w) {
      return vine(a.pal, [x + w * 0.2, y], [x + w * 0.4, y - 8], [x + w * 0.6, y + 8], [x + w * 0.8, y], 6, 55, 11);
    },
    flavor: () => ({ family: BODY, italic: true, weight: 400, color: '#5a3d24' }),
  },
  {
    style: 'selvagem', kind: 'stat', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b0, defs, pal } = a;
      const b = inset(b0, 4, 2);
      const d = organic(b, 5, Math.round(b.x), 20);
      const stoneC = mix('#6f6b63', darken(pal.base, 0.3), 0.15);
      const svg = `<g filter="${defs.shadow(4, 5, 0.6)}"><path d="${d}" fill="${stoneC}" filter="${defs.grain('#1a1917', 0.8, 0.5, 4)}"/></g>` +
        `<path d="${d}" fill="${defs.radial([[0, '#fff', 0.25], [0.6, '#fff', 0], [1, '#000', 0.45]], 0.4, 0.3, 0.8)}"/>` +
        `<path d="${organic({ x: b.x + 6, y: b.y + b.h - 16, w: b.w * 0.5, h: 12 }, 3, 7, 10)}" fill="${leafTone(pal)}" opacity=".75"/>`;
      return { svg, content: inset(b, 12, 6), text: { family: TITLE, weight: 400, color: LIGHT } };
    },
  },
  {
    style: 'selvagem', kind: 'footer', opacity: 1, metal: 'deck',
    render(a) {
      const b = inset(a.box, 2, 3);
      return { svg: barkPanel(a, b, 61, (d) => wood(a, d, 61), 4), content: inset(b, 16, 4), text: { family: BODY, weight: 600, color: LIGHT } };
    },
  },
  {
    style: 'selvagem', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const { box: b, defs, pal } = a;
      const inner = organic(inset(b, 16), 5, 77, 30);
      const svg = `<path d="M0 0H${b.w}V${b.h}H0Z${inner}" fill-rule="evenodd" fill="${BARK}" filter="${grain(defs, '#000', 0.9, 77)}"/>` +
        vine(pal, [10, 180], [40, 90], [60, 40], [180, 12], 7, 91, 18) +
        vine(pal, [b.w - 10, b.h - 180], [b.w - 40, b.h - 90], [b.w - 60, b.h - 40], [b.w - 180, b.h - 12], 7, 93, 18);
      return { svg, content: inset(b, 16), text: { family: BODY, color: LIGHT } };
    },
  },
];
