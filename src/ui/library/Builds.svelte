<!--
  Decks de batalha: o inventário de decks do jogador.
   - À esquerda, as "caixas" dos decks (cada uma com a arte que o jogador escolher) e, depois de
     vencer um chefe, os decks de monstros (as cartas dele que o jogador já ganhou).
   - No meio, o inventário de habilidades (as cartas que cabem no deck: as das classes dele, os
     itens e as cartas de chefes) ou a visão em pilhas do deck, que dá para arrumar arrastando.
   - À direita, o deck aberto: nome, arte da caixa e a lista (passe o mouse num nome para ver a carta).
  Regras: 40 cartas, até 4 cópias de cada, e nunca mais cópias do que o jogador tem.
-->
<script lang="ts">
  import Coach from '../common/Coach.svelte';
  import { LESSONS } from '../../app/tutorialLessons';
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { crossfade, fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Plus, Search, Trash2, Copy, Minus, CircleCheck, TriangleAlert, Layers, Image as ImageIcon, LayoutGrid, Columns3, Lock, Skull, X, Check } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { COLORS, colorHex } from '../../model/catalog';
  import { DECK_SIZE, MAX_COPIES, buildColors, buildCount, cardFits } from '../../model/builds';
  import type { Build, Card, ColorId, Deck } from '../../model/types';
  import { KIND_NAMES, type CardKind } from '../../game/types';
  import { ensureMedia, mediaUrl } from '../../store/media';
  import { classIcon } from '../../render/icons/glyphs';
  import CardImage from '../common/CardImage.svelte';
  import Glyph from '../common/Glyph.svelte';
  import { zoomable } from '../common/zoom';

  let { id }: { id?: string } = $props();

  const builds = $derived(app.builds);
  /** Decks de chefes de que o jogador já tem alguma carta. */
  const monsters = $derived(app.decks.filter((d) => d.kind === 'monster' && app.cardsOf(d.id).some((c) => app.ownedOf(c) > 0)));
  const monster = $derived<Deck | undefined>(id ? monsters.find((d) => d.id === id) : undefined);
  const open = $derived<Build | undefined>(monster ? undefined : app.build(id) ?? builds[0]);
  const classDecks = $derived(app.decks.filter((d) => d.kind === 'class' && app.cardsOf(d.id).some((c) => c.game)));
  const deckOf = (c: Card) => app.deck(c.deckId);
  const colors = $derived<ColorId[]>(open ? buildColors(open, app.cards, app.decks) : []);
  // decks antigos (sem classe gravada): a classe sai das cartas que eles têm, uma vez
  $effect(() => { const b = open; if (b && !b.colors?.length && colors.length) { const cs = [...colors]; app.updateProject(() => { b.colors = cs; }); } });

  // ───── inventário de habilidades: o que cabe neste deck ─────
  const pool = $derived(open ? Object.values(app.cards).filter((c) => c.game && cardFits(c, deckOf(c), colors)) : []);
  let fDeck = $state('');
  let fKind = $state<CardKind | ''>('');
  let fOwned = $state(true);
  let query = $state('');
  const cost = (c: Card) => c.cost.reduce((n, p) => n + p.amount, 0);
  const byCurve = (a: Card, b: Card) => a.game!.level - b.game!.level || cost(a) - cost(b) || a.text[app.lang].name.localeCompare(b.text[app.lang].name);
  const sources = $derived([...new Set(pool.map((c) => c.deckId))].map((d) => app.deck(d)!).filter(Boolean).sort((a, b) => a.order - b.order));
  const shown = $derived(pool
    .filter((c) => (!fDeck || c.deckId === fDeck) && (!fKind || c.game!.kind === fKind) && (!fOwned || app.ownedOf(c) > 0) && (!query.trim() || c.text[app.lang].name.toLowerCase().includes(query.trim().toLowerCase())))
    .sort(byCurve));
  const missing = $derived(pool.filter((c) => app.ownedOf(c) === 0).length);

  const total = $derived(open ? buildCount(open) : 0);
  const list = $derived(open ? Object.entries(open.cards).map(([cid, n]) => ({ c: app.cards[cid], n })).filter((x) => x.c?.game && x.n > 0).sort((a, b) => byCurve(a.c, b.c)) : []);
  const byLevel = $derived.by(() => { const m = new Map<number, number>(); for (const x of list) m.set(x.c.game!.level, (m.get(x.c.game!.level) ?? 0) + x.n); return [...m.entries()].sort((a, b) => a[0] - b[0]); });
  const users = $derived(open ? app.project!.characters.filter((c) => c.buildId === open.id) : []);

  function change(cid: string, d: number) {
    if (!open) return;
    const card = app.cards[cid], have = Math.min(MAX_COPIES, app.ownedOf(card));
    const cur = open.cards[cid] ?? 0, next = Math.max(0, Math.min(have, cur + d));
    if (next === cur) {
      if (d > 0) ui.toast(have === 0 ? L('Você ainda não tem esta carta. Ganhe cópias na Jornada.', 'You do not own this card yet. Win copies in the Journey.') : have < MAX_COPIES ? L(`Você só tem ${have} cópia${have > 1 ? 's' : ''} desta carta.`, `You only own ${have} cop${have > 1 ? 'ies' : 'y'} of this card.`) : L(`No máximo ${MAX_COPIES} cópias da mesma carta.`, `At most ${MAX_COPIES} copies of the same card.`), 'info');
      return;
    }
    if (d > 0 && total >= DECK_SIZE) { ui.toast(L(`O deck já tem ${DECK_SIZE} cartas. Tire uma para trocar.`, `The deck already has ${DECK_SIZE} cards. Remove one to swap.`), 'info'); return; }
    app.updateProject(() => { if (next) open.cards[cid] = next; else delete open.cards[cid]; });
  }

  // ───── deck novo ─────
  let creating = $state(false);
  let nName = $state('');
  let nA = $state<ColorId | ''>('');
  let nB = $state<ColorId | ''>('');
  let nFill = $state(true);
  const deckOfColor = (c: ColorId) => classDecks.find((d) => d.colors[0] === c);
  function create() {
    if (!nA) return;
    const cs = [nA, ...(nB && nB !== nA ? [nB] : [])] as ColorId[];
    const src = nFill ? deckOfColor(nA) : undefined;
    const name = nName.trim() || cs.map((c) => COLORS[c].classes[app.lang].split(' / ')[0]).join(' / ');
    const b = app.addBuild(name, cs, src?.id);
    creating = false; nName = ''; nB = '';
    router.go(`/baralhos/${encodeURIComponent(b.id)}`);
  }
  function duplicate() {
    if (!open) return;
    const b = app.addBuild(L(`${open.name} (cópia)`, `${open.name} (copy)`), [...colors]);
    const src = open;
    app.updateProject(() => { b.cards = { ...src.cards }; b.cover = src.cover; b.piles = src.piles?.map((p) => [...p]); });
    router.go(`/baralhos/${encodeURIComponent(b.id)}`);
  }
  async function remove() {
    if (!open) return;
    const r = await ui.confirm({ title: L(`Apagar o deck “${open.name}”?`, `Delete the deck “${open.name}”?`), text: users.length ? L(`${users.map((c) => c.name).join(', ')} volta${users.length > 1 ? 'm' : ''} a usar o deck padrão da classe. As cartas continuam no inventário.`, `${users.map((c) => c.name).join(', ')} go${users.length > 1 ? '' : 'es'} back to the class default deck. The cards stay in the inventory.`) : L('As cartas continuam no inventário de habilidades.', 'The cards stay in the skill inventory.'), ok: L('Apagar', 'Delete'), danger: true });
    if (r !== 'ok') return;
    app.removeBuild(open.id);
    router.go('/baralhos');
  }

  // ───── arte da caixa ─────
  let mediaTick = $state(0);
  /** Imagem da arte de uma carta (ou nada, se ela não tem arte própria). */
  function artOf(cid: string | undefined): string | undefined {
    void mediaTick;
    const m = cid ? app.cards[cid]?.art.mediaId : undefined;
    if (!m) return undefined;
    const u = mediaUrl(m);
    if (!u) void ensureMedia(m).then(() => mediaTick++);
    return u;
  }
  /** Arte da caixa: a escolhida; sem ela, a primeira carta do deck que tiver arte. */
  const coverOf = (b: Build): string | undefined => artOf(b.cover && b.cards[b.cover] !== undefined ? b.cover : Object.keys(b.cards).find((c) => app.cards[c]?.art.mediaId));
  let coverOpen = $state(false);

  // ───── visão em pilhas: colunas que o jogador arruma arrastando ─────
  let view = $state<'pool' | 'piles'>((() => { try { return localStorage.getItem('voidsun.decks.vista') === 'piles' ? 'piles' : 'pool'; } catch { return 'pool'; } })());
  $effect(() => { try { localStorage.setItem('voidsun.decks.vista', view); } catch { /* sem armazenamento local */ } });
  /** As colunas do deck: as que o jogador arrumou; o que falta entra pela coluna do nível da carta. */
  function pilesOf(b: Build): string[][] {
    const inDeck = new Set(Object.keys(b.cards).filter((c) => app.cards[c]?.game && b.cards[c] > 0));
    const cols = (b.piles ?? []).map((col) => col.filter((c) => inDeck.has(c)));
    const placed = new Set(cols.flat());
    const rest = [...inDeck].filter((c) => !placed.has(c)).map((c) => app.cards[c]).sort(byCurve);
    if (!b.piles?.length) { for (const c of rest) { const i = Math.min(5, c.game!.level - 1); while (cols.length <= i) cols.push([]); cols[i].push(c.id); } }
    else for (const c of rest) { const i = Math.min(cols.length - 1, Math.max(0, c.game!.level - 1)); (cols[i] ?? (cols[cols.length] = [])).push(c.id); }
    return cols.filter((c, i) => c.length || i < 1);
  }
  let cols = $state<string[][]>([]);
  let drag = $state<{ id: string; x: number; y: number; w: number; dx: number; dy: number } | null>(null);
  $effect(() => { const b = open; void b?.cards; void b?.piles; if (b && !drag) cols = pilesOf(b); });
  const [send, receive] = crossfade({ duration: 200, easing: cubicOut, fallback: (node) => fade(node, { duration: 120 }) });
  let dragFrom: { id: string; x: number; y: number; r: DOMRect; moved: boolean } | null = null;
  let dragged = false;
  let pilesEl = $state<HTMLDivElement>();
  // (os movimentos são ouvidos na janela: ao mudar de coluna a carta é recriada, e ouvir nela mesma perderia o arrasto)
  function pileDown(e: PointerEvent, cid: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragFrom = { id: cid, x: e.clientX, y: e.clientY, r: (e.currentTarget as HTMLElement).getBoundingClientRect(), moved: false };
    addEventListener('pointermove', pileMove);
    addEventListener('pointerup', pileUp);
    addEventListener('pointercancel', pileUp);
    addEventListener('mouseup', pileUp);
    addEventListener('blur', pileUp);
  }
  function pileMove(e: PointerEvent) {
    const d = dragFrom;
    if (!d || !pilesEl) return;
    // o botão já foi solto (o aviso de soltar pode se perder fora da janela): termina o arrasto
    if (e.buttons === 0) { pileUp(); return; }
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
      d.moved = true;
      peek = null;
      drag = { id: d.id, x: e.clientX, y: e.clientY, w: d.r.width, dx: d.x - d.r.left, dy: d.y - d.r.top };
    }
    if (!drag) return;
    drag.x = e.clientX; drag.y = e.clientY;
    // para onde vai: a coluna sob o ponteiro (a última é a coluna nova, vazia) e a posição pela altura
    const colEls = [...pilesEl.querySelectorAll<HTMLElement>('.pile')];
    let ci = colEls.findIndex((c) => e.clientX < c.getBoundingClientRect().right + 7);
    if (ci < 0) ci = colEls.length - 1;
    const items = [...colEls[ci].querySelectorAll<HTMLElement>('.pc')].filter((x) => x.dataset.id !== d.id);
    const at = items.filter((x) => { const r = x.getBoundingClientRect(); return r.top + 13 < e.clientY; }).length;
    const from = cols.findIndex((c) => c.includes(d.id));
    const target = Math.min(ci, cols.length);
    if (from === target && cols[from].indexOf(d.id) === at) return;
    const next = cols.map((c) => c.filter((x) => x !== d.id));
    while (next.length <= target) next.push([]);
    next[target].splice(at, 0, d.id);
    cols = next;
  }
  function pileUp() {
    removeEventListener('pointermove', pileMove);
    removeEventListener('pointerup', pileUp);
    removeEventListener('pointercancel', pileUp);
    removeEventListener('mouseup', pileUp);
    removeEventListener('blur', pileUp);
    const d = dragFrom;
    dragFrom = null;
    if (!d?.moved) return;
    dragged = true;
    setTimeout(() => { dragged = false; }, 0);
    const b = open, saved = cols.filter((c) => c.length).map((c) => [...c]);
    drag = null;
    if (b) app.updateProject(() => { b.piles = saved; });
  }
  /** Carta inteira ao lado da coluna (nunca por cima das pilhas, para os nomes continuarem à vista). */
  function pilePeek(e: MouseEvent, cid: string) {
    if (drag || dragFrom?.moved) return;
    const el = e.currentTarget as HTMLElement, col = el.closest('.pile')!.getBoundingClientRect(), row = el.getBoundingClientRect(), h = PEEK_W * 1.4;
    const area = pilesEl!.getBoundingClientRect();
    const x = col.right + 12 + PEEK_W <= area.right ? col.right + 12 : col.left - PEEK_W - 12;
    peek = { id: cid, x, y: Math.max(70, Math.min(innerHeight - h - 12, row.top - 30)) };
  }
  function autoPiles() { const b = open; if (b) app.updateProject(() => { delete b.piles; }); }

  // ───── prévia da carta ao passar o mouse na lista ─────
  let peek = $state<{ id: string; x: number; y: number } | null>(null);
  const PEEK_W = 280;
  function showPeek(e: MouseEvent, cid: string) {
    const row = (e.currentTarget as HTMLElement).getBoundingClientRect(), h = PEEK_W * 1.4;
    // à esquerda da lista (nunca por cima dos botões de quantidade)
    const panel = (e.currentTarget as HTMLElement).closest('.deck')!.getBoundingClientRect();
    peek = { id: cid, x: panel.left - PEEK_W - 14, y: Math.max(70, Math.min(innerHeight - h - 12, row.top + row.height / 2 - h / 2)) };
  }

  const monsterCards = $derived(monster ? app.cardsOf(monster.id).filter((c) => c.game).sort(byCurve) : []);
  const go = (to: string) => router.go(`/baralhos/${encodeURIComponent(to)}`);
  void tick;
</script>

<div class="builds">
  <aside class="inv">
    <span class="section-title">{L('Inventário de decks', 'Deck inventory')}</span>
    <div class="blist">
      {#each builds as b (b.id)}
        {@const n = buildCount(b)}
        {@const art = coverOf(b)}
        {@const cs = buildColors(b, app.cards, app.decks)}
        <button class="box" class:on={open?.id === b.id} style="--k:{colorHex(cs[0] ?? 'red')}" onclick={() => go(b.id)} title={b.name}>
          <span class="box-art" style={art ? `background-image:url("${art}")` : ''}>{#if !art}<Glyph id={classIcon(cs[0] ?? 'red')} size={34} color="#f3ead6" />{/if}</span>
          <span class="box-pips">{#each cs as c}<i style="background:{colorHex(c)}"><Glyph id={classIcon(c)} size={11} color="#fff" /></i>{/each}</span>
          <span class="box-name"><b>{b.name}</b><small class:bad={n !== DECK_SIZE}>{n}/{DECK_SIZE}</small></span>
        </button>
      {/each}
      {#if creating}
        <div class="newform" in:scale={{ duration: 160, start: 0.94 }}>
          <!-- svelte-ignore a11y_autofocus -->
          <input class="input" autofocus placeholder={L('Nome do deck', 'Deck name')} bind:value={nName} onkeydown={(e) => { if (e.key === 'Enter') create(); else if (e.key === 'Escape') creating = false; }} />
          <label><span>{L('Classe', 'Class')}</span>
            <select class="select" bind:value={nA}><option value="" disabled>{L('escolha…', 'pick…')}</option>{#each classDecks as d (d.id)}<option value={d.colors[0]}>{COLORS[d.colors[0]].classes[app.lang]}</option>{/each}</select></label>
          <label><span>{L('2ª classe (opcional)', '2nd class (optional)')}</span>
            <select class="select" bind:value={nB}><option value="">—</option>{#each classDecks.filter((d) => d.colors[0] !== nA) as d (d.id)}<option value={d.colors[0]}>{COLORS[d.colors[0]].classes[app.lang]}</option>{/each}</select></label>
          <label class="chk"><input type="checkbox" bind:checked={nFill} /> {L('Começar com o deck inicial da classe', 'Start with the class starter deck')}</label>
          <div class="nf-acts"><button class="btn sm ghost" onclick={() => (creating = false)}>{L('Cancelar', 'Cancel')}</button><button class="btn sm primary" disabled={!nA} onclick={create}><Check size={14} /> {L('Criar', 'Create')}</button></div>
        </div>
      {:else}
        <button class="box add" onclick={() => { creating = true; nA = (open ? colors[0] : classDecks[0]?.colors[0]) ?? ''; }}>
          <span class="box-art"><Plus size={36} /></span>
          <span class="box-name"><b>{L('Novo deck', 'New deck')}</b></span>
        </button>
      {/if}

      {#if monsters.length}
        <div class="sep"><i></i><span><Skull size={12} /> {L('Decks de monstros', 'Monster decks')}</span><i></i></div>
        {#each monsters as d (d.id)}
          {@const cs = app.cardsOf(d.id).filter((c) => c.game)}
          <button class="box mon" class:on={monster?.id === d.id} onclick={() => go(d.id)} title={d.name[app.lang]}>
            <span class="box-art" style="background-image:url('heroes/{d.id.replace('proto-monster-', '')}.webp')"></span>
            <span class="box-name"><b>{d.name[app.lang].replace(/^.*— /, '')}</b><small>{cs.filter((c) => app.ownedOf(c) > 0).length}/{cs.length} {L('cartas', 'cards')}</small></span>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  {#if monster}
    <section class="pool">
      <header class="phead">
        <span class="section-title">{monster.name[app.lang]} · {L('cartas que você ganhou', 'cards you have won')}</span>
        <span class="muted sm">{L('Cada vitória sobre o chefe deixa você escolher 1 de 3 cartas dele. Elas podem entrar em qualquer deck montado.', 'Each victory over the boss lets you pick 1 of 3 of its cards. They can go into any built deck.')}</span>
      </header>
      <div class="grid">
        {#each monsterCards as c (c.id)}
          {@const n = app.ownedOf(c)}
          <div class="tile" class:locked={n === 0}>
            <div class="pic" use:zoomable={{ width: 380 }}><CardImage card={c} /></div>
            <span class="count" class:zero={n === 0}>{#if n}{n}/{MAX_COPIES}{:else}<Lock size={12} />{/if}</span>
          </div>
        {/each}
      </div>
    </section>
    <aside class="deck"><p class="muted sm">{L('Decks de monstros são coleções: as cartas ficam disponíveis no inventário de habilidades de todos os seus decks.', 'Monster decks are collections: the cards become available in the skill inventory of all your decks.')}</p></aside>
  {:else if open}
    <section class="pool">
      <header class="phead">
        <div class="seg">
          <button class:on={view === 'pool'} onclick={() => (view = 'pool')}><LayoutGrid size={14} /> {L('Inventário de habilidades', 'Skill inventory')}</button>
          <button class:on={view === 'piles'} onclick={() => (view = 'piles')}><Columns3 size={14} /> {L('Deck em pilhas', 'Deck in piles')}</button>
        </div>
        {#if view === 'pool'}
          <div class="filters">
            <label class="search"><Search size={14} /><input class="input" placeholder={L('Buscar carta', 'Search card')} bind:value={query} /></label>
            <select class="select" bind:value={fDeck}>
              <option value="">{L('Tudo', 'Everything')}</option>
              {#each sources as d (d.id)}<option value={d.id}>{d.name[app.lang]}</option>{/each}
            </select>
            <select class="select" bind:value={fKind}>
              <option value="">{L('Todos os tipos', 'All types')}</option>
              {#each Object.entries(KIND_NAMES) as [k, nm]}<option value={k}>{L(nm[0], nm[1])}</option>{/each}
            </select>
            <label class="chk"><input type="checkbox" bind:checked={fOwned} /> {L('Só as que tenho', 'Owned only')}{missing ? ` (${missing} ${L('a ganhar', 'to win')})` : ''}</label>
          </div>
        {:else}
          <div class="filters"><span class="muted sm">{L('Arraste as cartas para arrumar as colunas. Clique soma uma cópia; botão direito tira.', 'Drag cards to arrange the columns. Click adds a copy; right-click removes one.')}</span>
            <button class="btn sm ghost" onclick={autoPiles}>{L('Arrumar por nível', 'Arrange by level')}</button></div>
        {/if}
      </header>

      {#if view === 'pool'}
        <div class="grid">
          {#each shown as c (c.id)}
            {@const n = open.cards[c.id] ?? 0}
            {@const have = app.ownedOf(c)}
            <div class="tile" class:in={n > 0} class:locked={have === 0}>
              <button class="pic" use:zoomable={{ width: 380 }} onclick={() => change(c.id, 1)} oncontextmenu={(e) => { e.preventDefault(); change(c.id, -1); }} title={L('Clique: somar uma cópia · botão direito: tirar', 'Click: add a copy · right-click: remove')}>
                <CardImage card={c} />
              </button>
              {#if n}<span class="count">{n}×</span>{/if}
              {#if have === 0}<span class="own lock"><Lock size={11} /> {L('ganhe na Jornada', 'win in the Journey')}</span>
              {:else if have < MAX_COPIES}<span class="own">{L(`você tem ${have}`, `you own ${have}`)}</span>{/if}
            </div>
          {/each}
          {#if !shown.length}<p class="muted">{L('Nenhuma carta com esses filtros.', 'No card matches these filters.')}</p>{/if}
        </div>
      {:else}
        <div class="piles" bind:this={pilesEl} class:dragging={!!drag}>
          {#each [...cols, []] as col, ci (ci)}
            <div class="pile" class:ghostcol={ci >= cols.length}>
              {#each col as cid (cid)}
                {@const c = app.cards[cid]}
                <button class="pc" class:held={drag?.id === cid} data-id={cid} animate:flip={{ duration: 190, easing: cubicOut }} in:receive={{ key: cid }} out:send={{ key: cid }}
                  onpointerdown={(e) => pileDown(e, cid)} ondragstart={(e) => e.preventDefault()} onmouseenter={(e) => pilePeek(e, cid)} onmouseleave={() => (peek = null)}
                  onclick={() => { if (!dragged) change(cid, 1); }} oncontextmenu={(e) => { e.preventDefault(); change(cid, -1); }}>
                  {#if c}<CardImage card={c} eager />{/if}
                  <span class="pt" style="--k:{colorHex(c?.colors[0] ?? 'red')}"><i>{c?.game?.level}</i><b>{c?.text[app.lang].name}</b></span>
                  <span class="pn">×{open.cards[cid] ?? 0}</span>
                </button>
              {/each}
              {#if ci >= cols.length}<span class="newcol">{L('solte aqui para abrir uma coluna', 'drop here to open a column')}</span>{/if}
            </div>
          {/each}
          {#if !list.length}<p class="muted">{L('Deck vazio. Vá ao inventário de habilidades para pôr cartas.', 'Empty deck. Go to the skill inventory to add cards.')}</p>{/if}
        </div>
      {/if}
    </section>

    <aside class="deck">
      <div class="dhead" style="--k:{colorHex(colors[0] ?? 'red')}">
        <button class="cover" style={coverOf(open) ? `background-image:url("${coverOf(open)}")` : ''} onclick={() => (coverOpen = !coverOpen)} title={L('Escolher a arte da caixa do deck', 'Choose the deck box art')}>
          {#if !coverOf(open)}<Glyph id={classIcon(colors[0] ?? 'red')} size={30} color="#f3ead6" />{/if}
          <span class="cover-edit"><ImageIcon size={12} /></span>
        </button>
        <div class="dname">
          <input class="input name" value={open.name} onchange={(e) => { const v = (e.currentTarget as HTMLInputElement).value.trim(); if (v) app.updateProject(() => { open.name = v; }); }} aria-label={L('Nome do deck', 'Deck name')} />
          <span class="dclass">{#each colors as c}<i style="--k:{colorHex(c)}"><Glyph id={classIcon(c)} size={11} color="#fff" /> {COLORS[c].classes[app.lang]}</i>{/each}</span>
        </div>
      </div>
      {#if coverOpen}
        <div class="coverpick" in:scale={{ duration: 140, start: 0.96 }}>
          <span class="section-title">{L('Arte da caixa', 'Box art')} <button class="btn sm ghost icon" onclick={() => (coverOpen = false)}><X size={13} /></button></span>
          <div class="cp-grid">
            {#each list.filter((x) => x.c.art.mediaId) as x (x.c.id)}
              <button class:on={open.cover === x.c.id} style="background-image:url('{artOf(x.c.id) ?? ''}')" title={x.c.text[app.lang].name} onclick={() => { app.updateProject(() => { open.cover = x.c.id; }); coverOpen = false; }}></button>
            {/each}
          </div>
          {#if !list.some((x) => x.c.art.mediaId)}<p class="muted sm">{L('Nenhuma carta deste deck tem arte própria ainda.', 'No card in this deck has its own art yet.')}</p>{/if}
        </div>
      {/if}
      <div class="status" class:ok={total === DECK_SIZE}>
        {#if total === DECK_SIZE}<CircleCheck size={16} /> {L(`${DECK_SIZE} cartas: pronto para a batalha`, `${DECK_SIZE} cards: battle ready`)}
        {:else}<TriangleAlert size={16} /> {total}/{DECK_SIZE} · {total < DECK_SIZE ? L(`faltam ${DECK_SIZE - total}`, `${DECK_SIZE - total} to go`) : L(`sobram ${total - DECK_SIZE}`, `${total - DECK_SIZE} too many`)}{/if}
      </div>
      <div class="bar"><i style="width:{Math.min(100, (total / DECK_SIZE) * 100)}%"></i></div>
      {#if byLevel.length}<div class="levels">{#each byLevel as [lv, n]}<span>{L('Nv', 'Lv')} {lv} <b>{n}</b></span>{/each}</div>{/if}
      <div class="rows" onmouseleave={() => (peek = null)} role="list">
        {#each list as x (x.c.id)}
          <div class="rowc" style="--k:{colorHex(x.c.colors[0] ?? 'red')}" role="listitem">
            <span class="lv">{x.c.game!.level}</span>
            <span class="nm" onmouseenter={(e) => showPeek(e, x.c.id)} role="presentation"><b>{x.c.text[app.lang].name}</b><small>{L(KIND_NAMES[x.c.game!.kind][0], KIND_NAMES[x.c.game!.kind][1])} · {L('custo', 'cost')} {cost(x.c)}</small></span>
            <button class="btn sm ghost icon" onmouseenter={() => (peek = null)} onclick={() => change(x.c.id, -1)} aria-label={L('Tirar uma cópia', 'Remove a copy')}><Minus size={13} /></button>
            <b class="qt">{x.n}</b>
            <button class="btn sm ghost icon" onmouseenter={() => (peek = null)} onclick={() => change(x.c.id, 1)} aria-label={L('Somar uma cópia', 'Add a copy')}><Plus size={13} /></button>
          </div>
        {/each}
        {#if !list.length}<p class="muted sm">{L('Deck vazio. Clique nas cartas ao lado para montar.', 'Empty deck. Click the cards on the left to build it.')}</p>{/if}
      </div>
      <p class="muted sm">{users.length ? L(`Em uso por: ${users.map((c) => c.name).join(', ')}.`, `In use by: ${users.map((c) => c.name).join(', ')}.`) : L('Nenhum herói usa este deck. Ele serve a heróis dessas classes: escolha-o na ficha do herói ou na tela antes da batalha.', 'No hero uses this deck. It fits heroes of these classes: pick it on the hero sheet or on the pre-battle screen.')}</p>
      <div class="foot">
        <button class="btn sm" onclick={duplicate}><Copy size={14} /> {L('Duplicar', 'Duplicate')}</button>
        <button class="btn sm danger" onclick={remove}><Trash2 size={14} /> {L('Apagar', 'Delete')}</button>
      </div>
    </aside>
  {:else}
    <section class="empty">
      <Layers size={46} />
      <h2 class="display">{L('Monte o seu deck de batalha', 'Build your battle deck')}</h2>
      <p class="muted">{L(`Um deck tem ${DECK_SIZE} cartas, com até ${MAX_COPIES} cópias de cada, das classes do herói que vai usá-lo (mais itens e cartas de chefes). Clique em “Novo deck” para começar.`, `A deck has ${DECK_SIZE} cards, up to ${MAX_COPIES} copies of each, from the classes of the hero who will use it (plus items and boss cards). Click “New deck” to begin.`)}</p>
    </section>
  {/if}
</div>

{#if drag && app.cards[drag.id]}
  <div class="dragghost" style="left:{drag.x - drag.dx}px;top:{drag.y - drag.dy}px;width:{drag.w}px"><CardImage card={app.cards[drag.id]} eager /></div>
{/if}
{#if peek && app.cards[peek.id] && !drag}
  {#key peek.id}<div class="peek" style="left:{peek.x}px;top:{peek.y}px;width:{PEEK_W}px" in:scale={{ duration: 110, start: 0.94 }}><CardImage card={app.cards[peek.id]} eager /></div>{/key}
{/if}

<Coach area="builds" lessons={LESSONS.builds}  />

<style>
  .builds { height: 100%; display: grid; grid-template-columns: 268px minmax(0, 1fr) 340px; min-height: 0; }
  .inv, .deck { display: flex; flex-direction: column; gap: 12px; padding: 16px; min-height: 0; background: var(--bg-2); }
  .inv { border-right: 1px solid var(--line); } .deck { border-left: 1px solid var(--line); position: relative; }
  .sm { font-size: 12px; margin: 0; }
  /* caixas dos decks: arte em cima, nome numa placa embaixo */
  .blist { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-content: start; padding: 2px; }
  .box { position: relative; display: grid; padding: 0; border-radius: 10px; overflow: hidden; cursor: pointer; font: inherit; color: var(--text-2); text-align: center;
    border: 2px solid #2c2647; background: #100e1a; box-shadow: 0 6px 14px rgb(0 0 0 / .5); transition: transform .14s cubic-bezier(.2, .8, .3, 1), border-color .14s, box-shadow .14s; }
  .box:hover { transform: translateY(-3px); border-color: #6a5fa8; }
  .box.on { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft), 0 0 20px rgb(227 181 102 / .3); color: var(--text); }
  .box-art { display: grid; place-items: center; aspect-ratio: 1 / 1.05; background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--k, #6a5fa8) 55%, #1a1626), #0c0a14) center 22% / cover no-repeat; image-rendering: pixelated; color: var(--muted); }
  .box-pips { position: absolute; left: 5px; top: 5px; display: flex; gap: 3px; }
  .box-pips i { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; border: 1.5px solid #0c0a14; box-shadow: 0 2px 4px rgb(0 0 0 / .6); }
  .box-name { display: grid; gap: 1px; padding: 5px 6px 6px; background: linear-gradient(180deg, #1c1830, #0f0d1a); border-top: 1px solid rgb(255 255 255 / .08); }
  .box-name b { font-size: 12px; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .box-name small { font-size: 11px; color: var(--ok); } .box-name small.bad { color: #e9b96a; }
  .box.add { border-style: dashed; } .box.add .box-art { background: none; }
  .box.mon { border-color: #5a2a26; } .box.mon.on { border-color: #d0584a; box-shadow: 0 0 20px rgb(208 88 74 / .35); } .box.mon .box-name small { color: #e9b96a; }
  .sep { grid-column: 1 / -1; display: flex; gap: 8px; align-items: center; margin-top: 8px; font: 700 10px var(--ui); letter-spacing: .16em; text-transform: uppercase; color: #e08a7c; }
  .sep i { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #7a3a34); } .sep i:last-child { transform: scaleX(-1); }
  .sep span { display: inline-flex; gap: 5px; align-items: center; white-space: nowrap; }
  .newform { grid-column: 1 / -1; display: grid; gap: 8px; padding: 12px; border-radius: 10px; border: 1px solid var(--accent); background: var(--surface); }
  .newform label { display: grid; gap: 3px; font-size: 11.5px; color: var(--muted); }
  .chk { display: flex !important; gap: 6px; align-items: center; font-size: 12px; color: var(--text-2); white-space: nowrap; }
  .nf-acts { display: flex; gap: 6px; justify-content: flex-end; }

  .pool { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  .phead { display: flex; gap: 14px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 10px 18px; border-bottom: 1px solid var(--line); }
  .phead .seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: 99px; overflow: hidden; }
  .phead .seg button { display: inline-flex; gap: 6px; align-items: center; padding: 6px 14px; border: 0; background: none; color: var(--text-2); cursor: pointer; font: 600 12.5px var(--ui); }
  .phead .seg button.on { background: var(--accent); color: var(--accent-ink); }
  .filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .search { display: flex; align-items: center; gap: 6px; color: var(--muted); } .search .input { width: 160px; }
  .filters .select { width: auto; }
  .grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 18px 16px; padding: 18px; align-content: start; }
  .tile { position: relative; }
  .pic { display: block; width: 100%; aspect-ratio: 750 / 1050; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 8px; }
  .tile.in .pic { box-shadow: 0 0 0 2px var(--accent), 0 0 16px rgb(227 181 102 / .35); }
  .tile.locked .pic { filter: grayscale(.8) brightness(.5); }
  .count { position: absolute; right: -6px; top: -8px; z-index: 2; min-width: 30px; padding: 2px 7px; border-radius: 99px; text-align: center; font: 800 13px var(--ui); color: var(--accent-ink); background: linear-gradient(180deg, #ffe7a6, #c9962f); border: 2px solid #14100d; pointer-events: none; }
  .count.zero { background: #2a2536; color: var(--muted); }
  .own { position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); z-index: 2; display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; padding: 1px 8px; border-radius: 99px; font: 600 10.5px var(--ui); background: #14121d; border: 1px solid var(--line-2); color: var(--text-2); pointer-events: none; }
  .own.lock { color: #e9b96a; border-color: #6b5533; }

  /* pilhas: colunas de cartas sobrepostas (só a faixa do nome de cada uma aparece; a última, inteira) */
  .piles { --pw: clamp(120px, 11.5vw, 178px); --strip: 26px; flex: 1; min-height: 0; overflow: auto; display: flex; gap: 14px; align-items: flex-start; padding: 18px; }
  .pile { flex: none; width: var(--pw); min-height: calc(var(--pw) * 1.4); display: flex; flex-direction: column; border-radius: 10px; }
  .pile.ghostcol { border: 2px dashed transparent; align-items: center; justify-content: center; padding: 0; }
  .piles.dragging .pile.ghostcol { border-color: var(--line-2); }
  .newcol { display: none; font-size: 11px; color: var(--muted); text-align: center; padding: 10px; }
  .piles.dragging .newcol { display: block; }
  .pc { position: relative; display: block; width: 100%; height: var(--strip); padding: 0; border: 0; background: none; cursor: grab; overflow: visible; touch-action: none; user-select: none; -webkit-user-select: none; outline: none; -webkit-tap-highlight-color: transparent; }
  .pc:focus, .pc:focus-visible { outline: none; box-shadow: none; }
  .pc > :global(*:first-child) { position: absolute; left: 0; top: 0; width: 100%; aspect-ratio: 750 / 1050; border-radius: 7px; box-shadow: 0 -3px 8px rgb(0 0 0 / .55); transition: transform .13s cubic-bezier(.2, .8, .3, 1), box-shadow .13s; pointer-events: none; }
  .piles:not(.dragging) .pc:hover .pt { border-color: var(--accent); filter: brightness(1.35); }
  /* placa com o nome: é o que se lê de cada carta empilhada (some na carta sob o mouse, que aparece inteira) */
  .pt { position: absolute; left: 0; right: 0; top: 0; z-index: 6; height: var(--strip); box-sizing: border-box; display: flex; gap: 6px; align-items: center; padding: 0 44px 0 5px; border-radius: 7px 7px 0 0; pointer-events: none; text-align: left;
    background: linear-gradient(180deg, color-mix(in srgb, var(--k) 46%, #17131f), #100d18); border: 1px solid rgb(255 255 255 / .14); border-bottom-color: rgb(0 0 0 / .6); }
  .pt i { flex: none; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; font: 800 10px var(--ui); font-style: normal; background: rgb(0 0 0 / .45); color: var(--accent-2); }
  .pt b { font: 600 11.5px var(--ui); color: #f3ead6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* de cada pilha só a última carta aparece inteira (logo abaixo da placa dela); as outras são só a placa com o nome */
  .pile .pc:not(:last-of-type) > :global(*:first-child) { display: none; }
  /* a carta da frente não leva placa (ela já mostra o próprio nome) e pode ser pega pela carta inteira */
  .pile .pc:last-of-type { height: calc(var(--pw) * 1.4); }
  .pile .pc:last-of-type .pt { display: none; }
  .pc.held .pt { opacity: .3; }
  .pn { position: absolute; right: 4px; top: 3px; z-index: 7; padding: 0 7px; border-radius: 8px; font: 800 12px/19px var(--ui); color: #fff; background: rgb(10 8 14 / .86); border: 1px solid rgb(255 255 255 / .25); pointer-events: none; }
  .pc.held > :global(*:first-child) { opacity: .22; }
  .pc.held .pn { opacity: 0; }
  .dragghost { position: fixed; z-index: 200; pointer-events: none; aspect-ratio: 750 / 1050; transform: rotate(-3deg) scale(1.08); filter: drop-shadow(0 22px 30px rgb(0 0 0 / .85)); }
  .peek { position: fixed; z-index: 150; pointer-events: none; aspect-ratio: 750 / 1050; filter: drop-shadow(0 20px 34px rgb(0 0 0 / .85)); }

  .dhead { display: flex; gap: 12px; align-items: center; }
  .cover { position: relative; flex: none; display: grid; place-items: center; width: 74px; height: 78px; border-radius: 10px; cursor: pointer; padding: 0; border: 2px solid color-mix(in srgb, var(--k) 70%, #000);
    background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--k) 55%, #1a1626), #0c0a14) center 22% / cover no-repeat; image-rendering: pixelated; box-shadow: 0 6px 14px rgb(0 0 0 / .5); }
  .cover:hover { border-color: var(--accent); }
  .cover-edit { position: absolute; right: -6px; bottom: -6px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); border: 2px solid var(--bg-2); }
  .dname { flex: 1; min-width: 0; display: grid; gap: 6px; }
  .name { font: 700 16px var(--display); width: 100%; }
  .dclass { display: flex; gap: 5px; flex-wrap: wrap; }
  .dclass i { display: inline-flex; gap: 4px; align-items: center; padding: 1px 8px 1px 4px; border-radius: 99px; font: 600 10.5px var(--ui); font-style: normal; color: #fff; background: color-mix(in srgb, var(--k) 70%, #14121d); }
  .coverpick { display: grid; gap: 8px; padding: 10px; border-radius: 10px; border: 1px solid var(--accent); background: var(--surface); }
  .coverpick .section-title { display: flex; justify-content: space-between; align-items: center; }
  .cp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; max-height: 190px; overflow-y: auto; }
  .cp-grid button { aspect-ratio: 1; border-radius: 7px; border: 2px solid transparent; background: #0c0a14 center 22% / cover no-repeat; image-rendering: pixelated; cursor: pointer; padding: 0; }
  .cp-grid button:hover { border-color: var(--line-2); } .cp-grid button.on { border-color: var(--accent); }
  .status { display: flex; gap: 7px; align-items: center; font: 600 13px var(--ui); color: #e9b96a; } .status.ok { color: var(--ok); }
  .bar { height: 6px; flex: none; border-radius: 4px; background: var(--surface-3); overflow: hidden; } .bar i { display: block; height: 100%; background: linear-gradient(90deg, #c9962f, #ffe7a6); transition: width .2s; }
  .levels { display: flex; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: var(--muted); } .levels span { padding: 2px 8px; border-radius: 99px; background: var(--surface-2); } .levels b { color: var(--text); }
  .rows { flex: 1; min-height: 0; overflow-y: auto; display: grid; gap: 4px; align-content: start; }
  .rowc { display: grid; grid-template-columns: 24px 1fr auto 20px auto; gap: 6px; align-items: center; padding: 5px 6px 5px 8px; border-radius: var(--radius-sm); background: var(--surface); border-left: 3px solid var(--k); }
  .rowc:hover { background: var(--surface-2); }
  .lv { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font: 800 11px var(--ui); background: var(--surface-3); color: var(--accent-2); }
  .nm { display: grid; min-width: 0; cursor: help; } .nm b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .nm small { font-size: 11px; color: var(--muted); }
  .qt { text-align: center; font: 800 14px var(--ui); }
  .foot { display: flex; gap: 8px; justify-content: space-between; }
  .empty { grid-column: 2 / -1; display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; color: var(--muted); padding: 30px; }
  .empty h2 { color: var(--text); } .empty p { max-width: 520px; }
  @media (max-width: 1100px) { .builds { grid-template-columns: 220px minmax(0, 1fr) 290px; } }
</style>
