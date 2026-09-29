/** Dados para desenhar o verso a partir do estado do app. */
import { composeBack, defaultBack, type BackInput } from '../../render/back';
import { app } from '../../store/project.svelte';
import { ensureAll, mediaUrl } from '../../store/media';
import type { CardBack, Edition } from '../../model/types';

export function backOf(ed?: Edition): CardBack {
  return ed?.back ?? defaultBack();
}

export async function ensureBackMedia(ed?: Edition): Promise<void> {
  const b = backOf(ed);
  await ensureAll([ed?.setMediaId, b.art?.mediaId].filter(Boolean) as string[]);
}

export function backInput(ed?: Edition, uid = 'back'): BackInput {
  const back = backOf(ed);
  return {
    uid, back,
    logo: ed?.setMediaId ? mediaUrl(ed.setMediaId) : '/brand/logo.png',
    art: back.art ? mediaUrl(back.art.mediaId) : undefined,
  };
}

export function backSvg(ed = app.edition()): string {
  return composeBack(backInput(ed));
}
