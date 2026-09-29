/**
 * Estilo PIXEL AÇO — pixel art de metal. Referência: "Trading Card Game Creator
 * vol. 18 — Pixel Art" (Behance): moldura de aço cinza-azulado chanfrada, placa
 * do nome gravada, "slots" escuros para números, medalhão dentado de custo e
 * painel de pedra gasta. O acabamento segue o metal escolhido (aço, ouro,
 * bronze, ferro ou a cor da classe), como as variantes da referência.
 * Desenhado pixel a pixel pelo motor de ./pxengine.
 */
import { darken, lighten, mix } from '../color';
import { CARD_RADIUS } from '../layout';
import { METALS, vivid, type Palette } from '../palette';
import { inset, pixelArt, type Box } from '../shapes';
import type { TextLook } from '../text';
import { center } from './common';
import { band, boxSdf, g, hardShadow, lit, noise, OUT, P, pillSdf, raster, type Paint, type Sdf } from './pxengine';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

const FONT = 'Pixelify Sans';
const SLOT = ['#2d323a', '#282c33', '#23262c', '#1d2025'];
const STONE = ['#cac4b4', '#c0baa9', '#b6af9d', '#aba492'];

interface Trim { hi: string; light: string; mid: string; dark: string; deep: string }

const STEEL: Trim = { hi: '#e4eaf1', light: '#b5c2d0', mid: '#8897a9', dark: '#5d6a7b', deep: '#3c4553' };

/** Tons do metal da moldura conforme a escolha (padrão: aço). */
function trim(pal: Palette): Trim {
  if (pal.metal === 'silver') return STEEL;
  if (pal.metal === 'deck') {
    const v = vivid(pal.base);
    return { hi: mix(STEEL.hi, v, 0.3), light: mix(STEEL.light, v, 0.45), mid: mix(STEEL.mid, v, 0.5), dark: mix(STEEL.dark, v, 0.45), deep: mix(STEEL.deep, v, 0.35) };
  }
  const m = METALS[pal.metal];
  return { hi: lighten(m[0], 0.2), light: m[1], mid: m[5], dark: m[2], deep: m[4] };
}

/** Aro afundado: luz invertida (a borda de cima fica na sombra). */
const sunk = (t: Trim) => ({ light: t.deep, mid: t.dark, dark: t.light });

/** Slot escuro afundado com aro de metal (números, tipo, rodapé). */
function slot(a: PieceArgs, b: Box, radius = 2 * P, thin = false): string {
  const t = trim(a.pal);
  const sdf = boxSdf(b, radius);
  const paint: Paint = (d, light, _x, y) => {
    if (d < P) return [OUT, 'r'];
    if (d < 2 * P) return [lit(light, t), 'r'];
    if (!thin && d < 3 * P) return [lit(light, sunk(t)), 'r'];
    return [band(y, b, SLOT), 'f'];
  };
  return hardShadow(b, sdf, a.opacity) + raster(b, sdf, paint, a.opacity);
}

/** Medalhão dentado (custo, classe, edição); caixa larga vira cápsula. */
function medallion(a: PieceArgs, cx: number, cy: number, r: number, ext: number): string {
  const t = trim(a.pal);
  const sdf = pillSdf(cx, cy, r, ext);
  const core = mix('#3b4150', vivid(a.pal.base), 0.3);
  const b = { x: cx - r - ext, y: cy - r, w: 2 * (r + ext), h: 2 * r };
  const paint: Paint = (d, light, x, y) => {
    if (d < P) return [OUT, 'r'];
    if (d < 2 * P) {
      // dentes: pixels alternados ao longo do aro
      const k = Math.floor((Math.atan2(y - cy, x - (x > cx + ext ? cx + ext : x < cx - ext ? cx - ext : x)) + Math.PI) / (Math.PI / 8)) + Math.floor(x / (2 * P));
      return [k % 2 ? lit(light, t) : t.deep, 'r'];
    }
    if (d < 3 * P) return [OUT, 'r'];
    return [band(y, b, [lighten(core, 0.12), core, darken(core, 0.15), darken(core, 0.28)]), 'f'];
  };
  return raster(b, sdf, paint, a.opacity);
}

const txt = (color: string, weight = 500, hard = false): TextLook => ({ family: FONT, weight, color, hard });
const num = (color: string): TextLook => ({ family: 'Silkscreen', weight: 400, color, hard: true });

const GEM = ['...O...', '..OWO..', '.OWCCO.', 'OWCCCDO', '.OCCDO.', '..ODO..', '...O...'];
const STUD = ['.OO.', 'OWLO', 'OLDO', '.OO.'];
const TAB = ['OOOOOOOOOOOOOO', '.OWWLLLLLLLLDO.', '..OLLMMMMMMDO..', '...OOOOOOOOO...'];

function badge(a: PieceArgs, small = false): PieceOut {
  const box = a.box;
  const { cx, cy } = center(box);
  const ext = Math.max(0, (box.w - box.h) / 2);
  const t = trim(a.pal);
  if (small) {
    const r = Math.min(box.w, box.h) / 2 - 4;
    const svg = hardShadow({ x: cx - r, y: cy - r, w: 2 * r, h: 2 * r }, pillSdf(cx, cy, r, 0), a.opacity) + medallion(a, cx, cy, r, 0);
    return { svg, content: inset(box, 18), text: num(t.hi), iconColor: t.hi };
  }
  const sb = inset(box, 2);
  const r = sb.h / 2 - 1.2 * P;
  const svg = slot(a, sb, 3 * P) + medallion(a, cx, cy, r, ext);
  const ci = r - 2.7 * P;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: num(t.hi), iconColor: t.hi };
}

export const aco: PieceStyle[] = [
  {
    style: 'aco', kind: 'header', opacity: 1, metal: 'silver',
    render(a) {
      // placa de aço com o miolo claro rebaixado (nome gravado)
      const t = trim(a.pal);
      const b = inset(a.box, 2, 6);
      const sdf = boxSdf(b, 2 * P);
      const panel = [lighten(t.light, 0.2), t.light, mix(t.light, t.mid, 0.4), mix(t.light, t.mid, 0.6)];
      const paint: Paint = (d, light, _x, y) => {
        if (d < P) return [OUT, 'r'];
        if (d < 2 * P) return [lit(light, t), 'r'];
        if (d < 3 * P) return [t.mid, 'r'];
        if (d < 4 * P) return [lit(light, sunk(t)), 'r'];
        return [band(y, b, panel), 'f'];
      };
      const svg = hardShadow(b, sdf, a.opacity) + raster(b, sdf, paint, a.opacity);
      return { svg, content: inset(b, 7 * P, 4 * P), text: txt(mix('#20242b', t.deep, 0.3), 700) };
    },
  },
  { style: 'aco', kind: 'cost', opacity: 1, metal: 'silver', render: (a) => badge(a) },
  { style: 'aco', kind: 'class', opacity: 1, metal: 'silver', render: (a) => badge(a) },
  { style: 'aco', kind: 'set', opacity: 1, metal: 'silver', render: (a) => badge(a, true) },
  {
    style: 'aco', kind: 'typeBar', opacity: 1, metal: 'silver',
    render(a) {
      const b = inset(a.box, 12, 4);
      return {
        svg: slot(a, b, 2 * P, true), content: { x: b.x + 3 * P, y: b.y + 2 * P, w: b.w - 15 * P, h: b.h - 4 * P }, text: txt('#dde3ea', 500, true),
        gem: { x: b.x + b.w - 11 * P, y: b.y + b.h / 2 - 3.5 * P, w: 7 * P, h: 7 * P },
      };
    },
    gemRender: (gb, color) => pixelArt(GEM, g(gb.x), g(gb.y), P, { O: OUT, W: '#fff', C: color, D: darken(color, 0.35) }),
  },
  {
    style: 'aco', kind: 'rules', opacity: 1, metal: 'silver',
    render(a) {
      const t = trim(a.pal);
      const b = a.box;
      const sdf = boxSdf(b, 3 * P);
      // moldura de metal + pedra gasta com manchas
      const paint: Paint = (d, light, x, y) => {
        if (d < P) return [OUT, 'r'];
        if (d < 2 * P) return [lit(light, t), 'r'];
        if (d < 3 * P) return [t.mid, 'r'];
        if (d < 4 * P) return [lit(light, sunk(t)), 'r'];
        const n = noise(Math.floor(x / P), Math.floor(y / P));
        if (n > 0.975) return ['#a59e8c', 'f'];
        if (n < 0.012) return ['#d6d0c1', 'f'];
        return [band(y, b, STONE), 'f'];
      };
      const svg = hardShadow(b, sdf, a.opacity) + raster(b, sdf, paint, a.opacity);
      return { svg, content: inset(b, 7 * P, 6 * P), text: txt('#2b2a26') };
    },
    divider(a, x, y, w) {
      const Y = g(y);
      let d = '';
      for (let i = g(x); i < x + w; i += P * 2) d += `M${i} ${Y}h${P}v${P}h${-P}Z`;
      return `<path d="${d}" fill="${trim(a.pal).dark}" shape-rendering="crispEdges"/>`;
    },
    flavor: () => ({ family: FONT, weight: 400, color: '#4d4a42' }),
  },
  {
    style: 'aco', kind: 'stat', opacity: 1, metal: 'silver',
    render: (a) => {
      const b = inset(a.box, 2, 2);
      return { svg: slot(a, b, 2 * P, true), content: inset(b, 2 * P, P), text: num('#e6ebf0') };
    },
  },
  {
    style: 'aco', kind: 'footer', opacity: 1, metal: 'silver',
    render: (a) => {
      const b = inset(a.box, 0, -2);
      return { svg: slot(a, b, P, true), content: inset(b, 2 * P, P), text: num('#c9d0d8') };
    },
  },
  {
    style: 'aco', kind: 'frame', opacity: 1, metal: 'silver',
    render(a) {
      const t = trim(a.pal);
      const b = a.box;
      const T = 5 * P;
      const outer = boxSdf(b, CARD_RADIUS);
      const band5: Sdf = (x, y) => { const d = outer(x, y); return d < T ? d : -1; };
      const frame = raster(b, band5, (d, light) => {
        if (d < P) return [OUT, 'r'];
        if (d < 2 * P) return [lit(light, { light: t.hi, mid: t.light, dark: t.mid }), 'r'];
        if (d < 3 * P) return [t.mid, 'r'];
        if (d < 4 * P) return [t.dark, 'r'];
        return [OUT, 'r'];
      });
      const cols = { O: OUT, W: t.hi, L: t.light, M: t.mid, D: t.deep };
      const cx = g(b.x + b.w / 2 - 7 * P);
      const orn =
        pixelArt(TAB, cx, b.y + 4 * P, P, cols) +
        pixelArt(TAB.slice().reverse(), cx, b.y + b.h - 8 * P, P, cols) +
        [[b.x + 2 * P, b.y + 8 * P], [b.x + b.w - 6 * P, b.y + 8 * P], [b.x + 2 * P, b.y + b.h - 12 * P], [b.x + b.w - 6 * P, b.y + b.h - 12 * P]]
          .map(([x, y]) => pixelArt(STUD, g(x), g(y), P, cols)).join('');
      return { svg: frame + orn, content: inset(b, T), text: txt(t.hi) };
    },
  },
];
