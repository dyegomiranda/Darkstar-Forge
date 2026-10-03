<!--
  Peça feita de imagem: o usuário envia um PNG (de um modelo pronto, de IA ou
  desenhado) e ele entra no lugar do desenho do estilo. Textos, custos e
  ATK/DEF continuam automáticos por cima.
-->
<script lang="ts">
  import { ImagePlus, Trash2, Type, RefreshCw } from '@lucide/svelte';
  import { L } from '../../app/i18n.svelte';
  import { ensureMedia, imageSize, importImage, mediaUrl } from '../../store/media';
  import { ui } from '../../app/ui.svelte';
  import type { PieceKind } from '../../render/elements';
  import type { PieceSlot } from '../../render/compose';
  import { skeleton } from '../../render/layout';
  import { DEFAULT_FIT, DEFAULT_PAD, type ImageFit, type PieceImage } from '../../render/pieceImage';
  import type { EditorState } from './editor.svelte';

  /** `slot` é onde grava (pode ser só o ataque ou só a defesa); `kind` é o tipo da peça. */
  let { ed, slot }: { ed: EditorState; slot: PieceSlot } = $props();
  const kind = $derived<PieceKind>(slot === 'atk' || slot === 'def' ? 'stat' : slot);

  let input: HTMLInputElement;
  let busy = $state(false);
  let tick = $state(0);

  const img = $derived(ed.piece(slot).image);
  const url = $derived.by(() => { void tick; return img?.mediaId ? mediaUrl(img.mediaId) : undefined; });
  $effect(() => { const id = img?.mediaId; if (id && !mediaUrl(id)) void ensureMedia(id).then(() => tick++); });

  const FITS: [ImageFit, string, string][] = [['stretch', 'Esticar', 'Stretch'], ['nine', '9 partes (cantos fixos)', '9-slice (fixed corners)'], ['contain', 'Manter proporção', 'Keep ratio']];
  const SIDES: [string, string][] = [['Cima', 'Top'], ['Direita', 'Right'], ['Baixo', 'Bottom'], ['Esquerda', 'Left']];

  /** Altura de referência da peça na carta (para a escala padrão das bordas). */
  function boxOf(k: PieceKind) {
    const S = skeleton(260);
    return k === 'stat' ? S.atk : k === 'frame' ? S.card : (S as unknown as Record<string, typeof S.card>)[k];
  }

  function set(patch: Partial<PieceImage>) {
    const cur = ed.piece(slot).image ?? { fit: DEFAULT_FIT[kind] };
    ed.setPiece(slot, { image: { ...cur, ...patch } as PieceImage, ...(kind === 'frame' ? { hidden: false } : {}) });
  }

  async function choose(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    busy = true;
    try {
      const id = await importImage(f, f.name);
      const size = await imageSize(id);
      const box = boxOf(kind);
      const w = size?.w ?? box.w, h = size?.h ?? box.h;
      const edge = Math.round(Math.min(w, h) * 0.3);
      const fit = img?.fit ?? DEFAULT_FIT[kind];
      const sliceScale = img?.sliceScale ?? +Math.min(1.5, box.h / h).toFixed(3);
      // 9 partes: o texto começa depois dos cantos da imagem
      const corner = fit === 'nine' ? Math.round(edge * sliceScale * 0.6) : 0;
      set({
        mediaId: id, w, h, fit,
        slice: img?.slice ?? [edge, edge, edge, edge],
        sliceScale,
        pad: img?.pad ?? (DEFAULT_PAD[kind].map((v) => Math.max(v, corner)) as [number, number, number, number]),
      });
      tick++;
    } catch (e) {
      ui.toast(L('Não consegui abrir essa imagem.', 'Could not open that image.') + ' ' + (e instanceof Error ? e.message : ''), 'error', 6000);
    } finally {
      busy = false;
      input.value = '';
    }
  }

  function setArr(key: 'slice' | 'pad', i: number, v: number) {
    const base = (img?.[key] ?? (key === 'pad' ? DEFAULT_PAD[kind] : [0, 0, 0, 0])).slice() as [number, number, number, number];
    base[i] = Math.max(0, Math.round(v) || 0);
    set({ [key]: base });
  }

  const num = (e: Event) => +(e.currentTarget as HTMLInputElement).value;
</script>

<div class="pimg">
  <span class="label">{L('Imagem própria (PNG)', 'Own image (PNG)')}</span>
  {#if !img}
    <p class="muted small">{L('Use a peça de um modelo pronto: a imagem entra no lugar do desenho do estilo e os textos e números continuam automáticos.', 'Use a piece from a ready-made template: the image replaces the style drawing; texts and numbers stay automatic.')}</p>
    <div class="row wrap">
      <button class="btn sm" disabled={busy} onclick={() => input.click()}><ImagePlus size={14} /> {L('Usar uma imagem…', 'Use an image…')}</button>
      <button class="btn sm ghost" onclick={() => { set({ fit: 'stretch', pad: DEFAULT_PAD[kind] }); if (!ed.piece(slot).ink && kind !== 'frame' && kind !== 'set') ed.setPiece(slot, { ink: '#ffffff' }); }} title={L('O desenho da peça some e fica só o que vai dentro dela: texto, número e símbolos (útil quando a moldura inteira já é uma imagem)', 'The piece drawing disappears and only its content remains: text, number and symbols (useful when the whole frame is an image)')}><Type size={14} /> {L('Sem desenho (só o conteúdo)', 'No drawing (content only)')}</button>
    </div>
  {:else}
    <div class="row wrap">
      {#if img.mediaId}
        <span class="thumb">{#if url}<img src={url} alt="" />{/if}</span>
        <span class="muted small">{img.w}×{img.h} px</span>
      {:else}
        <span class="muted small">{L('Sem desenho: só o conteúdo desta peça aparece (texto, número e símbolos). O formato dos símbolos se escolhe em Símbolos → Acabamento.', 'No drawing: only this piece\'s content shows (text, number and symbols). The symbols\' look is chosen in Symbols → Finish.')}</span>
      {/if}
    </div>
    <div class="row wrap">
      <button class="btn sm" disabled={busy} onclick={() => input.click()}><RefreshCw size={14} /> {img.mediaId ? L('Trocar imagem', 'Change image') : L('Usar uma imagem…', 'Use an image…')}</button>
      <button class="btn sm danger" onclick={() => ed.setPiece(slot, {}, ['image'])}><Trash2 size={14} /> {L('Voltar ao desenho do estilo', 'Back to style drawing')}</button>
    </div>

    {#if img.mediaId}
      <div class="field"><span>{L('Encaixe', 'Fit')}</span>
        <div class="seg full">{#each FITS as [id, pt, en]}<button class:on={img.fit === id} onclick={() => set({ fit: id })}>{L(pt, en)}</button>{/each}</div>
      </div>
      {#if img.fit === 'nine'}
        <div class="field"><span>{L('Bordas que não esticam (px da imagem)', 'Borders that don\'t stretch (image px)')}</span>
          <div class="quad">{#each SIDES as [pt, en], i}<label><small>{L(pt, en)}</small><input class="input" type="number" min="0" value={img.slice?.[i] ?? 0} oninput={(e) => setArr('slice', i, num(e))} /></label>{/each}</div>
        </div>
        <label class="field"><span>{L('Tamanho das bordas na carta', 'Border size on the card')} · {Math.round((img.sliceScale ?? 1) * 100)}%</span>
          <input type="range" min="0.05" max="3" step="0.01" value={img.sliceScale ?? 1} oninput={(e) => set({ sliceScale: num(e) })} /></label>
      {/if}
      <label class="field"><span>{L('Tingir com a cor da carta', 'Tint with card color')} · {Math.round((img.tint ?? 0) * 100)}%</span>
        <input type="range" min="0" max="1" step="0.01" value={img.tint ?? 0} oninput={(e) => set({ tint: num(e) })} /></label>
      <div class="field"><span>{L('Posição e tamanho (ajuste fino)', 'Position & size (fine-tune)')}</span>
        <div class="quad">
          <label><small>{L('Para o lado', 'Sideways')}</small><input type="range" min="-150" max="150" value={img.dx ?? 0} oninput={(e) => set({ dx: num(e) })} /></label>
          <label><small>{L('Para cima/baixo', 'Up/down')}</small><input type="range" min="-150" max="150" value={img.dy ?? 0} oninput={(e) => set({ dy: num(e) })} /></label>
          <label><small>{L('Largura', 'Width')}</small><input type="range" min="-200" max="300" value={img.dw ?? 0} oninput={(e) => set({ dw: num(e) })} /></label>
          <label><small>{L('Altura', 'Height')}</small><input type="range" min="-200" max="300" value={img.dh ?? 0} oninput={(e) => set({ dh: num(e) })} /></label>
        </div>
        <button class="btn sm ghost" onclick={() => set({ dx: 0, dy: 0, dw: 0, dh: 0 })}>{L('Zerar ajuste', 'Reset')}</button>
      </div>
    {/if}
    {#if kind !== 'frame'}
      <div class="field"><span>{L('Margens do texto dentro da peça (px)', 'Text margins inside the piece (px)')}</span>
        <div class="quad">{#each SIDES as [pt, en], i}<label><small>{L(pt, en)}</small><input class="input" type="number" min="0" value={(img.pad ?? DEFAULT_PAD[kind])[i]} oninput={(e) => setArr('pad', i, num(e))} /></label>{/each}</div>
      </div>
    {/if}
  {/if}
  <input type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" hidden bind:this={input} onchange={(e) => choose((e.currentTarget as HTMLInputElement).files)} />
</div>

<style>
  .pimg { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px dashed var(--line-2); border-radius: 10px; background: var(--bg-2); min-width: 0; }
  /* os botões quebram a linha em vez de passar da borda do painel */
  .pimg .row button { white-space: normal; height: auto; min-height: 30px; max-width: 100%; text-align: left; line-height: 1.25; padding-block: 5px; }
  .label { font: 600 12px var(--ui); color: var(--text-2); text-transform: uppercase; letter-spacing: .04em; }
  .small { font-size: 12.5px; margin: 0; }
  .thumb { width: 64px; height: 44px; border-radius: 6px; border: 1px solid var(--line-2); display: grid; place-items: center; overflow: hidden;
    background: repeating-conic-gradient(#3a3a3a 0 25%, #2a2a2a 0 50%) 0 0 / 12px 12px; }
  .thumb img { max-width: 100%; max-height: 100%; }
  .quad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .quad label { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .quad small { font-size: 11px; color: var(--muted); }
  .quad .input { height: 30px; padding: 0 6px; min-width: 0; }
  .quad input[type=range] { width: 100%; }
</style>
