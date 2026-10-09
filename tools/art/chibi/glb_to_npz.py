"""Exporta vértices e triângulos de um GLB para .npz (entrada do solidify.py). Uso: blender -b --python glb_to_npz.py -- modelo.glb saida.npz"""
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
obj = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
bpy.context.view_layer.objects.active = obj; obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = obj.data; me.calc_loop_triangles()
V = np.empty(len(me.vertices) * 3, dtype=np.float32); me.vertices.foreach_get('co', V)
F = np.empty(len(me.loop_triangles) * 3, dtype=np.int32); me.loop_triangles.foreach_get('vertices', F)
C = np.zeros((0, 4), dtype=np.float32)
if me.color_attributes:
    ca = me.color_attributes[0]; col = np.empty(len(ca.data) * 4, dtype=np.float32); ca.data.foreach_get('color', col); col = col.reshape(-1, 4)
    if ca.domain == 'CORNER':
        li = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', li); C = np.zeros((len(me.vertices), 4), dtype=np.float32); C[li] = col
    else: C = col
np.savez(a[1], V=V.reshape(-1, 3), F=F.reshape(-1, 3), C=C)
print('NPZ_OK', len(V) // 3, len(F) // 3)
