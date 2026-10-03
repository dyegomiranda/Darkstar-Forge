<!--
  Decks de batalha: o inventário de decks do jogador. À esquerda, os decks montados; no meio,
  o inventário de habilidades (as cartas de jogo da biblioteca); à direita, o deck aberto.
  Clique numa carta para somar uma cópia; no deck, − e + mudam a quantidade.
-->
<script lang="ts">
  import { Plus, Search, Trash2, Copy, Minus, CircleCheck, TriangleAlert, Layers } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { colorHex } from '../../model/catalog';
  import { DECK_SIZE, MAX_COPIES, buildCount } from '../../model/builds';
  import type { Build, Card } from '../../model/types';
  import { KIND_NAMES, type CardKind } from '../../game/types';
  import CardImage from '../common/CardImage.svelte';
  import { zoomable } from '../common/zoom';

  let { id }: { id?: string } = $props();

  const builds = $derived(app.builds);
  const open = $derived<Build | undefined>(app.build(id) ?? builds[0]);
  /** Decks da biblioteca que têm cartas de jogo (as "classes" do inventário de habilidades). */
  const classDecks = $derived(app.decks.filter((d) => d.kind === 'class' && app.cardsOf(d.id).some((c) => c.game)));
  const pool = $derived(classDecks.flatMap((d) => app.cardsOf(d.id).filter((c) => c.game)));

  let fDeck = $state('');
  let fKind = $state<CardKind | ''>('');
  let query = $state('');
  const cost = (c: Card) => c.cost.reduce((n, p) => n + p.amount, 0);
  const shown = $derived(pool
    .filter((c) => (!fDeck || c.deckId === fDeck) && (!fKind || c.game!.kind === fKind) && (!query.trim() || c.text[app.lang].name.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => a.game!.level - b.game!.level || cost(a) - cost(b) || a.text[app.lang].name.localeCompare(b.text[app.lang].name)));

  const total = $derived(open ? buildCount(open) : 0);
  const list = $derived(open ? Object.entries(open.cards).map(([cid, n]) => ({ c: app.cards[cid], n })).filter((x) => x.c?.game && x.n > 0)
    .sort((a, b) => a.c.game!.level - b.c.game!.level || cost(a.c) - cost(b.c) || a.c.text[app.lang].name.localeCompare(b.c.text[app.lang].name)) : []);
  /** Quantas cartas por nível exigido (para ver a curva do deck). */
  const byLevel = $derived.by(() => { const m = new Map<number, number>(); for (const x of list) m.set(x.c.game!.level, (m.get(x.c.game!.level) ?? 0) + x.n); return [...m.entries()].sort((a, b) => a[0] - b[0]); });
  const users = $derived(open ? app.project!.characters.filter((c) => c.buildId === open.id) : []);

  function change(cid: string, d: number) {
    if (!open) return;
    const cur = open.cards[cid] ?? 0, next = Math.max(0, Math.min(MAX_COPIES, cur + d));
    if (next === cur) { if (d > 0) ui.toast(L(`No máximo ${MAX_COPIES} cópias da mesma carta.`, `At most ${MAX_COPIES} copies of the same card.`), 'info'); return; }
    if (d > 0 && total >= DECK_SIZE) { ui.toast(L(`O deck já tem ${DECK_SIZE} cartas. Tire uma para trocar.`, `The deck already has ${DECK_SIZE} cards. Remove one to swap.`), 'info'); return; }
    app.updateProject(() => { if (next) open.cards[cid] = next; else delete open.cards[cid]; });
  }
  function create(fromDeck?: string) {
    const src = fromDeck ? app.deck(fromDeck) : undefined;
    const b = app.addBuild(src ? L(`${src.name['pt-BR'].split(' — ').pop()} (meu)`, `${src.name['en-US'].split(' — ').pop()} (mine)`) : L(`Deck ${builds.length + 1}`, `Deck ${builds.length + 1}`), fromDeck);
    router.go(`/baralhos/${encodeURIComponent(b.id)}`);
  }
  function duplicate() {
    if (!open) return;
    const b = app.addBuild(L(`${open.name} (cópia)`, `${open.name} (copy)`));
    app.updateProject(() => { b.cards = { ...open.cards }; });
    router.go(`/baralhos/${encodeURIComponent(b.id)}`);
  }
  async function remove() {
    if (!open) return;
    const r = await ui.confirm({ title: L(`Apagar o deck “${open.name}”?`, `Delete the deck “${open.name}”?`), text: users.length ? L(`${users.map((c) => c.name).join(', ')} volta${users.length > 1 ? 'm' : ''} a usar o deck padrão da classe. As cartas continuam no inventário.`, `${users.map((c) => c.name).join(', ')} go${users.length > 1 ? '' : 'es'} back to the class default deck. The cards stay in the inventory.`) : L('As cartas continuam no inventário de habilidades.', 'The cards stay in the skill inventory.'), ok: L('Apagar', 'Delete'), danger: true });
    if (r !== 'ok') return;
    app.removeBuild(open.id);
    router.go('/baralhos');
  }
  let newFrom = $state('');
</script>

<div class="builds">
  <aside class="inv">
    <span class="section-title">{L('Inventário de decks', 'Deck inventory')}</span>
    <div class="blist">
      {#each builds as b (b.id)}
        {@const n = buildCount(b)}
        <button class="bitem" class:on={open?.id === b.id} onclick={() => router.go(`/baralhos/${encodeURIComponent(b.id)}`)}>
          <Layers size={16} />
          <span><b>{b.name}</b><small class:bad={n !== DECK_SIZE}>{n}/{DECK_SIZE} {L('cartas', 'cards')}</small></span>
        </button>
      {/each}
      {#if !builds.length}<p class="muted sm">{L('Nenhum deck montado ainda. Os heróis usam o deck padrão da classe.', 'No deck built yet. Heroes use the class default deck.')}</p>{/if}
    </div>
    <div class="newbox">
      <span class="muted sm">{L('Novo deck a partir de:', 'New deck from:')}</span>
      <select class="select" bind:value={newFrom}>
        <option value="">{L('vazio', 'empty')}</option>
        {#each classDecks as d (d.id)}<option value={d.id}>{d.name[app.lang]}</option>{/each}
      </select>
      <button class="btn primary" onclick={() => create(newFrom || undefined)}><Plus size={15} /> {L('Novo deck', 'New deck')}</button>
    </div>
  </aside>

  {#if open}
    <section class="pool">
      <header class="phead">
        <span class="section-title">{L('Inventário de habilidades', 'Skill inventory')} · {shown.length}</span>
        <div class="filters">
          <label class="search"><Search size={14} /><input class="input" placeholder={L('Buscar carta', 'Search card')} bind:value={query} /></label>
          <select class="select" bind:value={fDeck}>
            <option value="">{L('Todas as classes', 'All classes')}</option>
            {#each classDecks as d (d.id)}<option value={d.id}>{d.name[app.lang]}</option>{/each}
          </select>
          <select class="select" bind:value={fKind}>
            <option value="">{L('Todos os tipos', 'All types')}</option>
            {#each Object.entries(KIND_NAMES) as [k, nm]}<option value={k}>{L(nm[0], nm[1])}</option>{/each}
          </select>
        </div>
      </header>
      <div class="grid">
        {#each shown as c (c.id)}
          {@const n = open.cards[c.id] ?? 0}
          <div class="tile" class:in={n > 0}>
            <button class="pic" use:zoomable={{ width: 380 }} onclick={() => change(c.id, 1)} oncontextmenu={(e) => { e.preventDefault(); change(c.id, -1); }} title={L('Clique: somar uma cópia · botão direito: tirar', 'Click: add a copy · right-click: remove')}>
              <CardImage card={c} />
            </button>
            {#if n}<span class="count">{n}×</span>{/if}
          </div>
        {/each}
        {#if !shown.length}<p class="muted">{L('Nenhuma carta com esses filtros.', 'No card matches these filters.')}</p>{/if}
      </div>
    </section>

    <aside class="deck">
      <input class="input name" value={open.name} onchange={(e) => { const v = (e.currentTarget as HTMLInputElement).value.trim(); if (v) app.updateProject(() => { open.name = v; }); }} aria-label={L('Nome do deck', 'Deck name')} />
      <div class="status" class:ok={total === DECK_SIZE}>
        {#if total === DECK_SIZE}<CircleCheck size={16} /> {L(`${DECK_SIZE} cartas: pronto para a batalha`, `${DECK_SIZE} cards: battle ready`)}
        {:else}<TriangleAlert size={16} /> {total}/{DECK_SIZE} · {total < DECK_SIZE ? L(`faltam ${DECK_SIZE - total}`, `${DECK_SIZE - total} to go`) : L(`sobram ${total - DECK_SIZE}`, `${total - DECK_SIZE} too many`)}{/if}
      </div>
      <div class="bar"><i style="width:{Math.min(100, (total / DECK_SIZE) * 100)}%"></i></div>
      {#if byLevel.length}<div class="levels">{#each byLevel as [lv, n]}<span>{L('Nv', 'Lv')} {lv} <b>{n}</b></span>{/each}</div>{/if}
      <div class="rows">
        {#each list as x (x.c.id)}
          <div class="rowc" style="--k:{colorHex(x.c.colors[0] ?? 'red')}">
            <span class="lv">{x.c.game!.level}</span>
            <span class="nm"><b>{x.c.text[app.lang].name}</b><small>{L(KIND_NAMES[x.c.game!.kind][0], KIND_NAMES[x.c.game!.kind][1])} · {L('custo', 'cost')} {cost(x.c)}</small></span>
            <button class="btn sm ghost icon" onclick={() => change(x.c.id, -1)} aria-label={L('Tirar uma cópia', 'Remove a copy')}><Minus size={13} /></button>
            <b class="qt">{x.n}</b>
            <button class="btn sm ghost icon" onclick={() => change(x.c.id, 1)} aria-label={L('Somar uma cópia', 'Add a copy')}><Plus size={13} /></button>
          </div>
        {/each}
        {#if !list.length}<p class="muted sm">{L('Deck vazio. Clique nas cartas ao lado para montar.', 'Empty deck. Click the cards on the left to build it.')}</p>{/if}
      </div>
      <p class="muted sm">{users.length ? L(`Em uso por: ${users.map((c) => c.name).join(', ')}.`, `In use by: ${users.map((c) => c.name).join(', ')}.`) : L('Nenhum herói usa este deck. Escolha-o na ficha do herói ou na tela antes da batalha.', 'No hero uses this deck. Pick it on the hero sheet or on the pre-battle screen.')}</p>
      <div class="foot">
        <button class="btn sm" onclick={duplicate}><Copy size={14} /> {L('Duplicar', 'Duplicate')}</button>
        <button class="btn sm danger" onclick={remove}><Trash2 size={14} /> {L('Apagar', 'Delete')}</button>
      </div>
    </aside>
  {:else}
    <section class="empty">
      <Layers size={46} />
      <h2 class="display">{L('Monte o seu deck de batalha', 'Build your battle deck')}</h2>
      <p class="muted">{L(`Um deck tem ${DECK_SIZE} cartas, com até ${MAX_COPIES} cópias de cada. Comece do zero ou a partir do deck de uma classe, e depois escolha-o na ficha do herói.`, `A deck has ${DECK_SIZE} cards, up to ${MAX_COPIES} copies of each. Start from scratch or from a class deck, then pick it on the hero sheet.`)}</p>
    </section>
  {/if}
</div>

<style>
  .builds { height: 100%; display: grid; grid-template-columns: 250px minmax(0, 1fr) 330px; min-height: 0; }
  .inv, .deck { display: flex; flex-direction: column; gap: 12px; padding: 16px; min-height: 0; background: var(--bg-2); }
  .inv { border-right: 1px solid var(--line); } .deck { border-left: 1px solid var(--line); }
  .blist { flex: 1; min-height: 0; overflow-y: auto; display: grid; gap: 6px; align-content: start; }
  .bitem { display: flex; gap: 10px; align-items: center; text-align: left; padding: 9px 11px; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); color: var(--text-2); cursor: pointer; font: inherit; }
  .bitem:hover { border-color: var(--line-2); }
  .bitem.on { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
  .bitem span { display: grid; min-width: 0; } .bitem b { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bitem small { font-size: 11.5px; color: var(--ok); } .bitem small.bad { color: #e9b96a; }
  .newbox { display: grid; gap: 7px; padding-top: 12px; border-top: 1px solid var(--line); }
  .sm { font-size: 12px; }
  .pool { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  .phead { display: flex; gap: 14px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 12px 18px; border-bottom: 1px solid var(--line); }
  .filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .search { display: flex; align-items: center; gap: 6px; color: var(--muted); } .search .input { width: 170px; }
  .filters .select { width: auto; }
  .grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; padding: 18px; align-content: start; }
  .tile { position: relative; }
  .pic { display: block; width: 100%; aspect-ratio: 750 / 1050; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 8px; }
  .tile.in .pic { box-shadow: 0 0 0 2px var(--accent), 0 0 16px rgb(227 181 102 / .35); }
  .count { position: absolute; right: -6px; top: -8px; z-index: 2; min-width: 30px; padding: 2px 7px; border-radius: 99px; text-align: center; font: 800 13px var(--ui); color: var(--accent-ink); background: linear-gradient(180deg, #ffe7a6, #c9962f); border: 2px solid #14100d; pointer-events: none; }
  .name { font: 700 16px var(--display); }
  .status { display: flex; gap: 7px; align-items: center; font: 600 13px var(--ui); color: #e9b96a; } .status.ok { color: var(--ok); }
  .bar { height: 6px; border-radius: 4px; background: var(--surface-3); overflow: hidden; } .bar i { display: block; height: 100%; background: linear-gradient(90deg, #c9962f, #ffe7a6); transition: width .2s; }
  .levels { display: flex; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: var(--muted); } .levels span { padding: 2px 8px; border-radius: 99px; background: var(--surface-2); } .levels b { color: var(--text); }
  .rows { flex: 1; min-height: 0; overflow-y: auto; display: grid; gap: 4px; align-content: start; }
  .rowc { display: grid; grid-template-columns: 24px 1fr auto 20px auto; gap: 6px; align-items: center; padding: 5px 6px 5px 8px; border-radius: var(--radius-sm); background: var(--surface); border-left: 3px solid var(--k); }
  .lv { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font: 800 11px var(--ui); background: var(--surface-3); color: var(--accent-2); }
  .nm { display: grid; min-width: 0; } .nm b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .nm small { font-size: 11px; color: var(--muted); }
  .qt { text-align: center; font: 800 14px var(--ui); }
  .foot { display: flex; gap: 8px; justify-content: space-between; }
  .empty { grid-column: 2 / -1; display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; color: var(--muted); padding: 30px; }
  .empty h2 { color: var(--text); } .empty p { max-width: 520px; }
  @media (max-width: 1100px) { .builds { grid-template-columns: 200px minmax(0, 1fr) 280px; } }
</style>
