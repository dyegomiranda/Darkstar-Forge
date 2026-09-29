/**
 * Estilo PIXEL SOMBRIO — pixel art de fantasia sombria. Referência: "Dark Elf
 * TCG Cards" (free-game-assets): ferro escuro, arremates de osso, faixa do nome
 * na cor da classe, selos redondos e pergaminho de bordas rasgadas.
 *
 * Tudo é rasterizado numa grade de pixels a partir de uma "distância até a
 * borda" (sdf): a mesma regra pinta contorno, aro iluminado e miolo em faixas,
 * em qualquer forma (disco, cápsula, placa, faixa, chifre).
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { bezier, inset, pixelArt, type Box, type Pt } from '../shapes';
import type { TextLook } from '../text';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

/** Tamanho do "pixel" (a carta tem 125 pixels de largura). */
const P = 6;
const OUT = '#120f16';
const IRON = { hi: '#6d6776', light: '#4d4856', mid: '#37333e', dark: '#27242d', deep: '#1b1920' };
const BONE = { hi: '#f3e9cb', light: '#d8c496', mid: '#a98f63', dark: '#6f5a3c' };
const PARCH = ['#f2e5c3', '#eadab3', '#e0cda2', '#d2bc8e'];
const INK_DARK = '#3a2a1b';
const FONT = 'Pixelify Sans';

// ───────────── motor de pixels ─────────────

/** Distância com sinal até a borda (> 0 dentro), em px da carta. */
type Sdf = (x: number, y: number) => number;
/** Cor de um pixel: [cor, camada] (camada 'f' = miolo, recebe a transparência) ou null. */
type Paint = (d: number, light: number, x: number, y: number) => [string, 'r' | 'f'] | null;

const g = (n: number) => Math.floor(n / P) * P;

/** Rasteriza a forma na grade, juntando pixels vizinhos da mesma cor numa faixa só. */
function raster(b: Box, sdf: Sdf, paint: Paint, opacity = 1, extra = ''): string {
  const groups = new Map<string, string>();
  const x0 = g(b.x - P), x1 = b.x + b.w + P, y0 = g(b.y - P), y1 = b.y + b.h + P;
  for (let y = y0; y < y1; y += P) {
    let run: { key: string; x: number; n: number } | null = null;
    const flush = () => {
      if (run) groups.set(run.key, (groups.get(run.key) ?? '') + `M${run.x} ${y}h${run.n * P}v${P}h${-run.n * P}Z`);
      run = null;
    };
    for (let x = x0; x < x1; x += P) {
      const cx = x + P / 2, cy = y + P / 2;
      const d = sdf(cx, cy);
      let key: string | null = null;
      if (d >= 0) {
        // luz de cima-esquerda: o aro que "olha" para lá fica claro
        const gx = sdf(cx + 1, cy) - sdf(cx - 1, cy), gy = sdf(cx, cy + 1) - sdf(cx, cy - 1);
        const len = Math.hypot(gx, gy) || 1;
        const light = (gx + gy) / len; // borda de cima/esquerda → gradiente aponta para baixo/direita → positivo
        const c = paint(d, light, cx, cy);
        if (c) key = `${c[1]}|${c[0]}`;
      }
      if (run && run.key === key && run.x + run.n * P === x) run.n++;
      else { flush(); if (key) run = { key, x, n: 1 }; }
    }
    flush();
  }
  let out = '';
  for (const [key, d] of groups) {
    const [layer, color] = key.split('|');
    const op = layer === 'f' && opacity < 1 ? ` fill-opacity="${+opacity.toFixed(3)}"` : '';
    out += `<path d="${d}" fill="${color}"${op} shape-rendering="crispEdges"/>`;
  }
  return extra ? `<g${extra}>${out}</g>` : out;
}

const pillSdf = (cx: number, cy: number, r: number, ext: number): Sdf => (x, y) => {
  const dx = Math.max(0, Math.abs(x - cx) - ext);
  return r - Math.hypot(dx, y - cy);
};

const boxSdf = (b: Box, r: number): Sdf => {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, hx = b.w / 2 - r, hy = b.h / 2 - r;
  return (x, y) => {
    const qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy;
    return -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
  };
};

function segDist(x: number, y: number, a: Pt, b: Pt): { d: number; t: number } {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return { d: Math.hypot(x - a[0] - vx * t, y - a[1] - vy * t), t };
}

const polySdf = (pts: Pt[]): Sdf => (x, y) => {
  let inside = false, best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    best = Math.min(best, segDist(x, y, pts[j], pts[i]).d);
  }
  return inside ? best : -best;
};

/** Traço grosso que afina (chifres, costelas). */
const hornSdf = (pts: Pt[], w0: number, w1: number): Sdf => (x, y) => {
  let best = -Infinity;
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const { d, t } = segDist(x, y, pts[i], pts[i + 1]);
    const w = w0 + (w1 - w0) * ((i + t) / n);
    best = Math.max(best, w / 2 - d);
  }
  return best;
};

/** Pinta aro claro/médio/escuro conforme a luz. */
const lit = (light: number, c: { light: string; mid: string; dark: string }) =>
  light > 0.35 ? c.light : light < -0.35 ? c.dark : c.mid;

/** Tons do miolo na cor da classe (em várias cores, colunas lado a lado). */
function deckShades(pal: Palette, x: number, b: Box, dark = 0): string[] {
  const n = pal.colors.length;
  const i = Math.min(n - 1, Math.max(0, Math.floor(((x - b.x) / b.w) * n)));
  const v = darken(vivid(pal.colors[i]), dark);
  return [lighten(v, 0.18), v, darken(v, 0.16), darken(v, 0.32)];
}

/** Faixa de tom pela altura (4 faixas sólidas, sem degradê). */
const band = (y: number, b: Box, shades: string[]) =>
  shades[Math.min(shades.length - 1, Math.max(0, Math.floor(((y - b.y) / b.h) * shades.length)))];

/**
 * Peça padrão: contorno escuro, aro (osso ou ferro), filete escuro e miolo em faixas.
 * `fill` escolhe a cor do miolo pela posição.
 */
function plate(sdf: Sdf, rim: { light: string; mid: string; dark: string }, fill: (x: number, y: number) => string, rimW = P, line = true): Paint {
  return (d, light, x, y) => {
    if (d < P) return [OUT, 'r'];
    if (d < P + rimW) return [lit(light, rim), 'r'];
    if (line && d < 2 * P + rimW) return [OUT, 'r'];
    return [fill(x, y), 'f'];
  };
}

/** Sombra dura de 1 pixel, deslocada para baixo e à direita. */
const hardShadow = (b: Box, sdf: Sdf, opacity: number) =>
  raster(b, sdf, (d) => (d >= 0 ? ['#000', 'r'] : null), 1, ` opacity="${+(0.55 * opacity).toFixed(3)}" transform="translate(${P} ${P})"`);

const txt = (color = '#ffffff', weight = 500): TextLook => ({ family: FONT, weight, color, hard: true });
const num = (color = '#ffffff'): TextLook => ({ family: 'Silkscreen', weight: 400, color, hard: true });

// ───────────── peças ─────────────

/** Selo redondo (custo, classe, edição); caixa larga vira cápsula (vários custos). */
function badge(a: PieceArgs, small = false): PieceOut {
  const { cx, cy } = center(a.box);
  const r = Math.min(a.box.w, a.box.h) / 2 - (small ? 4 : 0);
  const ext = Math.max(0, (a.box.w - a.box.h) / 2);
  const sdf = pillSdf(cx, cy, r, ext);
  const b = { x: cx - r - ext, y: cy - r, w: 2 * (r + ext), h: 2 * r };
  const fill = (x: number, y: number) => {
    const sh = deckShades(a.pal, x, b, 0.35);
    // brilho em meia-lua no alto
    return y < cy - r * 0.45 ? sh[1] : band(y, b, sh.slice(1));
  };
  const svg = hardShadow(b, sdf, a.opacity) +
    raster(b, sdf, plate(sdf, BONE, fill, small ? P : P * 2), a.opacity);
  const ci = r - (small ? 2.5 : 3.5) * P;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: num(), iconColor: BONE.hi };
}

/** Faixa do nome na cor da classe, com as pontas dobradas por trás. */
function ribbon(a: PieceArgs): PieceOut {
  const b = a.box;
  const body = inset(b, 22, 8);
  const cy = b.y + b.h / 2;
  const tailL: Pt[] = [[body.x + 30, body.y + 12], [b.x - 8, body.y + 18], [b.x + 14, cy + 6], [b.x - 8, b.y + b.h + 2], [body.x + 30, body.y + body.h + 8]];
  const tailR: Pt[] = tailL.map(([x, y]) => [2 * (b.x + b.w / 2) - x, y]);
  const tails = [tailL, tailR].map((pts) => {
    const sdf = polySdf(pts);
    const tb = { x: Math.min(...pts.map((p) => p[0])), y: Math.min(...pts.map((p) => p[1])), w: 0, h: 0 };
    tb.w = Math.max(...pts.map((p) => p[0])) - tb.x; tb.h = Math.max(...pts.map((p) => p[1])) - tb.y;
    return raster(tb, sdf, plate(sdf, { light: BONE.mid, mid: BONE.dark, dark: BONE.dark }, (x, y) => band(y, tb, deckShades(a.pal, x, tb, 0.45)), P, false), a.opacity);
  }).join('');
  const sdf = boxSdf(body, 2 * P);
  const svg = tails + hardShadow(body, sdf, a.opacity) +
    raster(body, sdf, plate(sdf, BONE, (x, y) => band(y, body, deckShades(a.pal, x, body, 0.1)), P), a.opacity);
  return { svg, content: inset(body, 5 * P, 2 * P), text: txt('#ffffff', 700) };
}

/** Placa de ferro com aro de osso (barra de tipo, ATK/DEF, rodapé). */
function ironPlate(a: PieceArgs, b: Box, radius: number, rimW = P): { svg: string; inner: Box } {
  const sdf = boxSdf(b, radius);
  const svg = hardShadow(b, sdf, a.opacity) +
    raster(b, sdf, plate(sdf, BONE, (_x, y) => band(y, b, [IRON.light, IRON.mid, IRON.dark, IRON.deep]), rimW), a.opacity);
  return { svg, inner: inset(b, rimW + 2 * P, rimW + P) };
}

/** Ruído estável por pixel (bordas rasgadas). */
const noise = (i: number, j: number) => {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const GEM = ['...O...', '..OWO..', '.OWCCO.', 'OWCCCDO', '.OCCDO.', '..ODO..', '...O...'];

export const sombrio: PieceStyle[] = [
  { style: 'sombrio', kind: 'header', opacity: 1, metal: 'deck', render: (a) => ribbon(a) },
  { style: 'sombrio', kind: 'cost', opacity: 1, metal: 'deck', render: (a) => badge(a) },
  { style: 'sombrio', kind: 'class', opacity: 1, metal: 'deck', render: (a) => badge(a) },
  { style: 'sombrio', kind: 'set', opacity: 1, metal: 'deck', render: (a) => badge(a, true) },
  {
    style: 'sombrio', kind: 'typeBar', opacity: 1, metal: 'deck',
    render(a) {
      const b = inset(a.box, 12, 4);
      const { svg, inner } = ironPlate(a, b, 2 * P);
      return {
        svg, content: { ...inner, x: inner.x + P, w: inner.w - 11 * P }, text: txt(BONE.hi),
        gem: { x: b.x + b.w - 11 * P, y: b.y + b.h / 2 - 3.5 * P, w: 7 * P, h: 7 * P },
      };
    },
    gemRender: (gb, color) => pixelArt(GEM, g(gb.x), g(gb.y), P, { O: OUT, W: '#fff', C: color, D: darken(color, 0.35) }),
  },
  {
    style: 'sombrio', kind: 'rules', opacity: 1, metal: 'deck',
    render(a) {
      const b = a.box;
      const { svg: frame } = ironPlate(a, b, 3 * P, P);
      // pergaminho de bordas rasgadas por dentro da moldura de ferro
      const pb = inset(b, 4 * P, 3 * P);
      const base = boxSdf(pb, P);
      const torn: Sdf = (x, y) => base(x, y) - (noise(Math.floor(x / P), Math.floor(y / P)) > 0.62 ? P : 0);
      const paint: Paint = (d, light, _x, y) => {
        if (d < P) return [light < -0.2 ? '#8f7650' : '#b9a172', 'f'];
        return [band(y, pb, PARCH), 'f'];
      };
      const svg = frame + raster(pb, torn, paint, a.opacity);
      return { svg, content: inset(pb, 3 * P, 2.5 * P), text: { family: FONT, weight: 500, color: INK_DARK } };
    },
    divider(a, x, y, w) {
      const Y = g(y);
      let d = '';
      for (let i = g(x); i < x + w; i += P * 3) d += `M${i} ${Y}h${P}v${P}h${-P}Z`;
      return `<path d="${d}" fill="${darken(vivid(a.pal.base), 0.2)}" shape-rendering="crispEdges"/>`;
    },
    flavor: (pal) => ({ family: FONT, weight: 400, color: mix(darken(vivid(pal.base), 0.45), '#5b4430', 0.5) }),
  },
  {
    style: 'sombrio', kind: 'stat', opacity: 1, metal: 'deck',
    render(a) {
      const { svg, inner } = ironPlate(a, inset(a.box, 2, 2), 2 * P);
      return { svg, content: inset(inner, 0, -P), text: num(BONE.hi) };
    },
  },
  {
    style: 'sombrio', kind: 'footer', opacity: 1, metal: 'deck',
    render(a) {
      const { svg, inner } = ironPlate(a, inset(a.box, 0, -2), P);
      return { svg, content: inset(inner, 0, -P), text: num(BONE.light) };
    },
  },
  {
    style: 'sombrio', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const b = a.box;
      const T = 5 * P;
      const outer = boxSdf(b, CARD_RADIUS);
      const frame = raster(b, (x, y) => {
        const d = outer(x, y);
        return d < T ? d : -1;
      }, (d, light) => {
        if (d < P) return [OUT, 'r'];
        if (d < 2 * P) return [lit(light, { light: IRON.hi, mid: IRON.light, dark: IRON.dark }), 'r'];
        if (d < 4 * P) return [d < 3 * P ? IRON.mid : IRON.dark, 'r'];
        return [lit(light, BONE), 'r'];
      });
      // chifres de osso saindo dos cantos, curvando para dentro
      let horns = '';
      const corner = (sx: 1 | -1, sy: 1 | -1) => {
        const ox = sx > 0 ? b.x : b.x + b.w, oy = sy > 0 ? b.y : b.y + b.h;
        const along: Pt[] = bezier([ox + sx * 6 * P, oy + sy * 4 * P], [ox + sx * 22 * P, oy + sy * 3 * P], [ox + sx * 30 * P, oy + sy * 8 * P], [ox + sx * 33 * P, oy + sy * 13 * P], 14);
        const down: Pt[] = bezier([ox + sx * 4 * P, oy + sy * 6 * P], [ox + sx * 3 * P, oy + sy * 22 * P], [ox + sx * 8 * P, oy + sy * 30 * P], [ox + sx * 13 * P, oy + sy * 33 * P], 14);
        for (const pts of [along, down]) {
          const sdf = hornSdf(pts, 5 * P, 1.2 * P);
          const hb = { x: Math.min(...pts.map((p) => p[0])) - 4 * P, y: Math.min(...pts.map((p) => p[1])) - 4 * P, w: 0, h: 0 };
          hb.w = Math.max(...pts.map((p) => p[0])) + 4 * P - hb.x; hb.h = Math.max(...pts.map((p) => p[1])) + 4 * P - hb.y;
          // contorno = a mesma forma um pixel maior, por baixo; osso inteiro por cima
          horns += raster(hb, (x, y) => sdf(x, y) + P, () => [OUT, 'r']) +
            raster(hb, sdf, (d, light) => [d < 1.5 * P ? lit(light, BONE) : lit(light, { light: BONE.hi, mid: BONE.light, dark: BONE.mid }), 'r']);
        }
      };
      corner(1, 1); corner(-1, 1); corner(1, -1); corner(-1, -1);
      return { svg: frame + horns, content: inset(b, T), text: txt() };
    },
  },
];
