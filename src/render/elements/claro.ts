/**
 * Estilo CLARO — carta clara e limpa, de design atual: fundo de papel, arte numa
 * janela de cantos arredondados, painéis brancos com sombra suave, uma faixa na
 * cor da carta para o tipo e letra escura sem serifa. Custo num disco branco
 * de aro colorido, classe num disco cheio; ataque cheio na cor, defesa em contorno.
 */
import { darken, lighten, luminance, mix } from '../color';
import type { Defs } from '../defs';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { inset, pill, rect, roundRect, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const SANS = 'Noto Sans';
const NUM = 'Barlow Condensed';
const INK = '#1f1d1a';
const PAPER = '#f5f2ec';

/** Cor da carta, chapada (várias cores: degradê no modo de mistura escolhido). */
const flat = (defs: Defs, pal: Palette) => defs.hue(pal, (c) => darken(vivid(c), 0.06));
/** Letra que contrasta com a cor da carta. */
const inkOn = (pal: Palette) => (luminance(vivid(pal.base)) > 0.5 ? INK : '#ffffff');
const text = (color = INK, weight = 500, family = SANS): TextLook => ({ family, weight, color });

/** Painel branco com sombra suave. */
function card(a: PieceArgs, d: string, fill = '#ffffff'): string {
  return `<g filter="${a.defs.shadow(4, 8, 0.28)}"><path d="${d}" fill="${a.fill ?? fill}" fill-opacity="${a.opacity}"/></g>`;
}

function disc(a: PieceArgs, solid: boolean): PieceOut {
  const { defs, pal } = a;
  const { cx, cy } = center(a.box);
  const r = Math.min(a.box.w, a.box.h) / 2 - 8;
  const ext = Math.max(0, (a.box.w - a.box.h) / 2);
  const svg = card(a, pill(cx, cy, r, ext)) +
    (solid
      ? `<path d="${pill(cx, cy, r - 5, ext)}" fill="${a.fill ?? flat(defs, pal)}"/><path d="${pill(cx, cy, r - 5, ext)}" fill="${defs.linear([[0, '#ffffff', 0.22], [0.5, '#ffffff', 0], [1, '#000000', 0.14]])}"/>`
      : `<path d="${pill(cx, cy, r - 5, ext)}" fill="none" stroke="${flat(defs, pal)}" stroke-width="5"/>`);
  const ci = (r - 5) * 0.74;
  const on = solid ? inkOn(pal) : darken(vivid(pal.base), 0.2);
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: text(solid ? inkOn(pal) : INK, 700, NUM), iconColor: on };
}

export const claro: PieceStyle[] = [
  {
    style: 'claro', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 0, 9);
      const svg = card(a, roundRect(b, b.h / 2));
      return { svg, content: inset(b, 34, 6), text: { ...text(INK, 700), tracking: 0.01 } };
    },
  },
  // custo: disco branco com aro grosso (os símbolos têm a cor do recurso); classe: disco cheio na cor da carta
  { style: 'claro', kind: 'cost', opacity: 1, metal: 'silver', render: (a) => disc(a, false) },
  { style: 'claro', kind: 'class', opacity: 1, metal: 'silver', render: (a) => disc(a, true) },
  { style: 'claro', kind: 'set', opacity: 1, metal: 'silver', render: (a) => ({ svg: '', content: inset(a.box, 8), text: text() }) },
  {
    // tipo: faixa na cor da carta, letra em versalete
    style: 'claro', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b: Box = { x: a.box.x + 14, y: a.box.y + 10, w: a.box.w - 28, h: a.box.h - 22 };
      const { cy } = center(b);
      const d = roundRect(b, 12);
      const svg = `<g filter="${a.defs.shadow(3, 5, 0.25)}"><path d="${d}" fill="${a.fill ?? flat(a.defs, a.pal)}" fill-opacity="${a.opacity}"/></g>` +
        `<path d="${d}" fill="${a.defs.linear([[0, '#ffffff', 0.18], [1, '#000000', 0.1]])}"/>`;
      return {
        svg, content: { x: b.x + 22, y: b.y + 1, w: b.w - 90, h: b.h - 2 },
        text: { ...text(a.fill ? (luminance(a.fill) > 0.5 ? INK : '#ffffff') : inkOn(a.pal), 700), caps: true, tracking: 0.08 },
        gem: { x: b.x + b.w - 42, y: cy - 11, w: 22, h: 22 },
      };
    },
    gemRender: (g, color) => {
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      return `<circle cx="${cx}" cy="${cy}" r="${g.w / 2}" fill="#ffffff"/><circle cx="${cx}" cy="${cy}" r="${g.w / 2 - 3.5}" fill="${luminance(color) > 0.8 ? '#b9b4aa' : color}"/>`;
    },
  },
  {
    style: 'claro', kind: 'rules', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const svg = card(a, roundRect(b, 20)) +
        `<path d="${roundRect(inset(b, 0.75), 19.5)}" fill="none" stroke="${mix(vivid(a.pal.base), '#c9c4ba', 0.7)}" stroke-width="1.5"/>`;
      return { svg, content: inset(b, 32, 26), text: text(INK, 400) };
    },
    divider(a, x, y, w) {
      return `<rect x="${x + w * 0.38}" y="${y - 1.5}" width="${w * 0.24}" height="3" rx="1.5" fill="${flat(a.defs, a.pal)}"/>`;
    },
    flavor: () => ({ family: SANS, weight: 400, italic: true, color: '#6f6a62' }),
  },
  {
    // ataque: cápsula cheia na cor da carta; defesa: cápsula branca com contorno
    style: 'claro', kind: 'stat', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 4, 8);
      const d = roundRect(b, b.h / 2);
      const atk = a.variant === 'atk';
      const svg = card(a, d, atk ? vivid(a.pal.base) : '#ffffff') +
        (atk ? `<path d="${d}" fill="${a.fill ?? flat(a.defs, a.pal)}"/>` : `<path d="${roundRect(inset(b, 1.5), b.h / 2 - 1.5)}" fill="none" stroke="${flat(a.defs, a.pal)}" stroke-width="3"/>`);
      return { svg, content: inset(b, 16, 6), text: text(atk ? inkOn(a.pal) : INK, 700, NUM), iconColor: atk ? inkOn(a.pal) : darken(vivid(a.pal.base), 0.15) };
    },
  },
  { style: 'claro', kind: 'footer', opacity: 1, metal: 'silver', render: (a) => ({ svg: '', content: a.box, text: { ...text('#6b665e', 600), tracking: 0.04 } }) },
  {
    // moldura: papel claro por baixo; a arte aparece numa janela arredondada, do topo até o meio da faixa do tipo
    style: 'claro', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const { box: b, defs, pal } = a;
      const L = a.layout;
      const bottom = L ? L.typeBar.y + L.typeBar.h / 2 : 620;
      const win: Box = { x: 26, y: 26, w: b.w - 52, h: bottom - 26 };
      const paper = a.fill ?? mix(PAPER, vivid(pal.base), 0.05);
      const under = `<path d="${rect(b)}" fill="${paper}"/>` +
        `<path d="${rect(b)}" fill="${defs.linear([[0, '#ffffff', 0.5], [1, '#000000', 0.06]])}"/>`;
      const svg = `<path d="${roundRect(inset(win, 0.75), 21.5)}" fill="none" stroke="${lighten(vivid(pal.base), 0.1)}" stroke-opacity=".55" stroke-width="1.5"/>` +
        `<path d="${roundRect(inset(b, 5), CARD_RADIUS - 5)}" fill="none" stroke="${flat(defs, pal)}" stroke-width="4"/>`;
      return { svg, under, artClip: roundRect(win, 22), content: win, text: text() };
    },
  },
];
