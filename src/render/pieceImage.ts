/**
 * Peças feitas de IMAGEM (PNG/WebP/SVG do usuário) no lugar do desenho do
 * estilo — para usar molduras, barras e selos de modelos prontos (comprados,
 * gerados por IA ou desenhados à mão). Textos, custos e ATK/DEF continuam
 * automáticos por cima.
 *
 *  stretch — estica a imagem inteira na peça
 *  nine    — recorte em 9 partes: cantos fixos, bordas e miolo esticam
 *            (a caixa de regras muda de altura sem deformar os cantos)
 *  contain — mantém a proporção, centrada
 */
import type { Defs } from './defs';
import type { PieceKind } from './elements/types';
import type { Box } from './shapes';

export type ImageFit = 'stretch' | 'nine' | 'contain';

export interface PieceImage {
  /** Imagem no banco de mídia. Sem imagem = peça sem fundo (só o texto). */
  mediaId?: string;
  /** Preenchido na hora de desenhar (URL da imagem); não é salvo. */
  src?: string;
  /** Tamanho real da imagem em px (necessário para o recorte em 9 partes). */
  w?: number;
  h?: number;
  fit: ImageFit;
  /** 9 partes: espessura das bordas fixas, em px da imagem [cima, direita, baixo, esquerda]. */
  slice?: [number, number, number, number];
  /** 9 partes: escala das bordas na carta (1 = 1 px da imagem vira 1 px da carta 750×1050). */
  sliceScale?: number;
  /** Ajuste fino de posição e tamanho (px da carta). */
  dx?: number;
  dy?: number;
  dw?: number;
  dh?: number;
  /** Margens do texto dentro da peça (px da carta) [cima, direita, baixo, esquerda]. */
  pad?: [number, number, number, number];
  /** Tingir com a cor da carta: 0 = cores originais, 1 = tudo na cor da carta (mantém luz e sombra). */
  tint?: number;
}

/** Margens de texto padrão por peça (px da carta). */
export const DEFAULT_PAD: Record<PieceKind, [number, number, number, number]> = {
  header: [14, 44, 14, 44],
  cost: [20, 20, 20, 20],
  class: [18, 18, 18, 18],
  typeBar: [10, 64, 10, 26],
  rules: [28, 32, 28, 32],
  stat: [10, 16, 10, 16],
  footer: [6, 14, 6, 14],
  set: [12, 12, 12, 12],
  frame: [0, 0, 0, 0],
};

/** Encaixe padrão ao escolher uma imagem para a peça. */
export const DEFAULT_FIT: Record<PieceKind, ImageFit> = {
  header: 'nine', cost: 'stretch', class: 'contain', typeBar: 'nine', rules: 'nine',
  stat: 'nine', footer: 'nine', set: 'contain', frame: 'stretch',
};

const n = (v: number) => +v.toFixed(2);

/** Caixa final da peça depois do ajuste fino. */
export function imageBox(box: Box, img: PieceImage): Box {
  return { x: box.x + (img.dx ?? 0), y: box.y + (img.dy ?? 0), w: Math.max(4, box.w + (img.dw ?? 0)), h: Math.max(4, box.h + (img.dh ?? 0)) };
}

/** Onde vai o texto/símbolo. */
export function imageContent(kind: PieceKind, box: Box, img: PieceImage): Box {
  const b = imageBox(box, img);
  const [t, r, bt, l] = img.pad ?? DEFAULT_PAD[kind];
  return { x: b.x + l, y: b.y + t, w: Math.max(4, b.w - l - r), h: Math.max(4, b.h - t - bt) };
}

/** Filtro que tinge a imagem com `color`, mantendo luz, sombra e transparência. */
function tintFilter(defs: Defs, color: string, amount: number): string {
  const a = +Math.min(1, Math.max(0, amount)).toFixed(2);
  return defs.url(`imgtint:${color}:${a}`, (id) =>
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="g"/>` +
    // clareia o cinza antes de multiplicar, para a cor não ficar escura demais
    `<feComponentTransfer in="g" result="gl"><feFuncR type="linear" slope="1.25"/><feFuncG type="linear" slope="1.25"/><feFuncB type="linear" slope="1.25"/></feComponentTransfer>` +
    `<feFlood flood-color="${color}" result="c"/>` +
    `<feBlend in="gl" in2="c" mode="multiply" result="m"/>` +
    `<feComposite in="m" in2="SourceGraphic" operator="arithmetic" k2="${a}" k3="${+(1 - a).toFixed(2)}" result="mix"/>` +
    `<feComposite in="mix" in2="SourceAlpha" operator="in"/></filter>`);
}

/** Desenha a imagem da peça na caixa. */
export function drawPieceImage(defs: Defs, box: Box, img: PieceImage, color: string, opacity = 1): string {
  if (!img.src) return '';
  const b = imageBox(box, img);
  const href = img.src;
  let body: string;
  if (img.fit === 'nine' && img.w && img.h) {
    const W = img.w, H = img.h;
    const k = img.sliceScale ?? 1;
    const [st, sr, sb, sl] = (img.slice ?? [0, 0, 0, 0]).map((v, i) => Math.max(0, Math.min(v, i % 2 ? W / 2 : H / 2)));
    // espessura na carta (encolhe se a peça for menor que os cantos)
    const fx = Math.min(1, b.w / Math.max(1, (sl + sr) * k)), fy = Math.min(1, b.h / Math.max(1, (st + sb) * k));
    const L = sl * k * fx, R = sr * k * fx, T = st * k * fy, B = sb * k * fy;
    const cols: [number, number, number, number][] = [[0, sl, b.x, L], [sl, W - sl - sr, b.x + L, b.w - L - R], [W - sr, sr, b.x + b.w - R, R]];
    const rows: [number, number, number, number][] = [[0, st, b.y, T], [st, H - st - sb, b.y + T, b.h - T - B], [H - sb, sb, b.y + b.h - B, B]];
    body = '';
    for (const [sy, sh, y, h] of rows) for (const [sx, sw, x, w] of cols) {
      if (sw <= 0 || sh <= 0 || w <= 0 || h <= 0) continue;
      // cada parte: a imagem inteira escalada para que o pedaço (sx,sy,sw,sh) caia no
      // retângulo, recortada nele (clipPath). +0.4 px evita frestas entre as partes.
      // (Sem <svg> aninhado: o CSS da página pode esticar <svg> internos.)
      const kx = w / sw, ky = h / sh;
      const clip = defs.add(`nine:${n(x)}:${n(y)}:${n(w)}:${n(h)}`, (id) =>
        `<clipPath id="${id}"><rect x="${n(x)}" y="${n(y)}" width="${n(w + 0.4)}" height="${n(h + 0.4)}"/></clipPath>`);
      body += `<image href="${href}" x="${n(x - sx * kx)}" y="${n(y - sy * ky)}" width="${n(W * kx)}" height="${n(H * ky)}" preserveAspectRatio="none" clip-path="url(#${clip})"/>`;
    }
  } else {
    const par = img.fit === 'contain' ? 'xMidYMid meet' : 'none';
    body = `<image href="${href}" x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" preserveAspectRatio="${par}"/>`;
  }
  const filter = img.tint ? ` filter="${tintFilter(defs, color, img.tint)}"` : '';
  const op = opacity < 1 ? ` opacity="${n(opacity)}"` : '';
  return `<g${filter}${op}>${body}</g>`;
}
