/**
 * Paleta de uma carta: nasce das cores do deck e alimenta todas as peças.
 * Metais fixos (ouro, prata…) ou "deck" (metal laqueado na cor da classe).
 */
import { darken, lighten, mix, tone, toHsl } from './color';

export type MetalKind = 'deck' | 'gold' | 'silver' | 'bronze' | 'iron';

export const METALS: Record<Exclude<MetalKind, 'deck'>, string[]> = {
  gold: ['#fff4cf', '#f1cf72', '#b98a2c', '#fbe49c', '#8a5b16', '#d8a443'],
  silver: ['#ffffff', '#dde2e8', '#8f98a5', '#f0f3f7', '#5c6571', '#b8c0ca'],
  bronze: ['#ffe2bd', '#dc9d5e', '#8e5428', '#f2be89', '#5b3116', '#b8743a'],
  iron: ['#cfd2d7', '#80868f', '#3e424a', '#9ea4ac', '#24272c', '#61666e'],
};

/**
 * Como várias cores se misturam numa peça:
 *  faixas   — blocos de cor com transição curta (padrão)
 *  degrade  — degradê suave de ponta a ponta
 *  divisao  — divisão reta, sem transição
 *  vertical — faixas de cima para baixo
 *  diagonal — degradê na diagonal
 */
export type BlendMode = 'faixas' | 'degrade' | 'divisao' | 'vertical' | 'diagonal';

export interface Palette {
  /** Cores da carta (1 = mono, 2 a 5 = multicolor). */
  colors: string[];
  base: string;
  hybrid: boolean;
  metal: MetalKind;
  blend: BlendMode;
}

export function makePalette(colors: string[], metal: MetalKind = 'deck', blend: BlendMode = 'faixas'): Palette {
  const cs = colors.length ? colors : ['#b92d20'];
  return { colors: cs, base: cs[0], hybrid: cs.length > 1, metal, blend };
}

/** Dourado "multicor" (como nas cartas de várias cores do MTG). */
export const MULTICOLOR_GOLD = '#c79a3e';

/**
 * Versão "joia" da cor, boa para brilho e filetes: satura as cores médias.
 * Respeita os extremos escolhidos pelo usuário — preto continua bem escuro e
 * branco continua claro (antes tudo era puxado para o meio e o preto virava cinza).
 */
export const vivid = (c: string) => {
  const h = toHsl(c);
  // cores quase neutras (preto, prata) continuam neutras: saturar inventaria um matiz
  const s = h.s < 0.2 ? h.s : Math.max(h.s, 0.55);
  let l: number;
  if (h.l < 0.28) l = Math.max(h.l, 0.08);
  else if (h.l > 0.72) l = Math.min(h.l, 0.9);
  else l = Math.min(Math.max(h.l, 0.42), 0.58);
  return tone(c, { s, l });
};

/** Pergaminho levemente tingido pela cor do deck (como no card1). */
export const paper = (c: string) => mix(tone(c, { s: 0.35 }), '#fbf6f0', 0.9);

/** Tinta escura para texto sobre pergaminho, puxada para a cor do deck. */
export const inkOnPaper = (c: string) => mix(darken(c, 0.72), '#1d1410', 0.35);

/** Fundo escuro translúcido (vidro fumê) na cor do deck. */
export const smoke = (c: string) => mix(darken(tone(c, { s: 0.5 }), 0.78), '#0b0a0c', 0.35);

export const glowOf = (c: string) => lighten(vivid(c), 0.15);
