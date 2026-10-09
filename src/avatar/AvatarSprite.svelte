<!--
  O boneco animado. `scale` = tamanho de cada pixel; a caixa tem sempre 64×scale,
  e as animações com armas grandes (quadros de 128/192) transbordam para os lados.
  Animações que não repetem (`loop` falso) param no último quadro e avisam em `onend`.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { frameForDistance } from './walk';
  import { ANIMATION_FPS as FPS } from './animation';
  import { directionRow, type Facing } from './direction';
  import { compose, FX_COLORS, LPC, type Anim, type Avatar, type Sheet } from './lpc';

  let { avatar, anim = 'idle', dir = 's', scale = 2, loop = true, shadow = true, speed = 1, travel, renderMode = 'auto', onend }: {
    avatar: Avatar; renderMode?: 'auto' | 'layered'; anim?: Anim; dir?: Facing; scale?: number; loop?: boolean; shadow?: boolean; /** Multiplica a velocidade da animação (1 = normal). */ speed?: number; /** Distância percorrida no mundo: sincroniza o passo aos pés. */ travel?: number; onend?: () => void;
  } = $props();

  let canvas = $state<HTMLCanvasElement>();
  let sheet = $state<Sheet | null>(null);
  let frame = 0;
  let loadedAnim = $state<Anim>('idle');

  // troca de boneco ou de animação: carrega a folha e recomeça
  $effect(() => {
    const a = anim, key = JSON.stringify(avatar), mode = renderMode;
    let alive = true;
    void compose(JSON.parse(key) as Avatar, a, mode).then((s) => { if (alive) { frame = 0; loadedAnim = a; sheet = s; } }).catch(() => { if (alive) { sheet = null; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); } });
    return () => { alive = false; };
  });

  function draw(s: Sheet, f: number) {
    if (!canvas) return;
    if (canvas.width !== s.size) { canvas.width = s.size; canvas.height = s.size; }
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, s.size, s.size);
    const row = s.rows === 1 ? 0 : directionRow(dir, s.directions);
    ctx.drawImage(s.canvas, f * s.size, row * s.size, s.size, s.size, 0, 0, s.size, s.size);
    if (s.glow) {
      // os veios de brasa respiram: acendem e apagam devagar, com um tremor curto por cima
      const t = performance.now() / 1000;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, 0.3 + 0.3 * Math.sin(t * 2.4) + 0.08 * Math.sin(t * 13));
      ctx.drawImage(s.glow, f * s.size, row * s.size, s.size, s.size, 0, 0, s.size, s.size);
      ctx.globalCompositeOperation = 'source-over';
      // fagulhas: sobem dos veios e se apagam
      const pts = pixels(s, s.glow, f, row), n = pts.length / 2;
      for (let i = 0; n && i < 5; i++) {
        const life = 0.9 + rnd(i, 7) * 0.8, clock = t + rnd(i, 8) * life, age = (clock % life) / life;
        const k = Math.floor(rnd(i, Math.floor(clock / life) + 3) * n);
        ctx.globalAlpha = 0.9 * (1 - age);
        ctx.fillStyle = age < 0.4 ? '#ffd27a' : '#ff5a2a';
        ctx.fillRect(Math.round(pts[k * 2] + Math.sin((t + i) * 3) * age * 2), Math.round(pts[k * 2 + 1] - age * (7 + rnd(i, 9) * 6)), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
    if (s.fx) magic(ctx, s, f, row);
  }

  // ───── magia imbuída na arma: aura, chamas, fumaça ou faíscas que nascem dos pixels da arma ─────
  const points = new WeakMap<HTMLCanvasElement, Map<number, Int16Array>>();
  const weaponPixels = (s: Sheet, f: number, row: number) => pixels(s, s.fx!.mask, f, row);
  /** Pixels de uma camada (a arma, os veios de brasa) no quadro: x, y, x, y… */
  function pixels(s: Sheet, mask: HTMLCanvasElement, f: number, row: number): Int16Array {
    let per = points.get(mask);
    if (!per) { per = new Map(); points.set(mask, per); }
    const key = row * 100 + f;
    let pts = per.get(key);
    if (!pts) {
      const d = mask.getContext('2d', { willReadFrequently: true })!.getImageData(f * s.size, row * s.size, s.size, s.size).data;
      const out: number[] = [];
      for (let y = 0; y < s.size; y++) for (let x = 0; x < s.size; x++) if (d[(y * s.size + x) * 4 + 3] > 60) out.push(x, y);
      pts = Int16Array.from(out);
      per.set(key, pts);
    }
    return pts;
  }
  /** Número "ao acaso" estável (0 a 1) para um par de sementes. */
  const rnd = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  function magic(ctx: CanvasRenderingContext2D, s: Sheet, f: number, row: number) {
    const pts = weaponPixels(s, f, row), n = pts.length / 2;
    if (!n) return;
    const [dark, mid, bright] = FX_COLORS[s.fx!.color].ramp;
    const t = performance.now() / 1000, kind = s.fx!.kind;
    if (kind === 'aura') {
      // halo que pulsa: aparece só onde não há boneco (por trás do que já está desenhado)
      ctx.globalCompositeOperation = 'destination-over';
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      for (const [r, color, a] of [[1, bright, 0.55 + 0.35 * pulse], [2, mid, 0.3 + 0.3 * pulse], [3, dark, 0.12 + 0.2 * pulse]] as const) {
        ctx.globalAlpha = a; ctx.fillStyle = color;
        for (let i = 0; i < n; i++) { const x = pts[i * 2], y = pts[i * 2 + 1]; ctx.fillRect(x - r, y, 1, 1); ctx.fillRect(x + r, y, 1, 1); ctx.fillRect(x, y - r, 1, 1); ctx.fillRect(x, y + r, 1, 1); }
      }
    } else if (kind === 'sparks') {
      const count = Math.min(9, 3 + Math.floor(n / 14));
      for (let i = 0; i < count; i++) {
        const life = 0.45 + rnd(i, 1) * 0.5, clock = t + rnd(i, 2) * life, age = (clock % life) / life;
        const k = Math.floor(rnd(i, Math.floor(clock / life)) * n), x = pts[k * 2], y = pts[k * 2 + 1];
        const a = Math.sin(Math.PI * age);
        ctx.globalAlpha = a; ctx.fillStyle = bright; ctx.fillRect(x, y, 1, 1);
        if (a > 0.7) { ctx.globalAlpha = a * 0.7; ctx.fillStyle = mid; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
      }
    } else {
      // chamas (rápidas, claras, sobem pouco) ou fumaça (lenta, escura, sobe mais e se espalha)
      const smoke = kind === 'smoke';
      const count = Math.min(smoke ? 22 : 30, 8 + Math.floor(n / (smoke ? 5 : 4)));
      for (let i = 0; i < count; i++) {
        const life = (smoke ? 1.1 : 0.45) + rnd(i, 1) * (smoke ? 0.9 : 0.35), clock = t + rnd(i, 2) * life, age = (clock % life) / life;
        const k = Math.floor(rnd(i, Math.floor(clock / life)) * n);
        const sway = Math.sin((t + i) * (smoke ? 2.2 : 7)) * age * (smoke ? 3 : 1.4);
        const x = Math.round(pts[k * 2] + sway), y = Math.round(pts[k * 2 + 1] - age * (smoke ? 9 + rnd(i, 3) * 5 : 4 + rnd(i, 3) * 4));
        ctx.globalAlpha = smoke ? 0.7 * (1 - age) : 1 - age * 0.85;
        ctx.fillStyle = smoke ? (age < 0.35 ? mid : dark) : (age < 0.3 ? bright : age < 0.65 ? mid : dark);
        const big = smoke && age > 0.45 ? 2 : 1;
        ctx.fillRect(x, y, big, big);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // A direção muda sem reiniciar o relógio nem repetir o callback de fim.
  $effect(() => { const s = sheet, a = anim, loaded = loadedAnim; void dir; const distance = travel; if (s && loaded === a) untrack(() => { if (anim === 'walk' && distance !== undefined) frame = s.frames === 9 && !s.directions ? 1 + frameForDistance(distance, 8, 80) : frameForDistance(distance, s.frames, s.frames > 4 ? 80 : 40); draw(s, Math.min(frame, s.frames - 1)); }); });
  $effect(() => {
    const s = sheet, a = anim, repeat = loop, rate = Math.max(0.1, Number.isFinite(speed) ? speed : 1);
    if (!s || loadedAnim !== a || (a === 'walk' && travel !== undefined)) return;
    const interval = 1000 / (FPS[a] * rate);
    let previous = performance.now(), elapsed = 0, glowElapsed = 0, completed = false, raf = 0;
    untrack(() => draw(s, Math.min(frame, s.frames - 1)));
    function tick(now: number) {
      const dt = document.hidden ? 0 : Math.min(100, now - previous);
      previous = now;
      let changed = false;
      if (!completed) {
        elapsed += dt;
        while (elapsed >= interval) {
          elapsed -= interval;
          if (frame + 1 >= s!.frames) {
            if (!repeat) { completed = true; onend?.(); break; }
            frame = 0;
          } else frame++;
          changed = true;
        }
      }
      glowElapsed += dt;
      if (changed || ((s!.fx || s!.glow) && glowElapsed >= 75)) {
        draw(s!, Math.min(frame, s!.frames - 1)); glowElapsed = 0;
      }
      if (!completed || s!.fx || s!.glow) raf = requestAnimationFrame(tick);
    }
    if (repeat && s.frames === 1 && !s.fx && !s.glow) return;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const box = $derived(LPC.frame * scale);
  const big = $derived((sheet?.size ?? LPC.frame) * scale / (sheet?.density ?? 1));
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
