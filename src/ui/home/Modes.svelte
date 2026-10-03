<!-- Modo batalha: solo (contra o bot), Jornada (solo com progressão) ou multijogador (em construção). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Swords, Users, Mountain } from '@lucide/svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { chip } from '../../audio/chip';
  import ScreenBar from '../common/ScreenBar.svelte';

  let first = $state<HTMLButtonElement>();
  onMount(() => { chip.music('title'); first?.focus({ preventScroll: true }); });
</script>

<div class="modes">
  <div class="bg"></div>
  <ScreenBar title={L('Modo batalha', 'Battle mode')} kicker={L('Escolha como jogar', 'Choose how to play')} onback={() => router.go('/')} />
  <div class="wrap">
    <button class="mode" bind:this={first} data-focus-first onclick={() => router.go('/batalha/solo')}>
      <span class="pic"><img src="ui/batalha-solo.webp" alt="" draggable="false" /></span>
      <span class="body">
        <span class="ic"><Swords size={20} /></span>
        <b>{L('Solo', 'Solo')}</b>
        <small>{L('Você contra um oponente controlado pelo jogo. Escolha os heróis, o campo de batalha e a dificuldade.', 'You against an opponent run by the game. Pick the heroes, the battlefield and the difficulty.')}</small>
        <em>{L('Jogar', 'Play')} ▶</em>
      </span>
    </button>
    <button class="mode" onclick={() => router.go('/batalha/jornada')}>
      <span class="pic"><img src="ui/batalha-jornada.webp" alt="" draggable="false" /></span>
      <span class="body">
        <span class="ic"><Mountain size={20} /></span>
        <b>{L('Jornada', 'Journey')}</b>
        <small>{L('Uma sequência sem fim de oponentes cada vez mais fortes. O herói ganha XP a cada batalha, sobe de nível e libera cartas e evoluções.', 'An endless run of ever stronger opponents. The hero earns XP each battle, levels up and unlocks cards and evolutions.')}</small>
        <em>{L('Jogar', 'Play')} ▶</em>
      </span>
    </button>
    <div class="mode off" aria-disabled="true">
      <span class="pic"><img src="ui/batalha-multi.webp" alt="" draggable="false" /></span>
      <span class="body">
        <span class="ic"><Users size={20} /></span>
        <b>{L('Multijogador', 'Multiplayer')}</b>
        <small>{L('Duelos entre jogadores, cada um com o seu herói e o seu deck.', 'Duels between players, each with their own hero and deck.')}</small>
      </span>
      <span class="wip-tag big">{L('Em construção', 'Work in progress')}</span>
    </div>
  </div>
</div>

<style>
  .modes { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .bg { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(7 6 12 / .55), rgb(7 6 12 / .88)), url('/ui/fundo.webp') center / cover; image-rendering: pixelated; }
  .wrap { position: relative; flex: 1; min-height: 0; display: flex; gap: clamp(18px, 3vw, 48px); align-items: center; justify-content: center; padding: 24px; overflow-y: auto; flex-wrap: wrap; }
  .mode { position: relative; width: min(360px, 29vw); min-width: 260px; display: flex; flex-direction: column; padding: 0; text-align: left; cursor: pointer; color: var(--text); font: inherit;
    border: 3px solid #4a417a; background: #0d0b16; box-shadow: 0 0 0 3px #05040a, 0 6px 0 3px #05040a, 0 24px 60px rgb(0 0 0 / .6); transition: transform .18s cubic-bezier(.2, .7, .3, 1), border-color .15s, box-shadow .15s; }
  .mode:hover:not(.off), .mode:focus-visible { transform: translateY(-8px); border-color: var(--accent-2); box-shadow: 0 0 0 3px #05040a, 0 6px 0 3px #05040a, 0 0 40px rgb(240 190 110 / .35), 0 30px 70px rgb(0 0 0 / .7); outline: none; }
  .pic { display: block; aspect-ratio: 4 / 4.2; overflow: hidden; border-bottom: 3px solid #4a417a; }
  .pic img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; image-rendering: pixelated; display: block; transition: transform .6s cubic-bezier(.2, .7, .3, 1); }
  .mode:hover:not(.off) .pic img, .mode:focus-visible .pic img { transform: scale(1.06); }
  .body { display: grid; grid-template-columns: auto 1fr auto; gap: 4px 12px; align-items: center; padding: 16px 18px 18px; background: linear-gradient(180deg, #17132a, #0d0b16); }
  .ic { grid-row: 1 / 3; width: 42px; height: 42px; display: grid; place-items: center; border: 2px solid #4a417a; color: var(--accent-2); background: #0b0913; }
  .body b { font: 400 22px var(--pixel); letter-spacing: .08em; text-transform: uppercase; color: var(--accent-2); }
  .body small { grid-column: 2 / 4; font: 400 13.5px/1.45 var(--pixel-text); color: var(--text-2); }
  .body em { grid-row: 1; grid-column: 3; font: 400 11px var(--pixel); font-style: normal; letter-spacing: .1em; text-transform: uppercase; color: var(--text-2); }
  .mode:hover em, .mode:focus-visible em { color: var(--accent-2); }
  .mode.off { cursor: default; }
  .mode.off .pic img { filter: grayscale(.9) brightness(.45); }
  .mode.off .body { filter: grayscale(.8); opacity: .55; }
  .wip-tag.big { position: absolute; left: 50%; top: 36%; transform: translate(-50%, -50%) rotate(-7deg); font-size: 15px; padding: 7px 16px 5px; }
</style>
