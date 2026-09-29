<!--
  Pré-visualização ao vivo (SVG direto na página, atualiza a cada mudança).
  Arrastar sobre a carta move a arte; a roda do mouse com Ctrl aproxima.
-->
<script lang="ts">
  import { compose } from '../../render/compose';
  import { cardInput, lookMediaIds, mergeLook } from '../../render/card';
  import { CARD_W } from '../../render/layout';
  import { ensureCardMedia, ctxFor } from '../common/cardCtx';
  import type { EditorState } from './editor.svelte';

  let { ed }: { ed: EditorState } = $props();

  let host: HTMLDivElement;
  let mediaReady = $state(0);

  // quando a arte muda, espera a imagem ficar pronta e redesenha
  $effect(() => {
    void ed.draft.art.mediaId;
    // imagens das peças (Aparência) também precisam estar carregadas
    void lookMediaIds(mergeLook(ed.deck.look, ed.draft.look)).join();
    void ensureCardMedia(ed.draft).then(() => { mediaReady++; });
  });

  // a entrada muda a cada movimento do seletor de cor; o desenho acontece no
  // máximo uma vez por quadro de tela (sem fila de trabalho atrasado)
  const input = $derived.by(() => {
    void mediaReady;
    const ctx = ctxFor(ed.draft);
    // idioma do texto = idioma escolhido no editor
    return ctx ? cardInput(ed.draft, { ...ctx, lang: ed.lang }) : null;
  });
  let svg = $state('');
  let frame = 0;
  $effect(() => {
    const inp = input;
    cancelAnimationFrame(frame);
    if (!svg) { svg = inp ? compose(inp) : ''; return; }
    frame = requestAnimationFrame(() => { svg = inp ? compose(inp) : ''; });
    return () => cancelAnimationFrame(frame);
  });

  let drag: { x: number; y: number; ax: number; ay: number; k: number } | null = null;

  function down(e: PointerEvent) {
    if (!ed.draft.art.mediaId || e.button !== 0) return;
    const k = CARD_W / host.getBoundingClientRect().width;
    drag = { x: e.clientX, y: e.clientY, ax: ed.draft.art.x, ay: ed.draft.art.y, k };
    host.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    ed.draft.art.x = Math.round(drag.ax + (e.clientX - drag.x) * drag.k);
    ed.draft.art.y = Math.round(drag.ay + (e.clientY - drag.y) * drag.k);
  }
  function up() { if (drag) { drag = null; ed.touch(); } }
  function wheel(e: WheelEvent) {
    if (!e.ctrlKey || !ed.draft.art.mediaId) return;
    e.preventDefault();
    ed.draft.art.zoom = Math.min(4, Math.max(0.5, +(ed.draft.art.zoom * (e.deltaY < 0 ? 1.05 : 0.95)).toFixed(3)));
    ed.touch();
  }
</script>

<div class="live" class:grab={!!ed.draft.art.mediaId} bind:this={host} onpointerdown={down} onpointermove={move} onpointerup={up}
  onpointercancel={up} onwheel={wheel} role="img" aria-label={ed.draft.text[ed.lang].name}>
  {@html svg}
</div>

<style>
  .live { width: 100%; aspect-ratio: 750 / 1050; border-radius: 4.5% / 3.2%; overflow: hidden; box-shadow: 0 30px 70px rgb(0 0 0 / .7), 0 0 0 1px rgb(255 255 255 / .04); touch-action: none; user-select: none; }
  .live.grab { cursor: grab; }
  .live.grab:active { cursor: grabbing; }
  .live :global(svg) { width: 100%; height: 100%; display: block; }
</style>
