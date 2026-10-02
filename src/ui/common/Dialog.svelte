<script lang="ts">
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';

  function key(e: KeyboardEvent) {
    if (!ui.ask) return;
    if (e.key === 'Escape') { e.preventDefault(); ui.ask.resolve('cancel'); }
    // Enter confirma, a não ser que o foco esteja em outro botão da janela (teclado/controle)
    if (e.key === 'Enter' && !(document.activeElement instanceof HTMLButtonElement)) ui.ask.resolve('ok');
  }
</script>

<svelte:window onkeydown={key} />

{#if ui.ask}
  {@const a = ui.ask}
  <div class="backdrop" role="presentation" onclick={() => a.resolve('cancel')}>
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <h3 id="dlg-t">{a.title}</h3>
      <p>{a.text}</p>
      <div class="actions">
        {#if a.third}<button class="btn ghost" onclick={() => a.resolve('third')}>{a.third}</button>{/if}
        <div class="grow"></div>
        <button class="btn" onclick={() => a.resolve('cancel')}>{a.cancel ?? L('Cancelar', 'Cancel')}</button>
        <!-- svelte-ignore a11y_autofocus -->
        <button class="btn {a.danger ? 'danger' : 'primary'}" autofocus onclick={() => a.resolve('ok')}>{a.ok}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(4 3 8 / .78); backdrop-filter: blur(4px); display: grid; place-items: center; z-index: 70; animation: fade .15s; padding: 16px; }
  .dialog { width: min(540px, 100%); background: linear-gradient(180deg, #1a1630, #0e0c18); border: 3px solid #fff0c8; padding: 24px 24px 20px;
    box-shadow: 0 0 0 3px #05040a, 0 0 0 6px #4a417a, 0 0 60px rgb(190 120 255 / .22), 0 30px 80px rgb(0 0 0 / .8); animation: pop .18s cubic-bezier(.2, .9, .3, 1.2); }
  h3 { font: 400 16px var(--pixel); letter-spacing: .06em; color: var(--accent-2); margin-bottom: 10px; }
  p { color: var(--text-2); margin: 0 0 22px; white-space: pre-line; line-height: 1.55; }
  .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .actions :global(.btn) { border-radius: 0; border-width: 2px; height: 38px; }
  @keyframes fade { from { opacity: 0; } }
  @keyframes pop { from { opacity: 0; transform: scale(.94); } }
</style>
