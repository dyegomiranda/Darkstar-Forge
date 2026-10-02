<!--
  Miniatura parada do boneco (de frente) para as caixinhas de escolha: mostra o
  herói já vestindo aquela opção. `crop` recorta a parte que interessa (cabeça, pernas…).
-->
<script lang="ts">
  import { thumb, type Avatar, type Dir } from './lpc';

  let { avatar, crop = [0, 0, 64, 64], px = 2, dir = 's' }: { avatar: Avatar; crop?: readonly [number, number, number, number]; px?: number; dir?: Dir } = $props();
  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    const key = JSON.stringify(avatar), c = crop, d = dir;
    let alive = true;
    void thumb(JSON.parse(key) as Avatar, c, d).then((t) => {
      if (!alive || !canvas) return;
      canvas.width = t.width; canvas.height = t.height;
      canvas.getContext('2d')!.drawImage(t, 0, 0);
    });
    return () => { alive = false; };
  });
</script>

<canvas bind:this={canvas} width={crop[2]} height={crop[3]} style="width:{crop[2] * px}px;height:{crop[3] * px}px"></canvas>

<style>
  canvas { image-rendering: pixelated; display: block; flex: none; }
</style>
