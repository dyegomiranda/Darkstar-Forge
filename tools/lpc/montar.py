#!/usr/bin/env python3
"""
Separa do "Universal LPC Spritesheet Character Generator" as peças que o criador de
heróis do Void Sun usa, copia só as animações necessárias para public/lpc/ e
escreve o catálogo (src/data/lpc.json) e os créditos (src/data/lpc-credits.json).

Uso: python3 tools/lpc/montar.py [pasta do gerador LPC]   (padrão: ~/Projetos/lpc-generator)
As artes são de vários autores (CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0): ver os créditos.
"""
import json, os, shutil, sys
from PIL import Image

SRC = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Projetos/lpc-generator')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'lpc')
ANIMS = ['idle', 'walk', 'slash', 'thrust', 'shoot', 'spellcast', 'hurt']
CUSTOM = {'slash_128': ('slash', 128), 'slash_oversize': ('slash', 192), 'thrust_oversize': ('thrust', 192), 'thrust_128': ('thrust', 128), 'walk_128': ('walk', 128)}
BODIES = ['male', 'female', 'muscular']
D = 'sheet_definitions/'

# (grupo, [(arquivo de definição, nome PT, nome EN, extras)])
SLOTS = [
  ('hair', 'Cabelo', 'Hair', True, [
    ('hair/long/hair_long', 'Longo', 'Long'), ('hair/long/hair_long_straight', 'Longo liso', 'Long straight'), ('hair/long/hair_wavy', 'Ondulado', 'Wavy'),
    ('hair/long/hair_bangslong', 'Longo com franja', 'Long with bangs'), ('hair/xlong/hair_xlong', 'Muito longo', 'Extra long'),
    ('hair/braids/hair_ponytail', 'Rabo de cavalo', 'Ponytail'), ('hair/braids/hair_high_ponytail', 'Rabo alto', 'High ponytail'), ('hair/braids/hair_braid', 'Trança', 'Braid'),
    ('hair/braids/hair_topknot_long', 'Coque samurai', 'Topknot'), ('hair/bob/hair_bob', 'Chanel', 'Bob'),
    ('hair/short/hair_plain', 'Curto', 'Short'), ('hair/short/hair_messy1', 'Bagunçado', 'Messy'), ('hair/short/hair_parted', 'Repartido', 'Parted'),
    ('hair/short/hair_swoop', 'Topete', 'Swoop'), ('hair/short/hair_pixie', 'Joãozinho', 'Pixie'), ('hair/spiky/hair_spiked', 'Espetado', 'Spiked'),
    ('hair/curly/hair_curly_long', 'Cacheado longo', 'Curly long'), ('hair/curly/hair_curly_short', 'Cacheado curto', 'Curly short'),
    ('hair/afro/hair_afro', 'Afro', 'Afro'), ('hair/afro/hair_dreadlocks_long', 'Dreads', 'Dreadlocks'),
    ('hair/bald/hair_buzzcut', 'Raspado', 'Buzzcut'), ('hair/short/hair_mop', 'Tigela', 'Mop'), ('hair/short/hair_bedhead', 'Despenteado', 'Bedhead'),
    ('hair/bald/hair_longhawk', 'Moicano', 'Mohawk'), ('hair/pigtails/hair_pigtails', 'Maria-chiquinha', 'Pigtails'), ('hair/long/hair_princess', 'Princesa', 'Princess'),
    ('hair/bob/hair_lob', 'Chanel longo', 'Long bob'), ('hair/long/hair_long_messy', 'Longo revolto', 'Long messy'), ('hair/short/hair_cowlick', 'Redemoinho', 'Cowlick'),
  ]),
  ('beard', 'Barba', 'Beard', True, [
    ('hair/beards/beards_5oclock_shadow', 'Por fazer', 'Stubble', {'alpha': 0.45}), ('hair/beards/beards_trimmed', 'Aparada', 'Trimmed'),
    ('hair/beards/beards_medium', 'Média', 'Medium'), ('hair/beards/beards_beard', 'Cheia', 'Full'), ('hair/beards/beards_winter', 'Longa', 'Long'),
  ]),
  ('mustache', 'Bigode', 'Mustache', True, [
    ('hair/mustaches/beards_mustache', 'Simples', 'Basic'), ('hair/mustaches/beards_chevron', 'Cheio', 'Chevron'), ('hair/mustaches/beards_handlebar', 'De pontas', 'Handlebar'),
    ('hair/mustaches/beards_horseshoe', 'Ferradura', 'Horseshoe'), ('hair/mustaches/beards_walrus', 'Morsa', 'Walrus'), ('hair/mustaches/beards_french', 'Francês', 'French'),
    ('hair/mustaches/beards_bigstache', 'Grande', 'Big'), ('hair/mustaches/beards_lampshade', 'Reto', 'Lampshade'),
  ]),
  ('eyebrows', 'Sobrancelhas', 'Eyebrows', True, [
    ('head/eyebrows/eyebrows_thin', 'Finas', 'Thin'), ('head/eyebrows/eyebrows_thick', 'Grossas', 'Thick'),
  ]),
  ('eyes', 'Olho especial', 'Special eye', True, [
    ('head/eyes/eyes_cyclops', 'Ciclope', 'Cyclops'), ('head/eyes/eyes_cyclops2', 'Ciclope de olho grande', 'Big-eyed cyclops'),
  ]),
  ('nose', 'Nariz', 'Nose', True, [
    ('head/nose/head_nose_button', 'Pequeno', 'Button'), ('head/nose/head_nose_straight', 'Reto', 'Straight'), ('head/nose/head_nose_large', 'Largo', 'Large'),
    ('head/nose/head_nose_big', 'Grande', 'Big'), ('head/nose/head_nose_elderly', 'Marcado', 'Elderly'),
  ]),
  ('ears', 'Orelhas', 'Ears', True, [
    ('head/ears/head_ears_elven', 'Élficas', 'Elven'), ('head/ears/head_ears_long', 'Longas', 'Long'), ('head/ears/head_ears_medium', 'Pontudas', 'Pointed'),
    ('head/ears/head_ears_big', 'Grandes', 'Big'), ('head/ears/head_ears_down', 'Caídas', 'Drooping'), ('head/ears/head_ears_hang', 'Pendentes', 'Hanging'),
    ('head/ears/head_ears_dragon', 'De dragão', 'Dragon'), ('head/furry_ears/top/head_ears_cat_skin', 'De gato', 'Cat'), ('head/furry_ears/top/head_ears_wolf_skin', 'De lobo', 'Wolf'),
  ]),
  ('torso', 'Tronco', 'Torso', True, [
    ('torso/shirts/shortsleeve/torso_clothes_tshirt', 'Camiseta', 'T-shirt'), ('torso/shirts/shortsleeve/torso_clothes_tshirt_vneck', 'Camiseta gola V', 'V-neck T-shirt'),
    ('torso/shirts/shortsleeve/torso_clothes_shortsleeve', 'Camisa de manga curta', 'Short-sleeve shirt'),
    ('torso/shirts/longsleeve/torso_clothes_longsleeve', 'Camisa de manga longa', 'Long-sleeve shirt'), ('torso/shirts/longsleeve/torso_clothes_longsleeve_laced', 'Camisa de cordão', 'Laced shirt'),
    ('torso/shirts/sleeveless/torso_clothes_sleeveless', 'Camisa sem manga', 'Sleeveless shirt'), ('torso/shirts/sleeveless/torso_clothes_sleeveless_laced', 'Regata de cordão', 'Laced sleeveless'),
    ('torso/shirts/torso_clothes_tunic', 'Túnica', 'Tunic'), ('torso/shirts/torso_clothes_tunic_sara', 'Túnica curta', 'Short tunic'), ('torso/shirts/torso_clothes_blouse', 'Blusa', 'Blouse'),
    ('torso/shirts/torso_clothes_blouse_longsleeve', 'Blusa de manga longa', 'Long-sleeve blouse'), ('torso/shirts/torso_clothes_corset', 'Corpete', 'Corset'),
    ('torso/shirts/torso_clothes_robe', 'Manto', 'Robe'), ('torso/dresses/kimono/dress_kimono', 'Quimono', 'Kimono'), ('torso/dresses/kimono/dress_kimono_longsleeve', 'Quimono de manga longa', 'Long-sleeve kimono'),
    ('torso/dresses/dress_slit', 'Vestido aberto', 'Slit dress'), ('torso/dresses/dress_sash', 'Vestido com faixa', 'Sash dress'), ('torso/dresses/dress_bodice', 'Vestido de corpete', 'Bodice dress'),
    ('torso/vest/torso_clothes_vest', 'Colete', 'Vest'), ('torso/vest/torso_clothes_vest_open', 'Colete aberto', 'Open vest'),
    ('torso/jacket/torso_jacket_tabard', 'Tabardo', 'Tabard'), ('torso/jacket/torso_jacket_frock', 'Casaca', 'Frock coat'), ('torso/jacket/torso_jacket_collared', 'Casaco de gola', 'Collared coat'),
    ('torso/jacket/torso_jacket_trench', 'Sobretudo', 'Trench coat'), ('torso/jacket/torso_jacket_iverness', 'Capote', 'Inverness cloak'),
    ('torso/torso_bandages', 'Faixas', 'Bandages'),
    ('torso/armour/torso_armour_leather', 'Armadura de couro', 'Leather armor'),
    ('torso/torso_chainmail', 'Cota de malha', 'Chain mail'), ('torso/armour/torso_armour_legion', 'Armadura de legionário', 'Legion armor'),
    ('torso/armour/torso_armour_plate', 'Armadura de placas', 'Plate armor'),
  ]),
  ('legs', 'Pernas', 'Legs', True, [
    ('legs/pants/legs_pants', 'Calça', 'Pants'), ('legs/pants/legs_pants2', 'Calça reta', 'Straight pants'), ('legs/pants/legs_cuffed', 'Calça dobrada', 'Cuffed pants'),
    ('legs/pants/legs_widepants', 'Calça larga', 'Wide pants'), ('legs/pants/legs_pantaloons', 'Calção bufante', 'Pantaloons'), ('legs/pants/legs_formal', 'Calça social', 'Formal pants'),
    ('legs/leggings/legs_leggings', 'Calça justa', 'Leggings'), ('legs/leggings/legs_hose', 'Meia-calça', 'Hose'),
    ('legs/shorts/legs_shorts', 'Bermuda', 'Shorts'), ('legs/shorts/legs_shorts_short', 'Short', 'Short shorts'),
    ('legs/skirts/legs_skirts_plain', 'Saia', 'Skirt'), ('legs/skirts/legs_skirts_slit', 'Saia aberta', 'Slit skirt'), ('legs/skirts/legs_skirt_straight', 'Saia reta', 'Straight skirt'),
    ('legs/skirts/legs_skirt_belle', 'Saia rodada', 'Belle skirt'), ('legs/skirts/legs_skirt_overskirt', 'Sobressaia', 'Overskirt'), ('legs/skirts/legs_skirts_legion', 'Saiote de legionário', 'Legion skirt'),
    ('legs/legs_armour', 'Grevas de placas', 'Plate legs'),
  ]),
  ('feet', 'Pés', 'Feet', True, [
    ('feet/boots/feet_boots_basic', 'Botas', 'Boots'), ('feet/boots/feet_boots_fold', 'Botas dobradas', 'Folded boots'), ('feet/boots/feet_boots_rim', 'Botas com aba', 'Rimmed boots'),
    ('feet/boots/feet_boots_revised', 'Botas altas', 'Tall boots'), ('feet/shoes/feet_shoes_basic', 'Sapatos', 'Shoes'), ('feet/shoes/feet_shoes_revised', 'Sapatos leves', 'Light shoes'),
    ('feet/shoes/feet_shoes_ghillies', 'Sapatilhas de cordão', 'Ghillies'), ('feet/feet_slippers', 'Chinelos', 'Slippers'),
    ('feet/feet_sandals', 'Sandálias', 'Sandals'), ('feet/socks/feet_socks_tabi', 'Meias tabi', 'Tabi socks'), ('feet/feet_hoofs', 'Cascos', 'Hoofs'), ('feet/feet_armour', 'Botas de placas', 'Plate boots'),
  ]),
  ('arms', 'Braços', 'Arms', True, [
    ('arms/wrists/arms_bracers', 'Braçadeiras', 'Bracers'), ('arms/wrists/wrists_cuffs', 'Punhos', 'Cuffs'), ('arms/arms_armour', 'Braçais de placas', 'Plate arms'),
  ]),
  ('hands', 'Mãos', 'Hands', True, [
    ('arms/arms_gloves', 'Luvas', 'Gloves'), ('arms/arms_hands_ring_stud', 'Anel', 'Ring'),
  ]),
  ('shoulders', 'Ombros', 'Shoulders', True, [
    ('arms/shoulders/shoulders_pauldrons', 'Ombreiras', 'Pauldrons'), ('arms/shoulders/shoulders_legion', 'Ombreiras de legionário', 'Legion shoulders'), ('arms/shoulders/shoulders_mantal', 'Manto de ombro', 'Mantle'),
    ('arms/shoulders/shoulders_epaulets', 'Dragonas', 'Epaulets'), ('arms/bauldron', 'Ombreira única', 'Bauldron'),
  ]),
  ('head', 'Cabeça', 'Headwear', True, [
    ('headwear/coverings/hoods/hat_hood_cloth', 'Capuz', 'Hood'), ('headwear/coverings/hoods/hat_hood_sack_cloth', 'Capuz de saco', 'Sack hood'),
    ('headwear/coverings/bandana/hat_bandana', 'Bandana', 'Bandana'), ('headwear/coverings/bandana/hat_bandana_pirate', 'Lenço de pirata', 'Pirate bandana'),
    ('headwear/coverings/headbands/hat_headband_thick', 'Faixa', 'Headband'), ('headwear/coverings/headbands/hat_headband_tied', 'Faixa amarrada', 'Tied headband'),
    ('headwear/hats/magic/hat_magic_wizard', 'Chapéu de mago', 'Wizard hat'), ('headwear/hats/magic/hat_magic_celestial', 'Chapéu celestial', 'Celestial hat'),
    ('headwear/hats/magic/hat_magic_celestial_moon', 'Chapéu lunar', 'Moon hat'), ('headwear/hats/magic/hat_magic_large', 'Chapéu de bruxa', 'Witch hat'),
    ('headwear/hats/tricorne/hat_tricorne', 'Tricórnio', 'Tricorne'), ('headwear/hats/caps/hat_cap_cavalier_feather', 'Chapéu de pena', 'Feathered hat'),
    ('headwear/hats/caps/hat_cap_leather', 'Gorro de couro', 'Leather cap'), ('headwear/hats/caps/hat_cap_bonnie', 'Boina', 'Bonnie'),
    ('headwear/hats/formal/hat_formal_crown', 'Coroa', 'Crown'), ('headwear/hats/formal/hat_formal_tiara', 'Tiara', 'Tiara'),
    ('headwear/helmets/helmets/hat_helmet_barbarian', 'Elmo bárbaro', 'Barbarian helm'),
    ('headwear/helmets/helmets/hat_helmet_barbarian_viking', 'Elmo viking', 'Viking helm'), ('headwear/helmets/helmets/hat_helmet_horned', 'Elmo com chifres', 'Horned helm'),
    ('headwear/helmets/helmets/hat_helmet_nasal', 'Elmo nasal', 'Nasal helm'), ('headwear/helmets/helmets/hat_helmet_spangenhelm', 'Elmo de placas', 'Spangenhelm'),
    ('headwear/helmets/helmets/hat_helmet_kettle', 'Chapéu de ferro', 'Kettle helm'), ('headwear/helmets/helmets/hat_helmet_mail', 'Coifa de malha', 'Mail coif'),
    ('headwear/helmets/helmets/hat_helmet_greathelm', 'Grande elmo', 'Great helm'), ('headwear/helmets/helmets/hat_helmet_sugarloaf', 'Elmo pão de açúcar', 'Sugarloaf helm'),
    ('headwear/helmets/helmets/hat_helmet_armet', 'Elmo fechado', 'Armet'), ('headwear/helmets/helmets/hat_helmet_barbuta', 'Barbuta', 'Barbuta'),
    ('headwear/helmets/helmets/hat_helmet_bascinet', 'Bacinete', 'Bascinet'), ('headwear/helmets/helmets/hat_helmet_legion', 'Elmo de legionário', 'Legion helm'),
    ('headwear/helmets/helmets/hat_helmet_morion', 'Morrião', 'Morion'), ('headwear/helmets/helmets/hat_helmet_norman', 'Elmo normando', 'Norman helm'),
    ('headwear/helmets/helmets/hat_helmet_pointed', 'Elmo pontudo', 'Pointed helm'), ('headwear/helmets/helmets/hat_helmet_flattop', 'Elmo de topo chato', 'Flat-top helm'),
    ('headwear/helmets/helmets/hat_helmet_close', 'Elmo de justa', 'Close helm'), ('headwear/helmets/helmets/hat_helmet_maximus', 'Elmo de gladiador', 'Gladiator helm'),
    ('headwear/helmets/helmets/hat_helmet_xeon', 'Elmo de cavaleiro', 'Knight helm'), ('headwear/helmets/helmets/hat_helmet_spangenhelm_viking', 'Elmo nórdico', 'Nordic helm'),
    ('headwear/helmets/helmets/hat_helmet_barbarian_nasal', 'Elmo bárbaro nasal', 'Barbarian nasal helm'), ('headwear/helmets/helmets/hat_helmet_bascinet_round', 'Bacinete redondo', 'Round bascinet'),
    ('headwear/helmets/helmets/hat_helmet_armet_simple', 'Elmo fechado liso', 'Plain armet'), ('headwear/helmets/helmets/hat_helmet_barbuta_simple', 'Barbuta lisa', 'Plain barbuta'),
  ]),
  ('crest', 'Adorno do elmo', 'Helm ornament', True, [
    ('headwear/helmets/accessories/hat_accessory_horns_upward', 'Chifres para cima', 'Upward horns'), ('headwear/helmets/accessories/hat_accessory_horns_downward', 'Chifres para baixo', 'Downward horns'),
    ('headwear/helmets/accessories/hat_accessory_horns_short', 'Chifres curtos', 'Short horns'), ('headwear/helmets/accessories/hat_accessory_wings', 'Asas', 'Wings'),
    ('headwear/helmets/accessories/hat_accessory_crest', 'Crista', 'Crest'), ('headwear/helmets/accessories/hat_accessory_crest_centurion', 'Crista de centurião', 'Centurion crest'),
    ('headwear/helmets/accessories/hat_accessory_plumage', 'Penacho', 'Plumage'), ('headwear/helmets/accessories/hat_accessory_plumage_centurion', 'Penacho de centurião', 'Centurion plumage'),
    ('headwear/helmets/accessories/hat_accessory_plumage_legion', 'Penacho de legionário', 'Legion plumage'),
  ]),
  ('visor', 'Viseira', 'Visor', True, [
    ('headwear/helmets/visors/hat_visor_slit', 'Fenda', 'Slit'), ('headwear/helmets/visors/hat_visor_slit_narrow', 'Fenda estreita', 'Narrow slit'),
    ('headwear/helmets/visors/hat_visor_grated', 'Grade', 'Grated'), ('headwear/helmets/visors/hat_visor_grated_narrow', 'Grade estreita', 'Narrow grate'),
    ('headwear/helmets/visors/hat_visor_round', 'Redonda', 'Round'), ('headwear/helmets/visors/hat_visor_pigface', 'Bico', 'Pigface'), ('headwear/helmets/visors/hat_visor_horned', 'Com chifres', 'Horned'),
  ]),
  ('face', 'Rosto', 'Face', True, [
    ('headwear/accessories/eyepatch/facial_eyepatch_left', 'Tapa-olho', 'Eyepatch'), ('headwear/accessories/eyepatch/facial_eyepatch_right', 'Tapa-olho esquerdo', 'Left eyepatch'),
    ('headwear/accessories/facial_mask_plain', 'Máscara', 'Mask'), ('headwear/accessories/glasses/facial_glasses_round', 'Óculos redondos', 'Round glasses'),
    ('headwear/accessories/glasses/facial_glasses', 'Óculos', 'Glasses'), ('headwear/accessories/glasses/facial_glasses_halfmoon', 'Óculos meia-lua', 'Half-moon glasses'),
    ('headwear/accessories/monocle/facial_monocle_right', 'Monóculo', 'Monocle'),
  ]),
  ('neck', 'Pescoço', 'Neck', True, [
    ('headwear/neck/neck_scarf', 'Cachecol', 'Scarf'), ('headwear/neck/neck_necklace', 'Colar', 'Necklace'), ('headwear/neck/neck_necklace_chain', 'Corrente', 'Chain'),
    ('headwear/neck/neck_necklace_beaded_large', 'Colar de contas', 'Beaded necklace'), ('headwear/neck/charms/neck_amulet_star', 'Amuleto de estrela', 'Star amulet'),
    ('headwear/neck/charms/neck_amulet_cross', 'Amuleto de cruz', 'Cross amulet'), ('headwear/neck/charms/neck_gem_round', 'Gema', 'Gem'), ('headwear/neck/neck_capeclip', 'Broche de capa', 'Cape clip'),
  ]),
  ('belt', 'Cinto', 'Belt', True, [
    ('torso/waist/belt_leather', 'Cinto de couro', 'Leather belt'), ('torso/waist/belt_double', 'Cinto duplo', 'Double belt'), ('torso/waist/belt_loose', 'Cinto solto', 'Loose belt'),
    ('torso/waist/belt_mage', 'Cinto de mago', 'Mage belt'), ('torso/waist/belt_robe', 'Corda de manto', 'Robe rope'), ('torso/waist/belt_sash', 'Faixa de cintura', 'Sash'),
    ('torso/waist/obi/belt_obi', 'Obi', 'Obi'),
  ]),
  ('cape', 'Capa', 'Cape', True, [
    ('torso/cape/cape_solid', 'Capa', 'Cape'), ('torso/cape/cape_tattered', 'Capa rasgada', 'Tattered cape'), ('torso/cape/cape_trim', 'Capa com barra', 'Trimmed cape'),
  ]),
  ('back', 'Costas', 'Back', True, [
    ('torso/backpack/quiver', 'Aljava', 'Quiver'), ('torso/backpack/backpack', 'Mochila', 'Backpack'), ('torso/backpack/backpack_squarepack', 'Mochila quadrada', 'Square pack'),
    ('torso/backpack/backpack_basket', 'Cesto', 'Basket'),
  ]),
  ('horns', 'Chifres', 'Horns', True, [
    ('head/appendages/head_horns_curled', 'Chifres curvos', 'Curled horns'), ('head/appendages/head_horns_backwards', 'Chifres para trás', 'Backward horns'),
    ('head/appendages/head_fins_fin', 'Barbatanas', 'Fins'), ('head/appendages/head_fins_fin_short', 'Barbatanas curtas', 'Short fins'),
  ]),
  ('wings', 'Asas', 'Wings', True, [
    ('body/wings/wings_bat', 'Asas de demônio', 'Demon wings'), ('body/lizard/wings_lizard_bat', 'Asas de dragão', 'Dragon wings'), ('body/lizard/wings_lizard', 'Asas de lagarto', 'Lizard wings'),
    ('body/wings/wings_lizard_alt', 'Asas membranosas', 'Membrane wings'), ('body/wings/wings_feathered', 'Asas de penas', 'Feathered wings'), ('body/wings/wings_lunar', 'Asas lunares', 'Lunar wings'),
    ('body/wings/pixie/wings_pixie', 'Asas de fada', 'Pixie wings'), ('body/wings/dragonfly/wings_dragonfly', 'Asas de libélula', 'Dragonfly wings'), ('body/wings/monarch/wings_monarch', 'Asas de borboleta', 'Butterfly wings'),
  ]),
  ('tail', 'Cauda', 'Tail', True, [
    ('body/tails/tail_wolf', 'Cauda de lobo', 'Wolf tail'), ('body/tails/tail_wolf_fluffy', 'Cauda felpuda', 'Fluffy tail'), ('body/tails/tail_cat', 'Cauda de gato', 'Cat tail'),
    ('body/lizard/tail_lizard', 'Cauda de lagarto', 'Lizard tail'), ('body/tails/tail_lizard_alt', 'Cauda de demônio', 'Demon tail'),
  ]),
  ('shield', 'Escudo', 'Shield', True, [
    ('weapons/shields/shield_round', 'Escudo redondo', 'Round shield'), ('weapons/shields/shield_kite', 'Escudo de cavaleiro', 'Kite shield'),
    ('weapons/shields/shield_spartan', 'Escudo espartano', 'Spartan shield'), ('weapons/shields/engrailed/shield_crusader', 'Escudo de cruzado', 'Crusader shield'),
    ('weapons/shields/scutum/shield_scutum', 'Escudo de legionário', 'Scutum'),
  ]),
  ('weapon', 'Arma', 'Weapon', True, [
    ('weapons/sword/weapon_sword_arming', 'Espada', 'Arming sword', {'attack': 'slash'}), ('weapons/sword/weapon_sword_longsword', 'Espada longa', 'Longsword', {'attack': 'slash'}),
    ('weapons/sword/weapon_sword_katana', 'Katana', 'Katana', {'attack': 'slash'}), ('weapons/sword/weapon_sword_dagger', 'Adaga', 'Dagger', {'attack': 'slash'}),
    ('weapons/sword/weapon_sword_rapier', 'Rapieira', 'Rapier', {'attack': 'slash'}), ('weapons/sword/weapon_sword_saber', 'Sabre', 'Saber', {'attack': 'slash'}),
    ('weapons/sword/weapon_sword_scimitar', 'Cimitarra', 'Scimitar', {'attack': 'slash'}),
    ('weapons/blunt/weapon_blunt_waraxe', 'Machado de guerra', 'War axe', {'attack': 'slash'}), ('weapons/blunt/weapon_blunt_mace', 'Maça', 'Mace', {'attack': 'slash'}),
    ('weapons/blunt/weapon_blunt_flail', 'Mangual', 'Flail', {'attack': 'slash'}),
    ('weapons/polearm/weapon_polearm_spear', 'Lança', 'Spear', {'attack': 'thrust'}), ('weapons/polearm/weapon_polearm_longspear', 'Lança longa', 'Long spear', {'attack': 'thrust'}),
    ('weapons/polearm/weapon_polearm_trident', 'Tridente', 'Trident', {'attack': 'thrust'}), ('weapons/polearm/weapon_polearm_halberd', 'Alabarda', 'Halberd', {'attack': 'slash'}),
    ('weapons/polearm/weapon_polearm_scythe', 'Foice', 'Scythe', {'attack': 'slash'}), ('weapons/polearm/weapon_polearm_dragonspear', 'Lança de dragão', 'Dragon spear', {'attack': 'thrust'}),
    ('weapons/polearm/weapon_polearm_cane', 'Bengala', 'Cane', {'attack': 'thrust'}),
    ('weapons/magic/weapon_magic_simple', 'Cajado simples', 'Simple staff', {'attack': 'spellcast'}), ('weapons/magic/weapon_magic_gnarled', 'Cajado retorcido', 'Gnarled staff', {'attack': 'thrust'}),
    ('weapons/magic/weapon_magic_crystal', 'Cajado de cristal', 'Crystal staff', {'attack': 'thrust'}), ('weapons/magic/weapon_magic_diamond', 'Cajado de diamante', 'Diamond staff', {'attack': 'thrust'}),
    ('weapons/magic/weapon_magic_loop', 'Cajado de aro', 'Loop staff', {'attack': 'thrust'}), ('weapons/magic/weapon_magic_s', 'Cajado em S', 'S staff', {'attack': 'thrust'}),
    ('weapons/ranged/bow/weapon_ranged_bow_normal', 'Arco', 'Bow', {'attack': 'shoot', 'ammo': True}), ('weapons/ranged/bow/weapon_ranged_bow_recurve', 'Arco recurvo', 'Recurve bow', {'attack': 'shoot', 'ammo': True}),
    ('weapons/ranged/bow/weapon_ranged_bow_great', 'Arco grande', 'Great bow', {'attack': 'shoot', 'ammo': True}),
    ('weapons/ranged/weapon_ranged_crossbow', 'Besta', 'Crossbow', {'attack': 'thrust'}), ('weapons/ranged/weapon_ranged_slingshot', 'Estilingue', 'Slingshot', {'attack': 'shoot'}),
  ]),
]
# partes fixas (sempre presentes; o jogador só escolhe as cores)
FIXED = [('body', 'body/body'), ('headbase', None), ('face', 'head/faces/face_neutral'), ('ammo', 'weapons/ranged/bow/weapon_ranged_bow_arrow')]
HEADS = {'male': 'head/heads/human/heads_human_male', 'female': 'head/heads/human/heads_human_female', 'muscular': 'head/heads/human/heads_human_male'}
# cabeças e corpos de criaturas (para os bonecos de invocações e monstros)
CREATURE_HEADS = {
  'skeleton': 'head/heads/undead/heads_skeleton', 'zombie': 'head/heads/undead/heads_zombie', 'vampire': 'head/heads/undead/heads_vampire',
  'orc': 'head/heads/fantasy/heads_orc_male', 'goblin': 'head/heads/fantasy/heads_goblin', 'troll': 'head/heads/fantasy/heads_troll',
  'minotaur': 'head/heads/beast/heads_minotaur', 'wolf': 'head/heads/beast/heads_wolf_male', 'boarman': 'head/heads/beast/heads_boarman', 'lizard': 'head/heads/reptile/heads_lizard_male',
  'frankenstein': 'head/heads/undead/heads_frankenstein', 'jack': 'head/heads/undead/heads_jack', 'alien': 'head/heads/reptile/heads_alien', 'wartotaur': 'head/heads/beast/heads_wartotaur',
  'rabbit': 'head/heads/farm/heads_rabbit', 'rat': 'head/heads/farm/heads_rat', 'pig': 'head/heads/farm/heads_pig', 'sheep': 'head/heads/farm/heads_sheep', 'mouse': 'head/heads/farm/heads_mouse',
}
FEMALE_HEADS = {'orc': 'head/heads/fantasy/heads_orc_female', 'minotaur': 'head/heads/beast/heads_minotaur_female', 'wolf': 'head/heads/beast/heads_wolf_female', 'lizard': 'head/heads/reptile/heads_lizard_female'}
# olhares (expressões do rosto humano)
FACES = [('neutral', 'Neutro', 'Neutral'), ('angry', 'Bravo', 'Angry'), ('sad', 'Triste', 'Sad'), ('happy', 'Sorrindo', 'Smiling'), ('shock', 'Arregalado', 'Wide'), ('closed', 'Fechado', 'Closed'),
         ('closing', 'Sonolento', 'Sleepy'), ('look_l', 'Olhando para um lado', 'Looking aside'), ('look_r', 'Olhando para o outro', 'Looking the other way'), ('eyeroll', 'Revirado', 'Eye roll'),
         ('shame', 'Envergonhado', 'Ashamed'), ('blush', 'Corado', 'Blushing'), ('angry2', 'Furioso', 'Furious'), ('sad2', 'Choroso', 'Tearful'), ('happy2', 'Alegre', 'Cheerful'), ('tears', 'Em lágrimas', 'In tears')]
FRAMES = {'skeleton': 'body/special/body_skeleton', 'zombie': 'body/special/body_zombie'}
# paletas próprias (rampas de 6 tons, do mais escuro ao mais claro) para peles de criaturas
EXTRA = {
  'body': {
    'demon': ['#2a0a10', '#5e1118', '#93202a', '#c2363a', '#e2605a', '#f59a8c'],
    'stone': ['#1c1d22', '#3a3d47', '#565a68', '#747988', '#989dab', '#c3c7d1'],
    'ember': ['#3a0d05', '#8a2408', '#d24a0c', '#f5821f', '#ffb648', '#ffe9a0'],
    'shadow': ['#0b0812', '#1d1630', '#33274f', '#4d3c74', '#6f5aa0', '#9b86cf'],
    'frost': ['#10283a', '#1f4d6e', '#3a7fa8', '#6ab3d6', '#a5daf0', '#e2f6ff'],
    'void': ['#000000', '#040406', '#0a0a0f', '#12121a', '#1c1c27', '#2c2c3a'],
    'ash': ['#141416', '#2e2e33', '#4a4a52', '#6b6b75', '#9a9aa5', '#cfcfd8'],
    'blood': ['#1a0003', '#40030a', '#6e0812', '#9c1019', '#c92a2a', '#f06a5a'],
    # a cor em que o esqueleto é desenhado: assim ele também troca de "pele"
    'bone': ['#281820', '#4D4A5D', '#958080', '#C4B59F', '#E5E6C7', '#FFFFFF'],
  },
  'hair': {
    'flame': ['#5a1204', '#a82a06', '#e2560c', '#ff8a1c', '#ffbe45', '#fff0a8'],
    'umber': ['#070302', '#170b05', '#2a1509', '#3f2210', '#573319', '#6f4422'],
    'coffee': ['#050202', '#130b06', '#24150c', '#362214', '#4e3222', '#66472f'],
    'espresso': ['#040201', '#100b07', '#1e150e', '#2f2218', '#46322a', '#5e493a'],
    'brown_black': ['#020101', '#0d0a08', '#191410', '#28221c', '#3e3231', '#574c44'],
    'soft_black': ['#010100', '#0b0a09', '#151412', '#22221f', '#383137', '#514e4d'],
    'dark_chocolate': ['#030100', '#100805', '#1f1009', '#331b0f', '#4d261b', '#663826'],
    'black_brown': ['#020000', '#0c0907', '#18120f', '#271e19', '#3f2c2d', '#58443f'],
  },
  # olhos: [contorno, íris, brilho] e, nos de monstro, um 4º tom para o branco do olho
  'eye': {
    'dark_brown': ['#140d08', '#3a2414', '#5a3a1e'], 'light_brown': ['#2e2010', '#7a5524', '#b08040'], 'honey': ['#3a2508', '#96641a', '#d19a35'],
    'hazel': ['#2a2412', '#6b5a2a', '#9a8a3c'], 'hazel_green': ['#2a2c14', '#66692e', '#93a047'], 'olive': ['#232a14', '#55692f', '#7f9a44'], 'moss': ['#1f3018', '#4a7a3a', '#74ad55'],
    'amber': ['#4a2a05', '#c07a14', '#f2b53a'], 'ice': ['#3a4a55', '#9cc4d8', '#dff3fb'], 'teal': ['#0f3a3a', '#2a8f8a', '#63d6c8'], 'violet': ['#2a1648', '#6a3fb5', '#a98af0'],
    'black': ['#000000', '#101014', '#2a2a32'], 'pink': ['#5a1640', '#d24a9a', '#ff9ad2'],
    'blood': ['#2a0000', '#b00000', '#ff2a1a'], 'infernal': ['#1a0000', '#d01000', '#ff6a2a', '#0a0000'], 'void': ['#000000', '#050506', '#101014', '#000000'],
    'blind': ['#b8b8c0', '#e6e6ec', '#ffffff', '#ffffff'], 'ghost': ['#083a4a', '#2ad0f0', '#c8fbff', '#04121a'], 'venom': ['#0a3008', '#3ee02a', '#c8ff6a', '#040c04'],
    'abyss': ['#1a0638', '#a02af0', '#e6a8ff', '#06020e'], 'molten': ['#4a1a00', '#ff8a00', '#ffe46a', '#140600'], 'undead': ['#3a4a2a', '#b8d86a', '#f2ffb0', '#1a1e12'],
  },
  # metais para armaduras de conjunto: ébano, daédrico, da noite, mithril, celestial…
  'metal': {
    'ebony': ['#000000', '#0b0a10', '#16141d', '#24212e', '#3a3547', '#5d5670'], 'daedric': ['#000000', '#7a0c10', '#0e0709', '#1c0d12', '#30141a', '#ff5a2a'],
    'night': ['#02030a', '#0a0f1f', '#141c33', '#1f2b4a', '#33456e', '#6b86b8'], 'mithril': ['#16202e', '#3d5a78', '#6f93b4', '#a3c4dc', '#d3e8f4', '#ffffff'],
    'celestial': ['#3a2a10', '#a8842f', '#e0c060', '#f6e6a8', '#fff8dc', '#ffffff'], 'emerald': ['#02140c', '#0b3d26', '#157a48', '#2bb56c', '#7fe6a6', '#d6ffe6'],
    'amethyst': ['#12041f', '#35105c', '#5e22a0', '#8f4fd6', '#c39af2', '#f0deff'], 'blood': ['#150003', '#45000a', '#7d0512', '#b5141f', '#e84a3c', '#ffb09a'],
    'frost': ['#0c1c2a', '#235070', '#3f8ab0', '#7cc4e0', '#c2ecfa', '#ffffff'], 'bone': ['#2a2318', '#6e604a', '#a39478', '#cdbfa3', '#e9dfc8', '#fffbee'],
    'rose_gold': ['#3a1410', '#8a4032', '#c8705a', '#e8a08a', '#fbd0bc', '#fff0e6'], 'ember': ['#1a0500', '#5a1400', '#a83200', '#e86a10', '#ffb040', '#ffe8a0'],
  },
  'cloth': {
    'void': ['#000000', '#050507', '#0b0b10', '#13131b', '#1d1d28', '#2c2c3b'], 'crimson': ['#1c0004', '#4a000c', '#7c0616', '#ae1422', '#d83a3a', '#f58a7a'],
    'midnight': ['#02030c', '#080e24', '#101a3c', '#1a2a5a', '#2c4280', '#5a78b8'], 'royal': ['#12031f', '#30095a', '#521896', '#7a38c8', '#a870ea', '#d8b8ff'],
    'gold': ['#3a2606', '#8a6410', '#c8981e', '#eec23c', '#ffe27a', '#fff6c8'], 'ivory': ['#3a3428', '#8a8068', '#bdb298', '#ddd4bc', '#f2ecd8', '#ffffff'],
    'emerald': ['#02140c', '#0a3a22', '#126a3c', '#209a58', '#5cc888', '#b0f0cc'],
  },
}

copied = set()
credits = {}

def sheet(rel):
    return os.path.join(SRC, 'spritesheets', rel)

def copy(rel):
    if rel in copied: return
    dst = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(sheet(rel), dst)
    copied.add(rel)

def swatch(rel):
    """Cor média dos pixels opacos (para a bolinha de cor das variantes prontas)."""
    im = Image.open(sheet(rel)).convert('RGBA')
    px = [p for p in im.getdata() if p[3] > 200]
    if not px: return '#888888'
    px.sort(key=lambda p: p[0] + p[1] + p[2])
    mid = px[len(px) // 3: 2 * len(px) // 3] or px
    return '#%02x%02x%02x' % tuple(sum(p[i] for p in mid) // len(mid) for i in range(3))

def recolors(d):
    """[(material, base)] na ordem color_1, color_2…"""
    r = d.get('recolors')
    if not r: return []
    if 'material' in r: r = {'color_1': r}
    # a base pode vir como "ulpc.green": fica só o nome da cor
    return [(v['material'], (v.get('base') or '').split('.')[-1] or None, v.get('source')) for k, v in sorted(r.items()) if isinstance(v, dict) and 'material' in v]

def item(defpath, pt, en, extra=None, head=None):
    if not os.path.exists(os.path.join(SRC, D + defpath + '.json')):
        print('  !! sem definição:', defpath); return None
    d = json.load(open(os.path.join(SRC, D + defpath + '.json')))
    variants = d.get('variants') or []
    recs = recolors(d)
    layers, bodies, anims_any = [], set(), set()
    for key in sorted(k for k in d if k.startswith('layer_')):
        L = d[key]
        custom = L.get('custom_animation')
        if custom and custom not in CUSTOM: continue
        paths = {}
        for b in BODIES:
            p = L.get(b)
            if not p: continue
            if head: p = p.replace('${head}', 'male' if b == 'muscular' else b)
            paths[b] = p
        if not paths: continue
        layer = {'z': L['zPos'], 'paths': {}, 'anims': []}
        if custom:
            base, size = CUSTOM[custom]
            layer['custom'] = base; layer['size'] = size
        fmt = None
        for b, p in paths.items():
            found = []
            names = [custom] if custom else ANIMS
            for a in names:
                if custom:
                    cands = [(p + (v + '.png'), v) for v in variants] if variants else [(p.rstrip('/') + '.png', None)]
                    ok = [c for c in cands if os.path.exists(sheet(c[0]))]
                    if ok: fmt = 'variant' if variants else 'file'; [copy(c[0]) for c in ok]; found.append(base)
                else:
                    if os.path.exists(sheet(p + a + '.png')) and not (variants and os.path.isdir(sheet(p + a))):
                        fmt = fmt or 'recolor'; copy(p + a + '.png'); found.append(a)
                    elif variants and os.path.isdir(sheet(p + a)):
                        ok = [v for v in variants if os.path.exists(sheet(p + a + '/' + v + '.png'))]
                        if ok: fmt = 'variant'; [copy(p + a + '/' + v + '.png') for v in ok]; found.append(a)
            if found:
                layer['paths'][b] = p; bodies.add(b)
                layer['anims'] = sorted(set(layer['anims']) | set(found), key=lambda a: ANIMS.index(a))
        if not layer['paths']: continue
        layer['fmt'] = fmt
        anims_any |= set(layer['anims'])
        layers.append(layer)
    if not layers:
        print('  !! sem arquivos:', defpath); return None
    out = {'id': os.path.basename(defpath), 'pt': pt, 'en': en, 'bodies': sorted(bodies), 'layers': layers}
    if recs: out['recolors'] = [{'material': m, **({'base': b} if b else {}), **({'source': src} if src else {})} for m, b, src in recs]
    if d.get('match_body_color'): out['skin'] = True
    if variants and any(l['fmt'] == 'variant' for l in layers):
        # bolinhas de cor das variantes prontas (pela 1ª camada que tiver arquivo)
        l0 = next(l for l in layers if l['fmt'] == 'variant')
        b0 = next(iter(l0['paths'])); p0 = l0['paths'][b0]
        sw = {}
        for v in variants:
            rel = (p0 + v + '.png') if l0.get('custom') else (p0 + l0['anims'][0] + '/' + v + '.png')
            if os.path.exists(sheet(rel)): sw[v] = swatch(rel)
        out['variants'] = sw
    if extra: out.update(extra)
    for c in d.get('credits', []):
        key = c.get('file', defpath)
        credits[key] = {'authors': c.get('authors', []), 'licenses': c.get('licenses', []), 'urls': c.get('urls', [])}
    return out

if os.path.isdir(OUT): shutil.rmtree(OUT)
catalog = {'frame': 64, 'anims': {}, 'palettes': {}, 'fixed': {}, 'slots': []}
for a in ANIMS:
    w, h = Image.open(sheet(f'body/bodies/male/{a}.png')).size
    catalog['anims'][a] = {'frames': w // 64, 'rows': h // 64}
for mat in ('body', 'hair', 'cloth', 'metal', 'eye'):
    meta = json.load(open(os.path.join(SRC, f'palette_definitions/{mat}/meta_{mat}.json')))
    catalog['palettes'][mat] = {'base': meta['base'], 'colors': {**json.load(open(os.path.join(SRC, f'palette_definitions/{mat}/{mat}_ulpc.json'))), **EXTRA.get(mat, {})}}
catalog['fixed']['body'] = item('body/body', 'Corpo', 'Body')
catalog['fixed']['head'] = {b: item(HEADS[b], 'Cabeça', 'Head') for b in BODIES}
catalog['fixed']['face'] = item('head/faces/face_neutral', 'Rosto', 'Face', head=True)
catalog['fixed']['faces'] = {}
for fid, fpt, fen in FACES:
    it = item('head/faces/face_' + fid, fpt, fen, head=True)
    if it: catalog['fixed']['faces'][fid] = it
catalog['fixed']['heads'] = {k: item(v, k, k) for k, v in CREATURE_HEADS.items() if os.path.exists(os.path.join(SRC, D + v + '.json'))}
# cabeça própria do corpo feminino, quando existe (senão vale a comum)
catalog['fixed']['heads_f'] = {k: item(v, k, k) for k, v in FEMALE_HEADS.items() if os.path.exists(os.path.join(SRC, D + v + '.json'))}
catalog['fixed']['frames'] = {k: item(v, k, k) for k, v in FRAMES.items()}
# a pele vale para o boneco inteiro: o esqueleto (desenhado em tons de osso) e o corpo do zumbi também trocam de cor
for it in (catalog['fixed']['heads']['skeleton'], catalog['fixed']['frames']['skeleton']):
    it['recolors'] = [{'material': 'body', 'base': 'bone'}]; it['skin'] = True
catalog['fixed']['frames']['zombie']['recolors'] = [{'material': 'body', 'base': 'zombie'}]; catalog['fixed']['frames']['zombie']['skin'] = True
catalog['fixed']['ammo'] = item('weapons/ranged/bow/weapon_ranged_bow_arrow', 'Flecha', 'Arrow')
for sid, pt, en, optional, items in SLOTS:
    its = []
    for it in items:
        r = item(it[0], it[1], it[2], it[3] if len(it) > 3 else None)
        if r: its.append(r)
    catalog['slots'].append({'id': sid, 'pt': pt, 'en': en, 'optional': optional, 'items': its})
    print(f'{sid}: {len(its)} peças')

json.dump(catalog, open(os.path.join(ROOT, 'src', 'data', 'lpc.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(credits, open(os.path.join(ROOT, 'src', 'data', 'lpc-credits.json'), 'w'), ensure_ascii=False, indent=0)
size = sum(os.path.getsize(os.path.join(OUT, r)) for r in copied)
print(f'{len(copied)} arquivos, {size / 1e6:.1f} MB em public/lpc; {len(credits)} entradas de crédito')
