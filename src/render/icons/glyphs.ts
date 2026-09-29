/**
 * Quais símbolos existem e para que servem. Os desenhos vêm de game-icons.net
 * (game-icons.ts); aqui ficam os nomes em português, as cores padrão e as
 * opções por uso (custo de cada recurso, classe de cada deck, ATK, DEF).
 */
import type { ColorId, ResourceId } from '../../model/types';
import { CHOICES, ICONS } from './game-icons';

export { ICONS };

/** Nome legível de cada símbolo (interface). */
export const ICON_NAMES: Record<string, string> = {
  'mailed-fist': 'Manopla', fist: 'Punho', 'heart-beats': 'Coração pulsante',
  'small-fire': 'Chama', 'burning-embers': 'Brasas', 'flame-spin': 'Espiral de fogo',
  'floating-crystal': 'Cristal flutuante', 'crystal-growth': 'Drusa de cristal', crystalize: 'Gota cristalina', 'crystal-shine': 'Cristal radiante',
  'linden-leaf': 'Folha', 'oak-leaf': 'Folha de carvalho', sprout: 'Broto', 'vine-leaf': 'Folha de videira',
  spectre: 'Espectro', soul: 'Alma', 'soul-vessel': 'Receptáculo de alma',
  moon: 'Lua', hood: 'Capuz', 'concentric-crescents': 'Crescentes',
  sun: 'Sol', 'heraldic-sun': 'Sol heráldico', 'holy-symbol': 'Símbolo sagrado', 'holy-grail': 'Graal',
  'sheikah-eye': 'Olho místico', 'templar-eye': 'Olho templário', 'all-seeing-eye': 'Olho que tudo vê', meditation: 'Meditação',
  'two-coins': 'Moedas', 'crown-coin': 'Moeda coroada',
  'axe-sword': 'Machado e espada', 'crossed-axes': 'Machados cruzados', 'battle-axe': 'Machado de batalha', 'brutal-helm': 'Elmo brutal', 'swords-emblem': 'Brasão de espadas',
  'spell-book': 'Grimório', 'pointy-hat': 'Chapéu de mago', 'wizard-staff': 'Cajado', 'crystal-ball': 'Bola de cristal', 'book-aura': 'Livro arcano',
  'stag-head': 'Cervo', oak: 'Carvalho', 'holy-oak': 'Carvalho sagrado', 'wolf-head': 'Lobo', 'bow-arrow': 'Arco e flecha',
  'dread-skull': 'Caveira sinistra', 'horned-skull': 'Caveira chifruda', 'skull-staff': 'Cajado de caveira', 'pentagram-rose': 'Pentagrama', 'crowned-skull': 'Caveira coroada',
  'cloak-dagger': 'Capa e adaga', 'sacrificial-dagger': 'Adaga ritual', 'hooded-assassin': 'Assassino', 'dagger-rose': 'Adaga e rosa',
  'templar-shield': 'Escudo templário', 'jeweled-chalice': 'Cálice', 'winged-scepter': 'Cetro alado', 'angel-wings': 'Asas de anjo',
  lotus: 'Lótus', lyre: 'Lira', harp: 'Harpa',
  'round-potion': 'Poção', 'health-potion': 'Poção de vida', 'standing-potion': 'Frasco', 'tied-scroll': 'Pergaminho',
  'visored-helm': 'Elmo com viseira', anvil: 'Bigorna', 'spartan-helmet': 'Elmo espartano', 'black-knight-helm': 'Elmo de cavaleiro',
  broadsword: 'Espada larga', 'crossed-swords': 'Espadas cruzadas', 'triple-claws': 'Garras', 'spinning-sword': 'Lâmina giratória', 'claw-slashes': 'Arranhões',
  'rosa-shield': 'Escudo estrelado', 'edged-shield': 'Escudo com cruz', 'heart-shield': 'Escudo com coração', 'viking-shield': 'Escudo redondo', 'bordered-shield': 'Escudo bordado', 'heart-drop': 'Vida',
};

/** Cor padrão do símbolo de cada recurso. */
export const RESOURCE_COLORS: Record<ResourceId, string> = {
  vigor: '#d9563f', fury: '#ff7a1a', mana: '#4a93ff', nature: '#5fb24a', souls: '#a88bff',
  shadow: '#9a6bff', faith: '#f0c850', focus: '#dfe8f5', gold: '#eab83c',
};

export const STEEL = '#d3dae3';

export const resourceChoices = (r: string): string[] => CHOICES[`res:${r}`] ?? [];
export const classChoices = (c: ColorId | string): string[] => CHOICES[`cls:${c}`] ?? CHOICES['cls:gear'];
export const ATK_CHOICES = CHOICES.atk;
export const DEF_CHOICES = CHOICES.def;

/** Símbolo padrão de um recurso, de um deck, do ataque e da defesa. */
export const resourceIcon = (r: string): string | undefined => resourceChoices(r)[0];
export const classIcon = (c: string): string => classChoices(c)[0];
export const ATK_ICON = ATK_CHOICES[0];
export const DEF_ICON = DEF_CHOICES[0];

export const RESOURCE_IDS = Object.keys(RESOURCE_COLORS) as ResourceId[];
export const isResource = (id: string): id is ResourceId => id in RESOURCE_COLORS;
