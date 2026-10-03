<!--
  Aparência do herói: à esquerda as categorias (corpo, rosto, roupas, armas…); no
  meio, uma caixinha por opção, já mostrando o herói com ela; logo abaixo da última
  fileira, as cores e os efeitos da peça escolhida (em listas longas ficam presas
  ao pé da tela, e as caixinhas rolam por cima).
-->
<script lang="ts">
  import { Ban, User, Scissors, Smile, Ear, Shirt, Footprints, Hand, Crown, Glasses, Gem, Shield, Sword, Feather, Backpack, Check, Sparkles, Ribbon, Wind, Rabbit, Eye, Minus, Swords, Flame } from '@lucide/svelte';
  import { L } from '../app/i18n.svelte';
  import DollThumb from './DollThumb.svelte';
  import { colorsOf, FX_COLORS, FX_KINDS, HUMAN_FACE, itemOf, LPC, OWN_SKIN, RACE_HEADS, RACE_LOOKS, SKINS, spectrum, swatch, TINTABLE, TINTS, type Avatar, type Body, type Dir, type Part, type SlotId } from './lpc';
  import { SETS, wearSet, wearing } from './sets';

  let { avatar, onchange }: { avatar: Avatar; onchange: (a: Avatar) => void } = $props();

  type Cat = SlotId | 'body' | 'look' | 'sets';
  let cat = $state<Cat>('body');

  const HEAD = [12, 0, 40, 44] as const, FULL = [8, 2, 48, 62] as const, LEGS = [12, 26, 40, 38] as const, WIDE = [0, 0, 64, 64] as const, FACE = [18, 12, 28, 26] as const;
  /** Categorias, na ordem em que aparecem, por grupo; `crop` = parte do boneco que a caixinha mostra. */
  const GROUPS: { pt: string; en: string; cats: { id: Cat; icon: typeof User; crop: readonly [number, number, number, number]; px: number; dir?: Dir }[] }[] = [
    { pt: 'Corpo', en: 'Body', cats: [
      { id: 'body', icon: User, crop: FULL, px: 2 }, { id: 'look', icon: Eye, crop: FACE, px: 4 }, { id: 'eyebrows', icon: Minus, crop: FACE, px: 4 },
      { id: 'hair', icon: Scissors, crop: HEAD, px: 3 }, { id: 'beard', icon: Smile, crop: HEAD, px: 3 },
      { id: 'mustache', icon: Smile, crop: HEAD, px: 3 }, { id: 'nose', icon: Smile, crop: FACE, px: 4 }, { id: 'ears', icon: Ear, crop: HEAD, px: 3 },
      { id: 'horns', icon: Sparkles, crop: HEAD, px: 3 }, { id: 'wings', icon: Feather, crop: WIDE, px: 2 }, { id: 'tail', icon: Rabbit, crop: WIDE, px: 2, dir: 'e' },
    ] },
    { pt: 'Roupas e armaduras', en: 'Clothes & armor', cats: [
      { id: 'sets', icon: Swords, crop: FULL, px: 2 },
      { id: 'torso', icon: Shirt, crop: FULL, px: 2 }, { id: 'legs', icon: Footprints, crop: LEGS, px: 3 }, { id: 'feet', icon: Footprints, crop: LEGS, px: 3 },
      { id: 'arms', icon: Shield, crop: FULL, px: 2 }, { id: 'hands', icon: Hand, crop: FULL, px: 2 }, { id: 'shoulders', icon: Shield, crop: FULL, px: 2 }, { id: 'head', icon: Crown, crop: HEAD, px: 3 },
      { id: 'crest', icon: Flame, crop: HEAD, px: 3 }, { id: 'visor', icon: Glasses, crop: HEAD, px: 3 },
      { id: 'face', icon: Glasses, crop: HEAD, px: 3 }, { id: 'neck', icon: Gem, crop: FULL, px: 2 }, { id: 'belt', icon: Ribbon, crop: FULL, px: 2 },
      { id: 'cape', icon: Wind, crop: WIDE, px: 2, dir: 'n' }, { id: 'back', icon: Backpack, crop: WIDE, px: 2, dir: 'n' },
    ] },
    { pt: 'Armas', en: 'Arms', cats: [
      { id: 'weapon', icon: Sword, crop: WIDE, px: 2 }, { id: 'shield', icon: Shield, crop: WIDE, px: 2 },
    ] },
  ];
  const catOf = (id: Cat) => GROUPS.flatMap((g) => g.cats).find((c) => c.id === id)!;
  const slotName = (id: SlotId) => { const s = LPC.slots.find((x) => x.id === id)!; return L(s.pt, s.en); };
  const nameOf = (id: Cat) => (id === 'body' ? L('Corpo, raça e pele', 'Body, race & skin') : id === 'look' ? L('Olhos', 'Eyes') : id === 'sets' ? L('Conjuntos', 'Sets') : slotName(id));
  const isSlot = (id: Cat): id is SlotId => id !== 'body' && id !== 'look' && id !== 'sets';
  /** Categorias que este boneco pode usar (barba e bigode: só no corpo masculino; rosto humano: só em cabeça humana). */
  function usable(id: Cat): boolean {
    if (id === 'body' || id === 'sets') return true;
    if (id === 'look') return true;
    if (avatar.head && HUMAN_FACE.includes(id)) return false;
    if (avatar.body === 'female' && (id === 'beard' || id === 'mustache')) return false;
    return LPC.slots.find((s) => s.id === id)!.items.some((i) => i.bodies.includes(avatar.body));
  }
  // (orelhas: sem peça escolhida, o boneco usa as humanas, que também contam como escolhidas)
  const has = (id: Cat) => (id === 'ears' ? !avatar.head : isSlot(id) ? !!avatar.parts[id] : id === 'sets' ? SETS.some((s) => wearing(avatar, s)) : false);
  $effect(() => { if (!usable(cat)) cat = 'body'; });

  const clone = () => JSON.parse(JSON.stringify(avatar)) as Avatar;
  const set = (fn: (a: Avatar) => void) => { const a = clone(); fn(a); onchange(a); };
  const slotId = $derived(isSlot(cat) ? cat : null);
  const slot = $derived(slotId ? LPC.slots.find((s) => s.id === slotId)! : null);
  const items = $derived(slot ? slot.items.filter((i) => i.bodies.includes(avatar.body)) : []);
  const part = $derived<Part | undefined>(slotId ? avatar.parts[slotId] : undefined);
  const current = $derived(slotId ? itemOf(slotId, part?.id) : undefined);
  const colors = $derived(current && slotId ? spectrum(colorsOf(current, slotId), (c) => c.hex) : []);
  const skins = spectrum(SKINS, (c) => swatch('body', c));
  const tints = spectrum(Object.entries(TINTS), ([, t]) => t.ramp[2]);
  const fxColors = spectrum(Object.entries(FX_COLORS), ([, f]) => f.ramp[1]);
  const ownSkin = $derived(!!slotId && OWN_SKIN.includes(slotId) && !current?.variants);
  const tintable = $derived(!!slotId && TINTABLE.includes(slotId) && !!current);
  const view = $derived(catOf(cat));
  const edit = (fn: (p: Part) => void) => set((a) => { if (slotId && a.parts[slotId]) fn(a.parts[slotId]!); });

  /** O boneco com uma opção trocada (para a miniatura). */
  function withPart(id: string | null): Avatar {
    const a = clone();
    if (!slotId) return a;
    if (!id) { delete a.parts[slotId]; return a; }
    const it = itemOf(slotId, id)!;
    const cs = colorsOf(it, slotId), keep = a.parts[slotId]?.color;
    // barba, bigode e sobrancelhas nascem da cor do cabelo
    const hair = (['beard', 'mustache', 'eyebrows'] as SlotId[]).includes(slotId) && cs.some((c) => c.name === a.parts.hair?.color) ? a.parts.hair?.color : undefined;
    // (escolher o modelo comum tira o feitio de conjunto que a peça tinha)
    a.parts[slotId] = { ...a.parts[slotId], style: undefined, id, color: cs.some((c) => c.name === keep) ? keep : OWN_SKIN.includes(slotId) && !it.variants ? undefined : hair ?? cs[0]?.name };
    return a;
  }
  const withBody = (b: Body): Avatar => {
    const a = clone();
    a.body = b;
    // peças que não existem para este corpo saem
    for (const s of LPC.slots) { const it = itemOf(s.id, a.parts[s.id]?.id); if (it && !it.bodies.includes(b)) delete a.parts[s.id]; }
    if (b === 'female') { delete a.parts.beard; delete a.parts.mustache; }
    return a;
  };
  /** Troca a raça do boneco: a cabeça (e o corpo, no esqueleto e no zumbi) e a pele que combina. */
  const withRace = (id: string | null): Avatar => {
    const a = clone();
    // sai o que era da raça de cabeça humana anterior (chifres, cauda, olhos…)
    const old = RACE_LOOKS.find((x) => x.id === a.race);
    if (old) {
      for (const k of Object.keys(old.parts) as SlotId[]) if (a.parts[k]?.id === old.parts[k]!.id) delete a.parts[k];
      if (a.eyes === old.eyes) a.eyes = 'brown';
      if (a.skin === old.skin) a.skin = 'light';
      delete a.race;
    }
    const look = RACE_LOOKS.find((x) => x.id === id);
    if (look) {
      delete a.head; delete a.frame;
      a.race = look.id; a.skin = look.skin; a.eyes = look.eyes;
      for (const [k, v] of Object.entries(look.parts) as [SlotId, Part][]) a.parts[k] = { ...v };
      return a;
    }
    const r = RACE_HEADS.find((x) => x.id === id);
    if (!r) { delete a.head; delete a.frame; if (!SKINS.slice(0, 7).includes(a.skin)) a.skin = 'light'; return a; }
    a.head = r.id;
    if (r.frame) a.frame = r.frame; else delete a.frame;
    if (r.skin) a.skin = r.skin;
    return a;
  };
  const withFace = (f: string): Avatar => { const a = clone(); if (f === 'neutral') delete a.face; else a.face = f; delete a.parts.eyes; return a; };
  const pick = (id: string | null) => { if (slotId) delete chosen[slotId]; onchange(withPart(id)); };

  /** As peças dos conjuntos que cabem nesta categoria (cada uma já com o metal ou o tecido do conjunto). */
  const setPieces = $derived.by(() => {
    if (!slotId) return [];
    const seen = new Set<string>();
    return SETS.flatMap((st) => {
      const p = st.parts[slotId], it = p ? itemOf(slotId, p.id) : undefined;
      if (!p || !it?.bodies.includes(avatar.body) || seen.has(`${p.id}/${p.color}/${p.style}`)) return [];
      seen.add(`${p.id}/${p.color}/${p.style}`);
      return [{ set: st, part: p, item: it }];
    });
  });
  /**
   * Qual peça de conjunto o jogador escolheu em cada categoria. Várias peças são o mesmo modelo em metais
   * diferentes: guardar a escolha mantém a caixinha marcada (e com a cor nova) quando ele troca a cor depois.
   */
  let chosen = $state<Partial<Record<SlotId, string>>>({});
  const pieceOn = $derived.by(() => {
    if (!slotId || !part) return undefined;
    const same = setPieces.filter((x) => x.part.id === part.id && x.part.style === part.style);
    // (a peça com feitio é do seu conjunto, seja qual for a cor; sem feitio, vale a escolha feita aqui ou a cor do conjunto)
    return (same.find((x) => x.set.id === chosen[slotId]) ?? (part.style ? same[0] : same.find((x) => x.part.color === part.color)))?.set.id;
  });
  const withPiece = (p: Part): Avatar => { const a = clone(); if (slotId) { a.parts[slotId] = { ...a.parts[slotId], ...p }; if (!p.style) delete a.parts[slotId]!.style; } return a; };
  const pickPiece = (setId: string, p: Part) => { if (slotId) chosen[slotId] = setId; onchange(withPiece(p)); };

  // cores de olhos: primeiro as de gente, depois as de monstro (têm o branco do olho pintado ou brilham)
  const EYES = Object.entries(LPC.palettes.eye.colors);
  const MONSTER = ['blood', 'infernal', 'void', 'blind', 'ghost', 'venom', 'abyss', 'molten', 'undead', 'red', 'purple', 'pink', 'yellow'];
  const eyeSets = [
    { pt: 'Naturais', en: 'Natural', list: spectrum(EYES.filter(([n]) => !MONSTER.includes(n)), ([, r]) => r[1]) },
    { pt: 'Monstros e demônios', en: 'Monsters & demons', list: spectrum(EYES.filter(([n]) => MONSTER.includes(n)), ([, r]) => r[1]) },
  ];
  /** Bolinha da cor de olho: a íris, com o fundo do olho quando ele é pintado. */
  const eyeDot = (ramp: string[]) => `radial-gradient(circle, ${ramp[2]} 0 22%, ${ramp[1]} 24% 52%, ${ramp[3] ?? '#f2f7f8'} 54%)`;
  const HAIRLIKE = ['hair', 'beard', 'mustache', 'eyebrows'];
</script>

<div class="ap">
  <nav class="cats" aria-label={L('Categorias', 'Categories')}>
    {#each GROUPS as g}
      <span class="gname">{L(g.pt, g.en)}</span>
      {#each g.cats.filter((c) => usable(c.id)) as c (c.id)}
        <button class="cat" class:on={cat === c.id} class:has={has(c.id)} onclick={() => (cat = c.id)}>
          <c.icon size={15} strokeWidth={1.9} /><span>{nameOf(c.id)}</span>{#if has(c.id)}<i></i>{/if}
        </button>
      {/each}
    {/each}
  </nav>

  <div class="pane">
    <header class="phead">
      <h3>{nameOf(cat)}</h3>
      {#if slot}<small>{items.length} {L('opções', 'options')}</small>{/if}
      {#if cat === 'sets'}<small>{L('um clique veste o herói inteiro; depois, cada peça continua editável na sua categoria', 'one click dresses the whole hero; each piece stays editable in its own category')}</small>{/if}
    </header>

    <div class="scroll">
      {#if cat === 'body'}
        <span class="sub">{L('Corpo', 'Body')}</span>
        <div class="tiles">
          {#each [['male', 'Masculino', 'Male'], ['female', 'Feminino', 'Female']] as const as [b, pt, en] (b)}
            <button class="tile" class:on={avatar.body === b} onclick={() => onchange(withBody(b))}>
              <span class="tpic"><DollThumb avatar={withBody(b)} crop={FULL} px={2} /></span>
              <span class="tname">{L(pt, en)}</span>
              {#if avatar.body === b}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/each}
        </div>
        <span class="sub">{L('Raça', 'Race')}</span>
        <div class="tiles">
          <button class="tile" class:on={!avatar.head && !avatar.race} onclick={() => onchange(withRace(null))}>
            <span class="tpic"><DollThumb avatar={withRace(null)} crop={HEAD} px={3} /></span>
            <span class="tname">{L('Humano', 'Human')}</span>
            {#if !avatar.head && !avatar.race}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
          </button>
          {#each RACE_LOOKS as r (r.id)}
            {@const on = !avatar.head && avatar.race === r.id}
            <button class="tile" class:on onclick={() => onchange(withRace(r.id))}>
              <span class="tpic"><DollThumb avatar={withRace(r.id)} crop={HEAD} px={3} /></span>
              <span class="tname">{L(r.pt, r.en)}</span>
              {#if on}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/each}
          {#each RACE_HEADS as r (r.id)}
            <button class="tile" class:on={avatar.head === r.id} onclick={() => onchange(withRace(r.id))}>
              <span class="tpic"><DollThumb avatar={withRace(r.id)} crop={HEAD} px={3} /></span>
              <span class="tname">{L(r.pt, r.en)}</span>
              {#if avatar.head === r.id}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/each}
        </div>
        <p class="note">{L('Elfos, anões e tieflings usam a cabeça humana: escolha as orelhas, a barba, os chifres e a cauda nas categorias ao lado.', 'Elves, dwarves and tieflings use the human head: pick ears, beard, horns and tail in the categories on the side.')}</p>
      {:else if cat === 'look' && avatar.head}
        <p class="note">{L('A cabeça desta raça já vem com os próprios olhos. O olhar e a cor dos olhos valem para as raças de cabeça humana (Humano, Demônio).', 'This race’s head comes with its own eyes. Eye shape and eye color apply to the races with a human head (Human, Demon).')}</p>
      {:else if cat === 'look'}
        <div class="tiles small">
          {#each Object.entries(LPC.fixed.faces) as [fid, f] (fid)}
            {@const on = !avatar.parts.eyes && (avatar.face ?? 'neutral') === fid}
            <button class="tile" class:on onclick={() => onchange(withFace(fid))}>
              <span class="tpic"><DollThumb avatar={withFace(fid)} crop={FACE} px={4} /></span>
              <span class="tname">{L(f.pt, f.en)}</span>
              {#if on}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/each}
          {#each LPC.slots.find((s) => s.id === 'eyes')!.items as it (it.id)}
            {@const a = (() => { const x = clone(); x.parts.eyes = { id: it.id }; return x; })()}
            <button class="tile" class:on={avatar.parts.eyes?.id === it.id} onclick={() => onchange(a)}>
              <span class="tpic"><DollThumb avatar={a} crop={FACE} px={4} /></span>
              <span class="tname">{L(it.pt, it.en)}</span>
              {#if avatar.parts.eyes?.id === it.id}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/each}
        </div>
      {:else if cat === 'sets'}
        <div class="tiles">
          {#each SETS as st (st.id)}
            {@const on = wearing(avatar, st)}
            <button class="tile set" class:on onclick={() => { for (const k of Object.keys(st.parts) as SlotId[]) chosen[k] = st.id; onchange(wearSet(avatar, st)); }} title={L(st.info[0], st.info[1])}>
              <span class="tpic"><DollThumb avatar={wearSet(avatar, st)} crop={FULL} px={2} /></span>
              <span class="tname">{L(st.pt, st.en)}</span>
              <small>{L(st.info[0], st.info[1])}</small>
              {#if on}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/each}
        </div>
      {:else if slot}
        <div class="tiles" class:small={view.crop === FACE}>
          {#if slot.optional}
            <button class="tile none" class:on={!current} onclick={() => pick(null)}>
              <span class="tpic"><DollThumb avatar={withPart(null)} crop={view.crop} px={view.px} dir={view.dir} />{#if slotId !== 'ears'}<span class="ban"><Ban size={15} /></span>{/if}</span>
              <span class="tname">{slotId === 'ears' ? L('Humano', 'Human') : L('Nenhum', 'None')}</span>
              {#if !current}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/if}
          {#each items as it (it.id)}
            {@const on = current?.id === it.id && !pieceOn}
            <button class="tile" class:on onclick={() => pick(it.id)} title={L(it.pt, it.en)}>
              <span class="tpic"><DollThumb avatar={withPart(it.id)} crop={view.crop} px={view.px} dir={view.dir} /></span>
              <span class="tname">{L(it.pt, it.en)}</span>
              {#if on}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
            </button>
          {/each}
        </div>
        {#if setPieces.length}
          <span class="sub">{L('Peças dos conjuntos', 'Set pieces')}</span>
          <div class="tiles">
            {#each setPieces as sp (sp.set.id)}
              {@const on = pieceOn === sp.set.id}
              <button class="tile set" class:on onclick={() => pickPiece(sp.set.id, sp.part)} title={L(sp.set.pt, sp.set.en)}>
                <span class="tpic"><DollThumb avatar={on ? avatar : withPiece(sp.part)} crop={view.crop} px={view.px} dir={view.dir} /></span>
                <span class="tname">{L(sp.set.pt, sp.set.en)}</span>
                <small>{L(sp.item.pt, sp.item.en)}</small>
                {#if on}<span class="tcheck"><Check size={12} strokeWidth={3} /></span>{/if}
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- cores e efeitos: logo abaixo da última fileira (a lista encolhe até o conteúdo; quando é longa, rola e isto fica no pé) -->
    <footer class="foot">
      {#if cat === 'body'}
        <div class="pal"><span>{L('Pele', 'Skin')}</span>
          <div class="sw">{#each skins as c}<button class:on={avatar.skin === c} style="--k:{swatch('body', c)}" aria-label={c} onclick={() => set((a) => { a.skin = c; })}></button>{/each}</div></div>
      {:else if cat === 'look' && avatar.head}
        <p class="hint">{L('Sem cores para escolher nesta raça.', 'No colors to pick for this race.')}</p>
      {:else if cat === 'look'}
        {#each eyeSets as es}
          <div class="pal"><span>{L('Cor dos olhos', 'Eye color')} — {L(es.pt, es.en)}</span>
            <div class="sw">{#each es.list as [name, ramp]}<button class="eye" class:on={avatar.eyes === name} style="--k:{eyeDot(ramp)}" aria-label={name} onclick={() => set((a) => { a.eyes = name; })}></button>{/each}</div></div>
        {/each}
      {:else if cat === 'sets'}
        <p class="hint">{L('Os metais dos conjuntos (ébano, daédrico, da noite, mithril, celestial…) também estão na lista de cores de qualquer peça de metal.', 'The set metals (ebony, daedric, night, mithril, celestial…) are also in the color list of any metal piece.')}</p>
      {:else if slot && current}
        {#if colors.length > 1 || ownSkin}
          <div class="pal"><span>{L('Cor', 'Color')} — {L(current.pt, current.en)}</span>
            <div class="sw">
              {#if ownSkin}<button class="skin" class:on={!part?.color} title={L('Mesma cor da pele', 'Same as the skin')} aria-label={L('Mesma cor da pele', 'Same as the skin')} style="--k:{swatch('body', avatar.skin)}" onclick={() => edit((p) => { delete p.color; })}><User size={12} /></button>{/if}
              {#each colors as c}<button class:on={part?.color === c.name} style="--k:{c.hex}" aria-label={c.name} onclick={() => edit((p) => { p.color = c.name; })}></button>{/each}
            </div></div>
        {/if}
        {#if tintable}
          <div class="pal"><span>{slotId === 'weapon' ? L('Metal da arma (lâmina, ponta, guarda)', 'Weapon metal (blade, tip, guard)') : L('Pintura do escudo', 'Shield paint')}</span>
            <div class="sw">
              <button class="skin" class:on={!part?.tint} title={L('Original', 'Original')} aria-label={L('Original', 'Original')} style="--k:#2a2540" onclick={() => edit((p) => { delete p.tint; })}><Ban size={12} color="#bbb" /></button>
              {#each tints as [name, tn]}<button class:on={part?.tint === name} style="--k:linear-gradient(135deg, {tn.ramp[4]}, {tn.ramp[2]} 55%, {tn.ramp[0]})" title={L(tn.pt, tn.en)} aria-label={L(tn.pt, tn.en)} onclick={() => edit((p) => { p.tint = name; })}></button>{/each}
            </div></div>
        {/if}
        {#if slotId === 'weapon'}
          <div class="pal"><span>{L('Magia imbuída', 'Imbued magic')}</span>
            <div class="fxrow">
              <div class="chips">
                <button class:on={!part?.fx} onclick={() => edit((p) => { delete p.fx; delete p.fxColor; })}>{L('Nenhuma', 'None')}</button>
                {#each FX_KINDS as k (k.id)}<button class:on={part?.fx === k.id} onclick={() => edit((p) => { p.fx = k.id; p.fxColor ??= 'purple'; })}>{L(k.pt, k.en)}</button>{/each}
              </div>
              {#if part?.fx}
                <div class="sw">{#each fxColors as [name, fc]}<button class:on={(part.fxColor ?? 'purple') === name} style="--k:linear-gradient(135deg, {fc.ramp[2]}, {fc.ramp[1]} 50%, {fc.ramp[0]})" title={L(fc.pt, fc.en)} aria-label={L(fc.pt, fc.en)} onclick={() => edit((p) => { p.fxColor = name; })}></button>{/each}</div>
              {/if}
            </div></div>
        {/if}
        {#if !(colors.length > 1 || ownSkin) && !tintable}<p class="hint">{L('Esta peça tem uma cor só.', 'This piece has a single color.')}</p>{/if}
      {:else if slot}
        <p class="hint">{HAIRLIKE.includes(slot.id) ? L('Escolha uma opção para ver as cores.', 'Pick an option to see the colors.') : L('Escolha uma peça para ver as cores dela.', 'Pick a piece to see its colors.')}</p>
      {/if}
    </footer>
  </div>
</div>

<style>
  .ap { display: grid; grid-template-columns: 196px minmax(0, 1fr); gap: 16px; min-height: 0; height: 100%; }
  .cats { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; padding-right: 6px; min-height: 0; }
  .gname { font: 400 10px var(--pixel); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); padding: 10px 8px 4px; opacity: .85; }
  .gname:first-child { padding-top: 2px; }
  .cat { display: flex; align-items: center; gap: 9px; padding: 6px 10px; border: 1px solid transparent; border-radius: 6px; background: none; color: var(--muted); font: 500 13px var(--ui); cursor: pointer; text-align: left; transition: background var(--t), color var(--t); }
  .cat span { flex: 1; }
  .cat:hover { color: var(--text); background: rgb(255 255 255 / .04); }
  .cat.has { color: var(--text-2); }
  .cat.on { color: var(--accent-2); background: var(--accent-soft); border-color: rgb(227 181 102 / .35); }
  .cat i { width: 6px; height: 6px; background: var(--accent); box-shadow: 0 0 6px var(--accent); }

  .pane { display: flex; flex-direction: column; gap: 10px; min-width: 0; min-height: 0; }
  .phead { display: flex; align-items: baseline; gap: 10px; flex: none; flex-wrap: wrap; }
  .phead h3 { font: 400 15px var(--pixel); letter-spacing: .06em; color: var(--text); }
  .phead small { color: var(--muted); font-size: 12px; }
  .scroll { flex: 0 1 auto; min-height: 0; overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: 10px; }
  .sub { font: 400 10px var(--pixel); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
  .note { margin: 0; font-size: 12.5px; color: var(--muted); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; }
  .tiles.small { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); }
  .tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px 7px; cursor: pointer; color: var(--text-2); font: 500 11.5px var(--ui); min-width: 0;
    background: linear-gradient(180deg, #1c1830, #110f1c); border: 2px solid #2c2647; border-radius: 4px; transition: border-color var(--t), transform var(--t), background var(--t); }
  .tile:hover { border-color: #6a5fa8; transform: translateY(-2px); color: var(--text); }
  .tile.on { border-color: var(--accent); background: linear-gradient(180deg, #2c2540, #171325); color: var(--accent-2); box-shadow: 0 0 0 1px #000, 0 0 18px rgb(227 181 102 / .22); }
  /* o boneco fica sempre no centro da caixinha, mesmo quando ela é mais estreita que ele */
  .tpic { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 132px; overflow: hidden; border-radius: 2px;
    background: radial-gradient(ellipse at 50% 100%, rgb(120 96 200 / .22), transparent 70%), repeating-conic-gradient(#15121f 0 25%, #191527 0 50%) 0 0 / 16px 16px; }
  .tpic :global(canvas) { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
  .tname { text-align: center; line-height: 1.2; min-height: 2.4em; display: grid; place-items: center; }
  .tile.set .tname { min-height: 0; font: 400 11px var(--pixel); letter-spacing: .04em; color: var(--text); margin-top: 2px; }
  .tile.set.on .tname { color: var(--accent-2); }
  .tile.set small { font-size: 10.5px; line-height: 1.3; color: var(--muted); text-align: center; min-height: 2.6em; }
  .sub:not(:first-child) { margin-top: 6px; }
  .tcheck { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; display: grid; place-items: center; background: var(--accent); color: #1a1308; z-index: 1; }
  .ban { position: absolute; right: 6px; bottom: 6px; color: var(--muted); }

  .foot { flex: none; display: flex; flex-direction: column; gap: 8px; min-height: 64px; max-height: 44%; overflow-y: auto; padding: 10px 12px; border: 2px solid #2c2647; background: #0d0b16; }
  .hint { margin: 0; font-size: 12.5px; color: var(--muted); align-self: center; margin-block: auto; }
  .pal { display: flex; flex-direction: column; gap: 5px; }
  .pal > span { font: 400 9.5px var(--pixel); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .sw { display: flex; flex-wrap: wrap; gap: 5px; }
  .sw button { width: 26px; height: 26px; border: 2px solid rgb(0 0 0 / .55); outline: 1px solid rgb(255 255 255 / .12); background: var(--k); cursor: pointer; padding: 0; display: grid; place-items: center; color: rgb(0 0 0 / .65); transition: transform var(--t); }
  .sw button:hover { transform: scale(1.12); }
  .sw button.on { outline: 2px solid #fff; box-shadow: 0 0 0 4px var(--accent); z-index: 1; }
  .sw button.eye { border-radius: 50%; }
  .fxrow { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chips button { height: 28px; padding: 0 11px; border: 2px solid #2c2647; background: #14111f; color: var(--text-2); font: 600 12px var(--ui); cursor: pointer; transition: all var(--t); }
  .chips button:hover { border-color: #6a5fa8; color: var(--text); }
  .chips button.on { border-color: var(--accent); background: #1d1930; color: var(--accent-2); }
  @media (max-width: 900px) { .ap { grid-template-columns: 1fr; height: auto; } .cats { flex-direction: row; flex-wrap: wrap; } .gname { width: 100%; } }
</style>
