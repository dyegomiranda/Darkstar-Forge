/** Projeto inicial: 1ª edição com os 9 decks e as 450 cartas de exemplo. */
import seedCards from '../data/seed-cards.json';
import type { Look } from '../render/compose';
import { CLASS_COLORS, COLORS } from './catalog';
import { applyScoring } from './scoring';
import { PROJECT_VERSION, type Card, type ColorId, type Deck, type Lang, type Project, type RarityId, type ResourceId } from './types';
import { newId } from './id';

interface SeedCard {
  deck: string; n: number; colors: ColorId[];
  text: Card['text'];
  cost: { resource: string; amount: number } | null;
  stats: { atk: number; def: number } | null;
  rarity: string; mechanics: string[]; tags: string[];
}

export const EDITION_ID = 'ed1';

/** Tema padrão de um deck novo: Ornado (o visual do card1), sem moldura. */
export const defaultLook = (): Look => ({ style: 'ornado' });

const deckName = (id: ColorId): Record<Lang, string> => ({
  'pt-BR': `${COLORS[id].name['pt-BR']} — ${COLORS[id].classes['pt-BR']}`,
  'en-US': `${COLORS[id].name['en-US']} — ${COLORS[id].classes['en-US']}`,
});

export function seedProject(): { project: Project; cards: Card[] } {
  const decks: Deck[] = [
    ...CLASS_COLORS.map((c, i): Deck => ({ id: c, editionId: EDITION_ID, name: deckName(c), kind: 'class', colors: [c], look: defaultLook(), order: i })),
    { id: 'resources', editionId: EDITION_ID, name: { 'pt-BR': 'Recursos', 'en-US': 'Resources' }, kind: 'resources', colors: ['orange'], look: defaultLook(), order: 7 },
    { id: 'equipment', editionId: EDITION_ID, name: { 'pt-BR': 'Equipamentos', 'en-US': 'Equipment' }, kind: 'equipment', colors: ['gear'], look: defaultLook(), order: 8 },
  ];
  const now = Date.now();
  const cards = (seedCards as SeedCard[]).map((s): Card => applyScoring({
    id: newId('card'),
    deckId: s.deck,
    n: s.n,
    text: s.text,
    colors: s.colors,
    cost: s.cost ? { resource: s.cost.resource as ResourceId, amount: s.cost.amount } : null,
    stats: s.stats,
    rarity: s.rarity as RarityId,
    mechanics: s.mechanics,
    tags: s.tags,
    // as cartas de exemplo têm custo e raridade definidos à mão
    costMode: 'manual',
    rarityMode: 'manual',
    art: { zoom: 1, x: 0, y: 0, mirror: false },
    createdAt: now,
    updatedAt: now,
  }));
  const project: Project = {
    version: PROJECT_VERSION,
    name: 'Darkstar',
    lang: 'pt-BR',
    editions: [{ id: EDITION_ID, name: '1ª Edição', code: '1ª Ed.' }],
    decks,
    characters: [],
    themes: [],
  };
  return { project, cards };
}
