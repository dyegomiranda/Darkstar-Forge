<!--
  O boneco animado. `scale` = tamanho de cada pixel; a caixa tem sempre 64×scale,
  e as animações com armas grandes (quadros de 128/192) transbordam para os lados.
  Animações que não repetem (`loop` falso) param no último quadro e avisam em `onend`.
-->
<script lang="ts">
  import { compose, DIRS, LPC, type Anim, type Avatar, type Dir, type Sheet } from './lpc';

  let { avatar, anim = 'idle', dir = 's', scale = 2, loop = true, shadow = true, onend }: {
    avatar: Avatar; anim?: Anim; dir?: Dir; scale?: number; loop?: boolean; shadow?: boolean; onend?: () => void;
  } = $props();

  const FPS: Record<Anim, number> = { idle: 1.6, walk: 10, slash: 13, thrust: 13, shoot: 14, spellcast: 11, hurt: 9 };
  let canvas = $state<HTMLCanvasElement>();
  let sheet = $state<Sheet | null>(null);
  let frame = 0;

  // troca de boneco ou de animação: carrega a folha e recomeça
  $effect(() => {
    const a = anim, key = JSON.stringify(avatar);
    let alive = true;
    void compose(JSON.parse(key) as Avatar, a).then((s) => { if (alive) { frame = 0; sheet = s; } });
    return () => { alive = false; };
  });

  function draw(s: Sheet, f: number) {
    if (!canvas) return;
    if (canvas.width !== s.size) { canvas.width = s.size; canvas.height = s.size; }
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, s.size, s.size);
    const row = s.rows === 1 ? 0 : DIRS.indexOf(dir);
    ctx.drawImage(s.canvas, f * s.size, row * s.size, s.size, s.size, 0, 0, s.size, s.size);
  }

  $effect(() => {
    const s = sheet, a = anim, repeat = loop;
    void dir;
    if (!s) return;
    draw(s, Math.min(frame, s.frames - 1));
    const timer = setInterval(() => {
      if (frame + 1 >= s.frames) {
        if (!repeat) { clearInterval(timer); onend?.(); return; }
        frame = 0;
      } else frame++;
      draw(s, frame);
    }, 1000 / FPS[a]);
    return () => clearInterval(timer);
  });

  const box = $derived(LPC.frame * scale);
  const big = $derived((sheet?.size ?? LPC.frame) * scale);
</script>

<span class="av" style="width:{box}px;height:{box}px">
  {#if shadow}<span class="sh" style="width:{box * 0.5}px;height:{box * 0.16}px;bottom:{box * 0.02}px"></span>{/if}
  <canvas bind:this={canvas} width="64" height="64" style="width:{big}px;height:{big}px;left:{(box - big) / 2}px;top:{(box - big) / 2}px"></canvas>
</span>

<style>
  .av { position: relative; display: inline-block; flex: none; pointer-events: none; }
  canvas { position: absolute; image-rendering: pixelated; }
  .sh { position: absolute; left: 50%; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(ellipse, rgb(0 0 0 / .55), transparent 70%); }
</style>
