/**
 * Monta a carta inteira como UMA imagem SVG: arte + peças (cada uma do estilo
 * escolhido) + textos + símbolos. A mesma saída serve para o editor, a biblioteca
 * (rasterizada e guardada em cache) e a exportação.
 */
import { darken, lighten, luminance, mix } from './color';
import { Defs } from './defs';
import { piece, styleInfo, type PieceKind, type PieceOut, type PieceStyle, type StyleId } from './elements';
import { RARITY_COLORS, rarityGem, textShadow } from './elements/common';
import { ATK_ICON, classIcon, DEF_ICON, isResource, RESOURCE_COLORS, resourceIcon, STEEL } from './icons/glyphs';
import { drawGlyph, drawStatBadge, pixelSteps, type IconStyle } from './icons/render';
import type { ResourceId } from '../model/types';
import { CARD_H, CARD_RADIUS, CARD_W, RULES_MAX_H, RULES_MIN_H, skeleton, type Skeleton } from './layout';
import { makePalette, MULTICOLOR_GOLD, vivid, type BlendMode, type MetalKind } from './palette';
import { COST_MAX_W, planCost, type CostItem, type CostPlan } from './costSeal';
import { DEFAULT_PAD, drawPieceImage, imageBox, imageContent, type PieceImage } from './pieceImage';
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
  /** Tamanho da peça (1 = padrão do esqueleto; 0,5 a 1,6). O conteúdo acompanha. */
  size?: number;
  /** Cor do fundo do painel (miolo), no lugar da cor que o estilo usa. */
  fill?: string;
  /** Imagem do usuário no lugar do desenho do estilo (ver pieceImage.ts). */
  image?: PieceImage;
}

/** Símbolo enviado pelo usuário (PNG/SVG). */
export interface IconImage {
  mediaId: string;
  /** Preenchido na hora de desenhar (URL); não é salvo. */
  src?: string;
  /** Pintar a imagem toda na cor do símbolo (para ícones de uma cor só). Senão, cores originais. */
  recolor?: boolean;
}

/** Escolha de um símbolo: estilo de desenho, qual símbolo e cor (ou uma imagem própria). */
export interface IconChoice {
  style?: IconStyle; glyph?: string; color?: string; image?: IconImage;
  /** Tamanho do símbolo (1 = padrão do estilo; 0,5 a 1,8). */
  size?: number;
  /**
   * Tamanho do número ao lado do símbolo (custo, ataque, defesa). Sem valor, o
   * número do custo acompanha o símbolo e os de ataque/defesa ficam no padrão.
   */
  numSize?: number;
  /** Custo: espaço extra entre o símbolo e o número (fração da altura do selo; negativo aproxima). */
  gap?: number;
}

/** Peças que podem ter escolhas próprias: as do estilo e, dentro de "stat", o ataque e a defesa separados. */
export type PieceSlot = PieceKind | 'atk' | 'def';

/** O que a carta está usando de fato (para o editor mostrar nos seletores a cor que está aplicada). */
export interface ComposeInfo {
  /** Cor do texto de cada peça. */
  ink: Partial<Record<PieceSlot, string>>;
  /** Cor do fundo de cada peça (ausente = o estilo não tem fundo trocável nessa peça). */
  fill: Partial<Record<PieceSlot, string>>;
  /** Cor de cada símbolo: ataque, defesa, um por recurso do custo (`res:mana`…) e um por classe (`cls:red`…). */
  icon: Record<string, string>;
}

/** Aumenta/diminui um desenho em volta do centro (cx, cy). */
function scaled(svg: string, cx: number, cy: number, k?: number): string {
  if (!svg || !k || Math.abs(k - 1) < 0.005) return svg;
  const f = (n: number) => +n.toFixed(2);
  return `<g transform="translate(${f(cx)} ${f(cy)}) scale(${+k.toFixed(3)}) translate(${f(-cx)} ${f(-cy)})">${svg}</g>`;
}

/** Filtro que pinta a imagem inteira numa cor (mantém só o formato/transparência). */
function recolorFilter(defs: Defs, color: string): string {
  return defs.url(`recolor:${color}`, (id) =>
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feFlood flood-color="${color}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`);
}

/** Desenha o símbolo: a imagem do usuário, se houver; senão, o símbolo da biblioteca. */
function symbol(defs: Defs, pick: IconChoice | undefined, glyph: string, style: IconStyle, x: number, y: number, s: number, color: string): string {
  const im = pick?.image;
  if (im?.src) {
    const f = im.recolor ? ` filter="${recolorFilter(defs, color)}"` : '';
    return `<image href="${im.src}" x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+s.toFixed(2)}" height="${+s.toFixed(2)}" preserveAspectRatio="xMidYMid meet"${f}/>`;
  }
  return drawGlyph(defs, glyph, style, x, y, s, { color });
}

export interface Look {
  /** Estilo usado nas peças sem escolha própria. */
  style: StyleId;
  pieces?: Partial<Record<PieceSlot, PieceChoice>>;
  icons?: {
    /** Custo: acabamento e tamanhos (valem para todos os recursos). O símbolo/cor daqui vale só para o 1º recurso (formato antigo). */
    cost?: IconChoice;
    /** Símbolo, cor ou imagem de cada recurso (mana, vigor…). */
    res?: Partial<Record<string, IconChoice>>;
    /** Símbolo, cor ou imagem de cada classe (red, blue…). O de `class` vale só para a 1ª classe da carta (formato antigo). */
    cls?: Partial<Record<string, IconChoice>>;
    class?: IconChoice;
    atk?: IconChoice;
    def?: IconChoice;
    /** Selo da edição (só o tamanho). */
    set?: { size?: number };
    /** 'todas' = um símbolo por classe da carta (padrão); 'primeira' = só o da 1ª classe. */
    classMode?: 'todas' | 'primeira';
    /** 'placa' = símbolo + número numa caixinha; 'emblema' = número dentro do símbolo, sem caixa. */
    statMode?: 'placa' | 'emblema';
    /** Não mostrar o selo de custo quando o custo for 0 (recursos, equipamentos). */
    hideZeroCost?: boolean;
  };
  /** Pixelar a arte (tamanho do bloco, em px da carta). Combina com o estilo Pixel. */
  pixelateArt?: number;
  /**
   * De onde vêm as cores da carta:
   *  classes  — as cores das classes/decks da carta (padrão)
   *  ouro     — cartas de 2+ cores ficam douradas (como o multicolor do MTG)
   *  primeira — só a primeira cor
   *  livre    — as cores de `tint`, escolhidas à mão
   */
  colorMode?: 'classes' | 'ouro' | 'primeira' | 'livre';
  /** Cores livres (1 a 5) quando colorMode = 'livre'. */
  tint?: string[];
  /** Como as cores se misturam nas peças. */
  blend?: BlendMode;
}

/**
 * Arte provisória (cartas de teste): luz na cor da classe, anéis finos e o
 * símbolo grande no centro da área da arte, com brilho.
 */
function placeholderArt(defs: Defs, icon: string, tint: string): string {
  const cx = CARD_W / 2, cy = CARD_H * 0.34, size = 400;
  const fill = defs.linear([[0, lighten(tint, 0.75)], [0.55, lighten(tint, 0.25)], [1, darken(tint, 0.15)]]);
  let rings = '';
  for (const r of [230, 290, 360]) rings += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${lighten(tint, 0.4)}" stroke-width="1.5" opacity="${(0.32 - r / 1600).toFixed(2)}"/>`;
  return `<rect width="${CARD_W}" height="${CARD_H}" fill="${defs.radial([[0, lighten(tint, 0.05)], [0.45, darken(tint, 0.45)], [1, '#07060a']], 0.5, 0.34, 0.75)}"/>` +
    rings +
    `<g filter="${defs.glow(lighten(tint, 0.3), 14, 0.55)}" opacity=".95">${drawGlyph(defs, icon, 'chapado', cx - size / 2, cy - size / 2, size, { color: '#ffffff' }).replace(/fill="#ffffff"/g, `fill="${fill}"`)}</g>`;
}

/** A moldura aparece? Nos estilos com moldura própria, sim (a menos que desligada). */
export function frameOn(look: Look): boolean {
  const f = look.pieces?.frame;
  return f ? !f.hidden : !!styleInfo(look.style).frame;
}

/** Cores efetivas da carta segundo o modo de cor escolhido. */
export function cardColors(colors: string[], look: Look): string[] {
  switch (look.colorMode) {
    case 'ouro': return colors.length > 1 ? [MULTICOLOR_GOLD] : colors;
    case 'primeira': return colors.slice(0, 1);
    case 'livre': return look.tint?.length ? look.tint.slice(0, 5) : colors;
    default: return colors.slice(0, 5);
  }
}

export interface ComposeInput {
  /** Prefixo único dos ids do SVG (id da carta). */
  uid: string;
  colors: string[];
  /** Deck (define o símbolo de classe padrão). */
  colorId: string;
  art?: { src: string; zoom?: number; x?: number; y?: number; mirror?: boolean };
  /** Arte provisória: símbolo da biblioteca sobre fundo na cor da classe. */
  artIcon?: string;
  name: string;
  typeLine: string;
  rules: string;
  flavor?: string;
  footer?: string;
  /** Custos (vazio = sem custo). */
  cost?: CostItem[] | null;
  /** Todas as classes (cores) da carta; o selo de classe mostra um símbolo por classe. */
  classIds?: string[];
  stats?: { atk: number; def: number } | null;
  rarity: string;
  look: Look;
  /** Imagem do símbolo da edição (logo do set). */
  setIcon?: string;
  /** Preencher também o relatório do que foi aplicado (cores de texto, fundo e símbolos) — só o editor pede. */
  info?: boolean;
  /** Tamanhos de fonte de referência (px no espaço 750×1050). */
  sizes?: Partial<typeof SIZES>;
}

export const SIZES = { title: 42, type: 29, rules: 27, flavor: 25, footer: 17, stat: 50, cost: 52 };

const RULES_MIN_FONT = 17;

/**
 * Desenha uma peça: pelo estilo ou, se o usuário escolheu, pela imagem dele.
 * A aparência do texto (fonte, cor) continua vindo do estilo da peça.
 */
function renderPiece(kind: PieceKind, ps: PieceStyle, ch: PieceChoice, args: Parameters<PieceStyle['render']>[0]): PieceOut {
  const base = ps.render(args);
  const img = ch.image;
  if (!img) return base;
  const out: PieceOut = {
    svg: drawPieceImage(args.defs, args.box, img, vivid(args.pal.base), ch.opacity ?? 1),
    content: imageContent(kind, args.box, img),
    text: base.text,
  };
  // barra de tipo: a joia de raridade fica no meio da margem direita (se couber)
  const padR = (img.pad ?? DEFAULT_PAD[kind])[1];
  if (kind === 'typeBar' && padR >= 40) {
    const b = imageBox(args.box, img);
    const s = Math.min(30, b.h * 0.55);
    out.gem = { x: b.x + b.w - padR / 2 - s / 2, y: b.y + b.h / 2 - s / 2, w: s, h: s };
  }
  return out;
}

function choose(look: Look, kind: PieceKind, slot?: 'atk' | 'def'): { ps: PieceStyle; ch: PieceChoice } {
  // ataque e defesa: o que vale para os dois + o que for só de um
  const side = slot ? look.pieces?.[slot] : undefined;
  const own = side ? ({ ...look.pieces?.[kind], ...side } as PieceChoice) : look.pieces?.[kind];
  // peça que o estilo esconde por padrão, se o usuário não disse nada sobre ela
  const hiddenByStyle = own?.hidden === undefined && !!styleInfo(look.style).hidden?.includes(kind);
  const ch = own ? (hiddenByStyle ? { ...own, hidden: true } : own) : { style: look.style, ...(hiddenByStyle ? { hidden: true } : {}) };
  return { ps: piece(ch.style ?? look.style, kind), ch };
}

/** Aplica cor de texto e fonte escolhidas pelo usuário sobre o padrão do estilo. */
function textOf(out: PieceOut, ch: PieceChoice): TextLook {
  // fundo escolhido e cor de texto não: escolhe claro ou escuro para dar leitura
  const auto = ch.fill && !ch.ink ? { color: inkFor(ch.fill), glow: undefined } : {};
  return { ...out.text, ...auto, ...(ch.ink ? { color: ch.ink } : {}), ...(ch.font ? { family: ch.font } : {}) };
}

/** Cor de texto legível sobre um fundo. */
export const inkFor = (bg: string) => (luminance(bg) > 0.45 ? '#1d1712' : '#fbf5ec');

/** Estilo de texto final: tamanho + legibilidade (sombra dura, brilho ou sombra suave). */
function styled(defs: Defs, look: TextLook, size: number): { st: TextStyle; filter?: string } {
  const st: TextStyle = { ...look, size };
  let filter: string | undefined;
  if (look.hard) filter = defs.url('hardshadow', (id) =>
    `<filter id="${id}" x="-10%" y="-20%" width="130%" height="160%"><feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="#000" flood-opacity="1"/></filter>`);
  else if (look.glow) filter = defs.glow(look.glow, 3, 0.85);
  else if (look.shadow) filter = textShadow(defs, look.shadow, 1, 3.2, 1.6);
  else if (luminance(look.color) > 0.45) filter = textShadow(defs, '#000', 0.9, 1.8, 1.6);
  return { st, filter };
}

/** Pixelar: amostra 1 ponto por bloco e dilata até cobrir o bloco inteiro. */
function pixelate(defs: Defs, px: number): string {
  return defs.url(`pixelate:${px}`, (id) =>
    `<filter id="${id}" x="0" y="0" width="${CARD_W}" height="${CARD_H}" filterUnits="userSpaceOnUse">${pixelSteps(px)}</filter>`);
}

/** Uma linha de texto centrada (ajustada para caber na largura). */
export function centered(defs: Defs, text: string, look: TextLook, size: number, box: Box, align: 'left' | 'center' = 'center', minScale = 0.6): string {
  const { st, filter } = styled(defs, look, size);
  const f = fitLine(text, st, box.w, size * minScale);
  return drawLines(wrap(text, f, 1e9), f, box, { align, valign: 'middle', filter });
}

export function composeEx(inp: ComposeInput): { svg: string; info: ComposeInfo } {
  const defs = new Defs(inp.uid);
  const sz = { ...SIZES, ...inp.sizes };
  const look = inp.look;
  const colors = cardColors(inp.colors, look);
  const blend = look.blend ?? 'faixas';
  // acabamento dos símbolos: o escolhido ou o do estilo geral (trocar o estilo de uma peça não mexe nos símbolos)
  const iconStyleFor = (pick?: IconChoice): IconStyle => pick?.style ?? styleInfo(look.style).icons;
  const costIcons = iconStyleFor(look.icons?.cost);
  const used: ComposeInfo = { ink: {}, fill: {}, icon: {} };
  // {mana}, {vigor}… no texto viram o símbolo do recurso
  const iconFn: IconFn = (id, x, y, s) => (isResource(id) ? drawGlyph(defs, resourceIcon(id)!, costIcons, x, y, s, { color: RESOURCE_COLORS[id] }) : '');
  const knownIcon = isResource;

  // 1) Altura da caixa de regras: mede o texto com as margens internas do estilo escolhido.
  const info = styleInfo(look.style);
  const rulesMax = info.rulesMax ?? RULES_MAX_H;
  const layoutFor = (h: number): Skeleton => ({ ...skeleton(h), ...info.layout?.(Math.max(RULES_MIN_H, Math.min(rulesMax, h))) });
  const probeRules = layoutFor(400).rules;
  const rulesPick = choose(look, 'rules');
  const probe = renderPiece('rules', rulesPick.ps, rulesPick.ch, {
    box: { x: probeRules.x, y: 0, w: probeRules.w, h: 400 }, pal: makePalette(colors, undefined, blend), defs: new Defs("probe"), opacity: 1,
  });
  const padT = probe.content.y, padB = 400 - (probe.content.y + probe.content.h);
  const innerW = probe.content.w;
  const rulesLook = textOf(probe, rulesPick.ch);
  const flavorLook = {
    ...(rulesPick.ps.flavor?.(makePalette(colors, undefined, blend)) ?? { ...rulesLook, italic: true }),
    ...(rulesPick.ch.fill && !rulesPick.ch.ink ? { color: mix(inkFor(rulesPick.ch.fill), rulesPick.ch.fill, 0.28), glow: undefined } : {}),
    ...(rulesPick.ch.font ? { family: rulesPick.ch.font } : {}),
  };

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
  while (T.need + padT + padB > rulesMax && rulesSize > RULES_MIN_FONT) {
    rulesSize -= 1;
    flavorSize = Math.max(RULES_MIN_FONT, flavorSize - 1);
    T = layoutText();
  }
  const S = layoutFor(Math.ceil(T.need + padT + padB));
  // tamanho escolhido por peça: a caixa cresce/encolhe em volta do centro
  const resize = (b: Box, k?: number): Box => (!k || Math.abs(k - 1) < 0.005 ? b : { x: b.x + (b.w * (1 - k)) / 2, y: b.y + (b.h * (1 - k)) / 2, w: b.w * k, h: b.h * k });
  for (const k of ['cost', 'class', 'set', 'header', 'typeBar', 'footer'] as const) S[k] = resize(S[k], look.pieces?.[k]?.size);
  S.atk = resize(S.atk, look.pieces?.atk?.size ?? look.pieces?.stat?.size);
  S.def = resize(S.def, look.pieces?.def?.size ?? look.pieces?.stat?.size);

  // 2) Arte (cobre a carta inteira: full art)
  const clip = defs.add('cardclip', (id) => `<clipPath id="${id}"><path d="${roundRect(S.card, CARD_RADIUS)}"/></clipPath>`);
  // sem arte: fundo na cor da classe com o símbolo em marca-d'água (nunca um retângulo vazio)
  const tint = vivid(colors[0] ?? "#6b5a4a");
  let art = `<rect width="${CARD_W}" height="${CARD_H}" fill="${defs.radial([[0, darken(tint, 0.45)], [0.6, darken(tint, 0.78)], [1, '#0b0909']], 0.5, 0.42, 0.75)}"/>` +
    (inp.art?.src ? '' : inp.artIcon ? placeholderArt(defs, inp.artIcon, tint) : drawGlyph(defs, classIcon(inp.colorId), 'chapado', CARD_W / 2 - 230, CARD_H * 0.36 - 230, 460, { color: lighten(tint, 0.2), opacity: 0.1 }));
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
    const { ps, ch } = choose(look, kind, variant);
    if (ch.hidden) return;
    const pal = makePalette(ch.colors?.length ? ch.colors : colors, ch.metal ?? ps.metal, blend);
    const args = { box, pal, defs, opacity: ch.opacity ?? ps.opacity, variant, layout: S, fill: ch.fill };
    const out = renderPiece(kind, ps, ch, args);
    outs[slot] = { out, ch, ps, args };
    if (inp.info) {
      used.ink[slot] = textOf(out, ch).color;
      const f = ch.image ? undefined : ch.fill ?? defaultFill(ps, args);
      if (f) used.fill[slot] = f;
    }
    if (!draw) return;
    if (out.glass && artImg) {
      const gid = defs.add(`glass:${slot}`, (id) => `<clipPath id="${id}"><path d="${out.glass}"/></clipPath>`);
      pieces += `<g clip-path="url(#${gid})"><g filter="${defs.blur(9)}">${artImg}</g></g>`;
    }
    pieces += out.svg;
  };
  // Moldura: nos estilos "de modelo" faz parte do visual (ligada por padrão);
  // nos outros é opcional e a carta é full art, sem borda.
  if (frameOn(look)) add('frame', S.card);
  const F0 = outs.frame?.out;
  if (F0?.under || F0?.artClip) {
    // fundo da carta por baixo; a arte só dentro da janela da moldura
    let inside = artImg || (F0.artClip ? drawGlyph(defs, classIcon(inp.colorId), 'chapado', CARD_W / 2 - 200, CARD_H * 0.3 - 200, 400, { color: lighten(tint, 0.25), opacity: 0.12 }) : '');
    if (F0.artClip && inside) {
      const wid = defs.add('artwin', (id) => `<clipPath id="${id}"><path d="${F0.artClip}"/></clipPath>`);
      inside = (artImg ? '' : `<path d="${F0.artClip}" fill="${defs.radial([[0, darken(tint, 0.35)], [1, darken(tint, 0.8)]], 0.5, 0.4, 0.7)}"/>`) +
        `<g clip-path="url(#${wid})">${inside}</g>`;
    }
    art = (F0.under ?? art.replace(artImg, '')) + inside;
  }
  // Selo de custo: arranja os símbolos e alarga o selo (e encurta o cabeçalho) se precisar
  let costPlan: CostPlan | undefined;
  const costPick = choose(look, 'cost');
  const zero = (look.icons?.hideZeroCost ?? info.hideZeroCost ?? false) && (inp.cost ?? []).every((p) => !p.amount);
  if (inp.cost?.length && !costPick.ch.hidden && !zero) {
    const probeOut = renderPiece('cost', costPick.ps, costPick.ch, { box: S.cost, pal: makePalette(colors, undefined, blend), defs: new Defs('probe'), opacity: 1 });
    const c0 = probeOut.content;
    const tl = textOf(probeOut, costPick.ch);
    costPlan = planCost(inp.cost, c0.h, (t, size) => measure(t, { ...tl, size }), sz.cost * (c0.h / 90), c0.w + COST_MAX_W - S.cost.w, undefined, look.icons?.cost?.gap ?? 0);
    const need = costPlan.width + c0.h * 0.08 - c0.w;
    if (need > 0) {
      S.cost = { ...S.cost, w: S.cost.w + need };
      const shift = S.cost.x + S.cost.w - 34 - S.header.x;
      if (shift > 0) S.header = { ...S.header, x: S.header.x + shift, w: S.header.w - shift };
    }
  }
  // Selo de classe: um símbolo por classe (carta de várias cores); o selo se alarga para a esquerda
  const classIds = look.icons?.classMode === 'primeira' || !inp.classIds?.length ? [inp.colorId] : inp.classIds;
  let classPlan: CostPlan | undefined;
  const classPick = choose(look, 'class');
  if (classIds.length > 1 && !classPick.ch.hidden) {
    const c0 = renderPiece('class', classPick.ps, classPick.ch, { box: S.class, pal: makePalette(colors, undefined, blend), defs: new Defs('probe'), opacity: 1 }).content;
    classPlan = planCost(classIds.map((id) => ({ resource: id, amount: 1, show: 'repeat' as const })), c0.h, () => 0, 0, c0.w + COST_MAX_W - S.class.w, 0.8);
    const need = classPlan.width + c0.h * 0.08 - c0.w;
    if (need > 0) {
      S.class = { ...S.class, x: S.class.x - need, w: S.class.w + need };
      const over = S.header.x + S.header.w - (S.class.x + 34);
      if (over > 0) S.header = { ...S.header, w: S.header.w - over };
    }
  }
  // sem selo de custo ou de classe: a barra do nome ocupa o lugar dele (se estiver na mesma linha)
  const sameRow = (a: Box, b: Box) => a.y < b.y + b.h && b.y < a.y + a.h;
  const H0 = S.header;
  if (!costPlan && sameRow(S.cost, H0) && S.cost.x < H0.x) {
    const x = Math.max(S.cost.x, 24);
    S.header = { ...S.header, x, w: S.header.w + (H0.x - x) };
  }
  if ((classPick.ch.hidden || choose(look, 'class').ch.hidden) && sameRow(S.class, H0) && S.class.x > H0.x) {
    const right = Math.min(S.class.x + S.class.w, CARD_W - 24);
    S.header = { ...S.header, w: right - S.header.x };
  }
  add('rules', S.rules);
  add('typeBar', S.typeBar);
  add('header', S.header);
  if (costPlan) add('cost', S.cost);
  add('class', S.class);
  add('footer', S.footer);
  add('set', S.set);
  const emblemStats = look.icons?.statMode === 'emblema';
  if (inp.stats) { add('stat', S.atk, 'atk', 'atk', !emblemStats); add('stat', S.def, 'def', 'def', !emblemStats); }

  // 4) Textos e símbolos
  let text = '';
  const pix = (o: PieceOut, svg: string) => (o.pixelIcons ? `<g filter="${pixelate(defs, o.pixelIcons)}">${svg}</g>` : svg);

  const H = outs.header;
  // o nome pode encolher mais: com vários custos/classes os selos largos estreitam a barra
  if (H) text += centered(defs, inp.name, textOf(H.out, H.ch), sz.title, H.out.content, H.out.align ?? 'center', 0.4);

  const TB = outs.typeBar;
  if (TB) {
    text += centered(defs, inp.typeLine, textOf(TB.out, TB.ch), sz.type, TB.out.content, TB.out.align ?? 'left');
    if (TB.out.gem) {
      const color = RARITY_COLORS[inp.rarity] ?? RARITY_COLORS.common;
      text += TB.ps.gemRender ? TB.ps.gemRender(TB.out.gem, color, defs) : rarityGem(TB.out.gem, inp.rarity);
    }
  }

  const R = outs.rules;
  if (R) {
    const { filter: rf } = styled(defs, T.rs, T.rs.size);
    const box = R.out.content;
    // centraliza verticalmente o bloco quando sobra espaço (caixa no tamanho mínimo)
    let y = box.y + Math.max(0, box.h - T.need) / 2;
    text += drawLines(T.rl, T.rs, { ...box, y, h: blockHeight(T.rl, T.rs) }, { icon: iconFn, filter: rf, align: R.out.align });
    y += blockHeight(T.rl, T.rs);
    if (T.fl.length) {
      if (T.rl.length) {
        text += R.ps.divider?.(R.args, box.x, y + T.gap / 2, box.w) ?? '';
        y += T.gap;
      }
      const { filter: ff } = styled(defs, T.fs, T.fs.size);
      text += drawLines(T.fl, T.fs, { ...box, y, h: blockHeight(T.fl, T.fs) }, { icon: iconFn, filter: ff, align: R.out.align });
    }
  }

  const C = outs.cost;
  if (C && costPlan && inp.cost) {
    const c = C.out.content;
    const before = text;
    text = '';
    const x0 = c.x + (c.w - costPlan.width) / 2;
    const first = inp.cost[0].resource;
    const cs = look.icons?.cost;
    // tamanhos: sem tamanho próprio do número, o conjunto todo cresce junto; com ele, símbolo e número crescem cada um no seu lugar
    // (tamanhos iguais contam como "juntos": o conjunto cresce inteiro, sem o símbolo encostar no número)
    const split = cs?.numSize != null && Math.abs(cs.numSize - (cs.size ?? 1)) > 0.001;
    for (const u of costPlan.units) {
      const res = inp.cost[u.part].resource;
      // símbolo de cada recurso; o escolhido no formato antigo (icons.cost) vale para o primeiro
      const own = look.icons?.res?.[res];
      const pick: IconChoice | undefined = own || res === first ? { ...(res === first ? cs : undefined), ...own } : undefined;
      const glyph = pick?.glyph ?? resourceIcon(res);
      const color = pick?.color ?? RESOURCE_COLORS[res as ResourceId];
      used.icon[`res:${res}`] = color;
      const sx = x0 + u.x + u.s / 2, sy = c.y + u.y + u.s / 2;
      let sym = '';
      if (glyph && C.out.costOrbs) {
        // esfera de energia na cor do recurso, com o símbolo escuro por cima
        const r = u.s * 0.56;
        sym = `<circle cx="${sx}" cy="${sy}" r="${r + 1.5}" fill="#0c0c0e"/>` +
          `<circle cx="${sx}" cy="${sy}" r="${r}" fill="${defs.radial([[0, lighten(color, 0.55)], [0.55, color], [1, darken(color, 0.35)]], 0.38, 0.3, 0.8)}"/>` +
          symbol(defs, pick, glyph, costIcons, sx - r * 0.72, sy - r * 0.72, r * 1.44, '#141416');
      } else if (glyph) sym = pix(C.out, symbol(defs, pick, glyph, costIcons, x0 + u.x, c.y + u.y, u.s, color));
      text += split ? scaled(sym, sx, sy, cs?.size) : sym;
      if (u.num) {
        const nb = { x: x0 + u.num.x, y: c.y + u.y - u.s * 0.2, w: u.num.w + 2, h: u.s * 1.4 };
        const num = centered(defs, u.num.text, textOf(C.out, C.ch), u.num.size, nb);
        text += split ? scaled(num, nb.x + nb.w / 2, nb.y + nb.h / 2, cs?.numSize) : num;
      }
    }
    text = before + (split ? text : scaled(text, c.x + c.w / 2, c.y + c.h / 2, cs?.size));
  }

  const K = outs.class;
  if (K) {
    const c = K.out.content;
    const pick = look.icons?.class;
    const before = text;
    text = '';
    const style = iconStyleFor(pick);
    /** Escolha de uma classe: a própria (icons.cls) por cima da antiga, que valia só para a 1ª classe da carta. */
    const clsPick = (id: string, first: boolean): IconChoice | undefined => {
      const own = look.icons?.cls?.[id];
      return own || (first && pick) ? { ...(first ? pick : undefined), ...own } : undefined;
    };
    if (classPlan) {
      // várias classes: cada símbolo na cor da sua classe
      const x0 = c.x + (c.w - classPlan.width) / 2;
      for (const u of classPlan.units) {
        const id = classIds[u.part];
        const pk = clsPick(id, u.part === 0);
        const glyph = pk?.glyph ?? classIcon(id);
        const color = pk?.color ?? K.out.iconColor ?? lighten(vivid(inp.colors[u.part] ?? K.args.pal.base), 0.3);
        used.icon[`cls:${id}`] = color;
        if (u.part === 0) used.icon.class = color;
        text += pix(K.out, symbol(defs, pk, glyph, style, x0 + u.x, c.y + u.y, u.s, color));
      }
    } else {
      const s = Math.min(c.w, c.h) * 0.94;
      const pk = clsPick(inp.colorId, true);
      const glyph = pk?.glyph ?? classIcon(inp.colorId);
      const color = pk?.color ?? K.out.iconColor ?? lighten(vivid(K.args.pal.base), 0.3);
      used.icon[`cls:${inp.colorId}`] = color;
      used.icon.class = color;
      text += pix(K.out, symbol(defs, pk, glyph, style, c.x + (c.w - s) / 2, c.y + (c.h - s) / 2, s, color));
    }
    text = before + scaled(text, c.x + c.w / 2, c.y + c.h / 2, pick?.size);
  }

  const SET = outs.set;
  if (SET && inp.setIcon) {
    const c = SET.out.content;
    text += scaled(`<image href="${inp.setIcon}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" preserveAspectRatio="xMidYMid meet"/>`, c.x + c.w / 2, c.y + c.h / 2, look.icons?.set?.size);
  }

  const F = outs.footer;
  if (F && inp.footer) text += centered(defs, inp.footer, textOf(F.out, F.ch), sz.footer, F.out.content);

  for (const k of ['atk', 'def'] as const) {
    const P = outs[k];
    if (!P || !inp.stats) continue;
    const pick = look.icons?.[k];
    const num = String(inp.stats[k]);
    const tl = textOf(P.out, P.ch);
    const style = iconStyleFor(pick);
    const glyph = pick?.glyph ?? (k === 'atk' ? ATK_ICON : DEF_ICON);
    const color = pick?.color ?? P.out.iconColor ?? STEEL;
    used.icon[k] = color;
    if (emblemStats) {
      // número dentro de um medalhão com o símbolo apagado ao fundo, sem caixa
      const b = P.args.box;
      const s = b.h * 1.42;
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2 - 4;
      const badge = (pick?.image?.src
        ? symbol(defs, pick, glyph, style, cx - s / 2, cy - s / 2, s, color)
        : drawStatBadge(defs, glyph, style, cx, cy, s, color, pick?.color ?? '#c9a45c')) +
        scaled(centered(defs, num, { ...tl, color: '#ffffff' }, sz.stat * 1.08, { x: cx - s * 0.36, y: cy - s * 0.3, w: s * 0.72, h: s * 0.6 }), cx, cy, pick?.numSize != null ? pick.numSize / (pick.size ?? 1) : 1);
      if (inp.info) used.ink[k] = '#ffffff';
      text += scaled(badge, cx, cy, pick?.size);
      continue;
    }
    const c = P.out.content;
    const iconS = c.h * 0.98;
    text += scaled(symbol(defs, pick, glyph, style, c.x, c.y + (c.h - iconS) / 2, iconS, color), c.x + iconS / 2, c.y + c.h / 2, pick?.size);
    const nb = { x: c.x + iconS, y: c.y, w: c.w - iconS, h: c.h };
    text += scaled(centered(defs, num, tl, sz.stat * (c.h / 56), nb), nb.x + nb.w / 2, nb.y + nb.h / 2, pick?.numSize);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}">` +
    `${defs}<g clip-path="url(#${clip})">${art}${pieces}${text}</g></svg>`;
  return { svg, info: used };
}

/** A carta desenhada (SVG). */
export const compose = (inp: ComposeInput): string => composeEx(inp).svg;

/**
 * Cor de fundo que o estilo usa numa peça quando o usuário não escolheu nenhuma:
 * desenha a peça com uma cor-marcador e vê o que estava no lugar dela. Devolve
 * `undefined` se a peça não tem fundo trocável nesse estilo.
 */
export function defaultFill(ps: PieceStyle, args: Parameters<PieceStyle['render']>[0]): string | undefined {
  const MARK = '#01fe02';
  const d0 = new Defs('f'), d1 = new Defs('f');
  const a = ps.render({ ...args, defs: d0, fill: undefined });
  const b = ps.render({ ...args, defs: d1, fill: MARK });
  const sa = (a.under ?? '') + a.svg, sb = (b.under ?? '') + b.svg;
  const at = sb.indexOf(MARK);
  if (at < 0) return undefined;
  // o marcador entrou no lugar de uma cor ou de um degradê: lê o que havia ali (até a aspa)
  const was = sa.slice(at, sa.indexOf('"', at));
  if (/^#[0-9a-f]{6}$/i.test(was)) return was;
  if (/^#[0-9a-f]{3}$/i.test(was)) return '#' + [...was.slice(1)].map((ch) => ch + ch).join('');
  const id = /^url\(#([^)]+)\)/.exec(was)?.[1];
  if (!id) return undefined;
  const grad = new RegExp(`id="${id}"[^>]*>(.*?)</(?:linear|radial)Gradient>`).exec(d0.toString())?.[1];
  const stops = [...(grad ?? '').matchAll(/stop-color="(#[0-9a-f]{6})"/gi)].map((m) => m[1]);
  return stops.length ? stops[Math.floor(stops.length / 2)] : undefined;
}
