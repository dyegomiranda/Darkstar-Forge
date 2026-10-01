<!-- Símbolo em miniatura para a interface: silhueta de game-icons ou imagem da coleção 3D. -->
<script lang="ts">
  import { ICONS } from '../../render/icons/game-icons';
  import { ICONS3D } from '../../render/icons/icons3d';
  let { id, size = 22, color = 'currentColor', title = '' }: { id: string; size?: number; color?: string; title?: string } = $props();
</script>

{#if ICONS3D[id]}
  <img src={ICONS3D[id].src} width={size} height={size} alt={title} />
{:else if ICONS[id]}
  <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
    {#if title}<title>{title}</title>{/if}
    <path d={ICONS[id].d} fill={color} />
  </svg>
{/if}

<style>svg, img { display: block; flex: none; }</style>
