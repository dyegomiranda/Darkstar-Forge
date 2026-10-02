/**
 * Feitio das armaduras de conjunto. As peças de placas do acervo têm um desenho só; o
 * que dá identidade a cada conjunto é trabalhado aqui, em cima da própria peça e quadro
 * a quadro (por isso acompanha as animações): espinhos, runa no peito, escamas, frisos,
 * cristais, costelas, gema.
 */
import type { SlotId } from './lpc';

export interface Forge {
  pt: string; en: string;
  /** Espinhos nos ombros e nos braços: garras curvas, cristais retos ou pontas de osso. */
  spikes?: 'horn' | 'claw' | 'crystal' | 'bone';
  /** Trabalho da superfície das placas. */
  texture?: 'scales' | 'bands' | 'facets';
  /** Friso na borda de dentro de cada placa (cor fixa, ou o tom mais claro do metal). */
  trim?: string | 'light';
  /** Marca no peito. */
  sigil?: 'ridges' | 'rune' | 'sun' | 'cross' | 'gem' | 'ribs';
  /** Veios de brasa nas frestas e nos brilhos da peça, seja qual for a cor do metal. */
  veins?: boolean;
  /** Cor da marca e das pontas (quando não é a do metal). */
  accent?: string;
}

/** A brasa das peças daédricas (o boneco animado faz esses pontos pulsarem). */
export const EMBER = '#ff5a2a';
/** Brasa escura: o veio nas frestas das placas. */
export const EMBER_DARK = '#7a0c10';
/** Brasa média: as arestas das quilhas e o corpo das pontas. */
export const EMBER_MID = '#d2381c';

export const FORGES: Record<string, Forge> = {
  daedric: { pt: 'Daédrico', en: 'Daedric', spikes: 'horn', sigil: 'ridges', veins: true, accent: EMBER },
  ebony: { pt: 'Ébano', en: 'Ebony', texture: 'bands', trim: '#a9a3c4' },
  dragon: { pt: 'Sangue de dragão', en: 'Dragonblood', texture: 'scales', spikes: 'bone', accent: '#ffd9a0' },
  frost: { pt: 'Guardião do gelo', en: 'Frost warden', texture: 'facets', spikes: 'crystal', accent: '#ffffff' },
  celestial: { pt: 'Celestial', en: 'Celestial', trim: '#ffffff', sigil: 'sun', accent: '#ffffff' },
  paladin: { pt: 'Paladino', en: 'Paladin', trim: 'light', sigil: 'cross', accent: '#c8202a' },
  bone: { pt: 'Senhor dos ossos', en: 'Bone lord', sigil: 'ribs', spikes: 'bone' },
  amethyst: { pt: 'Cavaleiro do vazio', en: 'Void knight', trim: '#e9c8ff', sigil: 'gem', accent: '#ff7af0' },
};

const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };

/** Marcas do peito: pontos (x, y) a partir do centro; `1` = cor da marca, `2` = brilho. */
const SIGILS: Record<string, [number, number, 1 | 2][]> = {
  rune: [[-2, 0, 1], [2, 0, 1], [-1, 1, 1], [1, 1, 1], [0, 2, 2], [-1, 3, 1], [1, 3, 1], [0, 4, 1]],
  sun: [[0, 0, 1], [-1, 1, 1], [0, 1, 2], [1, 1, 1], [0, 2, 1], [-2, 1, 1], [2, 1, 1]],
  cross: [[0, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1], [0, 3, 1]],
  gem: [[0, 0, 2], [1, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]],
};

/**
 * Chifre de ombreira (lado direito; o esquerdo é o espelho): nasce do alto do ombro, abre para fora e sobe.
 * `o` contorno, `m` corpo, `v` fio de brasa na aresta de dentro, `e` ponta em brasa.
 */
const HORN = [
  '......e',
  '.....ee',
  '....vmo',
  '...vmo.',
  '..vmmo.',
  '.vmmo..',
  'vmmmo..',
  'vmmo...',
];
/** Peitoral em quilhas: duas arestas em V que descem para uma fenda de brasa no meio (metade direita; a esquerda é o espelho). */
const RIDGES: [number, number, 'v' | 'o' | 'e'][] = [
  [6, 0, 'v'], [5, 1, 'v'], [4, 2, 'v'], [3, 3, 'v'], [2, 4, 'v'], [1, 5, 'v'],
  [6, 1, 'o'], [5, 2, 'o'], [4, 3, 'o'], [3, 4, 'o'], [2, 5, 'o'],
  [5, 4, 'v'], [4, 5, 'v'], [3, 6, 'v'], [2, 7, 'v'], [1, 8, 'v'],
  [5, 5, 'o'], [4, 6, 'o'], [3, 7, 'o'], [2, 8, 'o'],
  [4, 8, 'v'], [3, 9, 'v'], [2, 10, 'v'], [1, 11, 'v'],
  [0, 5, 'e'], [0, 6, 'e'], [0, 7, 'e'], [0, 8, 'e'], [0, 9, 'e'], [0, 10, 'e'], [0, 11, 'e'], [0, 12, 'e'],
];

/**
 * Trabalha uma camada já pintada (todos os quadros de uma peça). `ramp` = os 6 tons do
 * metal da peça, do escuro ao claro. As fileiras são as direções: costas, esquerda, frente, direita.
 */
export function forge(ctx: CanvasRenderingContext2D, slot: SlotId, style: string, ramp: string[], frames: number, rows: number, size: number): void {
  const f = FORGES[style];
  if (!f || ramp.length < 6) return;
  const W = frames * size, H = rows * size;
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const tones = ramp.map(rgb);
  const accent = rgb(f.accent ?? ramp[5]), bright = rgb('#ffffff');
  /** Brasa média (entre o veio escuro e a ponta acesa): as arestas das quilhas. */
  const glowing = rgb(EMBER_MID);
  const trim = f.trim ? rgb(f.trim === 'light' ? ramp[5] : f.trim) : null;
  const at = (x: number, y: number) => (y * W + x) * 4;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && d[at(x, y) + 3] > 60;
  /** Qual dos tons do metal é este ponto (-1 = nenhum: fivela, tecido, sombra…). */
  const tone = (x: number, y: number) => { const i = at(x, y); return tones.findIndex((t) => Math.abs(t[0] - d[i]) + Math.abs(t[1] - d[i + 1]) + Math.abs(t[2] - d[i + 2]) <= 6); };
  const put = (x: number, y: number, c: readonly [number, number, number], x0: number, y0: number) => {
    if (x < x0 || y < y0 || x >= x0 + size || y >= y0 + size) return;
    const i = at(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  };
  const plates = slot === 'torso' || slot === 'shoulders' || slot === 'legs' || slot === 'arms' || slot === 'head' || slot === 'feet' || slot === 'hands';

  for (let r = 0; r < rows; r++) for (let fr = 0; fr < frames; fr++) {
    const x0 = fr * size, y0 = r * size;
    // a peça neste quadro
    let bx = size, by = size, ex = -1, ey = -1;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (solid(x0 + x, y0 + y)) { bx = Math.min(bx, x); ex = Math.max(ex, x); by = Math.min(by, y); ey = Math.max(ey, y); }
    if (ex < 0) continue;
    const front = rows === 1 || r === 2, back = rows > 1 && r === 0;
    // (as mudanças são decididas com a peça original e aplicadas depois, para uma não interferir na outra)
    const todo: [number, number, readonly [number, number, number]][] = [];

    if (plates && f.veins) {
      // os veios vêm dos tons da própria peça (a sombra das frestas e o brilho), então existem em qualquer cor
      const vein = rgb(EMBER_DARK);
      for (let y = by; y <= ey; y++) for (let x = bx; x <= ex; x++) {
        if (!solid(x0 + x, y0 + y)) continue;
        const t = tone(x0 + x, y0 + y);
        if (t === 1) todo.push([x, y, vein]); else if (t === 5) todo.push([x, y, accent]);
      }
    }

    if (plates && f.texture) {
      for (let y = by; y <= ey; y++) for (let x = bx; x <= ex; x++) {
        if (!solid(x0 + x, y0 + y)) continue;
        const t = tone(x0 + x, y0 + y);
        if (t < 2 || t > 4) continue;
        const u = x - bx, v = y - by;
        if (f.texture === 'scales') { if (v % 2 === 0 && (u + (v >> 1)) % 2 === 0) todo.push([x, y, tones[t - 1]]); }
        else if (f.texture === 'bands') { if (slot === 'torso' && v % 3 === 2) todo.push([x, y, tones[1]]); }
        else if ((u + v) % 5 === 0) todo.push([x, y, tones[5]]);
        else if ((u + v) % 5 === 1 && t > 2) todo.push([x, y, tones[t - 1]]);
      }
    }

    if (slot === 'hands') {
      for (let y = by; y <= ey; y++) for (let x = bx; x <= ex; x++) {
        const i = at(x0 + x, y0 + y);
        if (solid(x0 + x, y0 + y) && tone(x0 + x, y0 + y) < 0 && d[i] + d[i + 1] + d[i + 2] > 420) todo.push([x, y, f.accent ? accent : tones[4]]);
      }
    }

    if (trim && (slot === 'torso' || slot === 'shoulders' || slot === 'head' || slot === 'legs')) {
      const edge = (x: number, y: number) => solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1));
      for (let y = by; y <= ey; y++) for (let x = bx; x <= ex; x++) {
        const X = x0 + x, Y = y0 + y;
        if (!solid(X, Y) || edge(X, Y)) continue;
        const t = tone(X, Y);
        // segunda volta (logo por dentro do contorno), só em cima e dos lados: o friso da placa
        if (t >= 2 && (edge(X, Y - 1) || edge(X - 1, Y) || edge(X + 1, Y)) && !edge(X, Y + 1)) todo.push([x, y, trim]);
      }
    }

    if (f.sigil && slot === 'torso' && front) {
      // centro do peito: a média das primeiras linhas da peça (o pescoço), que mexe pouco com os braços
      let sum = 0, n = 0;
      for (let y = by; y <= Math.min(ey, by + 3); y++) for (let x = bx; x <= ex; x++) if (solid(x0 + x, y0 + y)) { sum += x; n++; }
      const cx = n ? Math.round(sum / n) : Math.round((bx + ex) / 2), cy = by + Math.max(2, Math.round((ey - by) * 0.28));
      if (f.sigil === 'ridges') {
        const top = by + 1;
        for (const [dx, dy, k] of RIDGES) for (const sx of dx ? [-1, 1] : [1]) {
          if (solid(x0 + cx + dx * sx, y0 + top + dy)) todo.push([cx + dx * sx, top + dy, k === 'e' ? accent : k === 'v' ? glowing : tones[0]]);
        }
      } else if (f.sigil === 'ribs') {
        for (let k = 0; k < 3; k++) for (let dx = -3; dx <= 3; dx++) if (dx !== 0 && solid(x0 + cx + dx, y0 + cy + k * 2)) todo.push([cx + dx, cy + k * 2 + (Math.abs(dx) === 3 ? 1 : 0), tones[1]]);
        for (let k = 0; k < 6; k++) if (solid(x0 + cx, y0 + cy + k)) todo.push([cx, cy + k, tones[5]]);
      } else for (const [dx, dy, kind] of SIGILS[f.sigil]) if (solid(x0 + cx + dx, y0 + cy + dy)) todo.push([cx + dx, cy + dy, kind === 2 && f.sigil !== 'rune' ? bright : accent]);
    }

    for (const [x, y, c] of todo) put(x0 + x, y0 + y, c, x0, y0);

    if (f.spikes === 'horn' && slot === 'torso') {
      const mid = (bx + ex) / 2, h = ey - by;
      for (const side of [-1, 1] as const) {
        // o ponto mais de fora nas linhas de cima (ombro) e nas de baixo (cintura)
        const outer = (ya: number, yb: number): [number, number] | null => {
          let best: [number, number] | null = null;
          for (let y = ya; y <= yb; y++) for (let k = 0; k <= ex - bx; k++) {
            const x = side < 0 ? bx + k : ex - k;
            if (side < 0 ? x > mid : x < mid) break;
            if (solid(x0 + x, y0 + y)) { if (!best || (side < 0 ? x < best[0] : x > best[0])) best = [x, y]; break; }
          }
          return best;
        };
        const sh = outer(by, by + Math.round(h * 0.3)), hip = outer(ey - Math.round(h * 0.2), ey);
        if (sh) for (const [dx, dy, c] of [[0, -1, tones[2]], [side, -2, tones[2]], [side, -3, glowing], [side * 2, -4, accent], [side, -1, tones[0]]] as const) put(x0 + sh[0] + dx, y0 + sh[1] + dy, c, x0, y0);
        if (hip && ex - bx > 8) for (const [dx, dy, c] of [[side, 0, tones[2]], [side * 2, 1, glowing], [side * 3, 2, accent]] as const) put(x0 + hip[0] + dx, y0 + hip[1] + dy, c, x0, y0);
      }
    }

    if (f.spikes && (slot === 'shoulders' || slot === 'arms' || (f.spikes === 'horn' && (slot === 'legs' || slot === 'feet')))) {
      // um espinho de cada lado: nasce do ponto mais alto (ombros) ou mais de fora (braços) da peça
      const mid = (bx + ex) / 2;
      for (const side of [-1, 1] as const) {
        let px = -1, py = -1;
        for (let y = by; y <= ey && px < 0; y++) {
          if (slot !== 'shoulders' && y < by + (ey - by) * (slot === 'feet' ? 0.5 : 0.35)) continue;
          for (let k = 0; k <= ex - bx; k++) {
            const x = side < 0 ? bx + k : ex - k;
            if ((side < 0 ? x > mid : x < mid)) break;
            if (solid(x0 + x, y0 + y)) { px = x; py = y; break; }
          }
        }
        if (px < 0 || (ex - bx < 6 && side > 0)) continue;
        const o = back ? side : side; // de costas os lados são os mesmos na tela
        const tip = f.spikes === 'claw' ? accent : f.spikes === 'crystal' ? bright : tones[5];
        if (f.spikes === 'horn' && slot === 'shoulders') {
          // ombreira de chifre: bem maior que um espinho, muda a silhueta
          const colors = { o: tones[0], m: tones[2], v: tones[1], e: accent };
          HORN.forEach((line, i) => [...line].forEach((ch, c) => { if (ch !== '.') put(x0 + px + o * (c - 1), y0 + py - HORN.length + i, colors[ch as 'o'], x0, y0); }));
          // e uma garra menor, para fora, logo abaixo
          put(x0 + px + o * 2, y0 + py + 1, tones[2], x0, y0); put(x0 + px + o * 3, y0 + py + 1, tones[1], x0, y0); put(x0 + px + o * 4, y0 + py, accent, x0, y0);
          continue;
        }
        const dots: [number, number, readonly [number, number, number]][] = f.spikes === 'crystal'
          ? [[0, -1, tones[4]], [0, -2, tones[5]], [0, -3, tip], [o, -1, tones[3]]]
          : slot !== 'shoulders'
            ? (f.spikes === 'horn' ? [[o, 0, tones[2]], [o * 2, 0, tones[1]], [o * 3, -1, accent]] : [[o, 0, tones[3]], [o * 2, -1, tip]])
            : [[0, -1, tones[2]], [o, -2, tones[4]], [o, -3, tip], [o * 2, -4, tip]];
        for (const [dx, dy, c] of dots) put(x0 + px + dx, y0 + py + dy, c, x0, y0);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Luvas de verdade: a peça do acervo cobre só as costas da mão. A partir dela, a pele vizinha
 * (a mão e o começo do antebraço) ganha os tons do material da luva, tom por tom.
 * `mask` = só a luva; `skin` e `ramp` = os 6 tons da pele e do material, do escuro ao claro.
 */
export function cover(ctx: CanvasRenderingContext2D, mask: CanvasRenderingContext2D, skin: string[], ramp: string[], size: number, reach = 4): void {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, W, H), d = img.data, m = mask.getImageData(0, 0, W, H).data;
  const from = skin.map(rgb), to = ramp.map(rgb);
  const skinTone = (i: number) => (d[i + 3] ? from.findIndex((t) => Math.abs(t[0] - d[i]) + Math.abs(t[1] - d[i + 1]) + Math.abs(t[2] - d[i + 2]) <= 6) : -1);
  // distância (em passos) de cada ponto de pele até a luva, sem sair do quadro
  const dist = new Uint8Array(W * H);
  let wave: number[] = [];
  for (let p = 0; p < W * H; p++) if (m[p * 4 + 3] > 60) { dist[p] = 1; wave.push(p); }
  for (let step = 1; step <= reach && wave.length; step++) {
    const next: number[] = [];
    for (const p of wave) {
      const x = p % W, y = (p - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || Math.floor(nx / size) !== Math.floor(x / size) || Math.floor(ny / size) !== Math.floor(y / size)) continue;
        const q = ny * W + nx;
        if (dist[q]) continue;
        const t = skinTone(q * 4);
        if (t < 0) continue;
        dist[q] = step + 1;
        const c = to[Math.min(to.length - 1, t)];
        d[q * 4] = c[0]; d[q * 4 + 1] = c[1]; d[q * 4 + 2] = c[2];
        // o contorno escuro fecha a mão: pinta, mas não passa adiante (senão a luva vazaria para o quadril)
        if (t >= 2) next.push(q);
      }
    }
    wave = next;
  }
  ctx.putImageData(img, 0, 0);
}
