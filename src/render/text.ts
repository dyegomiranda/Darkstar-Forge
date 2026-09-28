/**
 * Texto da carta: medido com a fonte real (canvas) e escrito como <text> no SVG.
 * Suporta ícones no meio da frase ({mana}, {vigor}…), parágrafos e redução
 * automática do tamanho quando o texto não cabe.
 */
import type { Box } from './shapes';

export interface TextLook {
  family: string;
  weight?: number;
  italic?: boolean;
  color: string;
  caps?: boolean;
  /** espaçamento entre letras, em em */
  tracking?: number;
  /** sombra/contorno para legibilidade sobre fundo escuro ou arte */
  shadow?: string;
  /** brilho colorido (estilo arcano) */
  glow?: string;
  /** sombra dura, sem desfoque (estilo pixel) */
  hard?: boolean;
}

export interface TextStyle extends TextLook { size: number; lineHeight?: number }

type Run = { kind: 'text'; text: string; w: number } | { kind: 'icon'; id: string; w: number };
export interface Line { runs: Run[]; w: number }

/** Desenha um ícone embutido: recebe id, canto superior esquerdo e tamanho. */
export type IconFn = (id: string, x: number, y: number, size: number) => string;

let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
function context() {
  if (!ctx) {
    ctx = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(8, 8).getContext('2d')!
      : document.createElement('canvas').getContext('2d')!;
  }
  return ctx;
}

const fontCss = (s: TextStyle) =>
  `${s.italic ? 'italic ' : ''}${s.weight ?? 400} ${s.size}px "${s.family}"`;

const widthCache = new Map<string, number>();
export function measure(text: string, s: TextStyle): number {
  const t = s.caps ? text.toUpperCase() : text;
  const key = `${fontCss(s)}|${s.tracking ?? 0}|${t}`;
  let w = widthCache.get(key);
  if (w == null) {
    const c = context();
    c.font = fontCss(s);
    w = c.measureText(t).width + (s.tracking ?? 0) * s.size * t.length;
    if (widthCache.size > 20000) widthCache.clear();
    widthCache.set(key, w);
  }
  return w;
}

const TOKEN = /\{([a-z0-9_-]+)\}/gi;

/** Quebra o texto em linhas que cabem em `maxW`. Ícones valem ~1,05em. */
export function wrap(text: string, s: TextStyle, maxW: number, knownIcon: (id: string) => boolean = () => true): Line[] {
  const lines: Line[] = [];
  const iconW = s.size * 1.25;
  const space = measure(' ', s);
  for (const para of text.replace(/\r/g, '').split('\n')) {
    let cur: Run[] = [];
    let curW = 0;
    const push = () => { lines.push({ runs: cur, w: curW }); cur = []; curW = 0; };
    const words = para.split(/ +/).filter((w, i, a) => w || a.length === 1);
    for (const word of words) {
      // palavra pode conter ícones colados: "{mana}:" ou "2{vigor}"
      const pieces: Run[] = [];
      let last = 0;
      for (const m of word.matchAll(TOKEN)) {
        if (!knownIcon(m[1].toLowerCase())) continue;
        if (m.index! > last) { const t = word.slice(last, m.index); pieces.push({ kind: 'text', text: t, w: measure(t, s) }); }
        pieces.push({ kind: 'icon', id: m[1].toLowerCase(), w: iconW });
        last = m.index! + m[0].length;
      }
      if (last < word.length) { const t = word.slice(last); pieces.push({ kind: 'text', text: t, w: measure(t, s) }); }
      const wordW = pieces.reduce((a, p) => a + p.w, 0);
      const gap = cur.length ? space : 0;
      if (cur.length && curW + gap + wordW > maxW) push();
      if (cur.length) { cur.push({ kind: 'text', text: ' ', w: space }); curW += space; }
      cur.push(...pieces);
      curW += wordW;
    }
    push();
  }
  return lines;
}

export const lineHeightOf = (s: TextStyle) => s.size * (s.lineHeight ?? 1.28);

export function blockHeight(lines: Line[], s: TextStyle): number {
  return lines.length ? lines.length * lineHeightOf(s) : 0;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function attrs(s: TextStyle): string {
  const a = [
    `font-family="${s.family}"`, `font-size="${+s.size.toFixed(2)}"`, `fill="${s.color}"`,
    `font-weight="${s.weight ?? 400}"`,
    // algarismos alinhados: Cormorant/EB Garamond usam números "antigos" por padrão
    `style="font-variant-numeric:lining-nums"`,
  ];
  if (s.italic) a.push('font-style="italic"');
  if (s.tracking) a.push(`letter-spacing="${+(s.tracking * s.size).toFixed(2)}"`);
  return a.join(' ');
}

/** Filtro de legibilidade (sombra/brilho) é passado pronto como `filter="url(#…)"`. */
export interface DrawOpts { align?: 'left' | 'center' | 'right'; valign?: 'top' | 'middle' | 'bottom'; icon?: IconFn; filter?: string }

/** Desenha linhas já quebradas dentro da caixa. */
export function drawLines(lines: Line[], s: TextStyle, box: Box, o: DrawOpts = {}): string {
  const lh = lineHeightOf(s);
  const total = blockHeight(lines, s);
  let y0 = box.y;
  if (o.valign === 'middle') y0 = box.y + (box.h - total) / 2;
  else if (o.valign === 'bottom') y0 = box.y + box.h - total;
  // linha de base: centro da linha + ~0,35em (fontes serifadas latinas)
  let out = '';
  lines.forEach((ln, i) => {
    const cy = y0 + lh * i + lh / 2;
    const base = cy + s.size * 0.34;
    let x = box.x;
    if (o.align === 'center') x = box.x + (box.w - ln.w) / 2;
    else if (o.align === 'right') x = box.x + box.w - ln.w;
    let txt = '';
    let icons = '';
    let pend = '';
    let pendX = x;
    const flush = () => {
      if (pend) txt += `<tspan x="${+pendX.toFixed(2)}">${esc(s.caps ? pend.toUpperCase() : pend)}</tspan>`;
      pend = '';
    };
    for (const r of ln.runs) {
      if (r.kind === 'text') {
        if (!pend) pendX = x;
        pend += r.text;
      } else {
        flush();
        const size = s.size * 1.2;
        if (o.icon) icons += o.icon(r.id, x + (r.w - size) / 2, cy - size / 2 - s.size * 0.02, size);
      }
      x += r.w;
    }
    flush();
    if (txt) out += `<text y="${+base.toFixed(2)}" ${attrs(s)} xml:space="preserve">${txt}</text>`;
    out += icons;
  });
  return o.filter ? `<g filter="${o.filter}">${out}</g>` : out;
}

/** Uma linha só (nome, tipo, rodapé): reduz o tamanho até caber em `box.w`. */
export function fitLine(text: string, s: TextStyle, maxW: number, minSize = s.size * 0.6): TextStyle {
  let st = { ...s };
  const w = measure(text, st);
  if (w <= maxW) return st;
  st = { ...st, size: Math.max(minSize, st.size * (maxW / w)) };
  // encolher espaçamento se ainda não couber
  if (measure(text, st) > maxW && st.tracking) st = { ...st, tracking: 0 };
  return st;
}
