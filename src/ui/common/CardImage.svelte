<!--
  Imagem da carta em alta resolução, vinda do cache (desenhada uma vez só).
  Enquanto não fica pronta, mostra um esqueleto. Prioriza o que está visível.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Card } from '../../model/types';
  import { cardInput, renderKey } from '../../render/card';
  import { compose } from '../../render/compose';
  import { cachedUrl, deprioritize, requestImage } from '../../render/queue';
  import { ctxFor, ensureCardMedia } from './cardCtx';
  import { app } from '../../store/project.svelte';

  let { card, alt = '', eager = false }: { card: Card; alt?: string; eager?: boolean } = $props();

  let el: HTMLDivElement;
  let visible = $state(eager);
  let url = $state<string | undefined>();
  let failed = $state(false);

  const ctx = $derived(ctxFor(card));
  const key = $derived(ctx ? renderKey(card, ctx) : '');

  $effect(() => {
    const k = key;
    if (!k || !ctx) return;
    const hit = cachedUrl(k);
    if (hit) { url = hit; return; }
    if (!visible) { deprioritize(k); return; }
    let alive = true;
    failed = false;
    void ensureCardMedia(card).then(() =>
      requestImage(k, () => compose(cardInput(card, ctxFor(card)!)), 0)
        .then((u) => { if (alive) url = u; })
        .catch(() => { if (alive) failed = true; }));
    return () => { alive = false; };
  });

  const io = new IntersectionObserver((es) => { for (const e of es) visible = e.isIntersecting; }, { rootMargin: '600px 0px' });
  $effect(() => { if (el) io.observe(el); });
  onDestroy(() => io.disconnect());
</script>

<div class="ci" bind:this={el}>
  {#if url}
    <img src={url} {alt} draggable="false" decoding="async" />
  {:else}
    <div class="sk skeleton" class:failed><span>{card.text[app.lang].name}</span></div>
  {/if}
</div>

<style>
  .ci { position: relative; width: 100%; aspect-ratio: 750 / 1050; border-radius: 4.5% / 3.2%; overflow: hidden; background: var(--surface); }
  img { display: block; width: 100%; height: 100%; object-fit: cover; animation: fade .25s ease-out; }
  .sk { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding: 12%; }
  .sk span { font-size: 12px; color: var(--muted); text-align: center; }
  .sk.failed { background: var(--danger-soft); animation: none; }
  @keyframes fade { from { opacity: 0; } }
</style>
