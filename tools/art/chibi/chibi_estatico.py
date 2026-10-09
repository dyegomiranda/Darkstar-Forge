"""
Prepara um modelo baixado (malha única com textura, sem esqueleto) para ser visto no jogo como figura parada:
reduz os triângulos preservando a textura, normaliza a altura para 1 com os pés na origem e exporta GLB.
Uso: blender -b --python chibi_estatico.py -- origem.glb saida.glb [triangulos=140000] [previa.png]
"""
import bpy, sys, math
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]
src, dst = a[0], a[1]; alvo = int(a[2]) if len(a) > 2 else 140000; prev = a[3] if len(a) > 3 else ''
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
b = bpy.context.view_layer.objects.active; mw = b.matrix_world.copy(); b.parent = None; b.matrix_world = mw
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# O arquivo vem com os vértices repetidos ao longo das emendas da pintura. Reduzir assim abre frestas finas nessas
# emendas (cada lado é simplificado por conta própria). Soldar antes mantém a superfície fechada; a pintura não muda.
import bmesh
bm = bmesh.new(); bm.from_mesh(b.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bm.to_mesh(b.data); bm.free(); b.data.update()
tris = sum(len(p.vertices) - 2 for p in b.data.polygons)
if tris > alvo:
    m = b.modifiers.new('reduz', 'DECIMATE'); m.ratio = alvo / tris
    bpy.ops.object.modifier_apply(modifier=m.name)
co = [v.co for v in b.data.vertices]; lo = Vector(map(min, zip(*co))); hi = Vector(map(max, zip(*co))); k = 1.0 / (hi.z - lo.z)
b.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))))
for p in b.data.polygons: p.use_smooth = True
b.name = 'Chibi'
for o in list(bpy.data.objects):
    if o is not b: bpy.data.objects.remove(o)
print('ESTATICO', tris, '->', sum(len(p.vertices) - 2 for p in b.data.polygons), 'triângulos')
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True, export_image_format='JPEG', export_jpeg_quality=90, export_animations=False, export_cameras=False, export_lights=False)
if prev:
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = 1400; sc.render.resolution_y = 800; sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.5, 0.55, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    sun = bpy.data.objects.new('s', bpy.data.lights.new('s', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 3; sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
    c2 = b.copy(); sc.collection.objects.link(c2); c2.location.x = 0.8; c2.rotation_euler.z = math.radians(180); b.location.x = -0.0
    c3 = b.copy(); sc.collection.objects.link(c3); c3.location.x = -0.8; c3.rotation_euler.z = math.radians(60)
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.6
    cam.location = (0, -6, 1.6); cam.rotation_euler = (math.radians(80), 0, 0)
    sc.render.filepath = prev; bpy.ops.render.render(write_still=True)
