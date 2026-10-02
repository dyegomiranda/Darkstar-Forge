/**
 * Bot: olha cada jogada permitida, simula o resultado e fica com a que deixa a
 * posição melhor (vida, criaturas em campo, cartas, nível). Encerra o turno
 * quando nenhuma jogada melhora a posição.
 *
 * A dificuldade muda o quanto ele enxerga e o quanto erra:
 *  - Muito fácil: joga quase ao acaso, para cedo e raramente reage.
 *  - Fácil: vê só o resultado imediato, com bastante erro de avaliação.
 *  - Normal: vê o resultado imediato, com pouco erro.
 *  - Difícil: vê também a melhor jogada seguinte (era o único nível até a 2.9).
 *  - Muito difícil: planeja o turno inteiro e começa com vantagem (vida e uma carta a mais).
 */
import { apply, figures, heroHp, legalActions, other, reactions } from './engine';
import type { Action, GameState } from './types';

export type Difficulty = 'veryEasy' | 'easy' | 'normal' | 'hard' | 'veryHard';
export const DIFFICULTIES: { id: Difficulty; name: [string, string]; info: [string, string] }[] = [
  { id: 'veryEasy', name: ['Muito fácil', 'Very easy'], info: ['joga quase ao acaso e para cedo', 'plays almost at random and stops early'] },
  { id: 'easy', name: ['Fácil', 'Easy'], info: ['erra bastante e reage pouco', 'makes many mistakes and seldom reacts'] },
  { id: 'normal', name: ['Normal', 'Normal'], info: ['joga bem, sem pensar à frente', 'plays well, without thinking ahead'] },
  { id: 'hard', name: ['Difícil', 'Hard'], info: ['planeja a jogada seguinte', 'plans the next play'] },
  { id: 'veryHard', name: ['Muito difícil', 'Very hard'], info: ['planeja o turno inteiro e começa com vantagem', 'plans the whole turn and starts ahead'] },
];
/** Vantagem do bot no nível Muito difícil (dita ao jogador na tela de seleção): vida a mais e cartas a mais na mão inicial. */
export const EDGE: Partial<Record<Difficulty, { hp: number; cards: number }>> = { veryHard: { hp: 5, cards: 1 } };

/**
 * noise: erro (±) somado à nota de cada jogada; lazy: chance de encerrar o turno a cada decisão;
 * react: chance de sequer considerar uma Reação; ahead: olha a melhor jogada seguinte; plan: planeja o turno inteiro.
 */
interface Skill { noise: number; lazy: number; react: number; ahead: boolean; plan: boolean }
const SKILL: Record<Difficulty, Skill> = {
  veryEasy: { noise: 6, lazy: 0.28, react: 0.2, ahead: false, plan: false },
  easy: { noise: 3, lazy: 0.1, react: 0.5, ahead: false, plan: false },
  normal: { noise: 1, lazy: 0, react: 0.85, ahead: false, plan: false },
  hard: { noise: 0, lazy: 0, react: 1, ahead: true, plan: false },
  veryHard: { noise: 0, lazy: 0, react: 1, ahead: true, plan: true },
};

/** Quão boa é a posição para o jogador `p` (maior = melhor). */
export function evaluate(s: GameState, p: 0 | 1): number {
  if (s.winner === p) return 1e6;
  if (s.winner === other(p)) return -1e6;
  const me = s.players[p], op = s.players[other(p)];
  const unitValue = (side: 0 | 1) => figures(s, side).reduce((v, f) => {
    if (f.u.isHero) return v + (f.u.afflicted ? -1.5 : 0) + (f.u.marked ? -0.8 : 0) + (f.u.warded ? 1 : 0);
    const life = f.u.def - f.u.dmg;
    // corpo a corpo na retaguarda não ataca: vale bem menos
    const stuck = f.pos.row === 1 && !f.u.keys.includes('distancia') && !f.u.keys.includes('parede');
    return v + f.u.atk * (stuck ? 0.4 : 1.4) + life * 0.9 + (f.u.keys.includes('guarda') ? 1.2 : 0) + (f.u.afflicted ? -1 : 0) + (f.u.warded ? 0.8 : 0);
  }, 0);
  return heroHp(s, p) * 1.0 - heroHp(s, other(p)) * 1.5
    + unitValue(p) - unitValue(other(p))
    + me.hand.length * 0.6 - op.hand.length * 0.3
    + (me.level + me.xp / 3) * 2.5 - (op.level + op.xp / 3) * 1.5
    + (me.stance ? 2 : 0) - (op.stance ? 2 : 0);
}

/** Ajustes do nível Muito difícil (o simulador mexe aqui para comparar). */
export const TUNE = { width: 8, depth: 6 };

const clone = (s: GameState): GameState => structuredClone(s);
const jitter = (k: Skill) => (k.noise ? (Math.random() * 2 - 1) * k.noise : 0);

/** Escolhe o bônus de nível: o recurso que a mão mais pede, ou vida se estiver mal. */
function levelChoice(s: GameState, p: 0 | 1, k: Skill): Action {
  if (k.noise >= 6) return { t: 'levelup', choice: (['vigor', 'mana', 'vida'] as const)[Math.floor(Math.random() * 3)] };
  const pl = s.players[p];
  const h = figures(s, p).find((f) => f.u.isHero)!.u;
  if (h.dmg > h.def * 0.55) return { t: 'levelup', choice: 'vida' };
  let v = 0, m = 0;
  for (const c of [...pl.hand, ...pl.deck.slice(0, 6)]) { const g = s.defs[c.cardId].game; v += g.vigor ?? 0; m += g.mana ?? 0; }
  const needV = v / Math.max(1, pl.maxVigor), needM = m / Math.max(1, pl.maxMana);
  return { t: 'levelup', choice: needM > needV ? 'mana' : 'vigor' };
}

/** Resposta do bot a uma carta do oponente: reage se a posição ficar melhor do que aceitando. */
function response(s: GameState, k: Skill): Action {
  if (Math.random() >= k.react) return { t: 'pass' };
  const me = other(s.pending!.p);
  const pass = clone(s);
  apply(pass, { t: 'pass' });
  let best: Action = { t: 'pass' }, bestScore = evaluate(pass, me) + 0.6; // guardar a Reação vale um pouco
  for (const c of reactions(s)) {
    const sim = clone(s);
    if (apply(sim, { t: 'react', uid: c.uid })) continue;
    const score = evaluate(sim, me) + jitter(k);
    if (score > bestScore) { bestScore = score; best = { t: 'react', uid: c.uid }; }
  }
  return best;
}

/**
 * Muito difícil: em vez de ir de jogada em jogada, procura a melhor SEQUÊNCIA para o turno
 * (busca em feixe: guarda as melhores posições a cada passo). Devolve a 1ª jogada da melhor
 * sequência. Nos testes bot × bot isso sozinho rende pouco sobre o Difícil; o que pesa é a
 * vantagem inicial (EDGE), avisada ao jogador.
 */
function planTurn(s: GameState, p: 0 | 1): Action {
  type Node = { s: GameState; first: Action; score: number };
  const finals: Node[] = [{ s, first: { t: 'end' }, score: evaluate(s, p) + 0.05 }];
  let frontier: { s: GameState; first: Action | null }[] = [{ s, first: null }];
  for (let d = 0; d < TUNE.depth && frontier.length; d++) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const a of legalActions(node.s)) {
        if (a.t === 'end' || a.t === 'levelup') continue;
        const sim = clone(node.s);
        if (apply(sim, a)) continue;
        if (sim.pending) apply(sim, { t: 'pass' });
        next.push({ s: sim, first: node.first ?? a, score: evaluate(sim, p) - (a.t === 'move' ? 0.4 : 0) - d * 0.02 });
      }
    }
    next.sort((x, y) => y.score - x.score);
    const keep = next.slice(0, TUNE.width);
    finals.push(...keep);
    frontier = keep.filter((n) => n.s.active === p && n.s.winner === undefined && !n.s.players[p].pendingLevels);
  }
  finals.sort((x, y) => y.score - x.score);
  return finals[0].first;
}

/** Próxima jogada do bot (de quem decide agora: o jogador da vez ou quem responde a uma carta). */
export function botAction(s: GameState, level: Difficulty = 'hard', exact = false): Action {
  const k: Skill = exact ? { ...SKILL[level], noise: 0, lazy: 0, react: 1 } : SKILL[level];
  if (s.pending) return response(s, k);
  const p = s.active;
  if (s.players[p].pendingLevels) return levelChoice(s, p, k);
  if (k.lazy && Math.random() < k.lazy) return { t: 'end' };
  if (k.plan) return planTurn(s, p);
  const base = evaluate(s, p);
  let best: Action = { t: 'end' };
  let bestScore = base + 0.05;
  for (const a of legalActions(s)) {
    if (a.t === 'end' || a.t === 'levelup') continue;
    const sim = clone(s);
    if (apply(sim, a)) continue;
    if (sim.pending) apply(sim, { t: 'pass' }); // conta que o oponente aceita
    // olha também a melhor jogada seguinte: ganhar Mana, comprar ou se mover só valem pelo que abrem
    const cost = a.t === 'move' ? 0.4 : 0;
    let score = evaluate(sim, p) - cost;
    if (k.ahead && sim.active === p && sim.winner === undefined) {
      for (const b of legalActions(sim)) {
        if (b.t === 'end' || b.t === 'move') continue;
        const sim2 = clone(sim);
        if (!apply(sim2, b)) { if (sim2.pending) apply(sim2, { t: 'pass' }); score = Math.max(score, evaluate(sim2, p) - cost - 0.1); }
      }
    }
    score += jitter(k);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

/** Joga o turno inteiro do bot (para o simulador e testes). Devolve as jogadas feitas. */
export function botTurn(s: GameState, maxSteps = 40, level: Difficulty = 'hard', exact = false): Action[] {
  const p = s.active;
  const done: Action[] = [];
  for (let i = 0; i < maxSteps && s.active === p && s.winner === undefined; i++) {
    const a = botAction(s, level, exact);
    done.push(a);
    if (apply(s, a)) { if (s.pending) apply(s, { t: 'pass' }); apply(s, { t: 'end' }); break; }
    if (s.pending) apply(s, botAction(s, level, exact)); // o outro lado (também bot, no simulador) responde
    if (a.t === 'end') break;
  }
  if (s.pending) apply(s, { t: 'pass' });
  if (s.active === p && s.winner === undefined) apply(s, { t: 'end' });
  return done;
}

/** Mão inicial do bot: troca (uma ou duas vezes) se quase nada dá para usar no nível 1; ao ficar, descarta as cartas mais caras. */
export function botMulligan(s: GameState, p: 0 | 1, level: Difficulty = 'hard'): Action {
  const pl = s.players[p], n = s.setup?.mull[p] ?? 0;
  const g = (uid: string) => s.defs[pl.hand.find((c) => c.uid === uid)!.cardId].game;
  // os níveis fáceis ficam sempre com a mão que veio
  const picky = level !== 'veryEasy' && level !== 'easy';
  const usable = pl.hand.filter((c) => { const x = s.defs[c.cardId].game; return x.level <= 1 && (x.vigor ?? 0) <= pl.maxVigor && (x.mana ?? 0) <= pl.maxMana && x.kind !== 'reacao'; }).length;
  if (picky && usable < 2 && n < 2) return { t: 'mulligan', p };
  const worst = [...pl.hand].sort((a, b) => (g(b.uid).level * 3 + (g(b.uid).vigor ?? 0) + (g(b.uid).mana ?? 0)) - (g(a.uid).level * 3 + (g(a.uid).vigor ?? 0) + (g(a.uid).mana ?? 0)));
  return { t: 'keep', p, discard: worst.slice(0, n).map((c) => c.uid) };
}
