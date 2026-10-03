<script lang="ts">
  import { Plus, Search, X, FileDown, Images, Trash2, FolderInput, Paintbrush, SlidersHorizontal, TriangleAlert, CircleCheck, ImageUp } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { router } from '../../app/router.svelte';
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';
  import { COLORS, DECK_SIZE, RARITIES, RARITY_ORDER, colorHex } from '../../model/catalog';
  import { classIcon } from '../../render/icons/glyphs';
  import { lighten } from '../../render/color';
  import { vivid } from '../../render/palette';
  import type { Card, RarityId } from '../../model/types';
  import { costTotal, hasCost } from '../../model/cost';
  import Glyph from '../common/Glyph.svelte';
  import CardGrid from './CardGrid.svelte';
  import CardImage from '../common/CardImage.svelte';
  import { exportPdf, exportPngZip } from '../../export/exporters.svelte';
  import { applyArt, groupArtFiles, type ArtGroup } from '../../export/artImport';
  import ArtPicker from './ArtPicker.svelte';
  import { warmCache } from '../common/cardCtx';

  let { deckId }: { deckId?: string } = $props();

  let query = $state('');
  let q = $state('');
  let fType = $state('');
  let fCost = $state('');
  let fRarity = $state<RarityId | ''>('');
  let fTag = $state('');
  let sort = $state<'n' | 'cost' | 'name' | 'rarity'>('n');
  let tile = $state(Number(localStorage.getItem('forge.tile') ?? 230));
  let selected = $state(new Set<string>());
  let lastClicked = $state<string | null>(null);

  $effect(() => { try { localStorage.setItem('forge.tile', String(tile)); } catch { /* sem armazenamento local */ } });

  // busca com espera: não redesenha a cada tecla
  let qTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => { const v = query; clearTimeout(qTimer); qTimer = setTimeout(() => (q = v.trim().toLowerCase()), 160); });

  const lang = $derived(app.lang);
  /** Nome do deck em duas partes: "Vermelho — Guerreiro / Bárbaro" → destaque "Guerreiro / Bárbaro", detalhe "Vermelho". */
  function deckLabel(d: { name: Record<string, string> }): { main: string; small: string } {
    const [a, ...rest] = (d.name[lang] ?? '').split(' — ');
    return rest.length ? { main: rest.join(' — '), small: a } : { main: a, small: '' };
  }
  const deck = $derived(deckId ? app.deck(deckId) : undefined);
  // abrir um deck de outra coleção troca a coleção aberta
  $effect(() => { if (deck && deck.editionId !== app.editionId) app.editionId = deck.editionId; });
  const decks = $derived(app.decksOf(app.editionId));
  const base = $derived(deck ? app.cardsOf(deck.id) : decks.flatMap((d) => app.cardsOf(d.id)));
  /** Deck que serve de amostra ao editar a coleção: o aberto ou o primeiro deck de classe com cartas. */
  const themeDeck = $derived([deck, ...decks.filter((d) => d.kind === 'class'), ...decks].find((d) => d && app.cardsOf(d.id).length));
  const editionCount = $derived(decks.reduce((n, d) => n + app.cardsOf(d.id).length, 0));

  function openEdition(id: string) {
    selected = new Set();
    app.editionId = id;
    router.library();
  }

  /** Custo total para o filtro (-1 = sem custo). */
  const costKey = (c: Card) => (hasCost(c) ? costTotal(c) : -1);

  const types = $derived([...new Set(base.map((c) => c.text[lang].type).filter(Boolean))].sort());
  const tags = $derived([...new Set(base.flatMap((c) => c.tags))].sort());
  const costs = $derived([...new Set(base.map(costKey))].sort((a, b) => a - b));

  const filtered = $derived.by(() => {
    let list = base.filter((c) => {
      if (fType && c.text[lang].type !== fType) return false;
      if (fCost !== '' && String(costKey(c)) !== fCost) return false;
      if (fRarity && c.rarity !== fRarity) return false;
      if (fTag && !c.tags.includes(fTag)) return false;
      if (q) {
        const t = c.text[lang], p = c.text['pt-BR'], e = c.text['en-US'];
        const hay = `${t.name} ${t.type} ${t.subtype} ${t.rules} ${p.name} ${e.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'cost') list = [...list].sort((a, b) => costTotal(a) - costTotal(b) || a.n - b.n);
    if (sort === 'name') list = [...list].sort((a, b) => a.text[lang].name.localeCompare(b.text[lang].name));
    if (sort === 'rarity') list = [...list].sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.n - b.n);
    return list;
  });

  const filtering = $derived(!!(q || fType || fCost !== '' || fRarity || fTag));
  function clearFilters() { query = ''; q = ''; fType = ''; fCost = ''; fRarity = ''; fTag = ''; }

  // curva de custo do deck atual
  const curve = $derived.by(() => {
    const b = Array(8).fill(0) as number[];
    for (const c of base) b[Math.min(7, Math.max(0, costTotal(c)))]++;
    return b;
  });
  const maxCurve = $derived(Math.max(1, ...curve));

  /** Cartas no deck, contando as cópias (cartas da Mesa de teste podem ter várias). */
  function count(id: string) { return app.cardsOf(id).reduce((n, c) => n + (c.game?.copies ?? 1), 0); }
  /** Tamanho do deck na coleção do deck. */
  const sizeOf = (deckId: string) => app.edition(app.deck(deckId)?.editionId)?.deckSize ?? DECK_SIZE;
  const target = $derived(deck ? sizeOf(deck.id) : DECK_SIZE);
  const deckCount = $derived(deck ? count(deck.id) : base.length);

  function toggle(c: Card, range: boolean) {
    const next = new Set(selected);
    if (range && lastClicked) {
      const ids = filtered.map((x) => x.id);
      const [a, b] = [ids.indexOf(lastClicked), ids.indexOf(c.id)].sort((x, y) => x - y);
      for (const id of ids.slice(a, b + 1)) next.add(id);
    } else if (next.has(c.id)) next.delete(c.id);
    else next.add(c.id);
    lastClicked = c.id;
    selected = next;
  }

  // ── artes em lote ──
  let artInput: HTMLInputElement;
  /** Cartas com variações esperando a escolha (janela aberta). */
  let picking = $state<ArtGroup[] | null>(null);
  let pickMissing: string[] = [];

  async function importArts(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    artInput.value = '';
    const { groups, unmatched } = groupArtFiles(list);
    pickMissing = unmatched.map((f) => f + L(' (sem carta com esse nome)', ' (no card with that name)'));
    if (!groups.length) { reportArt(0, unmatched.map((f) => f + L(' (sem carta com esse nome)', ' (no card with that name)'))); return; }
    // alguma carta com mais de uma versão → deixa escolher; senão, aplica direto
    if (groups.some((g) => g.files.length > 1)) { picking = groups; return; }
    await finishArt(groups.map((g) => ({ card: g.card, file: g.files[0] })));
  }

  async function finishArt(choices: { card: Card; file: File }[]) {
    picking = null;
    if (!choices.length) return;
    let cancelled = false;
    ui.progress = { label: L('Colocando as artes nas cartas…', 'Placing the artwork on the cards…'), done: 0, total: choices.length, cancel: () => { cancelled = true; } };
    let r: { done: number; failed: string[] };
    try {
      r = await applyArt(choices, (n) => { if (ui.progress) ui.progress = { ...ui.progress, done: n }; }, () => cancelled);
    } finally {
      ui.progress = null;
    }
    // mostra a coleção que recebeu as artes (senão a Biblioteca pode estar em outra e "nada muda")
    const edId = app.deck(choices[0].card.deckId)?.editionId;
    if (edId && edId !== app.editionId) openEdition(edId);
    reportArt(r.done, [...r.failed.map((f) => f + L(' (erro ao ler)', ' (read error)')), ...pickMissing], app.edition(edId)?.name);
  }

  function reportArt(n: number, problems: string[], collection?: string) {
    const where = collection ? L(` da coleção “${collection}”`, ` in “${collection}”`) : '';
    const miss = problems.length ? L(` · não entraram: ${problems.slice(0, 6).join(', ')}${problems.length > 6 ? '…' : ''}`, ` · not added: ${problems.slice(0, 6).join(', ')}${problems.length > 6 ? '…' : ''}`) : '';
    const done = n === 1 ? L(`1 arte colocada na carta${where}`, `1 artwork placed${where}`) : L(`${n} artes colocadas nas cartas${where}`, `${n} artworks placed on cards${where}`);
    ui.toast(done + miss, problems.length ? 'error' : undefined, problems.length ? 10000 : 6000);
  }

  function newCard() {
    const target = deck ?? decks[0];
    const c = app.newCard(target.id);
    app.putCard(c);
    router.editor(c.id);
  }

  async function remove(ids: string[]) {
    const names = ids.slice(0, 3).map((id) => `“${app.cards[id]?.text[lang].name}”`).join(', ') + (ids.length > 3 ? '…' : '');
    const r = await ui.confirm({
      title: ids.length > 1 ? L(`Excluir ${ids.length} cartas?`, `Delete ${ids.length} cards?`) : L('Excluir carta?', 'Delete card?'),
      text: `${names}\n${L('Isso não pode ser desfeito.', 'This cannot be undone.')}`,
      ok: L('Excluir', 'Delete'), danger: true,
    });
    if (r !== 'ok') return;
    app.deleteCards(ids);
    selected = new Set();
    ui.toast(ids.length > 1 ? L(`${ids.length} cartas excluídas`, `${ids.length} cards deleted`) : L('Carta excluída', 'Card deleted'));
  }

  function duplicate(c: Card) {
    const copy = app.duplicate(c.id);
    ui.toast(L(`Cópia criada: “${copy.text[lang].name}”`, `Copy created: “${copy.text[lang].name}”`));
  }

  function moveTo(target: string) {
    const ids = [...selected];
    let n = Math.max(0, ...app.cardsOf(target).map((c) => c.n));
    app.putCards(ids.map((id) => ({ ...app.cards[id], deckId: target, n: ++n })));
    selected = new Set();
    ui.toast(L(`${ids.length} cartas movidas`, `${ids.length} cards moved`));
  }

  function resetLooks() {
    const ids = [...selected];
    app.putCards(ids.map((id) => ({ ...app.cards[id], look: undefined })));
    ui.toast(L('Aparência do tema do deck aplicada', 'Deck theme applied'));
  }

  // depois que a tela assenta, desenha o resto das cartas em segundo plano
  $effect(() => {
    const list = filtered;
    const t = setTimeout(() => warmCache(list), 1200);
    return () => clearTimeout(t);
  });

  // ───── coleções: criar e apagar ─────
  let newEd = $state<string | null>(null);
  const focusMe = (el: HTMLInputElement) => { setTimeout(() => el.focus(), 30); };
  function createEdition() {
    const id = app.addEdition(newEd ?? '');
    newEd = null;
    openEdition(id);
    ui.toast(L('Coleção criada, com os 9 decks vazios', 'Collection created, with the 9 decks empty'));
  }
  async function dropEdition() {
    const ed = app.edition();
    if (!ed) return;
    const using = app.heroesUsing(ed.id);
    if (using.length) { ui.toast(L(`Não dá para apagar: ${using.join(', ')} jogam com decks desta coleção. Troque o deck deles antes.`, `Cannot delete: ${using.join(', ')} play with decks of this collection. Change their deck first.`), 'error', 6000); return; }
    const r = await ui.confirm({
      title: L(`Apagar a coleção “${ed.name}”?`, `Delete the collection “${ed.name}”?`),
      text: L(`Os ${app.decksOf(ed.id).length} decks e as ${editionCount} cartas dela saem para sempre. Faça um backup antes (Configurações → Dados) se quiser guardar algo.`, `Its ${app.decksOf(ed.id).length} decks and ${editionCount} cards are gone for good. Make a backup first (Settings → Data) if you want to keep anything.`),
      ok: L('Apagar coleção', 'Delete collection'), danger: true,
    });
    if (r !== 'ok') return;
    if (app.removeEdition(ed.id)) { router.library(); ui.toast(L('Coleção apagada', 'Collection deleted')); }
  }

  const selCards = $derived([...selected].map((id) => app.cards[id]).filter(Boolean));
  const exportSet = $derived(selCards.length ? selCards : filtered);

</script>

<div class="lib">
  <aside class="decks">
    <div class="side-head">
      <span class="section-title">{L('Coleção', 'Collection')}</span>
      <select class="select edsel" value={app.editionId} onchange={(e) => openEdition((e.currentTarget as HTMLSelectElement).value)}>
        {#each app.project?.editions ?? [] as ed (ed.id)}<option value={ed.id}>{ed.name}</option>{/each}
      </select>
      <div class="edtools">
        <button class="btn sm ghost" onclick={() => (newEd = newEd === null ? '' : null)}><Plus size={14} /> {L('Nova', 'New')}</button>
        <button class="btn sm ghost" disabled={(app.project?.editions.length ?? 0) < 2} onclick={dropEdition} title={L('Apagar esta coleção', 'Delete this collection')}><Trash2 size={14} /> {L('Apagar', 'Delete')}</button>
      </div>
      {#if newEd !== null}
        <div class="edtools">
          <input class="input" use:focusMe placeholder={L('Nome da coleção', 'Collection name')} bind:value={newEd} onkeydown={(e) => { if (e.key === 'Enter') createEdition(); if (e.key === 'Escape') newEd = null; }} />
          <button class="btn sm primary" onclick={createEdition}>{L('Criar', 'Create')}</button>
        </div>
      {/if}
    </div>
    <button class="deck" class:on={!deck} onclick={() => { selected = new Set(); router.library(); }}>
      <span class="emb all"><Images size={17} /></span>
      <span class="dn">{L('Todas as cartas', 'All cards')}</span>
      <span class="cnt">{editionCount}</span>
    </button>
    {#each decks as d (d.id)}
      {@const n = count(d.id)}
      <button class="deck" class:on={deck?.id === d.id} onclick={() => { selected = new Set(); router.library(d.id); }}>
        <span class="emb" style="--c:{colorHex(d.colors[0])}"><Glyph id={classIcon(d.colors[0])} size={19} color={lighten(vivid(colorHex(d.colors[0])), 0.35)} /></span>
        <span class="dn">{deckLabel(d).main || COLORS[d.colors[0]].classes[lang]}<small>{deckLabel(d).small}</small></span>
        <span class="cnt" class:ok={n === sizeOf(d.id)} class:warn={n !== sizeOf(d.id) && d.kind === 'class'}>{n}{d.kind === 'class' ? `/${sizeOf(d.id)}` : ''}</span>
      </button>
    {/each}
  </aside>

  <section class="content">
    <header class="top">
      <div class="title">
        <h1>{deck ? deckLabel(deck).main || COLORS[deck.colors[0]].classes[lang] : L('Todas as cartas', 'All cards')}</h1>
        <p class="muted">
          {filtered.length}{filtering ? ` ${L('de', 'of')} ${base.length}` : ''} {L('cartas', 'cards')}
          {#if deck && deck.kind === 'class'}
            · {#if deckCount === target}<span class="ok-t"><CircleCheck size={13} /> {L('deck completo', 'deck complete')}</span>
            {:else}<span class="warn-t"><TriangleAlert size={13} /> {deckCount < target ? L(`faltam ${target - deckCount}`, `${target - deckCount} missing`) : L(`${deckCount - target} a mais`, `${deckCount - target} too many`)}</span>{/if}
          {/if}
        </p>
      </div>
      <div class="curve" title={L('Curva de custo', 'Cost curve')}>
        {#each curve as v, i}
          <div class="bar-col"><div class="bar" style="height:{(v / maxCurve) * 100}%"></div><span>{i === 7 ? '7+' : i}</span></div>
        {/each}
      </div>
      {#if themeDeck}
        <button class="btn" onclick={() => router.theme('collection', themeDeck.id)} title={L('Muda a aparência de todos os decks da coleção de uma vez (cada deck mantém as suas cores)', 'Change the look of every deck in the collection at once (each deck keeps its colors)')}><Paintbrush size={16} /> {L('Editar coleção', 'Edit collection')}</button>
      {/if}
      {#if deck && app.cardsOf(deck.id).length}
        <button class="btn" onclick={() => router.theme('deck', deck.id)} title={L('Muda a aparência de todas as cartas deste deck', 'Change the look of every card in this deck')}><Paintbrush size={16} /> {L('Editar este deck', 'Edit this deck')}</button>
      {/if}
      <button class="btn" onclick={() => artInput.click()} title={L('Escolha várias imagens: cada uma vai para a carta com o mesmo nome (ex.: pf-red_003.png ou corte-duplo.png)', 'Pick several images: each goes to the card with the same name (e.g. pf-red_003.png or corte-duplo.png)')}><ImageUp size={17} /> {L('Importar artes', 'Import art')}</button>
      <input type="file" accept="image/*" multiple hidden bind:this={artInput} onchange={(e) => importArts((e.currentTarget as HTMLInputElement).files)} />
      <button class="btn primary" onclick={newCard}><Plus size={17} /> {L('Nova carta', 'New card')}</button>
    </header>

    <div class="filters">
      <label class="search">
        <Search size={16} />
        <input placeholder={L('Buscar por nome, tipo ou texto…', 'Search name, type or text…')} bind:value={query} />
        {#if query}<button class="clear" onclick={() => (query = '')} aria-label={L('Limpar', 'Clear')}><X size={14} /></button>{/if}
      </label>
      <select class="select chipsel" class:set={fType} bind:value={fType}>
        <option value="">{L('Tipo', 'Type')}</option>{#each types as t}<option value={t}>{t}</option>{/each}
      </select>
      <select class="select chipsel" class:set={fCost !== ''} bind:value={fCost}>
        <option value="">{L('Custo', 'Cost')}</option>{#each costs as c}<option value={String(c)}>{c < 0 ? '—' : c}</option>{/each}
      </select>
      <select class="select chipsel" class:set={fRarity} bind:value={fRarity}>
        <option value="">{L('Raridade', 'Rarity')}</option>{#each RARITY_ORDER as r}<option value={r}>{RARITIES[r].name[lang]}</option>{/each}
      </select>
      {#if tags.length}
        <select class="select chipsel" class:set={fTag} bind:value={fTag}>
          <option value="">{L('Etiqueta', 'Tag')}</option>{#each tags as t}<option value={t}>{t}</option>{/each}
        </select>
      {/if}
      {#if filtering}<button class="btn sm ghost" onclick={clearFilters}><X size={14} /> {L('Limpar filtros', 'Clear filters')}</button>{/if}
      <div class="grow"></div>
      <select class="select chipsel" bind:value={sort} title={L('Ordenar', 'Sort')}>
        <option value="n">{L('Nº da coleção', 'Collector #')}</option>
        <option value="cost">{L('Custo', 'Cost')}</option>
        <option value="name">{L('Nome', 'Name')}</option>
        <option value="rarity">{L('Raridade', 'Rarity')}</option>
      </select>
      <label class="size" title={L('Tamanho das cartas', 'Card size')}><SlidersHorizontal size={15} /><input type="range" min="150" max="380" bind:value={tile} /></label>
    </div>

    <div class="grid-wrap">
      {#if filtered.length}
        <CardGrid cards={filtered} {tile} {selected} onopen={(c) => router.editor(c.id)} ontoggle={toggle}
          onduplicate={duplicate} ondelete={(c) => remove([c.id])} />
      {:else}
        <div class="empty">
          <p>{filtering ? L('Nenhuma carta com esses filtros.', 'No cards match these filters.') : L('Este deck ainda não tem cartas.', 'This deck has no cards yet.')}</p>
          {#if filtering}<button class="btn" onclick={clearFilters}>{L('Limpar filtros', 'Clear filters')}</button>
          {:else}<button class="btn primary" onclick={newCard}><Plus size={16} /> {L('Criar a primeira', 'Create the first one')}</button>{/if}
        </div>
      {/if}
    </div>

    <footer class="bulk" class:open={true}>
      {#if selected.size}
        <span><b>{selected.size}</b> {L('selecionadas', 'selected')}</span>
        <button class="btn sm ghost" onclick={() => (selected = new Set())}>{L('Limpar', 'Clear')}</button>
        <div class="grow"></div>
        <select class="select chipsel" onchange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; if (v) moveTo(v); (e.currentTarget as HTMLSelectElement).value = ''; }}>
          <option value="">{L('Mover para…', 'Move to…')}</option>
          {#each app.project?.editions ?? [] as ed (ed.id)}
            <optgroup label={ed.name}>{#each app.decksOf(ed.id) as d (d.id)}<option value={d.id}>{d.name[lang]}</option>{/each}</optgroup>
          {/each}
        </select>
        <button class="btn sm" onclick={resetLooks} title={L('Remove ajustes individuais e usa o tema do deck', 'Remove per-card tweaks and use the deck theme')}><Paintbrush size={15} /> {L('Usar tema do deck', 'Use deck theme')}</button>
        <button class="btn sm danger" onclick={() => remove([...selected])}><Trash2 size={15} /> {L('Excluir', 'Delete')}</button>
      {:else}
        <span class="muted">{L('Dica: Ctrl+clique ou Shift+clique para selecionar várias.', 'Tip: Ctrl+click or Shift+click to select several.')}</span>
        <div class="grow"></div>
      {/if}
      <button class="btn sm" onclick={() => exportPngZip(exportSet)}><FolderInput size={15} /> {L('PNG (zip)', 'PNG (zip)')}</button>
      <button class="btn sm" onclick={() => exportPdf(exportSet)}><FileDown size={15} /> {L('PDF para imprimir', 'Print PDF')}</button>
    </footer>
  </section>
</div>


{#if picking}
  <ArtPicker groups={picking} onconfirm={finishArt} oncancel={() => (picking = null)} />
{/if}

<style>
  .lib { display: grid; grid-template-columns: 268px 1fr; height: 100%; }
  .decks { border-right: 1px solid var(--line); background: var(--bg-2); padding: 18px 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
  .side-head { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 7px; }
  .edsel { width: 100%; font-weight: 600; }
  .edtools { display: flex; gap: 6px; } .edtools .input { flex: 1; min-width: 0; }
  .deck { display: flex; align-items: center; gap: 11px; width: 100%; padding: 8px 10px; border: 0; border-radius: 10px; background: none; color: var(--text-2);
    text-align: left; cursor: pointer; transition: background var(--t); font: inherit; }
  .deck:hover { background: var(--surface-2); color: var(--text); }
  .deck.on { background: var(--surface-3); color: var(--text); box-shadow: inset 3px 0 0 var(--accent); }
  .emb { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; flex: none;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #000), color-mix(in srgb, var(--c) 25%, #000));
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / .08); }
  .emb.all { background: var(--surface-3); color: var(--accent); }
  .dn { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 500; line-height: 1.25; }
  .dn small { display: block; font-size: 11.5px; color: var(--muted); font-weight: 400; }
  .cnt { font-size: 11.5px; font-variant-numeric: tabular-nums; color: var(--muted); padding: 2px 7px; border-radius: 6px; background: var(--surface); }
  .cnt.ok { color: var(--ok); }
  .cnt.warn { color: #e8b25a; }

  .content { display: grid; grid-template-rows: auto auto 1fr auto; min-width: 0; min-height: 0; }
  .top { display: flex; align-items: center; gap: 24px; padding: 22px 28px 14px; }
  .title { flex: 1; min-width: 0; }
  h1 { font-size: 22px; }
  .title p { margin: 2px 0 0; font-size: 13px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .ok-t, .warn-t { display: inline-flex; gap: 4px; align-items: center; }
  .ok-t { color: var(--ok); } .warn-t { color: #e8b25a; }
  .curve { display: flex; gap: 5px; align-items: flex-end; height: 46px; }
  .bar-col { display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; justify-content: flex-end; width: 16px; }
  .bar { width: 100%; min-height: 2px; background: linear-gradient(180deg, var(--accent-2), var(--accent)); border-radius: 3px 3px 1px 1px; opacity: .85; }
  .bar-col span { font-size: 10px; color: var(--muted); }

  .filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 0 28px 14px; border-bottom: 1px solid var(--line); }
  .search { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 10px; border-radius: 9px; border: 1px solid var(--line-2); background: var(--bg-2);
    width: min(360px, 100%); color: var(--muted); }
  .search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .search input { flex: 1; min-width: 0; border: 0; background: none; color: var(--text); font: 14px var(--ui); outline: none; }
  .clear { border: 0; background: none; color: var(--muted); cursor: pointer; display: grid; }
  .chipsel { width: auto; height: 34px; border-radius: 99px; font-size: 13px; padding-left: 14px; }
  .chipsel.set { border-color: rgb(216 176 106 / .55); color: var(--accent-2); background-color: var(--accent-soft); }
  .size { display: flex; align-items: center; gap: 8px; color: var(--muted); }
  .size input { width: 110px; }

  .grid-wrap { min-height: 0; padding-top: 16px; }
  .empty { display: grid; place-content: center; justify-items: center; gap: 12px; height: 100%; color: var(--muted); }

  .bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 28px; border-top: 1px solid var(--line); background: var(--bg-2); font-size: 13px; }

  @keyframes zin { from { opacity: 0; transform: scale(.97); } }

  @media (max-width: 1000px) { .curve { display: none; } }
  @media (max-width: 760px) {
    .lib { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .decks { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--line); padding: 8px; }
    .side-head { padding: 0 4px 0 0; flex: none; justify-content: center; }
    .side-head .section-title { display: none; }
    .edsel { width: 150px; }
    .deck { width: auto; flex: none; }
    .dn small, .cnt { display: none; }
    .top, .filters, .bulk { padding-left: 14px; padding-right: 14px; }
  }
</style>
