/**
 * Desenho do mapa da Jornada, gerado na hora a partir da semente do mapa (nunca dois iguais).
 * Cada ponto do mapa "puxa" a sua região: o terreno em volta dele ganha as cores e os enfeites
 * do bioma (floresta, deserto, neve, vulcão…). Um bioma passa ao outro aos poucos (as divisas são tortas e misturadas),
 * e tudo é pintado numa grade baixa, ampliada sem suavizar — pixel art.
 */
import { rng, type JourneyMap } from '../../game/journey';

export const MAP_W = 448, MAP_H = 252;

export interface BiomeArt {
  name: [string, string];
  /** Tons do chão, do mais escuro ao mais claro, e a cor de detalhe. */
  tones: [string, string, string, string];
  detail: string;
  /** Enfeites espalhados pela região (nomes de SPRITES) e quantos a cada 1000 pontos de área. */
  deco: string[]; density: number;
}

export const BIOMES: Record<string, BiomeArt> = {
  floresta: { name: ['Floresta', 'Forest'], tones: ['#17381f', '#1f4a26', '#2b5f2e', '#3a7438'], detail: '#4f8f45', deco: ['tree', 'tree', 'pine', 'bush'], density: 7 },
  campo: { name: ['Planícies', 'Plains'], tones: ['#4c6a2a', '#5e7d30', '#76933a', '#93a94a'], detail: '#c9c45a', deco: ['tuft', 'tuft', 'flower', 'hay'], density: 4 },
  vulcao: { name: ['Terras vulcânicas', 'Volcanic lands'], tones: ['#1c1416', '#2a1c1d', '#3a2624', '#4a302a'], detail: '#ff7a2a', deco: ['volcano', 'rock', 'rock', 'ember'], density: 3 },
  masmorra: { name: ['Ruínas', 'Ruins'], tones: ['#2a2b33', '#383a45', '#484b58', '#5a5e6c'], detail: '#7d8296', deco: ['pillar', 'rubble', 'rubble', 'arch'], density: 3.2 },
  neve: { name: ['Montanhas geladas', 'Frozen peaks'], tones: ['#9fb4c8', '#b9cbdb', '#d5e2ec', '#eef5fa'], detail: '#ffffff', deco: ['snowpine', 'snowpine', 'peak', 'ice'], density: 4.5 },
  deserto: { name: ['Deserto', 'Desert'], tones: ['#a8834a', '#bd9858', '#d0ae6a', '#e0c480'], detail: '#f0dba0', deco: ['dune', 'dune', 'cactus', 'bones'], density: 3 },
  pantano: { name: ['Pântano', 'Swamp'], tones: ['#16261f', '#1d3328', '#274232', '#35543c'], detail: '#1b3a44', deco: ['deadtree', 'reeds', 'reeds', 'shroom'], density: 4.5 },
  cripta: { name: ['Terras mortas', 'Deadlands'], tones: ['#1c1528', '#281d38', '#352748', '#45335c'], detail: '#7a5cb0', deco: ['tomb', 'tomb', 'deadtree', 'skull'], density: 3.6 },
};
export const biomeOf = (id: string): BiomeArt => BIOMES[id] ?? BIOMES.campo;

/** Enfeites: grades de letras; cada letra é uma cor (ponto = vazio). */
const SPRITES: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  tree: { rows: ['..ggg..', '.gGGGg.', 'gGGLGGg', 'gGGGGGg', '.gGGGg.', '...t...', '...t...'], pal: { g: '#12301a', G: '#2f7a37', L: '#59a851', t: '#4a3220' } },
  pine: { rows: ['...g...', '..gGg..', '..gGg..', '.gGGGg.', '.gGLGg.', 'gGGGGGg', '...t...'], pal: { g: '#0f2a1c', G: '#226b44', L: '#3f9a63', t: '#4a3220' } },
  bush: { rows: ['.ggg.', 'gGLGg', '.ggg.'], pal: { g: '#12301a', G: '#2f7a37', L: '#59a851' } },
  tuft: { rows: ['g.g.g', '.ggg.'], pal: { g: '#a9bd58' } },
  flower: { rows: ['.r.', 'ryr', '.g.'], pal: { r: '#e86a8a', y: '#ffe07a', g: '#4c6a2a' } },
  hay: { rows: ['.yyy.', 'yYYYy', 'yYYYy', 'ddddd'], pal: { y: '#b89a3c', Y: '#e2c765', d: '#3d5222' } },
  volcano: { rows: ['.....oO.....', '....ddOd....', '...dDDodd...', '..dDDDDoDd..', '.dDDDDDDDDd.', 'dDDDDDDDDDDd'], pal: { d: '#120c0d', D: '#3c2826', o: '#ff7a2a', O: '#ffd36a' } },
  rock: { rows: ['.dd.', 'dDLd', 'dDDd'], pal: { d: '#120c0d', D: '#4a3632', L: '#6b4e46' } },
  ember: { rows: ['o', 'O'], pal: { o: '#ff7a2a', O: '#ffd36a' } },
  pillar: { rows: ['LLL', '.D.', '.D.', '.D.', 'ddd'], pal: { L: '#9aa0b4', D: '#6b7083', d: '#1f2028' } },
  rubble: { rows: ['.D..', 'DLD.', 'dDdd'], pal: { D: '#6b7083', L: '#9aa0b4', d: '#1f2028' } },
  arch: { rows: ['.LLLLL.', 'LD...DL', 'D.....D', 'D.....D', 'd.....d'], pal: { L: '#9aa0b4', D: '#6b7083', d: '#1f2028' } },
  snowpine: { rows: ['...w...', '..wGw..', '..gGg..', '.wGGGw.', '.gGGGg.', 'wGGGGGw', '...t...'], pal: { g: '#3d5c58', G: '#4f7a70', w: '#ffffff', t: '#5a4636' } },
  peak: { rows: ['.....w.....', '....wWs....', '...wWWss...', '..sWWsSss..', '.sSSsSSSss.', 'sSSSSSSSSSs'], pal: { w: '#ffffff', W: '#e3edf5', s: '#7f95aa', S: '#93a8bc' } },
  ice: { rows: ['.c.', 'cCc', '.c.'], pal: { c: '#8fd0ee', C: '#e8fbff' } },
  dune: { rows: ['..LLLL...', '.LllllLL.', 'dddddllld'], pal: { L: '#f0dba0', l: '#d6b671', d: '#9a7640' } },
  cactus: { rows: ['..g..', 'g.g.g', 'ggggg', '..g..', '..g..'], pal: { g: '#4f7a3a' } },
  bones: { rows: ['w.w', '.w.', 'w.w'], pal: { w: '#f1ead6' } },
  deadtree: { rows: ['t...t', '.t.t.', '..t..', '.tt..', '..t..', '..t..'], pal: { t: '#0e120e' } },
  reeds: { rows: ['r.r', 'g.g', 'ggg'], pal: { r: '#8a6a3a', g: '#52764a' } },
  shroom: { rows: ['.pp.', 'pPPp', '.w..'], pal: { p: '#7a3f8a', P: '#c070d0', w: '#d8d2c0' } },
  tomb: { rows: ['.LL.', 'LDDL', 'LDDL', 'dddd'], pal: { L: '#8d82a6', D: '#5f5578', d: '#120d1c' } },
  skull: { rows: ['www', 'wdw', '.w.'], pal: { w: '#d9d2e6', d: '#1c1528' } },
};

/** Ruído suave (valores de 0 a 1), sempre igual para a mesma semente. */
function noise2(seed: number) {
  const h = (x: number, y: number) => { let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** Pinta o terreno do mapa no canvas (MAP_W × MAP_H). */
export function paintMap(cv: HTMLCanvasElement, map: JourneyMap): void {
  const W = MAP_W, H = MAP_H;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const nz = noise2(map.seed), nz2 = noise2(map.seed + 77), rand = rng(map.seed ^ 0x51ed);
  // os centros das regiões (mapas antigos, sem eles: cada ponto do mapa puxa a sua)
  const pts = (map.regions ?? map.nodes.map((n) => ({ x: n.x, y: n.y, biome: n.biome }))).map((r) => ({ x: r.x * W, y: r.y * H, id: r.biome }));
  const spots = map.nodes.map((n) => ({ x: n.x * W, y: n.y * H }));
  const region = new Uint8Array(W * H);
  const ids = [...new Set(pts.map((p) => p.id))];
  // 1) a que região cada ponto pertence: o centro mais perto, com a distância entortada pelo ruído. Perto da divisa,
  //    os pontos das duas regiões se misturam (mais de uma, depois mais da outra): a passagem de um bioma ao outro é gradual
  const BLEND = 30;
  const hash = (x: number, y: number) => { let n = (x * 374761393 + y * 668265263 + map.seed * 69069) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // perto de um ponto do mapa o terreno não entorta nem se mistura: o chão em volta dele é sempre o do bioma dele
    let nd = Infinity;
    for (const p of spots) { const d = Math.hypot(p.x - x, p.y - y); if (d < nd) nd = d; }
    const free = Math.max(0, Math.min(1, (nd - 14) / 26));
    const wx = x + (nz(x / 30, y / 30) - 0.5) * 34 * free, wy = y + (nz2(x / 30, y / 30) - 0.5) * 34 * free;
    let best = 0, bd = Infinity, second = 0, sd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - wx, (pts[i].y - wy) * 1.07);
      if (d < bd) { second = best; sd = bd; best = i; bd = d; } else if (d < sd) { second = i; sd = d; }
    }
    // chance de o ponto ser da 2ª região: 50% em cima da divisa, caindo a 0 a BLEND pontos dela (em manchas, não ponto a ponto)
    const near = Math.max(0, 1 - (sd - bd) / BLEND);
    const mix = 0.5 * near * near * free;
    const pick = mix > 0 && (hash(x >> 1, y >> 1) * 0.6 + nz2(x / 5, y / 5) * 0.4) < mix ? second : best;
    region[y * W + x] = ids.indexOf(pts[pick].id);
  }
  // 2) o chão: tons escolhidos pelo ruído (manchas) e detalhes próprios de alguns biomas
  const tones = ids.map((id) => biomeOf(id).tones.map(hex)), details = ids.map((id) => hex(biomeOf(id).detail));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = region[y * W + x], id = ids[r];
    const v = nz(x / 9, y / 9) * 0.6 + nz2(x / 3.2, y / 3.2) * 0.4;
    let c = tones[r][v < 0.36 ? 0 : v < 0.62 ? 1 : v < 0.86 ? 2 : 3];
    const ridge = Math.abs(nz(x / 14 + 9, y / 14 + 3) - 0.5);
    if (id === 'vulcao' && ridge < 0.022) c = details[r]; // veios de lava
    else if (id === 'pantano' && nz2(x / 12, y / 12) > 0.66) c = details[r]; // poças
    else if (id === 'masmorra' && (x % 9 === 0 || y % 9 === 0)) c = tones[r][0]; // lajes
    else if (id === 'cripta' && ridge < 0.014) c = details[r]; // fendas arcanas
    else if (id === 'neve' && v > 0.93) c = details[r];
    // escurece nas bordas da tela (moldura)
    const vg = Math.min(1, 1.12 - Math.max(Math.abs(x / W - 0.5) * 1.5, Math.abs(y / H - 0.5) * 1.7) ** 2.4);
    const o = (y * W + x) * 4;
    img.data[o] = c[0] * vg; img.data[o + 1] = c[1] * vg; img.data[o + 2] = c[2] * vg; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // 3) enfeites de cada região (longe dos pontos do mapa, para não ficarem por baixo deles), de cima para baixo
  const decos: { x: number; y: number; s: string }[] = [];
  const count = Math.round((W * H) / 1000 * 5);
  for (let i = 0; i < count * 3 && decos.length < count; i++) {
    const x = 6 + Math.floor(rand() * (W - 18)), y = 8 + Math.floor(rand() * (H - 18));
    const art = biomeOf(ids[region[y * W + x]]);
    if (rand() * 7 > art.density) continue;
    if (spots.some((p) => Math.abs(p.x - x) < 15 && Math.abs(p.y - y) < 14)) continue;
    if (decos.some((d) => Math.abs(d.x - x) < 9 && Math.abs(d.y - y) < 7)) continue;
    decos.push({ x, y, s: art.deco[Math.floor(rand() * art.deco.length)] });
  }
  decos.sort((a, b) => a.y - b.y);
  for (const d of decos) {
    const sp = SPRITES[d.s];
    if (!sp) continue;
    const h = sp.rows.length, w = sp.rows[0].length;
    // sombra no chão
    ctx.fillStyle = 'rgb(0 0 0 / .28)';
    ctx.fillRect(d.x - Math.floor(w / 2) + 1, d.y, w - 1, 1);
    for (let r = 0; r < h; r++) for (let q = 0; q < w; q++) {
      const ch = sp.rows[r][q];
      if (ch === '.' || !sp.pal[ch]) continue;
      ctx.fillStyle = sp.pal[ch];
      ctx.fillRect(d.x - Math.floor(w / 2) + q, d.y - h + r, 1, 1);
    }
  }
}

/** Curva de um ponto ao seguinte (levemente arqueada), no espaço 0–1000 × 0–562 do desenho por cima do mapa. */
export function trail(a: { x: number; y: number }, b: { x: number; y: number }, bend: number): string {
  const x1 = a.x * 1000, y1 = a.y * 562, x2 = b.x * 1000, y2 = b.y * 562;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}
