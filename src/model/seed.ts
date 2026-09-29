/**
 * Projeto inicial: 1ª edição com os 9 decks e as 450 cartas de exemplo, mais a
 * coleção "Classes" (9 cartas por deck, fiéis ao Pathfinder 2e, geradas por
 * tools/pf-cards.py com custo e raridade pela tabela de pontuação).
 */
import seedCards from '../data/seed-cards.json';
import pfCards from '../data/pf-cards.json';
import type { Look } from '../render/compose';
import { CLASS_COLORS, COLORS } from './catalog';
import { normalizeCost } from './cost';
import { applyScoring } from './scoring';
import { PROJECT_VERSION, type Card, type ColorId, type Deck, type Edition, type Lang, type Project, type RarityId, type ResourceId } from './types';
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

/** Os 9 decks de uma edição. `prefix` diferencia os ids entre edições. */
function editionDecks(editionId: string, prefix = ''): Deck[] {
  return [
    ...CLASS_COLORS.map((c, i): Deck => ({ id: prefix + c, editionId, name: deckName(c), kind: 'class', colors: [c], look: defaultLook(), order: i })),
    { id: prefix + 'resources', editionId, name: { 'pt-BR': 'Recursos', 'en-US': 'Resources' }, kind: 'resources', colors: ['orange'], look: defaultLook(), order: 7 },
    { id: prefix + 'equipment', editionId, name: { 'pt-BR': 'Equipamentos', 'en-US': 'Equipment' }, kind: 'equipment', colors: ['gear'], look: defaultLook(), order: 8 },
  ];
}

function toCards(list: SeedCard[], prefix: string, mode: Card['rarityMode']): Card[] {
  const now = Date.now();
  return list.map((s): Card => applyScoring({
    id: newId('card'),
    deckId: prefix + s.deck,
    n: s.n,
    text: s.text,
    colors: s.colors,
    cost: normalizeCost(s.cost),
    stats: s.stats,
    rarity: s.rarity as RarityId,
    mechanics: s.mechanics,
    tags: s.tags,
    // custo fixo; a raridade das cartas de Classes segue a tabela (e já bate com ela)
    costMode: 'manual',
    rarityMode: mode,
    art: { zoom: 1, x: 0, y: 0, mirror: false },
    createdAt: now,
    updatedAt: now,
  }));
}

export const PF_ID = 'pf1';
const PF_PREFIX = 'pf-';

/** Coleção "Classes" (Pathfinder 2e): edição, decks e cartas. */
export function pfCollection(): { edition: Edition; decks: Deck[]; cards: Card[] } {
  return {
    edition: { id: PF_ID, name: 'Classes — Pathfinder', code: 'CLS' },
    decks: editionDecks(PF_ID, PF_PREFIX),
    cards: toCards(pfCards as SeedCard[], PF_PREFIX, 'auto'),
  };
}

export function seedProject(): { project: Project; cards: Card[] } {
  const pf = pfCollection();
  const decks = [...editionDecks(EDITION_ID), ...pf.decks];
  const cards = [...toCards(seedCards as SeedCard[], '', 'manual'), ...pf.cards];
  const project: Project = {
    version: PROJECT_VERSION,
    name: 'Darkstar',
    lang: 'pt-BR',
    editions: [{ id: EDITION_ID, name: '1ª Edição', code: '1ª Ed.' }, pf.edition],
    decks,
    characters: [],
    themes: [],
    seeded: [PF_ID],
  };
  return { project, cards };
}
