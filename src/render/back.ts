/**
 * Verso (costas) das cartas: fundo, padrão decorativo, moldura, medalhão com o
 * emblema e faixa de título — reaproveitando as peças dos estilos das frentes,
 * para frente e verso combinarem.
 */
import type { CardBack } from '../model/types';
import { darken, lighten } from './color';
import { centered } from './compose';
import { Defs } from './defs';
import { piece } from './elements';
import { drawGlyph } from './icons/render';
import { CARD_H, CARD_RADIUS, CARD_W } from './layout';
import { makePalette, vivid } from './palette';
import { circle, rng, roundRect, star } from './shapes';

export const defaultBack = (): CardBack => ({
  style: 'neutro', colors: ['#6b3eb6', '#1a1330'], blend: 'degrade', pattern: 'raios', frame: true,
  emblem: 'logo', icon: 'pentagram-rose', iconStyle: 'emblema', emblemSize: 0.44, medallion: true,
  showTitle: true, title: 'Darkstar',
});

export interface BackInput {
  uid: string;
  back: CardBack;
  /** URL do logo da edição. */
  logo?: string;
  /** URL da arte de fundo. */
  art?: string;
}

function pattern(defs: Defs, kind: CardBack['pattern'], color: string, cx: number, cy: number): string {
  const ink = lighten(color, 0.35);
  if (kind === 'raios') {
    let d = '';
    const n = 36;
    for (let i = 0; i < n; i += 2) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, R = 1400;
      d += `M${cx} ${cy}L${(cx + Math.cos(a0) * R).toFixed(1)} ${(cy + Math.sin(a0) * R).toFixed(1)}L${(cx + Math.cos(a1) * R).toFixed(1)} ${(cy + Math.sin(a1) * R).toFixed(1)}Z`;
    }
    return `<path d="${d}" fill="${ink}" opacity=".07"/>`;
  }
  if (kind === 'losangos') {
    const id = defs.add(`bk-lz:${ink}`, (pid) =>
      `<pattern id="${pid}" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<path d="M0 0H46V46" fill="none" stroke="${ink}" stroke-width="1.4"/></pattern>`);
    return `<rect width="${CARD_W}" height="${CARD_H}" fill="url(#${id})" opacity=".14"/>`;
  }
  if (kind === 'estrelas') {
    const rnd = rng(7);
    let d = '';
    for (let i = 0; i < 160; i++) {
      const x = rnd() * CARD_W, y = rnd() * CARD_H, r = rnd() < 0.1 ? 5 : 1 + rnd() * 1.6;
      d += r > 3 ? star(x, y, r, r * 0.25, 4) : circle(x, y, r);
    }
    return `<path d="${d}" fill="#fff" opacity=".45"/>`;
  }
  if (kind === 'circulos') {
    let d = '';
    for (let r = 60; r < 900; r += 44) d += circle(cx, cy, r);
    return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.6" opacity=".12"/>`;
  }
  return '';
}

export function composeBack(inp: BackInput): string {
  const b = inp.back;
  const defs = new Defs(inp.uid);
  const pal = makePalette(b.colors.length ? b.colors : ['#6b3eb6'], b.metal ?? 'deck', b.blend);
  const card = { x: 0, y: 0, w: CARD_W, h: CARD_H };
  const clip = defs.add('bkclip', (id) => `<clipPath id="${id}"><path d="${roundRect(card, CARD_RADIUS)}"/></clipPath>`);
  const cx = CARD_W / 2, cy = b.showTitle ? CARD_H * 0.44 : CARD_H / 2;

  let out = `<rect width="${CARD_W}" height="${CARD_H}" fill="${defs.hue(pal, (c) => darken(vivid(c), 0.5))}"/>`;
  out += `<rect width="${CARD_W}" height="${CARD_H}" fill="${defs.radial([[0, lighten(vivid(pal.base), 0.1), 0.45], [0.55, pal.base, 0.05], [1, '#000', 0.65]], 0.5, cy / CARD_H, 0.75)}"/>`;
  if (inp.art && b.art) {
    const w = CARD_W * b.art.zoom, h = CARD_H * b.art.zoom;
    out += `<image href="${inp.art}" x="${(CARD_W - w) / 2 + b.art.x}" y="${(CARD_H - h) / 2 + b.art.y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" opacity="${b.art.opacity}"/>`;
  }
  out += pattern(defs, b.pattern, pal.base, cx, cy);

  // emblema (com ou sem medalhão do estilo)
  const size = CARD_W * b.emblemSize;
  let content = { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
  if (b.medallion) {
    const mb = { x: cx - size * 0.62, y: cy - size * 0.62, w: size * 1.24, h: size * 1.24 };
    const m = piece(b.style, 'class').render({ box: mb, pal, defs, opacity: 1 });
    out += m.svg;
    content = m.content;
  }
  const e = Math.min(content.w, content.h) * (b.medallion ? 0.96 : 1);
  const ex = content.x + (content.w - e) / 2, ey = content.y + (content.h - e) / 2;
  if (b.emblem === 'logo' && inp.logo) out += `<image href="${inp.logo}" x="${ex}" y="${ey}" width="${e}" height="${e}" preserveAspectRatio="xMidYMid meet"/>`;
  if (b.emblem === 'simbolo') out += drawGlyph(defs, b.icon, b.iconStyle, ex, ey, e, { color: lighten(vivid(pal.base), 0.35) });

  if (b.frame) out += piece(b.style, 'frame').render({ box: card, pal, defs, opacity: 1 }).svg;

  if (b.showTitle && b.title.trim()) {
    const hb = { x: 112, y: CARD_H * 0.8, w: 526, h: 80 };
    const h = piece(b.style, 'header').render({ box: hb, pal, defs, opacity: 1 });
    out += h.svg + centered(defs, b.title, h.text, 44, h.content);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}">${defs}<g clip-path="url(#${clip})">${out}</g></svg>`;
}
