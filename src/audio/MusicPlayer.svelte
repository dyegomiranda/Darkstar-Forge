<!--
  Tocador de música: nome da faixa, pausar/tocar, parar, próxima e (ao abrir) os volumes.
  `float` = versão flutuante sobre a mesa (começa recolhida num botão).
-->
<script lang="ts">
  import { Music, Pause, Play, Square, SkipForward, Volume2, VolumeX, ChevronDown } from '@lucide/svelte';
  import { L } from '../app/i18n.svelte';
  import { chip } from './chip';

  let { float = false }: { float?: boolean } = $props();

  let open = $state(!float);
  let tick = $state(0);
  $effect(() => chip.onchange(() => tick++));
  const name = $derived.by(() => { void tick; const t = chip.current; return t ? L(t.def.name[0], t.def.name[1]) : L('sem música', 'no music'); });
  const paused = $derived.by(() => { void tick; return chip.paused; });
  const muted = $derived.by(() => { void tick; return chip.muted; });
  let musicVol = $state(chip.musicVol);
  let sfxVol = $state(chip.sfxVol);
  $effect(() => { chip.setMusicVol(musicVol); });
  $effect(() => { chip.setSfxVol(sfxVol); });
</script>

<div class="mp" class:float class:open>
  {#if float && !open}
    <button class="pill" onclick={() => (open = true)} title={L('Música', 'Music')}><Music size={15} /> <span>{name}</span></button>
  {:else}
    <div class="head">
      <Music size={14} />
      <span class="nm" title={name}>{name}</span>
      {#if float}<button class="ic" onclick={() => (open = false)} title={L('Recolher', 'Collapse')}><ChevronDown size={14} /></button>{/if}
    </div>
    <div class="ctl">
      {#if paused}
        <button class="ic big" onclick={() => chip.resume()} title={L('Tocar', 'Play')}><Play size={16} /></button>
      {:else}
        <button class="ic big" onclick={() => chip.pause()} title={L('Pausar', 'Pause')}><Pause size={16} /></button>
      {/if}
      <button class="ic" onclick={() => chip.stop()} title={L('Parar', 'Stop')}><Square size={14} /></button>
      <button class="ic" onclick={() => chip.next()} title={L('Próxima faixa', 'Next track')}><SkipForward size={15} /></button>
      <button class="ic" onclick={() => chip.setMute(!muted)} title={muted ? L('Ligar o som', 'Unmute') : L('Silenciar tudo', 'Mute all')}>{#if muted}<VolumeX size={15} />{:else}<Volume2 size={15} />{/if}</button>
    </div>
    <div class="vols">
      <label><small>{L('Música', 'Music')}</small><input type="range" min="0" max="1" step="0.05" bind:value={musicVol} /></label>
      <label><small>{L('Sons', 'Sounds')}</small><input type="range" min="0" max="1" step="0.05" bind:value={sfxVol} /></label>
    </div>
  {/if}
</div>

<style>
  .mp { display: flex; align-items: center; gap: 12px; color: var(--text-2); }
  .mp.float { position: absolute; right: 16px; top: calc(50% - 44px); transform: translateY(-100%); z-index: 30; }
  .mp.float.open { flex-direction: column; align-items: stretch; gap: 8px; width: 210px; padding: 10px 12px; border-radius: 14px; background: rgb(18 15 14 / .96); border: 1px solid var(--line-2); box-shadow: 0 18px 50px rgb(0 0 0 / .7); }
  .pill { display: inline-flex; gap: 6px; align-items: center; max-width: 190px; padding: 8px 12px; border-radius: 99px; border: 1px solid var(--line-2); background: rgb(22 19 17 / .92); color: var(--text-2); font: 600 12px var(--ui); cursor: pointer; box-shadow: 0 8px 20px rgb(0 0 0 / .5); }
  .pill span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pill:hover { color: var(--accent-2); border-color: var(--accent); }
  .head { display: flex; align-items: center; gap: 6px; min-width: 0; font: 600 12.5px var(--ui); color: var(--accent-2); }
  .nm { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
  .ctl { display: flex; gap: 4px; align-items: center; }
  .ic { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text-2); cursor: pointer; }
  .ic:hover { color: var(--accent-2); border-color: var(--accent); }
  .ic.big { width: 36px; background: var(--accent-soft); color: var(--accent-2); border-color: rgb(216 176 106 / .4); }
  .vols { display: flex; gap: 10px; }
  .vols label { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .vols small { font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .vols input { width: 100%; min-width: 70px; accent-color: var(--accent); }
</style>
