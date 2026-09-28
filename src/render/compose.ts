/**
 * Monta a carta inteira como UMA imagem SVG: arte + peças (cada uma do estilo
 * escolhido) + textos + símbolos. A mesma saída serve para o editor, a biblioteca
 * (rasterizada e guardada em cache) e a exportação.
 */
import { darken, lighten, luminance } from './color';
import { Defs } from './defs';
import { piece, styleInfo, type PieceKind, type PieceOut, type PieceStyle, type StyleId } from './elements';
import { RARITY_COLORS, rarityGem, textShadow } from './elements/common';
import { ATK_ICON, classIcon, DEF_ICON, isResource, RESOURCE_COLORS, resourceIcon, STEEL } from './icons/glyphs';
import { drawGlyph, drawStatBadge, pixelSteps, type IconStyle } from './icons/render';
import type { ResourceId } from '../model/types';
import { CARD_H, CARD_RADIUS, CARD_W, RULES_MAX_H, skeleton } from './layout';
import { makePalette, vivid, type MetalKind } from './palette';
import { roundRect, type Box } from './shapes';
import { blockHeight, drawLines, fitLine, measure, wrap, type IconFn, type TextLook, type TextStyle } from './text';

/** Escolhas de uma peça: estilo + ajustes finos. Tudo opcional além do estilo. */
export interface PieceChoice {
  style: StyleId;
  /** Cores próprias da peça (senão, as do deck). */
  colors?: string[];
  /** Transparência do fundo da peça (0 = invisível, 1 = sólido). */
  opacity?: number;
  metal?: MetalKind;
  /** Cor do texto dentro da peça. */
  ink?: string;
  /** Fonte do texto dentro da peça. */
  font?: string;
  hidden?: boolean;
}

/** Escolha de um símbolo: estilo de desenho, qual símbolo e cor. */
export interface IconChoice { style?: IconStyle; glyph?: string; color?: string }

export interface Look {
  /** Estilo usado nas peças sem escolha própria. */
  style: StyleId;
  pieces?: Partial<Record<PieceKind, PieceChoice>>;
  icons?: {
    cost?: IconChoice;
    class?: IconChoice;
    atk?: IconChoice;
    def?: IconChoice;
    /** 'placa' = símbolo + número numa caixinha; 'emblema' = número dentro do símbolo, sem caixa. */
    statMode?: 'placa' | 'emblema';
  };
  /** Pixelar a arte (tamanho do bloco, em px da carta). Combina com o estilo Pixel. */
  pixelateArt?: number;
}

export interface ComposeInput {
  /** Prefixo único dos ids do SVG (id da carta). */
  uid: string;
  colors: string[];
  /** Deck (define o símbolo de classe padrão). */
  colorId: string;
  art?: { src: string; zoom?: number; x?: number; y?: number; mirror?: boolean };
  name: string;
  typeLine: string;
  rules: string;
  flavor?: string;
  footer?: string;
  cost?: { resource: string; amount: number } | null;
  stats?: { atk: number; def: number } | null;
  rarity: string;
  look: Look;
  /** Imagem do símbolo da edição (logo do set). */
  setIcon?: string;
  /** Tamanhos de fonte de referência (px no espaço 750×1050). */
  sizes?: Partial<typeof SIZES>;
}

export const SIZES = { title: 42, type: 29, rules: 27, flavor: 25, footer: 17, stat: 50, cost: 52 };

const RULES_MIN_FONT = 17;
const RULES_X = 48, RULES_W = 654;

function choose(look: Look, kind: PieceKind): { ps: PieceStyle; ch: PieceChoice } {
  const ch = look.pieces?.[kind] ?? { style: look.style };
  return { ps: piece(ch.style ?? look.style, kind), ch };
}

/** Aplica cor de texto e fonte escolhidas pelo usuário sobre o padrão do estilo. */
function textOf(out: PieceOut, ch: PieceChoice): TextLook {
  return { ...out.text, ...(ch.ink ? { color: ch.ink } : {}), ...(ch.font ? { family: ch.font } : {}) };
}

/** Estilo de texto final: tamanho + legibilidade (sombra dura, brilho ou sombra suave). */
function styled(defs: Defs, look: TextLook, size: number): { st: TextStyle; filter?: string } {
  const st: TextStyle = { ...look, size };
  let filter: string | undefined;
  if (look.hard) filter = defs.url('hardshadow', (id) =>
    `<filter id="${id}" x="-10%" y="-20%" width="130%" height="160%"><feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="#000" flood-opacity="1"/></filter>`);
  else if (look.glow) filter = defs.glow(look.glow, 3, 0.85);
  else if (luminance(look.color) > 0.45) filter = textShadow(defs, '#000', 0.9, 1.8, 1.6);
  return { st, filter };
}

/** Pixelar: amostra 1 ponto por bloco e dilata até cobrir o bloco inteiro. */
function pixelate(defs: Defs, px: number): string {
  return defs.url(`pixelate:${px}`, (id) =>
    `<filter id="${id}" x="0" y="0" width="${CARD_W}" height="${CARD_H}" filterUnits="userSpaceOnUse">${pixelSteps(px)}</filter>`);
}

/** Uma linha de texto centrada (ajustada para caber na largura). */
function centered(defs: Defs, text: string, look: TextLook, size: number, box: Box, align: 'left' | 'center' = 'center'): string {
  const { st, filter } = styled(defs, look, size);
  const f = fitLine(text, st, box.w);
  return drawLines(wrap(text, f, 1e9), f, box, { align, valign: 'middle', filter });
}

export function compose(inp: ComposeInput): string {
  const defs = new Defs(inp.uid);
  const sz = { ...SIZES, ...inp.sizes };
  const look = inp.look;
  const iconStyleFor = (kind: PieceKind, pick?: IconChoice): IconStyle =>
    pick?.style ?? styleInfo(choose(look, kind).ch.style ?? look.style).icons;
  const costIcons = iconStyleFor('cost', look.icons?.cost);
  // {mana}, {vigor}… no texto viram o símbolo do recurso
  const iconFn: IconFn = (id, x, y, s) => (isResource(id) ? drawGlyph(defs, resourceIcon(id)!, costIcons, x, y, s, { color: RESOURCE_COLORS[id] }) : '');
  const knownIcon = isResource;

  // 1) Altura da caixa de regras: mede o texto com as margens internas do estilo escolhido.
  const rulesPick = choose(look, 'rules');
  const probe = rulesPick.ps.render({
    box: { x: RULES_X, y: 0, w: RULES_W, h: 400 }, pal: makePalette(inp.colors), defs: new Defs('probe'), opacity: 1,
  });
  const padL = probe.content.x - RULES_X, padR = RULES_X + RULES_W - (probe.content.x + probe.content.w);
  const padT = probe.content.y, padB = 400 - (probe.content.y + probe.content.h);
  const innerW = RULES_W - padL - padR;
  const rulesLook = textOf(probe, rulesPick.ch);
  const flavorLook = { ...(rulesPick.ps.flavor?.(makePalette(inp.colors)) ?? { ...rulesLook, italic: true }), ...(rulesPick.ch.font ? { family: rulesPick.ch.font } : {}) };

  let rulesSize = sz.rules, flavorSize = sz.flavor;
  const layoutText = () => {
    const rs: TextStyle = { ...rulesLook, size: rulesSize, lineHeight: 1.3 };
    const fs: TextStyle = { ...flavorLook, size: flavorSize, lineHeight: 1.25 };
    const rl = inp.rules.trim() ? wrap(inp.rules, rs, innerW, knownIcon) : [];
    const fl = inp.flavor?.trim() ? wrap(inp.flavor, fs, innerW, knownIcon) : [];
    const gap = rl.length && fl.length ? rulesSize * 1.3 : 0;
    return { rs, fs, rl, fl, gap, need: blockHeight(rl, rs) + gap + blockHeight(fl, fs) };
  };
  let T = layoutText();
  while (T.need + padT + padB > RULES_MAX_H && rulesSize > RULES_MIN_FONT) {
    rulesSize -= 1;
    flavorSize = Math.max(RULES_MIN_FONT, flavorSize - 1);
    T = layoutText();
  }
  const S = skeleton(Math.ceil(T.need + padT + padB));

  // 2) Arte (cobre a carta inteira: full art)
  const clip = defs.add('cardclip', (id) => `<clipPath id="${id}"><path d="${roundRect(S.card, CARD_RADIUS)}"/></clipPath>`);
  // sem arte: fundo na cor da classe com o símbolo em marca-d'água (nunca um retângulo vazio)
  const tint = vivid(inp.colors[0] ?? '#6b5a4a');
  let art = `<rect width="${CARD_W}" height="${CARD_H}" fill="${defs.radial([[0, darken(tint, 0.45)], [0.6, darken(tint, 0.78)], [1, '#0b0909']], 0.5, 0.42, 0.75)}"/>` +
    (inp.art?.src ? '' : drawGlyph(defs, classIcon(inp.colorId), 'chapado', CARD_W / 2 - 230, CARD_H * 0.36 - 230, 460, { color: lighten(tint, 0.2), opacity: 0.1 }));
  let artImg = '';
  if (inp.art?.src) {
    const z = inp.art.zoom ?? 1;
    const w = CARD_W * z, h = CARD_H * z;
    const x = (CARD_W - w) / 2 + (inp.art.x ?? 0), y = (CARD_H - h) / 2 + (inp.art.y ?? 0);
    const mir = inp.art.mirror ? ` transform="translate(${CARD_W} 0) scale(-1 1)"` : '';
    const px = look.pixelateArt;
    const pixFilter = px && px > 1 ? ` filter="${pixelate(defs, px)}"` : '';
    artImg = `<g${mir}${pixFilter}><image href="${inp.art.src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></g>`;
    art += artImg;
  }

  // 3) Peças (a ordem define quem fica por cima)
  type Slot = PieceKind | 'atk' | 'def';
  const outs: Partial<Record<Slot, { out: PieceOut; ch: PieceChoice; ps: PieceStyle; args: Parameters<PieceStyle['render']>[0] }>> = {};
  let pieces = '';
  const add = (kind: PieceKind, box: Box, slot: Slot = kind, variant?: 'atk' | 'def', draw = true) => {
    const { ps, ch } = choose(look, kind);
    if (ch.hidden) return;
    const pal = makePalette(ch.colors?.length ? ch.colors : inp.colors, ch.metal ?? ps.metal);
    const args = { box, pal, defs, opacity: ch.opacity ?? ps.opacity, variant };
    const out = ps.render(args);
    outs[slot] = { out, ch, ps, args };
    if (!draw) return;
    if (out.glass && artImg) {
      const gid = defs.add(`glass:${slot}`, (id) => `<clipPath id="${id}"><path d="${out.glass}"/></clipPath>`);
      pieces += `<g clip-path="url(#${gid})"><g filter="${defs.blur(9)}">${artImg}</g></g>`;
    }
    pieces += out.svg;
  };
  // Moldura em volta da carta é opcional: por padrão a carta é full art, sem borda.
  if (look.pieces?.frame && !look.pieces.frame.hidden) add('frame', S.card);
  add('rules', S.rules);
  add('typeBar', S.typeBar);
  add('header', S.header);
  if (inp.cost) add('cost', S.cost);
  add('class', S.class);
  add('footer', S.footer);
  add('set', S.set);
  const emblemStats = look.icons?.statMode === 'emblema';
  if (inp.stats) { add('stat', S.atk, 'atk', 'atk', !emblemStats); add('stat', S.def, 'def', 'def', !emblemStats); }

  // 4) Textos e símbolos
  let text = '';
  const pix = (o: PieceOut, svg: string) => (o.pixelIcons ? `<g filter="${pixelate(defs, o.pixelIcons)}">${svg}</g>` : svg);

  const H = outs.header;
  if (H) text += centered(defs, inp.name, textOf(H.out, H.ch), sz.title, H.out.content);

  const TB = outs.typeBar;
  if (TB) {
    text += centered(defs, inp.typeLine, textOf(TB.out, TB.ch), sz.type, TB.out.content, 'left');
    if (TB.out.gem) {
      const color = RARITY_COLORS[inp.rarity] ?? RARITY_COLORS.common;
      text += TB.ps.gemRender ? TB.ps.gemRender(TB.out.gem, color) : rarityGem(TB.out.gem, inp.rarity);
    }
  }

  const R = outs.rules;
  if (R) {
    const { filter: rf } = styled(defs, T.rs, T.rs.size);
    const box = R.out.content;
    // centraliza verticalmente o bloco quando sobra espaço (caixa no tamanho mínimo)
    let y = box.y + Math.max(0, box.h - T.need) / 2;
    text += drawLines(T.rl, T.rs, { ...box, y, h: blockHeight(T.rl, T.rs) }, { icon: iconFn, filter: rf });
    y += blockHeight(T.rl, T.rs);
    if (T.fl.length) {
      if (T.rl.length) {
        text += R.ps.divider?.(R.args, box.x, y + T.gap / 2, box.w) ?? '';
        y += T.gap;
      }
      const { filter: ff } = styled(defs, T.fs, T.fs.size);
      text += drawLines(T.fl, T.fs, { ...box, y, h: blockHeight(T.fl, T.fs) }, { icon: iconFn, filter: ff });
    }
  }

  const C = outs.cost;
  if (C && inp.cost) {
    const c = C.out.content;
    const { st } = styled(defs, textOf(C.out, C.ch), sz.cost * (c.h / 90));
    const num = String(inp.cost.amount);
    const glyph = look.icons?.cost?.glyph ?? resourceIcon(inp.cost.resource);
    const iconS = c.h * 0.52;
    const f = fitLine(num, st, c.w * 0.5);
    const numW = measure(num, f);
    const gap = c.h * 0.05;
    const total = (glyph ? iconS + gap : 0) + numW;
    const x0 = c.x + (c.w - total) / 2;
    const color = look.icons?.cost?.color ?? RESOURCE_COLORS[inp.cost.resource as ResourceId];
    if (glyph) text += pix(C.out, drawGlyph(defs, glyph, costIcons, x0, c.y + (c.h - iconS) / 2, iconS, { color }));
    text += centered(defs, num, textOf(C.out, C.ch), f.size, { x: x0 + (glyph ? iconS + gap : 0), y: c.y, w: numW + 2, h: c.h });
  }

  const K = outs.class;
  if (K) {
    const c = K.out.content;
    const s = Math.min(c.w, c.h) * 0.94;
    const pick = look.icons?.class;
    const glyph = pick?.glyph ?? classIcon(inp.colorId);
    const color = pick?.color ?? K.out.iconColor ?? lighten(vivid(K.args.pal.base), 0.3);
    text += pix(K.out, drawGlyph(defs, glyph, iconStyleFor('class', pick), c.x + (c.w - s) / 2, c.y + (c.h - s) / 2, s, { color }));
  }

  const SET = outs.set;
  if (SET && inp.setIcon) {
    const c = SET.out.content;
    text += `<image href="${inp.setIcon}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const F = outs.footer;
  if (F && inp.footer) text += centered(defs, inp.footer, textOf(F.out, F.ch), sz.footer, F.out.content);

  for (const k of ['atk', 'def'] as const) {
    const P = outs[k];
    if (!P || !inp.stats) continue;
    const pick = look.icons?.[k];
    const num = String(inp.stats[k]);
    const tl = textOf(P.out, P.ch);
    const style = iconStyleFor('stat', pick);
    const glyph = pick?.glyph ?? (k === 'atk' ? ATK_ICON : DEF_ICON);
    const color = pick?.color ?? STEEL;
    if (emblemStats) {
      // número dentro de um medalhão com o símbolo apagado ao fundo, sem caixa
      const b = P.args.box;
      const s = b.h * 1.42;
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2 - 4;
      text += drawStatBadge(defs, glyph, style, cx, cy, s, color, pick?.color ?? '#c9a45c');
      text += centered(defs, num, { ...tl, color: '#ffffff' }, sz.stat * 1.08, { x: cx - s * 0.36, y: cy - s * 0.3, w: s * 0.72, h: s * 0.6 });
      continue;
    }
    const c = P.out.content;
    const iconS = c.h * 0.98;
    text += drawGlyph(defs, glyph, style, c.x, c.y + (c.h - iconS) / 2, iconS, { color });
    text += centered(defs, num, tl, sz.stat * (c.h / 56), { x: c.x + iconS, y: c.y, w: c.w - iconS, h: c.h });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}">` +
    `${defs}<g clip-path="url(#${clip})">${art}${pieces}${text}</g></svg>`;
}
