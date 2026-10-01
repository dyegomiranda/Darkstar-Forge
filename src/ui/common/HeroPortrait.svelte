<!--
  Retrato do herói: a imagem enviada pelo jogador; senão, o retrato que vem com o app
  (heróis prontos); senão, o símbolo da classe sobre a cor do deck.
-->
<script lang="ts">
  import type { Character } from '../../model/types';
  import { ensureMedia, mediaUrl } from '../../store/media';
  import { heroColor } from '../game/heroes';
  import Glyph from './Glyph.svelte';

  let { hero, size = 64, round = false }: { hero: Character | undefined; size?: number; round?: boolean } = $props();
  let tick = $state(0);
  let broken = $state('');
  $effect(() => { const id = hero?.portraitMediaId; if (id) void ensureMedia(id).then(() => tick++); });
  const src = $derived.by(() => {
    void tick;
    if (hero?.portraitMediaId) return mediaUrl(hero.portraitMediaId);
    return hero?.preset ? `heroes/${hero.preset}.webp` : undefined;
  });
</script>

<span class="hp" class:round style="--c:{heroColor(hero)}; width:{size}px; height:{size}px">
  {#if src && broken !== src}
    <img {src} alt="" onerror={() => (broken = src ?? '')} />
  {:else}
    <Glyph id={hero?.play?.icon ?? 'hooded-figure'} size={size * 0.62} color="#f3ead6" />
  {/if}
</span>

<style>
  .hp { display: grid; place-items: center; flex: none; border-radius: 14%; overflow: hidden;
    background: radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--c) 62%, #000), color-mix(in srgb, var(--c) 20%, #000)); }
  .hp.round { border-radius: 50%; }
  img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 22%; display: block; image-rendering: auto; }
</style>
