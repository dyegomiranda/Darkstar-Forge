import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { PROTO_DECKS } from '../../src/game/decks';
import { gamePoints, ruleCost } from '../../src/game/value';
// Auditoria de custos: o custo de cada carta do Protótipo e o que a regra dá.
// Rodar: AUDIT=1 vitest run tools/sim — o resultado sai em /tmp/audit.txt e /tmp/audit.json
it.skipIf(!process.env.AUDIT)('audit', () => {
  const rows = PROTO_DECKS.flatMap((d) => d.cards.map((c, i) => ({ deck: d.color, i, name: c.name[0], level: c.game.level, points: gamePoints(c.game), rule: ruleCost(c.game), now: (c.game.vigor ?? 0) + (c.game.mana ?? 0) })));
  writeFileSync('/tmp/audit.json', JSON.stringify(rows));
  writeFileSync('/tmp/audit.txt', rows.map((r) => `${r.deck.padEnd(6)} ${r.name.padEnd(28)} nv${r.level} pts ${String(r.points).padStart(4)} regra ${r.rule} atual ${r.now}${r.rule === r.now ? '' : '  <<<'}`).join('\n') + '\n');
});
