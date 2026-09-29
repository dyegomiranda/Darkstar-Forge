<!-- Escolhe a coleção (edição) aberta; some quando só existe uma. -->
<script lang="ts">
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
</script>

{#if (app.project?.editions.length ?? 0) > 1}
  <label class="ed">
    <span>{L('Coleção', 'Collection')}</span>
    <select class="select" bind:value={app.editionId}>
      {#each app.project?.editions ?? [] as e (e.id)}<option value={e.id}>{e.name}</option>{/each}
    </select>
  </label>
{/if}

<style>
  .ed { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); }
  .ed select { min-width: 190px; font-weight: 600; }
</style>
