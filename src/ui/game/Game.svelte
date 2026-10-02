<!--
  Mesa de teste. De baixo para cima: a barra do seu
  herói, a sua mão, as suas duas fileiras e a faixa das cartas usadas no turno;
  o lado do oponente é o mesmo, espelhado. Grimório e cemitério ficam nos cantos
  (as cartas voam de um lugar para outro). Passe o mouse numa carta para
  ampliá-la; clique num cemitério para ver tudo.
-->
<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { crossfade, fade, fly as flyIn, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Swords, ArrowLeftRight, RotateCcw, Shield, Droplet, Crosshair, Sparkles, Zap, Heart, Users, X, Skull, BookOpen, Pencil, ScrollText, ChevronDown, Check, UserRound, Menu, Flag as FlagIcon, CircleHelp, LogOut, Hourglass, Dices, Map as MapIcon, Moon, TrendingUp, Gauge, House } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { ui } from '../../app/ui.svelte';
  import { actor, apply, cannotPlay, cardTargets, choiceOf, emptySlots, heroPos, newGame, other, reachable, reactions, strikeVia, unitAt, XP_PER_LEVEL, COLS, MAX_MULLIGANS } from '../../game/engine';
  import { botAction, botMulligan, DIFFICULTIES, EDGE, type Difficulty } from '../../game/bot';
  import { settings } from '../../app/settings.svelte';
  import { shell } from '../../app/shell.svelte';
  import ScreenBar from '../common/ScreenBar.svelte';
  import { sideFromApp } from '../../game/fromApp';
  import { ATTRS, ATTR_NAMES, type Action, type CardRef, type Fx, type Effect, type GameState, type GearItem, type HeroDef, type Pos, type Unit, type Via } from '../../game/types';
  import type { Character } from '../../model/types';
  import Glyph from '../common/Glyph.svelte';
  import CardImage from '../common/CardImage.svelte';
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import { colorHex } from '../../model/catalog';
  import { composeBack } from '../../render/back';
  import { rasterize } from '../../render/raster';
  import { backInput } from '../back/backCtx';
  import { characterOf, deckCards, deckCount, heroDef, playable } from './heroes';
  import AvatarSprite from '../../avatar/AvatarSprite.svelte';
  import { chip } from '../../audio/chip';
  import MusicPlayer from '../../audio/MusicPlayer.svelte';
  import { attackAnim as weaponAnim, type Anim } from '../../avatar/lpc';
  import { creatureOf, hasFigure, sheetOf } from '../../avatar/creatures';
  import SheetSprite from '../../avatar/SheetSprite.svelte';
  import { SCENES, floorTile, randomScene, sceneOf, type Scene } from './scenes';

  // ───────────── preparação ─────────────
  const OPTS_KEY = 'darkstar.mesa';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(OPTS_KEY) ?? '{}') as Record<string, unknown>; } catch { return {}; } })();

  let step = $state<'heroes' | 'place' | 'play'>('heroes');
  const chars = $derived(playable());
  let myId = $state(typeof saved.my === 'string' ? saved.my : '');
  let botId = $state(typeof saved.bot === 'string' ? saved.bot : '');
  const myChar = $derived<Character | undefined>(chars.find((c) => c.id === myId) ?? chars[0]);
  const botChar = $derived<Character | undefined>(chars.find((c) => c.id === botId) ?? chars[1] ?? chars[0]);
  const myHero = $derived(myChar ? heroDef(myChar) : null);
  const botHero = $derived(botChar ? heroDef(botChar) : null);
  let myPos = $state<{ row: 0 | 1; col: 0 | 1 | 2 }>({ row: 0, col: 1 });
  let limit = $state(saved.limit === true);
  let heroOff = $state(saved.heroOff === true);
  let heroOffFront = $state(saved.heroOffFront === true);
  // registro, limite de tempo, velocidade e dificuldade são configurações do jogo (valem em todas as partidas)
  const cfg = settings.v;
  $effect(() => { void [cfg.showLog, cfg.timeLimit, cfg.pace, cfg.difficulty]; settings.save(); });
  /** Velocidade das jogadas do oponente: pausas para dar tempo de ler cada carta e ver cada efeito. */
  type Pace = 'slow' | 'normal' | 'fast';
  /** k: espaço entre os efeitos; think: pausa antes de cada jogada; card: tempo para ler a carta antes do efeito; shown: tempo da carta na tela; end: pausa antes de encerrar o turno. */
  const PACES: Record<Pace, { k: number; think: number; card: number; shown: number; end: number }> = {
    fast: { k: 1, think: 800, card: 1100, shown: 2600, end: 700 },
    normal: { k: 1.5, think: 1200, card: 2000, shown: 3600, end: 1100 },
    slow: { k: 2.2, think: 2000, card: 3200, shown: 5000, end: 1800 },
  };
  let starter = $state<'eu' | 'bot' | 'sorteio'>('sorteio');
  /** Dificuldade da partida em curso (a das configurações, fixada ao começar). */
  let level: Difficulty = cfg.difficulty;
  /** Cenário escolhido para o campo ('random' = sorteia a cada partida). */
  let scenePick = $state(typeof saved.scene === 'string' ? saved.scene : 'random');
  let sceneOpen = $state(false);
  /** Cenário da partida em curso. */
  let scene = $state<Scene>(sceneOf('mesa'));
  /**
   * Fundo da mesa. O endereço vai completo: dentro de uma variável CSS, um caminho
   * relativo seria procurado a partir da pasta da folha de estilo (assets/), não do app.
   */
  const sceneStyle = $derived(scene.img ? `--scene:url("${new URL(scene.img, document.baseURI).href}")` : '');
  /** Piso de cada casa (varia de casa para casa). */
  const floorOf = (p: number, row: number, col: number) => `url(${floorTile(scene, 1 + p * 100 + (row + 1) * 10 + col)})`;
  $effect(() => { try { localStorage.setItem(OPTS_KEY, JSON.stringify({ my: myId, bot: botId, limit, heroOff, heroOffFront, scene: scenePick })); } catch { /* sem armazenamento local */ } });

  const colorOf = (h: HeroDef) => colorHex(app.deck(h.deckId)?.colors[0] ?? 'red');
  const ready = $derived(!!myChar && !!botChar && deckCount(myChar) > 0 && deckCount(botChar) > 0);

  // verso das cartas (mão do oponente e grimórios): desenhado uma vez só
  let backUrl = $state('');
  $effect(() => {
    const ed = app.edition(app.deck(botHero?.deckId ?? '')?.editionId);
    void rasterize(composeBack(backInput(ed, 'gameback')), 300, 'image/webp').then((b) => { backUrl = URL.createObjectURL(b); });
  });

  let g = $state<GameState | null>(null);
  let me = $state<0 | 1>(0);
  let msg = $state('');
  let warn = $state(false);
  let botBusy = $state(false);

  function say(text: string, isWarn = false) { msg = text; warn = isWarn; if (text && isWarn) chip.sfx('error'); }

  // ───────────── som: música da seleção → música de batalha; pistas sonoras nos acontecimentos ─────────────
  // seleção, posicionamento e mão inicial: tema calmo; começou o 1º turno: tema de batalha; fim de partida: silêncio
  $effect(() => {
    const inMatch = step === 'play' && !!g;
    chip.music(!inMatch || g!.setup ? 'menu' : g!.winner !== undefined ? null : 'battle');
  });
  let ended = false;
  $effect(() => { const w = g?.winner; if (w !== undefined && !ended) { ended = true; setTimeout(() => chip.sfx(w === me ? 'victory' : 'defeat'), 900); } if (w === undefined) ended = false; });
  // carta entrando na mão
  let handCount = 0;
  $effect(() => { const n = g?.players[me].hand.length ?? 0; if (n > handCount && step === 'play') chip.sfx('draw'); handCount = n; });

  /** Abre a ficha do herói; o "voltar" de lá traz de volta para esta seleção. */
  function editHero(id: string) { router.returnTo = '/batalha/solo'; router.go(`/heroi/${encodeURIComponent(id)}`); }

  /** Sorteia (ou fixa) o cenário da partida; fica o mesmo no posicionamento e no jogo. */
  function pickScene() { scene = scenePick === 'random' ? randomScene() : sceneOf(scenePick); }

  function toPlace() {
    if (!myHero) return;
    pickScene();
    if (heroOff) { start(); return; }
    myPos = { row: myHero.row, col: myHero.col };
    step = 'place';
  }

  function start() {
    if (!myChar || !botChar || !myHero || !botHero) return;
    const mine = sideFromApp({ ...myHero, row: myPos.row, col: myPos.col }, deckCards(myChar));
    // a dificuldade vale para a partida inteira; no Muito difícil o bot começa com vantagem (vida e carta a mais)
    level = cfg.difficulty;
    const edge = EDGE[level];
    const bot = { ...sideFromApp(edge ? { ...botHero, maxHp: botHero.maxHp + edge.hp } : botHero, deckCards(botChar)), extraCards: edge?.cards ?? 0 };
    const iStart = starter === 'eu' || (starter === 'sorteio' && Math.random() < 0.5);
    // "jogar de novo" com cenário sorteado: sorteia outro
    if (step === 'play' && scenePick === 'random') pickScene();
    me = iStart ? 0 : 1;
    g = newGame(iStart ? mine : bot, iStart ? bot : mine, { actionLimit: limit, heroOff, heroOffFront: heroOff && heroOffFront, mulligan: true });
    sel = null;
    say('');
    step = 'play';
    lastFx = 0;
    lastLine = '';
    floats = [];
    heroAnim = ['idle', 'idle'];
    // o bot decide a mão dele já; a minha aparece em destaque depois do anúncio de quem começa
    const b = other(me);
    for (let i = 0; i < 5 && g.setup && !g.setup.kept[b]; i++) apply(g, botMulligan($state.snapshot(g) as GameState, b, level));
    discardSel = [];
    intro = 'who';
  }

  // ───────────── antes do 1º turno: quem começa e a mão inicial (mulligan) ─────────────
  let intro = $state<'who' | 'hand' | null>(null);
  let discardSel = $state<string[]>([]);
  const myMulls = $derived(g?.setup?.mull[me] ?? 0);
  function toggleDiscard(uid: string) {
    touch();
    if (!myMulls) return;
    discardSel = discardSel.includes(uid) ? discardSel.filter((x) => x !== uid) : discardSel.length < myMulls ? [...discardSel, uid] : [...discardSel.slice(1), uid];
  }
  function mulligan() {
    if (!g) return;
    const err = apply(g, { t: 'mulligan', p: me });
    if (err) { say(err, true); return; }
    touch();
    discardSel = [];
  }
  function keepHand() {
    if (!g) return;
    const err = apply(g, { t: 'keep', p: me, discard: discardSel });
    if (err) { say(err, true); return; }
    intro = null;
    zoom = null;
    void tick().then(() => playFx()).then(() => runBot());
  }

  function leave() { g = null; step = 'heroes'; }

  // ───────────── jogo ─────────────
  type Sel = { kind: 'card'; uid: string } | { kind: 'strike' } | { kind: 'unit'; pos: Pos } | { kind: 'move' } | null;
  let sel = $state<Sel>(null);
  const foe = $derived(other(me));
  /** Uma carta do oponente espera a minha resposta (Reação ou aceitar). */
  const awaiting = $derived(!!g && !!g.pending && actor(g) === me && g.winner === undefined);
  const myTurn = $derived(!!g && g.active === me && g.winner === undefined && !botBusy && !g.pending && !g.setup);
  const same = (a: Pos, b: Pos) => a.p === b.p && a.row === b.row && (a.col === b.col || a.col === -1 || b.col === -1);

  const targets = $derived.by((): Pos[] => {
    if (!g || !sel || !myTurn) return [];
    if (sel.kind === 'card') {
      const ref = g.players[me].hand.find((c) => c.uid === sel.uid);
      if (!ref) return [];
      const eff = g.defs[ref.cardId].game.effects;
      return choiceOf(eff)?.kind === 'slot' ? emptySlots(g, me) : cardTargets(g, me, eff);
    }
    if (sel.kind === 'strike') return reachable(g, me, strikeVia(g, me), heroPos(g, me));
    if (sel.kind === 'unit') { const u = unitAt(g, sel.pos); return u ? reachable(g, me, u.keys.includes('distancia') ? 'ranged' : 'melee', sel.pos) : []; }
    return emptySlots(g, me);
  });
  const isTarget = (pos: Pos) => targets.some((t) => same(t, pos));

  /**
   * O que pedir ao jogador, conforme o tipo de alvo. Os tipos que o jogo ainda não usa
   * (encantamento, grimório, cemitério…) já ficam aqui para as próximas cartas.
   */
  const TARGET_PROMPT = {
    any: ['Selecione o alvo: uma criatura ou o herói inimigo', 'Select the target: a creature or the enemy hero'],
    creature: ['Selecione uma criatura-alvo', 'Select a target creature'],
    enemyCreature: ['Selecione uma criatura-alvo inimiga', 'Select a target enemy creature'],
    allyCreature: ['Selecione uma criatura-alvo sua', 'Select a target creature of yours'],
    ally: ['Selecione um aliado-alvo: uma criatura sua ou o seu herói', 'Select a target ally: a creature of yours or your hero'],
    player: ['Selecione o jogador-alvo', 'Select the target player'],
    row: ['Selecione a fileira-alvo', 'Select the target row'],
    slot: ['Selecione um lugar livre no seu campo', 'Select a free slot on your field'],
    enchantment: ['Selecione um encantamento-alvo', 'Select a target enchantment'],
    grimoire: ['Selecione o grimório-alvo', 'Select the target grimoire'],
    graveyard: ['Selecione o cemitério-alvo', 'Select the target graveyard'],
    graveCreature: ['Selecione uma criatura-alvo no cemitério', 'Select a target creature in the graveyard'],
  } as const;
  const ask = (k: keyof typeof TARGET_PROMPT) => say(L(TARGET_PROMPT[k][0], TARGET_PROMPT[k][1]));
  /** Tipo de alvo de uma carta (pelo primeiro efeito que pede escolha). */
  function promptOf(effects: Effect[]): keyof typeof TARGET_PROMPT {
    const ch = choiceOf(effects);
    if (!ch || ch.kind === 'slot') return 'slot';
    return ({ enemy: 'any', enemyUnit: 'enemyCreature', enemyRow: 'row', ally: 'ally', allyUnit: 'allyCreature', enemyHero: 'player' } as Record<string, keyof typeof TARGET_PROMPT>)[ch.tgt] ?? 'any';
  }

  /** O golpe do herói: pode agora? Se não, por quê (em palavras). */
  function strikeInfo(): { can: boolean; why: string } {
    if (!g) return { can: false, why: '' };
    const pl = g.players[me];
    if (pl.struck) return { can: false, why: L('Golpe já usado: o herói golpeia 1 vez por turno, sem custo. As cartas não gastam esse golpe.', 'Strike already used: the hero strikes once per turn, at no cost. Cards do not use it up.') };
    const hp = heroPos(g, me), via = strikeVia(g, me);
    if (!reachable(g, me, via, hp).length) {
      return { can: false, why: via === 'melee' && hp.row === 1
        ? L('Na retaguarda o herói não alcança ninguém com golpe corpo a corpo. Use “Trocar posição” para ir à frente.', 'From the back row a melee strike reaches no one. Use “Change position” to go to the front.')
        : L('Nenhum inimigo ao alcance do golpe.', 'No enemy within reach of the strike.') };
    }
    return { can: true, why: L('Golpe disponível: clique no herói e depois no alvo. Não custa nada, pode ser a qualquer momento do seu turno, 1 vez por turno.', 'Strike available: click the hero, then the target. It is free, any time during your turn, once per turn.') };
  }
  const canStrike = $derived(myTurn && strikeInfo().can);

  async function act(a: Action) {
    if (!g) return;
    touch();
    const err = apply(g, a);
    if (err) { say(err, true); return; }
    say('');
    sel = null;
    zoom = null;
    const fxDone = playFx();
    // o bot pode responder à minha carta com uma Reação
    if (g.pending && actor(g) === foe) {
      botBusy = true;
      try {
        await fxDone;
        await sleep(PACES[cfg.pace].think * 0.6);
        if (g?.pending) { apply(g, botAction($state.snapshot(g) as GameState, level)); await playFx(true); }
      } finally { botBusy = false; }
    }
    // o turno passou para o oponente: ele só começa depois que a faixa do turno terminar
    if (g && g.active !== me) { if (cfg.pace !== 'fast') await fxDone; void runBot(); }
  }

  // ───────────── limite de tempo: 30 s parado mostra o contador; mais 30 s e perde ─────────────
  const IDLE_MS = 30_000, ROPE_MS = 30_000;
  let idleStart = $state(Date.now());
  let now = $state(Date.now());
  let menuOpen = $state(false);
  let helpOpen = $state(false);
  /** É a minha vez de decidir algo (jogar, responder, escolher o nível ou a mão inicial). */
  const waitingMe = $derived(!!g && g.winner === undefined && !fxPlaying && (myTurn || awaiting || intro === 'hand'));
  const touch = () => { idleStart = Date.now(); };
  $effect(() => { if (waitingMe) touch(); });
  const clock = setInterval(() => {
    const t = Date.now();
    // com o menu, a ajuda ou o cemitério abertos, o tempo não corre
    if (menuOpen || helpOpen || graveOf !== null || !waitingMe) idleStart += t - now;
    now = t;
    if (cfg.timeLimit && waitingMe && g && t - idleStart > IDLE_MS + ROPE_MS) concede(true);
  }, 250);
  onDestroy(() => clearInterval(clock));
  /** Fração (1 → 0) do contador; null enquanto ele não aparece. */
  const rope = $derived(cfg.timeLimit && waitingMe && now - idleStart > IDLE_MS ? Math.max(0, 1 - (now - idleStart - IDLE_MS) / ROPE_MS) : null);
  let lastTick = 0;
  $effect(() => { if (rope === null) return; const sec = Math.ceil(rope * ROPE_MS / 1000); if (sec !== lastTick && sec <= 10) chip.sfx('select'); lastTick = sec; });

  /** Desistir (ou perder por tempo): o oponente vence. */
  function concede(timeout = false) {
    if (!g || g.winner !== undefined) return;
    menuOpen = false;
    apply(g, { t: 'concede', p: me, timeout });
    sel = null; intro = null; zoom = null;
    resumeBot?.(); resumeBot = null;
  }
  async function askConcede() {
    menuOpen = false;
    const r = await ui.confirm({ title: L('Desistir da batalha?', 'Concede the battle?'), text: L('Quem desiste perde a partida.', 'Whoever concedes loses the match.'), ok: L('Desistir', 'Concede'), danger: true });
    if (r === 'ok') concede();
  }

  /** Minha resposta a uma carta do oponente. */
  let resumeBot: (() => void) | null = null;
  async function respond(a: Action) {
    if (!g || !awaiting) return;
    touch();
    const err = apply(g, a);
    if (err) { say(err, true); return; }
    zoom = null;
    await playFx(true); // a carta do oponente resolve no ritmo dele
    resumeBot?.();
    resumeBot = null;
  }

  function clickCard(uid: string) {
    if (!g || !myTurn) return;
    touch();
    const why = cannotPlay(g, me, uid);
    if (why) { say(why, true); return; }
    const ref = g.players[me].hand.find((c) => c.uid === uid)!;
    const ch = choiceOf(g.defs[ref.cardId].game.effects);
    if (!ch) void act({ t: 'play', uid });
    else if (sel?.kind === 'card' && sel.uid === uid) { sel = null; say(''); }
    else { sel = { kind: 'card', uid }; chip.sfx('select'); ask(promptOf(g.defs[ref.cardId].game.effects)); }
  }

  function clickSlot(pos: Pos) {
    if (!g || !myTurn) return;
    touch();
    if (sel && isTarget(pos)) {
      const t = targets.find((x) => same(x, pos))!;
      if (sel.kind === 'card') {
        const ref = g.players[me].hand.find((c) => c.uid === sel!.uid)!;
        const ch = choiceOf(g.defs[ref.cardId].game.effects);
        void act(ch?.kind === 'slot' ? { t: 'play', uid: sel.uid, slot: pos } : { t: 'play', uid: sel.uid, target: t.col === -1 ? { ...pos, col: -1 } : pos });
      } else if (sel.kind === 'strike') void act({ t: 'strike', target: pos });
      else if (sel.kind === 'unit') void act({ t: 'attack', from: sel.pos, target: pos });
      else void act({ t: 'move', to: pos });
      return;
    }
    const u = unitAt(g, pos);
    if (pos.p === me && u?.isHero) {
      const info = strikeInfo();
      if (!info.can) { say(info.why, true); return; }
      sel = sel?.kind === 'strike' ? null : { kind: 'strike' };
      if (sel) ask('any'); else say('');
    } else if (pos.p === me && u) {
      if (u.exhausted) { say(L('Esta criatura já atacou ou acabou de entrar (ataca a partir do próximo turno).', 'This creature already attacked or just arrived (it attacks from next turn).'), true); return; }
      if (u.keys.includes('parede')) { say(L('Esta criatura não ataca.', "This creature can't attack."), true); return; }
      sel = { kind: 'unit', pos };
      ask('any');
    } else if (sel) cancel(L('Seleção cancelada (alvo fora de alcance).', 'Selection cancelled (target out of reach).'));
  }

  /** Botão "Golpear": o mesmo que clicar no herói. */
  function startStrike() {
    if (!g || !myTurn) return;
    const info = strikeInfo();
    if (!info.can) { say(info.why, true); return; }
    sel = sel?.kind === 'strike' ? null : { kind: 'strike' };
    if (sel) ask('any'); else say('');
  }

  /** Desiste da carta/golpe escolhido (Esc, botão direito, clicar fora ou o botão Cancelar). */
  function cancel(text = '') {
    if (!sel) return;
    sel = null;
    say(text || L('Seleção cancelada.', 'Selection cancelled.'));
  }
  function mainClick(e: MouseEvent) {
    // clique no fundo da mesa (fora de cartas, casas e botões)
    if (sel && !(e.target as HTMLElement).closest('button, .hc, .slot, .zc, .pile, .respond, .flog')) cancel();
  }

  function startMove() {
    if (!g || !myTurn || g.players[me].moved) return;
    sel = sel?.kind === 'move' ? null : { kind: 'move' };
    if (sel) ask('slot'); else say('');
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let alive = true;
  onDestroy(() => { alive = false; chip.music(null, 0.8); if (backUrl) URL.revokeObjectURL(backUrl); });

  async function runBot() {
    if (!g || botBusy) return;
    botBusy = true;
    try {
      let steps = 0;
      while (alive && g && g.active === foe && g.winner === undefined && steps++ < 40) {
        // espera as animações da jogada anterior terminarem, com uma pausa para dar para acompanhar
        await sleep(Math.max(0, fxUntil - Date.now()) + PACES[cfg.pace].think);
        if (!g || g.active !== foe) break;
        const a = botAction($state.snapshot(g) as GameState, level);
        if (a.t === 'end') await sleep(PACES[cfg.pace].end); // deixa ver a última carta antes de ela sair da mesa
        if (apply(g, a)) apply(g, { t: 'end' });
        await playFx(true);
        // o bot jogou uma carta e eu posso responder: espera a minha decisão
        if (g?.pending && actor(g) === me) await new Promise<void>((r) => { resumeBot = r; });
      }
      if (g && g.active === foe && g.winner === undefined && !g.pending) { apply(g, { t: 'end' }); await playFx(true); }
    } finally { botBusy = false; }
  }

  /** Esc fecha o que estiver aberto por cima (cenários, ajuda, menu, cemitério); senão, cancela a mira. */
  function key(e: KeyboardEvent) {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
    if (e.key !== 'Escape' && !settings.is(e, 'back')) {
      // atalhos da batalha (configuráveis): encerrar o turno, golpear, trocar posição e registro
      if (!inMatch || typing || e.ctrlKey || e.altKey || e.metaKey || menuOpen || helpOpen || intro) return;
      if (settings.is(e, 'log') && cfg.showLog) { logOpen = !logOpen; e.preventDefault(); return; }
      if (!myTurn) return;
      if (settings.is(e, 'endTurn')) { void act({ t: 'end' }); e.preventDefault(); }
      else if (settings.is(e, 'strike')) { startStrike(); e.preventDefault(); }
      else if (settings.is(e, 'swap') && !g?.heroOff) { startMove(); e.preventDefault(); }
      return;
    }
    if (ui.ask) return;
    // quem tratar o Esc marca o evento: assim o menu de pausa do jogo não abre por cima
    if (sceneOpen) sceneOpen = false;
    else if (helpOpen) helpOpen = false;
    else if (menuOpen) menuOpen = false;
    else if (graveOf !== null) { graveOf = null; zoom = null; }
    else if (sel) cancel();
    else if (inMatch) { say(''); menuOpen = true; }
    else return;
    e.preventDefault();
  }
  /** Partida em curso: o Esc abre o menu da partida (e não o menu de pausa geral). */
  const inMatch = $derived(step === 'play' && !!g);
  $effect(() => { shell.ownMenu = inMatch; });
  onDestroy(() => { shell.ownMenu = false; });

  // ───────────── mira: seta da origem até o alvo e destaque da área atingida ─────────────
  let hoverPos = $state<Pos | null>(null);
  let hoverCard = $state<string | null>(null);
  let mouse = $state({ x: 0, y: 0 });
  /** Onde o mouse está de verdade (sempre atualizado); a seta só passa a segui-lo quando há algo escolhido. */
  let lastMouse = { x: 0, y: 0 };
  // ao escolher uma carta/golpe, a seta nasce apontando para onde o mouse já está
  $effect(() => { if (sel) mouse = { ...lastMouse }; });
  type Arrow = { body: string; head: string; line: string; shadow: string; tone: 'free' | 'foe' | 'ally' | 'slot' };
  let arrows = $state<Arrow[]>([]);
  const slotEl = (pos: Pos) => document.querySelector<HTMLElement>(`[data-pos="${pos.p}-${pos.row}-${pos.col}"]`);

  /** Efeitos da carta escolhida (ou da carta sob o mouse, quando nada está escolhido). */
  const aimEffects = $derived.by((): Effect[] => {
    if (!g || !myTurn) return [];
    const uid = sel?.kind === 'card' ? sel.uid : !sel ? hoverCard : null;
    const ref = uid ? g.players[me].hand.find((c) => c.uid === uid) : undefined;
    return ref ? g.defs[ref.cardId].game.effects : [];
  });
  /** Fileira que o alvo sob o mouse representa (cartas que atingem uma fileira inteira). */
  const aimRow = $derived(sel?.kind === 'card' && hoverPos && isTarget(hoverPos) && choiceOf(aimEffects)?.kind === 'target' && (choiceOf(aimEffects) as { tgt: string }).tgt === 'enemyRow' ? hoverPos : null);
  /** Áreas que a carta atinge sem escolher alvo: "p-fileira" (fileira) ou "p" (campo inteiro). */
  const aoe = $derived.by(() => {
    const rows = new Set<string>(), fields = new Set<number>();
    for (const e of aimEffects) {
      if (!('tgt' in e)) continue;
      if (e.tgt === 'enemyFront') rows.add(`${foe}-0`);
      else if (e.tgt === 'allEnemies') fields.add(foe);
      else if (e.tgt === 'allAllies') fields.add(me);
    }
    if (aimRow) rows.add(`${aimRow.p}-${aimRow.row}`);
    return { rows, fields };
  });

  /** Curva elevada da origem ao alvo: corpo que engrossa, ponta e sombra no "chão". */
  function arrowGeom(x1: number, y1: number, x2: number, y2: number, tone: Arrow['tone']): Arrow | null {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist < 40) return null;
    // a curva abre para o lado perpendicular ao caminho: para cima quando o caminho é deitado, para fora quando é em pé
    const lift = Math.min(160, dist * 0.3);
    let nx = -(y2 - y1) / dist, ny = (x2 - x1) / dist;
    if (Math.abs(ny) > 0.35 ? ny > 0 : (nx > 0) === ((x1 + x2) / 2 < innerWidth * 0.42)) { nx = -nx; ny = -ny; }
    const cx = (x1 + x2) / 2 + nx * lift, cy = (y1 + y2) / 2 + ny * lift;
    const pt = (t: number) => ({ x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t * t * x2, y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t * t * y2 });
    const tan = (t: number) => { const dx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx), dy = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy), n = Math.hypot(dx, dy) || 1; return { x: dx / n, y: dy / n }; };
    const tb = Math.max(0.5, 1 - 30 / dist), N = 26;
    const L1: string[] = [], R1: string[] = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * tb, p = pt(t), d = tan(t), w = 2.5 + 8.5 * (i / N);
      L1.push(`${(p.x - d.y * w).toFixed(1)},${(p.y + d.x * w).toFixed(1)}`);
      R1.unshift(`${(p.x + d.y * w).toFixed(1)},${(p.y - d.x * w).toFixed(1)}`);
    }
    const b = pt(tb), d = tan(tb), hw = 19;
    return {
      tone,
      body: `M${L1.join(' L')} L${R1.join(' L')} Z`,
      head: `M${x2.toFixed(1)},${y2.toFixed(1)} L${(b.x - d.y * hw).toFixed(1)},${(b.y + d.x * hw).toFixed(1)} L${(b.x + d.x * 7).toFixed(1)},${(b.y + d.y * 7).toFixed(1)} L${(b.x + d.y * hw).toFixed(1)},${(b.y - d.x * hw).toFixed(1)} Z`,
      line: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
      shadow: `M${x1.toFixed(1)},${(y1 + 8).toFixed(1)} Q${((x1 + x2) / 2 + nx * lift * 0.25).toFixed(1)},${((y1 + y2) / 2 + ny * lift * 0.25 + 14).toFixed(1)} ${x2.toFixed(1)},${(y2 + 10).toFixed(1)}`,
    };
  }

  function updateArrows() {
    if (!g || !sel || !myTurn) { if (arrows.length) arrows = []; return; }
    const src = sel.kind === 'card' ? document.querySelector<HTMLElement>('.hc.sel') : slotEl(sel.kind === 'unit' ? sel.pos : heroPos(g, me));
    if (!src) { arrows = []; return; }
    const sr = src.getBoundingClientRect();
    const x1 = sr.left + sr.width / 2, y1 = sel.kind === 'card' ? sr.top + sr.height * 0.18 : sr.top + sr.height / 2;
    const locked = hoverPos && isTarget(hoverPos) ? hoverPos : null;
    if (!locked) { const a = arrowGeom(x1, y1, mouse.x, mouse.y, 'free'); arrows = a ? [a] : []; return; }
    const tone: Arrow['tone'] = !unitAt(g, locked) && !aimRow ? 'slot' : locked.p === me ? 'ally' : 'foe';
    // uma fileira inteira: uma seta para cada criatura atingida
    const ends = aimRow ? Array.from({ length: COLS }, (_, col) => ({ ...locked, col })).filter((q) => unitAt(g!, q)) : [locked];
    arrows = ends.map((q) => {
      const r = slotEl(q)?.getBoundingClientRect();
      return r ? arrowGeom(x1, y1, r.left + r.width / 2, r.top + r.height / 2, tone) : null;
    }).filter((a): a is Arrow => !!a);
  }
  $effect(() => { void sel; void hoverPos; void mouse.x; void mouse.y; void myTurn; void tick().then(updateArrows); });

  // ───────────── animações: cartas voando entre grimório, mão, faixa e cemitério ─────────────
  type Fly = { key: string; from?: string; to?: string; delay?: number };
  const [send, receive] = crossfade({
    duration: 420,
    easing: cubicOut,
    fallback(node, params, intro) {
      const p = params as unknown as Fly;
      const q = intro ? p.from : p.to;
      const el = q ? document.querySelector(q) : null;
      if (!el) return { duration: 220, css: (t: number) => `opacity:${t}` };
      const a = el.getBoundingClientRect(), b = node.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
      const k = Math.max(0.3, a.height / Math.max(1, b.height));
      return {
        duration: 520, delay: p.delay ?? 0, easing: cubicOut,
        css: (t: number, u: number) => `transform: translate(${dx * u}px, ${dy * u}px) scale(${1 - (1 - k) * u}); opacity: ${intro ? Math.min(1, t * 3) : 1 - u * 0.2}`,
      };
    },
  });
  const fly = (key: string, extra: Omit<Fly, 'key'> = {}) => ({ key, ...extra }) as unknown as { key: string };
  /** Criaturas: quando mudam de lugar (empurrão, mover), deslizam até o lugar novo. */
  const [sendU, recvU] = crossfade({ duration: 450, easing: cubicOut, fallback: (node, _p, intro) => (intro ? scale(node, { duration: 300, start: 0.6 }) : fade(node, { duration: 300 })) });

  // ───────────── efeitos visuais (dano subindo, ataques, começo de turno…) ─────────────
  type Float = { key: number; x: number; y: number; text: string; sub?: string; cls: string; big?: boolean };
  let floats = $state<Float[]>([]);
  let banner = $state<{ key: number; title: string; sub: string; mine: boolean } | null>(null);
  let shown = $state<{ key: number; cardId: string; label: string; cls: string } | null>(null);
  let levelFx = $state<{ key: number; name: string; level: number; mine: boolean } | null>(null);
  let caption = $state('');
  let fxEl = $state<HTMLDivElement>();
  let lastFx = 0, fxKey = 0, fxUntil = 0, lastLine = '';
  /** Animações em andamento (a escolha de nível espera elas terminarem). */
  let fxPlaying = $state(0);
  const VIA: Record<Via | 'none', [string, string]> = { melee: ['corpo a corpo', 'melee'], ranged: ['à distância', 'ranged'], magic: ['mágico', 'magic'], none: ['', ''] };

  const elOf = (id: string) => document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(id)}"]`);
  const sideOfHero = (id: string): 0 | 1 | null => (id.startsWith('hero0-') ? 0 : id.startsWith('hero1-') ? 1 : null);
  const idsOf = (e: Fx): string[] => ('id' in e ? [e.id] : e.k === 'attack' ? [e.from, e.to] : []);

  function float(r: DOMRect | null | undefined, text: string, cls: string, sub?: string, big = false) {
    if (!r) return;
    const key = ++fxKey;
    floats.push({ key, x: r.left + r.width / 2, y: r.top + r.height * 0.4, text, sub, cls, big });
    setTimeout(() => { floats = floats.filter((f) => f.key !== key); }, 2100);
  }

  /** A figura dentro de uma casa (o boneco; sem boneco, o bloco do ícone) e a transformação que ela já tem. */
  function figureOf(slot: HTMLElement | null): { el: HTMLElement; base: string } | null {
    const doll = slot?.querySelector<HTMLElement>('.doll');
    if (doll) return { el: doll, base: 'translateX(-50%) ' };
    const unit = slot?.querySelector<HTMLElement>('.unit');
    return unit ? { el: unit, base: '' } : null;
  }

  /** Levou dano/cura: a casa pisca na cor e só a figura treme (o piso fica parado). */
  function hitFlash(el: HTMLElement | null, color: string) {
    el?.animate([{ boxShadow: `inset 0 0 0 999px ${color}` }, { boxShadow: 'inset 0 0 0 999px transparent' }], { duration: 520, easing: 'ease-out' });
    const fig = el?.classList.contains('slot') ? figureOf(el) : null;
    const who = fig?.el ?? (el?.classList.contains('slot') ? null : el), b = fig?.base ?? '';
    who?.animate([{ transform: `${b}translateX(0)` }, { transform: `${b}translateX(-7px)`, offset: 0.2 }, { transform: `${b}translateX(6px)`, offset: 0.45 }, { transform: `${b}translateX(-3px)`, offset: 0.7 }, { transform: `${b}translateX(0)` }], { duration: 520, easing: 'ease-out' });
  }

  /** Golpe corpo a corpo: a figura avança até o alvo e volta (a casa não sai do lugar). À distância/magia: um projétil voa. */
  function attackAnim(from: DOMRect, to: DOMRect, fromEl: HTMLElement | null, via: Via) {
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    if (via === 'melee') {
      const fig = figureOf(fromEl);
      if (fromEl && fig) {
        // a casa sobe na pilha só para a figura passar por cima das vizinhas
        fromEl.style.zIndex = '6';
        fromEl.style.overflow = 'visible';
        fig.el.animate([{ transform: `${fig.base}translate(0, 0)` }, { transform: `${fig.base}translate(${dx * 0.55}px, ${dy * 0.55}px) scale(1.08)`, offset: 0.5 }, { transform: `${fig.base}translate(0, 0)` }], { duration: 520, easing: 'ease-in-out' }).onfinish = () => { fromEl.style.zIndex = ''; fromEl.style.overflow = ''; };
      }
      return;
    }
    if (!fxEl) return;
    const b = document.createElement('div');
    b.className = `bolt ${via}`;
    b.style.left = `${from.left + from.width / 2}px`;
    b.style.top = `${from.top + from.height / 2}px`;
    fxEl.appendChild(b);
    const rot = `rotate(${Math.atan2(dy, dx)}rad)`;
    b.animate([{ transform: `translate(-50%, -50%) ${rot} scale(.6)` }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) ${rot} scale(1.15)` }], { duration: 460, easing: 'ease-in' }).onfinish = () => b.remove();
  }

  // ───────────── boneco do herói: a animação de cada lado ─────────────
  let heroAnim = $state<[Anim, Anim]>(['idle', 'idle']);
  const avatarOf = (p: 0 | 1) => (g ? characterOf(g.players[p].hero.id)?.avatar : undefined);
  /** Toca uma animação do boneco (ele volta a ficar parado quando ela termina). */
  function animate(p: 0 | 1, a: Anim) { if (avatarOf(p)) heroAnim[p] = a; }
  function animEnd(p: 0 | 1) { if (heroAnim[p] !== 'hurt') heroAnim[p] = 'idle'; }
  /** Bonecos das criaturas: a animação em curso de cada uma (sem entrada = parada). */
  let unitAnim = $state<Record<string, Anim>>({});

  const FX_MS: Partial<Record<Fx['k'], number>> = { attack: 420, turn: 1000, xp: 120, gain: 200, level: 1300, react: 1200, countered: 900 };

  /** Mostra o que aconteceu desde a última vez, em sequência. `foeAct`: é uma jogada do oponente, no ritmo da velocidade escolhida. */
  async function playFx(foeAct = false): Promise<void> {
    if (!g) return;
    const list = g.fx.filter((e) => e.n > lastFx).map((e) => ({ ...e })) as Fx[];
    if (!list.length) return;
    lastFx = list[list.length - 1].n;
    // legenda: o que o registro escreveu de novo (fica no meio da mesa enquanto as animações passam)
    const from = lastLine ? g.log.lastIndexOf(lastLine) + 1 : 0;
    const lines = g.log.slice(from).filter((l) => !l.startsWith('—') && !l.includes('XP ('));
    lastLine = g.log[g.log.length - 1] ?? '';
    const pc = PACES[cfg.pace];
    if (lines.length) { caption = lines.slice(-2).join('  ·  '); const c = caption; setTimeout(() => { if (caption === c) caption = ''; }, 4200 * (foeAct ? pc.k : 1)); }
    // onde cada criatura estava antes da tela mudar (as derrotadas somem)
    const before = new Map<string, DOMRect>();
    for (const e of list) for (const id of idsOf(e)) { const el = elOf(id); if (el) before.set(id, el.getBoundingClientRect()); }
    await tick();
    const rectOf = (id: string) => elOf(id)?.getBoundingClientRect() ?? before.get(id);
    let t = 0, k = foeAct ? pc.k : 1;
    for (const e of list) {
      // o meu turno começou: daqui em diante segue no ritmo normal
      if (e.k === 'turn' && e.p === me) k = 1;
      const at = t;
      setTimeout(() => show(e, rectOf, before), at);
      t += e.k === 'play' ? (e.p !== me ? pc.card : 150) : (FX_MS[e.k] ?? 380) * k;
    }
    fxUntil = Date.now() + t + 400;
    fxPlaying++;
    try { await sleep(t + 300); } finally { fxPlaying--; }
  }

  function showCard(cardId: string, label: string, cls = '', ms = 2600) {
    shown = { key: ++fxKey, cardId, label, cls };
    const k = shown.key;
    setTimeout(() => { if (shown?.key === k) shown = null; }, ms);
  }

  function show(e: Fx, rectOf: (id: string) => DOMRect | undefined, before: Map<string, DOMRect>) {
    if (!g) return;
    switch (e.k) {
      case 'turn': {
        chip.sfx('turn');
        const mine = e.p === me;
        banner = { key: ++fxKey, mine, title: mine ? L('Seu turno', 'Your turn') : L(`Turno de ${g.players[e.p].hero.name}`, `${g.players[e.p].hero.name}'s turn`), sub: L(`Turno ${e.turn}`, `Turn ${e.turn}`) };
        const k = banner.key;
        setTimeout(() => { if (banner?.key === k) banner = null; }, 1400);
        break;
      }
      // a carta do oponente aparece grande ao lado (se eu posso responder, ela já está na janela de resposta)
      case 'play':
        chip.sfx('card');
        if (e.p !== me && !(g.pending && actor(g) === me)) showCard(e.cardId, `${g.players[e.p].hero.name} ${L('usa', 'uses')}`, '', PACES[cfg.pace].shown);
        // cartas que não são um golpe: o boneco conjura (o golpe tem a sua própria animação, logo depois)
        if (!g.defs[e.cardId]?.game.effects.some((x) => x.k === 'strike')) animate(e.p, 'spellcast');
        break;
      case 'react': chip.sfx('card'); animate(e.p, 'spellcast'); showCard(e.cardId, e.p === me ? L('Você reage com', 'You react with') : `${g.players[e.p].hero.name} ${L('reage com', 'reacts with')}`, 'react', 2200); break;
      case 'countered':
        chip.sfx('counter');
        if (e.cardId) showCard(e.cardId, L('Anulada!', 'Countered!'), 'countered', 1800);
        else { const hu = heroOf(other(e.p)); float(hu ? rectOf(hu.id) : undefined, L('Ataque anulado!', 'Attack countered!'), 'ward', undefined, true); }
        break;
      case 'attack': {
        const a = before.get(e.from) ?? rectOf(e.from), b = rectOf(e.to);
        if (a && b) attackAnim(a, b, elOf(e.from), e.via);
        chip.sfx(e.via === 'melee' ? 'slash' : e.via === 'ranged' ? 'arrow' : 'magic');
        const hp = sideOfHero(e.from), av = hp !== null ? avatarOf(hp) : undefined;
        // o boneco usa o ataque da arma que segura; sem arma, o tipo do golpe decide
        if (hp !== null && av) animate(hp, weaponAnim(av, e.via === 'melee' ? 'slash' : e.via === 'ranged' ? 'shoot' : 'spellcast'));
        if (hp === null) { const ic = g.players.flatMap((pl) => pl.board.flat()).find((x) => x?.id === e.from)?.icon; if (hasFigure(ic)) unitAnim[e.from] = creatureOf(ic)?.attack ?? 'slash'; }
        break;
      }
      case 'dmg': {
        const sub = [e.armor ? (e.via === 'magic' ? L(`resistência absorveu ${e.armor}`, `resistance absorbed ${e.armor}`) : L(`armadura absorveu ${e.armor}`, `armor absorbed ${e.armor}`)) : '', e.marked ? L('+1 Marcado', '+1 Marked') : '', e.armor ? '' : L(VIA[e.via][0], VIA[e.via][1])].filter(Boolean).join(' · ');
        chip.sfx('hit');
        float(rectOf(e.id) ?? before.get(e.id), `−${e.amount}`, 'dmg', sub, true);
        hitFlash(elOf(e.id), 'rgb(200 40 30 / .45)');
        const hp = sideOfHero(e.id);
        if (hp !== null) hitFlash(document.getElementById(`hp-${hp}`), 'rgb(200 40 30 / .35)');
        break;
      }
      case 'blocked': chip.sfx('block'); float(rectOf(e.id), L('Bloqueado', 'Blocked'), 'ward', L('a Proteção anulou o dano', 'the ward prevented it')); hitFlash(elOf(e.id), 'rgb(90 150 255 / .4)'); break;
      case 'heal': chip.sfx('heal'); float(rectOf(e.id), `+${e.amount}`, 'heal', L('cura', 'heal'), true); hitFlash(elOf(e.id), 'rgb(60 190 110 / .35)'); break;
      case 'status': {
        const m = {
          afflict: [L('Afligido', 'Afflicted'), L('−1 PV por turno', '−1 HP per turn'), 'curse'],
          mark: [L('Marcado', 'Marked'), L('+1 de todo dano', '+1 from all damage'), 'curse'],
          ward: [L('Protegido', 'Warded'), L('anula o próximo dano', 'prevents next damage'), 'ward'],
          push: [L('Empurrado!', 'Pushed!'), L('mudou de fileira', 'changed rows'), 'info'],
          cleanse: [L('Curado', 'Cleansed'), L('sai Aflição e Marca', 'Affliction and Mark removed'), 'heal'],
        }[e.s];
        chip.sfx(e.s === 'push' ? 'push' : e.s === 'ward' ? 'ward' : e.s === 'cleanse' ? 'heal' : 'curse');
        float(rectOf(e.id), m[0], m[2], m[1] || undefined, e.s === 'push');
        if (e.s === 'push') elOf(e.id)?.animate([{ boxShadow: '0 0 0 3px #7fb0ff, 0 0 26px #7fb0ff' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 });
        break;
      }
      case 'death': { chip.sfx('death'); float(before.get(e.id) ?? rectOf(e.id), L('Derrotado', 'Defeated'), 'death', undefined, true); const hp = sideOfHero(e.id); if (hp !== null) animate(hp, 'hurt'); break; }
      case 'summon': { chip.sfx('summon'); const el = elOf(e.id); el?.animate([{ boxShadow: '0 0 0 3px #f0c45a, 0 0 30px #f0c45a' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 800 }); break; }
      case 'xp': {
        const why = { turn: L('novo turno', 'new turn'), kill: L('criatura derrotada', 'creature defeated'), hit: L('feriu o herói', 'hit the hero') }[e.why];
        float(document.getElementById(`xp-${e.p}`)?.getBoundingClientRect(), `+${e.amount} XP`, 'xp', why);
        break;
      }
      case 'level': {
        chip.sfx('levelup');
        const pl = g.players[e.p];
        levelFx = { key: ++fxKey, name: pl.hero.name, level: pl.level + pl.pendingLevels, mine: e.p === me };
        const k = levelFx.key;
        setTimeout(() => { if (levelFx?.key === k) levelFx = null; }, 1700);
        const hu = heroOf(e.p);
        if (hu) elOf(hu.id)?.animate([{ boxShadow: '0 0 0 4px #f0c45a, 0 0 50px 10px #f0c45a' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1400 });
        break;
      }
      case 'gain': float(document.getElementById(`res-${e.p}-${e.res}`)?.getBoundingClientRect(), `+${e.amount} ${e.res === 'vigor' ? 'Vigor' : 'Mana'}`, e.res); break;
    }
  }

  // ───────────── dicas ao passar o mouse ─────────────
  let tipBox = $state<{ head: string; text: string; x: number; y: number; up: boolean } | null>(null);
  /** `use:tip={'Título: explicação'}` — mostra uma caixinha de explicação ao passar o mouse. */
  function tip(node: HTMLElement, text: string) {
    let t = text;
    const enter = () => {
      if (!t) return;
      const r = node.getBoundingClientRect();
      const up = r.top > innerHeight / 2;
      const i = t.indexOf(':');
      const [head, body] = i > 0 && i < 40 ? [t.slice(0, i), t.slice(i + 1).trim()] : ['', t];
      tipBox = { head, text: body, x: Math.min(Math.max(150, r.left + r.width / 2), innerWidth - 150), y: up ? r.top - 8 : r.bottom + 8, up };
    };
    const leave = () => { tipBox = null; };
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mouseleave', leave);
    return { update(v: string) { t = v; }, destroy() { node.removeEventListener('mouseenter', enter); node.removeEventListener('mouseleave', leave); leave(); } };
  }

  // ───────────── zoom (a carta cresce ao passar o mouse) ─────────────
  let zoom = $state<{ id: string; x: number; y: number; up: boolean } | null>(null);
  const ZW = 340;
  /** Mão inicial: a carta cresce no próprio lugar até dar para ler, sem sair da tela. */
  function growInPlace(e: Event) {
    const el = e.currentTarget as HTMLElement;
    const w = el.offsetWidth, h = el.offsetHeight;
    // posição sem a transformação em curso (a carta pode estar no meio de uma animação)
    const box = (el.offsetParent ?? el.parentElement!).getBoundingClientRect();
    const cx = box.left + el.offsetLeft + w / 2, cy = box.top + el.offsetTop + h / 2;
    const k = Math.max(1.04, Math.min(400 / w, (innerHeight - 24) / h));
    const fit = (c: number, half: number, max: number) => Math.min(max - 12 - half, Math.max(12 + half, c)) - c;
    el.style.setProperty('--k', k.toFixed(3));
    el.style.setProperty('--tx', `${fit(cx, (w * k) / 2, innerWidth).toFixed(1)}px`);
    el.style.setProperty('--ty', `${fit(cy, (h * k) / 2, innerHeight).toFixed(1)}px`);
  }
  function hover(id: string | undefined, e: Event) {
    if (!id || !app.cards[id]) { zoom = null; return; }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const zh = ZW * 1.4;
    // ao lado da carta quando não cabe em cima nem embaixo (ex.: lista do cemitério)
    const up = r.top > innerHeight / 2;
    const fits = up ? r.top > zh + 12 : innerHeight - r.bottom > zh + 12;
    let x = Math.min(Math.max(12, r.left + r.width / 2 - ZW / 2), innerWidth - ZW - 12);
    let y = up ? r.bottom : r.top;
    if (!fits) {
      x = r.right + ZW + 16 < innerWidth ? r.right + 12 : Math.max(12, r.left - ZW - 12);
      y = up ? Math.min(innerHeight - 12, Math.max(zh + 12, r.bottom)) : Math.max(12, Math.min(innerHeight - zh - 12, r.top));
    }
    zoom = { id, x, y, up };
  }

  // ───────────── cemitério e registro ─────────────
  let graveOf = $state<0 | 1 | null>(null);
  let logOpen = $state(false);
  let logEl = $state<HTMLDivElement>();
  $effect(() => { void g?.log.length; void logOpen; if (logEl) logEl.scrollTop = logEl.scrollHeight; });

  // ───────────── apresentação ─────────────
  const heroOf = (p: 0 | 1) => (g ? unitAt(g, heroPos(g, p)) : null);
  const life = (u: Unit) => u.def - u.dmg;
  const cardOf = (r: CardRef) => app.cards[r.cardId];
  /** Fileiras de cima para baixo: o oponente mostra a retaguarda em cima; você, a frente em cima. */
  const rowsFor = (p: 0 | 1) => (p === me ? [0, 1] : [1, 0]);
  /** Dano do golpe do herói agora (arma + postura + bônus do turno). */
  const strikeDmg = (p: 0 | 1) => { const pl = g!.players[p]; return pl.hero.weapon.dmg + (pl.stance?.mods.strike ?? 0) + (heroOf(p)?.buff ?? 0); };
  const P0 = () => g!.players[me];
  /** Número de dano mostrado na carta da mão (já com a arma e a postura). */
  function dmgBadge(r: CardRef): string | null {
    for (const e of g?.defs[r.cardId]?.game.effects ?? []) {
      if (e.k === 'strike') { const n = strikeDmg(me) - P0().hero.weapon.dmg + e.bonus; return e.times && e.times > 1 ? `${n}×${e.times}` : `${n}`; }
      if (e.k === 'dmg') return `${e.n}`;
    }
    return null;
  }
  /** Efeitos e estados ativos de uma figura (aparecem ao lado do boneco enquanto durarem). */
  type Status = { id: string; icon: typeof Shield; tone: 'good' | 'bad' | 'trait' | 'dim'; text?: string; tip: string };
  function statusOf(u: Unit, p: 0 | 1): Status[] {
    const out: Status[] = [];
    const st = u.isHero ? g!.players[p].stance : undefined;
    if (u.warded) out.push({ id: 'ward', icon: Shield, tone: 'good', tip: L('Protegido: o próximo dano que sofrer é anulado (a proteção some depois disso).', 'Warded: the next damage it takes is prevented (the ward is then gone).') });
    if (u.buff > 0) out.push({ id: 'buff', icon: TrendingUp, tone: 'good', text: `+${u.buff}`, tip: L(`Fortalecido: +${u.buff} de ataque até o fim deste turno.`, `Empowered: +${u.buff} attack until the end of this turn.`) });
    if (u.afflicted) out.push({ id: 'afflict', icon: Droplet, tone: 'bad', tip: L('Afligido: sofre 1 de dano no começo de cada turno do dono, até ser curado.', 'Afflicted: takes 1 damage at the start of each of its owner’s turns, until healed.') });
    if (u.marked) out.push({ id: 'mark', icon: Crosshair, tone: 'bad', tip: L('Marcado: sofre +1 de todo dano, até ser curado.', 'Marked: takes +1 from all damage, until healed.') });
    if (st?.cardId) {
      const m = st.mods;
      const what = [m.strike ? L(`golpe +${m.strike}`, `strike +${m.strike}`) : '', m.strikeMagic ? L('golpe mágico', 'magic strike') : '', m.strikeAfflicts ? L('golpe aflige', 'strike afflicts') : '', m.strikeHeals ? L(`golpe cura ${m.strikeHeals}`, `strike heals ${m.strikeHeals}`) : '', m.guard ? L('Guarda', 'Guard') : ''].filter(Boolean).join(', ');
      out.push({ id: 'stance', icon: Sparkles, tone: 'good', tip: L(`Postura — ${app.cards[st.cardId]?.text[app.lang].name ?? ''}: ${what || 'ativa'}. Fica até outra postura entrar.`, `Stance — ${app.cards[st.cardId]?.text[app.lang].name ?? ''}: ${what || 'active'}. Lasts until another stance replaces it.`) });
    }
    if (u.keys.includes('guarda') || st?.mods.guard) out.push({ id: 'guard', icon: Users, tone: 'trait', tip: L('Guarda: enquanto houver alguém com Guarda, os golpes corpo a corpo inimigos precisam mirar nele.', 'Guard: while it stands, enemy melee attacks must target it.') });
    if (u.keys.includes('rapido') && u.exhausted === false && !u.isHero) out.push({ id: 'swift', icon: Zap, tone: 'trait', tip: L('Rápido: pode atacar no turno em que entra.', 'Swift: can attack the turn it arrives.') });
    if (!u.isHero && u.exhausted && p === me && g!.active === me && !u.keys.includes('parede')) out.push({ id: 'done', icon: Moon, tone: 'dim', tip: L('Já agiu: esta criatura atacou ou acabou de entrar. Volta a atacar no seu próximo turno.', 'Done: this creature attacked or just arrived. It attacks again on your next turn.') });
    return out;
  }
  const weaponIcon = (h: HeroDef) => (h.weapon.via === 'melee' ? 'broadsword' : h.weapon.via === 'ranged' ? 'bow-arrow' : 'wizard-staff');
  /** Símbolo de uma peça: o da própria carta de equipamento; sem ele, o do espaço. */
  const gearIcon = (it: GearItem, h: HeroDef) => it.icon ?? ({ weapon: weaponIcon(h), offhand: 'round-shield', head: 'warlord-helmet', chest: 'chest-armor', hands: 'gauntlet', legs: 'leg-armor', feet: 'boot-stomp', trinket: 'magic-swirl', ring: 'skull-ring' }[it.slot]);
  const pips = (cur: number, max: number) => Array.from({ length: Math.max(cur, max) }, (_, i) => (i < cur ? (i >= max ? 'extra' : 'on') : 'off'));
  const pct = (n: number, max: number) => `${Math.min(100, Math.round((n / max) * 100))}%`;
</script>

<svelte:window onkeydown={key} />

{#if step === 'heroes' || (!g && step !== 'place')}
  <!-- ───────────── seleção de heróis ───────────── -->
  <div class="pick-wrap">
  <ScreenBar title={L('Batalha solo', 'Solo battle')} kicker={L('Modo batalha', 'Battle mode')} back={L('Modos', 'Modes')} onback={() => router.go('/batalha')} />
  <div class="pick-screen" style="--a:{myHero ? colorOf(myHero) : '#555'}; --b:{botHero ? colorOf(botHero) : '#555'}">
    {#if !chars.length || !myChar || !botChar || !myHero || !botHero}
      <div class="nohero">
        <UserRound size={44} />
        <h2>{L('Nenhum herói pronto para jogar', 'No hero ready to play')}</h2>
        <p class="muted">{L('Crie um herói em Criação de personagem para poder batalhar.', 'Create a hero in Character creation to be able to battle.')}</p>
        <button class="btn primary" onclick={() => router.go('/heroi')}>{L('Criar um herói', 'Create a hero')}</button>
      </div>
    {:else}
      {#snippet side(mine: boolean)}
        {@const c = (mine ? myChar : botChar)!}
        {@const h = (mine ? myHero : botHero)!}
        <section class="vs-side" class:right={!mine} style="--c:{colorOf(h)}">
          <span class="vs-tag">{mine ? L('Você', 'You') : L('Oponente (bot)', 'Opponent (bot)')}</span>
          <div class="showcase">
            <div class="sc-pic">
              {#key c.id}<span in:fade={{ duration: 220 }}><HeroPortrait hero={c} size={300} /></span>{/key}
              <button class="sc-edit" onclick={() => editHero(c.id)} title={L('Editar este herói', 'Edit this hero')}><Pencil size={14} /> {L('Editar', 'Edit')}</button>
            </div>
            <div class="sc-info">
              <h2 class="display">{h.name}</h2>
              <span class="sc-class">{L(h.className[0], h.className[1])}</span>
              <div class="sc-bars">
                <span><Heart size={13} /> {L('Vida', 'Life')}</span><i><b style="width:{pct(h.maxHp, 45)}; --k:#d4503f"></b></i><em>{h.maxHp}</em>
                <span><Swords size={13} /> {L('Golpe', 'Strike')}</span><i><b style="width:{pct(h.weapon.dmg, 8)}; --k:#f0c45a"></b></i><em>{h.weapon.dmg}</em>
                <span><Shield size={13} /> {L('Armadura', 'Armor')}</span><i><b style="width:{pct(h.armor, 4)}; --k:#a9adbb"></b></i><em>{h.armor}</em>
                <span><Sparkles size={13} /> {L('Resist. mágica', 'Magic resist')}</span><i><b style="width:{pct(h.resist, 4)}; --k:#9a7bff"></b></i><em>{h.resist}</em>
              </div>
              <div class="sc-res">
                <span class="vig"><Glyph id="gauntlet" size={15} color="currentColor" /> Vigor {#each Array(3) as _, i}<i class="pip" class:on={i < h.vigor}></i>{/each}</span>
                <span class="man"><Glyph id="crystal-cluster" size={15} color="currentColor" /> Mana {#each Array(3) as _, i}<i class="pip" class:on={i < h.mana}></i>{/each}</span>
              </div>
              <div class="sc-attrs">{#each ATTRS as a}<i class:hi={h.attrs[a] >= 3}>{L(ATTR_NAMES[a][0], ATTR_NAMES[a][1])} <b>{h.attrs[a]}</b></i>{/each}</div>
              <div class="sc-gear">
                {#each h.gear as it}
                  <span title="{L(it.name[0], it.name[1])} — {L(it.info[0], it.info[1])}"><Glyph id={gearIcon(it, h)} size={17} color="#f3ead6" /></span>
                {/each}
                <small>{L(h.weapon.name[0], h.weapon.name[1])} · {L(VIA[h.weapon.via][0], VIA[h.weapon.via][1])}</small>
              </div>
              <span class="sc-deck" class:bad={deckCount(c) === 0}>{app.deck(h.deckId)?.name[app.lang] ?? L('sem deck', 'no deck')} · {deckCount(c)} {L('cartas', 'cards')}</span>
            </div>
          </div>
          <div class="roster">
            {#each chars as o (o.id)}
              <div class="rost" class:on={o.id === c.id} style="--c:{colorOf(heroDef(o))}">
                <button class="rpick" onclick={() => (mine ? (myId = o.id) : (botId = o.id))} title={o.name}>
                  <HeroPortrait hero={o} size={64} />
                  <span>{o.name}</span>
                </button>
                <button class="redit" onclick={() => editHero(o.id)} title={L('Editar herói', 'Edit hero')}><Pencil size={11} /></button>
              </div>
            {/each}
          </div>
        </section>
      {/snippet}

      <div class="vs-wrap">
        {@render side(true)}
        <div class="vs-mid"><span class="vs">VS</span></div>
        {@render side(false)}
      </div>
      {#snippet paceOpts()}
        <option value="slow">{L('Lento', 'Slow')}</option><option value="normal">{L('Normal', 'Normal')}</option><option value="fast">{L('Rápido', 'Fast')}</option>
      {/snippet}
      {#snippet opt(on: boolean, set: (v: boolean) => void, title: string, desc: string, sub = false)}
        <label class="opt" class:on class:sub>
          <input type="checkbox" checked={on} onchange={(e) => set((e.currentTarget as HTMLInputElement).checked)} />
          <span><b>{title}</b><small>{desc}</small></span>
        </label>
      {/snippet}
      <footer class="vs-foot">
        <div class="opt-grid">
          {@render opt(heroOff, (v) => (heroOff = v), L('Herói fora do campo', 'Hero off the board'), L('não ocupa um lugar no campo e pode golpear qualquer fileira ou o herói inimigo', 'takes no slot on the field and can strike any row or the enemy hero'))}
          {#if heroOff}
            {@render opt(heroOffFront, (v) => (heroOffFront = v), L('Exigir a frente vazia', 'Require an empty front'), L('o golpe corpo a corpo só passa da frente inimiga se ela estiver vazia', 'the melee strike only goes past the enemy front when it is empty'), true)}
          {/if}
          {@render opt(limit, (v) => (limit = v), L('Modo B', 'Mode B'), L('no máximo 3 habilidades por turno', 'at most 3 abilities per turn'))}
          {@render opt(cfg.timeLimit, (v) => (cfg.timeLimit = v), L('Limite de tempo', 'Time limit'), L('30 s parado mostra o contador; mais 30 s e você perde', '30 s idle shows the countdown; 30 s more and you lose'))}
          {@render opt(cfg.showLog, (v) => (cfg.showLog = v), L('Registro da batalha', 'Battle log'), L('botão flutuante com tudo o que aconteceu', 'floating button with everything that happened'))}
        </div>
        <div class="foot-side">
          <button class="scene-btn" onclick={() => (sceneOpen = true)}>
            <span class="scene-thumb" class:rand={scenePick === 'random'} style={scenePick !== 'random' && sceneOf(scenePick).img ? `background-image:url(${sceneOf(scenePick).img})` : ''}>
              {#if scenePick === 'random'}<Dices size={22} />{:else if !sceneOf(scenePick).img}<MapIcon size={20} />{/if}</span>
            <span class="scene-tx"><small>{L('Selecionar campo de batalha', 'Choose battlefield')}</small><b>{scenePick === 'random' ? L('Aleatório', 'Random') : L(sceneOf(scenePick).name[0], sceneOf(scenePick).name[1])}</b></span>
            <ChevronDown size={16} />
          </button>
          <label class="starter"><small>{L('Quem começa', 'Who starts')}</small>
            <select class="select-in" bind:value={starter}><option value="sorteio">{L('Sorteio', 'Random')}</option><option value="eu">{L('Você', 'You')}</option><option value="bot">Bot</option></select></label>
          <label class="starter" use:tip={L(`Dificuldade do oponente: ${DIFFICULTIES.find((d) => d.id === cfg.difficulty)!.info[0]}${EDGE[cfg.difficulty] ? ` (+${EDGE[cfg.difficulty]!.hp} de vida e ${EDGE[cfg.difficulty]!.cards} carta a mais na mão inicial)` : ''}`, `Opponent difficulty: ${DIFFICULTIES.find((d) => d.id === cfg.difficulty)!.info[1]}${EDGE[cfg.difficulty] ? ` (+${EDGE[cfg.difficulty]!.hp} life and ${EDGE[cfg.difficulty]!.cards} extra card in the opening hand)` : ''}`)}><small>{L('Dificuldade', 'Difficulty')}</small>
            <select class="select-in" bind:value={cfg.difficulty}>{#each DIFFICULTIES as d (d.id)}<option value={d.id}>{L(d.name[0], d.name[1])}</option>{/each}</select></label>
          <label class="starter" use:tip={L('Velocidade de jogo: quanto tempo o oponente dá para você ler cada carta e ver cada efeito antes da próxima jogada', 'Game speed: how long the opponent gives you to read each card and see each effect before the next play')}><small>{L('Velocidade', 'Speed')}</small>
            <select class="select-in" bind:value={cfg.pace}>{@render paceOpts()}</select></label>
        </div>
        <div class="foot-go">
          <MusicPlayer />
          <button class="btn primary big" disabled={!ready} onclick={toPlace}><Swords size={18} /> {heroOff ? L('Começar partida', 'Start match') : L('Continuar', 'Continue')}</button>
        </div>
      </footer>
      {#if sceneOpen}
        <div class="scene-modal" onclick={() => (sceneOpen = false)} role="presentation" transition:fade={{ duration: 140 }}>
          <!-- svelte-ignore a11y_click_events_have_key_events (o Esc fecha, pela janela) -->
          <div class="scene-box" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1" in:scale={{ duration: 200, start: 0.94 }}>
            <header><div><small>{L('Onde a batalha acontece', 'Where the battle takes place')}</small><h2 class="display">{L('Campo de batalha', 'Battlefield')}</h2></div>
              <button class="btn sm ghost icon" onclick={() => (sceneOpen = false)}><X size={16} /></button></header>
            <div class="scene-grid">
              <button class="scene-card rand" class:on={scenePick === 'random'} onclick={() => { scenePick = 'random'; sceneOpen = false; }}>
                <span class="sc-img mosaic">{#each SCENES.filter((x) => x.img).slice(0, 4) as x}<i style="background-image:url({x.img})"></i>{/each}<Dices size={38} /></span>
                <b>{L('Aleatório', 'Random')}</b><small>{L('um cenário sorteado a cada partida', 'a random scene each match')}</small>
              </button>
              {#each SCENES as sc (sc.id)}
                <button class="scene-card" class:on={scenePick === sc.id} onclick={() => { scenePick = sc.id; sceneOpen = false; }}>
                  <span class="sc-img" style={sc.img ? `background-image:url(${sc.img})` : ''}>
                    <i class="sc-floor" style="background-image:url({floorTile(sc, 7)})"></i>
                    {#if scenePick === sc.id}<span class="sc-check"><Check size={15} /></span>{/if}
                  </span>
                  <b>{L(sc.name[0], sc.name[1])}</b>
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
  </div>
{:else if step === 'place' && myHero && botHero}
  <!-- posicionamento: mesma estrutura da mesa, para o campo ficar exatamente onde ficará na partida -->
  <div class="table">
    <div class="main" class:scenic={!!scene.img} style={sceneStyle}>
      <div class="hbar dim" style="--c:{colorOf(botHero)}">
        <span class="hb-pic"><HeroPortrait hero={botChar} size={46} round /></span>
        <div class="who"><b class="display">{botHero.name}</b><small>{L('Inimigo (bot)', 'Enemy (bot)')}</small></div>
      </div>
      <div class="ohand"></div>
      <div class="side-field foe dim">
        {#each [1, 0] as row}
          <div class="row">
            {#each [0, 1, 2] as col}
              <span class="slot" class:hero={botHero.row === row && botHero.col === col} style="--c:{colorOf(botHero)}; --floor:{floorOf(1, row, col)}">
                {#if botHero.row === row && botHero.col === col}
                  {#if botChar?.avatar}<span class="doll"><AvatarSprite avatar={botChar.avatar} dir="s" scale={2} /></span>{:else}<span class="mini"><HeroPortrait hero={botChar} size={80} /></span>{/if}
                  <span class="unit"><span class="u-nm">{botHero.name}</span></span>
                {:else}<span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>{/if}
              </span>
            {/each}
          </div>
        {/each}
        <div class="zone"><span class="zhint">{L('campo do inimigo', 'enemy field')}</span></div>
      </div>
      <div class="mid mine"><span class="mid-orn"></span><div class="mid-plate"><span>{L('Clique numa casa do SEU campo para escolher onde o seu herói começa', 'Click a slot on YOUR field to choose where your hero starts')}</span></div><span class="mid-orn r"></span></div>
      <div class="side-field">
        <div class="zone"><span class="zhint">{L('seu campo', 'your field')}</span></div>
        {#each [0, 1] as row}
          <div class="row">
            {#each [0, 1, 2] as col}
              {@const on = myPos.row === row && myPos.col === col}
              <button class="slot" class:hero={on} class:target={!on} style="--c:{colorOf(myHero)}; --floor:{floorOf(0, row, col)}" onclick={() => (myPos = { row: row as 0 | 1, col: col as 0 | 1 | 2 })}>
                {#if on}
                  {#if myChar?.avatar}<span class="doll"><AvatarSprite avatar={myChar.avatar} dir="n" scale={2} /></span>{:else}<span class="mini"><HeroPortrait hero={myChar} size={80} /></span>{/if}
                  <span class="unit"><span class="u-nm">{myHero.name}</span></span>
                {:else}<span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>{/if}
              </button>
            {/each}
          </div>
        {/each}
      </div>
      <div class="hand place-help">
        <p>{L('Na frente, o herói golpeia corpo a corpo e protege quem está atrás. Na retaguarda, fica protegido de golpes corpo a corpo.', 'In front, the hero can melee and protects the back row. In the back, it is safe from melee.')}</p>
      </div>
      <div class="hbar mine" style="--c:{colorOf(myHero)}">
        <span class="hb-pic"><HeroPortrait hero={myChar} size={46} round /></span>
        <div class="who"><b class="display">{myHero.name}</b><small>{L(myHero.className[0], myHero.className[1])}</small></div>
        <button class="btn sm" onclick={() => (step = 'heroes')}>{L('Voltar', 'Back')}</button>
        <button class="btn sm primary" onclick={start}><Swords size={15} /> {L('Começar partida', 'Start match')}</button>
      </div>
    </div>
  </div>
{:else if g}
  {@const P = g.players[me]}
  {@const F = g.players[foe]}
  <div class="table">
    <div class="main" class:scenic={!!scene.img} style={sceneStyle} onmousemove={(e) => { lastMouse = { x: e.clientX, y: e.clientY }; if (sel) mouse = lastMouse; }} onclick={mainClick}
      oncontextmenu={(e) => { if (sel) { e.preventDefault(); cancel(); } }} role="presentation">
      <!-- ───── barra de herói ───── -->
      {#snippet bar(p: 0 | 1, mine: boolean)}
        {@const pl = g!.players[p]}
        {@const h = heroOf(p)}
        <div class="hbar" class:mine style="--c:{colorOf(pl.hero)}" class:active={g!.active === p}>
          <span class="hb-pic"><HeroPortrait hero={characterOf(pl.hero.id)} size={46} round /><i class="hb-lv" title={L('Nível', 'Level')}>{pl.level}</i></span>
          <div class="who"><b class="display">{pl.hero.name}</b><small>{L(pl.hero.className[0], pl.hero.className[1])}</small></div>
          {#if h}
            <div class="stat" use:tip={L('Vida: se chegar a 0, o herói cai e a partida acaba. O dano fica até ser curado.', 'Life: at 0 the hero falls and the match ends. Damage stays until healed.')}>
              <span class="cap">{L('Vida', 'Life')}</span>
              <span class="val hpv" id="hp-{p}"><Heart size={14} /> <b>{life(h)}</b><small>/{h.def}</small><span class="hpbar"><i style="width:{(life(h) / h.def) * 100}%"></i></span></span>
            </div>
          {/if}
          <div class="stat" use:tip={L('Vigor: paga as habilidades físicas. Enche de novo no começo do seu turno; o que sobrar pode pagar Reações no turno do oponente.', 'Vigor: pays physical abilities. Refills at the start of your turn; what is left can pay Reactions on the opponent’s turn.')}>
            <span class="cap">Vigor</span>
            <span class="val vig" id="res-{p}-vigor"><Glyph id="gauntlet" size={15} color="currentColor" />{#each pips(pl.vigor, pl.maxVigor) as k}<i class="pip {k}"></i>{/each}{#if !pl.maxVigor && !pl.vigor}<small>—</small>{/if}</span>
          </div>
          <div class="stat" use:tip={L('Mana: paga as magias. Enche de novo no começo do seu turno; o que sobrar pode pagar Reações no turno do oponente.', 'Mana: pays spells. Refills at the start of your turn; what is left can pay Reactions on the opponent’s turn.')}>
            <span class="cap">Mana</span>
            <span class="val man" id="res-{p}-mana"><Glyph id="crystal-cluster" size={15} color="currentColor" />{#each pips(pl.mana, pl.maxMana) as k}<i class="pip {k}"></i>{/each}{#if !pl.maxMana && !pl.mana}<small>—</small>{/if}</span>
          </div>
          <div class="stat" use:tip={L(`Nível e XP: o herói está no nível ${pl.level}. Todo herói ganha +1 XP no começo do próprio turno (por isso sobe de nível mesmo sem fazer nada), +1 por criatura derrotada e +1 na 1ª vez que fere o herói inimigo no turno. A cada ${XP_PER_LEVEL} XP, um nível novo (+1 Vigor, +1 Mana ou +3 Vida).`, `Level and XP: the hero is level ${pl.level}. Every hero gets +1 XP at the start of its own turn (so it levels up even doing nothing), +1 per defeated creature, +1 the first time it hits the enemy hero each turn. Every ${XP_PER_LEVEL} XP, a new level.`)}>
            <span class="cap">{L('Nível', 'Level')} {pl.level}</span>
            <span class="val xpv" id="xp-{p}">{#each Array(XP_PER_LEVEL) as _, i}<i class="pip" class:on={i < pl.xp}></i>{/each}<small>{pl.xp}/{XP_PER_LEVEL} XP</small></span>
          </div>
          <div class="stat" use:tip={L('Golpe: o ataque do herói com a arma. É de graça, 1 vez por turno, a qualquer momento do turno (clique no herói ou em “Golpear”). As cartas não gastam esse golpe.', 'Strike: the hero attacks with the weapon. Free, once per turn, any time during the turn (click the hero or “Strike”). Cards do not use it up.')}>
            <span class="cap">{L('Golpe', 'Strike')}</span>
            <span class="val stk" class:used={pl.struck && g!.active === p}><Swords size={14} /> <b>{strikeDmg(p)}</b><small>{pl.struck && g!.active === p ? L('usado', 'used') : L(VIA[strikeVia(g!, p)][0], VIA[strikeVia(g!, p)][1])}</small></span>
          </div>
          <div class="stat" use:tip={L(`Armadura e resistência: cada golpe físico no herói perde ${pl.hero.armor} de dano; cada dano mágico perde ${pl.hero.resist} (o mínimo é sempre 1).`, `Armor and resistance: each physical hit on the hero loses ${pl.hero.armor} damage; each magic hit loses ${pl.hero.resist} (minimum always 1).`)}>
            <span class="cap">{L('Defesa', 'Defense')}</span>
            <span class="val"><Shield size={14} /> <b>{pl.hero.armor}</b> <Sparkles size={13} color="#9a7bff" /> <b>{pl.hero.resist}</b></span>
          </div>
          {#if !mine && g!.active === p && g!.winner === undefined}<span class="thinking">{awaiting ? L('Esperando a sua resposta…', 'Waiting for your response…') : L('Jogando…', 'Playing…')}</span>{/if}
        </div>
      {/snippet}

      {#snippet marks(u: Unit, p: 0 | 1)}
        {@const fx = statusOf(u, p)}
        {#if u.warded}<span class="ward-bubble" in:scale={{ duration: 260, start: 0.5 }} out:fade={{ duration: 200 }}></span>{/if}
        {#if u.marked}<span class="mark-ring" transition:fade={{ duration: 200 }}><Crosshair size={30} /></span>{/if}
        {#if fx.length}
          <span class="u-fx">
            {#each fx as f (f.id)}
              <i class="fx {f.tone}" use:tip={f.tip} in:scale={{ duration: 220, start: 0.4 }} out:fade={{ duration: 160 }}><f.icon size={13} strokeWidth={2.6} />{#if f.text}<b>{f.text}</b>{/if}</i>
            {/each}
          </span>
        {/if}
      {/snippet}

      <!-- ───── o herói (miniatura com o retrato) ───── -->
      {#snippet heroBody(u: Unit, p: 0 | 1)}
        {@const av = avatarOf(p)}
        {#if av}
          <span class="doll" class:tall={g!.heroOff} class:sick={u.afflicted}><AvatarSprite avatar={av} anim={heroAnim[p]} dir={p === me ? 'n' : 's'} scale={g!.heroOff ? 3 : 2} loop={heroAnim[p] === 'idle'} onend={() => animEnd(p)} /></span>
        {:else}
          <span class="mini"><HeroPortrait hero={characterOf(g!.players[p].hero.id)} size={120} /></span>
        {/if}
        <span class="unit" in:recvU={{ key: u.id }} out:sendU={{ key: u.id }}>
          <span class="u-nm">{L(u.name[0], u.name[1])}</span>
          <span class="u-st"><span class="atk" class:used={g!.players[p].struck && g!.active === p}><Swords size={13} /> {strikeDmg(p)}</span><span class="def"><Heart size={13} /> {life(u)}/{u.def}</span></span>
        </span>
        {@render marks(u, p)}
        {#if p === me && myTurn}
          <span class="strike-tag" class:on={canStrike}>{canStrike ? L('golpe pronto', 'strike ready') : g!.players[p].struck ? L('golpe usado', 'strike used') : L('sem alcance', 'no reach')}</span>
        {/if}
      {/snippet}

      <!-- ───── um lugar no campo ───── -->
      {#snippet slot(p: 0 | 1, row: number, col: number)}
        {@const pos = { p, row, col }}
        {@const u = unitAt(g!, pos)}
        <button class="slot" class:off={row === -1} class:aoe={row === -1 && aoe.fields.has(p)} class:ally={p === me} class:target={isTarget(pos)} class:selected={(sel?.kind === 'unit' && same(sel.pos, pos)) || (sel?.kind === 'strike' && !!u?.isHero && p === me)}
          class:hero={!!u?.isHero} class:fig={!!u && !u.isHero && hasFigure(u.icon)} class:ready={!!u?.isHero && p === me && canStrike && !sel} class:exh={!!u && u.exhausted && !u.isHero && p === me} onclick={() => clickSlot(pos)} data-uid={u?.id}
          data-pos="{p}-{row}-{col}" onmouseenter={(e) => { hoverPos = pos; hover(u?.src, e); }} onmouseleave={() => { hoverPos = null; zoom = null; }} style="--c:{colorOf(g!.players[p].hero)}; --floor:{row === -1 ? 'none' : floorOf(p, row, col)}"
          use:tip={u?.isHero && p === me && g!.active === me ? strikeInfo().why : ''}>
          <!-- a figura fica num bloco com chave: ao sair da casa (morrer, ser empurrada), a animação de saída ainda sabe quem ela é -->
          {#each u ? [u] : [] as x (x.id)}
            {#if x.isHero}
              {@render heroBody(x, p)}
            {:else}
              {@const cr = creatureOf(x.icon)}
              {@const sh = cr ? undefined : sheetOf(x.icon)}
              {#if sh}<span class="doll" class:sick={x.afflicted}><SheetSprite id={sh.id} def={sh.def} attacking={!!unitAnim[x.id]} back={p === me} scale={2} onend={() => { delete unitAnim[x.id]; }} /></span>{/if}
              {#if cr}<span class="doll" class:sick={x.afflicted}><AvatarSprite avatar={cr.avatar} anim={unitAnim[x.id] ?? 'idle'} dir={p === me ? 'n' : 's'} scale={2} loop={!unitAnim[x.id]} onend={() => { delete unitAnim[x.id]; }} /></span>{/if}
              <span class="unit" in:recvU={{ key: x.id }} out:sendU={{ key: x.id }}>
                {#if !cr && !sh}<span class="u-ic"><Glyph id={x.icon ?? 'death-skull'} size={44} color="#e6dccb" /></span>{/if}
                <span class="u-nm">{L(x.name[0], x.name[1])}</span>
                <span class="u-st"><span class="atk"><Swords size={13} /> {x.atk + x.buff}</span><span class="def"><Heart size={13} /> {life(x)}</span></span>
              </span>
              {@render marks(x, p)}
            {/if}
          {:else}
            <span class="empty">{row === -1 ? '' : row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>
          {/each}
        </button>
      {/snippet}

      <!-- ───── campo de um lado (com o herói ao lado, no modo "fora do campo") ───── -->
      {#snippet field(p: 0 | 1)}
        <div class="bfield">
          {#if g!.heroOff}{@render slot(p, -1, 0)}{/if}
          <div class="rows" class:aoe={aoe.fields.has(p)} class:ally={p === me}>{#each rowsFor(p) as row}<div class="row" class:aoe={aoe.rows.has(`${p}-${row}`)}>{#each Array(COLS) as _, col}{@render slot(p, row, col)}{/each}</div>{/each}</div>
          {#if g!.heroOff}<span class="off-spacer"></span>{/if}
        </div>
      {/snippet}

      <!-- ───── faixa das cartas usadas neste turno (somem no fim do turno) ───── -->
      {#snippet zone(p: 0 | 1)}
        {@const pl = g!.players[p]}
        <div class="zone" id="zone-{p}">
          {#if pl.stance?.cardId && app.cards[pl.stance.cardId]}
            <div class="zc stance" onmouseenter={(e) => hover(pl.stance?.cardId, e)} onmouseleave={() => (zoom = null)} role="img">
              <span class="ztag"><Sparkles size={11} /> {L('Postura', 'Stance')}</span>
              <CardImage card={app.cards[pl.stance.cardId]} eager />
            </div>
          {/if}
          {#each pl.recent as r (r.uid)}
            <div class="zc" in:receive={fly(r.uid)} out:send={fly(r.uid, { to: `#grave-${p}` })} onmouseenter={(e) => hover(r.cardId, e)} onmouseleave={() => (zoom = null)} role="img">
              {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
            </div>
          {/each}
          {#if !pl.recent.length && !pl.stance?.cardId}<span class="zhint">{p === me ? L('cartas que você usar neste turno', 'cards you use this turn') : L('cartas que o oponente usar neste turno', 'cards the opponent uses this turn')}</span>{/if}
        </div>
      {/snippet}

      <!-- ───── grimório e cemitério ───── -->
      {#snippet piles(p: 0 | 1, top: boolean)}
        {@const pl = g!.players[p]}
        <div class="pilebox deckbox" class:top use:tip={L(`Grimório: as cartas que ainda vão ser compradas (${pl.deck.length}).`, `Grimoire: the cards still to be drawn (${pl.deck.length}).`)}>
          <span class="pbase"><span class="prune"></span></span>
          <div class="pile deck" id="deck-{p}">
            {#if pl.deck.length}<span class="stack" style="--n:{Math.min(4, Math.ceil(pl.deck.length / 10))}">{#if backUrl}<img src={backUrl} alt="" />{/if}</span>
            {:else}<span class="gempty"><Glyph id="spell-book" size={34} color="currentColor" /></span>{/if}
          </div>
          <span class="plabel"><Glyph id="spell-book" size={15} color="currentColor" /> {L('Grimório', 'Grimoire')} <b>{pl.deck.length}</b></span>
        </div>
        <div class="pilebox gravebox" class:top use:tip={L('Cemitério: as cartas já usadas. Clique para ver todas.', 'Graveyard: the cards already used. Click to see them all.')}>
          <span class="pbase"><span class="prune"></span></span>
          <button class="pile grave" id="grave-{p}" onclick={() => (graveOf = p)}>
            {#each pl.discard.slice(-1) as r (r.uid)}
              <span class="gtop" in:receive={fly(r.uid, { from: `#zone-${p}` })}>{#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}</span>
            {/each}
            {#if !pl.discard.length}<span class="gempty"><Glyph id="tombstone" size={36} color="currentColor" /></span>{/if}
          </button>
          <span class="plabel"><Glyph id="tombstone" size={15} color="currentColor" /> {L('Cemitério', 'Graveyard')} <b>{pl.discard.length}</b></span>
        </div>
      {/snippet}

      <!-- ───── equipamento (vem da ficha do herói) ───── -->
      {#snippet gear(p: 0 | 1, top: boolean)}
        {@const h = g!.players[p].hero}
        <div class="gear-panel" class:top style="--c:{colorOf(h)}">
          <span class="gtitle">{L('Equipamento', 'Equipment')} · {h.name}</span>
          <div class="gi" use:tip={L(`${h.weapon.name[0]}: define o dano do golpe do herói (${h.weapon.dmg}, ${VIA[h.weapon.via][0]}).`, `${h.weapon.name[1]}: sets the hero strike damage (${h.weapon.dmg}, ${VIA[h.weapon.via][1]}).`)}>
            <span class="gic"><Glyph id={weaponIcon(h)} size={20} color="#f3ead6" /></span>
            <span class="gtx"><b>{L(h.weapon.name[0], h.weapon.name[1])}</b>
              <small>{L(`Golpe ${h.weapon.dmg} · ${VIA[h.weapon.via][0]}`, `Strike ${h.weapon.dmg} · ${VIA[h.weapon.via][1]}`)}{#if strikeDmg(p) !== h.weapon.dmg}<em> → {strikeDmg(p)}</em>{/if}</small></span>
          </div>
          <div class="gchips">
            {#each h.gear.filter((it) => it.slot !== 'weapon') as it}
              <span class="gchip" use:tip={L(`${it.name[0]}: ${it.info[0]}.`, `${it.name[1]}: ${it.info[1]}.`)}>
                <span class="gic sm"><Glyph id={gearIcon(it, h)} size={17} color="#f3ead6" /></span>
                <small>{[it.armor ? `+${it.armor}🛡` : '', it.resist ? `+${it.resist}✦` : '', it.hp ? `+${it.hp}♥` : '', it.strike ? `+${it.strike}⚔` : ''].filter(Boolean).join(' ')}</small>
              </span>
            {/each}
          </div>
        </div>
      {/snippet}

      {@render bar(foe, false)}
      <div class="ohand">
        {#each F.hand as r, i (r.uid)}
          <span class="back" in:receive|global={fly(r.uid, { from: `#deck-${foe}`, delay: i * 70 })} out:send={fly(r.uid, { to: `#grave-${foe}` })}>{#if backUrl}<img src={backUrl} alt="" />{/if}</span>
        {/each}
      </div>
      <div class="side-field foe">
        {@render field(foe)}
        {@render zone(foe)}
      </div>
      <div class="mid" class:warn={!!msg && warn} class:aiming={!!sel} class:mine={myTurn || awaiting} class:foe={!myTurn && !awaiting && g.winner === undefined}>
        <span class="mid-orn"></span>
        <div class="mid-plate" class:long={!!(msg || caption)}>
          {#key msg || caption}
            <span in:fade={{ duration: 160 }}>{msg || caption || (awaiting ? L('O oponente jogou uma carta: reaja ou aceite', 'The opponent played a card: react or accept') : myTurn ? L('Seu turno', 'Your turn') : g.winner === undefined ? L(`Turno de ${F.hero.name}`, `${F.hero.name}'s turn`) : '')}</span>
          {/key}
          {#if sel}<button class="cancel-btn" onclick={() => cancel()}><X size={13} /> {L('Cancelar (Esc ou botão direito)', 'Cancel (Esc or right-click)')}</button>{/if}
        </div>
        <span class="mid-orn r"></span>
      </div>
      <div class="side-field">
        {@render zone(me)}
        {@render field(me)}
      </div>
      <div class="hand">
        {#each P.hand as r, i (r.uid)}
          {@const why = cannotPlay(g, me, r.uid)}
          {@const isReact = g.defs[r.cardId]?.game.kind === 'reacao'}
          <button class="hc" class:no={!!why && !isReact} class:react={isReact} class:sel={sel?.kind === 'card' && sel.uid === r.uid}
            in:receive|global={fly(r.uid, { from: `#deck-${me}`, delay: i * 90 })} out:send={fly(r.uid, { to: `#grave-${me}` })}
            onclick={() => clickCard(r.uid)} onmouseenter={(e) => { hoverCard = r.uid; hover(r.cardId, e); }} onmouseleave={() => { hoverCard = null; zoom = null; }}
            onfocus={(e) => { hoverCard = r.uid; hover(r.cardId, e); }} onblur={() => { hoverCard = null; zoom = null; }}>
            {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
            {#if isReact}<span class="rtag">{L('Reação', 'Reaction')}</span>
            {:else if dmgBadge(r)}<span class="dmgb"><Swords size={13} /> {dmgBadge(r)}</span>{/if}
          </button>
        {/each}
      </div>
      {@render bar(me, true)}

      {@render piles(foe, true)}
      {@render piles(me, false)}

      <!-- ───── ações do turno (flutuam acima do cemitério) ───── -->
      <div class="actions" class:idle={!myTurn} style="--c:{colorOf(P.hero)}">
        <span class="act-title"><i></i>{myTurn ? L('Suas ações', 'Your actions') : L('Aguarde a sua vez', 'Wait for your turn')}<i></i></span>
        <button class="act strike" class:lit={canStrike} disabled={!myTurn} data-action="strike" onclick={startStrike} use:tip={myTurn ? strikeInfo().why : ''}>
          <span class="act-ic"><Swords size={19} /></span>
          <span class="act-tx"><b>{L('Golpear', 'Strike')}</b><small>{P.struck ? L('já usado', 'already used') : L(`${strikeDmg(me)} de dano · grátis`, `${strikeDmg(me)} damage · free`)}</small></span>
        </button>
        {#if !g.heroOff}
          <button class="act" disabled={!myTurn || P.moved} onclick={startMove} use:tip={L('Trocar posição: leva o herói para outra casa livre do seu campo (frente ou retaguarda). 1 vez por turno.', 'Change position: moves the hero to another free slot on your field (front or back). Once per turn.')}>
            <span class="act-ic"><ArrowLeftRight size={19} /></span>
            <span class="act-tx"><b>{L('Trocar posição', 'Change position')}</b><small>{P.moved ? L('já trocou', 'already changed') : L('1 vez por turno', 'once per turn')}</small></span>
          </button>
        {/if}
        <button class="act end" disabled={!myTurn} data-action="end-turn" onclick={() => act({ t: 'end' })}>
          <span class="act-ic"><Hourglass size={19} /></span>
          <span class="act-tx"><b>{L('Encerrar turno', 'End turn')}</b><small>{L('passa a vez', 'pass the turn')}</small></span>
        </button>
      </div>
      <div class="toolbar">
        {#if cfg.showLog}
          <div class="flog" class:open={logOpen}>
            <button class="tool" class:on={logOpen} onclick={() => (logOpen = !logOpen)} title={L('Registro da batalha', 'Battle log')}><ScrollText size={16} /></button>
            {#if logOpen}
              <div class="flog-panel" in:scale={{ duration: 140, start: 0.94 }}>
                <div class="flog-head"><span class="section-title">{L('Registro da batalha', 'Battle log')}</span>
                  <button class="btn sm ghost icon" onclick={() => (logOpen = false)} title={L('Fechar', 'Close')}><X size={15} /></button></div>
                <div class="log" bind:this={logEl}>{#each g.log as line}<p class:turn={line.startsWith('—')}>{line}</p>{/each}</div>
              </div>
            {/if}
          </div>
        {/if}
        <MusicPlayer float />
        <button class="tool" class:on={menuOpen} onclick={() => (menuOpen = !menuOpen)} title={L('Menu da partida', 'Match menu')}><Menu size={16} /></button>
      </div>
      {@render gear(foe, true)}
      {@render gear(me, false)}

      {#if banner}
        {#key banner.key}
          <div class="banner" class:mine={banner.mine} in:scale={{ duration: 260, start: 0.8 }} out:fade={{ duration: 250 }}>
            <b>{banner.title}</b><small>{banner.sub}</small>
          </div>
        {/key}
      {/if}
      {#if levelFx}
        {#key levelFx.key}
          <div class="lvlfx" class:mine={levelFx.mine} out:fade={{ duration: 300 }}>
            <span class="rays"></span>
            <small>{levelFx.name}</small>
            <b>{L('Nível', 'Level')} {levelFx.level}</b>
            <i>{L('subiu de nível!', 'level up!')}</i>
          </div>
        {/key}
      {/if}
      {#if shown && app.cards[shown.cardId]}
        {#key shown.key}
          <div class="shown {shown.cls}" in:flyIn={{ y: -30, duration: 280 }} out:fade={{ duration: 250 }}>
            <span>{shown.label}</span>
            <CardImage card={app.cards[shown.cardId]} eager />
          </div>
        {/key}
      {/if}

      <!-- ───── janela de resposta: o oponente jogou uma carta e eu posso reagir ───── -->
      {#if awaiting && g.pending && !fxPlaying}
        {@const pc = app.cards[g.pending?.ref?.cardId ?? '']}
        {@const atkU = g.pending?.attack === 'unit' && g.pending.from ? unitAt(g, g.pending.from) : null}
        {@const tgtU = g.pending?.target ? unitAt(g, g.pending.target) : null}
        <div class="respond" in:scale={{ duration: 220, start: 0.9 }}>
          {#if pc}
            <div class="rcard"><CardImage card={pc} eager /></div>
          {:else}
            <div class="ratk" style="--c:{colorOf(F.hero)}">
              {#if atkU}<Glyph id={atkU.icon ?? 'death-skull'} size={96} color="#f3ead6" />{:else}<HeroPortrait hero={characterOf(F.hero.id)} size={150} />{/if}
              <Swords size={30} />
            </div>
          {/if}
          <div class="rside">
            <span class="rtitle">{pc ? `${F.hero.name} ${L('joga', 'plays')}` : L('Ataque inimigo', 'Enemy attack')}</span>
            <h3 class="display">{pc ? pc.text[app.lang].name : atkU ? L(`${atkU.name[0]} ataca`, `${atkU.name[1]} attacks`) : L(`${F.hero.name} golpeia`, `${F.hero.name} strikes`)}</h3>
            {#if tgtU}<span class="rtarget">{L('Alvo', 'Target')}: <b>{L(tgtU.name[0], tgtU.name[1])}</b>{#if !pc} · {atkU ? atkU.atk + atkU.buff : strikeDmg(foe)} {L('de dano', 'damage')}{/if}</span>{/if}
            <p class="muted">{pc ? L('Você tem uma Reação que serve. Use-a agora ou aceite a carta.', 'You have a Reaction that fits. Use it now or accept the card.') : L('Você tem uma Reação que serve. Use-a agora ou aceite o ataque.', 'You have a Reaction that fits. Use it now or accept the attack.')}</p>
            <div class="rreacts">
              {#each reactions(g) as r (r.uid)}
                <button class="rr" onclick={() => respond({ t: 'react', uid: r.uid })} onmouseenter={(e) => hover(r.cardId, e)} onmouseleave={() => (zoom = null)}>
                  {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
                  <span>{L('Reagir', 'React')}</span>
                </button>
              {/each}
            </div>
            <button class="btn primary" onclick={() => respond({ t: 'pass' })}><Check size={15} /> {L('Aceitar', 'Accept')}</button>
          </div>
        </div>
      {/if}

      {#if menuOpen}
        <div class="gmenu-back" onclick={() => (menuOpen = false)} role="presentation"></div>
        <div class="gmenu" in:scale={{ duration: 140, start: 0.92 }}>
          <span class="section-title">{L('Menu da partida', 'Match menu')}</span>
          <button onclick={() => (menuOpen = false)}><Check size={15} /> {L('Continuar jogando', 'Keep playing')}</button>
          <button onclick={() => { menuOpen = false; helpOpen = true; }}><CircleHelp size={15} /> {L('Como jogar', 'How to play')}</button>
          <label><input type="checkbox" bind:checked={cfg.showLog} /> {L('Mostrar o registro da batalha', 'Show the battle log')}</label>
          <label><input type="checkbox" bind:checked={cfg.timeLimit} /> {L('Limite de tempo por jogada', 'Time limit per play')}</label>
          <label class="gm-sel"><Gauge size={15} /> {L('Velocidade', 'Speed')}
            <select class="select-in" bind:value={cfg.pace}><option value="slow">{L('Lento', 'Slow')}</option><option value="normal">{L('Normal', 'Normal')}</option><option value="fast">{L('Rápido', 'Fast')}</option></select></label>
          <hr />
          <button onclick={() => { menuOpen = false; leave(); }}><LogOut size={15} /> {L('Sair para a seleção (sem resultado)', 'Leave to selection (no result)')}</button>
          <button onclick={() => { menuOpen = false; leave(); router.go('/'); }}><House size={15} /> {L('Menu principal (sem resultado)', 'Main menu (no result)')}</button>
          <button class="danger" disabled={g.winner !== undefined} onclick={askConcede}><FlagIcon size={15} /> {L('Desistir (você perde)', 'Concede (you lose)')}</button>
        </div>
      {/if}
      {#if helpOpen}
        <div class="modal" onclick={() => (helpOpen = false)} role="presentation">
          <!-- svelte-ignore a11y_click_events_have_key_events (o Esc fecha, pela janela) -->
          <div class="box help" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
            <h2>{L('Como jogar', 'How to play')}</h2>
            <ul>
              <li>{L('Vence quem levar a Vida do herói inimigo a 0.', 'Reduce the enemy hero’s Life to 0 to win.')}</li>
              <li>{L('No seu turno: use cartas (pagando Vigor ou Mana), golpeie com o herói (de graça, 1 vez por turno), ataque com as suas criaturas e, se quiser, troque o herói de posição. Depois, “Encerrar turno”.', 'On your turn: play cards (paying Vigor or Mana), strike with the hero (free, once per turn), attack with your creatures and optionally change the hero’s position. Then “End turn”.')}</li>
              <li>{L('Clicou numa carta ou no herói? Escolha o alvo dourado. Para desistir da escolha: Esc, botão direito ou clique fora.', 'Clicked a card or the hero? Pick a golden target. To cancel: Esc, right-click or click outside.')}</li>
              <li>{L('Vigor e Mana enchem no começo do seu turno. O que sobrar paga Reações no turno do oponente.', 'Vigor and Mana refill at the start of your turn. What is left pays Reactions on the opponent’s turn.')}</li>
              <li>{L('Corpo a corpo só alcança a fileira da frente inimiga (ou a retaguarda, se a frente estiver vazia). À distância e magia alcançam qualquer um.', 'Melee only reaches the enemy front row (or the back, if the front is empty). Ranged and magic reach anyone.')}</li>
              <li>{L('A cada 3 XP o herói sobe de nível: +1 Vigor, +1 Mana ou +3 Vida. Cartas pedem nível e atributos.', 'Every 3 XP the hero levels up: +1 Vigor, +1 Mana or +3 Life. Cards require level and attributes.')}</li>
            </ul>
            <button class="btn primary" onclick={() => (helpOpen = false)}>{L('Entendi', 'Got it')}</button>
          </div>
        </div>
      {/if}
      {#if rope !== null}
        <div class="rope" class:hot={rope < 0.34} style="--t:{rope}" in:scale={{ duration: 260, start: 0.9 }} out:fade={{ duration: 200 }}>
          <span class="rope-label"><Hourglass size={14} /> {L('Sua vez: jogue ou encerre o turno', 'Your move: play or end the turn')} · <b>{Math.ceil(rope * ROPE_MS / 1000)}s</b></span>
          <div class="rope-track"><div class="rope-fill"></div><span class="rope-spark"></span></div>
        </div>
      {/if}

    </div>

    {#if tipBox}
      <div class="tipbox" class:up={tipBox.up} style="left:{tipBox.x}px;top:{tipBox.y}px" transition:fade={{ duration: 100 }}>
        {#if tipBox.head}<b>{tipBox.head}</b>{/if}<span>{tipBox.text}</span>
      </div>
    {/if}
    <div class="fxlayer" bind:this={fxEl}>
      {#if arrows.length}
        <svg class="aim" width="100%" height="100%">
          <defs>
            <filter id="aim-shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
            <filter id="aim-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {#each arrows as a}
            <g class="arrow {a.tone}">
              <path class="a-shadow" d={a.shadow} filter="url(#aim-shadow)" />
              <g filter="url(#aim-glow)">
                <path class="a-body" d={a.body} />
                <path class="a-head" d={a.head} />
              </g>
              <path class="a-flow" d={a.line} />
            </g>
          {/each}
        </svg>
      {/if}
      {#each floats as f (f.key)}
        <div class="float {f.cls}" class:big={f.big} style="left:{f.x}px;top:{f.y}px"><b>{f.text}</b>{#if f.sub}<small>{f.sub}</small>{/if}</div>
      {/each}
    </div>

    {#if zoom && app.cards[zoom.id]}
      <div class="zoom" style="left:{zoom.x}px;{zoom.up ? `bottom:${innerHeight - zoom.y}px` : `top:${zoom.y}px`};width:{ZW}px" transition:fade={{ duration: 120 }}>
        <CardImage card={app.cards[zoom.id]} eager />
      </div>
    {/if}

    {#if graveOf !== null}
      <div class="modal" onclick={() => { graveOf = null; zoom = null; }} role="presentation">
        <!-- svelte-ignore a11y_click_events_have_key_events (o Esc fecha, pela janela) -->
          <div class="gbox" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
          <header><h2>{L('Cemitério de', 'Graveyard of')} {g.players[graveOf].hero.name} · {g.players[graveOf].discard.length}</h2>
            <button class="btn sm ghost icon" onclick={() => { graveOf = null; zoom = null; }}><X size={16} /></button></header>
          <div class="ggrid">
            {#each [...g.players[graveOf].discard].reverse() as r (r.uid)}
              <div class="gc" onmouseenter={(e) => hover(r.cardId, e)} onmouseleave={() => (zoom = null)} role="img">{#if cardOf(r)}<CardImage card={cardOf(r)} />{/if}</div>
            {/each}
            {#if !g.players[graveOf].discard.length}<p class="muted">{L('Vazio.', 'Empty.')}</p>{/if}
          </div>
        </div>
      </div>
    {/if}
    {#if g.winner === undefined && g.active === me && P.pendingLevels && !fxPlaying && !g.pending}
      {@const hu = heroOf(me)}
      <div class="modal">
        <div class="lvbox" in:scale={{ duration: 280, start: 0.85 }} style="--c:{colorOf(P.hero)}">
          <span class="lv-rays"></span>
          <div class="lv-head">
            <HeroPortrait hero={characterOf(P.hero.id)} size={72} round />
            <div><small>{P.hero.name}</small><h2 class="display">{L('Nível', 'Level')} {P.level + 1}</h2></div>
          </div>
          <p class="muted">{L('Escolha o que o seu herói ganha neste nível:', 'Choose what your hero gains this level:')}</p>
          <div class="lv-opts">
            <button class="lv-opt vig" onclick={() => act({ t: 'levelup', choice: 'vigor' })}>
              <span class="lv-ic"><Glyph id="gauntlet" size={38} color="currentColor" /></span>
              <b>+1 Vigor</b><small>{L('para golpes e técnicas', 'for strikes and techniques')}</small>
              <em>{P.maxVigor} → {P.maxVigor + 1}</em>
            </button>
            <button class="lv-opt man" onclick={() => act({ t: 'levelup', choice: 'mana' })}>
              <span class="lv-ic"><Glyph id="crystal-cluster" size={38} color="currentColor" /></span>
              <b>+1 Mana</b><small>{L('para magias e invocações', 'for spells and summons')}</small>
              <em>{P.maxMana} → {P.maxMana + 1}</em>
            </button>
            <button class="lv-opt vid" onclick={() => act({ t: 'levelup', choice: 'vida' })}>
              <span class="lv-ic"><Heart size={36} /></span>
              <b>+3 {L('Vida', 'Life')}</b><small>{L('aumenta a vida máxima', 'raises maximum life')}</small>
              <em>{hu ? `${life(hu)}/${hu.def} → ${life(hu) + 3}/${hu.def + 3}` : ''}</em>
            </button>
          </div>
        </div>
      </div>
    {/if}
    {#if intro === 'who'}
      {@const first = g.players[0]}
      <div class="intro" in:fade={{ duration: 200 }}>
        <div class="who-row">
          <div class="who-side" class:first={me === 0} style="--c:{colorOf(P.hero)}">
            <HeroPortrait hero={characterOf(P.hero.id)} size={170} />
            <b class="display">{P.hero.name}</b><small>{L('Você', 'You')}</small>
          </div>
          <span class="vs">VS</span>
          <div class="who-side" class:first={me !== 0} style="--c:{colorOf(F.hero)}">
            <HeroPortrait hero={characterOf(F.hero.id)} size={170} />
            <b class="display">{F.hero.name}</b><small>{L('Oponente', 'Opponent')}</small>
          </div>
        </div>
        <div class="who-msg">
          <small>{starter === 'sorteio' ? L('O sorteio decidiu', 'The draw decided') : L('Como você escolheu', 'As you chose')}</small>
          <h2 class="display">{me === 0 ? L('Você começa!', 'You go first!') : L(`${first.hero.name} começa!`, `${first.hero.name} goes first!`)}</h2>
          <p>{me === 0 ? L('Você joga o primeiro turno (e não compra carta nele).', 'You play the first turn (and draw no card on it).') : L('O oponente joga o primeiro turno. Você compra uma carta no começo do seu.', 'The opponent plays the first turn. You draw a card at the start of yours.')}</p>
        </div>
        <button class="btn primary big" onclick={() => (intro = 'hand')}>{L('Ver a minha mão inicial', 'See my opening hand')}</button>
      </div>
    {:else if intro === 'hand' && g.setup}
      <div class="intro hand-intro" in:fade={{ duration: 200 }}>
        <div class="hi-head">
          <small>{myMulls ? L(`Troca ${myMulls} de ${MAX_MULLIGANS}`, `Mulligan ${myMulls} of ${MAX_MULLIGANS}`) : L('Antes de começar', 'Before you start')}</small>
          <h2 class="display">{L('Sua mão inicial', 'Your opening hand')}</h2>
          <p>{#if myMulls}
            {L(`Escolha ${myMulls} carta${myMulls > 1 ? 's' : ''} para descartar (clique nela${myMulls > 1 ? 's' : ''}) e fique com as outras, ou troque de novo.`, `Pick ${myMulls} card${myMulls > 1 ? 's' : ''} to discard (click) and keep the rest, or mulligan again.`)}
          {:else}
            {L('A mão foi boa? Fique com ela. Se não, troque: você recebe 7 cartas novas, mas descarta 1 (na 2ª troca, 2; na 3ª, 3).', 'Good hand? Keep it. If not, mulligan: you get 7 new cards but discard 1 (2 on the 2nd, 3 on the 3rd).')}
          {/if}</p>
          {#if g.setup.mull[foe]}<span class="hi-foe">{L(`${F.hero.name} trocou a mão ${g.setup.mull[foe]} vez${g.setup.mull[foe] > 1 ? 'es' : ''}.`, `${F.hero.name} took ${g.setup.mull[foe]} mulligan${g.setup.mull[foe] > 1 ? 's' : ''}.`)}</span>{/if}
        </div>
        <div class="hi-cards">
          {#each P.hand as r (r.uid)}
            <button class="hi-card" class:drop={discardSel.includes(r.uid)} class:pick={!!myMulls} onclick={() => toggleDiscard(r.uid)} onmouseenter={growInPlace} onfocus={growInPlace} in:flyIn={{ y: 30, duration: 300 }}>
              {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
              {#if discardSel.includes(r.uid)}<span class="drop-tag"><X size={14} /> {L('descartar', 'discard')}</span>{/if}
            </button>
          {/each}
        </div>
        <div class="hi-actions">
          <button class="btn big" disabled={myMulls >= MAX_MULLIGANS} onclick={mulligan}><RotateCcw size={16} />
            {myMulls >= MAX_MULLIGANS ? L('Sem mais trocas', 'No more mulligans') : L(`Trocar a mão (recebe 7, descarta ${myMulls + 1})`, `Mulligan (get 7, discard ${myMulls + 1})`)}</button>
          <button class="btn primary big" disabled={discardSel.length !== myMulls} onclick={keepHand}><Check size={16} />
            {myMulls ? L(`Ficar com ${7 - myMulls} cartas`, `Keep ${7 - myMulls} cards`) : L('Ficar com esta mão', 'Keep this hand')}</button>
        </div>
      </div>
    {/if}
    {#if g.winner !== undefined && !fxPlaying}
      {@const won = g.winner === me}
      <div class="modal">
        <div class="endbox" class:won in:scale={{ duration: 320, start: 0.85 }} style="--c:{colorOf(g.players[g.winner].hero)}">
          <span class="end-rays"></span>
          <div class="end-pic"><HeroPortrait hero={characterOf(g.players[g.winner].hero.id)} size={120} round /></div>
          <small>{won ? L('A batalha é sua', 'The battle is yours') : L(`${g.players[g.winner].hero.name} venceu`, `${g.players[g.winner].hero.name} won`)}</small>
          <h2 class="display">{won ? L('Vitória!', 'Victory!') : L('Derrota', 'Defeat')}</h2>
          <p class="muted">{g.ended === 'timeout' ? L('O tempo esgotou.', 'Time ran out.') : g.ended === 'concede' ? L('Você desistiu da batalha.', 'You conceded the battle.') : won ? L(`${F.hero.name} caiu.`, `${F.hero.name} fell.`) : L(`${P.hero.name} caiu.`, `${P.hero.name} fell.`)} {L(`Turno ${g.turn}.`, `Turn ${g.turn}.`)}</p>
          <div class="lv">
            <button class="btn primary big" onclick={start}><RotateCcw size={16} /> {L('Jogar de novo', 'Play again')}</button>
            <button class="btn big" onclick={leave}>{L('Trocar heróis', 'Change heroes')}</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* ───── seleção de heróis ───── */
  .pick-wrap { height: 100%; display: flex; flex-direction: column; }
  .pick-screen { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 22px 28px 20px; position: relative;
    background:
      radial-gradient(ellipse 60% 70% at 12% 40%, color-mix(in srgb, var(--a) 26%, transparent), transparent 70%),
      radial-gradient(ellipse 60% 70% at 88% 40%, color-mix(in srgb, var(--b) 26%, transparent), transparent 70%),
      linear-gradient(180deg, #14110f, #0b0a09); }
  .nohero { margin: auto; display: grid; justify-items: center; gap: 10px; text-align: center; color: var(--muted); max-width: 460px; }
  .nohero h2 { color: var(--text); }
  /* os dois heróis e as opções formam um bloco só, no meio da tela (sem esticar para preencher a altura) */
  .vs-wrap { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: stretch; max-width: 1560px; width: 100%; margin: auto auto 0; }
  .vs-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; padding: 16px 18px; border-radius: 20px;
    background: linear-gradient(160deg, color-mix(in srgb, var(--c) 14%, rgb(20 17 15 / .9)), rgb(14 12 11 / .92) 60%);
    border: 1px solid color-mix(in srgb, var(--c) 40%, #2a2420); box-shadow: 0 24px 60px rgb(0 0 0 / .5), inset 0 1px 0 rgb(255 255 255 / .05); }
  .vs-tag { font: 700 11px var(--ui); letter-spacing: .22em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 55%, #fff); }
  .vs-side.right .vs-tag { text-align: right; }
  .showcase { display: flex; gap: 20px; align-items: stretch; }
  .vs-side.right .showcase { flex-direction: row-reverse; }
  .sc-pic { position: relative; flex: none; align-self: flex-start; border-radius: 18px; line-height: 0; overflow: hidden; width: min(300px, 42%);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 70%, #000), 0 0 0 6px #14110f, 0 0 0 7px color-mix(in srgb, var(--c) 45%, #000), 0 22px 50px rgb(0 0 0 / .65), 0 0 60px color-mix(in srgb, var(--c) 28%, transparent); }
  .sc-pic :global(.hp) { width: 100% !important; height: auto !important; aspect-ratio: 4 / 5; border-radius: 0; }
  .sc-edit { position: absolute; right: 8px; bottom: 8px; display: inline-flex; gap: 5px; align-items: center; padding: 5px 10px; border-radius: 99px; border: 1px solid rgb(255 255 255 / .2); background: rgb(10 8 7 / .78); color: #f0e6d6; font: 600 12px var(--ui); cursor: pointer; line-height: 1; }
  .sc-edit:hover { background: var(--accent); color: #1a120b; border-color: var(--accent); }
  .sc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
  .sc-info h2 { font-size: clamp(26px, 2.6vw, 40px); line-height: 1; color: #f6ead8; text-shadow: 0 2px 18px color-mix(in srgb, var(--c) 60%, transparent); }
  .sc-class { font: 600 12px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 50%, #ddd); margin-top: -4px; }
  .sc-bars { display: grid; grid-template-columns: auto 1fr 26px; gap: 6px 10px; align-items: center; font-size: 12.5px; color: var(--text-2); }
  .sc-bars span { display: inline-flex; gap: 5px; align-items: center; white-space: nowrap; }
  .sc-bars i { height: 8px; border-radius: 5px; background: rgb(255 255 255 / .07); overflow: hidden; }
  .sc-bars i b { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, color-mix(in srgb, var(--k) 55%, #000), var(--k)); transition: width .35s; }
  .sc-bars em { font: 700 14px var(--ui); font-style: normal; color: var(--text); text-align: right; }
  .sc-res { display: flex; gap: 18px; font: 600 13px var(--ui); flex-wrap: wrap; }
  .sc-res span { display: inline-flex; gap: 5px; align-items: center; }
  .sc-attrs { display: flex; flex-wrap: wrap; gap: 5px; }
  .sc-attrs i { font-style: normal; font: 600 11px var(--ui); padding: 3px 8px; border-radius: 7px; background: rgb(255 255 255 / .05); color: var(--muted); letter-spacing: .05em; }
  .sc-attrs i b { color: var(--text-2); }
  .sc-attrs i.hi { background: color-mix(in srgb, var(--c) 28%, transparent); color: #f0e6d6; }
  .sc-attrs i.hi b { color: #fff; }
  .sc-gear { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
  .sc-gear span { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; cursor: help; border: 1px solid rgb(255 255 255 / .12);
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #000), color-mix(in srgb, var(--c) 18%, #000)); }
  .sc-gear small { color: var(--muted); font-size: 11.5px; margin-left: 4px; }
  .sc-deck { font-size: 12px; color: var(--ok); margin-top: auto; padding-top: 6px; }
  .sc-deck.bad { color: var(--danger); }
  .roster { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid rgb(255 255 255 / .07); }
  .vs-side.right .roster { justify-content: flex-end; }
  .rost { position: relative; }
  .rpick { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 5px; border-radius: 12px; border: 2px solid transparent; background: rgb(255 255 255 / .03); color: var(--text-2); cursor: pointer; font: 500 11.5px var(--ui); transition: transform var(--t), border-color var(--t); }
  .rpick:hover { transform: translateY(-2px); }
  .rost.on .rpick { border-color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); color: #fff; box-shadow: 0 0 18px color-mix(in srgb, var(--c) 40%, transparent); }
  .redit { position: absolute; top: -5px; right: -5px; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line-2); background: #1d1916; color: var(--text-2); display: grid; place-items: center; cursor: pointer; opacity: 0; transition: opacity var(--t); }
  .rost:hover .redit, .rost.on .redit { opacity: 1; }
  .redit:hover { background: var(--accent); color: #1a120b; }
  .vs-mid { display: grid; place-items: center; width: 70px; }
  .vs { font: 800 34px var(--display, serif); letter-spacing: .04em; color: #f0d8c8; width: 70px; height: 70px; border-radius: 50%; display: grid; place-items: center;
    background: radial-gradient(circle, #2a221d, #100d0b); border: 1px solid var(--accent); box-shadow: 0 0 0 5px rgb(0 0 0 / .5), 0 0 40px rgb(216 176 106 / .35); }
  .vs-foot { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(250px, .8fr) minmax(300px, 1fr); gap: 14px 22px; align-items: center; padding: 14px 18px; border-radius: 16px; background: rgb(16 14 12 / .88); border: 1px solid var(--line); max-width: 1560px; width: 100%; margin: 0 auto auto; }
  /* opções da partida: cartões iguais, alinhados numa grade */
  .opt-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .opt { display: grid; grid-template-columns: 20px 1fr; gap: 10px; align-items: start; padding: 9px 11px; border-radius: 11px; cursor: pointer; border: 1px solid rgb(255 255 255 / .07); background: rgb(255 255 255 / .025); transition: border-color var(--t), background var(--t); }
  .opt:hover { border-color: rgb(255 255 255 / .16); }
  .opt.on { border-color: rgb(74 222 128 / .35); background: rgb(74 222 128 / .05); }
  .opt.sub { margin-left: 0; border-style: dashed; }
  .opt input { margin-top: 1px; }
  .opt span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .opt b { font-size: 13px; line-height: 1.2; color: var(--text); }
  .opt small { font-size: 11.5px; color: var(--muted); line-height: 1.3; }
  .foot-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .foot-go { display: flex; flex-direction: column; gap: 10px; align-items: stretch; min-width: 0; }
  @media (max-width: 1200px) { .vs-foot { grid-template-columns: 1fr; } }
  .starter { display: flex; align-items: center; gap: 10px; padding: 0 2px; }
  .starter small { font: 600 10px var(--ui); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
  .starter .select-in { flex: 1; min-width: 0; }
  .select-in { height: 34px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text); padding: 0 10px; font: inherit; }
  .scene-btn { display: flex; align-items: center; gap: 10px; padding: 6px 10px 6px 6px; border-radius: 12px; border: 1px solid #6b5533; background: linear-gradient(180deg, #241d18, #14100d); color: var(--text); cursor: pointer; font: inherit; text-align: left; transition: border-color var(--t), box-shadow var(--t); }
  .scene-btn:hover { border-color: var(--accent); box-shadow: 0 0 18px rgb(216 176 106 / .22); }
  .scene-thumb { width: 74px; height: 44px; flex: none; border-radius: 8px; background: #1d1815 center / cover; image-rendering: pixelated; display: grid; place-items: center; color: var(--accent-2); border: 1px solid rgb(255 255 255 / .14); }
  .scene-thumb.rand { background: repeating-linear-gradient(45deg, #2a221c 0 8px, #201914 8px 16px); }
  .scene-tx { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .scene-tx small { font: 600 10px var(--ui); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  .scene-tx b { font-size: 14px; }
  .scene-modal { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 24px; background: rgb(4 3 3 / .72); backdrop-filter: blur(6px); }
  .scene-box { width: min(1040px, 100%); max-height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding: 22px 24px 24px; border-radius: 20px;
    background: linear-gradient(170deg, #211a16, #100d0b 70%); border: 1px solid #8a6d3b; box-shadow: 0 0 0 5px rgb(0 0 0 / .5), 0 30px 80px rgb(0 0 0 / .8), 0 0 80px rgb(240 196 90 / .12); }
  .scene-box header { display: flex; justify-content: space-between; align-items: flex-start; }
  .scene-box header small { font: 700 11px var(--ui); letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
  .scene-box h2 { font-size: 30px; color: #f6ead8; line-height: 1.1; }
  .scene-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .scene-card { display: flex; flex-direction: column; gap: 6px; padding: 7px 7px 10px; border-radius: 14px; border: 2px solid rgb(255 255 255 / .08); background: rgb(255 255 255 / .03); color: var(--text); cursor: pointer; font: inherit; text-align: left; transition: transform .15s, border-color .15s, box-shadow .15s; }
  .scene-card:hover { transform: translateY(-3px); border-color: rgb(255 255 255 / .28); }
  .scene-card.on { border-color: #f0c45a; box-shadow: 0 0 24px rgb(240 196 90 / .3); }
  .scene-card b { font-size: 14px; padding: 0 4px; }
  .scene-card small { font-size: 11.5px; color: var(--muted); padding: 0 4px; margin-top: -4px; }
  .sc-img { position: relative; display: grid; place-items: center; aspect-ratio: 16 / 9; border-radius: 9px; overflow: hidden; background: radial-gradient(ellipse at 50% 50%, #241e1a, #100e0c) center / cover; image-rendering: pixelated; color: #fff; }
  .sc-floor { position: absolute; left: 50%; top: 50%; width: 26%; aspect-ratio: 27 / 20; transform: translate(-50%, -50%); background: center / 100% 100% no-repeat; image-rendering: pixelated; opacity: .92; }
  .sc-check { position: absolute; right: 6px; top: 6px; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #f0c45a; color: #1a120b; }
  .sc-img.mosaic { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .sc-img.mosaic i { width: 100%; height: 100%; background: center / cover; filter: brightness(.6); }
  .sc-img.mosaic :global(svg) { position: absolute; filter: drop-shadow(0 2px 8px #000); }
  .btn.big { height: 46px; padding: 0 26px; font-size: 15px; }
  .dim { opacity: .45; pointer-events: none; }
  .place-help { align-items: center; }
  .place-help p { color: var(--muted); font-size: 13px; text-align: center; max-width: 520px; }

  /* ───── mesa ───── */
  .table { --row: clamp(64px, 9.4vh, 150px); --zone: clamp(52px, 7.2vh, 120px); --hand: clamp(110px, 22vh, 300px);
    height: 100%; display: grid; grid-template-columns: 1fr; min-height: 0; position: relative; }
  .main { position: relative; isolation: isolate; display: flex; flex-direction: column; gap: 5px; padding: 8px 14px 10px; min-height: 0; overflow: hidden;
    background: radial-gradient(ellipse at 50% 50%, #241e1a 0%, #100e0c 70%); }
  /* cenário: a imagem em pixel art por baixo e um escurecido por cima (mais forte em cima e embaixo, onde ficam mão e barras) */
  .main.scenic::before { content: ''; position: absolute; inset: 0; z-index: -2; background: var(--scene) center / cover no-repeat; image-rendering: pixelated; }
  .main.scenic::after { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
    background: linear-gradient(180deg, rgb(8 6 5 / .82) 0%, rgb(8 6 5 / .34) 20%, rgb(8 6 5 / .22) 48%, rgb(8 6 5 / .4) 66%, rgb(8 6 5 / .9) 100%), radial-gradient(ellipse at 50% 46%, transparent 40%, rgb(0 0 0 / .5) 100%); }

  /* placa do herói: couro escuro com filete de ouro, retrato num medalhão */
  .hbar { position: relative; display: flex; align-items: center; gap: 12px; padding: 5px 20px 5px 12px; flex: none; z-index: 2; align-self: center; max-width: 100%;
    background: linear-gradient(180deg, #2c241e 0%, #1a1511 55%, #120f0c 100%); border: 1px solid #6b5533; border-radius: 30px 14px 14px 30px;
    box-shadow: 0 0 0 3px rgb(0 0 0 / .42), 0 10px 26px rgb(0 0 0 / .6), inset 0 1px 0 rgb(255 220 150 / .16), inset 0 -1px 0 rgb(0 0 0 / .6); }
  .hbar::after { content: ''; position: absolute; right: -6px; top: 50%; width: 10px; height: 10px; margin-top: -5px; transform: rotate(45deg); background: linear-gradient(135deg, #f3d68c, #9a6f24); border: 1px solid #1a120b; }
  .hbar.active { border-color: color-mix(in srgb, var(--c) 70%, #f0c45a); box-shadow: 0 0 0 3px rgb(0 0 0 / .42), 0 0 22px color-mix(in srgb, var(--c) 45%, transparent), 0 10px 26px rgb(0 0 0 / .6), inset 0 1px 0 rgb(255 220 150 / .2); }
  .hb-pic { position: relative; flex: none; line-height: 0; margin: -10px 0 -10px -6px; border-radius: 50%; box-shadow: 0 0 0 2px #14100d, 0 0 0 4px color-mix(in srgb, var(--c) 80%, #000), 0 0 0 5px #d9b56a, 0 6px 14px rgb(0 0 0 / .7); }
  .hb-lv { position: absolute; right: -5px; bottom: -5px; min-width: 20px; height: 20px; padding: 0 4px; border-radius: 10px; display: grid; place-items: center; font: 800 11px/1 var(--ui); font-style: normal; color: #2a1a05; background: linear-gradient(180deg, #ffe7a6, #c9962f); border: 1.5px solid #14100d; }
  .who { min-width: 96px; }
  .who b { display: block; font-size: 16px; line-height: 1.1; color: #f6ead8; letter-spacing: .03em; }
  .who small { color: color-mix(in srgb, var(--c) 45%, #cfc6b8); font-size: 11.5px; }
  .stat { display: flex; flex-direction: column; gap: 1px; padding: 0 12px; border-left: 1px solid rgb(255 220 150 / .12); cursor: help; }
  .cap { font: 600 9.5px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: #a89a86; }
  .val { display: inline-flex; align-items: center; gap: 4px; font: 600 14px var(--ui); font-variant-numeric: tabular-nums; min-height: 20px; border-radius: 6px; }
  .val small { color: var(--muted); font-weight: 500; font-size: 11.5px; margin-left: 2px; }
  .hpv { color: #e8a59a; }
  .hpbar { width: 96px; height: 8px; border-radius: 4px; background: #0b0908; overflow: hidden; margin-left: 6px; box-shadow: inset 0 1px 2px #000, 0 0 0 1px rgb(255 220 150 / .14); }
  .hpbar i { display: block; height: 100%; background: linear-gradient(180deg, #ef6a55, #a02c20); transition: width .4s; }
  .vig { color: #e5866f; } .man { color: #7fb0ff; } .xpv { color: var(--accent); } .stk { color: #f0c45a; }
  .stk.used { opacity: .45; }
  .pip { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid currentColor; opacity: .35; }
  .pip.on { background: currentColor; opacity: 1; }
  .pip.extra { background: #fff; border-color: #fff; opacity: 1; box-shadow: 0 0 6px currentColor; }
  .thinking { color: var(--accent-2); font-size: 12.5px; animation: pulse 1.2s ease-in-out infinite; padding-left: 12px; border-left: 1px solid rgb(255 220 150 / .12); white-space: nowrap; }
  @keyframes pulse { 50% { opacity: .45; } }

  .ohand { display: flex; justify-content: center; height: calc(var(--zone) * 1.35); flex: none; }
  .ohand .back { height: 100%; aspect-ratio: 750 / 1050; margin: 0 -12px; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 10px rgb(0 0 0 / .6); background: #2a2420; }
  .ohand .back img { width: 100%; height: 100%; display: block; }

  .side-field { display: flex; flex-direction: column; gap: 6px; align-items: center; flex: none; }
  .bfield { display: flex; flex-direction: row; gap: 12px; align-items: stretch; justify-content: center; }
  .rows { display: flex; flex-direction: column; gap: 6px; }
  .off-spacer { width: calc(var(--row) * 1.35); flex: none; }
  .row { display: grid; grid-template-columns: repeat(3, calc(var(--row) * 1.35)); gap: 10px; }
  /* casa: um retalho de piso em pixel art, no clima do cenário */
  .slot { height: var(--row); border-radius: 10px; border: 0; background: none; color: var(--text); display: grid; place-items: center; cursor: pointer; font: inherit; position: relative; padding: 4px; overflow: hidden; }
  .slot::before { content: ''; position: absolute; inset: 0; z-index: 0; background: var(--floor, none) center / 100% 100% no-repeat; image-rendering: pixelated; opacity: .88; filter: drop-shadow(0 3px 0 rgb(0 0 0 / .35)); }
  .slot:hover::before { opacity: 1; }
  .slot.off { width: calc(var(--row) * 1.35); height: auto; flex: none; border-radius: 14px; }
  .slot.off::before { background: linear-gradient(180deg, color-mix(in srgb, var(--c) 30%, rgb(21 18 15 / .86)), rgb(14 12 10 / .9) 85%); opacity: 1; filter: none; border-radius: 14px; }
  /* ocupada: o piso escurece embaixo (para ler nome e números) e ganha um aro na cor do dono */
  .slot:has(.unit)::before { opacity: 1; border-radius: 10px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--c) 22%, transparent) 0%, rgb(0 0 0 / .1) 38%, rgb(6 5 4 / .82) 100%), var(--floor, none) center / 100% 100% no-repeat; }
  .slot:has(.unit) { box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 65%, #000), 0 6px 16px rgb(0 0 0 / .55); }
  .slot.off:has(.unit)::before { background: linear-gradient(180deg, color-mix(in srgb, var(--c) 34%, rgb(21 18 15 / .9)), rgb(12 10 9 / .94) 85%); }
  .slot.hero { box-shadow: 0 0 0 2px var(--c), 0 0 0 3px rgb(0 0 0 / .5), 0 0 18px color-mix(in srgb, var(--c) 40%, transparent), 0 6px 16px rgb(0 0 0 / .55); overflow: visible; z-index: 3; }
  /* o boneco fica de pé sobre a casa (passa da borda de cima) */
  .doll { position: absolute; left: 50%; bottom: 30%; transform: translateX(-50%); line-height: 0; z-index: 0; filter: drop-shadow(0 3px 3px rgb(0 0 0 / .6)); }
  .doll.tall { bottom: 26%; }
  /* afligido: aura roxa pulsando no boneco */
  .doll.sick { animation: sick 1.6s ease-in-out infinite; }
  @keyframes sick { 0%, 100% { filter: drop-shadow(0 3px 3px rgb(0 0 0 / .6)) drop-shadow(0 0 3px #b06bff); } 50% { filter: drop-shadow(0 3px 3px rgb(0 0 0 / .6)) drop-shadow(0 0 11px #b06bff) hue-rotate(-12deg); } }
  .slot.hero.ready { animation: readyPulse 1.6s ease-in-out infinite; }
  @keyframes readyPulse { 50% { box-shadow: 0 0 0 2px #f0c45a, 0 0 22px rgb(240 196 90 / .55); } }
  .slot.exh .doll, .slot.exh .u-ic { filter: grayscale(.7) brightness(.72) drop-shadow(0 3px 3px rgb(0 0 0 / .6)); }
  .slot.target { box-shadow: 0 0 0 2px #f0c45a, 0 0 18px rgb(240 196 90 / .6); cursor: crosshair; animation: none; }
  .slot.selected { box-shadow: 0 0 0 2px #7fb0ff, 0 0 18px rgb(127 176 255 / .6); animation: none; }
  .unit { display: flex; flex-direction: column; align-items: center; gap: 2px; position: relative; z-index: 1; }
  .mini { position: absolute; inset: 0; line-height: 0; z-index: 0; border-radius: 10px; overflow: hidden; }
  .mini :global(.hp) { width: 100% !important; height: 100% !important; border-radius: 0; }
  .mini::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 35%, rgb(8 6 5 / .88) 82%); }
  .slot.fig { overflow: visible; z-index: 2; }
  .slot.hero .unit, .slot.fig .unit { align-self: end; padding-bottom: 2px; text-shadow: 0 1px 4px #000, 0 0 2px #000; }
  .strike-tag { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); white-space: nowrap; border: 1px solid rgb(255 255 255 / .14); z-index: 4; font: 700 9px var(--ui); text-transform: uppercase; letter-spacing: .08em; padding: 2px 7px; border-radius: 6px; background: rgb(10 8 7 / .86); color: var(--muted); }
  .strike-tag.on { background: linear-gradient(180deg, #ffd98a, #d9a23a); color: #1a120b; border-color: #fff0c4; box-shadow: 0 0 10px rgb(240 196 90 / .5); }
  .empty { position: relative; z-index: 1; font: 700 9.5px var(--ui); color: #fff; text-transform: uppercase; letter-spacing: .1em; padding: 2px 7px; border-radius: 99px; background: rgb(0 0 0 / .32); opacity: .75; }
  .u-nm { font-size: 12.5px; font-weight: 600; text-align: center; line-height: 1.1; }
  .u-st { display: flex; gap: 12px; font: 700 14px var(--ui); }
  .atk { color: #f0c45a; display: inline-flex; gap: 3px; align-items: center; }
  .atk.used { opacity: .4; }
  .def { color: #e8a59a; display: inline-flex; gap: 3px; align-items: center; }

  /* efeitos ativos: uma coluna de selos ao lado do boneco (passe o mouse para ler) */
  .u-fx { position: absolute; left: 4px; top: 4px; z-index: 5; display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
  .slot.hero .u-fx, .slot.fig .u-fx { left: -7px; top: -4px; }
  .fx { font-style: normal; display: inline-flex; align-items: center; justify-content: center; gap: 2px; min-width: 24px; height: 24px; padding: 0 5px; border-radius: 12px; cursor: help;
    border: 1.5px solid var(--k1); background: radial-gradient(circle at 35% 28%, var(--k2), var(--k3)); color: #fff; box-shadow: 0 2px 5px rgb(0 0 0 / .7), 0 0 8px color-mix(in srgb, var(--k1) 55%, transparent); }
  .fx b { font: 800 11px/1 var(--ui); }
  .fx.good { --k1: #8ec5ff; --k2: #4f8fe0; --k3: #17376b; }
  .fx.bad { --k1: #e3a3ff; --k2: #a54fd6; --k3: #46155f; animation: fxBad 1.8s ease-in-out infinite; }
  .fx.trait { --k1: #f0d089; --k2: #b98a2c; --k3: #4a3410; }
  .fx.dim { --k1: #8b8580; --k2: #4f4a46; --k3: #24211f; color: #d6d0c8; box-shadow: 0 2px 5px rgb(0 0 0 / .7); }
  @keyframes fxBad { 50% { box-shadow: 0 2px 5px rgb(0 0 0 / .7), 0 0 14px #c56bff; } }
  /* protegido: uma bolha de escudo em volta do boneco */
  .ward-bubble { position: absolute; left: 10%; bottom: 20%; width: 80%; aspect-ratio: 1; border-radius: 50%; z-index: 1; pointer-events: none;
    background: radial-gradient(circle at 34% 28%, rgb(215 235 255 / .42), rgb(110 165 255 / .1) 52%, rgb(110 165 255 / .3) 100%); border: 2px solid rgb(165 210 255 / .85);
    box-shadow: 0 0 18px rgb(110 170 255 / .7), inset 0 0 14px rgb(170 215 255 / .5); animation: ward 2.4s ease-in-out infinite; }
  @keyframes ward { 50% { box-shadow: 0 0 28px rgb(110 170 255 / .95), inset 0 0 20px rgb(190 225 255 / .7); } }
  /* marcado: uma mira vermelha sobre o boneco */
  .mark-ring { position: absolute; left: 50%; top: 18%; margin-left: -15px; z-index: 2; pointer-events: none; color: #ff5a48; line-height: 0; filter: drop-shadow(0 0 5px #ff2a1a) drop-shadow(0 1px 1px #000); animation: markSpin 6s linear infinite; }
  @keyframes markSpin { to { transform: rotate(360deg); } }

  /* área atingida (fileira ou campo inteiro) */
  .row.aoe, .rows.aoe { border-radius: 14px; outline: 2px solid #ff6a4a; outline-offset: 4px; background: rgb(255 90 60 / .1); box-shadow: 0 0 26px rgb(255 90 60 / .35); animation: aoePulse 1.1s ease-in-out infinite; }
  .rows.aoe.ally, .slot.aoe.ally { outline-color: #6fe39b; background: rgb(90 220 140 / .1); box-shadow: 0 0 26px rgb(90 220 140 / .35); }
  .slot.aoe { outline: 2px solid #ff6a4a; outline-offset: 3px; animation: aoePulse 1.1s ease-in-out infinite; }
  @keyframes aoePulse { 50% { outline-color: #ffd0a0; } }
  /* seta de mira */
  .aim { position: absolute; inset: 0; overflow: visible; }
  .arrow { --a1: #cfe0ff; --a2: #6f9be8; }
  .arrow.foe { --a1: #ffd9a0; --a2: #ff4d2e; }
  .arrow.ally { --a1: #d6ffe4; --a2: #3fc97a; }
  .arrow.slot { --a1: #fff0c4; --a2: #f0b84a; }
  .a-shadow { fill: none; stroke: #000; stroke-width: 12; stroke-linecap: round; opacity: .38; }
  .a-body { fill: var(--a2); stroke: var(--a1); stroke-width: 1.6; stroke-linejoin: round; opacity: .93; }
  .a-head { fill: var(--a1); stroke: #fff; stroke-width: 1.4; stroke-linejoin: round; }
  .a-flow { fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 3 15; opacity: .85; animation: aimFlow .55s linear infinite; }
  .arrow.free .a-body { opacity: .6; }
  .arrow.free .a-head { opacity: .8; }
  @keyframes aimFlow { to { stroke-dashoffset: -18; } }

  .zone { height: var(--zone); width: calc(var(--row) * 4.2 + 20px); display: flex; gap: 8px; justify-content: center; align-items: center; border-radius: 10px; background: rgb(0 0 0 / .18); border: 1px solid rgb(255 255 255 / .05); padding: 4px; }
  .zc { height: 100%; aspect-ratio: 750 / 1050; position: relative; border-radius: 5px; box-shadow: 0 4px 12px rgb(0 0 0 / .6); cursor: zoom-in; }
  .zc.stance { outline: 2px solid var(--accent); outline-offset: 1px; }
  .ztag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 1; font: 600 10px var(--ui); padding: 1px 6px; border-radius: 6px; background: var(--accent); color: #1a120b; white-space: nowrap; display: inline-flex; gap: 3px; align-items: center; }
  .zhint { font-size: 11px; color: rgb(255 255 255 / .22); text-transform: uppercase; letter-spacing: .08em; }
  /* faixa do meio: de quem é a vez e o que fazer agora */
  .mid { --mc: #8a7a66; display: flex; align-items: center; justify-content: center; gap: 12px; flex: none; min-height: 32px; }
  .mid.mine { --mc: #f0c45a; } .mid.foe { --mc: #d0584a; } .mid.warn { --mc: #ff7a66; }
  .mid-orn { position: relative; flex: 1; max-width: 300px; height: 2px; background: linear-gradient(90deg, transparent, var(--mc)); }
  .mid-orn::after { content: ''; position: absolute; right: -4px; top: 50%; width: 8px; height: 8px; margin-top: -4px; transform: rotate(45deg); background: var(--mc); box-shadow: 0 0 8px var(--mc); }
  .mid-orn.r { transform: scaleX(-1); }
  .mid-plate { display: flex; align-items: center; justify-content: center; gap: 14px; min-width: 250px; max-width: min(860px, 58%); padding: 4px 26px; border-radius: 99px;
    background: linear-gradient(180deg, #2a221c, #14100d); border: 1px solid var(--mc); color: color-mix(in srgb, var(--mc) 70%, #fff);
    box-shadow: 0 0 0 3px rgb(0 0 0 / .4), 0 6px 18px rgb(0 0 0 / .55), 0 0 16px color-mix(in srgb, var(--mc) 25%, transparent), inset 0 1px 0 rgb(255 255 255 / .1);
    font: 600 14.5px var(--display, serif); letter-spacing: .05em; }
  .mid-plate > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  /* avisos e narração: letra comum, mais fácil de ler que a de título */
  .mid-plate.long { font: 500 13.5px var(--ui); letter-spacing: 0; }
  .mid.warn .mid-plate { background: linear-gradient(180deg, #3a1813, #1c0c0a); color: #ffcabf; font-weight: 700; }
  .cancel-btn { flex: none; display: inline-flex; gap: 4px; align-items: center; padding: 2px 10px; border-radius: 99px; border: 1px solid var(--line-2); background: rgb(22 19 17 / .9); color: var(--text-2); font: 600 12px var(--ui); letter-spacing: 0; cursor: pointer; }
  .cancel-btn:hover { border-color: var(--danger); color: #ffb4a6; }

  .hand { display: flex; justify-content: center; align-items: flex-end; flex: 1 1 0; min-height: 90px; padding-bottom: 2px; }
  .hc { height: 100%; max-height: calc(var(--hand) * 1.15); aspect-ratio: 750 / 1050; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 6px; margin: 0 -6px; transition: transform .15s, margin .15s; position: relative; }
  .hc:hover { transform: translateY(-14px); z-index: 2; }
  .hc.no { filter: brightness(.55) saturate(.6); }
  .hc.react { filter: brightness(.8); }
  .dmgb, .rtag { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%); z-index: 1; display: inline-flex; gap: 3px; align-items: center; font: 800 14px var(--ui); padding: 2px 9px; border-radius: 9px; background: #2a0f0b; color: #ffcf7a; border: 1.5px solid #c4473a; box-shadow: 0 3px 8px rgb(0 0 0 / .6); white-space: nowrap; }
  .rtag { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; background: #101a2e; color: #a9c8ff; border-color: #4f7fd0; }
  .hc.sel { outline: 3px solid #7fb0ff; transform: translateY(-18px); z-index: 2; }

  /* grimório e cemitério: cada um sobre a sua base (círculo arcano / lápide), com o nome embaixo */
  .pilebox { position: absolute; z-index: 1; display: grid; justify-items: center; gap: 14px; left: 30px; bottom: 16px; }
  .pilebox.gravebox { left: auto; right: 30px; }
  .pilebox.top { bottom: auto; top: 56px; }
  .pbase { position: absolute; inset: -12px -16px 24px; border-radius: 16px; z-index: -1; overflow: hidden; }
  .deckbox .pbase { background: radial-gradient(circle at 50% 46%, #3d2c74 0%, #1b1436 55%, #0e0b1c 100%); border: 1px solid #7a62c9; box-shadow: 0 0 0 3px rgb(0 0 0 / .45), 0 10px 26px rgb(0 0 0 / .65), 0 0 22px rgb(122 98 201 / .28), inset 0 1px 0 rgb(220 200 255 / .2); }
  .gravebox .pbase { background: radial-gradient(circle at 50% 30%, #3c4442 0%, #1e2322 55%, #101312 100%); border: 1px solid #76827c; box-shadow: 0 0 0 3px rgb(0 0 0 / .45), 0 10px 26px rgb(0 0 0 / .65), 0 0 22px rgb(120 200 160 / .12), inset 0 1px 0 rgb(220 240 230 / .16); }
  .prune { position: absolute; left: 50%; top: 50%; width: 150%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; opacity: .5;
    background: repeating-conic-gradient(from 0deg, rgb(190 165 255 / .5) 0deg 4deg, transparent 4deg 15deg); -webkit-mask-image: radial-gradient(circle, transparent 46%, #000 48%, #000 54%, transparent 56%); mask-image: radial-gradient(circle, transparent 46%, #000 48%, #000 54%, transparent 56%); animation: runeSpin 40s linear infinite; }
  .gravebox .prune { animation: none; opacity: .35; background: radial-gradient(ellipse at 50% 100%, rgb(130 230 180 / .5), transparent 60%); -webkit-mask-image: none; mask-image: none; width: 100%; aspect-ratio: auto; height: 60%; top: auto; bottom: 0; transform: translateX(-50%); border-radius: 0; }
  @keyframes runeSpin { to { transform: translate(-50%, -50%) rotate(360deg); } }
  .pile { position: relative; width: calc(var(--hand) * .55); aspect-ratio: 750 / 1050; border-radius: 7px; border: 1px dashed rgb(255 255 255 / .16); background: rgb(0 0 0 / .3); display: grid; place-items: center; }
  .pile.grave { cursor: pointer; padding: 0; color: #9fb0a8; transition: transform .15s; }
  .pile.grave:hover { transform: translateY(-3px); }
  .pile.deck { color: #b9a6f2; }
  .stack { position: absolute; inset: 0; border-radius: 7px; overflow: hidden; box-shadow: calc(var(--n) * 1px) calc(var(--n) * 2px) 0 #1c1815, calc(var(--n) * 2px) calc(var(--n) * 4px) 0 #12100e, 0 8px 18px rgb(0 0 0 / .6); }
  .stack img { width: 100%; height: 100%; display: block; }
  .gtop { position: absolute; inset: 0; border-radius: 7px; overflow: hidden; box-shadow: 0 8px 18px rgb(0 0 0 / .6); }
  .gempty { opacity: .5; line-height: 0; }
  .plabel { display: inline-flex; gap: 6px; align-items: center; padding: 3px 12px; border-radius: 99px; white-space: nowrap; font: 700 10.5px var(--ui); letter-spacing: .12em; text-transform: uppercase; background: #0f0d0c; border: 1px solid; box-shadow: 0 4px 10px rgb(0 0 0 / .6); }
  .plabel b { font-size: 13px; letter-spacing: 0; color: #fff; }
  .deckbox .plabel { color: #cbbcff; border-color: #7a62c9; }
  .gravebox .plabel { color: #c4d2ca; border-color: #76827c; }

  /* ações do turno: painel flutuante acima do cemitério */
  .actions { position: absolute; right: 14px; bottom: calc(16px + var(--hand) * .77 + 62px); z-index: 6; width: 214px; display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 16px;
    background: linear-gradient(170deg, color-mix(in srgb, var(--c) 16%, #1e1915), #100d0b 75%); border: 1px solid #8a6d3b;
    box-shadow: 0 0 0 4px rgb(0 0 0 / .42), 0 18px 40px rgb(0 0 0 / .7), 0 0 30px rgb(240 196 90 / .1), inset 0 1px 0 rgb(255 220 150 / .14); transition: opacity .2s, filter .2s; }
  .actions.idle { opacity: .7; filter: saturate(.55); }
  .act-title { display: flex; align-items: center; gap: 8px; font: 700 9.5px var(--ui); letter-spacing: .18em; text-transform: uppercase; color: #d9b56a; white-space: nowrap; }
  .act-title i { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #8a6d3b); }
  .act-title i:last-child { transform: scaleX(-1); }
  .act { display: flex; gap: 10px; align-items: center; padding: 7px 10px 7px 7px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left; color: var(--text);
    background: linear-gradient(180deg, rgb(255 255 255 / .07), rgb(0 0 0 / .28)); border: 1px solid rgb(255 255 255 / .12); transition: transform .12s, border-color .12s, box-shadow .12s; }
  .act:hover:not(:disabled) { transform: translateX(-3px); border-color: #d9b56a; box-shadow: 0 6px 18px rgb(0 0 0 / .5); }
  .act:disabled { opacity: .42; cursor: default; }
  .act-ic { width: 36px; height: 36px; flex: none; border-radius: 50%; display: grid; place-items: center; color: #f0d089; background: radial-gradient(circle at 35% 30%, #4a3a22, #14100d); border: 1px solid #8a6d3b; }
  .act-tx { display: flex; flex-direction: column; min-width: 0; }
  .act-tx b { font: 700 12.5px var(--display, serif); letter-spacing: .02em; white-space: nowrap; }
  .act-tx small { font-size: 11px; color: var(--muted); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .act.lit { border-color: #f0c45a; box-shadow: 0 0 14px rgb(240 196 90 / .32); }
  .act.lit .act-ic { background: linear-gradient(180deg, #ffe7a6, #c9962f); color: #2a1a05; border-color: #fff0c4; }
  .act.end:not(:disabled) { background: linear-gradient(180deg, #edcb7c, #b5862b); color: #24160a; border-color: #ffe9b0; }
  .act.end:not(:disabled) .act-ic { background: radial-gradient(circle at 35% 30%, #3a2c16, #14100d); color: #ffdf94; border-color: #5b4420; }
  .act.end:not(:disabled) small { color: #4d3711; }

  /* canto de cima: registro, música e menu */
  .toolbar { position: absolute; right: 14px; top: 10px; z-index: 31; display: flex; gap: 6px; align-items: flex-start; }
  .tool { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; border: 1px solid #6b5533; background: linear-gradient(180deg, #2a221c, #14100d); color: #d8c9ae; cursor: pointer; box-shadow: 0 6px 16px rgb(0 0 0 / .55); }
  .tool:hover, .tool.on { color: #ffdf94; border-color: #d9b56a; }
  .toolbar :global(.mp.float) { position: relative; right: auto; top: auto; transform: none; }
  .toolbar :global(.mp.float .pill) { width: 36px; height: 36px; padding: 0; justify-content: center; border-radius: 10px; border-color: #6b5533; background: linear-gradient(180deg, #2a221c, #14100d); color: #d8c9ae; }
  .toolbar :global(.mp.float .pill span) { display: none; }
  .toolbar :global(.mp.float.open) { position: absolute; right: 42px; top: 0; }

  .gear-panel { position: absolute; left: 14px; width: 214px; bottom: calc(16px + var(--hand) * .77 + 62px); display: flex; flex-direction: column; gap: 6px; padding: 9px 10px; border-radius: 12px; background: rgb(14 12 11 / .86); border: 1px solid rgb(255 220 150 / .14); border-left: 3px solid var(--c); z-index: 1; box-shadow: 0 10px 24px rgb(0 0 0 / .5); }
  .gear-panel.top { bottom: auto; top: calc(56px + var(--hand) * .77 + 62px); }
  .gtitle { font: 600 9.5px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gi { display: flex; gap: 8px; align-items: center; cursor: help; }
  .gic { width: 32px; height: 32px; flex: none; border-radius: 8px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #000), color-mix(in srgb, var(--c) 18%, #000)); border: 1px solid rgb(255 255 255 / .12); }
  .gic.sm { width: 30px; height: 30px; }
  .gtx { display: flex; flex-direction: column; min-width: 0; }
  .gtx b { font-size: 12.5px; line-height: 1.15; }
  .gtx small { font-size: 11px; color: var(--muted); line-height: 1.25; }
  .gtx em { font-style: normal; color: #f0c45a; font-weight: 700; }
  .gchips { display: flex; flex-wrap: wrap; gap: 5px; }
  .gchip { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: help; flex: 1 0 30px; min-width: 0; }
  .gchip small { font: 600 9.5px var(--ui); color: var(--text-2); white-space: nowrap; }

  .banner { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 40; pointer-events: none; display: flex; flex-direction: column; align-items: center; padding: 14px 70px; background: linear-gradient(90deg, transparent, rgb(10 8 7 / .92) 18%, rgb(10 8 7 / .92) 82%, transparent); border-block: 1px solid color-mix(in srgb, #c4473a 60%, transparent); }
  .banner.mine { border-block-color: color-mix(in srgb, var(--accent) 70%, transparent); }
  .banner b { font-family: var(--display, serif); font-size: 34px; letter-spacing: .06em; text-transform: uppercase; color: #f0d8c8; text-shadow: 0 2px 14px rgb(0 0 0 / .8); white-space: nowrap; }
  .banner.mine b { color: var(--accent); }
  .banner small { font-size: 12px; color: var(--muted); letter-spacing: .14em; text-transform: uppercase; }
  .shown { position: absolute; right: 150px; top: 50%; transform: translateY(-52%); width: clamp(250px, 21vw, 360px); z-index: 39; pointer-events: none; display: flex; flex-direction: column; gap: 6px; align-items: center; filter: drop-shadow(0 20px 40px rgb(0 0 0 / .9)); }
  .shown span { font: 700 13px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: #f0d8c8; background: rgb(10 8 7 / .9); padding: 4px 12px; border-radius: 8px; }
  .shown.react span { background: #14244a; color: #cfe0ff; }
  .shown.countered span { background: #5a1410; color: #ffd0c8; font-size: 16px; }
  .shown.countered :global(img) { filter: grayscale(.9) brightness(.6); }

  /* subida de nível */
  .lvlfx { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 41; pointer-events: none; display: grid; justify-items: center; gap: 0; padding: 30px 90px; animation: lvlIn 1.6s cubic-bezier(.2, .8, .3, 1) both; }
  .lvlfx .rays { position: absolute; left: 50%; top: 50%; width: 520px; height: 520px; margin: -260px; border-radius: 50%; z-index: -1; opacity: .55;
    background: repeating-conic-gradient(from 0deg, rgb(240 196 90 / .55) 0deg 6deg, transparent 6deg 18deg); -webkit-mask-image: radial-gradient(circle, #000 12%, transparent 68%); mask-image: radial-gradient(circle, #000 12%, transparent 68%); animation: spin 5s linear infinite; }
  .lvlfx small { font: 600 13px var(--ui); letter-spacing: .2em; text-transform: uppercase; color: #f3e6cf; }
  .lvlfx b { font: 800 64px/1 var(--display, serif); color: #ffd98a; text-shadow: 0 0 30px rgb(240 196 90 / .8), 0 4px 0 #6b4a12; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
  .lvlfx i { font: 600 14px var(--ui); font-style: normal; letter-spacing: .16em; text-transform: uppercase; color: #f0c45a; }
  .lvlfx:not(.mine) b { font-size: 44px; color: #f0d8c8; }
  @keyframes lvlIn { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.4); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); } 30% { transform: translate(-50%, -50%) scale(1); } 85% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -56%) scale(1.04); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .lvbox { position: relative; overflow: hidden; width: min(640px, 92%); display: flex; flex-direction: column; gap: 14px; padding: 24px 26px 26px; border-radius: 20px;
    background: linear-gradient(170deg, color-mix(in srgb, var(--c) 18%, #1c1815), #12100e 70%); border: 1px solid #8a6d3b; box-shadow: 0 0 0 5px rgb(0 0 0 / .5), 0 30px 80px rgb(0 0 0 / .8), 0 0 80px rgb(240 196 90 / .2); }
  .lv-rays { position: absolute; left: 50%; top: -300px; width: 700px; height: 700px; margin-left: -350px; border-radius: 50%; opacity: .14; pointer-events: none;
    background: repeating-conic-gradient(from 0deg, #f0c45a 0deg 5deg, transparent 5deg 16deg); -webkit-mask-image: radial-gradient(circle, #000 10%, transparent 62%); mask-image: radial-gradient(circle, #000 10%, transparent 62%); animation: spin 14s linear infinite; }
  .lv-head { display: flex; gap: 14px; align-items: center; position: relative; }
  .lv-head small { font: 600 11px var(--ui); letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
  .lv-head h2 { font-size: 38px; line-height: 1; color: #ffd98a; text-shadow: 0 0 22px rgb(240 196 90 / .5); }
  .lv-opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; position: relative; }
  .lv-opt { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 18px 10px 14px; border-radius: 16px; cursor: pointer; font: inherit; color: var(--text);
    background: linear-gradient(180deg, rgb(255 255 255 / .05), rgb(0 0 0 / .25)); border: 1px solid rgb(255 255 255 / .12); transition: transform .15s, border-color .15s, box-shadow .15s; }
  .lv-opt:hover { transform: translateY(-4px); border-color: currentColor; box-shadow: 0 12px 30px rgb(0 0 0 / .5), 0 0 24px color-mix(in srgb, currentColor 35%, transparent); }
  .lv-opt.vig { color: #e5866f; } .lv-opt.man { color: #7fb0ff; } .lv-opt.vid { color: #e8a59a; }
  .lv-ic { width: 70px; height: 70px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, currentColor 30%, #000), #0d0b0a); border: 1px solid color-mix(in srgb, currentColor 50%, transparent); }
  .lv-opt b { font: 700 19px var(--display, serif); color: #f6ead8; }
  .lv-opt small { font-size: 12px; color: var(--muted); text-align: center; }
  .lv-opt em { font: 700 13px var(--ui); font-style: normal; margin-top: 4px; }

  /* janela de resposta (Reação) */
  .respond { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 44; display: flex; gap: 22px; align-items: center; padding: 20px 24px; border-radius: 18px;
    background: rgb(16 13 12 / .96); border: 1px solid #4f7fd0; box-shadow: 0 0 0 5px rgb(0 0 0 / .45), 0 30px 80px rgb(0 0 0 / .8), 0 0 60px rgb(79 127 208 / .25); }
  .rcard { width: clamp(230px, 19vw, 320px); flex: none; filter: drop-shadow(0 16px 30px rgb(0 0 0 / .8)); }
  .ratk { width: 190px; height: 230px; flex: none; border-radius: 16px; display: grid; place-items: center; gap: 4px; align-content: center; color: #ff9c8c;
    background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--c) 50%, #1a1512), #0c0a09 80%); border: 1px solid color-mix(in srgb, var(--c) 55%, #000); }
  .rtarget { font-size: 13px; color: var(--text-2); }
  .rtarget b { color: var(--text); }
  .rside { display: flex; flex-direction: column; gap: 10px; max-width: 320px; }
  .rtitle { font: 700 11px var(--ui); letter-spacing: .18em; text-transform: uppercase; color: #a9c8ff; }
  .rside h3 { font-size: 26px; line-height: 1.05; color: #f6ead8; }
  .rreacts { display: flex; gap: 10px; flex-wrap: wrap; }
  .rr { width: 120px; padding: 0; border: 2px solid #4f7fd0; border-radius: 9px; background: #101a2e; cursor: pointer; display: flex; flex-direction: column; overflow: hidden; color: #cfe0ff; font: 700 12px var(--ui); transition: transform .15s; }
  .rr:hover { transform: translateY(-4px); box-shadow: 0 0 22px rgb(79 127 208 / .6); }
  .rr span { padding: 5px 0; text-transform: uppercase; letter-spacing: .1em; }

  /* registro da batalha: abre a partir do botão no canto */
  .flog { position: relative; }
  .flog-panel { position: absolute; right: 0; top: 42px; width: 310px; height: min(430px, 56vh); display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 14px; background: rgb(18 15 14 / .97); border: 1px solid #6b5533; box-shadow: 0 18px 50px rgb(0 0 0 / .75); }
  .flog-head { display: flex; align-items: center; justify-content: space-between; }
  .log { flex: 1; overflow-y: auto; font-size: 12.5px; color: var(--text-2); min-height: 0; }
  .log p { margin: 2px 0; }
  .log p.turn { color: var(--accent-2); font-weight: 600; margin-top: 8px; }

  .tipbox { position: fixed; z-index: 70; transform: translateX(-50%); width: max-content; max-width: 300px; pointer-events: none; display: flex; flex-direction: column; gap: 3px; padding: 9px 12px; border-radius: 9px; background: #1d1916; border: 1px solid var(--line-2); box-shadow: 0 10px 28px rgb(0 0 0 / .7); font-size: 12.5px; line-height: 1.4; color: var(--text-2); }
  .tipbox.up { transform: translate(-50%, -100%); }
  .tipbox b { color: var(--accent); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .fxlayer { position: fixed; inset: 0; pointer-events: none; z-index: 45; }
  .float { position: fixed; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; animation: floatUp 2s cubic-bezier(.2, .7, .3, 1) forwards; white-space: nowrap; }
  .float b { font: 800 17px var(--ui); text-shadow: 0 2px 6px #000, 0 0 2px #000; }
  .float.big b { font-size: 34px; }
  .float small { font: 600 11px var(--ui); color: #eee; background: rgb(0 0 0 / .7); padding: 1px 7px; border-radius: 6px; margin-top: 2px; }
  .float.dmg b { color: #ff6a55; } .float.heal b { color: #6fe39b; } .float.ward b { color: #8fbaff; }
  .float.curse b { color: #c79bff; } .float.death b { color: #d9d0c4; } .float.xp b { color: #f0c45a; } .float.info b { color: #9fc4ff; }
  .float.vigor b { color: #e5866f; } .float.mana b { color: #7fb0ff; }
  @keyframes floatUp {
    0% { opacity: 0; transform: translate(-50%, -30%) scale(.5); }
    10% { opacity: 1; transform: translate(-50%, -50%) scale(1.25); }
    22% { transform: translate(-50%, -50%) scale(1); }
    78% { opacity: 1; }
    100% { opacity: 0; transform: translate(-50%, calc(-50% - 56px)) scale(.95); }
  }
  .fxlayer :global(.bolt) { position: fixed; width: 16px; height: 16px; border-radius: 50%; }
  .fxlayer :global(.bolt.ranged) { width: 26px; height: 6px; border-radius: 3px; background: #f0c45a; box-shadow: 0 0 12px #f0c45a; }
  .fxlayer :global(.bolt.magic) { background: radial-gradient(circle, #fff, #9a7bff 45%, transparent 70%); box-shadow: 0 0 22px 6px rgb(140 110 255 / .7); width: 22px; height: 22px; }

  /* antes do 1º turno: quem começa e a mão inicial */
  .intro { position: absolute; inset: 0; z-index: 55; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 24px;
    background: radial-gradient(ellipse at 50% 40%, rgb(30 24 20 / .78), rgb(6 5 4 / .93)); backdrop-filter: blur(7px); }
  .who-row { display: flex; align-items: center; gap: 34px; }
  .who-side { display: flex; flex-direction: column; align-items: center; gap: 6px; opacity: .55; transform: scale(.9); transition: all .3s; }
  .who-side :global(.hp) { box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 70%, #000), 0 0 0 6px #14110f, 0 20px 50px rgb(0 0 0 / .7); }
  .who-side.first { opacity: 1; transform: scale(1.08); }
  .who-side.first :global(.hp) { box-shadow: 0 0 0 2px #f0c45a, 0 0 0 7px #14110f, 0 0 60px rgb(240 196 90 / .5); }
  .who-side b { font-size: 24px; color: #f6ead8; margin-top: 8px; }
  .who-side small { font: 600 11px var(--ui); letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
  .who-msg { text-align: center; display: grid; gap: 4px; }
  .who-msg small, .hi-head small { font: 700 11px var(--ui); letter-spacing: .22em; text-transform: uppercase; color: var(--accent); }
  .who-msg h2 { font-size: clamp(36px, 4.4vw, 60px); line-height: 1; color: #ffd98a; text-shadow: 0 0 34px rgb(240 196 90 / .45), 0 4px 0 #5a3d10; }
  .who-msg p, .hi-head p { color: var(--text-2); font-size: 14px; max-width: 640px; margin: 4px auto 0; }
  .hi-head { text-align: center; display: grid; gap: 4px; justify-items: center; }
  .hi-head h2 { font-size: clamp(28px, 3vw, 42px); color: #f6ead8; line-height: 1.05; }
  .hi-foe { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
  .hi-cards { display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: nowrap; max-width: 100%; }
  .hi-card { position: relative; width: clamp(120px, 12.2vw, 236px); aspect-ratio: 750 / 1050; padding: 0; border: 0; background: none; border-radius: 9px; cursor: default; transition: transform .18s ease-out, filter .15s; filter: drop-shadow(0 16px 26px rgb(0 0 0 / .75)); }
  .hi-card:hover, .hi-card:focus-visible { transform: translate(var(--tx, 0), var(--ty, 0)) scale(var(--k, 1.04)); z-index: 3; transition-delay: .12s; }
  .hi-card.pick { cursor: pointer; }
  .hi-card.drop:not(:hover, :focus-visible) { transform: translateY(14px); }
  .hi-card.drop :global(img) { filter: grayscale(.85) brightness(.45); }
  .drop-tag { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); display: inline-flex; gap: 4px; align-items: center; padding: 5px 12px; border-radius: 99px; background: #7a1d16; color: #ffe0da; font: 700 12px var(--ui); text-transform: uppercase; letter-spacing: .1em; filter: none; white-space: nowrap; }
  .hi-actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }

  /* menu da partida */
  .gmenu-back { position: absolute; inset: 0; z-index: 46; }
  .gmenu { position: absolute; right: 14px; top: 52px; z-index: 47; width: 290px; display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 14px; background: rgb(18 15 14 / .98); border: 1px solid var(--line-2); box-shadow: 0 22px 60px rgb(0 0 0 / .75); }
  .gmenu button, .gmenu label { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 9px; border: 0; background: none; color: var(--text); font: 500 13.5px var(--ui); cursor: pointer; text-align: left; }
  .gmenu button:hover:not(:disabled), .gmenu label:hover { background: var(--surface-2); }
  .gmenu button.danger { color: #ff9c8c; }
  .gm-sel .select-in { margin-left: auto; width: auto; }
  .gmenu button:disabled { opacity: .4; cursor: default; }
  .gmenu hr { border: 0; border-top: 1px solid var(--line); margin: 4px 0; width: 100%; }
  .help { max-width: 560px; }
  .help ul { margin: 0; padding-left: 18px; display: grid; gap: 7px; color: var(--text-2); font-size: 13.5px; line-height: 1.45; }
  /* contador de tempo: um pavio que vai queimando */
  .rope { position: absolute; left: 50%; top: calc(50% + 22px); transform: translateX(-50%); z-index: 42; width: min(560px, 46%); display: grid; gap: 6px; justify-items: center; pointer-events: none; }
  .rope-label { display: inline-flex; gap: 6px; align-items: center; font: 600 12.5px var(--ui); letter-spacing: .04em; padding: 4px 14px; border-radius: 99px; background: rgb(12 10 9 / .9); border: 1px solid color-mix(in srgb, #ff4d2e calc((1 - var(--t)) * 100%), #f0c45a); color: color-mix(in srgb, #ffb4a6 calc((1 - var(--t)) * 100%), #ffe6ad); box-shadow: 0 6px 18px rgb(0 0 0 / .6); }
  .rope-label b { font-size: 15px; font-variant-numeric: tabular-nums; }
  .rope-track { position: relative; width: 100%; height: 10px; border-radius: 6px; background: rgb(0 0 0 / .65); border: 1px solid rgb(255 255 255 / .12); box-shadow: inset 0 2px 4px rgb(0 0 0 / .8), 0 4px 14px rgb(0 0 0 / .5); }
  .rope-fill { position: absolute; inset: 1px auto 1px 1px; width: calc(var(--t) * (100% - 2px)); border-radius: 5px; transition: width .25s linear;
    background: linear-gradient(90deg, color-mix(in srgb, #8a1d12 calc((1 - var(--t)) * 100%), #9a6a1c), color-mix(in srgb, #ff5a36 calc((1 - var(--t)) * 100%), #ffd98a));
    box-shadow: 0 0 12px color-mix(in srgb, #ff4d2e calc((1 - var(--t)) * 100%), #f0c45a); }
  .rope-spark { position: absolute; top: 50%; left: calc(1px + var(--t) * (100% - 2px)); width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; transition: left .25s linear;
    background: radial-gradient(circle, #fff 0 18%, #ffe08a 30%, #ff7a2e 55%, transparent 72%); filter: drop-shadow(0 0 8px #ff9a3c); animation: spark .28s steps(2) infinite; }
  @keyframes spark { 50% { transform: scale(1.35) rotate(40deg); opacity: .8; } }
  .rope.hot { animation: ropeShake .5s ease-in-out infinite; }
  .rope.hot .rope-label { animation: pulse .5s ease-in-out infinite; }
  @keyframes ropeShake { 25% { transform: translateX(calc(-50% - 2px)); } 75% { transform: translateX(calc(-50% + 2px)); } }

  /* fim de partida */
  .endbox { position: relative; overflow: hidden; width: min(460px, 92%); display: grid; justify-items: center; gap: 8px; padding: 28px 30px 26px; border-radius: 22px; text-align: center;
    background: linear-gradient(170deg, color-mix(in srgb, var(--c) 20%, #1c1815), #100d0b 72%); border: 1px solid #8a6d3b;
    box-shadow: 0 0 0 5px rgb(0 0 0 / .5), 0 30px 80px rgb(0 0 0 / .85), 0 0 80px color-mix(in srgb, var(--c) 22%, transparent); }
  .end-rays { position: absolute; left: 50%; top: -250px; width: 640px; height: 640px; margin-left: -320px; border-radius: 50%; opacity: .12; pointer-events: none;
    background: repeating-conic-gradient(from 0deg, #f0c45a 0deg 5deg, transparent 5deg 16deg); -webkit-mask-image: radial-gradient(circle, #000 10%, transparent 62%); mask-image: radial-gradient(circle, #000 10%, transparent 62%); animation: spin 16s linear infinite; }
  .endbox:not(.won) .end-rays { display: none; }
  .end-pic { position: relative; line-height: 0; border-radius: 50%; box-shadow: 0 0 0 3px #14100d, 0 0 0 5px color-mix(in srgb, var(--c) 80%, #000), 0 0 0 6px #d9b56a, 0 10px 30px rgb(0 0 0 / .7); }
  .endbox small { position: relative; margin-top: 8px; font: 700 11px var(--ui); letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
  .endbox h2 { position: relative; font-size: 46px; line-height: 1; color: #d8cfc4; }
  .endbox.won h2 { color: #ffd98a; text-shadow: 0 0 30px rgb(240 196 90 / .6), 0 3px 0 #6b4a12; }
  .endbox p { position: relative; margin: 0 0 10px; }
  .endbox .lv { position: relative; justify-content: center; }
  .zoom { position: fixed; z-index: 60; pointer-events: none; filter: drop-shadow(0 22px 40px rgb(0 0 0 / .85)); }
  .modal { position: absolute; inset: 0; background: rgb(0 0 0 / .6); display: grid; place-items: center; z-index: 50; }
  .box { background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; padding: 22px 26px; display: flex; flex-direction: column; gap: 10px; min-width: 320px; }
  .gbox { width: min(1100px, 92%); max-height: 86%; display: flex; flex-direction: column; gap: 12px; background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; padding: 18px 20px; }
  .gbox header { display: flex; justify-content: space-between; align-items: center; }
  .ggrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; overflow-y: auto; }
  .gc { cursor: zoom-in; transition: transform .15s; }
  .gc:hover { transform: scale(1.04); }
  .lv { display: flex; gap: 8px; flex-wrap: wrap; }
  @media (max-width: 1100px) { .vs-wrap { grid-template-columns: 1fr; } .vs-mid { width: auto; } .showcase { flex-direction: column !important; } .sc-pic { width: min(240px, 70%); } }
</style>
