<!--
  Jornada: o modo solo com progressão. O herói enfrenta uma sequência sem fim de oponentes cada
  vez mais fortes; o nível sobe ENTRE as batalhas (com o XP das vitórias) e libera as cartas de
  nível maior e as evoluções das cartas. As regras ficam em src/game/journey.ts.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Swords, Heart, Sparkles, Crown, Lock, TrendingUp, RotateCcw, Trophy, Skull, Layers, Pencil } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { ui } from '../../app/ui.svelte';
  import { chip } from '../../audio/chip';
  import ScreenBar from '../common/ScreenBar.svelte';
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import Glyph from '../common/Glyph.svelte';
  import Game from './Game.svelte';
  import { deckCards, deckName, deckReady, heroColor, heroDef, playable, type FixedMatch } from './heroes';
  import { cardDef } from '../../game/fromApp';
  import { DIFFICULTIES } from '../../game/bot';
  import { applyResult, choose, foeDifficulty, foeLevel, foeStart, isBoss, journeyDeck, newJourney, playerStart, unlocksAt, xpReward, xpToNext, JOURNEY_MAX_LEVEL, type JourneyState } from '../../game/journey';
  import type { CardDef } from '../../game/types';
  import type { Character } from '../../model/types';

  const KEY = 'voidsun.jornada.heroi';
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

  /** Oponente da etapa: os outros heróis, em rodízio. */
  const foe = $derived.by((): Character | undefined => {
    const others = chars.filter((c) => c.id !== hero?.id);
    return others.length ? others[(j.stage - 1) % others.length] : undefined;
  });
  const foeDef = $derived(foe ? heroDef(foe) : null);
  const boss = $derived(isBoss(j.stage));
  const foeBonus = $derived(foeDef ? foeStart(foeDef, j.stage) : null);

  const defs = $derived<CardDef[]>(hero ? deckCards(hero).map(cardDef).filter((x): x is CardDef => !!x) : []);
  const nameOf = (c: CardDef) => app.cards[c.id]?.text[app.lang].name ?? c.name[0];
  const usable = $derived(journeyDeck(defs, j.level));
  const lockedCount = $derived(defs.filter((c) => c.game.level > j.level).length);
  /** Os próximos níveis que liberam alguma coisa (até 3). */
  const upcoming = $derived.by(() => {
    const out: { level: number; cards: string[]; ranks: string[] }[] = [];
    for (let lv = j.level + 1; lv <= JOURNEY_MAX_LEVEL && out.length < 3; lv++) {
      const u = unlocksAt(defs, lv);
      if (u.cards.length || u.ranks.length) out.push({ level: lv, cards: u.cards.map(nameOf), ranks: u.ranks.map(nameOf) });
    }
    return out;
  });

  let battle = $state<FixedMatch | null>(null);
  let result = $state<{ won: boolean; xp: number; levels: number; stage: number } | null>(null);

  function fight() {
    if (!hero || !foe || !foeBonus || j.pending) return;
    const stage = j.stage;
    battle = {
      myId: hero.id, botId: foe.id, start: [playerStart(j), foeBonus], difficulty: foeDifficulty(stage),
      label: L(`Etapa ${stage}`, `Stage ${stage}`),
      onEnd: (won, forfeit) => {
        let r = { xp: 0, levels: 0 };
        save((s) => { r = applyResult(s, won, forfeit); });
        result = { won, ...r, stage };
        battle = null;
        chip.sfx(r.levels ? 'levelup' : won ? 'victory' : 'defeat');
      },
      onLeave: () => { battle = null; },
    };
  }
  async function reset() {
    if (!hero) return;
    const r = await ui.confirm({ title: L(`Recomeçar a Jornada de ${hero.name}?`, `Restart ${hero.name}'s Journey?`), text: L('O herói volta à etapa 1 e ao nível 1. Não dá para desfazer.', 'The hero goes back to stage 1 and level 1. This cannot be undone.'), ok: L('Recomeçar', 'Restart'), danger: true });
    if (r === 'ok') { save((s) => Object.assign(s, newJourney())); result = null; }
  }
  onMount(() => chip.music('menu'));
  const pips = (n: number) => Array.from({ length: Math.min(8, n) });
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
      <aside class="roster">
        <span class="section-title">{L('Seus heróis', 'Your heroes')}</span>
        {#each chars as c (c.id)}
          {@const s = journeyOf(c)}
          <button class="rhero" class:on={c.id === hero.id} style="--k:{heroColor(c)}" onclick={() => { heroId = c.id; result = null; }}>
            <HeroPortrait hero={c} size={52} round />
            <span><b>{c.name}</b><small>{L('Nível', 'Level')} {s.level} · {L('etapa', 'stage')} {s.stage}</small></span>
          </button>
        {/each}
      </aside>

      <section class="main">
        {#if result}
          <div class="result" class:won={result.won} in:scale={{ duration: 240, start: 0.92 }}>
            {#if result.won}<Trophy size={22} />{:else}<Skull size={22} />{/if}
            <span><b>{result.won ? L(`Etapa ${result.stage} vencida!`, `Stage ${result.stage} cleared!`) : L(`Derrota na etapa ${result.stage}`, `Defeat at stage ${result.stage}`)}</b>
              <small>+{result.xp} XP{result.levels ? L(` · subiu ${result.levels} nível${result.levels > 1 ? 's' : ''}!`, ` · gained ${result.levels} level${result.levels > 1 ? 's' : ''}!`) : ''}{result.won ? '' : result.xp ? L(' · tente de novo: você não perde nada', ' · try again: you lose nothing') : L(' · desistir não dá XP', ' · conceding gives no XP')}</small></span>
          </div>
        {/if}

        <div class="card herocard">
          <div class="pic"><HeroPortrait hero={hero} size={200} /></div>
          <div class="info">
            <h2 class="display">{hero.name}</h2>
            <span class="cls">{L(def.className[0], def.className[1])}</span>
            <div class="lvl"><span class="lvn">{j.level}</span>
              <div class="xp">
                <span>{L('Nível', 'Level')} {j.level}{j.level >= JOURNEY_MAX_LEVEL ? L(' (máximo)', ' (max)') : ''}</span>
                <i><b style="width:{j.level >= JOURNEY_MAX_LEVEL ? 100 : Math.min(100, (j.xp / xpToNext(j.level)) * 100)}%"></b></i>
                <small>{j.level >= JOURNEY_MAX_LEVEL ? '' : `${j.xp} / ${xpToNext(j.level)} XP`}</small>
              </div>
            </div>
            <div class="stats">
              <span class="hp"><Heart size={14} /> {def.maxHp + j.vida} {L('Vida', 'Life')}</span>
              <span class="vig"><Glyph id="gauntlet" size={14} color="currentColor" /> {def.vigor + j.vigor} Vigor</span>
              <span class="man"><Glyph id="crystal-cluster" size={14} color="currentColor" /> {def.mana + j.mana} Mana</span>
            </div>
            <div class="deckline"><Layers size={14} /> {deckName(hero)} · {L(`${defs.length - lockedCount} de ${defs.length} cartas liberadas`, `${defs.length - lockedCount} of ${defs.length} cards unlocked`)}
              <button class="mini" onclick={() => { router.returnTo = '/batalha/jornada'; router.go(`/heroi/${encodeURIComponent(hero.id)}`); }} title={L('Editar o herói, o equipamento e o deck', 'Edit the hero, the gear and the deck')}><Pencil size={12} /></button></div>
            <small class="rec">{L(`${j.wins} vitória${j.wins === 1 ? '' : 's'} · ${j.losses} derrota${j.losses === 1 ? '' : 's'} · melhor etapa: ${j.best}`, `${j.wins} win${j.wins === 1 ? '' : 's'} · ${j.losses} loss${j.losses === 1 ? '' : 'es'} · best stage: ${j.best}`)}</small>
          </div>
        </div>

        {#if j.pending}
          <div class="card levelup" in:scale={{ duration: 260, start: 0.9 }}>
            <span class="lu-title"><TrendingUp size={16} /> {L(`Nível novo! Escolha o que ${hero.name} ganha`, `New level! Choose what ${hero.name} gains`)}{j.pending > 1 ? ` (${j.pending})` : ''}</span>
            <div class="lu-opts">
              <button class="vig" onclick={() => { save((s) => choose(s, 'vigor')); chip.sfx('select'); }}><Glyph id="gauntlet" size={30} color="currentColor" /><b>+1 Vigor</b><small>{L('para golpes e técnicas', 'for strikes and techniques')}</small></button>
              <button class="man" onclick={() => { save((s) => choose(s, 'mana')); chip.sfx('select'); }}><Glyph id="crystal-cluster" size={30} color="currentColor" /><b>+1 Mana</b><small>{L('para magias e invocações', 'for spells and summons')}</small></button>
              <button class="hp" onclick={() => { save((s) => choose(s, 'vida')); chip.sfx('select'); }}><Heart size={28} /><b>+3 {L('Vida', 'Life')}</b><small>{L('aumenta a vida máxima', 'raises maximum life')}</small></button>
            </div>
          </div>
        {/if}

        <div class="card next" class:boss>
          <div class="nx-head"><span class="stage">{L('Etapa', 'Stage')} {j.stage}</span>{#if boss}<span class="bosstag"><Crown size={13} /> {L('Chefe', 'Boss')}</span>{/if}</div>
          {#if foe && foeDef && foeBonus}
            <div class="nx-body">
              <div class="foe" style="--k:{heroColor(foe)}"><HeroPortrait hero={foe} size={96} round />
                <span><b class="display">{foe.name}</b><small>{L(foeDef.className[0], foeDef.className[1])} · {L('nível', 'level')} {foeLevel(j.stage)}</small>
                  <small><Heart size={11} /> {foeDef.maxHp + foeBonus.vida} · Vigor {foeDef.vigor + foeBonus.vigor} · Mana {foeDef.mana + foeBonus.mana} · {L(DIFFICULTIES.find((d) => d.id === foeDifficulty(j.stage))!.name[0], DIFFICULTIES.find((d) => d.id === foeDifficulty(j.stage))!.name[1])}</small></span></div>
              <div class="reward"><Sparkles size={15} /> <b>+{xpReward(j.stage, true)} XP</b><small>{L('pela vitória', 'for the win')}</small></div>
              <button class="btn primary big" disabled={!!j.pending} onclick={fight}><Swords size={18} /> {j.pending ? L('Escolha o bônus do nível', 'Choose the level bonus') : L('Batalhar', 'Fight')}</button>
            </div>
          {:else}
            <p class="muted">{L('É preciso ter pelo menos dois heróis com deck para haver um oponente.', 'At least two heroes with decks are needed to have an opponent.')}</p>
          {/if}
        </div>
      </section>

      <aside class="unlocks">
        <span class="section-title">{L('Próximas liberações', 'Coming unlocks')}</span>
        {#each upcoming as u (u.level)}
          <div class="ul" transition:fade={{ duration: 120 }}>
            <span class="ul-lv"><Lock size={12} /> {L('Nível', 'Level')} {u.level}</span>
            {#each u.cards as n}<span class="ul-c">{n}</span>{/each}
            {#each u.ranks as n}<span class="ul-c up">▲ {n}</span>{/each}
          </div>
        {/each}
        {#if !upcoming.length}<p class="muted sm">{L('Todas as cartas deste deck já estão liberadas.', 'Every card in this deck is already unlocked.')}</p>{/if}
        <p class="muted sm">{L('▲ = evolução: a carta ganha uma versão mais forte. No nível atual o deck entra com as cartas já liberadas, completadas até 40.', '▲ = evolution: the card gains a stronger version. At the current level the deck enters with the unlocked cards, topped up to 40.')}</p>
        <span class="section-title">{L(`Deck no nível ${j.level}`, `Deck at level ${j.level}`)}</span>
        <div class="dl">{#each usable as c (c.id)}<span>{c.game.copies}× {nameOf(c)}</span>{/each}</div>
        <button class="btn sm ghost" onclick={reset}><RotateCcw size={13} /> {L('Recomeçar a Jornada', 'Restart the Journey')}</button>
      </aside>
    </div>
  {/if}
</div>
{/if}

<style>
  .journey { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .bg { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 50% 30%, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%), linear-gradient(180deg, rgb(7 6 12 / .7), rgb(7 6 12 / .94)), url('/ui/fundo.webp') center / cover; image-rendering: pixelated; }
  .none { position: relative; margin: auto; display: grid; justify-items: center; gap: 10px; text-align: center; color: var(--muted); max-width: 460px; }
  .none h2 { color: var(--text); }
  .wrap { position: relative; flex: 1; min-height: 0; display: grid; grid-template-columns: 230px minmax(0, 1fr) 290px; gap: 18px; padding: 18px 22px; max-width: 1500px; width: 100%; margin: 0 auto; }
  .roster, .unlocks { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow-y: auto; padding: 14px; border-radius: 16px; background: rgb(14 12 20 / .82); border: 1px solid var(--line); }
  .rhero { display: flex; gap: 10px; align-items: center; text-align: left; padding: 7px 9px; border-radius: 12px; border: 1px solid transparent; background: none; color: var(--text-2); cursor: pointer; font: inherit; }
  .rhero:hover { background: rgb(255 255 255 / .05); }
  .rhero.on { border-color: var(--k); background: color-mix(in srgb, var(--k) 16%, transparent); color: var(--text); }
  .rhero span { display: grid; } .rhero b { font-size: 14px; } .rhero small { font-size: 11.5px; color: var(--muted); }
  .main { display: flex; flex-direction: column; gap: 14px; min-height: 0; overflow-y: auto; padding-right: 4px; }
  .card { border-radius: 18px; padding: 18px; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 12%, rgb(20 17 26 / .94)), rgb(13 11 18 / .95) 60%); border: 1px solid color-mix(in srgb, var(--c) 38%, #2a2440); box-shadow: 0 18px 44px rgb(0 0 0 / .5), inset 0 1px 0 rgb(255 255 255 / .05); }
  .result { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-radius: 14px; background: rgb(60 22 20 / .85); border: 1px solid #a8483c; color: #ffd0c6; }
  .result.won { background: rgb(40 34 14 / .9); border-color: #c9a24a; color: #ffe7a6; }
  .result span { display: grid; } .result small { opacity: .85; font-size: 12.5px; }
  .herocard { display: flex; gap: 20px; align-items: stretch; }
  .pic { flex: none; border-radius: 16px; overflow: hidden; line-height: 0; box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 70%, #000), 0 0 40px color-mix(in srgb, var(--c) 26%, transparent); }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .info h2 { font-size: clamp(24px, 2.4vw, 36px); line-height: 1; color: #f6ead8; }
  .cls { font: 600 12px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 50%, #ddd); }
  .lvl { display: flex; gap: 14px; align-items: center; }
  .lvn { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; font: 800 24px var(--display); color: #2a1a05; background: radial-gradient(circle at 35% 30%, #fff0c4, #c9962f); border: 2px solid #14100d; box-shadow: 0 0 0 2px #d9b56a, 0 0 22px rgb(240 196 90 / .4); }
  .xp { flex: 1; display: grid; gap: 4px; font-size: 13px; }
  .xp i { height: 10px; border-radius: 6px; background: rgb(255 255 255 / .08); overflow: hidden; }
  .xp i b { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #c9962f, #ffe7a6); transition: width .5s; }
  .xp small { color: var(--muted); font-size: 12px; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; font: 600 13.5px var(--ui); }
  .stats span { display: inline-flex; gap: 5px; align-items: center; }
  .hp { color: #e8a59a; } .vig { color: #e5866f; } .man { color: #7fb0ff; }
  .deckline { display: flex; gap: 7px; align-items: center; font-size: 12.5px; color: var(--text-2); }
  .mini { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgb(255 255 255 / .2); background: rgb(10 8 7 / .7); color: #f0e6d6; cursor: pointer; }
  .mini:hover { background: var(--accent); color: #1a120b; }
  .rec { color: var(--muted); font-size: 12px; margin-top: auto; }
  .levelup { border-color: #c9a24a; box-shadow: 0 0 30px rgb(240 196 90 / .2), 0 18px 44px rgb(0 0 0 / .5); display: grid; gap: 12px; }
  .lu-title { display: flex; gap: 8px; align-items: center; font: 700 14px var(--display); color: #ffd98a; letter-spacing: .04em; }
  .lu-opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .lu-opts button { display: grid; justify-items: center; gap: 4px; padding: 14px 10px; border-radius: 14px; cursor: pointer; font: inherit; background: rgb(255 255 255 / .05); border: 1px solid rgb(255 255 255 / .14); transition: transform .12s, border-color .12s, box-shadow .12s; }
  .lu-opts button:hover { transform: translateY(-3px); border-color: currentColor; box-shadow: 0 0 18px color-mix(in srgb, currentColor 35%, transparent); }
  .lu-opts b { font-size: 16px; color: var(--text); } .lu-opts small { font-size: 11.5px; color: var(--muted); }
  .next.boss { border-color: #b0483c; box-shadow: 0 0 34px rgb(200 60 40 / .22), 0 18px 44px rgb(0 0 0 / .5); }
  .nx-head { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  .stage { font: 700 12px var(--ui); letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
  .bosstag { display: inline-flex; gap: 5px; align-items: center; padding: 2px 10px; border-radius: 99px; font: 700 11px var(--ui); text-transform: uppercase; letter-spacing: .1em; background: #3a1512; color: #ffb4a6; border: 1px solid #b0483c; }
  .nx-body { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
  .foe { flex: 1; min-width: 240px; display: flex; gap: 14px; align-items: center; }
  .foe span { display: grid; gap: 2px; } .foe b { font-size: 20px; color: #f6ead8; } .foe small { font-size: 12.5px; color: var(--text-2); display: inline-flex; gap: 4px; align-items: center; }
  .reward { display: grid; justify-items: center; color: #ffd98a; } .reward b { font-size: 18px; } .reward small { font-size: 11px; color: var(--muted); }
  .btn.big { height: 48px; padding: 0 28px; font-size: 15px; }
  .ul { display: flex; flex-wrap: wrap; gap: 5px; padding: 9px; border-radius: 10px; background: var(--surface); }
  .ul-lv { flex-basis: 100%; display: inline-flex; gap: 5px; align-items: center; font: 700 11px var(--ui); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .ul-c { font-size: 12px; padding: 2px 8px; border-radius: 99px; background: var(--surface-3); color: var(--text-2); }
  .ul-c.up { color: #ffd98a; }
  .sm { font-size: 11.5px; }
  .dl { display: grid; gap: 2px; font-size: 12px; color: var(--text-2); }
  @media (max-width: 1150px) { .wrap { grid-template-columns: 190px minmax(0, 1fr); } .unlocks { grid-column: 1 / -1; } }
</style>
