/**
 * Estilo LENDA — a arte ocupa a carta inteira e o texto vai direto sobre ela,
 * sem caixas: uma sombra sobe da base para dar leitura, o nome fica grande e
 * centrado, com um fio dourado de cada lado da joia de raridade. Custo numa
 * gema redonda com aro de ouro; ataque e defesa em gemas nos cantos de baixo.
 * Inspirado nos jogos de cartas digitais atuais (arte primeiro, moldura mínima).
 */
import { darken, lighten, mix } from '../color';
import { CARD_H, CARD_RADIUS, CARD_W, type Skeleton } from '../layout';
import { vivid, type Palette } from '../palette';
import { diamond, inset, pill, roundRect, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center, fadeLine, metalBand } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const TITLE = 'Cinzel';
const SANS = 'Noto Sans';
const NUM = 'Cinzel';
const INK = '#fbf7ee';
const GOLD = '#e2c37a';

const shadowText = (color = INK, weight = 500, family = SANS): TextLook => ({ family, weight, color, shadow: '#000' });

export function lendaLayout(rulesH: number): Partial<Skeleton> {
  const rules = { x: 74, y: 946 - rulesH, w: 602, h: rulesH };
  const typeBar = { x: 130, y: rules.y - 46, w: 490, h: 56 };
  return {
    rules, typeBar,
    header: { x: 34, y: typeBar.y - 78, w: 682, h: 84 },
    cost: { x: 26, y: 26, w: 124, h: 124 },
    class: { x: 618, y: 36, w: 100, h: 100 },
    atk: { x: 22, y: 950, w: 142, h: 80 },
    def: { x: 586, y: 950, w: 142, h: 80 },
    set: { x: 351, y: 958, w: 48, h: 48 },
    footer: { x: 235, y: 1010, w: 280, h: 26 },
  };
}

/** Gema redonda (ou cápsula) com aro de ouro em relevo. */
function jewel(a: PieceArgs, box: Box, color: string, pad = 4): PieceOut {
  const { defs } = a;
  const { cx, cy } = center(box);
  const R = Math.min(box.w, box.h) / 2 - pad;
  const ext = Math.max(0, (box.w - box.h) / 2);
  const ri = R - 8;
  const svg =
    `<g filter="${defs.shadow(5, 8, 0.65)}">${metalBand(defs, a.pal, pill(cx, cy, R, ext) + pill(cx, cy, ri, ext), 2.2)}</g>` +
    `<path d="${pill(cx, cy, ri, ext)}" fill="${a.fill ?? defs.radial([[0, lighten(color, 0.35)], [0.5, color], [1, darken(color, 0.72)]], 0.4, 0.3, 0.8)}" opacity="${a.opacity}"/>` +
    `<path d="${pill(cx, cy, ri, ext)}" fill="${defs.radial([[0.7, '#000', 0], [1, '#000', 0.5]])}"/>` +
    `<ellipse cx="${cx}" cy="${cy - ri * 0.5}" rx="${ri * 0.6 + ext}" ry="${ri * 0.3}" fill="${defs.linear([[0, '#ffffff', 0.42], [1, '#ffffff', 0]])}"/>`;
  const ci = ri * 0.76;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: { family: NUM, weight: 700, color: '#ffffff', shadow: '#000' }, iconColor: '#ffffff' };
}

/** Fundo da gema do custo: escuro, puxado para a cor da carta (os símbolos coloridos precisam aparecer). */
const deep = (pal: Palette) => mix(darken(vivid(pal.base), 0.62), '#0d0d12', 0.3);

export const lenda: PieceStyle[] = [
  {
    // nome: sem caixa; um fio dourado de cada lado, deixando o meio livre para a joia de raridade
    style: 'lenda', kind: 'header', opacity: 1, metal: 'gold',
    render(a) {
      const b = a.box;
      const y = b.y + b.h + 12, cx = b.x + b.w / 2, half = b.w * 0.36;
      const line = (x0: number, x1: number, flip: boolean) =>
        `<rect x="${Math.min(x0, x1)}" y="${y - 1}" width="${Math.abs(x1 - x0)}" height="2" fill="${a.defs.linear(flip ? [[0, GOLD, 0.95], [1, GOLD, 0]] : [[0, GOLD, 0], [1, GOLD, 0.95]], 'h')}"/>`;
      const svg = line(cx - half, cx - 26, false) + line(cx + 26, cx + half, true);
      return { svg, content: inset(b, 10, 4), text: { family: TITLE, weight: 700, color: INK, caps: true, tracking: 0.03, shadow: '#000' } };
    },
  },
  { style: 'lenda', kind: 'cost', opacity: 1, metal: 'gold', render: (a) => jewel(a, a.box, deep(a.pal)) },
  {
    style: 'lenda', kind: 'class', opacity: 1, metal: 'gold',
    render: (a) => ({ ...jewel(a, a.box, '#17161b', 8), iconColor: lighten(vivid(a.pal.base), 0.45) }),
  },
  { style: 'lenda', kind: 'set', opacity: 1, metal: 'gold', render: (a) => ({ svg: '', content: inset(a.box, 4), text: shadowText() }) },
  {
    // tipo: só o texto, em versalete espaçado na cor da carta; a joia de raridade fica em cima, entre os fios
    style: 'lenda', kind: 'typeBar', opacity: 1, metal: 'gold',
    render(a) {
      const b = a.box;
      const cx = b.x + b.w / 2;
      return {
        svg: '', align: 'center', content: { x: b.x, y: b.y + 22, w: b.w, h: b.h - 22 },
        text: { family: SANS, weight: 600, color: lighten(vivid(a.pal.base), 0.62), caps: true, tracking: 0.22, shadow: '#000' },
        gem: { x: cx - 13, y: b.y - 7, w: 26, h: 26 },
      };
    },
    gemRender: (g, color, defs) => {
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      return `<path d="${diamond(cx, cy, g.w / 2 + 2, g.h / 2 + 2)}" fill="${GOLD}"/>` +
        `<path d="${diamond(cx, cy, g.w / 2 - 1.5, g.h / 2 - 1.5)}" fill="${color}" filter="${defs.glow(color, 5, 0.8)}"/>` +
        `<path d="${diamond(cx, cy, g.w / 2 - 1.5, g.h / 2 - 1.5)}" fill="${defs.linear([[0, '#ffffff', 0.6], [0.5, '#ffffff', 0], [1, '#000000', 0.35]], 'd')}"/>`;
    },
  },
  {
    // regras: texto claro, centrado, direto sobre a sombra da base
    style: 'lenda', kind: 'rules', opacity: 1, metal: 'gold',
    render(a) {
      const b = a.box;
      const svg = a.fill ? `<path d="${roundRect(b, 16)}" fill="${a.fill}" fill-opacity="${a.opacity}"/>` : '';
      return { svg, align: 'center', content: inset(b, 16, 20), text: shadowText('#f4f0e8', 400) };
    },
    divider(a, x, y, w) {
      return fadeLine(a.defs, x + w * 0.3, y, w * 0.4, GOLD, 1.5, 0.75);
    },
    flavor: () => ({ family: 'EB Garamond', weight: 400, italic: true, color: '#d4cdbd', shadow: '#000' }),
  },
  {
    style: 'lenda', kind: 'stat', opacity: 1, metal: 'gold',
    render: (a) => jewel(a, inset(a.box, 2, 4), a.variant === 'atk' ? '#b6481f' : '#2c5f9e', 2),
  },
  { style: 'lenda', kind: 'footer', opacity: 1, metal: 'gold', render: (a) => ({ svg: '', content: a.box, text: { ...shadowText('#cfc8b8', 500), tracking: 0.06 } }) },
  {
    // moldura: a sombra que sobe da base (leitura do texto), um véu no topo e um fio de ouro por dentro da borda
    style: 'lenda', kind: 'frame', opacity: 1, metal: 'gold',
    render(a) {
      const { defs, pal } = a;
      const top = (a.layout?.header.y ?? 620) - 150;
      const tint = mix(darken(vivid(pal.base), 0.9), '#050507', 0.55);
      const svg =
        `<rect x="0" y="${top}" width="${CARD_W}" height="${CARD_H - top}" fill="${defs.linear([[0, tint, 0], [0.3, tint, 0.72], [0.55, tint, 0.93], [1, tint, 0.98]])}" opacity="${a.opacity}"/>` +
        `<rect x="0" y="0" width="${CARD_W}" height="210" fill="${defs.linear([[0, '#000000', 0.55], [1, '#000000', 0]])}" opacity="${a.opacity}"/>` +
        `<path d="${roundRect(inset(a.box, 13), CARD_RADIUS - 13)}" fill="none" stroke="${defs.linear([[0, GOLD, 0.9], [0.5, GOLD, 0.35], [1, GOLD, 0.9]])}" stroke-width="2"/>`;
      return { svg, content: inset(a.box, 13), text: shadowText() };
    },
  },
];
