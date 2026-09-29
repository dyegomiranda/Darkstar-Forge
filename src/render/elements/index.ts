import { arcano } from './arcano';
import { gotico } from './gotico';
import { moderno } from './moderno';
import { ornado } from './ornado';
import { pixel } from './pixel';
import { selvagem } from './selvagem';
import { sombrio } from './sombrio';
import { vazio } from './vazio';
import { espectral } from './espectral';
import { energia } from './energia';
import { aco } from './aco';
import type { PieceKind, PieceStyle, StyleId, StyleInfo } from './types';

export * from './types';

export const STYLES: StyleInfo[] = [
  { id: 'ornado', name: 'Ornado', icons: 'emblema', description: 'Metal laqueado com relevo, pergaminho, cravos e joias.' },
  { id: 'gotico', name: 'Gótico', icons: 'emblema', description: 'Ferro negro com rebites, arcos pontiagudos, pedra e rosáceas de vitral.' },
  { id: 'arcano', name: 'Arcano', icons: 'emblema', description: 'Astrolábio: latão gravado, esmalte azul-noite, mapas de estrelas e luas.' },
  { id: 'moderno', name: 'Moderno', icons: 'chapado', description: 'Blocos de cor chapada, cortes diagonais, sombra dura e letra condensada.' },
  { id: 'selvagem', name: 'Selvagem', icons: 'emblema', description: 'Madeira e casca, couro costurado, cipós com folhas e fatias de tronco.' },
  { id: 'pixel', name: 'Pixel', icons: 'pixel', pixelArt: true, description: 'Janelas de RPG 16-bit, fonte pixelada e ícones em pixel.' },
  { id: 'sombrio', name: 'Pixel Sombrio', icons: 'pixel', pixelArt: true, description: 'Pixel art de fantasia sombria: ferro escuro, arremates e chifres de osso, faixa do nome na cor da classe e pergaminho rasgado.' },
  { id: 'vazio', name: 'Vazio', icons: 'emblema', description: 'Cromo polido com brilho na cor da classe: cantos em degrau, custo em gema facetada, soquetes redondos e painéis escuros com filete luminoso.' },
  { id: 'espectral', name: 'Espectral', icons: 'emblema', description: 'Prata com filigrana de espinhos: moldura escura fina, plaquinhas claras de pontas escuras, painel de texto claro e orbes vítreos.' },
  { id: 'energia', name: 'Energia', icons: 'chapado', description: 'Inspirado nas cartas de monstros tipo V: corpo preto com faixa prateada em V, barra do nome em degradê da cor do tipo, esferas de energia e barras pretas com curvas prateadas.' },
  { id: 'aco', name: 'Pixel Aço', icons: 'pixel', pixelArt: true, description: 'Pixel art de metal: moldura de aço chanfrada (ou ouro, bronze, ferro, cor da classe), placa do nome gravada, slots escuros para números, medalhão dentado e painel de pedra gasta.' },
];

const ALL: PieceStyle[] = [...ornado, ...gotico, ...arcano, ...moderno, ...selvagem, ...pixel, ...sombrio, ...vazio, ...espectral, ...energia, ...aco];

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
