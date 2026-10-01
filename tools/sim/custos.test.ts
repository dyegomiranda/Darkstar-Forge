import { it } from 'vitest';
import { appendFileSync, writeFileSync } from 'node:fs';
import { PROTO_DECKS } from '../../src/game/decks';
import { gameValue } from '../../src/game/value';
import { costForScore } from '../../src/model/scoring';
// Auditoria de custos: compara o custo de cada carta do Protótipo com o sugerido pelos efeitos.
// Rodar: AUDIT=1 vitest run tools/sim — o resultado sai em /tmp/audit.txt
it.skipIf(!process.env.AUDIT)('audit', () => {
  writeFileSync('/tmp/audit.txt', '');
  for (const d of PROTO_DECKS) for (const c of d.cards) {
    const pts = Math.max(0, gameValue(c.game).reduce((n, l) => n + l.points, 0));
    const sug = costForScore(pts), act = (c.game.vigor ?? 0) + (c.game.mana ?? 0);
    appendFileSync('/tmp/audit.txt', `${d.color.padEnd(6)} ${c.name[0].padEnd(28)} nv${c.game.level} pts ${String(pts).padStart(4)} sug ${sug} atual ${act} ${sug === act ? '' : sug > act ? `BARATA (${act - sug})` : `CARA (+${act - sug})`}\n`);
  }
});
