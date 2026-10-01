/**
 * Gera artes pelo ComfyUI do próprio computador (Flux dev + LoRA "Modern Pixel Art").
 * O app fala com o ComfyUI por um atalho local (/__comfy/…), então ele precisa estar aberto.
 */
import prompts from '../data/art-prompts.json';
import type { Card } from '../model/types';

const PRE = 'UMEMPART, modern pixel art illustration, detailed pixel art, crisp square pixels, limited color palette, ';
const COMP = ' Vertical trading card illustration, medium shot from the side, the characters are large and fill the frame, clear readable action, weapons fully visible, dramatic lighting, vivid colors. The action fills the upper two thirds of the image; '
  + 'the bottom third is darker ground or mist with no important details. No text, no letters, no signature, no watermark, no logo, no border, no frame.';

/** Garante pixel art de verdade: reduz para pixels de 4 px e amplia sem suavizar. */
async function pixelate(blob: Blob, grid = 4): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const w = Math.floor(bmp.width / grid), h = Math.floor(bmp.height / grid);
  const small = new OffscreenCanvas(w, h);
  const sc = small.getContext('2d')!;
  sc.imageSmoothingEnabled = true;
  sc.imageSmoothingQuality = 'high';
  sc.drawImage(bmp, 0, 0, w, h);
  const big = new OffscreenCanvas(w * grid, h * grid);
  const bc = big.getContext('2d')!;
  bc.imageSmoothingEnabled = false;
  bc.drawImage(small, 0, 0, w * grid, h * grid);
  bmp.close();
  return big.convertToBlob({ type: 'image/png' });
}

const api = (path: string) => new URL(`__comfy/${path}`, document.baseURI).toString();

/** Prompt guardado para a carta (coleção Protótipo) ou um ponto de partida com o nome dela. */
export function promptFor(card: Card): string {
  const id = `${card.deckId}_${String(card.n).padStart(3, '0')}`;
  return (prompts as Record<string, string>)[id] ?? `${card.text['en-US'].name || card.text['pt-BR'].name}, fantasy scene.`;
}

function workflow(prompt: string, seed: number) {
  return {
    1: { class_type: 'UNETLoader', inputs: { unet_name: 'flux1-dev.safetensors', weight_dtype: 'fp8_e4m3fn' } },
    2: { class_type: 'DualCLIPLoader', inputs: { clip_name1: 't5xxl_fp16.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux' } },
    3: { class_type: 'VAELoader', inputs: { vae_name: 'ae.safetensors' } },
    10: { class_type: 'LoraLoader', inputs: { model: ['1', 0], clip: ['2', 0], lora_name: 'ume_modern_pixelart.safetensors', strength_model: 1, strength_clip: 1 } },
    4: { class_type: 'CLIPTextEncode', inputs: { text: PRE + prompt + COMP, clip: ['10', 1] } },
    5: { class_type: 'FluxGuidance', inputs: { conditioning: ['4', 0], guidance: 3.5 } },
    6: { class_type: 'EmptySD3LatentImage', inputs: { width: 768, height: 1072, batch_size: 1 } },
    7: { class_type: 'KSampler', inputs: { model: ['10', 0], positive: ['5', 0], negative: ['5', 0], latent_image: ['6', 0], seed, steps: 24, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } },
    8: { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['3', 0] } },
    9: { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'darkstar' } },
  };
}

/** O ComfyUI está aberto e respondendo? */
export async function comfyReady(): Promise<boolean> {
  try { return (await fetch(api('system_stats'))).ok; } catch { return false; }
}

/** Gera uma imagem e devolve o arquivo (leva ~40 s; mais se o ComfyUI estiver ocupado). */
export async function generateArt(prompt: string, name: string, stop?: () => boolean): Promise<File> {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const r = await fetch(api('prompt'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: workflow(prompt, seed) }) });
  if (!r.ok) throw new Error(`ComfyUI recusou o pedido (${r.status}). ${(await r.text()).slice(0, 200)}`);
  const { prompt_id: id } = await r.json() as { prompt_id: string };
  for (let i = 0; i < 900; i++) {
    await new Promise((ok) => setTimeout(ok, 2000));
    if (stop?.()) throw new Error('cancelado');
    const h = await (await fetch(api(`history/${id}`))).json() as Record<string, { status?: { status_str?: string }; outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }> }>;
    const done = h[id];
    if (!done) continue;
    if (done.status?.status_str === 'error') throw new Error('O ComfyUI deu erro ao gerar (veja a janela dele).');
    const img = done.outputs?.['9']?.images?.[0];
    if (!img) throw new Error('O ComfyUI não devolveu imagem.');
    const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder, type: img.type });
    const blob = await pixelate(await (await fetch(api(`view?${q}`))).blob());
    return new File([blob], name, { type: blob.type || 'image/png' });
  }
  throw new Error('O ComfyUI demorou demais.');
}
