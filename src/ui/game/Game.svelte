<!--
  Mesa de teste: uma partida contra o bot, com os decks do app.
  Você é o jogador de baixo. Clique numa carta da mão para usá-la; se pedir
  alvo, os alvos válidos acendem. Clique no seu herói para golpear, numa
  invocação sua para atacar, ou em "Mover" e depois num lugar livre.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Swords, Move, Flag, RotateCcw, Shield, Droplet, Crosshair, Sparkles, Zap, Heart, Users } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { HEROES } from '../../game/decks';
  import { apply, cannotPlay, cardTargets, choiceOf, emptySlots, figures, heroPos, newGame, other, reachable, strikeVia, unitAt, XP_PER_LEVEL } from '../../game/engine';
  import { botAction } from '../../game/bot';
  import { sideFromApp } from '../../game/fromApp';
  import { ATTRS, ATTR_NAMES, type Action, type GameState, type HeroDef, type Pos, type Unit } from '../../game/types';
  import Glyph from '../common/Glyph.svelte';
  import CardImage from '../common/CardImage.svelte';
  import { colorHex } from '../../model/catalog';

  // ───────────── preparação ─────────────
  let myHero = $state<HeroDef>(HEROES[0]);
  let botHero = $state<HeroDef>(HEROES[1]);
  let limit = $state(false);
  let starter = $state<'eu' | 'bot' | 'sorteio'>('sorteio');

  const deckOf = (h: HeroDef) => app.cardsOf(h.deckId).filter((c) => c.game);
  const countOf = (h: HeroDef) => deckOf(h).reduce((n, c) => n + (c.game?.copies ?? 1), 0);
  const colorOf = (h: HeroDef) => colorHex(app.deck(h.deckId)?.colors[0] ?? 'red');

  let g = $state<GameState | null>(null);
  /** Qual lado é você (0 ou 1). */
  let me = $state<0 | 1>(0);
  let msg = $state('');
  let botBusy = $state(false);

  function start() {
    const mine = sideFromApp(myHero, deckOf(myHero)), bot = sideFromApp(botHero, deckOf(botHero));
    const iStart = starter === 'eu' || (starter === 'sorteio' && Math.random() < 0.5);
    me = iStart ? 0 : 1;
    g = newGame(iStart ? mine : bot, iStart ? bot : mine, { actionLimit: limit });
    sel = null;
    msg = '';
    void runBot();
  }

  // ───────────── jogo ─────────────
  type Sel = { kind: 'card'; uid: string } | { kind: 'strike' } | { kind: 'unit'; pos: Pos } | { kind: 'move' } | null;
  let sel = $state<Sel>(null);
  const foe = $derived(other(me));
  const P = $derived(g ? g.players[me] : null);
  const F = $derived(g ? g.players[foe] : null);
  const myTurn = $derived(!!g && g.active === me && g.winner === undefined && !botBusy);

  const same = (a: Pos, b: Pos) => a.p === b.p && a.row === b.row && (a.col === b.col || a.col === -1 || b.col === -1);

  /** Alvos válidos da seleção atual. */
  const targets = $derived.by((): Pos[] => {
    if (!g || !sel || !myTurn) return [];
    if (sel.kind === 'card') {
      const ref = g.players[me].hand.find((c) => c.uid === sel.uid);
      if (!ref) return [];
      const eff = g.defs[ref.cardId].game.effects;
      const ch = choiceOf(eff);
      return ch?.kind === 'slot' ? emptySlots(g, me) : cardTargets(g, me, eff);
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
  onDestroy(() => { alive = false; });

  /** O bot joga o turno dele, uma jogada de cada vez (dá para acompanhar). */
  async function runBot() {
    if (!g || botBusy) return;
    botBusy = true;
    try {
      let steps = 0;
      while (alive && g && g.active === foe && g.winner === undefined && steps++ < 40) {
        await sleep(650);
        const a = botAction($state.snapshot(g) as GameState);
        if (apply(g, a)) apply(g, { t: 'end' });
      }
      if (g && g.active === foe && g.winner === undefined) apply(g, { t: 'end' });
    } finally { botBusy = false; }
  }

  function key(e: KeyboardEvent) { if (e.key === 'Escape') { sel = null; msg = ''; } }

  // ───────────── apresentação ─────────────
  const heroOf = (p: 0 | 1) => (g ? unitAt(g, heroPos(g, p)) : null);
  const life = (u: Unit) => u.def - u.dmg;
  let logEl = $state<HTMLDivElement>();
  $effect(() => { void g?.log.length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
  let zoom = $state<string | null>(null);
  const handCards = $derived(g && P ? P.hand.map((c) => ({ uid: c.uid, card: app.cards[c.cardId], why: cannotPlay(g!, me, c.uid) })) : []);
</script>

<svelte:window onkeydown={key} />

{#if !g}
  <div class="setup">
    <header>
      <h1>{L('Mesa de teste', 'Test table')}</h1>
      <p class="muted">{L('Jogue contra o bot com os decks da coleção Protótipo. O que você editar nas cartas vale na próxima partida.', 'Play the bot with the Prototype collection decks. Card edits apply to the next match.')}</p>
    </header>
    <div class="pick">
      {#each [{ title: L('Você', 'You'), get: () => myHero, set: (h: HeroDef) => (myHero = h) }, { title: L('Bot', 'Bot'), get: () => botHero, set: (h: HeroDef) => (botHero = h) }] as side}
        <section>
          <span class="section-title">{side.title}</span>
          <div class="heroes">
            {#each HEROES as h (h.id)}
              <button class="hero-card" class:on={side.get().id === h.id} style="--c:{colorOf(h)}" onclick={() => side.set(h)}>
                <span class="emb"><Glyph id={h.icon} size={34} color="#f3ead6" /></span>
                <b>{h.name}</b><small>{L(h.className[0], h.className[1])}</small>
                <span class="stats">{L('PV', 'HP')} {h.maxHp} · {L('Armadura', 'Armor')} {h.armor} · {L('Vigor', 'Vigor')} {h.vigor} · Mana {h.mana}</span>
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
      <button class="btn primary" disabled={!countOf(myHero) || !countOf(botHero)} onclick={start}><Swords size={16} /> {L('Começar partida', 'Start match')}</button>
    </div>
  </div>
{:else if P && F}
  {@const mh = heroOf(me)}
  {@const fh = heroOf(foe)}
  <div class="table">
    <div class="main">
      {#snippet bar(p: 0 | 1, h: Unit | null, mine: boolean)}
        {@const pl = g!.players[p]}
        <div class="bar" style="--c:{colorOf(pl.hero)}" class:active={g!.active === p}>
          <span class="emb sm"><Glyph id={pl.hero.icon} size={24} color="#f3ead6" /></span>
          <div class="who"><b>{pl.hero.name}</b><small>{L(pl.hero.className[0], pl.hero.className[1])} · {L('nível', 'level')} {pl.level}</small></div>
          {#if h}<div class="hp"><Heart size={14} /> <b>{life(h)}</b>/{h.def}<span class="hpbar"><i style="width:{(life(h) / h.def) * 100}%"></i></span></div>{/if}
          <div class="res"><span class="vig" title="Vigor">⚔ {pl.vigor}/{pl.maxVigor}</span><span class="man" title="Mana">✦ {pl.mana}/{pl.maxMana}</span></div>
          <div class="xp" title="XP">{#each Array(XP_PER_LEVEL) as _, i}<i class:on={i < pl.xp}></i>{/each}</div>
          <span class="muted small">{L('Armadura', 'Armor')} {pl.hero.armor}</span>
          {#if pl.stance}<span class="stance" title={L('Postura', 'Stance')}><Sparkles size={13} /> {g!.defs[pl.stance.cardId]?.name[0] ?? L('Postura', 'Stance')}</span>{/if}
          <span class="muted small">{L('mão', 'hand')} {pl.hand.length} · deck {pl.deck.length}</span>
          {#if mine}
            <div class="grow"></div>
            <button class="btn sm" disabled={!myTurn || pl.moved} onclick={startMove}><Move size={15} /> {L('Mover', 'Move')}</button>
            <button class="btn sm primary" disabled={!myTurn} onclick={() => act({ t: 'end' })}><Flag size={15} /> {L('Encerrar turno', 'End turn')}</button>
          {:else if g!.active === p}
            <span class="thinking">{L('Bot jogando…', 'Bot playing…')}</span>
          {/if}
        </div>
      {/snippet}

      {#snippet slot(p: 0 | 1, row: number, col: number)}
        {@const pos = { p, row, col }}
        {@const u = g!.players[p].board[row][col]}
        <button class="slot" class:target={isTarget(pos)} class:selected={(sel?.kind === 'unit' && same(sel.pos, pos)) || (sel?.kind === 'strike' && !!u?.isHero && p === me)}
          class:hero={!!u?.isHero} class:exh={!!u && u.exhausted && !u.isHero && p === me} onclick={() => clickSlot(pos)}
          style="--c:{colorOf(g!.players[p].hero)}">
          {#if u}
            <span class="u-ic"><Glyph id={u.icon ?? 'death-skull'} size={u.isHero ? 40 : 34} color={u.isHero ? '#f3ead6' : '#e6dccb'} /></span>
            <span class="u-nm">{L(u.name[0], u.name[1])}</span>
            <span class="u-st">{#if !u.isHero}<span class="atk"><Swords size={12} /> {u.atk + u.buff}</span>{/if}<span class="def"><Heart size={12} /> {life(u)}{#if u.isHero}/{u.def}{/if}</span></span>
            <span class="u-mk">
              {#if u.afflicted}<i title={L('Afligido: 1 de dano no começo do turno do dono', 'Afflicted: 1 damage at its owner’s turn start')}><Droplet size={13} /></i>{/if}
              {#if u.marked}<i title={L('Marcado: sofre +1 de todo dano', 'Marked: takes +1 from all damage')}><Crosshair size={13} /></i>{/if}
              {#if u.warded}<i title={L('Protegido: o próximo dano é anulado', 'Warded: the next damage is prevented')}><Shield size={13} /></i>{/if}
              {#if u.keys.includes('guarda') || (u.isHero && g!.players[p].stance?.mods.guard)}<i title={L('Guarda', 'Guard')}><Users size={13} /></i>{/if}
              {#if u.keys.includes('rapido')}<i title={L('Rápido', 'Swift')}><Zap size={13} /></i>{/if}
            </span>
          {:else}
            <span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>
          {/if}
        </button>
      {/snippet}

      {@render bar(foe, fh, false)}
      <div class="board foe">
        {#each [1, 0] as row}<div class="row">{#each [0, 1, 2] as col}{@render slot(foe, row, col)}{/each}</div>{/each}
      </div>
      <div class="mid"><span>{msg || (myTurn ? L('Seu turno', 'Your turn') : g.winner === undefined ? L('Turno do bot', "Bot's turn") : '')}</span></div>
      <div class="board">
        {#each [0, 1] as row}<div class="row">{#each [0, 1, 2] as col}{@render slot(me, row, col)}{/each}</div>{/each}
      </div>
      {@render bar(me, mh, true)}

      <div class="hand">
        {#each handCards as hc (hc.uid)}
          <button class="hc" class:no={!!hc.why} class:sel={sel?.kind === 'card' && sel.uid === hc.uid} title={hc.why ?? ''}
            onclick={() => clickCard(hc.uid)} onmouseenter={() => (zoom = hc.card?.id ?? null)} onmouseleave={() => (zoom = null)}>
            {#if hc.card}<CardImage card={hc.card} eager />{/if}
          </button>
        {/each}
      </div>
    </div>

    <aside class="side">
      <div class="zoomed">{#if zoom && app.cards[zoom]}<CardImage card={app.cards[zoom]} eager />{:else}<p class="muted small">{L('Passe o mouse numa carta da mão para ver em detalhe.', 'Hover a card in hand to see it in detail.')}</p>{/if}</div>
      <div class="log" bind:this={logEl}>{#each g.log as line}<p class:turn={line.startsWith('—')}>{line}</p>{/each}</div>
      <button class="btn sm ghost" onclick={() => (g = null)}><RotateCcw size={14} /> {L('Trocar heróis', 'Change heroes')}</button>
    </aside>

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
          <button class="btn" onclick={() => (g = null)}>{L('Trocar heróis', 'Change heroes')}</button>
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
  .emb { width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 60%, #000), color-mix(in srgb, var(--c) 22%, #000)); }
  .emb.sm { width: 36px; height: 36px; border-radius: 9px; }
  .opts { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; }

  .table { height: 100%; display: grid; grid-template-columns: 1fr 300px; min-height: 0; position: relative; }
  .main { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; min-height: 0; overflow-y: auto; background: radial-gradient(ellipse at 50% 45%, #1e1a18 0%, #0d0c0b 75%); }
  .bar { display: flex; align-items: center; gap: 14px; padding: 8px 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); flex-wrap: wrap; }
  .bar.active { border-color: var(--c); box-shadow: 0 0 0 1px var(--c); }
  .who b { display: block; font-size: 15px; }
  .who small { color: var(--muted); font-size: 12px; }
  .hp { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #e8a59a; }
  .hpbar { width: 90px; height: 6px; border-radius: 4px; background: var(--bg-2); overflow: hidden; }
  .hpbar i { display: block; height: 100%; background: #c4473a; }
  .res { display: flex; gap: 10px; font: 600 13px var(--ui); font-variant-numeric: tabular-nums; }
  .vig { color: #e5866f; } .man { color: #7fb0ff; }
  .xp { display: flex; gap: 3px; }
  .xp i { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--line-2); }
  .xp i.on { background: var(--accent); border-color: var(--accent); }
  .stance { font-size: 12px; color: var(--accent-2); display: inline-flex; gap: 4px; align-items: center; }
  .small { font-size: 12px; }
  .thinking { color: var(--accent-2); font-size: 13px; animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .45; } }

  .board { display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .row { display: grid; grid-template-columns: repeat(3, 150px); gap: 10px; }
  .slot { height: 108px; border-radius: 12px; border: 1px dashed var(--line-2); background: rgb(255 255 255 / .02); color: var(--text); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; font: inherit; position: relative; padding: 6px; }
  .slot:has(.u-ic) { border-style: solid; background: linear-gradient(180deg, color-mix(in srgb, var(--c) 28%, #15120f), #15120f); }
  .slot.hero { border: 2px solid var(--c); }
  .slot.exh { opacity: .55; }
  .slot.target { border: 2px solid #f0c45a; box-shadow: 0 0 14px rgb(240 196 90 / .45); cursor: crosshair; }
  .slot.selected { border: 2px solid #7fb0ff; box-shadow: 0 0 14px rgb(127 176 255 / .45); }
  .empty { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .u-nm { font-size: 12px; font-weight: 600; text-align: center; line-height: 1.1; }
  .u-st { display: flex; gap: 10px; font: 700 13px var(--ui); }
  .atk { color: #f0c45a; display: inline-flex; gap: 3px; align-items: center; }
  .def { color: #e8a59a; display: inline-flex; gap: 3px; align-items: center; }
  .u-mk { position: absolute; top: 5px; right: 6px; display: flex; gap: 3px; color: #cdb8ff; }
  .u-mk i { font-style: normal; }
  .mid { text-align: center; color: var(--accent-2); font-size: 13px; min-height: 20px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 3px 0; }

  .hand { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; padding-top: 6px; }
  .hc { width: 118px; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 6px; transition: transform .15s; }
  .hc:hover { transform: translateY(-8px); }
  .hc.no { opacity: .45; filter: grayscale(.4); }
  .hc.sel { outline: 3px solid #7fb0ff; transform: translateY(-10px); }

  .side { border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; padding: 12px; min-height: 0; background: var(--bg-2); }
  .zoomed { min-height: 120px; }
  .log { flex: 1; overflow-y: auto; font-size: 12.5px; color: var(--text-2); min-height: 0; }
  .log p { margin: 2px 0; }
  .log p.turn { color: var(--accent-2); font-weight: 600; margin-top: 8px; }

  .modal { position: absolute; inset: 0; background: rgb(0 0 0 / .55); display: grid; place-items: center; z-index: 10; }
  .box { background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; padding: 22px 26px; display: flex; flex-direction: column; gap: 10px; min-width: 320px; }
  .lv { display: flex; gap: 8px; flex-wrap: wrap; }
  @media (max-width: 1100px) { .table { grid-template-columns: 1fr; } .side { display: none; } .row { grid-template-columns: repeat(3, 110px); } .pick { grid-template-columns: 1fr; } }
</style>
