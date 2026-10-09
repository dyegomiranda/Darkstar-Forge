"""Conferência da cabeça careca: original × (careca + cabelo + faixa) × careca, mesmas câmeras e mesma luz.
Uso: blender -b cabeca_pecas.blend --python comparar.py -- pasta_saida"""
import bpy, sys, math
from mathutils import Vector
out = sys.argv[sys.argv.index('--') + 1]
O = {n: bpy.data.objects[n] for n in ('Original', 'Cabeca', 'Cabelo', 'Faixa')}
timg = next(i for i in bpy.data.images if i.name.startswith('Color'))
m = bpy.data.materials.new('Pintura original'); m.use_nodes = True; nt = m.node_tree; ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = timg
nt.links.new(ti.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color']); nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.75
for n in ('Original', 'Cabelo', 'Faixa'): O[n].data.materials.clear(); O[n].data.materials.append(m)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'; sc.render.resolution_x = sc.render.resolution_y = 700; sc.render.film_transparent = True
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.7
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 2.2
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 0.62; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
T = Vector((0, -0.03, 0.76))
conj = {'original': ['Original'], 'remontada': ['Cabeca', 'Cabelo', 'Faixa'], 'careca': ['Cabeca']}
for nome, az, el in (('frente', 0, 0), ('f45', 45, 5), ('lado', 90, 0), ('t135', 135, 5), ('costas', 180, 0), ('cima', 20, 50)):
    r, e = math.radians(az), math.radians(el); d = Vector((math.sin(r) * math.cos(e), -math.cos(r) * math.cos(e), math.sin(e)))
    cam.location = T + d * 5; cam.rotation_euler = (T - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sun.rotation_euler = (d + Vector((-0.4 * math.cos(r), -0.4 * math.sin(r), 0.7))).normalized().to_track_quat('Z', 'Y').to_euler()
    for k, lst in conj.items():
        for n, o in O.items(): o.hide_render = n not in lst
        sc.render.filepath = f'{out}/{k}-{nome}.png'; bpy.ops.render.render(write_still=True)
