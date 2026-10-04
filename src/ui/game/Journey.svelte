<!--
  Jornada: o modo solo com progressão. Cada jornada tem um mapa gerado na hora (nunca igual):
  caminhos que se dividem e se cruzam por regiões diferentes, com batalhas (o oponente e o cenário
  são os da região), campos de treino (escolher 1 de 3 cartas) e um chefe no fim. O nível sobe
  ENTRE as batalhas e libera cartas e evoluções. As regras ficam em src/game/journey.ts; o desenho
  do mapa, em mapArt.ts.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Swords, Heart, Sparkles, Crown, Lock, TrendingUp, RotateCcw, Trophy, Skull, Layers, Pencil, Check, Tent, MapPin, GraduationCap } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { ui } from '../../app/ui.svelte';
  import { chip } from '../../audio/chip';
  import ScreenBar from '../common/ScreenBar.svelte';
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import CardImage from '../common/CardImage.svelte';
  import Glyph from '../common/Glyph.svelte';
  import Game from './Game.svelte';
  import { deckName, deckReady, heroColor, heroDef, journeyCards, playable, type FixedMatch } from './heroes';
  import { cardDef } from '../../game/fromApp';
  import { DIFFICULTIES } from '../../game/bot';
  import { PROTO_MONSTERS } from '../../game/decks';
  import { monsterDeckId } from '../../model/seed';
  import { MAX_COPIES } from '../../model/builds';
  import { addXp, applyResult, available, choose, clearNode, depthOf, foeDifficulty, foeLevel, foeStart, generateMap, journeyDeck, minionOf, newJourney, playerStart, rewardChoices, rng, unlocksAt, xpReward, xpToNext, JOURNEY_MAX_LEVEL, type JourneyState, type MapNode } from '../../game/journey';
  import { settings } from '../../app/settings.svelte';
  import type { Avatar } from '../../avatar/lpc';
  import type { HeroDef } from '../../game/types';
  import type { CardDef } from '../../game/types';
  import type { Card, Character, ColorId } from '../../model/types';
  import { biomeOf, paintMap, trail } from './mapArt';

  const KEY = 'voidsun.jornada.heroi';
  /** A região de cada classe (o cenário onde os heróis dela são enfrentados). */
  const BIOME_OF: Partial<Record<ColorId, string>> = { red: 'deserto', blue: 'masmorra', green: 'floresta', black: 'cripta', purple: 'pantano', white: 'campo', silver: 'neve' };
  const chars = $derived(playable().filter((c) => deckReady(c)));
  let heroId = $state((() => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } })());
  const hero = $derived<Character | undefined>(chars.find((c) => c.id === heroId) ?? chars[0]);
  $effect(() => { if (hero) try { localStorage.setItem(KEY, hero.id); } catch { /* sem armazenamento local */ } });

  const journeyOf = (c: Character | undefined): JourneyState => (c && app.project?.journeys?.[c.id]) || newJourney();
  const j = $derived(journeyOf(hero));
  const def = $derived(hero ? heroDef(hero) : null);
  /** Guarda a jornada do herói (criando-a na primeira vez). */
  function save(fn: (s: JourneyState) => void) {
    if (!hero) return;
    const id = hero.id;
    app.updateProject((p) => { const all = (p.journeys ??= {}); const s = (all[id] ??= newJourney()); fn(s); });
  }

  // ───── o chefe do mapa (uma ficha de mentira, só para a batalha) ─────
  const monster = PROTO_MONSTERS[0];
  const bossChar: Character = {
    id: `boss-${monster.id}`, name: monster.hero.name, raceId: '', classColors: ['red'], level: 1, hp: monster.hero.maxHp,
    stats: {} as Character['stats'], slots: {}, notes: '', preset: monster.id, sprite: `chefes/${monster.id}.webp`,
    play: { ...monster.hero, baseHp: monster.hero.maxHp, deckId: monsterDeckId(monster.id) },
  };
  const bossCards = $derived(app.cardsOf(monsterDeckId(monster.id)).filter((c) => c.game));

  // ───── o mapa: o MESMO para qualquer herói; só muda quando um chefe é vencido (aí é sorteado de novo) ─────
  /** O herói de cada bioma (o mini-chefe da região): de preferência o herói pronto daquela classe. */
  const foes = $derived.by(() => {
    const out: { id: string; biome: string }[] = [];
    for (const [color, biome] of Object.entries(BIOME_OF)) {
      const c = chars.find((x) => x.classColors[0] === color && x.preset) ?? chars.find((x) => x.classColors[0] === color);
      if (c) out.push({ id: c.id, biome });
    }
    return out;
  });
  const newSeed = () => Math.floor(Math.random() * 2 ** 31);
  $effect(() => {
    if (!hero || foes.length < 2 || !app.project) return;
    const seed = app.project.journeySeed;
    if (seed === undefined) { app.updateProject((p) => { p.journeySeed = newSeed(); }); return; }
    if (j.map?.seed === seed) return;
    const list = $state.snapshot(foes) as { id: string; biome: string }[];
    save((s) => { s.map = generateMap(seed, list, { id: monster.id, biome: 'vulcao' }); });
  });
  const dev = $derived(settings.v.dev);

  // ───── inimigos comuns de cada região: usam o deck do herói dela, mas são mais fracos ─────
  const MINIONS: Record<string, { name: [string, string]; avatar: Avatar }> = {
    floresta: { name: ['Goblin da mata', 'Forest goblin'], avatar: { body: 'male', skin: 'bright_green', eyes: 'yellow', head: 'goblin', parts: { weapon: { id: 'weapon_sword_arming', color: 'iron' }, legs: { id: 'legs_pants', color: 'black' } } } },
    deserto: { name: ['Orc saqueador', 'Orc raider'], avatar: { body: 'muscular', skin: 'green', eyes: 'red', head: 'orc', parts: { weapon: { id: 'weapon_sword_arming', color: 'iron' }, legs: { id: 'legs_pants', color: 'black' } } } },
    masmorra: { name: ['Constructo', 'Flesh golem'], avatar: { body: 'muscular', skin: 'zombie_green', eyes: 'yellow', head: 'frankenstein', parts: { legs: { id: 'legs_pants', color: 'black' } } } },
    cripta: { name: ['Esqueleto', 'Skeleton'], avatar: { body: 'male', skin: 'bone', eyes: 'red', frame: 'skeleton', head: 'skeleton', parts: { shield: { id: 'shield_round', color: 'silver' }, weapon: { id: 'weapon_sword_arming', color: 'iron' } } } },
    pantano: { name: ['Homem-lagarto', 'Lizardfolk'], avatar: { body: 'male', skin: 'green', eyes: 'yellow', head: 'lizard', parts: { tail: { id: 'tail_lizard' }, legs: { id: 'legs_pants', color: 'black' } } } },
    campo: { name: ['Homem-javali', 'Boarman'], avatar: { body: 'muscular', skin: 'fur_brown', eyes: 'red', head: 'boarman', parts: { weapon: { id: 'weapon_sword_arming', color: 'iron' }, legs: { id: 'legs_pants', color: 'black' } } } },
    neve: { name: ['Lobisomem', 'Werewolf'], avatar: { body: 'muscular', skin: 'fur_grey', eyes: 'yellow', head: 'wolf', parts: { legs: { id: 'legs_pants', color: 'black' } } } },
    vulcao: { name: ['Diabrete', 'Imp'], avatar: { body: 'male', skin: 'demon', eyes: 'yellow', parts: { horns: { id: 'head_horns_backwards' }, wings: { id: 'wings_lizard_bat' }, tail: { id: 'tail_lizard' }, legs: { id: 'legs_pants', color: 'black' } } } },
  };
  /** O inimigo comum de um bioma: a ficha de mentira e o herói (mais fraco) dele. */
  function minion(biome: string): { char: Character; hero: HeroDef } | null {
    const m = MINIONS[biome] ?? MINIONS.campo;
    const lord = chars.find((c) => c.id === foes.find((f) => f.biome === biome)?.id);
    const base = lord ? heroDef(lord) : monster.hero;
    const hd = minionOf(base, `minion-${biome}`, L(m.name[0], m.name[1]));
    hd.className = [L('Inimigo comum', 'Common enemy'), 'Common enemy'];
    const play = lord?.play ? { ...lord.play, id: hd.id, name: hd.name } : { ...monster.hero, baseHp: hd.maxHp, deckId: monsterDeckId(monster.id) };
    return { char: { id: hd.id, name: hd.name, raceId: '', classColors: lord?.classColors ?? ['red'], level: 1, hp: hd.maxHp, stats: {} as Character['stats'], slots: {}, notes: '', avatar: m.avatar, play }, hero: hd };
  }
  const map = $derived(j.map);
  const tier = $derived(j.tier ?? 0);
  const open = $derived(map ? available(map).map((n) => n.id) : []);
  let cv = $state<HTMLCanvasElement>();
  $effect(() => { if (cv && map) paintMap(cv, $state.snapshot(map) as never); });
  /** Regiões presentes neste mapa (para a legenda). */
  const regions = $derived(map ? [...new Set(map.nodes.map((n) => n.biome))] : []);

  let pick = $state<number | null>(null);
  const node = $derived<MapNode | undefined>(map && pick !== null ? map.nodes[pick] : undefined);
  $effect(() => { void hero?.id; void map?.seed; pick = null; });
  const charOf = (n: MapNode): Character | undefined => (n.kind === 'boss' ? bossChar : n.kind === 'elite' ? chars.find((c) => c.id === n.foe) : n.kind === 'battle' ? minion(n.biome)?.char : undefined);
  const defOf = (n: MapNode) => (n.kind === 'boss' ? monster.hero : n.kind === 'battle' ? minion(n.biome)?.hero ?? null : (() => { const c = charOf(n); return c ? heroDef(c) : null; })());
  const depth = (n: MapNode) => depthOf(tier, n.layer);

  // ───── deck e liberações ─────
  const defs = $derived<CardDef[]>(hero ? journeyCards(hero).map(cardDef).filter((x): x is CardDef => !!x) : []);
  const nameOf = (c: CardDef) => app.cards[c.id]?.text[app.lang].name ?? c.name[0];
  const lockedCount = $derived(defs.filter((c) => c.game.level > j.level).length);
  const deckNow = $derived(journeyDeck(defs, j.level, (c) => app.ownedOf(app.cards[c.id])));
  const upcoming = $derived.by(() => {
    const out: { level: number; cards: string[]; ranks: string[] }[] = [];
    for (let lv = j.level + 1; lv <= JOURNEY_MAX_LEVEL && out.length < 2; lv++) {
      const u = unlocksAt(defs, lv);
      if (u.cards.length || u.ranks.length) out.push({ level: lv, cards: u.cards.map(nameOf), ranks: u.ranks.map(nameOf) });
    }
    return out;
  });

  // ───── batalha ─────
  let battle = $state<FixedMatch | null>(null);
  let result = $state<{ won: boolean; xp: number; levels: number; text: string } | null>(null);
  /** Recompensa em cartas esperando a escolha: 1 de até 3. */
  let reward = $state<{ title: string; sub: string; cards: Card[]; node?: number } | null>(null);

  function fight(n: MapNode) {
    const foe = charOf(n), fd = defOf(n);
    if (!hero || !foe || !fd || j.pending) return;
    const boss = n.kind === 'boss', d = depth(n), seed = map?.seed ?? 1;
    battle = {
      myId: hero.id, botId: foe.id, start: [playerStart(j), foeStart(fd, d, boss)], difficulty: foeDifficulty(d), scene: n.biome,
      label: boss ? L('Chefe', 'Boss') : L(biomeOf(n.biome).name[0], biomeOf(n.biome).name[1]),
      guest: boss ? { char: bossChar, hero: monster.hero } : n.kind === 'battle' ? { char: foe, hero: fd } : undefined,
      onEnd: (won, forfeit) => {
        let r = { xp: 0, levels: 0 };
        save((s) => { r = applyResult(s, n, won, forfeit); });
        // chefe vencido: o mapa de todos é sorteado de novo
        if (won && boss) app.updateProject((p) => { p.journeySeed = newSeed(); });
        // morte permanente (teste): perder zera o progresso do herói
        if (!won && settings.v.permadeath) {
          save((s) => { for (const k of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[k]; Object.assign(s, newJourney()); });
          ui.toast(L(`Morte permanente: ${hero.name} perdeu todo o progresso e recomeça do nível 1.`, `Permadeath: ${hero.name} lost all progress and starts again at level 1.`), 'error', 6000);
        }
        result = { won, ...r, text: won ? (boss ? L(`${foe.name} foi derrotado!`, `${foe.name} was defeated!`) : L(`Vitória sobre ${foe.name}`, `Victory over ${foe.name}`)) : L(`Derrota para ${foe.name}`, `Defeated by ${foe.name}`) };
        battle = null; pick = null;
        chip.sfx(r.levels ? 'levelup' : won ? 'victory' : 'defeat');
        // o chefe deixa uma das suas cartas: 1 de 3 (das que o jogador ainda não tem 4 cópias)
        if (won && boss) offer(bossCards, L(`Espólio de ${foe.name}`, `Spoils of ${foe.name}`), L('Escolha uma carta do chefe para o seu inventário. Ela pode entrar em qualquer deck montado.', 'Choose one of the boss cards for your inventory. It can go into any built deck.'), seed + 999);
      },
      onLeave: () => { battle = null; },
    };
  }

  /** Cartas de recompensa das classes do herói (as que não vêm no deck inicial). */
  const classRewards = $derived(hero ? app.decks.filter((d) => d.kind === 'class' && hero.classColors.includes(d.colors[0])).flatMap((d) => app.cardsOf(d.id).filter((c) => c.game)) : []);
  function offer(pool: Card[], title: string, sub: string, seed: number, nodeId?: number) {
    const picks = rewardChoices(pool.map((c) => ({ id: c.id, level: c.game!.level })), j.level, (id) => app.ownedOf(app.cards[id]), rng(seed));
    if (!picks.length) {
      // o jogador já tem tudo: o treino vira XP
      let levels = 0;
      save((s) => { levels = addXp(s, 30 + 5 * j.level); if (nodeId !== undefined) clearNode(s, nodeId); });
      ui.toast(L(`Você já tem todas essas cartas: o treino rendeu ${30 + 5 * j.level} XP.`, `You already own all those cards: the training gave ${30 + 5 * j.level} XP.`), 'ok', 4200);
      if (levels) chip.sfx('levelup');
      pick = null;
      return;
    }
    reward = { title, sub, cards: picks.map((x) => app.cards[x.id]).filter(Boolean), node: nodeId };
  }
  function train(n: MapNode) {
    if (!map || j.pending) return;
    offer(classRewards, L('Campo de treino', 'Training camp'), L('Escolha uma habilidade nova para o seu inventário. Ela entra no seu deck da Jornada e pode ser usada nos decks montados.', 'Choose a new skill for your inventory. It joins your Journey deck and can be used in built decks.'), map.seed + n.id * 31, n.id);
  }
  function take(c: Card) {
    if (!reward) return;
    app.grant(c.id);
    const nodeId = reward.node;
    if (nodeId !== undefined) save((s) => clearNode(s, nodeId));
    ui.toast(L(`“${c.text[app.lang].name}” entrou no inventário (${app.ownedOf(c)}/${MAX_COPIES})`, `“${c.text[app.lang].name}” joined the inventory (${app.ownedOf(c)}/${MAX_COPIES})`), 'ok', 4200);
    chip.sfx('levelup');
    reward = null; pick = null;
  }

  async function reset() {
    if (!hero) return;
    const r = await ui.confirm({ title: L(`Recomeçar a Jornada de ${hero.name}?`, `Restart ${hero.name}'s Journey?`), text: L('O herói volta ao nível 1, num mapa novo. As cartas que você já ganhou continuam suas. Não dá para desfazer.', 'The hero goes back to level 1, on a new map. The cards you already won stay yours. This cannot be undone.'), ok: L('Recomeçar', 'Restart'), danger: true });
    if (r === 'ok') { save((s) => { for (const k of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[k]; Object.assign(s, newJourney()); }); result = null; }
  }
  onMount(() => chip.music('menu'));
  const stateOf = (n: MapNode) => (map?.cleared.includes(n.id) ? 'done' : open.includes(n.id) ? 'open' : 'far');
  const edgeState = (a: MapNode, b: MapNode) => (map?.cleared.includes(a.id) && map.cleared.includes(b.id) ? 'done' : (map?.at === a.id || (map?.at === null && false)) && open.includes(b.id) ? 'open' : 'far');
</script>

{#if battle}
  {#key battle}<Game fixed={battle} />{/key}
{:else}
<div class="journey" style="--c:{heroColor(hero)}">
  <div class="bg"></div>
  <ScreenBar title={L('Jornada', 'Journey')} kicker={L('Solo com progressão', 'Solo with progression')} back={L('Modos', 'Modes')} onback={() => router.go('/batalha')} />
  {#if !hero || !def}
    <div class="none"><Swords size={44} /><h2 class="display">{L('Nenhum herói pronto para a Jornada', 'No hero ready for the Journey')}</h2>
      <p class="muted">{L('Crie um herói com um deck de 40 cartas para começar.', 'Create a hero with a 40-card deck to begin.')}</p>
      <button class="btn primary" onclick={() => router.go('/heroi')}>{L('Criar um herói', 'Create a hero')}</button></div>
  {:else}
    <div class="wrap">
      <aside class="side">
        <div class="roster">
          {#each chars as c (c.id)}
            <button class="rh" class:on={c.id === hero.id} style="--k:{heroColor(c)}" onclick={() => { heroId = c.id; result = null; }} title="{c.name} · {L('nível', 'level')} {journeyOf(c).level}">
              <HeroPortrait hero={c} size={38} round /><i>{journeyOf(c).level}</i>
            </button>
          {/each}
        </div>

        <div class="card herocard">
          <div class="pic"><HeroPortrait hero={hero} size={84} /></div>
          <div class="info">
            <h2 class="display">{hero.name}</h2>
            <span class="cls">{L(def.className[0], def.className[1])}</span>
            <div class="stats">
              <span class="hp"><Heart size={13} /> {def.maxHp + j.vida}</span>
              <span class="vig"><Glyph id="gauntlet" size={13} color="currentColor" /> {def.vigor + j.vigor}</span>
              <span class="man"><Glyph id="crystal-cluster" size={13} color="currentColor" /> {def.mana + j.mana}</span>
            </div>
          </div>
          <div class="lvl"><span class="lvn">{j.level}</span>
            <div class="xp">
              <span>{L('Nível', 'Level')} {j.level}{j.level >= JOURNEY_MAX_LEVEL ? L(' (máximo)', ' (max)') : ''}</span>
              <i><b style="width:{j.level >= JOURNEY_MAX_LEVEL ? 100 : Math.min(100, (j.xp / xpToNext(j.level)) * 100)}%"></b></i>
              <small>{j.level >= JOURNEY_MAX_LEVEL ? '' : `${j.xp} / ${xpToNext(j.level)} XP`}</small>
            </div>
          </div>
          <div class="deckline"><Layers size={13} /> <span>{deckName(hero)} · {deckNow.reduce((n, c) => n + c.game.copies, 0)} {L('cartas neste nível', 'cards at this level')}{lockedCount ? L(` · ${lockedCount} travadas`, ` · ${lockedCount} locked`) : ''}</span>
            <button class="mini" onclick={() => { router.returnTo = '/batalha/jornada'; router.go(`/heroi/${encodeURIComponent(hero.id)}`); }} title={L('Editar o herói, o equipamento e o deck', 'Edit the hero, the gear and the deck')}><Pencil size={11} /></button></div>
        </div>

        {#if result}
          <div class="result" class:won={result.won} in:scale={{ duration: 240, start: 0.92 }}>
            {#if result.won}<Trophy size={20} />{:else}<Skull size={20} />{/if}
            <span><b>{result.text}</b>
              <small>+{result.xp} XP{result.levels ? L(` · subiu ${result.levels} nível${result.levels > 1 ? 's' : ''}!`, ` · gained ${result.levels} level${result.levels > 1 ? 's' : ''}!`) : ''}{result.won ? '' : result.xp ? L(' · tente de novo: você não perde nada', ' · try again: you lose nothing') : L(' · desistir não dá XP', ' · conceding gives no XP')}</small></span>
          </div>
        {/if}

        {#if j.pending}
          <div class="card levelup" in:scale={{ duration: 260, start: 0.9 }}>
            <span class="lu-title"><TrendingUp size={15} /> {L('Nível novo! Escolha o bônus', 'New level! Choose the bonus')}{j.pending > 1 ? ` (${j.pending})` : ''}</span>
            <div class="lu-opts">
              <button class="vig" onclick={() => { save((s) => choose(s, 'vigor')); chip.sfx('select'); }}><Glyph id="gauntlet" size={24} color="currentColor" /><b>+1 Vigor</b></button>
              <button class="man" onclick={() => { save((s) => choose(s, 'mana')); chip.sfx('select'); }}><Glyph id="crystal-cluster" size={24} color="currentColor" /><b>+1 Mana</b></button>
              <button class="hp" onclick={() => { save((s) => choose(s, 'vida')); chip.sfx('select'); }}><Heart size={22} /><b>+3 {L('Vida', 'Life')}</b></button>
            </div>
          </div>
        {/if}

        <!-- o ponto escolhido no mapa -->
        {#if node}
          {@const st = stateOf(node)}
          {@const art = biomeOf(node.biome)}
          <div class="card spot" class:boss={node.kind === 'boss'} in:fade={{ duration: 140 }}>
            <span class="sp-where"><MapPin size={12} /> {L(art.name[0], art.name[1])}</span>
            {#if node.kind === 'training'}
              <div class="sp-head"><span class="sp-ic"><GraduationCap size={26} /></span><span><b class="display">{L('Campo de treino', 'Training camp')}</b><small>{L('Escolha 1 de 3 habilidades novas da sua classe.', 'Choose 1 of 3 new skills of your class.')}</small></span></div>
              {#if st === 'open' || dev}<button class="btn primary" disabled={!!j.pending} onclick={() => train(node)}><GraduationCap size={16} /> {L('Treinar', 'Train')}</button>{/if}
            {:else}
              {@const fc = charOf(node)}
              {@const fd = defOf(node)}
              {#if fc && fd}
                {@const fb = foeStart(fd, depth(node), node.kind === 'boss')}
                <div class="sp-head" style="--k:{heroColor(fc)}"><HeroPortrait hero={fc} size={62} round />
                  <span><b class="display">{fc.name}</b><small>{node.kind === 'elite' ? L('Mini-chefe · ', 'Mini-boss · ') : ''}{L(fd.className[0], fd.className[1])} · {L('nível', 'level')} {foeLevel(depth(node), node.kind === 'boss')}</small>
                    <small><Heart size={11} /> {fd.maxHp + fb.vida} · Vigor {fd.vigor + fb.vigor} · Mana {fd.mana + fb.mana}</small>
                    <small>{L(DIFFICULTIES.find((d) => d.id === foeDifficulty(depth(node)))!.name[0], DIFFICULTIES.find((d) => d.id === foeDifficulty(depth(node)))!.name[1])} · <em><Sparkles size={11} /> +{xpReward(depth(node), true, node.kind === 'boss', node.kind === 'elite')} XP</em></small></span></div>
                {#if node.kind === 'boss'}<p class="muted sm">{L('Vencer o chefe encerra este mapa e deixa você escolher uma das cartas dele.', 'Beating the boss ends this map and lets you choose one of its cards.')}</p>{/if}
                {#if st === 'open' || dev}<button class="btn primary" disabled={!!j.pending} onclick={() => fight(node)}><Swords size={16} /> {j.pending ? L('Escolha o bônus do nível', 'Choose the level bonus') : L('Batalhar', 'Fight')}</button>{/if}
              {/if}
            {/if}
            {#if st === 'done'}<span class="sp-note"><Check size={13} /> {L('Já concluído', 'Already cleared')}</span>
            {:else if st === 'far'}<span class="sp-note"><Lock size={13} /> {L('Ainda fora do seu caminho', 'Not on your path yet')}</span>{/if}
          </div>
        {:else}
          <p class="hintbox"><MapPin size={14} /> {L('Escolha no mapa um dos pontos que brilham para seguir viagem. Cada caminho leva a oponentes e regiões diferentes, e todos terminam no chefe.', 'Pick one of the glowing spots on the map to travel on. Each path leads to different opponents and regions, and all of them end at the boss.')}</p>
        {/if}

        <div class="unlocks">
          {#each upcoming as u (u.level)}
            <div class="ul">
              <span class="ul-lv"><Lock size={11} /> {L('Nível', 'Level')} {u.level}</span>
              {#each u.cards as n}<span class="ul-c">{n}</span>{/each}
              {#each u.ranks as n}<span class="ul-c up">▲ {n}</span>{/each}
            </div>
          {/each}
          <small class="rec">{L(`${j.wins} vitória${j.wins === 1 ? '' : 's'} · ${j.losses} derrota${j.losses === 1 ? '' : 's'} · ${tier} chefe${tier === 1 ? '' : 's'} vencido${tier === 1 ? '' : 's'}`, `${j.wins} win${j.wins === 1 ? '' : 's'} · ${j.losses} loss${j.losses === 1 ? '' : 'es'} · ${tier} boss${tier === 1 ? '' : 'es'} beaten`)}</small>
          <label class="perma" title={L('Só para teste: se o herói perder uma batalha, perde todo o progresso da Jornada e recomeça do nível 1. Desligado, ele pode tentar de novo do mesmo ponto.', 'Test only: if the hero loses a battle, all Journey progress is lost and it restarts at level 1. Off, it can retry from the same spot.')}>
            <input type="checkbox" checked={settings.v.permadeath} onchange={(e) => { settings.v.permadeath = (e.currentTarget as HTMLInputElement).checked; settings.save(); }} /> <Skull size={13} /> {L('Morte permanente (teste)', 'Permadeath (test)')}</label>
          {#if dev}
            <div class="devrow"><span>DEV</span>
              <button class="btn sm ghost" onclick={() => save((s) => { addXp(s, xpToNext(s.level) - s.xp); })}>{L('+1 nível', '+1 level')}</button>
              <button class="btn sm ghost" onclick={() => app.updateProject((p) => { p.journeySeed = newSeed(); })}>{L('Sortear outro mapa', 'Roll another map')}</button>
            </div>
          {/if}
          <button class="btn sm ghost" onclick={reset}><RotateCcw size={13} /> {L('Recomeçar a Jornada', 'Restart the Journey')}</button>
        </div>
      </aside>

      <section class="mapbox">
        {#if map}
          {#key map.seed}
            <div class="map" in:fade={{ duration: 300 }}>
              <canvas bind:this={cv}></canvas>
              <svg class="trails" viewBox="0 0 1000 562" preserveAspectRatio="none">
                {#if map.at === null}
                  {#each map.nodes.filter((n) => n.layer === 0) as n (n.id)}
                    <path class="tr-sh" d={trail({ x: 0.035, y: 0.5 }, n, 0)} /><path class="tr open" d={trail({ x: 0.035, y: 0.5 }, n, 0)} />
                  {/each}
                {/if}
                {#each map.nodes as a (a.id)}
                  {#each a.next as b}
                    {@const st = edgeState(a, map.nodes[b])}
                    <path class="tr-sh" d={trail(a, map.nodes[b], ((a.id * 7 + b * 3) % 5 - 2) * 0.035)} />
                    <path class="tr {st}" d={trail(a, map.nodes[b], ((a.id * 7 + b * 3) % 5 - 2) * 0.035)} />
                  {/each}
                {/each}
              </svg>
              <span class="maptitle display">{L('Mapa', 'Map')} {tier + 1}</span>
              {#each map.nodes as n (n.id)}
                {@const st = stateOf(n)}
                {@const fc = n.kind === 'training' ? undefined : charOf(n)}
                <button class="node {n.kind} {st}" class:sel={pick === n.id} class:here={map.at === n.id} style="left:{n.x * 100}%;top:{n.y * 100}%;--k:{fc ? heroColor(fc) : '#e3b566'}"
                  onclick={() => { pick = n.id; chip.sfx('select'); }} ondblclick={() => { if (st !== 'open' && !dev) return; if (n.kind === 'training') train(n); else fight(n); }}
                  title={n.kind === 'training' ? L('Campo de treino', 'Training camp') : `${fc?.name ?? ''}${n.kind === 'elite' ? L(' (mini-chefe)', ' (mini-boss)') : ''} · ${L(biomeOf(n.biome).name[0], biomeOf(n.biome).name[1])}`}>
                  <span class="disc">
                    {#if n.kind === 'training'}<Tent size={22} />{:else if fc}<HeroPortrait hero={fc} size={n.kind === 'boss' ? 84 : n.kind === 'elite' ? 58 : 40} round />{/if}
                  </span>
                  {#if n.kind === 'boss'}<span class="crown"><Crown size={18} /></span>{:else if n.kind === 'elite'}<span class="crown sm"><Crown size={13} /></span>{/if}
                  {#if st === 'done'}<span class="tick"><Check size={12} strokeWidth={3.5} /></span>{/if}
                  {#if map.at === n.id}<span class="me"><HeroPortrait hero={hero} size={26} round /></span>{/if}
                </button>
              {/each}
              {#if map.at === null}<span class="startflag"><HeroPortrait hero={hero} size={34} round /><small>{L('Partida', 'Start')}</small></span>{/if}
              <div class="legend">{#each regions as r}<span><i style="background:{biomeOf(r).tones[2]}"></i>{L(biomeOf(r).name[0], biomeOf(r).name[1])}</span>{/each}</div>
            </div>
          {/key}
        {:else}
          <p class="muted">{L('É preciso ter heróis de pelo menos duas classes com deck para haver oponentes no mapa.', 'Heroes of at least two classes with decks are needed to have opponents on the map.')}</p>
        {/if}
      </section>
    </div>
  {/if}

  {#if reward}
    <div class="modal" transition:fade={{ duration: 160 }}>
      <div class="rewardbox" in:scale={{ duration: 260, start: 0.9 }}>
        <small>{L('Recompensa', 'Reward')}</small>
        <h2 class="display">{reward.title}</h2>
        <p class="muted">{reward.sub}</p>
        <div class="rw-cards">
          {#each reward.cards as c (c.id)}
            <button class="rw" onclick={() => take(c)}>
              <CardImage card={c} eager />
              <span>{L(`Você tem ${app.ownedOf(c)} de ${MAX_COPIES}`, `You own ${app.ownedOf(c)} of ${MAX_COPIES}`)}</span>
            </button>
          {/each}
        </div>
        {#if reward.node !== undefined}<button class="btn sm ghost" onclick={() => (reward = null)}>{L('Decidir depois', 'Decide later')}</button>{/if}
      </div>
    </div>
  {/if}
</div>
{/if}

<style>
  .journey { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .bg { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 50% 30%, color-mix(in srgb, var(--c) 18%, transparent), transparent 70%), linear-gradient(180deg, rgb(7 6 12 / .78), rgb(7 6 12 / .95)), url('/ui/fundo.webp') center / cover; image-rendering: pixelated; }
  .none { position: relative; margin: auto; display: grid; justify-items: center; gap: 10px; text-align: center; color: var(--muted); max-width: 460px; }
  .none h2 { color: var(--text); }
  .wrap { position: relative; flex: 1; min-height: 0; display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 16px; padding: 14px 18px 16px; }
  .side { display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow-y: auto; padding-right: 2px; }
  .roster { display: flex; flex-wrap: wrap; gap: 6px; }
  .rh { position: relative; padding: 2px; border-radius: 50%; border: 2px solid transparent; background: none; cursor: pointer; line-height: 0; opacity: .6; transition: opacity .12s, transform .12s; }
  .rh:hover { opacity: 1; transform: translateY(-2px); }
  .rh.on { border-color: var(--k); opacity: 1; box-shadow: 0 0 14px color-mix(in srgb, var(--k) 55%, transparent); }
  .rh i { position: absolute; right: -3px; bottom: -3px; min-width: 17px; height: 17px; border-radius: 9px; display: grid; place-items: center; font: 800 10px/1 var(--ui); font-style: normal; color: #2a1a05; background: linear-gradient(180deg, #ffe7a6, #c9962f); border: 1.5px solid #14100d; }
  .card { border-radius: 16px; padding: 12px 14px; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 12%, rgb(20 17 26 / .95)), rgb(13 11 18 / .96) 60%); border: 1px solid color-mix(in srgb, var(--c) 38%, #2a2440); box-shadow: 0 14px 34px rgb(0 0 0 / .5), inset 0 1px 0 rgb(255 255 255 / .05); }
  .herocard { display: grid; grid-template-columns: auto 1fr; gap: 10px 12px; align-items: center; }
  .pic { border-radius: 12px; overflow: hidden; line-height: 0; box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 70%, #000), 0 0 22px color-mix(in srgb, var(--c) 26%, transparent); }
  .info { min-width: 0; display: grid; gap: 4px; }
  .info h2 { font-size: 22px; line-height: 1; color: #f6ead8; }
  .cls { font: 600 10.5px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 50%, #ddd); }
  .stats { display: flex; gap: 12px; font: 700 13px var(--ui); }
  .stats span { display: inline-flex; gap: 4px; align-items: center; }
  .hp { color: #e8a59a; } .vig { color: #e5866f; } .man { color: #7fb0ff; }
  .lvl { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; }
  .lvn { display: grid; place-items: center; width: 42px; height: 42px; flex: none; border-radius: 50%; font: 800 19px var(--display); color: #2a1a05; background: radial-gradient(circle at 35% 30%, #fff0c4, #c9962f); border: 2px solid #14100d; box-shadow: 0 0 0 2px #d9b56a, 0 0 18px rgb(240 196 90 / .4); }
  .xp { flex: 1; display: grid; gap: 3px; font-size: 12.5px; }
  .xp i { height: 9px; border-radius: 6px; background: rgb(255 255 255 / .08); overflow: hidden; }
  .xp i b { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #c9962f, #ffe7a6); transition: width .5s; }
  .xp small { color: var(--muted); font-size: 11.5px; }
  .deckline { grid-column: 1 / -1; display: flex; gap: 6px; align-items: center; font-size: 11.5px; color: var(--text-2); }
  .deckline span { flex: 1; min-width: 0; }
  .mini { display: grid; place-items: center; width: 22px; height: 22px; flex: none; border-radius: 50%; border: 1px solid rgb(255 255 255 / .2); background: rgb(10 8 7 / .7); color: #f0e6d6; cursor: pointer; }
  .mini:hover { background: var(--accent); color: #1a120b; }
  .result { display: flex; gap: 10px; align-items: center; padding: 10px 14px; border-radius: 14px; background: rgb(60 22 20 / .88); border: 1px solid #a8483c; color: #ffd0c6; }
  .result.won { background: rgb(40 34 14 / .92); border-color: #c9a24a; color: #ffe7a6; }
  .result span { display: grid; } .result b { font-size: 13.5px; } .result small { opacity: .85; font-size: 12px; }
  .levelup { border-color: #c9a24a; box-shadow: 0 0 26px rgb(240 196 90 / .22), 0 14px 34px rgb(0 0 0 / .5); display: grid; gap: 10px; }
  .lu-title { display: flex; gap: 7px; align-items: center; font: 700 13px var(--display); color: #ffd98a; letter-spacing: .04em; }
  .lu-opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .lu-opts button { display: grid; justify-items: center; gap: 3px; padding: 10px 6px; border-radius: 12px; cursor: pointer; font: inherit; background: rgb(255 255 255 / .05); border: 1px solid rgb(255 255 255 / .14); transition: transform .12s, border-color .12s, box-shadow .12s; }
  .lu-opts button:hover { transform: translateY(-3px); border-color: currentColor; box-shadow: 0 0 16px color-mix(in srgb, currentColor 35%, transparent); }
  .lu-opts b { font-size: 13px; color: var(--text); }
  .spot { display: grid; gap: 10px; }
  .spot.boss { border-color: #b0483c; box-shadow: 0 0 30px rgb(200 60 40 / .22), 0 14px 34px rgb(0 0 0 / .5); }
  .sp-where { display: inline-flex; gap: 5px; align-items: center; font: 700 10.5px var(--ui); letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
  .sp-head { display: flex; gap: 12px; align-items: center; }
  .sp-head > span { display: grid; gap: 2px; min-width: 0; } .sp-head b { font-size: 18px; color: #f6ead8; }
  .sp-head small { font-size: 12px; color: var(--text-2); display: inline-flex; gap: 4px; align-items: center; flex-wrap: wrap; }
  .sp-head em { font-style: normal; color: #ffd98a; display: inline-flex; gap: 3px; align-items: center; }
  .sp-ic { display: grid; place-items: center; width: 62px; height: 62px; flex: none; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #6b5a2a, #2a2210); border: 2px solid #c9a24a; color: #ffe7a6; }
  .sp-note { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; color: var(--muted); }
  .hintbox { display: flex; gap: 8px; margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 12.5px; line-height: 1.4; color: var(--text-2); background: rgb(14 12 20 / .8); border: 1px dashed var(--line-2); }
  .hintbox :global(svg) { flex: none; margin-top: 2px; color: var(--accent); }
  .sm { font-size: 11.5px; margin: 0; }
  .unlocks { display: grid; gap: 6px; margin-top: auto; padding-top: 6px; }
  .ul { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; border-radius: 10px; background: rgb(14 12 20 / .8); border: 1px solid var(--line); }
  .ul-lv { flex-basis: 100%; display: inline-flex; gap: 5px; align-items: center; font: 700 10px var(--ui); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .ul-c { font-size: 11.5px; padding: 1px 7px; border-radius: 99px; background: var(--surface-3); color: var(--text-2); }
  .ul-c.up { color: #ffd98a; }
  .rec { color: var(--muted); font-size: 11.5px; }
  .perma { display: flex; gap: 6px; align-items: center; font-size: 12px; color: var(--text-2); cursor: pointer; }
  .devrow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; padding: 6px 8px; border-radius: 10px; border: 1px dashed #b0483c; }
  .devrow span { font: 800 10px var(--ui); letter-spacing: .14em; color: #ff9a8a; }

  /* ───── o mapa ───── */
  .mapbox { min-width: 0; min-height: 0; display: grid; place-items: center; }
  .map { position: relative; aspect-ratio: 16 / 9; height: 100%; max-width: 100%; max-height: 100%; border-radius: 14px; overflow: hidden;
    box-shadow: 0 0 0 2px #14100d, 0 0 0 4px #8a6d3b, 0 0 0 7px #14100d, 0 26px 60px rgb(0 0 0 / .65); }
  .map canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; display: block; }
  .trails { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .tr-sh { fill: none; stroke: rgb(0 0 0 / .45); stroke-width: 7; stroke-linecap: round; }
  .tr { fill: none; stroke: rgb(255 244 214 / .42); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 2 9; }
  .tr.done { stroke: #ffd98a; stroke-dasharray: none; stroke-width: 3.5; }
  .tr.open { stroke: #fff3cf; stroke-dasharray: 3 9; stroke-width: 4; animation: trailFlow .9s linear infinite; }
  @keyframes trailFlow { to { stroke-dashoffset: -24; } }
  .maptitle { position: absolute; left: 14px; top: 10px; padding: 3px 14px; border-radius: 99px; font-size: 13px; letter-spacing: .12em; color: #ffe7a6; background: rgb(10 8 7 / .78); border: 1px solid #8a6d3b; }
  .node { position: absolute; transform: translate(-50%, -50%); padding: 0; border: 0; background: none; cursor: pointer; line-height: 0; transition: transform .14s, filter .14s; }
  .node:hover { transform: translate(-50%, -50%) scale(1.12); z-index: 5; }
  .disc { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; overflow: hidden; background: #14100d; color: #ffe7a6;
    box-shadow: 0 0 0 2px #14100d, 0 0 0 4px var(--k), 0 0 0 5.5px #14100d, 0 6px 14px rgb(0 0 0 / .7); }
  .node.training .disc { width: 44px; height: 44px; border-radius: 12px; background: radial-gradient(circle at 35% 30%, #6b5a2a, #2a2210); }
  .node.boss .disc { width: 88px; height: 88px; box-shadow: 0 0 0 3px #14100d, 0 0 0 6px #d0483a, 0 0 0 8px #14100d, 0 0 34px rgb(255 90 50 / .7), 0 10px 22px rgb(0 0 0 / .8); }
  .node.battle .disc { width: 42px; height: 42px; }
  .node.elite .disc { width: 60px; height: 60px; box-shadow: 0 0 0 2px #14100d, 0 0 0 5px var(--k), 0 0 0 7px #14100d, 0 0 18px color-mix(in srgb, var(--k) 70%, transparent), 0 8px 16px rgb(0 0 0 / .75); }
  .crown.sm { top: -12px; }
  .node.far { filter: saturate(.55) brightness(.72); }
  .node.done { filter: saturate(.35) brightness(.6); }
  .node.open .disc { animation: nodePulse 1.5s ease-in-out infinite; }
  @keyframes nodePulse { 50% { box-shadow: 0 0 0 2px #14100d, 0 0 0 4px #ffe7a6, 0 0 0 5.5px #14100d, 0 0 22px 6px rgb(255 220 130 / .8), 0 6px 14px rgb(0 0 0 / .7); } }
  .node.boss.open .disc { animation: bossPulse 1.5s ease-in-out infinite; }
  @keyframes bossPulse { 50% { box-shadow: 0 0 0 3px #14100d, 0 0 0 6px #ffb08a, 0 0 0 8px #14100d, 0 0 46px 10px rgb(255 110 60 / .9), 0 10px 22px rgb(0 0 0 / .8); } }
  .node.sel { z-index: 4; }
  .node.sel .disc { outline: 3px solid #7fb0ff; outline-offset: 5px; }
  .crown { position: absolute; left: 50%; top: -16px; transform: translateX(-50%); color: #ffd36a; filter: drop-shadow(0 2px 2px #000); }
  .tick { position: absolute; right: -4px; bottom: -4px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: #3f9a5b; color: #fff; border: 2px solid #14100d; }
  .me { position: absolute; left: -12px; top: -14px; border-radius: 50%; box-shadow: 0 0 0 2px #14100d, 0 0 0 3.5px #7fb0ff, 0 4px 8px rgb(0 0 0 / .7); animation: meBob 1.6s ease-in-out infinite; }
  @keyframes meBob { 50% { transform: translateY(-4px); } }
  .startflag { position: absolute; left: 3.5%; top: 50%; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 4px; z-index: 3; }
  .startflag :global(.hp) { box-shadow: 0 0 0 2px #14100d, 0 0 0 3.5px #7fb0ff, 0 4px 8px rgb(0 0 0 / .7); }
  .startflag small { font: 700 9px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: #dfe9ff; padding: 1px 6px; border-radius: 6px; background: rgb(10 8 7 / .8); }
  .legend { position: absolute; left: 10px; right: 10px; bottom: 8px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; pointer-events: none; }
  .legend span { display: inline-flex; gap: 5px; align-items: center; padding: 2px 9px; border-radius: 99px; font: 600 10.5px var(--ui); color: #f0e6d6; background: rgb(10 8 7 / .74); border: 1px solid rgb(255 255 255 / .12); }
  .legend i { width: 9px; height: 9px; border-radius: 2px; border: 1px solid rgb(0 0 0 / .5); }

  /* ───── recompensa ───── */
  .modal { position: absolute; inset: 0; z-index: 40; display: grid; place-items: center; background: rgb(4 3 8 / .82); backdrop-filter: blur(3px); }
  .rewardbox { display: grid; justify-items: center; gap: 8px; padding: 26px 30px; border-radius: 20px; max-width: min(1000px, 92vw); text-align: center;
    background: linear-gradient(180deg, #2a221c, #14100d); border: 1px solid #c9a24a; box-shadow: 0 0 0 4px rgb(0 0 0 / .5), 0 30px 70px rgb(0 0 0 / .8), 0 0 50px rgb(240 196 90 / .18); }
  .rewardbox > small { font: 700 11px var(--ui); letter-spacing: .22em; text-transform: uppercase; color: var(--accent); }
  .rewardbox h2 { font-size: 30px; color: #f6ead8; }
  .rewardbox p { max-width: 620px; margin: 0 0 8px; }
  .rw-cards { display: flex; gap: 22px; justify-content: center; flex-wrap: wrap; }
  .rw { display: grid; gap: 8px; justify-items: center; width: clamp(180px, 17vw, 260px); padding: 0; border: 0; background: none; cursor: pointer; color: var(--text-2); font: 600 12px var(--ui); transition: transform .16s cubic-bezier(.2, .8, .3, 1), filter .16s; filter: drop-shadow(0 14px 22px rgb(0 0 0 / .7)); }
  .rw:hover { transform: translateY(-10px) scale(1.06); filter: drop-shadow(0 0 22px rgb(240 196 90 / .6)) drop-shadow(0 20px 26px rgb(0 0 0 / .8)); color: #ffe7a6; }
  .rw :global(.card-img), .rw > :global(div) { width: 100%; }
  @media (max-width: 1150px) { .wrap { grid-template-columns: 270px minmax(0, 1fr); } }
</style>
