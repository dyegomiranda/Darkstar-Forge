import type { Defs } from '../defs';
import type { Palette, MetalKind } from '../palette';
import type { Box } from '../shapes';
import type { TextLook } from '../text';

/** As peças que compõem uma carta. Cada uma pode vir de um estilo diferente. */
export type PieceKind = 'frame' | 'header' | 'cost' | 'class' | 'typeBar' | 'rules' | 'stat' | 'footer' | 'set';

export const PIECE_KINDS: PieceKind[] = ['frame', 'header', 'cost', 'class', 'typeBar', 'rules', 'stat', 'footer', 'set'];

export type StyleId = 'ornado' | 'sombrio' | 'arcano' | 'classico';

export interface PieceArgs {
  /** Área que o esqueleto reservou para a peça. */
  box: Box;
  pal: Palette;
  defs: Defs;
  /** Opacidade do fundo do painel (0..1). */
  opacity: number;
  /** ATK ou DEF (placas de combate). */
  variant?: 'atk' | 'def';
}

export interface PieceOut {
  /** Desenho da peça (vai por baixo do texto). */
  svg: string;
  /** Onde o conteúdo (texto/ícone) deve ficar. */
  content: Box;
  /** Aparência do texto que vai dentro da peça. */
  text: TextLook;
  /** Forma (d) para "vidro fosco": a arte desfocada é desenhada por baixo dela. */
  glass?: string;
  /** Lugar da joia de raridade (barra de tipo). */
  gem?: Box;
}

export interface PieceStyle {
  style: StyleId;
  kind: PieceKind;
  /** Opacidade padrão do painel. */
  opacity: number;
  /** Metal padrão sugerido pelo estilo. */
  metal: MetalKind;
  render(a: PieceArgs): PieceOut;
  /** Caixa de regras: divisor entre regras e texto de ambientação. */
  divider?(a: PieceArgs, x: number, y: number, w: number): string;
  /** Caixa de regras: aparência do texto de ambientação. */
  flavor?: (pal: Palette) => TextLook;
}

export interface StyleInfo { id: StyleId; name: string; description: string }
