"""Renderiza vistas em 'argila' (sem cor) de um modelo pintável, na mesma câmera das vistas extras do pintar_hy.py.
Uso: blender -b modelo.blend --python vistas_argila.py -- pasta "90,0;270,0;0,65" """
import bpy, sys, os, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; out = a[0]; os.makedirs(out, exist_ok=True)
sc = bpy.context.scene; VS, VT, VR = 1.16, Vector((0, 0, 0.5)), 1024
sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'SINGLE'; sh.single_color = (0.62, 0.62, 0.62); sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.show_shadows = False
sc.display.render_aa = '8'; sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
w = bpy.data.worlds.new('w'); sc.world = w; w.color = (1, 1, 1)
for o in sc.objects:
    if o.type in ('LIGHT', 'CAMERA'): o.hide_render = True
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = VS; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
sc.render.resolution_x = sc.render.resolution_y = VR
for spec in a[1].split(';'):
    az, el = [float(v) for v in spec.split(',')]; r, e = math.radians(az), math.radians(el)
    back = Vector((math.sin(r) * math.cos(e), -math.cos(r) * math.cos(e), math.sin(e)))
    cam.location = VT + back * 6; cam.rotation_euler = (VT - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(out, f'argila-{int(az)}-{int(el)}.png'); bpy.ops.render.render(write_still=True)
print('ARGILA_OK')
