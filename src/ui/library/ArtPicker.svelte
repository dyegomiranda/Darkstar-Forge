<!--
  Escolher a arte de cada carta quando há variações (pf-red_001.png, pf-red_001__v2.png…).
  Lista com miniaturas + visualização ampliada (só a arte ou já na carta), navegável pelo teclado:
  ← → muda de carta · 1 2 3… escolhe a versão · 0 = nenhuma · Esc fecha.
-->
<script lang="ts">
  import { Check, X, Maximize2, ChevronLeft, ChevronRight, Image as ImageIcon, RectangleVertical, Sparkles, LoaderCircle } from '@lucide/svelte';
  import { onDestroy } from 'svelte';
  import { L } from '../../app/i18n.svelte';
  import { app } from '../../store/project.svelte';
  import { cardInput } from '../../render/card';
  import { compose } from '../../render/compose';
  import { ctxFor, ensureCardMedia } from '../common/cardCtx';
  import type { ArtGroup } from '../../export/artImport';
  import type { Card } from '../../model/types';
  import { comfyReady, generateArt, promptFor } from '../../export/comfy';
  import { ui } from '../../app/ui.svelte';

  let { groups, onconfirm, oncancel }: {
    groups: ArtGroup[];
    onconfirm: (choices: { card: Card; file: File }[]) => void;
    oncancel: () => void;
  } = $props();

  // miniaturas das imagens (liberadas ao fechar)
  const urls = new Map<File, string>();
  const url = (f: File) => { let u = urls.get(f); if (!u) { u = URL.createObjectURL(f); urls.set(f, u); } return u; };
  onDestroy(() => { for (const u of urls.values()) URL.revokeObjectURL(u); });

  // ── gerar mais variações pelo ComfyUI (quando nenhuma serviu) ──
  /** Imagens novas geradas nesta janela, por carta (somam-se às que vieram da pasta). */
  let extra = $state<Record<string, File[]>>({});
  const filesOf = (g: ArtGroup): File[] => [...g.files, ...(extra[g.card.id] ?? [])];
  /** Carta com a caixa de prompt aberta e o texto de cada uma. */
  let asking = $state<string | null>(null);
  let promptText = $state<Record<string, string>>({});
  /** Quantas imagens ainda estão sendo geradas, por carta. */
  let busy = $state<Record<string, number>>({});
  let closed = false;
  onDestroy(() => { closed = true; });

  function openPrompt(g: ArtGroup) {
    promptText[g.card.id] ??= promptFor(g.card);
    asking = asking === g.card.id ? null : g.card.id;
  }

  async function more(g: ArtGroup, n = 2) {
    const id = g.card.id;
    if (!(await comfyReady())) { ui.toast(L('Não achei o ComfyUI. Abra o ComfyUI e tente de novo.', 'ComfyUI not found. Open ComfyUI and try again.'), 'error', 7000); return; }
    asking = null;
    busy[id] = (busy[id] ?? 0) + n;
    const base = `${g.card.deckId}_${String(g.card.n).padStart(3, '0')}`;
    for (let i = 0; i < n; i++) {
      try {
        const f = await generateArt(promptText[id] ?? promptFor(g.card), `${base}__g${Date.now()}.png`, () => closed);
        extra[id] = [...(extra[id] ?? []), f];
      } catch (e) {
        if (!closed) ui.toast(L('Não consegui gerar: ', 'Could not generate: ') + (e instanceof Error ? e.message : String(e)), 'error', 8000);
        busy[id] = Math.max(0, (busy[id] ?? 0) - (n - i));
        return;
      }
      busy[id] = Math.max(0, (busy[id] ?? 0) - 1);
    }
  }

  // ── escolhas guardadas: reabrir com os mesmos arquivos traz as escolhas de volta ──
  const SAVED = 'darkstar.escolhasArte';
  /** Carta → nome do arquivo escolhido ('' = nenhuma). */
  let saved: Record<string, string> = {};
  try { saved = JSON.parse(localStorage.getItem(SAVED) ?? '{}') ?? {}; } catch { saved = {}; }

  /** Escolha por carta: índice da imagem ou -1 (nenhuma). Começa na escolha guardada ou na 1ª. */
  let pick = $state<Record<string, number>>(Object.fromEntries(groups.map((g) => {
    const s = saved[g.card.id];
    if (s === '') return [g.card.id, -1];
    const i = s ? g.files.findIndex((f) => f.name === s) : -1;
    return [g.card.id, i >= 0 ? i : 0];
  })));
  const restored = groups.filter((g) => saved[g.card.id] !== undefined).length;

  // grava a cada mudança (sobrevive a fechar a janela ou o programa)
  $effect(() => {
    const out = { ...saved };
    for (const g of groups) { const i = pick[g.card.id]; out[g.card.id] = i >= 0 ? filesOf(g)[i]?.name ?? '' : ''; }
    try { localStorage.setItem(SAVED, JSON.stringify(out)); } catch { /* sem armazenamento local */ }
  });
  const chosen = $derived(groups.filter((g) => pick[g.card.id] >= 0).length);
  const nameOf = (c: Card) => c.text[app.lang]?.name ?? c.text['pt-BR'].name;

  function confirm() {
    onconfirm(groups.filter((g) => pick[g.card.id] >= 0 && filesOf(g)[pick[g.card.id]]).map((g) => ({ card: g.card, file: filesOf(g)[pick[g.card.id]] })));
  }

  // ── visualização ampliada ──
  let zoom = $state<number | null>(null);
  let mode = $state<'arte' | 'carta'>('arte');
  const zg = $derived(zoom === null ? null : groups[zoom]);
  let ready = $state(0);

  /** A carta desenhada com esta imagem no lugar da arte (sem gravar nada). */
  function cardWith(g: ArtGroup, f: File, i: number): string {
    void ready;
    const ctx = ctxFor(g.card);
    if (!ctx) return '';
    const inp = cardInput(g.card, ctx);
    inp.uid = `pick-${i}`;
    inp.art = { src: url(f), zoom: 1, x: 0, y: 0, mirror: false };
    return compose(inp);
  }
  // logo da edição e imagens de peças/símbolos precisam estar carregados para desenhar a carta
  $effect(() => { if (zg && mode === 'carta') void ensureCardMedia(zg.card).then(() => ready++); });

  function go(delta: number) {
    if (zoom === null) return;
    zoom = Math.min(groups.length - 1, Math.max(0, zoom + delta));
  }

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); if (zoom !== null) zoom = null; else oncancel(); return; }
    if (zoom === null || !zg) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === '0') pick[zg.card.id] = -1;
    else if (/^[1-9]$/.test(e.key) && +e.key <= filesOf(zg).length) pick[zg.card.id] = +e.key - 1;
  }
</script>

<svelte:window onkeydown={key} />

<div class="backdrop" role="presentation">
  <div class="dialog" role="dialog" aria-modal="true" aria-label={L('Escolher as artes', 'Choose the artwork')}>
    <header>
      <div class="grow">
        <h2>{L('Escolha a arte de cada carta', 'Choose each card\'s artwork')}</h2>
        <p class="muted">{L('Clique na melhor versão de cada carta. Use "Ver grande" para olhar os detalhes. Suas escolhas ficam guardadas.', 'Click the best version for each card. Use "View large" to see the details. Your choices are saved.')}</p>
        {#if restored}<p class="restored">{L(`${restored} escolhas anteriores foram recuperadas.`, `${restored} earlier choices were restored.`)}</p>{/if}
      </div>
      <button class="btn ghost icon close" title={L('Fechar sem importar (Esc)', 'Close without importing (Esc)')} onclick={oncancel}><X size={18} /></button>
    </header>
    <div class="list">
      {#each groups as g, gi (g.card.id)}
        <div class="row">
          <div class="name">
            <b>{nameOf(g.card)}</b><small>#{String(g.card.n).padStart(3, '0')}</small>
            <button class="btn sm" onclick={() => (zoom = gi)}><Maximize2 size={14} /> {L('Ver grande', 'View large')}</button>
            <button class="btn sm" disabled={!!busy[g.card.id]} onclick={() => openPrompt(g)} title={L('Nenhuma serviu? Gera novas variações pelo ComfyUI (ele precisa estar aberto).', 'None works? Generates new variations with ComfyUI (it must be open).')}>
              {#if busy[g.card.id]}<LoaderCircle size={14} class="spin" /> {L(`Gerando ${busy[g.card.id]}…`, `Generating ${busy[g.card.id]}…`)}{:else}<Sparkles size={14} /> {L('Gerar mais', 'Generate more')}{/if}</button>
          </div>
          <div class="opts">
            {#if asking === g.card.id}
              <div class="ask">
                <span class="label">{L('Descrição da cena (em inglês). Ajuste o que quiser antes de gerar:', 'Scene description (in English). Tweak it before generating:')}</span>
                <textarea class="textarea" rows="4" bind:value={promptText[g.card.id]}></textarea>
                <div class="askrow">
                  <button class="btn sm primary" onclick={() => more(g, 2)}><Sparkles size={14} /> {L('Gerar 2 variações', 'Generate 2 variations')}</button>
                  <button class="btn sm" onclick={() => more(g, 4)}>{L('Gerar 4', 'Generate 4')}</button>
                  <button class="btn sm ghost" onclick={() => { promptText[g.card.id] = promptFor(g.card); }}>{L('Voltar ao texto original', 'Reset text')}</button>
                  <span class="muted small">{L('~40 s por imagem; o estilo pixel art entra sozinho.', '~40 s per image; the pixel art style is added automatically.')}</span>
                </div>
              </div>
            {/if}
            {#each filesOf(g) as f, i}
              <button class="opt" class:on={pick[g.card.id] === i} title={f.name} onclick={() => (pick[g.card.id] = i)} ondblclick={() => (zoom = gi)}>
                <img src={url(f)} alt={f.name} loading="lazy" />
                <span class="num">{i + 1}</span>
                {#if pick[g.card.id] === i}<span class="tick"><Check size={14} /></span>{/if}
              </button>
            {/each}
            {#each Array(busy[g.card.id] ?? 0) as _}<span class="opt wait"><LoaderCircle size={22} class="spin" /><span>{L('gerando…', 'generating…')}</span></span>{/each}
            <button class="opt none" class:on={pick[g.card.id] === -1} onclick={() => (pick[g.card.id] = -1)}><X size={16} /><span>{L('Nenhuma', 'None')}</span></button>
          </div>
        </div>
      {/each}
    </div>
    <footer>
      <span class="muted small">{L(`${chosen} de ${groups.length} cartas com arte escolhida`, `${chosen} of ${groups.length} cards with artwork chosen`)}</span>
      <span class="grow"></span>
      <button class="btn" onclick={oncancel}>{L('Cancelar', 'Cancel')}</button>
      <button class="btn primary" disabled={!chosen} onclick={confirm}><Check size={16} /> {chosen === 1 ? L('Colocar em 1 carta', 'Apply to 1 card') : L(`Colocar em ${chosen} cartas`, `Apply to ${chosen} cards`)}</button>
    </footer>
  </div>
</div>

{#if zg && zoom !== null}
  <div class="zoom" role="dialog" aria-modal="true" aria-label={nameOf(zg.card)}>
    <header>
      <button class="btn icon" disabled={zoom === 0} title={L('Carta anterior (←)', 'Previous card (←)')} onclick={() => go(-1)}><ChevronLeft size={18} /></button>
      <div class="ztitle"><b>{nameOf(zg.card)}</b><small>{L(`carta ${zoom + 1} de ${groups.length}`, `card ${zoom + 1} of ${groups.length}`)}</small></div>
      <button class="btn icon" disabled={zoom === groups.length - 1} title={L('Próxima carta (→)', 'Next card (→)')} onclick={() => go(1)}><ChevronRight size={18} /></button>
      <span class="grow"></span>
      <div class="seg">
        <button class:on={mode === 'arte'} onclick={() => (mode = 'arte')}><ImageIcon size={14} /> {L('Só a arte', 'Art only')}</button>
        <button class:on={mode === 'carta'} onclick={() => (mode = 'carta')}><RectangleVertical size={14} /> {L('Na carta', 'On the card')}</button>
      </div>
      <button class="btn primary" onclick={() => (zoom = null)}><Check size={16} /> {L('Voltar à lista', 'Back to list')}</button>
    </header>
    <div class="big">
      {#each filesOf(zg) as f, i (f)}
        <button class="bopt" class:on={pick[zg.card.id] === i} onclick={() => (pick[zg.card.id] = i)} title={f.name}>
          {#if mode === 'carta'}<div class="cardsvg">{@html cardWith(zg, f, i)}</div>{:else}<img src={url(f)} alt={f.name} />{/if}
          <span class="blabel">{#if pick[zg.card.id] === i}<Check size={15} /> {L('Escolhida', 'Chosen')}{:else}{L(`Versão ${i + 1}`, `Version ${i + 1}`)} · {L('clique para escolher', 'click to choose')}{/if}</span>
        </button>
      {/each}
    </div>
    <footer>
      <button class="btn sm" class:danger={pick[zg.card.id] === -1} onclick={() => (pick[zg.card.id] = -1)}><X size={14} /> {L('Nenhuma serve (deixar a carta como está)', 'None works (leave the card as is)')}</button>
      <span class="muted small">{L('Teclado: ← → muda de carta · 1, 2, 3 escolhe · 0 nenhuma · Esc volta', 'Keys: ← → change card · 1, 2, 3 choose · 0 none · Esc back')}</span>
    </footer>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .6); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
  /* altura limitada à tela: a lista rola por dentro e os botões ficam sempre visíveis */
  .dialog { width: min(1100px, 100%); max-height: calc(100vh - 40px); display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; box-shadow: 0 20px 60px rgb(0 0 0 / .5); }
  .dialog > header { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 8px; }
  .dialog > header h2 { margin: 0 0 4px; font-size: 18px; }
  .dialog > header p { margin: 0; font-size: 13px; }
  .grow { flex: 1; min-width: 0; }
  .restored { margin: 6px 0 0 !important; color: var(--ok, #7ac27a); font-size: 12.5px !important; }
  .small { font-size: 12.5px; }
  .list { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 20px; display: flex; flex-direction: column; gap: 10px; }
  .row { display: grid; grid-template-columns: 180px 1fr; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .name { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
  .name b { font-size: 13.5px; font-weight: 600; }
  .name small { color: var(--muted); font-size: 11.5px; }
  .opts { display: flex; gap: 10px; flex-wrap: wrap; }
  .opt { position: relative; width: 140px; aspect-ratio: 832 / 1152; padding: 0; border: 2px solid var(--line-2); border-radius: 8px; overflow: hidden; background: var(--bg-2); cursor: pointer; opacity: .8; transition: all var(--t); }
  .opt:hover { opacity: 1; }
  .opt.on { border-color: var(--accent); opacity: 1; box-shadow: 0 0 0 3px var(--accent-soft); }
  .opt img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .num { position: absolute; left: 5px; top: 5px; min-width: 20px; height: 20px; border-radius: 6px; background: rgb(0 0 0 / .65); color: #fff; font: 600 11px/20px var(--ui); text-align: center; }
  .tick { position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; }
  .none { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--muted); font-size: 12px; }
  .ask { flex-basis: 100%; display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 10px; background: var(--bg-2); border: 1px solid var(--line-2); }
  .ask textarea { font-size: 12.5px; }
  .askrow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .opt.wait { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--muted); font-size: 12px; cursor: default; border-style: dashed; }
  .name :global(.spin), .opt :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dialog > footer { display: flex; align-items: center; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--line); }

  .zoom { position: fixed; inset: 0; z-index: 60; background: var(--bg, #0b0a0c); display: flex; flex-direction: column; }
  .zoom > header { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-bottom: 1px solid var(--line); }
  .ztitle { display: flex; flex-direction: column; min-width: 0; }
  .ztitle b { font-size: 16px; }
  .ztitle small { color: var(--muted); font-size: 12px; }
  .big { flex: 1; min-height: 0; display: flex; gap: 18px; justify-content: center; align-items: stretch; padding: 16px 18px; overflow-x: auto; }
  .bopt { flex: 0 1 auto; display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 8px; border: 2px solid transparent; border-radius: 12px; background: none; cursor: pointer; min-height: 0; }
  .bopt:hover { border-color: var(--line-2); }
  .bopt.on { border-color: var(--accent); background: var(--accent-soft); }
  .bopt img { flex: 1; min-height: 0; max-width: 100%; height: 100%; object-fit: contain; border-radius: 8px; display: block; }
  .cardsvg { flex: 1; min-height: 0; aspect-ratio: 750 / 1050; display: flex; }
  .cardsvg :global(svg) { width: 100%; height: 100%; display: block; }
  .blabel { display: inline-flex; align-items: center; gap: 6px; font: 500 13px var(--ui); color: var(--text-2); }
  .bopt.on .blabel { color: var(--accent-2); font-weight: 600; }
  .zoom > footer { display: flex; align-items: center; gap: 14px; justify-content: space-between; padding: 10px 18px 14px; border-top: 1px solid var(--line); }
</style>
