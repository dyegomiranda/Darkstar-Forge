<!--
  Mesa de teste, no espírito do MTG Arena. De baixo para cima: a barra do seu
  herói, a sua mão, as suas duas fileiras e a faixa das cartas usadas no turno;
  o lado do oponente é o mesmo, espelhado. Grimório e cemitério ficam nos cantos
  (as cartas voam de um lugar para outro). Passe o mouse numa carta para
  ampliá-la; clique num cemitério para ver tudo.
-->
<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { crossfade, fade, fly as flyIn, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Swords, Move, Flag, RotateCcw, Shield, Droplet, Crosshair, Sparkles, Zap, Heart, Users, X, Skull, BookOpen, Pencil, ScrollText, ChevronDown, Check, UserRound } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { actor, apply, cannotPlay, cardTargets, choiceOf, emptySlots, heroPos, newGame, other, reachable, reactions, strikeVia, unitAt, XP_PER_LEVEL, COLS } from '../../game/engine';
  import { botAction } from '../../game/bot';
  import { sideFromApp } from '../../game/fromApp';
  import { ATTRS, ATTR_NAMES, type Action, type CardRef, type Fx, type GameState, type GearItem, type HeroDef, type Pos, type Unit, type Via } from '../../game/types';
  import type { Character } from '../../model/types';
  import Glyph from '../common/Glyph.svelte';
  import CardImage from '../common/CardImage.svelte';
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import { colorHex } from '../../model/catalog';
  import { composeBack } from '../../render/back';
  import { rasterize } from '../../render/raster';
  import { backInput } from '../back/backCtx';
  import { characterOf, deckCards, deckCount, heroDef, playable } from './heroes';

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
  let showLog = $state(saved.showLog !== false);
  let starter = $state<'eu' | 'bot' | 'sorteio'>('sorteio');
  $effect(() => { try { localStorage.setItem(OPTS_KEY, JSON.stringify({ my: myId, bot: botId, limit, heroOff, heroOffFront, showLog })); } catch { /* sem armazenamento local */ } });

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

  function say(text: string, isWarn = false) { msg = text; warn = isWarn; }

  function toPlace() {
    if (!myHero) return;
    if (heroOff) { start(); return; }
    myPos = { row: myHero.row, col: myHero.col };
    step = 'place';
  }

  function start() {
    if (!myChar || !botChar || !myHero || !botHero) return;
    const mine = sideFromApp({ ...myHero, row: myPos.row, col: myPos.col }, deckCards(myChar));
    const bot = sideFromApp(botHero, deckCards(botChar));
    const iStart = starter === 'eu' || (starter === 'sorteio' && Math.random() < 0.5);
    me = iStart ? 0 : 1;
    g = newGame(iStart ? mine : bot, iStart ? bot : mine, { actionLimit: limit, heroOff, heroOffFront: heroOff && heroOffFront });
    sel = null;
    say('');
    step = 'play';
    lastFx = 0;
    lastLine = '';
    floats = [];
    void tick().then(() => playFx()).then(() => runBot());
  }

  function leave() { g = null; step = 'heroes'; }

  // ───────────── jogo ─────────────
  type Sel = { kind: 'card'; uid: string } | { kind: 'strike' } | { kind: 'unit'; pos: Pos } | { kind: 'move' } | null;
  let sel = $state<Sel>(null);
  const foe = $derived(other(me));
  /** Uma carta do oponente espera a minha resposta (Reação ou aceitar). */
  const awaiting = $derived(!!g && !!g.pending && actor(g) === me && g.winner === undefined);
  const myTurn = $derived(!!g && g.active === me && g.winner === undefined && !botBusy && !g.pending);
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

  /** O golpe do herói: pode agora? Se não, por quê (em palavras). */
  function strikeInfo(): { can: boolean; why: string } {
    if (!g) return { can: false, why: '' };
    const pl = g.players[me];
    if (pl.struck) return { can: false, why: L('Golpe já usado: o herói golpeia 1 vez por turno, sem custo. As cartas de Ataque usam esse mesmo golpe.', 'Strike already used: the hero strikes once per turn, at no cost. Attack cards use that same strike.') };
    const hp = heroPos(g, me), via = strikeVia(g, me);
    if (!reachable(g, me, via, hp).length) {
      return { can: false, why: via === 'melee' && hp.row === 1
        ? L('Na retaguarda o herói não alcança ninguém com golpe corpo a corpo. Use “Mover” para ir à frente.', 'From the back row a melee strike reaches no one. Use “Move” to go to the front.')
        : L('Nenhum inimigo ao alcance do golpe.', 'No enemy within reach of the strike.') };
    }
    return { can: true, why: L('Golpe disponível: clique no herói e depois no alvo. Não custa nada, pode ser a qualquer momento do seu turno, 1 vez por turno.', 'Strike available: click the hero, then the target. It is free, any time during your turn, once per turn.') };
  }
  const canStrike = $derived(myTurn && strikeInfo().can);

  async function act(a: Action) {
    if (!g) return;
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
        await sleep(500);
        if (g?.pending) { apply(g, botAction($state.snapshot(g) as GameState)); await playFx(); }
      } finally { botBusy = false; }
    }
    if (g && g.active !== me) void runBot();
  }

  /** Minha resposta a uma carta do oponente. */
  let resumeBot: (() => void) | null = null;
  async function respond(a: Action) {
    if (!g || !awaiting) return;
    const err = apply(g, a);
    if (err) { say(err, true); return; }
    zoom = null;
    await playFx();
    resumeBot?.();
    resumeBot = null;
  }

  function clickCard(uid: string) {
    if (!g || !myTurn) return;
    const why = cannotPlay(g, me, uid);
    if (why) { say(why, true); return; }
    const ref = g.players[me].hand.find((c) => c.uid === uid)!;
    const ch = choiceOf(g.defs[ref.cardId].game.effects);
    if (!ch) void act({ t: 'play', uid });
    else { sel = sel?.kind === 'card' && sel.uid === uid ? null : { kind: 'card', uid }; say(ch.kind === 'slot' ? L('Escolha um lugar livre seu.', 'Pick a free slot of yours.') : L('Escolha o alvo (os lugares em dourado).', 'Pick the target (golden slots).')); }
  }

  function clickSlot(pos: Pos) {
    if (!g || !myTurn) return;
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
      say(L('Golpe do herói: escolha o alvo (os lugares em dourado).', 'Hero strike: pick the target (golden slots).'));
    } else if (pos.p === me && u) {
      if (u.exhausted) { say(L('Esta figura já atacou ou acabou de entrar (ataca a partir do próximo turno).', 'This figure already attacked or just arrived (it attacks from next turn).'), true); return; }
      if (u.keys.includes('parede')) { say(L('Esta figura não ataca.', "This figure can't attack."), true); return; }
      sel = { kind: 'unit', pos };
      say(L('Escolha o alvo do ataque (os lugares em dourado).', 'Pick the attack target (golden slots).'));
    } else if (sel) { sel = null; say(L('Alvo fora de alcance.', 'Target out of reach.'), true); }
  }

  /** Botão "Golpear": o mesmo que clicar no herói. */
  function startStrike() {
    if (!g || !myTurn) return;
    const info = strikeInfo();
    if (!info.can) { say(info.why, true); return; }
    sel = sel?.kind === 'strike' ? null : { kind: 'strike' };
    say(sel ? L('Golpe do herói: escolha o alvo (os lugares em dourado).', 'Hero strike: pick the target (golden slots).') : '');
  }

  function startMove() {
    if (!g || !myTurn || g.players[me].moved) return;
    sel = sel?.kind === 'move' ? null : { kind: 'move' };
    say(L('Escolha um lugar livre para o herói.', 'Pick a free slot for your hero.'));
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let alive = true;
  onDestroy(() => { alive = false; if (backUrl) URL.revokeObjectURL(backUrl); });

  async function runBot() {
    if (!g || botBusy) return;
    botBusy = true;
    try {
      let steps = 0;
      while (alive && g && g.active === foe && g.winner === undefined && steps++ < 40) {
        // espera as animações da jogada anterior terminarem, com uma pausa para dar para acompanhar
        await sleep(Math.max(0, fxUntil - Date.now()) + 800);
        if (!g || g.active !== foe) break;
        const a = botAction($state.snapshot(g) as GameState);
        if (a.t === 'end') await sleep(700); // deixa ver a última carta antes de ela sair da mesa
        if (apply(g, a)) apply(g, { t: 'end' });
        await playFx();
        // o bot jogou uma carta e eu posso responder: espera a minha decisão
        if (g?.pending && actor(g) === me) await new Promise<void>((r) => { resumeBot = r; });
      }
      if (g && g.active === foe && g.winner === undefined && !g.pending) { apply(g, { t: 'end' }); await playFx(); }
    } finally { botBusy = false; }
  }

  function key(e: KeyboardEvent) { if (e.key === 'Escape') { sel = null; say(''); graveOf = null; } }

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
  /** Figuras: quando mudam de lugar (empurrão, mover), deslizam até o lugar novo. */
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

  function hitFlash(el: HTMLElement | null, color: string) {
    el?.animate([
      { transform: 'translateX(0)', boxShadow: `inset 0 0 0 999px ${color}` },
      { transform: 'translateX(-7px)', offset: 0.2 }, { transform: 'translateX(6px)', offset: 0.45 }, { transform: 'translateX(-3px)', offset: 0.7 },
      { transform: 'translateX(0)', boxShadow: 'inset 0 0 0 999px transparent' },
    ], { duration: 520, easing: 'ease-out' });
  }

  /** Golpe corpo a corpo: a figura avança até o alvo e volta. À distância/magia: um projétil voa. */
  function attackAnim(from: DOMRect, to: DOMRect, fromEl: HTMLElement | null, via: Via) {
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    if (via === 'melee') {
      if (fromEl) { fromEl.style.zIndex = '5'; fromEl.animate([{ transform: 'none' }, { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(1.08)`, offset: 0.5 }, { transform: 'none' }], { duration: 520, easing: 'ease-in-out' }).onfinish = () => { fromEl.style.zIndex = ''; }; }
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

  const FX_MS: Partial<Record<Fx['k'], number>> = { attack: 420, turn: 1000, xp: 120, gain: 200, level: 1300, react: 1200, countered: 900 };

  /** Mostra o que aconteceu desde a última vez, em sequência. */
  async function playFx(): Promise<void> {
    if (!g) return;
    const list = g.fx.filter((e) => e.n > lastFx).map((e) => ({ ...e })) as Fx[];
    if (!list.length) return;
    lastFx = list[list.length - 1].n;
    // legenda: o que o registro escreveu de novo (fica no meio da mesa enquanto as animações passam)
    const from = lastLine ? g.log.lastIndexOf(lastLine) + 1 : 0;
    const lines = g.log.slice(from).filter((l) => !l.startsWith('—') && !l.includes('XP ('));
    lastLine = g.log[g.log.length - 1] ?? '';
    if (lines.length) { caption = lines.slice(-3).join('  ·  '); const c = caption; setTimeout(() => { if (caption === c) caption = ''; }, 4200); }
    // onde cada figura estava antes da tela mudar (as derrotadas somem)
    const before = new Map<string, DOMRect>();
    for (const e of list) for (const id of idsOf(e)) { const el = elOf(id); if (el) before.set(id, el.getBoundingClientRect()); }
    await tick();
    const rectOf = (id: string) => elOf(id)?.getBoundingClientRect() ?? before.get(id);
    let t = 0;
    for (const e of list) {
      const at = t;
      setTimeout(() => show(e, rectOf, before), at);
      t += e.k === 'play' ? (e.p !== me ? 1100 : 150) : FX_MS[e.k] ?? 380;
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
        const mine = e.p === me;
        banner = { key: ++fxKey, mine, title: mine ? L('Seu turno', 'Your turn') : L(`Turno de ${g.players[e.p].hero.name}`, `${g.players[e.p].hero.name}'s turn`), sub: L(`Turno ${e.turn}`, `Turn ${e.turn}`) };
        const k = banner.key;
        setTimeout(() => { if (banner?.key === k) banner = null; }, 1400);
        break;
      }
      // a carta do oponente aparece grande ao lado (se eu posso responder, ela já está na janela de resposta)
      case 'play': if (e.p !== me && !(g.pending && actor(g) === me)) showCard(e.cardId, `${g.players[e.p].hero.name} ${L('usa', 'uses')}`); break;
      case 'react': showCard(e.cardId, e.p === me ? L('Você reage com', 'You react with') : `${g.players[e.p].hero.name} ${L('reage com', 'reacts with')}`, 'react', 2200); break;
      case 'countered': showCard(e.cardId, L('Anulada!', 'Countered!'), 'countered', 1800); break;
      case 'attack': { const a = before.get(e.from) ?? rectOf(e.from), b = rectOf(e.to); if (a && b) attackAnim(a, b, elOf(e.from), e.via); break; }
      case 'dmg': {
        const sub = [e.armor ? (e.via === 'magic' ? L(`resistência absorveu ${e.armor}`, `resistance absorbed ${e.armor}`) : L(`armadura absorveu ${e.armor}`, `armor absorbed ${e.armor}`)) : '', e.marked ? L('+1 Marcado', '+1 Marked') : '', e.armor ? '' : L(VIA[e.via][0], VIA[e.via][1])].filter(Boolean).join(' · ');
        float(rectOf(e.id) ?? before.get(e.id), `−${e.amount}`, 'dmg', sub, true);
        hitFlash(elOf(e.id), 'rgb(200 40 30 / .45)');
        const hp = sideOfHero(e.id);
        if (hp !== null) hitFlash(document.getElementById(`hp-${hp}`), 'rgb(200 40 30 / .35)');
        break;
      }
      case 'blocked': float(rectOf(e.id), L('Bloqueado', 'Blocked'), 'ward', L('a Proteção anulou o dano', 'the ward prevented it')); hitFlash(elOf(e.id), 'rgb(90 150 255 / .4)'); break;
      case 'heal': float(rectOf(e.id), `+${e.amount}`, 'heal', L('cura', 'heal'), true); hitFlash(elOf(e.id), 'rgb(60 190 110 / .35)'); break;
      case 'status': {
        const m = {
          afflict: [L('Afligido', 'Afflicted'), L('−1 PV por turno', '−1 HP per turn'), 'curse'],
          mark: [L('Marcado', 'Marked'), L('+1 de todo dano', '+1 from all damage'), 'curse'],
          ward: [L('Protegido', 'Warded'), L('anula o próximo dano', 'prevents next damage'), 'ward'],
          push: [L('Empurrado!', 'Pushed!'), L('mudou de fileira', 'changed rows'), 'info'],
          cleanse: [L('Curado', 'Cleansed'), L('sai Aflição e Marca', 'Affliction and Mark removed'), 'heal'],
        }[e.s];
        float(rectOf(e.id), m[0], m[2], m[1] || undefined, e.s === 'push');
        if (e.s === 'push') elOf(e.id)?.animate([{ boxShadow: '0 0 0 3px #7fb0ff, 0 0 26px #7fb0ff' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 });
        break;
      }
      case 'death': float(before.get(e.id) ?? rectOf(e.id), L('Derrotado', 'Defeated'), 'death', undefined, true); break;
      case 'summon': { const el = elOf(e.id); el?.animate([{ boxShadow: '0 0 0 3px #f0c45a, 0 0 30px #f0c45a' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 800 }); break; }
      case 'xp': {
        const why = { turn: L('novo turno', 'new turn'), kill: L('figura derrotada', 'figure defeated'), hit: L('feriu o herói', 'hit the hero') }[e.why];
        float(document.getElementById(`xp-${e.p}`)?.getBoundingClientRect(), `+${e.amount} XP`, 'xp', why);
        break;
      }
      case 'level': {
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

  // ───────────── zoom (como no Arena: a carta cresce ao passar o mouse) ─────────────
  let zoom = $state<{ id: string; x: number; y: number; up: boolean } | null>(null);
  const ZW = 340;
  function hover(id: string | undefined, e: MouseEvent) {
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
  /** Número de dano mostrado na carta da mão (já com a arma e a postura). */
  function dmgBadge(r: CardRef): string | null {
    for (const e of g?.defs[r.cardId]?.game.effects ?? []) {
      if (e.k === 'strike') { const n = strikeDmg(me) + e.bonus; return e.times && e.times > 1 ? `${n}×${e.times}` : `${n}`; }
      if (e.k === 'dmg') return `${e.n}`;
    }
    return null;
  }
  const weaponIcon = (h: HeroDef) => (h.weapon.via === 'melee' ? 'broadsword' : h.weapon.via === 'ranged' ? 'bow-arrow' : 'wizard-staff');
  const gearIcon = (it: GearItem, h: HeroDef) => ({ weapon: weaponIcon(h), head: 'warlord-helmet', chest: 'chest-armor', hands: 'gauntlet', feet: 'boot-stomp', trinket: 'magic-swirl' }[it.slot]);
  const pips = (cur: number, max: number) => Array.from({ length: Math.max(cur, max) }, (_, i) => (i < cur ? (i >= max ? 'extra' : 'on') : 'off'));
  const pct = (n: number, max: number) => `${Math.min(100, Math.round((n / max) * 100))}%`;
</script>

<svelte:window onkeydown={key} />

{#if step === 'heroes' || (!g && step !== 'place')}
  <!-- ───────────── seleção de heróis ───────────── -->
  <div class="pick-screen" style="--a:{myHero ? colorOf(myHero) : '#555'}; --b:{botHero ? colorOf(botHero) : '#555'}">
    {#if !chars.length || !myChar || !botChar || !myHero || !botHero}
      <div class="nohero">
        <UserRound size={44} />
        <h2>{L('Nenhum herói pronto para jogar', 'No hero ready to play')}</h2>
        <p class="muted">{L('Crie um herói na página Herói (ele precisa ter os dados de jogo: deck, arma e equipamento).', 'Create a hero on the Hero page (it needs game data: deck, weapon and gear).')}</p>
        <button class="btn primary" onclick={() => router.go('/heroi')}>{L('Abrir Heróis', 'Open Heroes')}</button>
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
              <button class="sc-edit" onclick={() => router.go(`/heroi/${encodeURIComponent(c.id)}`)} title={L('Editar este herói', 'Edit this hero')}><Pencil size={14} /> {L('Editar', 'Edit')}</button>
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
                <button class="redit" onclick={() => router.go(`/heroi/${encodeURIComponent(o.id)}`)} title={L('Editar herói', 'Edit hero')}><Pencil size={11} /></button>
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
      <footer class="vs-foot">
        <label class="field"><span>{L('Quem começa', 'Who starts')}</span>
          <select class="select-in" bind:value={starter}><option value="sorteio">{L('Sorteio', 'Random')}</option><option value="eu">{L('Você', 'You')}</option><option value="bot">Bot</option></select></label>
        <div class="vs-opts">
          <label class="toggle"><input type="checkbox" bind:checked={heroOff} /> <span><b>{L('Herói fora do campo', 'Hero off the board')}</b><small>{L('como o jogador no Magic: não ocupa lugar e golpeia qualquer fileira ou o herói inimigo', 'like the player in Magic: takes no slot and strikes any row or the enemy hero')}</small></span></label>
          {#if heroOff}
            <label class="toggle sub"><input type="checkbox" bind:checked={heroOffFront} /> <span><b>{L('Exigir a frente vazia', 'Require an empty front')}</b><small>{L('o golpe corpo a corpo do herói só passa da fileira da frente inimiga se ela estiver vazia', 'the hero’s melee strike only goes past the enemy front row when it is empty')}</small></span></label>
          {/if}
          <label class="toggle"><input type="checkbox" bind:checked={limit} /> <span><b>{L('Modo B', 'Mode B')}</b><small>{L('no máximo 3 habilidades por turno', 'at most 3 abilities per turn')}</small></span></label>
          <label class="toggle"><input type="checkbox" bind:checked={showLog} /> <span><b>{L('Registro da batalha', 'Battle log')}</b><small>{L('botão flutuante com tudo o que aconteceu', 'floating button with everything that happened')}</small></span></label>
        </div>
        <button class="btn primary big" disabled={!ready} onclick={toPlace}><Swords size={18} /> {heroOff ? L('Começar partida', 'Start match') : L('Continuar', 'Continue')}</button>
      </footer>
    {/if}
  </div>
{:else if step === 'place' && myHero && botHero}
  <!-- posicionamento: mesma estrutura da mesa, para o campo ficar exatamente onde ficará na partida -->
  <div class="table">
    <div class="main">
      <div class="bar dim" style="--c:{colorOf(botHero)}">
        <HeroPortrait hero={botChar} size={36} />
        <div class="who"><b>{botHero.name}</b><small>{L('Inimigo (bot)', 'Enemy (bot)')}</small></div>
      </div>
      <div class="ohand"></div>
      <div class="side-field foe dim">
        {#each [1, 0] as row}
          <div class="row">
            {#each [0, 1, 2] as col}
              <span class="slot" class:hero={botHero.row === row && botHero.col === col} style="--c:{colorOf(botHero)}">
                {#if botHero.row === row && botHero.col === col}<span class="mini"><HeroPortrait hero={botChar} size={80} /></span><span class="unit"><span class="u-nm">{botHero.name}</span></span>
                {:else}<span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>{/if}
              </span>
            {/each}
          </div>
        {/each}
        <div class="zone"><span class="zhint">{L('campo do inimigo', 'enemy field')}</span></div>
      </div>
      <div class="mid"><span>{L('▼ Clique numa casa do SEU campo para escolher onde o seu herói começa', '▼ Click a slot on YOUR field to choose where your hero starts')}</span></div>
      <div class="side-field">
        <div class="zone"><span class="zhint">{L('seu campo', 'your field')}</span></div>
        {#each [0, 1] as row}
          <div class="row">
            {#each [0, 1, 2] as col}
              {@const on = myPos.row === row && myPos.col === col}
              <button class="slot" class:hero={on} class:target={!on} style="--c:{colorOf(myHero)}" onclick={() => (myPos = { row: row as 0 | 1, col: col as 0 | 1 | 2 })}>
                {#if on}<span class="mini"><HeroPortrait hero={myChar} size={80} /></span><span class="unit"><span class="u-nm">{myHero.name}</span></span>
                {:else}<span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>{/if}
              </button>
            {/each}
          </div>
        {/each}
      </div>
      <div class="hand place-help">
        <p>{L('Na frente, o herói golpeia corpo a corpo e protege quem está atrás. Na retaguarda, fica protegido de golpes corpo a corpo.', 'In front, the hero can melee and protects the back row. In the back, it is safe from melee.')}</p>
      </div>
      <div class="bar" style="--c:{colorOf(myHero)}">
        <HeroPortrait hero={myChar} size={36} />
        <div class="who"><b>{myHero.name}</b><small>{L(myHero.className[0], myHero.className[1])}</small></div>
        <div class="grow"></div>
        <button class="btn sm" onclick={() => (step = 'heroes')}>{L('Voltar', 'Back')}</button>
        <button class="btn sm primary" onclick={start}><Swords size={15} /> {L('Começar partida', 'Start match')}</button>
      </div>
    </div>
  </div>
{:else if g}
  {@const P = g.players[me]}
  {@const F = g.players[foe]}
  <div class="table">
    <div class="main">
      <!-- ───── barra de herói ───── -->
      {#snippet bar(p: 0 | 1, mine: boolean)}
        {@const pl = g!.players[p]}
        {@const h = heroOf(p)}
        <div class="bar" style="--c:{colorOf(pl.hero)}" class:active={g!.active === p}>
          <HeroPortrait hero={characterOf(pl.hero.id)} size={36} />
          <div class="who"><b>{pl.hero.name}</b><small>{L(pl.hero.className[0], pl.hero.className[1])}</small></div>
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
          <div class="stat" use:tip={L(`Nível e XP: o herói está no nível ${pl.level}. Todo herói ganha +1 XP no começo do próprio turno (por isso sobe de nível mesmo sem fazer nada), +1 por figura derrotada e +1 na 1ª vez que fere o herói inimigo no turno. A cada ${XP_PER_LEVEL} XP, um nível novo (+1 Vigor, +1 Mana ou +3 Vida).`, `Level and XP: the hero is level ${pl.level}. Every hero gets +1 XP at the start of its own turn (so it levels up even doing nothing), +1 per defeated figure, +1 the first time it hits the enemy hero each turn. Every ${XP_PER_LEVEL} XP, a new level.`)}>
            <span class="cap">{L('Nível', 'Level')} {pl.level}</span>
            <span class="val xpv" id="xp-{p}">{#each Array(XP_PER_LEVEL) as _, i}<i class="pip" class:on={i < pl.xp}></i>{/each}<small>{pl.xp}/{XP_PER_LEVEL} XP</small></span>
          </div>
          <div class="stat" use:tip={L('Golpe: o ataque do herói com a arma. É de graça, 1 vez por turno, a qualquer momento do turno (clique no herói). As cartas de Ataque usam esse mesmo golpe, com bônus.', 'Strike: the hero attacks with the weapon. Free, once per turn, any time during the turn (click the hero). Attack cards use that same strike, with a bonus.')}>
            <span class="cap">{L('Golpe', 'Strike')}</span>
            <span class="val stk" class:used={pl.struck && g!.active === p}><Swords size={14} /> <b>{strikeDmg(p)}</b><small>{pl.struck && g!.active === p ? L('usado', 'used') : L(VIA[strikeVia(g!, p)][0], VIA[strikeVia(g!, p)][1])}</small></span>
          </div>
          <div class="stat" use:tip={L(`Armadura e resistência: cada golpe físico no herói perde ${pl.hero.armor} de dano; cada dano mágico perde ${pl.hero.resist} (o mínimo é sempre 1).`, `Armor and resistance: each physical hit on the hero loses ${pl.hero.armor} damage; each magic hit loses ${pl.hero.resist} (minimum always 1).`)}>
            <span class="cap">{L('Defesa', 'Defense')}</span>
            <span class="val"><Shield size={14} /> <b>{pl.hero.armor}</b> <Sparkles size={13} color="#9a7bff" /> <b>{pl.hero.resist}</b></span>
          </div>
          {#if mine}
            <div class="grow"></div>
            <button class="btn sm ghost icon" use:tip={L('Trocar heróis: sai desta partida.', 'Change heroes: leaves this match.')} onclick={leave}><RotateCcw size={15} /></button>
            <button class="btn sm" class:lit={canStrike} disabled={!myTurn} onclick={startStrike} use:tip={myTurn ? strikeInfo().why : ''}><Swords size={15} /> {L('Golpear', 'Strike')}</button>
            {#if !g!.heroOff}<button class="btn sm" disabled={!myTurn || pl.moved} onclick={startMove}><Move size={15} /> {L('Mover', 'Move')}</button>{/if}
            <button class="btn sm primary" disabled={!myTurn} onclick={() => act({ t: 'end' })}><Flag size={15} /> {L('Encerrar turno', 'End turn')}</button>
          {:else if g!.active === p && g!.winner === undefined}
            <span class="thinking">{awaiting ? L('Esperando a sua resposta…', 'Waiting for your response…') : L('Bot jogando…', 'Bot playing…')}</span>
          {/if}
        </div>
      {/snippet}

      {#snippet marks(u: Unit, p: 0 | 1)}
        <span class="u-mk">
          {#if u.afflicted}<i use:tip={L('Afligido: 1 de dano no começo do turno do dono, até ser curado', 'Afflicted: 1 damage at its owner’s turn start, until healed')}><Droplet size={14} /></i>{/if}
          {#if u.marked}<i use:tip={L('Marcado: sofre +1 de todo dano, até ser curado', 'Marked: takes +1 from all damage, until healed')}><Crosshair size={14} /></i>{/if}
          {#if u.warded}<i use:tip={L('Protegido: o próximo dano é anulado', 'Warded: the next damage is prevented')}><Shield size={14} /></i>{/if}
          {#if u.keys.includes('guarda') || (u.isHero && g!.players[p].stance?.mods.guard)}<i use:tip={L('Guarda: enquanto houver alguém com Guarda, os golpes corpo a corpo inimigos precisam mirar nele.', 'Guard: while it stands, enemy melee attacks must target it.')}><Users size={14} /></i>{/if}
          {#if u.keys.includes('rapido')}<i use:tip={L('Rápido: pode atacar no turno em que entra.', 'Swift: can attack the turn it arrives.')}><Zap size={14} /></i>{/if}
        </span>
      {/snippet}

      <!-- ───── o herói (miniatura com o retrato) ───── -->
      {#snippet heroBody(u: Unit, p: 0 | 1)}
        <span class="mini"><HeroPortrait hero={characterOf(g!.players[p].hero.id)} size={120} /></span>
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
        <button class="slot" class:off={row === -1} class:target={isTarget(pos)} class:selected={(sel?.kind === 'unit' && same(sel.pos, pos)) || (sel?.kind === 'strike' && !!u?.isHero && p === me)}
          class:hero={!!u?.isHero} class:ready={!!u?.isHero && p === me && canStrike && !sel} class:exh={!!u && u.exhausted && !u.isHero && p === me} onclick={() => clickSlot(pos)} data-uid={u?.id}
          onmouseenter={(e) => hover(u?.src, e)} onmouseleave={() => (zoom = null)} style="--c:{colorOf(g!.players[p].hero)}"
          use:tip={u?.isHero && p === me && g!.active === me ? strikeInfo().why : ''}>
          {#if u?.isHero}
            {@render heroBody(u, p)}
          {:else if u}
            <span class="unit" in:recvU={{ key: u.id }} out:sendU={{ key: u.id }}>
              <span class="u-ic"><Glyph id={u.icon ?? 'death-skull'} size={44} color="#e6dccb" /></span>
              <span class="u-nm">{L(u.name[0], u.name[1])}</span>
              <span class="u-st"><span class="atk"><Swords size={13} /> {u.atk + u.buff}</span><span class="def"><Heart size={13} /> {life(u)}</span></span>
            </span>
            {@render marks(u, p)}
          {:else}
            <span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>
          {/if}
        </button>
      {/snippet}

      <!-- ───── campo de um lado (com o herói ao lado, no modo "fora do campo") ───── -->
      {#snippet field(p: 0 | 1)}
        <div class="bfield">
          {#if g!.heroOff}{@render slot(p, -1, 0)}{/if}
          <div class="rows">{#each rowsFor(p) as row}<div class="row">{#each Array(COLS) as _, col}{@render slot(p, row, col)}{/each}</div>{/each}</div>
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
        <div class="pile deck" class:top id="deck-{p}" use:tip={L(`Grimório: ${pl.deck.length} cartas`, `Grimoire: ${pl.deck.length} cards`)}>
          {#if pl.deck.length}<span class="stack" style="--n:{Math.min(4, Math.ceil(pl.deck.length / 10))}">{#if backUrl}<img src={backUrl} alt="" />{/if}</span>{/if}
          <span class="pcount"><BookOpen size={12} /> {pl.deck.length}</span>
        </div>
        <button class="pile grave" class:top id="grave-{p}" onclick={() => (graveOf = p)} use:tip={L('Cemitério (clique para ver)', 'Graveyard (click to view)')}>
          {#each pl.discard.slice(-1) as r (r.uid)}
            <span class="gtop" in:receive={fly(r.uid, { from: `#zone-${p}` })}>{#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}</span>
          {/each}
          {#if !pl.discard.length}<span class="gempty"><Skull size={20} /></span>{/if}
          <span class="pcount"><Skull size={12} /> {pl.discard.length}</span>
        </button>
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
      <div class="mid" class:warn={!!msg && warn}>
        {#key msg || caption}
          <span in:fade={{ duration: 160 }}>{msg || caption || (awaiting ? L('O oponente jogou uma carta: reaja ou aceite', 'The opponent played a card: react or accept') : myTurn ? L('Seu turno', 'Your turn') : g.winner === undefined ? L('Turno do bot', "Bot's turn") : '')}</span>
        {/key}
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
            onclick={() => clickCard(r.uid)} onmouseenter={(e) => hover(r.cardId, e)} onmouseleave={() => (zoom = null)}>
            {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
            {#if isReact}<span class="rtag">{L('Reação', 'Reaction')}</span>
            {:else if dmgBadge(r)}<span class="dmgb"><Swords size={13} /> {dmgBadge(r)}</span>{/if}
          </button>
        {/each}
      </div>
      {@render bar(me, true)}

      {@render piles(foe, true)}
      {@render piles(me, false)}
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
        {@const pc = app.cards[g.pending.ref.cardId]}
        <div class="respond" in:scale={{ duration: 220, start: 0.9 }}>
          <div class="rcard">{#if pc}<CardImage card={pc} eager />{/if}</div>
          <div class="rside">
            <span class="rtitle">{F.hero.name} {L('joga', 'plays')}</span>
            <h3 class="display">{pc ? pc.text[app.lang].name : ''}</h3>
            <p class="muted">{L('Você tem uma Reação que serve. Use-a agora ou aceite a carta.', 'You have a Reaction that fits. Use it now or accept the card.')}</p>
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

      <!-- ───── registro da batalha (flutuante) ───── -->
      {#if showLog}
        <div class="flog" class:open={logOpen}>
          {#if logOpen}
            <div class="flog-head"><span class="section-title">{L('Registro da batalha', 'Battle log')}</span>
              <button class="btn sm ghost icon" onclick={() => (logOpen = false)} title={L('Minimizar', 'Minimize')}><ChevronDown size={15} /></button></div>
            <div class="log" bind:this={logEl}>{#each g.log as line}<p class:turn={line.startsWith('—')}>{line}</p>{/each}</div>
          {:else}
            <button class="flog-btn" onclick={() => (logOpen = true)} title={L('Abrir o registro da batalha', 'Open the battle log')}><ScrollText size={15} /> {L('Registro', 'Log')}</button>
          {/if}
        </div>
      {/if}
    </div>

    {#if tipBox}
      <div class="tipbox" class:up={tipBox.up} style="left:{tipBox.x}px;top:{tipBox.y}px" transition:fade={{ duration: 100 }}>
        {#if tipBox.head}<b>{tipBox.head}</b>{/if}<span>{tipBox.text}</span>
      </div>
    {/if}
    <div class="fxlayer" bind:this={fxEl}>
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
    {#if g.winner !== undefined && !fxPlaying}
      <div class="modal"><div class="box">
        <h2>{g.winner === me ? L('Vitória!', 'Victory!') : L('Derrota', 'Defeat')}</h2>
        <p class="muted">{L(`Turno ${g.turn}.`, `Turn ${g.turn}.`)}</p>
        <div class="lv">
          <button class="btn primary" onclick={start}><RotateCcw size={15} /> {L('Jogar de novo', 'Play again')}</button>
          <button class="btn" onclick={leave}>{L('Trocar heróis', 'Change heroes')}</button>
        </div>
      </div></div>
    {/if}
  </div>
{/if}

<style>
  /* ───── seleção de heróis ───── */
  .pick-screen { height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 22px 28px 20px; position: relative;
    background:
      radial-gradient(ellipse 60% 70% at 12% 40%, color-mix(in srgb, var(--a) 26%, transparent), transparent 70%),
      radial-gradient(ellipse 60% 70% at 88% 40%, color-mix(in srgb, var(--b) 26%, transparent), transparent 70%),
      linear-gradient(180deg, #14110f, #0b0a09); }
  .nohero { margin: auto; display: grid; justify-items: center; gap: 10px; text-align: center; color: var(--muted); max-width: 460px; }
  .nohero h2 { color: var(--text); }
  .vs-wrap { flex: 1; display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: stretch; min-height: 0; max-width: 1560px; width: 100%; margin: 0 auto; }
  .vs-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; padding: 16px 18px; border-radius: 20px;
    background: linear-gradient(160deg, color-mix(in srgb, var(--c) 14%, rgb(20 17 15 / .9)), rgb(14 12 11 / .92) 60%);
    border: 1px solid color-mix(in srgb, var(--c) 40%, #2a2420); box-shadow: 0 24px 60px rgb(0 0 0 / .5), inset 0 1px 0 rgb(255 255 255 / .05); }
  .vs-tag { font: 700 11px var(--ui); letter-spacing: .22em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 55%, #fff); }
  .vs-side.right .vs-tag { text-align: right; }
  .showcase { display: flex; gap: 20px; align-items: stretch; flex: 1; min-height: 0; }
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
  .sc-deck { font-size: 12px; color: var(--ok); margin-top: auto; }
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
  .vs-foot { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; justify-content: center; padding: 12px 18px; border-radius: 16px; background: rgb(16 14 12 / .88); border: 1px solid var(--line); max-width: 1560px; width: 100%; margin: 0 auto; }
  .select-in { height: 36px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text); padding: 0 10px; font: inherit; }
  .vs-opts { display: flex; gap: 18px; flex-wrap: wrap; flex: 1; justify-content: center; }
  .vs-opts .toggle { display: flex; gap: 8px; align-items: flex-start; max-width: 300px; cursor: pointer; }
  .vs-opts .toggle span { display: flex; flex-direction: column; }
  .vs-opts .toggle b { font-size: 13px; }
  .vs-opts .toggle small { font-size: 11.5px; color: var(--muted); line-height: 1.3; }
  .btn.big { height: 46px; padding: 0 26px; font-size: 15px; }
  .dim { opacity: .45; pointer-events: none; }
  .place-help { align-items: center; }
  .place-help p { color: var(--muted); font-size: 13px; text-align: center; max-width: 520px; }

  /* ───── mesa ───── */
  .table { --row: clamp(64px, 9.4vh, 150px); --zone: clamp(52px, 7.2vh, 120px); --hand: clamp(110px, 22vh, 300px);
    height: 100%; display: grid; grid-template-columns: 1fr; min-height: 0; position: relative; }
  .main { position: relative; display: flex; flex-direction: column; gap: 5px; padding: 6px 14px; min-height: 0; overflow: hidden;
    background: radial-gradient(ellipse at 50% 50%, #241e1a 0%, #100e0c 70%); }
  .bar { display: flex; align-items: center; gap: 14px; padding: 6px 12px; border-radius: 12px; background: rgb(22 19 17 / .92); border: 1px solid var(--line); flex: none; z-index: 2; }
  .bar.active { border-color: var(--c); box-shadow: 0 0 0 1px var(--c), 0 0 18px color-mix(in srgb, var(--c) 35%, transparent); }
  .who { min-width: 92px; }
  .who b { display: block; font-size: 15px; }
  .who small { color: var(--muted); font-size: 12px; }
  .stat { display: flex; flex-direction: column; gap: 1px; padding: 0 12px; border-left: 1px solid rgb(255 255 255 / .07); cursor: help; }
  .cap { font: 600 9.5px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
  .val { display: inline-flex; align-items: center; gap: 4px; font: 600 14px var(--ui); font-variant-numeric: tabular-nums; min-height: 20px; border-radius: 6px; }
  .val small { color: var(--muted); font-weight: 500; font-size: 11.5px; margin-left: 2px; }
  .hpv { color: #e8a59a; }
  .hpbar { width: 96px; height: 7px; border-radius: 4px; background: var(--bg-2); overflow: hidden; margin-left: 6px; }
  .hpbar i { display: block; height: 100%; background: linear-gradient(90deg, #8f2a20, #d4503f); transition: width .4s; }
  .vig { color: #e5866f; } .man { color: #7fb0ff; } .xpv { color: var(--accent); } .stk { color: #f0c45a; }
  .stk.used { opacity: .45; }
  .pip { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid currentColor; opacity: .35; }
  .pip.on { background: currentColor; opacity: 1; }
  .pip.extra { background: #fff; border-color: #fff; opacity: 1; box-shadow: 0 0 6px currentColor; }
  .btn.lit { border-color: #f0c45a; color: #f0c45a; box-shadow: 0 0 12px rgb(240 196 90 / .3); }
  .vs-opts .toggle.sub { padding-left: 14px; border-left: 2px solid var(--line-2); }
  .thinking { color: var(--accent-2); font-size: 13px; animation: pulse 1.2s ease-in-out infinite; margin-left: auto; }
  @keyframes pulse { 50% { opacity: .45; } }

  .ohand { display: flex; justify-content: center; height: calc(var(--zone) * 1.35); flex: none; }
  .ohand .back { height: 100%; aspect-ratio: 750 / 1050; margin: 0 -12px; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 10px rgb(0 0 0 / .6); background: #2a2420; }
  .ohand .back img { width: 100%; height: 100%; display: block; }

  .side-field { display: flex; flex-direction: column; gap: 6px; align-items: center; flex: none; }
  .bfield { display: flex; flex-direction: row; gap: 12px; align-items: stretch; justify-content: center; }
  .rows { display: flex; flex-direction: column; gap: 6px; }
  .off-spacer { width: calc(var(--row) * 1.35); flex: none; }
  .row { display: grid; grid-template-columns: repeat(3, calc(var(--row) * 1.35)); gap: 10px; }
  .slot { height: var(--row); border-radius: 12px; border: 1px dashed rgb(255 255 255 / .1); background: rgb(255 255 255 / .02); color: var(--text); display: grid; place-items: center; cursor: pointer; font: inherit; position: relative; padding: 4px; overflow: hidden; }
  .slot.off { width: calc(var(--row) * 1.35); height: auto; flex: none; }
  .slot:has(.unit) { border: 1px solid rgb(255 255 255 / .14); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 32%, #15120f), #15120f 85%); box-shadow: 0 6px 16px rgb(0 0 0 / .5); }
  .slot.hero { border: 2px solid var(--c); }
  .slot.hero.ready { animation: readyPulse 1.6s ease-in-out infinite; }
  @keyframes readyPulse { 50% { box-shadow: 0 0 0 2px #f0c45a, 0 0 22px rgb(240 196 90 / .55); } }
  .slot.exh { opacity: .55; }
  .slot.target { border: 2px solid #f0c45a; box-shadow: 0 0 16px rgb(240 196 90 / .5); cursor: crosshair; animation: none; }
  .slot.selected { border: 2px solid #7fb0ff; box-shadow: 0 0 16px rgb(127 176 255 / .5); animation: none; }
  .unit { display: flex; flex-direction: column; align-items: center; gap: 2px; position: relative; z-index: 1; }
  .mini { position: absolute; inset: 0; line-height: 0; }
  .mini :global(.hp) { width: 100% !important; height: 100% !important; border-radius: 0; }
  .mini::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 35%, rgb(8 6 5 / .88) 82%); }
  .slot.hero .unit { align-self: end; padding-bottom: 2px; text-shadow: 0 1px 4px #000; }
  .strike-tag { position: absolute; top: 4px; left: 5px; z-index: 2; font: 700 9px var(--ui); text-transform: uppercase; letter-spacing: .08em; padding: 2px 6px; border-radius: 6px; background: rgb(10 8 7 / .8); color: var(--muted); }
  .strike-tag.on { background: #f0c45a; color: #1a120b; }
  .empty { font-size: 11px; color: rgb(255 255 255 / .25); text-transform: uppercase; letter-spacing: .08em; }
  .u-nm { font-size: 12.5px; font-weight: 600; text-align: center; line-height: 1.1; }
  .u-st { display: flex; gap: 12px; font: 700 14px var(--ui); }
  .atk { color: #f0c45a; display: inline-flex; gap: 3px; align-items: center; }
  .atk.used { opacity: .4; }
  .def { color: #e8a59a; display: inline-flex; gap: 3px; align-items: center; }
  .u-mk { position: absolute; top: 6px; right: 7px; display: flex; gap: 4px; color: #cdb8ff; z-index: 2; filter: drop-shadow(0 1px 2px #000); }
  .u-mk i { font-style: normal; }

  .zone { height: var(--zone); width: calc(var(--row) * 4.2 + 20px); display: flex; gap: 8px; justify-content: center; align-items: center; border-radius: 10px; background: rgb(0 0 0 / .18); border: 1px solid rgb(255 255 255 / .05); padding: 4px; }
  .zc { height: 100%; aspect-ratio: 750 / 1050; position: relative; border-radius: 5px; box-shadow: 0 4px 12px rgb(0 0 0 / .6); cursor: zoom-in; }
  .zc.stance { outline: 2px solid var(--accent); outline-offset: 1px; }
  .ztag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 1; font: 600 10px var(--ui); padding: 1px 6px; border-radius: 6px; background: var(--accent); color: #1a120b; white-space: nowrap; display: inline-flex; gap: 3px; align-items: center; }
  .zhint { font-size: 11px; color: rgb(255 255 255 / .22); text-transform: uppercase; letter-spacing: .08em; }
  .mid { text-align: center; color: var(--accent-2); font-size: 14px; min-height: 26px; flex: none; border-top: 1px solid rgb(255 255 255 / .06); border-bottom: 1px solid rgb(255 255 255 / .06); padding: 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mid.warn { color: #ffb4a6; background: rgb(196 71 58 / .16); border-color: rgb(196 71 58 / .5); font-weight: 600; }

  .hand { display: flex; justify-content: center; align-items: flex-end; flex: 1 1 0; min-height: 90px; padding-bottom: 2px; }
  .hc { height: 100%; max-height: calc(var(--hand) * 1.15); aspect-ratio: 750 / 1050; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 6px; margin: 0 -6px; transition: transform .15s, margin .15s; position: relative; }
  .hc:hover { transform: translateY(-14px); z-index: 2; }
  .hc.no { filter: brightness(.55) saturate(.6); }
  .hc.react { filter: brightness(.8); }
  .dmgb, .rtag { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%); z-index: 1; display: inline-flex; gap: 3px; align-items: center; font: 800 14px var(--ui); padding: 2px 9px; border-radius: 9px; background: #2a0f0b; color: #ffcf7a; border: 1.5px solid #c4473a; box-shadow: 0 3px 8px rgb(0 0 0 / .6); white-space: nowrap; }
  .rtag { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; background: #101a2e; color: #a9c8ff; border-color: #4f7fd0; }
  .hc.sel { outline: 3px solid #7fb0ff; transform: translateY(-18px); z-index: 2; }

  .pile { position: absolute; width: calc(var(--hand) * .55); aspect-ratio: 750 / 1050; border-radius: 7px; border: 1px dashed rgb(255 255 255 / .12); background: rgb(0 0 0 / .25); display: grid; place-items: center; }
  .pile.deck { left: 16px; bottom: 74px; }
  .pile.grave { right: 16px; bottom: 74px; cursor: pointer; padding: 0; color: var(--muted); }
  .pile.deck.top { top: 62px; bottom: auto; }
  .pile.grave.top { top: 62px; bottom: auto; }
  .stack { position: absolute; inset: 0; border-radius: 7px; overflow: hidden; box-shadow: calc(var(--n) * 1px) calc(var(--n) * 2px) 0 #1c1815, calc(var(--n) * 2px) calc(var(--n) * 4px) 0 #12100e, 0 8px 18px rgb(0 0 0 / .6); }
  .stack img { width: 100%; height: 100%; display: block; }
  .gtop { position: absolute; inset: 0; border-radius: 7px; overflow: hidden; box-shadow: 0 8px 18px rgb(0 0 0 / .6); }
  .gempty { opacity: .35; }
  .pcount { position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%); z-index: 2; font: 700 12px var(--ui); padding: 1px 8px; border-radius: 8px; background: #0f0d0c; border: 1px solid var(--line-2); color: var(--text); display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; }

  .gear-panel { position: absolute; left: 16px; width: 212px; bottom: calc(74px + var(--hand) * .77 + 26px); display: flex; flex-direction: column; gap: 6px; padding: 9px 10px; border-radius: 10px; background: rgb(14 12 11 / .82); border: 1px solid rgb(255 255 255 / .08); border-left: 3px solid var(--c); z-index: 1; }
  .gear-panel.top { bottom: auto; top: calc(62px + var(--hand) * .77 + 26px); }
  .gtitle { font: 600 9.5px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gi { display: flex; gap: 8px; align-items: center; cursor: help; }
  .gic { width: 32px; height: 32px; flex: none; border-radius: 8px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #000), color-mix(in srgb, var(--c) 18%, #000)); border: 1px solid rgb(255 255 255 / .12); }
  .gic.sm { width: 30px; height: 30px; }
  .gtx { display: flex; flex-direction: column; min-width: 0; }
  .gtx b { font-size: 12.5px; line-height: 1.15; }
  .gtx small { font-size: 11px; color: var(--muted); line-height: 1.25; }
  .gtx em { font-style: normal; color: #f0c45a; font-weight: 700; }
  .gchips { display: flex; gap: 5px; }
  .gchip { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: help; flex: 1; min-width: 0; }
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
  .rside { display: flex; flex-direction: column; gap: 10px; max-width: 320px; }
  .rtitle { font: 700 11px var(--ui); letter-spacing: .18em; text-transform: uppercase; color: #a9c8ff; }
  .rside h3 { font-size: 26px; line-height: 1.05; color: #f6ead8; }
  .rreacts { display: flex; gap: 10px; flex-wrap: wrap; }
  .rr { width: 120px; padding: 0; border: 2px solid #4f7fd0; border-radius: 9px; background: #101a2e; cursor: pointer; display: flex; flex-direction: column; overflow: hidden; color: #cfe0ff; font: 700 12px var(--ui); transition: transform .15s; }
  .rr:hover { transform: translateY(-4px); box-shadow: 0 0 22px rgb(79 127 208 / .6); }
  .rr span { padding: 5px 0; text-transform: uppercase; letter-spacing: .1em; }

  /* registro flutuante */
  .flog { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); z-index: 30; }
  .flog-btn { display: inline-flex; gap: 6px; align-items: center; padding: 8px 12px; border-radius: 99px; border: 1px solid var(--line-2); background: rgb(22 19 17 / .92); color: var(--text-2); font: 600 12px var(--ui); cursor: pointer; box-shadow: 0 8px 20px rgb(0 0 0 / .5); }
  .flog-btn:hover { color: var(--accent-2); border-color: var(--accent); }
  .flog.open { width: 300px; height: min(420px, 56vh); display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 14px; background: rgb(18 15 14 / .96); border: 1px solid var(--line-2); box-shadow: 0 18px 50px rgb(0 0 0 / .7); }
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
