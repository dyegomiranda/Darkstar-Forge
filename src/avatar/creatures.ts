/**
 * Bonecos das criaturas do campo, montados com as mesmas peças dos heróis.
 * A criatura é reconhecida pelo ícone da unidade (o mesmo que a carta de invocação usa).
 * Animais, máquinas e construções vêm de folhas prontas (tools/sprites/montar.py).
 * Sem figura aqui, o campo mostra o ícone.
 */
import sheets from '../data/creatures.json';
import type { Anim, Avatar } from './lpc';

export interface Creature { avatar: Avatar; attack: Anim }
/** Criatura de folha pronta: tamanho do quadro, nº de quadros parado/atacando, velocidade. */
export interface SheetDef { cell: number[]; idle: number; attack: number; fps: number; scale?: number }
const SHEET = sheets as Record<string, SheetDef>;
/** Ícone da unidade → folha de quadros (animais, máquinas e construções). */
const SHEET_OF: Record<string, string> = { 'wolf-head': 'wolf', 'wolf-howl': 'wolf', 'bear-head': 'bear', 'magic-gate': 'tower', crossbow: 'ballista' };
export const sheetOf = (icon: string | undefined): { id: string; def: SheetDef } | undefined => {
  const id = icon ? SHEET_OF[icon] : undefined;
  return id && SHEET[id] ? { id, def: SHEET[id] } : undefined;
};
/** A unidade tem figura no campo (boneco de peças ou folha pronta)? */
export const hasFigure = (icon: string | undefined): boolean => !!icon && (icon in CREATURES || !!sheetOf(icon));

export const CREATURES: Record<string, Creature> = {
  // Esqueleto: ossos, espada e escudo
  'death-skull': {
    attack: 'slash',
    avatar: { body: 'male', skin: 'light', eyes: 'red', frame: 'skeleton', head: 'skeleton', parts: { shield: { id: 'shield_round', color: 'silver' }, weapon: { id: 'weapon_sword_arming', color: 'iron' } } },
  },
  // Demônio: pele rubra, chifres, asas e cauda
  'daemon-skull': {
    attack: 'slash',
    avatar: { body: 'muscular', skin: 'demon', eyes: 'yellow', parts: { horns: { id: 'head_horns_backwards' }, wings: { id: 'wings_lizard_bat' }, tail: { id: 'tail_lizard' }, legs: { id: 'legs_pants', color: 'black' } } },
  },
  // Elemental de pedra: gigante de rocha
  'rock-golem': {
    attack: 'slash',
    avatar: { body: 'muscular', skin: 'stone', eyes: 'orange', head: 'troll', parts: {} },
  },
  // Elemental de fogo: corpo em brasa e cabelo de chama
  'fire-silhouette': {
    attack: 'spellcast',
    avatar: { body: 'male', skin: 'ember', eyes: 'yellow', parts: { hair: { id: 'hair_spiked', color: 'flame' } } },
  },
};

export const creatureOf = (icon: string | undefined): Creature | undefined => (icon ? CREATURES[icon] : undefined);
