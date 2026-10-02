<!-- Menu de pausa (Esc / Start): continuar, voltar uma tela, menu principal, configurações e sair. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { shell } from '../../app/shell.svelte';
  import { host } from '../../app/settings.svelte';
  import { ui } from '../../app/ui.svelte';

  const here = $derived(router.route.name);
  const PARENT: Record<string, [string, string]> = { '/': ['Menu principal', 'Main menu'], '/batalha': ['Modo batalha', 'Battle mode'], '/decks': ['Biblioteca de cartas', 'Card library'], '/heroi': ['Heróis', 'Heroes'] };
  const parent = $derived(router.parent());
  let box = $state<HTMLDivElement>();
  $effect(() => { if (shell.menu) void tick().then(() => box?.querySelector<HTMLButtonElement>('button')?.focus()); });

  const close = () => { shell.menu = false; };
  const go = (path: string) => { close(); router.go(path); };
  async function quit() {
    close();
    const r = await ui.confirm({ title: L('Sair do jogo?', 'Quit the game?'), text: L('Tudo já está salvo.', 'Everything is already saved.'), ok: L('Sair', 'Quit') });
    if (r === 'ok') host()?.quit();
  }
</script>

{#if shell.menu}
  <div class="pause" role="dialog" aria-modal="true" aria-label={L('Menu', 'Menu')} onclick={close} onkeydown={() => {}} tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="pbox" bind:this={box} onclick={(e) => e.stopPropagation()}>
      <span class="psun" aria-hidden="true"></span>
      <h2>{L('Menu', 'Menu')}</h2>
      <button onclick={close}>{L('Continuar', 'Resume')}</button>
      {#if here !== 'home' && parent !== '/'}<button onclick={() => go(parent)}>{L('Voltar', 'Back')}: {L(PARENT[parent]?.[0] ?? '', PARENT[parent]?.[1] ?? '')}</button>{/if}
      {#if here !== 'home'}<button onclick={() => go('/')}>{L('Menu principal', 'Main menu')}</button>{/if}
      {#if here !== 'settings'}<button onclick={() => go('/ajustes')}>{L('Configurações', 'Settings')}</button>{/if}
      {#if host()}<button class="quit" onclick={quit}>{L('Sair do jogo', 'Quit the game')}</button>{/if}
      <small>Esc · {L('fechar', 'close')}</small>
    </div>
  </div>
{/if}

<style>
  .pause { position: fixed; inset: 0; z-index: 65; display: grid; place-items: center; background: rgb(4 3 8 / .78); backdrop-filter: blur(5px); animation: fade .14s; }
  @keyframes fade { from { opacity: 0; } }
  .pbox { width: min(380px, calc(100vw - 32px)); display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 26px 26px 18px; background: linear-gradient(180deg, #1a1630, #0e0c18);
    border: 3px solid #fff0c8; box-shadow: 0 0 0 3px #05040a, 0 0 0 6px #4a417a, 0 0 60px rgb(190 120 255 / .25), 0 30px 80px rgb(0 0 0 / .8); animation: pop .18s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes pop { from { transform: scale(.92); opacity: 0; } }
  .psun { align-self: center; width: 34px; height: 34px; border-radius: 50%; background: #05040a; box-shadow: 0 0 0 3px #fff0c8, 0 0 18px 4px rgb(255 200 120 / .7), 0 0 40px 10px rgb(170 110 255 / .4); }
  h2 { text-align: center; font: 700 22px var(--pixel); letter-spacing: .22em; padding-left: .22em; text-transform: uppercase; color: var(--accent-2); margin: 8px 0 10px; }
  button { height: 44px; border: 2px solid #3a3260; background: #14111f; color: var(--text); font: 400 12.5px var(--pixel); letter-spacing: .08em; text-transform: uppercase; cursor: pointer; transition: all var(--t); }
  button:hover, button:focus-visible { border-color: var(--accent); color: var(--accent-2); background: #241e3d; outline: none; transform: translateX(4px); }
  button.quit:hover, button.quit:focus-visible { border-color: var(--danger); color: #ffb4ad; }
  small { text-align: center; margin-top: 6px; font: 400 9px var(--pixel); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
</style>
