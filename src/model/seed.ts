/**
 * Projeto inicial: 1ª edição com os 9 decks e as 450 cartas de exemplo, mais a
 * coleção "Classes" (9 cartas por deck, fiéis ao Pathfinder 2e, geradas por
 * tools/pf-cards.py com custo e raridade pela tabela de pontuação).
 */
import seedCards from '../data/seed-cards.json';
import pfCards from '../data/pf-cards.json';
import { HERO_BASES, PROTO_DECKS } from '../game/decks';
import { PRESET_AVATARS } from '../avatar/presets';
import { effectsText } from '../game/text';
import { ATTR_NAMES, KIND_NAMES } from '../game/types';
import type { Look } from '../render/compose';
import { CLASS_COLORS, COLORS } from './catalog';
import { normalizeCost } from './cost';
import { applyScoring } from './scoring';
import { PROJECT_VERSION, type Card, type Character, type ColorId, type Deck, type Edition, type Lang, type Project, type RarityId, type ResourceId } from './types';
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
    { id: prefix + 'resources', editionId, name: { 'pt-BR': 'Recursos', 'en-US': 'Resources' }, kind: 'resources', colors: ['orange'], look: { style: 'neutro' }, order: 7 },
    { id: prefix + 'equipment', editionId, name: { 'pt-BR': 'Equipamentos', 'en-US': 'Equipment' }, kind: 'equipment', colors: ['gear'], look: { style: 'neutro' }, order: 8 },
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

export const PROTO_ID = 'proto1';

/** Arma do herói dono de um deck do protótipo (deixa o texto dos golpes com o dano exato). */
export const protoWeapon = (deckId: string) => PROTO_DECKS.find((d) => `proto-${d.color}` === deckId)?.hero.weapon;

/** Os 4 heróis prontos como fichas editáveis (cada um já pode entrar na Mesa de teste). */
export function presetHeroes(): Character[] {
  const color = (deckId: string) => deckId.replace('proto-', '') as ColorId;
  return HERO_BASES.map((b): Character => ({
    id: `hero-${b.id}`, name: b.name, raceId: '', classColors: [color(b.deckId)], level: 1, hp: 30,
    stats: { str: 10 + 2 * b.attrs.for, dex: 10 + 2 * b.attrs.des, con: 10 + 2 * b.attrs.con, int: 10 + 2 * b.attrs.int, wis: 10 + 2 * b.attrs.sab, cha: 10 + 2 * b.attrs.car },
    slots: {}, notes: '', preset: b.id, play: structuredClone(b), avatar: structuredClone(PRESET_AVATARS[b.id]),
  }));
}

/** Coleção "Protótipo": 4 decks de 40 cartas com efeitos que a Mesa de teste entende. */
export function protoCollection(): { edition: Edition; decks: Deck[]; cards: Card[] } {
  const now = Date.now();
  const decks: Deck[] = PROTO_DECKS.map((d, i): Deck => ({
    id: `proto-${d.color}`, editionId: PROTO_ID, name: deckName(d.color), kind: 'class', colors: [d.color], look: defaultLook(), order: i,
  }));
  const cards: Card[] = PROTO_DECKS.flatMap((d) => d.cards.map((pc, i): Card => {
    const g = pc.game;
    const req = (lang: 0 | 1) => [`Nv ${g.level}`, ...(g.attr ? [`${ATTR_NAMES[g.attr[0]][lang]} ${g.attr[1]}`] : [])].join(' · ');
    const summon = g.effects.find((e) => e.k === 'summon');
    const cost = [...(g.vigor ? [{ resource: 'vigor' as const, amount: g.vigor, show: 'number' as const }] : []),
      ...(g.mana ? [{ resource: 'mana' as const, amount: g.mana, show: 'number' as const }] : [])];
    return {
      id: newId('card'), deckId: `proto-${d.color}`, n: i + 1,
      text: {
        'pt-BR': { name: pc.name[0], type: KIND_NAMES[g.kind][0], subtype: `${pc.cls[0]} · ${req(0)}`, rules: effectsText(g.effects, 'pt-BR', d.hero.weapon, g.react), flavor: '' },
        'en-US': { name: pc.name[1], type: KIND_NAMES[g.kind][1], subtype: `${pc.cls[1]} · ${req(1).replace('Nv', 'Lv')}`, rules: effectsText(g.effects, 'en-US', d.hero.weapon, g.react), flavor: '' },
      },
      colors: [d.color], cost,
      stats: summon && summon.k === 'summon' ? { atk: summon.unit.atk, def: summon.unit.def } : null,
      rarity: pc.rarity, mechanics: [], tags: [g.kind], costMode: 'manual', rarityMode: 'manual',
      art: { zoom: 1, x: 0, y: 0, mirror: false, icon: pc.icon }, game: structuredClone(g), createdAt: now, updatedAt: now,
    };
  }));
  return { edition: { id: PROTO_ID, name: 'Protótipo — Mesa de teste', code: 'PROTO', deckSize: 40 }, decks, cards };
}

export function seedProject(): { project: Project; cards: Card[] } {
  const pf = pfCollection();
  const proto = protoCollection();
  const decks = [...editionDecks(EDITION_ID), ...pf.decks, ...proto.decks];
  const cards = [...toCards(seedCards as SeedCard[], '', 'manual'), ...pf.cards, ...proto.cards];
  const project: Project = {
    version: PROJECT_VERSION,
    name: 'Darkstar',
    lang: 'pt-BR',
    editions: [{ id: EDITION_ID, name: '1ª Edição', code: '1ª Ed.' }, pf.edition, proto.edition],
    decks,
    characters: presetHeroes(),
    themes: [],
    seeded: [PF_ID, PROTO_ID, 'proto-rules-4', 'proto-heroes-1', 'proto-avatars-1'],
  };
  return { project, cards };
}
