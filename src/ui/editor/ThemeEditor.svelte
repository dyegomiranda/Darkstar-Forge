<!--
  Tema do deck ou modelo da coleção (aberto pela Biblioteca).

  À esquerda, os mesmos controles de aparência da carta; à direita, uma carta de
  amostra (sem os ajustes próprios dela) e, no modelo da coleção, como cada deck
  fica. Nada é gravado até "Aplicar".
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { ArrowLeft, ChevronLeft, ChevronRight, Undo2, Redo2, RotateCcw, Check } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { router } from '../../app/router.svelte';
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';
  import type { DeckKind } from '../../model/types';
  import { EditorState, type LookScope } from './editor.svelte';
  import CardLive from './CardLive.svelte';
  import TabLook from './TabLook.svelte';
  import LookPreview from './LookPreview.svelte';

  let { scope, deckId }: { scope: Exclude<LookScope, 'card'>; deckId: string } = $props();

  const deck = app.deck(deckId);
  const cards = deck ? app.cardsOf(deck.id) : [];
  // amostra inicial: de preferência uma carta com custo, ataque e defesa (mostra todas as peças)
  let at = $state(Math.max(0, cards.findIndex((c) => c.stats && c.cost.length)));
  const ed = deck && cards.length ? new EditorState(cards[at], scope, true) : null;
  const edition = deck ? app.edition(deck.editionId) : undefined;

  function sample(i: number) { if (!ed) return; at = (i + cards.length) % cards.length; ed.setSample(cards[at]); }

  const KINDS: { id: DeckKind; pt: string; en: string }[] = [
    { id: 'class', pt: 'Decks de classe', en: 'Class decks' }, { id: 'resources', pt: 'Recursos', en: 'Resources' }, { id: 'equipment', pt: 'Equipamentos', en: 'Equipment' },
  ];
  const kindCount = (k: DeckKind) => (deck ? app.decksOf(deck.editionId).filter((d) => d.kind === k).length : 0);
  const count = $derived(ed ? ed.scopeCount : 0);
  /** Uma carta de exemplo de cada deck que recebe a mudança. */
  const samples = $derived(ed && scope === 'collection' ? ed.targets.map((d) => ({ deck: d, card: app.cardsOf(d.id)[0] })).filter((x) => !!x.card) : []);
  const where = $derived(scope === 'deck'
    ? L(`nas ${count} cartas deste deck`, `to the ${count} cards of this deck`)
    : L(`em ${ed?.targets.length ?? 0} decks da coleção (${count} cartas)`, `to ${ed?.targets.length ?? 0} decks of the collection (${count} cards)`));

  async function apply() {
    if (!ed) return;
    const r = await ui.confirm({
      title: L('Aplicar o tema?', 'Apply the theme?'),
      text: L(`As mudanças passam a valer ${where}.\nCartas que tinham ajuste próprio nas mesmas peças passam a seguir o tema.`, `The changes will apply ${where}.\nCards with their own tweak on the same pieces will follow the theme.`),
      ok: L('Aplicar', 'Apply'),
    });
    if (r !== 'ok') return;
    const others = ed.save();
    ui.toast(L(`Tema aplicado ${where}${others ? ` — ${others} cartas deixaram os ajustes próprios nessas peças` : ''}`, `Theme applied ${where}${others ? ` — ${others} cards dropped their own tweaks on those pieces` : ''}`), 'ok', 5000);
  }

  async function askLeave(): Promise<boolean> {
    if (!ed?.dirty) return true;
    const r = await ui.confirm({
      title: L('Mudanças não aplicadas', 'Changes not applied'),
      text: L('O tema tem mudanças que ainda não foram aplicadas.', 'The theme has changes that have not been applied yet.'),
      ok: L('Aplicar e sair', 'Apply and leave'), third: L('Descartar', 'Discard'), cancel: L('Continuar editando', 'Keep editing'),
    });
    if (r === 'ok') { ed.save(); return true; }
    if (r === 'third') { ed.discard(); return true; }
    return false;
  }
  router.guard = askLeave;
  onDestroy(() => { if (router.guard === askLeave) router.guard = null; });

  function key(e: KeyboardEvent) {
    if (!ed) return;
    const mod = e.ctrlKey || e.metaKey, tag = (e.target as HTMLElement)?.tagName;
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { if (tag === 'TEXTAREA' || tag === 'INPUT') return; e.preventDefault(); ed.undo(); }
    else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); ed.redo(); }
  }
</script>

<svelte:window onkeydown={key} onbeforeunload={(e) => { if (ed?.dirty) e.preventDefault(); }} />

{#if !ed || !deck}
  <div class="missing">
    <p>{L('Este deck ainda não tem cartas para servir de amostra.', 'This deck has no cards yet to serve as a sample.')}</p>
    <button class="btn" onclick={() => router.library(deckId)}>{L('Voltar à biblioteca', 'Back to library')}</button>
  </div>
{:else}
  <div class="editor">
    <header class="bar">
      <button class="btn ghost icon" title={L('Voltar à biblioteca', 'Back to library')} onclick={() => router.library(scope === 'deck' ? deck.id : undefined)}><ArrowLeft size={18} /></button>
      <div class="crumb">
        <span class="muted">{scope === 'deck' ? L('Tema do deck', 'Deck theme') : L('Modelo da coleção', 'Collection template')}</span>
        <h1>{scope === 'deck' ? deck.name[app.lang] : edition?.name ?? ''}</h1>
      </div>
      <div class="grow"></div>
      <button class="btn sm icon ghost" disabled={!ed.canUndo} title={L('Desfazer (Ctrl+Z)', 'Undo (Ctrl+Z)')} onclick={() => ed.undo()}><Undo2 size={17} /></button>
      <button class="btn sm icon ghost" disabled={!ed.canRedo} title={L('Refazer (Ctrl+Y)', 'Redo (Ctrl+Y)')} onclick={() => ed.redo()}><Redo2 size={17} /></button>
      <span class="sep"></span>
      {#if ed.dirty}
        <span class="dirty">{L('Não aplicado', 'Not applied')}</span>
        <button class="btn sm" onclick={() => ed.discard()}><RotateCcw size={15} /> {L('Descartar', 'Discard')}</button>
      {/if}
      <button class="btn sm primary" disabled={!ed.dirty} onclick={apply}><Check size={15} />
        {scope === 'deck' ? L(`Aplicar ao deck (${count} cartas)`, `Apply to deck (${count} cards)`) : L(`Aplicar à coleção (${count} cartas)`, `Apply to collection (${count} cards)`)}</button>
    </header>

    <div class="body">
      <aside class="panel-side"><div class="tab-body"><TabLook {ed} /></div></aside>
      <section class="stage">
        <div class="stage-inner" class:wide={scope === 'collection'}>
          <div class="main">
            <CardLive {ed} />
            <div class="nav">
              <button class="btn sm icon ghost" title={L('Amostra anterior', 'Previous sample')} onclick={() => sample(at - 1)}><ChevronLeft size={17} /></button>
              <span class="muted">{L('Carta de amostra', 'Sample card')} {at + 1}/{cards.length} · {deck.name[app.lang]}</span>
              <button class="btn sm icon ghost" title={L('Próxima amostra', 'Next sample')} onclick={() => sample(at + 1)}><ChevronRight size={17} /></button>
            </div>
            <p class="hint muted">{L('A amostra aparece só com o tema, sem os ajustes próprios da carta.', 'The sample shows the theme only, without the card\'s own tweaks.')}</p>
          </div>
          {#if scope === 'collection'}
            <div class="side">
              <span class="section-title">{L('Quais decks recebem as mudanças', 'Which decks get the changes')}</span>
              <div class="kchecks">
                {#each KINDS.filter((k) => kindCount(k.id) > 0) as k}
                  <label class="toggle"><input type="checkbox" checked={ed.kinds.includes(k.id)} onchange={() => ed.toggleKind(k.id)} /> {L(k.pt, k.en)} <small>({kindCount(k.id)})</small></label>
                {/each}
              </div>
              <p class="muted small">{L('Só o que você mexer vai para os outros decks; cada deck mantém as suas cores e o seu símbolo de classe.', 'Only what you change goes to the other decks; each deck keeps its colors and its class symbol.')}</p>
              <span class="section-title">{L('Como cada deck fica', 'How each deck will look')}</span>
              <div class="samples">
                {#each samples as x (x.deck.id)}<LookPreview card={x.card} look={ed.previewLook(x.deck)} label={x.deck.name[app.lang]} />{/each}
              </div>
            </div>
          {/if}
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
  .sep { width: 1px; height: 22px; background: var(--line-2); margin: 0 4px; }
  .dirty { font-size: 12px; color: #e8b25a; margin-right: 4px; }
  .body { display: grid; grid-template-columns: minmax(380px, 460px) 1fr; min-height: 0; }
  .panel-side { border-right: 1px solid var(--line); min-height: 0; background: var(--bg); display: grid; }
  .tab-body { overflow-y: auto; padding: 20px 20px 60px; min-height: 0; }
  .stage { min-width: 0; min-height: 0; overflow: auto; display: grid; place-items: center; padding: 28px; background: radial-gradient(ellipse at 50% 40%, #1d1917 0%, #0c0b0a 70%); }
  .stage-inner { width: min(440px, 100%, calc((100vh - 210px) / 1.4)); }
  .stage-inner.wide { width: min(900px, 100%); display: grid; grid-template-columns: minmax(240px, min(400px, calc((100vh - 210px) / 1.4))) minmax(220px, 1fr); gap: 28px; align-items: start; }
  .nav { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 12.5px; }
  .hint { text-align: center; font-size: 12px; margin: 6px 0 0; }
  .side { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 12px; border: 1px solid var(--line); background: rgb(0 0 0 / .35); }
  .kchecks { display: flex; flex-direction: column; gap: 6px; }
  .kchecks small { color: var(--muted); }
  .toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .small { font-size: 12.5px; margin: 0; }
  .samples { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; }
  @media (max-width: 980px) {
    .body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; overflow-y: auto; }
    .stage { order: -1; padding: 18px; }
    .stage-inner.wide { grid-template-columns: 1fr; }
    .panel-side { border-right: 0; border-top: 1px solid var(--line); }
    .tab-body { overflow: visible; }
  }
</style>
