<!--
  Campanha (ambiente de teste, só no modo desenvolvedor): uma vila fechada por árvores, com lago,
  casas e moradores, para experimentar a movimentação do herói.
   - Ao entrar, o jogador escolhe como andar: pelas teclas (WASD; o herói olha para o mouse) ou apontando e clicando.
   - Shift corre, Espaço pula. Botão esquerdo: golpeia na direção do mouse — ou conversa/usa, se o mouse estiver
     sobre algo com que dá para interagir (aí aparece um halo amarelo em volta). Botão direito (segurar): defesa.
   - As falas aparecem em balões pretos, meio transparentes, sobre quem fala; perguntas trazem as respostas no balão.
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
  let defending = $state(false);
  /** Como andar: teclas (WASD) ou apontar e clicar. Escolhido ao entrar; fica guardado. */
  let mode = $state<'wasd' | 'click' | null>((() => { try { const m = localStorage.getItem('voidsun.campanha.modo'); return m === 'wasd' || m === 'click' ? m : null; } catch { return null; } })());
  function setMode(m: 'wasd' | 'click') { mode = m; try { localStorage.setItem('voidsun.campanha.modo', m); } catch { /* sem armazenamento local */ } }

  // ───── falas: balões sobre quem fala (moradores e o próprio herói) ─────
  type Line = { who: string; text: string; options?: { text: string; reply: string }[] };
  let talk = $state<Line | null>(null);
  let mine = $state('');
  let hot = $state<string | null>(null);
  let talkTimer = 0;
  const SPEECH: { hello: [string, string]; ask?: { q: [string, string]; a: { t: [string, string]; r: [string, string] }[] } }[] = [
    { hello: ['Bem-vindo à vila, viajante. O sol negro ainda não chegou aqui.', 'Welcome to the village, traveler. The black sun has not reached us yet.'] },
    { hello: ['Dizem que há um dragão nas terras vulcânicas…', 'They say there is a dragon in the volcanic lands…'], ask: { q: ['Você veio enfrentar o dragão?', 'Did you come to face the dragon?'], a: [{ t: ['Vim. Onde ele está?', 'I did. Where is it?'], r: ['A leste, depois do pântano. Leve poções.', 'East, past the swamp. Bring potions.'] }, { t: ['Não. Só estou de passagem.', 'No. Just passing through.'], r: ['Sábio. Poucos voltam de lá.', 'Wise. Few come back from there.'] }, { t: ['Que dragão?', 'What dragon?'], r: ['…Você não é daqui mesmo, é?', '…You really are not from here, are you?'] }] } },
    { hello: ['O lago está calmo hoje. Bom dia para pescar.', 'The lake is calm today. A good day for fishing.'] },
    { hello: ['Preciso de ajuda com uns goblins na mata.', 'I need help with some goblins in the woods.'], ask: { q: ['Você me ajuda?', 'Will you help me?'], a: [{ t: ['Ajudo. Conte comigo.', 'I will. Count on me.'], r: ['Obrigado! Eles ficam ao norte, perto das pedras.', 'Thank you! They stay up north, near the rocks.'] }, { t: ['Agora não posso.', 'Not right now.'], r: ['Entendo. Volte quando puder.', 'I see. Come back when you can.'] }] } },
    { hello: ['Treine todo dia. A lâmina cansa antes do braço.', 'Train every day. The blade tires before the arm.'] },
    { hello: ['Psiu. Quer saber um segredo?', 'Psst. Want to know a secret?'], ask: { q: ['Guarda segredo?', 'Can you keep a secret?'], a: [{ t: ['Guardo.', 'I can.'], r: ['Atrás da casa azul tem um baú. Eu não disse nada.', 'There is a chest behind the blue house. I said nothing.'] }, { t: ['Melhor não saber.', 'Better not to know.'], r: ['Como quiser…', 'As you wish…'] }] } },
    { hello: ['Que os ventos guiem os seus passos.', 'May the winds guide your steps.'] },
  ];
  function say(id: string, i: number) {
    const sp = SPEECH[i % SPEECH.length];
    clearTimeout(talkTimer);
    mine = '';
    goal = null;
    talk = sp.ask ? { who: id, text: `${L(sp.hello[0], sp.hello[1])} ${L(sp.ask.q[0], sp.ask.q[1])}`, options: sp.ask.a.map((a) => ({ text: L(a.t[0], a.t[1]), reply: L(a.r[0], a.r[1]) })) } : { who: id, text: L(sp.hello[0], sp.hello[1]) };
    if (!sp.ask) talkTimer = window.setTimeout(() => (talk = null), 4200);
  }
  function answer(o: { text: string; reply: string }) {
    if (!talk) return;
    const who = talk.who;
    mine = o.text;
    talk = null;
    talkTimer = window.setTimeout(() => { talk = { who, text: o.reply }; mine = ''; talkTimer = window.setTimeout(() => (talk = null), 4200); }, 1500);
  }
  /** Botão esquerdo: interage (se o mouse está sobre um morador) ou golpeia; no modo de apontar e clicar, o chão é para andar. */
  function leftClick(e: MouseEvent) {
    if (!mode) return;
    mouse = world(e);
    if (hot) return; // o clique no morador já tratou
    if (mode === 'click') goal = mouse; else strike();
  }
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
      if (k === 'escape' && talk) { talk = null; e.preventDefault(); }
      keys.add(k);
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    addEventListener('keydown', down); addEventListener('keyup', up);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      let dx = mode === 'wasd' ? (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0) : 0, dy = mode === 'wasd' ? (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0) : 0;
      const byKeys = !!(dx || dy);
      if (byKeys) goal = null;
      else if (goal) { dx = goal.x - pos.x; dy = goal.y - pos.y; if (Math.hypot(dx, dy) < 4) { goal = null; dx = dy = 0; } }
      const len = Math.hypot(dx, dy);
      if (defending) { anim = 'thrust'; dir = facing(mouse.x - pos.x, mouse.y - pos.y); goal = null; }
      else if (len && !attacking) {
        const sp = (keys.has('shift') ? 210 : 120) * dt, nx = pos.x + (dx / len) * sp, ny = pos.y + (dy / len) * sp;
        // desliza pelas paredes: tenta o passo inteiro, depois só um eixo
        if (free(nx, ny)) pos = { x: nx, y: ny }; else if (free(nx, pos.y)) pos = { x: nx, y: pos.y }; else if (free(pos.x, ny)) pos = { x: pos.x, y: ny }; else goal = null;
        anim = 'walk';
        // pelas teclas, o herói olha para o mouse; indo a um ponto clicado, olha para onde anda
        dir = byKeys ? facing(mouse.x - pos.x, mouse.y - pos.y) : facing(dx, dy);
      } else if (!attacking) { anim = 'idle'; dir = facing(mouse.x - pos.x, mouse.y - pos.y); }
      // moradores que passeiam: andam até um ponto perto, param um pouco e escolhem outro
      for (const w of walkers) {
        if (talk?.who === w.id) { w.anim = 'idle'; continue; }
        w.wait -= dt;
        if (w.wait > 0) { w.anim = 'idle'; continue; }
        const ddx = w.tx - w.x, ddy = w.ty - w.y, dl = Math.hypot(ddx, ddy);
        if (dl < 3) { w.wait = 1 + Math.random() * 3; const nx = w.hx + (Math.random() - 0.5) * 200, ny = w.hy + (Math.random() - 0.5) * 140; if (free(nx, ny)) { w.tx = nx; w.ty = ny; } continue; }
        const nx = w.x + (ddx / dl) * 46 * dt, ny = w.y + (ddy / dl) * 46 * dt;
        if (free(nx, ny)) { w.x = nx; w.y = ny; w.anim = 'walk'; w.dir = facing(ddx, ddy); } else { w.tx = w.x; w.ty = w.y; }
      }
      if (jumpT) { jumpT += dt; jump = Math.sin(Math.min(1, jumpT / 0.42) * Math.PI) * 26; if (jumpT >= 0.42) { jumpT = 0; jump = 0; } }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', down); removeEventListener('keyup', up); };
  });

  /** Moradores: os outros heróis, parados pela vila. */
  const SPOTS = [[9, 10], [18, 9], [28, 10], [11, 20], [23, 13], [33, 19], [15, 13]];
  type Npc = { id: string; i: number; x: number; y: number; hx: number; hy: number; tx: number; ty: number; wait: number; anim: Anim; dir: Dir; walks: boolean };
  let npcs = $state<Npc[]>([]);
  // (monta os moradores quando o herói muda; os de número par passeiam)
  $effect(() => {
    const me = hero?.id;
    npcs = chars.filter((c) => c.id !== me).slice(0, SPOTS.length).map((c, i) => { const x = SPOTS[i][0] * T + 16, y = SPOTS[i][1] * T + 16; return { id: c.id, i, x, y, hx: x, hy: y, tx: x, ty: y, wait: 1 + i * 0.7, anim: 'idle' as Anim, dir: 's' as Dir, walks: i % 2 === 0 }; });
  });
  const walkers = $derived(npcs.filter((n) => n.walks));
  const charOf = (id: string) => chars.find((c) => c.id === id);
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
      onmousemove={(e) => (mouse = world(e))} onclick={leftClick} oncontextmenu={(e) => e.preventDefault()}
      onmousedown={(e) => { if (e.button === 2 && mode) { mouse = world(e); defending = true; attacking = false; } }} onmouseup={(e) => { if (e.button === 2) { defending = false; anim = 'idle'; } }} onmouseleave={() => { defending = false; }}>
      <canvas bind:this={cv}></canvas>
      {#each npcs as n (n.id)}
        {@const c = charOf(n.id)}
        {#if c?.avatar}
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <span class="fig npc" class:hot={hot === n.id} style="left:{n.x}px;top:{n.y}px;z-index:{Math.round(n.y)}"
            onmouseenter={() => (hot = n.id)} onmouseleave={() => { if (hot === n.id) hot = null; }} onclick={(e) => { e.stopPropagation(); if (mode) say(n.id, n.i); }}>
            <AvatarSprite avatar={c.avatar} anim={n.anim} dir={n.dir} scale={1} /><small>{c.name}</small>
            {#if talk?.who === n.id}
              <span class="balloon" class:ask={!!talk.options}>
                {talk.text}
                {#if talk.options}<span class="opts">{#each talk.options as o, k}<button onclick={(e) => { e.stopPropagation(); answer(o); }}><b>{k + 1}</b> {o.text}</button>{/each}</span>{/if}
              </span>
            {/if}
          </span>
        {/if}
      {/each}
      {#if hero?.avatar}
        <span class="fig me" style="left:{pos.x}px;top:{pos.y}px;z-index:{Math.round(pos.y)}">
          <span class="lift" style="transform:translateY({-jump}px)"><AvatarSprite avatar={hero.avatar} {anim} {dir} scale={1} loop={anim === 'idle' || anim === 'walk'} shadow={false} onend={() => { if (!defending) { attacking = false; anim = 'idle'; } }} /></span>
          <i class="shadow" style="transform:translateX(-50%) scale({1 - jump / 60})"></i>
          {#if defending}<i class="guard {dir}"></i>{/if}
          {#if mine}<span class="balloon me">{mine}</span>{/if}
        </span>
      {/if}
    </div>
  </div>
  <p class="help">
    {mode === 'click' ? L('Clique no chão: ir até o ponto · F: golpear', 'Click the ground: go there · F: strike') : L('WASD anda · botão esquerdo: golpear na direção do mouse', 'WASD walks · left button: strike toward the mouse')}
    · {L('Shift corre · Espaço pula · botão direito (segurar): defender · clique num morador: conversar', 'Shift runs · Space jumps · right button (hold): defend · click a villager: talk')}
    <button class="btn sm ghost" onclick={() => (mode = null)}>{L('Trocar o modo de andar', 'Change movement mode')}</button>
  </p>
  {#if !mode}
    <div class="modepick">
      <div class="mp-box">
        <small>{L('Antes de entrar', 'Before you enter')}</small>
        <h2 class="display">{L('Como você quer andar?', 'How do you want to move?')}</h2>
        <div class="mp-opts">
          <button onclick={() => setMode('wasd')}><b>W A S D</b><span>{L('Teclas para andar. O herói olha e golpeia para onde o mouse aponta.', 'Keys to move. The hero faces and strikes where the mouse points.')}</span></button>
          <button onclick={() => setMode('click')}><b>{L('Apontar e clicar', 'Point and click')}</b><span>{L('Clique no chão e o herói vai até lá. F golpeia.', 'Click the ground and the hero walks there. F strikes.')}</span></button>
        </div>
        <p class="muted">{L('Nos dois modos: botão esquerdo conversa com quem estiver com o halo amarelo; botão direito defende.', 'In both modes: the left button talks to whoever has the yellow halo; the right button defends.')}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .village { position: relative; height: 100%; display: flex; flex-direction: column; background: #07060c; }
  .pickrow { display: flex; gap: 5px; margin-left: auto; }
  .pickrow button { padding: 1px; border-radius: 50%; border: 2px solid transparent; background: none; cursor: pointer; line-height: 0; opacity: .6; }
  .pickrow button.on { border-color: var(--k); opacity: 1; }
  .frame { flex: 1; min-height: 0; display: grid; place-items: center; overflow: hidden; padding: 10px; }
  .stage { position: relative; flex: none; transform-origin: center; cursor: crosshair; overflow: hidden; border-radius: 6px; box-shadow: 0 0 0 3px #14100d, 0 0 0 5px #8a6d3b, 0 20px 50px rgb(0 0 0 / .6); }
  .stage canvas { position: absolute; inset: 0; image-rendering: pixelated; }
  .fig { position: absolute; transform: translate(-50%, -86%); line-height: 0; pointer-events: none; display: grid; justify-items: center; }
  .fig small { position: absolute; top: 100%; margin-top: -6px; font: 600 10px/1 var(--ui); color: #fff; padding: 2px 5px; border-radius: 5px; background: rgb(0 0 0 / .55); white-space: nowrap; }
  .lift { display: block; }
  .fig.npc { pointer-events: auto; cursor: pointer; transition: filter .12s; }
  /* dá para interagir: um halo amarelo em volta (só o contorno, sem cobrir a figura) */
  .fig.npc.hot { filter: drop-shadow(0 0 2px #ffe7a6) drop-shadow(0 0 7px rgb(255 205 90 / .9)); }
  .balloon { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 4px; z-index: 5000; width: max-content; max-width: 230px; padding: 7px 11px; border-radius: 10px; font: 500 12.5px/1.35 var(--ui); color: #fff; text-align: left;
    background: rgb(0 0 0 / .78); border: 1px solid rgb(255 255 255 / .16); box-shadow: 0 6px 14px rgb(0 0 0 / .5); animation: pop .16s ease-out; }
  .balloon::after { content: ''; position: absolute; left: 50%; top: 100%; margin-left: -6px; border: 6px solid transparent; border-top-color: rgb(0 0 0 / .78); }
  .balloon.ask { max-width: 300px; padding: 10px 13px; font-size: 13.5px; border-color: rgb(255 220 130 / .55); box-shadow: 0 0 0 2px rgb(0 0 0 / .4), 0 0 22px rgb(255 205 90 / .28), 0 8px 18px rgb(0 0 0 / .6); pointer-events: auto; }
  .balloon.me { background: rgb(0 0 0 / .78); }
  .opts { display: grid; gap: 5px; margin-top: 8px; }
  .opts button { display: flex; gap: 7px; align-items: baseline; text-align: left; padding: 5px 9px; border-radius: 7px; border: 1px solid rgb(255 255 255 / .22); background: rgb(255 255 255 / .07); color: #fff; font: 500 12.5px var(--ui); cursor: pointer; }
  .opts button:hover { background: rgb(255 205 90 / .22); border-color: #ffd36a; }
  .opts b { color: #ffd36a; }
  @keyframes pop { from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(.94); } }
  /* defesa: um arco de escudo à frente do herói */
  .guard { position: absolute; left: 50%; top: 46%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; border: 3px solid transparent; border-top-color: rgb(160 205 255 / .95); filter: drop-shadow(0 0 5px #7fb0ff); }
  .guard.s { transform: rotate(180deg) translateY(-8px); } .guard.n { transform: translateY(-8px); } .guard.e { transform: rotate(90deg) translateY(-8px); } .guard.w { transform: rotate(-90deg) translateY(-8px); }
  .help .btn { margin-left: 8px; }
  .modepick { position: absolute; inset: 0; z-index: 9000; display: grid; place-items: center; background: rgb(4 3 8 / .8); backdrop-filter: blur(3px); }
  .mp-box { display: grid; justify-items: center; gap: 10px; padding: 26px 30px; border-radius: 20px; max-width: 700px; text-align: center; background: linear-gradient(180deg, #2a221c, #14100d); border: 1px solid #c9a24a; box-shadow: 0 0 0 4px rgb(0 0 0 / .5), 0 30px 70px rgb(0 0 0 / .8); }
  .mp-box small { font: 700 11px var(--ui); letter-spacing: .22em; text-transform: uppercase; color: var(--accent); }
  .mp-box h2 { font-size: 28px; color: #f6ead8; }
  .mp-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .mp-opts button { display: grid; gap: 8px; padding: 18px 16px; border-radius: 14px; cursor: pointer; color: var(--text-2); font: inherit; background: rgb(255 255 255 / .05); border: 1px solid rgb(255 255 255 / .16); transition: transform .12s, border-color .12s, box-shadow .12s; }
  .mp-opts button:hover { transform: translateY(-4px); border-color: #f0c45a; box-shadow: 0 0 20px rgb(240 196 90 / .3); }
  .mp-opts b { font: 700 20px var(--display); color: #ffd98a; letter-spacing: .08em; } .mp-opts span { font-size: 13px; line-height: 1.4; }
  .shadow { position: absolute; left: 50%; bottom: 3px; width: 26px; height: 8px; border-radius: 50%; background: rgb(0 0 0 / .4); z-index: -1; }
  .help { margin: 0; padding: 6px 12px 10px; text-align: center; font-size: 12.5px; color: var(--muted); }
</style>
