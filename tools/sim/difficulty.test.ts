import { it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PROTO_DECKS } from '../../src/game/decks';
import { newGame, apply } from '../../src/game/engine';
import { botTurn, EDGE, type Difficulty } from '../../src/game/bot';
import type { CardDef } from '../../src/game/types';

const side = (i: number) => ({ hero: PROTO_DECKS[i].hero, cards: PROTO_DECKS[i].cards.map((c, n): CardDef => ({ id: `${i}-${n}`, name: c.name, game: c.game })) });
// Confere a escada de dificuldade (bot × bot): cada nível contra o Difícil. Rodar: SIM=dif vitest run tools/sim/difficulty — sai em SIM_OUT
it.skipIf(process.env.SIM !== 'dif')('dificuldades', () => {
  const levels: Difficulty[] = ['veryEasy', 'easy', 'normal', 'hard', 'veryHard'];
  for (const lv of levels) {
    let w = 0, n = 0, turns = 0; const t0 = Date.now();
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      if (a === b) continue;
      for (let k = 0; k < 3; k++) for (const first of [0, 1]) {
        // o nível testado joga com o deck `a`, ora começando, ora não
        const e = EDGE[lv];
        const mine = e ? { ...side(a), hero: { ...side(a).hero, maxHp: side(a).hero.maxHp + e.hp }, extraCards: e.cards } : side(a);
        const s = first === 0 ? newGame(mine, side(b), { seed: 5000 + a * 100 + b * 10 + k }) : newGame(side(b), mine, { seed: 5000 + a * 100 + b * 10 + k });
        let guard = 0;
        while (s.winner === undefined && guard++ < 200) botTurn(s, 40, s.active === first ? lv : 'hard');
        if (s.winner === undefined) { apply(s, { t: 'end' }); continue; }
        n++; turns += s.turn; if (s.winner === first) w++;
      }
    }
    appendFileSync(process.env.SIM_OUT ?? '/tmp/sim-dif.txt', `${lv} × hard: ${Math.round(100 * w / n)}% de vitórias em ${n} partidas, ${(turns / n).toFixed(1)} turnos, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
  }
}, 3600000);
