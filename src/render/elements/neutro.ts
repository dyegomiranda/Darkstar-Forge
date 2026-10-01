/**
 * Estilo NEUTRO — vidro escuro: painéis de vidro fosco sobre a arte (a arte
 * aparece desfocada por trás), contorno de luz fino, um fio luminoso na cor da
 * carta e símbolos em orbes de vidro. Sem ornamento: a arte manda.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { vivid, type Palette } from '../palette';
import { inset, pill, roundRect, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center, fadeLine } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const SANS = 'Noto Sans';
const TITLE = 'Marcellus';
const NUM = 'Barlow Condensed';
const INK = '#f6f3ee';

/** Cor de destaque (a cor da carta, viva e clara). */
const accent = (pal: Palette) => lighten(vivid(pal.base), 0.22);
/** Destaque como tinta: nas cartas de várias cores vira degradê. */
const accentPaint = (a: PieceArgs) => a.defs.hue(a.pal, (c) => lighten(vivid(c), 0.22));
/** Vidro: quase preto, levemente tingido pela cor da carta. */
const glassTint = (a: PieceArgs) => a.fill ?? mix(darken(vivid(a.pal.base), 0.84), '#0c0d11', 0.62);

const text = (color = INK, weight = 500, family = SANS): TextLook => ({ family, weight, color });

/**
 * Painel de vidro fosco: sombra suave, vidro tingido, brilho descendo do topo e
 * contorno de luz (claro em cima, quase invisível embaixo).
 */
function glass(a: PieceArgs, d: string, edge: string, o: { tint?: number; shadow?: boolean } = {}): string {
  const k = (o.tint ?? 0.74) * a.opacity;
  return `<g${o.shadow === false ? '' : ` filter="${a.defs.shadow(5, 9, 0.5)}"`}><path d="${d}" fill="${glassTint(a)}" fill-opacity="${+k.toFixed(3)}"/></g>` +
    `<path d="${d}" fill="${a.defs.linear([[0, '#ffffff', 0.13], [0.45, '#ffffff', 0.02], [1, '#000000', 0.16]])}" opacity="${a.opacity}"/>` +
    `<path d="${edge}" fill="none" stroke="${a.defs.linear([[0, '#ffffff', 0.6], [0.3, '#ffffff', 0.16], [1, '#ffffff', 0.07]])}" stroke-width="1.5"/>`;
}

/** Fio luminoso na cor da carta (some nas pontas). */
function glowLine(a: PieceArgs, x: number, y: number, w: number, width = 2.5): string {
  const c = accent(a.pal);
  return `<g filter="${a.defs.glow(vivid(a.pal.base), 4, 0.9)}">` +
    (a.pal.hybrid
      ? `<rect x="${x}" y="${y - width / 2}" width="${w}" height="${width}" rx="${width / 2}" fill="${accentPaint(a)}"/>`
      : fadeLine(a.defs, x, y, w, c, width)) + `</g>`;
}

/** Selo de custo: cápsula de vidro escuro; quem brilha são os símbolos (orbes na cor do recurso). */
function costSeal(a: PieceArgs): PieceOut {
  const { cx, cy } = center(a.box);
  const r = Math.min(a.box.w, a.box.h) / 2 - 9;
  const ext = Math.max(0, (a.box.w - a.box.h) / 2);
  const d = pill(cx, cy, r, ext);
  const svg = glass(a, d, pill(cx, cy, r - 0.75, ext), { tint: 0.9 }) +
    `<path d="${pill(cx, cy, r - 4, ext)}" fill="none" stroke="${accentPaint(a)}" stroke-opacity=".8" stroke-width="2" filter="${a.defs.glow(vivid(a.pal.base), 3, 0.7)}"/>`;
  const ci = r * 0.74;
  return { svg, glass: d, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: text(INK, 700, NUM) };
}

/** Selo de classe: sem fundo — o próprio símbolo é a joia. */
function classSeal(a: PieceArgs): PieceOut {
  const b = inset(a.box, 10);
  return { svg: '', content: b, text: text(INK, 700, NUM), iconColor: accent(a.pal) };
}

export const neutro: PieceStyle[] = [
  {
    style: 'neutro', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 0, 7);
      const d = roundRect(b, 18);
      const svg = glass(a, d, roundRect(inset(b, 0.75), 17.5)) + glowLine(a, b.x + 46, b.y + b.h - 2, b.w - 92);
      return { svg, glass: d, content: inset(b, 30, 7), text: { ...text(INK, 400, TITLE), tracking: 0.02 } };
    },
  },
  { style: 'neutro', kind: 'cost', opacity: 1, metal: 'silver', render: costSeal },
  { style: 'neutro', kind: 'class', opacity: 1, metal: 'silver', render: classSeal },
  {
    style: 'neutro', kind: 'set', opacity: 1, metal: 'silver',
    render: (a) => ({ svg: '', content: inset(a.box, 10), text: text() }),
  },
  {
    // tipo: cápsula de vidro com um ponto de luz na cor da carta
    style: 'neutro', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b: Box = { x: a.box.x + 14, y: a.box.y + 9, w: a.box.w - 28, h: a.box.h - 20 };
      const { cy } = center(b);
      const d = roundRect(b, b.h / 2);
      const svg = glass(a, d, roundRect(inset(b, 0.75), b.h / 2 - 0.75), { tint: 0.8 }) +
        `<circle cx="${b.x + 26}" cy="${cy}" r="5" fill="${accent(a.pal)}" filter="${a.defs.glow(vivid(a.pal.base), 4, 0.95)}"/>`;
      return {
        svg, glass: d, content: { x: b.x + 44, y: b.y + 2, w: b.w - 110, h: b.h - 4 },
        text: { ...text('#e4e1db', 600), caps: true, tracking: 0.1 },
        gem: { x: b.x + b.w - 44, y: cy - 11, w: 22, h: 22 },
      };
    },
    gemRender: (g, color, defs) => {
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2, s = g.w * 0.62;
      const sq = `x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" rx="3" transform="rotate(45 ${cx} ${cy})"`;
      return `<rect ${sq} fill="${color}" filter="${defs.glow(color, 4, 0.8)}"/>` +
        `<rect ${sq} fill="${defs.linear([[0, '#ffffff', 0.65], [0.5, '#ffffff', 0], [1, '#000000', 0.3]], 'd')}"/>`;
    },
  },
  {
    style: 'neutro', kind: 'rules', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const d = roundRect(b, 22);
      const svg = glass(a, d, roundRect(inset(b, 0.75), 21.5), { tint: 0.8 }) + glowLine(a, b.x + 90, b.y + 1.5, b.w - 180, 2);
      return { svg, glass: d, content: inset(b, 34, 28), text: text('#f0ede8', 400) };
    },
    divider(a, x, y, w) {
      return fadeLine(a.defs, x + w * 0.22, y, w * 0.56, accent(a.pal), 1.5, 0.8);
    },
    flavor: () => ({ family: SANS, weight: 400, italic: true, color: '#b3b1ad' }),
  },
  {
    // ataque e defesa: cápsulas de vidro; o ataque com aro quente, a defesa com aro frio
    style: 'neutro', kind: 'stat', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 4, 8);
      const d = roundRect(b, b.h / 2);
      const ring = a.variant === 'atk' ? '#ffb45c' : '#7db8ff';
      const svg = glass(a, d, roundRect(inset(b, 0.75), b.h / 2 - 0.75), { tint: 0.86 }) +
        `<path d="${roundRect(inset(b, 2.5), b.h / 2 - 2.5)}" fill="none" stroke="${ring}" stroke-opacity=".75" stroke-width="2" filter="${a.defs.glow(ring, 3, 0.6)}"/>`;
      return { svg, glass: d, content: inset(b, 16, 6), text: text(INK, 700, NUM) };
    },
  },
  {
    style: 'neutro', kind: 'footer', opacity: 1, metal: 'silver',
    render: (a) => ({ svg: '', content: a.box, text: { ...text('#cfccc6', 500), tracking: 0.04 } }),
  },
  {
    // moldura: um aro fino na cor da carta e um fio de luz por dentro (a arte continua ocupando a carta toda)
    style: 'neutro', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const b = a.box;
      const svg = `<path d="${roundRect(inset(b, 11), CARD_RADIUS - 11)}" fill="none" stroke="${accentPaint(a)}" stroke-width="3" opacity=".9"/>` +
        `<path d="${roundRect(inset(b, 17), CARD_RADIUS - 17)}" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="1.2"/>`;
      return { svg, content: inset(b, 17), text: text() };
    },
  },
];
