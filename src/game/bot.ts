/**
 * Bot simples: olha cada jogada permitida, simula o resultado e fica com a que
 * deixa a posição melhor (vida, figuras em campo, cartas, nível). Encerra o
 * turno quando nenhuma jogada melhora a posição.
 */
import { apply, figures, heroHp, legalActions, other } from './engine';
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

/** Próxima jogada do bot. */
export function botAction(s: GameState): Action {
  const p = s.active;
  if (s.players[p].pendingLevels) return levelChoice(s, p);
  const base = evaluate(s, p);
  let best: Action = { t: 'end' };
  let bestScore = base + 0.05;
  for (const a of legalActions(s)) {
    if (a.t === 'end' || a.t === 'levelup') continue;
    const sim = clone(s);
    if (apply(sim, a)) continue;
    // olha também a melhor jogada seguinte: ganhar Mana, comprar ou se mover só valem pelo que abrem
    const cost = a.t === 'move' ? 0.4 : 0;
    let score = evaluate(sim, p) - cost;
    if (sim.active === p && sim.winner === undefined) {
      for (const b of legalActions(sim)) {
        if (b.t === 'end' || b.t === 'move') continue;
        const sim2 = clone(sim);
        if (!apply(sim2, b)) score = Math.max(score, evaluate(sim2, p) - cost - 0.1);
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
    if (apply(s, a)) { apply(s, { t: 'end' }); break; }
    if (a.t === 'end') break;
  }
  if (s.active === p && s.winner === undefined) apply(s, { t: 'end' });
  return done;
}
