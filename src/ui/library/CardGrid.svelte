<!--
  Grade virtualizada: só existem na página as linhas visíveis (+ margem).
  Rolar 500 cartas custa o mesmo que rolar 20.
-->
<script lang="ts">
  import { Copy, Pencil, Trash2 } from '@lucide/svelte';
  import type { Card } from '../../model/types';
  import { L } from '../../app/i18n.svelte';
  import { app } from '../../store/project.svelte';
  import CardImage from '../common/CardImage.svelte';

  let {
    cards, tile = 230, selected, onopen, ontoggle, onduplicate, ondelete, onhover,
  }: {
    cards: Card[]; tile?: number; selected: Set<string>;
    onopen: (c: Card) => void; ontoggle: (c: Card, range: boolean) => void;
    onduplicate: (c: Card) => void; ondelete: (c: Card) => void;
    onhover: (c: Card | null, el?: HTMLElement) => void;
  } = $props();

  const GAP = 18;
  let width = $state(800);
  let height = $state(600);
  let scroll = $state(0);
  let scroller: HTMLDivElement;

  const cols = $derived(Math.max(1, Math.floor((width + GAP) / (tile + GAP))));
  const tw = $derived((width - GAP * (cols - 1)) / cols);
  const th = $derived(tw * 1.4 + 30);
  const rows = $derived(Math.ceil(cards.length / cols));
  const first = $derived(Math.max(0, Math.floor(scroll / (th + GAP)) - 2));
  const last = $derived(Math.min(rows, Math.ceil((scroll + height) / (th + GAP)) + 2));
  const visible = $derived(cards.slice(first * cols, last * cols).map((c, i) => ({ c, i: first * cols + i })));

  export function scrollTop() { scroller?.scrollTo({ top: 0 }); }
</script>

<div class="scroller" bind:this={scroller} bind:clientHeight={height} onscroll={(e) => (scroll = (e.currentTarget as HTMLElement).scrollTop)}>
  <div class="space" bind:clientWidth={width} style="height:{rows * (th + GAP)}px">
    {#each visible as { c, i } (c.id)}
      {@const x = (i % cols) * (tw + GAP)}
      {@const y = Math.floor(i / cols) * (th + GAP)}
      <div class="tile" class:sel={selected.has(c.id)} style="transform:translate({x}px,{y}px);width:{tw}px"
        onmouseenter={(e) => onhover(c, e.currentTarget as HTMLElement)} onmouseleave={() => onhover(null)} role="listitem">
        <button class="face" onclick={(e) => (e.ctrlKey || e.metaKey || e.shiftKey || selected.size ? ontoggle(c, e.shiftKey) : onopen(c))}
          aria-label={c.text[app.lang].name}>
          <CardImage card={c} alt={c.text[app.lang].name} />
        </button>
        <label class="check" title={L('Selecionar', 'Select')}>
          <input type="checkbox" checked={selected.has(c.id)} onclick={(e) => { e.stopPropagation(); ontoggle(c, e.shiftKey); }} />
        </label>
        <div class="acts">
          <button class="btn sm icon" title={L('Editar', 'Edit')} onclick={() => onopen(c)}><Pencil size={15} /></button>
          <button class="btn sm icon" title={L('Duplicar', 'Duplicate')} onclick={() => onduplicate(c)}><Copy size={15} /></button>
          <button class="btn sm icon danger" title={L('Excluir', 'Delete')} onclick={() => ondelete(c)}><Trash2 size={15} /></button>
        </div>
        <div class="cap"><span class="n">#{String(c.n).padStart(3, '0')}</span><span class="nm">{c.text[app.lang].name}</span></div>
      </div>
    {/each}
  </div>
</div>

<style>
  .scroller { height: 100%; overflow-y: auto; overflow-x: hidden; padding: 6px 28px 90px; }
  .space { position: relative; }
  .tile { position: absolute; top: 0; left: 0; will-change: transform; }
  .face { display: block; width: 100%; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 4.5% / 3.2%;
    transition: transform .18s cubic-bezier(.2, .8, .3, 1.2), box-shadow .18s ease-out; box-shadow: 0 8px 22px rgb(0 0 0 / .45); transform-origin: 50% 60%; }
  .tile:hover { z-index: 3; }
  .tile:hover .face { transform: translateY(-8px) scale(1.045); box-shadow: 0 24px 46px rgb(0 0 0 / .7); }
  .tile.sel .face { box-shadow: 0 0 0 3px var(--accent), 0 14px 34px rgb(0 0 0 / .6); }
  .check { position: absolute; top: 8px; left: 8px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px;
    background: rgb(12 10 10 / .75); opacity: 0; transition: opacity var(--t); cursor: pointer; }
  .tile:hover .check, .tile.sel .check { opacity: 1; }
  .acts { position: absolute; top: 8px; right: 8px; display: flex; gap: 5px; opacity: 0; transform: translateY(-4px); transition: all var(--t); }
  .tile:hover .acts { opacity: 1; transform: none; }
  .acts .btn { background: rgb(18 15 15 / .85); backdrop-filter: blur(4px); }
  .cap { display: flex; gap: 8px; align-items: baseline; padding: 8px 2px 0; font-size: 12.5px; min-width: 0; }
  .cap .n { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 11.5px; }
  .cap .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-2); }
  @media (max-width: 760px) { .scroller { padding: 6px 14px 90px; } .acts, .check { opacity: 1; } }
</style>
