<!-- Símbolo de game-icons em miniatura para a interface (silhueta ou metal). -->
<script lang="ts">
  import { ICONS } from '../../render/icons/game-icons';
  let { id, size = 22, color = 'currentColor', title = '' }: { id: string; size?: number; color?: string; title?: string } = $props();
</script>

{#if ICONS[id]}
  <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
    {#if title}<title>{title}</title>{/if}
    <path d={ICONS[id].d} fill={color} />
  </svg>
{/if}

<style>svg { display: block; flex: none; }</style>
