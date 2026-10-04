<script lang="ts">
  import { onMount } from 'svelte';
  import { LibraryBig, PenTool, Check, CloudAlert, LoaderCircle, SquareStack, BookOpen, Layers } from '@lucide/svelte';
  import Game from '../ui/game/Game.svelte';
  import Back from '../ui/back/Back.svelte';
  import PdfDialog from '../ui/common/PdfDialog.svelte';
  import { app, LAST_EDITION } from '../store/project.svelte';
  import { loadCardFonts } from '../render/fonts';
  import { RENDER_VERSION } from '../render/card';
  import { pruneOldRenders } from '../store/db';
  import { router } from './router.svelte';
  import { shell } from './shell.svelte';
  import { host, settings } from './settings.svelte';
  import { startInput } from './input';
  import { ui } from './ui.svelte';
  import { L } from './i18n.svelte';
  import { chip } from '../audio/chip';
  import Library from '../ui/library/Library.svelte';
  import Collection from '../ui/library/Collection.svelte';
  import Builds from '../ui/library/Builds.svelte';
  import Journey from '../ui/game/Journey.svelte';
  import Village from '../ui/home/Village.svelte';
  import Editor from '../ui/editor/Editor.svelte';
  import ThemeEditor from '../ui/editor/ThemeEditor.svelte';
  import Heroes from '../ui/hero/Heroes.svelte';
  import HeroCreator from '../ui/hero/HeroCreator.svelte';
  import Settings from '../ui/settings/Settings.svelte';
  import Home from '../ui/home/Home.svelte';
  import Splash from '../ui/home/Splash.svelte';
  import Modes from '../ui/home/Modes.svelte';
  import About from '../ui/home/About.svelte';
  import ScreenBar from '../ui/common/ScreenBar.svelte';
  import PauseMenu from '../ui/common/PauseMenu.svelte';
  import Toasts from '../ui/common/Toasts.svelte';
  import Dialog from '../ui/common/Dialog.svelte';
  import ProgressBar from '../ui/common/ProgressBar.svelte';

  let error = $state('');
  let lastCard = $state<string | null>(null);
  let fps = $state(0);
  /** Tela de abertura (logotipo do desenvolvedor): aparece uma vez, ao abrir o jogo. */
  let splash = $state(true);

  onMount(() => {
    Promise.all([loadCardFonts(), app.load()]).catch((e) => { error = String(e?.message ?? e); });
    // com o app já aberto e parado: limpa do cache as imagens de versões antigas do desenho (só ocupam espaço)
    const tidy = setTimeout(() => { void pruneOldRenders(`${RENDER_VERSION}-`).catch(() => undefined); }, 8000);
    // grava pendências ao fechar a janela/aba
    const flush = () => { void app.flush(); };
    addEventListener('pagehide', flush);

    // configurações deste computador: som e vídeo (a janela já abre no modo guardado pelo programa)
    settings.applyAudio();
    // no programa: primeiro pergunta a escala e o modo em uso (a janela já abre como foi deixada), depois aplica
    const h = host();
    if (h) void h.info().then((i) => {
      settings.zoom = i.zoom;
      settings.screenScale = i.scale;
      settings.screen = { width: i.width, height: i.height };
      if (settings.v.display !== i.mode) { settings.v.display = i.mode; settings.save(); }
      settings.applyVideo(false);
    });
    else settings.applyVideo(false);
    const rescale = () => settings.applyZoom();
    addEventListener('resize', rescale);
    host()?.onMode((mode) => { if (Date.now() - settings.lastSet > 3000 && settings.v.display !== mode) { settings.v.display = mode; settings.save(); } });
    const hush = () => chip.hush(settings.v.muteInBackground && !document.hasFocus());
    addEventListener('blur', hush);
    addEventListener('focus', hush);

    // teclado e controle
    const stopInput = startInput({
      back: () => { if (shell.menu) shell.menu = false; else if (router.route.name !== 'home' && !shell.ownMenu) router.go(router.parent()); },
      menu: () => { if (!shell.ownMenu && !ui.ask) shell.menu = !shell.menu; else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); },
    });

    // contador de quadros (só quando ligado nas configurações)
    let raf = 0, frames = 0, since = performance.now();
    const count = (now: number) => {
      raf = requestAnimationFrame(count);
      frames++;
      if (now - since >= 500) { if (settings.v.showFps) fps = Math.round((frames * 1000) / (now - since)); frames = 0; since = now; }
    };
    raf = requestAnimationFrame(count);

    return () => { clearTimeout(tidy); removeEventListener('pagehide', flush); removeEventListener('blur', hush); removeEventListener('focus', hush); removeEventListener('resize', rescale); stopInput(); cancelAnimationFrame(raf); };
  });

  $effect(() => { if (router.route.name === 'editor') lastCard = router.route.id; });
  // trocar de tela fecha o menu de pausa
  $effect(() => { void router.route; shell.menu = false; });
  // lembra a coleção aberta para a próxima vez que o programa abrir
  $effect(() => { const id = app.editionId; if (id) try { localStorage.setItem(LAST_EDITION, id); } catch { /* sem armazenamento local */ } });

  /** Esc: quem tiver algo aberto fecha (e marca o evento); se ninguém tratou, abre/fecha o menu de pausa. */
  function key(e: KeyboardEvent) {
    if (!settings.is(e, 'back') && e.key !== 'Escape') return;
    setTimeout(() => {
      if (e.defaultPrevented || splash || ui.ask || ui.pdf || shell.ownMenu) return;
      if (shell.menu) { shell.menu = false; return; }
      // há uma janela aberta por cima da tela (seletor, ajuda…): o Esc é dela
      if (document.querySelector('.picker, .scene-modal, .modal, .backdrop')) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) { el.blur(); return; }
      shell.menu = true;
    }, 0);
  }

  $effect(() => { app.devAll = settings.v.dev; });
  const route = $derived(router.route.name);
  /** Telas do construtor de decks: têm a barra com as abas Biblioteca / Coleção / Verso. */
  const inDecks = $derived(route === 'library' || route === 'collection' || route === 'back' || route === 'editor' || route === 'theme' || route === 'builds');
  const deckTabs = $derived([
    { id: 'library', icon: LibraryBig, label: L('Biblioteca', 'Library'), go: () => router.library() },
    ...(lastCard && app.cards[lastCard] ? [{ id: 'editor', icon: PenTool, label: L('Editor', 'Editor'), go: () => router.editor(lastCard!) }] : []),
    { id: 'collection', icon: BookOpen, label: L('Coleção', 'Collection'), go: () => router.go('/colecao') },
    { id: 'back', icon: SquareStack, label: L('Verso', 'Card back'), go: () => router.go('/verso') },
    { id: 'builds', icon: Layers, label: L('Decks de batalha', 'Battle decks'), go: () => router.go('/baralhos') },
  ]);
</script>

<svelte:window onkeydown={key} />

<div class="shell">
  {#if error}
    <div class="fatal"><h2>{L('Não foi possível abrir o jogo', 'Could not open the game')}</h2><p>{error}</p></div>
  {:else if splash}
    <!-- o jogo carrega por trás da abertura -->
  {:else if !app.ready}
    <div class="loading"><span class="sun"></span><p>Void Sun</p></div>
  {:else if route === 'home'}
    <Home />
  {:else if route === 'modes'}
    <Modes />
  {:else if route === 'about'}
    <About />
  {:else if route === 'game'}
    <Game />
  {:else if route === 'journey'}
    <Journey />
  {:else if route === 'campaign'}
    <Village />
  {:else if route === 'multi'}
    <div class="wipscreen">
      <ScreenBar title={L('Multijogador', 'Multiplayer')} kicker={L('Em construção · modo desenvolvedor', 'Work in progress · developer mode')} back={L('Modos', 'Modes')} onback={() => router.go('/batalha')} />
      <p>{L('Esta tela ainda está vazia: é aqui que entram a lista de contatos, o pareamento e as salas.', 'This screen is still empty: contacts, matchmaking and rooms will live here.')}</p>
    </div>
  {:else if router.route.name === 'sheet'}
    {#if router.route.id}{#key router.route.id}<HeroCreator id={router.route.id} />{/key}{:else}<Heroes />{/if}
  {:else if route === 'settings'}
    <Settings />
  {:else if inDecks}
    <ScreenBar title={L('Construtor de decks', 'Deck builder')} back={route === 'library' ? L('Menu', 'Menu') : L('Biblioteca', 'Library')} onback={() => router.go(router.parent())}>
      <nav class="dtabs">
        {#each deckTabs as t (t.id)}
          <button class:on={route === t.id || (t.id === 'library' && route === 'theme')} data-tab onclick={t.go}><t.icon size={15} /><span>{t.label}</span></button>
        {/each}
      </nav>
      <div class="save" title={app.saveState === 'error' ? app.saveError : ''}>
        {#if app.saveState === 'saving'}<LoaderCircle size={14} class="spin" /><span>{L('Salvando', 'Saving')}</span>
        {:else if app.saveState === 'error'}<CloudAlert size={14} color="var(--danger)" /><span class="err">{L('Erro ao salvar', 'Save error')}</span>
        {:else}<Check size={14} color="var(--ok)" /><span>{L('Salvo', 'Saved')}</span>{/if}
      </div>
    </ScreenBar>
    <main>
      {#if router.route.name === 'library'}
        <Library deckId={router.route.deck} />
      {:else if router.route.name === 'editor'}
        {#key router.route.id}<Editor id={router.route.id} />{/key}
      {:else if router.route.name === 'theme'}
        {#key router.route.scope + router.route.deck}<ThemeEditor scope={router.route.scope} deckId={router.route.deck} />{/key}
      {:else if router.route.name === 'collection'}
        <Collection />
      {:else if router.route.name === 'builds'}
        <Builds id={router.route.id} />
      {:else}
        <Back />
      {/if}
    </main>
  {/if}
</div>

{#if splash}<Splash ondone={() => (splash = false)} />{/if}
{#if settings.v.showFps}<div class="fps">{fps} fps</div>{/if}
<PauseMenu />
<Toasts />
<Dialog />
<ProgressBar />
<PdfDialog />

<style>
  .wipscreen { height: 100%; display: flex; flex-direction: column; } .wipscreen p { margin: auto; color: var(--muted); max-width: 520px; text-align: center; }
  .shell { display: flex; flex-direction: column; height: 100%; }
  main { flex: 1; min-width: 0; min-height: 0; overflow: hidden; position: relative; }

  .dtabs { display: flex; gap: 4px; align-self: stretch; align-items: flex-end; margin-right: 6px; }
  .dtabs button { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px; border: 2px solid transparent; border-bottom: 0; background: none; color: var(--muted); font: 400 11px var(--pixel); letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: color var(--t), background var(--t); }
  .dtabs button:hover { color: var(--text); }
  .dtabs button.on { color: var(--accent-2); background: var(--bg); border-color: #2a2443; box-shadow: 0 2px 0 var(--bg); }
  .save { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--muted); padding: 0 6px; min-width: 76px; }
  .save .err { color: var(--danger); }
  .save :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .loading, .fatal { height: 100%; display: grid; place-content: center; justify-items: center; gap: 22px; color: var(--muted); background: #05040a; }
  .sun { width: 70px; height: 70px; border-radius: 50%; background: #05040a; box-shadow: 0 0 0 4px #fff0c8, 0 0 26px 6px rgb(255 200 120 / .7), 0 0 60px 18px rgb(170 110 255 / .4); animation: pulse 1.6s ease-in-out infinite; }
  .loading p { font: 700 22px var(--pixel); letter-spacing: .3em; padding-left: .3em; text-transform: uppercase; color: var(--text-2); margin: 0; }
  @keyframes pulse { 50% { opacity: .55; transform: scale(.95); } }
  .fps { position: fixed; left: 6px; top: 6px; z-index: 99; padding: 2px 6px; background: rgb(0 0 0 / .65); color: #9be0b4; font: 400 10px var(--pixel); pointer-events: none; }

  @media (max-width: 900px) { .dtabs span { display: none; } }
</style>
