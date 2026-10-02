<script lang="ts">
  import { onDestroy } from 'svelte';
  import { ArrowLeft, ChevronLeft, ChevronRight, Undo2, Redo2, Save, RotateCcw, Copy, Trash2, ImageDown, Type, Swords, Image, Palette } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { router } from '../../app/router.svelte';
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';
  import { COLORS } from '../../model/catalog';
  import { exportPng } from '../../export/exporters.svelte';
  import { EditorState } from './editor.svelte';
  import CardLive from './CardLive.svelte';
  import TabText from './TabText.svelte';
  import TabGame from './TabGame.svelte';
  import TabArt from './TabArt.svelte';
  import TabLook from './TabLook.svelte';

  let { id }: { id: string } = $props();

  // svelte-ignore state_referenced_locally (a tela é recriada a cada rota: o valor inicial é o que vale)
  const card = app.cards[id];
  const ed = card ? new EditorState(card) : null;
  let tab = $state<'text' | 'game' | 'art' | 'look'>((sessionStorage.getItem('forge.tab') as 'text') ?? 'text');
  $effect(() => { sessionStorage.setItem('forge.tab', tab); });

  const siblings = $derived(ed ? app.cardsOf(ed.draft.deckId) : []);
  const idx = $derived(siblings.findIndex((c) => c.id === id));

  async function askLeave(): Promise<boolean> {
    if (!ed?.dirty) return true;
    const r = await ui.confirm({
      title: L('Alterações não salvas', 'Unsaved changes'),
      text: L(`“${ed.draft.text[ed.lang].name}” tem alterações que ainda não foram salvas.`, `“${ed.draft.text[ed.lang].name}” has unsaved changes.`),
      ok: L('Salvar e sair', 'Save and leave'), third: L('Descartar', 'Discard'), cancel: L('Continuar editando', 'Keep editing'),
    });
    if (r === 'ok') { save(); return true; }
    if (r === 'third') { ed.discard(); return true; }
    return false;
  }
  router.guard = askLeave;
  onDestroy(() => { if (router.guard === askLeave) router.guard = null; });

  function save() {
    if (!ed) return;
    const theme = ed.themeDirty;
    const others = ed.save();
    if (!theme) ui.toast(L('Carta salva', 'Card saved'));
    else ui.toast(L(`Tema aplicado${others ? ` — ${others} cartas deixaram os ajustes próprios nessas peças e passaram a seguir o tema` : ''}`,
      `Theme applied${others ? ` — ${others} cards dropped their own tweaks on those pieces to follow the theme` : ''}`), 'ok', 5000);
  }

  async function remove() {
    if (!ed) return;
    const r = await ui.confirm({ title: L('Excluir carta?', 'Delete card?'), text: `“${ed.draft.text[ed.lang].name}”\n${L('Isso não pode ser desfeito.', 'This cannot be undone.')}`, ok: L('Excluir', 'Delete'), danger: true });
    if (r !== 'ok') return;
    const deck = ed.draft.deckId;
    app.deleteCards([ed.draft.id]);
    router.guard = null;
    router.library(deck);
  }

  async function duplicate() {
    if (!ed) return;
    if (ed.dirty) save();
    const c = app.duplicate(ed.draft.id);
    router.editor(c.id);
  }

  function key(e: KeyboardEvent) {
    if (!ed) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return; e.preventDefault(); ed.undo(); }
    else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); ed.redo(); }
  }

  const TABS = [
    { id: 'text', icon: Type, pt: 'Texto', en: 'Text' },
    { id: 'game', icon: Swords, pt: 'Jogo', en: 'Game' },
    { id: 'art', icon: Image, pt: 'Arte', en: 'Art' },
    { id: 'look', icon: Palette, pt: 'Aparência', en: 'Look' },
  ] as const;
</script>

<svelte:window onkeydown={key} onbeforeunload={(e) => { if (ed?.dirty) e.preventDefault(); }} />

{#if !ed}
  <div class="missing">
    <p>{L('Esta carta não existe mais.', 'This card no longer exists.')}</p>
    <button class="btn" onclick={() => router.library()}>{L('Voltar à biblioteca', 'Back to library')}</button>
  </div>
{:else}
  <div class="editor">
    <header class="bar">
      <button class="btn ghost icon" title={L('Voltar à biblioteca', 'Back to library')} onclick={() => router.library(ed.draft.deckId)}><ArrowLeft size={18} /></button>
      <div class="crumb">
        <span class="muted">{COLORS[ed.deck.colors[0]].classes[app.lang]}</span>
        <h1>{ed.draft.text[ed.lang].name || L('(sem nome)', '(untitled)')}</h1>
      </div>
      <div class="nav">
        <button class="btn sm icon ghost" disabled={idx <= 0} title={L('Carta anterior', 'Previous card')} onclick={() => router.editor(siblings[idx - 1].id)}><ChevronLeft size={17} /></button>
        <span class="muted pos">{idx + 1}/{siblings.length}</span>
        <button class="btn sm icon ghost" disabled={idx < 0 || idx >= siblings.length - 1} title={L('Próxima carta', 'Next card')} onclick={() => router.editor(siblings[idx + 1].id)}><ChevronRight size={17} /></button>
      </div>
      <div class="grow"></div>
      <button class="btn sm icon ghost" disabled={!ed.canUndo} title={L('Desfazer (Ctrl+Z)', 'Undo (Ctrl+Z)')} onclick={() => ed.undo()}><Undo2 size={17} /></button>
      <button class="btn sm icon ghost" disabled={!ed.canRedo} title={L('Refazer (Ctrl+Y)', 'Redo (Ctrl+Y)')} onclick={() => ed.redo()}><Redo2 size={17} /></button>
      <span class="sep"></span>
      <button class="btn sm icon ghost" title={L('Exportar PNG', 'Export PNG')} onclick={() => exportPng(ed.draft)}><ImageDown size={17} /></button>
      <button class="btn sm icon ghost" title={L('Duplicar', 'Duplicate')} onclick={duplicate}><Copy size={17} /></button>
      <button class="btn sm icon ghost" title={L('Excluir', 'Delete')} onclick={remove}><Trash2 size={17} /></button>
      <span class="sep"></span>
      {#if ed.dirty}
        <span class="dirty">{L('Não salvo', 'Unsaved')}</span>
        <button class="btn sm" onclick={() => ed.discard()}><RotateCcw size={15} /> {L('Descartar', 'Discard')}</button>
      {/if}
      <button class="btn sm primary" disabled={!ed.dirty} onclick={save}><Save size={15} />
        {ed.themeDirty ? L(`Salvar e aplicar (${ed.scopeCount} cartas)`, `Save & apply (${ed.scopeCount} cards)`) : L('Salvar', 'Save')} <span class="kbd">Ctrl S</span></button>
    </header>

    <div class="body">
      <aside class="panel-side">
        <nav class="tabs">
          {#each TABS as t}
            <button class:on={tab === t.id} onclick={() => (tab = t.id)}><t.icon size={16} /> {L(t.pt, t.en)}</button>
          {/each}
        </nav>
        <div class="tab-body">
          {#if tab === 'text'}<TabText {ed} />
          {:else if tab === 'game'}<TabGame {ed} />
          {:else if tab === 'art'}<TabArt {ed} />
          {:else}<TabLook {ed} />{/if}
        </div>
      </aside>
      <section class="stage">
        <div class="stage-inner">
          <CardLive {ed} />
          <p class="hint muted">
            {#if ed.draft.art.mediaId}{L('Arraste a carta para enquadrar a arte · Ctrl + roda para aproximar', 'Drag the card to frame the art · Ctrl + wheel to zoom')}
            {:else}{L('Sem arte — adicione uma na aba Arte', 'No art — add one in the Art tab')}{/if}
          </p>
        </div>
      </section>
    </div>
  </div>
{/if}

<style>
  .missing { height: 100%; display: grid; place-content: center; justify-items: center; gap: 12px; color: var(--muted); }
  .editor { display: grid; grid-template-rows: auto 1fr; height: 100%; }
  .bar { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-bottom: 1px solid var(--line); background: var(--bg-2); flex-wrap: wrap; }
  .crumb { min-width: 0; margin-left: 4px; }
  .crumb span { font-size: 11.5px; display: block; line-height: 1.2; }
  .crumb h1 { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 38vw; }
  .nav { display: flex; align-items: center; gap: 2px; margin-left: 10px; }
  .pos { font-size: 12px; font-variant-numeric: tabular-nums; min-width: 44px; text-align: center; }
  .sep { width: 1px; height: 22px; background: var(--line-2); margin: 0 4px; }
  .dirty { font-size: 12px; color: #e8b25a; margin-right: 4px; }
  .primary .kbd { border-color: rgb(0 0 0 / .25); color: rgb(0 0 0 / .55); }

  .body { display: grid; grid-template-columns: minmax(380px, 460px) 1fr; min-height: 0; }
  .panel-side { border-right: 1px solid var(--line); display: grid; grid-template-rows: auto 1fr; min-height: 0; background: var(--bg); }
  .tabs { display: flex; gap: 2px; padding: 10px 12px 0; border-bottom: 1px solid var(--line); }
  .tabs button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; height: 40px; border: 0; background: none;
    color: var(--muted); font: 500 13px var(--ui); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tabs button:hover { color: var(--text); }
  .tabs button.on { color: var(--accent-2); border-bottom-color: var(--accent); }
  .tab-body { overflow-y: auto; padding: 20px 20px 60px; min-height: 0; }

  .stage { min-width: 0; min-height: 0; overflow: auto; display: grid; place-items: center; padding: 28px;
    background: radial-gradient(ellipse at 50% 40%, #1d1917 0%, #0c0b0a 70%); }
  .stage-inner { width: min(460px, 100%, calc((100vh - 170px) / 1.4)); }
  .hint { text-align: center; font-size: 12px; margin-top: 14px; }

  @media (max-width: 980px) {
    .body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; overflow-y: auto; }
    .stage { order: -1; padding: 18px; }
    .stage-inner { width: min(340px, 90vw); }
    .panel-side { border-right: 0; border-top: 1px solid var(--line); }
    .tab-body { overflow: visible; }
    .crumb h1 { max-width: 50vw; }
  }
</style>
