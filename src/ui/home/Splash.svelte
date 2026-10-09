<!-- Monochrome vector studio ident. Keep the name and emblem editable SVGs. -->
<script lang="ts">
  import BrandIntro from '../intro/BrandIntro.svelte';
  let { ondone }: { ondone: () => void } = $props();
</script>
<BrandIntro {ondone}/>
