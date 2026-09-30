/**
 * Estilo PIXEL SOMBRIO — pixel art de fantasia sombria. Referência: "Dark Elf
 * TCG Cards" (free-game-assets): ferro escuro, arremates de osso, faixa do nome
 * na cor da classe, selos redondos e pergaminho de bordas rasgadas.
 * Desenhado pixel a pixel pelo motor de ./pxengine.
 */
import { darken, mix } from '../color';
import { CARD_RADIUS, CARD_W, type Skeleton } from '../layout';
import { vivid } from '../palette';
import { bezier, inset, pixelArt, roundRect, type Box, type Pt } from '../shapes';
import { band, boxSdf, deckShades, g, hardShadow, hornSdf, lit, noise, OUT, P, pillSdf, plate, polySdf, raster, type Paint, type Sdf } from './pxengine';
import type { TextLook } from '../text';
import { center } from './common';
import type { PieceArgs, PieceOut, PieceStyle } from './types';

/** Ardósia azulada (ferro escuro da referência). */
const IRON = { hi: '#6e7892', light: '#4c5570', mid: '#353c52', dark: '#272d3f', deep: '#1c2130' };
/** Filetes dourados (ouro pálido da referência). */
const GOLD = { hi: '#fbeab6', light: '#e3c47e', mid: '#b8914b', dark: '#7d5f2c' };
const BONE = GOLD;
const PARCH = ['#f2e5c3', '#eadab3', '#e0cda2', '#d2bc8e'];
const INK_DARK = '#3a2a1b';
const FONT = 'Pixelify Sans';

const txt = (color = '#ffffff', weight = 500): TextLook => ({ family: FONT, weight, color, hard: true });
const num = (color = '#ffffff'): TextLook => ({ family: 'Silkscreen', weight: 400, color, hard: true });

// ───────────── peças ─────────────

/** Selo redondo (custo, classe, edição); caixa larga vira cápsula (vários custos). */
function badge(a: PieceArgs, small = false): PieceOut {
  const { cx, cy } = center(a.box);
  const r = Math.min(a.box.w, a.box.h) / 2 - (small ? 4 : 0);
  const ext = Math.max(0, (a.box.w - a.box.h) / 2);
  const sdf = pillSdf(cx, cy, r, ext);
  const b = { x: cx - r - ext, y: cy - r, w: 2 * (r + ext), h: 2 * r };
  const fill = (x: number, y: number) => {
    const sh = deckShades(a.pal, x, b, 0.35);
    // brilho em meia-lua no alto
    return y < cy - r * 0.45 ? sh[1] : band(y, b, sh.slice(1));
  };
  const svg = hardShadow(b, sdf, a.opacity) +
    raster(b, sdf, plate(sdf, BONE, fill, small ? P : P * 2), a.opacity);
  const ci = r - (small ? 2.5 : 3.5) * P;
  return { svg, content: { x: cx - ci - ext, y: cy - ci, w: 2 * (ci + ext), h: 2 * ci }, text: num(), iconColor: BONE.hi };
}

/** Faixa do nome na cor da classe, com as pontas dobradas por trás. */
function ribbon(a: PieceArgs): PieceOut {
  const b = a.box;
  const body = inset(b, 22, 8);
  const cy = b.y + b.h / 2;
  const tailL: Pt[] = [[body.x + 30, body.y + 12], [b.x - 8, body.y + 18], [b.x + 14, cy + 6], [b.x - 8, b.y + b.h + 2], [body.x + 30, body.y + body.h + 8]];
  const tailR: Pt[] = tailL.map(([x, y]) => [2 * (b.x + b.w / 2) - x, y]);
  const tails = [tailL, tailR].map((pts) => {
    const sdf = polySdf(pts);
    const tb = { x: Math.min(...pts.map((p) => p[0])), y: Math.min(...pts.map((p) => p[1])), w: 0, h: 0 };
    tb.w = Math.max(...pts.map((p) => p[0])) - tb.x; tb.h = Math.max(...pts.map((p) => p[1])) - tb.y;
    return raster(tb, sdf, plate(sdf, { light: BONE.mid, mid: BONE.dark, dark: BONE.dark }, (x, y) => band(y, tb, deckShades(a.pal, x, tb, 0.45)), P, false), a.opacity);
  }).join('');
  const sdf = boxSdf(body, 2 * P);
  const svg = tails + hardShadow(body, sdf, a.opacity) +
    raster(body, sdf, plate(sdf, BONE, (x, y) => band(y, body, deckShades(a.pal, x, body, 0.1)), P), a.opacity);
  return { svg, content: inset(body, 5 * P, 2 * P), text: txt('#ffffff', 700) };
}

/** Placa de ferro com aro de osso (barra de tipo, ATK/DEF, rodapé). */
function ironPlate(a: PieceArgs, b: Box, radius: number, rimW = P): { svg: string; inner: Box } {
  const sdf = boxSdf(b, radius);
  const svg = hardShadow(b, sdf, a.opacity) +
    raster(b, sdf, plate(sdf, BONE, (_x, y) => band(y, b, [IRON.light, IRON.mid, IRON.dark, IRON.deep]), rimW), a.opacity);
  return { svg, inner: inset(b, rimW + 2 * P, rimW + P) };
}

/** Voluta dourada na base do arco. */
const CURL = [
  '..OOOO..',
  '.OYGGGO.',
  'OYOOOGDO',
  'OGO.OGDO',
  'OGOOGDO.',
  'OGGDDO..',
  '.OGDO...',
  '.OGO....',
  '.OGO....',
  'OGGDO...',
  'OGDDO...',
  '.OOO....',
];

// ───────────── esqueleto (arranjo da referência) ─────────────
// selos redondos nos cantos de cima; arte em arco; fita do nome sobre a base
// da arte; ATK e DEF dos lados com o tipo no meio; pergaminho rasgado.
export function sombrioLayout(rulesH: number): Partial<Skeleton> {
  const h = g(rulesH);
  const rules = { x: 66, y: 996 - h, w: 618, h };
  const typeBar = { x: 192, y: rules.y - 66, w: 366, h: 58 };
  const header = { x: 70, y: typeBar.y - 84, w: 610, h: 76 };
  return {
    rules, typeBar, header,
    cost: { x: 24, y: 24, w: 102, h: 102 },
    class: { x: 624, y: 24, w: 102, h: 102 },
    atk: { x: 42, y: typeBar.y, w: 148, h: 58 },
    def: { x: 560, y: typeBar.y, w: 148, h: 58 },
    set: { x: 351, y: 1002, w: 48, h: 42 },
    footer: { x: 48, y: 1008, w: 280, h: 30 },
  };
}

const GEM = ['...O...', '..OWO..', '.OWCCO.', 'OWCCCDO', '.OCCDO.', '..ODO..', '...O...'];

export const sombrio: PieceStyle[] = [
  { style: 'sombrio', kind: 'header', opacity: 1, metal: 'deck', render: (a) => ribbon(a) },
  { style: 'sombrio', kind: 'cost', opacity: 1, metal: 'deck', render: (a) => badge(a) },
  { style: 'sombrio', kind: 'class', opacity: 1, metal: 'deck', render: (a) => badge(a) },
  { style: 'sombrio', kind: 'set', opacity: 1, metal: 'deck', render: (a) => badge(a, true) },
  {
    style: 'sombrio', kind: 'typeBar', opacity: 1, metal: 'deck',
    render(a) {
      const b = inset(a.box, 12, 4);
      const { svg, inner } = ironPlate(a, b, 2 * P);
      return {
        svg, content: { ...inner, x: inner.x + P, w: inner.w - 11 * P }, text: txt(BONE.hi),
        gem: { x: b.x + b.w - 11 * P, y: b.y + b.h / 2 - 3.5 * P, w: 7 * P, h: 7 * P },
      };
    },
    gemRender: (gb, color) => pixelArt(GEM, g(gb.x), g(gb.y), P, { O: OUT, W: '#fff', C: color, D: darken(color, 0.35) }),
  },
  {
    style: 'sombrio', kind: 'rules', opacity: 1, metal: 'deck',
    render(a) {
      const b = a.box;
      // pergaminho de bordas rasgadas, direto sobre a ardósia (contorno escuro de 1 pixel)
      const pb = inset(b, P, P);
      const base = boxSdf(pb, P);
      const torn: Sdf = (x, y) => base(x, y) - (noise(Math.floor(x / P), Math.floor(y / P)) > 0.62 ? P : 0);
      const paint: Paint = (d, light, _x, y) => {
        if (d < P) return [OUT, 'r'];
        if (d < 2 * P) return [light < -0.2 ? '#9a8058' : '#c7ae7c', 'f'];
        return [band(y, pb, PARCH), 'f'];
      };
      const svg = hardShadow(pb, torn, a.opacity) + raster(pb, torn, paint, a.opacity);
      return { svg, content: inset(pb, 3 * P, 2.5 * P), text: { family: FONT, weight: 500, color: INK_DARK } };
    },
    divider(a, x, y, w) {
      const Y = g(y);
      let d = '';
      for (let i = g(x); i < x + w; i += P * 3) d += `M${i} ${Y}h${P}v${P}h${-P}Z`;
      return `<path d="${d}" fill="${darken(vivid(a.pal.base), 0.2)}" shape-rendering="crispEdges"/>`;
    },
    flavor: (pal) => ({ family: FONT, weight: 400, color: mix(darken(vivid(pal.base), 0.45), '#5b4430', 0.5) }),
  },
  {
    style: 'sombrio', kind: 'stat', opacity: 1, metal: 'deck',
    render(a) {
      const { svg, inner } = ironPlate(a, inset(a.box, 2, 2), 2 * P);
      return { svg, content: inset(inner, 0, -P), text: num(BONE.hi) };
    },
  },
  {
    style: 'sombrio', kind: 'footer', opacity: 1, metal: 'deck',
    render(a) {
      const { svg, inner } = ironPlate(a, inset(a.box, 0, -2), P);
      return { svg, content: inset(inner, 0, -P), text: num(BONE.light) };
    },
  },
  {
    style: 'sombrio', kind: 'frame', opacity: 1, metal: 'deck',
    render(a) {
      const b = a.box;
      const S = a.layout;
      const T = 4 * P;
      const tint = vivid(a.pal.base);
      const slate = (c: string) => mix(c, tint, 0.14);
      // janela da arte em arco
      const bottom = S ? g(S.header.y + S.header.h / 2) : 640;
      const x0 = 9 * P, x1 = CARD_W - 9 * P, y0 = 9 * P, rise = 26 * P, cx = CARD_W / 2;
      const archPts: Pt[] = [[x0, bottom], [x0, y0 + rise],
        ...bezier([x0, y0 + rise], [x0, y0 + rise * 0.3], [cx - (cx - x0) * 0.55, y0], [cx, y0], 18).slice(1),
        ...bezier([cx, y0], [cx + (x1 - cx) * 0.55, y0], [x1, y0 + rise * 0.3], [x1, y0 + rise], 18).slice(1),
        [x1, bottom]];
      const archD = `M${archPts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`;
      const inside = polySdf(archPts);
      // fundo de ardósia com teia de linhas
      let web = '';
      for (const [ox, oy] of [[0, 1050], [750, 1050], [0, 0], [750, 0]]) {
        for (let k = 0; k < 7; k++) {
          const ang = (k / 6) * (Math.PI / 2);
          const dx = ox === 0 ? 1 : -1, dy = oy === 0 ? 1 : -1;
          web += `M${ox} ${oy}L${ox + dx * Math.cos(ang) * 420} ${oy + dy * Math.sin(ang) * 420}`;
        }
        for (const r of [120, 220, 320]) web += `M${ox + (ox ? -r : r)} ${oy}A${r} ${r} 0 0 ${ox === oy ? 1 : 0} ${ox} ${oy + (oy ? -r : r)}`;
      }
      const under = `<path d="${roundRect(b, CARD_RADIUS)}" fill="${slate(IRON.mid)}"/>` +
        `<path d="${web}" fill="none" stroke="${slate(IRON.deep)}" stroke-width="3" opacity=".75"/>`;
      // borda: contorno, filete dourado, ardósia, filete dourado de dentro
      const outer = boxSdf(b, CARD_RADIUS);
      const frame = raster(b, (x, y) => { const d = outer(x, y); return d < T ? d : -1; }, (d, light) => {
        if (d < P) return [OUT, 'r'];
        if (d < 2 * P) return [lit(light, GOLD), 'r'];
        if (d < 3 * P) return [slate(IRON.light), 'r'];
        return [lit(light, { light: GOLD.mid, mid: GOLD.dark, dark: GOLD.dark }), 'r'];
      });
      // aro dourado do arco (2 pixels de ouro + contorno)
      const wb = { x: x0 - 4 * P, y: y0 - 4 * P, w: x1 - x0 + 8 * P, h: bottom - y0 + 4 * P };
      const rim = raster(wb, (x, y) => { const d = -inside(x, y); return d >= 0 && d < 3 * P ? 3 * P - d : -1; }, (d, light) => {
        if (d > 2 * P) return [OUT, 'r'];
        if (d > P) return [lit(-light, GOLD), 'r'];
        return [OUT, 'r'];
      });
      // arremates dourados na base do arco, dos dois lados
      const cols = { O: OUT, Y: GOLD.hi, G: GOLD.light, D: GOLD.mid };
      const orn = pixelArt(CURL, g(x0 - 3 * P), g(bottom - 13 * P), P, cols) + pixelArt(CURL.map((r) => [...r].reverse().join('')), g(x1 - 7 * P), g(bottom - 13 * P), P, cols);
      return { svg: frame + rim + orn, content: inset(b, T), text: txt(), under, artClip: archD };
    },
  },
];
