/**
 * Transforma o SVG da carta em imagem (PNG/WebP). O SVG vira autossuficiente:
 * fontes e imagens são embutidas, porque um SVG aberto como imagem não carrega
 * nada de fora.
 */
import { embeddedFontCss, toDataUrl } from './fonts';
import { CARD_H, CARD_W } from './layout';

export async function selfContained(svg: string): Promise<string> {
  const hrefs = [...new Set([...svg.matchAll(/href="([^"#][^"]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('data:')))];
  const map = new Map(await Promise.all(hrefs.map(async (h) => [h, await toDataUrl(h)] as const)));
  let out = svg.replace(/href="([^"#][^"]*)"/g, (m, h) => (map.has(h) ? `href="${map.get(h)}"` : m));
  const css = await embeddedFontCss(out);
  if (css) out = out.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`);
  return out;
}

export async function rasterize(svg: string, width = CARD_W * 2, type = 'image/png', quality = 0.92): Promise<Blob> {
  const full = await selfContained(svg);
  const url = URL.createObjectURL(new Blob([full], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const height = Math.round((width * CARD_H) / CARD_W);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    return await canvas.convertToBlob({ type, quality });
  } finally {
    URL.revokeObjectURL(url);
  }
}
