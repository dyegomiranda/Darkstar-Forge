"""
Passo 4: coloca a cabeça careca (e, se pedido, o cabelo e a faixa) no corpo-base reproporcionado. As três peças são
rígidas e seguem o osso da cabeça. A cabeça lisa do corpo-base fica escondida por máscara (sobra só o toco do pescoço).
Uso: blender -b base_c.blend --python vestir_cabeca.py -- cabeca_pecas.blend saida.blend [--recuo=0.010]
"""
import bpy, sys
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]; src, dst = a[:2]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']
with bpy.data.libraries.load(src) as (f, t): t.objects = [n for n in f.objects if n in ('Cabeca', 'Cabelo', 'Faixa')]
pecas = {o.name: o for o in t.objects}; head = pecas['Cabeca']; C = Vector(head['vs_centro'])
osso = arm.data.bones['DEF-head']; pesc = arm.matrix_world @ osso.head_local
d = Vector((-C.x, (pesc.y - float(opt('recuo', '0.010'))) - C.y, 0))        # eixo da cabeça sobre o pescoço, um pouco à frente
base_z = min(v.co.z for v in head.data.vertices)
img = next(i for i in bpy.data.images if i.name.startswith('Color'))
mo = bpy.data.materials.new('Pintura original'); mo.use_nodes = True; nt = mo.node_tree; ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = img; img.pack() if not img.packed_file else None
nt.links.new(ti.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color']); nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.75
for nome, o in pecas.items():
    bpy.context.scene.collection.objects.link(o); o.data.transform(Matrix.Translation(d)); o.data.update()
    if nome != 'Cabeca': o.data.materials.clear(); o.data.materials.append(mo)
    o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = 'DEF-head'; o.matrix_world = Matrix.Identity(4)
    o['vs_layer'] = 'cosmetico'; o['vs_slot'] = {'Cabeca': 'cabeca', 'Cabelo': 'cabelo', 'Faixa': 'faixa'}[nome]
g = body.vertex_groups.new(name='mask_Cabeca'); g.add([v.index for v in body.data.vertices if (body.matrix_world @ v.co).z > base_z + 0.012], 1.0, 'REPLACE')
m = body.modifiers.new('mask_Cabeca', 'MASK'); m.vertex_group = g.name; m.invert_vertex_group = True
print('CABECA_VESTIDA base z', round(base_z, 4), 'pescoço', [round(x, 3) for x in pesc], 'deslocamento', [round(x, 3) for x in d])
bpy.ops.wm.save_as_mainfile(filepath=dst)
