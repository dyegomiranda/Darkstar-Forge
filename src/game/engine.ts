/**
 * Motor de regras do protótipo: o "juiz" da partida. Código puro (sem tela):
 * cria a partida, diz o que é permitido e aplica as jogadas.
 *
 * Resumo das regras (ver types.ts): dois recursos (Vigor e Mana) que enchem
 * todo turno; XP a cada turno, a cada criatura derrotada e na 1ª vez que fere o
 * herói inimigo no turno; a cada 3 XP um nível (+1 Vigor, +1 Mana ou +3 Vida);
 * campo de 2 fileiras × 3; a frente protege a retaguarda dos golpes corpo a
 * corpo; o dano fica até ser curado.
 */
import type { Action, CardDef, CardRef, Effect, Fx, GameState, HeroDef, PlayerState, Pos, Target, Unit, UnitDef, Via } from './types';

export const ROWS = 2, COLS = 3, MAX_LEVEL = 8, XP_PER_LEVEL = 3, START_HAND = 7, MAX_MULLIGANS = 3;

// ───────────── sorteio (com semente, para repetir partidas) ─────────────

function rand(s: GameState): number {
  let t = (s.seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle<T>(s: GameState, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────────── criação ─────────────

function heroUnit(h: HeroDef, p: 0 | 1): Unit {
  return { id: `hero${p}-${h.id}`, name: [h.name, h.name], atk: h.weapon.dmg, def: h.maxHp, dmg: 0, keys: [], icon: h.icon, isHero: true, exhausted: false, afflicted: false, marked: false, warded: false, buff: 0 };
}

function newPlayer(hero: HeroDef, deck: CardRef[], p: 0 | 1, off: boolean): PlayerState {
  const board: (Unit | null)[][] = Array.from({ length: ROWS }, () => Array<Unit | null>(COLS).fill(null));
  if (!off) board[hero.row][hero.col] = heroUnit(hero, p);
  return {
    ...(off ? { heroUnit: heroUnit(hero, p) } : {}),
    hero, vigor: hero.vigor, maxVigor: hero.vigor, mana: hero.mana, maxMana: hero.mana, level: 1, xp: 0, pendingLevels: 0,
    deck, hand: [], discard: [], recent: [], board, struck: false, moved: false, hitHero: false, plays: 0,
  };
}

export interface Side { hero: HeroDef; cards: CardDef[]; /** Cartas a mais na mão inicial (vantagem do bot no nível Muito difícil). */ extraCards?: number }

/** Nova partida. O jogador 0 começa (e não compra no 1º turno); os dois recebem 7 cartas. */
export function newGame(a: Side, b: Side, opts: { seed?: number; actionLimit?: boolean; heroOff?: boolean; heroOffFront?: boolean; mulligan?: boolean } = {}): GameState {
  const defs: Record<string, CardDef> = {};
  let n = 0;
  const build = (side: Side): CardRef[] => side.cards.flatMap((c) => {
    defs[c.id] = c;
    return Array.from({ length: c.game.copies }, () => ({ uid: `c${++n}`, cardId: c.id }));
  });
  const s: GameState = {
    players: [newPlayer(a.hero, build(a), 0, !!opts.heroOff), newPlayer(b.hero, build(b), 1, !!opts.heroOff)],
    defs, seed: opts.seed ?? Math.floor(Math.random() * 1e9), active: 0, turn: 1, log: [], actionLimit: !!opts.actionLimit, heroOff: !!opts.heroOff, heroOffFront: !!opts.heroOffFront, seq: 0, fx: [],
  };
  for (const p of s.players) shuffle(s, p.deck);
  draw(s, 0, START_HAND + (a.extraCards ?? 0));
  draw(s, 1, START_HAND + (b.extraCards ?? 0));
  log(s, `Partida: ${a.hero.name} × ${b.hero.name}. ${a.hero.name} começa.`);
  // com mulligan, o 1º turno só começa depois que os dois ficarem com a mão
  if (opts.mulligan) s.setup = { mull: [0, 0], kept: [false, false] };
  else startTurn(s, true);
  return s;
}

// ───────────── consultas ─────────────

export const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);
export const unitAt = (s: GameState, pos: Pos): Unit | null => (pos.row === -1 ? s.players[pos.p].heroUnit ?? null : s.players[pos.p].board[pos.row]?.[pos.col] ?? null);
/** Quem decide agora: o jogador da vez, ou quem responde a uma carta pendente. */
export const actor = (s: GameState): 0 | 1 => (s.pending ? other(s.pending.p) : s.active);
export const def = (s: GameState, uid: string): CardDef | undefined => {
  for (const p of s.players) { const r = p.hand.find((c) => c.uid === uid); if (r) return s.defs[r.cardId]; }
  return undefined;
};

export function figures(s: GameState, p: 0 | 1): { pos: Pos; u: Unit }[] {
  const out: { pos: Pos; u: Unit }[] = [];
  const off = s.players[p].heroUnit;
  if (off) out.push({ pos: { p, row: -1, col: 0 }, u: off });
  s.players[p].board.forEach((row, r) => row.forEach((u, c) => { if (u) out.push({ pos: { p, row: r, col: c }, u }); }));
  return out;
}

export function heroPos(s: GameState, p: 0 | 1): Pos {
  return figures(s, p).find((f) => f.u.isHero)!.pos;
}

export const heroHp = (s: GameState, p: 0 | 1) => { const h = unitAt(s, heroPos(s, p))!; return h.def - h.dmg; };

export function emptySlots(s: GameState, p: 0 | 1): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!s.players[p].board[r][c]) out.push({ p, row: r, col: c });
  return out;
}

const hasGuard = (s: GameState, p: 0 | 1, u: Unit) => u.keys.includes('guarda') || (u.isHero && !!s.players[p].stance?.mods.guard);

/**
 * Alvos inimigos que um ataque alcança. Corpo a corpo: quem ataca precisa estar
 * na frente; atinge a frente inimiga (só quem tem Guarda, se houver alguém com
 * Guarda); com a frente vazia, atinge a retaguarda. À distância e magia: qualquer um.
 * No modo "herói fora do campo", o golpe do herói alcança qualquer fileira (regra opcional: só com a frente vazia).
 */
export function reachable(s: GameState, attacker: 0 | 1, via: Via, from?: Pos, unitsOnly = false): Pos[] {
  const foe = other(attacker);
  let list = figures(s, foe);
  if (unitsOnly) list = list.filter((f) => !f.u.isHero);
  if (via !== 'melee') return list.map((f) => f.pos);
  // arma de haste: o herói golpeia corpo a corpo também da retaguarda
  const reach = !!from && !!unitAt(s, from)?.isHero && !!s.players[attacker].hero.weapon.reach;
  if (from && from.row === 1 && !reach) return [];
  // herói fora do campo: golpeia qualquer fileira (a menos que a regra da frente vazia esteja ligada); Guarda continua valendo
  const free = from?.row === -1 && !s.heroOffFront;
  const front = figures(s, foe).filter((f) => f.pos.row === 0);
  let pool = front.length && !free ? list.filter((f) => f.pos.row === 0) : list;
  const guards = pool.filter((f) => hasGuard(s, foe, f.u));
  if (guards.length) pool = guards;
  return pool.map((f) => f.pos);
}

/** Como o herói golpeia agora (a postura pode tornar o golpe mágico). */
export const strikeVia = (s: GameState, p: 0 | 1): Via => (s.players[p].stance?.mods.strikeMagic ? 'magic' : s.players[p].hero.weapon.via);

/** Primeiro efeito que pede para escolher um alvo (define o tipo de alvo da carta). */
export function choiceOf(effects: Effect[]): { kind: 'target'; tgt: Target; via: Via | 'strike' } | { kind: 'slot' } | null {
  for (const e of effects) {
    if (e.k === 'strike') return { kind: 'target', tgt: 'enemy', via: 'strike' };
    if (e.k === 'summon') return { kind: 'slot' };
    if ('tgt' in e && ['enemy', 'enemyUnit', 'enemyRow', 'ally', 'allyUnit'].includes(e.tgt)) {
      return { kind: 'target', tgt: e.tgt, via: e.k === 'dmg' ? e.via : 'magic' };
    }
  }
  return null;
}

/** Alvos válidos para a escolha de uma carta. Para fileira, a coluna vale -1. */
export function cardTargets(s: GameState, p: 0 | 1, effects: Effect[]): Pos[] {
  const ch = choiceOf(effects);
  if (!ch || ch.kind !== 'target') return [];
  const hp = heroPos(s, p);
  switch (ch.tgt) {
    case 'enemy': return ch.via === 'strike' ? reachable(s, p, strikeVia(s, p), hp) : reachable(s, p, ch.via, hp);
    case 'enemyUnit': return reachable(s, p, ch.via === 'strike' ? strikeVia(s, p) : ch.via, hp, true);
    case 'enemyRow': return [0, 1].filter((r) => figures(s, other(p)).some((f) => f.pos.row === r)).map((r) => ({ p: other(p), row: r, col: -1 }));
    case 'ally': return figures(s, p).map((f) => f.pos);
    case 'allyUnit': return figures(s, p).filter((f) => !f.u.isHero).map((f) => f.pos);
    default: return [];
  }
}

/** Motivo de não poder usar a carta agora (ou null se pode). */
export function cannotPlay(s: GameState, p: 0 | 1, uid: string): string | null {
  const pl = s.players[p];
  const ref = pl.hand.find((c) => c.uid === uid);
  if (!ref) return 'A carta não está na mão.';
  const g = s.defs[ref.cardId].game;
  if (g.kind === 'reacao') return 'Reação: só pode ser usada em resposta a uma carta do oponente.';
  if (pl.pendingLevels) return 'Escolha o bônus do nível primeiro.';
  if (s.actionLimit && pl.plays >= 3) return 'Já usou 3 habilidades neste turno.';
  if (pl.level < g.level) return `Precisa do nível ${g.level}.`;
  if (g.attr && pl.hero.attrs[g.attr[0]] < g.attr[1]) return `Precisa de ${g.attr[0].toUpperCase()} ${g.attr[1]}.`;
  // o herói golpeia uma vez por turno: as cartas de Ataque melhoram esse golpe
  if ((g.vigor ?? 0) > pl.vigor) return 'Vigor insuficiente.';
  if ((g.mana ?? 0) > pl.mana) return 'Mana insuficiente.';
  const ch = choiceOf(g.effects);
  if (ch?.kind === 'slot' && !emptySlots(s, p).length) return 'Não há lugar livre no campo.';
  if (ch?.kind === 'target' && !cardTargets(s, p, g.effects).length) return 'Nenhum alvo válido.';
  if (g.effects.some((e) => e.k === 'dmg' && e.tgt === 'enemyFront' && e.via === 'melee') && heroPos(s, p).row === 1) return 'O herói precisa estar na frente.';
  return null;
}

/** Reações que quem responde pode usar agora contra a carta pendente. */
export function reactions(s: GameState): CardRef[] {
  if (!s.pending) return [];
  const r = other(s.pending.p), pl = s.players[r];
  // o golpe do herói e o ataque de uma criatura contam como "Ataque"
  const kind = s.pending.ref ? s.defs[s.pending.ref.cardId].game.kind : 'ataque';
  return pl.hand.filter((c) => {
    const g = s.defs[c.cardId].game;
    if (g.kind !== 'reacao') return false;
    if (g.react && g.react !== 'any' && g.react !== kind) return false;
    if (pl.level < g.level) return false;
    if (g.attr && pl.hero.attrs[g.attr[0]] < g.attr[1]) return false;
    return (g.vigor ?? 0) <= pl.vigor && (g.mana ?? 0) <= pl.mana;
  });
}

/** Todas as jogadas permitidas agora (para o bot e para testes). */
export function legalActions(s: GameState): Action[] {
  if (s.winner !== undefined || s.setup) return [];
  if (s.pending) return [{ t: 'pass' }, ...reactions(s).map((c): Action => ({ t: 'react', uid: c.uid }))];
  const p = s.active, pl = s.players[p];
  if (pl.pendingLevels) return (['vigor', 'mana', 'vida'] as const).map((choice) => ({ t: 'levelup', choice }));
  const out: Action[] = [];
  for (const c of pl.hand) {
    if (cannotPlay(s, p, c.uid)) continue;
    const eff = s.defs[c.cardId].game.effects;
    const ch = choiceOf(eff);
    if (ch?.kind === 'slot') for (const slot of emptySlots(s, p)) out.push({ t: 'play', uid: c.uid, slot });
    else if (ch?.kind === 'target') for (const target of cardTargets(s, p, eff)) out.push({ t: 'play', uid: c.uid, target });
    else out.push({ t: 'play', uid: c.uid });
  }
  const hp = heroPos(s, p);
  if (!pl.struck) for (const target of reachable(s, p, strikeVia(s, p), hp)) out.push({ t: 'strike', target });
  for (const f of figures(s, p)) {
    if (f.u.isHero || f.u.exhausted || f.u.keys.includes('parede') || f.u.atk + f.u.buff <= 0) continue;
    for (const target of reachable(s, p, f.u.keys.includes('distancia') ? 'ranged' : 'melee', f.pos)) out.push({ t: 'attack', from: f.pos, target });
  }
  if (!pl.moved && !s.heroOff) for (const to of emptySlots(s, p)) out.push({ t: 'move', to });
  out.push({ t: 'end' });
  return out;
}

// ───────────── mudanças ─────────────

function log(s: GameState, msg: string) {
  s.log.push(msg);
  if (s.log.length > 200) s.log.shift();
}

const nm = (u: Unit) => u.name[0];

type FxIn = Fx extends infer T ? (T extends { n: number } ? Omit<T, 'n'> : never) : never;
let fxN = 0;
/** Registra um acontecimento para a mesa animar. */
function fx(s: GameState, e: FxIn) {
  if (!s.fx) s.fx = [];
  s.fx.push({ ...e, n: ++fxN } as Fx);
  if (s.fx.length > 120) s.fx.splice(0, s.fx.length - 120);
}

function draw(s: GameState, p: 0 | 1, n: number) {
  const pl = s.players[p];
  for (let i = 0; i < n; i++) {
    const c = pl.deck.shift();
    if (!c) { log(s, `${pl.hero.name} não tem mais cartas para comprar.`); return; }
    pl.hand.push(c);
  }
}

const XP_WHY = { turn: 'começo do turno', kill: 'criatura derrotada', hit: 'feriu o herói inimigo' } as const;

function addXp(s: GameState, p: 0 | 1, n: number, why: keyof typeof XP_WHY) {
  const pl = s.players[p];
  if (pl.level + pl.pendingLevels >= MAX_LEVEL) return;
  pl.xp += n;
  log(s, `${pl.hero.name} ganha ${n} XP (${XP_WHY[why]}).`);
  fx(s, { k: 'xp', p, amount: n, why });
  while (pl.xp >= XP_PER_LEVEL && pl.level + pl.pendingLevels < MAX_LEVEL) {
    pl.xp -= XP_PER_LEVEL;
    pl.pendingLevels++;
    log(s, `${pl.hero.name} subiu de nível!`);
    fx(s, { k: 'level', p });
  }
}

/** Causa dano numa criatura. `by` = de que lado veio (para o XP). */
function damage(s: GameState, pos: Pos, n: number, by: 0 | 1, via: Via | 'none' = 'none') {
  const u = unitAt(s, pos);
  if (!u || n <= 0) return;
  if (u.warded) { u.warded = false; log(s, `A Proteção de ${nm(u)} anulou o dano.`); fx(s, { k: 'blocked', id: u.id }); return; }
  // armadura do herói: reduz golpes físicos (mínimo 1); magia e aflição atravessam
  const hd = s.players[pos.p].hero;
  const armor = !u.isHero ? 0 : via === 'melee' || via === 'ranged' ? hd.armor : via === 'magic' ? hd.resist ?? 0 : 0;
  const total = Math.max(armor ? 1 : 0, n - armor) + (u.marked ? 1 : 0);
  u.dmg += total;
  const absorbed = armor ? n - Math.max(1, n - armor) : 0;
  log(s, `${nm(u)} sofre ${total} de dano${absorbed ? ` (${via === 'magic' ? 'a resistência' : 'a armadura'} absorveu ${absorbed})` : ''}.`);
  fx(s, { k: 'dmg', id: u.id, amount: total, armor: absorbed, marked: u.marked, via });
  if (u.isHero && pos.p !== by && by === s.active && !s.players[by].hitHero) { s.players[by].hitHero = true; addXp(s, by, 1, 'hit'); }
  if (u.dmg >= u.def) {
    fx(s, { k: 'death', id: u.id });
    if (u.isHero) { s.winner = other(pos.p); log(s, `${nm(u)} caiu. ${s.players[other(pos.p)].hero.name} venceu!`); return; }
    s.players[pos.p].board[pos.row][pos.col] = null;
    log(s, `${nm(u)} foi derrotado.`);
    if (by !== pos.p) addXp(s, by, 1, 'kill');
  }
}

function heal(s: GameState, pos: Pos, n: number) {
  const u = unitAt(s, pos);
  if (!u) return;
  const got = Math.min(n, u.dmg);
  u.dmg -= got;
  fx(s, { k: 'heal', id: u.id, amount: got });
  if (u.afflicted || u.marked) { u.afflicted = u.marked = false; log(s, `${nm(u)} não está mais Afligido nem Marcado.`); fx(s, { k: 'status', id: u.id, s: 'cleanse' }); }
  log(s, `${nm(u)} recupera ${got}.`);
}

/** Troca a criatura de fileira (mesma coluna se der; senão, o primeiro lugar livre). */
function shift(s: GameState, pos: Pos, toRow?: number): Pos | null {
  const u = unitAt(s, pos);
  if (!u || pos.row === -1) return null;
  const row = toRow ?? (pos.row === 0 ? 1 : 0);
  if (row === pos.row) return pos;
  const b = s.players[pos.p].board;
  const col = b[row][pos.col] ? b[row].findIndex((x) => !x) : pos.col;
  if (col < 0) return null;
  b[row][col] = u;
  b[pos.row][pos.col] = null;
  return { p: pos.p, row, col };
}

function summon(s: GameState, p: 0 | 1, d: UnitDef, at: Pos, src?: string) {
  const u: Unit = { src, id: `u${++s.seq}`, name: d.name, atk: d.atk, def: d.def, dmg: 0, keys: d.keys ?? [], icon: d.icon, isHero: false, exhausted: !(d.keys ?? []).includes('rapido'), afflicted: false, marked: false, warded: false, buff: 0 };
  s.players[p].board[at.row][at.col] = u;
  fx(s, { k: 'summon', id: u.id });
  log(s, `${s.players[p].hero.name} invoca ${d.name[0]} (${d.atk}/${d.def}).`);
}

/** Posições atingidas por um alvo de efeito. */
function resolveTargets(s: GameState, p: 0 | 1, tgt: Target, chosen?: Pos): Pos[] {
  const foe = other(p);
  switch (tgt) {
    case 'enemy': case 'enemyUnit': case 'ally': case 'allyUnit': return chosen && chosen.col >= 0 ? [chosen] : [];
    case 'enemyHero': return [heroPos(s, foe)];
    case 'enemyRow': return chosen ? figures(s, foe).filter((f) => f.pos.row === chosen.row).map((f) => f.pos) : [];
    case 'enemyFront': return figures(s, foe).filter((f) => f.pos.row === 0).map((f) => f.pos);
    case 'allEnemies': return figures(s, foe).map((f) => f.pos);
    case 'hero': return [heroPos(s, p)];
    case 'allAllies': return figures(s, p).map((f) => f.pos);
  }
}

/**
 * Golpe do herói num alvo. O golpe básico (1 por turno, de graça) usa o dano da arma; as cartas de
 * golpe têm dano próprio e NÃO gastam o golpe do turno. Posturas e bônus valem para os dois.
 */
function heroStrike(s: GameState, p: 0 | 1, target: Pos, bonus: number, then?: 'afflict' | 'mark' | 'push', basic = false, extra: { sneak?: number; smite?: number } = {}): void {
  const pl = s.players[p];
  const hero = unitAt(s, heroPos(s, p))!;
  const t = unitAt(s, target);
  if (!t) return;
  const m = pl.stance?.mods ?? {};
  // golpe básico: o dano da arma. Carta de golpe: o dano dela (não soma a arma nem gasta o golpe do turno).
  // ataque furtivo: o alvo distraído (Marcado ou Afligido) leva mais
  const sneak = extra.sneak && (t.marked || t.afflicted) ? extra.sneak : 0;
  const n = (basic ? pl.hero.weapon.dmg : 0) + bonus + (m.strike ?? 0) + hero.buff + sneak;
  log(s, `${pl.hero.name} golpeia ${nm(t)} (${n})${sneak ? ' — ataque furtivo' : ''}.`);
  fx(s, { k: 'attack', from: hero.id, to: t.id, via: strikeVia(s, p) });
  damage(s, target, n, p, strikeVia(s, p));
  if (s.winner !== undefined) return;
  if (m.strikeHeals) heal(s, heroPos(s, p), m.strikeHeals);
  if (unitAt(s, target) !== t) return;
  // golpe divino / de ki: mais dano mágico no mesmo alvo
  if (extra.smite) { damage(s, target, extra.smite, p, 'magic'); if (s.winner !== undefined || unitAt(s, target) !== t) return; }
  if (m.strikeAfflicts || then === 'afflict') { t.afflicted = true; fx(s, { k: 'status', id: t.id, s: 'afflict' }); }
  if (then === 'mark') { t.marked = true; fx(s, { k: 'status', id: t.id, s: 'mark' }); }
  if (then === 'push' && shift(s, target)) fx(s, { k: 'status', id: t.id, s: 'push' });
}

function applyEffect(s: GameState, p: 0 | 1, e: Effect, chosen?: Pos, src?: string) {
  const pl = s.players[p];
  switch (e.k) {
    case 'dmg': for (const pos of resolveTargets(s, p, e.tgt, chosen)) { damage(s, pos, e.n, p, e.via); if (s.winner !== undefined) return; } break;
    case 'strike': {
      let target = chosen;
      for (let i = 0; i < (e.times ?? 1); i++) {
        if (!target || !unitAt(s, target)) {
          // o alvo caiu: o próximo golpe vai para o inimigo alcançável mais ferido
          const opts = reachable(s, p, strikeVia(s, p), heroPos(s, p));
          if (!opts.length) break;
          target = opts.sort((a, b) => { const ua = unitAt(s, a)!, ub = unitAt(s, b)!; return (ua.def - ua.dmg) - (ub.def - ub.dmg); })[0];
        }
        heroStrike(s, p, target, e.bonus, e.then, false, { sneak: e.sneak, smite: e.smite });
        if (s.winner !== undefined) return;
      }
      break;
    }
    case 'heal': for (const pos of resolveTargets(s, p, e.tgt, chosen)) heal(s, pos, e.n); break;
    case 'afflict': for (const pos of resolveTargets(s, p, e.tgt, chosen)) { const u = unitAt(s, pos); if (u) { u.afflicted = true; log(s, `${nm(u)} fica Afligido.`); fx(s, { k: 'status', id: u.id, s: 'afflict' }); } } break;
    case 'mark': for (const pos of resolveTargets(s, p, e.tgt, chosen)) { const u = unitAt(s, pos); if (u) { u.marked = true; log(s, `${nm(u)} fica Marcado.`); fx(s, { k: 'status', id: u.id, s: 'mark' }); } } break;
    case 'ward': for (const pos of resolveTargets(s, p, e.tgt, chosen)) { const u = unitAt(s, pos); if (u) { u.warded = true; log(s, `${nm(u)} está Protegido.`); fx(s, { k: 'status', id: u.id, s: 'ward' }); } } break;
    case 'push': for (const pos of resolveTargets(s, p, e.tgt, chosen)) { const u = unitAt(s, pos); if (u && shift(s, pos)) { log(s, `${nm(u)} é empurrado para a ${pos.row === 0 ? 'retaguarda' : 'frente'}.`); fx(s, { k: 'status', id: u.id, s: 'push' }); } } break;
    case 'summon': {
      const n = e.n ?? 1;
      const slots = [chosen, ...emptySlots(s, p)].filter((x): x is Pos => !!x && !unitAt(s, x));
      for (let i = 0; i < n && i < slots.length; i++) summon(s, p, e.unit, slots[i], src);
      break;
    }
    case 'draw': draw(s, p, e.n); break;
    case 'gain': if (e.res === 'vigor') pl.vigor += e.n; else pl.mana += e.n; fx(s, { k: 'gain', p, res: e.res, amount: e.n }); break;
    case 'buff': for (const pos of resolveTargets(s, p, e.tgt, chosen)) { const u = unitAt(s, pos); if (u) u.buff += e.atk; } break;
    case 'selfdmg': { const h = unitAt(s, heroPos(s, p))!; h.dmg += e.n; log(s, `${pl.hero.name} perde ${e.n} PV.`); fx(s, { k: 'dmg', id: h.id, amount: e.n, armor: 0, marked: false, via: 'none' }); if (h.dmg >= h.def) s.winner = other(p); break; }
    case 'counter': break; // tratado na resposta (ver apply)
    case 'advance': { const hp = heroPos(s, p); if (hp.row === 1 && shift(s, hp, 0)) log(s, `${pl.hero.name} avança.`); break; }
    case 'stance': {
      if (pl.stance?.cardId) pl.discard.push({ uid: pl.stance.uid ?? `st${++s.seq}`, cardId: pl.stance.cardId });
      pl.stance = { cardId: '', mods: e.mods };
      break;
    }
  }
}

function startTurn(s: GameState, first = false) {
  const p = s.active, pl = s.players[p];
  pl.vigor = pl.maxVigor;
  pl.mana = pl.maxMana;
  pl.struck = pl.moved = pl.hitHero = false;
  pl.plays = 0;
  for (const f of figures(s, p)) f.u.exhausted = false;
  log(s, `— Turno ${s.turn}: ${pl.hero.name} —`);
  fx(s, { k: 'turn', p, turn: s.turn });
  // aflição: 1 de dano em cada criatura afligida do jogador da vez (o XP vai para o outro lado)
  for (const f of figures(s, p)) {
    if (f.u.afflicted) { log(s, `${nm(f.u)} sofre a Aflição.`); damage(s, f.pos, 1, other(p)); if (s.winner !== undefined) return; }
  }
  if (!first) draw(s, p, 1);
  addXp(s, p, 1, 'turn');
}

/** Resolve a carta pendente (o oponente aceitou ou a Reação não a anulou). */
function resolvePending(s: GameState, countered = false): void {
  const pd = s.pending!;
  s.pending = undefined;
  const pl = s.players[pd.p];
  if (!pd.ref) {
    // golpe básico do herói ou ataque de uma criatura
    if (countered) { log(s, 'O ataque foi anulado.'); fx(s, { k: 'countered', p: pd.p, cardId: '' }); return; }
    if (!pd.target || !unitAt(s, pd.target)) return;
    if (pd.attack === 'strike') { heroStrike(s, pd.p, pd.target, 0, undefined, true); return; }
    const u = pd.from ? unitAt(s, pd.from) : null;
    if (!u) return; // a criatura caiu antes de acertar
    const via: Via = u.keys.includes('distancia') ? 'ranged' : 'melee';
    log(s, `${nm(u)} ataca ${nm(unitAt(s, pd.target)!)}.`);
    fx(s, { k: 'attack', from: u.id, to: unitAt(s, pd.target)!.id, via });
    damage(s, pd.target, u.atk + u.buff, pd.p, via);
    return;
  }
  const d = s.defs[pd.ref.cardId];
  if (countered) {
    log(s, `${d.name[0]} foi anulada.`);
    fx(s, { k: 'countered', p: pd.p, cardId: d.id });
    pl.recent.push(pd.ref);
    return;
  }
  const ch = choiceOf(d.game.effects);
  for (const e of d.game.effects) {
    applyEffect(s, pd.p, e, ch?.kind === 'slot' ? pd.slot : pd.target, d.id);
    if (s.winner !== undefined) break;
  }
  if (d.game.kind === 'postura' && pl.stance && !pl.stance.cardId) pl.stance = { ...pl.stance, cardId: d.id, uid: pd.ref.uid };
  else pl.recent.push(pd.ref);
}

/** Resposta de quem não está na vez a uma carta ou a um ataque pendente: usar uma Reação ou aceitar. */
function respond(s: GameState, a: Action): string | null {
  if (a.t === 'pass') { resolvePending(s); return null; }
  if (a.t !== 'react') return 'Responda à carta do oponente primeiro (reagir ou aceitar).';
  const r = other(s.pending!.p), pl = s.players[r];
  const ref = reactions(s).find((c) => c.uid === a.uid);
  if (!ref) return 'Esta carta não pode responder agora.';
  const d = s.defs[ref.cardId];
  pl.hand.splice(pl.hand.indexOf(ref), 1);
  pl.vigor -= d.game.vigor ?? 0;
  pl.mana -= d.game.mana ?? 0;
  pl.recent.push(ref);
  log(s, `${pl.hero.name} reage com ${d.name[0]}.`);
  fx(s, { k: 'react', p: r, cardId: d.id });
  for (const e of d.game.effects) {
    applyEffect(s, r, e, heroPos(s, s.pending!.p), d.id);
    if (s.winner !== undefined) { s.pending = undefined; return null; }
  }
  resolvePending(s, d.game.effects.some((e) => e.k === 'counter'));
  return null;
}

/**
 * Mão inicial. "mulligan": devolve a mão ao grimório, embaralha e compra 7 de novo (até 3 vezes).
 * "keep": fica com a mão, mandando para o fundo do grimório 1 carta por troca feita.
 * Quando os dois ficam com a mão, o 1º turno começa.
 */
function setupAction(s: GameState, a: Action): string | null {
  const st = s.setup!;
  if (a.t !== 'mulligan' && a.t !== 'keep') return 'Escolha primeiro a mão inicial.';
  const pl = s.players[a.p];
  if (st.kept[a.p]) return 'Você já ficou com a mão.';
  if (a.t === 'mulligan') {
    if (st.mull[a.p] >= MAX_MULLIGANS) return `Já trocou a mão ${MAX_MULLIGANS} vezes.`;
    pl.deck.push(...pl.hand);
    pl.hand = [];
    shuffle(s, pl.deck);
    draw(s, a.p, START_HAND);
    st.mull[a.p]++;
    log(s, `${pl.hero.name} trocou a mão inicial (${st.mull[a.p]}ª vez).`);
    return null;
  }
  const need = st.mull[a.p];
  const ids = [...new Set(a.discard)];
  if (ids.length !== need || ids.some((uid) => !pl.hand.some((c) => c.uid === uid))) return need ? `Escolha ${need} carta${need > 1 ? 's' : ''} da mão para descartar.` : 'Nada a descartar.';
  for (const uid of ids) { const i = pl.hand.findIndex((c) => c.uid === uid); pl.deck.push(...pl.hand.splice(i, 1)); }
  st.kept[a.p] = true;
  if (need) log(s, `${pl.hero.name} fica com ${pl.hand.length} cartas.`);
  if (st.kept[0] && st.kept[1]) { s.setup = undefined; startTurn(s, true); }
  return null;
}

/** Aplica uma jogada. Devolve um erro (texto) se não for permitida. */
export function apply(s: GameState, a: Action): string | null {
  if (s.winner !== undefined) return 'A partida acabou.';
  if (a.t === 'concede') {
    s.winner = other(a.p);
    s.ended = a.timeout ? 'timeout' : 'concede';
    s.pending = undefined;
    s.setup = undefined;
    log(s, a.timeout ? `${s.players[a.p].hero.name} perdeu por tempo. ${s.players[s.winner].hero.name} venceu!` : `${s.players[a.p].hero.name} desistiu. ${s.players[s.winner].hero.name} venceu!`);
    return null;
  }
  if (s.setup) return setupAction(s, a);
  if (a.t === 'mulligan' || a.t === 'keep') return 'A partida já começou.';
  if (s.pending) return respond(s, a);
  if (a.t === 'react' || a.t === 'pass') return 'Não há carta para responder.';
  const p = s.active, pl = s.players[p];
  if (pl.pendingLevels && a.t !== 'levelup') return 'Escolha o bônus do nível primeiro.';
  switch (a.t) {
    case 'levelup': {
      if (!pl.pendingLevels) return 'Não há nível para escolher.';
      pl.pendingLevels--;
      pl.level++;
      if (a.choice === 'vigor') { pl.maxVigor++; pl.vigor++; }
      else if (a.choice === 'mana') { pl.maxMana++; pl.mana++; }
      else { const h = unitAt(s, heroPos(s, p))!; h.def += 3; }
      log(s, `${pl.hero.name} chega ao nível ${pl.level} (+${a.choice === 'vida' ? '3 Vida' : a.choice === 'vigor' ? '1 Vigor' : '1 Mana'}).`);
      return null;
    }
    case 'play': {
      const why = cannotPlay(s, p, a.uid);
      if (why) return why;
      const i = pl.hand.findIndex((c) => c.uid === a.uid);
      const ref = pl.hand[i];
      const d = s.defs[ref.cardId];
      const ch = choiceOf(d.game.effects);
      if (ch?.kind === 'slot' && (!a.slot || a.slot.p !== p || unitAt(s, a.slot))) return 'Escolha um lugar livre.';
      if (ch?.kind === 'target') {
        const ok = cardTargets(s, p, d.game.effects).some((t) => a.target && t.p === a.target.p && t.row === a.target.row && t.col === a.target.col);
        if (!ok) return 'Alvo inválido.';
      }
      pl.hand.splice(i, 1);
      pl.vigor -= d.game.vigor ?? 0;
      pl.mana -= d.game.mana ?? 0;
      pl.plays++;
      log(s, `${pl.hero.name} usa ${d.name[0]}.`);
      fx(s, { k: 'play', p, cardId: d.id });
      // o oponente pode responder com uma Reação (se tiver uma que sirva e recursos sobrando)
      s.pending = { p, ref, target: a.target, slot: a.slot };
      if (!reactions(s).length) resolvePending(s);
      return null;
    }
    case 'strike': {
      if (pl.struck) return 'O herói já golpeou neste turno.';
      if (!reachable(s, p, strikeVia(s, p), heroPos(s, p)).some((t) => t.p === a.target.p && t.row === a.target.row && t.col === a.target.col)) return 'Fora de alcance.';
      pl.struck = true;
      // o oponente pode reagir ao golpe (se tiver uma Reação que sirva e recursos sobrando)
      s.pending = { p, target: a.target, attack: 'strike' };
      if (!reactions(s).length) resolvePending(s);
      return null;
    }
    case 'attack': {
      const u = unitAt(s, a.from);
      if (!u || a.from.p !== p || u.isHero) return 'Escolha uma criatura sua.';
      if (u.exhausted) return 'Esta criatura já atacou (ou acabou de entrar).';
      if (u.keys.includes('parede')) return 'Esta criatura não ataca.';
      const via: Via = u.keys.includes('distancia') ? 'ranged' : 'melee';
      if (!reachable(s, p, via, a.from).some((t) => t.p === a.target.p && t.row === a.target.row && t.col === a.target.col)) return 'Fora de alcance.';
      u.exhausted = true;
      s.pending = { p, target: a.target, attack: 'unit', from: a.from };
      if (!reactions(s).length) resolvePending(s);
      return null;
    }
    case 'move': {
      if (s.heroOff) return 'Neste modo o herói fica fora do campo.';
      if (pl.moved) return 'O herói já se moveu neste turno.';
      if (a.to.p !== p || unitAt(s, a.to)) return 'Escolha um lugar livre seu.';
      const from = heroPos(s, p);
      const h = unitAt(s, from)!;
      pl.board[a.to.row][a.to.col] = h;
      pl.board[from.row][from.col] = null;
      pl.moved = true;
      log(s, `${pl.hero.name} vai para a ${a.to.row === 0 ? 'frente' : 'retaguarda'}.`);
      return null;
    }
    case 'end': {
      for (const f of figures(s, p)) f.u.buff = 0;
      // as cartas usadas neste turno saem da mesa e vão para o cemitério
      for (const q of s.players) { q.discard.push(...q.recent); q.recent = []; }
      s.active = other(p);
      if (s.active === 0) s.turn++;
      startTurn(s);
      return null;
    }
  }
}
