/**
 * Estilo NEUTRO — limpo, para cartas que não são de classe (recursos,
 * equipamentos): linhas finas, painéis escuros translúcidos, letra sem serifa
 * e quase nenhum ornamento. A cor da carta aparece só num filete; o resto é
 * grafite. Sem selos por padrão: a barra do nome ocupa a largura toda.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { circle, inset, roundRect, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const SANS = 'Noto Sans';
const TITLE = 'Marcellus';
const INK = '#f2f0ec';

/** Cor de destaque discreta (a cor da carta, menos saturada). */
const accent = (pal: Palette) => mix(lighten(vivid(pal.base), 0.15), '#c8c4bc', 0.45);
/** Grafite do painel. */
const panelFill = (a: PieceArgs) => a.fill ?? '#15161a';

/** Painel: fundo grafite translúcido + contorno de 1 px. */
function panel(a: PieceArgs, b: Box, r: number, line = true): string {
  return `<path d="${roundRect(b, r)}" fill="${panelFill(a)}" fill-opacity="${+(0.82 * a.opacity).toFixed(3)}"/>` +
    (line ? `<path d="${roundRect(inset(b, 0.75), r)}" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="1.5"/>` : '');
}

/** Filete na cor da carta. */
const rule = (a: PieceArgs, x: number, y: number, w: number, h = 3) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${accent(a.pal)}"/>`;

const text = (color = INK, weight = 500, family = SANS): TextLook => ({ family, weight, color });

/** Selo redondo simples (quando o usuário quiser mostrar custo ou classe). */
function disc(a: PieceArgs): PieceOut {
  const { cx, cy } = center(a.box);
  const r = Math.min(a.box.w, a.box.h) / 2 - 8;
  const ext = Math.max(0, (a.box.w - a.box.h) / 2);
  const d = ext ? roundRect({ x: cx - r - ext, y: cy - r, w: 2 * (r + ext), h: 2 * r }, r) : circle(cx, cy, r);
  const svg = `<path d="${d}" fill="${panelFill(a)}" fill-opacity="${+(0.85 * a.opacity).toFixed(3)}"/>` +
    `<path d="${d}" fill="none" stroke="${accent(a.pal)}" stroke-width="2"/>`;
  const ci = r * 0.72;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: text(INK, 700), iconColor: INK };
}

export const neutro: PieceStyle[] = [
  {
    style: 'neutro', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 0, 8);
      const svg = panel(a, b, 10) + rule(a, b.x + 18, b.y + b.h - 3, b.w - 36, 2);
      return { svg, content: inset(b, 22, 8), text: text(INK, 400, TITLE) };
    },
  },
  { style: 'neutro', kind: 'cost', opacity: 1, metal: 'silver', render: disc },
  { style: 'neutro', kind: 'class', opacity: 1, metal: 'silver', render: disc },
  {
    style: 'neutro', kind: 'set', opacity: 1, metal: 'silver',
    render: (a) => ({ svg: '', content: inset(a.box, 10), text: text() }),
  },
  {
    // tipo: só o texto em versalete, com um filete na cor da carta à esquerda
    style: 'neutro', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const { cy } = center(b);
      const svg = panel(a, { x: b.x + 14, y: b.y + 8, w: b.w - 28, h: b.h - 16 }, 6, false) + rule(a, b.x + 14, b.y + 8, 4, b.h - 16);
      return {
        svg, content: { x: b.x + 32, y: b.y + 8, w: b.w - 110, h: b.h - 16 },
        text: { ...text('#d9d6cf', 600), caps: true, tracking: 0.08 },
        gem: { x: b.x + b.w - 54, y: cy - 10, w: 20, h: 20 },
      };
    },
    gemRender: (g, color) => `<rect x="${g.x + 4}" y="${g.y + 4}" width="${g.w - 8}" height="${g.h - 8}" transform="rotate(45 ${g.x + g.w / 2} ${g.y + g.h / 2})" fill="${color}" stroke="#0d0e10" stroke-width="2"/>`,
  },
  {
    style: 'neutro', kind: 'rules', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      return { svg: panel(a, b, 12), content: inset(b, 30, 24), text: text('#ebe8e2', 400) };
    },
    divider(a, x, y, w) {
      return `<rect x="${x + w * 0.3}" y="${y - 0.75}" width="${w * 0.4}" height="1.5" fill="${accent(a.pal)}" opacity=".7"/>`;
    },
    flavor: () => ({ family: SANS, weight: 400, italic: true, color: '#a9a59d' }),
  },
  {
    style: 'neutro', kind: 'stat', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 6, 8);
      return { svg: panel(a, b, b.h / 2), content: inset(b, 14, 4), text: text(INK, 700) };
    },
  },
  {
    style: 'neutro', kind: 'footer', opacity: 1, metal: 'silver',
    render: (a) => ({ svg: '', content: a.box, text: text('#bdb9b1', 500) }),
  },
  {
    // moldura: só um contorno fino (a arte continua ocupando a carta toda)
    style: 'neutro', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const svg = `<path d="${roundRect(inset(b, 12), CARD_RADIUS - 12)}" fill="none" stroke="${darken(accent(a.pal), 0.1)}" stroke-width="2" opacity=".75"/>`;
      return { svg, content: inset(b, 12), text: text() };
    },
  },
];
