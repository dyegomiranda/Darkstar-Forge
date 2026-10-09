<script lang="ts">
  import { onMount } from 'svelte';
  import { settings } from '../../app/settings.svelte';
  import { lightingOf } from './lighting';
  let { scene = 'floresta', rays = true }: { scene?: string; rays?: boolean } = $props();
  const light = $derived(lightingOf(scene));
  let canvas = $state<HTMLCanvasElement>();
  let systemReduced = $state(false);
  onMount(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { systemReduced = media.matches; };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
  $effect(() => {
    const c = canvas, profile = light, quality = settings.v.quality;
    const staticOnly = settings.v.reducedMotion || systemReduced;
    if (!c || quality === 'low' || profile.kind === 'none') return;
    const ctx = c.getContext('2d')!;
    let width = 1, height = 1, raf = 0, time = 0, last = 0;
    const count = quality === 'high' ? 24 : 10;
    const rnd = (i: number, seed: number) => { const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = profile.particle;
      for (let i = 0; i < count; i++) {
        const speed = profile.kind === 'snow' ? 8 : profile.kind === 'embers' ? -12 : -2;
        const x = ((rnd(i, 1) * width + time * (1 + rnd(i, 2) * 3)) % width + width) % width;
        const y = ((rnd(i, 3) * height + time * speed * (0.5 + rnd(i, 4))) % height + height) % height;
        ctx.globalAlpha = (profile.kind === 'snow' ? 0.45 : 0.32) + Math.sin(time + i) * 0.12;
        const size = i % 7 === 0 ? 2 : 1;
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
      }
      ctx.globalAlpha = 1;
    }
    const resize = () => { width = c.width = Math.max(1, Math.ceil(c.clientWidth / 3)); height = c.height = Math.max(1, Math.ceil(c.clientHeight / 3)); draw(); };
    const ro = new ResizeObserver(resize); ro.observe(c); resize();
    function tick(now: number) {
      if (now - last >= 50) { time += Math.min(0.1, (now - last) / 1000); last = now; draw(); }
      raf = requestAnimationFrame(tick);
    }
    const visible = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !staticOnly) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    visible(); document.addEventListener('visibilitychange', visible);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', visible); };
  });
</script>
<div class="scene-atmosphere" aria-hidden="true" style="--warm:{light.warm};--shade:{light.shade}">
  <div class="grade"></div>
  {#if rays}<div class="rays"></div>{/if}
  <canvas bind:this={canvas}></canvas>
  <div class="vignette"></div>
</div>
<style>
  .scene-atmosphere { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 1; }
  .grade { position: absolute; inset: 0; background: linear-gradient(135deg, color-mix(in srgb, var(--warm) 9%, transparent), transparent 46%, color-mix(in srgb, var(--shade) 18%, transparent)); }
  .rays { position: absolute; inset: 0; opacity: .3; background: linear-gradient(116deg, transparent 12%, color-mix(in srgb, var(--warm) 18%, transparent) 14%, transparent 23%, transparent 30%, color-mix(in srgb, var(--warm) 12%, transparent) 33%, transparent 42%); }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; opacity: .75; }
  .vignette { position: absolute; inset: 0; box-shadow: inset 0 0 80px 12px rgb(9 15 24 / .24); }
  :global(body.q-low) canvas, :global(body.q-low) .rays { display: none; }
  :global(body.q-medium) .rays { opacity: .15; }
</style>
