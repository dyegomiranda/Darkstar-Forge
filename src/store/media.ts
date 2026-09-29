/**
 * Imagens do usuário (artes, logos, retratos): guarda no banco e entrega URLs
 * de objeto prontas para o navegador. Reduz artes gigantes a um tamanho que
 * sobra para impressão (lado maior 2100 px ≈ 600 dpi na carta).
 */
import { getMedia, putMedia } from './db';

const urls = new Map<string, string>();
const loading = new Map<string, Promise<string | undefined>>();

/** URL já carregada (síncrono) — ou undefined se ainda não foi preparada. */
export function mediaUrl(id: string): string | undefined {
  return urls.get(id);
}

/** Garante que a URL da mídia esteja pronta. */
export function ensureMedia(id: string): Promise<string | undefined> {
  if (urls.has(id)) return Promise.resolve(urls.get(id));
  let p = loading.get(id);
  if (!p) {
    p = getMedia(id).then((row) => {
      if (!row) return undefined;
      const u = URL.createObjectURL(row.blob);
      urls.set(id, u);
      return u;
    });
    loading.set(id, p);
  }
  return p;
}

export async function ensureAll(ids: Iterable<string>): Promise<void> {
  await Promise.all([...new Set(ids)].map(ensureMedia));
}

const MAX_SIDE = 2100;

/** Importa um arquivo de imagem (reduz se for enorme) e devolve o id. */
export async function importImage(file: Blob, name = ''): Promise<string> {
  let blob = file;
  if (file.type !== 'image/svg+xml') {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (k < 1 || file.size > 6_000_000) {
      const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      blob = await c.convertToBlob({ type: 'image/webp', quality: 0.93 });
    }
    bmp.close();
  }
  const id = await putMedia(blob, name);
  await ensureMedia(id);
  return id;
}

/** Tamanho real (px) de uma imagem do banco; undefined se não der para ler. */
export async function imageSize(id: string): Promise<{ w: number; h: number } | undefined> {
  const row = await getMedia(id);
  if (!row) return undefined;
  try {
    const bmp = await createImageBitmap(row.blob);
    const size = { w: bmp.width, h: bmp.height };
    bmp.close();
    return size;
  } catch {
    // SVG sem tamanho fixo e afins: mede pelo elemento <img>
    const url = await ensureMedia(id);
    if (!url) return undefined;
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { return undefined; }
    return img.naturalWidth ? { w: img.naturalWidth, h: img.naturalHeight } : undefined;
  }
}
