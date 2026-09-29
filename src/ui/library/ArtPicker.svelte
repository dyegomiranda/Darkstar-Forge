<!--
  Escolher a arte de cada carta quando há variações (pf-red_001.png, pf-red_001__v2.png…).
  Clique na melhor imagem de cada carta; "Nenhuma" deixa a carta como está.
-->
<script lang="ts">
  import { Check, X } from '@lucide/svelte';
  import { onDestroy } from 'svelte';
  import { L } from '../../app/i18n.svelte';
  import { app } from '../../store/project.svelte';
  import type { ArtGroup } from '../../export/artImport';
  import type { Card } from '../../model/types';

  let { groups, onconfirm, oncancel }: {
    groups: ArtGroup[];
    onconfirm: (choices: { card: Card; file: File }[]) => void;
    oncancel: () => void;
  } = $props();

  // miniaturas das imagens (liberadas ao fechar)
  const urls = new Map<File, string>();
  const url = (f: File) => { let u = urls.get(f); if (!u) { u = URL.createObjectURL(f); urls.set(f, u); } return u; };
  onDestroy(() => { for (const u of urls.values()) URL.revokeObjectURL(u); });

  /** Escolha por carta: índice da imagem ou -1 (nenhuma). Começa na 1ª. */
  let pick = $state<Record<string, number>>(Object.fromEntries(groups.map((g) => [g.card.id, 0])));
  const chosen = $derived(groups.filter((g) => pick[g.card.id] >= 0).length);

  function confirm() {
    onconfirm(groups.filter((g) => pick[g.card.id] >= 0).map((g) => ({ card: g.card, file: g.files[pick[g.card.id]] })));
  }
</script>

<div class="backdrop" role="presentation">
  <div class="dialog" role="dialog" aria-modal="true" aria-label={L('Escolher as artes', 'Choose the artwork')}>
    <header>
      <h2>{L('Escolha a arte de cada carta', 'Choose each card\'s artwork')}</h2>
      <p class="muted">{L('Clique na melhor versão de cada carta. As outras são ignoradas.', 'Click the best version for each card. The others are ignored.')}</p>
    </header>
    <div class="list">
      {#each groups as g (g.card.id)}
        <div class="row">
          <div class="name"><b>{g.card.text[app.lang]?.name ?? g.card.text['pt-BR'].name}</b><small>#{String(g.card.n).padStart(3, '0')}</small></div>
          <div class="opts">
            {#each g.files as f, i}
              <button class="opt" class:on={pick[g.card.id] === i} title={f.name} onclick={() => (pick[g.card.id] = i)}>
                <img src={url(f)} alt={f.name} loading="lazy" />
                {#if pick[g.card.id] === i}<span class="tick"><Check size={14} /></span>{/if}
              </button>
            {/each}
            <button class="opt none" class:on={pick[g.card.id] === -1} onclick={() => (pick[g.card.id] = -1)}><X size={16} /><span>{L('Nenhuma', 'None')}</span></button>
          </div>
        </div>
      {/each}
    </div>
    <footer>
      <button class="btn" onclick={oncancel}>{L('Cancelar', 'Cancel')}</button>
      <button class="btn primary" disabled={!chosen} onclick={confirm}><Check size={16} /> {chosen === 1 ? L('Colocar em 1 carta', 'Apply to 1 card') : L(`Colocar em ${chosen} cartas`, `Apply to ${chosen} cards`)}</button>
    </footer>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .6); display: grid; place-items: center; z-index: 50; padding: 20px; }
  .dialog { width: min(980px, 100%); max-height: 100%; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; box-shadow: 0 20px 60px rgb(0 0 0 / .5); }
  header { padding: 18px 20px 8px; }
  header h2 { margin: 0 0 4px; font-size: 18px; }
  header p { margin: 0; font-size: 13px; }
  .list { overflow-y: auto; padding: 8px 20px; display: flex; flex-direction: column; gap: 10px; }
  .row { display: grid; grid-template-columns: 170px 1fr; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name b { font-size: 13.5px; font-weight: 600; }
  .name small { color: var(--muted); font-size: 11.5px; }
  .opts { display: flex; gap: 8px; flex-wrap: wrap; }
  .opt { position: relative; width: 104px; aspect-ratio: 832 / 1152; padding: 0; border: 2px solid var(--line-2); border-radius: 8px; overflow: hidden; background: var(--bg-2); cursor: pointer; opacity: .75; transition: all var(--t); }
  .opt:hover { opacity: 1; }
  .opt.on { border-color: var(--accent); opacity: 1; box-shadow: 0 0 0 3px var(--accent-soft); }
  .opt img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tick { position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; }
  .none { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--muted); font-size: 12px; }
  footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--line); }
</style>
