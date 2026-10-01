/**
 * Tipos do jogo (protótipo): cartas como habilidades do herói, efeitos que o
 * motor entende, heróis e o estado da partida.
 *
 * Regras (versão 3 da proposta):
 *  - Dois recursos que enchem todo turno: Vigor (físico) e Mana (mágico).
 *  - Ao subir de nível (a cada 3 XP): +1 Vigor, +1 Mana ou +3 Vida.
 *  - Campo de 2 fileiras × 3 lugares por lado; o herói ocupa um lugar.
 *  - O dano fica até ser curado. Só três números na mesa: dano, recursos, XP.
 *  - Marcadores binários (sem contagem): Aflição (1 de dano no começo do turno
 *    do dono; some com qualquer cura), Marca (sofre +1 de todo dano) e
 *    Proteção (anula o próximo dano).
 */

export type Attr = 'for' | 'des' | 'con' | 'int' | 'sab' | 'car';
export const ATTRS: Attr[] = ['for', 'des', 'con', 'int', 'sab', 'car'];
export const ATTR_NAMES: Record<Attr, [string, string]> = {
  for: ['FOR', 'STR'], des: ['DES', 'DEX'], con: ['CON', 'CON'], int: ['INT', 'INT'], sab: ['SAB', 'WIS'], car: ['CAR', 'CHA'],
};

/** Como o dano chega: corpo a corpo (precisa estar na frente e respeita a frente inimiga), à distância ou magia. */
export type Via = 'melee' | 'ranged' | 'magic';

/** Alvos. */
export type Target =
  | 'enemy'       // uma criatura inimiga ou o herói inimigo (respeitando o alcance)
  | 'enemyUnit'   // uma criatura inimiga (não o herói)
  | 'enemyHero'
  | 'enemyRow'    // todas as criaturas de uma fileira inimiga (inclui o herói, se estiver nela)
  | 'enemyFront'  // a fileira da frente inimiga
  | 'allEnemies'  // todas as criaturas inimigas e o herói inimigo
  | 'ally'        // uma criatura aliada ou o próprio herói
  | 'allyUnit'
  | 'hero'        // o próprio herói
  | 'allAllies';

export type Effect =
  | { k: 'dmg'; n: number; tgt: Target; via: Via }
  /** Golpe do herói com a arma (+bônus). `then` aplica algo no alvo atingido. */
  | { k: 'strike'; bonus: number; times?: number; then?: 'afflict' | 'mark' | 'push' }
  | { k: 'heal'; n: number; tgt: Target }
  | { k: 'afflict'; tgt: Target }
  | { k: 'mark'; tgt: Target }
  | { k: 'ward'; tgt: Target }
  | { k: 'push'; tgt: Target }
  | { k: 'summon'; unit: UnitDef; n?: number }
  | { k: 'draw'; n: number }
  | { k: 'gain'; res: 'vigor' | 'mana'; n: number }
  | { k: 'buff'; atk: number; tgt: Target }
  | { k: 'selfdmg'; n: number }
  /** Leva o herói para a fileira da frente (se houver lugar). */
  | { k: 'advance' }
  /** Reação: anula a carta do oponente que está sendo respondida. */
  | { k: 'counter' }
  | { k: 'stance'; mods: StanceMods };

export interface StanceMods {
  /** Dano a mais nos golpes do herói. */
  strike?: number;
  /** Golpes do herói passam a ser mágicos (atingem qualquer alvo). */
  strikeMagic?: boolean;
  /** Golpes do herói afligem o alvo. */
  strikeAfflicts?: boolean;
  /** Golpes do herói curam o herói em N. */
  strikeHeals?: number;
  /** O herói ganha Guarda. */
  guard?: boolean;
}

export type Keyword = 'guarda' | 'rapido' | 'distancia' | 'parede';

export interface UnitDef { name: [string, string]; atk: number; def: number; keys?: Keyword[]; icon?: string }

export type CardKind = 'ataque' | 'magia' | 'tecnica' | 'postura' | 'invocacao' | 'item' | 'reacao';
export const KIND_NAMES: Record<CardKind, [string, string]> = {
  ataque: ['Ataque', 'Attack'], magia: ['Magia', 'Spell'], tecnica: ['Técnica', 'Technique'],
  postura: ['Postura', 'Stance'], invocacao: ['Invocação', 'Summon'], item: ['Item', 'Item'], reacao: ['Reação', 'Reaction'],
};

/** O que a carta faz no jogo (guardado na carta do app). */
export interface CardGame {
  kind: CardKind;
  vigor?: number;
  mana?: number;
  level: number;
  attr?: [Attr, number];
  effects: Effect[];
  /** Reação: a que tipo de carta do oponente ela responde (só pode ser usada nessa hora). */
  react?: 'ataque' | 'magia' | 'any';
  /** Quantas cópias no deck. */
  copies: number;
}

/** Herói pronto (no futuro, vem da ficha). */
export interface HeroDef {
  id: string;
  name: string;
  className: [string, string];
  /** Deck do app que o herói usa. */
  deckId: string;
  attrs: Record<Attr, number>;
  maxHp: number;
  weapon: { name: [string, string]; dmg: number; via: Via };
  /** Armadura: reduz o dano físico (corpo a corpo e à distância) de cada golpe, mínimo 1. Magia atravessa. */
  armor: number;
  /** Resistência mágica: reduz o dano mágico de cada golpe, mínimo 1. */
  resist: number;
  /** Equipamento vestido (vem da ficha): nome e o que dá. */
  gear: GearItem[];
  /** Recursos no nível 1 (3 pontos entre Vigor e Mana). */
  vigor: number;
  mana: number;
  /** Fileira inicial (0 = frente, 1 = retaguarda) e coluna (0–2). */
  row: 0 | 1;
  col: 0 | 1 | 2;
  icon: string;
}

export type GearSlot = 'weapon' | 'head' | 'chest' | 'hands' | 'feet' | 'trinket';
export const GEAR_SLOTS: Record<GearSlot, [string, string]> = {
  weapon: ['Arma', 'Weapon'], head: ['Cabeça', 'Head'], chest: ['Peito', 'Chest'], hands: ['Mãos', 'Hands'], feet: ['Pés', 'Feet'], trinket: ['Amuleto', 'Trinket'],
};
/** Uma peça de equipamento e o que ela soma ao herói. */
export interface GearItem {
  slot: GearSlot;
  name: [string, string];
  info: [string, string];
  armor?: number;
  resist?: number;
  hp?: number;
  strike?: number;
}

/** Herói antes de somar o equipamento (é o que a ficha guarda e o jogador edita). */
export interface HeroBase {
  id: string;
  name: string;
  className: [string, string];
  deckId: string;
  attrs: Record<Attr, number>;
  baseHp: number;
  weapon: { name: [string, string]; dmg: number; via: Via };
  gear: GearItem[];
  vigor: number;
  mana: number;
  row: 0 | 1;
  col: 0 | 1 | 2;
  icon: string;
}

// ───────────── estado da partida ─────────────

export interface Unit {
  id: string;
  name: [string, string];
  atk: number;
  def: number;
  dmg: number;
  keys: Keyword[];
  icon?: string;
  isHero: boolean;
  /** Já atacou neste turno (ou acabou de entrar). */
  exhausted: boolean;
  afflicted: boolean;
  marked: boolean;
  warded: boolean;
  /** Bônus de ATK até o fim do turno. */
  buff: number;
  /** Carta de onde a invocação veio (para ver a carta ao passar o mouse). */
  src?: string;
}

export interface CardRef { uid: string; cardId: string }

export interface PlayerState {
  hero: HeroDef;
  vigor: number;
  maxVigor: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  /** Níveis ganhos esperando a escolha (+Vigor, +Mana ou +Vida). */
  pendingLevels: number;
  deck: CardRef[];
  hand: CardRef[];
  discard: CardRef[];
  /** Cartas usadas desde o começo do último turno do jogador (ficam à vista do oponente; depois vão para o cemitério). */
  recent: CardRef[];
  /** Campo: [fileira][coluna]; fileira 0 = frente. */
  board: (Unit | null)[][];
  stance?: { cardId: string; uid?: string; mods: StanceMods };
  struck: boolean;
  moved: boolean;
  /** Já feriu o herói inimigo neste turno (XP). */
  hitHero: boolean;
  /** Habilidades usadas neste turno (modo 3 ações). */
  plays: number;
  /** Herói fora do campo (modo "herói fora do campo"): não ocupa um lugar. */
  heroUnit?: Unit;
}

/** O que o motor precisa saber de cada carta. */
export interface CardDef { id: string; name: [string, string]; game: CardGame }

export interface GameState {
  players: [PlayerState, PlayerState];
  /** Cartas em jogo nesta partida (por id). */
  defs: Record<string, CardDef>;
  /** Semente do sorteio (embaralhar). */
  seed: number;
  active: 0 | 1;
  turn: number;
  winner?: 0 | 1;
  log: string[];
  /** Limite de 3 habilidades por turno (modo B). */
  actionLimit: boolean;
  seq: number;
  /** Modo em que os heróis ficam fora do campo (como o jogador no Magic). */
  heroOff: boolean;
  /** No modo fora do campo: o golpe corpo a corpo do herói só passa da frente inimiga se ela estiver vazia (regra opcional). */
  heroOffFront: boolean;
  /** Carta jogada esperando a resposta do oponente (Reação ou aceitar). */
  pending?: { p: 0 | 1; ref: CardRef; target?: Pos; slot?: Pos };
  /** Acontecimentos recentes para a mesa animar (números de dano, ataques, começo de turno…). */
  fx: Fx[];
}

/**
 * Um acontecimento visível. `id` é o id da criatura (Unit.id); `n` sempre crescente
 * para a mesa saber o que ainda não mostrou.
 */
export type Fx = { n: number } & (
  | { k: 'dmg'; id: string; amount: number; armor: number; marked: boolean; via: Via | 'none' }
  | { k: 'blocked'; id: string }
  | { k: 'heal'; id: string; amount: number }
  | { k: 'status'; id: string; s: 'afflict' | 'mark' | 'ward' | 'push' | 'cleanse' }
  | { k: 'death'; id: string }
  | { k: 'attack'; from: string; to: string; via: Via }
  | { k: 'turn'; p: 0 | 1; turn: number }
  | { k: 'xp'; p: 0 | 1; amount: number; why: 'turn' | 'kill' | 'hit' }
  | { k: 'level'; p: 0 | 1 }
  | { k: 'play'; p: 0 | 1; cardId: string }
  | { k: 'summon'; id: string }
  | { k: 'gain'; p: 0 | 1; res: 'vigor' | 'mana'; amount: number }
  | { k: 'react'; p: 0 | 1; cardId: string }
  | { k: 'countered'; p: 0 | 1; cardId: string }
);

/** Posição de uma criatura. Herói fora do campo: row = -1. */
export interface Pos { p: 0 | 1; row: number; col: number }

/** Uma jogada. */
export type Action =
  | { t: 'play'; uid: string; target?: Pos; slot?: Pos }
  | { t: 'strike'; target: Pos }
  | { t: 'attack'; from: Pos; target: Pos }
  | { t: 'move'; to: Pos }
  | { t: 'levelup'; choice: 'vigor' | 'mana' | 'vida' }
  /** Resposta a uma carta do oponente: usar uma Reação ou aceitar. */
  | { t: 'react'; uid: string }
  | { t: 'pass' }
  | { t: 'end' };
