import type { Defs } from '../defs';
import type { IconStyle } from '../icons/render';
import type { Palette, MetalKind } from '../palette';
import type { Box } from '../shapes';
import type { Skeleton } from '../layout';
import type { TextLook } from '../text';

/** As peças que compõem uma carta. Cada uma pode vir de um estilo diferente. */
export type PieceKind = 'frame' | 'header' | 'cost' | 'class' | 'typeBar' | 'rules' | 'stat' | 'footer' | 'set';

export const PIECE_KINDS: PieceKind[] = ['frame', 'header', 'cost', 'class', 'typeBar', 'rules', 'stat', 'footer', 'set'];

export type StyleId = 'ornado' | 'ornadoRegio' | 'ornadoMarfim' | 'ornadoPontas' | 'gotico' | 'arcano' | 'moderno' | 'selvagem' | 'pixel' | 'sombrio' | 'vazio' | 'espectral' | 'energia' | 'aco';

export interface PieceArgs {
  /** Área que o esqueleto reservou para a peça. */
  box: Box;
  pal: Palette;
  defs: Defs;
  /** Opacidade do fundo do painel (0..1). */
  opacity: number;
  /** ATK ou DEF (placas de combate). */
  variant?: 'atk' | 'def';
  /** Cor do fundo do painel escolhida pelo usuário (senão, a do estilo). */
  fill?: string;
  /** Esqueleto da carta (a moldura usa para recortar a janela da arte). */
  layout?: Skeleton;
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
  /** Cor sugerida para o símbolo desenhado dentro da peça. */
  iconColor?: string;
  /** Pixelar os ícones desenhados dentro da peça (tamanho do bloco). */
  pixelIcons?: number;
  /** Selo de custo: cada símbolo vai escuro sobre uma esfera na cor do recurso (esferas de energia). */
  costOrbs?: boolean;
  /** Alinhamento do texto de uma linha (nome: centro; tipo: esquerda, se não disser). */
  align?: 'left' | 'center';
  /** Moldura: desenho que vai POR BAIXO da arte (fundo da carta). */
  under?: string;
  /** Moldura: janela da arte (d); a arte só aparece dentro dela. */
  artClip?: string;
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
  /** Barra de tipo: joia de raridade no estilo da peça (senão, joia lapidada). */
  gemRender?(box: Box, color: string, defs: Defs): string;
  /** Caixa de regras: aparência do texto de ambientação. */
  flavor?: (pal: Palette) => TextLook;
}

export interface StyleInfo {
  id: StyleId;
  name: string;
  description: string;
  /** Estilo de símbolo que combina com o estilo (o usuário pode trocar). */
  icons: IconStyle;
  /** Estilo de pixel art: ao escolhê-lo, a arte também é pixelada (dá para desligar). */
  pixelArt?: boolean;
  /**
   * Esqueleto próprio (onde cada peça fica), recebendo a altura que a caixa de
   * regras precisa. Estilos inspirados em modelos prontos têm arranjos próprios
   * (nome no meio da carta, arte em janela...). Sem isto, usa o esqueleto padrão.
   */
  layout?: (rulesH: number) => Partial<Skeleton>;
  /** Altura máxima da caixa de regras neste estilo. */
  rulesMax?: number;
  /** A moldura faz parte do estilo: aparece por padrão (dá para desligar). */
  frame?: boolean;
}
