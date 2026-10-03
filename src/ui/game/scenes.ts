/**
 * Cenários do campo de batalha. Cada um tem a imagem de fundo (public/cenarios,
 * gerada por tools/comfyui/gerar_cenarios.py). As casas do campo são uma área
 * escura e transparente por cima do cenário (veja Game.svelte).
 */
export interface Scene {
  id: string;
  name: [string, string];
  /** Imagem de fundo (relativa à raiz do app); sem ela, a mesa escura de sempre. */
  img?: string;
}

export const SCENES: Scene[] = [
  { id: 'floresta', name: ['Floresta', 'Forest'], img: 'cenarios/floresta.webp' },
  { id: 'campo', name: ['Campo aberto', 'Open plains'], img: 'cenarios/campo.webp' },
  { id: 'vulcao', name: ['Vulcão', 'Volcano'], img: 'cenarios/vulcao.webp' },
  { id: 'masmorra', name: ['Masmorra', 'Dungeon'], img: 'cenarios/masmorra.webp' },
  { id: 'neve', name: ['Tundra gelada', 'Frozen tundra'], img: 'cenarios/neve.webp' },
  { id: 'deserto', name: ['Ruínas do deserto', 'Desert ruins'], img: 'cenarios/deserto.webp' },
  { id: 'pantano', name: ['Pântano', 'Swamp'], img: 'cenarios/pantano.webp' },
  { id: 'cripta', name: ['Cripta', 'Crypt'], img: 'cenarios/cripta.webp' },
  { id: 'mesa', name: ['Mesa escura', 'Dark table'] },
];

export const sceneOf = (id: string): Scene => SCENES.find((s) => s.id === id) ?? SCENES[SCENES.length - 1];
/** Sorteia um cenário com imagem. */
export const randomScene = (): Scene => { const withImg = SCENES.filter((s) => s.img); return withImg[Math.floor(Math.random() * withImg.length)]; };
