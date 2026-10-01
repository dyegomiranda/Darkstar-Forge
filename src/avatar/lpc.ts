/**
 * Boneco do herói montado com as peças do LPC (Liberated Pixel Cup): corpo, rosto,
 * cabelo, roupas, armadura e arma em camadas, com troca de cor por paleta e as
 * animações parado, andar, golpear, estocar, atirar, conjurar e cair.
 *
 * As peças ficam em public/lpc/ e o catálogo em src/data/lpc.json (gerados por
 * tools/lpc/montar.py). Créditos dos artistas: src/data/lpc-credits.json.
 */
import raw from '../data/lpc.json';

export type Body = 'male' | 'female';
export type Anim = 'idle' | 'walk' | 'slash' | 'thrust' | 'shoot' | 'spellcast' | 'hurt';
export type Dir = 'n' | 'w' | 's' | 'e';
export type SlotId = 'hair' | 'beard' | 'torso' | 'legs' | 'feet' | 'arms' | 'shoulders' | 'head' | 'cape' | 'weapon';
export type Material = 'body' | 'hair' | 'cloth' | 'metal' | 'eye';

/** A aparência escolhida pelo jogador (é o que a ficha guarda). */
export interface Avatar {
  body: Body;
  skin: string;
  eyes: string;
  parts: Partial<Record<SlotId, { id: string; color?: string }>>;
}

interface Layer { z: number; paths: Partial<Record<Body, string>>; anims: Anim[]; fmt: 'recolor' | 'variant' | 'file'; custom?: Anim; size?: number }
export interface Item {
  id: string; pt: string; en: string; bodies: Body[]; layers: Layer[];
  recolors?: { material: Material; base?: string }[]; skin?: boolean; variants?: Record<string, string>;
  attack?: Anim; ammo?: boolean;
}
interface Catalog {
  frame: number;
  anims: Record<Anim, { frames: number; rows: number }>;
  palettes: Record<Material, { base: string; colors: Record<string, string[]> }>;
  fixed: { body: Item; head: Record<Body, Item>; face: Item; ammo: Item };
  slots: { id: SlotId; pt: string; en: string; optional: boolean; items: Item[] }[];
}
export const LPC = raw as unknown as Catalog;
export const DIRS: Dir[] = ['n', 'w', 's', 'e'];
/** Tons de pele "humanos" primeiro; os de fantasia depois. */
export const SKINS = Object.keys(LPC.palettes.body.colors);

export const slotOf = (id: SlotId) => LPC.slots.find((s) => s.id === id)!;
export const itemOf = (slot: SlotId, id: string | undefined): Item | undefined => (id ? slotOf(slot).items.find((i) => i.id === id) : undefined);

/** Cores que uma peça aceita: variantes prontas ou a paleta do material. */
export function colorsOf(item: Item): { name: string; hex: string }[] {
  if (item.variants) return Object.entries(item.variants).map(([name, hex]) => ({ name, hex }));
  const mat = item.recolors?.find((r) => r.material !== 'body' && r.material !== 'eye')?.material;
  if (!mat) return [];
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

interface Draw { rel: string; z: number; size: number; hold0: boolean; maps: { from: string[]; to: string[] }[] }

function drawsOf(item: Item, av: Avatar, anim: Anim, color: string | undefined): Draw[] {
  const pick = (a: Anim) => {
    const custom = item.layers.filter((l) => l.custom === a && l.paths[av.body]);
    return custom.length ? custom : item.layers.filter((l) => !l.custom && l.anims.includes(a) && l.paths[av.body]);
  };
  let layers = pick(anim), hold0 = false, src = anim;
  // sem quadros de "parado": usa o 1º quadro de "andar" (armas e algumas roupas)
  if (!layers.length && anim === 'idle') { layers = pick('walk'); hold0 = true; src = 'walk'; }
  const variant = item.variants ? (color && item.variants[color] ? color : Object.keys(item.variants)[0]) : undefined;
  const maps = (item.recolors ?? []).map((r) => {
    const pal = LPC.palettes[r.material];
    const to = r.material === 'body' ? av.skin : r.material === 'eye' ? av.eyes : color ?? pal.base;
    return { from: pal.colors[r.base ?? pal.base] ?? [], to: pal.colors[to] ?? pal.colors[pal.base] };
  }).filter((m) => m.from !== m.to);
  return layers.map((l) => {
    const p = l.paths[av.body]!;
    const rel = l.custom
      ? (l.fmt === 'variant' ? `${p}${variant}.png` : `${p.replace(/\/$/, '')}.png`)
      : (l.fmt === 'variant' ? `${p}${src}/${variant}.png` : `${p}${src}.png`);
    return { rel, z: l.z, size: l.size ?? LPC.frame, hold0, maps: l.fmt === 'recolor' ? maps : [] };
  });
}

export interface Sheet { canvas: HTMLCanvasElement; size: number; frames: number; rows: number }
const sheets = new Map<string, Promise<Sheet>>();

/** Folha de quadros do boneco para uma animação: `frames` colunas × 4 direções (n, o, s, l). */
export function compose(av: Avatar, anim: Anim): Promise<Sheet> {
  const key = JSON.stringify([av, anim]);
  let p = sheets.get(key);
  if (!p) { p = build(av, anim); sheets.set(key, p); if (sheets.size > 120) sheets.delete(sheets.keys().next().value!); }
  return p;
}

async function build(av: Avatar, anim: Anim): Promise<Sheet> {
  const { frames, rows } = LPC.anims[anim];
  const draws: Draw[] = [
    ...drawsOf(LPC.fixed.body, av, anim, undefined),
    ...drawsOf(LPC.fixed.head[av.body], av, anim, undefined),
    ...drawsOf(LPC.fixed.face, av, anim, undefined),
  ];
  for (const s of LPC.slots) {
    const part = av.parts[s.id];
    const item = itemOf(s.id, part?.id);
    if (!item || !item.bodies.includes(av.body)) continue;
    draws.push(...drawsOf(item, av, anim, part?.color));
    if (item.ammo && anim === 'shoot') draws.push(...drawsOf(LPC.fixed.ammo, av, anim, undefined));
  }
  draws.sort((a, b) => a.z - b.z);
  const size = Math.max(LPC.frame, ...draws.map((d) => d.size));
  const canvas = document.createElement('canvas');
  canvas.width = frames * size; canvas.height = rows * size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const imgs = await Promise.all(draws.map((d) => load(d.rel)));
  draws.forEach((d, i) => {
    const im = imgs[i];
    if (!im) return;
    const src: CanvasImageSource = d.maps.length ? recolor(im, d.maps) : im;
    const off = (size - d.size) / 2;
    const cols = Math.floor(im.width / d.size), rws = Math.max(1, Math.floor(im.height / d.size));
    for (let r = 0; r < rows; r++) for (let f = 0; f < frames; f++) {
      const sf = d.hold0 ? 0 : f;
      if (sf >= cols || r >= rws) continue;
      ctx.drawImage(src, sf * d.size, r * d.size, d.size, d.size, f * size + off, r * size + off, d.size, d.size);
    }
  });
  return { canvas, size, frames, rows };
}

/** Animação de ataque do boneco conforme a arma que ele segura. */
export function attackAnim(av: Avatar, fallback: Anim = 'slash'): Anim {
  return itemOf('weapon', av.parts.weapon?.id)?.attack ?? fallback;
}

/** "Foto" do boneco para o retrato: o busto de frente, ampliado sem suavizar, sobre um fundo. */
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
