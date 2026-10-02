/**
 * Boneco do herói montado com as peças do LPC (Liberated Pixel Cup): corpo, rosto,
 * cabelo, roupas, armadura e arma em camadas, com troca de cor por paleta e as
 * animações parado, andar, golpear, estocar, atirar, conjurar e cair.
 *
 * As peças ficam em public/lpc/ e o catálogo em src/data/lpc.json (gerados por
 * tools/lpc/montar.py). Créditos dos artistas: src/data/lpc-credits.json.
 */
import raw from '../data/lpc.json';

export type Body = 'male' | 'female' | 'muscular';
export type Anim = 'idle' | 'walk' | 'slash' | 'thrust' | 'shoot' | 'spellcast' | 'hurt';
export type Dir = 'n' | 'w' | 's' | 'e';
export type SlotId = 'hair' | 'beard' | 'mustache' | 'eyebrows' | 'eyes' | 'nose' | 'ears' | 'torso' | 'legs' | 'feet' | 'arms' | 'shoulders' | 'head' | 'crest' | 'visor' | 'face' | 'neck' | 'belt' | 'cape' | 'back' | 'horns' | 'wings' | 'tail' | 'shield' | 'weapon';
export type Material = 'body' | 'hair' | 'cloth' | 'metal' | 'eye';

/** Efeitos de "magia imbuída" de uma arma. */
export type FxKind = 'aura' | 'flame' | 'smoke' | 'sparks';
/** Uma peça vestida: qual, a cor, e (armas e escudos) a tinta do metal e o efeito mágico. */
export interface Part { id: string; color?: string; tint?: string; fx?: FxKind; fxColor?: string }

/** A aparência escolhida pelo jogador (é o que a ficha guarda). */
export interface Avatar {
  body: Body;
  skin: string;
  eyes: string;
  parts: Partial<Record<SlotId, Part>>;
  /** Olhar (expressão do rosto humano): neutro, bravo, triste… */
  face?: string;
  /** Criaturas: cabeça de outra raça (orc, lobo, esqueleto…) no lugar da humana. */
  head?: string;
  /** Criaturas: corpo especial (esqueleto, zumbi) no lugar do corpo comum. */
  frame?: string;
}

interface Layer { z: number; paths: Partial<Record<Body, string>>; anims: Anim[]; fmt: 'recolor' | 'variant' | 'file'; custom?: Anim; size?: number }
export interface Item {
  id: string; pt: string; en: string; bodies: Body[]; layers: Layer[];
  recolors?: { material: Material; base?: string; source?: string[] }[]; skin?: boolean; variants?: Record<string, string>;
  attack?: Anim; ammo?: boolean;
  /** Peça translúcida (barba por fazer: a pele aparece por baixo). */
  alpha?: number;
}
interface Catalog {
  frame: number;
  anims: Record<Anim, { frames: number; rows: number }>;
  palettes: Record<Material, { base: string; colors: Record<string, string[]> }>;
  fixed: { body: Item; head: Record<Body, Item>; face: Item; faces: Record<string, Item>; ammo: Item; heads: Record<string, Item>; heads_f: Record<string, Item>; frames: Record<string, Item> };
  slots: { id: SlotId; pt: string; en: string; optional: boolean; items: Item[] }[];
}
export const LPC = raw as unknown as Catalog;
export const DIRS: Dir[] = ['n', 'w', 's', 'e'];
/** Tons de pele "humanos" primeiro; os de fantasia depois. */
export const SKINS = Object.keys(LPC.palettes.body.colors);

export const slotOf = (id: SlotId) => LPC.slots.find((s) => s.id === id)!;
export const itemOf = (slot: SlotId, id: string | undefined): Item | undefined => (id ? slotOf(slot).items.find((i) => i.id === id) : undefined);

/** Tintas para o metal das armas (lâmina negra, rubra…) e para a pintura dos escudos: 5 tons, do escuro ao claro. */
export const TINTS: Record<string, { pt: string; en: string; ramp: string[] }> = {
  black: { pt: 'Negro', en: 'Black', ramp: ['#000000', '#0a0a10', '#16161f', '#262633', '#3e3e52'] },
  red: { pt: 'Rubro', en: 'Crimson', ramp: ['#2a0004', '#6a0812', '#a8141e', '#e03a34', '#ff8a70'] },
  ember: { pt: 'Brasa', en: 'Ember', ramp: ['#2a0a00', '#7a2400', '#c85208', '#f58a1c', '#ffd070'] },
  gold: { pt: 'Dourado', en: 'Golden', ramp: ['#3a2404', '#8a5c0c', '#c8941c', '#f2c84a', '#fff2a8'] },
  green: { pt: 'Esmeralda', en: 'Emerald', ramp: ['#04200c', '#0f5226', '#1c8a42', '#4cc870', '#b0f5c0'] },
  cyan: { pt: 'Gelo', en: 'Ice', ramp: ['#04222a', '#0f5a70', '#1f9ab8', '#5ad4f0', '#c8f6ff'] },
  blue: { pt: 'Azul', en: 'Blue', ramp: ['#04102a', '#0f3070', '#1f5ab8', '#4a94f0', '#a8d4ff'] },
  purple: { pt: 'Ametista', en: 'Amethyst', ramp: ['#16042a', '#3c1070', '#6a26b8', '#a060f0', '#dcb8ff'] },
  pink: { pt: 'Rosa', en: 'Rose', ramp: ['#2a0418', '#701048', '#b82678', '#f060a8', '#ffb8dc'] },
  white: { pt: 'Prata clara', en: 'Bright silver', ramp: ['#5a5a66', '#9a9aa8', '#c8c8d4', '#e8e8f0', '#ffffff'] },
  bone: { pt: 'Osso', en: 'Bone', ramp: ['#2a2318', '#6e604a', '#a39478', '#d6c8ac', '#fffbee'] },
};
/** Cores dos efeitos mágicos: [escuro, médio, brilhante]. */
export const FX_COLORS: Record<string, { pt: string; en: string; ramp: [string, string, string] }> = {
  black: { pt: 'Negro', en: 'Black', ramp: ['#000000', '#140a20', '#3a2a55'] },
  red: { pt: 'Rubro', en: 'Crimson', ramp: ['#5a0008', '#d8141e', '#ff7a5a'] },
  fire: { pt: 'Fogo', en: 'Fire', ramp: ['#a82a06', '#ff8a1c', '#fff0a8'] },
  gold: { pt: 'Dourado', en: 'Golden', ramp: ['#8a5c0c', '#f2c84a', '#fffbd0'] },
  green: { pt: 'Verde', en: 'Green', ramp: ['#0f5226', '#3ee06a', '#d0ffd8'] },
  cyan: { pt: 'Gelo', en: 'Ice', ramp: ['#0f5a70', '#5ad4f0', '#e8fcff'] },
  blue: { pt: 'Azul', en: 'Blue', ramp: ['#0f3070', '#4a94f0', '#d0e8ff'] },
  purple: { pt: 'Roxo', en: 'Purple', ramp: ['#3c1070', '#a060f0', '#f0dcff'] },
  white: { pt: 'Branco', en: 'White', ramp: ['#9a9aa8', '#e8e8f0', '#ffffff'] },
};
export const FX_KINDS: { id: FxKind; pt: string; en: string }[] = [
  { id: 'aura', pt: 'Aura', en: 'Aura' }, { id: 'flame', pt: 'Chamas', en: 'Flames' }, { id: 'smoke', pt: 'Fumaça', en: 'Smoke' }, { id: 'sparks', pt: 'Faíscas', en: 'Sparks' },
];
/** Peças que aceitam tinta: nas armas ela pinta o metal (os tons de cinza); nos escudos, a parte colorida. */
export const TINTABLE: SlotId[] = ['weapon', 'shield'];

/** Partes do corpo com cor própria (chifres, asas, cauda): podem seguir a pele ou ter outra cor da mesma paleta. */
export const OWN_SKIN: SlotId[] = ['horns', 'wings', 'tail'];
/** Peças do rosto humano (somem quando a cabeça é de outra raça). */
export const HUMAN_FACE: SlotId[] = ['beard', 'mustache', 'eyebrows', 'eyes', 'nose', 'ears'];
/** Cabeças de outras raças que o criador oferece, com a pele que combina (o jogador pode trocar). */
export const RACE_HEADS: { id: string; pt: string; en: string; skin?: string; frame?: string }[] = [
  { id: 'orc', pt: 'Orc', en: 'Orc', skin: 'green' }, { id: 'goblin', pt: 'Goblin', en: 'Goblin', skin: 'bright_green' }, { id: 'troll', pt: 'Troll', en: 'Troll', skin: 'dark_green' },
  { id: 'lizard', pt: 'Draconato', en: 'Dragonborn', skin: 'green' }, { id: 'vampire', pt: 'Vampiro', en: 'Vampire', skin: 'pale_green' },
  { id: 'minotaur', pt: 'Minotauro', en: 'Minotaur', skin: 'fur_brown' }, { id: 'wolf', pt: 'Lobisomem', en: 'Werewolf', skin: 'fur_grey' }, { id: 'boarman', pt: 'Homem-javali', en: 'Boarman', skin: 'fur_brown' },
  { id: 'wartotaur', pt: 'Javali de guerra', en: 'Wartotaur', skin: 'fur_brown' }, { id: 'skeleton', pt: 'Esqueleto', en: 'Skeleton', frame: 'skeleton' }, { id: 'zombie', pt: 'Zumbi', en: 'Zombie', skin: 'zombie', frame: 'zombie' },
  { id: 'frankenstein', pt: 'Constructo', en: 'Flesh golem', skin: 'zombie_green' }, { id: 'jack', pt: 'Cabeça de abóbora', en: 'Pumpkin head' }, { id: 'alien', pt: 'Ser do vazio', en: 'Void being', skin: 'lavender' },
  { id: 'rabbit', pt: 'Coelho', en: 'Rabbitfolk', skin: 'fur_white' }, { id: 'rat', pt: 'Rato', en: 'Ratfolk', skin: 'fur_grey' }, { id: 'mouse', pt: 'Camundongo', en: 'Mousefolk', skin: 'fur_tan' },
  { id: 'pig', pt: 'Porco', en: 'Pigfolk', skin: 'light' }, { id: 'sheep', pt: 'Ovelha', en: 'Sheepfolk', skin: 'fur_white' },
];

/** Cores que uma peça aceita: variantes prontas ou a paleta do material. `slot` diz se a peça de pele pode ter cor própria. */
export function colorsOf(item: Item, slot?: SlotId): { name: string; hex: string }[] {
  if (item.variants) return Object.entries(item.variants).map(([name, hex]) => ({ name, hex }));
  const own = !!slot && OWN_SKIN.includes(slot);
  const mat = item.recolors?.find((r) => r.material !== 'eye' && (r.material !== 'body' || own))?.material;
  if (!mat || !LPC.palettes[mat]) return [];
  return Object.entries(LPC.palettes[mat].colors).map(([name, ramp]) => ({ name, hex: ramp[Math.min(3, ramp.length - 1)] }));
}
export const swatch = (mat: Material, name: string) => { const r = LPC.palettes[mat].colors[name]; return r ? r[Math.min(3, r.length - 1)] : '#888'; };

export const defaultAvatar = (body: Body = 'male'): Avatar => ({
  body, skin: 'light', eyes: 'brown',
  parts: { hair: { id: body === 'male' ? 'hair_plain' : 'hair_long', color: 'dark_brown' }, torso: { id: 'torso_clothes_longsleeve', color: 'white' }, legs: { id: 'legs_pants', color: 'brown' }, feet: { id: 'feet_boots_basic', color: 'leather' } },
});

// ───────────── imagens (com cache) ─────────────

const base = () => new URL('lpc/', document.baseURI).toString();
const images = new Map<string, Promise<HTMLImageElement | null>>();
function load(rel: string): Promise<HTMLImageElement | null> {
  let p = images.get(rel);
  if (!p) {
    p = new Promise((ok) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => ok(null);
      im.src = base() + rel;
    });
    images.set(rel, p);
  }
  return p;
}

const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };

/** Pinta com uma rampa de tons: o metal (pixels acinzentados) de uma arma, ou a pintura (pixels coloridos) de um escudo. */
function tinted(src: CanvasImageSource, w: number, h: number, ramp: string[], paint: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, w, h), d = data.data;
  const tones = ramp.map(rgb);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    const sat = mx ? (mx - mn) / mx : 0;
    // arma: só o que é cinza (lâmina, guarda); escudo: só o que tem cor (a pintura), o aro de metal fica
    if (paint ? sat < 0.22 : sat > 0.24) continue;
    const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    if (!paint && lum < 0.12) continue; // o contorno escuro da arma fica como está
    const t = tones[Math.min(tones.length - 1, Math.floor(Math.pow(lum, 0.85) * tones.length))];
    d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2];
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/** Troca as cores da paleta-base pelas da paleta escolhida (comparação com pequena tolerância). */
function recolor(im: HTMLImageElement, maps: { from: string[]; to: string[] }[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(im, 0, 0);
  const pairs = maps.flatMap((m) => m.from.map((f, i) => [rgb(f), rgb(m.to[Math.min(i, m.to.length - 1)])] as const));
  if (!pairs.length) return c;
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const memo = new Map<number, readonly [number, number, number] | null>();
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let to = memo.get(key);
    if (to === undefined) {
      to = null;
      for (const [f, t] of pairs) if (Math.abs(f[0] - d[i]) + Math.abs(f[1] - d[i + 1]) + Math.abs(f[2] - d[i + 2]) <= 6) { to = t; break; }
      memo.set(key, to);
    }
    if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

// ───────────── montagem ─────────────

interface Draw { rel: string; z: number; size: number; hold0: boolean; maps: { from: string[]; to: string[] }[]; slot?: SlotId; alpha?: number; tint?: { ramp: string[]; paint: boolean } }

function drawsOf(item: Item, av: Avatar, anim: Anim, color: string | undefined, ownSkin = false): Draw[] {
  const pick = (a: Anim) => {
    const custom = item.layers.filter((l) => l.custom === a && l.paths[av.body]);
    return custom.length ? custom : item.layers.filter((l) => !l.custom && l.anims.includes(a) && l.paths[av.body]);
  };
  let layers = pick(anim), hold0 = false, src = anim;
  // sem quadros de "parado": usa o 1º quadro de "andar" (armas e algumas roupas)
  if (!layers.length && anim === 'idle') { layers = pick('walk'); hold0 = true; src = 'walk'; }
  const variant = item.variants ? (color && item.variants[color] ? color : Object.keys(item.variants)[0]) : undefined;
  const maps = (item.recolors ?? []).filter((r) => LPC.palettes[r.material]).map((r) => {
    const pal = LPC.palettes[r.material];
    // partes do corpo (chifres, asas, cauda) usam a cor escolhida para elas; sem escolha, a da pele
    const to = r.material === 'body' ? (ownSkin && color && pal.colors[color] ? color : av.skin) : r.material === 'eye' ? av.eyes : color ?? pal.base;
    return { from: r.source ?? pal.colors[r.base ?? pal.base] ?? [], to: pal.colors[to] ?? pal.colors[pal.base] };
  }).filter((m) => m.from !== m.to);
  // olhos de monstro: o 4º tom da cor pinta o branco do olho (todo negro, todo branco, fundo escuro…)
  const eye = LPC.palettes.eye.colors[av.eyes];
  if (eye?.[3] && item.recolors?.some((r) => r.material === 'eye')) maps.push({ from: ['#f2f7f8', '#ffffff'], to: [eye[3], eye[3]] });
  return layers.map((l) => {
    const p = l.paths[av.body]!;
    const rel = l.custom
      ? (l.fmt === 'variant' ? `${p}${variant}.png` : `${p.replace(/\/$/, '')}.png`)
      : (l.fmt === 'variant' ? `${p}${src}/${variant}.png` : `${p}${src}.png`);
    return { rel, z: l.z, size: l.size ?? LPC.frame, hold0, maps: l.fmt === 'recolor' ? maps : [], alpha: item.alpha };
  });
}

export interface Sheet { canvas: HTMLCanvasElement; size: number; frames: number; rows: number; /** Efeito mágico da arma: só os pixels dela (de onde o efeito nasce), o tipo e a cor. */ fx?: { mask: HTMLCanvasElement; kind: FxKind; color: string } }
const sheets = new Map<string, Promise<Sheet>>();

/** Folha de quadros do boneco para uma animação: `frames` colunas × 4 direções (n, o, s, l). */
export function compose(av: Avatar, anim: Anim): Promise<Sheet> {
  const key = JSON.stringify([av, anim]);
  let p = sheets.get(key);
  if (!p) { p = build(av, anim); sheets.set(key, p); if (sheets.size > 500) sheets.delete(sheets.keys().next().value!); }
  return p;
}

async function build(av: Avatar, anim: Anim): Promise<Sheet> {
  const { frames, rows } = LPC.anims[anim];
  const frame = av.frame ? LPC.fixed.frames[av.frame] : undefined;
  const head = av.head ? ((av.body === 'female' ? LPC.fixed.heads_f?.[av.head] : undefined) ?? LPC.fixed.heads[av.head]) : undefined;
  const face = (av.face ? LPC.fixed.faces?.[av.face] : undefined) ?? LPC.fixed.face;
  const draws: Draw[] = [
    ...drawsOf(frame ?? LPC.fixed.body, av, anim, undefined),
    ...drawsOf(head ?? LPC.fixed.head[av.body], av, anim, undefined),
    // o rosto humano só vai em cabeça humana
    ...(head ? [] : drawsOf(face, av, anim, undefined)),
  ];
  for (const s of LPC.slots) {
    const part = av.parts[s.id];
    const item = itemOf(s.id, part?.id);
    if (!item || !item.bodies.includes(av.body)) continue;
    // peças do rosto humano não vão em cabeça de outra raça
    if (head && HUMAN_FACE.includes(s.id)) continue;
    const tint = part?.tint && TINTS[part.tint] && TINTABLE.includes(s.id) ? { ramp: TINTS[part.tint].ramp, paint: s.id === 'shield' } : undefined;
    draws.push(...drawsOf(item, av, anim, part?.color, OWN_SKIN.includes(s.id)).map((d) => ({ ...d, slot: s.id, tint })));
    if (item.ammo && anim === 'shoot') draws.push(...drawsOf(LPC.fixed.ammo, av, anim, undefined));
  }
  draws.sort((a, b) => a.z - b.z);
  const size = Math.max(LPC.frame, ...draws.map((d) => d.size));
  const canvas = document.createElement('canvas');
  canvas.width = frames * size; canvas.height = rows * size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const imgs = await Promise.all(draws.map((d) => load(d.rel)));
  /** Desenha uma camada (todos os quadros) num contexto. */
  const paint = (to: CanvasRenderingContext2D, d: Draw, im: HTMLImageElement) => {
    let src: CanvasImageSource = d.maps.length ? recolor(im, d.maps) : im;
    if (d.tint) src = tinted(src, im.width, im.height, d.tint.ramp, d.tint.paint);
    const off = (size - d.size) / 2;
    const cols = Math.floor(im.width / d.size), rws = Math.max(1, Math.floor(im.height / d.size));
    to.globalAlpha = d.alpha ?? 1;
    for (let r = 0; r < rows; r++) for (let f = 0; f < frames; f++) {
      const sf = d.hold0 ? 0 : f;
      if (sf >= cols || r >= rws) continue;
      to.drawImage(src, sf * d.size, r * d.size, d.size, d.size, f * size + off, r * size + off, d.size, d.size);
    }
    to.globalAlpha = 1;
  };
  const layer = () => { const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; const x = c.getContext('2d', { willReadFrequently: true })!; x.imageSmoothingEnabled = false; return x; };

  // Elmo de metal: o cabelo fica por baixo dele. Sem isto, a franja apareceria pelas
  // aberturas do elmo (um "olho" na cor do cabelo). O que sai é o cabelo dentro do
  // contorno do elmo; o que passa para fora (trança, cabelo comprido) continua.
  const helmet = itemOf('head', av.parts.head?.id)?.id.startsWith('hat_helmet');
  let under: Uint8ClampedArray | null = null;
  if (helmet && draws.some((d) => d.slot === 'hair')) {
    const h = layer();
    draws.forEach((d, i) => { if (d.slot === 'head' && imgs[i]) paint(h, d, imgs[i]!); });
    const a = h.getImageData(0, 0, canvas.width, canvas.height).data;
    under = new Uint8ClampedArray(canvas.width * canvas.height);
    // em cada linha de cada quadro: tudo entre o primeiro e o último ponto do elmo está "debaixo" dele
    for (let y = 0; y < canvas.height; y++) for (let f = 0; f < frames; f++) {
      let x0 = -1, x1 = -1;
      for (let x = f * size; x < (f + 1) * size; x++) if (a[(y * canvas.width + x) * 4 + 3] > 40) { if (x0 < 0) x0 = x; x1 = x; }
      for (let x = x0; x0 >= 0 && x <= x1; x++) under[y * canvas.width + x] = 1;
    }
  }

  draws.forEach((d, i) => {
    const im = imgs[i];
    if (!im) return;
    if (under && d.slot === 'hair') {
      const t = layer();
      paint(t, d, im);
      const data = t.getImageData(0, 0, canvas.width, canvas.height);
      for (let p = 0; p < under.length; p++) if (under[p]) data.data[p * 4 + 3] = 0;
      t.putImageData(data, 0, 0);
      ctx.drawImage(t.canvas, 0, 0);
    } else paint(ctx, d, im);
  });
  // arma com magia imbuída: guarda só os pixels da arma, para o efeito nascer deles
  const wp = av.parts.weapon;
  let fx: Sheet['fx'];
  if (wp?.fx && draws.some((d, i) => d.slot === 'weapon' && imgs[i])) {
    const m = layer();
    draws.forEach((d, i) => { if (d.slot === 'weapon' && imgs[i]) paint(m, d, imgs[i]!); });
    fx = { mask: m.canvas, kind: wp.fx, color: wp.fxColor && FX_COLORS[wp.fxColor] ? wp.fxColor : 'purple' };
  }
  return { canvas, size, frames, rows, fx };
}

/** Animação de ataque do boneco conforme a arma que ele segura. */
export function attackAnim(av: Avatar, fallback: Anim = 'slash'): Anim {
  return itemOf('weapon', av.parts.weapon?.id)?.attack ?? fallback;
}

/** "Foto" do boneco para o retrato: o busto de frente, igual ao boneco, ampliado sem suavizar, sobre um fundo. */
export async function portrait(av: Avatar, bg = '#2a2420', px = 8): Promise<Blob> {
  const sheet = await compose(av, 'idle');
  const off = (sheet.size - LPC.frame) / 2;
  const sx = off + 14, sy = 2 * sheet.size + off + 8, sw = 36, sh = 45; // direção "s" (de frente), do alto da cabeça ao peito
  const c = document.createElement('canvas');
  c.width = sw * px; c.height = sh * px;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(c.width / 2, c.height * 0.38, 10, c.width / 2, c.height * 0.45, c.width * 0.85);
  g.addColorStop(0, bg); g.addColorStop(1, '#0c0a09');
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.canvas, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b!), 'image/png'));
}

/**
 * Miniatura parada do boneco (de frente), para as caixinhas de escolha do criador.
 * `crop` = recorte dentro do quadro de 64 px: [x, y, largura, altura].
 */
export async function thumb(av: Avatar, crop: readonly [number, number, number, number] = [0, 0, 64, 64], dir: Dir = 's'): Promise<HTMLCanvasElement> {
  const sheet = await compose(av, 'idle');
  const off = (sheet.size - LPC.frame) / 2;
  const c = document.createElement('canvas');
  c.width = crop[2]; c.height = crop[3];
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.canvas, off + crop[0], DIRS.indexOf(dir) * sheet.size + off + crop[1], crop[2], crop[3], 0, 0, crop[2], crop[3]);
  return c;
}
