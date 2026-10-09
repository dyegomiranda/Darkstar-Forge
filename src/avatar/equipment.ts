import { GEAR } from '../game/gear';
import type { Card, Character, Slot } from '../model/types';
import { itemOf, type Avatar, type Part, type SlotId } from './lpc';

const part = (id: string, color?: string): Part => ({ id, ...(color ? { color } : {}) });
/** Identificadores reservados para as peças novas; a arte em produção continua sendo usada até sua aprovação. */
const slotOfGear: Record<string, SlotId> = {weapon:'weapon',offhand:'shield',head:'head',chest:'torso',hands:'hands',legs:'legs',feet:'feet',trinket:'neck',ring:'ring'};
export const EQUIPMENT_LOOKS: Record<string, Partial<Record<SlotId, Part>>> = Object.fromEntries(GEAR.map(g => [g.key,{[slotOfGear[g.slot]]:part('gear-'+g.key)}]));

// Não selecionar camadas vazias de uma prévia ainda não aprovada.
const legacyWeapons: Record<string,string> = {
 dagger:'weapon_sword_dagger',shortsword:'weapon_sword_arming',longsword:'weapon_sword_longsword',greatsword:'weapon_sword_longsword',katana:'weapon_sword_katana',rapier:'weapon_sword_rapier',
 mace:'weapon_blunt_mace',battleaxe:'weapon_blunt_waraxe',greataxe:'weapon_blunt_waraxe',spear:'weapon_polearm_spear',halberd:'weapon_polearm_halberd',
 sling:'weapon_ranged_slingshot',handcrossbow:'weapon_ranged_crossbow',heavycrossbow:'weapon_ranged_crossbow',shortbow:'weapon_ranged_bow_normal',longbow:'weapon_ranged_bow_great',
 wand:'weapon_magic_simple',staff:'weapon_magic_crystal',druidstaff:'weapon_magic_gnarled',skullstaff:'weapon_magic_gnarled',handwraps:'arms_gloves',
};
function availableLook(key:string):Partial<Record<SlotId,Part>> {
 const g=GEAR.find(g=>g.key===key); if(!g) return {};
 const look=EQUIPMENT_LOOKS[key];
 if(Object.entries(look).every(([slot,p])=>itemOf(slot as SlotId,p?.id)?.layers.length)) return look;
 let slot=slotOfGear[g.slot];
 const id=g.slot==='weapon' ? legacyWeapons[key]??'weapon_magic_simple' : g.slot==='chest' ? /plate|breastplate/.test(key)?'torso_armour_plate':/chain/.test(key)?'torso_chainmail':/robe|vest/.test(key)?'torso_clothes_robe':'torso_armour_leather' : g.slot==='head' ? /hood/.test(key)?'hat_hood_cloth':/wizard|circlet/.test(key)?'hat_magic_wizard':'hat_helmet_nasal' : g.slot==='legs' ? key==='greaves'?'legs_armour':'legs_pants' : g.slot==='feet' ? key==='ironboots'?'feet_armour':'feet_boots_basic' : g.slot==='hands' ? 'arms_gloves' : g.slot==='offhand' ? 'shield_round' : g.slot==='trinket' ? 'neck_amulet_star' : 'arms_hands_ring_stud';
 if(key==='handwraps'||g.slot==='ring') slot='hands';
 return itemOf(slot,id)?.layers.length ? {[slot]:part(id)} : {};
}

export const VISUAL_SLOTS: Record<string, SlotId[]> = {
  weapon: ['weapon', 'hands'], offhand: ['shield','weapon','offhand'], head: ['head', 'visor', 'face', 'crest'],
  chest: ['torso', 'arms', 'shoulders', 'cape', 'belt', 'back'], hands: ['hands'],
  legs: ['legs'], feet: ['feet'], amulet: ['neck'], ring: ['ring','ring2','hands'],
};
const BIOLOGY: SlotId[] = ['hair', 'beard', 'mustache', 'eyebrows', 'eyes', 'nose', 'ears', 'horns', 'wings', 'tail'];
export function equipmentLook(card: Card): Partial<Record<SlotId, Part>> {
  if (card.gear?.appearance) return card.gear.appearance;
  const official = EQUIPMENT_LOOKS[card.id.replace(/^eq-/, '')];
  if (official) return availableLook(card.id.replace(/^eq-/, ''));
  const named = GEAR.find(g => g.name.includes(card.text['en-US'].name) || g.name.includes(card.text['pt-BR'].name));
  if (named) return availableLook(named.key);
  const icon = GEAR.find(g => g.icon === card.art.icon);
  if (icon) return availableLook(icon.key);
  const tag = card.tags.find(t => ['weapon','offhand','head','chest','hands','legs','feet','amulet','ring'].includes(t));
  const fallback = {weapon:card.gear?.weapon?.via === 'magic'?'staff':card.gear?.weapon?.via === 'ranged'?'shortbow':'shortsword',offhand:'shield',head:'ironhelm',chest:'leather',hands:'gauntlets',legs:'leatherpants',feet:'travelboots',amulet:'healthamulet',ring:'protectionring'}[tag ?? ''];
  return fallback ? availableLook(fallback) : {};
}
/** Não altera a aparência salva. No modo equipado, espaços vazios não herdam roupas cosméticas. */
export function avatarForCharacter(hero: Character | undefined, cards: Record<string, Card>): Avatar | undefined {
  const av = hero?.avatar;
  if (!hero || !av || !hero.showEquipped) return av;
  const parts: Avatar['parts'] = {};
  for (const slot of BIOLOGY) if (av.parts[slot]) parts[slot] = { ...av.parts[slot]! };
  const two = cards[hero.slots.mainHand ?? '']?.gear?.weapon?.hands === 2;
  const order: Slot[] = ['chest', 'legs', 'feet', 'head', 'amulet', 'ring1', 'ring2', 'hands', 'offHand', 'mainHand'];
  for (const equipped of order) {
    if (two && equipped === 'offHand') continue;
    const card = cards[hero.slots[equipped] ?? ''];
    if (!card?.gear) continue;
    const tag = { mainHand: 'weapon', offHand: 'offhand', chest: 'chest', legs: 'legs', feet: 'feet', head: 'head', amulet: 'amulet', ring1: 'ring', ring2: 'ring', hands: 'hands' }[equipped];
    for (const [slot, look] of Object.entries(equipmentLook(card)) as [SlotId, Part][]) {
      if (!VISUAL_SLOTS[tag]?.includes(slot)) continue;
      const target = equipped === 'ring2' && slot === 'ring' ? 'ring2' : equipped === 'offHand' && slot === 'weapon' ? 'offhand' : slot;
      if (itemOf(target, look.id)?.bodies.includes(av.body)) parts[target] = { ...look };
    }
  }
  return { ...av, parts };
}
