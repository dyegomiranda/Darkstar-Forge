import { arcano } from './arcano';
import { gotico } from './gotico';
import { moderno } from './moderno';
import { ornado } from './ornado';
import { pixel } from './pixel';
import { selvagem } from './selvagem';
import type { PieceKind, PieceStyle, StyleId, StyleInfo } from './types';

export * from './types';

export const STYLES: StyleInfo[] = [
  { id: 'ornado', name: 'Ornado', description: 'Metal laqueado com relevo, pergaminho, cravos e joias.' },
  { id: 'gotico', name: 'Gótico', description: 'Ferro negro com rebites, arcos pontiagudos, pedra e rosáceas de vitral.' },
  { id: 'arcano', name: 'Arcano', description: 'Sem caixas: névoa, constelações, runas luminosas e cristais lapidados.' },
  { id: 'moderno', name: 'Moderno', description: 'Blocos de cor chapada, cortes diagonais, sombra dura e letra condensada.' },
  { id: 'selvagem', name: 'Selvagem', description: 'Madeira e casca, couro costurado, cipós com folhas e fatias de tronco.' },
  { id: 'pixel', name: 'Pixel', description: 'Janelas de RPG 16-bit, pontilhado, fonte pixelada e ícones em pixel.' },
];

const ALL: PieceStyle[] = [...ornado, ...gotico, ...arcano, ...moderno, ...selvagem, ...pixel];

const index = new Map<string, PieceStyle>(ALL.map((p) => [`${p.style}:${p.kind}`, p]));

/** Peça de um estilo; se o estilo não tiver essa peça, cai no Ornado. */
export function piece(style: StyleId, kind: PieceKind): PieceStyle {
  return index.get(`${style}:${kind}`) ?? index.get(`ornado:${kind}`)!;
}

export function stylesFor(kind: PieceKind): PieceStyle[] {
  return ALL.filter((p) => p.kind === kind);
}
