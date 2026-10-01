/**
 * Escreve o texto de regras de uma carta a partir dos efeitos (sempre no mesmo
 * padrão, em PT e EN). Assim o texto nunca diverge do que o jogo faz.
 */
import type { Effect, Keyword, StanceMods, Target, Via } from './types';

type Lang = 'pt-BR' | 'en-US';

const KEY: Record<Keyword, [string, string]> = {
  guarda: ['Guarda', 'Guard'], rapido: ['Rápido', 'Swift'], distancia: ['À distância', 'Ranged'], parede: ['Não ataca', "Can't attack"],
};

function tgt(t: Target, pt: boolean): string {
  const m: Record<Target, [string, string]> = {
    enemy: ['um inimigo', 'an enemy'], enemyUnit: ['uma figura inimiga', 'an enemy figure'], enemyHero: ['o herói inimigo', 'the enemy hero'],
    enemyRow: ['cada inimigo de uma fileira', 'each enemy in a row'], enemyFront: ['cada inimigo da fileira da frente', 'each enemy in the front row'],
    allEnemies: ['cada inimigo', 'each enemy'], ally: ['uma figura aliada ou o seu herói', 'an ally figure or your hero'],
    allyUnit: ['uma figura aliada', 'an ally figure'], hero: ['o seu herói', 'your hero'], allAllies: ['cada aliado', 'each ally'],
  };
  return m[t][pt ? 0 : 1];
}

const via = (v: Via, pt: boolean) => ({ melee: pt ? 'corpo a corpo' : 'melee', ranged: pt ? 'à distância' : 'ranged', magic: pt ? 'mágico' : 'magic' }[v]);

function stance(m: StanceMods, pt: boolean): string {
  const parts: string[] = [];
  if (m.strike) parts.push(pt ? `seus golpes causam +${m.strike}` : `your strikes deal +${m.strike}`);
  if (m.strikeMagic) parts.push(pt ? 'seus golpes são mágicos (atingem qualquer inimigo)' : 'your strikes are magic (hit any enemy)');
  if (m.strikeAfflicts) parts.push(pt ? 'seus golpes afligem o alvo' : 'your strikes afflict the target');
  if (m.strikeHeals) parts.push(pt ? `seus golpes curam você em ${m.strikeHeals}` : `your strikes heal you for ${m.strikeHeals}`);
  if (m.guard) parts.push(pt ? 'seu herói tem Guarda' : 'your hero has Guard');
  const s = parts.join(pt ? ' e ' : ' and ');
  return (pt ? 'Enquanto nesta postura, ' : 'While in this stance, ') + s + '.';
}

function one(e: Effect, pt: boolean): string {
  switch (e.k) {
    case 'dmg': return pt ? `Cause ${e.n} de dano ${via(e.via, pt)} a ${tgt(e.tgt, pt)}.` : `Deal ${e.n} ${via(e.via, pt)} damage to ${tgt(e.tgt, pt)}.`;
    case 'strike': {
      const b = e.bonus ? (pt ? ` com +${e.bonus} de dano` : ` with +${e.bonus} damage`) : '';
      const times = e.times && e.times > 1 ? (pt ? ` ${e.times} vezes (se o alvo cair, o golpe seguinte vai para outro inimigo)` : ` ${e.times} times (if the target falls, the next strike hits another enemy)`) : '';
      const then = e.then === 'afflict' ? (pt ? ' O alvo fica Afligido.' : ' The target becomes Afflicted.')
        : e.then === 'mark' ? (pt ? ' O alvo fica Marcado.' : ' The target becomes Marked.')
        : e.then === 'push' ? (pt ? ' Empurre o alvo para a outra fileira.' : ' Push the target to the other row.') : '';
      return (pt ? `Golpeie com a sua arma${b}${times}.` : `Strike with your weapon${b}${times}.`) + then +
        (pt ? ' (Conta como o golpe do turno.)' : ' (Counts as your strike this turn.)');
    }
    case 'heal': return pt ? `Cure ${e.n} de ${tgt(e.tgt, pt)}.` : `Heal ${e.n} on ${tgt(e.tgt, pt)}.`;
    case 'afflict': return pt ? `Aflija ${tgt(e.tgt, pt)}.` : `Afflict ${tgt(e.tgt, pt)}.`;
    case 'mark': return pt ? `Marque ${tgt(e.tgt, pt)}.` : `Mark ${tgt(e.tgt, pt)}.`;
    case 'ward': return pt ? `Proteja ${tgt(e.tgt, pt)}.` : `Ward ${tgt(e.tgt, pt)}.`;
    case 'push': return pt ? `Empurre ${tgt(e.tgt, pt)} para a outra fileira.` : `Push ${tgt(e.tgt, pt)} to the other row.`;
    case 'summon': {
      const u = e.unit;
      const keys = u.keys?.length ? ` (${u.keys.map((k) => KEY[k][pt ? 0 : 1]).join(', ')})` : '';
      const n = e.n && e.n > 1 ? `${e.n} × ` : '';
      return pt ? `Invoque: ${n}${u.name[0]} ${u.atk}/${u.def}${keys}.` : `Summon: ${n}${u.name[1]} ${u.atk}/${u.def}${keys}.`;
    }
    case 'draw': return pt ? `Compre ${e.n} carta${e.n > 1 ? 's' : ''}.` : `Draw ${e.n} card${e.n > 1 ? 's' : ''}.`;
    case 'gain': return pt ? `Ganhe ${e.n} {${e.res}}.` : `Gain ${e.n} {${e.res}}.`;
    case 'buff': return pt ? `${cap(tgt(e.tgt, pt))} ganha +${e.atk} ATK até o fim do turno.` : `${cap(tgt(e.tgt, pt))} gets +${e.atk} ATK until end of turn.`;
    case 'selfdmg': return pt ? `Perca ${e.n} PV.` : `Lose ${e.n} HP.`;
    case 'advance': return pt ? 'Leve o seu herói para a fileira da frente.' : 'Move your hero to the front row.';
    case 'stance': return stance(e.mods, pt);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function effectsText(effects: Effect[], lang: Lang): string {
  return effects.map((e) => one(e, lang === 'pt-BR')).join(' ');
}

/** Texto de lembrete das palavras-chave de uma invocação. */
export function keywordName(k: Keyword, lang: Lang): string { return KEY[k][lang === 'pt-BR' ? 0 : 1]; }
