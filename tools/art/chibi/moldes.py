"""
Moldes do corpo-base para desenhar peças de equipamento por cima: frente, lado e costas do manequim (azul chapado, sem
perspectiva, mesma escala nas três vistas) e as medidas do corpo em relação à altura.
Uso: blender -b base.blend --python moldes.py -- pasta_saida [px=1024]
"""
import bpy, sys, os, math, json
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; out = a[0]; px = int(a[1]) if len(a) > 1 else 1024
os.makedirs(out, exist_ok=True)
sc = bpy.context.scene; arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']
for o in sc.objects:
    if o.type == 'MESH' and o is not body: o.hide_render = True
mat = bpy.data.materials.new('manequim'); mat.use_nodes = True
bs = mat.node_tree.nodes['Principled BSDF']; bs.inputs['Base Color'].default_value = (0.12, 0.30, 0.75, 1); bs.inputs['Roughness'].default_value = 0.9
body.data.materials.clear(); body.data.materials.append(mat)
sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'; sc.render.resolution_x = sc.render.resolution_y = px; sc.render.film_transparent = False
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.92, 0.92, 0.92, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 2.2
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.25
for nome, ang in (('frente', 0), ('lado', 90), ('costas', 180)):
    r = math.radians(ang); d = Vector((math.sin(r), -math.cos(r), 0))
    cam.location = d * 6 + Vector((0, 0, 0.5)); cam.rotation_euler = (math.radians(90), 0, r)
    sun.rotation_euler = (d + Vector((-0.3 * math.cos(r), -0.3 * math.sin(r), 0.6))).normalized().to_track_quat('Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(out, f'molde-{nome}.png'); bpy.ops.render.render(write_still=True)
# medidas (altura do corpo = 100)
mw = body.matrix_world; V = [mw @ v.co for v in body.data.vertices]
def faixa(z0, z1, eixo=0, xmin=None, xmax=None):
    s = [v[eixo] for v in V if z0 <= v.z <= z1 and (xmin is None or v.x >= xmin) and (xmax is None or v.x <= xmax)]
    return (max(s) - min(s)) if s else 0
B = lambda n: (arm.matrix_world @ arm.data.bones[n].head_local, arm.matrix_world @ arm.data.bones[n].tail_local)
H = max(v.z for v in V) - min(v.z for v in V); z0 = min(v.z for v in V); p = lambda x: round(x / H * 100, 1)
nk = B('DEF-head')[0].z; sh = B('DEF-upper_arm.L')[0]; el = B('DEF-forearm.L')[0]; wr = B('DEF-hand.L')[0]; hip = B('DEF-thigh.L')[0]; kn = B('DEF-shin.L')[0]; an = B('DEF-foot.L')[0]
tx = sh.x * 0.8
m = {'altura': 100, 'cabeca_altura': p(max(v.z for v in V) - nk), 'cabeca_largura': p(faixa(nk + 0.03, 9)), 'cabeca_profundidade': p(faixa(nk + 0.03, 9, 1)),
     'altura_do_queixo': p(nk - z0), 'altura_dos_ombros': p(sh.z - z0), 'largura_dos_ombros': p(2 * sh.x),
     'peito_largura': p(faixa(sh.z - 0.08, sh.z - 0.04, 0, -tx, tx)), 'peito_profundidade': p(faixa(sh.z - 0.08, sh.z - 0.04, 1, -tx, tx)),
     'cintura_altura': p((hip.z + 0.04) - z0), 'cintura_largura': p(faixa(hip.z + 0.03, hip.z + 0.06, 0, -tx, tx)),
     'braco_ombro_ao_cotovelo': p((el - sh).length), 'antebraco_cotovelo_ao_pulso': p((wr - el).length), 'antebraco_espessura': p(faixa(-9, 9, 1, (el.x + wr.x) / 2 - 0.01, (el.x + wr.x) / 2 + 0.01)),
     'altura_do_quadril': p(hip.z - z0), 'altura_do_joelho': p(kn.z - z0), 'altura_do_tornozelo': p(an.z - z0),
     'coxa_espessura': p(faixa((hip.z + kn.z) / 2 - 0.01, (hip.z + kn.z) / 2 + 0.01, 0, 0.005, 9)), 'canela_espessura': p(faixa((kn.z + an.z) / 2 - 0.01, (kn.z + an.z) / 2 + 0.01, 0, 0.005, 9)),
     'pe_comprimento': p(faixa(z0, an.z, 1, 0.005, 9)), 'pe_largura': p(faixa(z0, an.z, 0, 0.005, 9)),
     'angulo_do_braco_abaixo_da_horizontal_graus': round(math.degrees(math.atan2(sh.z - wr.z, wr.x - sh.x)))}
json.dump(m, open(os.path.join(out, 'medidas.json'), 'w'), indent=1, ensure_ascii=False); print('MEDIDAS', json.dumps(m, ensure_ascii=False))
