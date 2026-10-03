/**
 * Coleção do jogo: 7 heróis prontos e 7 decks de 40 cartas (contando cópias), um por cor de classe.
 * Cada carta é uma habilidade do herói. Custos em Vigor (físico) e Mana
 * (mágico); requisitos de nível e de atributo; efeitos que o motor entende.
 */
import type { Attr, CardGame, CardKind, Effect, GearItem, HeroBase, HeroDef, UnitDef, Via } from './types';
import { ATTR_NAMES } from './types';
import { gearOf } from './gear';
import { lifeOf } from './life';
import { ruleCost } from './value';

export interface ProtoCard {
  name: [string, string];
  /** Classe da habilidade (aparece no subtipo). */
  cls: [string, string];
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  game: CardGame;
}

export interface ProtoDeck { color: 'red' | 'blue' | 'green' | 'black' | 'purple' | 'white' | 'silver'; hero: HeroDef; cards: ProtoCard[] }

const c = (name: [string, string], cls: [string, string], icon: string, kind: CardKind, cost: { v?: number; m?: number }, level: number,
  effects: Effect[], copies: number, attr?: CardGame['attr'], rarity: ProtoCard['rarity'] = copies >= 3 ? 'common' : copies === 2 ? 'uncommon' : 'rare'): ProtoCard =>
  ({ name, cls, icon, rarity, game: { kind, vigor: cost.v, mana: cost.m, level, attr, effects, copies } });

/** Carta de Reação: só pode ser usada em resposta a uma carta do oponente (do tipo `react`). */
const r = (name: [string, string], cls: [string, string], icon: string, cost: { v?: number; m?: number }, level: number, react: NonNullable<CardGame['react']>, effects: Effect[], copies: number): ProtoCard => {
  const card = c(name, cls, icon, 'reacao', cost, level, effects, copies);
  card.game.react = react;
  return card;
};

const VIA_TXT: Record<Via, [string, string]> = { melee: ['corpo a corpo', 'melee'], ranged: ['à distância', 'ranged'], magic: ['mágico', 'magic'] };
/** Uma peça do catálogo (src/game/gear.ts) como o herói a veste. */
const g = (key: string): GearItem => {
  const d = gearOf(key);
  if (!d) throw new Error(`peça desconhecida: ${key}`);
  const mods = modsOf(d);
  return { slot: d.slot, name: d.name, info: gearInfo(mods), ...mods, icon: d.icon, cardId: gearCardId(key) };
};
/** Arma leve do catálogo vestida na mão secundária: soma o seu bônus ao golpe. */
const off = (key: string): GearItem => {
  const d = gearOf(key)!;
  const mods = modsOf({ ...d, strike: (d.strike ?? 0) + (d.dual ?? 0) });
  return { slot: 'offhand', name: d.name, info: gearInfo(mods), ...mods, icon: d.icon, cardId: gearCardId(key) };
};
/** Arma do catálogo. */
const arm = (key: string): HeroBase['weapon'] => { const d = gearOf(key)!; return { name: d.name, ...d.weapon!, cardId: gearCardId(key) }; };
/** Id da carta de equipamento de uma peça do catálogo. */
export const gearCardId = (key: string) => `eq-${key}`;

type Mods = Pick<GearItem, 'armor' | 'resist' | 'hp' | 'strike' | 'vigor' | 'mana' | 'attrs'>;
/** Só os números que a peça soma ao herói. */
export function modsOf(it: Mods): Mods {
  const out: Mods = {};
  for (const k of ['armor', 'resist', 'hp', 'strike', 'vigor', 'mana'] as const) if (it[k]) out[k] = it[k];
  if (it.attrs && Object.values(it.attrs).some(Boolean)) out.attrs = { ...it.attrs };
  return out;
}

/** Texto do que uma peça dá (para mostrar na mesa e na ficha). Valores negativos aparecem como "−1 Mana". */
export function gearInfo(mods: Mods): [string, string] {
  const parts: [string, string][] = [];
  const sg = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  if (mods.armor) parts.push([`${sg(mods.armor)} Armadura`, `${sg(mods.armor)} Armor`]);
  if (mods.resist) parts.push([`${sg(mods.resist)} Resistência mágica`, `${sg(mods.resist)} Magic resistance`]);
  if (mods.strike) parts.push([`${sg(mods.strike)} no golpe`, `${sg(mods.strike)} strike`]);
  if (mods.hp) parts.push([`${sg(mods.hp)} Vida`, `${sg(mods.hp)} Life`]);
  if (mods.vigor) parts.push([`${sg(mods.vigor)} Vigor`, `${sg(mods.vigor)} Vigor`]);
  if (mods.mana) parts.push([`${sg(mods.mana)} Mana`, `${sg(mods.mana)} Mana`]);
  for (const [a, n] of Object.entries(mods.attrs ?? {}) as [Attr, number][]) if (n) parts.push([`${sg(n)} ${ATTR_NAMES[a][0]}`, `${sg(n)} ${ATTR_NAMES[a][1]}`]);
  return [parts.map((x) => x[0]).join(', ') || '—', parts.map((x) => x[1]).join(', ') || '—'];
}

/** Soma o equipamento ao herói: vida, armadura, resistência, dano do golpe, Vigor, Mana e atributos saem das peças vestidas. */
export function buildHero(base: HeroBase): HeroDef {
  const sum = (k: 'armor' | 'resist' | 'hp' | 'strike' | 'vigor' | 'mana') => base.gear.reduce((n, it) => n + (it[k] ?? 0), 0);
  const dmg = base.weapon.dmg + sum('strike');
  const w = base.weapon;
  const extra = [w.hands === 2 ? ['duas mãos', 'two-handed'] : null, w.reach ? ['alcance', 'reach'] : null].filter((x): x is string[] => !!x);
  const weaponItem: GearItem = { slot: 'weapon', name: w.name, info: [[`Golpe ${w.dmg}, ${VIA_TXT[w.via][0]}`, ...extra.map((x) => x[0])].join(', '), [`Strike ${w.dmg}, ${VIA_TXT[w.via][1]}`, ...extra.map((x) => x[1])].join(', ')] };
  const attrs = { ...base.attrs };
  for (const it of base.gear) for (const [a, n] of Object.entries(it.attrs ?? {}) as [Attr, number][]) attrs[a] = (attrs[a] ?? 0) + n;
  return {
    id: base.id, name: base.name, className: base.className, deckId: base.deckId, attrs,
    // a Constituição que as peças dão também soma vida (2 por ponto, como na ficha)
    maxHp: Math.max(1, base.baseHp + sum('hp') + 2 * base.gear.reduce((n, it) => n + (it.attrs?.con ?? 0), 0)), weapon: { ...w, dmg }, armor: Math.max(0, sum('armor')), resist: Math.max(0, sum('resist')),
    gear: [weaponItem, ...base.gear.map((it) => ({ ...it, info: gearInfo(it) }))],
    vigor: Math.max(0, base.vigor + sum('vigor')), mana: Math.max(0, base.mana + sum('mana')), row: base.row, col: base.col, icon: base.icon,
  };
}

/** Os 4 heróis prontos, antes de somar o equipamento (viram fichas editáveis no app). */
export const HERO_BASES: HeroBase[] = [];
const preset = (base: HeroBase): HeroDef => {
  // o que a própria arma dá além do golpe (Mana do cajado, Armadura do montante…) entra como uma peça
  const wd = base.weapon.cardId ? gearOf(base.weapon.cardId.replace(/^eq-/, '')) : undefined;
  const wm = wd ? modsOf(wd) : {};
  if (wd && Object.keys(wm).length) base.gear.unshift({ slot: 'weapon', name: wd.name, info: gearInfo(wm), ...wm, icon: wd.icon, cardId: base.weapon.cardId });
  HERO_BASES.push(base);
  return buildHero(base);
};

const POTION: ProtoCard = c(['Poção de Cura', 'Healing Potion'], ['Consumível', 'Consumable'], 'health-potion', 'item', {}, 1, [{ k: 'heal', n: 4, tgt: 'ally' }], 2);

const unit = (pt: string, en: string, atk: number, def: number, keys: UnitDef['keys'], icon: string): UnitDef => ({ name: [pt, en], atk, def, keys, icon });

// Atributos dos heróis prontos (9 pontos cada). A vida sai deles: veja src/game/life.ts.
const ATTRS_BRUNHILD = { for: 4, des: 1, con: 3, int: 0, sab: 1, car: 0 };
const ATTRS_KAEL = { for: 2, des: 2, con: 1, int: 4, sab: 0, car: 0 };
const ATTRS_LYRA = { for: 0, des: 4, con: 2, int: 0, sab: 3, car: 0 };
const ATTRS_MORGANA = { for: 0, des: 3, con: 2, int: 0, sab: 0, car: 4 };
const ATTRS_VEX = { for: 0, des: 4, con: 2, int: 2, sab: 1, car: 0 };
const ATTRS_ALDRIC = { for: 3, des: 0, con: 2, int: 0, sab: 2, car: 2 };
const ATTRS_REN = { for: 0, des: 3, con: 1, int: 0, sab: 3, car: 2 };

// ═════════ VERMELHO — Brunhild, bárbara de linha de frente (só Vigor) ═════════
const BAR: [string, string] = ['Bárbaro', 'Barbarian'];
const GUE: [string, string] = ['Guerreiro', 'Fighter'];
const red: ProtoDeck = {
  color: 'red',
  hero: preset({
    id: 'brunhild', name: 'Brunhild', className: ['Bárbara', 'Barbarian'], deckId: 'proto-red',
    attrs: ATTRS_BRUNHILD, baseHp: lifeOf(8, 'red', ATTRS_BRUNHILD.con),
    weapon: arm('greataxe'),
    gear: [g('ironhelm'), g('hide'), g('ogregauntlets'), g('leatherpants'), g('elvenboots'), g('fangnecklace'), g('strengthring'), g('berserkerring')],
    vigor: 3, mana: 0, row: 0, col: 1, icon: 'horned-helm',
  }),
  cards: [
    c(['Golpe Brutal', 'Brutal Strike'], BAR, 'battle-axe', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 3 }], 4),
    c(['Corte Sangrento', 'Bleeding Cut'], GUE, 'bloody-sword', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2, then: 'afflict' }], 2),
    c(['Investida', 'Charge'], BAR, 'boot-stomp', 'ataque', { v: 2 }, 1, [{ k: 'advance' }, { k: 'strike', bonus: 4 }], 3),
    c(['Fúria', 'Rage'], BAR, 'burning-embers', 'postura', { v: 1 }, 1, [{ k: 'stance', mods: { strike: 1 } }], 3, ['for', 3]),
    c(['Chute', 'Kick'], GUE, 'boot-kick', 'tecnica', { v: 0 }, 1, [{ k: 'push', tgt: 'enemy' }], 2),
    c(['Fôlego de Batalha', 'Battle Breath'], GUE, 'lungs', 'tecnica', { v: 0 }, 1, [{ k: 'gain', res: 'vigor', n: 1 }], 2),
    c(['Segundo Fôlego', 'Second Wind'], GUE, 'heart-armor', 'tecnica', { v: 1 }, 1, [{ k: 'heal', n: 5, tgt: 'hero' }], 3, ['con', 2]),
    c(['Postura Defensiva', 'Defensive Stance'], GUE, 'shield-bash', 'postura', { v: 2 }, 1, [{ k: 'stance', mods: { guard: true } }, { k: 'ward', tgt: 'hero' }], 2),
    c(['Grito de Guerra', 'War Cry'], BAR, 'shouting', 'tecnica', { v: 1 }, 2, [{ k: 'draw', n: 2 }], 2),
    c(['Varredura', 'Cleave'], BAR, 'sword-spin', 'ataque', { v: 2 }, 2, [{ k: 'dmg', n: 3, tgt: 'enemyFront', via: 'melee' }], 2, ['for', 3]),
    c(['Quebra-Guarda', 'Guard Breaker'], GUE, 'shield-impact', 'ataque', { v: 1 }, 2, [{ k: 'strike', bonus: 3, then: 'push' }], 2),
    c(['Arremessar Machado', 'Axe Throw'], BAR, 'thrown-daggers', 'ataque', { v: 1 }, 2, [{ k: 'dmg', n: 4, tgt: 'enemy', via: 'ranged' }], 2, ['for', 2]),
    c(['Golpe Devastador', 'Devastating Blow'], BAR, 'hammer-drop', 'ataque', { v: 3 }, 3, [{ k: 'strike', bonus: 7 }], 2),
    c(['Sede de Sangue', 'Bloodthirst'], BAR, 'bleeding-heart', 'postura', { v: 2 }, 3, [{ k: 'stance', mods: { strike: 1, strikeHeals: 2 } }], 2, ['con', 3]),
    c(['Ira Implacável', 'Relentless Fury'], BAR, 'crossed-axes', 'ataque', { v: 3 }, 5, [{ k: 'strike', bonus: 5, times: 2 }], 2, ['for', 4]),
    c(['Fúria Ancestral', 'Ancestral Rage'], BAR, 'warlord-helmet', 'postura', { v: 3 }, 5, [{ k: 'stance', mods: { strike: 2, guard: true } }], 1),
    POTION,
    r(['Aparar', 'Parry'], GUE, 'round-shield', { v: 1 }, 1, 'ataque', [{ k: 'ward', tgt: 'hero' }, { k: 'dmg', n: 2, tgt: 'enemyHero', via: 'melee' }], 2),
  ],
};

// ═════════ AZUL — Kael, mago de batalha (Mana, um pouco de Vigor) ═════════
const MAG: [string, string] = ['Mago', 'Wizard'];
const blue: ProtoDeck = {
  color: 'blue',
  hero: preset({
    id: 'kael', name: 'Kael', className: ['Mago de batalha', 'Battle mage'], deckId: 'proto-blue',
    attrs: ATTRS_KAEL, baseHp: lifeOf(8, 'blue', ATTRS_KAEL.con),
    weapon: arm('staff'),
    gear: [g('headband'), g('chainshirt'), g('gauntlets'), g('greaves'), g('elvenboots'), g('healthamulet'), g('protectionring'), g('agilityring')],
    vigor: 0, mana: 3, row: 1, col: 1, icon: 'pentacle',
  }),
  cards: [
    c(['Fagulha', 'Spark'], MAG, 'comet-spark', 'magia', { m: 0 }, 1, [{ k: 'dmg', n: 1, tgt: 'enemy', via: 'magic' }], 2),
    c(['Dardos Arcanos', 'Arcane Darts'], MAG, 'magic-swirl', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }], 3),
    c(['Raio de Gelo', 'Frost Ray'], MAG, 'ice-spell-cast', 'magia', { m: 2 }, 1, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }], 3),
    c(['Escudo Arcano', 'Arcane Shield'], MAG, 'magic-shield', 'magia', { m: 1 }, 1, [{ k: 'ward', tgt: 'ally' }], 2),
    c(['Concentração', 'Focus'], MAG, 'concentration-orb', 'tecnica', { m: 1 }, 1, [{ k: 'draw', n: 1 }, { k: 'gain', res: 'mana', n: 1 }], 2),
    c(['Lâmina Arcana', 'Arcane Blade'], MAG, 'rune-sword', 'ataque', { m: 2 }, 1, [{ k: 'strike', bonus: 5 }], 3, ['for', 1]),
    c(['Muralha Arcana', 'Arcane Wall'], MAG, 'magic-gate', 'invocacao', { m: 2 }, 1, [{ k: 'summon', unit: unit('Muralha arcana', 'Arcane wall', 0, 4, ['guarda', 'parede'], 'magic-gate') }], 2),
    c(['Estudo', 'Study'], MAG, 'open-book', 'tecnica', { m: 2 }, 1, [{ k: 'draw', n: 2 }], 2),
    c(['Elemental de Pedra', 'Stone Elemental'], MAG, 'rock-golem', 'invocacao', { m: 3 }, 2, [{ k: 'summon', unit: unit('Elemental de pedra', 'Stone elemental', 2, 5, ['guarda'], 'rock-golem') }], 3, ['int', 2]),
    c(['Postura do Mago de Batalha', 'Battle Mage Stance'], MAG, 'crystal-wand', 'postura', { m: 2 }, 2, [{ k: 'stance', mods: { strike: 1, strikeMagic: true } }], 2, ['for', 2]),
    c(['Lança de Fogo', 'Fire Lance'], MAG, 'fire-spell-cast', 'magia', { m: 3 }, 2, [{ k: 'dmg', n: 7, tgt: 'enemy', via: 'magic' }], 2),
    c(['Bola de Fogo', 'Fireball'], MAG, 'fireball', 'magia', { m: 3 }, 2, [{ k: 'dmg', n: 3, tgt: 'enemyRow', via: 'magic' }], 2, ['int', 3]),
    c(['Relâmpago em Cadeia', 'Chain Lightning'], MAG, 'bolt-spell-cast', 'magia', { m: 3 }, 2, [{ k: 'dmg', n: 2, tgt: 'allEnemies', via: 'magic' }], 2, ['int', 3]),
    c(['Elemental de Fogo', 'Fire Elemental'], MAG, 'fire-silhouette', 'invocacao', { m: 3 }, 2, [{ k: 'summon', unit: unit('Elemental de fogo', 'Fire elemental', 4, 3, ['rapido'], 'fire-silhouette') }], 2, ['int', 4]),
    c(['Meteoro', 'Meteor'], MAG, 'burning-meteor', 'magia', { m: 6 }, 5, [{ k: 'dmg', n: 4, tgt: 'allEnemies', via: 'magic' }], 1, ['int', 4]),
    c(['Poção de Mana', 'Mana Potion'], ['Consumível', 'Consumable'], 'magic-potion', 'item', {}, 1, [{ k: 'gain', res: 'mana', n: 2 }], 2),
    POTION,
    r(['Contramágica', 'Counterspell'], MAG, 'spell-book', { m: 2 }, 1, 'magia', [{ k: 'counter' }], 2),
    c(['Círculo de Invocação', 'Summoning Circle'], MAG, 'magic-portal', 'tecnica', { m: 1 }, 1, [{ k: 'expand', n: 1 }], 1, ['int', 2]),
  ],
};

// ═════════ VERDE — Lyra, patrulheira com companheiros (Vigor e um pouco de Mana) ═════════
const PAT: [string, string] = ['Patrulheiro', 'Ranger'];
const DRU: [string, string] = ['Druida', 'Druid'];
const green: ProtoDeck = {
  color: 'green',
  hero: preset({
    id: 'lyra', name: 'Lyra', className: ['Patrulheira', 'Ranger'], deckId: 'proto-green',
    attrs: ATTRS_LYRA, baseHp: lifeOf(8, 'green', ATTRS_LYRA.con),
    weapon: arm('longbow'),
    gear: [g('hood'), g('studded'), g('thiefgloves'), g('leatherpants'), g('elvenboots'), g('healthamulet'), g('agilityring'), g('protectionring')],
    vigor: 2, mana: 1, row: 1, col: 1, icon: 'bowman',
  }),
  cards: [
    c(['Disparo Rápido', 'Quick Shot'], PAT, 'arrow-flights', 'ataque', { v: 0 }, 1, [{ k: 'dmg', n: 1, tgt: 'enemy', via: 'ranged' }], 2),
    c(['Tiro Certeiro', 'True Shot'], PAT, 'broadhead-arrow', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 3 }], 3),
    c(['Flecha Envenenada', 'Poison Arrow'], PAT, 'poison-bottle', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2, then: 'afflict' }], 3),
    c(['Marcar Presa', 'Mark Prey'], PAT, 'hunter-eyes', 'tecnica', { v: 1 }, 1, [{ k: 'mark', tgt: 'enemy' }, { k: 'draw', n: 1 }], 3),
    c(['Lobo Companheiro', 'Wolf Companion'], PAT, 'wolf-howl', 'invocacao', { v: 1, m: 1 }, 1, [{ k: 'summon', unit: unit('Lobo', 'Wolf', 3, 2, ['rapido'], 'wolf-head') }], 3, ['sab', 2]),
    c(['Pele de Casca', 'Barkskin'], DRU, 'oak-leaf', 'magia', { m: 1 }, 1, [{ k: 'ward', tgt: 'ally' }], 2),
    c(['Enredar', 'Entangle'], DRU, 'thorny-vine', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 1, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }], 2),
    c(['Camuflagem', 'Camouflage'], PAT, 'hooded-figure', 'postura', { v: 2 }, 1, [{ k: 'stance', mods: { strike: 1 } }, { k: 'ward', tgt: 'hero' }], 2, ['des', 2]),
    c(['Tiro Duplo', 'Double Shot'], PAT, 'bowman', 'ataque', { v: 2 }, 2, [{ k: 'strike', bonus: 3, times: 2 }], 3, ['des', 3]),
    c(['Seiva Curativa', 'Healing Sap'], DRU, 'leaf-swirl', 'magia', { m: 1 }, 2, [{ k: 'heal', n: 5, tgt: 'ally' }], 2, ['sab', 2]),
    c(['Instinto Selvagem', 'Wild Instinct'], PAT, 'direwolf', 'tecnica', { v: 1 }, 2, [{ k: 'buff', atk: 1, tgt: 'allAllies' }, { k: 'draw', n: 1 }], 2),
    c(['Chuva de Flechas', 'Arrow Rain'], PAT, 'arrow-cluster', 'ataque', { v: 2 }, 3, [{ k: 'dmg', n: 3, tgt: 'enemyRow', via: 'ranged' }], 2, ['des', 3]),
    c(['Urso Companheiro', 'Bear Companion'], PAT, 'bear-head', 'invocacao', { v: 1, m: 2 }, 3, [{ k: 'summon', unit: unit('Urso', 'Bear', 3, 6, ['guarda'], 'bear-head') }], 2, ['sab', 3]),
    c(['Chamado da Matilha', 'Call of the Pack'], PAT, 'wolf-howl', 'invocacao', { m: 2 }, 4, [{ k: 'summon', unit: unit('Lobo', 'Wolf', 2, 2, [], 'wolf-head'), n: 2 }], 2, ['sab', 3]),
    c(['Tempestade de Espinhos', 'Thorn Storm'], DRU, 'heavy-thorny-triskelion', 'magia', { m: 4 }, 5, [{ k: 'dmg', n: 3, tgt: 'allEnemies', via: 'magic' }], 1, ['sab', 3]),
    POTION,
    r(['Esquiva', 'Dodge'], PAT, 'backstab', { v: 1 }, 1, 'any', [{ k: 'ward', tgt: 'hero' }, { k: 'draw', n: 1 }], 2),
    c(['Território de Caça', 'Hunting Grounds'], PAT, 'circle-forest', 'tecnica', { v: 1 }, 1, [{ k: 'expand', n: 1 }], 2, ['sab', 2]),
  ],
};

// ═════════ PRETO — Morgana, bruxa da lâmina sombria (Mana e Vigor, aflições) ═════════
const BRU: [string, string] = ['Bruxo', 'Warlock'];
const NEC: [string, string] = ['Necromante', 'Necromancer'];
const black: ProtoDeck = {
  color: 'black',
  hero: preset({
    id: 'morgana', name: 'Morgana', className: ['Bruxa da lâmina', 'Hexblade'], deckId: 'proto-black',
    attrs: ATTRS_MORGANA, baseHp: lifeOf(8, 'black', ATTRS_MORGANA.con),
    weapon: arm('katana'),
    gear: [g('circlet'), g('shadowcloak'), g('gauntlets'), g('leatherpants'), g('elvenboots'), g('healthamulet'), g('patronring'), g('protectionring')],
    vigor: 1, mana: 2, row: 0, col: 1, icon: 'daemon-skull',
  }),
  cards: [
    c(['Corte Sombrio', 'Shadow Cut'], BRU, 'curvy-knife', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2, then: 'afflict' }], 2),
    c(['Estocada', 'Lunge'], BRU, 'knife-thrust', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 3 }], 3),
    c(['Maldição da Ruína', 'Curse of Ruin'], BRU, 'cursed-star', 'magia', { m: 1 }, 1, [{ k: 'afflict', tgt: 'enemy' }, { k: 'mark', tgt: 'enemy' }], 2),
    c(['Toque Vampírico', 'Vampiric Touch'], NEC, 'bleeding-heart', 'magia', { m: 2 }, 1, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }, { k: 'heal', n: 3, tgt: 'hero' }], 3),
    c(['Erguer Esqueleto', 'Raise Skeleton'], NEC, 'raise-zombie', 'invocacao', { m: 2 }, 1, [{ k: 'summon', unit: unit('Esqueleto', 'Skeleton', 1, 2, ['guarda'], 'death-skull') }], 3),
    c(['Pacto de Sangue', 'Blood Pact'], BRU, 'chalice-drops', 'tecnica', {}, 1, [{ k: 'selfdmg', n: 2 }, { k: 'gain', res: 'mana', n: 2 }], 1),
    c(['Garras do Vazio', 'Void Claws'], BRU, 'shadow-grasp', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }], 3),
    c(['Dança das Sombras', 'Shadow Dance'], BRU, 'two-shadows', 'tecnica', { v: 2 }, 1, [{ k: 'ward', tgt: 'hero' }, { k: 'draw', n: 1 }], 2, ['des', 2]),
    c(['Sussurro do Patrono', "Patron's Whisper"], BRU, 'spark-spirit', 'tecnica', { m: 2 }, 1, [{ k: 'draw', n: 2 }], 2),
    c(['Lâmina do Pacto', 'Pact Blade'], BRU, 'cursed-star', 'ataque', { v: 1, m: 1 }, 2, [{ k: 'strike', bonus: 6 }], 3, ['car', 2]),
    c(['Postura da Lâmina Sombria', 'Shadow Blade Stance'], BRU, 'eclipse', 'postura', { m: 2 }, 2, [{ k: 'stance', mods: { strike: 1, strikeAfflicts: true } }], 2, ['car', 2]),
    c(['Raio Sombrio', 'Shadow Bolt'], BRU, 'spiky-eclipse', 'magia', { m: 2 }, 2, [{ k: 'dmg', n: 5, tgt: 'enemy', via: 'magic' }], 2),
    c(['Demônio Vinculado', 'Bound Demon'], BRU, 'daemon-skull', 'invocacao', { m: 3 }, 2, [{ k: 'summon', unit: unit('Demônio', 'Demon', 4, 4, ['rapido'], 'daemon-skull') }], 2, ['car', 3]),
    c(['Praga', 'Plague'], NEC, 'death-skull', 'magia', { m: 3 }, 2, [{ k: 'afflict', tgt: 'allEnemies' }], 2, ['car', 2]),
    c(['Legião de Ossos', 'Bone Legion'], NEC, 'crossed-bones', 'invocacao', { m: 4 }, 4, [{ k: 'summon', unit: unit('Esqueleto', 'Skeleton', 2, 2, ['guarda'], 'death-skull'), n: 2 }], 2),
    c(['Ceifar Almas', 'Reap Souls'], BRU, 'grim-reaper', 'magia', { m: 5 }, 4, [{ k: 'dmg', n: 3, tgt: 'allEnemies', via: 'magic' }, { k: 'heal', n: 3, tgt: 'hero' }], 1, ['car', 4]),
    POTION,
    r(['Represália Sombria', 'Shadow Reprisal'], BRU, 'magic-palm', { m: 1 }, 1, 'ataque', [{ k: 'afflict', tgt: 'enemyHero' }, { k: 'dmg', n: 1, tgt: 'enemyHero', via: 'magic' }], 2),
    c(['Ossuário', 'Ossuary'], NEC, 'tombstone', 'tecnica', { m: 1 }, 1, [{ k: 'expand', n: 1 }], 1, ['car', 2]),
  ],
};

// ═════════ ROXO — Vex, assassina das sombras (Vigor; marca, envenena e ataca pelas costas) ═════════
// Ladino e Assassino dos RPGs de mesa: ataque furtivo contra alvos distraídos, venenos,
// ação ardilosa, evasão e esconder-se. O golpe furtivo cresce quando o alvo está Marcado ou Afligido.
const LAD: [string, string] = ['Ladino', 'Rogue'];
const ASS: [string, string] = ['Assassino', 'Assassin'];
const purple: ProtoDeck = {
  color: 'purple',
  hero: preset({
    id: 'vex', name: 'Vex', className: ['Assassina', 'Assassin'], deckId: 'proto-purple',
    attrs: ATTRS_VEX, baseHp: lifeOf(8, 'purple', ATTRS_VEX.con),
    weapon: arm('shortsword'),
    gear: [off('dagger'), g('hood'), g('studded'), g('thiefgloves'), g('leatherpants'), g('elvenboots'), g('healthamulet'), g('vigorring'), g('agilityring')],
    vigor: 2, mana: 1, row: 0, col: 1, icon: 'hooded-assassin',
  }),
  cards: [
    c(['Ataque Furtivo', 'Sneak Attack'], ASS, 'backstab', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2, sneak: 3 }], 4),
    c(['Lâmina Envenenada', 'Poisoned Blade'], ASS, 'poison-bottle', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 1, then: 'afflict' }], 3),
    c(['Adagas Arremessadas', 'Thrown Daggers'], LAD, 'thrown-daggers', 'ataque', { v: 1 }, 1, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'ranged' }], 3),
    c(['Estudar a Vítima', 'Study the Mark'], ASS, 'hunter-eyes', 'tecnica', { v: 0 }, 1, [{ k: 'mark', tgt: 'enemy' }], 3),
    c(['Ação Ardilosa', 'Cunning Action'], LAD, 'boot-kick', 'tecnica', { v: 1 }, 1, [{ k: 'advance' }, { k: 'draw', n: 1 }], 2),
    c(['Golpe Baixo', 'Dirty Trick'], LAD, 'fist', 'tecnica', { v: 1 }, 1, [{ k: 'mark', tgt: 'enemy' }, { k: 'push', tgt: 'enemy' }], 2),
    c(['Sumir nas Sombras', 'Vanish'], LAD, 'hooded-assassin', 'tecnica', { v: 2 }, 1, [{ k: 'ward', tgt: 'hero' }, { k: 'draw', n: 1 }], 2, ['des', 2]),
    c(['Corte nos Tendões', 'Hamstring'], LAD, 'knife-thrust', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2, then: 'push' }], 2),
    c(['Envenenar a Taça', 'Poison the Cup'], ASS, 'pouring-chalice', 'tecnica', { v: 1, m: 1 }, 1, [{ k: 'afflict', tgt: 'enemy' }, { k: 'draw', n: 1 }], 2, ['int', 1]),
    c(['Bomba de Fumaça', 'Smoke Bomb'], LAD, 'unstable-orb', 'tecnica', { v: 2 }, 2, [{ k: 'ward', tgt: 'allAllies' }], 2),
    c(['Dança das Lâminas', 'Blade Flurry'], LAD, 'daggers', 'ataque', { v: 2 }, 2, [{ k: 'strike', bonus: 2, times: 2, sneak: 1 }], 2, ['des', 3]),
    c(['Postura do Assassino', "Assassin's Stance"], ASS, 'cloak-dagger', 'postura', { v: 2 }, 2, [{ k: 'stance', mods: { strike: 2 } }], 2, ['des', 3]),
    c(['Veneno de Serpe', 'Wyvern Venom'], ASS, 'poison-bottle', 'tecnica', { v: 1 }, 3, [{ k: 'afflict', tgt: 'enemyRow' }], 2, ['int', 2]),
    c(['Gangue de Ladrões', 'Thieves Gang'], LAD, 'hooded-figure', 'invocacao', { v: 3, m: 1 }, 3, [{ k: 'summon', unit: unit('Ladrão', 'Thief', 2, 2, ['rapido'], 'hooded-figure'), n: 2 }], 2),
    c(['Assassinar', 'Assassinate'], ASS, 'curvy-knife', 'ataque', { v: 2 }, 4, [{ k: 'strike', bonus: 4, sneak: 4 }], 2, ['des', 4]),
    c(['Mil Cortes', 'Thousand Cuts'], ASS, 'sword-spin', 'ataque', { v: 2 }, 5, [{ k: 'strike', bonus: 2, times: 3, sneak: 1 }], 1, ['des', 4]),
    POTION,
    r(['Contragolpe Sombrio', 'Shadow Riposte'], LAD, 'two-shadows', { v: 1 }, 1, 'ataque', [{ k: 'ward', tgt: 'hero' }, { k: 'mark', tgt: 'enemyHero' }], 2),
  ],
};

// ═════════ BEGE — Aldric, paladino da luz (Vigor e Mana; golpe divino, cura e proteção) ═════════
// Clérigo e Paladino: golpe divino (dano sagrado a mais), curar ferimentos, escudo da fé,
// imposição de mãos, juramento, arma espiritual e a palavra de cura que alcança todos.
const PAL: [string, string] = ['Paladino', 'Paladin'];
const CLE: [string, string] = ['Clérigo', 'Cleric'];
const white: ProtoDeck = {
  color: 'white',
  hero: preset({
    id: 'aldric', name: 'Aldric', className: ['Paladino', 'Paladin'], deckId: 'proto-white',
    attrs: ATTRS_ALDRIC, baseHp: lifeOf(8, 'white', ATTRS_ALDRIC.con),
    weapon: arm('longsword'),
    gear: [g('buckler'), g('ironhelm'), g('chainshirt'), g('gauntlets'), g('leatherpants'), g('ironboots'), g('periapt'), g('patronring'), g('strengthring')],
    vigor: 1, mana: 2, row: 0, col: 1, icon: 'templar-shield',
  }),
  cards: [
    c(['Golpe Divino', 'Divine Smite'], PAL, 'sunbeams', 'ataque', { v: 1, m: 1 }, 1, [{ k: 'strike', bonus: 2, smite: 2 }], 4),
    c(['Curar Ferimentos', 'Cure Wounds'], CLE, 'heart-drop', 'magia', { m: 1 }, 1, [{ k: 'heal', n: 4, tgt: 'ally' }], 4),
    c(['Chama Sagrada', 'Sacred Flame'], CLE, 'flame', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'magic' }, { k: 'mark', tgt: 'enemy' }], 4),
    c(['Escudo da Fé', 'Shield of Faith'], CLE, 'cross-shield', 'magia', { m: 1 }, 1, [{ k: 'ward', tgt: 'ally' }], 2),
    c(['Golpe de Escudo', 'Shield Bash'], PAL, 'shield-bash', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2, then: 'push' }], 2),
    c(['Oração', 'Prayer'], CLE, 'holy-symbol', 'tecnica', { v: 1 }, 1, [{ k: 'gain', res: 'mana', n: 2 }], 2),
    c(['Bênção', 'Bless'], CLE, 'angel-wings', 'magia', { m: 1 }, 1, [{ k: 'buff', atk: 1, tgt: 'allAllies' }, { k: 'heal', n: 1, tgt: 'allAllies' }], 2),
    c(['Imposição de Mãos', 'Lay on Hands'], PAL, 'magic-palm', 'tecnica', { v: 1, m: 1 }, 2, [{ k: 'heal', n: 6, tgt: 'ally' }], 2, ['car', 2]),
    c(['Juramento de Devoção', 'Oath of Devotion'], PAL, 'templar-heart', 'postura', { m: 2 }, 2, [{ k: 'stance', mods: { strike: 1, strikeHeals: 1 } }], 2, ['car', 2]),
    c(['Arma Espiritual', 'Spiritual Weapon'], CLE, 'winged-sword', 'invocacao', { m: 3 }, 2, [{ k: 'summon', unit: unit('Arma espiritual', 'Spiritual weapon', 3, 2, ['rapido', 'distancia'], 'winged-sword') }], 2, ['sab', 2]),
    c(['Investida Sagrada', 'Holy Charge'], PAL, 'cross-flare', 'ataque', { v: 2 }, 2, [{ k: 'advance' }, { k: 'strike', bonus: 3, smite: 1 }], 2),
    c(['Luz Radiante', 'Radiant Light'], CLE, 'sun', 'magia', { m: 2 }, 3, [{ k: 'dmg', n: 2, tgt: 'enemyRow', via: 'magic' }, { k: 'heal', n: 2, tgt: 'hero' }], 2, ['sab', 3]),
    c(['Palavra de Cura em Massa', 'Mass Healing Word'], CLE, 'holy-grail', 'magia', { m: 2 }, 4, [{ k: 'heal', n: 3, tgt: 'allAllies' }, { k: 'draw', n: 1 }], 2, ['sab', 3]),
    c(['Golpe Destruidor', 'Destructive Smite'], PAL, 'barbed-sun', 'ataque', { v: 1, m: 2 }, 5, [{ k: 'strike', bonus: 4, smite: 4 }], 1, ['for', 3]),
    c(['Anjo Guardião', 'Guardian Angel'], CLE, 'angel-outfit', 'invocacao', { m: 3 }, 6, [{ k: 'summon', unit: unit('Anjo guardião', 'Guardian angel', 4, 7, ['guarda'], 'angel-outfit') }], 1, ['sab', 3]),
    c(['Água Benta', 'Holy Water'], ['Consumível', 'Consumable'], 'holy-water', 'item', {}, 1, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }], 2),
    POTION,
    r(['Proteção Divina', 'Divine Protection'], CLE, 'healing-shield', { m: 1 }, 1, 'any', [{ k: 'ward', tgt: 'hero' }, { k: 'heal', n: 2, tgt: 'hero' }], 2),
  ],
};

// ═════════ PRATA — Ren, monge errante (Vigor como ki, um pouco de Mana para as canções) ═════════
// Monge e Bardo: rajada de golpes, golpe atordoante, passo do vento, defesa paciente, palma
// trêmula; zombaria cruel, inspiração bárdica, canção de descanso, contra-canto.
const MON: [string, string] = ['Monge', 'Monk'];
const BRD: [string, string] = ['Bardo', 'Bard'];
const silver: ProtoDeck = {
  color: 'silver',
  hero: preset({
    id: 'ren', name: 'Ren', className: ['Monge', 'Monk'], deckId: 'proto-silver',
    attrs: ATTRS_REN, baseHp: lifeOf(8, 'silver', ATTRS_REN.con),
    weapon: arm('handwraps'),
    gear: [g('hood'), g('monkgarb'), g('thiefgloves'), g('leatherpants'), g('elvenboots'), g('healthamulet'), g('agilityring'), g('protectionring')],
    vigor: 1, mana: 2, row: 0, col: 1, icon: 'meditation',
  }),
  cards: [
    c(['Rajada de Golpes', 'Flurry of Blows'], MON, 'mailed-fist', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 1, times: 3 }], 4),
    c(['Golpe Atordoante', 'Stunning Strike'], MON, 'thor-fist', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2, then: 'mark' }], 3),
    c(['Punho de Ki', 'Ki Fist'], MON, 'fist', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 1, smite: 2 }], 3),
    c(['Passo do Vento', 'Step of the Wind'], MON, 'lotus', 'tecnica', { v: 1 }, 1, [{ k: 'advance' }, { k: 'ward', tgt: 'hero' }], 3),
    c(['Meditação', 'Meditation'], MON, 'meditation', 'tecnica', { m: 1 }, 1, [{ k: 'heal', n: 2, tgt: 'hero' }, { k: 'draw', n: 1 }], 3),
    c(['Zombaria Cruel', 'Vicious Mockery'], BRD, 'cracked-mask', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 1, tgt: 'enemy', via: 'magic' }, { k: 'mark', tgt: 'enemy' }], 2),
    c(['Inspiração Bárdica', 'Bardic Inspiration'], BRD, 'pan-flute', 'tecnica', { m: 1 }, 1, [{ k: 'draw', n: 1 }, { k: 'gain', res: 'vigor', n: 1 }], 2),
    c(['Postura da Garça', 'Crane Stance'], MON, 'lotus-flower', 'postura', { v: 2 }, 2, [{ k: 'stance', mods: { strike: 1, guard: true } }], 2, ['sab', 2]),
    c(['Canção de Descanso', 'Song of Rest'], BRD, 'harp', 'magia', { m: 1 }, 2, [{ k: 'heal', n: 2, tgt: 'allAllies' }], 2, ['car', 1]),
    c(['Sussurros Dissonantes', 'Dissonant Whispers'], BRD, 'divided-spiral', 'magia', { m: 2 }, 2, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'magic' }, { k: 'mark', tgt: 'enemy' }, { k: 'push', tgt: 'enemy' }], 2),
    c(['Mente Serena', 'Still Mind'], MON, 'lotus-flower', 'tecnica', { m: 2 }, 2, [{ k: 'draw', n: 2 }, { k: 'heal', n: 1, tgt: 'hero' }], 2),
    c(['Chute Giratório', 'Spinning Kick'], MON, 'boot-kick', 'ataque', { v: 2 }, 3, [{ k: 'dmg', n: 2, tgt: 'enemyFront', via: 'melee' }, { k: 'ward', tgt: 'hero' }], 2, ['des', 3]),
    c(['Padrão Hipnótico', 'Hypnotic Pattern'], BRD, 'spiral-bloom', 'magia', { m: 3 }, 4, [{ k: 'mark', tgt: 'allEnemies' }, { k: 'draw', n: 1 }], 2, ['car', 2]),
    c(['Palma Trêmula', 'Quivering Palm'], MON, 'magic-palm', 'ataque', { v: 1, m: 2 }, 5, [{ k: 'strike', bonus: 3, smite: 6 }], 1, ['sab', 3]),
    c(['Balada do Herói', 'Ballad of the Hero'], BRD, 'drum', 'magia', { m: 4 }, 5, [{ k: 'buff', atk: 2, tgt: 'allAllies' }, { k: 'heal', n: 2, tgt: 'allAllies' }, { k: 'draw', n: 1 }], 1, ['car', 2]),
    POTION,
    r(['Defesa Paciente', 'Patient Defense'], MON, 'meditation', { v: 1 }, 1, 'ataque', [{ k: 'ward', tgt: 'hero' }, { k: 'gain', res: 'vigor', n: 1 }], 2),
    r(['Contra-canto', 'Countercharm'], BRD, 'harp', { m: 2 }, 1, 'magia', [{ k: 'counter' }], 2),
  ],
};

// ═════════ EVOLUÇÕES ═════════
// Cartas que crescem com o herói: ao chegar ao nível indicado, a carta ganha uma versão mais forte
// (o jogador escolhe qual versão jogar). O custo de cada versão sai da regra de custo (value.ts),
// pago no mesmo recurso da carta básica; com os dois recursos, o Vigor fica e a Mana cresce.
type Up = [level: number, effects: Effect[]];
const ev = (card: ProtoCard, ups: Up[]): void => {
  const gm = card.game;
  gm.ranks = ups.map(([level, effects]) => {
    const total = ruleCost({ ...gm, level, effects, ranks: undefined });
    const vigor = gm.vigor === undefined ? 0 : gm.mana === undefined ? total : Math.min(gm.vigor, total);
    return { level, ...(vigor ? { vigor } : {}), ...(total - vigor ? { mana: total - vigor } : {}), effects };
  });
};
const EVOLUTIONS: Record<ProtoDeck['color'], Record<string, Up[]>> = {
  red: {
    'Brutal Strike': [[3, [{ k: 'strike', bonus: 5 }]], [5, [{ k: 'strike', bonus: 7 }]]],
    'Bleeding Cut': [[3, [{ k: 'strike', bonus: 4, then: 'afflict' }]]],
    'Charge': [[3, [{ k: 'advance' }, { k: 'strike', bonus: 6 }]]],
    'Kick': [[3, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'melee' }, { k: 'push', tgt: 'enemy' }]]],
    'Battle Breath': [[4, [{ k: 'gain', res: 'vigor', n: 2 }]]],
    'Second Wind': [[3, [{ k: 'heal', n: 8, tgt: 'hero' }]]],
    'Cleave': [[4, [{ k: 'dmg', n: 5, tgt: 'enemyFront', via: 'melee' }]]],
    'Axe Throw': [[4, [{ k: 'dmg', n: 3, tgt: 'enemyRow', via: 'ranged' }]]],
  },
  blue: {
    'Spark': [[3, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'magic' }]]],
    'Arcane Darts': [[3, [{ k: 'dmg', n: 5, tgt: 'enemy', via: 'magic' }]], [5, [{ k: 'dmg', n: 3, tgt: 'enemyRow', via: 'magic' }]]],
    'Frost Ray': [[3, [{ k: 'dmg', n: 5, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }]]],
    'Arcane Shield': [[3, [{ k: 'ward', tgt: 'allAllies' }]]],
    'Arcane Blade': [[3, [{ k: 'strike', bonus: 7 }]]],
    'Arcane Wall': [[3, [{ k: 'summon', unit: unit('Muralha arcana', 'Arcane wall', 0, 7, ['guarda', 'parede'], 'magic-gate') }]]],
    'Study': [[4, [{ k: 'draw', n: 3 }]]],
    'Fire Lance': [[4, [{ k: 'dmg', n: 10, tgt: 'enemy', via: 'magic' }]]],
    'Fireball': [[4, [{ k: 'dmg', n: 5, tgt: 'enemyRow', via: 'magic' }]]],
  },
  green: {
    'Quick Shot': [[3, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'ranged' }]]],
    'True Shot': [[3, [{ k: 'strike', bonus: 5 }]], [5, [{ k: 'strike', bonus: 7 }]]],
    'Poison Arrow': [[3, [{ k: 'strike', bonus: 4, then: 'afflict' }]]],
    'Mark Prey': [[3, [{ k: 'mark', tgt: 'enemyRow' }, { k: 'draw', n: 1 }]]],
    'Wolf Companion': [[3, [{ k: 'summon', unit: unit('Lobo alfa', 'Alpha wolf', 4, 4, ['rapido'], 'wolf-head') }]]],
    'Barkskin': [[3, [{ k: 'ward', tgt: 'allAllies' }]]],
    'Entangle': [[3, [{ k: 'dmg', n: 2, tgt: 'enemyRow', via: 'magic' }, { k: 'push', tgt: 'enemyRow' }]]],
    'Healing Sap': [[4, [{ k: 'heal', n: 8, tgt: 'ally' }]]],
  },
  black: {
    'Shadow Cut': [[3, [{ k: 'strike', bonus: 4, then: 'afflict' }]]],
    'Lunge': [[3, [{ k: 'strike', bonus: 5 }]], [5, [{ k: 'strike', bonus: 7 }]]],
    'Curse of Ruin': [[4, [{ k: 'afflict', tgt: 'enemyRow' }, { k: 'mark', tgt: 'enemyRow' }]]],
    'Vampiric Touch': [[3, [{ k: 'dmg', n: 5, tgt: 'enemy', via: 'magic' }, { k: 'heal', n: 5, tgt: 'hero' }]]],
    'Raise Skeleton': [[3, [{ k: 'summon', unit: unit('Guerreiro esqueleto', 'Skeleton warrior', 2, 4, ['guarda'], 'death-skull') }]]],
    'Void Claws': [[3, [{ k: 'dmg', n: 4, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }]]],
    'Shadow Bolt': [[4, [{ k: 'dmg', n: 8, tgt: 'enemy', via: 'magic' }]]],
  },
  purple: {
    'Sneak Attack': [[3, [{ k: 'strike', bonus: 3, sneak: 5 }]]],
    'Poisoned Blade': [[3, [{ k: 'strike', bonus: 3, then: 'afflict' }]]],
    'Thrown Daggers': [[3, [{ k: 'dmg', n: 2, tgt: 'enemyRow', via: 'ranged' }]]],
    'Study the Mark': [[3, [{ k: 'mark', tgt: 'enemyRow' }]]],
    'Vanish': [[4, [{ k: 'ward', tgt: 'hero' }, { k: 'draw', n: 2 }]]],
    'Hamstring': [[3, [{ k: 'strike', bonus: 4, then: 'push' }]]],
    'Poison the Cup': [[4, [{ k: 'afflict', tgt: 'enemyRow' }, { k: 'draw', n: 1 }]]],
  },
  white: {
    'Divine Smite': [[3, [{ k: 'strike', bonus: 3, smite: 4 }]]],
    'Cure Wounds': [[3, [{ k: 'heal', n: 7, tgt: 'ally' }]], [5, [{ k: 'heal', n: 4, tgt: 'allAllies' }]]],
    'Sacred Flame': [[3, [{ k: 'dmg', n: 4, tgt: 'enemy', via: 'magic' }, { k: 'mark', tgt: 'enemy' }]]],
    'Shield of Faith': [[3, [{ k: 'ward', tgt: 'allAllies' }]]],
    'Shield Bash': [[3, [{ k: 'strike', bonus: 4, then: 'push' }]]],
    'Prayer': [[4, [{ k: 'gain', res: 'mana', n: 3 }]]],
    'Bless': [[4, [{ k: 'buff', atk: 2, tgt: 'allAllies' }, { k: 'heal', n: 2, tgt: 'allAllies' }]]],
  },
  silver: {
    'Flurry of Blows': [[3, [{ k: 'strike', bonus: 2, times: 3 }]]],
    'Stunning Strike': [[3, [{ k: 'strike', bonus: 4, then: 'mark' }]]],
    'Ki Fist': [[3, [{ k: 'strike', bonus: 2, smite: 4 }]]],
    'Meditation': [[3, [{ k: 'heal', n: 4, tgt: 'hero' }, { k: 'draw', n: 1 }]]],
    'Vicious Mockery': [[3, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }, { k: 'mark', tgt: 'enemy' }]]],
    'Song of Rest': [[4, [{ k: 'heal', n: 4, tgt: 'allAllies' }]]],
  },
};

export const PROTO_DECKS: ProtoDeck[] = [red, blue, green, black, purple, white, silver];
for (const d of PROTO_DECKS) for (const [name, ups] of Object.entries(EVOLUTIONS[d.color])) {
  const card = d.cards.find((x) => x.name[1] === name);
  if (!card) throw new Error(`evolução de carta desconhecida: ${name}`);
  ev(card, ups);
}
export const HEROES = PROTO_DECKS.map((d) => d.hero);
