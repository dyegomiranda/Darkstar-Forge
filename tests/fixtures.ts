import type { Card, Deck } from '../src/model/types';

export function card(over: Partial<Card> = {}): Card {
  return {
    id: 'card_1', deckId: 'red', n: 1,
    text: {
      'pt-BR': { name: 'Golpe', type: 'Ação', subtype: '', rules: 'Cause 2 de dano.', flavor: '' },
      'en-US': { name: 'Strike', type: 'Action', subtype: '', rules: 'Deal 2 damage.', flavor: '' },
    },
    colors: ['red'], cost: { resource: 'vigor', amount: 1 }, stats: { atk: 2, def: 2 }, rarity: 'common',
    mechanics: [], tags: [], costMode: 'auto', rarityMode: 'auto',
    art: { zoom: 1, x: 0, y: 0, mirror: false }, createdAt: 0, updatedAt: 0,
    ...over,
  };
}

export function deck(over: Partial<Deck> = {}): Deck {
  return { id: 'red', editionId: 'ed1', name: { 'pt-BR': 'Vermelho', 'en-US': 'Red' }, kind: 'class', colors: ['red'], look: { style: 'ornado' }, order: 0, ...over };
}
