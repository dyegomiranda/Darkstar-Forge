/**
 * Equipamento do herói = cartas de equipamento vestidas na ficha (`slots`).
 * A carta diz em que espaço cabe (etiqueta) e o que soma (`gear`); a arma na mão
 * principal define o golpe. A mesa de jogo lê tudo daqui — não há outra lista.
 */
import { newId } from './id';
import type { Card, CardGear, Character, Deck, Lang, Slot } from './types';
import { GEAR_SLOTS, type GearItem, type GearSlot, type HeroBase, type Via } from '../game/types';
import { gearInfo, HERO_BASES } from '../game/decks';
import { gameAttrs } from './hero';

/** Espaços da ficha: nome, etiquetas de carta que cabem e o tipo de peça. */
export const SLOTS: { id: Slot; pt: string; en: string; tags: string[]; gear: GearSlot; pos: [number, number] }[] = [
  { id: 'head', pt: 'Cabeça', en: 'Head', tags: ['head'], gear: 'head', pos: [50, 12] },
  { id: 'hands', pt: 'Mãos', en: 'Hands', tags: ['hands'], gear: 'hands', pos: [13, 14] },
  { id: 'amulet', pt: 'Amuleto', en: 'Amulet', tags: ['amulet'], gear: 'trinket', pos: [87, 14] },
  { id: 'chest', pt: 'Peito', en: 'Chest', tags: ['chest'], gear: 'chest', pos: [50, 38] },
  { id: 'mainHand', pt: 'Mão principal', en: 'Main hand', tags: ['weapon'], gear: 'weapon', pos: [13, 39] },
  { id: 'offHand', pt: 'Mão secundária', en: 'Off hand', tags: ['offhand', 'weapon'], gear: 'offhand', pos: [87, 39] },
  { id: 'ring1', pt: 'Anel', en: 'Ring', tags: ['ring'], gear: 'ring', pos: [13, 64] },
  { id: 'ring2', pt: 'Anel', en: 'Ring', tags: ['ring'], gear: 'ring', pos: [87, 64] },
  { id: 'legs', pt: 'Pernas', en: 'Legs', tags: ['legs'], gear: 'legs', pos: [50, 64] },
  { id: 'feet', pt: 'Pés', en: 'Feet', tags: ['feet'], gear: 'feet', pos: [50, 89] },
];
/** Etiquetas de espaço que uma carta de equipamento pode ter (a 1ª que ela tiver decide onde cabe). */
export const SLOT_TAGS: { tag: string; pt: string; en: string; icon: string }[] = [
  { tag: 'weapon', pt: 'Arma', en: 'Weapon', icon: 'broadsword' }, { tag: 'offhand', pt: 'Mão secundária', en: 'Off hand', icon: 'round-shield' },
  { tag: 'head', pt: 'Cabeça', en: 'Head', icon: 'warlord-helmet' }, { tag: 'chest', pt: 'Peito', en: 'Chest', icon: 'chest-armor' },
  { tag: 'hands', pt: 'Mãos', en: 'Hands', icon: 'gauntlet' }, { tag: 'legs', pt: 'Pernas', en: 'Legs', icon: 'leg-armor' },
  { tag: 'feet', pt: 'Pés', en: 'Feet', icon: 'boot-stomp' }, { tag: 'amulet', pt: 'Amuleto', en: 'Amulet', icon: 'magic-swirl' },
  { tag: 'ring', pt: 'Anel', en: 'Ring', icon: 'skull-ring' },
];
export const slotTagOf = (c: Card) => SLOT_TAGS.find((t) => c.tags.includes(t.tag));

const VIA_TXT: Record<Via, [string, string]> = { melee: ['corpo a corpo', 'melee'], ranged: ['à distância', 'ranged'], magic: ['mágico', 'magic'] };
/** Golpe de quem não tem arma na mão principal. */
export const UNARMED: HeroBase['weapon'] = { name: ['Desarmado', 'Unarmed'], dmg: 1, via: 'melee' };

/** O que a carta dá, em palavras (vai no texto de regras da carta e no resumo da ficha). */
export function gearText(g: CardGear | undefined, lang: Lang): string {
  const i = lang === 'pt-BR' ? 0 : 1;
  const parts: string[] = [];
  if (g?.weapon) parts.push(i ? `Strike ${g.weapon.dmg}, ${VIA_TXT[g.weapon.via][1]}` : `Golpe ${g.weapon.dmg}, ${VIA_TXT[g.weapon.via][0]}`);
  const extra = gearInfo(g ?? {})[i];
  if (extra !== '—') parts.push(extra);
  return parts.join(' · ') || (i ? 'No bonus.' : 'Sem bônus.');
}

/** Cartas vestidas, na ordem dos espaços. */
export function equippedCards(c: Character, cards: Record<string, Card>): { slot: (typeof SLOTS)[number]; card: Card }[] {
  return SLOTS.flatMap((s) => { const card = c.slots[s.id] ? cards[c.slots[s.id]!] : undefined; return card ? [{ slot: s, card }] : []; });
}

/**
 * O herói como a mesa precisa: os dados da ficha (deck, atributos, vida base,
 * recursos) com a arma e as peças das cartas vestidas.
 */
export function heroBaseOf(c: Character, cards: Record<string, Card>): HeroBase {
  const eq = equippedCards(c, cards);
  const lang = (card: Card): [string, string] => [card.text['pt-BR'].name, card.text['en-US']?.name || card.text['pt-BR'].name];
  const main = eq.find((e) => e.slot.id === 'mainHand' && e.card.gear?.weapon);
  const gear: GearItem[] = eq.filter((e) => e !== main).map(({ slot, card }) => {
    const g = card.gear ?? {};
    const mods = { ...(g.armor ? { armor: g.armor } : {}), ...(g.resist ? { resist: g.resist } : {}), ...(g.hp ? { hp: g.hp } : {}), ...(g.strike ? { strike: g.strike } : {}) };
    return { slot: slot.gear, name: lang(card), info: gearInfo(mods), ...mods, icon: card.art.icon ?? slotTagOf(card)?.icon, cardId: card.id };
  });
  const mg = main?.card.gear;
  // bônus que a própria arma dá além do golpe (vida, armadura…) entram como uma peça à parte
  if (main && mg && (mg.armor || mg.resist || mg.hp || mg.strike)) {
    const mods = { ...(mg.armor ? { armor: mg.armor } : {}), ...(mg.resist ? { resist: mg.resist } : {}), ...(mg.hp ? { hp: mg.hp } : {}), ...(mg.strike ? { strike: mg.strike } : {}) };
    gear.unshift({ slot: 'offhand', name: lang(main.card), info: gearInfo(mods), ...mods, icon: main.card.art.icon, cardId: main.card.id });
  }
  return {
    ...c.play!, id: c.id, name: c.name || '?', attrs: gameAttrs(c),
    weapon: main && mg?.weapon ? { name: lang(main.card), dmg: mg.weapon.dmg, via: mg.weapon.via } : UNARMED,
    gear,
  };
}

// ───────────── cartas de equipamento do Protótipo (as dos 4 heróis prontos) ─────────────

export const PROTO_GEAR_DECK = 'proto-equipment';
const TAG_OF: Partial<Record<GearSlot, string>> = { weapon: 'weapon', offhand: 'offhand', head: 'head', chest: 'chest', hands: 'hands', legs: 'legs', feet: 'feet', trinket: 'amulet', ring: 'ring' };
const SLOT_OF: Partial<Record<GearSlot, Slot>> = { weapon: 'mainHand', offhand: 'offHand', head: 'head', chest: 'chest', hands: 'hands', legs: 'legs', feet: 'feet', trinket: 'amulet', ring: 'ring1' };
const WEAPON_ICON: Record<Via, string> = { melee: 'broadsword', ranged: 'bow-arrow', magic: 'wizard-staff' };
const ICONS: Record<string, string> = {
  'Machado grande': 'battle-axe', 'Elmo com chifres': 'horned-helm', 'Capuz do arcanista': 'pointy-hat', 'Capuz da patrulheira': 'hood', 'Capuz das sombras': 'hood',
  'Anel do patrono': 'skull-ring',
};

/** Uma carta de equipamento pronta para a coleção. */
export function gearCard(id: string, n: number, deckId: string, slot: GearSlot, name: [string, string], gear: CardGear, icon?: string): Card {
  const tag = TAG_OF[slot] ?? 'amulet';
  const t = SLOT_TAGS.find((x) => x.tag === tag)!;
  const now = Date.now();
  return {
    id, deckId, n,
    text: {
      'pt-BR': { name: name[0], type: 'Equipamento', subtype: t.pt, rules: gearText(gear, 'pt-BR'), flavor: '' },
      'en-US': { name: name[1], type: 'Equipment', subtype: t.en, rules: gearText(gear, 'en-US'), flavor: '' },
    },
    colors: ['gear'], cost: [], stats: null, rarity: 'common', mechanics: [], tags: [tag], costMode: 'manual', rarityMode: 'manual',
    art: { zoom: 1, x: 0, y: 0, mirror: false, icon: icon ?? ICONS[name[0]] ?? (gear.weapon ? WEAPON_ICON[gear.weapon.via] : t.icon) },
    gear, createdAt: now, updatedAt: now,
  };
}

const modsOf = (it: Pick<GearItem, 'armor' | 'resist' | 'hp' | 'strike'>): CardGear => ({ ...(it.armor ? { armor: it.armor } : {}), ...(it.resist ? { resist: it.resist } : {}), ...(it.hp ? { hp: it.hp } : {}), ...(it.strike ? { strike: it.strike } : {}) });
const protoId = (hero: string, slot: GearSlot) => `proto-eq-${hero}-${slot}`;

/** Deck de Equipamentos do Protótipo: a arma e as 5 peças de cada herói pronto. */
export function protoEquipment(editionId: string): { deck: Deck; cards: Card[] } {
  const deck: Deck = { id: PROTO_GEAR_DECK, editionId, name: { 'pt-BR': 'Equipamentos', 'en-US': 'Equipment' }, kind: 'equipment', colors: ['gear'], look: { style: 'neutro', pieces: { class: { style: 'neutro', hidden: true } } }, order: 8 };
  let n = 0;
  const cards = HERO_BASES.flatMap((b) => [
    gearCard(protoId(b.id, 'weapon'), ++n, deck.id, 'weapon', b.weapon.name, { weapon: { dmg: b.weapon.dmg, via: b.weapon.via } }),
    ...b.gear.map((it) => gearCard(protoId(b.id, it.slot), ++n, deck.id, it.slot, it.name, modsOf(it))),
  ]);
  return { deck, cards };
}

/** Espaços já preenchidos com as cartas do modelo (herói pronto). */
export function presetSlots(heroId: string): Character['slots'] {
  const b = HERO_BASES.find((x) => x.id === heroId);
  if (!b) return {};
  const out: Character['slots'] = { mainHand: protoId(b.id, 'weapon') };
  for (const it of b.gear) { const s = SLOT_OF[it.slot]; if (s) out[s] = protoId(b.id, it.slot); }
  return out;
}

/**
 * Fichas antigas guardavam arma e peças como texto solto. Passa cada uma para uma
 * carta: a do Protótipo, se for igual; senão, uma carta nova com os mesmos números
 * (nada do que o jogador mudou se perde). Devolve as cartas criadas.
 */
export function migrateGear(c: Character, cards: Record<string, Card>, deckId: string, nextN: () => number): Card[] {
  const b = c.play;
  if (!b) return [];
  const made: Card[] = [];
  const same = (card: Card | undefined, name: string, gear: CardGear) => !!card && card.text['pt-BR'].name === name && JSON.stringify(card.gear ?? {}) === JSON.stringify(gear);
  const place = (slot: GearSlot, name: [string, string], gear: CardGear) => {
    const s = SLOT_OF[slot];
    if (!s || c.slots[s]) return;
    const preset = HERO_BASES.map((h) => cards[protoId(h.id, slot)]).find((card) => same(card, name[0], gear));
    if (preset) { c.slots[s] = preset.id; return; }
    const card = gearCard(newId('card'), nextN(), deckId, slot, name, gear);
    made.push(card);
    c.slots[s] = card.id;
  };
  place('weapon', b.weapon.name, { weapon: { dmg: b.weapon.dmg, via: b.weapon.via } });
  for (const it of b.gear) if (it.slot !== 'weapon') place(it.slot, it.name, modsOf(it));
  return made;
}

export { GEAR_SLOTS };
