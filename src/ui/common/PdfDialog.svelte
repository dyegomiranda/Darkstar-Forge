<!-- Opções do PDF para impressão: layout, versos e como a folha é virada. -->
<script lang="ts">
  import { ui, type PdfChoice } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';

  let layout = $state<PdfChoice['layout']>('a4');
  let backs = $state<PdfChoice['backs']>('none');
  let flip = $state<PdfChoice['flip']>('long');

  $effect(() => { if (ui.pdf?.backsOnly) backs = 'only'; });

  const pages = $derived.by(() => {
    const p = ui.pdf;
    if (!p) return 0;
    const sheets = layout === 'a4' ? Math.ceil(p.count / 9) : p.count;
    return backs === 'with' ? sheets * 2 : sheets;
  });
</script>

{#if ui.pdf}
  {@const p = ui.pdf}
  <div class="backdrop" role="presentation" onclick={() => p.resolve(null)}>
    <div class="dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && p.resolve(null)}>
      <h3>{L('PDF para imprimir', 'Print PDF')}</h3>
      <p class="muted">{p.backsOnly ? L('Versos no tamanho real (63 × 88 mm).', 'Backs at real size (63 × 88 mm).') : L(`${p.count} cartas no tamanho real (63 × 88 mm).`, `${p.count} cards at real size (63 × 88 mm).`)}</p>
      <p class="muted">{L('Tamanho padrão de carta (63 × 88 mm): cantos arredondados de 3 mm, com um contorno fino para guiar o corte (serve nos sleeves e cortadores de canto comuns).', 'Standard card size (63 × 88 mm): 3 mm rounded corners, with a thin outline to guide cutting (fits common sleeves and corner cutters).')}</p>

      <span class="label">{L('Folha', 'Sheet')}</span>
      <div class="opts">
        <label class:on={layout === 'a4'}><input type="radio" bind:group={layout} value="a4" /><b>{L('Folha A4 (3 × 3)', 'A4 sheet (3 × 3)')}</b><small>{L('9 cartas por folha, com marcas de corte', '9 cards per sheet, with crop marks')}</small></label>
        <label class:on={layout === 'single'}><input type="radio" bind:group={layout} value="single" /><b>{L('Uma por página', 'One per page')}</b><small>{L('Para gráficas que pedem uma carta por página', 'For print shops that want one card per page')}</small></label>
      </div>

      {#if !p.backsOnly}
        <span class="label">{L('Versos', 'Backs')}</span>
        <div class="opts three">
          <label class:on={backs === 'none'}><input type="radio" bind:group={backs} value="none" /><b>{L('Só frentes', 'Fronts only')}</b></label>
          <label class:on={backs === 'with'}><input type="radio" bind:group={backs} value="with" /><b>{L('Frente e verso', 'Front and back')}</b></label>
          <label class:on={backs === 'only'}><input type="radio" bind:group={backs} value="only" /><b>{L('Só versos', 'Backs only')}</b></label>
        </div>
      {/if}

      {#if backs !== 'none' && layout === 'a4'}
        <span class="label">{L('Como você vira a folha para imprimir o verso', 'How you flip the sheet to print the back')}</span>
        <div class="opts">
          <label class:on={flip === 'long'}><input type="radio" bind:group={flip} value="long" /><b>{L('Pela borda longa (lateral)', 'Long edge (side)')}</b><small>{L('Como virar a página de um livro — o padrão da maioria das impressoras', 'Like turning a book page — most printers default')}</small></label>
          <label class:on={flip === 'short'}><input type="radio" bind:group={flip} value="short" /><b>{L('Pela borda curta (de cima)', 'Short edge (top)')}</b><small>{L('Como virar um bloco de notas', 'Like flipping a notepad')}</small></label>
        </div>
        <p class="tip">{L('Cada verso é posicionado espelhado para cair exatamente atrás da sua carta. Imprima as páginas de frente, vire o maço como escolhido acima e imprima as de verso (ou use frente e verso automático da impressora).',
          'Each back is mirrored so it lands exactly behind its card. Print the front pages, flip the stack as chosen above and print the back pages (or use the printer’s automatic duplex).')}</p>
      {/if}

      <div class="actions">
        <span class="muted">{pages} {pages === 1 ? L('página', 'page') : L('páginas', 'pages')}</span>
        <div class="grow"></div>
        <button class="btn" onclick={() => p.resolve(null)}>{L('Cancelar', 'Cancel')}</button>
        <button class="btn primary" onclick={() => p.resolve({ layout, backs: p.backsOnly ? 'only' : backs, flip })}>{L('Gerar PDF', 'Create PDF')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(5 4 4 / .7); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 70; padding: 16px; }
  .dialog { width: min(560px, 100%); max-height: 92vh; overflow-y: auto; background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 10px; }
  h3 { font-size: 18px; }
  p { margin: 0; }
  .label { margin-top: 6px; }
  .opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .opts.three { grid-template-columns: repeat(3, 1fr); }
  .opts label { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line-2); background: var(--bg-2); cursor: pointer; position: relative; }
  .opts label.on { border-color: var(--accent); background: var(--accent-soft); }
  .opts input { position: absolute; opacity: 0; }
  .opts b { font-size: 13.5px; font-weight: 600; }
  .opts small { font-size: 12px; color: var(--muted); }
  .tip { font-size: 12.5px; color: var(--text-2); background: var(--bg-2); border: 1px solid var(--line); border-radius: 9px; padding: 9px 11px; }
  .actions { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
  @media (max-width: 560px) { .opts, .opts.three { grid-template-columns: 1fr; } }
</style>
