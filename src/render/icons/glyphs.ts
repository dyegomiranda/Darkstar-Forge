/**
 * Símbolos da carta desenhados como formas geométricas num quadro 100×100.
 * Cada símbolo tem:
 *  - body:  a silhueta (vários polígonos; juntos formam a figura)
 *  - inner: uma área de "segundo tom" (reflexo, miolo)
 *  - holes: furos (olhos da caveira, visor do elmo…)
 *  - lines: gravações (traços internos)
 * Os estilos (Emblema, Traço, Chapado, Pixel) são aplicados depois, em render.ts.
 */
import { bezier, type Pt } from '../shapes';

export interface Glyph {
  id: string;
  name: string;
  body: Pt[][];
  inner?: Pt[][];
  holes?: Pt[][];
  lines?: Pt[][];
  /** Cor padrão (recursos têm cor própria; classes usam a cor do deck). */
  color?: string;
  /** Tem miolo cheio: dá para escrever um número por cima (modo "número dentro"). */
  solid?: boolean;
}

// ───────────── utilitários de geometria (espaço 100×100) ─────────────

const rot = (pts: Pt[], deg: number, cx = 50, cy = 50): Pt[] => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
const rotAll = (list: Pt[][], deg: number, cx = 50, cy = 50) => list.map((p) => rot(p, deg, cx, cy));
const move = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy]);
const scale = (pts: Pt[], k: number, cx = 50, cy = 50): Pt[] => pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);

const ellipse = (cx: number, cy: number, rx: number, ry = rx, n = 36): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const starPts = (cx: number, cy: number, ro: number, ri: number, n: number, deg = 0): Pt[] =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = ((deg - 90) * Math.PI) / 180 + (i * Math.PI) / n;
    const r = i % 2 ? ri : ro;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
/** Caminho de Béziers encadeadas: [início, c1, c2, fim, c1, c2, fim, …]. */
const curve = (...p: Pt[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i + 3 < p.length; i += 3) out.push(...bezier(p[i], p[i + 1], p[i + 2], p[i + 3], 16).slice(i ? 1 : 0));
  return out;
};
/** Pétala/lente entre dois pontos, com largura `w`. */
const lens = (a: Pt, b: Pt, w: number): Pt[] => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const px = (-dy / len) * w, py = (dx / len) * w;
  return [
    ...bezier(a, [a[0] + dx * 0.25 + px, a[1] + dy * 0.25 + py], [a[0] + dx * 0.75 + px, a[1] + dy * 0.75 + py], b, 14),
    ...bezier(b, [a[0] + dx * 0.75 - px, a[1] + dy * 0.75 - py], [a[0] + dx * 0.25 - px, a[1] + dy * 0.25 - py], a, 14).slice(1),
  ];
};

// ───────────── peças reaproveitadas ─────────────

function sword(): { body: Pt[][]; lines: Pt[][] } {
  return {
    body: [
      [[50, 3], [55.5, 12], [55, 64], [45, 64], [44.5, 12]],
      [[31, 63], [69, 63], [66, 70], [34, 70]],
      rect(46.5, 70, 7, 16),
      ellipse(50, 90, 5.5),
    ],
    lines: [[[50, 12], [50, 60]]],
  };
}

function heaterPts(x = 14, y = 8, w = 72, h = 86): Pt[] {
  return curve(
    [x, y], [x + w * 0.3, y + 5], [x + w * 0.7, y + 5], [x + w, y],
    [x + w, y + h * 0.35], [x + w, y + h * 0.55], [x + w, y + h * 0.45],
    [x + w, y + h * 0.78], [x + w * 0.6, y + h * 0.92], [x + w / 2, y + h],
    [x + w * 0.4, y + h * 0.92], [x, y + h * 0.78], [x, y + h * 0.45],
    [x, y + h * 0.3], [x, y + h * 0.15], [x, y],
  );
}

// ───────────── recursos ─────────────

const RESOURCES: Glyph[] = [
  {
    id: 'vigor', name: 'Vigor', color: '#e0453a',
    body: [curve([50, 90], [22, 72], [6, 54], [6, 34], [6, 18], [18, 8], [31, 8], [40, 8], [46, 13], [50, 21], [54, 13], [60, 8], [69, 8], [82, 8], [94, 18], [94, 34], [94, 54], [78, 72], [50, 90])],
    inner: [curve([30, 16], [20, 18], [14, 26], [15, 36], [20, 30], [26, 24], [34, 22], [34, 20], [33, 17], [30, 16])],
    lines: [[[16, 46], [34, 46], [41, 32], [51, 62], [58, 44], [84, 44]]],
  },
  {
    id: 'fury', name: 'Fúria', color: '#ff7a1a',
    body: [curve([50, 3], [58, 22], [80, 32], [80, 60], [80, 82], [66, 97], [50, 97], [33, 97], [20, 83], [20, 63], [20, 49], [28, 41], [35, 30], [37, 42], [42, 49], [47, 51], [43, 36], [44, 20], [50, 3])],
    inner: [curve([51, 54], [57, 63], [64, 70], [62, 80], [60, 89], [55, 91], [50, 91], [43, 91], [39, 85], [40, 78], [41, 70], [48, 66], [51, 54])],
  },
  {
    id: 'mana', name: 'Mana', color: '#3d8bff',
    body: [curve([50, 4], [62, 25], [81, 43], [81, 64], [81, 82], [67, 95], [50, 95], [33, 95], [19, 82], [19, 64], [19, 43], [38, 25], [50, 4])],
    inner: [[[50, 30], [66, 62], [50, 84], [34, 62]]],
    lines: [[[50, 30], [50, 84]], [[34, 62], [66, 62]]],
  },
  {
    id: 'nature', name: 'Essência Natural', color: '#58b048',
    body: [curve([14, 86], [14, 42], [44, 12], [90, 10], [90, 56], [60, 86], [14, 86]), [[14, 84], [6, 94], [10, 96], [18, 88]]],
    inner: [curve([20, 80], [30, 62], [48, 42], [84, 16], [84, 50], [58, 80], [20, 80])],
    lines: [curve([16, 84], [40, 60], [60, 40], [86, 14]), [[37, 63], [33, 44]], [[37, 63], [56, 67]], [[52, 47], [49, 29]], [[52, 47], [71, 50]]],
  },
  {
    id: 'souls', name: 'Almas', color: '#9b7bff',
    body: [curve([50, 5], [72, 5], [86, 23], [86, 45], [86, 62], [81, 72], [82, 92]).concat([[71, 83], [62, 93], [54, 83], [46, 93], [38, 83], [29, 93], [18, 90]], curve([18, 90], [19, 72], [14, 62], [14, 45], [14, 23], [28, 5], [50, 5]))],
    holes: [ellipse(37, 42, 8, 10), ellipse(63, 42, 8, 10), curve([42, 66], [46, 60], [54, 60], [58, 66], [54, 70], [46, 70], [42, 66])],
  },
  {
    id: 'shadow', name: 'Sombra', color: '#9a6bff',
    body: [curve([60, 8], [34, 8], [12, 28], [12, 54], [12, 78], [32, 96], [56, 96], [74, 96], [88, 86], [94, 72], [82, 78], [62, 80], [48, 68], [34, 56], [34, 30], [60, 8]), starPts(70, 38, 13, 4.5, 4)],
    inner: [curve([50, 16], [32, 22], [20, 38], [20, 56], [20, 74], [34, 88], [54, 90], [38, 80], [28, 66], [28, 50], [28, 36], [36, 24], [50, 16])],
  },
  {
    id: 'faith', name: 'Fé', color: '#f0c850',
    body: [starPts(50, 50, 48, 30, 12), ellipse(50, 50, 30)],
    inner: [ellipse(50, 50, 21)],
    lines: [ellipse(50, 50, 26)],
  },
  {
    id: 'focus', name: 'Foco', color: '#dfe8f5',
    body: [curve([3, 50], [22, 18], [78, 18], [97, 50], [78, 82], [22, 82], [3, 50])],
    inner: [ellipse(50, 50, 20)],
    holes: [ellipse(50, 50, 8.5)],
    lines: [[[50, 8], [50, 16]], [[24, 14], [29, 22]], [[76, 14], [71, 22]]],
  },
  {
    id: 'gold', name: 'Ouro', color: '#eab83c',
    body: [ellipse(50, 50, 45)],
    inner: [ellipse(50, 50, 35)],
    lines: [ellipse(50, 50, 39), starPts(50, 50, 20, 7, 4)],
  },
];

// ───────────── classes / decks ─────────────

const CLASSES: Glyph[] = [
  (() => {
    const s = sword();
    const axe: Pt[][] = [
      rect(47.5, 6, 5, 90),
      curve([47, 12], [30, 6], [15, 18], [13, 36], [24, 31], [36, 32], [47, 38]),
      [[53, 16], [66, 22], [66, 28], [53, 32]],
    ];
    return {
      id: 'weapons', name: 'Armas cruzadas (Guerreiro/Bárbaro)',
      body: [...rotAll(s.body, 40), ...rotAll(axe, -40)],
      lines: rotAll(s.lines, 40),
    };
  })(),
  {
    id: 'wizard', name: 'Chapéu de mago (Mago/Feiticeiro)',
    body: [
      ellipse(50, 82, 45, 10),
      curve([22, 82], [30, 56], [42, 30], [62, 14], [70, 8], [82, 10], [88, 16], [80, 18], [72, 22], [68, 34], [68, 52], [72, 70], [78, 82]),
    ],
    inner: [curve([25, 76], [40, 72], [60, 72], [76, 76]).concat([[77, 82], [23, 82]])],
    holes: [starPts(48, 50, 10, 4, 5)],
  },
  {
    id: 'tree', name: 'Árvore (Druida/Patrulheiro)',
    body: [
      ellipse(50, 30, 24, 22), ellipse(28, 44, 17, 15), ellipse(72, 44, 17, 15), ellipse(38, 20, 15), ellipse(63, 21, 15),
      [[44, 52], [56, 52], [59, 84], [41, 84]],
      [[42, 82], [24, 95], [34, 95], [48, 86]], [[58, 82], [76, 95], [66, 95], [52, 86]], [[47, 84], [53, 84], [52, 96], [48, 96]],
    ],
    inner: [ellipse(44, 26, 10, 8), ellipse(30, 42, 7, 6)],
    lines: [[[50, 58], [50, 80]], [[45, 64], [47, 76]], [[55, 64], [53, 76]]],
  },
  {
    id: 'skull', name: 'Caveira (Necromante/Bruxo)',
    body: [ellipse(50, 40, 34, 32), [[30, 56], [70, 56], [68, 82], [60, 88], [40, 88], [32, 82]]],
    holes: [ellipse(37, 44, 9.5, 10.5), ellipse(63, 44, 9.5, 10.5), [[50, 55], [44, 67], [56, 67]]],
    lines: [[[36, 74], [64, 74]], [[42, 74], [42, 86]], [[50, 74], [50, 88]], [[58, 74], [58, 86]]],
  },
  (() => {
    const d: Pt[][] = [
      curve([50, 2], [56, 14], [58, 30], [55, 62]).concat([[45, 62]], curve([45, 62], [42, 36], [44, 16], [50, 2])),
      curve([28, 58], [40, 62], [60, 62], [72, 58]).concat([[70, 67], [30, 67]]),
      rect(46, 67, 8, 18),
      [[50, 84], [56, 91], [50, 98], [44, 91]],
    ];
    return {
      id: 'dagger', name: 'Adaga e lua (Ladino/Assassino)',
      body: [
        curve([30, 14], [10, 24], [4, 52], [18, 74], [14, 54], [22, 32], [38, 20], [36, 17], [33, 15], [30, 14]),
        ...rotAll(d, 28),
      ],
      lines: [rot([[50, 14], [50, 58]], 28)],
    };
  })(),
  {
    id: 'shieldcross', name: 'Escudo sagrado (Clérigo/Paladino)',
    body: [heaterPts()],
    inner: [heaterPts(22, 16, 56, 70)],
    holes: [rect(45, 24, 10, 54), rect(29, 38, 42, 10)],
  },
  (() => {
    const petal = (deg: number, len: number, w: number) => rot(lens([50, 80], [50, 80 - len], w), deg, 50, 80);
    return {
      id: 'lotus', name: 'Lótus (Monge/Bardo)',
      body: [petal(-72, 44, 11), petal(72, 44, 11), petal(-36, 58, 13), petal(36, 58, 13), petal(0, 70, 14),
        curve([14, 80], [30, 92], [70, 92], [86, 80]).concat([[86, 84], [14, 84]])],
      inner: [petal(0, 58, 8)],
      lines: [[[50, 78], [50, 24]]],
    };
  })(),
  {
    id: 'potion', name: 'Poção (Recursos)',
    body: [ellipse(50, 64, 31), rect(41, 18, 18, 22), rect(36, 13, 28, 7), rect(43, 4, 14, 10)],
    inner: [curve([21, 62], [32, 56], [44, 68], [56, 60], [66, 54], [74, 60], [79, 62]).concat(curve([79, 62], [78, 82], [64, 94], [50, 94], [36, 94], [22, 82], [21, 62]))],
    holes: [ellipse(38, 52, 4, 6)],
  },
  {
    id: 'helmet', name: 'Elmo (Equipamentos)',
    body: [curve([18, 72], [16, 34], [30, 8], [50, 6], [70, 8], [84, 34], [82, 72]).concat([[80, 94], [62, 94], [58, 70], [42, 70], [38, 94], [20, 94]])],
    inner: [curve([30, 26], [36, 14], [46, 12], [50, 12], [42, 16], [36, 24], [34, 36])],
    holes: [[[24, 42], [76, 42], [76, 49], [54, 49], [54, 72], [46, 72], [46, 49], [24, 49]]],
    lines: [[[50, 8], [50, 38]]],
  },
];

// ───────────── ataque e defesa ─────────────

const COMBAT: Glyph[] = [
  { id: 'sword', name: 'Espada', color: '#d6dde6', ...(() => { const s = sword(); return { body: s.body, lines: s.lines, inner: [[[50, 12], [53.5, 16], [53, 58], [50, 58]]] as Pt[][] }; })() },
  {
    id: 'swords', name: 'Espadas cruzadas', color: '#d6dde6',
    ...(() => { const s = sword(); return { body: [...rotAll(s.body, 40), ...rotAll(s.body, -40)], lines: [...rotAll(s.lines, 40), ...rotAll(s.lines, -40)] }; })(),
  },
  {
    id: 'claw', name: 'Garras', color: '#e8e2d6',
    // três rasgos em crescente: largos no meio, pontudos nas pontas
    body: [0, 1, 2].map((i) => {
      const x = 24 + i * 22;
      const c = bezier([x + 16, 5], [x + 10, 34], [x + 2, 62], [x - 12, 95], 24);
      const L: Pt[] = [], R: Pt[] = [];
      c.forEach((p, k) => {
        const a = c[Math.max(0, k - 1)], b = c[Math.min(c.length - 1, k + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        const w = 0.4 + 7 * Math.sin((k / (c.length - 1)) * Math.PI) ** 0.9;
        L.push([p[0] - (dy / len) * w, p[1] + (dx / len) * w]);
        R.push([p[0] + (dy / len) * w * 0.35, p[1] - (dx / len) * w * 0.35]);
      });
      return [...L, ...R.reverse()];
    }),
  },
  {
    id: 'burst', name: 'Impacto', color: '#f2b441', solid: true,
    body: [starPts(50, 50, 48, 36, 14)],
    inner: [ellipse(50, 50, 32)],
  },
  { id: 'shield', name: 'Escudo', color: '#c7d0dc', solid: true, body: [heaterPts()], inner: [heaterPts(22, 16, 56, 70)], lines: [[[50, 20], [50, 84]], [[24, 40], [76, 40]]] },
  {
    id: 'round', name: 'Escudo redondo', color: '#c7d0dc', solid: true,
    body: [ellipse(50, 50, 46)], inner: [ellipse(50, 50, 36)], holes: [],
    lines: [ellipse(50, 50, 12), ...Array.from({ length: 8 }, (_, i) => rot([[50, 16], [50, 20]], i * 45))],
  },
  {
    id: 'heart', name: 'Coração', color: '#e0453a', solid: true,
    body: RESOURCES[0].body, inner: RESOURCES[0].inner,
  },
];

export const GLYPHS: Record<string, Glyph> = Object.fromEntries([...RESOURCES, ...CLASSES, ...COMBAT].map((g) => [g.id, g]));

export const RESOURCE_GLYPHS = RESOURCES.map((g) => g.id);
export const CLASS_GLYPHS = CLASSES.map((g) => g.id);
export const ATK_GLYPHS = ['sword', 'swords', 'claw', 'burst'];
export const DEF_GLYPHS = ['shield', 'round', 'heart'];

/** Símbolo padrão de cada deck. */
export const DECK_GLYPH: Record<string, string> = {
  red: 'weapons', blue: 'wizard', green: 'tree', black: 'skull', purple: 'dagger',
  white: 'shieldcross', silver: 'lotus', orange: 'potion', resources: 'potion', gear: 'helmet', equipment: 'helmet',
};

export { move, scale };
