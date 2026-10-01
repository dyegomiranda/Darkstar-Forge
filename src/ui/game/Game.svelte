<!--
  Mesa de teste, no espírito do MTG Arena. De baixo para cima: a barra do seu
  herói, a sua mão, as suas duas fileiras e a faixa das habilidades que você
  acabou de usar; o lado do oponente é o mesmo, espelhado. Grimório e cemitério
  ficam nos cantos de cada lado (as cartas voam de um lugar para outro).
  Passe o mouse numa carta para ampliá-la; clique num cemitério para ver tudo.
-->
<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { crossfade, fade, fly as flyIn, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Swords, Move, Flag, RotateCcw, Shield, Droplet, Crosshair, Sparkles, Zap, Heart, Users, X, Skull, BookOpen } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { HEROES } from '../../game/decks';
  import { apply, cannotPlay, cardTargets, choiceOf, emptySlots, heroPos, newGame, other, reachable, strikeVia, unitAt, XP_PER_LEVEL, COLS } from '../../game/engine';
  import { botAction } from '../../game/bot';
  import { sideFromApp } from '../../game/fromApp';
  import { ATTRS, ATTR_NAMES, type Action, type CardRef, type Fx, type GameState, type HeroDef, type Pos, type Unit, type Via } from '../../game/types';
  import Glyph from '../common/Glyph.svelte';
  import CardImage from '../common/CardImage.svelte';
  import { colorHex } from '../../model/catalog';
  import { composeBack } from '../../render/back';
  import { rasterize } from '../../render/raster';
  import { backInput } from '../back/backCtx';

  // ───────────── preparação ─────────────
  let step = $state<'heroes' | 'place' | 'play'>('heroes');
  let myHero = $state<HeroDef>(HEROES[0]);
  let botHero = $state<HeroDef>(HEROES[1]);
  let myPos = $state<{ row: 0 | 1; col: 0 | 1 | 2 }>({ row: HEROES[0].row, col: HEROES[0].col });
  let limit = $state(false);
  let starter = $state<'eu' | 'bot' | 'sorteio'>('sorteio');

  const deckOf = (h: HeroDef) => app.cardsOf(h.deckId).filter((c) => c.game);
  const countOf = (h: HeroDef) => deckOf(h).reduce((n, c) => n + (c.game?.copies ?? 1), 0);
  const colorOf = (h: HeroDef) => colorHex(app.deck(h.deckId)?.colors[0] ?? 'red');

  // verso das cartas (mão do oponente e grimórios): desenhado uma vez só
  let backUrl = $state('');
  $effect(() => {
    const ed = app.edition(app.deck(botHero.deckId)?.editionId);
    void rasterize(composeBack(backInput(ed, 'gameback')), 300, 'image/webp').then((b) => { backUrl = URL.createObjectURL(b); });
  });

  let g = $state<GameState | null>(null);
  let me = $state<0 | 1>(0);
  let msg = $state('');
  let botBusy = $state(false);

  function toPlace() { myPos = { row: myHero.row, col: myHero.col }; step = 'place'; }

  function start() {
    const mine = sideFromApp({ ...myHero, row: myPos.row, col: myPos.col }, deckOf(myHero));
    const bot = sideFromApp(botHero, deckOf(botHero));
    const iStart = starter === 'eu' || (starter === 'sorteio' && Math.random() < 0.5);
    me = iStart ? 0 : 1;
    g = newGame(iStart ? mine : bot, iStart ? bot : mine, { actionLimit: limit });
    sel = null;
    msg = '';
    step = 'play';
    lastFx = 0;
    floats = [];
    void tick().then(() => playFx()).then(() => runBot());
  }

  // ───────────── jogo ─────────────
  type Sel = { kind: 'card'; uid: string } | { kind: 'strike' } | { kind: 'unit'; pos: Pos } | { kind: 'move' } | null;
  let sel = $state<Sel>(null);
  const foe = $derived(other(me));
  const myTurn = $derived(!!g && g.active === me && g.winner === undefined && !botBusy);
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

  function act(a: Action) {
    if (!g) return;
    const err = apply(g, a);
    if (err) { msg = err; return; }
    msg = '';
    sel = null;
    zoom = null;
    void playFx();
    if (g.active !== me) void runBot();
  }

  function clickCard(uid: string) {
    if (!g || !myTurn) return;
    const why = cannotPlay(g, me, uid);
    if (why) { msg = why; return; }
    const ref = g.players[me].hand.find((c) => c.uid === uid)!;
    const ch = choiceOf(g.defs[ref.cardId].game.effects);
    if (!ch) act({ t: 'play', uid });
    else { sel = sel?.kind === 'card' && sel.uid === uid ? null : { kind: 'card', uid }; msg = ch.kind === 'slot' ? L('Escolha um lugar livre seu.', 'Pick a free slot of yours.') : L('Escolha o alvo.', 'Pick the target.'); }
  }

  function clickSlot(pos: Pos) {
    if (!g || !myTurn) return;
    if (sel && isTarget(pos)) {
      const t = targets.find((x) => same(x, pos))!;
      if (sel.kind === 'card') {
        const ref = g.players[me].hand.find((c) => c.uid === sel!.uid)!;
        const ch = choiceOf(g.defs[ref.cardId].game.effects);
        act(ch?.kind === 'slot' ? { t: 'play', uid: sel.uid, slot: pos } : { t: 'play', uid: sel.uid, target: t.col === -1 ? { ...pos, col: -1 } : pos });
      } else if (sel.kind === 'strike') act({ t: 'strike', target: pos });
      else if (sel.kind === 'unit') act({ t: 'attack', from: sel.pos, target: pos });
      else act({ t: 'move', to: pos });
      return;
    }
    const u = unitAt(g, pos);
    if (pos.p === me && u?.isHero) {
      if (g.players[me].struck) { msg = L('O herói já golpeou neste turno.', 'Your hero already struck this turn.'); return; }
      sel = sel?.kind === 'strike' ? null : { kind: 'strike' };
      msg = L('Escolha quem golpear.', 'Pick whom to strike.');
    } else if (pos.p === me && u) {
      if (u.exhausted) { msg = L('Esta figura já atacou ou acabou de entrar.', 'This figure already attacked or just arrived.'); return; }
      if (u.keys.includes('parede')) { msg = L('Esta figura não ataca.', "This figure can't attack."); return; }
      sel = { kind: 'unit', pos };
      msg = L('Escolha o alvo do ataque.', 'Pick the attack target.');
    } else sel = null;
  }

  function startMove() {
    if (!g || !myTurn || g.players[me].moved) return;
    sel = sel?.kind === 'move' ? null : { kind: 'move' };
    msg = L('Escolha um lugar livre para o herói.', 'Pick a free slot for your hero.');
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
        await sleep(Math.max(0, fxUntil - Date.now()) + 650);
        if (!g || g.active !== foe) break;
        const a = botAction($state.snapshot(g) as GameState);
        if (apply(g, a)) apply(g, { t: 'end' });
        await playFx();
      }
      if (g && g.active === foe && g.winner === undefined) { apply(g, { t: 'end' }); await playFx(); }
    } finally { botBusy = false; }
  }

  function key(e: KeyboardEvent) { if (e.key === 'Escape') { sel = null; msg = ''; graveOf = null; } }

  // ───────────── animações: cartas voando entre grimório, mão, faixa e cemitério ─────────────
  type Fly = { key: string; from?: string; to?: string; delay?: number };
  const [send, receive] = crossfade({
    duration: 420,
    easing: cubicOut,
    fallback(node, params, intro) {
      const p = params as unknown as Fly;
      const sel = intro ? p.from : p.to;
      const el = sel ? document.querySelector(sel) : null;
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

  // ───────────── efeitos visuais (dano subindo, ataques, começo de turno…) ─────────────
  type Float = { key: number; x: number; y: number; text: string; sub?: string; cls: string; big?: boolean };
  let floats = $state<Float[]>([]);
  let banner = $state<{ key: number; title: string; sub: string; mine: boolean } | null>(null);
  let shown = $state<{ key: number; cardId: string; who: string } | null>(null);
  let fxEl = $state<HTMLDivElement>();
  let lastFx = 0, fxKey = 0, fxUntil = 0;
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
    setTimeout(() => { floats = floats.filter((f) => f.key !== key); }, 1700);
  }

  function hitFlash(el: HTMLElement | null, color: string) {
    el?.animate([
      { transform: 'translateX(0)', boxShadow: `inset 0 0 0 999px ${color}` },
      { transform: 'translateX(-7px)', offset: 0.2 }, { transform: 'translateX(6px)', offset: 0.45 }, { transform: 'translateX(-3px)', offset: 0.7 },
      { transform: 'translateX(0)', boxShadow: 'inset 0 0 0 999px transparent' },
    ], { duration: 420, easing: 'ease-out' });
  }

  /** Golpe corpo a corpo: a figura avança até o alvo e volta. À distância/magia: um projétil voa. */
  function attackAnim(from: DOMRect, to: DOMRect, fromEl: HTMLElement | null, via: Via) {
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    if (via === 'melee') {
      if (fromEl) { fromEl.style.zIndex = '5'; fromEl.animate([{ transform: 'none' }, { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(1.08)`, offset: 0.5 }, { transform: 'none' }], { duration: 420, easing: 'ease-in-out' }).onfinish = () => { fromEl.style.zIndex = ''; }; }
      return;
    }
    if (!fxEl) return;
    const b = document.createElement('div');
    b.className = `bolt ${via}`;
    b.style.left = `${from.left + from.width / 2}px`;
    b.style.top = `${from.top + from.height / 2}px`;
    fxEl.appendChild(b);
    const rot = `rotate(${Math.atan2(dy, dx)}rad)`;
    b.animate([{ transform: `translate(-50%, -50%) ${rot} scale(.6)` }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) ${rot} scale(1.15)` }], { duration: 380, easing: 'ease-in' }).onfinish = () => b.remove();
  }

  /** Mostra o que aconteceu desde a última vez, em sequência. Devolve quanto tempo leva. */
  async function playFx(): Promise<void> {
    if (!g) return;
    const list = g.fx.filter((e) => e.n > lastFx).map((e) => ({ ...e })) as Fx[];
    if (!list.length) return;
    lastFx = list[list.length - 1].n;
    // onde cada figura estava antes da tela mudar (as derrotadas somem)
    const before = new Map<string, DOMRect>();
    for (const e of list) for (const id of idsOf(e)) { const el = elOf(id); if (el) before.set(id, el.getBoundingClientRect()); }
    await tick();
    const rectOf = (id: string) => elOf(id)?.getBoundingClientRect() ?? before.get(id);
    let t = 0;
    for (const e of list) {
      const at = t;
      setTimeout(() => show(e, rectOf, before), at);
      t += e.k === 'attack' ? 300 : e.k === 'play' ? (e.p !== me ? 700 : 0) : e.k === 'turn' ? 900 : e.k === 'xp' || e.k === 'gain' ? 60 : 220;
    }
    fxUntil = Date.now() + t + 400;
    fxPlaying++;
    try { await sleep(t + 300); } finally { fxPlaying--; }
  }

  function show(e: Fx, rectOf: (id: string) => DOMRect | undefined, before: Map<string, DOMRect>) {
    if (!g) return;
    switch (e.k) {
      case 'turn': {
        const mine = e.p === me;
        banner = { key: ++fxKey, mine, title: mine ? L('Seu turno', 'Your turn') : L(`Turno de ${g.players[e.p].hero.name}`, `${g.players[e.p].hero.name}'s turn`), sub: L(`Turno ${e.turn}`, `Turn ${e.turn}`) };
        const k = banner.key;
        setTimeout(() => { if (banner?.key === k) banner = null; }, 1300);
        break;
      }
      case 'play':
        if (e.p !== me) {
          shown = { key: ++fxKey, cardId: e.cardId, who: g.players[e.p].hero.name };
          const k = shown.key;
          setTimeout(() => { if (shown?.key === k) shown = null; }, 1900);
        }
        break;
      case 'attack': { const a = before.get(e.from) ?? rectOf(e.from), b = rectOf(e.to); if (a && b) attackAnim(a, b, elOf(e.from), e.via); break; }
      case 'dmg': {
        const sub = [e.armor ? L(`armadura absorveu ${e.armor}`, `armor absorbed ${e.armor}`) : '', e.marked ? L('+1 Marcado', '+1 Marked') : '', e.armor ? '' : L(VIA[e.via][0], VIA[e.via][1])].filter(Boolean).join(' · ');
        float(rectOf(e.id), `−${e.amount}`, 'dmg', sub, true);
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
          push: [L('Empurrado', 'Pushed'), '', 'info'],
          cleanse: [L('Aflição curada', 'Affliction cured'), '', 'heal'],
        }[e.s];
        float(rectOf(e.id), m[0], m[2], m[1] || undefined);
        break;
      }
      case 'death': float(before.get(e.id) ?? rectOf(e.id), L('Derrotado', 'Defeated'), 'death', undefined, true); break;
      case 'summon': { const el = elOf(e.id); el?.animate([{ boxShadow: '0 0 0 3px #f0c45a, 0 0 30px #f0c45a' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 700 }); break; }
      case 'xp': float(document.getElementById(`xp-${e.p}`)?.getBoundingClientRect(), `+${e.amount} XP`, 'xp'); break;
      case 'level': { const h = g.players[e.p]; const hu = heroOf(e.p); float(hu ? rectOf(hu.id) : undefined, L('Subiu de nível!', 'Level up!'), 'xp', L(`nível ${h.level + h.pendingLevels}`, `level ${h.level + h.pendingLevels}`), true); break; }
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
  const ZW = 330;
  function hover(id: string | undefined, e: MouseEvent) {
    if (!id || !app.cards[id]) { zoom = null; return; }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const up = r.top > innerHeight / 2;
    const x = Math.min(Math.max(12, r.left + r.width / 2 - ZW / 2), innerWidth - ZW - 300);
    zoom = { id, x, y: up ? r.bottom : r.top, up };
  }

  // ───────────── cemitério ─────────────
  let graveOf = $state<0 | 1 | null>(null);

  // ───────────── apresentação ─────────────
  const heroOf = (p: 0 | 1) => (g ? unitAt(g, heroPos(g, p)) : null);
  const life = (u: Unit) => u.def - u.dmg;
  let logEl = $state<HTMLDivElement>();
  $effect(() => { void g?.log.length; if (logEl) logEl.scrollTop = logEl.scrollHeight; });
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
  const pips = (cur: number, max: number) => Array.from({ length: Math.max(cur, max) }, (_, i) => (i < cur ? (i >= max ? 'extra' : 'on') : 'off'));
</script>

<svelte:window onkeydown={key} />

{#if step !== 'play' || !g}
  <div class="setup">
    <header>
      <h1>{L('Mesa de teste', 'Test table')}</h1>
      <p class="muted">{step === 'heroes'
        ? L('Escolha o seu herói e o do bot. As cartas vêm da coleção Protótipo; o que você editar vale na próxima partida.', 'Pick your hero and the bot’s. Cards come from the Prototype collection; edits apply to the next match.')
        : L('Escolha onde o seu herói começa: na frente ele golpeia corpo a corpo e protege quem está atrás; na retaguarda fica protegido de golpes corpo a corpo.', 'Choose where your hero starts: in front it can melee and protects the back row; in the back it is safe from melee.')}</p>
    </header>
    {#if step === 'heroes'}
      <div class="pick">
        {#each [{ title: L('Você', 'You'), get: () => myHero, set: (h: HeroDef) => (myHero = h) }, { title: 'Bot', get: () => botHero, set: (h: HeroDef) => (botHero = h) }] as side}
          <section>
            <span class="section-title">{side.title}</span>
            <div class="heroes">
              {#each HEROES as h (h.id)}
                <button class="hero-card" class:on={side.get().id === h.id} style="--c:{colorOf(h)}" onclick={() => side.set(h)}>
                  <span class="emb"><Glyph id={h.icon} size={34} color="#f3ead6" /></span>
                  <b>{h.name}</b><small>{L(h.className[0], h.className[1])}</small>
                  <span class="stats">{L('PV', 'HP')} {h.maxHp} · {L('Armadura', 'Armor')} {h.armor} · Vigor {h.vigor} · Mana {h.mana}</span>
                  <span class="attrs">{#each ATTRS as a}<i class:hi={h.attrs[a] >= 3}>{L(ATTR_NAMES[a][0], ATTR_NAMES[a][1])} {h.attrs[a]}</i>{/each}</span>
                  <span class="gear">{#each h.gear as it}<span>{L(it.name[0], it.name[1])} — {L(it.info[0], it.info[1])}</span>{/each}</span>
                  <span class="cnt" class:bad={countOf(h) === 0}>{countOf(h)} {L('cartas', 'cards')}</span>
                </button>
              {/each}
            </div>
          </section>
        {/each}
      </div>
      <div class="opts">
        <label class="field"><span>{L('Quem começa', 'Who starts')}</span>
          <select class="select" bind:value={starter}><option value="sorteio">{L('Sorteio', 'Random')}</option><option value="eu">{L('Você', 'You')}</option><option value="bot">Bot</option></select></label>
        <label class="toggle"><input type="checkbox" bind:checked={limit} /> {L('Modo B: no máximo 3 habilidades por turno', 'Mode B: at most 3 abilities per turn')}</label>
        <button class="btn primary" disabled={!countOf(myHero) || !countOf(botHero)} onclick={toPlace}><Swords size={16} /> {L('Continuar', 'Continue')}</button>
      </div>
    {:else}
      <div class="place" style="--c:{colorOf(myHero)}; --f:{colorOf(botHero)}">
        <span class="pside foe">{L('Campo do inimigo', 'Enemy field')} · {botHero.name}</span>
        {#each [1, 0] as row}
          <div class="prow ghost">
            {#each [0, 1, 2] as col}
              <span class="pslot">{#if botHero.row === row && botHero.col === col}<Glyph id={botHero.icon} size={34} color="#f3ead6" /><b>{botHero.name}</b>{:else}<small>{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</small>{/if}</span>
            {/each}
          </div>
        {/each}
        <div class="pmid">{L('▼ Clique numa casa do SEU campo para escolher onde o seu herói começa', '▼ Click a slot on YOUR field to choose where your hero starts')}</div>
        {#each [0, 1] as row}
          <div class="prow">
            {#each [0, 1, 2] as col}
              <button class="pslot" class:on={myPos.row === row && myPos.col === col} onclick={() => (myPos = { row: row as 0 | 1, col: col as 0 | 1 | 2 })}>
                {#if myPos.row === row && myPos.col === col}<Glyph id={myHero.icon} size={40} color="#f3ead6" /><b>{myHero.name}</b>{:else}<small>{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</small>{/if}
              </button>
            {/each}
          </div>
        {/each}
        <span class="pside">{L('Seu campo', 'Your field')} · {myHero.name}</span>
      </div>
      <div class="opts pbtns">
        <button class="btn" onclick={() => (step = 'heroes')}>{L('Voltar', 'Back')}</button>
        <button class="btn primary" onclick={start}><Swords size={16} /> {L('Começar partida', 'Start match')}</button>
      </div>
    {/if}
  </div>
{:else}
  {@const P = g.players[me]}
  {@const F = g.players[foe]}
  <div class="table">
    <div class="main">
      <!-- ───── barra de herói ───── -->
      {#snippet bar(p: 0 | 1, mine: boolean)}
        {@const pl = g!.players[p]}
        {@const h = heroOf(p)}
        <div class="bar" style="--c:{colorOf(pl.hero)}" class:active={g!.active === p}>
          <span class="emb sm"><Glyph id={pl.hero.icon} size={24} color="#f3ead6" /></span>
          <div class="who"><b>{pl.hero.name}</b><small>{L(pl.hero.className[0], pl.hero.className[1])}</small></div>
          {#if h}
            <div class="stat" use:tip={L('Vida: se chegar a 0, o herói cai e a partida acaba. O dano fica até ser curado.', 'Life: at 0 the hero falls and the match ends. Damage stays until healed.')}>
              <span class="cap">{L('Vida', 'Life')}</span>
              <span class="val hpv" id="hp-{p}"><Heart size={14} /> <b>{life(h)}</b><small>/{h.def}</small><span class="hpbar"><i style="width:{(life(h) / h.def) * 100}%"></i></span></span>
            </div>
          {/if}
          <div class="stat" use:tip={L('Vigor: paga as habilidades físicas. Enche de novo no começo de cada turno.', 'Vigor: pays physical abilities. Refills at the start of each turn.')}>
            <span class="cap">Vigor</span>
            <span class="val vig" id="res-{p}-vigor"><Glyph id="gauntlet" size={15} color="currentColor" />{#each pips(pl.vigor, pl.maxVigor) as k}<i class="pip {k}"></i>{/each}{#if !pl.maxVigor && !pl.vigor}<small>—</small>{/if}</span>
          </div>
          <div class="stat" use:tip={L('Mana: paga as magias. Enche de novo no começo de cada turno.', 'Mana: pays spells. Refills at the start of each turn.')}>
            <span class="cap">Mana</span>
            <span class="val man" id="res-{p}-mana"><Glyph id="crystal-cluster" size={15} color="currentColor" />{#each pips(pl.mana, pl.maxMana) as k}<i class="pip {k}"></i>{/each}{#if !pl.maxMana && !pl.mana}<small>—</small>{/if}</span>
          </div>
          <div class="stat" use:tip={L(`Nível e XP: o herói está no nível ${pl.level}. Ganha +1 XP por turno, +1 por figura derrotada e +1 na 1ª vez que fere o herói inimigo no turno. A cada ${XP_PER_LEVEL} XP, um nível novo (+1 Vigor, +1 Mana ou +3 Vida).`, `Level and XP: the hero is level ${pl.level}. +1 XP per turn, +1 per defeated figure, +1 the first time you hit the enemy hero each turn. Every ${XP_PER_LEVEL} XP, a new level.`)}>
            <span class="cap">{L('Nível', 'Level')} {pl.level}</span>
            <span class="val xpv" id="xp-{p}">{#each Array(XP_PER_LEVEL) as _, i}<i class="pip" class:on={i < pl.xp}></i>{/each}<small>{pl.xp}/{XP_PER_LEVEL} XP</small></span>
          </div>
          <div class="stat" use:tip={L('Golpe: o ataque do herói com a arma, uma vez por turno (clique no herói). As cartas de Ataque melhoram esse golpe.', 'Strike: the hero attacks with the weapon once per turn (click the hero). Attack cards improve it.')}>
            <span class="cap">{L('Golpe', 'Strike')}</span>
            <span class="val stk" class:used={pl.struck && g!.active === p}><Swords size={14} /> <b>{strikeDmg(p)}</b><small>{L(VIA[pl.hero.weapon.via][0], VIA[pl.hero.weapon.via][1])}</small></span>
          </div>
          <div class="stat" use:tip={L(`Armadura: cada golpe físico (corpo a corpo ou à distância) no herói perde ${pl.hero.armor} de dano (mínimo 1). Magia atravessa.`, `Armor: each physical hit on the hero loses ${pl.hero.armor} damage (min 1). Magic ignores it.`)}>
            <span class="cap">{L('Armadura', 'Armor')}</span>
            <span class="val"><Shield size={14} /> <b>{pl.hero.armor}</b></span>
          </div>
          {#if mine}
            <div class="grow"></div>
            <button class="btn sm" disabled={!myTurn || pl.moved} onclick={startMove}><Move size={15} /> {L('Mover', 'Move')}</button>
            <button class="btn sm primary" disabled={!myTurn} onclick={() => act({ t: 'end' })}><Flag size={15} /> {L('Encerrar turno', 'End turn')}</button>
          {:else if g!.active === p && g!.winner === undefined}
            <span class="thinking">{L('Bot jogando…', 'Bot playing…')}</span>
          {/if}
        </div>
      {/snippet}

      <!-- ───── um lugar no campo ───── -->
      {#snippet slot(p: 0 | 1, row: number, col: number)}
        {@const pos = { p, row, col }}
        {@const u = g!.players[p].board[row][col]}
        <button class="slot" class:target={isTarget(pos)} class:selected={(sel?.kind === 'unit' && same(sel.pos, pos)) || (sel?.kind === 'strike' && !!u?.isHero && p === me)}
          class:hero={!!u?.isHero} class:exh={!!u && u.exhausted && !u.isHero && p === me} onclick={() => clickSlot(pos)} data-uid={u?.id}
          onmouseenter={(e) => hover(u?.src, e)} onmouseleave={() => (zoom = null)} style="--c:{colorOf(g!.players[p].hero)}">
          {#if u}
            <span class="unit" in:scale={{ duration: 300, start: 0.6 }} out:fade={{ duration: 300 }}>
              <span class="u-ic"><Glyph id={u.icon ?? 'death-skull'} size={u.isHero ? 52 : 44} color={u.isHero ? '#f3ead6' : '#e6dccb'} /></span>
              <span class="u-nm">{L(u.name[0], u.name[1])}</span>
              <span class="u-st">{#if !u.isHero}<span class="atk"><Swords size={13} /> {u.atk + u.buff}</span>{:else}<span class="atk" class:used={g!.players[p].struck && g!.active === p}><Swords size={13} /> {strikeDmg(p)}</span>{/if}<span class="def"><Heart size={13} /> {life(u)}{#if u.isHero}/{u.def}{/if}</span></span>
              <span class="u-mk">
                {#if u.afflicted}<i use:tip={L('Afligido: 1 de dano no começo do turno do dono', 'Afflicted: 1 damage at its owner’s turn start')}><Droplet size={14} /></i>{/if}
                {#if u.marked}<i use:tip={L('Marcado: sofre +1 de todo dano', 'Marked: takes +1 from all damage')}><Crosshair size={14} /></i>{/if}
                {#if u.warded}<i use:tip={L('Protegido: o próximo dano é anulado', 'Warded: the next damage is prevented')}><Shield size={14} /></i>{/if}
                {#if u.keys.includes('guarda') || (u.isHero && g!.players[p].stance?.mods.guard)}<i use:tip={L('Guarda: enquanto houver alguém com Guarda, os golpes corpo a corpo inimigos precisam mirar nele.', 'Guard: while it stands, enemy melee attacks must target it.')}><Users size={14} /></i>{/if}
                {#if u.keys.includes('rapido')}<i use:tip={L('Rápido: pode atacar no turno em que entra.', 'Swift: can attack the turn it arrives.')}><Zap size={14} /></i>{/if}
              </span>
            </span>
          {:else}
            <span class="empty">{row === 0 ? L('frente', 'front') : L('retaguarda', 'back')}</span>
          {/if}
        </button>
      {/snippet}

      <!-- ───── faixa das habilidades usadas (à vista do oponente) ───── -->
      {#snippet zone(p: 0 | 1)}
        {@const pl = g!.players[p]}
        <div class="zone">
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
          {#if !pl.recent.length && !pl.stance?.cardId}<span class="zhint">{p === me ? L('suas habilidades usadas aparecem aqui', 'your used abilities show here') : L('habilidades do oponente', 'opponent abilities')}</span>{/if}
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
            <span class="gtop" in:receive={fly(r.uid, { from: `#zone-src-${p}` })}>{#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}</span>
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
          <div class="gi" use:tip={L('Arma: define o dano do golpe do herói.', 'Weapon: sets the hero strike damage.')}>
            <span class="gic"><Glyph id={weaponIcon(h)} size={20} color="#f3ead6" /></span>
            <span class="gtx"><b>{L(h.weapon.name[0], h.weapon.name[1])}</b>
              <small>{L(`Golpe ${h.weapon.dmg} · ${VIA[h.weapon.via][0]}`, `Strike ${h.weapon.dmg} · ${VIA[h.weapon.via][1]}`)}{#if strikeDmg(p) !== h.weapon.dmg}<em> → {strikeDmg(p)}</em>{/if}</small></span>
          </div>
          {#each h.gear.filter((it) => it.name[0] !== h.weapon.name[0]) as it}
            {@const armor = it.info[0].startsWith('Armadura')}
            <div class="gi" use:tip={armor ? L(`Armadura: cada golpe corpo a corpo ou à distância no herói perde ${h.armor} de dano (mínimo 1). Magia atravessa.`, `Armor: each melee or ranged hit on the hero loses ${h.armor} damage (min 1). Magic ignores it.`) : L(`${it.name[0]}: ${it.info[0]}.`, `${it.name[1]}: ${it.info[1]}.`)}>
              <span class="gic"><Glyph id={armor ? 'chest-armor' : 'magic-swirl'} size={20} color="#f3ead6" /></span>
              <span class="gtx"><b>{L(it.name[0], it.name[1])}</b>
                <small>{armor ? L(`Armadura ${h.armor}: −${h.armor} em golpes físicos`, `Armor ${h.armor}: −${h.armor} on physical hits`) : L(it.info[0], it.info[1])}</small></span>
            </div>
          {/each}
        </div>
      {/snippet}

      {@render bar(foe, false)}
      <div class="ohand">
        {#each F.hand as r, i (r.uid)}
          <span class="back" in:receive|global={fly(r.uid, { from: `#deck-${foe}`, delay: i * 70 })} out:send={fly(r.uid, { to: `#grave-${foe}` })}>{#if backUrl}<img src={backUrl} alt="" />{/if}</span>
        {/each}
      </div>
      <div class="side-field foe">
        {#each rowsFor(foe) as row}<div class="row">{#each Array(COLS) as _, col}{@render slot(foe, row, col)}{/each}</div>{/each}
        {@render zone(foe)}
      </div>
      <div class="mid"><span>{msg || (myTurn ? L('Seu turno', 'Your turn') : g.winner === undefined ? L('Turno do bot', "Bot's turn") : '')}</span></div>
      <div class="side-field">
        {@render zone(me)}
        {#each rowsFor(me) as row}<div class="row">{#each Array(COLS) as _, col}{@render slot(me, row, col)}{/each}</div>{/each}
      </div>
      <div class="hand">
        {#each P.hand as r, i (r.uid)}
          {@const why = cannotPlay(g, me, r.uid)}
          <button class="hc" class:no={!!why} class:sel={sel?.kind === 'card' && sel.uid === r.uid} title={why ?? ''}
            in:receive|global={fly(r.uid, { from: `#deck-${me}`, delay: i * 90 })} out:send={fly(r.uid, { to: `#grave-${me}` })}
            onclick={() => clickCard(r.uid)} onmouseenter={(e) => hover(r.cardId, e)} onmouseleave={() => (zoom = null)}>
            {#if cardOf(r)}<CardImage card={cardOf(r)} eager />{/if}
            {#if dmgBadge(r)}<span class="dmgb" use:tip={L('Dano que esta carta causa agora', 'Damage this card deals now')}><Swords size={13} /> {dmgBadge(r)}</span>{/if}
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
      {#if shown && app.cards[shown.cardId]}
        {#key shown.key}
          <div class="shown" in:flyIn={{ y: -30, duration: 280 }} out:fade={{ duration: 250 }}>
            <span>{shown.who} {L('usa', 'uses')}</span>
            <CardImage card={app.cards[shown.cardId]} eager />
          </div>
        {/key}
      {/if}
    </div>

    <aside class="log-panel">
      <span class="section-title">{L('Registro da batalha', 'Battle log')}</span>
      <div class="log" bind:this={logEl}>{#each g.log as line}<p class:turn={line.startsWith('—')}>{line}</p>{/each}</div>
      <button class="btn sm ghost" onclick={() => { g = null; step = 'heroes'; }}><RotateCcw size={14} /> {L('Trocar heróis', 'Change heroes')}</button>
    </aside>

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
      <div class="modal" onclick={() => (graveOf = null)} role="presentation">
        <div class="gbox" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
          <header><h2>{L('Cemitério de', 'Graveyard of')} {g.players[graveOf].hero.name} · {g.players[graveOf].discard.length}</h2>
            <button class="btn sm ghost icon" onclick={() => (graveOf = null)}><X size={16} /></button></header>
          <div class="ggrid">
            {#each [...g.players[graveOf].discard].reverse() as r (r.uid)}<div class="gc">{#if cardOf(r)}<CardImage card={cardOf(r)} />{/if}</div>{/each}
            {#if !g.players[graveOf].discard.length}<p class="muted">{L('Vazio.', 'Empty.')}</p>{/if}
          </div>
        </div>
      </div>
    {/if}
    {#if g.winner === undefined && g.active === me && P.pendingLevels && !fxPlaying}
      <div class="modal"><div class="box">
        <h2>{L(`Nível ${P.level + 1}!`, `Level ${P.level + 1}!`)}</h2>
        <p class="muted">{L('Escolha o que o seu herói ganha:', 'Choose what your hero gains:')}</p>
        <div class="lv">
          <button class="btn" onclick={() => act({ t: 'levelup', choice: 'vigor' })}>⚔ +1 Vigor</button>
          <button class="btn" onclick={() => act({ t: 'levelup', choice: 'mana' })}>✦ +1 Mana</button>
          <button class="btn" onclick={() => act({ t: 'levelup', choice: 'vida' })}><Heart size={15} /> +3 {L('Vida', 'Life')}</button>
        </div>
      </div></div>
    {/if}
    {#if g.winner !== undefined && !fxPlaying}
      <div class="modal"><div class="box">
        <h2>{g.winner === me ? L('Vitória!', 'Victory!') : L('Derrota', 'Defeat')}</h2>
        <p class="muted">{L(`Turno ${g.turn}.`, `Turn ${g.turn}.`)}</p>
        <div class="lv">
          <button class="btn primary" onclick={start}><RotateCcw size={15} /> {L('Jogar de novo', 'Play again')}</button>
          <button class="btn" onclick={() => { g = null; step = 'heroes'; }}>{L('Trocar heróis', 'Change heroes')}</button>
        </div>
      </div></div>
    {/if}
  </div>
{/if}

<style>
  .setup { height: 100%; overflow-y: auto; padding: 28px 32px 60px; display: flex; flex-direction: column; gap: 22px; }
  .setup h1 { font-size: 26px; }
  .pick { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
  .heroes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
  .hero-card { text-align: left; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text); cursor: pointer; font: inherit; min-width: 0; }
  .hero-card.on { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
  .hero-card b { font-family: var(--display, serif); font-size: 17px; }
  .hero-card small, .stats, .gear { color: var(--muted); font-size: 12px; }
  .gear { display: flex; flex-direction: column; }
  .attrs { display: flex; flex-wrap: wrap; gap: 4px; }
  .attrs i { font-style: normal; font-size: 11px; padding: 1px 6px; border-radius: 6px; background: var(--bg-2); color: var(--muted); }
  .attrs i.hi { color: var(--accent-2); }
  .cnt { font-size: 12px; color: var(--ok); }
  .cnt.bad { color: var(--danger); }
  .emb { width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 60%, #000), color-mix(in srgb, var(--c) 22%, #000)); flex: none; }
  .emb.sm { width: 36px; height: 36px; border-radius: 9px; }
  .opts { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; }
  .place { display: flex; flex-direction: column; gap: 8px; align-items: center; margin-top: auto; }
  .prow { display: flex; gap: 10px; align-items: center; }
  .prow.ghost { opacity: .4; pointer-events: none; }
  .prow.ghost .pslot { border-style: dashed; cursor: default; }
  .pside { font: 600 11px var(--ui); text-transform: uppercase; letter-spacing: .12em; color: var(--muted); }
  .pside.foe { color: var(--f); }
  .pmid { margin: 10px 0; padding: 6px 18px; border-block: 1px solid rgb(255 255 255 / .08); color: var(--accent-2); font-size: 13px; }
  .pslot small { font-size: 11px; color: rgb(255 255 255 / .3); text-transform: uppercase; letter-spacing: .08em; }
  .pbtns { justify-content: center; }
  .pslot { width: 150px; height: 104px; border-radius: 12px; border: 1px dashed var(--line-2); background: var(--surface); color: var(--text); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font: inherit; }
  .pslot.on { border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 25%, var(--surface)); }

  /* ───── mesa ───── */
  .table { --row: clamp(64px, 9.4vh, 150px); --zone: clamp(52px, 7.2vh, 120px); --hand: clamp(110px, 22vh, 300px);
    height: 100%; display: grid; grid-template-columns: 1fr 290px; min-height: 0; position: relative; }
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
  .small { font-size: 12px; display: inline-flex; gap: 4px; align-items: center; }
  .thinking { color: var(--accent-2); font-size: 13px; animation: pulse 1.2s ease-in-out infinite; margin-left: auto; }
  @keyframes pulse { 50% { opacity: .45; } }

  .ohand { display: flex; justify-content: center; height: calc(var(--zone) * .85); flex: none; }
  .ohand .back { height: 100%; aspect-ratio: 750 / 1050; margin: 0 -10px; border-radius: 5px; overflow: hidden; box-shadow: 0 4px 10px rgb(0 0 0 / .6); background: #2a2420; }
  .ohand .back img { width: 100%; height: 100%; display: block; }

  .side-field { display: flex; flex-direction: column; gap: 6px; align-items: center; flex: none; }
  .row { display: grid; grid-template-columns: repeat(3, calc(var(--row) * 1.35)); gap: 10px; }
  .slot { height: var(--row); border-radius: 12px; border: 1px dashed rgb(255 255 255 / .1); background: rgb(255 255 255 / .02); color: var(--text); display: grid; place-items: center; cursor: pointer; font: inherit; position: relative; padding: 4px; }
  .slot:has(.unit) { border: 1px solid rgb(255 255 255 / .14); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 32%, #15120f), #15120f 85%); box-shadow: 0 6px 16px rgb(0 0 0 / .5); }
  .slot.hero { border: 2px solid var(--c); }
  .slot.exh { opacity: .55; }
  .slot.target { border: 2px solid #f0c45a; box-shadow: 0 0 16px rgb(240 196 90 / .5); cursor: crosshair; }
  .slot.selected { border: 2px solid #7fb0ff; box-shadow: 0 0 16px rgb(127 176 255 / .5); }
  .unit { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .empty { font-size: 11px; color: rgb(255 255 255 / .25); text-transform: uppercase; letter-spacing: .08em; }
  .u-nm { font-size: 12.5px; font-weight: 600; text-align: center; line-height: 1.1; }
  .u-st { display: flex; gap: 12px; font: 700 14px var(--ui); }
  .atk { color: #f0c45a; display: inline-flex; gap: 3px; align-items: center; }
  .atk.used { opacity: .4; }
  .def { color: #e8a59a; display: inline-flex; gap: 3px; align-items: center; }
  .u-mk { position: absolute; top: 6px; right: 7px; display: flex; gap: 4px; color: #cdb8ff; }
  .u-mk i { font-style: normal; }

  .zone { height: var(--zone); width: calc(var(--row) * 4.2 + 20px); display: flex; gap: 8px; justify-content: center; align-items: center; border-radius: 10px; background: rgb(0 0 0 / .18); border: 1px solid rgb(255 255 255 / .05); padding: 4px; }
  .zc { height: 100%; aspect-ratio: 750 / 1050; position: relative; border-radius: 5px; box-shadow: 0 4px 12px rgb(0 0 0 / .6); }
  .zc.stance { outline: 2px solid var(--accent); outline-offset: 1px; }
  .ztag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 1; font: 600 10px var(--ui); padding: 1px 6px; border-radius: 6px; background: var(--accent); color: #1a120b; white-space: nowrap; display: inline-flex; gap: 3px; align-items: center; }
  .zhint { font-size: 11px; color: rgb(255 255 255 / .22); text-transform: uppercase; letter-spacing: .08em; }
  .mid { text-align: center; color: var(--accent-2); font-size: 13px; min-height: 22px; flex: none; border-top: 1px solid rgb(255 255 255 / .06); border-bottom: 1px solid rgb(255 255 255 / .06); padding: 2px 0; }

  .hand { display: flex; justify-content: center; align-items: flex-end; flex: 1 1 0; min-height: 90px; padding-bottom: 2px; }
  .hc { height: 100%; max-height: calc(var(--hand) * 1.15); aspect-ratio: 750 / 1050; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 6px; margin: 0 -6px; transition: transform .15s, margin .15s; position: relative; }
  .hc:hover { transform: translateY(-14px); z-index: 2; }
  .hc.no { filter: brightness(.55) saturate(.6); }
  .dmgb { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%); z-index: 1; display: inline-flex; gap: 3px; align-items: center; font: 800 14px var(--ui); padding: 2px 9px; border-radius: 9px; background: #2a0f0b; color: #ffcf7a; border: 1.5px solid #c4473a; box-shadow: 0 3px 8px rgb(0 0 0 / .6); white-space: nowrap; }
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
  .gi { display: flex; gap: 8px; align-items: center; }
  .gic { width: 32px; height: 32px; flex: none; border-radius: 8px; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #000), color-mix(in srgb, var(--c) 18%, #000)); border: 1px solid rgb(255 255 255 / .12); }
  .gtx { display: flex; flex-direction: column; min-width: 0; }
  .gtx b { font-size: 12.5px; line-height: 1.15; }
  .gtx small { font-size: 11px; color: var(--muted); line-height: 1.25; }
  .gtx em { font-style: normal; color: #f0c45a; font-weight: 700; }

  .banner { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 40; pointer-events: none; display: flex; flex-direction: column; align-items: center; padding: 14px 70px; background: linear-gradient(90deg, transparent, rgb(10 8 7 / .92) 18%, rgb(10 8 7 / .92) 82%, transparent); border-block: 1px solid color-mix(in srgb, #c4473a 60%, transparent); }
  .banner.mine { border-block-color: color-mix(in srgb, var(--accent) 70%, transparent); }
  .banner b { font-family: var(--display, serif); font-size: 34px; letter-spacing: .06em; text-transform: uppercase; color: #f0d8c8; text-shadow: 0 2px 14px rgb(0 0 0 / .8); }
  .banner.mine b { color: var(--accent); }
  .banner small { font-size: 12px; color: var(--muted); letter-spacing: .14em; text-transform: uppercase; }
  .shown { position: absolute; left: 250px; top: 50%; transform: translateY(-58%); width: 230px; z-index: 39; pointer-events: none; display: flex; flex-direction: column; gap: 6px; align-items: center; filter: drop-shadow(0 20px 40px rgb(0 0 0 / .9)); }
  .shown span { font: 600 12px var(--ui); text-transform: uppercase; letter-spacing: .1em; color: #f0d8c8; background: rgb(10 8 7 / .85); padding: 3px 10px; border-radius: 8px; }

  .tipbox { position: fixed; z-index: 70; transform: translateX(-50%); width: max-content; max-width: 280px; pointer-events: none; display: flex; flex-direction: column; gap: 3px; padding: 9px 12px; border-radius: 9px; background: #1d1916; border: 1px solid var(--line-2); box-shadow: 0 10px 28px rgb(0 0 0 / .7); font-size: 12.5px; line-height: 1.4; color: var(--text-2); }
  .tipbox.up { transform: translate(-50%, -100%); }
  .tipbox b { color: var(--accent); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .fxlayer { position: fixed; inset: 0; pointer-events: none; z-index: 45; }
  .float { position: fixed; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; animation: floatUp 1.6s cubic-bezier(.2, .7, .3, 1) forwards; white-space: nowrap; }
  .float b { font: 800 16px var(--ui); text-shadow: 0 2px 6px #000, 0 0 2px #000; }
  .float.big b { font-size: 30px; }
  .float small { font: 600 11px var(--ui); color: #eee; background: rgb(0 0 0 / .7); padding: 1px 7px; border-radius: 6px; margin-top: 2px; }
  .float.dmg b { color: #ff6a55; } .float.heal b { color: #6fe39b; } .float.ward b { color: #8fbaff; }
  .float.curse b { color: #c79bff; } .float.death b { color: #d9d0c4; } .float.xp b { color: #f0c45a; } .float.info b { color: #e6dccb; }
  .float.vigor b { color: #e5866f; } .float.mana b { color: #7fb0ff; }
  @keyframes floatUp {
    0% { opacity: 0; transform: translate(-50%, -30%) scale(.5); }
    12% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
    25% { transform: translate(-50%, -50%) scale(1); }
    75% { opacity: 1; }
    100% { opacity: 0; transform: translate(-50%, calc(-50% - 56px)) scale(.95); }
  }
  .fxlayer :global(.bolt) { position: fixed; width: 16px; height: 16px; border-radius: 50%; }
  .fxlayer :global(.bolt.ranged) { width: 26px; height: 6px; border-radius: 3px; background: #f0c45a; box-shadow: 0 0 12px #f0c45a; }
  .fxlayer :global(.bolt.magic) { background: radial-gradient(circle, #fff, #9a7bff 45%, transparent 70%); box-shadow: 0 0 22px 6px rgb(140 110 255 / .7); width: 22px; height: 22px; }

  .log-panel { border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; padding: 12px; min-height: 0; background: var(--bg-2); }
  .log { flex: 1; overflow-y: auto; font-size: 12.5px; color: var(--text-2); min-height: 0; }
  .log p { margin: 2px 0; }
  .log p.turn { color: var(--accent-2); font-weight: 600; margin-top: 8px; }

  .zoom { position: fixed; z-index: 60; pointer-events: none; filter: drop-shadow(0 22px 40px rgb(0 0 0 / .85)); }
  .modal { position: absolute; inset: 0; background: rgb(0 0 0 / .6); display: grid; place-items: center; z-index: 50; }
  .box { background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; padding: 22px 26px; display: flex; flex-direction: column; gap: 10px; min-width: 320px; }
  .gbox { width: min(1100px, 92%); max-height: 86%; display: flex; flex-direction: column; gap: 12px; background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; padding: 18px 20px; }
  .gbox header { display: flex; justify-content: space-between; align-items: center; }
  .ggrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; overflow-y: auto; }
  .lv { display: flex; gap: 8px; flex-wrap: wrap; }
  @media (max-width: 1100px) { .table { grid-template-columns: 1fr; } .log-panel { display: none; } .pick { grid-template-columns: 1fr; } }
</style>
