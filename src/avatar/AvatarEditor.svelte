<!--
  Criador do boneco: gênero, pele, olhos e as peças (cabelo, roupas, armadura, arma),
  cada uma com a sua cor. À esquerda o boneco animado; "Usar como retrato" tira a foto.
-->
<script lang="ts">
  import { RotateCcw, RotateCw, Camera, Dices, Ban } from '@lucide/svelte';
  import { L } from '../app/i18n.svelte';
  import AvatarSprite from './AvatarSprite.svelte';
  import { attackAnim, colorsOf, DIRS, itemOf, LPC, SKINS, swatch, type Anim, type Avatar, type Body, type Dir, type SlotId } from './lpc';

  let { avatar, color = '#6b5532', onchange, onportrait }: {
    avatar: Avatar; color?: string; onchange: (a: Avatar) => void; onportrait: () => void;
  } = $props();

  let dir = $state<Dir>('s');
  let anim = $state<Anim>('idle');
  let tab = $state<SlotId>('hair');
  const LOOPS: Anim[] = ['idle', 'walk'];

  const set = (fn: (a: Avatar) => void) => { const a = JSON.parse(JSON.stringify(avatar)) as Avatar; fn(a); onchange(a); };
  const turn = (d: number) => { dir = DIRS[(DIRS.indexOf(dir) + d + 4) % 4]; };
  const slot = $derived(LPC.slots.find((s) => s.id === tab)!);
  const items = $derived(slot.items.filter((i) => i.bodies.includes(avatar.body)));
  const current = $derived(itemOf(tab, avatar.parts[tab]?.id));
  const colors = $derived(current ? colorsOf(current) : []);

  function setBody(b: Body) {
    set((a) => {
      a.body = b;
      // peças que não existem para este corpo saem
      for (const s of LPC.slots) { const it = itemOf(s.id, a.parts[s.id]?.id); if (it && !it.bodies.includes(b)) delete a.parts[s.id]; }
    });
  }
  function pick(id: string | null) {
    set((a) => {
      if (!id) { delete a.parts[tab]; return; }
      const it = itemOf(tab, id)!;
      const cs = colorsOf(it);
      const keep = a.parts[tab]?.color;
      a.parts[tab] = { id, color: cs.some((c) => c.name === keep) ? keep : cs[0]?.name };
    });
  }
  function random() {
    const rnd = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    set((a) => {
      a.skin = rnd(SKINS.slice(0, 7));
      a.eyes = rnd(Object.keys(LPC.palettes.eye.colors));
      for (const s of LPC.slots) {
        const pool = s.items.filter((i) => i.bodies.includes(a.body));
        const skip = ['beard', 'arms', 'shoulders', 'head', 'cape'].includes(s.id) && Math.random() < 0.55;
        if (skip || !pool.length || (s.id === 'beard' && a.body === 'female')) { delete a.parts[s.id]; continue; }
        const it = rnd(pool);
        a.parts[s.id] = { id: it.id, color: rnd(colorsOf(it))?.name };
      }
    });
  }
  const ANIMS: { id: Anim; pt: string; en: string }[] = [
    { id: 'idle', pt: 'Parado', en: 'Idle' }, { id: 'walk', pt: 'Andar', en: 'Walk' }, { id: 'slash', pt: 'Golpear', en: 'Slash' },
    { id: 'thrust', pt: 'Estocar', en: 'Thrust' }, { id: 'shoot', pt: 'Atirar', en: 'Shoot' }, { id: 'spellcast', pt: 'Conjurar', en: 'Cast' }, { id: 'hurt', pt: 'Cair', en: 'Fall' },
  ];
</script>

<div class="ae">
  <div class="stage" style="--c:{color}">
    <div class="floor"></div>
    <div class="doll"><AvatarSprite {avatar} {anim} {dir} scale={5} loop={LOOPS.includes(anim)} onend={() => setTimeout(() => (anim = 'idle'), 500)} /></div>
    <div class="turn">
      <button class="btn sm ghost icon" onclick={() => turn(1)} title={L('Girar', 'Rotate')}><RotateCcw size={15} /></button>
      <button class="btn sm ghost icon" onclick={() => turn(-1)} title={L('Girar', 'Rotate')}><RotateCw size={15} /></button>
    </div>
    <div class="anims">
      {#each ANIMS as a}<button class:on={anim === a.id} onclick={() => (anim = a.id)}>{L(a.pt, a.en)}</button>{/each}
      <button onclick={() => (anim = attackAnim(avatar))} title={L('O ataque da arma que ele segura', 'The attack of the weapon it holds')}>⚔ {L('Ataque da arma', 'Weapon attack')}</button>
    </div>
    <div class="stage-actions">
      <button class="btn sm primary" onclick={onportrait}><Camera size={14} /> {L('Usar como retrato', 'Use as portrait')}</button>
      <button class="btn sm" onclick={random}><Dices size={14} /> {L('Aleatório', 'Random')}</button>
    </div>
  </div>

  <div class="opts">
    <div class="rowx">
      <div class="field"><span>{L('Corpo', 'Body')}</span>
        <div class="seg"><button class:on={avatar.body === 'male'} onclick={() => setBody('male')}>{L('Masculino', 'Male')}</button><button class:on={avatar.body === 'female'} onclick={() => setBody('female')}>{L('Feminino', 'Female')}</button></div></div>
      <div class="field"><span>{L('Olhos', 'Eyes')}</span>
        <div class="sw">{#each Object.keys(LPC.palettes.eye.colors) as c}<button class:on={avatar.eyes === c} style="--k:{LPC.palettes.eye.colors[c][1]}" title={c} onclick={() => set((a) => { a.eyes = c; })}></button>{/each}</div></div>
    </div>
    <div class="field"><span>{L('Pele', 'Skin')}</span>
      <div class="sw">{#each SKINS as c}<button class:on={avatar.skin === c} style="--k:{swatch('body', c)}" title={c} onclick={() => set((a) => { a.skin = c; })}></button>{/each}</div></div>

    <div class="tabs">
      {#each LPC.slots as s}
        {#if !(s.id === 'beard' && avatar.body === 'female')}
          <button class:on={tab === s.id} class:has={!!avatar.parts[s.id]} onclick={() => (tab = s.id)}>{L(s.pt, s.en)}</button>
        {/if}
      {/each}
    </div>
    <div class="items">
      {#if slot.optional}<button class="it none" class:on={!current} onclick={() => pick(null)}><Ban size={13} /> {L('Nenhum', 'None')}</button>{/if}
      {#each items as it (it.id)}
        <button class="it" class:on={current?.id === it.id} onclick={() => pick(it.id)}>{L(it.pt, it.en)}</button>
      {/each}
    </div>
    {#if current && colors.length > 1}
      <div class="field"><span>{L('Cor', 'Color')} — {L(current.pt, current.en)}</span>
        <div class="sw">{#each colors as c}<button class:on={avatar.parts[tab]?.color === c.name} style="--k:{c.hex}" title={c.name} onclick={() => set((a) => { if (a.parts[tab]) a.parts[tab]!.color = c.name; })}></button>{/each}</div></div>
    {/if}
  </div>
</div>

<style>
  .ae { display: grid; grid-template-columns: 380px 1fr; gap: 18px; }
  .stage { position: relative; min-height: 430px; border-radius: 16px; overflow: hidden; display: grid; place-items: center;
    background: radial-gradient(ellipse at 50% 38%, color-mix(in srgb, var(--c) 34%, #1a1512), #0c0a09 78%); border: 1px solid var(--line); }
  .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 42%; background: linear-gradient(180deg, transparent, rgb(0 0 0 / .45)); border-top: 1px solid rgb(255 255 255 / .05); }
  .doll { position: relative; margin-top: -30px; }
  .turn { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; }
  .anims { position: absolute; left: 10px; right: 10px; bottom: 50px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .anims button { padding: 3px 9px; border-radius: 99px; border: 1px solid var(--line-2); background: rgb(12 10 9 / .7); color: var(--text-2); font: 500 11.5px var(--ui); cursor: pointer; }
  .anims button.on { border-color: var(--accent); color: var(--accent-2); }
  .stage-actions { position: absolute; left: 10px; right: 10px; bottom: 10px; display: flex; gap: 6px; justify-content: center; }
  .opts { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .rowx { display: flex; gap: 18px; flex-wrap: wrap; }
  .sw { display: flex; flex-wrap: wrap; gap: 5px; }
  .sw button { width: 24px; height: 24px; border-radius: 7px; border: 2px solid rgb(255 255 255 / .12); background: var(--k); cursor: pointer; padding: 0; }
  .sw button.on { border-color: #fff; box-shadow: 0 0 0 2px var(--accent); }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
  .tabs button { padding: 5px 11px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--muted); font: 600 12.5px var(--ui); cursor: pointer; }
  .tabs button.has { color: var(--text-2); }
  .tabs button.on { background: var(--accent-soft); color: var(--accent-2); border-color: rgb(216 176 106 / .4); }
  .items { display: flex; flex-wrap: wrap; gap: 6px; }
  .it { display: inline-flex; gap: 5px; align-items: center; padding: 6px 11px; border-radius: 9px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text-2); font: 500 12.5px var(--ui); cursor: pointer; }
  .it:hover { border-color: var(--accent); }
  .it.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-2); }
  @media (max-width: 900px) { .ae { grid-template-columns: 1fr; } }
</style>
