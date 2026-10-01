/**
 * Bonecos das criaturas do campo, montados com as mesmas peças dos heróis.
 * A criatura é reconhecida pelo ícone da unidade (o mesmo que a carta de invocação usa).
 * Sem boneco aqui, o campo mostra o ícone.
 */
import type { Anim, Avatar } from './lpc';

export interface Creature { avatar: Avatar; attack: Anim }

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
