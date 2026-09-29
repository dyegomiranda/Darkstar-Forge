<script lang="ts">
  import { onMount } from 'svelte';
  import { LibraryBig, ScrollText, Settings2, PenTool, Check, CloudAlert, LoaderCircle, SquareStack } from '@lucide/svelte';
  import Back from '../ui/back/Back.svelte';
  import PdfDialog from '../ui/common/PdfDialog.svelte';
  import { app } from '../store/project.svelte';
  import { loadCardFonts } from '../render/fonts';
  import { router } from './router.svelte';
  import { L } from './i18n.svelte';
  import Library from '../ui/library/Library.svelte';
  import Editor from '../ui/editor/Editor.svelte';
  import Sheet from '../ui/sheet/Sheet.svelte';
  import Settings from '../ui/settings/Settings.svelte';
  import Toasts from '../ui/common/Toasts.svelte';
  import Dialog from '../ui/common/Dialog.svelte';
  import ProgressBar from '../ui/common/ProgressBar.svelte';

  let error = $state('');
  let lastCard = $state<string | null>(null);

  onMount(() => {
    Promise.all([loadCardFonts(), app.load()]).catch((e) => { error = String(e?.message ?? e); });
    // grava pendências ao fechar a janela/aba
    const flush = () => { void app.flush(); };
    addEventListener('pagehide', flush);
    return () => removeEventListener('pagehide', flush);
  });

  $effect(() => { if (router.route.name === 'editor') lastCard = router.route.id; });

  const nav = $derived([
    { id: 'library', icon: LibraryBig, label: L('Biblioteca', 'Library'), go: () => router.library() },
    ...(lastCard && app.cards[lastCard] ? [{ id: 'editor', icon: PenTool, label: L('Editor', 'Editor'), go: () => router.editor(lastCard!) }] : []),
    { id: 'back', icon: SquareStack, label: L('Verso', 'Back'), go: () => router.go('/verso') },
    { id: 'sheet', icon: ScrollText, label: L('Ficha', 'Sheet'), go: () => router.go('/ficha') },
    { id: 'settings', icon: Settings2, label: L('Ajustes', 'Settings'), go: () => router.go('/ajustes') },
  ]);

  function setLang(l: 'pt-BR' | 'en-US') {
    app.updateProject((p) => { p.lang = l; });
    document.documentElement.lang = l;
  }
</script>

<div class="shell">
  <nav class="rail" aria-label={L('Navegação', 'Navigation')}>
    <button class="brand" onclick={() => router.library()} title="Darkstar Forge">
      <img src="/brand/logo.png" alt="" />
    </button>
    {#each nav as n (n.id)}
      <button class="nav" class:on={router.route.name === n.id} onclick={n.go} title={n.label}>
        <n.icon size={21} strokeWidth={1.8} />
        <span>{n.label}</span>
      </button>
    {/each}
    <div class="spacer"></div>
    <div class="save" title={app.saveState === 'error' ? app.saveError : ''}>
      {#if app.saveState === 'saving'}<LoaderCircle size={15} class="spin" /><span>{L('Salvando', 'Saving')}</span>
      {:else if app.saveState === 'error'}<CloudAlert size={15} color="var(--danger)" /><span class="err">{L('Erro', 'Error')}</span>
      {:else}<Check size={15} color="var(--ok)" /><span>{L('Salvo', 'Saved')}</span>{/if}
    </div>
    <div class="lang">
      <button class:on={app.lang === 'pt-BR'} onclick={() => setLang('pt-BR')}>PT</button>
      <button class:on={app.lang === 'en-US'} onclick={() => setLang('en-US')}>EN</button>
    </div>
  </nav>

  <main>
    {#if error}
      <div class="fatal"><h2>{L('Não foi possível abrir o projeto', 'Could not open the project')}</h2><p>{error}</p></div>
    {:else if !app.ready}
      <div class="loading"><img src="/brand/logo.png" alt="" /><p class="display">Darkstar Forge</p></div>
    {:else if router.route.name === 'library'}
      <Library deckId={router.route.deck} />
    {:else if router.route.name === 'editor'}
      {#key router.route.id}<Editor id={router.route.id} />{/key}
    {:else if router.route.name === 'back'}
      <Back />
    {:else if router.route.name === 'sheet'}
      <Sheet />
    {:else}
      <Settings />
    {/if}
  </main>
</div>

<Toasts />
<Dialog />
<ProgressBar />
<PdfDialog />

<style>
  .shell { display: grid; grid-template-columns: var(--rail) 1fr; height: 100%; }
  main { min-width: 0; min-height: 0; height: 100%; overflow: hidden; position: relative; }

  .rail {
    display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px;
    background: linear-gradient(180deg, #141111, #0f0d0d); border-right: 1px solid var(--line);
  }
  .brand { width: 48px; height: 48px; margin-bottom: 14px; border: 0; background: none; cursor: pointer; padding: 0; }
  .brand img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 10px rgb(0 0 0 / .6)); }
  .nav {
    width: 60px; padding: 9px 0 7px; border: 0; border-radius: 12px; background: none; color: var(--muted);
    display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; font: 500 10.5px var(--ui);
    transition: background var(--t), color var(--t);
  }
  .nav:hover { color: var(--text); background: var(--surface-2); }
  .nav.on { color: var(--accent-2); background: var(--accent-soft); }
  .spacer { flex: 1; }
  .save { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 10px; color: var(--muted); margin-bottom: 10px; }
  .save .err { color: var(--danger); }
  .save :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .lang { display: flex; flex-direction: column; gap: 2px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 9px; padding: 3px; }
  .lang button { width: 40px; height: 24px; border: 0; border-radius: 6px; background: none; color: var(--muted); font: 600 11px var(--ui); cursor: pointer; }
  .lang button.on { background: var(--surface-3); color: var(--text); }

  .loading, .fatal { height: 100%; display: grid; place-content: center; justify-items: center; gap: 12px; color: var(--muted); }
  .loading img { width: 88px; opacity: .9; animation: pulse 1.6s ease-in-out infinite; }
  .loading p { font-size: 20px; color: var(--text-2); }
  @keyframes pulse { 50% { opacity: .5; transform: scale(.97); } }

  @media (max-width: 760px) {
    .shell { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
    main { grid-row: 1; }
    .rail { grid-row: 2; flex-direction: row; justify-content: space-around; padding: 6px 8px; border-right: 0; border-top: 1px solid var(--line); }
    .brand, .spacer, .save { display: none; }
    .lang { flex-direction: row; }
    .nav { width: auto; flex: 1; }
  }
</style>
