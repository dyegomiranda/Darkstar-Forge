import { arcano } from './arcano';
import { classico } from './classico';
import { ornado } from './ornado';
import { sombrio } from './sombrio';
import type { PieceKind, PieceStyle, StyleId, StyleInfo } from './types';

export * from './types';

export const STYLES: StyleInfo[] = [
  { id: 'ornado', name: 'Ornado', description: 'Metal laqueado com relevo, pergaminho, cravos e joias.' },
  { id: 'sombrio', name: 'Sombrio', description: 'Vidro fumê sobre a arte, filetes finos e cantos cortados.' },
  { id: 'arcano', name: 'Arcano', description: 'Vidro escuro, linhas luminosas, runas e círculos de conjuração.' },
  { id: 'classico', name: 'Clássico', description: 'Painéis limpos e arredondados com filete de metal.' },
];

const ALL: PieceStyle[] = [...ornado, ...sombrio, ...arcano, ...classico];

const index = new Map<string, PieceStyle>(ALL.map((p) => [`${p.style}:${p.kind}`, p]));

/** Peça de um estilo; se o estilo não tiver essa peça, cai no Ornado. */
export function piece(style: StyleId, kind: PieceKind): PieceStyle {
  return index.get(`${style}:${kind}`) ?? index.get(`ornado:${kind}`)!;
}

export function stylesFor(kind: PieceKind): PieceStyle[] {
  return ALL.filter((p) => p.kind === kind);
}
