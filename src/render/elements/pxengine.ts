/**
 * Motor de pixel art por "distância até a borda" (sdf): a mesma regra pinta
 * contorno, aro iluminado e miolo em faixas, em qualquer forma (disco, cápsula,
 * placa, faixa, chifre). Usado pelos estilos Pixel Sombrio e Pixel Aço.
 */
import { darken, lighten } from '../color';
import { vivid, type Palette } from '../palette';
import type { Box, Pt } from '../shapes';

/** Tamanho do "pixel" (a carta tem 125 pixels de largura). */
export const P = 6;
export const OUT = '#120f16';

/** Distância com sinal até a borda (> 0 dentro), em px da carta. */
export type Sdf = (x: number, y: number) => number;
/** Cor de um pixel: [cor, camada] (camada 'f' = miolo, recebe a transparência) ou null. */
export type Paint = (d: number, light: number, x: number, y: number) => [string, 'r' | 'f'] | null;

export const g = (n: number) => Math.floor(n / P) * P;

/** Rasteriza a forma na grade, juntando pixels vizinhos da mesma cor numa faixa só. */
export function raster(b: Box, sdf: Sdf, paint: Paint, opacity = 1, extra = ''): string {
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

export const pillSdf = (cx: number, cy: number, r: number, ext: number): Sdf => (x, y) => {
  const dx = Math.max(0, Math.abs(x - cx) - ext);
  return r - Math.hypot(dx, y - cy);
};

export const boxSdf = (b: Box, r: number): Sdf => {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, hx = b.w / 2 - r, hy = b.h / 2 - r;
  return (x, y) => {
    const qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy;
    return -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
  };
};

export function segDist(x: number, y: number, a: Pt, b: Pt): { d: number; t: number } {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return { d: Math.hypot(x - a[0] - vx * t, y - a[1] - vy * t), t };
}

export const polySdf = (pts: Pt[]): Sdf => (x, y) => {
  let inside = false, best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    best = Math.min(best, segDist(x, y, pts[j], pts[i]).d);
  }
  return inside ? best : -best;
};

/** Traço grosso que afina (chifres, costelas). */
export const hornSdf = (pts: Pt[], w0: number, w1: number): Sdf => (x, y) => {
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
export const lit = (light: number, c: { light: string; mid: string; dark: string }) =>
  light > 0.35 ? c.light : light < -0.35 ? c.dark : c.mid;

/** Tons do miolo na cor da classe (em várias cores, colunas lado a lado). */
export function deckShades(pal: Palette, x: number, b: Box, dark = 0): string[] {
  const n = pal.colors.length;
  const i = Math.min(n - 1, Math.max(0, Math.floor(((x - b.x) / b.w) * n)));
  const v = darken(vivid(pal.colors[i]), dark);
  return [lighten(v, 0.18), v, darken(v, 0.16), darken(v, 0.32)];
}

/** Faixa de tom pela altura (4 faixas sólidas, sem degradê). */
export const band = (y: number, b: Box, shades: string[]) =>
  shades[Math.min(shades.length - 1, Math.max(0, Math.floor(((y - b.y) / b.h) * shades.length)))];

/**
 * Peça padrão: contorno escuro, aro (osso ou ferro), filete escuro e miolo em faixas.
 * `fill` escolhe a cor do miolo pela posição.
 */
export function plate(sdf: Sdf, rim: { light: string; mid: string; dark: string }, fill: (x: number, y: number) => string, rimW = P, line = true): Paint {
  return (d, light, x, y) => {
    if (d < P) return [OUT, 'r'];
    if (d < P + rimW) return [lit(light, rim), 'r'];
    if (line && d < 2 * P + rimW) return [OUT, 'r'];
    return [fill(x, y), 'f'];
  };
}

/** Sombra dura de 1 pixel, deslocada para baixo e à direita. */
export const hardShadow = (b: Box, sdf: Sdf, opacity: number) =>
  raster(b, sdf, (d) => (d >= 0 ? ['#000', 'r'] : null), 1, ` opacity="${+(0.55 * opacity).toFixed(3)}" transform="translate(${P} ${P})"`);

/** Ruído estável por pixel (bordas rasgadas). */
export const noise = (i: number, j: number) => {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

