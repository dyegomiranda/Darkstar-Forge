<!--
  Aviso da primeira vez que o jogo abre: duas páginas (seta para a direita passa à
  próxima). Na segunda, "Entendido!" fecha para sempre e "Sair" fecha o jogo.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { ChevronRight, ChevronLeft } from '@lucide/svelte';
  import { L } from '../../app/i18n.svelte';
  import { app } from '../../store/project.svelte';
  import { host } from '../../app/settings.svelte';

  let { ondone }: { ondone: () => void } = $props();
  let page = $state(0);
  let box = $state<HTMLDivElement>();
  const focusMain = () => void tick().then(() => box?.querySelector<HTMLButtonElement>('[data-main]')?.focus());
  $effect(() => { void page; focusMain(); });

  function setLang(l: 'pt-BR' | 'en-US') { app.updateProject((p) => { p.lang = l; }); document.documentElement.lang = l; }
  /** Sair: fecha o jogo (no navegador não há o que fechar; o aviso continua na tela). */
  function quit() { const h = host(); if (h) h.quit(); else window.close(); }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' && page === 0) { page = 1; e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowLeft' && page === 1) { page = 0; e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
  }
</script>

<svelte:window onkeydowncapture={key} />

<div class="backdrop" role="presentation">
  <div class="note" role="dialog" aria-modal="true" aria-label="Disclaimer" bind:this={box}>
    <header>
      <span class="sun" aria-hidden="true"></span>
      <span class="lang">
        <button class:on={app.lang === 'pt-BR'} onclick={() => setLang('pt-BR')}>PT</button>
        <button class:on={app.lang === 'en-US'} onclick={() => setLang('en-US')}>EN</button>
      </span>
    </header>

    {#key page}
      <div class="page">
        {#if page === 0}
          <h2>Disclaimer</h2>
          <p class="big">{L('Esse jogo foi 100% produzido com a ajuda de Inteligência Artificial (AI).', 'This game was 100% made with the help of Artificial Intelligence (AI).')}</p>
          <p>{L('Se você se sente desconfortável com isso, sinta-se à vontade para desinstalar o jogo ou pedir reembolso.', 'If you feel uncomfortable with that, feel free to uninstall the game or ask for a refund.')}</p>
          <p class="but">{L('Porém...', 'But... One more thing...')}</p>
        {:else}
          <p class="big">{L('Esse jogo foi construído com o único objetivo de ser divertido!', 'This game was built with the sole purpose of being fun!')}</p>
          <p>{L('Se você não dá a mínima para isso e só quer curtir um bom jogo...', "If you don't give a damn about that and just want to enjoy a good game...")}</p>
          <p class="welcome">{L('Bem-vindo(a) ao Void Sun!', 'Welcome to Void Sun!')}</p>
        {/if}
      </div>
    {/key}

    <footer>
      <span class="dots"><i class:on={page === 0}></i><i class:on={page === 1}></i></span>
      {#if page === 0}
        <button class="next" data-main onclick={() => (page = 1)} aria-label={L('Próxima página', 'Next page')} title={L('Próxima página', 'Next page')}><ChevronRight size={22} strokeWidth={2.6} /></button>
      {:else}
        <button class="prev" onclick={() => (page = 0)} aria-label={L('Página anterior', 'Previous page')} title={L('Página anterior', 'Previous page')}><ChevronLeft size={18} strokeWidth={2.6} /></button>
        <span class="fill"></span>
        <button class="px-btn" onclick={quit}>{L('Sair', 'Quit')}</button>
        <button class="px-btn gold big" data-main onclick={ondone}>{L('Entendido!', 'Got it!')}</button>
      {/if}
    </footer>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 68; display: grid; place-items: center; padding: 20px; background: rgb(4 3 8 / .8); backdrop-filter: blur(6px); animation: fade .5s .2s both; }
  @keyframes fade { from { opacity: 0; } }
  .note { width: min(700px, 100%); display: flex; flex-direction: column; gap: 14px; padding: 22px 28px 20px; background: linear-gradient(180deg, #1a1630, #0e0c18);
    border: 3px solid #fff0c8; box-shadow: 0 0 0 3px #05040a, 0 0 0 6px #4a417a, 0 0 70px rgb(190 120 255 / .28), 0 30px 80px rgb(0 0 0 / .8); animation: pop .5s .25s cubic-bezier(.2, .9, .3, 1.15) both; }
  @keyframes pop { from { transform: scale(.92); opacity: 0; } }
  header { display: flex; align-items: center; justify-content: space-between; }
  .sun { width: 30px; height: 30px; border-radius: 50%; background: #05040a; box-shadow: 0 0 0 3px #fff0c8, 0 0 16px 4px rgb(255 200 120 / .7), 0 0 36px 10px rgb(170 110 255 / .4); margin-left: 6px; }
  .lang { display: flex; gap: 4px; }
  .lang button { width: 36px; height: 24px; border: 2px solid #3a3260; background: #100e1a; color: var(--muted); font: 400 10px var(--pixel); cursor: pointer; }
  .lang button.on { border-color: var(--accent); color: var(--accent-2); }
  .page { min-height: 232px; display: flex; flex-direction: column; justify-content: center; gap: 14px; text-align: center; animation: turn .3s cubic-bezier(.2, .7, .3, 1); }
  @keyframes turn { from { opacity: 0; transform: translateX(18px); } }
  h2 { font: 700 22px var(--pixel); letter-spacing: .2em; padding-left: .2em; text-transform: uppercase; color: var(--accent-2); }
  p { margin: 0; font: 400 17px/1.5 var(--pixel-text); color: var(--text-2); }
  p.big { font-size: 20px; color: var(--text); }
  p.but { font: 400 15px var(--pixel); letter-spacing: .1em; color: #c9a6ff; margin-top: 6px; }
  p.welcome { font: 700 clamp(17px, 3.2vw, 26px) var(--pixel); letter-spacing: .08em; text-transform: uppercase; margin-top: 8px;
    background: linear-gradient(180deg, #fff 10%, #ffe9c4 45%, #f0a8d8 80%, #b98bff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 3px 0 #3a1d5c) drop-shadow(0 0 16px rgb(255 190 230 / .4)); }
  footer { display: flex; align-items: center; gap: 10px; min-height: 48px; }
  .fill { flex: 1; }
  .dots { display: flex; gap: 6px; }
  .dots i { width: 9px; height: 9px; background: #2c2647; } .dots i.on { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
  .next { margin-left: auto; width: 54px; height: 46px; display: grid; place-items: center; border: 2px solid #fff0c2; background: linear-gradient(180deg, #f6d691, #d79d43); color: #1f1404; cursor: pointer; box-shadow: 0 3px 0 #6b4514, 0 0 18px rgb(240 190 110 / .3); animation: nudge 1.4s ease-in-out infinite; }
  @keyframes nudge { 50% { transform: translateX(5px); } }
  .next:active { transform: translateY(3px); box-shadow: none; }
  .prev { width: 34px; height: 34px; display: grid; place-items: center; border: 2px solid #3a3260; background: #14111f; color: var(--text-2); cursor: pointer; }
  .prev:hover { border-color: var(--accent); color: var(--accent-2); }
</style>
