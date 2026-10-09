<!-- Amostra isolada: não participa do catálogo nem altera a aparência salva dos heróis. -->
<script lang="ts">
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import ScreenBar from '../common/ScreenBar.svelte';

  type Outfit = 'leather' | 'steel' | 'traveler';
  const outfits = [
    { id: 'leather' as const, label: ['Couro', 'Leather'] },
    { id: 'steel' as const, label: ['Aço', 'Steel'] },
    { id: 'traveler' as const, label: ['Viajante', 'Traveler'] },
  ];
  const bodies = [
    { id: 'normal', label: ['Corpo normal', 'Normal build'] },
    { id: 'strong', label: ['Musculoso mais alto', 'Taller muscular build'] },
  ];
  let outfit = $state<Outfit>('leather');
  let scale = $state(3);
  let missing = $state<string[]>([]);
  const logicalSize = 64;
  const size = $derived(logicalSize * scale);
  const currentOutfit = $derived(outfits.find((entry) => entry.id === outfit)!);
  const source = (body: string, look: Outfit) => `/art/rework/styleSamples/cosmetics-${body}-${look}.png`;
  function imageError(path: string) {
    if (!missing.includes(path)) missing = [...missing, path];
  }
</script>

<div class="samples">
  <ScreenBar title={L('Amostras de personagens', 'Character samples')} kicker={L('Estudo visual', 'Visual study')} onback={() => router.go('/')} />
  <main>
    <p class="intro">{L('Compare as proporções e os cosméticos na mesma escala. Ambos os modelos aparecem de frente.', 'Compare proportions and cosmetics at the same scale. Both models face forward.')}</p>
    <div class="controls">
      <div class="outfits" role="group" aria-label={L('Combinação de cosméticos', 'Cosmetic combination')}>
        {#each outfits as entry (entry.id)}
          <button class="px-btn" class:gold={outfit === entry.id} aria-pressed={outfit === entry.id} onclick={() => (outfit = entry.id)}>{L(entry.label[0], entry.label[1])}</button>
        {/each}
      </div>
      <label class="scale" for="sample-scale">
        <span>{L('Tamanho', 'Size')} <b>{scale}×</b></span>
        <input id="sample-scale" type="range" min="2" max="5" step="1" bind:value={scale} />
        <small>{L('Batalha → inspeção', 'Battle → inspection')}</small>
      </label>
    </div>
    <div class="comparison-scroll">
      <section class="comparison" aria-label={L('Comparação de corpos', 'Body comparison')}>
        {#each bodies as body (body.id)}
          {@const path = source(body.id, outfit)}
          <article class="model">
            <h2>{L(body.label[0], body.label[1])}</h2>
            <div class="stage" style="--sprite-size:{size}px; --foot-offset:{56 * scale}px">
              <div class="ground" aria-hidden="true"></div>
              {#if missing.includes(path)}
                <p class="missing">{L('Esta amostra ainda não está disponível.', 'This sample is not available yet.')}</p>
              {:else}
                {#key path}
                  <img class="sprite" src={path} width={128} height={128} alt={`${L(body.label[0], body.label[1])} · ${L(currentOutfit.label[0], currentOutfit.label[1])}`} onerror={() => imageError(path)} />
                {/key}
              {/if}
            </div>
            <p class="look">{L(currentOutfit.label[0], currentOutfit.label[1])}</p>
          </article>
        {/each}
      </section>
    </div>
    <p class="note">{L('Amostra visual com combinações já montadas. Movimento e encaixe entre peças ainda não foram validados.', 'Visual sample with assembled combinations. Movement and fitting between separate parts have not been validated yet.')}</p>
  </main>
</div>

<style>
  .samples { height: 100%; display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% 0, #1c1636, var(--bg) 65%); }
  main { flex: 1; min-height: 0; overflow: auto; padding: 24px 22px 32px; }
  .intro { max-width: 760px; margin: 0 auto 22px; text-align: center; color: var(--text-2); }
  .controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; max-width: 880px; margin: 0 auto 20px; }
  .outfits { display: flex; flex-wrap: wrap; gap: 8px; }
  .scale { display: grid; grid-template-columns: auto 150px; gap: 4px 12px; align-items: center; color: var(--text-2); font-size: 12px; }
  .scale b { color: var(--accent-2); }
  .scale input { width: 150px; accent-color: var(--accent); cursor: pointer; }
  .scale small { grid-column: 2; color: var(--muted); text-align: center; }
  .comparison-scroll { overflow-x: auto; max-width: 880px; margin: auto; padding-bottom: 5px; }
  .comparison { display: grid; grid-template-columns: repeat(2, minmax(360px, 1fr)); gap: 18px; min-width: 738px; }
  .model { margin: 0; padding: 18px 14px 14px; border: 2px solid #332a4c; background: linear-gradient(180deg, #191423, #0d0b15); }
  h2 { margin: 0 0 16px; text-align: center; color: var(--accent-2); font: 400 15px var(--pixel); }
  .stage { position: relative; display: flex; justify-content: center; height: 330px; overflow: hidden; background: repeating-conic-gradient(rgb(255 255 255 / .025) 0 25%, transparent 0 50%) 0 0 / 16px 16px, #100e15; border: 1px solid #2e2740; }
  .sprite { position: absolute; width: var(--sprite-size); height: var(--sprite-size); max-width: none; top: calc(290px - var(--foot-offset)); image-rendering: pixelated; image-rendering: crisp-edges; z-index: 1; }
  .ground { position: absolute; top: 290px; left: 10%; right: 10%; height: 1px; background: #746449; }
  .ground::after { content: ''; position: absolute; left: 50%; top: -8px; height: 17px; width: 1px; background: #746449; }
  .look { margin: 12px 0 0; text-align: center; color: var(--muted); font-size: 12px; }
  .missing { align-self: center; max-width: 240px; text-align: center; color: var(--muted); }
  .note { max-width: 760px; margin: 20px auto 0; color: var(--muted); font-size: 12px; text-align: center; }
  @media (max-width: 600px) { main { padding: 18px 12px 28px; } .controls { justify-content: center; } }
</style>
