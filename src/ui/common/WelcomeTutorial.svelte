<script lang="ts">
  import { onMount } from 'svelte';
  import { tutorial } from '../../app/tutorial.svelte';
  import { router } from '../../app/router.svelte';
  import { L } from '../../app/i18n.svelte';
  let documentZoom = $state(1);
  let x = $state(0), y = $state(0), found = $state(false);
  onMount(() => {
    const timer = setInterval(() => {
      const el = document.querySelector('[data-tutorial="battle-menu"]');
      if (!el) return;
      documentZoom = Number(getComputedStyle(document.documentElement).zoom) || 1;
      const r = el.getBoundingClientRect();
      x = Math.max(12, Math.min(innerWidth - 336, r.left));
      y = Math.max(12, r.top - 182); found = true;
    }, 120);
    return () => clearInterval(timer);
  });
</script>
{#if tutorial.progress.preference === 'ask' && found}
  <div class="welcome-coach" role="region" aria-label={L('Aprender a jogar', 'Learn to play')} style="zoom:{1 / documentZoom};left:{x}px;top:{y}px">
    <strong>{L('Quer aprender jogando?', 'Want to learn by playing?')}</strong>
    <p>{L('Uma batalha de treino e balões curtos mostram os controles. Você pode pular e repetir depois nos ajustes.', 'A training battle and short balloons introduce the controls. Skip now and replay later in settings.')}</p>
    <footer><button onclick={() => tutorial.choose(false)}>{L('Pular tutorial', 'Skip tutorial')}</button><button class="go" onclick={() => { tutorial.choose(true); router.go('/batalha'); }}>{L('Começar tutorial', 'Start tutorial')}</button></footer>
  </div>
{/if}
<style>
  .welcome-coach { position: fixed; z-index: 70; width: 324px; padding: 16px; border: 1px solid #f2c979; border-radius: 10px; background: #171222; color: #fff0d5; font: 14px/1.45 var(--ui); box-shadow: 0 8px 28px #0009; }
  .welcome-coach::after { content: ''; position: absolute; bottom: -7px; left: 30px; width: 12px; height: 12px; transform: rotate(45deg); background: #171222; border-right: 1px solid #f2c979; border-bottom: 1px solid #f2c979; }
  p { margin: 8px 0 12px; } footer { display: flex; gap: 10px; justify-content: space-between; } button { padding: 7px 10px; cursor: pointer; border: 1px solid #776783; background: transparent; color: inherit; border-radius: 5px; font: inherit; font-size: 12px; } button.go { background: #f2c979; color: #231a0d; border-color: #f2c979; }
</style>
