<!--
  Criação de personagem: identidade, atributos, aparência, equipamento e deck.
  Tudo é feito num rascunho; só "Salvar personagem" grava. Sair com alterações
  pergunta se é para salvar.
-->
<script lang="ts" module>
  /** Aba aberta por último (um herói novo, ao ser salvo, reabre na mesma aba). */
  let keepStep: string | null = null;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Plus, Minus, X, Heart, Upload, Swords, Shield, Sparkles, Save, Undo2, Trash2, UserRound, Dna, Shirt, Backpack, Layers, Check, TriangleAlert, Pencil, RotateCcw, ScrollText, Wand2, Star } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { importImage } from '../../store/media';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { router } from '../../app/router.svelte';
  import { CLASS_COLORS, COLORS, colorHex } from '../../model/catalog';
  import type { Card, Character, ColorId, Slot } from '../../model/types';
  import { blankHero, BUILDS, buildStats, canLower, canRaise, defaultPlay, gameAttrs, pointsLeft, raceMod, RACES, setRace, STAT_MAX, STAT_POINTS, statBase, statMod, STATS, type Build } from '../../model/hero';
  import { SLOTS, equippedCards, gearText, heroBaseOf, meetsReq } from '../../model/equipment';
  import { buildHero } from '../../game/decks';
  import { ATTR_NAMES } from '../../game/types';
  import { classIcon } from '../../render/icons/glyphs';
  import { lighten } from '../../render/color';
  import { vivid } from '../../render/palette';
  import Glyph from '../common/Glyph.svelte';
  import CardImage from '../common/CardImage.svelte';
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import ScreenBar from '../common/ScreenBar.svelte';
  import AppearancePicker from '../../avatar/AppearancePicker.svelte';
  import { defaultAvatar, RACE_HEADS, type Avatar } from '../../avatar/lpc';
  import AvatarSprite from '../../avatar/AvatarSprite.svelte';
  import HeroStage from './HeroStage.svelte';

  let { id }: { id: string } = $props();

  const gameDecks = $derived(app.decks.filter((d) => app.cardsOf(d.id).some((c) => c.game)));
  const fresh = id === 'novo';
  const found = fresh ? undefined : app.project?.characters.find((c) => c.id === id);
  const missing = !fresh && !found;
  let draft = $state<Character>(fresh || !found ? blankHero('red', app.decks.filter((d) => app.cardsOf(d.id).some((c) => c.game))) : structuredClone($state.snapshot(found) as Character));
  let baseline = $state(fresh ? '' : JSON.stringify(draft));
  const dirty = $derived(JSON.stringify(draft) !== baseline);

  type Step = 'who' | 'attrs' | 'look' | 'gear' | 'deck';
  const STEPS: { id: Step; icon: typeof UserRound; pt: string; en: string }[] = [
    { id: 'who', icon: UserRound, pt: 'Identidade', en: 'Identity' }, { id: 'look', icon: Shirt, pt: 'Aparência', en: 'Appearance' },
    { id: 'attrs', icon: Dna, pt: 'Atributos', en: 'Attributes' }, { id: 'gear', icon: Backpack, pt: 'Equipamento', en: 'Equipment' },
    { id: 'deck', icon: Layers, pt: 'Deck e recursos', en: 'Deck & resources' },
  ];
  let step = $state<Step>((STEPS.find((s) => s.id === keepStep)?.id) ?? 'who');
  $effect(() => { keepStep = step; });

  // ───── salvar / sair ─────
  function save() {
    if (!draft.name.trim()) draft.name = L('Herói sem nome', 'Unnamed hero');
    if (draft.play) { draft.play.name = draft.name; draft.play.attrs = gameAttrs(draft); }
    const snap = $state.snapshot(draft) as Character;
    app.updateProject((p) => { const i = p.characters.findIndex((c) => c.id === snap.id); if (i >= 0) p.characters[i] = snap; else p.characters.push(snap); });
    baseline = JSON.stringify(draft);
    ui.toast(L('Personagem salvo', 'Character saved'));
    if (fresh) { router.guard = null; router.replace(`/heroi/${encodeURIComponent(snap.id)}`); }
  }
  function discard() {
    if (fresh || !found) return;
    draft = structuredClone($state.snapshot(app.project!.characters.find((c) => c.id === id)!) as Character);
  }
  async function askLeave(): Promise<boolean> {
    if (!dirty || missing) return true;
    const r = await ui.confirm({
      title: L('Salvar o personagem?', 'Save the character?'),
      text: fresh ? L('Este herói ainda não foi salvo. Se sair agora, ele será perdido.', 'This hero has not been saved yet. If you leave now, it will be lost.')
        : L(`“${draft.name}” tem alterações que ainda não foram salvas.`, `“${draft.name}” has unsaved changes.`),
      ok: L('Salvar e sair', 'Save and leave'), third: L('Sair sem salvar', 'Leave without saving'), cancel: L('Continuar editando', 'Keep editing'),
    });
    if (r === 'ok') { save(); return true; }
    return r === 'third';
  }
  router.guard = askLeave;
  onDestroy(() => { if (router.guard === askLeave) router.guard = null; });
  const backTo = router.returnTo;
  function leave() { router.returnTo = null; router.go(backTo ?? '/heroi'); }
  async function remove() {
    const r = await ui.confirm({ title: L('Excluir herói?', 'Delete hero?'), text: `“${draft.name}”\n${L('Isso não pode ser desfeito.', 'This cannot be undone.')}`, ok: L('Excluir', 'Delete'), danger: true });
    if (r !== 'ok') return;
    app.updateProject((p) => { p.characters = p.characters.filter((c) => c.id !== draft.id); });
    router.guard = null;
    router.go('/heroi');
  }

  // ───── identidade ─────
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const hasDeck = (col: ColorId) => gameDecks.some((d) => d.id === `proto-${col}` || d.colors[0] === col);
  function toggleClass(col: ColorId) {
    const first = draft.classColors[0];
    if (draft.classColors.includes(col)) { if (draft.classColors.length > 1) draft.classColors = draft.classColors.filter((x) => x !== col); }
    else draft.classColors = draft.classColors.length >= 2 ? [draft.classColors[0], col] : [...draft.classColors, col];
    // a classe principal mudou: deck, nome da classe e recursos passam a ser os dela
    if (draft.classColors[0] !== first && draft.play) {
      const d = defaultPlay(draft.id, draft.name, draft.classColors[0], gameDecks, draft.raceId);
      draft.play = { ...draft.play, className: d.className, deckId: d.deckId, vigor: d.vigor, mana: d.mana, icon: d.icon };
    }
  }
  /** Como cada ancestralidade aparece no boneco: a cabeça da raça ou, nas de cabeça humana, os traços que a marcam. */
  const RACE_LOOK: Record<string, { head?: string; skin?: string; parts?: Avatar['parts'] }> = {
    orc: { head: 'orc', skin: 'green' }, goblin: { head: 'goblin', skin: 'bright_green' }, dragonborn: { head: 'lizard', skin: 'green' },
    elf: { parts: { ears: { id: 'head_ears_elven' } } }, gnome: { parts: { ears: { id: 'head_ears_medium' } } },
    tiefling: { skin: 'demon', parts: { horns: { id: 'head_horns_curled' }, tail: { id: 'tail_lizard_alt', color: 'red' } } },
  };
  /** Troca a ancestralidade e ajusta o boneco: sai o que era da raça anterior, entra o da nova (o resto da aparência fica). */
  function chooseRace(id: string) {
    const before = RACE_LOOK[draft.raceId], after = RACE_LOOK[id];
    setRace(draft, id);
    const a = draft.avatar;
    if (!a) return;
    if (before?.head && a.head === before.head) { delete a.head; delete a.frame; }
    for (const k of Object.keys(before?.parts ?? {}) as (keyof Avatar['parts'])[]) if (a.parts[k]?.id === before!.parts![k]!.id) delete a.parts[k];
    if (before?.skin && a.skin === before.skin) a.skin = 'light';
    if (after?.head && RACE_HEADS.some((r) => r.id === after.head)) a.head = after.head;
    if (after?.skin) a.skin = after.skin;
    for (const [k, v] of Object.entries(after?.parts ?? {})) a.parts[k as keyof Avatar['parts']] ??= { ...v! };
  }
  let portraitInput = $state<HTMLInputElement>();
  async function setPortrait(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    draft.portraitMediaId = await importImage(f, f.name);
  }

  // ───── atributos ─────
  const left = $derived(pointsLeft(draft));
  const attrs = $derived(gameAttrs(draft));
  function resetStats() { for (const s of STATS) draft.stats[s.id] = statBase(draft, s.id); }
  /** Sugestões: primeiro as da classe do herói. Cada uma diz quantas cartas do deck ainda ficariam travadas. */
  const builds = $derived(BUILDS.map((b) => {
    const stats = buildStats(draft, b), at = gameAttrs({ stats });
    const blocked = draft.play ? app.cardsOf(draft.play.deckId).filter((c) => c.game?.attr && at[c.game.attr[0]] < c.game.attr[1]).length : 0;
    return { b, stats, at, blocked, mine: b.classes.includes(draft.classColors[0]), on: STATS.every((s) => draft.stats[s.id] === stats[s.id]) };
  }).sort((x, y) => Number(y.mine) - Number(x.mine)));
  function applyBuild(b: Build) { draft.stats = buildStats(draft, b); }
  /** Cartas do deck que pedem cada atributo: quantas são e o maior valor pedido. */
  const asks = $derived.by(() => {
    const out: Record<string, { n: number; max: number }> = {};
    for (const c of draft.play ? app.cardsOf(draft.play.deckId) : []) { const a = c.game?.attr; if (a) { const o = (out[a[0]] ??= { n: 0, max: 0 }); o.n++; o.max = Math.max(o.max, a[1]); } }
    return out;
  });

  // ───── equipamento ─────
  let picking = $state<Slot | null>(null);
  /** Carta em destaque no seletor (a que o mouse ou o foco aponta). */
  let peek = $state<string | null>(null);
  $effect(() => { if (!picking) peek = null; });
  const equipment = $derived(Object.values(app.cards).filter((c) => app.deck(c.deckId)?.kind === 'equipment'));
  /** Cartas que cabem no espaço (só as que fazem algo no jogo): primeiro as que o herói pode usar. */
  const slotOptions = (slot: Slot) => equipment.filter((c) => c.gear && Object.keys(c.gear).length && c.tags.some((t) => SLOTS.find((s) => s.id === slot)!.tags.includes(t)))
    .sort((a, b) => Number(meetsReq(b.gear, reqAttrs)) - Number(meetsReq(a.gear, reqAttrs)) || a.n - b.n);
  const worn = $derived(equippedCards(draft, app.cards));
  /** A arma da mão principal usa as duas mãos (a secundária fica vazia). */
  const twoHanded = $derived(app.cards[draft.slots.mainHand ?? '']?.gear?.weapon?.hands === 2);
  /** Por que não dá para vestir a carta (atributo que falta ou mão ocupada), ou vazio se dá. */
  function blocked(slot: Slot, c: Card): string {
    if (!meetsReq(c.gear, reqAttrs)) { const [a, n] = c.gear!.req!; return L(`Requer ${ATTR_NAMES[a][0]} ${n}`, `Requires ${ATTR_NAMES[a][1]} ${n}`); }
    if (slot === 'offHand' && twoHanded) return L('A arma usa as duas mãos', 'The weapon is two-handed');
    return '';
  }
  function equip(slot: Slot, card: Card | null) {
    if (card && blocked(slot, card)) return;
    if (card) draft.slots[slot] = card.id; else delete draft.slots[slot];
    // arma de duas mãos: a mão secundária fica livre
    if (card && slot === 'mainHand' && card.gear?.weapon?.hands === 2) delete draft.slots.offHand;
    picking = null;
  }
  const cardName = (c: Card) => c.text[app.lang]?.name || c.text['pt-BR'].name;

  // ───── números de jogo ─────
  const hero = $derived(draft.play ? buildHero(heroBaseOf(draft, app.cards)) : null);
  /** Atributos que valem para os requisitos das peças (com os bônus das peças vestidas: manoplas do ogro abrem o machado grande). */
  const reqAttrs = $derived(hero?.attrs ?? attrs);
  const deck = $derived(app.deck(draft.play?.deckId ?? ''));
  const deckCards = (deckId: string) => app.cardsOf(deckId).filter((c) => c.game).reduce((n, c) => n + (c.game?.copies ?? 1), 0);
  const tint = $derived(colorHex(deck?.colors[0] ?? draft.classColors[0] ?? 'red'));
  /** Cartas do deck que o herói ainda não consegue usar por falta de atributo. */
  const locked = $derived(draft.play ? app.cardsOf(draft.play.deckId).filter((c) => c.game?.attr && attrs[c.game.attr[0]] < c.game.attr[1]) : []);
  const warnings = $derived([
    ...(left > 0 ? [L(`${left} ponto${left > 1 ? 's' : ''} de atributo para distribuir`, `${left} attribute point${left > 1 ? 's' : ''} to spend`)] : []),
    ...(left < 0 ? [L(`${-left} ponto${left < -1 ? 's' : ''} de atributo acima do limite`, `${-left} attribute point${left < -1 ? 's' : ''} over the limit`)] : []),
    ...(!draft.slots.mainHand ? [L('sem arma na mão principal (golpe 1)', 'no weapon in the main hand (strike 1)')] : []),
    ...(locked.length ? [L(`${locked.length} carta${locked.length > 1 ? 's' : ''} do deck pede${locked.length > 1 ? 'm' : ''} mais atributo`, `${locked.length} deck card${locked.length > 1 ? 's' : ''} need${locked.length > 1 ? '' : 's'} more attribute`)] : []),
  ]);
  const num = (e: Event, min: number, max: number) => Math.max(min, Math.min(max, Math.round(+(e.currentTarget as HTMLInputElement).value || 0)));
  function key(e: KeyboardEvent) {
    if (e.key === 'Escape' && picking) { picking = null; e.preventDefault(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) save(); }
  }
</script>

<svelte:window onkeydown={key} />

<div class="hc" style="--c:{tint}">
  <ScreenBar title={draft.name || L('Novo herói', 'New hero')} kicker={L('Criação de personagem', 'Character creation')} back={backTo === '/batalha/solo' ? L('Batalha', 'Battle') : L('Heróis', 'Heroes')} onback={leave}>
    {#if !missing}
      {#if dirty}<span class="unsaved"><i></i>{L('Alterações não salvas', 'Unsaved changes')}</span>{/if}
      {#if !fresh}<button class="px-btn ghost" disabled={!dirty} onclick={discard}><Undo2 size={14} /> {L('Descartar', 'Discard')}</button>{/if}
      <button class="px-btn gold" disabled={!dirty} onclick={save} title="Ctrl+S"><Save size={14} /> {L('Salvar personagem', 'Save character')}</button>
      {#if !fresh}<button class="px-icon danger" onclick={remove} title={L('Excluir herói', 'Delete hero')} aria-label={L('Excluir herói', 'Delete hero')}><Trash2 size={15} /></button>{/if}
    {/if}
  </ScreenBar>

  {#if missing}
    <div class="gone"><UserRound size={40} /><p>{L('Este herói não existe mais.', 'This hero no longer exists.')}</p><button class="px-btn gold" onclick={() => router.go('/heroi')}>{L('Ver os heróis', 'See the heroes')}</button></div>
  {:else}
    <div class="body">
      <!-- coluna do herói: boneco, retrato e números -->
      <aside class="side">
        {#if draft.avatar}
          <HeroStage avatar={draft.avatar} color={tint} onchange={(a: Avatar) => (draft.avatar = a)} />
        {:else}
          <div class="nodoll"><HeroPortrait hero={draft} size={220} /><button class="px-btn" onclick={() => { draft.avatar = defaultAvatar('male'); step = 'look'; }}><Plus size={14} /> {L('Criar o boneco', 'Create the doll')}</button></div>
        {/if}
        <div class="idline">
          <HeroPortrait hero={draft} size={62} />
          <div class="idtx">
            <b>{draft.name || L('Sem nome', 'Unnamed')}</b>
            <span>{RACES.find((r) => r.id === draft.raceId)?.name[app.lang] ?? L('Sem ancestralidade', 'No ancestry')} · {hero ? L(hero.className[0], hero.className[1]) : ''}</span>
          </div>
        </div>
        {#if hero}
          <div class="nums">
            <span title={L('Vida no começo da batalha', 'Life at the start of the battle')}><Heart size={14} /><b>{hero.maxHp}</b><small>{L('Vida', 'Life')}</small></span>
            <span title={L('Dano do golpe do herói', 'Hero strike damage')}><Swords size={14} /><b>{hero.weapon.dmg}</b><small>{L('Golpe', 'Strike')}</small></span>
            <span title={L('Armadura: reduz o dano físico', 'Armor: reduces physical damage')}><Shield size={14} /><b>{hero.armor}</b><small>{L('Armadura', 'Armor')}</small></span>
            <span title={L('Resistência mágica: reduz o dano mágico', 'Magic resistance: reduces magic damage')}><Sparkles size={14} /><b>{hero.resist}</b><small>{L('Resist.', 'Resist')}</small></span>
          </div>
          <div class="res">
            <span class="vig">Vigor {#each Array(3) as _, i}<i class:on={i < hero.vigor}></i>{/each}</span>
            <span class="man">Mana {#each Array(3) as _, i}<i class:on={i < hero.mana}></i>{/each}</span>
          </div>
          <div class="mods">{#each STATS as s}<span class:hi={attrs[s.attr] >= 3}>{L(s.pt, s.en)} <b>{attrs[s.attr]}</b></span>{/each}</div>
        {/if}
        {#if warnings.length}
          <ul class="warn">{#each warnings as w}<li><TriangleAlert size={13} /> {w}</li>{/each}</ul>
        {:else}
          <p class="ready"><Check size={14} /> {L('Pronto para a batalha', 'Ready for battle')}</p>
        {/if}
      </aside>

      <!-- abas -->
      <section class="main">
        <nav class="steps">
          {#each STEPS as s, i (s.id)}
            <button class:on={step === s.id} onclick={() => (step = s.id)}><em>{i + 1}</em><s.icon size={15} /><span>{L(s.pt, s.en)}</span>
              {#if s.id === 'attrs' && left !== 0}<i class="dot" class:bad={left < 0}></i>{/if}</button>
          {/each}
        </nav>

        <div class="panel" class:flush={step === 'look'}>
          {#if step === 'who'}
            <div class="cols">
              <div class="stackv">
                <label class="fld"><span>{L('Nome do herói', 'Hero name')}</span>
                  <!-- svelte-ignore a11y_autofocus -->
                  <input class="name" bind:value={draft.name} placeholder={L('Como ele se chama?', 'What is the hero called?')} maxlength="40" autofocus={fresh} /></label>

                <div class="fld"><span>{L('Classe (até 2; a primeira define o deck)', 'Class (up to 2; the first one sets the deck)')}</span>
                  <div class="classes">
                    {#each CLASS_COLORS as col}
                      {@const n = draft.classColors.indexOf(col)}
                      <button class="cls" class:on={n >= 0} class:nodeck={!hasDeck(col)} style="--k:{colorHex(col)}" onclick={() => toggleClass(col)}>
                        <span class="cic"><Glyph id={classIcon(col)} size={24} color={lighten(vivid(colorHex(col)), 0.45)} /></span>
                        <b>{COLORS[col].classes[app.lang]}</b>
                        <small>{hasDeck(col) ? COLORS[col].name[app.lang] : L('sem deck jogável ainda', 'no playable deck yet')}</small>
                        {#if n >= 0}<em>{n + 1}ª</em>{/if}
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="fld"><span>{L('Retrato', 'Portrait')}</span>
                  <div class="portrait">
                    <HeroPortrait hero={draft} size={96} />
                    <div class="stackv sm">
                      <p>{draft.portraitMediaId ? L('Usando uma imagem enviada por você.', 'Using an image you uploaded.') : L('O retrato é o busto do próprio boneco: muda junto com a aparência.', 'The portrait is the doll’s own bust: it changes with the appearance.')}</p>
                      <div class="rowx">
                        <button class="px-btn" onclick={() => portraitInput?.click()}><Upload size={14} /> {L('Enviar imagem', 'Upload image')}</button>
                        {#if draft.portraitMediaId}<button class="px-btn ghost" onclick={() => { delete draft.portraitMediaId; }}>{L('Voltar a usar o boneco', 'Use the doll again')}</button>{/if}
                      </div>
                    </div>
                    <input type="file" accept="image/*" hidden bind:this={portraitInput} onchange={(e) => setPortrait((e.currentTarget as HTMLInputElement).files)} />
                  </div>
                </div>

                <label class="fld"><span><ScrollText size={12} /> {L('História do personagem', 'Character story')}</span>
                  <textarea class="textarea" rows="5" bind:value={draft.notes} placeholder={L('De onde ele veio, o que busca, o que teme…', 'Where the hero came from, what they seek, what they fear…')}></textarea></label>
              </div>

              <div class="fld"><span>{L('Ancestralidade', 'Ancestry')}</span>
                <div class="races">
                  {#each RACES as r (r.id)}
                    <button class="race" class:on={draft.raceId === r.id} onclick={() => chooseRace(r.id)}>
                      <b>{r.name[app.lang]}</b>
                      <span class="rmods">
                        {#each STATS as s}{@const m = (r.boosts[s.id] ?? 0) + (r.flaws[s.id] ?? 0)}{#if m}<i class:neg={m < 0}>{fmt(m)} {L(s.pt, s.en)}</i>{/if}{/each}
                        <i class="hp"><Heart size={10} /> {fmt(r.hp - 8)}</i>
                      </span>
                      <small>{r.desc[app.lang]}</small>
                      {#if draft.raceId === r.id}<span class="rcheck"><Check size={12} strokeWidth={3} /></span>{/if}
                    </button>
                  {/each}
                </div>
              </div>
            </div>

          {:else if step === 'attrs'}
            <div class="pts" class:over={left < 0} class:done={left === 0}>
              <div>
                <h3>{L('Pontos de atributo', 'Attribute points')}</h3>
                <p>{L(`Todos os atributos começam em 10. A ancestralidade soma os bônus dela, e você distribui ${STAT_POINTS} pontos por cima. Cada 2 pontos valem +1 no modificador, que é o que as cartas pedem. Nenhum atributo passa de ${STAT_MAX}.`,
                  `Every attribute starts at 10. The ancestry adds its bonuses, and you spend ${STAT_POINTS} points on top. Every 2 points give +1 to the modifier, which is what the cards require. No attribute goes above ${STAT_MAX}.`)}</p>
              </div>
              <div class="ptsn"><b>{left}</b><small>{L(`de ${STAT_POINTS} para distribuir`, `of ${STAT_POINTS} left to spend`)}</small>
                <div class="pips">{#each Array(STAT_POINTS) as _, i}<i class:on={i < STAT_POINTS - Math.max(0, left)}></i>{/each}</div></div>
              <button class="px-btn ghost" onclick={resetStats}><RotateCcw size={14} /> {L('Zerar', 'Reset')}</button>
            </div>
            <div class="stats">
              {#each STATS as s (s.id)}
                {@const v = draft.stats[s.id]}
                {@const rm = raceMod(draft, s.id)}
                <div class="stat" class:hi={attrs[s.attr] >= 3}>
                  <div class="sthead"><b>{L(s.full[0], s.full[1])}</b><em>{L(s.pt, s.en)}</em></div>
                  <div class="stmod"><strong>{attrs[s.attr]}</strong><small>{L('nas cartas', 'on cards')}</small></div>
                  <div class="stval">
                    <button disabled={!canLower(draft, s.id)} onclick={() => { if (canLower(draft, s.id)) draft.stats[s.id]--; }} aria-label={L('Diminuir', 'Lower')}><Minus size={15} /></button>
                    <span><b>{v}</b><small>{fmt(statMod(v))}</small></span>
                    <button disabled={!canRaise(draft, s.id)} onclick={() => { if (canRaise(draft, s.id)) draft.stats[s.id]++; }} aria-label={L('Aumentar', 'Raise')}><Plus size={15} /></button>
                  </div>
                  <div class="stbar">{#each Array(STAT_MAX - 8 + 1) as _, i}<i class:on={8 + i <= v} class:base={8 + i <= statBase(draft, s.id)}></i>{/each}</div>
                  <p>{L(s.does[0], s.does[1])}</p>
                  <p class="ask" class:need={asks[s.attr] && attrs[s.attr] < asks[s.attr].max} class:ok={asks[s.attr] && attrs[s.attr] >= asks[s.attr].max}>{asks[s.attr] ? L(`No seu deck: ${asks[s.attr].n} carta${asks[s.attr].n > 1 ? 's pedem' : ' pede'} ${s.pt} (até ${asks[s.attr].max}).`, `In your deck: ${asks[s.attr].n} card${asks[s.attr].n > 1 ? 's need' : ' needs'} ${s.en} (up to ${asks[s.attr].max}).`) : L(`Nenhuma carta do seu deck pede ${s.pt}.`, `No card in your deck needs ${s.en}.`)}</p>
                  {#if rm}<span class="rtag" class:neg={rm < 0}>{fmt(rm)} {L('ancestralidade', 'ancestry')}</span>{/if}
                </div>
              {/each}
            </div>
            <div class="builds">
              <header><Wand2 size={15} /><h3>{L('Sugestões prontas', 'Ready-made builds')}</h3><small>{L('Não sabe como distribuir? Escolha um estilo: os pontos são gastos para você, e dá para ajustar depois.', 'Not sure how to spend? Pick a style: the points are spent for you, and you can adjust afterwards.')}</small></header>
              <div class="blist">
                {#each builds as x (x.b.id)}
                  <button class="build" class:on={x.on} class:mine={x.mine} onclick={() => applyBuild(x.b)}>
                    <span class="bhead"><b>{L(x.b.pt, x.b.en)}</b>{#if x.mine}<em><Star size={10} /> {L('para a sua classe', 'for your class')}</em>{/if}</span>
                    <span class="binfo">{L(x.b.info[0], x.b.info[1])}</span>
                    <span class="bstats">{#each STATS as st}<i class:hi={x.at[st.attr] >= 3} class:zero={!x.at[st.attr]}>{L(st.pt, st.en)} {x.at[st.attr]}</i>{/each}</span>
                    <span class="bdeck" class:bad={x.blocked > 0}>{x.blocked ? L(`${x.blocked} carta${x.blocked > 1 ? 's' : ''} do seu deck fica${x.blocked > 1 ? 'm' : ''} sem uso`, `${x.blocked} card${x.blocked > 1 ? 's' : ''} of your deck stay${x.blocked > 1 ? '' : 's'} unusable`) : L('usa todas as cartas do seu deck', 'uses every card in your deck')}</span>
                    {#if x.on}<span class="rcheck"><Check size={12} strokeWidth={3} /></span>{/if}
                  </button>
                {/each}
              </div>
            </div>
            {#if locked.length}
              <div class="lock"><TriangleAlert size={15} />
                <div><b>{L('Cartas do deck que este herói ainda não consegue usar', 'Deck cards this hero cannot use yet')}</b>
                  <p>{#each locked as c, i}{i ? ' · ' : ''}{cardName(c)} ({L(STATS.find((s) => s.attr === c.game!.attr![0])!.pt, STATS.find((s) => s.attr === c.game!.attr![0])!.en)} {c.game!.attr![1]}){/each}</p></div>
              </div>
            {/if}

          {:else if step === 'look'}
            {#if draft.avatar}
              <AppearancePicker avatar={draft.avatar} onchange={(a) => (draft.avatar = a)} />
            {:else}
              <div class="gone"><p>{L('Este herói ainda não tem boneco.', 'This hero has no doll yet.')}</p><button class="px-btn gold" onclick={() => (draft.avatar = defaultAvatar('male'))}><Plus size={14} /> {L('Criar o boneco', 'Create the doll')}</button></div>
            {/if}

          {:else if step === 'gear'}
            <div class="gearwrap">
              <div class="rig">
                {#snippet slotBtn(sid: Slot)}
                  {@const sl = SLOTS.find((x) => x.id === sid)!}
                  {@const card = draft.slots[sid] ? app.cards[draft.slots[sid]!] : undefined}
                  <button class="slot" class:filled={!!card} title={card ? `${L(sl.pt, sl.en)}: ${cardName(card)}` : L(sl.pt, sl.en)} onclick={() => (picking = sid)}>
                    <span class="scard">{#if card}<CardImage {card} />{:else}<Plus size={18} />{/if}</span>
                    <small>{L(sl.pt, sl.en)}</small>
                  </button>
                {/snippet}
                <div class="scol">{#each ['head', 'chest', 'hands', 'legs', 'feet'] as const as sid}{@render slotBtn(sid)}{/each}</div>
                <div class="altar">
                  <span class="halo"></span>
                  {#if draft.avatar}<span class="fig"><AvatarSprite avatar={draft.avatar} scale={5} /></span>{:else}<HeroPortrait hero={draft} size={200} />{/if}
                  <span class="plinth"></span>
                </div>
                <div class="scol">{#each ['mainHand', 'offHand', 'amulet', 'ring1', 'ring2'] as const as sid}{@render slotBtn(sid)}{/each}</div>
              </div>
              <div class="gearlist">
                <p class="hint">{L('Clique num espaço para escolher a carta de equipamento. A arma da mão principal define o golpe do herói; as outras peças somam Armadura, Resistência, Vida, Vigor, Mana ou atributos. Peças fortes pedem um atributo mínimo ou cobram algo em troca.', 'Click a slot to choose the equipment card. The main-hand weapon sets the hero’s strike; the other pieces add Armor, Resistance, Life, Vigor, Mana or attributes. Strong pieces ask for a minimum attribute or take something in return.')}</p>
                {#each SLOTS as sl (sl.id)}
                  {@const card = draft.slots[sl.id] ? app.cards[draft.slots[sl.id]!] : undefined}
                  <div class="grow1" class:empty={!card}>
                    <small>{L(sl.pt, sl.en)}</small>
                    {#if card}
                      <b>{cardName(card)}</b><span>{gearText(card.gear, app.lang)}</span>
                      <button class="px-icon" onclick={() => (picking = sl.id)} title={L('Trocar', 'Swap')} aria-label={L('Trocar', 'Swap')}><Pencil size={13} /></button>
                      <button class="px-icon" onclick={() => equip(sl.id, null)} title={L('Tirar', 'Unequip')} aria-label={L('Tirar', 'Unequip')}><X size={13} /></button>
                    {:else if sl.id === 'offHand' && twoHanded}
                      <span class="muted">{L('livre: a arma usa as duas mãos', 'free: the weapon is two-handed')}</span>
                    {:else}
                      <span class="muted">{sl.id === 'mainHand' ? L('sem arma — golpe 1, corpo a corpo', 'no weapon — strike 1, melee') : L('vazio', 'empty')}</span>
                      <button class="px-btn sm" onclick={() => (picking = sl.id)}><Plus size={13} /> {L('Equipar', 'Equip')}</button>
                    {/if}
                  </div>
                {/each}
                <p class="hint sm">{worn.length} {L('de', 'of')} {SLOTS.length} {L('espaços ocupados', 'slots filled')}</p>
              </div>
            </div>

          {:else if step === 'deck' && draft.play}
            {@const b = draft.play}
            <div class="fld"><span>{L('Deck de batalha', 'Battle deck')}</span>
              <div class="decks">
                {#each gameDecks as dk (dk.id)}
                  <button class="deck" class:on={b.deckId === dk.id} style="--k:{colorHex(dk.colors[0])}" onclick={() => (b.deckId = dk.id)}>
                    <span class="dic"><Glyph id={classIcon(dk.colors[0])} size={26} color={lighten(vivid(colorHex(dk.colors[0])), 0.45)} /></span>
                    <b>{dk.name[app.lang]}</b>
                    <small>{app.edition(dk.editionId)?.name} · {deckCards(dk.id)} {L('cartas', 'cards')}</small>
                    {#if b.deckId === dk.id}<span class="rcheck"><Check size={12} strokeWidth={3} /></span>{/if}
                  </button>
                {/each}
                {#if !gameDecks.length}<p class="muted">{L('Nenhum deck com cartas de jogo. Crie um no Construtor de Decks.', 'No deck with game cards. Create one in the Deck Builder.')}</p>{/if}
              </div>
            </div>
            <div class="cols even">
              <div class="fld"><span>{L('Recursos no começo da batalha (3 pontos)', 'Resources at the start of the battle (3 points)')}</span>
                <div class="split">
                  {#each [3, 2, 1, 0] as v}
                    <button class:on={b.vigor === v} onclick={() => { b.vigor = v; b.mana = 3 - v; }}>
                      <span class="vig">{#each Array(v) as _}<i></i>{/each}</span><span class="man">{#each Array(3 - v) as _}<i></i>{/each}</span>
                      <small>{v} Vigor · {3 - v} Mana</small>
                    </button>
                  {/each}
                </div>
                <p class="hint sm">{L('Vigor paga golpes e técnicas; Mana paga magias. Os dois enchem a cada turno e crescem quando o herói sobe de nível na batalha.', 'Vigor pays for strikes and techniques; Mana pays for spells. Both refill every turn and grow when the hero levels up in battle.')}</p>
              </div>
              <div class="stackv">
                <label class="fld"><span>{L('Título da classe (aparece na batalha)', 'Class title (shown in battle)')}</span>
                  <input class="input" value={L(b.className[0], b.className[1])} oninput={(e) => { b.className[app.lang === 'pt-BR' ? 0 : 1] = (e.currentTarget as HTMLInputElement).value; }} /></label>
                <label class="fld"><span>{L('Vida base (antes do equipamento)', 'Base life (before equipment)')}</span>
                  <input class="input" type="number" min="10" max="60" value={b.baseHp} onchange={(e) => { b.baseHp = num(e, 10, 60); }} /></label>
                <p class="hint sm">{L('A vida base acompanha a ancestralidade. Este campo é um ajuste de balanceamento para quem está criando o jogo.', 'Base life follows the ancestry. This field is a balance knob for whoever is designing the game.')}</p>
              </div>
            </div>
          {/if}
        </div>
      </section>
    </div>
  {/if}
</div>

{#if picking}
  {@const opts = slotOptions(picking)}
  {@const sl = SLOTS.find((s) => s.id === picking)!}
  {@const shown = opts.find((c) => c.id === peek) ?? opts.find((c) => c.id === draft.slots[picking!]) ?? opts[0]}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={() => (picking = null)}>
    <div class="picker" role="dialog" aria-modal="true" aria-label={L('Escolher equipamento', 'Choose equipment')} onclick={(e) => e.stopPropagation()}>
      <header>
        <div><small>{L('Equipar', 'Equip')}</small><h2>{L(sl.pt, sl.en)}</h2></div>
        <span class="count">{opts.length} {L(opts.length === 1 ? 'carta' : 'cartas', opts.length === 1 ? 'card' : 'cards')}</span>
        <button class="px-icon" onclick={() => (picking = null)} title={L('Fechar (Esc)', 'Close (Esc)')} aria-label={L('Fechar', 'Close')}><X size={15} /></button>
      </header>
      {#if opts.length}
        <div class="pbody">
          <div class="opts">
            {#if draft.slots[picking]}
              <button class="opt none" onclick={() => equip(picking!, null)} onmouseenter={() => (peek = null)}>
                <span class="ocard empty"><X size={26} /></span><b>{L('Deixar vazio', 'Leave empty')}</b>
              </button>
            {/if}
            {#each opts as c (c.id)}
              {@const why = blocked(picking!, c)}
              <button class="opt" class:on={draft.slots[picking] === c.id} class:peek={shown?.id === c.id} class:locked={!!why} onclick={() => equip(picking!, c)} onmouseenter={() => (peek = c.id)} onfocus={() => (peek = c.id)}>
                <span class="ocard"><CardImage card={c} /></span>
                <b>{cardName(c)}</b>
                {#if why}<span class="why">{why}</span>{/if}
                {#if draft.slots[picking] === c.id}<span class="worn"><Check size={11} strokeWidth={3} /> {L('equipado', 'equipped')}</span>{/if}
              </button>
            {/each}
          </div>
          {#if shown}
            <aside class="view">
              {#key shown.id}<span class="big" in:fade={{ duration: 120 }}><CardImage card={shown} eager /></span>{/key}
              <b>{cardName(shown)}</b>
              <p>{gearText(shown.gear, app.lang)}</p>
              {#if shown.text[app.lang]?.flavor}<p class="flv">{shown.text[app.lang].flavor}</p>{/if}
              {#if blocked(picking!, shown)}<p class="whybig">{blocked(picking!, shown)}</p>
              {:else}<button class="px-btn gold" onclick={() => equip(picking!, shown)}>{draft.slots[picking] === shown.id ? L('Já equipado', 'Already equipped') : L('Equipar', 'Equip')}</button>{/if}
            </aside>
          {/if}
        </div>
      {:else}
        <div class="gone"><p>{L('Ainda não há carta de equipamento para este espaço. Crie uma no deck de Equipamentos (Construtor de decks → Nova carta) e, na aba Jogo da carta, escolha o espaço e os bônus.', 'There is no equipment card for this slot yet. Create one in the Equipment deck (Deck builder → New card) and, in the card’s Game tab, choose the slot and the bonuses.')}</p></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .hc { height: 100%; display: flex; flex-direction: column; background: radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--c) 14%, #100d1c), var(--bg) 62%); --panel-bg: #12101c; }
  .unsaved { display: inline-flex; align-items: center; gap: 7px; font: 400 10px var(--pixel); letter-spacing: .08em; text-transform: uppercase; color: #ffcf7a; }
  .unsaved i { width: 7px; height: 7px; background: #ffb84a; animation: blink 1.1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: .25; } }
  .gone { margin: auto; display: grid; justify-items: center; gap: 12px; text-align: center; color: var(--muted); max-width: 520px; padding: 40px 20px; }

  .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 372px minmax(0, 1fr); gap: 16px; padding: 16px 18px 18px; }
  .side { display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow-y: auto; padding-right: 4px; }
  .nodoll { display: grid; justify-items: center; gap: 12px; padding: 20px; border: 2px solid #2c2647; background: #0d0b16; }
  .idline { display: flex; gap: 12px; align-items: center; padding: 10px; border: 2px solid #2c2647; background: #100e1a; }
  .idline :global(.hp) { border-radius: 0; outline: 2px solid color-mix(in srgb, var(--c) 70%, #fff 0%); }
  .idtx { display: flex; flex-direction: column; min-width: 0; }
  .idtx b { font: 400 15px var(--pixel); letter-spacing: .04em; color: var(--accent-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .idtx span { font-size: 12px; color: var(--text-2); }
  .nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .nums span { display: grid; justify-items: center; gap: 1px; padding: 8px 2px 6px; border: 2px solid #2c2647; background: #100e1a; color: var(--text-2); }
  .nums b { font: 700 20px/1 var(--ui); color: var(--text); font-variant-numeric: tabular-nums; }
  .nums small { font-size: 10.5px; color: var(--muted); }
  .res { display: flex; gap: 14px; justify-content: center; font: 600 12px var(--ui); }
  .res span { display: inline-flex; align-items: center; gap: 4px; }
  .res i { width: 10px; height: 10px; background: #26213a; }
  .res .vig { color: #f08a6c; } .res .vig i.on { background: #f08a6c; box-shadow: 0 0 6px #f08a6c; }
  .res .man { color: #7fb0ff; } .res .man i.on { background: #7fb0ff; box-shadow: 0 0 6px #7fb0ff; }
  .mods { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
  .mods span { display: grid; justify-items: center; padding: 4px 0; background: #100e1a; border: 1px solid #2c2647; font: 600 10px var(--ui); color: var(--muted); letter-spacing: .04em; }
  .mods b { font-size: 14px; color: var(--text-2); }
  .mods .hi { border-color: rgb(227 181 102 / .5); } .mods .hi b { color: var(--accent-2); }
  .warn { margin: 0; padding: 8px 10px; list-style: none; display: grid; gap: 4px; border: 2px solid rgb(255 184 74 / .35); background: rgb(255 184 74 / .07); color: #ffd79a; font-size: 12px; }
  .warn li { display: flex; gap: 6px; align-items: center; }
  .ready { margin: 0; display: flex; gap: 6px; align-items: center; justify-content: center; padding: 8px; border: 2px solid rgb(108 194 138 / .4); background: rgb(108 194 138 / .08); color: #9be0b4; font-size: 12.5px; }

  .main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .steps { display: flex; gap: 4px; flex: none; }
  .steps button { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px 8px; border: 2px solid #2c2647; border-bottom: 0; background: #0d0b16; color: var(--muted); font: 400 11px var(--pixel); letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: color var(--t), background var(--t); }
  .steps em { font-style: normal; display: grid; place-items: center; width: 17px; height: 17px; background: #231e38; color: var(--text-2); font-size: 10px; }
  .steps button:hover { color: var(--text); }
  .steps button.on { background: var(--panel-bg); color: var(--accent-2); border-color: #4a417a; margin-bottom: -2px; padding-bottom: 10px; z-index: 1; }
  .steps button.on em { background: var(--accent); color: #1a1308; }
  .dot { position: absolute; top: 5px; right: 5px; width: 7px; height: 7px; background: #ffb84a; } .dot.bad { background: var(--danger); }
  .panel { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 20px; border: 2px solid #4a417a; background: var(--panel-bg); display: flex; flex-direction: column; gap: 16px; box-shadow: 0 2px 0 #05040a, 0 14px 40px rgb(0 0 0 / .45); }
  .panel.flush { overflow: hidden; }

  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 22px; align-items: start; }
  .cols.even { grid-template-columns: 1fr 1fr; }
  .stackv { display: flex; flex-direction: column; gap: 14px; min-width: 0; } .stackv.sm { gap: 8px; }
  .rowx { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .fld { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .fld > span { display: inline-flex; gap: 5px; align-items: center; font: 400 10px var(--pixel); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .name { height: 46px; padding: 0 14px; border: 2px solid #3a3260; background: #0b0913; color: var(--accent-2); font: 400 20px var(--pixel); letter-spacing: .04em; }
  .name:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .hint { margin: 0; font-size: 12.5px; color: var(--text-2); line-height: 1.5; } .hint.sm { font-size: 12px; color: var(--muted); }

  .classes { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .cls { position: relative; display: grid; grid-template-columns: 40px 1fr; grid-template-rows: auto auto; column-gap: 9px; align-items: center; text-align: left; padding: 8px 9px; cursor: pointer; color: var(--text-2); font: inherit;
    border: 2px solid #2c2647; background: #100e1a; opacity: .78; transition: all var(--t); }
  .cls:hover { opacity: 1; border-color: #6a5fa8; }
  .cls.on { opacity: 1; border-color: var(--k); background: color-mix(in srgb, var(--k) 16%, #100e1a); box-shadow: 0 0 16px color-mix(in srgb, var(--k) 35%, transparent); }
  .cic { grid-row: 1 / 3; width: 40px; height: 40px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--k) 60%, #000), color-mix(in srgb, var(--k) 22%, #000)); }
  .cls b { font-size: 12.5px; line-height: 1.2; color: var(--text); }
  .cls small { font-size: 10.5px; color: var(--muted); }
  .cls.nodeck small { color: #c9a25f; }
  .cls em { position: absolute; top: -2px; right: -2px; font: 400 9px var(--pixel); font-style: normal; padding: 2px 5px; background: var(--k); color: #fff; }

  .portrait { display: flex; gap: 14px; align-items: center; padding: 10px; border: 2px solid #2c2647; background: #100e1a; }
  .portrait :global(.hp) { border-radius: 0; }
  .portrait p { margin: 0; font-size: 12.5px; color: var(--text-2); }

  .races { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; }
  .race { position: relative; display: flex; flex-direction: column; gap: 5px; text-align: left; padding: 10px 11px; cursor: pointer; color: var(--text-2); font: inherit; border: 2px solid #2c2647; background: #100e1a; transition: all var(--t); }
  .race:hover { border-color: #6a5fa8; }
  .race.on { border-color: var(--accent); background: #1d1930; box-shadow: 0 0 18px rgb(227 181 102 / .18); }
  .race b { font: 400 13px var(--pixel); letter-spacing: .04em; color: var(--text); }
  .race.on b { color: var(--accent-2); }
  .rmods { display: flex; flex-wrap: wrap; gap: 4px; }
  .rmods i { font-style: normal; font: 700 10.5px var(--ui); padding: 1px 6px; background: rgb(108 194 138 / .16); color: #9be0b4; display: inline-flex; gap: 3px; align-items: center; }
  .rmods i.neg { background: rgb(226 87 76 / .16); color: #ffa99f; }
  .rmods i.hp { background: rgb(226 87 76 / .12); color: #ffb9b0; }
  .race small { font-size: 11.5px; line-height: 1.4; color: var(--muted); }
  .rcheck { position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; display: grid; place-items: center; background: var(--accent); color: #1a1308; }

  .pts { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 18px; align-items: center; padding: 14px 16px; border: 2px solid #3a3260; background: #0d0b16; }
  .pts h3 { font: 400 14px var(--pixel); letter-spacing: .06em; color: var(--accent-2); margin-bottom: 4px; }
  .pts p { margin: 0; font-size: 12.5px; color: var(--text-2); max-width: 720px; }
  .ptsn { display: grid; justify-items: center; gap: 2px; min-width: 170px; }
  .ptsn b { font: 400 34px/1 var(--pixel); color: #ffcf7a; }
  .pts.done .ptsn b { color: #9be0b4; } .pts.over .ptsn b { color: var(--danger); }
  .ptsn small { font-size: 11px; color: var(--muted); }
  .pips { display: flex; gap: 2px; margin-top: 4px; }
  .pips i { width: 6px; height: 10px; background: #26213a; } .pips i.on { background: var(--accent); }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .stat { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 8px 12px; align-items: center; padding: 14px; border: 2px solid #2c2647; background: linear-gradient(180deg, #17142a, #100e1a); }
  .stat.hi { border-color: rgb(227 181 102 / .55); }
  .sthead { display: flex; flex-direction: column; }
  .sthead b { font: 400 14px var(--pixel); letter-spacing: .04em; color: var(--text); }
  .sthead em { font: 400 10px var(--pixel); font-style: normal; letter-spacing: .16em; color: var(--accent); }
  .stmod { grid-row: 1 / 3; grid-column: 2; display: grid; justify-items: center; align-content: center; width: 76px; height: 76px; background: #0b0913; border: 2px solid #3a3260; }
  .stmod strong { font: 400 34px/1 var(--pixel); color: var(--text); }
  .stat.hi .stmod { border-color: var(--accent); } .stat.hi .stmod strong { color: var(--accent-2); }
  .stmod small { font-size: 9.5px; color: var(--muted); }
  .stval { display: flex; align-items: center; gap: 4px; }
  .stval button { width: 30px; height: 30px; display: grid; place-items: center; border: 2px solid #3a3260; background: #1b1730; color: var(--text); cursor: pointer; transition: all var(--t); }
  .stval button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent-2); }
  .stval button:disabled { opacity: .3; cursor: default; }
  .stval span { display: grid; justify-items: center; min-width: 46px; line-height: 1.1; }
  .stval b { font: 700 19px var(--ui); font-variant-numeric: tabular-nums; }
  .stval small { font-size: 10.5px; color: var(--muted); }
  .stbar { grid-column: 1 / -1; display: flex; gap: 2px; }
  .stbar i { flex: 1; height: 6px; background: #221d36; } .stbar i.on { background: var(--accent); } .stbar i.base.on { background: #7b6fb8; }
  .stat p { grid-column: 1 / -1; margin: 0; font-size: 11.5px; color: var(--muted); }
  .rtag { position: absolute; top: -2px; left: -2px; font: 700 10px var(--ui); padding: 1px 6px; background: #1f4a31; color: #9be0b4; } .rtag.neg { background: #55221e; color: #ffa99f; }
  .lock { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 2px solid rgb(255 184 74 / .35); background: rgb(255 184 74 / .07); color: #ffd79a; }
  .lock b { font-size: 12.5px; } .lock p { margin: 3px 0 0; font-size: 12px; color: var(--text-2); }

  .gearwrap { display: grid; grid-template-columns: minmax(420px, 560px) minmax(0, 1fr); gap: 26px; align-items: start; }
  .rig { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 16px 14px; border: 2px solid #2c2647; background: radial-gradient(ellipse at 50% 55%, color-mix(in srgb, var(--c) 22%, #14111f), #0b0913 72%); }
  .scol { display: flex; flex-direction: column; gap: 8px; }
  .slot { display: grid; justify-items: center; gap: 3px; padding: 0; border: 0; background: none; cursor: pointer; color: var(--muted); font: inherit; transition: transform var(--t), color var(--t); }
  .scard { width: 62px; aspect-ratio: 750 / 1050; display: grid; place-items: center; overflow: hidden; border: 2px dashed #4a417a; background: rgb(13 11 22 / .85); transition: border-color var(--t), box-shadow var(--t); }
  .slot.filled .scard { border: 2px solid #000; box-shadow: 0 0 0 1px #6a5fa8, 0 6px 14px rgb(0 0 0 / .6); }
  .slot small { font: 400 8.5px var(--pixel); letter-spacing: .06em; text-transform: uppercase; }
  .slot:hover { transform: scale(1.07); color: var(--accent-2); }
  .slot:hover .scard { border-color: var(--accent); box-shadow: 0 0 14px rgb(227 181 102 / .35); }
  .altar { position: relative; display: grid; place-items: center; min-height: 380px; }
  .halo { position: absolute; width: 78%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--c) 40%, transparent), transparent 66%); animation: breath 4s ease-in-out infinite; }
  @keyframes breath { 50% { opacity: .55; transform: scale(.94); } }
  .fig { position: relative; margin-top: -30px; }
  .plinth { position: absolute; bottom: 12%; width: 62%; height: 26px; border-radius: 50%; background: radial-gradient(ellipse, rgb(0 0 0 / .7), transparent 70%); box-shadow: 0 0 0 2px rgb(255 240 200 / .12), 0 0 30px color-mix(in srgb, var(--c) 45%, transparent); }
  .gearlist { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .grow1 { display: grid; grid-template-columns: 112px minmax(110px, 1fr) minmax(130px, 1.2fr) auto auto; gap: 8px; align-items: center; padding: 7px 9px; border: 2px solid #2c2647; background: #100e1a; }
  .grow1.empty { grid-template-columns: 112px 1fr auto; border-style: dashed; background: none; }
  .grow1 small { color: var(--accent); font: 400 9.5px var(--pixel); letter-spacing: .08em; text-transform: uppercase; }
  .grow1 b { font-size: 13px; } .grow1 span { font-size: 12px; color: var(--text-2); }

  .decks { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .deck { position: relative; display: grid; grid-template-columns: 46px 1fr; grid-template-rows: auto auto; column-gap: 11px; align-items: center; text-align: left; padding: 11px 12px; cursor: pointer; color: var(--text-2); font: inherit; border: 2px solid #2c2647; background: #100e1a; transition: all var(--t); }
  .deck:hover { border-color: #6a5fa8; }
  .deck.on { border-color: var(--k); background: color-mix(in srgb, var(--k) 14%, #100e1a); box-shadow: 0 0 18px color-mix(in srgb, var(--k) 32%, transparent); }
  .dic { grid-row: 1 / 3; width: 46px; height: 46px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--k) 60%, #000), color-mix(in srgb, var(--k) 22%, #000)); }
  .deck b { font-size: 13.5px; color: var(--text); } .deck small { font-size: 11.5px; color: var(--muted); }
  .split { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .split button { display: grid; justify-items: center; gap: 5px; padding: 10px 4px 8px; border: 2px solid #2c2647; background: #100e1a; color: var(--text-2); cursor: pointer; font: inherit; transition: all var(--t); }
  .split button:hover { border-color: #6a5fa8; }
  .split button.on { border-color: var(--accent); background: #1d1930; color: var(--accent-2); }
  .split span { display: flex; gap: 3px; min-height: 12px; }
  .split i { width: 12px; height: 12px; }
  .split .vig i { background: #f08a6c; } .split .man i { background: #7fb0ff; }
  .split small { font-size: 11px; }

  .backdrop { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 24px; background: rgb(4 3 8 / .78); backdrop-filter: blur(5px); animation: fadein .14s; }
  @keyframes fadein { from { opacity: 0; } }
  .picker { width: min(1180px, 100%); max-height: min(820px, calc(100vh - 48px)); display: flex; flex-direction: column; background: linear-gradient(180deg, #1a1630, #0e0c18);
    border: 3px solid #fff0c8; box-shadow: 0 0 0 3px #05040a, 0 0 0 6px #4a417a, 0 0 60px rgb(190 120 255 / .22), 0 30px 80px rgb(0 0 0 / .8); animation: popin .18s cubic-bezier(.2, .9, .3, 1.15); }
  @keyframes popin { from { transform: scale(.94); opacity: 0; } }
  .picker header { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 2px solid #2c2647; flex: none; }
  .picker header div { flex: 1; }
  .picker header small { font: 400 9px var(--pixel); letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
  .picker h2 { font: 400 20px var(--pixel); letter-spacing: .06em; text-transform: uppercase; color: var(--accent-2); }
  .count { font-size: 12px; color: var(--muted); }
  .pbody { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 360px; }
  .opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px 10px; align-content: start; padding: 16px 18px; overflow-y: auto; min-height: 0; }
  .opt { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px 6px 8px; border: 2px solid transparent; background: none; cursor: pointer; color: var(--text-2); font: inherit; transition: border-color var(--t), background var(--t), transform var(--t); }
  .opt:hover, .opt.peek { border-color: #6a5fa8; background: rgb(255 255 255 / .03); transform: translateY(-2px); }
  .opt.on { border-color: var(--accent); background: rgb(227 181 102 / .08); }
  .ocard { display: block; width: 100%; aspect-ratio: 750 / 1050; filter: drop-shadow(0 8px 14px rgb(0 0 0 / .6)); }
  .ocard.empty { display: grid; place-items: center; border: 2px dashed #4a417a; color: var(--muted); filter: none; }
  .opt b { font-size: 12px; color: var(--text); text-align: center; line-height: 1.25; }
  .opt.locked .ocard { filter: grayscale(.85) brightness(.55); }
  .why { font: 600 10.5px var(--ui); color: #ff9c7a; text-align: center; }
  .flv { font-style: italic; color: var(--muted); }
  .whybig { color: #ff9c7a; font-weight: 600; }
  .worn { position: absolute; top: 0; left: 0; display: inline-flex; gap: 3px; align-items: center; padding: 2px 6px; background: var(--accent); color: #1a1308; font: 700 10px var(--ui); z-index: 2; }
  .view { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px; border-left: 2px solid #2c2647; background: #0b0913; overflow-y: auto; min-height: 0; }
  .big { display: block; width: 100%; aspect-ratio: 750 / 1050; filter: drop-shadow(0 16px 30px rgb(0 0 0 / .75)); }
  .view b { font: 400 14px var(--pixel); letter-spacing: .04em; color: var(--accent-2); text-align: center; }
  .view p { margin: 0; font-size: 13px; color: var(--text-2); text-align: center; }

  .builds { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 2px solid #3a3260; background: #0d0b16; }
  .builds header { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; color: var(--accent-2); }
  .builds h3 { font: 400 13px var(--pixel); letter-spacing: .06em; }
  .builds header small { font-size: 12.5px; color: var(--text-2); }
  .blist { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
  .build { position: relative; display: flex; flex-direction: column; gap: 6px; text-align: left; padding: 11px 12px; cursor: pointer; color: var(--text-2); font: inherit; border: 2px solid #2c2647; background: linear-gradient(180deg, #17142a, #100e1a); transition: all var(--t); }
  .build:hover { border-color: #6a5fa8; transform: translateY(-2px); }
  .build.mine { border-color: rgb(227 181 102 / .45); }
  .build.on { border-color: var(--accent); background: #1d1930; box-shadow: 0 0 18px rgb(227 181 102 / .18); }
  .bhead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .bhead b { font: 400 13px var(--pixel); letter-spacing: .04em; color: var(--text); }
  .build.on .bhead b { color: var(--accent-2); }
  .bhead em { font-style: normal; display: inline-flex; gap: 3px; align-items: center; font: 700 10px var(--ui); padding: 1px 6px; background: var(--accent); color: #1a1308; }
  .binfo { font-size: 12px; line-height: 1.4; }
  .bstats { display: flex; flex-wrap: wrap; gap: 3px; }
  .bstats i { font-style: normal; font: 700 10.5px var(--ui); padding: 1px 6px; background: #231e38; color: var(--text-2); }
  .bstats i.hi { background: rgb(227 181 102 / .2); color: var(--accent-2); } .bstats i.zero { opacity: .45; }
  .bdeck { font-size: 11.5px; color: #9be0b4; } .bdeck.bad { color: #ffd79a; }
  .stat p.ask.need { color: #ffd79a; } .stat p.ask.ok { color: #9be0b4; }

  @media (max-width: 1180px) {
    .body { grid-template-columns: 1fr; overflow-y: auto; }
    .side { overflow: visible; } .panel { overflow: visible; flex: none; } .panel.flush { overflow: visible; }
    .cols, .cols.even, .gearwrap { grid-template-columns: 1fr; } .stats { grid-template-columns: repeat(2, 1fr); }
  }
</style>
