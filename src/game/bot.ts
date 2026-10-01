/**
 * Bot simples: olha cada jogada permitida, simula o resultado e fica com a que
 * deixa a posição melhor (vida, criaturas em campo, cartas, nível). Encerra o
 * turno quando nenhuma jogada melhora a posição.
 */
import { apply, figures, heroHp, legalActions, other, reactions } from './engine';
import type { Action, GameState } from './types';

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

const clone = (s: GameState): GameState => structuredClone(s);

/** Escolhe o bônus de nível: o recurso que a mão mais pede, ou vida se estiver mal. */
function levelChoice(s: GameState, p: 0 | 1): Action {
  const pl = s.players[p];
  const h = figures(s, p).find((f) => f.u.isHero)!.u;
  if (h.dmg > h.def * 0.55) return { t: 'levelup', choice: 'vida' };
  let v = 0, m = 0;
  for (const c of [...pl.hand, ...pl.deck.slice(0, 6)]) { const g = s.defs[c.cardId].game; v += g.vigor ?? 0; m += g.mana ?? 0; }
  const needV = v / Math.max(1, pl.maxVigor), needM = m / Math.max(1, pl.maxMana);
  return { t: 'levelup', choice: needM > needV ? 'mana' : 'vigor' };
}

/** Resposta do bot a uma carta do oponente: reage se a posição ficar melhor do que aceitando. */
function response(s: GameState): Action {
  const me = other(s.pending!.p);
  const pass = clone(s);
  apply(pass, { t: 'pass' });
  let best: Action = { t: 'pass' }, bestScore = evaluate(pass, me) + 0.6; // guardar a Reação vale um pouco
  for (const c of reactions(s)) {
    const sim = clone(s);
    if (apply(sim, { t: 'react', uid: c.uid })) continue;
    const score = evaluate(sim, me);
    if (score > bestScore) { bestScore = score; best = { t: 'react', uid: c.uid }; }
  }
  return best;
}

/** Próxima jogada do bot (de quem decide agora: o jogador da vez ou quem responde a uma carta). */
export function botAction(s: GameState): Action {
  if (s.pending) return response(s);
  const p = s.active;
  if (s.players[p].pendingLevels) return levelChoice(s, p);
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
    if (sim.active === p && sim.winner === undefined) {
      for (const b of legalActions(sim)) {
        if (b.t === 'end' || b.t === 'move') continue;
        const sim2 = clone(sim);
        if (!apply(sim2, b)) { if (sim2.pending) apply(sim2, { t: 'pass' }); score = Math.max(score, evaluate(sim2, p) - cost - 0.1); }
      }
    }
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

/** Joga o turno inteiro do bot (para o simulador e testes). Devolve as jogadas feitas. */
export function botTurn(s: GameState, maxSteps = 40): Action[] {
  const p = s.active;
  const done: Action[] = [];
  for (let i = 0; i < maxSteps && s.active === p && s.winner === undefined; i++) {
    const a = botAction(s);
    done.push(a);
    if (apply(s, a)) { if (s.pending) apply(s, { t: 'pass' }); apply(s, { t: 'end' }); break; }
    if (s.pending) apply(s, botAction(s)); // o outro lado (também bot, no simulador) responde
    if (a.t === 'end') break;
  }
  if (s.pending) apply(s, { t: 'pass' });
  if (s.active === p && s.winner === undefined) apply(s, { t: 'end' });
  return done;
}

/** Mão inicial do bot: troca (uma ou duas vezes) se quase nada dá para usar no nível 1; ao ficar, descarta as cartas mais caras. */
export function botMulligan(s: GameState, p: 0 | 1): Action {
  const pl = s.players[p], n = s.setup?.mull[p] ?? 0;
  const g = (uid: string) => s.defs[pl.hand.find((c) => c.uid === uid)!.cardId].game;
  const usable = pl.hand.filter((c) => { const x = s.defs[c.cardId].game; return x.level <= 1 && (x.vigor ?? 0) <= pl.maxVigor && (x.mana ?? 0) <= pl.maxMana && x.kind !== 'reacao'; }).length;
  if (usable < 2 && n < 2) return { t: 'mulligan', p };
  const worst = [...pl.hand].sort((a, b) => (g(b.uid).level * 3 + (g(b.uid).vigor ?? 0) + (g(b.uid).mana ?? 0)) - (g(a.uid).level * 3 + (g(a.uid).vigor ?? 0) + (g(a.uid).mana ?? 0)));
  return { t: 'keep', p, discard: worst.slice(0, n).map((c) => c.uid) };
}
