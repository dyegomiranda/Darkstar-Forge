<!--
  Mesa de teste, no espírito do MTG Arena. De baixo para cima: a barra do seu
  herói, a sua mão, as suas duas fileiras e a faixa das habilidades que você
  acabou de usar; o lado do oponente é o mesmo, espelhado. Grimório e cemitério
  ficam nos cantos de cada lado (as cartas voam de um lugar para outro).
  Passe o mouse numa carta para ampliá-la; clique num cemitério para ver tudo.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { crossfade, fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Swords, Move, Flag, RotateCcw, Shield, Droplet, Crosshair, Sparkles, Zap, Heart, Users, X, Skull, BookOpen } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { HEROES } from '../../game/decks';
  import { apply, cannotPlay, cardTargets, choiceOf, emptySlots, heroPos, newGame, other, reachable, strikeVia, unitAt, XP_PER_LEVEL, COLS } from '../../game/engine';
  import { botAction } from '../../game/bot';
  import { sideFromApp } from '../../game/fromApp';
  import { ATTRS, ATTR_NAMES, type Action, type CardRef, type GameState, type HeroDef, type Pos, type Unit } from '../../game/types';
  import Glyph from '../common/Glyph.svelte';
  import CardImage from '../common/CardImage.svelte';
  import { colorHex } from '../../model/catalog';
  import { composeBack } from '../../render/back';
  import { rasterize } from '../../render/raster';
  import { backInput } from '../back/backCtx';

  // ───────────── preparação ─────────────
  let step = $state<'heroes' | 'place' | 'play'>('heroes');
  let myHero = $state<HeroDef>(HEROES[0]);
  let botHero = $state<HeroDef>(HEROES[1]);
  let myPos = $state<{ row: 0 | 1; col: 0 | 1 | 2 }>({ row: HEROES[0].row, col: HEROES[0].col });
  let limit = $state(false);
  let starter = $state<'eu' | 'bot' | 'sorteio'>('sorteio');

  const deckOf = (h: HeroDef) => app.cardsOf(h.deckId).filter((c) => c.game);
  const countOf = (h: HeroDef) => deckOf(h).reduce((n, c) => n + (c.game?.copies ?? 1), 0);
  const colorOf = (h: HeroDef) => colorHex(app.deck(h.deckId)?.colors[0] ?? 'red');

  // verso das cartas (mão do oponente e grimórios): desenhado uma vez só
  let backUrl = $state('');
  $effect(() => {
    const ed = app.edition(app.deck(botHero.deckId)?.editionId);
    void rasterize(composeBack(backInput(ed, 'gameback')), 300, 'image/webp').then((b) => { backUrl = URL.createObjectURL(b); });
  });

  let g = $state<GameState | null>(null);
  let me = $state<0 | 1>(0);
  let msg = $state('');
  let botBusy = $state(false);

  function toPlace() { myPos = { row: myHero.row, col: myHero.col }; step = 'place'; }

  function start() {
    const mine = sideFromApp({ ...myHero, row: myPos.row, col: myPos.col }, deckOf(myHero));
    const bot = sideFromApp(botHero, deckOf(botHero));
    const iStart = starter === 'eu' || (starter === 'sorteio' && Math.random() < 0.5);
    me = iStart ? 0 : 1;
    g = newGame(iStart ? mine : bot, iStart ? bot : mine, { actionLimit: limit });
    sel = null;
    msg = '';
    step = 'play';
    void runBot();
  }

  // ───────────── jogo ─────────────
  type Sel = { kind: 'card'; uid: string } | { kind: 'strike' } | { kind: 'unit'; pos: Pos } | { kind: 'move' } | null;
  let sel = $state<Sel>(null);
  const foe = $derived(other(me));
  const myTurn = $derived(!!g && g.active === me && g.winner === undefined && !botBusy);
  const same = (a: Pos, b: Pos) => a.p === b.p && a.row === b.row && (a.col === b.col || a.col === -1 || b.col === -1);

  const targets = $derived.by((): Pos[] => {
    if (!g || !sel || !myTurn) return [];
    if (sel.kind === 'card') {
      const ref = g.players[me].hand.find((c) => c.uid === sel.uid);
      if (!ref) return [];
      const eff = g.defs[ref.cardId].game.effects;
      return choiceOf(eff)?.kind === 'slot' ? emptySlots(g, me) : cardTargets(g, me, eff);
    }
    if (sel.kind === 'strike') return reachable(g, me, strikeVia(g, me), heroPos(g, me));
    if (sel.kind === 'unit') { const u = unitAt(g, sel.pos); return u ? reachable(g, me, u.keys.includes('distancia') ? 'ranged' : 'melee', sel.pos) : []; }
    return emptySlots(g, me);
  });
  const isTarget = (pos: Pos) => targets.some((t) => same(t, pos));

  function act(a: Action) {
    if (!g) return;
    const err = apply(g, a);
    if (err) { msg = err; return; }
    msg = '';
    sel = null;
    zoom = null;
    if (g.active !== me) void runBot();
  }

  function clickCard(uid: string) {
    if (!g || !myTurn) return;
    const why = cannotPlay(g, me, uid);
    if (why) { msg = why; return; }
    const ref = g.players[me].hand.find((c) => c.uid === uid)!;
    const ch = choiceOf(g.defs[ref.cardId].game.effects);
    if (!ch) act({ t: 'play', uid });
    else { sel = sel?.kind === 'card' && sel.uid === uid ? null : { kind: 'card', uid }; msg = ch.kind === 'slot' ? L('Escolha um lugar livre seu.', 'Pick a free slot of yours.') : L('Escolha o alvo.', 'Pick the target.'); }
  }

  function clickSlot(pos: Pos) {
    if (!g || !myTurn) return;
    if (sel && isTarget(pos)) {
      const t = targets.find((x) => same(x, pos))!;
      if (sel.kind === 'card') {
        const ref = g.players[me].hand.find((c) => c.uid === sel!.uid)!;
        const ch = choiceOf(g.defs[ref.cardId].game.effects);
        act(ch?.kind === 'slot' ? { t: 'play', uid: sel.uid, slot: pos } : { t: 'play', uid: sel.uid, target: t.col === -1 ? { ...pos, col: -1 } : pos });
      } else if (sel.kind === 'strike') act({ t: 'strike', target: pos });
      else if (sel.kind === 'unit') act({ t: 'attack', from: sel.pos, target: pos });
      else act({ t: 'move', to: pos });
      return;
    }
    const u = unitAt(g, pos);
    if (pos.p === me && u?.isHero) {
      if (g.players[me].struck) { msg = L('O herói já golpeou neste turno.', 'Your hero already struck this turn.'); return; }
      sel = sel?.kind === 'strike' ? null : { kind: 'strike' };
      msg = L('Escolha quem golpear.', 'Pick whom to strike.');
    } else if (pos.p === me && u) {
      if (u.exhausted) { msg = L('Esta figura já atacou ou acabou de entrar.', 'This figure already attacked or just arrived.'); return; }
      if (u.keys.includes('parede')) { msg = L('Esta figura não ataca.', "This figure can't attack."); return; }
      sel = { kind: 'unit', pos };
      msg = L('Escolha o alvo do ataque.', 'Pick the attack target.');
    } else sel = null;
  }

  function startMove() {
    if (!g || !myTurn || g.players[me].moved) return;
    sel = sel?.kind === 'move' ? null : { kind: 'move' };
    msg = L('Escolha um lugar livre para o herói.', 'Pick a free slot for your hero.');
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let alive = true;
  onDestroy(() => { alive = false; if (backUrl) URL.revokeObjectURL(backUrl); });

  async function runBot() {
    if (!g || botBusy) return;
    botBusy = true;
    try {
      let steps = 0;
      while (alive && g && g.active === foe && g.winner === undefined && steps++ < 40) {
        await sleep(750);
        const a = botAction($state.snapshot(g) as GameState);
        if (apply(g, a)) apply(g, { t: 'end' });
      }
      if (g && g.active === foe && g.winner === undefined) apply(g, { t: 'end' });
    } finally { botBusy = false; }
  }

  function key(e: KeyboardEvent) { if (e.key === 'Escape') { sel = null; msg = ''; graveOf = null; } }

  // ───────────── animações: cartas voando entre grimório, mão, faixa e cemitério ─────────────
  type Fly = { key: string; from?: string; to?: string; delay?: number };
  const [send, receive] = crossfade({
    duration: 420,
    easing: cubicOut,
    fallback(node, params, intro) {
      const p = params as unknown as Fly;
      const sel = intro ? p.from : p.to;
      const el = sel ? document.querySelector(sel) : null;
      if (!el) return { duration: 220, css: (t: number) => `opacity:${t}` };
      const a = el.getBoundingClientRect(), b = node.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
      const k = Math.max(0.3, a.height / Math.max(1, b.height));
      return {
        duration: 520, delay: p.delay ?? 0, easing: cubicOut,
        css: (t: number, u: number) => `transform: translate(${dx * u}px, ${dy * u}px) scale(${1 - (1 - k) * u}); opacity: ${intro ? Math.min(1, t * 3) : 1 - u * 0.2}`,
      };
    },
  });
  const fly = (key: string, extra: Omit<Fly, 'key'> = {}) => ({ key, ...extra }) as unknown as { key: string };

  // ───────────── zoom (como no Arena: a carta cresce ao passar o mouse) ─────────────
  let zoom = $state<{ id: string; x: number; y: number; up: boolean } | null>(null);
  const ZW = 330;
  function hover(id: string | undefined, e: MouseEvent) {
    if (!id || !app.cards[id]) { zoom = null; return; }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const up = r.top > innerHeight / 2;
    const x = Math.min(Math.max(12, r.left + r.width / 2 - ZW / 2), innerWidth - ZW - 300);
    zoom = { id, x, y: up ? r.bottom : r.top, up };
  }

  // ───────────── cemitério ─────────────
  let graveOf = $state<0 | 1 | null>(null);

  // ───────────── apresentação ─────────────
  const heroOf = (p: 0 | 1) => (g ? unitAt(g, heroPos(g, p)) : null);
  const life = (u: Unit) => u.def - u.dmg;
  let logEl = $state<HTMLDivElement>();
  $effect(() => { void g?.log.length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
  const cardOf = (r: CardRef) => app.cards[r.cardId];
  /** Fileiras de cima para baixo: o oponente mostra a retaguarda em cima; você, a frente em cima. */
  const rowsFor = (p: 0 | 1) => (p === me ? [0, 1] : [1, 0]);
</script>

<svelte:window onkeydown={key} />

{#if step !== 'play' || !g}
  <div class="setup">
    <header>
      <h1>{L('Mesa de teste', 'Test table')}</h1>
      <p class="muted">{step === 'heroes'
        ? L('Escolha o seu herói e o do bot. As cartas vêm da coleção Protótipo; o que você editar vale na próxima partida.', 'Pick your hero and the bot’s. Cards come from the Prototype collection; edits apply to the next match.')
        : L('Escolha onde o seu herói começa: na frente ele golpeia corpo a corpo e protege quem está atrás; na retaguarda fica protegido de golpes corpo a corpo.', 'Choose where your hero starts: in front it can melee and protects the back row; in the back it is safe from melee.')}</p>
    </header>
    {#if step === 'heroes'}
      <div class="pick">
        {#each [{ title: L('Você', 'You'), get: () => myHero, set: (h: HeroDef) => (myHero = h) }, { title: 'Bot', get: () => botHero, set: (h: HeroDef) => (botHero = h) }] as side}
          <section>
            <span class="section-title">{side.title}</span>
            <div class="heroes">
              {#each HEROES as h (h.id)}
                <button class="hero-card" class:on={side.get().id === h.id} style="--c:{colorOf(h)}" onclick={() => side.set(h)}>
                  <span class="emb"><Glyph id={h.icon} size={34} color="#f3ead6" /></span>
                  <b>{h.name}</b><small>{L(h.className[0], h.className[1])}</small>
                  <span class="stats">{L('PV', 'HP')} {h.maxHp} · {L('Armadura', 'Armor')} {h.armor} · Vigor {h.vigor} · Mana {h.mana}</span>
                  <span class="attrs">{#each ATTRS as a}<i class:hi={h.attrs[a] >= 3}>{L(ATTR_NAMES[a][0], ATTR_NAMES[a][1])} {h.attrs[a]}</i>{/each}</span>
                  <span class="gear">{#each h.gear as it}<span>{L(it.name[0], it.name[1])} — {L(it.info[0], it.info[1])}</span>{/each}</span>
                  <span class="cnt" class:bad={countOf(h) === 0}>{countOf(h)} {L('cartas', 'cards')}</span>
                </button>
              {/each}
            </div>
          </section>
        {/each}
      </div>
      <div class="opts">
        <label class="field"><span>{L('Quem começa', 'Who starts')}</span>
          <select class="select" bind:value={starter}><option value="sorteio">{L('Sorteio', 'Random')}</option><option value="eu">{L('Você', 'You')}</option><option value="bot">Bot</option></select></label>
        <label class="toggle"><input type="checkbox" bind:checked={limit} /> {L('Modo B: no máximo 3 habilidades por turno', 'Mode B: at most 3 abilities per turn')}</label>
        <button class="btn primary" disabled={!countOf(myHero) || !countOf(botHero)} onclick={toPlace}><Swords size={16} /> {L('Continuar', 'Continue')}</button>
      </div>
    {:else}
      <div class="place" style="--c:{colorOf(myHero)}">
        {#each [0, 1] as row}
          <div class="prow"><span class="plabel">{row === 0 ? L('Frente', 'Front') : L('Retaguarda', 'Back')}</span>
            {#each [0, 1, 2] as col}
              <button class="pslot" class:on={myPos.row === row && myPos.col === col} onclick={() => (myPos = { row: row as 0 | 1, col: col as 0 | 1 | 2 })}>
                {#if myPos.row === row && myPos.col === col}<Glyph id={myHero.icon} size={44} color="#f3ead6" /><b>{myHero.name}</b>{/if}
              </button>
            {/each}
          </div>
        {/each}
      </div>
      <div class="opts">
        <button class="btn" onclick={() => (step = 'heroes')}>{L('Voltar', 'Back')}</button>
        <button class="btn primary" onclick={start}><Swords size={16} /> {L('Começar partida', 'Start match')}</button>
      </div>
    {/if}
  </div>
{:else}
  {@const P = g.players[me]}
  {@const F = g.players[foe]}
  <div class="table">
    <div class="main">
      <!-- ───── barra de herói ───── -->
      {#snippet bar(p: 0 | 1, mine: boolean)}
        {@const pl = g!.players[p]}
        {@const h = heroOf(p)}
        <div class="bar" style="--c:{colorOf(pl.hero)}" class:active={g!.active === p}>
          <span class="emb sm"><Glyph id={pl.hero.icon} size={24} color="#f3ead6" /></span>
          <div class="who"><b>{pl.hero.name}</b><small>{L(pl.hero.className[0], pl.hero.className[1])} · {L('nível', 'level')} {pl.level}</small></div>
          {#if h}<div class="hp"><Heart size={15} /> <b>{life(h)}</b>/{h.def}<span class="hpbar"><i style="width:{(life(h) / h.def) * 100}%"></i></span></div>{/if}
          <div class="res"><span class="vig" title="Vigor">⚔ {pl.vigor}/{pl.maxVigor}</span><span class="man" title="Mana">✦ {pl.mana}/{pl.maxMana}</span></div>
          <div class="xp" title="XP">{#each Array(XP_PER_LEVEL) as _, i}<i class:on={i < pl.xp}></i>{/each}</div>
          <span class="muted small"><Shield size={13} /> {pl.hero.armor}</span>
          {#if mine}
            <div class="grow"></div>
            <button class="btn sm" disabled={!myTurn || pl.moved} onclick={startMove}><Move size={15} /> {L('Mover', 'Move')}</button>
            <button class="btn sm primary" disabled={!myTurn} onclick={() => act({ t: 'end' })}><Flag size={15} /> {L('Encerrar turno', 'End turn')}</button>
          {:else if g!.active === p && g!.winner === undefined}
            <span class="thinking">{L('Bot jogando…', 'Bot playing…')}</span>
          {/if}
        </div>
      {/snippet}

      <!-- ───── um lugar no campo ───── -->
      {#snippet slot(p: 0 | 1, row: number, col: number)}
        {@const pos = { p, row, col }}
        {@const u = g!.players[p].board[row][col]}
        <button class="slot" class:target={isTarget(pos)} class:selected={(sel?.kind === 'unit' && same(sel.pos, pos)) || (sel?.kind === 'strike' && !!u?.isHero && p === me)}
          class:hero={!!u?.isHero} class:exh={!!u && u.exhausted && !u.isHero && p === me} onclick={() => clickSlot(pos)}
          onmouseenter={(e) => hover(u?.src, e)} onmouseleave={() => (zoom = null)} style="--c:{colorOf(g!.players[p].hero)}">
          {#if u}
            <span class="unit" in:scale={{ duration: 300, start: 0.6 }} out:fade={{ duration: 300 }}>
              <span class="u-ic"><Glyph id={u.icon ?? 'death-skull'} size={u.isHero ? 52 : 44} color={u.isHero ? '#f3ead6' : '#e6dccb'} /></span>
              <span class="u-nm">{L(u.name[0], u.name[1])}</span>
              <span class="u-st">{#if !u.isHero}<span class="atk"><Swords size={13} /> {u.atk + u.buff}</span>{/if}<span class="def"><Heart size={13} /> {life(u)}{#if u.isHero}/{u.def}{/if}</span></span>
              <span class="u-mk">
                {#if u.afflicted}<i title={L('Afligido: 1 de dano no começo do turno do dono', 'Afflicted: 1 damage at its owner’s turn start')}><Droplet size={14} /></i>{/if}
                {#if u.marked}<i title={L('Marcado: sofre +1 de todo dano', 'Marked: takes +1 from all damage')}><Crosshair size={14} /></i>{/if}
                {#if u.warded}<i title={L('Protegido: o próximo dano é anulado', 'Warded: the next damage is prevented')}><Shield size={14} /></i>{/if}
                {#if u.keys.includes('guarda') || (u.isHero && g!.players[p].stance?.mods.guard)}<i title={L('Guarda', 'Guard')}><Users size={14} /></i>{/if}
                {#if u.keys.includes('rapido')}<i title={L('Rápido', 'Swift')}><Zap size={14} /></i>{/if}
              </span>
            </span>
          {:else}
            <span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>
          {/if}
        </button>
      {/snippet}

      <!-- ───── faixa das habilidades usadas (à vista do oponente) ───── -->
      {#snippet zone(p: 0 | 1)}
        {@const pl = g!.players[p]}
        <div class="zone">
          {#if pl.stance?.cardId && app.cards[pl.stance.cardId]}
            <div class="zc stance" onmouseenter={(e) => hover(pl.stance?.cardId, e)} onmouseleave={() => (zoom = null)} role="img">
              <span class="ztag"><Sparkles size={11} /> {L('Postura', 'Stance')}</span>
              <CardImage card={app.cards[pl.stance.cardId]} eager />
            </div>
          {/if}
          {#each pl.recent as r (r.uid)}
            <div class="zc" in:receive={fly(r.uid)} out:send={fly(r.uid, { to: `#grave-${p}` })} onmouseenter={(e) => hover(r.cardId, e)} onmouseleave={() => (zoom = null)} role="img">
              {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
            </div>
          {/each}
          {#if !pl.recent.length && !pl.stance?.cardId}<span class="zhint">{p === me ? L('suas habilidades usadas aparecem aqui', 'your used abilities show here') : L('habilidades do oponente', 'opponent abilities')}</span>{/if}
        </div>
      {/snippet}

      <!-- ───── grimório e cemitério ───── -->
      {#snippet piles(p: 0 | 1, top: boolean)}
        {@const pl = g!.players[p]}
        <div class="pile deck" class:top id="deck-{p}" title={L(`Grimório: ${pl.deck.length} cartas`, `Grimoire: ${pl.deck.length} cards`)}>
          {#if pl.deck.length}<span class="stack" style="--n:{Math.min(4, Math.ceil(pl.deck.length / 10))}">{#if backUrl}<img src={backUrl} alt="" />{/if}</span>{/if}
          <span class="pcount"><BookOpen size={12} /> {pl.deck.length}</span>
        </div>
        <button class="pile grave" class:top id="grave-{p}" onclick={() => (graveOf = p)} title={L('Cemitério (clique para ver)', 'Graveyard (click to view)')}>
          {#each pl.discard.slice(-1) as r (r.uid)}
            <span class="gtop" in:receive={fly(r.uid, { from: `#zone-src-${p}` })}>{#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}</span>
          {/each}
          {#if !pl.discard.length}<span class="gempty"><Skull size={20} /></span>{/if}
          <span class="pcount"><Skull size={12} /> {pl.discard.length}</span>
        </button>
      {/snippet}

      {@render bar(foe, false)}
      <div class="ohand">
        {#each F.hand as r, i (r.uid)}
          <span class="back" in:receive|global={fly(r.uid, { from: `#deck-${foe}`, delay: i * 70 })} out:send={fly(r.uid, { to: `#grave-${foe}` })}>{#if backUrl}<img src={backUrl} alt="" />{/if}</span>
        {/each}
      </div>
      <div class="side-field foe">
        {#each rowsFor(foe) as row}<div class="row">{#each Array(COLS) as _, col}{@render slot(foe, row, col)}{/each}</div>{/each}
        {@render zone(foe)}
      </div>
      <div class="mid"><span>{msg || (myTurn ? L('Seu turno', 'Your turn') : g.winner === undefined ? L('Turno do bot', "Bot's turn") : '')}</span></div>
      <div class="side-field">
        {@render zone(me)}
        {#each rowsFor(me) as row}<div class="row">{#each Array(COLS) as _, col}{@render slot(me, row, col)}{/each}</div>{/each}
      </div>
      <div class="hand">
        {#each P.hand as r, i (r.uid)}
          {@const why = cannotPlay(g, me, r.uid)}
          <button class="hc" class:no={!!why} class:sel={sel?.kind === 'card' && sel.uid === r.uid} title={why ?? ''}
            in:receive|global={fly(r.uid, { from: `#deck-${me}`, delay: i * 90 })} out:send={fly(r.uid, { to: `#grave-${me}` })}
            onclick={() => clickCard(r.uid)} onmouseenter={(e) => hover(r.cardId, e)} onmouseleave={() => (zoom = null)}>
            {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
          </button>
        {/each}
      </div>
      {@render bar(me, true)}

      {@render piles(foe, true)}
      {@render piles(me, false)}
    </div>

    <aside class="log-panel">
      <span class="section-title">{L('Registro da batalha', 'Battle log')}</span>
      <div class="log" bind:this={logEl}>{#each g.log as line}<p class:turn={line.startsWith('—')}>{line}</p>{/each}</div>
      <button class="btn sm ghost" onclick={() => { g = null; step = 'heroes'; }}><RotateCcw size={14} /> {L('Trocar heróis', 'Change heroes')}</button>
    </aside>

    {#if zoom && app.cards[zoom.id]}
      <div class="zoom" style="left:{zoom.x}px;{zoom.up ? `bottom:${innerHeight - zoom.y}px` : `top:${zoom.y}px`};width:{ZW}px" transition:fade={{ duration: 120 }}>
        <CardImage card={app.cards[zoom.id]} eager />
      </div>
    {/if}

    {#if graveOf !== null}
      <div class="modal" onclick={() => (graveOf = null)} role="presentation">
        <div class="gbox" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
          <header><h2>{L('Cemitério de', 'Graveyard of')} {g.players[graveOf].hero.name} · {g.players[graveOf].discard.length}</h2>
            <button class="btn sm ghost icon" onclick={() => (graveOf = null)}><X size={16} /></button></header>
          <div class="ggrid">
            {#each [...g.players[graveOf].discard].reverse() as r (r.uid)}<div class="gc">{#if cardOf(r)}<CardImage card={cardOf(r)} />{/if}</div>{/each}
            {#if !g.players[graveOf].discard.length}<p class="muted">{L('Vazio.', 'Empty.')}</p>{/if}
          </div>
        </div>
      </div>
    {/if}
    {#if g.winner === undefined && g.active === me && P.pendingLevels}
      <div class="modal"><div class="box">
        <h2>{L(`Nível ${P.level + 1}!`, `Level ${P.level + 1}!`)}</h2>
        <p class="muted">{L('Escolha o que o seu herói ganha:', 'Choose what your hero gains:')}</p>
        <div class="lv">
          <button class="btn" onclick={() => act({ t: 'levelup', choice: 'vigor' })}>⚔ +1 Vigor</button>
          <button class="btn" onclick={() => act({ t: 'levelup', choice: 'mana' })}>✦ +1 Mana</button>
          <button class="btn" onclick={() => act({ t: 'levelup', choice: 'vida' })}><Heart size={15} /> +3 {L('Vida', 'Life')}</button>
        </div>
      </div></div>
    {/if}
    {#if g.winner !== undefined}
      <div class="modal"><div class="box">
        <h2>{g.winner === me ? L('Vitória!', 'Victory!') : L('Derrota', 'Defeat')}</h2>
        <p class="muted">{L(`Turno ${g.turn}.`, `Turn ${g.turn}.`)}</p>
        <div class="lv">
          <button class="btn primary" onclick={start}><RotateCcw size={15} /> {L('Jogar de novo', 'Play again')}</button>
          <button class="btn" onclick={() => { g = null; step = 'heroes'; }}>{L('Trocar heróis', 'Change heroes')}</button>
        </div>
      </div></div>
    {/if}
  </div>
{/if}

<style>
  .setup { height: 100%; overflow-y: auto; padding: 28px 32px 60px; display: flex; flex-direction: column; gap: 22px; }
  .setup h1 { font-size: 26px; }
  .pick { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
  .heroes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
  .hero-card { text-align: left; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); cursor: pointer; font: inherit; min-width: 0; }
  .hero-card.on { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
  .hero-card b { font-family: var(--display, serif); font-size: 17px; }
  .hero-card small, .stats, .gear { color: var(--muted); font-size: 12px; }
  .gear { display: flex; flex-direction: column; }
  .attrs { display: flex; flex-wrap: wrap; gap: 4px; }
  .attrs i { font-style: normal; font-size: 11px; padding: 1px 6px; border-radius: 6px; background: var(--bg-2); color: var(--muted); }
  .attrs i.hi { color: var(--accent-2); }
  .cnt { font-size: 12px; color: var(--ok); }
  .cnt.bad { color: var(--danger); }
  .emb { width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 60%, #000), color-mix(in srgb, var(--c) 22%, #000)); flex: none; }
  .emb.sm { width: 36px; height: 36px; border-radius: 9px; }
  .opts { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; }
  .place { display: flex; flex-direction: column; gap: 12px; align-self: center; }
  .prow { display: flex; gap: 12px; align-items: center; }
  .plabel { width: 90px; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .pslot { width: 150px; height: 120px; border-radius: 12px; border: 1px dashed var(--line-2); background: var(--surface); color: var(--text); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font: inherit; }
  .pslot.on { border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 25%, var(--surface)); }

  /* ───── mesa ───── */
  .table { --row: clamp(64px, 9.4vh, 150px); --zone: clamp(52px, 7.2vh, 120px); --hand: clamp(110px, 20vh, 280px);
    height: 100%; display: grid; grid-template-columns: 1fr 290px; min-height: 0; position: relative; }
  .main { position: relative; display: flex; flex-direction: column; gap: 5px; padding: 6px 14px; min-height: 0; overflow: hidden;
    background: radial-gradient(ellipse at 50% 50%, #241e1a 0%, #100e0c 70%); }
  .bar { display: flex; align-items: center; gap: 14px; padding: 6px 12px; border-radius: 12px; background: rgb(22 19 17 / .92); border: 1px solid var(--line); flex: none; z-index: 2; }
  .bar.active { border-color: var(--c); box-shadow: 0 0 0 1px var(--c), 0 0 18px color-mix(in srgb, var(--c) 35%, transparent); }
  .who b { display: block; font-size: 15px; }
  .who small { color: var(--muted); font-size: 12px; }
  .hp { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #e8a59a; }
  .hpbar { width: 110px; height: 7px; border-radius: 4px; background: var(--bg-2); overflow: hidden; }
  .hpbar i { display: block; height: 100%; background: #c4473a; transition: width .3s; }
  .res { display: flex; gap: 12px; font: 600 14px var(--ui); font-variant-numeric: tabular-nums; }
  .vig { color: #e5866f; } .man { color: #7fb0ff; }
  .xp { display: flex; gap: 3px; }
  .xp i { width: 11px; height: 11px; border-radius: 50%; border: 1px solid var(--line-2); }
  .xp i.on { background: var(--accent); border-color: var(--accent); }
  .small { font-size: 12px; display: inline-flex; gap: 4px; align-items: center; }
  .thinking { color: var(--accent-2); font-size: 13px; animation: pulse 1.2s ease-in-out infinite; margin-left: auto; }
  @keyframes pulse { 50% { opacity: .45; } }

  .ohand { display: flex; justify-content: center; height: calc(var(--zone) * .85); flex: none; }
  .ohand .back { height: 100%; aspect-ratio: 750 / 1050; margin: 0 -10px; border-radius: 5px; overflow: hidden; box-shadow: 0 4px 10px rgb(0 0 0 / .6); background: #2a2420; }
  .ohand .back img { width: 100%; height: 100%; display: block; }

  .side-field { display: flex; flex-direction: column; gap: 6px; align-items: center; flex: none; }
  .row { display: grid; grid-template-columns: repeat(3, calc(var(--row) * 1.35)); gap: 10px; }
  .slot { height: var(--row); border-radius: 12px; border: 1px dashed rgb(255 255 255 / .1); background: rgb(255 255 255 / .02); color: var(--text); display: grid; place-items: center; cursor: pointer; font: inherit; position: relative; padding: 4px; }
  .slot:has(.unit) { border: 1px solid rgb(255 255 255 / .14); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 32%, #15120f), #15120f 85%); box-shadow: 0 6px 16px rgb(0 0 0 / .5); }
  .slot.hero { border: 2px solid var(--c); }
  .slot.exh { opacity: .55; }
  .slot.target { border: 2px solid #f0c45a; box-shadow: 0 0 16px rgb(240 196 90 / .5); cursor: crosshair; }
  .slot.selected { border: 2px solid #7fb0ff; box-shadow: 0 0 16px rgb(127 176 255 / .5); }
  .unit { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .empty { font-size: 11px; color: rgb(255 255 255 / .25); text-transform: uppercase; letter-spacing: .08em; }
  .u-nm { font-size: 12.5px; font-weight: 600; text-align: center; line-height: 1.1; }
  .u-st { display: flex; gap: 12px; font: 700 14px var(--ui); }
  .atk { color: #f0c45a; display: inline-flex; gap: 3px; align-items: center; }
  .def { color: #e8a59a; display: inline-flex; gap: 3px; align-items: center; }
  .u-mk { position: absolute; top: 6px; right: 7px; display: flex; gap: 4px; color: #cdb8ff; }
  .u-mk i { font-style: normal; }

  .zone { height: var(--zone); width: calc(var(--row) * 4.2 + 20px); display: flex; gap: 8px; justify-content: center; align-items: center; border-radius: 10px; background: rgb(0 0 0 / .18); border: 1px solid rgb(255 255 255 / .05); padding: 4px; }
  .zc { height: 100%; aspect-ratio: 750 / 1050; position: relative; border-radius: 5px; box-shadow: 0 4px 12px rgb(0 0 0 / .6); }
  .zc.stance { outline: 2px solid var(--accent); outline-offset: 1px; }
  .ztag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 1; font: 600 10px var(--ui); padding: 1px 6px; border-radius: 6px; background: var(--accent); color: #1a120b; white-space: nowrap; display: inline-flex; gap: 3px; align-items: center; }
  .zhint { font-size: 11px; color: rgb(255 255 255 / .22); text-transform: uppercase; letter-spacing: .08em; }
  .mid { text-align: center; color: var(--accent-2); font-size: 13px; min-height: 22px; flex: none; border-top: 1px solid rgb(255 255 255 / .06); border-bottom: 1px solid rgb(255 255 255 / .06); padding: 2px 0; }

  .hand { display: flex; justify-content: center; align-items: flex-end; flex: 1 1 0; min-height: 90px; max-height: var(--hand); padding-bottom: 2px; }
  .hc { height: 100%; max-height: var(--hand); aspect-ratio: 750 / 1050; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 6px; margin: 0 -6px; transition: transform .15s, margin .15s; position: relative; }
  .hc:hover { transform: translateY(-14px); z-index: 2; }
  .hc.no { filter: brightness(.55) saturate(.6); }
  .hc.sel { outline: 3px solid #7fb0ff; transform: translateY(-18px); z-index: 2; }

  .pile { position: absolute; width: calc(var(--hand) * .55); aspect-ratio: 750 / 1050; border-radius: 7px; border: 1px dashed rgb(255 255 255 / .12); background: rgb(0 0 0 / .25); display: grid; place-items: center; }
  .pile.deck { left: 16px; bottom: 74px; }
  .pile.grave { right: 16px; bottom: 74px; cursor: pointer; padding: 0; color: var(--muted); }
  .pile.deck.top { top: 62px; bottom: auto; }
  .pile.grave.top { top: 62px; bottom: auto; }
  .stack { position: absolute; inset: 0; border-radius: 7px; overflow: hidden; box-shadow: calc(var(--n) * 1px) calc(var(--n) * 2px) 0 #1c1815, calc(var(--n) * 2px) calc(var(--n) * 4px) 0 #12100e, 0 8px 18px rgb(0 0 0 / .6); }
  .stack img { width: 100%; height: 100%; display: block; }
  .gtop { position: absolute; inset: 0; border-radius: 7px; overflow: hidden; box-shadow: 0 8px 18px rgb(0 0 0 / .6); }
  .gempty { opacity: .35; }
  .pcount { position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%); z-index: 2; font: 700 12px var(--ui); padding: 1px 8px; border-radius: 8px; background: #0f0d0c; border: 1px solid var(--line-2); color: var(--text); display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; }

  .log-panel { border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; padding: 12px; min-height: 0; background: var(--bg-2); }
  .log { flex: 1; overflow-y: auto; font-size: 12.5px; color: var(--text-2); min-height: 0; }
  .log p { margin: 2px 0; }
  .log p.turn { color: var(--accent-2); font-weight: 600; margin-top: 8px; }

  .zoom { position: fixed; z-index: 60; pointer-events: none; filter: drop-shadow(0 22px 40px rgb(0 0 0 / .85)); }
  .modal { position: absolute; inset: 0; background: rgb(0 0 0 / .6); display: grid; place-items: center; z-index: 50; }
  .box { background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; padding: 22px 26px; display: flex; flex-direction: column; gap: 10px; min-width: 320px; }
  .gbox { width: min(1100px, 92%); max-height: 86%; display: flex; flex-direction: column; gap: 12px; background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; padding: 18px 20px; }
  .gbox header { display: flex; justify-content: space-between; align-items: center; }
  .ggrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; overflow-y: auto; }
  .lv { display: flex; gap: 8px; flex-wrap: wrap; }
  @media (max-width: 1100px) { .table { grid-template-columns: 1fr; } .log-panel { display: none; } .pick { grid-template-columns: 1fr; } }
</style>
