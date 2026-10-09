"""Imagem frontal de um .blend de personagem (entrada do Kontext para vestir a base).
Uso: blender -b arquivo.blend --python render_frente.py -- saida.png [px=1024] [--cor=R,G,B]
--cor pinta o corpo de uma cor chapada (0-1, sRGB): um manequim azul deixa claro para o gerador que aquilo é um
manequim, não pele, e permite separar depois a peça do manequim pela cor."""
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
px = int(a[1]) if len(a) > 1 and not a[1].startswith('--') else 1024
sc = bpy.context.scene
cor = next((x.split('=')[1] for x in a if x.startswith('--cor=')), None)
if cor:
    rgb = [float(v) ** 2.2 for v in cor.split(',')]
    for o in sc.objects:
        if o.type == 'MESH':
            for m in o.data.materials:
                if m and m.use_nodes and 'Principled BSDF' in m.node_tree.nodes:
                    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = 0.6
sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'
sc.render.resolution_x = sc.render.resolution_y = px; sc.render.film_transparent = False
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.82, 0.82, 0.80, 1); bg.inputs[1].default_value = 1.0
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 2.0; sun.rotation_euler = (math.radians(60), 0, math.radians(20))
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 1.16
cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0, -4, 0.5); cam.rotation_euler = (math.radians(90), 0, 0)
sc.render.filepath = a[0]; bpy.ops.render.render(write_still=True)
print('FRENTE_OK')
