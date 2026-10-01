/**
 * Quanto vale o que uma carta faz no jogo, em pontos (a mesma escala da pontuação
 * do editor: 1 ponto é grátis; cada 2 pontos a mais custam +1 de Vigor/Mana).
 * Referência: dano em 1 alvo vale 1 ponto por ponto de dano (3 de dano = custo 1; 5 = 2; 7 = 3).
 *
 * O nível exigido entra como desconto: carta que só pode ser usada mais tarde pode ser mais forte
 * pelo mesmo custo. O atributo exigido alto dá um desconto pequeno.
 */
import type { CardGame, Effect, StanceMods, Target, UnitDef } from './types';

export interface ValueLine { label: string; points: number }

/** Quantos alvos um efeito costuma pegar (para dano, aflição etc.). */
const SCOPE: Record<Target, number> = {
  enemy: 1, enemyUnit: 0.85, enemyHero: 1, enemyRow: 2.2, enemyFront: 2, allEnemies: 3.5,
  ally: 1, allyUnit: 0.85, hero: 0.9, allAllies: 2.2,
};
const TGT_PT: Record<Target, string> = {
  enemy: '1 inimigo', enemyUnit: '1 criatura', enemyHero: 'herói inimigo', enemyRow: 'fileira', enemyFront: 'frente inimiga', allEnemies: 'todos os inimigos',
  ally: '1 aliado', allyUnit: '1 criatura aliada', hero: 'seu herói', allAllies: 'todos os aliados',
};
const round = (n: number) => Math.round(n * 2) / 2;

function unitValue(u: UnitDef): number {
  let v = u.atk + u.def;
  for (const k of u.keys ?? []) v += k === 'guarda' ? 1.5 : k === 'rapido' ? 1.5 : k === 'distancia' ? 1 : k === 'parede' ? -1 : 0;
  return v;
}

function stanceValue(m: StanceMods): number {
  return (m.strike ?? 0) * 3 + (m.strikeMagic ? 2 : 0) + (m.strikeAfflicts ? 3 : 0) + (m.strikeHeals ?? 0) * 1.5 + (m.guard ? 2 : 0);
}

function one(e: Effect): ValueLine {
  switch (e.k) {
    // corpo a corpo vale um pouco menos (depende de alcance); magia um pouco mais (ignora armadura)
    case 'dmg': return { label: `Dano ${e.n} (${TGT_PT[e.tgt]})`, points: round(e.n * SCOPE[e.tgt] * (e.via === 'melee' ? 0.9 : e.via === 'magic' ? 1.1 : 1)) };
    case 'strike': {
      const extra = e.then === 'afflict' ? 1.5 : e.then === 'mark' ? 1.5 : e.then === 'push' ? 1 : 0;
      return { label: `Golpe ${e.bonus}${(e.times ?? 1) > 1 ? ` ×${e.times}` : ''}${e.then ? ' + efeito' : ''}`, points: round((e.bonus + extra) * (e.times ?? 1)) };
    }
    case 'heal': return { label: `Cura ${e.n} (${TGT_PT[e.tgt]})`, points: round(e.n * 0.75 * SCOPE[e.tgt]) };
    case 'afflict': return { label: `Aflição (${TGT_PT[e.tgt]})`, points: round(2 * SCOPE[e.tgt]) };
    case 'mark': return { label: `Marca (${TGT_PT[e.tgt]})`, points: round(1.5 * SCOPE[e.tgt]) };
    case 'ward': return { label: `Proteção (${TGT_PT[e.tgt]})`, points: round(2 * SCOPE[e.tgt]) };
    case 'push': return { label: `Empurrão (${TGT_PT[e.tgt]})`, points: round(1.5 * SCOPE[e.tgt]) };
    case 'summon': return { label: `Invocar ${e.n && e.n > 1 ? `${e.n} × ` : ''}${e.unit.atk}/${e.unit.def}`, points: round(unitValue(e.unit) * 0.85 * (e.n ?? 1)) };
    case 'draw': return { label: `Comprar ${e.n}`, points: e.n * 2 };
    // ganhar recurso devolve custo: vale 2 por ponto, menos a carta gasta
    case 'gain': return { label: `Ganhar ${e.n} ${e.res === 'vigor' ? 'Vigor' : 'Mana'}`, points: e.n * 2 - 1 };
    case 'buff': return { label: `+${e.atk} ATK (${TGT_PT[e.tgt]})`, points: round(e.atk * SCOPE[e.tgt]) };
    case 'selfdmg': return { label: `Perder ${e.n} PV`, points: -round(e.n * 0.75) };
    case 'advance': return { label: 'Avançar', points: 0.5 };
    case 'counter': return { label: 'Anular', points: 4 };
    case 'stance': return { label: 'Postura', points: round(stanceValue(e.mods)) };
  }
}

/** As linhas de valor de uma carta de jogo (efeitos, e os descontos de nível e atributo). */
export function gameValue(g: CardGame): ValueLine[] {
  const lines = g.effects.map(one);
  // Reação: só serve na hora certa e exige guardar recurso
  if (g.kind === 'reacao') lines.push({ label: 'Reação (situacional)', points: -1 });
  if (g.level > 1) lines.push({ label: `Exige nível ${g.level}`, points: -round((g.level - 1) * 0.5) });
  if (g.attr && g.attr[1] >= 3) lines.push({ label: `Exige ${g.attr[0].toUpperCase()} ${g.attr[1]}`, points: -0.5 });
  return lines;
}
