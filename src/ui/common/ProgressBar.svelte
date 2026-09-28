<script lang="ts">
  import { ui } from '../../app/ui.svelte';
  import { L } from '../../app/i18n.svelte';
</script>

{#if ui.progress}
  {@const p = ui.progress}
  <div class="prog">
    <div class="row">
      <span class="grow">{p.label}</span>
      <span class="muted">{p.done}/{p.total}</span>
      {#if p.cancel}<button class="btn sm ghost" onclick={p.cancel}>{L('Cancelar', 'Cancel')}</button>{/if}
    </div>
    <div class="bar"><div style="width:{(p.done / Math.max(1, p.total)) * 100}%"></div></div>
  </div>
{/if}

<style>
  .prog { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); width: min(460px, calc(100% - 32px)); z-index: 65;
    background: var(--surface-3); border: 1px solid var(--line-2); border-radius: 12px; padding: 12px 14px; box-shadow: var(--shadow-lg); }
  .bar { margin-top: 8px; height: 6px; border-radius: 6px; background: var(--bg-2); overflow: hidden; }
  .bar div { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transition: width .2s; }
</style>
