/**
 * Coleção de teste: 4 heróis prontos e 4 decks de 40 cartas (contando cópias).
 * Cada carta é uma habilidade do herói. Custos em Vigor (físico) e Mana
 * (mágico); requisitos de nível e de atributo; efeitos que o motor entende.
 */
import type { CardGame, CardKind, Effect, GearItem, HeroBase, HeroDef, UnitDef, Via } from './types';

export interface ProtoCard {
  name: [string, string];
  /** Classe da habilidade (aparece no subtipo). */
  cls: [string, string];
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  game: CardGame;
}

export interface ProtoDeck { color: 'red' | 'blue' | 'green' | 'black'; hero: HeroDef; cards: ProtoCard[] }

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
const g = (slot: GearItem['slot'], pt: string, en: string, mods: Pick<GearItem, 'armor' | 'resist' | 'hp' | 'strike'> = {}): GearItem => ({ slot, name: [pt, en], info: gearInfo(mods), ...mods });

/** Texto do que uma peça dá (para mostrar na mesa e na ficha). */
export function gearInfo(mods: Pick<GearItem, 'armor' | 'resist' | 'hp' | 'strike'>): [string, string] {
  const parts: [string, string][] = [];
  if (mods.armor) parts.push([`+${mods.armor} Armadura`, `+${mods.armor} Armor`]);
  if (mods.resist) parts.push([`+${mods.resist} Resistência mágica`, `+${mods.resist} Magic resistance`]);
  if (mods.hp) parts.push([`+${mods.hp} Vida`, `+${mods.hp} Life`]);
  if (mods.strike) parts.push([`+${mods.strike} no golpe`, `+${mods.strike} strike`]);
  return [parts.map((x) => x[0]).join(', ') || '—', parts.map((x) => x[1]).join(', ') || '—'];
}

/** Soma o equipamento ao herói: vida, armadura, resistência e dano do golpe saem das peças vestidas. */
export function buildHero(base: HeroBase): HeroDef {
  const sum = (k: 'armor' | 'resist' | 'hp' | 'strike') => base.gear.reduce((n, it) => n + (it[k] ?? 0), 0);
  const dmg = base.weapon.dmg + sum('strike');
  const weaponItem: GearItem = { slot: 'weapon', name: base.weapon.name, info: [`Golpe ${base.weapon.dmg}, ${VIA_TXT[base.weapon.via][0]}`, `Strike ${base.weapon.dmg}, ${VIA_TXT[base.weapon.via][1]}`] };
  return {
    id: base.id, name: base.name, className: base.className, deckId: base.deckId, attrs: base.attrs,
    maxHp: base.baseHp + sum('hp'), weapon: { ...base.weapon, dmg }, armor: sum('armor'), resist: sum('resist'),
    gear: [weaponItem, ...base.gear.map((it) => ({ ...it, info: gearInfo(it) }))], vigor: base.vigor, mana: base.mana, row: base.row, col: base.col, icon: base.icon,
  };
}

/** Os 4 heróis prontos, antes de somar o equipamento (viram fichas editáveis no app). */
export const HERO_BASES: HeroBase[] = [];
const preset = (base: HeroBase): HeroDef => { HERO_BASES.push(base); return buildHero(base); };

const POTION: ProtoCard = c(['Poção de Cura', 'Healing Potion'], ['Consumível', 'Consumable'], 'health-potion', 'item', {}, 1, [{ k: 'heal', n: 4, tgt: 'ally' }], 2);

const unit = (pt: string, en: string, atk: number, def: number, keys: UnitDef['keys'], icon: string): UnitDef => ({ name: [pt, en], atk, def, keys, icon });

// ═════════ VERMELHO — Brunhild, bárbara de linha de frente (só Vigor) ═════════
const BAR: [string, string] = ['Bárbaro', 'Barbarian'];
const GUE: [string, string] = ['Guerreiro', 'Fighter'];
const red: ProtoDeck = {
  color: 'red',
  hero: preset({
    id: 'brunhild', name: 'Brunhild', className: ['Bárbara', 'Barbarian'], deckId: 'proto-red',
    attrs: { for: 4, des: 1, con: 3, int: 0, sab: 1, car: 0 }, baseHp: 28,
    weapon: { name: ['Machado grande', 'Greataxe'], dmg: 4, via: 'melee' },
    gear: [
      g('head', 'Elmo com chifres', 'Horned helm', { armor: 1 }),
      g('chest', 'Cota de malha', 'Chain mail', { armor: 1, hp: 2 }),
      g('hands', 'Braçadeiras de ferro', 'Iron bracers', { hp: 2 }),
      g('feet', 'Botas de guerra', 'War boots', { hp: 2 }),
      g('trinket', 'Amuleto do urso', 'Bear amulet', { hp: 2 }),
    ],
    vigor: 3, mana: 0, row: 0, col: 1, icon: 'horned-helm',
  }),
  cards: [
    c(['Golpe Brutal', 'Brutal Strike'], BAR, 'battle-axe', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2 }], 4),
    c(['Corte Sangrento', 'Bleeding Cut'], GUE, 'bloody-sword', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 0, then: 'afflict' }], 2),
    c(['Investida', 'Charge'], BAR, 'boot-stomp', 'ataque', { v: 2 }, 1, [{ k: 'advance' }, { k: 'strike', bonus: 2 }], 3),
    c(['Fúria', 'Rage'], BAR, 'burning-embers', 'postura', { v: 2 }, 1, [{ k: 'stance', mods: { strike: 2 } }], 3, ['for', 3]),
    c(['Chute', 'Kick'], GUE, 'boot-kick', 'tecnica', { v: 0 }, 1, [{ k: 'push', tgt: 'enemy' }], 2),
    c(['Fôlego de Batalha', 'Battle Breath'], GUE, 'lungs', 'tecnica', { v: 0 }, 1, [{ k: 'gain', res: 'vigor', n: 1 }], 2),
    c(['Segundo Fôlego', 'Second Wind'], GUE, 'heart-armor', 'tecnica', { v: 2 }, 1, [{ k: 'heal', n: 5, tgt: 'hero' }], 3, ['con', 2]),
    c(['Postura Defensiva', 'Defensive Stance'], GUE, 'shield-bash', 'postura', { v: 1 }, 1, [{ k: 'stance', mods: { guard: true } }, { k: 'ward', tgt: 'hero' }], 2),
    c(['Grito de Guerra', 'War Cry'], BAR, 'shouting', 'tecnica', { v: 2 }, 2, [{ k: 'draw', n: 2 }], 2),
    c(['Varredura', 'Cleave'], BAR, 'sword-spin', 'ataque', { v: 3 }, 2, [{ k: 'dmg', n: 3, tgt: 'enemyFront', via: 'melee' }], 2, ['for', 3]),
    c(['Quebra-Guarda', 'Guard Breaker'], GUE, 'shield-impact', 'ataque', { v: 2 }, 2, [{ k: 'strike', bonus: 1, then: 'push' }], 2),
    c(['Arremessar Machado', 'Axe Throw'], BAR, 'thrown-daggers', 'ataque', { v: 2 }, 2, [{ k: 'dmg', n: 4, tgt: 'enemy', via: 'ranged' }], 2, ['for', 2]),
    c(['Golpe Devastador', 'Devastating Blow'], BAR, 'hammer-drop', 'ataque', { v: 3 }, 3, [{ k: 'strike', bonus: 4 }], 2),
    c(['Sede de Sangue', 'Bloodthirst'], BAR, 'bleeding-heart', 'postura', { v: 3 }, 3, [{ k: 'stance', mods: { strike: 1, strikeHeals: 2 } }], 2, ['con', 3]),
    c(['Ira Implacável', 'Relentless Fury'], BAR, 'crossed-axes', 'ataque', { v: 5 }, 5, [{ k: 'strike', bonus: 2, times: 2 }], 2, ['for', 4]),
    c(['Fúria Ancestral', 'Ancestral Rage'], BAR, 'warlord-helmet', 'postura', { v: 4 }, 5, [{ k: 'stance', mods: { strike: 3, guard: true } }], 1),
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
    attrs: { for: 2, des: 2, con: 1, int: 4, sab: 0, car: 0 }, baseHp: 32,
    weapon: { name: ['Cajado de carvalho', 'Oak staff'], dmg: 4, via: 'magic' },
    gear: [
      g('head', 'Capuz do arcanista', "Arcanist's hood", { resist: 1 }),
      g('chest', 'Manto do aprendiz', "Apprentice's robe", { armor: 1, hp: 3 }),
      g('hands', 'Luvas rúnicas', 'Runic gloves', { hp: 2 }),
      g('feet', 'Sandálias do viajante', "Traveler's sandals", { hp: 2 }),
      g('trinket', 'Amuleto de safira', 'Sapphire amulet', { resist: 1 }),
    ],
    vigor: 0, mana: 3, row: 1, col: 1, icon: 'pentacle',
  }),
  cards: [
    c(['Fagulha', 'Spark'], MAG, 'comet-spark', 'magia', { m: 0 }, 1, [{ k: 'dmg', n: 1, tgt: 'enemy', via: 'magic' }], 2),
    c(['Dardos Arcanos', 'Arcane Darts'], MAG, 'magic-swirl', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }], 4),
    c(['Raio de Gelo', 'Frost Ray'], MAG, 'ice-spell-cast', 'magia', { m: 2 }, 1, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }], 3),
    c(['Escudo Arcano', 'Arcane Shield'], MAG, 'magic-shield', 'magia', { m: 1 }, 1, [{ k: 'ward', tgt: 'ally' }], 2),
    c(['Concentração', 'Focus'], MAG, 'concentration-orb', 'tecnica', { m: 1 }, 1, [{ k: 'draw', n: 1 }, { k: 'gain', res: 'mana', n: 1 }], 2),
    c(['Lâmina Arcana', 'Arcane Blade'], MAG, 'rune-sword', 'ataque', { m: 1 }, 1, [{ k: 'strike', bonus: 2 }], 3, ['for', 1]),
    c(['Muralha Arcana', 'Arcane Wall'], MAG, 'magic-gate', 'invocacao', { m: 1 }, 1, [{ k: 'summon', unit: unit('Muralha arcana', 'Arcane wall', 0, 4, ['guarda', 'parede'], 'magic-gate') }], 2),
    c(['Estudo', 'Study'], MAG, 'open-book', 'tecnica', { m: 2 }, 1, [{ k: 'draw', n: 2 }], 2),
    c(['Elemental de Pedra', 'Stone Elemental'], MAG, 'rock-golem', 'invocacao', { m: 3 }, 2, [{ k: 'summon', unit: unit('Elemental de pedra', 'Stone elemental', 2, 5, ['guarda'], 'rock-golem') }], 3, ['int', 2]),
    c(['Postura do Mago de Batalha', 'Battle Mage Stance'], MAG, 'crystal-wand', 'postura', { m: 2 }, 2, [{ k: 'stance', mods: { strike: 1, strikeMagic: true } }], 2, ['for', 2]),
    c(['Lança de Fogo', 'Fire Lance'], MAG, 'fire-spell-cast', 'magia', { m: 3 }, 2, [{ k: 'dmg', n: 7, tgt: 'enemy', via: 'magic' }], 2),
    c(['Bola de Fogo', 'Fireball'], MAG, 'fireball', 'magia', { m: 4 }, 3, [{ k: 'dmg', n: 3, tgt: 'enemyRow', via: 'magic' }], 2, ['int', 3]),
    c(['Relâmpago em Cadeia', 'Chain Lightning'], MAG, 'bolt-spell-cast', 'magia', { m: 4 }, 3, [{ k: 'dmg', n: 2, tgt: 'allEnemies', via: 'magic' }], 2, ['int', 3]),
    c(['Elemental de Fogo', 'Fire Elemental'], MAG, 'fire-silhouette', 'invocacao', { m: 4 }, 3, [{ k: 'summon', unit: unit('Elemental de fogo', 'Fire elemental', 4, 3, ['rapido'], 'fire-silhouette') }], 2, ['int', 4]),
    c(['Meteoro', 'Meteor'], MAG, 'burning-meteor', 'magia', { m: 6 }, 6, [{ k: 'dmg', n: 5, tgt: 'allEnemies', via: 'magic' }], 1, ['int', 4]),
    c(['Poção de Mana', 'Mana Potion'], ['Consumível', 'Consumable'], 'magic-potion', 'item', {}, 1, [{ k: 'gain', res: 'mana', n: 2 }], 2),
    POTION,
    r(['Contramágica', 'Counterspell'], MAG, 'spell-book', { m: 2 }, 1, 'magia', [{ k: 'counter' }], 2),
  ],
};

// ═════════ VERDE — Lyra, patrulheira com companheiros (Vigor e um pouco de Mana) ═════════
const PAT: [string, string] = ['Patrulheiro', 'Ranger'];
const DRU: [string, string] = ['Druida', 'Druid'];
const green: ProtoDeck = {
  color: 'green',
  hero: preset({
    id: 'lyra', name: 'Lyra', className: ['Patrulheira', 'Ranger'], deckId: 'proto-green',
    attrs: { for: 0, des: 4, con: 2, int: 0, sab: 3, car: 0 }, baseHp: 33,
    weapon: { name: ['Arco longo', 'Longbow'], dmg: 4, via: 'ranged' },
    gear: [
      g('head', 'Capuz da patrulheira', "Ranger's hood", { hp: 2 }),
      g('chest', 'Gibão de couro', 'Leather jerkin', { armor: 1, hp: 2 }),
      g('hands', 'Luvas de arqueira', "Archer's gloves", { hp: 2 }),
      g('feet', 'Botas silenciosas', 'Silent boots', { hp: 2 }),
      g('trinket', 'Colar de presas', 'Fang necklace', { hp: 2 }),
    ],
    vigor: 2, mana: 1, row: 1, col: 1, icon: 'bowman',
  }),
  cards: [
    c(['Disparo Rápido', 'Quick Shot'], PAT, 'arrow-flights', 'ataque', { v: 0 }, 1, [{ k: 'dmg', n: 1, tgt: 'enemy', via: 'ranged' }], 2),
    c(['Tiro Certeiro', 'True Shot'], PAT, 'broadhead-arrow', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2 }], 4),
    c(['Flecha Envenenada', 'Poison Arrow'], PAT, 'poison-bottle', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 0, then: 'afflict' }], 3),
    c(['Marcar Presa', 'Mark Prey'], PAT, 'hunter-eyes', 'tecnica', { v: 1 }, 1, [{ k: 'mark', tgt: 'enemy' }, { k: 'draw', n: 1 }], 3),
    c(['Lobo Companheiro', 'Wolf Companion'], PAT, 'wolf-howl', 'invocacao', { v: 1, m: 1 }, 1, [{ k: 'summon', unit: unit('Lobo', 'Wolf', 3, 2, ['rapido'], 'wolf-head') }], 3, ['sab', 2]),
    c(['Pele de Casca', 'Barkskin'], DRU, 'oak-leaf', 'magia', { m: 1 }, 1, [{ k: 'ward', tgt: 'ally' }], 2),
    c(['Enredar', 'Entangle'], DRU, 'thorny-vine', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 1, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }], 3),
    c(['Camuflagem', 'Camouflage'], PAT, 'hooded-figure', 'postura', { v: 1 }, 1, [{ k: 'stance', mods: { strike: 1 } }, { k: 'ward', tgt: 'hero' }], 2, ['des', 2]),
    c(['Tiro Duplo', 'Double Shot'], PAT, 'bowman', 'ataque', { v: 2 }, 2, [{ k: 'strike', bonus: 0, times: 2 }], 3, ['des', 3]),
    c(['Seiva Curativa', 'Healing Sap'], DRU, 'leaf-swirl', 'magia', { m: 2 }, 2, [{ k: 'heal', n: 4, tgt: 'ally' }], 2, ['sab', 2]),
    c(['Instinto Selvagem', 'Wild Instinct'], PAT, 'direwolf', 'tecnica', { v: 1 }, 2, [{ k: 'buff', atk: 1, tgt: 'allAllies' }, { k: 'draw', n: 1 }], 2),
    c(['Chuva de Flechas', 'Arrow Rain'], PAT, 'arrow-cluster', 'ataque', { v: 3 }, 3, [{ k: 'dmg', n: 2, tgt: 'enemyRow', via: 'ranged' }], 2, ['des', 3]),
    c(['Urso Companheiro', 'Bear Companion'], PAT, 'bear-head', 'invocacao', { v: 2, m: 2 }, 3, [{ k: 'summon', unit: unit('Urso', 'Bear', 3, 6, ['guarda'], 'bear-head') }], 2, ['sab', 3]),
    c(['Chamado da Matilha', 'Call of the Pack'], PAT, 'wolf-howl', 'invocacao', { m: 3 }, 4, [{ k: 'summon', unit: unit('Lobo', 'Wolf', 2, 2, [], 'wolf-head'), n: 2 }], 2, ['sab', 3]),
    c(['Tempestade de Espinhos', 'Thorn Storm'], DRU, 'heavy-thorny-triskelion', 'magia', { m: 5 }, 5, [{ k: 'dmg', n: 3, tgt: 'allEnemies', via: 'magic' }], 1, ['sab', 3]),
    POTION,
    r(['Esquiva', 'Dodge'], PAT, 'backstab', { v: 1 }, 1, 'any', [{ k: 'ward', tgt: 'hero' }], 2),
  ],
};

// ═════════ PRETO — Morgana, bruxa da lâmina sombria (Mana e Vigor, aflições) ═════════
const BRU: [string, string] = ['Bruxo', 'Warlock'];
const NEC: [string, string] = ['Necromante', 'Necromancer'];
const black: ProtoDeck = {
  color: 'black',
  hero: preset({
    id: 'morgana', name: 'Morgana', className: ['Bruxa da lâmina', 'Hexblade'], deckId: 'proto-black',
    attrs: { for: 0, des: 3, con: 2, int: 0, sab: 0, car: 4 }, baseHp: 26,
    weapon: { name: ['Katana sombria', 'Shadow katana'], dmg: 4, via: 'melee' },
    gear: [
      g('head', 'Capuz das sombras', 'Shadow hood', { resist: 1 }),
      g('chest', 'Couro reforçado', 'Studded leather', { armor: 1, hp: 2 }),
      g('hands', 'Manoplas do pacto', 'Pact gauntlets', { hp: 2 }),
      g('feet', 'Botas de couro negro', 'Black leather boots', { hp: 2 }),
      g('trinket', 'Anel do patrono', "Patron's ring", { hp: 2 }),
    ],
    vigor: 1, mana: 2, row: 0, col: 1, icon: 'daemon-skull',
  }),
  cards: [
    c(['Corte Sombrio', 'Shadow Cut'], BRU, 'curvy-knife', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 0, then: 'afflict' }], 3),
    c(['Estocada', 'Lunge'], BRU, 'knife-thrust', 'ataque', { v: 1 }, 1, [{ k: 'strike', bonus: 2 }], 3),
    c(['Maldição da Ruína', 'Curse of Ruin'], BRU, 'cursed-star', 'magia', { m: 1 }, 1, [{ k: 'afflict', tgt: 'enemy' }, { k: 'mark', tgt: 'enemy' }], 3),
    c(['Toque Vampírico', 'Vampiric Touch'], NEC, 'bleeding-heart', 'magia', { m: 2 }, 1, [{ k: 'dmg', n: 3, tgt: 'enemy', via: 'magic' }, { k: 'heal', n: 3, tgt: 'hero' }], 3),
    c(['Erguer Esqueleto', 'Raise Skeleton'], NEC, 'raise-zombie', 'invocacao', { m: 1 }, 1, [{ k: 'summon', unit: unit('Esqueleto', 'Skeleton', 1, 2, ['guarda'], 'death-skull') }], 3),
    c(['Pacto de Sangue', 'Blood Pact'], BRU, 'chalice-drops', 'tecnica', {}, 1, [{ k: 'selfdmg', n: 2 }, { k: 'gain', res: 'mana', n: 2 }], 1),
    c(['Garras do Vazio', 'Void Claws'], BRU, 'shadow-grasp', 'magia', { m: 1 }, 1, [{ k: 'dmg', n: 2, tgt: 'enemy', via: 'magic' }, { k: 'push', tgt: 'enemy' }], 2),
    c(['Dança das Sombras', 'Shadow Dance'], BRU, 'two-shadows', 'tecnica', { v: 1 }, 1, [{ k: 'ward', tgt: 'hero' }, { k: 'draw', n: 1 }], 2, ['des', 2]),
    c(['Sussurro do Patrono', "Patron's Whisper"], BRU, 'spark-spirit', 'tecnica', { m: 2 }, 1, [{ k: 'draw', n: 2 }], 2),
    c(['Lâmina do Pacto', 'Pact Blade'], BRU, 'cursed-star', 'ataque', { v: 1, m: 1 }, 2, [{ k: 'strike', bonus: 3 }], 3, ['car', 2]),
    c(['Postura da Lâmina Sombria', 'Shadow Blade Stance'], BRU, 'eclipse', 'postura', { m: 2 }, 2, [{ k: 'stance', mods: { strike: 1, strikeAfflicts: true } }], 2, ['car', 2]),
    c(['Raio Sombrio', 'Shadow Bolt'], BRU, 'spiky-eclipse', 'magia', { m: 2 }, 2, [{ k: 'dmg', n: 4, tgt: 'enemy', via: 'magic' }], 2),
    c(['Demônio Vinculado', 'Bound Demon'], BRU, 'daemon-skull', 'invocacao', { m: 4 }, 3, [{ k: 'summon', unit: unit('Demônio', 'Demon', 4, 4, ['rapido'], 'daemon-skull') }], 2, ['car', 3]),
    c(['Praga', 'Plague'], NEC, 'death-skull', 'magia', { m: 3 }, 2, [{ k: 'dmg', n: 1, tgt: 'allEnemies', via: 'magic' }, { k: 'afflict', tgt: 'allEnemies' }], 2, ['car', 2]),
    c(['Legião de Ossos', 'Bone Legion'], NEC, 'crossed-bones', 'invocacao', { m: 3 }, 4, [{ k: 'summon', unit: unit('Esqueleto', 'Skeleton', 1, 2, ['guarda'], 'death-skull'), n: 2 }], 2),
    c(['Ceifar Almas', 'Reap Souls'], BRU, 'grim-reaper', 'magia', { m: 5 }, 5, [{ k: 'dmg', n: 3, tgt: 'allEnemies', via: 'magic' }, { k: 'heal', n: 3, tgt: 'hero' }], 1, ['car', 4]),
    POTION,
    r(['Represália Sombria', 'Shadow Reprisal'], BRU, 'magic-palm', { m: 1 }, 1, 'ataque', [{ k: 'afflict', tgt: 'enemyHero' }, { k: 'dmg', n: 1, tgt: 'enemyHero', via: 'magic' }], 2),
  ],
};

export const PROTO_DECKS: ProtoDeck[] = [red, blue, green, black];
export const HEROES = PROTO_DECKS.map((d) => d.hero);
