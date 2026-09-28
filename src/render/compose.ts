/**
 * Monta a carta inteira como UMA imagem SVG: arte + peças (cada uma do estilo
 * escolhido) + textos + ícones. A mesma saída serve para o editor, a biblioteca
 * (rasterizada e guardada em cache) e a exportação.
 */
import { luminance } from './color';
import { Defs } from './defs';
import { piece, type PieceKind, type PieceOut, type PieceStyle, type StyleId } from './elements';
import { RARITY_COLORS, rarityGem, textShadow } from './elements/common';
import { CARD_H, CARD_RADIUS, CARD_W, RULES_BOTTOM, RULES_MAX_H, RULES_MIN_H, skeleton } from './layout';
import { makePalette, type MetalKind } from './palette';
import { roundRect, type Box } from './shapes';
import { blockHeight, drawLines, fitLine, measure, wrap, type IconFn, type TextLook, type TextStyle } from './text';

export interface PieceChoice {
  style: StyleId;
  /** Cores próprias da peça (senão, as do deck). */
  colors?: string[];
  opacity?: number;
  metal?: MetalKind;
  hidden?: boolean;
}

export interface Look {
  /** Estilo usado nas peças sem escolha própria. */
  style: StyleId;
  pieces?: Partial<Record<PieceKind, PieceChoice>>;
  /** Pixelar a arte (tamanho do bloco, em px da carta). Combina com o estilo Pixel. */
  pixelateArt?: number;
}

export interface CardAssets {
  resource(id: string): string | undefined;
  classIcon(colorId: string): string | undefined;
  setIcon?: string;
  sword?: string;
  shield?: string;
}

export interface ComposeInput {
  /** Prefixo único dos ids do SVG (id da carta). */
  uid: string;
  colors: string[];
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
  assets: CardAssets;
  /** Tamanhos de fonte de referência (px no espaço 750×1050). */
  sizes?: Partial<typeof SIZES>;
}

export const SIZES = { title: 42, type: 29, rules: 27, flavor: 25, footer: 17, stat: 50, cost: 52 };

const RULES_MIN_FONT = 17;

function choose(look: Look, kind: PieceKind): { ps: PieceStyle; ch: PieceChoice } {
  const ch = look.pieces?.[kind] ?? { style: look.style };
  return { ps: piece(ch.style ?? look.style, kind), ch };
}

function run(inp: ComposeInput, defs: Defs, kind: PieceKind, box: Box, variant?: 'atk' | 'def') {
  const { ps, ch } = choose(inp.look, kind);
  const pal = makePalette(ch.colors?.length ? ch.colors : inp.colors, ch.metal ?? ps.metal);
  const args = { box, pal, defs, opacity: ch.opacity ?? ps.opacity, variant };
  return { ps, ch, args, out: ps.render(args) };
}

/** Estilo de texto final: tamanho + sombra automática para tinta clara. */
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
    `<filter id="${id}" x="0" y="0" width="${CARD_W}" height="${CARD_H}" filterUnits="userSpaceOnUse">` +
    `<feFlood x="${px / 2}" y="${px / 2}" width="1" height="1"/><feComposite width="${px}" height="${px}"/>` +
    `<feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/>` +
    `<feMorphology operator="dilate" radius="${px / 2}"/></filter>`);
}

const image = (href: string | undefined, x: number, y: number, w: number, h: number, extra = '') =>
  href ? `<image href="${href}" x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" preserveAspectRatio="xMidYMid meet"${extra}/>` : '';

export function compose(inp: ComposeInput): string {
  const defs = new Defs(inp.uid);
  const sz = { ...SIZES, ...inp.sizes };
  const iconFn: IconFn = (id, x, y, s) => image(inp.assets.resource(id), x, y, s, s);
  const knownIcon = (id: string) => !!inp.assets.resource(id);

  // 1) Altura da caixa de regras: mede o texto com as margens internas do estilo escolhido.
  const rulesPick = choose(inp.look, 'rules');
  const probe = rulesPick.ps.render({
    box: { x: 48, y: 0, w: 654, h: 400 }, pal: makePalette(inp.colors), defs: new Defs('probe'), opacity: 1,
  });
  const padL = probe.content.x - 48, padR = 48 + 654 - (probe.content.x + probe.content.w);
  const padT = probe.content.y, padB = 400 - (probe.content.y + probe.content.h);
  const innerW = 654 - padL - padR;
  const flavorLook = rulesPick.ps.flavor?.(makePalette(inp.colors)) ?? { ...probe.text, italic: true };

  let rulesSize = sz.rules, flavorSize = sz.flavor;
  const layoutText = () => {
    const rs: TextStyle = { ...probe.text, size: rulesSize, lineHeight: 1.3 };
    const fs: TextStyle = { ...flavorLook, size: flavorSize, lineHeight: 1.25 };
    const rl = inp.rules.trim() ? wrap(inp.rules, rs, innerW, knownIcon) : [];
    const fl = inp.flavor?.trim() ? wrap(inp.flavor, fs, innerW, knownIcon) : [];
    const gap = rl.length && fl.length ? rulesSize * 1.3 : 0;
    const need = blockHeight(rl, rs) + gap + blockHeight(fl, fs);
    return { rs, fs, rl, fl, gap, need };
  };
  let T = layoutText();
  while (T.need + padT + padB > RULES_MAX_H && rulesSize > RULES_MIN_FONT) {
    rulesSize -= 1;
    flavorSize = Math.max(RULES_MIN_FONT, flavorSize - 1);
    T = layoutText();
  }
  const S = skeleton(Math.ceil(T.need + padT + padB));

  // 2) Arte
  const clip = defs.add('cardclip', (id) => `<clipPath id="${id}"><path d="${roundRect(S.card, CARD_RADIUS)}"/></clipPath>`);
  let art = `<rect width="${CARD_W}" height="${CARD_H}" fill="#120e0c"/>`;
  let artImg = '';
  if (inp.art?.src) {
    const z = inp.art.zoom ?? 1;
    const w = CARD_W * z, h = CARD_H * z;
    const x = (CARD_W - w) / 2 + (inp.art.x ?? 0), y = (CARD_H - h) / 2 + (inp.art.y ?? 0);
    const mir = inp.art.mirror ? ` transform="translate(${CARD_W} 0) scale(-1 1)"` : '';
    const px = inp.look.pixelateArt;
    // pixelar: amostra 1 ponto por bloco e dilata até cobrir o bloco inteiro
    const pixFilter = px && px > 1 ? ` filter="${pixelate(defs, px)}"` : '';
    artImg = `<g${mir}${pixFilter}><image href="${inp.art.src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></g>`;
    art += artImg;
  }

  // 3) Peças (ordem = profundidade)
  const outs: Partial<Record<PieceKind | 'atk' | 'def', PieceOut>> = {};
  let pieces = '';
  const add = (kind: PieceKind, box: Box, key: PieceKind | 'atk' | 'def' = kind, variant?: 'atk' | 'def') => {
    const { ch, out } = run(inp, defs, kind, box, variant);
    if (ch.hidden) return;
    outs[key] = out;
    if (out.glass && artImg) {
      const gid = defs.add(`glass:${key}`, (id) => `<clipPath id="${id}"><path d="${out.glass}"/></clipPath>`);
      pieces += `<g clip-path="url(#${gid})"><g filter="${defs.blur(9)}">${artImg}</g></g>`;
    }
    pieces += out.svg;
  };
  // Moldura em volta da carta é opcional: por padrão a carta é full art, sem borda.
  if (inp.look.pieces?.frame && !inp.look.pieces.frame.hidden) add('frame', S.card);
  add('rules', S.rules);
  add('typeBar', S.typeBar);
  add('header', S.header);
  if (inp.cost) add('cost', S.cost);
  add('class', S.class);
  add('footer', S.footer);
  add('set', S.set);
  if (inp.stats) { add('stat', S.atk, 'atk', 'atk'); add('stat', S.def, 'def', 'def'); }

  // 4) Textos e ícones
  let text = '';
  const pix = (o: PieceOut, svg: string) => (o.pixelIcons ? `<g filter="${pixelate(defs, o.pixelIcons)}">${svg}</g>` : svg);
  const H = outs.header;
  if (H) {
    const { st, filter } = styled(defs, H.text, sz.title);
    const f = fitLine(inp.name, st, H.content.w);
    text += drawLines(wrap(inp.name, f, 1e9), f, H.content, { align: 'center', valign: 'middle', filter });
  }
  const TB = outs.typeBar;
  if (TB) {
    const { st, filter } = styled(defs, TB.text, sz.type);
    const f = fitLine(inp.typeLine, st, TB.content.w);
    text += drawLines(wrap(inp.typeLine, f, 1e9), f, TB.content, { align: 'left', valign: 'middle', filter });
    if (TB.gem) {
      const gemFn = choose(inp.look, 'typeBar').ps.gemRender;
      text += gemFn ? gemFn(TB.gem, RARITY_COLORS[inp.rarity] ?? RARITY_COLORS.common) : rarityGem(TB.gem, inp.rarity);
    }
  }
  const R = outs.rules;
  if (R) {
    const { filter: rf } = styled(defs, T.rs, T.rs.size);
    const box = { x: R.content.x, y: R.content.y, w: R.content.w, h: R.content.h };
    // centraliza verticalmente o bloco quando sobra espaço (caixa no tamanho mínimo)
    const slack = Math.max(0, box.h - T.need);
    let y = box.y + slack / 2;
    text += drawLines(T.rl, T.rs, { ...box, y, h: blockHeight(T.rl, T.rs) }, { icon: iconFn, filter: rf });
    y += blockHeight(T.rl, T.rs);
    if (T.fl.length) {
      if (T.rl.length) {
        const { ps, args } = run(inp, defs, 'rules', S.rules);
        text += ps.divider?.(args, box.x, y + T.gap / 2, box.w) ?? '';
        y += T.gap;
      }
      const { filter: ff } = styled(defs, T.fs, T.fs.size);
      text += drawLines(T.fl, T.fs, { ...box, y, h: blockHeight(T.fl, T.fs) }, { icon: iconFn, filter: ff });
    }
  }
  const C = outs.cost;
  if (C && inp.cost) {
    const c = C.content;
    const { st, filter } = styled(defs, C.text, sz.cost * (c.h / 90));
    const num = String(inp.cost.amount);
    const icon = inp.assets.resource(inp.cost.resource);
    const iconS = c.h * 0.44;
    const f = fitLine(num, st, c.w * 0.5);
    const numW = measure(num, f);
    const total = (icon ? iconS + 4 : 0) + numW;
    const x0 = c.x + (c.w - total) / 2;
    text += pix(C, image(icon, x0, c.y + (c.h - iconS) / 2, iconS, iconS));
    text += drawLines(wrap(num, f, 1e9), f, { x: x0 + (icon ? iconS + 4 : 0), y: c.y, w: numW, h: c.h }, { align: 'center', valign: 'middle', filter });
  }
  const K = outs.class;
  if (K) {
    const c = K.content;
    const s = c.w * 0.92;
    text += pix(K, image(inp.assets.classIcon(inp.colorId), c.x + (c.w - s) / 2, c.y + (c.h - s) / 2, s, s));
  }
  const SET = outs.set;
  if (SET && inp.assets.setIcon) {
    const c = SET.content;
    text += image(inp.assets.setIcon, c.x, c.y, c.w, c.h);
  }
  const F = outs.footer;
  if (F && inp.footer) {
    const { st, filter } = styled(defs, F.text, sz.footer);
    const f = fitLine(inp.footer, st, F.content.w);
    text += drawLines(wrap(inp.footer, f, 1e9), f, F.content, { align: 'center', valign: 'middle', filter });
  }
  for (const k of ['atk', 'def'] as const) {
    const P = outs[k];
    if (!P || !inp.stats) continue;
    const c = P.content;
    const { st, filter } = styled(defs, P.text, sz.stat * (c.h / 56));
    const num = String(inp.stats[k]);
    const iconS = c.h * 0.92;
    text += P.icon ?? image(k === 'atk' ? inp.assets.sword : inp.assets.shield, c.x + 2, c.y + (c.h - iconS) / 2, iconS, iconS);
    const f = fitLine(num, st, c.w - iconS - 6);
    text += drawLines(wrap(num, f, 1e9), f, { x: c.x + iconS + 4, y: c.y, w: c.w - iconS - 6, h: c.h }, { align: 'center', valign: 'middle', filter });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}">` +
    `${defs}<g clip-path="url(#${clip})">${art}${pieces}${text}</g></svg>`;
}

export { RULES_BOTTOM, RULES_MIN_H };
