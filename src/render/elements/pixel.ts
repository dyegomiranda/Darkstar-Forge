/**
 * Estilo PIXEL — janelas de RPG 16-bit: tudo numa grade de pixels, borda em
 * degraus com luz e sombra, miolo em faixas de tom, sombra dura, fonte pixelada
 * e ícones desenhados pixel a pixel.
 */
import { darken, lighten } from '../color';
import { vivid, type Palette } from '../palette';
import { inset, pixelArt, pixelRect, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center, shades4 } from './common';
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

/** Cores da janela a partir do deck (em híbrida, usa a 1ª cor na moldura). */
function tones(pal: Palette) {
  const v = vivid(pal.base);
  return { light: lighten(v, 0.55), mid: v, dark: darken(v, 0.35), deep: darken(v, 0.62), deeper: darken(v, 0.75) };
}

/**
 * Janela de RPG: contorno preto, borda clara com sombra em degrau e miolo em
 * faixas sólidas (o "degradê" de 16-bit: 4 tons, sem mistura).
 * `thin` = borda de 2 pixels (caixas pequenas: tipo, rodapé, ATK/DEF).
 */
function windowBox(a: PieceArgs, b0: Box, content: (b: Box, border: number) => Box, text: TextLook, steps = 2, thin = false): PieceOut {
  const { defs, pal } = a;
  const b = snap(b0);
  const t = tones(pal);
  const border = thin ? P * 2 : P * 3;
  const fillB = inset(b, border);
  const fillD = pixelRect(fillB, P, Math.max(1, steps - 1));
  const cid = defs.add(`pxclip:${b.x}:${b.y}:${b.w}`, (id) => `<clipPath id="${id}"><path d="${fillD}"/></clipPath>`);
  // colunas por cor (híbrida) × faixas horizontais de tom
  const n = a.fill ? 1 : pal.colors.length;
  const colW = Math.round(fillB.w / n / P) * P;
  const rows = [0.28, 0.24, 0.24, 0.24];
  let bands = '';
  (a.fill ? [a.fill] : pal.colors).forEach((c, i) => {
    const v = vivid(c);
    const shades = a.fill ? shades4(a.fill) : [darken(v, 0.48), darken(v, 0.56), darken(v, 0.62), darken(v, 0.68)];
    const x = fillB.x + i * colW;
    const w = i === n - 1 ? fillB.w - i * colW : colW;
    let y = fillB.y;
    rows.forEach((r, k) => {
      const h = k === rows.length - 1 ? fillB.y + fillB.h - y : Math.max(P, Math.round((fillB.h * r) / P) * P);
      bands += crisp(`M${x} ${y}h${w}v${h}h${-w}Z`, shades[k]);
      y += h;
    });
  });
  // bordas são ANÉIS (furo no lugar do miolo): com o miolo transparente aparece a arte, não outra camada
  const ring = (d: string, fill: string, extra = '') => crisp(d + fillD, fill, ` fill-rule="evenodd"${extra}`);
  const svg =
    ring(pixelRect(b, P, steps), '#000', ` opacity="${+(0.55 * a.opacity).toFixed(3)}" transform="translate(${P} ${P})"`) +
    ring(pixelRect(b, P, steps), OUT) +
    ring(pixelRect(inset(b, P), P, steps), t.light) +
    (thin ? '' : ring(pixelRect({ ...inset(b, P), x: b.x + P * 2, y: b.y + P * 2 }, P, steps), t.dark) +
      ring(pixelRect(inset(b, P * 2), P, Math.max(1, steps - 1)), t.mid)) +
    `<g clip-path="url(#${cid})" opacity="${a.opacity}">${bands}</g>` +
    // brilho de 1 pixel no topo do miolo
    crisp(`M${fillB.x + P} ${fillB.y}h${fillB.w - 2 * P}v${P}h${-(fillB.w - 2 * P)}Z`, lighten(t.deep, 0.12), ` opacity="${a.opacity}"`);
  return { svg, content: content(b, border), text };
}

const txt = (color = INK): TextLook => ({ family: FONT, weight: 500, color, hard: true });
/** Números e rodapé: Silkscreen (algarismos mais legíveis que os da Pixelify — o 5 não vira S). */
const num = (color = INK): TextLook => ({ family: 'Silkscreen', weight: 400, color, hard: true });

const GEM = ['...O...', '..OWO..', '.OWCCO.', 'OWCCCDO', '.OCCDO.', '..ODO..', '...O...'];
const STAR = ['...O...', '..OWO..', 'OOWCWOO', 'OWCCCWO', '.OWCWO.', 'OWO.OWO', 'OO...OO'];

function badge(a: PieceArgs, small = false): PieceOut {
  const { pal } = a;
  const b = snap(inset(a.box, small ? 6 : 0));
  const t = tones(pal);
  const steps = small ? 2 : 4;
  const core = pixelRect(inset(b, P * 3), P, Math.max(1, steps - 2));
  const ring = (d: string, fill: string, extra = '') => crisp(d + core, fill, ` fill-rule="evenodd"${extra}`);
  const svg =
    ring(pixelRect(b, P, steps), '#000', ` opacity="${+(0.55 * a.opacity).toFixed(3)}" transform="translate(${P} ${P})"`) +
    ring(pixelRect(b, P, steps), OUT) +
    ring(pixelRect(inset(b, P), P, steps - 1), t.light) +
    ring(pixelRect({ ...inset(b, P), x: b.x + 2 * P, y: b.y + 2 * P }, P, steps - 1), t.dark) +
    ring(pixelRect(inset(b, P * 2), P, steps - 1), t.mid) +
    crisp(core, t.deep, ` fill-opacity="${a.opacity}"`);
  const c = inset(b, P * 3.5);
  return { svg, content: c, text: num() };
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
      const p = windowBox(a, inset(a.box, 12, 0), (b, bd) => ({ x: b.x + bd + P * 2, y: b.y + bd, w: b.w - 2 * bd - P * 11, h: b.h - 2 * bd }), txt(), 2, true);
      const b = snap(inset(a.box, 12, 0));
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
    render: (a) => windowBox(a, inset(a.box, 2, 2), (b, bd) => inset(b, bd + P, bd), num(), 2, true),
  },
  {
    style: 'pixel', kind: 'footer', opacity: 1, metal: 'deck',
    render: (a) => windowBox(a, inset(a.box, 0, -2), (b, bd) => inset(b, bd + P, bd), num('#e8e8e8'), 1, true),
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
