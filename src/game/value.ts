/**
 * A REGRA DE CUSTO do jogo (determinística): o custo de uma carta sai só do que ela faz.
 *
 *   pontos  = soma do valor de cada efeito − descontos (nível, atributo, reação, item)
 *   custo   = 0 se pontos ≤ 1,5; senão, ⌈(pontos − 1,5) / 2⌉      (Vigor + Mana somados)
 *
 * Ou seja: 1,5 ponto é grátis e cada 2 pontos a mais custam +1. No custo 0 cabem até 1,5 ponto;
 * no 1, até 3,5; no 2, até 5,5; no 3, até 7,5; e assim por diante.
 *
 * Valor dos efeitos (1 ponto = 1 de dano num alvo, à distância):
 *   dano N            N × alcance (1 alvo 1 · 1 criatura 0,85 · fileira 2,2 · frente 2 · todos 3,5)
 *                     × tipo (corpo a corpo 0,9 · à distância 1 · mágico 1,1)
 *   golpe N           N por golpe (+1,5 se aflige ou marca; +1 se empurra)
 *   cura N            0,75 × N × alcance            aflição   2 × alcance
 *   marca             1,5 × alcance                 proteção  2 × alcance
 *   empurrão          1,5 × alcance                 comprar N 2 × N
 *   ganhar N recurso  2 × N − 1                     +N ATK    N × alcance
 *   invocar           0,85 × (ATK + DEF + palavras-chave: Guarda +1,5 · Rápido +1,5 · À distância +1 · Não ataca −1)
 *   perder N PV       −0,75 × N                     avançar   0,5        anular 6
 *   postura           +N no golpe 3 × N · golpe mágico 2 · golpe aflige 3 · golpe cura N 1,5 × N · Guarda 2
 *
 * Descontos: nível exigido L: −0,5 × (L − 1) · atributo exigido ≥ 3: −0,5 · Reação: −1 · Item: −2.
 *
 * Toda carta com efeitos de jogo deve obedecer a esta regra (há um teste que confere a coleção
 * Protótipo). Mexer num peso aqui muda o custo de todas as cartas de uma vez: é assim que se
 * rebalanceia sem criar cartas "fora da curva".
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
      // furtivo vale metade (depende de o alvo estar Marcado/Afligido); o dano mágico extra vale um pouco mais que o normal
      return { label: `Golpe ${e.bonus}${(e.times ?? 1) > 1 ? ` ×${e.times}` : ''}${e.then ? ' + efeito' : ''}${e.sneak ? ` + furtivo ${e.sneak}` : ''}${e.smite ? ` + ${e.smite} mágico` : ''}`, points: round((e.bonus + extra + (e.sneak ?? 0) * 0.5 + (e.smite ?? 0) * 1.1) * (e.times ?? 1)) };
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
    case 'counter': return { label: 'Anular', points: 6 };
    case 'stance': return { label: 'Postura', points: round(stanceValue(e.mods)) };
  }
}

/** As linhas de valor de uma carta de jogo (efeitos, e os descontos de nível e atributo). */
export function gameValue(g: CardGame): ValueLine[] {
  const lines = g.effects.map(one);
  // Reação: só serve na hora certa e exige guardar recurso
  if (g.kind === 'reacao') lines.push({ label: 'Reação (situacional)', points: -1 });
  // Item: uso único e poucas cópias por deck
  if (g.kind === 'item') lines.push({ label: 'Item (consumível)', points: -2 });
  if (g.level > 1) lines.push({ label: `Exige nível ${g.level}`, points: -round((g.level - 1) * 0.5) });
  if (g.attr && g.attr[1] >= 3) lines.push({ label: `Exige ${g.attr[0].toUpperCase()} ${g.attr[1]}`, points: -0.5 });
  return lines;
}

/** Pontos da carta (nunca negativo). */
export const gamePoints = (g: CardGame): number => Math.max(0, gameValue(g).reduce((n, l) => n + l.points, 0));
/** O custo que a regra dá (Vigor + Mana somados). */
/** Pontos que cabem no custo 0, e quantos pontos vale cada ponto de custo. */
export const FREE = 1.5, PER_COST = 2;
export const ruleCost = (g: CardGame): number => { const p = gamePoints(g); return p <= FREE ? 0 : Math.ceil((p - FREE) / PER_COST); };
