"""
Exporta o personagem montado para o jogo (GLB + manifesto JSON).

 - O corpo é dividido em regiões conforme as peças que cobrem cada face ("mask_<Peça>"); cada região leva em
   `vs_hidden_by` a lista de peças que a escondem. O jogo só liga/desliga malhas, sem shader especial.
 - Cada peça leva `vs_slot` e `vs_layer` (cosmetico | equipamento).
 - Os clipes vão como animações separadas.

Uso: blender -b personagem_anim.blend --python export_glb.py -- saida.glb saida.json
"""
import bpy, bmesh, sys, json, os

a = sys.argv[sys.argv.index('--') + 1:]
dst, manifest = a[0], a[1]
sc = bpy.context.scene
arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']

def split(obj, base):
    """Divide a malha em regiões conforme as peças que cobrem cada face (grupos mask_<Peça>). Devolve [(nome, [peças], faces)]."""
    me = obj.data
    gi = {g.index: g.name[5:] for g in obj.vertex_groups if g.name.startswith('mask_')}
    for m in list(obj.modifiers):
        if m.type == 'MASK': obj.modifiers.remove(m)
    if not gi and not base:
        obj['vs_part'] = obj.name; obj['vs_hidden_by'] = ''
        return [(obj.name, [], len(me.polygons))]
    vmask = [set() for _ in me.vertices]
    for v in me.vertices:
        for g in v.groups:
            if g.group in gi and g.weight > 0.5: vmask[v.index].add(gi[g.group])
    sig = {}
    for p in me.polygons:
        s = frozenset().union(*[vmask[j] for j in p.vertices])    # igual ao modificador Máscara: some se QUALQUER vértice estiver coberto
        sig.setdefault(s, []).append(p.index)
    out = []
    for k, (s, faces) in enumerate(sorted(sig.items(), key=lambda kv: -len(kv[1]))):
        o = obj.copy(); o.data = obj.data.copy(); sc.collection.objects.link(o)
        bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
        keep = set(faces)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(o.data); bm.free()
        for g in [g for g in o.vertex_groups if g.name.startswith('mask_')]: o.vertex_groups.remove(g)
        o.name = f'{obj.name}_{k:02d}'; o.data.name = o.name; o['vs_hidden_by'] = ','.join(sorted(s))
        if base: o['vs_slot'] = 'corpo'; o['vs_layer'] = 'base'
        else: o['vs_part'] = obj.name
        out.append((o.name, sorted(s), len(faces)))
    bpy.data.objects.remove(obj)
    return out

skin = list(body.get('vs_pele', (0.687, 0.44, 0.392)))
pieces = [o for o in sc.objects if o.type == 'MESH' and o is not body]
parts = []
for o in pieces:
    for k in ('vs_mask',):
        if k in o: del o[k]
    name = o.name; zmin = min((o.matrix_world @ v.co).z for v in o.data.vertices)
    info = {'name': name, 'slot': o.get('vs_slot', ''), 'layer': o.get('vs_layer', ''), 'minZ': round(zmin, 4), 'triangles': sum(len(p.vertices) - 2 for p in o.data.polygons)}
    regs = split(o, False)
    for rn, _, _ in regs: bpy.data.objects[rn]['vs_min_z'] = round(zmin, 4)
    info['regions'] = [{'name': rn, 'hiddenBy': hs} for rn, hs, _ in regs]
    parts.append(info)
regions = split(body, True)
print('REGIOES corpo', len(regions), 'peças', [(p['name'], len(p['regions'])) for p in parts])

# clipes em faixas próprias (é assim que o exportador os separa)
arm.animation_data_create(); arm.animation_data.action = None
clips = {}
for act in bpy.data.actions:
    tr = arm.animation_data.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, 0, act); st.name = act.name
    try: st.action_slot = act.slots[0]
    except Exception: pass
    clips[act.name] = {'duration': round(act.frame_range[1] / sc.render.fps, 4), 'loop': bool(act.use_cyclic)}
def stance_speed(name):
    # média da velocidade para trás do pé enquanto ele está no chão (os 35% de quadros em que está mais baixo)
    act = bpy.data.actions.get(name)
    if not act: return None
    arm.animation_data.action = act
    try: arm.animation_data.action_slot = act.slots[0]
    except Exception: pass
    n = int(act.frame_range[1]); vs = []
    for S in ('L', 'R'):
        pos = []
        for f in range(n + 1):
            sc.frame_set(f); pos.append((arm.matrix_world @ arm.pose.bones['DEF-foot.' + S].head).copy())
        zs = sorted(p.z for p in pos); zc = zs[int(len(zs) * 0.35)]
        for f in range(n):
            if pos[f].z <= zc and pos[f + 1].z <= zc: vs.append((pos[f + 1].y - pos[f].y) * sc.render.fps)
    arm.animation_data.action = None
    return round(abs(sum(vs) / len(vs)), 4) if vs else None
for nm in ('Andar', 'Correr'):
    v = stance_speed(nm)
    if v and nm in clips: clips[nm]['speed'] = v
print('VELOCIDADES', {k: v.get('speed') for k, v in clips.items() if 'speed' in v})
clips.get('Conjurar', {})['events'] = {'lancar': round(16 / sc.render.fps, 3)}
clips.get('Golpe', {})['events'] = {'impacto': round(18 / sc.render.fps, 3)}

for o in sc.objects:
    if o.type == 'MESH':
        o.data.validate(clean_customdata=False); o.data.update()
        if o.data.color_attributes: o.data.color_attributes.active_color = o.data.color_attributes[0]; o.data.color_attributes.render_color_index = 0
os.makedirs(os.path.dirname(dst), exist_ok=True)
want = dict(filepath=dst, export_format='GLB', use_selection=False, export_yup=True, export_apply=False, export_skins=True,
            export_animations=True, export_animation_mode='ACTIONS', export_nla_strips=True, export_extras=True,
            export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True, export_def_bones=False, export_morph=False,
            export_cameras=False, export_lights=False, export_optimize_animation_size=True, export_force_sampling=True,
            export_image_format='JPEG', export_jpeg_quality=92, export_materials='EXPORT')
valid = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
bpy.ops.export_scene.gltf(**{k: v for k, v in want.items() if k in valid})
json.dump({'model': os.path.basename(dst), 'height': 1.0, 'skin': skin, 'fps': sc.render.fps, 'clips': clips, 'parts': parts,
           'body': [{'name': n, 'hiddenBy': s} for n, s, _ in regions], 'socket': {'mao': 'DEF-hand.R'}},
          open(manifest, 'w'), ensure_ascii=False, indent=1)
print('EXPORT_OK', dst, round(os.path.getsize(dst) / 1e6, 1), 'MB', 'ignorados', sorted(set(want) - valid))
