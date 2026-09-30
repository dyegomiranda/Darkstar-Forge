/**
 * Estilo ORNADO — ourivesaria: metal gravado, fios de pérolas, cartelas com
 * volutas enroladas e filigrana nos cantos (sem espinhos). Três variantes:
 *
 *  Ornado        — metal na cor da classe, painéis de pergaminho
 *  Ornado Régio  — ouro com painéis de laca escura e letra clara
 *  Ornado Marfim — prata com painéis de marfim
 *
 * O fundo dos painéis aceita a "Cor do fundo" escolhida na Aparência.
 */
import { darken, lighten, mix } from '../color';
import { layers } from '../defs';
import { inkOnPaper, paper, vivid, type MetalKind } from '../palette';
import { circle, inset, pill, spiral, tapered, bezier, type Box, type Pt } from '../shapes';
import type { TextLook } from '../text';
import { cabochon, center, fadeLine, gem, metalBand, metalSolid } from './common';
import type { PieceArgs, PieceOut, PieceStyle, StyleId } from './types';

const SERIF = 'EB Garamond';

interface Variant {
  id: StyleId;
  metal: MetalKind;
  /** Miolo dos painéis claros (nome, regras). */
  panel: 'pergaminho' | 'laca' | 'marfim';
}

export function makeOrnado(v: Variant): PieceStyle[] {
  const dark = v.panel === 'laca';

  // ───────────── materiais ─────────────

  /** Cor do miolo claro (ou escuro, no Régio). */
  const panelTone = (a: PieceArgs) => a.fill ?? (v.panel === 'laca' ? mix(darken(vivid(a.pal.base), 0.72), '#120c0a', 0.35)
    : v.panel === 'marfim' ? mix('#f4eee2', lighten(a.pal.base, 0.85), 0.12) : paper(a.pal.base));
  const inkOf = (a: PieceArgs) => (dark ? '#f3e3bd' : v.panel === 'marfim' ? mix('#2a211b', darken(a.pal.base, 0.7), 0.3) : inkOnPaper(a.pal.base));

  /** Miolo do painel: cor + textura (pergaminho, laca ou marfim) + sombra interna. */
  function panel(a: PieceArgs, d: string): string {
    const { defs, pal } = a;
    const base = panelTone(a);
    const tex = dark ? defs.grain('#000', 0.45, 0.6) : defs.paper(mix(darken(base, 0.35), '#8a6a50', v.panel === 'marfim' ? 0.2 : 0.5), v.panel === 'marfim' ? 0.16 : 0.3);
    return `<g opacity="${a.opacity}"><g filter="${defs.innerShadow(9, dark ? 0.6 : 0.3, darken(pal.base, 0.6))}">` +
      `<path d="${d}" fill="${base}" filter="${tex}"/></g>` +
      (dark
        ? `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.12], [0.35, '#fff', 0], [1, '#000', 0.3]])}"/>`
        : `<path d="${d}" fill="${defs.radial([[0.55, pal.base, 0], [1, darken(pal.base, 0.25), 0.2]], 0.5, 0.5, 0.75)}"/>`) +
      `</g>`;
  }

  /** Laca escura na cor da classe (barra de tipo, ATK/DEF, rodapé). */
  function lacquer(a: PieceArgs, d: string): string {
    const { defs, pal } = a;
    return `<g opacity="${a.opacity}"><path d="${d}" fill="${a.fill ?? defs.hue(pal, (c) => darken(vivid(c), 0.5))}" filter="${defs.grain('#000', 0.45, 0.55)}"/>` +
      `<path d="${d}" fill="${defs.linear([[0, '#fff', 0.2], [0.45, '#fff', 0.03], [0.55, '#000', 0.1], [1, '#000', 0.4]])}"/></g>`;
  }

  /** Metal com relevo e sombra. */
  const metal = (a: PieceArgs, d: string, depth = 2.4) => `<g filter="${a.defs.shadow(4, 5, 0.5)}">${metalBand(a.defs, a.pal, d, depth)}</g>`;

  /** Fio de pérolas ao longo de pontos. */
  function pearls(a: PieceArgs, pts: Pt[], r: number): string {
    const d = pts.map(([x, y]) => circle(x, y, r)).join('');
    return metalSolid(a.defs, a.pal, d, 0.8) +
      pts.map(([x, y]) => `<circle cx="${(x - r * 0.35).toFixed(1)}" cy="${(y - r * 0.4).toFixed(1)}" r="${(r * 0.32).toFixed(2)}" fill="#fff" opacity=".7"/>`).join('');
  }

  /** Pontos igualmente espaçados numa reta. */
  const along = (x0: number, x1: number, y: number, step: number): Pt[] => {
    const n = Math.max(1, Math.floor((x1 - x0) / step));
    const s = (x1 - x0) / n;
    return Array.from({ length: n + 1 }, (_, i) => [x0 + i * s, y] as Pt);
  };

  /** Cartela: barra de pontas arredondadas (sem bicos). */
  function cartouche(b: Box, e: number): string {
    const { x, y, w, h } = b;
    const cy = y + h / 2, r = h / 2;
    return `M${x + e} ${y}H${x + w - e}C${x + w - e * 0.45} ${y} ${x + w} ${cy - r * 0.55} ${x + w} ${cy}` +
      `C${x + w} ${cy + r * 0.55} ${x + w - e * 0.45} ${y + h} ${x + w - e} ${y + h}H${x + e}` +
      `C${x + e * 0.45} ${y + h} ${x} ${cy + r * 0.55} ${x} ${cy}C${x} ${cy - r * 0.55} ${x + e * 0.45} ${y} ${x + e} ${y}Z`;
  }

  /** Voluta (par de espirais enroladas) presa na ponta de uma cartela. `out` = -1 à esquerda, 1 à direita. */
  function volute(a: PieceArgs, xe: number, cy: number, out: 1 | -1, s: number): string {
    let d = '';
    for (const up of [-1, 1] as const) {
      const p0: Pt = [xe, cy + up * s * 0.08];
      const p3: Pt = [xe + out * s * 0.78, cy + up * s * 0.86];
      const arm = bezier(p0, [xe + out * s * 0.55, cy + up * s * 0.02], [xe + out * s * 1.05, cy + up * s * 0.45], p3, 18);
      const c: Pt = [xe + out * s * 0.46, cy + up * s * 0.68];
      const a0 = Math.atan2(p3[1] - c[1], p3[0] - c[0]);
      const r0 = Math.hypot(p3[0] - c[0], p3[1] - c[1]);
      const curl = spiral(c[0], c[1], r0, 0.9, a0, out * up, 26).slice(1);
      d += tapered([...arm, ...curl], s * 0.2, s * 0.05, 0.9);
    }
    return `<g filter="${a.defs.shadow(2, 3, 0.55)}">${metalSolid(a.defs, a.pal, d, 1.1)}</g>`;
  }

  /** Filigrana de canto: duas espirais seguindo as bordas + uma pérola. */
  function cornerScroll(a: PieceArgs, x: number, y: number, sx: 1 | -1, sy: 1 | -1, s: number): string {
    const arm = (horizontal: boolean) => {
      const p0: Pt = [x, y];
      const p3: Pt = horizontal ? [x + sx * s * 1.5, y - sy * s * 0.25] : [x - sx * s * 0.25, y + sy * s * 1.5];
      const pts = bezier(p0, horizontal ? [x + sx * s * 0.6, y - sy * s * 0.35] : [x - sx * s * 0.35, y + sy * s * 0.6],
        horizontal ? [x + sx * s * 1.2, y + sy * s * 0.15] : [x + sx * s * 0.15, y + sy * s * 1.2], p3, 16);
      const c: Pt = horizontal ? [x + sx * s * 1.25, y - sy * s * 0.05] : [x - sx * s * 0.05, y + sy * s * 1.25];
      const a0 = Math.atan2(p3[1] - c[1], p3[0] - c[0]);
      const curl = spiral(c[0], c[1], Math.hypot(p3[0] - c[0], p3[1] - c[1]), 0.85, a0, horizontal ? -sx * sy : sx * sy, 22).slice(1);
      return tapered([...pts, ...curl], s * 0.2, s * 0.05, 0.9);
    };
    return `<g filter="${a.defs.shadow(2, 3, 0.5)}">${metalSolid(a.defs, a.pal, arm(true) + arm(false), 1.1)}</g>` +
      pearls(a, [[x, y]], s * 0.2);
  }

  /** Brasão de filigrana: duas espirais saindo de uma joia central, para os lados. `dir` 1 = para cima, -1 = para baixo. */
  function crest(a: PieceArgs, cx: number, y: number, s: number, dir: 1 | -1, gemR: number): string {
    let d = '';
    for (const side of [-1, 1] as const) {
      const p0: Pt = [cx + side * gemR * 0.8, y];
      const p3: Pt = [cx + side * s * 1.7, y - dir * s * 0.55];
      const arm = bezier(p0, [cx + side * s * 0.7, y + dir * s * 0.2], [cx + side * s * 1.4, y - dir * s * 0.05], p3, 18);
      const c: Pt = [cx + side * s * 1.35, y - dir * s * 0.62];
      const a0 = Math.atan2(p3[1] - c[1], p3[0] - c[0]);
      const curl = spiral(c[0], c[1], Math.hypot(p3[0] - c[0], p3[1] - c[1]), 0.85, a0, -side * dir, 22).slice(1);
      d += tapered([...arm, ...curl], s * 0.2, s * 0.04, 0.9);
      // folhinha (lóbulo) no meio do braço
      const m = arm[9];
      d += tapered(bezier(m, [m[0] + side * s * 0.1, m[1] - dir * s * 0.45], [m[0] + side * s * 0.45, m[1] - dir * s * 0.6], [m[0] + side * s * 0.62, m[1] - dir * s * 0.42], 10), s * 0.14, s * 0.02);
    }
    return `<g filter="${a.defs.shadow(2, 3, 0.5)}">${metalSolid(a.defs, a.pal, d, 1)}</g>` + cabochon(cx, y, gemR, vivid(a.pal.base), a.defs);
  }

  /** Canto côncavo (um quarto de círculo para dentro), para a caixa de regras. */
  function notchedRect(b: Box, r: number): string {
    const { x, y, w, h } = b;
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 0 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 0 ${x + w - r} ${y + h}` +
      `H${x + r}A${r} ${r} 0 0 0 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 0 ${x + r} ${y}Z`;
  }

  /** Medalhão: anel gravado, fio de pérolas por fora, esmalte por dentro, cabochões em cima e embaixo. */
  function medallion(a: PieceArgs, big: boolean): PieceOut {
    const { box: b, defs, pal } = a;
    const { cx, cy } = center(b);
    const r = Math.min(b.w, b.h) / 2 - (big ? 5 : 3);
    const ext = Math.max(0, (b.w - b.h) / 2);
    const ri = r * 0.8;
    const c = vivid(pal.base);
    // pérolas em volta (no círculo, ou na cápsula quando há vários custos)
    const beads: Pt[] = [];
    const n = Math.round((2 * Math.PI * (r + 3) + 4 * ext) / (big ? 11 : 10));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const per = 2 * Math.PI * (r + 3) + 4 * ext;
      let dist = t * per;
      const halfArc = Math.PI * (r + 3);
      // percorre: arco direito, reta de baixo, arco esquerdo, reta de cima
      if (dist < halfArc) { const ang = -Math.PI / 2 + dist / (r + 3); beads.push([cx + ext + Math.cos(ang) * (r + 3), cy + Math.sin(ang) * (r + 3)]); continue; }
      dist -= halfArc;
      if (dist < 2 * ext) { beads.push([cx + ext - dist, cy + r + 3]); continue; }
      dist -= 2 * ext;
      if (dist < halfArc) { const ang = Math.PI / 2 + dist / (r + 3); beads.push([cx - ext + Math.cos(ang) * (r + 3), cy + Math.sin(ang) * (r + 3)]); continue; }
      dist -= halfArc;
      beads.push([cx - ext + dist, cy - r - 3]);
    }
    // gravação: riscos radiais no anel
    let ticks = '';
    for (let k = 0; k < 24; k++) {
      const ang = (k / 24) * 2 * Math.PI;
      const ox = Math.cos(ang) > 0 ? ext : -ext;
      ticks += `M${cx + ox + Math.cos(ang) * (ri + 2)} ${cy + Math.sin(ang) * (ri + 2)}L${cx + ox + Math.cos(ang) * (r - 2)} ${cy + Math.sin(ang) * (r - 2)}`;
    }
    const disc = a.fill ?? defs.radial([[0, darken(c, 0.25)], [0.65, darken(pal.base, 0.7)], [1, '#0c0506']], 0.5, 0.42, 0.62);
    const svg =
      `<g filter="${defs.shadow(3, 4, 0.55)}">` + pearls(a, beads, big ? 3.2 : 2.4) +
      metalBand(defs, pal, pill(cx, cy, r, ext) + pill(cx, cy, ri, ext), big ? 3 : 2) + `</g>` +
      `<path d="${ticks}" stroke="${darken(pal.base, 0.75)}" stroke-width="1.2" opacity=".45"/>` +
      `<path d="${pill(cx, cy, ri, ext)}" fill="${disc}" fill-opacity="${a.opacity}" filter="${defs.innerShadow(r * 0.12, 0.7)}"/>` +
      `<path d="${pill(cx, cy, ri - 3, ext)}" fill="none" stroke="${lighten(c, 0.3)}" stroke-width="1.2" opacity=".5"/>` +
      (big ? cabochon(cx, cy - r - 5, 6.5, lighten(c, 0.1), defs) + cabochon(cx, cy + r + 5, 5, lighten(c, 0.1), defs) : '');
    const ci = ri * 0.86;
    return { svg, content: { x: cx - ci - ext, y: cy - ci, w: ci * 2 + ext * 2, h: ci * 2 }, text: { family: SERIF, weight: 700, color: '#fbf3ea' } };
  }

  const lightText = (a: PieceArgs, weight = 600): TextLook => ({ family: SERIF, weight, color: mix('#fbf3ea', a.pal.base, 0.06) });

  return [
    {
      // barra do nome: cartela com volutas nas pontas, fios de pérolas e gravação dupla
      style: v.id, kind: 'header', opacity: 1, metal: v.metal,
      render(a) {
        const b = inset(a.box, 18, 4);
        const { cx, cy } = center(b);
        const e = b.h * 0.62;
        const inner = cartouche(inset(b, 8, 8), e - 6);
        const svg =
          volute(a, b.x + 6, cy, -1, b.h * 0.55) + volute(a, b.x + b.w - 6, cy, 1, b.h * 0.55) +
          metal(a, cartouche(b, e) + inner, 2.6) +
          panel(a, inner) +
          `<path d="${cartouche(inset(b, 14, 13), e - 11)}" fill="none" stroke="${dark ? lighten(vivid(a.pal.base), 0.4) : darken(vivid(a.pal.base), 0.2)}" stroke-width="1" opacity=".5"/>` +
          pearls(a, along(b.x + e, b.x + b.w - e, b.y + 4, 12), 1.9) +
          pearls(a, along(b.x + e, b.x + b.w - e, b.y + b.h - 4, 12), 1.9) +
          crest(a, cx, b.y + 1, 22, 1, 7.5) + crest(a, cx, b.y + b.h - 1, 15, -1, 5);
        return { svg, content: { x: b.x + e + 6, y: b.y + 12, w: b.w - 2 * e - 12, h: b.h - 24 }, text: { family: SERIF, weight: 600, color: inkOf(a) } };
      },
    },
    { style: v.id, kind: 'cost', opacity: 1, metal: v.metal, render: (a) => medallion(a, true) },
    { style: v.id, kind: 'class', opacity: 1, metal: v.metal, render: (a) => medallion(a, true) },
    { style: v.id, kind: 'set', opacity: 1, metal: v.metal, render: (a) => medallion(a, false) },
    {
      style: v.id, kind: 'typeBar', opacity: 1, metal: v.metal,
      render(a) {
        const b = inset(a.box, 22, 3);
        const { cy } = center(b);
        const e = b.h * 0.55;
        const inner = cartouche(inset(b, 7, 7), e - 5);
        const c = vivid(a.pal.base);
        const svg =
          volute(a, b.x + 4, cy, -1, b.h * 0.5) + volute(a, b.x + b.w - 4, cy, 1, b.h * 0.5) +
          metal(a, cartouche(b, e) + inner, 2.4) + lacquer(a, inner) +
          `<path d="${cartouche(inset(b, 12, 12), e - 9)}" fill="none" stroke="${lighten(c, 0.35)}" stroke-width="1" opacity=".35"/>`;
        return {
          svg, content: { x: b.x + e + 4, y: b.y + 8, w: b.w - 2 * e - 60, h: b.h - 16 }, text: lightText(a),
          gem: { x: b.x + b.w - e - 44, y: cy - 14, w: 28, h: 28 },
        };
      },
    },
    {
      // caixa de regras: cantos côncavos com filigrana, pérolas e gravação
      style: v.id, kind: 'rules', opacity: 1, metal: v.metal,
      render(a) {
        const { box: b, defs, pal } = a;
        const inner = notchedRect(inset(b, 10), 14);
        const c = vivid(pal.base);
        const { cx, cy } = center(b);
        const svg =
          metal(a, notchedRect(b, 22) + inner, 3) +
          panel(a, inner) +
          `<path d="${notchedRect(inset(b, 18), 10)}" fill="none" stroke="${dark ? lighten(c, 0.35) : darken(c, 0.1)}" stroke-width="1.2" opacity=".45"/>` +
          `<path d="${notchedRect(inset(b, 22), 7)}" fill="none" stroke="${dark ? lighten(c, 0.35) : darken(c, 0.1)}" stroke-width="0.8" opacity=".3"/>` +
          cornerScroll(a, b.x + 6, b.y + 6, 1, 1, 22) + cornerScroll(a, b.x + b.w - 6, b.y + 6, -1, 1, 22) +
          cornerScroll(a, b.x + 6, b.y + b.h - 6, 1, -1, 22) + cornerScroll(a, b.x + b.w - 6, b.y + b.h - 6, -1, -1, 22) +
          pearls(a, [[b.x + 5, cy], [b.x + b.w - 5, cy]], 3.4) +
          crest(a, cx, b.y + b.h - 5, 26, -1, 8.5);
        return { svg, content: inset(b, 40, 30), text: { family: SERIF, weight: 500, color: inkOf(a) } };
      },
      divider(a, x, y, w) {
        const c = vivid(a.pal.base);
        return fadeLine(a.defs, x, y, w, dark ? lighten(c, 0.3) : darken(c, 0.1), 1.4, 0.8) + gem(x + w / 2, y, 6, 8, c);
      },
      flavor: (pal) => ({ family: SERIF, italic: true, weight: 400, color: dark ? mix('#f3e3bd', pal.base, 0.25) : v.panel === 'marfim' ? '#5a4c40' : mix(inkOnPaper(pal.base), paper(pal.base), 0.18) }),
    },
    {
      style: v.id, kind: 'stat', opacity: 1, metal: v.metal,
      render(a) {
        const b = inset(a.box, 4, 3);
        const e = b.h * 0.45;
        const inner = cartouche(inset(b, 6, 6), e - 4);
        const svg = metal(a, cartouche(b, e) + inner, 2.2) + lacquer(a, inner) +
          pearls(a, [[b.x + 3, b.y + b.h / 2], [b.x + b.w - 3, b.y + b.h / 2]], 3);
        return { svg, content: inset(b, 16, 8), text: { family: SERIF, weight: 700, color: '#fbf3ea' } };
      },
    },
    {
      style: v.id, kind: 'footer', opacity: 1, metal: v.metal,
      render(a) {
        const b = a.box;
        const inner = cartouche(inset(b, 5, 5), b.h * 0.4);
        const svg = metal(a, cartouche(b, b.h * 0.5) + inner, 1.6) + lacquer(a, inner);
        return { svg, content: inset(b, 20, 6), text: { family: SERIF, weight: 500, color: mix('#fbf3ea', a.pal.base, 0.1) } };
      },
    },
    {
      style: v.id, kind: 'frame', opacity: 1, metal: v.metal,
      render(a) {
        const { box: b, defs, pal } = a;
        const outer = `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`;
        const inner = roundedInner(b, 12, 26);
        const svg = metalBand(defs, pal, outer + inner, 2.2) +
          `<path d="${inner}" fill="none" stroke="${darken(pal.base, 0.8)}" stroke-width="2" opacity=".8"/>` +
          layers(roundedInner(b, 6, 30), ['none'], ` stroke="${lighten(vivid(pal.base), 0.35)}" stroke-width="1" opacity=".35"`) +
          cornerScroll(a, b.x + 16, b.y + 16, 1, 1, 26) + cornerScroll(a, b.x + b.w - 16, b.y + 16, -1, 1, 26) +
          cornerScroll(a, b.x + 16, b.y + b.h - 16, 1, -1, 26) + cornerScroll(a, b.x + b.w - 16, b.y + b.h - 16, -1, -1, 26);
        return { svg, content: inset(b, 16), text: { family: SERIF, color: '#fbf3ea' } };
      },
    },
  ];
}

/** Contorno interno arredondado de uma moldura. */
export function roundedInner(b: Box, t: number, r: number): string {
  const x = b.x + t, y = b.y + t, w = b.w - 2 * t, h = b.h - 2 * t;
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export const ornado = makeOrnado({ id: 'ornado', metal: 'deck', panel: 'pergaminho' });
export const ornadoRegio = makeOrnado({ id: 'ornadoRegio', metal: 'gold', panel: 'laca' });
export const ornadoMarfim = makeOrnado({ id: 'ornadoMarfim', metal: 'silver', panel: 'marfim' });
