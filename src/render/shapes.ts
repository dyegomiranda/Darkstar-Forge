/**
 * Geometria para os elementos da carta. Tudo devolve o atributo `d` de um <path>.
 * Coordenadas no espaço da carta (750×1050).
 */

export interface Box { x: number; y: number; w: number; h: number }
export type Pt = [number, number];

const f = (n: number) => +n.toFixed(2);

export function inset(b: Box, dx: number, dy = dx): Box {
  return { x: b.x + dx, y: b.y + dy, w: b.w - 2 * dx, h: b.h - 2 * dy };
}

export function poly(pts: Pt[], closed = true): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + (closed ? 'Z' : '');
}

/** Curva suave (Catmull-Rom → Bézier) passando pelos pontos. */
export function smooth(pts: Pt[], closed = false): string {
  if (pts.length < 3) return poly(pts, closed);
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f(P[1][0])} ${f(P[1][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

export function rect({ x, y, w, h }: Box): string {
  return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
}

export function roundRect({ x, y, w, h }: Box, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${r} ${r} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
    `A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)}` +
    `V${f(y + r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}Z`;
}

/** Retângulo com cantos chanfrados (cortados a 45°). */
export function chamfer({ x, y, w, h }: Box, c: number): string {
  c = Math.min(c, w / 2, h / 2);
  return poly([[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]]);
}

/** Retângulo com cantos côncavos (recortados para dentro, estilo moldura gótica). */
export function notched({ x, y, w, h }: Box, c: number): string {
  c = Math.min(c, w / 2, h / 2);
  return `M${f(x + c)} ${f(y)}H${f(x + w - c)}A${c} ${c} 0 0 0 ${f(x + w)} ${f(y + c)}V${f(y + h - c)}` +
    `A${c} ${c} 0 0 0 ${f(x + w - c)} ${f(y + h)}H${f(x + c)}A${c} ${c} 0 0 0 ${f(x)} ${f(y + h - c)}` +
    `V${f(y + c)}A${c} ${c} 0 0 0 ${f(x + c)} ${f(y)}Z`;
}

/** Faixa com pontas (hexágono alongado). `p` = comprimento da ponta. */
export function banner({ x, y, w, h }: Box, p: number): string {
  return poly([[x + p, y], [x + w - p, y], [x + w, y + h / 2], [x + w - p, y + h], [x + p, y + h], [x, y + h / 2]]);
}

/** Faixa com pontas + recorte central em cada ponta (rabo de andorinha invertido). */
export function bannerSwallow({ x, y, w, h }: Box, p: number, notch: number): string {
  return poly([[x + p, y], [x + w - p, y], [x + w, y + h / 2 - notch], [x + w - notch * 0.8, y + h / 2], [x + w, y + h / 2 + notch],
    [x + w - p, y + h], [x + p, y + h], [x, y + h / 2 + notch], [x + notch * 0.8, y + h / 2], [x, y + h / 2 - notch]]);
}

export function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)}A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)}Z`;
}

/** Estrela de n pontas. `rot` em graus (0 = ponta para cima). */
export function star(cx: number, cy: number, rOut: number, rIn: number, n: number, rot = 0): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot - 90) * Math.PI) / 180 + (i * Math.PI) / n;
    const r = i % 2 ? rIn : rOut;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(pts);
}

/** Losango (joia/diamante). */
export function diamond(cx: number, cy: number, rx: number, ry = rx): string {
  return poly([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]]);
}

/**
 * Cravo/espinho: losango alongado que sai de (cx,cy) na direção `ang` (graus, 0 = para cima).
 * `len` = comprimento até a ponta, `wid` = meia largura na base, `back` = recuo atrás do centro.
 */
export function spike(cx: number, cy: number, ang: number, len: number, wid: number, back = wid): string {
  const a = ((ang - 90) * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a);
  const px = -uy, py = ux;
  const bx = cx + ux * len * 0.28, by = cy + uy * len * 0.28;
  return poly([[cx + ux * len, cy + uy * len], [bx + px * wid, by + py * wid], [cx - ux * back, cy - uy * back], [bx - px * wid, by - py * wid]]);
}

/** Pontos de uma Bézier cúbica. */
export function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/** Espiral (para voluta/filigrana). */
export function spiral(cx: number, cy: number, r0: number, turns: number, a0 = 0, dir = 1, n = 40): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const r = r0 * (1 - t * 0.85);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/**
 * Traço afunilado (gavinha/filigrana) ao longo de uma linha de pontos.
 * A largura vai de w0 (início) a w1 (fim), com curva `ease` (>1 afina mais rápido).
 */
export function tapered(pts: Pt[], w0: number, w1 = 0, ease = 1): string {
  const n = pts.length;
  const L: Pt[] = [], R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const t = (i / (n - 1)) ** ease;
    const w = (w0 + (w1 - w0) * t) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return smooth([...L, ...R.reverse()], true);
}

/** Espelha um `d` horizontalmente em torno de x = cx (só para caminhos gerados por estas funções: M/L/C/Z). */
export function mirrorPts(pts: Pt[], cx: number): Pt[] {
  return pts.map(([x, y]) => [2 * cx - x, y]);
}

export function mirrorPtsY(pts: Pt[], cy: number): Pt[] {
  return pts.map(([x, y]) => [x, 2 * cy - y]);
}

/** Moldura (anel) = forma externa − forma interna, com fill-rule evenodd. */
export function ring(outer: string, inner: string): string {
  return outer + inner;
}

/** Quadrifólio gótico (quatro lóbulos). `r` = raio externo aproximado. */
export function quatrefoil(cx: number, cy: number, r: number): string {
  const d = r * 0.5, rl = r * 0.47;
  const h = Math.sqrt(Math.max(0, rl * rl - (d * d) / 2));
  // ponto de recuo entre o lóbulo de cima e o da direita, depois girado 4×
  const nx = d / 2 - h / Math.SQRT2, ny = -d / 2 + h / Math.SQRT2;
  const rot = (x: number, y: number, k: number): Pt => {
    const a = (k * Math.PI) / 2;
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  };
  let p = rot(nx, ny, 3);
  let out = `M${f(p[0])} ${f(p[1])}`;
  for (let k = 0; k < 4; k++) {
    p = rot(nx, ny, k);
    out += `A${f(rl)} ${f(rl)} 0 1 1 ${f(p[0])} ${f(p[1])}`;
  }
  return out + 'Z';
}

/** Placa com topo em arco gótico (ogiva). `rise` = altura do arco. */
export function arch({ x, y, w, h }: Box, rise: number): string {
  const cx = x + w / 2;
  return `M${f(x)} ${f(y + h)}V${f(y + rise)}C${f(x + w * 0.22)} ${f(y + rise)} ${f(cx - w * 0.08)} ${f(y + rise * 0.3)} ${f(cx)} ${f(y)}` +
    `C${f(cx + w * 0.08)} ${f(y + rise * 0.3)} ${f(x + w * 0.78)} ${f(y + rise)} ${f(x + w)} ${f(y + rise)}V${f(y + h)}Z`;
}

/** Escudo (formato "heater"). */
export function heater({ x, y, w, h }: Box): string {
  const cx = x + w / 2;
  return `M${f(x)} ${f(y)}Q${f(cx)} ${f(y + h * 0.08)} ${f(x + w)} ${f(y)}V${f(y + h * 0.42)}` +
    `C${f(x + w)} ${f(y + h * 0.75)} ${f(cx + w * 0.2)} ${f(y + h * 0.9)} ${f(cx)} ${f(y + h)}` +
    `C${f(cx - w * 0.2)} ${f(y + h * 0.9)} ${f(x)} ${f(y + h * 0.75)} ${f(x)} ${f(y + h * 0.42)}Z`;
}

/** Aleatório determinístico (mesma semente → mesmo desenho). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Contorno orgânico (casca, pedra): retângulo com borda irregular e suave. */
export function organic({ x, y, w, h }: Box, amp: number, seed = 1, step = 26): string {
  const rnd = rng(seed);
  const pts: Pt[] = [];
  const j = () => (rnd() - 0.5) * 2 * amp;
  for (let i = 0; i <= w; i += step) pts.push([x + i, y + j()]);
  for (let i = step; i <= h; i += step) pts.push([x + w + j(), y + i]);
  for (let i = w - step; i >= 0; i -= step) pts.push([x + i, y + h + j()]);
  for (let i = h - step; i > 0; i -= step) pts.push([x + j(), y + i]);
  return smooth(pts, true);
}

/** Hexágono (pontas em cima e embaixo quando `pointy`). */
export function hexagon(cx: number, cy: number, r: number, pointy = true): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((pointy ? -90 : 0) + i * 60) * (Math.PI / 180);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(pts);
}

/** Paralelogramo inclinado (`skew` = deslocamento horizontal do topo). */
export function parallelogram({ x, y, w, h }: Box, skew: number): string {
  return poly([[x + skew, y], [x + w, y], [x + w - skew, y + h], [x, y + h]]);
}

/** Retângulo "pixelado": cantos em degrau, tudo alinhado a uma grade de `p` px. */
export function pixelRect({ x, y, w, h }: Box, p: number, steps = 2): string {
  const X = Math.round(x / p) * p, Y = Math.round(y / p) * p;
  const W = Math.round(w / p) * p, H = Math.round(h / p) * p;
  const s = steps * p;
  const pts: Pt[] = [[X + s, Y], [X + W - s, Y]];
  for (let i = 1; i <= steps; i++) pts.push([X + W - s + i * p, Y + (i - 1) * p], [X + W - s + i * p, Y + i * p]);
  pts.push([X + W, Y + H - s]);
  for (let i = 1; i <= steps; i++) pts.push([X + W - (i - 1) * p, Y + H - s + i * p], [X + W - i * p, Y + H - s + i * p]);
  pts.push([X + s, Y + H]);
  for (let i = 1; i <= steps; i++) pts.push([X + s - i * p, Y + H - (i - 1) * p], [X + s - i * p, Y + H - i * p]);
  pts.push([X, Y + s]);
  for (let i = 1; i <= steps; i++) pts.push([X + (i - 1) * p, Y + s - i * p], [X + i * p, Y + s - i * p]);
  return poly(pts);
}

/** Desenho em pixels a partir de linhas de texto ('.' = vazio, letras = cor da paleta). */
export function pixelArt(rows: string[], x: number, y: number, p: number, colors: Record<string, string>): string {
  const byColor: Record<string, string> = {};
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '.' || !colors[c]) continue;
      byColor[c] = (byColor[c] ?? '') + `M${f(x + i * p)} ${f(y + j * p)}h${p}v${p}h${-p}Z`;
    }
  });
  return Object.entries(byColor).map(([c, d]) => `<path d="${d}" fill="${colors[c]}" shape-rendering="crispEdges"/>`).join('');
}
