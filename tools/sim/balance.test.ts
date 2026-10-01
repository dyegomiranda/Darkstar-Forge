import { it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PROTO_DECKS } from '../../src/game/decks';
import { newGame, apply } from '../../src/game/engine';
import { botTurn } from '../../src/game/bot';
import type { CardDef } from '../../src/game/types';

const side = (i: number) => ({ hero: PROTO_DECKS[i].hero, cards: PROTO_DECKS[i].cards.map((c, n): CardDef => ({ id: `${i}-${n}`, name: c.name, game: c.game })) });
// Simulador de balanceamento (bot × bot). Rodar: SIM=1 vitest run tools/sim — o resultado sai em /tmp/sim.txt
it.skipIf(!process.env.SIM)('sim', () => {
  for (const heroOff of [false, true]) {
    const wins = [0, 0, 0, 0]; const games = [0, 0, 0, 0]; let turns = 0, n = 0;
    const pair: Record<string, number> = {};
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      if (a === b) continue;
      for (let k = 0; k < 12; k++) {
        const s = newGame(side(a), side(b), { seed: 1000 + a * 100 + b * 10 + k, heroOff });
        let guard = 0;
        while (s.winner === undefined && guard++ < 200) botTurn(s);
        if (s.winner === undefined) { apply(s, { t: 'end' }); continue; }
        const w = s.winner === 0 ? a : b;
        wins[w]++; games[a]++; games[b]++; turns += s.turn; n++;
        pair[`${a}>${b}`] = (pair[`${a}>${b}`] ?? 0) + (s.winner === 0 ? 1 : 0);
      }
    }
    appendFileSync('/tmp/sim.txt', [heroOff ? 'FORA' : 'CAMPO', PROTO_DECKS.map((d, i) => `${d.hero.name} ${Math.round(100 * wins[i] / games[i])}%`).join('  '), 'turnos', (turns / n).toFixed(1), JSON.stringify(pair)].join(' ') + '\n');
  }
}, 600000);
