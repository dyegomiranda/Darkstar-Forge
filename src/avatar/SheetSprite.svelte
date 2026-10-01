<!--
  Criatura desenhada numa folha de quadros pronta (animais, máquinas, construções):
  4 fileiras — parado de costas, parado de frente, ataque de costas, ataque de frente.
  Ocupa o mesmo lugar do boneco de peças (caixa de 64×scale, pés embaixo).
-->
<script lang="ts">
  import type { SheetDef } from './creatures';

  let { id, def, attacking = false, back = false, scale = 2, shadow = true, onend }: {
    id: string; def: SheetDef; attacking?: boolean; back?: boolean; scale?: number; shadow?: boolean; onend?: () => void;
  } = $props();

  let frame = $state(0);
  const k = $derived(scale * (def.scale ?? 1));
  const w = $derived(def.cell[0] * k), h = $derived(def.cell[1] * k);
  const frames = $derived(attacking ? def.attack : def.idle);
  const row = $derived((attacking ? 2 : 0) + (back ? 0 : 1));
  const box = $derived(64 * scale);

  $effect(() => {
    const n = frames, atk = attacking;
    frame = 0;
    if (n <= 1 && !atk) return;
    const timer = setInterval(() => {
      if (frame + 1 >= n) {
        if (atk) { clearInterval(timer); onend?.(); return; }
        frame = 0;
      } else frame++;
    }, 1000 / (atk ? def.fps : 2));
    return () => clearInterval(timer);
  });

  const src = $derived(new URL(`creatures/${id}.png`, document.baseURI).toString());
</script>

<span class="sp" style="width:{box}px;height:{box}px">
  {#if shadow}<span class="sh" style="width:{Math.min(w, box) * 0.7}px;height:{box * 0.16}px;bottom:{box * 0.02}px"></span>{/if}
  <span class="im" style="width:{w}px;height:{h}px;left:{(box - w) / 2}px;bottom:{box * 0.06}px;background-image:url('{src}');background-size:{def.cell[0] * Math.max(def.idle, def.attack) * k}px {def.cell[1] * 4 * k}px;background-position:{-frame * w}px {-row * h}px"></span>
</span>

<style>
  .sp { position: relative; display: inline-block; flex: none; pointer-events: none; }
  .im { position: absolute; image-rendering: pixelated; background-repeat: no-repeat; }
  .sh { position: absolute; left: 50%; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(ellipse, rgb(0 0 0 / .55), transparent 70%); }
</style>
