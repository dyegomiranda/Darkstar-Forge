/**
 * Ponte entre o app e a Mesa de teste: monta o lado de um herói com as cartas
 * do deck do app. O que se edita no editor vale na partida: custo (Vigor/Mana),
 * ATK/DEF de invocações, cópias, nível e efeitos.
 */
import type { Card } from '../model/types';
import type { Side } from './engine';
import type { CardDef, Effect, HeroDef } from './types';

export function cardDef(c: Card): CardDef | null {
  if (!c.game) return null;
  const sum = (r: string) => c.cost.filter((p) => p.resource === r).reduce((n, p) => n + p.amount, 0);
  // fúria conta como Vigor; os outros recursos de classe, como Mana
  const vigor = sum('vigor') + sum('fury');
  const mana = c.cost.filter((p) => !['vigor', 'fury', 'gold'].includes(p.resource)).reduce((n, p) => n + p.amount, 0);
  const effects: Effect[] = c.game.effects.map((e) =>
    e.k === 'summon' && c.stats ? { ...e, unit: { ...e.unit, atk: c.stats.atk, def: c.stats.def } } : e);
  return { id: c.id, name: [c.text['pt-BR'].name, c.text['en-US'].name], game: { ...c.game, vigor, mana, effects } };
}

export function sideFromApp(hero: HeroDef, cards: Card[]): Side {
  return { hero, cards: cards.map(cardDef).filter((x): x is CardDef => !!x) };
}
