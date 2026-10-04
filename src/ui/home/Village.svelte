<!--
  Campanha (ambiente de teste, só no modo desenvolvedor): uma vila fechada por árvores, com lago,
  casas e moradores, para experimentar a movimentação do herói.
   - WASD anda (Shift corre, Espaço pula); o herói olha para onde o mouse aponta.
   - Clique no chão: o herói vai até lá. Botão direito (ou F): golpeia na direção do mouse.
  O chão é desenhado na hora (pixel art, grade de 32); as figuras são os bonecos dos heróis.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import ScreenBar from '../common/ScreenBar.svelte';
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import AvatarSprite from '../../avatar/AvatarSprite.svelte';
  import { attackAnim, type Anim, type Dir } from '../../avatar/lpc';
  import { playable, heroColor } from '../game/heroes';
  import { rng } from '../../game/journey';

  const T = 32, COLS = 40, ROWS = 24, W = COLS * T, H = ROWS * T;
  const chars = $derived(playable().filter((c) => c.avatar));
  let heroId = $state('');
  const hero = $derived(chars.find((c) => c.id === heroId) ?? chars[0]);

  // ───── a vila: o que cada casa da grade é ─────
  type Cell = 'grass' | 'tree' | 'water' | 'house' | 'path';
  const rand = rng(20261004);
  const grid: Cell[][] = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x): Cell => {
    // cerca de árvores (2 de espessura, com a borda de dentro irregular)
    const edge = Math.min(x, y, COLS - 1 - x, ROWS - 1 - y);
    if (edge < 2 || (edge === 2 && rand() < 0.45)) return 'tree';
    // lago (oval) a leste
    if (((x - 29) / 5.2) ** 2 + ((y - 15) / 3.4) ** 2 < 1) return 'water';
    return 'grass';
  }));
  const HOUSES = [{ x: 6, y: 5, w: 5, h: 4, roof: '#8a3a2e' }, { x: 15, y: 4, w: 6, h: 4, roof: '#3d5a8a' }, { x: 26, y: 5, w: 5, h: 4, roof: '#6a4a8a' }, { x: 8, y: 15, w: 6, h: 4, roof: '#4a7a4a' }];
  for (const h of HOUSES) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) grid[y][x] = 'house';
  // caminhos de terra: uma rua no meio e uma descida até cada porta
  for (let x = 3; x < COLS - 3; x++) if (grid[11][x] === 'grass') grid[11][x] = 'path';
  for (const h of HOUSES) { const px = h.x + Math.floor(h.w / 2); for (let y = Math.min(11, h.y + h.h); y <= Math.max(11, h.y + h.h - 1 + (h.y > 11 ? -h.h : 0)); y++) if (grid[y]?.[px] === 'grass') grid[y][px] = 'path'; for (let y = 11; y < h.y; y++) if (grid[y][px] === 'grass') grid[y][px] = 'path'; }
  for (let i = 0; i < 14; i++) { const x = 4 + Math.floor(rand() * (COLS - 8)), y = 4 + Math.floor(rand() * (ROWS - 8)); if (grid[y][x] === 'grass' && Math.abs(y - 11) > 1) grid[y][x] = 'tree'; }
  const solid = (px: number, py: number) => { const c = grid[Math.floor(py / T)]?.[Math.floor(px / T)]; return !c || c === 'tree' || c === 'water' || c === 'house'; };
  /** O herói cabe ali? (os pés ocupam uma caixa pequena) */
  const free = (x: number, y: number) => !solid(x - 9, y - 4) && !solid(x + 9, y - 4) && !solid(x - 9, y + 5) && !solid(x + 9, y + 5);

  let cv = $state<HTMLCanvasElement>();
  function paint() {
    if (!cv) return;
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d')!, r = rng(77);
    const px = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const k = grid[y][x], X = x * T, Y = y * T;
      px(X, Y, T, T, k === 'water' ? '#2a5f8f' : k === 'path' ? '#8a6f4a' : (x + y) % 2 ? '#3f7a3a' : '#437f3d');
      for (let i = 0; i < 5; i++) { const a = Math.floor(r() * 7) * 4, b = Math.floor(r() * 7) * 4; px(X + a, Y + b, 4, 4, k === 'water' ? (r() < 0.4 ? '#4a86b8' : '#245680') : k === 'path' ? (r() < 0.5 ? '#9a7f58' : '#7a6040') : (r() < 0.5 ? '#4f8f45' : '#356b32')); }
      // margem do lago
      if (k !== 'water' && [grid[y - 1]?.[x], grid[y + 1]?.[x], grid[y][x - 1], grid[y][x + 1]].includes('water')) px(X, Y, T, T, 'rgb(214 196 140 / .55)');
    }
    for (const h of HOUSES) {
      const X = h.x * T, Y = h.y * T, w = h.w * T, hh = h.h * T;
      px(X + 4, Y + hh * 0.42, w - 8, hh * 0.58 - 4, '#c9b48a'); px(X + 4, Y + hh - 8, w - 8, 4, '#8a7450');
      px(X, Y + 4, w, hh * 0.46, h.roof); px(X, Y + 4, w, 6, 'rgb(255 255 255 / .18)'); px(X, Y + hh * 0.46 - 2, w, 6, 'rgb(0 0 0 / .3)');
      const dx = X + Math.floor(h.w / 2) * T + 6; px(dx, Y + hh - 34, 20, 30, '#5a3a22'); px(dx + 14, Y + hh - 20, 3, 3, '#e3b566');
      px(X + 14, Y + hh * 0.56, 18, 16, '#7fc0e8'); px(X + w - 32, Y + hh * 0.56, 18, 16, '#7fc0e8');
    }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === 'tree') {
      const X = x * T, Y = y * T;
      px(X + 13, Y + 18, 6, 12, '#4a3220'); px(X + 4, Y + 24, 24, 5, 'rgb(0 0 0 / .25)');
      px(X + 4, Y - 6, 24, 26, '#1f5a2a'); px(X, Y, 32, 14, '#1f5a2a'); px(X + 6, Y - 4, 16, 14, '#2f7a37'); px(X + 8, Y - 2, 8, 6, '#59a851');
    }
  }
  $effect(() => { if (cv) paint(); });

  // ───── o herói ─────
  let pos = $state({ x: 20 * T, y: 12 * T });
  let dir = $state<Dir>('s');
  let anim = $state<Anim>('idle');
  let jump = $state(0);
  let goal: { x: number; y: number } | null = null;
  let mouse = { x: 20 * T, y: 13 * T };
  const keys = new Set<string>();
  let attacking = false, jumpT = 0;
  let stage = $state<HTMLDivElement>();
  let scale = $state(1);
  const world = (e: MouseEvent) => { const r = stage!.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };
  const facing = (dx: number, dy: number): Dir => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n');
  function strike() { if (attacking || !hero?.avatar) return; attacking = true; goal = null; dir = facing(mouse.x - pos.x, mouse.y - pos.y); anim = attackAnim(hero.avatar, 'slash'); }

  onMount(() => {
    let last = performance.now(), raf = 0;
    const fit = () => { const p = stage?.parentElement; if (p) scale = Math.min(p.clientWidth / W, p.clientHeight / H); };
    const ro = new ResizeObserver(fit);
    if (stage?.parentElement) ro.observe(stage.parentElement);
    fit();
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'shift', ' '].includes(k)) e.preventDefault();
      if (k === ' ' && !jumpT) jumpT = 0.0001;
      if (k === 'f') strike();
      keys.add(k);
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    addEventListener('keydown', down); addEventListener('keyup', up);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      let dx = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0), dy = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
      const byKeys = !!(dx || dy);
      if (byKeys) goal = null;
      else if (goal) { dx = goal.x - pos.x; dy = goal.y - pos.y; if (Math.hypot(dx, dy) < 4) { goal = null; dx = dy = 0; } }
      const len = Math.hypot(dx, dy);
      if (len && !attacking) {
        const sp = (keys.has('shift') ? 210 : 120) * dt, nx = pos.x + (dx / len) * sp, ny = pos.y + (dy / len) * sp;
        // desliza pelas paredes: tenta o passo inteiro, depois só um eixo
        if (free(nx, ny)) pos = { x: nx, y: ny }; else if (free(nx, pos.y)) pos = { x: nx, y: pos.y }; else if (free(pos.x, ny)) pos = { x: pos.x, y: ny }; else goal = null;
        anim = 'walk';
        // pelas teclas, o herói olha para o mouse; indo a um ponto clicado, olha para onde anda
        dir = byKeys ? facing(mouse.x - pos.x, mouse.y - pos.y) : facing(dx, dy);
      } else if (!attacking) { anim = 'idle'; dir = facing(mouse.x - pos.x, mouse.y - pos.y); }
      if (jumpT) { jumpT += dt; jump = Math.sin(Math.min(1, jumpT / 0.42) * Math.PI) * 26; if (jumpT >= 0.42) { jumpT = 0; jump = 0; } }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', down); removeEventListener('keyup', up); };
  });

  /** Moradores: os outros heróis, parados pela vila. */
  const SPOTS = [[9, 10], [18, 9], [28, 10], [11, 20], [23, 13], [33, 19], [15, 13]];
  const npcs = $derived(chars.filter((c) => c.id !== hero?.id).slice(0, SPOTS.length).map((c, i) => ({ c, x: SPOTS[i][0] * T + 16, y: SPOTS[i][1] * T + 16 })));
</script>

<div class="village">
  <ScreenBar title={L('Campanha', 'Campaign')} kicker={L('Ambiente de teste · modo desenvolvedor', 'Test area · developer mode')} back={L('Menu', 'Menu')} onback={() => router.go('/')}>
    <div class="pickrow">
      {#each chars as c (c.id)}
        <button class:on={c.id === hero?.id} style="--k:{heroColor(c)}" onclick={(e) => { heroId = c.id; (e.currentTarget as HTMLElement).blur(); }} title={c.name}><HeroPortrait hero={c} size={30} round /></button>
      {/each}
    </div>
  </ScreenBar>
  <div class="frame">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (o teclado anda pelo WASD) -->
    <div class="stage" bind:this={stage} style="width:{W}px;height:{H}px;transform:scale({scale})"
      onmousemove={(e) => (mouse = world(e))} onclick={(e) => { const p = world(e); goal = p; }} oncontextmenu={(e) => { e.preventDefault(); mouse = world(e); strike(); }}>
      <canvas bind:this={cv}></canvas>
      {#each npcs as n (n.c.id)}
        <span class="fig" style="left:{n.x}px;top:{n.y}px;z-index:{Math.round(n.y)}"><AvatarSprite avatar={n.c.avatar!} dir="s" scale={1} /><small>{n.c.name}</small></span>
      {/each}
      {#if hero?.avatar}
        <span class="fig me" style="left:{pos.x}px;top:{pos.y}px;z-index:{Math.round(pos.y)}">
          <span class="lift" style="transform:translateY({-jump}px)"><AvatarSprite avatar={hero.avatar} {anim} {dir} scale={1} loop={anim === 'idle' || anim === 'walk'} shadow={false} onend={() => { attacking = false; anim = 'idle'; }} /></span>
          <i class="shadow" style="transform:translateX(-50%) scale({1 - jump / 60})"></i>
        </span>
      {/if}
    </div>
  </div>
  <p class="help">{L('WASD anda · Shift corre · Espaço pula · o herói olha para o mouse · clique: ir até o ponto · botão direito ou F: golpear', 'WASD walks · Shift runs · Space jumps · the hero faces the mouse · click: go to the spot · right-click or F: strike')}</p>
</div>

<style>
  .village { height: 100%; display: flex; flex-direction: column; background: #07060c; }
  .pickrow { display: flex; gap: 5px; margin-left: auto; }
  .pickrow button { padding: 1px; border-radius: 50%; border: 2px solid transparent; background: none; cursor: pointer; line-height: 0; opacity: .6; }
  .pickrow button.on { border-color: var(--k); opacity: 1; }
  .frame { flex: 1; min-height: 0; display: grid; place-items: center; overflow: hidden; padding: 10px; }
  .stage { position: relative; flex: none; transform-origin: center; cursor: crosshair; overflow: hidden; border-radius: 6px; box-shadow: 0 0 0 3px #14100d, 0 0 0 5px #8a6d3b, 0 20px 50px rgb(0 0 0 / .6); }
  .stage canvas { position: absolute; inset: 0; image-rendering: pixelated; }
  .fig { position: absolute; transform: translate(-50%, -86%); line-height: 0; pointer-events: none; display: grid; justify-items: center; }
  .fig small { position: absolute; top: 100%; margin-top: -6px; font: 600 10px/1 var(--ui); color: #fff; padding: 2px 5px; border-radius: 5px; background: rgb(0 0 0 / .55); white-space: nowrap; }
  .lift { display: block; }
  .shadow { position: absolute; left: 50%; bottom: 3px; width: 26px; height: 8px; border-radius: 50%; background: rgb(0 0 0 / .4); z-index: -1; }
  .help { margin: 0; padding: 6px 12px 10px; text-align: center; font-size: 12.5px; color: var(--muted); }
</style>
