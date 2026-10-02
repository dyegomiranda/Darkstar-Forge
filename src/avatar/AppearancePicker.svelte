<!--
  Aparência do herói: à esquerda as categorias (corpo, roupas, armas…); à direita,
  uma caixinha por opção, já mostrando o herói com ela, e as cores da peça escolhida.
-->
<script lang="ts">
  import { Ban, User, Scissors, Smile, Ear, Shirt, Footprints, Hand, Crown, Glasses, Gem, Shield, Sword, Feather, Backpack, Check, Sparkles, Ribbon, Wind, Rabbit } from '@lucide/svelte';
  import { L } from '../app/i18n.svelte';
  import DollThumb from './DollThumb.svelte';
  import { colorsOf, itemOf, LPC, OWN_SKIN, SKINS, swatch, type Avatar, type Body, type SlotId } from './lpc';

  let { avatar, onchange }: { avatar: Avatar; onchange: (a: Avatar) => void } = $props();

  type Cat = SlotId | 'body';
  let cat = $state<Cat>('body');

  const HEAD = [12, 0, 40, 44] as const, FULL = [8, 2, 48, 62] as const, LEGS = [12, 26, 40, 38] as const, WIDE = [0, 0, 64, 64] as const;
  /** Categorias, na ordem em que aparecem, por grupo; `crop` = parte do boneco que a caixinha mostra. */
  const GROUPS: { pt: string; en: string; cats: { id: Cat; icon: typeof User; crop: readonly [number, number, number, number]; px: number }[] }[] = [
    { pt: 'Corpo', en: 'Body', cats: [
      { id: 'body', icon: User, crop: FULL, px: 2 }, { id: 'hair', icon: Scissors, crop: HEAD, px: 3 }, { id: 'beard', icon: Smile, crop: HEAD, px: 3 },
      { id: 'mustache', icon: Smile, crop: HEAD, px: 3 }, { id: 'nose', icon: Smile, crop: HEAD, px: 3 }, { id: 'ears', icon: Ear, crop: HEAD, px: 3 },
      { id: 'horns', icon: Sparkles, crop: HEAD, px: 3 }, { id: 'wings', icon: Feather, crop: WIDE, px: 2 }, { id: 'tail', icon: Rabbit, crop: WIDE, px: 2 },
    ] },
    { pt: 'Roupas', en: 'Clothes', cats: [
      { id: 'torso', icon: Shirt, crop: FULL, px: 2 }, { id: 'legs', icon: Footprints, crop: LEGS, px: 3 }, { id: 'feet', icon: Footprints, crop: LEGS, px: 3 },
      { id: 'arms', icon: Hand, crop: FULL, px: 2 }, { id: 'shoulders', icon: Shield, crop: FULL, px: 2 }, { id: 'head', icon: Crown, crop: HEAD, px: 3 },
      { id: 'face', icon: Glasses, crop: HEAD, px: 3 }, { id: 'neck', icon: Gem, crop: FULL, px: 2 }, { id: 'belt', icon: Ribbon, crop: FULL, px: 2 },
      { id: 'cape', icon: Wind, crop: WIDE, px: 2 }, { id: 'back', icon: Backpack, crop: WIDE, px: 2 },
    ] },
    { pt: 'Armas', en: 'Arms', cats: [
      { id: 'weapon', icon: Sword, crop: WIDE, px: 2 }, { id: 'shield', icon: Shield, crop: WIDE, px: 2 },
    ] },
  ];
  const catOf = (id: Cat) => GROUPS.flatMap((g) => g.cats).find((c) => c.id === id)!;
  const nameOf = (id: Cat) => (id === 'body' ? L('Corpo e pele', 'Body & skin') : L(LPC.slots.find((s) => s.id === id)!.pt, LPC.slots.find((s) => s.id === id)!.en));
  /** Categorias que este corpo pode usar (barba e bigode: só no masculino). */
  const usable = (id: Cat) => id === 'body' || (!(avatar.body === 'female' && (id === 'beard' || id === 'mustache')) && LPC.slots.find((s) => s.id === id)!.items.some((i) => i.bodies.includes(avatar.body)));

  const set = (fn: (a: Avatar) => void) => { const a = JSON.parse(JSON.stringify(avatar)) as Avatar; fn(a); onchange(a); };
  const slotId = $derived(cat === 'body' ? null : cat);
  const slot = $derived(slotId ? LPC.slots.find((s) => s.id === slotId)! : null);
  const items = $derived(slot ? slot.items.filter((i) => i.bodies.includes(avatar.body)) : []);
  const current = $derived(slotId ? itemOf(slotId, avatar.parts[slotId]?.id) : undefined);
  const colors = $derived(current && slotId ? colorsOf(current, slotId) : []);
  const ownSkin = $derived(!!slotId && OWN_SKIN.includes(slotId) && !current?.variants);
  const view = $derived(catOf(cat));

  /** O boneco com uma opção trocada (para a miniatura). */
  function withPart(id: string | null): Avatar {
    const a = JSON.parse(JSON.stringify(avatar)) as Avatar;
    if (!slotId) return a;
    if (!id) { delete a.parts[slotId]; return a; }
    const it = itemOf(slotId, id)!;
    const cs = colorsOf(it, slotId), keep = a.parts[slotId]?.color;
    // barba e bigode nascem da cor do cabelo
    const hair = (slotId === 'beard' || slotId === 'mustache') && cs.some((c) => c.name === a.parts.hair?.color) ? a.parts.hair?.color : undefined;
    a.parts[slotId] = { id, color: cs.some((c) => c.name === keep) ? keep : OWN_SKIN.includes(slotId) && !it.variants ? undefined : hair ?? cs[0]?.name };
    return a;
  }
  const withBody = (b: Body): Avatar => {
    const a = JSON.parse(JSON.stringify(avatar)) as Avatar;
    a.body = b;
    // peças que não existem para este corpo saem
    for (const s of LPC.slots) { const it = itemOf(s.id, a.parts[s.id]?.id); if (it && !it.bodies.includes(b)) delete a.parts[s.id]; }
    if (b === 'female') { delete a.parts.beard; delete a.parts.mustache; }
    return a;
  };
  const pick = (id: string | null) => onchange(withPart(id));
</script>

<div class="ap">
  <nav class="cats" aria-label={L('Categorias', 'Categories')}>
    {#each GROUPS as g}
      <span class="gname">{L(g.pt, g.en)}</span>
      {#each g.cats.filter((c) => usable(c.id)) as c (c.id)}
        <button class="cat" class:on={cat === c.id} class:has={c.id !== 'body' && !!avatar.parts[c.id]} onclick={() => (cat = c.id)}>
          <c.icon size={15} strokeWidth={1.9} /><span>{nameOf(c.id)}</span>{#if c.id !== 'body' && avatar.parts[c.id]}<i></i>{/if}
        </button>
      {/each}
    {/each}
  </nav>

  <div class="pane">
    <header class="phead">
      <h3>{nameOf(cat)}</h3>
      {#if slot}<small>{items.length} {L('opções', 'options')}</small>{/if}
    </header>

    {#if cat === 'body'}
      <div class="tiles">
        {#each [['male', 'Masculino', 'Male'], ['female', 'Feminino', 'Female']] as const as [b, pt, en] (b)}
          <button class="tile" class:on={avatar.body === b} onclick={() => onchange(withBody(b))}>
            <span class="tpic"><DollThumb avatar={withBody(b)} crop={FULL} px={2} /></span>
            <span class="tname">{L(pt, en)}</span>
            {#if avatar.body === b}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
          </button>
        {/each}
      </div>
      <div class="pal"><span>{L('Pele', 'Skin')}</span>
        <div class="sw">{#each SKINS as c}<button class:on={avatar.skin === c} style="--k:{swatch('body', c)}" title={c} aria-label={c} onclick={() => set((a) => { a.skin = c; })}></button>{/each}</div></div>
      <div class="pal"><span>{L('Olhos', 'Eyes')}</span>
        <div class="sw">{#each Object.keys(LPC.palettes.eye.colors) as c}<button class:on={avatar.eyes === c} style="--k:{LPC.palettes.eye.colors[c][1]}" title={c} aria-label={c} onclick={() => set((a) => { a.eyes = c; })}></button>{/each}</div></div>
    {:else if slot}
      {#if current && (colors.length > 1 || ownSkin)}
        <div class="pal"><span>{L('Cor', 'Color')} — {L(current.pt, current.en)}</span>
          <div class="sw">
            {#if ownSkin}<button class="skin" class:on={!avatar.parts[slot.id]?.color} title={L('Mesma cor da pele', 'Same as the skin')} aria-label={L('Mesma cor da pele', 'Same as the skin')} style="--k:{swatch('body', avatar.skin)}" onclick={() => set((a) => { if (a.parts[slot.id]) delete a.parts[slot.id]!.color; })}><User size={12} /></button>{/if}
            {#each colors as c}<button class:on={avatar.parts[slot.id]?.color === c.name} style="--k:{c.hex}" title={c.name} aria-label={c.name} onclick={() => set((a) => { if (a.parts[slot.id]) a.parts[slot.id]!.color = c.name; })}></button>{/each}
          </div></div>
      {/if}
      <div class="tiles">
        {#if slot.optional}
          <button class="tile none" class:on={!current} onclick={() => pick(null)}>
            <span class="tpic"><DollThumb avatar={withPart(null)} crop={view.crop} px={view.px} /><span class="ban"><Ban size={15} /></span></span>
            <span class="tname">{L('Nenhum', 'None')}</span>
            {#if !current}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
          </button>
        {/if}
        {#each items as it (it.id)}
          <button class="tile" class:on={current?.id === it.id} onclick={() => pick(it.id)} title={L(it.pt, it.en)}>
            <span class="tpic"><DollThumb avatar={withPart(it.id)} crop={view.crop} px={view.px} /></span>
            <span class="tname">{L(it.pt, it.en)}</span>
            {#if current?.id === it.id}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .ap { display: grid; grid-template-columns: 188px minmax(0, 1fr); gap: 16px; min-height: 0; height: 100%; }
  .cats { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; padding-right: 6px; min-height: 0; }
  .gname { font: 400 10px var(--pixel); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); padding: 10px 8px 4px; opacity: .85; }
  .gname:first-child { padding-top: 2px; }
  .cat { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border: 1px solid transparent; border-radius: 6px; background: none; color: var(--muted); font: 500 13px var(--ui); cursor: pointer; text-align: left; transition: background var(--t), color var(--t); }
  .cat span { flex: 1; }
  .cat:hover { color: var(--text); background: rgb(255 255 255 / .04); }
  .cat.has { color: var(--text-2); }
  .cat.on { color: var(--accent-2); background: var(--accent-soft); border-color: rgb(227 181 102 / .35); }
  .cat i { width: 6px; height: 6px; background: var(--accent); box-shadow: 0 0 6px var(--accent); }

  .pane { display: flex; flex-direction: column; gap: 12px; min-width: 0; min-height: 0; overflow-y: auto; padding-right: 6px; }
  .phead { display: flex; align-items: baseline; gap: 10px; position: sticky; top: 0; z-index: 2; background: linear-gradient(180deg, var(--panel-bg, #12101c) 70%, transparent); padding-bottom: 6px; }
  .phead h3 { font: 400 15px var(--pixel); letter-spacing: .06em; color: var(--text); }
  .phead small { color: var(--muted); font-size: 12px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 10px; }
  .tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px 7px; cursor: pointer; color: var(--text-2); font: 500 11.5px var(--ui);
    background: linear-gradient(180deg, #1c1830, #110f1c); border: 2px solid #2c2647; border-radius: 4px; transition: border-color var(--t), transform var(--t), background var(--t); }
  .tile:hover { border-color: #6a5fa8; transform: translateY(-2px); color: var(--text); }
  .tile.on { border-color: var(--accent); background: linear-gradient(180deg, #2c2540, #171325); color: var(--accent-2); box-shadow: 0 0 0 1px #000, 0 0 18px rgb(227 181 102 / .22); }
  .tpic { position: relative; display: grid; place-items: center; width: 100%; min-height: 124px; overflow: hidden; border-radius: 2px;
    background: radial-gradient(ellipse at 50% 100%, rgb(120 96 200 / .22), transparent 70%), repeating-conic-gradient(#15121f 0 25%, #191527 0 50%) 0 0 / 16px 16px; }
  .tname { text-align: center; line-height: 1.2; min-height: 2.4em; display: grid; place-items: center; }
  .tcheck { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; display: grid; place-items: center; background: var(--accent); color: #1a1308; }
  .ban { position: absolute; right: 6px; bottom: 6px; color: var(--muted); }
  .pal { display: flex; flex-direction: column; gap: 6px; }
  .pal > span { font-size: 12px; font-weight: 500; color: var(--muted); }
  .sw { display: flex; flex-wrap: wrap; gap: 5px; }
  .sw button { width: 26px; height: 26px; border: 2px solid rgb(0 0 0 / .55); outline: 1px solid rgb(255 255 255 / .12); background: var(--k); cursor: pointer; padding: 0; display: grid; place-items: center; color: rgb(0 0 0 / .65); transition: transform var(--t); }
  .sw button:hover { transform: scale(1.12); }
  .sw button.on { outline: 2px solid #fff; box-shadow: 0 0 0 4px var(--accent); z-index: 1; }
  @media (max-width: 900px) { .ap { grid-template-columns: 1fr; height: auto; } .cats { flex-direction: row; flex-wrap: wrap; } .gname { width: 100%; } }
</style>
