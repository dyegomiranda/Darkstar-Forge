<!-- Barra do alto de cada tela do jogo: voltar, título, ações da tela e o botão do menu. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronLeft, Menu } from '@lucide/svelte';
  import { L } from '../../app/i18n.svelte';
  import { shell } from '../../app/shell.svelte';

  let { title, kicker = '', back = L('Menu', 'Menu'), onback, children }: { title: string; kicker?: string; back?: string; onback: () => void; children?: Snippet } = $props();
</script>

<header class="sbar no-print">
  <button class="sb-back" onclick={onback}><ChevronLeft size={16} strokeWidth={2.4} /><span>{back}</span></button>
  <span class="sb-sun" aria-hidden="true"></span>
  <div class="sb-title">{#if kicker}<small>{kicker}</small>{/if}<h1>{title}</h1></div>
  <div class="sb-fill"></div>
  {@render children?.()}
  <button class="sb-menu" onclick={() => (shell.menu = true)} title={L('Menu (Esc)', 'Menu (Esc)')} aria-label={L('Menu', 'Menu')}><Menu size={17} /></button>
</header>

<style>
  .sbar { display: flex; align-items: center; gap: 12px; height: 54px; flex: none; padding: 0 14px; position: relative; z-index: 5;
    background: linear-gradient(180deg, #14111f, #0b0913); border-bottom: 2px solid #2a2443; box-shadow: 0 2px 0 #05040a, 0 8px 24px rgb(0 0 0 / .5); }
  .sb-back { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 12px 0 6px; border: 2px solid #3a3260; background: #171329; color: var(--text-2); font: 400 11px var(--pixel); letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: all var(--t); }
  .sb-back:hover { border-color: var(--accent); color: var(--accent-2); background: #221b3a; }
  .sb-sun { width: 18px; height: 18px; border-radius: 50%; background: #05040a; box-shadow: 0 0 0 2px var(--accent-2), 0 0 12px 2px rgb(240 190 110 / .55), 0 0 22px 6px rgb(160 110 255 / .3); margin-left: 6px; flex: none; }
  .sb-title { display: flex; flex-direction: column; justify-content: center; min-width: 0; line-height: 1.1; }
  .sb-title small { font: 400 9px var(--pixel); letter-spacing: .2em; text-transform: uppercase; color: var(--accent); opacity: .85; }
  .sb-title h1 { font: 400 16px var(--pixel); letter-spacing: .08em; text-transform: uppercase; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sb-fill { flex: 1; min-width: 0; }
  .sb-menu { width: 34px; height: 32px; display: grid; place-items: center; border: 2px solid #3a3260; background: #171329; color: var(--text-2); cursor: pointer; transition: all var(--t); }
  .sb-menu:hover { border-color: var(--accent); color: var(--accent-2); }
</style>
