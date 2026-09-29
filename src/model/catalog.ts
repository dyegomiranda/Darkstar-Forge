/** Catálogo do jogo: classes (cores), recursos, raridades, tipos de carta. */
import type { ColorId, Lang, RarityId, ResourceId } from './types';

type L10n = Record<Lang, string>;

export interface ColorInfo {
  id: ColorId;
  name: L10n;
  classes: L10n;
  hex: string;
  /** Recurso principal (custo) e secundários. */
  resources: ResourceId[];
}

export const COLORS: Record<ColorId, ColorInfo> = {
  red: { id: 'red', name: { 'pt-BR': 'Vermelho', 'en-US': 'Red' }, classes: { 'pt-BR': 'Guerreiro / Bárbaro', 'en-US': 'Fighter / Barbarian' }, hex: '#b92d20', resources: ['vigor', 'fury', 'gold'] },
  blue: { id: 'blue', name: { 'pt-BR': 'Azul', 'en-US': 'Blue' }, classes: { 'pt-BR': 'Mago / Feiticeiro', 'en-US': 'Wizard / Sorcerer' }, hex: '#2f7cff', resources: ['mana'] },
  green: { id: 'green', name: { 'pt-BR': 'Verde', 'en-US': 'Green' }, classes: { 'pt-BR': 'Druida / Patrulheiro', 'en-US': 'Druid / Ranger' }, hex: '#4d8b34', resources: ['nature'] },
  black: { id: 'black', name: { 'pt-BR': 'Preto', 'en-US': 'Black' }, classes: { 'pt-BR': 'Necromante / Bruxo', 'en-US': 'Necromancer / Witch' }, hex: '#56545c', resources: ['souls'] },
  purple: { id: 'purple', name: { 'pt-BR': 'Roxo', 'en-US': 'Purple' }, classes: { 'pt-BR': 'Ladino / Assassino', 'en-US': 'Rogue / Assassin' }, hex: '#6b3eb6', resources: ['shadow'] },
  white: { id: 'white', name: { 'pt-BR': 'Bege', 'en-US': 'Beige' }, classes: { 'pt-BR': 'Clérigo / Paladino', 'en-US': 'Cleric / Champion' }, hex: '#c3a15a', resources: ['faith'] },
  silver: { id: 'silver', name: { 'pt-BR': 'Prata', 'en-US': 'Silver' }, classes: { 'pt-BR': 'Monge / Bardo', 'en-US': 'Monk / Bard' }, hex: '#97a1af', resources: ['focus'] },
  orange: { id: 'orange', name: { 'pt-BR': 'Recursos', 'en-US': 'Resources' }, classes: { 'pt-BR': 'Itens e utilitários', 'en-US': 'Items & utilities' }, hex: '#e07a2a', resources: ['gold'] },
  gear: { id: 'gear', name: { 'pt-BR': 'Equipamentos', 'en-US': 'Equipment' }, classes: { 'pt-BR': 'Armas, armaduras, acessórios', 'en-US': 'Weapons, armor, trinkets' }, hex: '#8a9098', resources: ['gold'] },
};

export const CLASS_COLORS: ColorId[] = ['red', 'blue', 'green', 'black', 'purple', 'white', 'silver'];

export const RESOURCES: Record<ResourceId, { id: ResourceId; name: L10n }> = {
  vigor: { id: 'vigor', name: { 'pt-BR': 'Vigor', 'en-US': 'Vigor' } },
  fury: { id: 'fury', name: { 'pt-BR': 'Fúria', 'en-US': 'Rage' } },
  mana: { id: 'mana', name: { 'pt-BR': 'Mana', 'en-US': 'Mana' } },
  nature: { id: 'nature', name: { 'pt-BR': 'Essência Natural', 'en-US': 'Natural Essence' } },
  souls: { id: 'souls', name: { 'pt-BR': 'Almas', 'en-US': 'Souls' } },
  shadow: { id: 'shadow', name: { 'pt-BR': 'Sombra', 'en-US': 'Shadow' } },
  faith: { id: 'faith', name: { 'pt-BR': 'Fé', 'en-US': 'Faith' } },
  focus: { id: 'focus', name: { 'pt-BR': 'Foco', 'en-US': 'Focus' } },
  gold: { id: 'gold', name: { 'pt-BR': 'Ouro', 'en-US': 'Gold' } },
};

export const RARITIES: Record<RarityId, { id: RarityId; name: L10n; color: string }> = {
  common: { id: 'common', name: { 'pt-BR': 'Comum', 'en-US': 'Common' }, color: '#e9e4dc' },
  uncommon: { id: 'uncommon', name: { 'pt-BR': 'Incomum', 'en-US': 'Uncommon' }, color: '#4aa3ff' },
  rare: { id: 'rare', name: { 'pt-BR': 'Rara', 'en-US': 'Rare' }, color: '#f2c440' },
  unique: { id: 'unique', name: { 'pt-BR': 'Única', 'en-US': 'Unique' }, color: '#ff6a1a' },
};
export const RARITY_ORDER: RarityId[] = ['common', 'uncommon', 'rare', 'unique'];

export const CARD_TYPES: { 'pt-BR': string; 'en-US': string }[] = [
  { 'pt-BR': 'Criatura', 'en-US': 'Creature' },
  { 'pt-BR': 'Ação', 'en-US': 'Action' },
  { 'pt-BR': 'Habilidade', 'en-US': 'Ability' },
  { 'pt-BR': 'Magia', 'en-US': 'Spell' },
  { 'pt-BR': 'Encantamento', 'en-US': 'Enchantment' },
  { 'pt-BR': 'Aliado', 'en-US': 'Ally' },
  { 'pt-BR': 'Mercenário', 'en-US': 'Mercenary' },
  { 'pt-BR': 'Recurso', 'en-US': 'Resource' },
  { 'pt-BR': 'Equipamento', 'en-US': 'Equipment' },
  { 'pt-BR': 'Arma', 'en-US': 'Weapon' },
  { 'pt-BR': 'Armadura', 'en-US': 'Armor' },
  { 'pt-BR': 'Relíquia', 'en-US': 'Relic' },
];

/** Regras de montagem de deck. */
export const DECK_SIZE = 50;
export const MAX_COPIES = 4;

export const colorHex = (id: ColorId) => COLORS[id]?.hex ?? '#b92d20';
