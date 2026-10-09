"""
Tira de um modelo pronto (malha única) a CABEÇA inteira (rosto, cabelo, faixa) e a coloca como peça rígida no osso da
cabeça de um corpo-base de mesma proporção. A cabeça não dobra, então não precisa de pesos.
Uso: blender -b base.blend --python cabeca_modelo.py -- modelo.glb saida.blend [--corte=0.595] [--giro=-90] [--nome=Cabeca]
"""
import bpy, bmesh, sys, math, numpy as np
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]; src, dst = a[:2]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
corte = float(opt('corte', '0.595')); nome = opt('nome', 'Cabeca')
arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']
antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=src)
o = [x for x in bpy.data.objects if x not in antes and x.type == 'MESH'][0]
for x in [x for x in bpy.data.objects if x not in antes and x is not o]: bpy.data.objects.remove(x)
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = Matrix.Rotation(math.radians(float(opt('giro', '-90'))), 4, 'Z') @ mw
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
co = np.array([v.co[:] for v in o.data.vertices]); lo, hi = co.min(0), co.max(0); k = 1.0 / (hi[2] - lo[2])
o.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))))
bm = bmesh.new(); bm.from_mesh(o.data)
lado = float(opt('lado', '0.20')); alto = float(opt('alto', '0.665'))   # pontas de ombreira que sobem acima do corte, fora da largura do rosto
bmesh.ops.delete(bm, geom=[f for f in bm.faces if min(v.co.z for v in f.verts) < corte or (min(v.co.z for v in f.verts) < alto and max(abs(v.co.x) for v in f.verts) > lado)], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS'); bm.to_mesh(o.data); bm.free()
# alinha o centro do rosto (faixa logo acima do corte) com o centro da cabeça do corpo-base
co = np.array([v.co[:] for v in o.data.vertices]); f = co[(co[:, 2] > corte + 0.03) & (co[:, 2] < corte + 0.10)]
bc = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices]); h = bc[(bc[:, 2] > corte + 0.03) & (bc[:, 2] < corte + 0.10)]
d = Vector((((h[:, 0].min() + h[:, 0].max()) - (np.percentile(f[:, 0], 2) + np.percentile(f[:, 0], 98))) / 2, ((h[:, 1].min() + h[:, 1].max()) - (f[:, 1].min() + f[:, 1].max())) / 2, 0))
print('CABECA rosto modelo', [round(float(x), 3) for x in (np.percentile(f[:, 0], 2), np.percentile(f[:, 0], 98), f[:, 1].min(), f[:, 1].max())], 'base', [round(float(x), 3) for x in (h[:, 0].min(), h[:, 0].max(), h[:, 1].min(), h[:, 1].max())], 'desloca', [round(x, 3) for x in d])
o.data.transform(Matrix.Translation(d)); o.data.update()
for p in o.data.polygons: p.use_smooth = True
o.name = nome; o.data.name = nome; o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = 'DEF-head'; o.matrix_world = Matrix.Identity(4)
o['vs_layer'] = 'cosmetico'; o['vs_slot'] = 'cabeca'
# esconde a cabeça lisa do corpo-base enquanto esta estiver vestida
g = body.vertex_groups.new(name='mask_' + nome); g.add([v.index for v in body.data.vertices if (body.matrix_world @ v.co).z > corte + 0.025], 1.0, 'REPLACE')
m = body.modifiers.new('mask_' + nome, 'MASK'); m.vertex_group = g.name; m.invert_vertex_group = True
print('CABECA_OK', len(o.data.polygons), 'faces')
bpy.ops.wm.save_as_mainfile(filepath=dst)
