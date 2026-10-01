/** Bonecos dos 4 heróis prontos (o jogador pode mudar tudo no criador). */
import type { Avatar } from './lpc';

export const PRESET_AVATARS: Record<string, Avatar> = {
  brunhild: {
    body: 'female', skin: 'light', eyes: 'blue',
    parts: {
      hair: { id: 'hair_braid', color: 'redhead' }, head: { id: 'hat_helmet_barbarian_viking', color: 'iron' }, torso: { id: 'torso_chainmail', color: 'iron' },
      shoulders: { id: 'shoulders_pauldrons', color: 'iron' }, legs: { id: 'legs_armour', color: 'iron' }, feet: { id: 'feet_armour', color: 'iron' },
      cape: { id: 'cape_tattered', color: 'maroon' }, weapon: { id: 'weapon_blunt_waraxe' },
    },
  },
  kael: {
    body: 'male', skin: 'amber', eyes: 'blue',
    parts: {
      hair: { id: 'hair_parted', color: 'dark_brown' }, torso: { id: 'torso_clothes_longsleeve', color: 'blue' }, cape: { id: 'cape_solid', color: 'navy' },
      legs: { id: 'legs_pants', color: 'navy' }, feet: { id: 'feet_boots_basic', color: 'brown' }, arms: { id: 'arms_gloves', color: 'leather' },
      weapon: { id: 'weapon_magic_crystal', color: 'blue' },
    },
  },
  lyra: {
    body: 'female', skin: 'olive', eyes: 'green',
    parts: {
      hair: { id: 'hair_long', color: 'blonde' }, head: { id: 'hat_hood_cloth', color: 'forest' }, torso: { id: 'torso_armour_leather', color: 'leather' },
      legs: { id: 'legs_leggings', color: 'forest' }, feet: { id: 'feet_boots_fold', color: 'leather' }, arms: { id: 'arms_gloves', color: 'leather' },
      cape: { id: 'cape_solid', color: 'forest' }, weapon: { id: 'weapon_ranged_bow_normal', color: 'medium' },
    },
  },
  morgana: {
    body: 'female', skin: 'light', eyes: 'purple',
    parts: {
      hair: { id: 'hair_long_straight', color: 'purple' }, head: { id: 'hat_hood_cloth', color: 'black' }, torso: { id: 'torso_clothes_robe', color: 'black' },
      feet: { id: 'feet_boots_basic', color: 'black' }, cape: { id: 'cape_tattered', color: 'black' }, weapon: { id: 'weapon_sword_katana' },
    },
  },
};
