"""
Prepara o guerreiro original para ser fatiado: junta as malhas, vira para −Y, altura 1, pés em z = 0, centrado.
Salva o .blend normalizado e um .npz com vértices, triângulos e a cor da pintura no centro de cada triângulo.
Uso: blender -b --python normalizar.py -- modelo.glb saida.blend saida.npz [--giro=-90]
"""
import bpy, sys, math, numpy as np
from mathutils import Matrix, Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, dst, npz = a[:3]; giro = float(next((x.split('=')[1] for x in a if x.startswith('--giro=')), -90))
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ms = [x for x in bpy.data.objects if x.type == 'MESH']; bpy.ops.object.select_all(action='DESELECT')
for x in ms: x.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
o = bpy.context.view_layer.objects.active; mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = Matrix.Rotation(math.radians(giro), 4, 'Z') @ mw
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
co = np.array([v.co[:] for v in o.data.vertices]); lo, hi = co.min(0), co.max(0)
o.data.transform(Matrix.Scale(1.0 / (hi[2] - lo[2]), 4) @ Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))))
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode='OBJECT')
for x in list(bpy.data.objects):
    if x is not o: bpy.data.objects.remove(x)
o.name = 'Guerreiro'; me = o.data
co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
lv = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', lv); tv = lv.reshape(-1, 3)
uv = np.empty(len(me.loops) * 2); me.uv_layers[0].data.foreach_get('uv', uv); cuv = uv.reshape(-1, 3, 2).mean(1)
img = next(n.inputs['Base Color'].links[0].from_node.image for m in me.materials for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled' and n.inputs['Base Color'].is_linked)
iw, ih = img.size; px = np.empty(iw * ih * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(ih, iw, 4)[:, :, :3]
col = px[np.clip((cuv[:, 1] % 1 * ih).astype(int), 0, ih - 1), np.clip((cuv[:, 0] % 1 * iw).astype(int), 0, iw - 1)]
np.savez_compressed(npz, co=co.astype(np.float32), tv=tv, col=col.astype(np.float32)); img.pack() if not img.packed_file else None
bpy.ops.wm.save_as_mainfile(filepath=dst); print('NORMALIZADO', len(co), 'vértices', len(tv), 'triângulos', 'pintura', img.name, img.size[:])
