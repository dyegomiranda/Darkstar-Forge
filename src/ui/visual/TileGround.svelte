<script lang="ts">
  let { scene = 'santuario', active = false }: { scene?: string; active?: boolean } = $props();
</script>
<svg class="tile-ground" class:active viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
  <path class="surface" d="M80 6L158 43L80 80L2 43Z" />
</svg>
<style>
  .tile-ground { position: absolute; width: 100%; height: 80%; left: 0; top: 34%; overflow: visible; pointer-events: none; z-index: 0; }
  .surface { fill: rgb(230 224 198 / .08); stroke: rgb(239 230 195 / .42); stroke-width: 1.2; }
  .active .surface { fill: color-mix(in srgb, var(--c, #e4c580) 20%, transparent); stroke: var(--c, #e4c580); stroke-width: 2.5; }
</style>
