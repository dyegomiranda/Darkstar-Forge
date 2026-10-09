"""
Renderiza um GLB com o Blender Pixel Kit (SouthernShotty): câmera de pixel, material Toon do kit,
contorno do kit e render EEVEE sem suavização. Também gera a versão lisa para comparação.

Uso: blender -b --python render_pixelkit.py -- modelo.glb pasta_saida [altura_px=96] [modo=pixel|liso]
O kit precisa estar instalado e ativado (Preferências > Add-ons > Blender Pixel Kit).
"""
import bpy, sys, os, math
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
src, out = a[0], a[1]
px = int(a[2]) if len(a) > 2 else 96
mode = a[3] if len(a) > 3 else 'pixel'
os.makedirs(out, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='blender_pixel_kit')
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == 'MESH']
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
# o personagem gira sobre um pivô no centro; a câmera do kit fica fixa
pivot = bpy.data.objects.new('pivo', None); sc.collection.objects.link(pivot)
ctr = (lo + hi) / 2
for o in meshes:
    if o.parent is None:
        o.parent = pivot; o.location -= ctr
height = hi.z - lo.z

# luz: sol quente de cima/esquerda + céu frio fraco (sombras arroxeadas, como na referência)
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 3.2; sun.data.color = (1.0, 0.93, 0.82); sun.rotation_euler = (math.radians(52), 0, math.radians(38))
world = bpy.data.worlds.new('ceu'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.36, 0.34, 0.52, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.9

kit = sc.blender_pixel_kit_settings
bpy.context.view_layer.objects.active = meshes[0]
for o in meshes: o.select_set(True)

if mode == 'pixel':
    kit.resolution_preset = 'CUSTOM'; kit.custom_resolution_x = px; kit.custom_resolution_y = int(px * 1.2)
    bpy.ops.blender_pixel_kit.apply_render_settings()
    # material Toon do kit; a cor vem da pintura por vértice do modelo
    kit.material_type = 'TOON'; kit.material_assignment_mode = 'REPLACE_ACTIVE'
    bpy.ops.blender_pixel_kit.create_pixel_material()
    mat = meshes[0].active_material
    nt = mat.node_tree
    for o in meshes:
        o.data.materials.clear(); o.data.materials.append(mat)
    ramp = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeValToRGB')
    outn = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputMaterial')
    bsdf = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1); bsdf.inputs['Roughness'].default_value = 1.0
    # três faixas de luz: sombra arroxeada, meio-tom, luz
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, (0.40, 0.34, 0.50, 1)
    e[1].position, e[1].color = 0.20, (0.74, 0.70, 0.76, 1)
    e[2].position, e[2].color = 0.50, (1.0, 0.98, 0.94, 1)
    col = nt.nodes.new('ShaderNodeVertexColor'); col.layer_name = meshes[0].data.color_attributes[0].name
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
    nt.links.new(col.outputs['Color'], mix.inputs[6]); nt.links.new(ramp.outputs['Color'], mix.inputs[7])
    nt.links.new(mix.outputs[2], outn.inputs['Surface'])
    kit.outline_thickness = 1; kit.outline_color = (0.10, 0.06, 0.10, 1.0)
    bpy.ops.blender_pixel_kit.setup_outline()
else:
    sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x = px; sc.render.resolution_y = int(px * 1.2); sc.render.film_transparent = True
    mat = bpy.data.materials.new('liso'); mat.use_nodes = True; nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.9
    col = nt.nodes.new('ShaderNodeVertexColor'); col.layer_name = meshes[0].data.color_attributes[0].name
    nt.links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    for o in meshes:
        o.data.materials.clear(); o.data.materials.append(mat)

# câmeras do kit: frontal e isométrica
kit.camera_projection = 'ORTHO'; kit.camera_ortho_scale = height * 1.28; kit.iso_camera_distance = 12
cams = {}
for name, typ in (('frente', 'PIXEL'), ('iso', 'ISO')):
    kit.camera_type = typ
    bpy.ops.blender_pixel_kit.create_selected_pixel_camera()
    cams[name] = sc.camera
    sc.camera.data.ortho_scale = height * 1.28
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
shots = [('frente', 'frente', 0), ('iso', 'iso-frente', 0), ('iso', 'iso-lado', -90), ('iso', 'iso-costas', 180)]
for cam, label, rot in shots:
    sc.camera = cams[cam]; pivot.rotation_euler = (0, 0, math.radians(rot))
    sc.render.filepath = os.path.join(out, f'{mode}-{label}.png'); bpy.ops.render.render(write_still=True)
print('PIXELKIT_OK', mode, sc.render.resolution_x, sc.render.resolution_y, sc.render.engine)
