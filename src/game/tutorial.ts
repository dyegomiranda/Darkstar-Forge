import type { Card } from '../model/types';
import type { Side } from './engine';
import { heroPos, newGame, other } from './engine';
import type { Action, CardGame, GameState, HeroDef } from './types';

const definitions: { key: string; name: [string, string]; icon: string; game: CardGame }[] = [
  { key: 'summon', name: ['Guardião de treino', 'Training Guardian'], icon: 'shield', game: { kind: 'invocacao', level: 1, mana: 1, copies: 4, effects: [{ k: 'summon', unit: { name: ['Guardião de treino', 'Training Guardian'], atk: 2, def: 8, keys: ['guarda', 'distancia'], icon: 'shield' } }] } },
  { key: 'attack', name: ['Golpe de treino', 'Training Strike'], icon: 'broadsword', game: { kind: 'ataque', level: 1, vigor: 1, copies: 4, effects: [{ k: 'strike', bonus: 1 }] } },
  { key: 'spell', name: ['Faísca de treino', 'Training Spark'], icon: 'fireball', game: { kind: 'magia', level: 1, mana: 1, copies: 4, effects: [{ k: 'dmg', n: 2, via: 'magic', tgt: 'enemy' }], ranks: [{ level: 2, mana: 2, effects: [{ k: 'dmg', n: 4, via: 'magic', tgt: 'enemy' }] }] } },
  { key: 'stance', name: ['Postura de treino', 'Training Stance'], icon: 'swords-emblem', game: { kind: 'postura', level: 1, vigor: 1, copies: 4, effects: [{ k: 'stance', mods: { strike: 1 } }] } },
  { key: 'technique', name: ['Fôlego de treino', 'Training Breath'], icon: 'wind-slap', game: { kind: 'tecnica', level: 1, vigor: 1, copies: 4, effects: [{ k: 'gain', res: 'mana', n: 1 }] } },
  { key: 'item', name: ['Bálsamo de treino', 'Training Balm'], icon: 'potion-ball', game: { kind: 'item', level: 1, mana: 1, copies: 4, effects: [{ k: 'heal', n: 4, tgt: 'hero' }] } },
  { key: 'reaction', name: ['Bloqueio de treino', 'Training Block'], icon: 'magic-shield', game: { kind: 'reacao', react: 'any', level: 1, mana: 1, copies: 4, effects: [{ k: 'counter' }] } },
];
export function trainingCards(template: Card, collection: Card[] = []): Record<string, Card> {
  return Object.fromEntries(definitions.map((d, n) => {
    const id = `tutorial-${d.key}`;
    const description: Record<string, [string, string]> = {
      summon: ['Invoque Guardião 2/8 com Guarda e ataque à distância em uma casa livre.', 'Summon a 2/8 Guardian with Guard and ranged attack in a free slot.'],
      attack: ['Golpeie com sua arma, causando +1 dano.', 'Strike with your weapon, dealing +1 damage.'],
      spell: ['Cause 2 de dano mágico a um inimigo. Nível 2: 4 de dano por 2 Mana.', 'Deal 2 magic damage to an enemy. Level 2: 4 damage for 2 Mana.'],
      stance: ['Seu golpe causa +1 dano enquanto esta postura estiver ativa.', 'Your strike deals +1 damage while this stance is active.'],
      technique: ['Ganhe 1 Mana.', 'Gain 1 Mana.'], item: ['Cure 4 de vida do seu herói.', 'Heal your hero for 4 life.'], reaction: ['Reação: anule a ação inimiga pendente.', 'Reaction: counter the pending enemy action.'],
    };
    const fallback: Record<string, string> = { summon: 'stone-elemental', attack: 'lunge', spell: 'spark', stance: 'battle-mage-stance', technique: 'focus', item: 'healing-potion', reaction: 'counterspell' };
    const source = collection.find(c => c.game?.kind === d.game.kind && c.art.mediaId)
      ?? collection.find(c => c.game?.kind === d.game.kind) ?? template;
    const card: Card = { ...template, id, deckId: template.deckId, n: n + 1, colors: ['blue'], rarity: 'common', mechanics: [], tags: [], gear: undefined, stats: null, cost: [...(d.game.vigor ? [{ resource: 'vigor' as const, amount: d.game.vigor }] : []), ...(d.game.mana ? [{ resource: 'mana' as const, amount: d.game.mana }] : [])], game: structuredClone(d.game), art: { ...source.art, asset: source.art.mediaId ? undefined : `art/proto/${fallback[d.key]}.webp`, icon: d.icon }, look: undefined,
      text: { 'pt-BR': { name: d.name[0], type: d.game.kind, subtype: 'Treino · Nível 1', rules: description[d.key][0], flavor: '' }, 'en-US': { name: d.name[1], type: d.game.kind, subtype: 'Training · Level 1', rules: description[d.key][1], flavor: '' } } };
    return [id, card];
  }));
}
export function trainingGame(mine: HeroDef, foe: HeroDef, cards: Record<string, Card>, first: boolean): GameState {
  const make = (hero: HeroDef): HeroDef => ({ ...hero, maxHp: 14, gear: [], armor: 0, resist: 0, vigor: 3, mana: 3, weapon: { name: ['Cajado de treino', 'Training staff'], dmg: 2, via: 'magic' } });
  const defs = Object.values(cards).map((c) => ({ id: c.id, name: [c.text['pt-BR'].name, c.text['en-US'].name] as [string, string], game: c.game! }));
  const a: Side = { hero: make(mine), cards: defs };
  const b: Side = { hero: { ...make(foe), name: 'Instrutor', row: 0, col: 1 }, cards: defs.filter((d) => d.id === 'tutorial-spell').map((d) => ({ ...d, game: { ...d.game, copies: 40 } })) };
  const g = newGame(first ? a : b, first ? b : a, { seed: 8128, mulligan: true });
  // O treino ignora nível salvo e bônus de dificuldade. O XP segue o motor normal.
  for (const player of g.players) { player.level = 1; player.xp = 0; player.pendingLevels = 0; }
  const me = first ? 0 : 1;
  prepareOpening(g, me);
  const pos = heroPos(g, me);
  g.players[me].board[pos.row][pos.col]!.dmg = 2;
  return g;
}
/** Retira referências existentes da pilha, sem duplicar uid nem gravar cartas na coleção. */
export function prepareOpening(g: GameState, p: 0 | 1) {
  const player = g.players[p]; player.deck.push(...player.hand); player.hand = [];
  for (const d of definitions) {
    const i = player.deck.findIndex((c) => c.cardId === `tutorial-${d.key}`);
    if (i >= 0) player.hand.push(...player.deck.splice(i, 1));
  }
}
export function ensureTrainingCard(g: GameState, p: 0 | 1, id: string) {
  const player = g.players[p];
  if (player.hand.some((c) => c.cardId === id)) return;
  const i = player.deck.findIndex((c) => c.cardId === id);
  if (i >= 0) player.hand.push(...player.deck.splice(i, 1));
}
/** Instrutor: uma magia leve e depois passa, nunca elimina o aluno ou sua invocação. */
export function trainingBotAction(g: GameState, p: 0 | 1, played: boolean): Action {
  if (g.pending) return { t: 'pass' };
  if (played) return { t: 'end' };
  const card = g.players[p].hand.find((r) => r.cardId === 'tutorial-spell');
  return card ? { t: 'play', uid: card.uid, target: heroPos(g, other(p)) } : { t: 'end' };
}
