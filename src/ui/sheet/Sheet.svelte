<script lang="ts">
  import { Plus, Printer, Trash2, Minus, UserRound, X, Heart, Upload, ArrowLeft, Pencil, Swords, Shield, Sparkles, Info } from '@lucide/svelte';
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
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import AvatarEditor from '../../avatar/AvatarEditor.svelte';
  import AvatarSprite from '../../avatar/AvatarSprite.svelte';
  import { defaultAvatar, portrait as avatarPortrait, type Avatar } from '../../avatar/lpc';
  import { router } from '../../app/router.svelte';
  import { HERO_BASES } from '../../game/decks';
  import { ATTRS, ATTR_NAMES, type HeroBase } from '../../game/types';
  import { SLOTS, equippedCards, gearText, presetSlots } from '../../model/equipment';
  import { deckCount, heroColor, heroDef } from '../game/heroes';

  let { id }: { id?: string } = $props();

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

  const baseStats = (): Record<Stat, number> => ({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  const raceOf = (id: string) => RACES.find((r) => r.id === id);
  const maxHp = (c: Character) => 30 + (raceOf(c.raceId)?.hp ?? 0) + 5 * (c.level - 1);
  const mod = (v: number) => Math.floor((v - 10) / 2);
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  let picking = $state<Slot | null>(null);
  let portraitInput = $state<HTMLInputElement>();
  let creating = $state(false);

  const chars = $derived(app.project?.characters ?? []);
  /** Herói aberto (pela rota #/heroi/<id>); sem id, mostra a galeria de heróis. */
  const current = $derived(id ? chars.findIndex((c) => c.id === id) : -1);
  const ch = $derived(current >= 0 ? chars[current] : undefined);
  /** A ficha foi aberta pelo "Editar" da seleção da Mesa: o voltar leva de volta para lá. */
  const backToTable = router.returnTo === '/mesa';
  const open = (cid?: string) => router.go(cid ? `/heroi/${encodeURIComponent(cid)}` : '/heroi');

  function edit(fn: (c: Character) => void) {
    app.updateProject((p) => { const c = p.characters[current]; if (c) fn(c); });
  }

  /** Novo herói a partir de um dos 4 modelos (deck, arma e equipamento do modelo; depois é só editar). */
  function addChar(base: HeroBase) {
    const cid = newId('char');
    const color = base.deckId.replace('proto-', '') as ColorId;
    app.updateProject((p) => {
      p.characters.push({
        id: cid, name: L('Novo herói', 'New hero'), raceId: '', classColors: [color], level: 1, hp: 30, stats: baseStats(), slots: presetSlots(base.id), notes: '',
        play: { ...structuredClone(base), id: cid },
      });
    });
    creating = false;
    open(cid);
  }

  async function removeChar(target = ch) {
    if (!target) return;
    const r = await ui.confirm({ title: L('Excluir herói?', 'Delete hero?'), text: `“${target.name}”`, ok: L('Excluir', 'Delete'), danger: true });
    if (r !== 'ok') return;
    app.updateProject((p) => { p.characters = p.characters.filter((c) => c.id !== target.id); });
    if (id) open();
  }

  // ───── dados de jogo (Mesa de teste) ─────
  const gameDecks = $derived(app.decks.filter((d) => app.cardsOf(d.id).some((c) => c.game)));
  function play(fn: (b: HeroBase) => void) { edit((c) => { if (c.play) fn(c.play); }); }
  /** Liga os dados de jogo a partir de um modelo; os espaços vazios recebem as cartas de equipamento do modelo. */
  function enablePlay(base: HeroBase) { edit((c) => { c.play = { ...structuredClone(base), id: c.id }; c.slots = { ...presetSlots(base.id), ...c.slots }; }); }

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
  /** Só as vestidas, com o que cada uma dá (resumo da ficha). */
  const worn = $derived(ch ? equippedCards(ch, app.cards) : []);
  /** Soma do que o equipamento vestido dá. */
  const bonus = $derived(worn.reduce((a, e) => ({ strike: a.strike + (e.card.gear?.strike ?? 0), armor: a.armor + (e.card.gear?.armor ?? 0), resist: a.resist + (e.card.gear?.resist ?? 0), hp: a.hp + (e.card.gear?.hp ?? 0) }), { strike: 0, armor: 0, resist: 0, hp: 0 }));
  const editCard = (cid: string) => { router.returnTo = null; router.editor(cid); };

  function equip(slot: Slot, card: Card | null) {
    edit((c) => { if (card) c.slots[slot] = card.id; else delete c.slots[slot]; });
    picking = null;
  }
  /** Tira a "foto" do boneco e usa como retrato do herói. */
  async function snapPortrait() {
    if (!ch?.avatar) return;
    const blob = await avatarPortrait($state.snapshot(ch.avatar) as Avatar, heroColor(ch));
    const mid = await importImage(blob, `${ch.name || 'heroi'}-retrato.png`);
    edit((c) => { c.portraitMediaId = mid; });
    ui.toast(L('Retrato atualizado com a foto do boneco.', 'Portrait updated with the doll photo.'), 'ok');
  }
  const num = (e: Event, min: number, max: number) => Math.max(min, Math.min(max, Math.round(+(e.currentTarget as HTMLInputElement).value || 0)));
</script>

<div class="sheet-page">
  {#if !ch}
    <div class="gallery">
      <header class="ghead">
        <div><h1>{L('Heróis', 'Heroes')}</h1>
          <p class="muted">{L('Cada herói tem uma ficha, um retrato e um deck. Clique num herói para abrir a ficha; os que têm dados de jogo entram na Mesa.', 'Each hero has a sheet, a portrait and a deck. Click a hero to open the sheet; those with game data can enter the Table.')}</p></div>
        <button class="btn primary" onclick={() => (creating = true)}><Plus size={16} /> {L('Novo herói', 'New hero')}</button>
      </header>
      <div class="hgrid">
        {#each chars as c (c.id)}
          {@const d = c.play ? heroDef(c) : null}
          <div class="hcard" style="--c:{heroColor(c)}">
            <button class="hmain" onclick={() => open(c.id)} title={L('Abrir a ficha', 'Open the sheet')}>
              <span class="hpic"><HeroPortrait hero={c} size={220} />{#if c.avatar && c.portraitMediaId}<span class="hdoll"><AvatarSprite avatar={c.avatar} scale={2} /></span>{/if}</span>
              <span class="hname display">{c.name || L('Sem nome', 'Unnamed')}</span>
              <span class="hclass">{d ? L(d.className[0], d.className[1]) : c.classColors.map((col) => COLORS[col].classes[app.lang]).join(' / ')}</span>
              {#if d}
                <span class="hstats">
                  <i><Heart size={13} /> {d.maxHp}</i><i><Swords size={13} /> {d.weapon.dmg}</i><i><Shield size={13} /> {d.armor}</i><i><Sparkles size={13} /> {d.resist}</i>
                </span>
                <span class="hdeck">{app.deck(d.deckId)?.name[app.lang] ?? '—'} · {deckCount(c)} {L('cartas', 'cards')}</span>
              {:else}
                <span class="hdeck muted">{L('Só ficha (sem dados de jogo)', 'Sheet only (no game data)')}</span>
              {/if}
            </button>
            <div class="hact">
              <button class="btn sm" onclick={() => open(c.id)}><Pencil size={14} /> {L('Editar', 'Edit')}</button>
              <button class="btn sm ghost icon" title={L('Excluir herói', 'Delete hero')} onclick={() => removeChar(c)}><Trash2 size={15} /></button>
            </div>
          </div>
        {/each}
        <button class="hcard new" onclick={() => (creating = true)}><Plus size={34} /><span>{L('Novo herói', 'New hero')}</span></button>
      </div>
    </div>
  {:else}
    {@const race = raceOf(ch.raceId)}
    {@const mhp = maxHp(ch)}
    <header class="head no-print">
      {#if backToTable}
        <button class="btn sm primary" onclick={() => { router.returnTo = null; router.go('/mesa'); }}><ArrowLeft size={15} /> {L('Voltar à seleção da batalha', 'Back to battle selection')}</button>
      {/if}
      <button class="btn sm" onclick={() => { router.returnTo = null; open(); }}><ArrowLeft size={15} /> {L('Heróis', 'Heroes')}</button>
      <b class="display hd">{ch.name}</b>
      <div class="grow"></div>
      <button class="btn sm" onclick={() => print()}><Printer size={15} /> {L('Imprimir ficha', 'Print sheet')}</button>
      <button class="btn sm ghost icon" title={L('Excluir herói', 'Delete hero')} onclick={() => removeChar()}><Trash2 size={16} /></button>
    </header>
    <div class="sheet">
      <!-- identidade -->
      <section class="card id">
        <button class="portrait" onclick={() => portraitInput?.click()} title={L('Trocar retrato', 'Change portrait')}>
          {#if portrait}<img src={portrait} alt="" />{:else if ch.preset || ch.avatar}<span class="pfill"><HeroPortrait hero={ch} size={290} /></span>{:else}<div class="ph"><Upload size={22} /><span>{L('Enviar retrato', 'Upload portrait')}</span></div>{/if}
          <span class="pchange"><Upload size={13} /> {L('Trocar imagem', 'Change image')}</span>
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
          <span class="chip" title={L('Vida que o equipamento soma', 'Life added by the gear')}><Heart size={12} /> <b>{fmt(bonus.hp)}</b></span>
          <span class="chip" title={L('Armadura', 'Armor')}><Shield size={12} /> <b>{bonus.armor}</b></span>
          <span class="chip" title={L('Resistência mágica', 'Magic resistance')}><Sparkles size={12} /> <b>{bonus.resist}</b></span></div>
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

      <!-- aparência: o boneco em pixel art -->
      <section class="card play no-print">
        <div class="row"><h3 class="section-title grow">{L('Aparência — boneco do herói', 'Appearance — hero doll')}</h3>
          {#if ch.avatar}<button class="btn sm ghost" onclick={() => edit((c) => { delete c.avatar; })}>{L('Remover o boneco', 'Remove the doll')}</button>{/if}</div>
        {#if !ch.avatar}
          <p class="muted">{L('Monte o boneco do herói (gênero, pele, cabelo, roupas, armadura e arma). Ele aparece animado no campo de batalha e pode virar o retrato.', 'Build the hero doll (body, skin, hair, clothes, armor and weapon). It shows up animated on the battlefield and can become the portrait.')}</p>
          <div class="tpl">
            <button class="btn" onclick={() => edit((c) => { c.avatar = defaultAvatar('male'); })}>{L('Criar boneco masculino', 'Create male doll')}</button>
            <button class="btn" onclick={() => edit((c) => { c.avatar = defaultAvatar('female'); })}>{L('Criar boneco feminino', 'Create female doll')}</button>
          </div>
        {:else}
          <AvatarEditor avatar={ch.avatar} color={heroColor(ch)} onchange={(a) => edit((c) => { c.avatar = a; })} onportrait={snapPortrait} />
        {/if}
      </section>

      <!-- dados de jogo -->
      <section class="card play no-print">
        <div class="row"><h3 class="section-title grow">{L('Jogo — Mesa de teste', 'Game — Test table')}</h3>
          {#if ch.play}<button class="btn sm ghost" onclick={() => edit((c) => { delete c.play; })}>{L('Remover dados de jogo', 'Remove game data')}</button>{/if}</div>
        {#if !ch.play}
          <p class="muted">{L('Este herói ainda não pode entrar na Mesa. Escolha um modelo para começar (deck, arma e equipamento); depois é só ajustar.', 'This hero cannot enter the Table yet. Pick a template to start (deck, weapon and gear); then adjust.')}</p>
          <div class="tpl">{#each HERO_BASES as b}<button class="btn" onclick={() => enablePlay(b)}>{L(b.className[0], b.className[1])}</button>{/each}</div>
        {:else}
          {@const b = ch.play}
          {@const d = heroDef(ch)}
          <div class="totals">
            <span><Heart size={15} /> <b>{d.maxHp}</b> {L('Vida', 'Life')}</span>
            <span><Swords size={15} /> <b>{d.weapon.dmg}</b> {L('Golpe', 'Strike')}</span>
            <span><Shield size={15} /> <b>{d.armor}</b> {L('Armadura', 'Armor')}</span>
            <span><Sparkles size={15} /> <b>{d.resist}</b> {L('Resistência mágica', 'Magic resistance')}</span>
            <span class="vig">Vigor <b>{b.vigor}</b></span><span class="man">Mana <b>{b.mana}</b></span>
          </div>
          <div class="pgrid">
            <label class="field"><span>{L('Deck', 'Deck')}</span>
              <select class="select" value={b.deckId} onchange={(e) => play((x) => { x.deckId = (e.currentTarget as HTMLSelectElement).value; })}>
                {#each gameDecks as dk}<option value={dk.id}>{app.edition(dk.editionId)?.name} — {dk.name[app.lang]}</option>{/each}
              </select></label>
            <label class="field"><span>{L('Classe (nome)', 'Class (name)')}</span>
              <input class="input" value={L(b.className[0], b.className[1])} oninput={(e) => play((x) => { x.className[app.lang === 'pt-BR' ? 0 : 1] = (e.currentTarget as HTMLInputElement).value; })} /></label>
            <label class="field"><span>{L('Vida base', 'Base life')}</span>
              <input class="input" type="number" min="10" max="60" value={b.baseHp} oninput={(e) => play((x) => { x.baseHp = num(e, 10, 60); })} /></label>
            <div class="field"><span>{L('Recursos no nível 1 (3 pontos)', 'Level 1 resources (3 points)')}</span>
              <div class="split">{#each [0, 1, 2, 3] as v}<button class:on={b.vigor === v} onclick={() => play((x) => { x.vigor = v; x.mana = 3 - v; })}>{v} Vigor · {3 - v} Mana</button>{/each}</div></div>
          </div>
          <div class="field"><span>{L('Atributos de jogo (as cartas pedem um mínimo)', 'Game attributes (cards require a minimum)')}</span>
            <div class="gattrs">
              {#each ATTRS as a}
                <div class="ga"><small>{L(ATTR_NAMES[a][0], ATTR_NAMES[a][1])}</small>
                  <div class="val"><button onclick={() => play((x) => { x.attrs[a] = Math.max(0, x.attrs[a] - 1); })}><Minus size={12} /></button><b>{b.attrs[a]}</b><button onclick={() => play((x) => { x.attrs[a] = Math.min(5, x.attrs[a] + 1); })}><Plus size={12} /></button></div></div>
              {/each}
            </div></div>
          <div class="field"><span>{L('Equipamento vestido (resumo)', 'Equipped gear (summary)')}</span>
            <p class="gnote"><Info size={14} /> <span>{L('A arma e as peças são as cartas de equipamento vestidas no quadro “Equipamento”, no alto da ficha. Para trocar, clique num espaço lá em cima; para mudar o nome ou os números de uma peça, edite a carta dela.', 'The weapon and pieces are the equipment cards worn in the “Equipment” board at the top of the sheet. To swap, click a slot up there; to change a piece’s name or numbers, edit its card.')}</span></p>
            <div class="gearlist">
              {#each SLOTS as sl (sl.id)}
                {@const card = ch.slots[sl.id] ? app.cards[ch.slots[sl.id]!] : undefined}
                <div class="grow1" class:empty={!card}>
                  <small class="gslot">{L(sl.pt, sl.en)}</small>
                  {#if card}
                    <b class="gname">{card.text[app.lang]?.name || card.text['pt-BR'].name}</b>
                    <span class="gwhat">{gearText(card.gear, app.lang)}</span>
                    <button class="btn sm ghost" onclick={() => editCard(card.id)} title={L('Abre a carta no editor (aba Jogo) para mudar nome e números', 'Opens the card in the editor (Game tab) to change name and numbers')}><Pencil size={13} /> {L('Editar carta', 'Edit card')}</button>
                  {:else}
                    <span class="gwhat muted">{sl.id === 'mainHand' ? L('sem arma — golpe 1, corpo a corpo', 'no weapon — strike 1, melee') : L('vazio', 'empty')}</span>
                    <button class="btn sm ghost" onclick={() => (picking = sl.id)}><Plus size={13} /> {L('Vestir', 'Equip')}</button>
                  {/if}
                </div>
              {/each}
            </div></div>
        {/if}
      </section>
    </div>
  {/if}
</div>

{#if creating}
  <div class="backdrop" role="presentation" onclick={() => (creating = false)}>
    <div class="picker" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (creating = false)}>
      <div class="row"><h3 class="grow">{L('Novo herói: escolha um modelo', 'New hero: pick a template')}</h3>
        <button class="btn sm ghost icon" onclick={() => (creating = false)}><X size={16} /></button></div>
      <p class="muted">{L('O modelo define o deck, a arma e o equipamento iniciais. Você pode mudar tudo depois na ficha.', 'The template sets the starting deck, weapon and gear. You can change everything later.')}</p>
      <div class="tplgrid">
        {#each HERO_BASES as b}
          {@const tc = chars.find((c) => c.preset === b.id)}
          <button class="tplc" onclick={() => addChar(b)}>
            <HeroPortrait hero={tc ?? { id: '', name: '', raceId: '', classColors: [b.deckId.replace('proto-', '') as ColorId], level: 1, hp: 1, stats: baseStats(), slots: {}, notes: '', play: b }} size={110} />
            <b>{L(b.className[0], b.className[1])}</b>
            <small>{L(b.weapon.name[0], b.weapon.name[1])} · {b.vigor} Vigor · {b.mana} Mana</small>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

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
            <button class="opt" class:on={ch.slots[picking] === c.id} onclick={() => equip(picking!, c)}><CardImage card={c} /><small>{gearText(c.gear, app.lang)}</small></button>
          {/each}
        </div>
      {:else}
        <p class="muted">{L('Ainda não há carta de equipamento para este espaço. Crie uma no deck de Equipamentos (Biblioteca → Nova carta) e, na aba Jogo da carta, escolha o espaço e os bônus.', 'There is no equipment card for this slot yet. Create one in the Equipment deck (Library → New card) and, in the card’s Game tab, choose the slot and the bonuses.')}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .sheet-page { height: 100%; overflow-y: auto; background: radial-gradient(ellipse at 50% 0%, #1b1715, var(--bg) 60%); }
  .head { display: flex; align-items: center; gap: 8px; padding: 14px 28px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: rgb(12 11 10 / .9); backdrop-filter: blur(8px); z-index: 2; flex-wrap: wrap; }
  .empty { display: grid; justify-items: center; gap: 10px; text-align: center; padding: 12vh 20px; color: var(--muted); }

  .gallery { padding: 28px 32px 60px; max-width: 1500px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
  .ghead { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .ghead h1 { font-size: 28px; }
  .ghead p { max-width: 640px; margin-top: 4px; }
  .hgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
  .hcard { position: relative; display: flex; flex-direction: column; border-radius: 18px; border: 1px solid var(--line); overflow: hidden;
    background: linear-gradient(180deg, color-mix(in srgb, var(--c, #555) 16%, var(--surface)), #131010 70%); box-shadow: var(--shadow); transition: transform var(--t), border-color var(--t); }
  .hcard:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--c, #888) 70%, #fff 0%); }
  .hmain { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 14px 10px; border: 0; background: none; color: var(--text); cursor: pointer; font: inherit; }
  .hpic { border-radius: 14px; overflow: hidden; box-shadow: 0 0 0 1px rgb(255 255 255 / .1), 0 14px 30px rgb(0 0 0 / .55); line-height: 0; }
  .hpic { position: relative; }
  .hdoll { position: absolute; right: -6px; bottom: -4px; filter: drop-shadow(0 4px 6px rgb(0 0 0 / .8)); }
  .hname { font-size: 21px; color: var(--accent-2); margin-top: 6px; }
  .hclass { font-size: 12.5px; color: var(--text-2); }
  .hstats { display: flex; gap: 10px; font: 600 13px var(--ui); color: var(--text-2); }
  .hstats i { font-style: normal; display: inline-flex; gap: 4px; align-items: center; }
  .hdeck { font-size: 11.5px; color: var(--muted); }
  .hact { display: flex; gap: 6px; justify-content: center; padding: 0 12px 14px; }
  .hcard.new { min-height: 300px; align-items: center; justify-content: center; gap: 8px; border-style: dashed; color: var(--muted); cursor: pointer; font: 500 14px var(--ui); background: none; }
  .hcard.new:hover { color: var(--accent-2); border-color: var(--accent); }
  .hd { font-size: 18px; color: var(--accent-2); margin-left: 6px; }
  .pfill { position: absolute; inset: 0; display: grid; place-items: center; }
  .pfill :global(.hp) { width: 100% !important; height: 100% !important; border-radius: 0; }
  .pchange { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); display: inline-flex; gap: 5px; align-items: center; font: 500 11px var(--ui); padding: 3px 9px; border-radius: 99px; background: rgb(0 0 0 / .65); color: #eee; opacity: 0; transition: opacity var(--t); white-space: nowrap; }
  .portrait:hover .pchange { opacity: 1; }
  .play { grid-column: 1 / -1; }
  .totals { display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 10px 14px; border-radius: 12px; background: var(--bg-2); border: 1px solid var(--line); font-size: 13px; color: var(--text-2); }
  .totals span { display: inline-flex; gap: 5px; align-items: center; }
  .totals b { color: var(--text); font-size: 15px; }
  .totals .vig b { color: #e5866f; } .totals .man b { color: #7fb0ff; }
  .pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .split { display: flex; gap: 4px; flex-wrap: wrap; }
  .split button { padding: 6px 9px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text-2); font: 500 12px var(--ui); cursor: pointer; }
  .split button.on { border-color: var(--accent); color: var(--accent-2); background: var(--accent-soft); }
  .gattrs { display: flex; flex-wrap: wrap; gap: 10px; }
  .ga { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .ga small { font: 600 11px var(--display); letter-spacing: .1em; color: var(--accent); }
  .gearlist { display: flex; flex-direction: column; gap: 6px; }
  .grow1 { display: grid; grid-template-columns: 110px minmax(140px, 1fr) minmax(160px, 1.2fr) auto; gap: 10px; align-items: center; padding: 7px 10px; border-radius: 9px; border: 1px solid var(--line); background: var(--bg-2); }
  .grow1.empty { grid-template-columns: 110px 1fr auto; border-style: dashed; background: none; }
  .gslot { color: var(--muted); font-size: 12px; }
  .gname { font-size: 13.5px; font-weight: 600; }
  .gwhat { font-size: 12.5px; color: var(--text-2); }
  .gnote { display: flex; gap: 8px; align-items: flex-start; margin: 0; padding: 9px 11px; border-radius: 9px; background: var(--surface); border: 1px solid var(--line); font-size: 12.5px; color: var(--text-2); }
  .gnote :global(svg) { flex: none; margin-top: 2px; color: var(--accent); }
  .tpl { display: flex; gap: 8px; flex-wrap: wrap; }
  .tplgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .tplc { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 10px; border-radius: 14px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text); cursor: pointer; font: inherit; }
  .tplc:hover { border-color: var(--accent); }
  .tplc small { color: var(--muted); font-size: 11.5px; text-align: center; }

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
  .opt { padding: 0; border: 2px solid transparent; border-radius: 10px; background: none; cursor: pointer; display: flex; flex-direction: column; gap: 4px; color: var(--text-2); font: inherit; }
  .opt small { font-size: 11.5px; padding: 0 4px 4px; text-align: center; }
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
