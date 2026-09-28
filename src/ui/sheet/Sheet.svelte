<script lang="ts">
  import { Plus, Printer, Trash2, Minus, UserRound, X, Heart, Upload } from '@lucide/svelte';
  import racesData from '../../data/races.json';
  import { app } from '../../store/project.svelte';
  import { importImage, ensureMedia, mediaUrl } from '../../store/media';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { CLASS_COLORS, COLORS, RESOURCES, colorHex } from '../../model/catalog';
  import { newId } from '../../model/id';
  import type { Card, Character, ColorId, Slot, Stat } from '../../model/types';
  import { classIcon, RESOURCE_COLORS, resourceIcon } from '../../render/icons/glyphs';
  import { lighten } from '../../render/color';
  import { vivid } from '../../render/palette';
  import Glyph from '../common/Glyph.svelte';
  import CardImage from '../common/CardImage.svelte';

  interface Race { id: string; name: Record<string, string>; boosts: Partial<Record<Stat, number>>; flaws: Partial<Record<Stat, number>>; hp: number; desc: Record<string, string> }
  const RACES = racesData as Race[];

  const STATS: { id: Stat; pt: string; en: string; full: [string, string] }[] = [
    { id: 'str', pt: 'FOR', en: 'STR', full: ['Força', 'Strength'] },
    { id: 'dex', pt: 'DES', en: 'DEX', full: ['Destreza', 'Dexterity'] },
    { id: 'con', pt: 'CON', en: 'CON', full: ['Constituição', 'Constitution'] },
    { id: 'int', pt: 'INT', en: 'INT', full: ['Inteligência', 'Intelligence'] },
    { id: 'wis', pt: 'SAB', en: 'WIS', full: ['Sabedoria', 'Wisdom'] },
    { id: 'cha', pt: 'CAR', en: 'CHA', full: ['Carisma', 'Charisma'] },
  ];

  /** Espaços de equipamento e quais etiquetas de carta cabem em cada um. */
  const SLOTS: { id: Slot; pt: string; en: string; tags: string[]; pos: [number, number] }[] = [
    { id: 'head', pt: 'Cabeça', en: 'Head', tags: ['head'], pos: [50, 12] },
    { id: 'hands', pt: 'Mãos', en: 'Hands', tags: ['hands'], pos: [13, 14] },
    { id: 'amulet', pt: 'Amuleto', en: 'Amulet', tags: ['amulet'], pos: [87, 14] },
    { id: 'chest', pt: 'Peito', en: 'Chest', tags: ['chest'], pos: [50, 38] },
    { id: 'mainHand', pt: 'Mão principal', en: 'Main hand', tags: ['weapon'], pos: [13, 39] },
    { id: 'offHand', pt: 'Mão secundária', en: 'Off hand', tags: ['offhand', 'weapon'], pos: [87, 39] },
    { id: 'ring1', pt: 'Anel', en: 'Ring', tags: ['ring'], pos: [13, 64] },
    { id: 'ring2', pt: 'Anel', en: 'Ring', tags: ['ring'], pos: [87, 64] },
    { id: 'legs', pt: 'Pernas', en: 'Legs', tags: ['legs'], pos: [50, 64] },
    { id: 'feet', pt: 'Pés', en: 'Feet', tags: ['feet'], pos: [50, 89] },
  ];

  const baseStats = (): Record<Stat, number> => ({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  const raceOf = (id: string) => RACES.find((r) => r.id === id);
  const maxHp = (c: Character) => 30 + (raceOf(c.raceId)?.hp ?? 0) + 5 * (c.level - 1);
  const mod = (v: number) => Math.floor((v - 10) / 2);
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  let current = $state(0);
  let picking = $state<Slot | null>(null);
  let portraitInput: HTMLInputElement;

  const chars = $derived(app.project?.characters ?? []);
  const ch = $derived(chars[current]);

  function edit(fn: (c: Character) => void) {
    app.updateProject((p) => { const c = p.characters[current]; if (c) fn(c); });
  }

  function addChar() {
    app.updateProject((p) => {
      p.characters.push({ id: newId('char'), name: L('Aventureiro', 'Adventurer'), raceId: '', classColors: ['red'], level: 1, hp: 30, stats: baseStats(), slots: {}, notes: '' });
    });
    current = chars.length - 1;
  }

  async function removeChar() {
    if (!ch) return;
    const r = await ui.confirm({ title: L('Excluir personagem?', 'Delete character?'), text: `“${ch.name}”`, ok: L('Excluir', 'Delete'), danger: true });
    if (r !== 'ok') return;
    app.updateProject((p) => { p.characters.splice(current, 1); });
    current = Math.max(0, current - 1);
  }

  function setRace(id: string) {
    edit((c) => {
      const old = raceOf(c.raceId), nu = raceOf(id);
      // troca os bônus/penalidades da raça antiga pelos da nova, preservando o que o jogador distribuiu
      for (const s of STATS) {
        const before = (old?.boosts[s.id] ?? 0) + (old?.flaws[s.id] ?? 0);
        const after = (nu?.boosts[s.id] ?? 0) + (nu?.flaws[s.id] ?? 0);
        c.stats[s.id] += after - before;
      }
      c.raceId = id;
      c.hp = maxHp(c);
    });
  }

  function toggleClass(col: ColorId) {
    edit((c) => {
      if (c.classColors.includes(col)) { if (c.classColors.length > 1) c.classColors = c.classColors.filter((x) => x !== col); }
      else c.classColors = c.classColors.length >= 2 ? [c.classColors[0], col] : [...c.classColors, col];
    });
  }

  async function setPortrait(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const id = await importImage(f, f.name);
    edit((c) => { c.portraitMediaId = id; });
  }
  $effect(() => { if (ch?.portraitMediaId) void ensureMedia(ch.portraitMediaId).then(() => (portraitTick++)); });
  let portraitTick = $state(0);
  const portrait = $derived.by(() => { void portraitTick; return ch?.portraitMediaId ? mediaUrl(ch.portraitMediaId) : undefined; });

  const equipment = $derived(Object.values(app.cards).filter((c) => app.deck(c.deckId)?.kind === 'equipment'));
  const slotOptions = (slot: Slot) => equipment.filter((c) => c.tags.some((t) => SLOTS.find((s) => s.id === slot)!.tags.includes(t)));
  const equipped = $derived(ch ? SLOTS.map((s) => ({ slot: s, card: ch.slots[s.id] ? app.cards[ch.slots[s.id]!] : undefined })) : []);
  const bonus = $derived(equipped.reduce((a, e) => ({ atk: a.atk + (e.card?.stats?.atk ?? 0), def: a.def + (e.card?.stats?.def ?? 0) }), { atk: 0, def: 0 }));

  function equip(slot: Slot, card: Card | null) {
    edit((c) => { if (card) c.slots[slot] = card.id; else delete c.slots[slot]; });
    picking = null;
  }
</script>

<div class="sheet-page">
  <header class="head no-print">
    <div class="tabs">
      {#each chars as c, i (c.id)}
        <button class:on={i === current} onclick={() => (current = i)}><UserRound size={15} /> {c.name || L('Sem nome', 'Unnamed')}</button>
      {/each}
      <button class="add" onclick={addChar}><Plus size={15} /> {L('Novo personagem', 'New character')}</button>
    </div>
    <div class="grow"></div>
    {#if ch}
      <button class="btn sm" onclick={() => print()}><Printer size={15} /> {L('Imprimir ficha', 'Print sheet')}</button>
      <button class="btn sm ghost icon" title={L('Excluir personagem', 'Delete character')} onclick={removeChar}><Trash2 size={16} /></button>
    {/if}
  </header>

  {#if !ch}
    <div class="empty">
      <UserRound size={42} />
      <h2>{L('Nenhum personagem ainda', 'No characters yet')}</h2>
      <p class="muted">{L('Crie a ficha do seu herói: raça, classes, atributos e equipamentos (as cartas de equipamento do seu projeto).', 'Build your hero sheet: ancestry, classes, attributes and equipment (the equipment cards in your project).')}</p>
      <button class="btn primary" onclick={addChar}><Plus size={16} /> {L('Criar personagem', 'Create character')}</button>
    </div>
  {:else}
    {@const race = raceOf(ch.raceId)}
    {@const mhp = maxHp(ch)}
    <div class="sheet">
      <!-- identidade -->
      <section class="card id">
        <button class="portrait" onclick={() => portraitInput.click()} title={L('Trocar retrato', 'Change portrait')}>
          {#if portrait}<img src={portrait} alt="" />{:else}<div class="ph"><Upload size={22} /><span>{L('Retrato', 'Portrait')}</span></div>{/if}
        </button>
        <input type="file" accept="image/*" hidden bind:this={portraitInput} onchange={(e) => setPortrait((e.currentTarget as HTMLInputElement).files)} />
        <input class="name display" value={ch.name} oninput={(e) => edit((c) => { c.name = (e.currentTarget as HTMLInputElement).value; })} placeholder={L('Nome do herói', 'Hero name')} />
        <div class="classes">
          {#each ch.classColors as col}
            <span class="cls" style="--c:{colorHex(col)}"><Glyph id={classIcon(col)} size={16} color={lighten(vivid(colorHex(col)), 0.4)} /> {COLORS[col].classes[app.lang]}</span>
          {/each}
        </div>
        <div class="grid2">
          <label class="field"><span>{L('Ancestralidade', 'Ancestry')}</span>
            <select class="select" value={ch.raceId} onchange={(e) => setRace((e.currentTarget as HTMLSelectElement).value)}>
              <option value="">{L('— escolher —', '— choose —')}</option>
              {#each RACES as r}<option value={r.id}>{r.name[app.lang]}</option>{/each}
            </select>
          </label>
          <div class="field"><span>{L('Nível', 'Level')}</span>
            <div class="stepper">
              <button onclick={() => edit((c) => { c.level = Math.max(1, c.level - 1); c.hp = Math.min(c.hp, maxHp(c)); })}><Minus size={14} /></button>
              <b>{ch.level}</b>
              <button onclick={() => edit((c) => { c.level = Math.min(20, c.level + 1); c.hp += 5; })}><Plus size={14} /></button>
            </div>
          </div>
        </div>
        {#if race}<p class="race muted">{race.desc[app.lang]}</p>{/if}

        <div class="hp">
          <div class="row"><Heart size={16} color="var(--danger)" /><b>{L('Pontos de vida', 'Hit points')}</b><div class="grow"></div>
            <input class="hpin" type="number" value={ch.hp} min="0" max={mhp} oninput={(e) => edit((c) => { c.hp = Math.max(0, Math.min(mhp, +(e.currentTarget as HTMLInputElement).value)); })} /><span class="muted">/ {mhp}</span></div>
          <div class="bar"><div style="width:{(ch.hp / mhp) * 100}%"></div></div>
        </div>

        <div class="field"><span>{L('Classes (até 2)', 'Classes (up to 2)')}</span>
          <div class="clspick">
            {#each CLASS_COLORS as col}
              <button class:on={ch.classColors.includes(col)} style="--c:{colorHex(col)}" title={COLORS[col].classes[app.lang]} onclick={() => toggleClass(col)}>
                <Glyph id={classIcon(col)} size={18} color={lighten(vivid(colorHex(col)), 0.4)} />
              </button>
            {/each}
          </div>
        </div>
        <div class="field"><span>{L('Recurso da classe', 'Class resource')}</span>
          <div class="res">
            {#each ch.classColors as col}
              {@const r = COLORS[col].resources[0]}
              <span class="chip"><Glyph id={resourceIcon(r)!} size={16} color={RESOURCE_COLORS[r]} /> {RESOURCES[r].name[app.lang]}</span>
            {/each}
          </div>
        </div>
      </section>

      <!-- atributos -->
      <section class="card attrs">
        <h3 class="section-title">{L('Atributos', 'Attributes')}</h3>
        <div class="stats">
          {#each STATS as s}
            {@const v = ch.stats[s.id]}
            {@const rb = (race?.boosts[s.id] ?? 0) + (race?.flaws[s.id] ?? 0)}
            <div class="stat" title={L(s.full[0], s.full[1])}>
              <span class="ab">{L(s.pt, s.en)}</span>
              <span class="mod">{fmt(mod(v))}</span>
              <div class="val">
                <button onclick={() => edit((c) => { c.stats[s.id] = Math.max(1, c.stats[s.id] - 1); })}><Minus size={12} /></button>
                <b>{v}</b>
                <button onclick={() => edit((c) => { c.stats[s.id] = Math.min(30, c.stats[s.id] + 1); })}><Plus size={12} /></button>
              </div>
              {#if rb}<span class="rb" class:neg={rb < 0}>{fmt(rb)} {L('raça', 'ancestry')}</span>{/if}
            </div>
          {/each}
        </div>
        <h3 class="section-title">{L('Anotações', 'Notes')}</h3>
        <textarea class="textarea notes" rows="7" value={ch.notes} oninput={(e) => edit((c) => { c.notes = (e.currentTarget as HTMLTextAreaElement).value; })}
          placeholder={L('Histórico, talentos, objetivos da campanha…', 'Background, feats, campaign goals…')}></textarea>
      </section>

      <!-- equipamento -->
      <section class="card gear">
        <div class="row"><h3 class="section-title grow">{L('Equipamento', 'Equipment')}</h3>
          <span class="chip">ATK <b>{fmt(bonus.atk)}</b></span><span class="chip">DEF <b>{fmt(bonus.def)}</b></span></div>
        <div class="doll">
          <svg class="figure" viewBox="0 0 100 140" aria-hidden="true">
            <path d="M50 10c7 0 12 6 12 13s-5 13-12 13-12-6-12-13 5-13 12-13Zm-18 30h36c8 0 13 6 14 13l4 30c1 5-3 8-7 6l-5-2 1 36-10 3-5-28h-4l-5 28-10-3 1-36-5 2c-4 2-8-1-7-6l4-30c1-7 6-13 14-13Z" fill="currentColor" />
          </svg>
          {#each equipped as e (e.slot.id)}
            <button class="slot" class:filled={!!e.card} style="left:{e.slot.pos[0]}%;top:{e.slot.pos[1]}%" title={L(e.slot.pt, e.slot.en)} onclick={() => (picking = e.slot.id)}>
              {#if e.card}<CardImage card={e.card} />{:else}<span>{L(e.slot.pt, e.slot.en)}</span>{/if}
            </button>
          {/each}
        </div>
      </section>
    </div>
  {/if}
</div>

{#if picking && ch}
  {@const opts = slotOptions(picking)}
  <div class="backdrop" role="presentation" onclick={() => (picking = null)}>
    <div class="picker" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (picking = null)}>
      <div class="row"><h3 class="grow">{L('Equipar', 'Equip')}: {L(SLOTS.find((s) => s.id === picking)!.pt, SLOTS.find((s) => s.id === picking)!.en)}</h3>
        <button class="btn sm ghost icon" onclick={() => (picking = null)}><X size={16} /></button></div>
      {#if ch.slots[picking]}<button class="btn sm" onclick={() => equip(picking!, null)}>{L('Remover item', 'Unequip')}</button>{/if}
      {#if opts.length}
        <div class="opts">
          {#each opts as c (c.id)}
            <button class="opt" class:on={ch.slots[picking] === c.id} onclick={() => equip(picking!, c)}><CardImage card={c} /></button>
          {/each}
        </div>
      {:else}
        <p class="muted">{L('Nenhuma carta de equipamento com a etiqueta deste espaço. Crie no deck de Equipamentos e marque a etiqueta (ex.: head, chest, weapon, ring).', 'No equipment card has this slot tag. Create one in the Equipment deck and tag it (e.g. head, chest, weapon, ring).')}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .sheet-page { height: 100%; overflow-y: auto; background: radial-gradient(ellipse at 50% 0%, #1b1715, var(--bg) 60%); }
  .head { display: flex; align-items: center; gap: 8px; padding: 14px 28px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: rgb(12 11 10 / .9); backdrop-filter: blur(8px); z-index: 2; flex-wrap: wrap; }
  .tabs { display: flex; gap: 4px; flex-wrap: wrap; }
  .tabs button { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px; border-radius: 99px; border: 1px solid var(--line-2); background: var(--surface); color: var(--text-2); font: 500 13px var(--ui); cursor: pointer; }
  .tabs button.on { background: var(--accent-soft); border-color: rgb(216 176 106 / .5); color: var(--accent-2); }
  .tabs .add { border-style: dashed; }
  .empty { display: grid; justify-items: center; gap: 10px; text-align: center; padding: 12vh 20px; color: var(--muted); }
  .empty h2 { color: var(--text); }
  .empty p { max-width: 460px; }

  .sheet { display: grid; grid-template-columns: 330px 1fr 380px; gap: 18px; padding: 24px 28px 60px; max-width: 1500px; margin: 0 auto; }
  .card { background: linear-gradient(180deg, var(--surface), #141111); border: 1px solid var(--line); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 14px;
    box-shadow: 0 1px 0 rgb(255 255 255 / .03) inset, var(--shadow); }
  .portrait { position: relative; width: 100%; aspect-ratio: 4 / 5; border-radius: 14px; overflow: hidden; border: 0; padding: 0; cursor: pointer; background: var(--bg-2);
    box-shadow: 0 0 0 1px #6b5532, 0 0 0 5px #1a1512, 0 0 0 6px #8a6d3b, 0 18px 40px rgb(0 0 0 / .6); }
  .portrait img { width: 100%; height: 100%; object-fit: cover; }
  .ph { height: 100%; display: grid; place-content: center; justify-items: center; gap: 6px; color: var(--muted); }
  .name { font-size: 26px; text-align: center; background: none; border: 0; border-bottom: 1px solid transparent; color: var(--accent-2); width: 100%; padding: 4px; }
  .name:focus { outline: none; border-bottom-color: var(--accent); }
  .classes { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin-top: -6px; }
  .cls { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; color: var(--text-2); padding: 3px 10px; border-radius: 99px; background: color-mix(in srgb, var(--c) 20%, transparent); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); }
  .race { font-size: 12.5px; margin: -4px 0 0; font-style: italic; }
  .stepper { display: inline-flex; align-items: center; justify-content: space-between; height: 36px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--bg-2); }
  .stepper button { width: 32px; height: 100%; border: 0; background: none; color: var(--text-2); cursor: pointer; display: grid; place-items: center; }
  .stepper b { font-size: 16px; min-width: 24px; text-align: center; }
  .hp { background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
  .hp .row b { font-size: 13px; }
  .hpin { width: 56px; height: 30px; text-align: right; background: none; border: 0; color: var(--text); font: 700 20px var(--ui); appearance: textfield; }
  .bar { height: 8px; border-radius: 8px; background: #2a1a18; margin-top: 8px; overflow: hidden; }
  .bar div { height: 100%; background: linear-gradient(90deg, #a3271d, #e2574c); border-radius: 8px; transition: width .2s; }
  .clspick { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
  .clspick button { aspect-ratio: 1; border-radius: 9px; border: 1px solid var(--line-2); display: grid; place-items: center; cursor: pointer; opacity: .5;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 45%, #000), color-mix(in srgb, var(--c) 18%, #000)); }
  .clspick button.on { opacity: 1; border-color: var(--accent); }
  .res { display: flex; gap: 6px; flex-wrap: wrap; }

  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .stat { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 8px 10px; border-radius: 16px;
    background: radial-gradient(circle at 50% 0%, #2a2320, #171313); border: 1px solid #3a302a; box-shadow: inset 0 1px 0 rgb(255 255 255 / .04); }
  .ab { font: 600 12px var(--display); letter-spacing: .12em; color: var(--accent); }
  .mod { font: 700 34px/1.1 var(--display); color: var(--text); }
  .val { display: flex; align-items: center; gap: 4px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 99px; padding: 2px; }
  .val button { width: 22px; height: 22px; border-radius: 50%; border: 0; background: none; color: var(--muted); cursor: pointer; display: grid; place-items: center; }
  .val button:hover { background: var(--surface-3); color: var(--text); }
  .val b { font-size: 13px; min-width: 22px; text-align: center; }
  .rb { font-size: 10.5px; color: var(--ok); margin-top: 3px; }
  .rb.neg { color: var(--danger); }
  .notes { min-height: 160px; }

  .doll { position: relative; aspect-ratio: 100 / 140; margin: 8px 18px 0; }
  .figure { position: absolute; inset: 6% 18%; width: 64%; height: 88%; color: #231d1a; }
  .slot { position: absolute; width: 22%; aspect-ratio: 750 / 1050; transform: translate(-50%, -50%); border-radius: 8px; border: 1.5px dashed #4a3f37; background: rgb(20 17 16 / .8);
    color: var(--muted); font: 500 10px var(--ui); cursor: pointer; padding: 0; overflow: hidden; display: grid; place-items: center; transition: all var(--t); }
  .slot:hover { border-color: var(--accent); color: var(--text); transform: translate(-50%, -50%) scale(1.04); }
  .slot.filled { border: 0; box-shadow: 0 8px 20px rgb(0 0 0 / .6); }
  .slot span { padding: 4px; text-align: center; }

  .backdrop { position: fixed; inset: 0; background: rgb(5 4 4 / .72); backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 50; padding: 16px; }
  .picker { width: min(820px, 100%); max-height: 86vh; overflow-y: auto; background: var(--surface); border: 1px solid var(--line-2); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .opt { padding: 0; border: 2px solid transparent; border-radius: 10px; background: none; cursor: pointer; }
  .opt.on, .opt:hover { border-color: var(--accent); }

  @media (max-width: 1250px) { .sheet { grid-template-columns: 320px 1fr; } .gear { grid-column: 1 / -1; } .doll { max-width: 460px; width: 100%; margin: 0 auto; } }
  @media (max-width: 760px) { .sheet { grid-template-columns: 1fr; padding: 16px; } .head { padding: 10px 14px; } .stats { grid-template-columns: repeat(2, 1fr); } }

  @media print {
    .no-print, :global(.rail) { display: none !important; }
    .sheet-page { overflow: visible; background: #fff; color: #111; }
    .sheet { grid-template-columns: 1fr 1fr; padding: 0; }
    .card { box-shadow: none; background: #fff; border-color: #bbb; color: #111; }
    .mod, .stepper b, .val b { color: #111; }
  }
</style>
