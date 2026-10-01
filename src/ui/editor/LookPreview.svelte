<!-- Miniatura de uma carta com um tema de deck dado (para ver como uma mudança de coleção fica em cada deck). -->
<script lang="ts">
  import { compose, type Look } from '../../render/compose';
  import { cardInput } from '../../render/card';
  import { ctxFor, ensureCardMedia } from '../common/cardCtx';
  import type { Card } from '../../model/types';

  let { card, look, label }: { card: Card; look: Look; label: string } = $props();
  let ready = $state(0);
  $effect(() => { void ensureCardMedia(card).then(() => ready++); });
  const svg = $derived.by(() => {
    void ready;
    const ctx = ctxFor(card);
    return ctx ? compose(cardInput(card, { ...ctx, deck: { ...ctx.deck, look } })) : '';
  });
</script>

<figure>
  <div class="mini">{@html svg}</div>
  <figcaption>{label}</figcaption>
</figure>

<style>
  figure { margin: 0; display: flex; flex-direction: column; gap: 4px; align-items: center; min-width: 0; }
  .mini { width: 100%; aspect-ratio: 750 / 1050; border-radius: 5px; overflow: hidden; box-shadow: 0 6px 14px rgb(0 0 0 / .55); }
  .mini :global(svg) { width: 100%; height: 100%; display: block; }
  figcaption { font-size: 10.5px; color: var(--muted); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
</style>
