<script lang="ts">
  import { CircleCheck, CircleAlert, Info } from '@lucide/svelte';
  import { ui } from '../../app/ui.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each ui.toasts as t (t.id)}
    <div class="toast {t.kind}">
      {#if t.kind === 'ok'}<CircleCheck size={17} />{:else if t.kind === 'error'}<CircleAlert size={17} />{:else}<Info size={17} />{/if}
      <span>{t.text}</span>
    </div>
  {/each}
</div>

<style>
  .toasts { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 60; pointer-events: none; }
  .toast { display: flex; align-items: center; gap: 10px; padding: 11px 16px; border-radius: 10px; background: var(--surface-3); border: 1px solid var(--line-2);
    box-shadow: var(--shadow); font-size: 13.5px; animation: in .22s ease-out; max-width: 420px; }
  .toast.ok :global(svg) { color: var(--ok); }
  .toast.error { border-color: rgb(226 87 76 / .5); }
  .toast.error :global(svg) { color: var(--danger); }
  .toast.info :global(svg) { color: var(--info); }
  @keyframes in { from { opacity: 0; transform: translateY(8px); } }
  @media (max-width: 760px) { .toasts { right: 12px; left: 12px; bottom: 76px; } }
</style>
