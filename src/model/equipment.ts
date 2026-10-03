/**
 * Equipamento do herói = cartas de equipamento vestidas na ficha (`slots`).
 * A carta diz em que espaço cabe (etiqueta) e o que soma (`gear`); a arma na mão
 * principal define o golpe. A mesa de jogo lê tudo daqui — não há outra lista.
 */
import { newId } from './id';
import type { Card, CardGear, Character, Deck, Lang, Slot } from './types';
import { ATTR_NAMES, GEAR_SLOTS, type Attr, type GearItem, type GearSlot, type HeroBase, type Via } from '../game/types';
import { gearCardId, gearInfo, HERO_BASES, modsOf } from '../game/decks';
import { GEAR, type GearDef } from '../game/gear';
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
  if (g?.weapon) {
    parts.push(i ? `Strike ${g.weapon.dmg}, ${VIA_TXT[g.weapon.via][1]}` : `Golpe ${g.weapon.dmg}, ${VIA_TXT[g.weapon.via][0]}`);
    if (g.weapon.hands === 2) parts.push(i ? 'two-handed' : 'duas mãos');
    if (g.weapon.reach) parts.push(i ? 'reach (strikes from the back row)' : 'alcance (golpeia da retaguarda)');
  }
  const extra = gearInfo(modsOf(g ?? {}))[i];
  if (extra !== '—') parts.push(extra);
  if (g?.dual) parts.push(i ? `in the off hand: +${g.dual} strike` : `na mão secundária: +${g.dual} no golpe`);
  if (g?.req) parts.push(i ? `requires ${ATTR_NAMES[g.req[0]][1]} ${g.req[1]}` : `requer ${ATTR_NAMES[g.req[0]][0]} ${g.req[1]}`);
  return parts.join(' · ') || (i ? 'No bonus.' : 'Sem bônus.');
}

/** O herói tem o atributo que a peça pede? (`attrs` = atributos de jogo da ficha) */
export const meetsReq = (g: CardGear | undefined, attrs: Record<Attr, number>) => !g?.req || (attrs[g.req[0]] ?? 0) >= g.req[1];

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
  const mg = main?.card.gear;
  // arma de duas mãos: o que estiver na mão secundária não vale
  const twoHanded = mg?.weapon?.hands === 2;
  const gear: GearItem[] = eq.filter((e) => e !== main && !(twoHanded && e.slot.id === 'offHand')).map(({ slot, card }) => {
    const g = card.gear ?? {};
    // arma leve na mão secundária: soma o seu bônus ao golpe
    const mods = modsOf({ ...g, strike: (g.strike ?? 0) + (slot.id === 'offHand' && g.weapon ? g.dual ?? 0 : 0) });
    return { slot: slot.gear, name: lang(card), info: gearInfo(mods), ...mods, icon: card.art.icon ?? slotTagOf(card)?.icon, cardId: card.id };
  });
  // bônus que a própria arma dá além do golpe (vida, armadura, Mana…) entram como uma peça à parte
  const wm = mg ? modsOf(mg) : {};
  if (main && Object.keys(wm).length) gear.unshift({ slot: 'offhand', name: lang(main.card), info: gearInfo(wm), ...wm, icon: main.card.art.icon, cardId: main.card.id });
  return {
    ...c.play!, id: c.id, name: c.name || '?', attrs: gameAttrs(c),
    weapon: main && mg?.weapon ? { name: lang(main.card), dmg: mg.weapon.dmg, via: mg.weapon.via, ...(mg.weapon.hands ? { hands: mg.weapon.hands } : {}), ...(mg.weapon.reach ? { reach: true } : {}), cardId: main.card.id } : UNARMED,
    gear,
  };
}

// ───────────── as cartas de equipamento do jogo (o catálogo de src/game/gear.ts) ─────────────

export const PROTO_GEAR_DECK = 'proto-equipment';
const TAG_OF: Partial<Record<GearSlot, string>> = { weapon: 'weapon', offhand: 'offhand', head: 'head', chest: 'chest', hands: 'hands', legs: 'legs', feet: 'feet', trinket: 'amulet', ring: 'ring' };
const SLOT_OF: Partial<Record<GearSlot, Slot>> = { weapon: 'mainHand', offhand: 'offHand', head: 'head', chest: 'chest', hands: 'hands', legs: 'legs', feet: 'feet', trinket: 'amulet', ring: 'ring1' };
const WEAPON_ICON: Record<Via, string> = { melee: 'broadsword', ranged: 'bow-arrow', magic: 'wizard-staff' };

/** Uma carta de equipamento pronta para a coleção. */
export function gearCard(id: string, n: number, deckId: string, slot: GearSlot, name: [string, string], gear: CardGear, icon?: string, more: { rarity?: Card['rarity']; flavor?: [string, string]; dual?: boolean } = {}): Card {
  const tag = TAG_OF[slot] ?? 'amulet';
  const t = SLOT_TAGS.find((x) => x.tag === tag)!;
  const now = Date.now();
  return {
    id, deckId, n,
    text: {
      'pt-BR': { name: name[0], type: 'Equipamento', subtype: t.pt, rules: gearText(gear, 'pt-BR'), flavor: more.flavor?.[0] ?? '' },
      'en-US': { name: name[1], type: 'Equipment', subtype: t.en, rules: gearText(gear, 'en-US'), flavor: more.flavor?.[1] ?? '' },
    },
    colors: ['gear'], cost: [], stats: null, rarity: more.rarity ?? 'common', mechanics: [], tags: more.dual ? [tag, 'offhand'] : [tag], costMode: 'manual', rarityMode: 'manual',
    art: { zoom: 1, x: 0, y: 0, mirror: false, icon: icon ?? (gear.weapon ? WEAPON_ICON[gear.weapon.via] : t.icon) },
    gear, createdAt: now, updatedAt: now,
  };
}

/** O que uma peça do catálogo põe na carta. */
export function cardGearOf(d: GearDef): CardGear {
  const out: CardGear = { ...modsOf(d) };
  if (d.weapon) out.weapon = { ...d.weapon };
  if (d.dual) out.dual = d.dual;
  if (d.req) out.req = [...d.req];
  return out;
}

/** Deck de Equipamentos do jogo: todas as peças do catálogo. */
export function protoEquipment(editionId: string): { deck: Deck; cards: Card[] } {
  const deck: Deck = { id: PROTO_GEAR_DECK, editionId, name: { 'pt-BR': 'Equipamentos', 'en-US': 'Equipment' }, kind: 'equipment', colors: ['gear'], look: { style: 'neutro', pieces: { class: { style: 'neutro', hidden: true } } }, order: 8 };
  const cards = GEAR.map((d, i) => gearCard(gearCardId(d.key), i + 1, deck.id, d.slot, d.name, cardGearOf(d), d.icon, { rarity: d.rarity, flavor: d.flavor, dual: !!d.dual }));
  return { deck, cards };
}

/** Espaços já preenchidos com as cartas do modelo (herói pronto). */
export function presetSlots(heroId: string): Character['slots'] {
  const b = HERO_BASES.find((x) => x.id === heroId);
  if (!b) return {};
  const out: Character['slots'] = {};
  if (b.weapon.cardId) out.mainHand = b.weapon.cardId;
  for (const it of b.gear) {
    let s = SLOT_OF[it.slot];
    if (s === 'ring1' && out.ring1) s = 'ring2';
    if (s && it.cardId) out[s] = it.cardId;
  }
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
  const place = (slot: GearSlot, name: [string, string], gear: CardGear) => {
    const s = SLOT_OF[slot];
    if (!s || c.slots[s]) return;
    // a peça do catálogo com o mesmo nome e no mesmo espaço
    const preset = Object.values(cards).find((card) => card.deckId === PROTO_GEAR_DECK && card.text['pt-BR'].name === name[0] && slotTagOf(card)?.tag === TAG_OF[slot]);
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
