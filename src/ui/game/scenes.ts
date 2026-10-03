/**
 * Cenários do campo de batalha. Cada um tem a imagem de fundo (public/cenarios,
 * gerada por tools/comfyui/gerar_cenarios.py) e os tons do "piso" das casas —
 * um chão um pouco diferente do resto, no mesmo clima do cenário (grama mais
 * rala na floresta, areia mais clara no vulcão…).
 */
export interface Scene {
  id: string;
  name: [string, string];
  /** Imagem de fundo (relativa à raiz do app); sem ela, a mesa escura de sempre. */
  img?: string;
  /** Três tons do piso das casas (o do meio é o mais comum). */
  floor: [string, string, string];
}

export const SCENES: Scene[] = [
  { id: 'floresta', name: ['Floresta', 'Forest'], img: 'cenarios/floresta.webp', floor: ['#4ba429', '#54b42d', '#5cc531'] },
  { id: 'campo', name: ['Campo aberto', 'Open plains'], img: 'cenarios/campo.webp', floor: ['#cdce3e', '#cfd34f', '#d4d760'] },
  { id: 'vulcao', name: ['Vulcão', 'Volcano'], img: 'cenarios/vulcao.webp', floor: ['#0d1e34', '#1e3a57', '#395a75'] },
  { id: 'masmorra', name: ['Masmorra', 'Dungeon'], img: 'cenarios/masmorra.webp', floor: ['#44606b', '#6a828b', '#91a8ad'] },
  { id: 'neve', name: ['Tundra gelada', 'Frozen tundra'], img: 'cenarios/neve.webp', floor: ['#b9edea', '#c9f1ef', '#d9f5f3'] },
  { id: 'deserto', name: ['Ruínas do deserto', 'Desert ruins'], img: 'cenarios/deserto.webp', floor: ['#e0de85', '#e5e197', '#e9e8a7'] },
  { id: 'pantano', name: ['Pântano', 'Swamp'], img: 'cenarios/pantano.webp', floor: ['#1d6336', '#29834d', '#33975b'] },
  { id: 'cripta', name: ['Cripta', 'Crypt'], img: 'cenarios/cripta.webp', floor: ['#3b285a', '#5b3983', '#7a3f9e'] },
  { id: 'mesa', name: ['Mesa escura', 'Dark table'], floor: ['#2a2420', '#342d28', '#3f3731'] },
];

export const sceneOf = (id: string): Scene => SCENES.find((s) => s.id === id) ?? SCENES[SCENES.length - 1];
/** Sorteia um cenário com imagem. */
export const randomScene = (): Scene => { const withImg = SCENES.filter((s) => s.img); return withImg[Math.floor(Math.random() * withImg.length)]; };

const tiles = new Map<string, string>();
/**
 * Piso de uma casa em pixel art: um retalho de 27×20 pixels nos três tons do
 * cenário, com as bordas roídas (pixels faltando) e um contorno mais escuro.
 * `seed` varia o desenho de casa para casa. Devolve uma imagem (data URL).
 */
export function floorTile(scene: Scene, seed: number): string {
  const key = `${scene.id}:${seed}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const W = 27, H = 20;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const [dark, mid, light] = scene.floor;
  const inside = (x: number, y: number) => {
    // cantos arredondados em degraus + bordas roídas
    const dx = Math.min(x, W - 1 - x), dy = Math.min(y, H - 1 - y);
    if (dx + dy < 3) return false;
    if ((dx === 0 || dy === 0) && rnd() < 0.3) return false;
    return true;
  };
  const cell: boolean[][] = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => inside(x, y)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!cell[y][x]) continue;
    const edge = !cell[y + 1]?.[x] || !cell[y][x + 1];
    const r = rnd();
    ctx.fillStyle = edge ? dark : r < 0.2 ? light : r < 0.42 ? dark : mid;
    ctx.fillRect(x, y, 1, 1);
  }
  const url = c.toDataURL();
  tiles.set(key, url);
  return url;
}
