<script lang="ts">
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';

  function key(e: KeyboardEvent) {
    if (!ui.ask) return;
    if (e.key === 'Escape') ui.ask.resolve('cancel');
    if (e.key === 'Enter') ui.ask.resolve('ok');
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
  .backdrop { position: fixed; inset: 0; background: rgb(5 4 4 / .7); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 70; animation: fade .15s; padding: 16px; }
  .dialog { width: min(460px, 100%); background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-lg); animation: pop .18s ease-out; }
  h3 { font-size: 17px; margin-bottom: 8px; }
  p { color: var(--text-2); margin: 0 0 22px; white-space: pre-line; }
  .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  @keyframes fade { from { opacity: 0; } }
  @keyframes pop { from { opacity: 0; transform: scale(.96); } }
</style>
