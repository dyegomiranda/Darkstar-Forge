<!--
  Retrato do herói: a imagem enviada pelo jogador; senão, o busto do próprio boneco;
  senão, o retrato que vem com o app (heróis prontos); senão, o símbolo da classe
  sobre a cor do deck.
-->
<script lang="ts" module>
  import { portrait as bust, type Avatar } from '../../avatar/lpc';

  // bustos já tirados (um por aparência + cor): o mesmo herói aparece em vários lugares da tela
  const busts = new Map<string, Promise<string>>();
  function bustUrl(av: Avatar, color: string): Promise<string> {
    const key = JSON.stringify([av, color]);
    let p = busts.get(key);
    if (!p) { p = bust(av, color).then((b) => URL.createObjectURL(b)); busts.set(key, p); }
    return p;
  }
</script>

<script lang="ts">
  import { avatarForCharacter } from '../../avatar/equipment';
  import { app } from '../../store/project.svelte';
  import type { Character } from '../../model/types';
  import { ensureMedia, mediaUrl } from '../../store/media';
  import { heroColor } from '../game/heroes';
  import Glyph from './Glyph.svelte';

  let { hero, size = 64, round = false }: { hero: Character | undefined; size?: number; round?: boolean } = $props();
  let tick = $state(0);
  let broken = $state('');
  $effect(() => { const id = hero?.portraitMediaId; if (id) void ensureMedia(id).then(() => tick++); });
  const visibleAvatar = $derived(avatarForCharacter(hero, app.cards));
  let bustSrc = $state('');
  $effect(() => {
    bustSrc = '';
    if (hero?.portraitMediaId || !hero?.avatar) return;
    let alive = true;
    void bustUrl($state.snapshot(visibleAvatar!) as Avatar, heroColor(hero)).then((u) => { if (alive) bustSrc = u; });
    return () => { alive = false; };
  });
  const pixel = $derived(!hero?.portraitMediaId && (!!hero?.avatar || hero?.preset === 'dragon'));
  const src = $derived.by(() => {
    void tick;
    if (hero?.portraitMediaId) return mediaUrl(hero.portraitMediaId);
    if (hero?.avatar) return bustSrc || undefined;
    if (hero?.preset === 'dragon') return 'heroes/rework/dragon.png';
    return hero?.preset ? `heroes/${hero.preset}.webp` : undefined;
  });
</script>

<span class="hp" class:round style="--c:{heroColor(hero)}; width:{size}px; height:{size}px">
  {#if src && broken !== src}
    <img {src} alt="" class:pixel onerror={() => (broken = src ?? '')} />
  {:else if !pixel}
    <Glyph id={hero?.play?.icon ?? 'hooded-figure'} size={size * 0.62} color="#f3ead6" />
  {/if}
</span>

<style>
  .hp { display: grid; place-items: center; flex: none; border-radius: 14%; overflow: hidden;
    background: radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--c) 62%, #000), color-mix(in srgb, var(--c) 20%, #000)); }
  .hp.round { border-radius: 50%; }
  img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 22%; display: block; image-rendering: auto; }
  img.pixel { image-rendering: pixelated; object-position: 50% 0; }
</style>
