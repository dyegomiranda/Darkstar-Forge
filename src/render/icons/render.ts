/**
 * Desenha um símbolo (game-icons, quadro 512×512) num dos acabamentos:
 *  - emblema:  metal gravado — degradê metálico na cor, relevo, contorno escuro e sombra
 *  - medalhao: o símbolo em metal sobre um medalhão (aro de metal + esmalte)
 *  - chapado:  silhueta limpa numa cor só
 *  - pixel:    silhueta com contorno, pixelada (~16 px)
 *  - orbe:     esfera de vidro na cor do símbolo, com brilho e o símbolo em relevo (3D)
 *
 * Os símbolos da coleção 3D (icons3d.ts) são imagens prontas: entram como estão,
 * com sombra; o acabamento só muda no modo pixel.
 */
import { darken, lighten, luminance, mix } from '../color';
import type { Defs } from '../defs';
import { ICONS } from './game-icons';
import { ICONS3D } from './icons3d';

export type IconStyle = 'emblema' | 'medalhao' | 'chapado' | 'pixel' | 'orbe';
export const ICON_STYLES: { id: IconStyle; name: string; en: string }[] = [
  { id: 'emblema', name: 'Metal gravado', en: 'Engraved metal' },
  { id: 'medalhao', name: 'Medalhão', en: 'Medallion' },
  { id: 'orbe', name: 'Orbe 3D', en: '3D orb' },
  { id: 'chapado', name: 'Silhueta', en: 'Silhouette' },
  { id: 'pixel', name: 'Pixel', en: 'Pixel' },
];

const U = 512;
const f = (n: number) => +n.toFixed(2);

/** Região de filtro em volta do quadro 512 (em unidades do símbolo). */
const REGION = `x="-80" y="-80" width="672" height="672" filterUnits="userSpaceOnUse"`;

function outline(defs: Defs, color: string, r: number): string {
  return defs.url(`gi-outline:${color}:${r}`, (id) =>
    `<filter id="${id}" ${REGION} color-interpolation-filters="sRGB">` +
    `<feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/>` +
    `<feFlood flood-color="${color}"/><feComposite in2="d" operator="in" result="o"/>` +
    `<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
}

function bevel(defs: Defs): string {
  return defs.url('gi-bevel', (id) =>
    `<filter id="${id}" ${REGION} color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/>` +
    `<feSpecularLighting in="b" surfaceScale="4" specularConstant=".9" specularExponent="24" lighting-color="#fff" result="s">` +
    `<feDistantLight azimuth="235" elevation="42"/></feSpecularLighting>` +
    `<feComposite in="s" in2="SourceAlpha" operator="in" result="si"/>` +
    `<feOffset in="b" dx="-2" dy="-3" result="o"/>` +
    `<feComposite in="SourceAlpha" in2="o" operator="arithmetic" k2="1" k3="-1" result="edge"/>` +
    `<feFlood flood-color="#000" flood-opacity=".5"/><feComposite in2="edge" operator="in" result="dk"/>` +
    `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="dk"/></feMerge>` +
    `<feComposite in2="si" operator="arithmetic" k2="1" k3=".75" result="lit"/>` +
    `<feComposite in="lit" in2="SourceAlpha" operator="in"/></filter>`);
}

function dropShadow(defs: Defs): string {
  return defs.url('gi-shadow', (id) =>
    `<filter id="${id}" ${REGION} color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#000" flood-opacity=".7"/></filter>`);
}

/** Passos do filtro de pixelar (amostra proporcional ao bloco — não some quando pequeno). */
export function pixelSteps(block: number, sample = 0.5): string {
  const s = +(block * sample).toFixed(3);
  const o = +((block - s) / 2).toFixed(3);
  return `<feFlood x="${o}" y="${o}" width="${s}" height="${s}"/><feComposite width="${block}" height="${block}"/>` +
    `<feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/>` +
    `<feMorphology operator="dilate" radius="${o}"/>`;
}

function pixelate(defs: Defs, block: number): string {
  return defs.url(`gi-pix:${block}`, (id) => `<filter id="${id}" ${REGION}>${pixelSteps(block, block > 32 ? 0.7 : 0.5)}</filter>`);
}

/**
 * Bloco do pixelado em unidades do símbolo (512). Símbolo pequeno → blocos
 * maiores: o ponto de amostra precisa ter ~2 px da carta, senão o navegador o
 * arredonda para zero na tela e o símbolo inteiro some.
 */
function pixBlock(size: number): number {
  return Math.min(128, Math.max(32, Math.round(3.4 / ((size / U) * 0.7))));
}

/** Degradê metálico a partir de uma cor (claro em cima, reflexo no meio, escuro embaixo). */
function metal(defs: Defs, color: string): string {
  return defs.linear([[0, lighten(color, 0.55)], [0.35, lighten(color, 0.12)], [0.52, darken(color, 0.18)], [0.6, lighten(color, 0.08)], [1, darken(color, 0.5)]]);
}

export interface GlyphOpts {
  /** Cor do símbolo (metal/silhueta). */
  color?: string;
  opacity?: number;
  /** Medalhão: cor do aro e do esmalte. */
  ring?: string;
  enamel?: string;
}

/** Símbolo `id` com canto superior esquerdo em (x,y) e lado `size`. */
/** Símbolo da coleção 3D: a imagem entra uma vez nos <defs> e é reaproveitada. */
function image3d(defs: Defs, id: string): string {
  const ref = defs.add(`i3d:${id}`, (did) => `<image id="${did}" href="${ICONS3D[id].src}" width="${U}" height="${U}"/>`);
  return `<use href="#${ref}"/>`;
}

export function drawGlyph(defs: Defs, id: string, style: IconStyle, x: number, y: number, size: number, o: GlyphOpts = {}): string {
  if (ICONS3D[id]) {
    const im = image3d(defs, id);
    const body = style === 'pixel' ? `<g filter="${pixelate(defs, pixBlock(size))}">${im}</g>` : `<g filter="${dropShadow(defs)}">${im}</g>`;
    const op3 = o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : '';
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${+(size / U).toFixed(5)})"${op3}>${body}</g>`;
  }
  const ic = ICONS[id];
  if (!ic) return '';
  const color = o.color ?? '#d3dae3';
  const dark = mix(darken(color, 0.82), '#0b0807', 0.5);
  const path = (fill: string, extra = '') => `<path d="${ic.d}" fill="${fill}"${extra}/>`;
  let inner = '';

  if (style === 'emblema') {
    inner = `<g filter="${dropShadow(defs)}"><g filter="${outline(defs, dark, 6)}"><g filter="${bevel(defs)}">${path(metal(defs, color))}</g></g></g>`;
  } else if (style === 'medalhao') {
    const ring = o.ring ?? '#c9a45c';
    const enamel = o.enamel ?? mix(darken(color, 0.72), '#0d0b10', 0.35);
    const c = U / 2;
    const disc = `M${c - 206} ${c}a206 206 0 1 0 412 0a206 206 0 1 0-412 0Z`;
    const rim = `M${c - 252} ${c}a252 252 0 1 0 504 0a252 252 0 1 0-504 0Z` + disc;
    inner =
      `<g filter="${dropShadow(defs)}"><g filter="${bevel(defs)}"><path d="${rim}" fill-rule="evenodd" fill="${metal(defs, ring)}"/></g></g>` +
      `<path d="${disc}" fill="${defs.radial([[0, lighten(enamel, 0.25)], [0.75, enamel], [1, darken(enamel, 0.5)]], 0.5, 0.4, 0.65)}"/>` +
      `<path d="M${c - 196} ${c}a196 196 0 1 0 392 0a196 196 0 1 0-392 0Z" fill="none" stroke="${lighten(ring, 0.3)}" stroke-width="5" opacity=".55"/>` +
      `<g transform="translate(${U * 0.19} ${U * 0.19}) scale(.62)"><g filter="${outline(defs, dark, 5)}"><g filter="${bevel(defs)}">${path(metal(defs, color))}</g></g></g>`;
  } else if (style === 'orbe') {
    // esfera de vidro: luz de cima à esquerda, borda escura, reflexo no alto e luz rebatida embaixo
    const c = U / 2, R = 244;
    const ball = `M${c - R} ${c}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0-${2 * R} 0Z`;
    const deep = mix(darken(color, 0.72), '#07060a', 0.35);
    // cor clara (aço, branco): o símbolo vai escuro; senão, claro
    const pale = luminance(color) > 0.55;
    const sym = pale ? defs.linear([[0, darken(color, 0.55)], [1, darken(color, 0.82)]]) : defs.linear([[0, '#ffffff'], [0.6, lighten(color, 0.8)], [1, lighten(color, 0.5)]]);
    inner =
      `<g filter="${dropShadow(defs)}"><path d="${ball}" fill="${deep}"/></g>` +
      `<path d="${ball}" fill="${defs.radial([[0, lighten(color, 0.5)], [0.42, color], [0.8, darken(color, 0.45)], [1, deep]], 0.36, 0.3, 0.78)}"/>` +
      `<path d="${ball}" fill="${defs.radial([[0.72, '#000000', 0], [1, '#000000', 0.55]], 0.5, 0.5, 0.5)}"/>` +
      `<ellipse cx="${c - 46}" cy="${c - 150}" rx="128" ry="62" transform="rotate(-18 ${c - 46} ${c - 150})" fill="${defs.linear([[0, '#ffffff', 0.6], [1, '#ffffff', 0]])}"/>` +
      `<path d="M${c - 170} ${c + 128}a214 214 0 0 0 340 0a236 236 0 0 1-340 0Z" fill="${lighten(color, 0.6)}" opacity=".4"/>` +
      `<g transform="translate(${U * 0.16} ${U * 0.17}) scale(.68)"><g filter="${outline(defs, pale ? lighten(color, 0.6) : deep, 9)}">${path(sym)}</g></g>` +
      `<path d="${ball}" fill="none" stroke="${deep}" stroke-width="10"/>`;
  } else if (style === 'chapado') {
    inner = path(color);
  } else {
    inner = `<g filter="${pixelate(defs, pixBlock(size))}"><g filter="${outline(defs, '#0b0a12', 22)}">${path(color)}</g></g>`;
  }
  const k = size / U;
  const op = o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : '';
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${+k.toFixed(5)})"${op}>${inner}</g>`;
}

/**
 * Placa de número (modo "número dentro do símbolo"): medalhão com o símbolo
 * apagado ao fundo — o número vai por cima, sempre legível.
 */
export function drawStatBadge(defs: Defs, id: string, style: IconStyle, cx: number, cy: number, size: number, color: string, ring: string): string {
  const x = cx - size / 2, y = cy - size / 2;
  const k = size / U;
  // símbolo 3D: a própria imagem, um pouco escurecida para o número aparecer
  if (ICONS3D[id]) return `<g transform="translate(${f(x)} ${f(y)}) scale(${+k.toFixed(5)})"><g filter="${dropShadow(defs)}">${image3d(defs, id)}</g><circle cx="${U / 2}" cy="${U / 2}" r="150" fill="#000" opacity=".28"/></g>`;
  const ic = ICONS[id];
  if (!ic) return '';
  const c = U / 2;
  const enamel = mix(darken(color, 0.78), '#0c0a0d', 0.4);
  let base: string;
  if (style === 'orbe') {
    const R = 250, disc = `M${c - R} ${c}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0-${2 * R} 0Z`;
    base = `<g filter="${dropShadow(defs)}"><path d="${disc}" fill="${defs.radial([[0, lighten(color, 0.35)], [0.45, darken(color, 0.25)], [1, darken(color, 0.8)]], 0.36, 0.3, 0.8)}"/></g>` +
      `<ellipse cx="${c - 46}" cy="${c - 150}" rx="128" ry="62" transform="rotate(-18 ${c - 46} ${c - 150})" fill="${defs.linear([[0, '#ffffff', 0.6], [1, '#ffffff', 0]])}"/>`;
  } else if (style === 'chapado') {
    base = `<path d="M${c - 250} ${c}a250 250 0 1 0 500 0a250 250 0 1 0-500 0Z" fill="${enamel}"/>` +
      `<path d="M${c - 238} ${c}a238 238 0 1 0 476 0a238 238 0 1 0-476 0Z" fill="none" stroke="${color}" stroke-width="22"/>`;
  } else if (style === 'pixel') {
    base = `<g filter="${pixelate(defs, pixBlock(size))}"><path d="M${c - 250} ${c}a250 250 0 1 0 500 0a250 250 0 1 0-500 0Z" fill="${color}"/>` +
      `<path d="M${c - 205} ${c}a205 205 0 1 0 410 0a205 205 0 1 0-410 0Z" fill="${enamel}"/></g>`;
  } else {
    const disc = `M${c - 210} ${c}a210 210 0 1 0 420 0a210 210 0 1 0-420 0Z`;
    base = `<g filter="${dropShadow(defs)}"><g filter="${bevel(defs)}"><path d="M${c - 252} ${c}a252 252 0 1 0 504 0a252 252 0 1 0-504 0Z${disc}" fill-rule="evenodd" fill="${metal(defs, ring)}"/></g></g>` +
      `<path d="${disc}" fill="${defs.radial([[0, lighten(enamel, 0.3)], [0.8, enamel], [1, darken(enamel, 0.5)]], 0.5, 0.4, 0.65)}"/>`;
  }
  const ghost = `<g transform="translate(${U * 0.16} ${U * 0.16}) scale(.68)" opacity=".38"><path d="${ic.d}" fill="${lighten(color, 0.2)}"/></g>`;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${+k.toFixed(5)})">${base}${ghost}</g>`;
}
