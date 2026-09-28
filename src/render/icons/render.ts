/**
 * Desenha um símbolo (glyphs.ts) num dos estilos:
 *  - emblema: metal/esmalte com relevo, contorno escuro e sombra
 *  - traco:   só contorno fino e gravações, com brilho suave
 *  - chapado: cor sólida, furos vazados (design gráfico)
 *  - pixel:   chapado com contorno, pixelado
 */
import { darken, lighten, luminance, mix } from '../color';
import type { Defs } from '../defs';
import type { Pt } from '../shapes';
import { GLYPHS, type Glyph } from './glyphs';

export type IconStyle = 'emblema' | 'traco' | 'chapado' | 'pixel';
export const ICON_STYLES: { id: IconStyle; name: string }[] = [
  { id: 'emblema', name: 'Emblema' },
  { id: 'traco', name: 'Traço' },
  { id: 'chapado', name: 'Chapado' },
  { id: 'pixel', name: 'Pixel' },
];

const f = (n: number) => +n.toFixed(1);
const toD = (polys: Pt[][] | undefined, closed = true) =>
  (polys ?? []).map((p) => p.map((q, i) => `${i ? 'L' : 'M'}${f(q[0])} ${f(q[1])}`).join('') + (closed ? 'Z' : '')).join('');

/** Contorno externo da silhueta inteira (dilatação − original), no espaço 100×100. */
function outline(defs: Defs, color: string, r: number, opacity = 1): string {
  return defs.url(`gl-outline:${color}:${r}:${opacity}`, (id) =>
    `<filter id="${id}" x="-15" y="-15" width="130" height="130" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    `<feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/>` +
    `<feFlood flood-color="${color}" flood-opacity="${opacity}"/><feComposite in2="d" operator="in" result="o"/>` +
    `<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
}

function ringOnly(defs: Defs, color: string, r: number): string {
  return defs.url(`gl-ring:${color}:${r}`, (id) =>
    `<filter id="${id}" x="-15" y="-15" width="130" height="130" filterUnits="userSpaceOnUse">` +
    `<feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/>` +
    `<feComposite in="d" in2="SourceAlpha" operator="out" result="o"/>` +
    `<feFlood flood-color="${color}"/><feComposite in2="o" operator="in"/></filter>`);
}

function glyphBevel(defs: Defs): string {
  return defs.url('gl-bevel', (id) =>
    `<filter id="${id}" x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/>` +
    `<feSpecularLighting in="b" surfaceScale="3.5" specularConstant=".9" specularExponent="20" lighting-color="#fff" result="s">` +
    `<feDistantLight azimuth="235" elevation="45"/></feSpecularLighting>` +
    `<feComposite in="s" in2="SourceAlpha" operator="in" result="si"/>` +
    `<feComposite in="SourceGraphic" in2="si" operator="arithmetic" k2="1" k3=".7"/></filter>`);
}

function pixelate(defs: Defs, block: number): string {
  return defs.url(`gl-pix:${block}`, (id) =>
    `<filter id="${id}" x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse">` +
    pixelSteps(block) + `</filter>`);
}

/**
 * Passos do filtro de pixelar: amostra um quadradinho no meio de cada bloco e
 * dilata até cobrir o bloco. A amostra é proporcional ao bloco (não 1 unidade),
 * senão some quando o desenho é pequeno na tela.
 */
export function pixelSteps(block: number): string {
  const s = +(block * 0.5).toFixed(3);
  const o = +((block - s) / 2).toFixed(3);
  return `<feFlood x="${o}" y="${o}" width="${s}" height="${s}"/><feComposite width="${block}" height="${block}"/>` +
    `<feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/>` +
    `<feMorphology operator="dilate" radius="${o}"/>`;
}

/** Máscara com furos e gravações vazados (para Chapado/Pixel). */
function holeMask(defs: Defs, g: Glyph, lineW: number): string {
  return defs.url(`gl-mask:${g.id}:${lineW}`, (id) =>
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">` +
    `<rect x="-10" y="-10" width="120" height="120" fill="#fff"/>` +
    (g.holes ? `<path d="${toD(g.holes)}" fill="#000"/>` : '') +
    (g.lines ? `<path d="${toD(g.lines, false)}" fill="none" stroke="#000" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
    `</mask>`);
}

export interface GlyphOpts {
  /** Cor principal (padrão: a cor do próprio símbolo). */
  color?: string;
  /** Opacidade geral. */
  opacity?: number;
  /** Sem gravações/furos (quando um número vai por cima do símbolo). */
  plain?: boolean;
}

/** Desenha o símbolo `id` com o canto superior esquerdo em (x,y) e lado `size`. */
export function drawGlyph(defs: Defs, id: string, style: IconStyle, x: number, y: number, size: number, o: GlyphOpts = {}): string {
  const g0 = GLYPHS[id];
  if (!g0) return '';
  const g: Glyph = o.plain ? { ...g0, holes: undefined, lines: undefined } : g0;
  const color = o.color ?? g.color ?? '#d6dde6';
  const k = size / 100;
  const body = toD(g.body);
  const inner = toD(g.inner);
  const holes = toD(g.holes);
  const lines = toD(g.lines, false);
  const dark = mix(darken(color, 0.78), '#0c0908', 0.4);
  let inside = '';

  if (style === 'emblema') {
    const grad = defs.linear([[0, lighten(color, 0.45)], [0.45, color], [1, darken(color, 0.45)]]);
    const innerGrad = defs.linear([[0, lighten(color, 0.7)], [1, lighten(color, 0.15)]]);
    inside =
      `<g filter="${defs.shadow(3, 3, 0.7)}"><g filter="${outline(defs, dark, 3.2)}">` +
      `<g filter="${glyphBevel(defs)}"><path d="${body}" fill="${grad}"/></g></g></g>` +
      (inner ? `<path d="${inner}" fill="${innerGrad}" opacity=".55"/>` : '') +
      (holes ? `<path d="${holes}" fill="${dark}"/>` : '') +
      (lines ? `<path d="${lines}" fill="none" stroke="${dark}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>` : '');
  } else if (style === 'traco') {
    const glowC = lighten(color, 0.2);
    inside =
      `<g filter="${defs.glow(glowC, 3, 0.7)}">` +
      `<g filter="${ringOnly(defs, color, 3.4)}"><path d="${body}" fill="#000"/></g>` +
      (inner ? `<path d="${inner}" fill="none" stroke="${color}" stroke-width="2" opacity=".75"/>` : '') +
      (holes ? `<path d="${holes}" fill="none" stroke="${color}" stroke-width="2.6"/>` : '') +
      (lines ? `<path d="${lines}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
      `</g>`;
  } else if (style === 'chapado') {
    const lighter = luminance(color) > 0.6 ? darken(color, 0.12) : lighten(color, 0.22);
    inside =
      `<g mask="${holeMask(defs, g, 5)}">` +
      `<path d="${body}" fill="${color}"/>` +
      (inner ? `<path d="${inner}" fill="${lighter}"/>` : '') +
      `</g>`;
  } else {
    // pixel: cores chapadas com detalhes escuros (como sprite), contorno preto e grade de ~16 px
    const lighter = luminance(color) > 0.6 ? darken(color, 0.15) : lighten(color, 0.3);
    const shade = darken(color, 0.45);
    const shape =
      `<path d="${body}" fill="${color}"/>` +
      (inner ? `<path d="${inner}" fill="${lighter}"/>` : '') +
      (holes ? `<path d="${holes}" fill="${shade}"/>` : '') +
      (lines ? `<path d="${lines}" fill="none" stroke="${shade}" stroke-width="6" stroke-linecap="square"/>` : '');
    inside = `<g filter="${pixelate(defs, 6.25)}"><g filter="${outline(defs, '#0b0a12', 5)}">${shape}</g></g>`;
  }
  const op = o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : '';
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${+k.toFixed(4)})"${op}>${inside}</g>`;
}
