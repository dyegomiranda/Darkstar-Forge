import { arcano } from './arcano';
import { gotico } from './gotico';
import { moderno } from './moderno';
import { ornado, ornadoMarfim, ornadoRegio } from './ornado';
import { ornadoPontas } from './ornado-pontas';
import { pixel } from './pixel';
import { selvagem } from './selvagem';
import { sombrio, sombrioLayout } from './sombrio';
import { vazio, vazioLayout } from './vazio';
import { espectral, espectralLayout } from './espectral';
import { energia, energiaLayout } from './energia';
import { aco, acoLayout } from './aco';
import type { PieceKind, PieceStyle, StyleId, StyleInfo } from './types';

export * from './types';

export const STYLES: StyleInfo[] = [
  { id: 'ornado', name: 'Ornado', icons: 'emblema', description: 'Ourivesaria na cor da classe: medalhões com fio de pérolas, cartelas com volutas, filigrana nos cantos e pergaminho.' },
  { id: 'ornadoRegio', name: 'Ornado Régio', icons: 'emblema', description: 'A mesma ourivesaria em ouro, com painéis de laca escura e letra clara.' },
  { id: 'ornadoMarfim', name: 'Ornado Marfim', icons: 'emblema', description: 'A mesma ourivesaria em prata, com painéis de marfim.' },
  { id: 'ornadoPontas', name: 'Ornado Pontas', icons: 'emblema', description: 'O Ornado original: metal laqueado com espinhos, chamas no nome, cravos e joias.' },
  { id: 'gotico', name: 'Gótico', icons: 'emblema', description: 'Ferro negro com rebites, arcos pontiagudos, pedra e rosáceas de vitral.' },
  { id: 'arcano', name: 'Arcano', icons: 'emblema', description: 'Astrolábio: latão gravado, esmalte azul-noite, mapas de estrelas e luas.' },
  { id: 'moderno', name: 'Moderno', icons: 'chapado', description: 'Blocos de cor chapada, cortes diagonais, sombra dura e letra condensada.' },
  { id: 'selvagem', name: 'Selvagem', icons: 'emblema', description: 'Madeira e casca, couro costurado, cipós com folhas e fatias de tronco.' },
  { id: 'pixel', name: 'Pixel', icons: 'pixel', pixelArt: true, description: 'Janelas de RPG 16-bit, fonte pixelada e ícones em pixel.' },
  { id: 'sombrio', name: 'Pixel Sombrio', icons: 'pixel', pixelArt: true, frame: true, rulesMax: 300, layout: sombrioLayout, description: 'Pixel art de fantasia sombria (referência: Fantasy TCG Cards Pixel Art): ardósia azulada com filetes dourados, arte em janela de arco, fita do nome na cor da classe, selos redondos e pergaminho rasgado sobre teia.' },
  { id: 'vazio', name: 'Vazio', icons: 'emblema', frame: true, rulesMax: 300, layout: vazioLayout, description: 'Aço escuro com neon na cor da classe (referência: Dracanis Void): placa do número no topo entre soquetes, janela chanfrada, faixa do nome entre a gema do custo e a da raridade, painéis escuros.' },
  { id: 'espectral', name: 'Espectral', icons: 'emblema', frame: true, rulesMax: 290, layout: espectralLayout, description: 'Prata com espinhos (referência: TCG Template Vol. 5): plaquinha do tipo no topo, arte grande, faixa clara do nome sobre barra escura, painel de texto claro e orbes nos cantos de baixo.' },
  { id: 'energia', name: 'Energia', icons: 'chapado', frame: true, rulesMax: 320, layout: energiaLayout, description: 'Inspirado nas cartas de monstros tipo V: borda preta com filete prateado, cunha prateada em V, nome grande inclinado, esfera do tipo, pílula vermelha e barra preta com ATK/DEF.' },
  { id: 'aco', name: 'Pixel Aço', icons: 'pixel', pixelArt: true, frame: true, rulesMax: 300, layout: acoLayout, description: 'Pixel art de metal (referência: TCG Creator vol. 18): borda grossa de pedra e aço com cantoneiras douradas, arte em janela, placa do nome, fileira de placas (custo, ATK, DEF) e caixa de pedra.' },
];

const ALL: PieceStyle[] = [...ornado, ...ornadoRegio, ...ornadoMarfim, ...ornadoPontas, ...gotico, ...arcano, ...moderno, ...selvagem, ...pixel, ...sombrio, ...vazio, ...espectral, ...energia, ...aco];

const index = new Map<string, PieceStyle>(ALL.map((p) => [`${p.style}:${p.kind}`, p]));

/** Peça de um estilo; se o estilo não tiver essa peça, cai no Ornado. */
export function piece(style: StyleId, kind: PieceKind): PieceStyle {
  return index.get(`${style}:${kind}`) ?? index.get(`ornado:${kind}`)!;
}

export function styleInfo(id: StyleId): StyleInfo {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}

export function stylesFor(kind: PieceKind): PieceStyle[] {
  return ALL.filter((p) => p.kind === kind);
}
