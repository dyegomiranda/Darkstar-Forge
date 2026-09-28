/**
 * Estilo PIXEL — janelas de RPG 16-bit: tudo numa grade de pixels, borda em
 * degraus com luz e sombra, pontilhado (dithering), sombra dura, fonte pixelada
 * e ícones desenhados pixel a pixel.
 */
import { darken, lighten } from '../color';
import type { Defs } from '../defs';
import { vivid, type Palette } from '../palette';
import { inset, pixelArt, pixelRect, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

/** Tamanho do "pixel" no espaço 750×1050 (a carta tem 125 pixels de largura). */
export const P = 6;
const FONT = 'Pixelify Sans';
const INK = '#ffffff';
const OUT = '#0b0a12';

const snap = (b: Box): Box => ({
  x: Math.round(b.x / P) * P, y: Math.round(b.y / P) * P, w: Math.round(b.w / P) * P, h: Math.round(b.h / P) * P,
});

const crisp = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}" shape-rendering="crispEdges"${extra}/>`;

/** Pontilhado xadrez (1 pixel sim, 1 não). */
function dither(defs: Defs, color: string): string {
  return defs.url(`dither:${color}`, (id) =>
    `<pattern id="${id}" width="${P * 2}" height="${P * 2}" patternUnits="userSpaceOnUse">` +
    `<rect width="${P}" height="${P}" fill="${color}"/><rect x="${P}" y="${P}" width="${P}" height="${P}" fill="${color}"/></pattern>`);
}

/** Cores da janela a partir do deck (em híbrida, usa a 1ª cor na moldura). */
function tones(pal: Palette) {
  const v = vivid(pal.base);
  return { light: lighten(v, 0.55), mid: v, dark: darken(v, 0.35), deep: darken(v, 0.62), deeper: darken(v, 0.75) };
}

/** Janela: contorno preto, borda clara/escura em degrau, miolo com pontilhado em cima. */
function windowBox(a: PieceArgs, b0: Box, content: (b: Box) => Box, text: TextLook, steps = 2): PieceOut {
  const { defs, pal } = a;
  const b = snap(b0);
  const t = tones(pal);
  const fillB = inset(b, P * 3);
  const fillD = pixelRect(fillB, P, Math.max(1, steps - 1));
  // híbrida: miolo dividido em blocos de cor (sem degradê — pixel não tem degradê)
  let fill = crisp(fillD, t.deep, ` fill-opacity="${a.opacity}"`);
  if (pal.hybrid) {
    const n = pal.colors.length;
    const cid = defs.add(`pxclip:${b.x}:${b.y}`, (id) => `<clipPath id="${id}"><path d="${fillD}"/></clipPath>`);
    const colW = Math.round(fillB.w / n / P) * P;
    fill = `<g clip-path="url(#${cid})" opacity="${a.opacity}">` + pal.colors.map((c, i) =>
      crisp(`M${fillB.x + i * colW} ${fillB.y}h${i === n - 1 ? fillB.w - i * colW : colW}v${fillB.h}h${-(i === n - 1 ? fillB.w - i * colW : colW)}Z`, darken(vivid(c), 0.62))).join('') + `</g>`;
  }
  const band = { ...fillB, h: Math.max(P * 2, Math.round((fillB.h * 0.35) / P) * P) };
  const svg =
    crisp(pixelRect(b, P, steps), '#000', ` opacity=".55" transform="translate(${P} ${P})"`) +
    crisp(pixelRect(b, P, steps), OUT) +
    crisp(pixelRect(inset(b, P), P, steps), t.light) +
    crisp(pixelRect({ ...inset(b, P), x: b.x + P * 2, y: b.y + P * 2 }, P, steps), t.dark) +
    crisp(pixelRect(inset(b, P * 2), P, Math.max(1, steps - 1)), t.mid) +
    fill +
    crisp(`M${band.x} ${band.y}h${band.w}v${band.h}h${-band.w}Z`, dither(defs, t.dark), ` opacity="${a.opacity}"`);
  return { svg, content: content(b), text };
}

const txt = (color = INK): TextLook => ({ family: FONT, weight: 500, color, hard: true });
/** Números e rodapé: Silkscreen (algarismos mais legíveis que os da Pixelify — o 5 não vira S). */
const num = (color = INK): TextLook => ({ family: 'Silkscreen', weight: 400, color, hard: true });

const SWORD = [
  '..........OO',
  '.........OWO',
  '........OWLO',
  '.......OWLO.',
  '......OWLO..',
  '.O...OWLO...',
  'OGO.OWLO....',
  '.OGOWLO.....',
  '..OGGO......',
  '.OBOGGO.....',
  'OBO..OGO....',
  'OO....O.....',
];
const SHIELD = [
  '.OOOOOOOOOO.',
  'OSSSSSSSSSSO',
  'OSLLLLCCCCSO',
  'OSLLLLCCCCSO',
  'OSLLLLCCCCSO',
  'OSCCCCLLLLSO',
  'OSCCCCLLLLSO',
  '.OSCCCLLLSO.',
  '.OSCCCLLLSO.',
  '..OSCCLLSO..',
  '...OSSSSO...',
  '....OOOO....',
];
const GEM = ['...O...', '..OWO..', '.OWCCO.', 'OWCCCDO', '.OCCDO.', '..ODO..', '...O...'];
const STAR = ['...O...', '..OWO..', 'OOWCWOO', 'OWCCCWO', '.OWCWO.', 'OWO.OWO', 'OO...OO'];

function badge(a: PieceArgs, small = false): PieceOut {
  const { pal } = a;
  const b = snap(inset(a.box, small ? 6 : 0));
  const t = tones(pal);
  const steps = small ? 2 : 4;
  const svg =
    crisp(pixelRect(b, P, steps), '#000', ` opacity=".55" transform="translate(${P} ${P})"`) +
    crisp(pixelRect(b, P, steps), OUT) +
    crisp(pixelRect(inset(b, P), P, steps - 1), t.light) +
    crisp(pixelRect({ ...inset(b, P), x: b.x + 2 * P, y: b.y + 2 * P }, P, steps - 1), t.dark) +
    crisp(pixelRect(inset(b, P * 2), P, steps - 1), t.mid) +
    crisp(pixelRect(inset(b, P * 3), P, Math.max(1, steps - 2)), t.deep);
  const c = inset(b, P * 3.5);
  return { svg, content: c, text: num(), pixelIcons: 4 };
}

export const pixel: PieceStyle[] = [
  {
    style: 'pixel', kind: 'header', opacity: 1, metal: 'deck',
    render: (a) => windowBox(a, { x: a.box.x - 6, y: a.box.y + 6, w: a.box.w + 12, h: a.box.h - 6 }, (b) => inset(b, P * 5, P * 3), { ...txt(), weight: 700 }),
  },
  { style: 'pixel', kind: 'cost', opacity: 1, metal: 'deck', render: (a) => badge(a) },
  { style: 'pixel', kind: 'class', opacity: 1, metal: 'deck', render: (a) => badge(a) },
  {
    style: 'pixel', kind: 'set', opacity: 1, metal: 'deck',
    render(a) {
      const t = tones(a.pal);
      const { cx, cy } = center(a.box);
      const s = 7 * P;
      const svg = pixelArt(STAR, Math.round((cx - s / 2) / P) * P, Math.round((cy - s / 2) / P) * P, P, { O: OUT, W: '#fff', C: t.mid });
      return { svg, content: inset(a.box, 20), text: txt() };
    },
  },
  {
    style: 'pixel', kind: 'typeBar', opacity: 1, metal: 'deck',
    render(a) {
      const p = windowBox(a, inset(a.box, 12, 4), (b) => ({ x: b.x + P * 5, y: b.y + P * 3, w: b.w - P * 16, h: b.h - P * 6 }), txt());
      const b = snap(inset(a.box, 12, 4));
      p.gem = { x: b.x + b.w - P * 10, y: b.y + b.h / 2 - 3.5 * P, w: 7 * P, h: 7 * P };
      return p;
    },
    gemRender: (g, color) => pixelArt(GEM, Math.round(g.x / P) * P, Math.round(g.y / P) * P, P, { O: OUT, W: '#fff', C: color, D: darken(color, 0.35) }),
  },
  {
    style: 'pixel', kind: 'rules', opacity: 1, metal: 'deck',
    render: (a) => windowBox(a, a.box, (b) => inset(b, P * 6, P * 5), txt('#f4f4f4'), 3),
    divider(a, x, y, w) {
      const t = tones(a.pal);
      const Y = Math.round(y / P) * P;
      let d = '';
      for (let i = Math.round(x / P) * P; i < x + w; i += P * 3) d += `M${i} ${Y}h${P}v${P}h${-P}Z`;
      return crisp(d, t.light);
    },
    flavor: (pal) => ({ family: FONT, weight: 400, color: lighten(vivid(pal.base), 0.6), hard: true }),
  },
  {
    style: 'pixel', kind: 'stat', opacity: 1, metal: 'deck',
    render(a) {
      const { variant, pal } = a;
      const t = tones(pal);
      const p = windowBox(a, inset(a.box, 2, 2), (b) => inset(b, P * 2, P * 2), num(), 2);
      const c = p.content;
      const u = P / 2; // ícone com pixel menor, 12×12
      const s = 12 * u;
      const colors: Record<string, string> = variant === 'atk'
        ? { O: OUT, W: '#f4f7fb', L: '#9fb0c2', G: '#f0c040', B: '#7a4a22' }
        : { O: OUT, S: '#c9d2dc', L: t.light, C: t.mid };
      p.icon = pixelArt(variant === 'atk' ? SWORD : SHIELD, Math.round((c.x + 2) / u) * u, Math.round((c.y + (c.h - s) / 2) / u) * u, u, colors);
      return p;
    },
  },
  {
    style: 'pixel', kind: 'footer', opacity: 1, metal: 'deck',
    render: (a) => windowBox(a, inset(a.box, 0, -2), (b) => inset(b, P * 3, P * 2), num('#e8e8e8'), 1),
  },
  {
    style: 'pixel', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const t = tones(a.pal);
      const b = a.box;
      const svg = crisp(`M0 0H${b.w}V${b.h}H0Z` + pixelRect(inset(b, P * 3), P, 4), OUT, ' fill-rule="evenodd"') +
        crisp(pixelRect(inset(b, P), P, 4) + pixelRect(inset(b, P * 2), P, 4), t.light, ' fill-rule="evenodd"') +
        crisp(pixelRect(inset(b, P * 2), P, 4) + pixelRect(inset(b, P * 3), P, 4), t.dark, ' fill-rule="evenodd"');
      return { svg, content: inset(b, P * 3), text: txt() };
    },
  },
];
