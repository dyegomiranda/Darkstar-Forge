/**
 * Fontes das cartas: arquivos locais (@fontsource, subconjunto latino — cobre
 * todos os acentos do português). Carregadas pela API FontFace, e as mesmas
 * URLs servem para embutir as fontes no SVG na hora de gerar a imagem.
 */

// só o subconjunto "latin" (sem latin-ext, cirílico…) — cobre todo o português
const files = import.meta.glob('/node_modules/@fontsource/*/files/*-latin-[0-9]*.woff2', {
  query: '?url', import: 'default', eager: true,
}) as Record<string, string>;

export interface CardFont { family: string; weight: number; italic: boolean; url: string }

const FAMILIES: Record<string, string> = {
  'eb-garamond': 'EB Garamond',
  cinzel: 'Cinzel',
  'cormorant-garamond': 'Cormorant Garamond',
  marcellus: 'Marcellus',
  'noto-sans': 'Noto Sans',
  'pixelify-sans': 'Pixelify Sans',
  silkscreen: 'Silkscreen',
  'grenze-gotisch': 'Grenze Gotisch',
  'barlow-condensed': 'Barlow Condensed',
  'uncial-antiqua': 'Uncial Antiqua',
};

const USED: Record<string, string[]> = {
  'eb-garamond': ['400-normal', '400-italic', '500-normal', '500-italic', '600-normal', '700-normal'],
  cinzel: ['500-normal', '600-normal', '700-normal'],
  'cormorant-garamond': ['500-normal', '600-normal', '600-italic', '700-normal'],
  marcellus: ['400-normal'],
  'noto-sans': ['400-normal', '400-italic', '600-normal', '700-normal'],
  'pixelify-sans': ['400-normal', '500-normal', '700-normal'],
  silkscreen: ['400-normal'],
  'grenze-gotisch': ['500-normal', '600-normal', '700-normal'],
  'barlow-condensed': ['500-normal', '500-italic', '600-normal', '700-normal'],
  'uncial-antiqua': ['400-normal'],
};

export const CARD_FONTS: CardFont[] = Object.entries(USED).flatMap(([pkg, variants]) =>
  variants.map((v) => {
    const [w, s] = v.split('-');
    const url = files[`/node_modules/@fontsource/${pkg}/files/${pkg}-latin-${v}.woff2`];
    if (!url) throw new Error(`Fonte não encontrada: ${pkg} ${v}`);
    return { family: FAMILIES[pkg], weight: +w, italic: s === 'italic', url };
  }));

let loading: Promise<void> | null = null;

/** Registra e carrega as fontes (uma vez). Precisa terminar antes de medir texto. */
export function loadCardFonts(): Promise<void> {
  loading ??= Promise.all(CARD_FONTS.map(async (f) => {
    const face = new FontFace(f.family, `url(${f.url})`, { weight: String(f.weight), style: f.italic ? 'italic' : 'normal' });
    document.fonts.add(await face.load());
  })).then(() => undefined);
  return loading;
}

const dataUrls = new Map<string, Promise<string>>();

export function toDataUrl(url: string): Promise<string> {
  let p = dataUrls.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Falha ao ler ${url}`);
      return r.blob();
    }).then((b) => new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(b);
    }));
    dataUrls.set(url, p);
  }
  return p;
}

/** CSS @font-face com as fontes embutidas, só das famílias usadas no SVG. */
export async function embeddedFontCss(svg: string): Promise<string> {
  const used = CARD_FONTS.filter((f) => svg.includes(`font-family="${f.family}"`));
  const rules = await Promise.all(used.map(async (f) =>
    `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${f.italic ? 'italic' : 'normal'};src:url(${await toDataUrl(f.url)}) format("woff2")}`));
  return rules.join('');
}
