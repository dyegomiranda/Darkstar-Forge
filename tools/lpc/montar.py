#!/usr/bin/env python3
"""
Separa do "Universal LPC Spritesheet Character Generator" as peças que o criador de
heróis do Darkstar Forge usa, copia só as animações necessárias para public/lpc/ e
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
  ]),
  ('beard', 'Barba', 'Beard', True, [
    ('hair/beards/beards_5oclock_shadow', 'Por fazer', 'Stubble'), ('hair/beards/beards_trimmed', 'Aparada', 'Trimmed'),
    ('hair/beards/beards_medium', 'Média', 'Medium'), ('hair/beards/beards_beard', 'Cheia', 'Full'),
  ]),
  ('torso', 'Tronco', 'Torso', True, [
    ('torso/shirts/longsleeve/torso_clothes_longsleeve', 'Camisa de manga longa', 'Long-sleeve shirt'), ('torso/shirts/sleeveless/torso_clothes_sleeveless', 'Camisa sem manga', 'Sleeveless shirt'),
    ('torso/shirts/torso_clothes_tunic', 'Túnica', 'Tunic'), ('torso/shirts/torso_clothes_robe', 'Manto', 'Robe'), ('torso/vest/torso_clothes_vest', 'Colete', 'Vest'),
    ('torso/jacket/torso_jacket_tabard', 'Tabardo', 'Tabard'), ('torso/armour/torso_armour_leather', 'Armadura de couro', 'Leather armor'),
    ('torso/torso_chainmail', 'Cota de malha', 'Chain mail'), ('torso/armour/torso_armour_legion', 'Armadura de legionário', 'Legion armor'),
    ('torso/armour/torso_armour_plate', 'Armadura de placas', 'Plate armor'),
  ]),
  ('legs', 'Pernas', 'Legs', True, [
    ('legs/pants/legs_pants', 'Calça', 'Pants'), ('legs/leggings/legs_leggings', 'Calça justa', 'Leggings'), ('legs/skirts/legs_skirts_plain', 'Saia', 'Skirt'),
    ('legs/skirts/legs_skirts_slit', 'Saia aberta', 'Slit skirt'), ('legs/legs_armour', 'Grevas de placas', 'Plate legs'),
  ]),
  ('feet', 'Pés', 'Feet', True, [
    ('feet/boots/feet_boots_basic', 'Botas', 'Boots'), ('feet/boots/feet_boots_fold', 'Botas dobradas', 'Folded boots'), ('feet/shoes/feet_shoes_basic', 'Sapatos', 'Shoes'),
    ('feet/feet_sandals', 'Sandálias', 'Sandals'), ('feet/feet_armour', 'Botas de placas', 'Plate boots'),
  ]),
  ('arms', 'Braços', 'Arms', True, [
    ('arms/arms_gloves', 'Luvas', 'Gloves'), ('arms/arms_armour', 'Braçais de placas', 'Plate arms'),
  ]),
  ('shoulders', 'Ombros', 'Shoulders', True, [
    ('arms/shoulders/shoulders_pauldrons', 'Ombreiras', 'Pauldrons'), ('arms/shoulders/shoulders_legion', 'Ombreiras de legionário', 'Legion shoulders'), ('arms/shoulders/shoulders_mantal', 'Manto de ombro', 'Mantle'),
  ]),
  ('head', 'Cabeça', 'Headwear', True, [
    ('headwear/coverings/hoods/hat_hood_cloth', 'Capuz', 'Hood'), ('headwear/helmets/helmets/hat_helmet_barbarian', 'Elmo bárbaro', 'Barbarian helm'),
    ('headwear/helmets/helmets/hat_helmet_barbarian_viking', 'Elmo viking', 'Viking helm'), ('headwear/helmets/helmets/hat_helmet_horned', 'Elmo com chifres', 'Horned helm'),
    ('headwear/helmets/helmets/hat_helmet_nasal', 'Elmo nasal', 'Nasal helm'), ('headwear/helmets/helmets/hat_helmet_spangenhelm', 'Elmo de placas', 'Spangenhelm'),
    ('headwear/helmets/helmets/hat_helmet_kettle', 'Chapéu de ferro', 'Kettle helm'), ('headwear/helmets/helmets/hat_helmet_mail', 'Coifa de malha', 'Mail coif'),
    ('headwear/helmets/helmets/hat_helmet_greathelm', 'Grande elmo', 'Great helm'),
  ]),
  ('cape', 'Capa', 'Cape', True, [
    ('torso/cape/cape_solid', 'Capa', 'Cape'), ('torso/cape/cape_tattered', 'Capa rasgada', 'Tattered cape'), ('torso/cape/cape_trim', 'Capa com barra', 'Trimmed cape'),
  ]),
  ('horns', 'Chifres', 'Horns', True, [
    ('head/appendages/head_horns_curled', 'Chifres curvos', 'Curled horns'), ('head/appendages/head_horns_backwards', 'Chifres para trás', 'Backward horns'),
  ]),
  ('wings', 'Asas', 'Wings', True, [
    ('body/wings/wings_bat', 'Asas de morcego', 'Bat wings'), ('body/lizard/wings_lizard_bat', 'Asas de dragão', 'Dragon wings'), ('body/wings/wings_feathered', 'Asas de penas', 'Feathered wings'),
  ]),
  ('tail', 'Cauda', 'Tail', True, [
    ('body/tails/tail_wolf', 'Cauda de lobo', 'Wolf tail'), ('body/lizard/tail_lizard', 'Cauda de lagarto', 'Lizard tail'),
  ]),
  ('shield', 'Escudo', 'Shield', True, [
    ('weapons/shields/shield_round', 'Escudo redondo', 'Round shield'), ('weapons/shields/shield_kite', 'Escudo de cavaleiro', 'Kite shield'),
  ]),
  ('weapon', 'Arma', 'Weapon', True, [
    ('weapons/sword/weapon_sword_arming', 'Espada', 'Arming sword', {'attack': 'slash'}), ('weapons/sword/weapon_sword_longsword', 'Espada longa', 'Longsword', {'attack': 'slash'}),
    ('weapons/sword/weapon_sword_katana', 'Katana', 'Katana', {'attack': 'slash'}), ('weapons/sword/weapon_sword_dagger', 'Adaga', 'Dagger', {'attack': 'slash'}),
    ('weapons/blunt/weapon_blunt_waraxe', 'Machado de guerra', 'War axe', {'attack': 'slash'}), ('weapons/blunt/weapon_blunt_mace', 'Maça', 'Mace', {'attack': 'slash'}),
    ('weapons/magic/weapon_magic_simple', 'Cajado simples', 'Simple staff', {'attack': 'spellcast'}), ('weapons/magic/weapon_magic_gnarled', 'Cajado retorcido', 'Gnarled staff', {'attack': 'thrust'}),
    ('weapons/magic/weapon_magic_crystal', 'Cajado de cristal', 'Crystal staff', {'attack': 'thrust'}),
    ('weapons/ranged/bow/weapon_ranged_bow_normal', 'Arco', 'Bow', {'attack': 'shoot', 'ammo': True}), ('weapons/ranged/bow/weapon_ranged_bow_recurve', 'Arco recurvo', 'Recurve bow', {'attack': 'shoot', 'ammo': True}),
    ('weapons/ranged/bow/weapon_ranged_bow_great', 'Arco grande', 'Great bow', {'attack': 'shoot', 'ammo': True}),
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
}
FRAMES = {'skeleton': 'body/special/body_skeleton', 'zombie': 'body/special/body_zombie'}
# paletas próprias (rampas de 6 tons, do mais escuro ao mais claro) para peles de criaturas
EXTRA = {
  'body': {
    'demon': ['#2a0a10', '#5e1118', '#93202a', '#c2363a', '#e2605a', '#f59a8c'],
    'stone': ['#1c1d22', '#3a3d47', '#565a68', '#747988', '#989dab', '#c3c7d1'],
    'ember': ['#3a0d05', '#8a2408', '#d24a0c', '#f5821f', '#ffb648', '#ffe9a0'],
    'shadow': ['#0b0812', '#1d1630', '#33274f', '#4d3c74', '#6f5aa0', '#9b86cf'],
    'frost': ['#10283a', '#1f4d6e', '#3a7fa8', '#6ab3d6', '#a5daf0', '#e2f6ff'],
  },
  'hair': {'flame': ['#5a1204', '#a82a06', '#e2560c', '#ff8a1c', '#ffbe45', '#fff0a8']},
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
    return [(v['material'], (v.get('base') or '').split('.')[-1] or None) for k, v in sorted(r.items()) if isinstance(v, dict) and 'material' in v]

def item(defpath, pt, en, extra=None, head=None):
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
    if recs: out['recolors'] = [{'material': m, **({'base': b} if b else {})} for m, b in recs]
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
catalog['fixed']['heads'] = {k: item(v, k, k) for k, v in CREATURE_HEADS.items() if os.path.exists(os.path.join(SRC, D + v + '.json'))}
catalog['fixed']['frames'] = {k: item(v, k, k) for k, v in FRAMES.items()}
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
