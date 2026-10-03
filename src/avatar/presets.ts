/** Bonecos dos 7 heróis prontos (o jogador pode mudar tudo no criador). */
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
      legs: { id: 'legs_pants', color: 'navy' }, feet: { id: 'feet_boots_basic', color: 'brown' }, hands: { id: 'arms_gloves', color: 'leather' },
      weapon: { id: 'weapon_magic_crystal', color: 'blue' },
    },
  },
  lyra: {
    body: 'female', skin: 'olive', eyes: 'green',
    parts: {
      hair: { id: 'hair_long', color: 'blonde' }, head: { id: 'hat_hood_cloth', color: 'forest' }, torso: { id: 'torso_armour_leather', color: 'leather' },
      legs: { id: 'legs_leggings', color: 'forest' }, feet: { id: 'feet_boots_fold', color: 'leather' }, hands: { id: 'arms_gloves', color: 'leather' },
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
  vex: {
    body: 'female', skin: 'olive', eyes: 'violet',
    parts: {
      hair: { id: 'hair_bob', color: 'black' }, head: { id: 'hat_hood_cloth', color: 'void' }, face: { id: 'facial_mask_plain', color: 'black' },
      torso: { id: 'torso_armour_leather', color: 'black' }, legs: { id: 'legs_leggings', color: 'purple' }, feet: { id: 'feet_boots_fold', color: 'black' },
      hands: { id: 'arms_gloves', color: 'night' }, belt: { id: 'belt_leather', color: 'charcoal' }, cape: { id: 'cape_tattered', color: 'royal' }, weapon: { id: 'weapon_sword_dagger' },
    },
  },
  aldric: {
    body: 'male', skin: 'light', eyes: 'light_brown',
    parts: {
      hair: { id: 'hair_plain', color: 'blonde' }, beard: { id: 'beards_trimmed', color: 'blonde' }, torso: { id: 'torso_armour_plate', color: 'gold' },
      shoulders: { id: 'shoulders_legion', color: 'gold' }, arms: { id: 'arms_armour', color: 'gold' }, hands: { id: 'arms_gloves', color: 'gold' },
      legs: { id: 'legs_armour', color: 'gold' }, feet: { id: 'feet_armour', color: 'gold' }, cape: { id: 'cape_trim', color: 'white' },
      shield: { id: 'shield_crusader' }, weapon: { id: 'weapon_sword_longsword' },
    },
  },
  ren: {
    body: 'male', skin: 'amber', eyes: 'dark_brown',
    parts: {
      hair: { id: 'hair_buzzcut', color: 'black' }, torso: { id: 'torso_clothes_sleeveless', color: 'charcoal' }, belt: { id: 'belt_obi', color: 'black' },
      legs: { id: 'legs_pantaloons', color: 'gray' }, feet: { id: 'feet_sandals', color: 'leather' }, hands: { id: 'arms_gloves', color: 'leather' },
    },
  },
};
