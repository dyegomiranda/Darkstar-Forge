/**
 * Conjuntos de armadura e de roupa: um clique veste o herói inteiro (elmo, tronco,
 * braços, pernas, pés, ombros, capa…). São as peças do acervo combinadas com os
 * metais e tecidos próprios do jogo (ébano, daédrico, da noite, mithril, celestial…).
 * Depois de vestir, cada peça continua editável na sua categoria.
 */
import { itemOf, type Avatar, type Part, type SlotId } from './lpc';

export interface GearSet { id: string; pt: string; en: string; info: [string, string]; parts: Partial<Record<SlotId, Part | null>> }

/** Armadura de placas completa num metal, com o feitio do conjunto em cada peça (espinhos, runa, escamas, friso…). */
const plate = (metal: string, helm: string, style: string, extra: Partial<Record<SlotId, Part | null>> = {}): Partial<Record<SlotId, Part | null>> => ({
  head: { id: helm, color: metal, style }, torso: { id: 'torso_armour_plate', color: metal, style }, arms: { id: 'arms_armour', color: metal, style }, hands: { id: 'arms_gloves', color: metal, style },
  shoulders: { id: 'shoulders_legion', color: metal, style }, legs: { id: 'legs_armour', color: metal, style }, feet: { id: 'feet_armour', color: metal, style },
  crest: null, visor: null, face: null, belt: null, neck: null, ...extra,
});

export const SETS: GearSet[] = [
  { id: 'daedric', pt: 'Daédrico', en: 'Daedric', info: ['placas negras com veios de brasa, elmo de chifres', 'black plate veined with ember, horned helm'],
    parts: plate('daedric', 'hat_helmet_horned', 'daedric', { crest: { id: 'hat_accessory_horns_upward', color: 'daedric' }, visor: { id: 'hat_visor_horned', color: 'daedric' }, cape: { id: 'cape_tattered', color: 'crimson' } }) },
  { id: 'ebony', pt: 'Ébano', en: 'Ebony', info: ['placas de ébano e grande elmo fechado', 'ebony plate and a closed great helm'],
    parts: plate('ebony', 'hat_helmet_greathelm', 'ebony', { cape: { id: 'cape_solid', color: 'void' } }) },
  { id: 'night', pt: 'Sombra da noite', en: 'Nightshade', info: ['couro negro, capuz, máscara e capa: feito para não ser visto', 'black leather, hood, mask and cape: made not to be seen'],
    parts: { head: { id: 'hat_hood_cloth', color: 'void' }, face: { id: 'facial_mask_plain', color: 'black' }, torso: { id: 'torso_armour_leather', color: 'black' }, arms: null, hands: { id: 'arms_gloves', color: 'night' },
      shoulders: null, legs: { id: 'legs_leggings', color: 'void' }, feet: { id: 'feet_boots_fold', color: 'void' }, cape: { id: 'cape_solid', color: 'midnight' }, crest: null, visor: null, belt: { id: 'belt_leather', color: 'charcoal' } } },
  { id: 'celestial', pt: 'Celestial', en: 'Celestial', info: ['placas de ouro claro e elmo alado', 'pale gold plate and a winged helm'],
    parts: plate('celestial', 'hat_helmet_armet', 'celestial', { crest: { id: 'hat_accessory_wings', color: 'celestial' }, cape: { id: 'cape_trim', color: 'ivory' } }) },
  { id: 'mithril', pt: 'Mithril élfico', en: 'Elven mithril', info: ['malha leve azul-prateada e capa verde', 'light silver-blue mail and a green cape'],
    parts: { head: { id: 'hat_helmet_pointed', color: 'mithril' }, torso: { id: 'torso_chainmail', color: 'mithril' }, arms: { id: 'arms_bracers', color: 'mithril' }, hands: { id: 'arms_gloves', color: 'mithril' }, shoulders: { id: 'shoulders_legion', color: 'mithril' },
      legs: { id: 'legs_armour', color: 'mithril' }, feet: { id: 'feet_armour', color: 'mithril' }, cape: { id: 'cape_solid', color: 'emerald' }, crest: null, visor: null, face: null } },
  { id: 'dragon', pt: 'Sangue de dragão', en: 'Dragonblood', info: ['placas rubras e chifres curvados para baixo', 'crimson plate and downward horns'],
    parts: plate('blood', 'hat_helmet_barbuta', 'dragon', { crest: { id: 'hat_accessory_horns_downward', color: 'blood' }, cape: { id: 'cape_tattered', color: 'void' } }) },
  { id: 'frost', pt: 'Guardião do gelo', en: 'Frost warden', info: ['placas de gelo azul e elmo fechado', 'blue ice plate and a closed helm'],
    parts: plate('frost', 'hat_helmet_sugarloaf', 'frost', { crest: { id: 'hat_accessory_crest', color: 'frost' }, cape: { id: 'cape_solid', color: 'sky' } }) },
  { id: 'paladin', pt: 'Paladino', en: 'Paladin', info: ['placas douradas, penacho e capa branca', 'golden plate, plume and a white cape'],
    parts: plate('gold', 'hat_helmet_xeon', 'paladin', { crest: { id: 'hat_accessory_plumage', color: 'white' }, cape: { id: 'cape_trim', color: 'white' } }) },
  { id: 'bone', pt: 'Senhor dos ossos', en: 'Bone lord', info: ['placas cor de osso e capa em farrapos', 'bone-coloured plate and a tattered cape'],
    parts: plate('bone', 'hat_helmet_bascinet', 'bone', { visor: { id: 'hat_visor_grated', color: 'bone' }, cape: { id: 'cape_tattered', color: 'void' } }) },
  { id: 'amethyst', pt: 'Cavaleiro do vazio', en: 'Void knight', info: ['placas de ametista e chifres curtos', 'amethyst plate and short horns'],
    parts: plate('amethyst', 'hat_helmet_close', 'amethyst', { crest: { id: 'hat_accessory_horns_short', color: 'amethyst' }, cape: { id: 'cape_solid', color: 'royal' } }) },
  { id: 'legion', pt: 'Legionário', en: 'Legionary', info: ['armadura de legião em bronze, com crista vermelha', 'bronze legion armour with a red crest'],
    parts: { head: { id: 'hat_helmet_legion', color: 'bronze' }, crest: { id: 'hat_accessory_plumage_legion', color: 'red' }, torso: { id: 'torso_armour_legion', color: 'bronze' }, shoulders: { id: 'shoulders_legion', color: 'bronze' },
      arms: { id: 'arms_bracers', color: 'bronze' }, hands: null, legs: { id: 'legs_skirts_legion', color: 'maroon' }, feet: { id: 'feet_sandals', color: 'leather' }, cape: { id: 'cape_solid', color: 'red' }, visor: null, face: null } },
  { id: 'barbarian', pt: 'Bárbaro do norte', en: 'Northern barbarian', info: ['elmo nórdico, faixas no peito e manto de pele', 'nordic helm, chest wraps and a fur mantle'],
    parts: { head: { id: 'hat_helmet_spangenhelm_viking', color: 'iron' }, torso: { id: 'torso_bandages', color: 'white' }, shoulders: { id: 'shoulders_mantal', color: 'walnut' }, arms: { id: 'arms_bracers', color: 'iron' }, hands: null,
      legs: { id: 'legs_pantaloons', color: 'walnut' }, feet: { id: 'feet_boots_rim', color: 'brown' }, cape: null, crest: null, visor: null, face: null, belt: { id: 'belt_leather', color: 'brown' } } },
  { id: 'hunter', pt: 'Caçador', en: 'Hunter', info: ['capuz, couro e aljava', 'hood, leather and a quiver'],
    parts: { head: { id: 'hat_hood_cloth', color: 'forest' }, torso: { id: 'torso_armour_leather', color: 'leather' }, arms: null, hands: { id: 'arms_gloves', color: 'bronze' }, shoulders: null,
      legs: { id: 'legs_leggings', color: 'forest' }, feet: { id: 'feet_boots_fold', color: 'leather' }, cape: { id: 'cape_solid', color: 'forest' }, back: { id: 'quiver' }, crest: null, visor: null, face: null } },
  { id: 'archmage', pt: 'Arquimago', en: 'Archmage', info: ['chapéu pontudo, veste e capa de púrpura real', 'pointed hat, garment and a royal purple cape'],
    parts: { head: { id: 'hat_magic_wizard', color: 'base_black' }, torso: { id: 'torso_clothes_longsleeve', color: 'royal' }, arms: null, hands: null, shoulders: { id: 'shoulders_mantal', color: 'midnight' },
      legs: { id: 'legs_skirts_plain', color: 'royal' }, feet: { id: 'feet_shoes_basic', color: 'void' }, cape: { id: 'cape_trim', color: 'royal' }, crest: null, visor: null, face: null, neck: { id: 'neck_amulet_star' } } },
];

/**
 * Peças vestidas antes de os conjuntos terem feitio próprio: a peça que é igual (modelo e cor)
 * à de um conjunto com feitio ganha esse feitio. Devolve se mudou algo.
 */
export function adoptStyles(av: Avatar): boolean {
  let changed = false;
  for (const [slot, part] of Object.entries(av.parts) as [SlotId, Part][]) {
    if (!part || part.style) continue;
    const same = SETS.map((s) => s.parts[slot]).find((p) => p?.style && p.id === part.id && p.color === part.color);
    if (same) { part.style = same.style; changed = true; }
  }
  // e a peça do mesmo modelo de um conjunto que o herói já veste em outras partes (só a cor foi trocada)
  const worn = new Map<string, number>();
  for (const p of Object.values(av.parts)) if (p?.style) worn.set(p.style, (worn.get(p.style) ?? 0) + 1);
  for (const [slot, part] of Object.entries(av.parts) as [SlotId, Part][]) {
    if (!part || part.style) continue;
    const set = SETS.find((s) => { const p = s.parts[slot]; return p?.style && p.id === part.id && (worn.get(p.style) ?? 0) >= 2; });
    if (set) { part.style = set.parts[slot]!.style; changed = true; }
  }
  return changed;
}

/** Veste o conjunto: troca só as peças que ele define e que existem para o corpo do herói. */
export function wearSet(av: Avatar, set: GearSet): Avatar {
  const a = JSON.parse(JSON.stringify(av)) as Avatar;
  for (const [slot, part] of Object.entries(set.parts) as [SlotId, Part | null][]) {
    if (!part) { delete a.parts[slot]; continue; }
    const it = itemOf(slot, part.id);
    if (it?.bodies.includes(a.body)) a.parts[slot] = { ...part };
  }
  return a;
}
/** O herói está vestindo o conjunto inteiro? */
export function wearing(av: Avatar, set: GearSet): boolean {
  return (Object.entries(set.parts) as [SlotId, Part | null][]).every(([slot, part]) => {
    if (!part) return !av.parts[slot];
    const it = itemOf(slot, part.id);
    return !it?.bodies.includes(av.body) || (av.parts[slot]?.id === part.id && av.parts[slot]?.color === part.color && av.parts[slot]?.style === part.style);
  });
}
