/**
 * Escreve o texto de regras de uma carta a partir dos efeitos (sempre no mesmo
 * padrão, em PT e EN). Assim o texto nunca diverge do que o jogo faz.
 */
import type { Effect, HeroDef, Keyword, StanceMods, Target, Via } from './types';

/** Arma do herói dono do deck: deixa o texto dos golpes com o dano exato. */
export type Weapon = HeroDef['weapon'];

type Lang = 'pt-BR' | 'en-US';

const KEY: Record<Keyword, [string, string]> = {
  guarda: ['Guarda', 'Guard'], rapido: ['Rápido', 'Swift'], distancia: ['À distância', 'Ranged'], parede: ['Não ataca', "Can't attack"],
};

function tgt(t: Target, pt: boolean): string {
  const m: Record<Target, [string, string]> = {
    enemy: ['um inimigo', 'an enemy'], enemyUnit: ['uma criatura inimiga', 'an enemy creature'], enemyHero: ['o herói inimigo', 'the enemy hero'],
    enemyRow: ['cada inimigo de uma fileira', 'each enemy in a row'], enemyFront: ['cada inimigo da fileira da frente', 'each enemy in the front row'],
    allEnemies: ['cada inimigo', 'each enemy'], ally: ['uma criatura aliada ou o seu herói', 'an ally creature or your hero'],
    allyUnit: ['uma criatura aliada', 'an ally creature'], hero: ['o seu herói', 'your hero'], allAllies: ['cada aliado', 'each ally'],
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

/** Lembretes curtos dos marcadores (só na 1ª vez que aparecem na carta). */
const REMIND = {
  afflict: [' (perde 1 PV no começo de cada turno até ser curado)', ' (loses 1 HP at the start of each turn until healed)'],
  mark: [' (sofre +1 de todo dano até ser curado)', ' (takes +1 from all damage until healed)'],
  ward: [' (anula o próximo dano)', ' (prevents the next damage)'],
} as const;

function one(e: Effect, pt: boolean, w: Weapon | undefined, seen: Set<string>): string {
  const r = (k: keyof typeof REMIND) => { if (seen.has(k)) return ''; seen.add(k); return REMIND[k][pt ? 0 : 1]; };
  // o 2º efeito que mira o mesmo tipo de alvo escolhido fala de "o alvo"
  const T = (t: Target) => {
    const chosen = ['enemy', 'enemyUnit', 'ally', 'allyUnit'].includes(t);
    if (chosen && seen.has('tgt')) return pt ? 'o alvo' : 'the target';
    if (chosen) seen.add('tgt');
    return tgt(t, pt);
  };
  switch (e.k) {
    case 'dmg': return pt ? `Cause ${e.n} de dano ${via(e.via, pt)} a ${T(e.tgt)}.` : `Deal ${e.n} ${via(e.via, pt)} damage to ${T(e.tgt)}.`;
    case 'strike': {
      const times = e.times && e.times > 1 ? e.times : 1;
      seen.add('tgt');
      let head: string;
      if (w) {
        const n = w.dmg + e.bonus;
        const each = times > 1 ? (pt ? ` ${times} vezes: ${n} de dano ${via(w.via, pt)} cada` : ` ${times} times: ${n} ${via(w.via, pt)} damage each`)
          : (pt ? `: ${n} de dano ${via(w.via, pt)}` : `: ${n} ${via(w.via, pt)} damage`);
        const how = e.bonus ? (pt ? ` (arma ${w.dmg} + ${e.bonus})` : ` (weapon ${w.dmg} + ${e.bonus})`) : '';
        head = (pt ? `Golpe (${w.name[0]})${each}${how}.` : `Strike (${w.name[1]})${each}${how}.`) + (pt ? ' Usa o golpe do turno.' : ' Uses your strike this turn.');
      } else {
        const b = e.bonus ? (pt ? ` +${e.bonus} de dano` : ` +${e.bonus} damage`) : '';
        head = pt ? `Golpe da arma${b}${times > 1 ? ` ${times} vezes` : ''}.` : `Weapon strike${b}${times > 1 ? ` ${times} times` : ''}.`;
      }
      const then = e.then === 'afflict' ? (pt ? ' O alvo fica Afligido' : ' The target becomes Afflicted') + r('afflict') + '.'
        : e.then === 'mark' ? (pt ? ' O alvo fica Marcado' : ' The target becomes Marked') + r('mark') + '.'
        : e.then === 'push' ? (pt ? ' Empurre o alvo para a outra fileira.' : ' Push the target to the other row.') : '';
      return head + then;
    }
    case 'heal': return pt ? `${cap(T(e.tgt))} recupera ${e.n} PV.` : `${cap(T(e.tgt))} heals ${e.n} HP.`;
    case 'afflict': return (pt ? `Aflija ${T(e.tgt)}` : `Afflict ${T(e.tgt)}`) + r('afflict') + '.';
    case 'mark': return (pt ? `Marque ${T(e.tgt)}` : `Mark ${T(e.tgt)}`) + r('mark') + '.';
    case 'ward': return (pt ? `Proteja ${T(e.tgt)}` : `Ward ${T(e.tgt)}`) + r('ward') + '.';
    case 'push': return pt ? `Empurre ${T(e.tgt)} para a outra fileira.` : `Push ${T(e.tgt)} to the other row.`;
    case 'summon': {
      const u = e.unit;
      const keys = u.keys?.length ? ` (${u.keys.map((k) => KEY[k][pt ? 0 : 1]).join(', ')})` : '';
      const n = e.n && e.n > 1 ? `${e.n} × ` : '';
      return pt ? `Invoque: ${n}${u.name[0]} ${u.atk}/${u.def}${keys}.` : `Summon: ${n}${u.name[1]} ${u.atk}/${u.def}${keys}.`;
    }
    case 'draw': return pt ? `Compre ${e.n} carta${e.n > 1 ? 's' : ''}.` : `Draw ${e.n} card${e.n > 1 ? 's' : ''}.`;
    case 'gain': return pt ? `Ganhe ${e.n} {${e.res}}.` : `Gain ${e.n} {${e.res}}.`;
    case 'buff': return pt ? `${cap(T(e.tgt))} ganha +${e.atk} ATK até o fim do turno.` : `${cap(T(e.tgt))} gets +${e.atk} ATK until end of turn.`;
    case 'selfdmg': return pt ? `Perca ${e.n} PV.` : `Lose ${e.n} HP.`;
    case 'counter': return pt ? 'Anule essa carta: ela não faz efeito e vai para o cemitério.' : 'Counter that card: it has no effect and goes to the graveyard.';
    case 'advance': return pt ? 'Leve o seu herói para a fileira da frente.' : 'Move your hero to the front row.';
    case 'stance': return stance(e.mods, pt);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function effectsText(effects: Effect[], lang: Lang, weapon?: Weapon, react?: 'ataque' | 'magia' | 'any'): string {
  const seen = new Set<string>();
  const pt = lang === 'pt-BR';
  const when = !react ? '' : pt
    ? `Reação — use quando o oponente jogar ${react === 'ataque' ? 'um Ataque' : react === 'magia' ? 'uma Magia' : 'uma carta'}. `
    : `Reaction — use when the opponent plays ${react === 'ataque' ? 'an Attack' : react === 'magia' ? 'a Spell' : 'a card'}. `;
  return when + effects.map((e) => one(e, pt, weapon, seen)).join(' ');
}

/** Texto de lembrete das palavras-chave de uma invocação. */
export function keywordName(k: Keyword, lang: Lang): string { return KEY[k][lang === 'pt-BR' ? 0 : 1]; }
