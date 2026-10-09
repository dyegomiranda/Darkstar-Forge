"""
Prévia de um personagem montado (.blend com esqueleto 'Heroi' e peças) — lisa ou pixelada com o Blender Pixel Kit
(câmeras, material Toon, contorno e ajustes de render do kit).

Uso: blender -b personagem.blend --python render_kit.py -- pasta_saida [opções]
  --modo=pixel|liso      --px=96 (largura do quadro em pixels de arte; no liso, o tamanho da imagem)
  --conjunto=nu|cosmetico|equipado|Peça1,Peça2   peças visíveis além do corpo
  --giros=0,-90,180      rotações do personagem (graus)      --cam=iso|frente
  --escala=1.5  (altura do personagem = 1; aumente para caber a arma)
  --acao=Nome --quadros=0,4,8        poses de uma animação  --pose  (pose de teste de deformação)
"""
import bpy, sys, os, math
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index('--') + 1:]
out = a[0]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
mode = opt('modo', 'pixel'); px = int(opt('px', '96')); conj = opt('conjunto', 'vestido'); camn = opt('cam', 'iso')
giros = [float(x) for x in opt('giros', '0').split(',')]
acao = opt('acao', ''); quadros_txt = opt('quadros', '0')
os.makedirs(out, exist_ok=True)
bpy.ops.preferences.addon_enable(module='blender_pixel_kit')
sc = bpy.context.scene
arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']
parts = [o for o in sc.objects if o.type == 'MESH' and o is not body]
layer = {'vestido': 'cosmetico', 'cosmetico': 'cosmetico', 'equipado': 'equipamento'}.get(conj)
show = [p.name for p in parts if p.get('vs_layer') == layer] if layer else ([] if conj == 'nu' else conj.split(','))
for p in parts: p.hide_render = p.name not in show
for o_ in [body] + parts:
    for m in o_.modifiers:
        if m.type == 'MASK': m.show_render = m.name.replace('mask_', '') in show

pivot = bpy.data.objects.new('pivo', None); sc.collection.objects.link(pivot)
arm.parent = pivot; arm.location = (0, 0, -0.53)

sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 3.0; sun.data.color = (1.0, 0.94, 0.84)
# luz vinda do alto, à esquerda da câmera: dá volume (faixas de luz e sombra) em vez de iluminar tudo de frente
L = Vector((-0.32, -0.54, 0.78)) if camn == 'iso' else Vector((-0.55, -0.45, 0.70))
sun.rotation_euler = L.normalized().to_track_quat('Z', 'Y').to_euler()
world = bpy.data.worlds.new('ceu'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.40, 0.38, 0.55, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.85 if mode != 'pixel' else 0.55

kit = sc.blender_pixel_kit_settings
meshes = [body] + parts
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
H = int(px * 1.2)
if mode == 'pixel':
    kit.resolution_preset = 'CUSTOM'; kit.custom_resolution_x = px; kit.custom_resolution_y = H
    bpy.ops.blender_pixel_kit.apply_render_settings()
    # Material Toon do kit: criado UMA vez e copiado para cada peça. (Criar vários pelo operador recria o grupo de
    # nós compartilhado "BPK Toon Dither" e desfaz as ligações dos materiais anteriores, que ficam sem sombreamento.)
    kit.material_type = 'TOON'; kit.material_assignment_mode = 'ADD_SLOT'
    cores = {o.name: (tuple(o.data.materials[0].diffuse_color) if o.data.materials else (0.8, 0.8, 0.8, 1)) for o in meshes}
    def tex_cor(o):
        # textura ligada à cor base do material (não a de relevo ou de metal)
        for m_ in o.data.materials:
            if not (m_ and m_.use_nodes): continue
            for n in m_.node_tree.nodes:
                if n.bl_idname == 'ShaderNodeBsdfPrincipled' and n.inputs['Base Color'].is_linked:
                    q = [n.inputs['Base Color'].links[0].from_node]
                    while q:
                        x = q.pop()
                        if x.bl_idname == 'ShaderNodeTexImage' and x.image: return x.image
                        q += [l.from_node for i_ in x.inputs for l in i_.links]
        return None
    texs = {o.name: tex_cor(o) for o in meshes}
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
    body.data.materials.clear()
    bpy.ops.blender_pixel_kit.create_pixel_material()
    toon = body.data.materials[0]; nt = toon.node_tree
    ramp = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeValToRGB'); outn = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputMaterial')
    bsdf = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1); bsdf.inputs['Roughness'].default_value = 1.0
    e = ramp.color_ramp.elements                      # três faixas: sombra arroxeada, meio-tom, luz
    e[0].position, e[0].color = 0.0, (0.40, 0.33, 0.52, 1)
    e[1].position, e[1].color = 0.26, (0.70, 0.64, 0.74, 1)
    e[2].position, e[2].color = 0.60, (1.0, 0.98, 0.94, 1)
    mix = nt.nodes.new('ShaderNodeMix'); mix.name = 'cor_x_luz'; mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
    nt.links.new(ramp.outputs['Color'], mix.inputs[7]); nt.links.new(mix.outputs[2], outn.inputs['Surface'])
    for o in meshes:
        mat = toon.copy(); mat.name = 'Toon_' + o.name; nt = mat.node_tree; mix = nt.nodes['cor_x_luz']
        if o.data.color_attributes and texs.get(o.name):
            col = nt.nodes.new('ShaderNodeVertexColor'); col.layer_name = o.data.color_attributes[0].name
            ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = texs[o.name]
            m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.blend_type = 'MULTIPLY'; m2.inputs[0].default_value = 1.0
            nt.links.new(ti.outputs['Color'], m2.inputs[6]); nt.links.new(col.outputs['Color'], m2.inputs[7]); nt.links.new(m2.outputs[2], mix.inputs[6])
        elif texs.get(o.name):
            ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = texs[o.name]; nt.links.new(ti.outputs['Color'], mix.inputs[6])
        elif o.data.color_attributes:
            col = nt.nodes.new('ShaderNodeVertexColor'); col.layer_name = o.data.color_attributes[0].name; nt.links.new(col.outputs['Color'], mix.inputs[6])
        else:
            mix.inputs[6].default_value = cores[o.name]
        o.data.materials.clear(); o.data.materials.append(mat)
    kit.outline_thickness = 1; kit.outline_color = (0.10, 0.06, 0.10, 1.0)
    bpy.ops.blender_pixel_kit.setup_outline()
else:
    sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x = px; sc.render.resolution_y = H; sc.render.film_transparent = True

kit.camera_projection = 'ORTHO'; kit.iso_camera_distance = 12
kit.camera_type = 'ISO' if camn == 'iso' else 'PIXEL'
bpy.ops.blender_pixel_kit.create_selected_pixel_camera()
cam = sc.camera; cam.data.ortho_scale = float(opt('escala', '1.5' if camn == 'iso' else '1.36'))
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

def rot(name, axis, deg):
    pb = arm.pose.bones[name]; bpy.context.view_layer.update()
    mw = arm.matrix_world; h = (mw @ pb.matrix).translation
    pb.matrix = mw.inverted() @ (Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-h) @ mw @ pb.matrix)
    bpy.context.view_layer.update()
if '--pose' in a:
    rot('DEF-spine.002', 'Z', 14); rot('DEF-upper_arm.L', 'Y', 58); rot('DEF-upper_arm.R', 'Y', -50); rot('DEF-forearm.R', 'Z', 60)
    rot('DEF-thigh.L', 'X', -45); rot('DEF-shin.L', 'X', 60); rot('DEF-thigh.R', 'X', 15); rot('DEF-head', 'Z', -20)
quadros = [0]
if acao:
    arm.animation_data_create(); arm.animation_data.action = bpy.data.actions[acao]
    quadros = list(range(0, int(bpy.data.actions[acao].frame_range[1]) + 1)) if quadros_txt == 'todos' else [int(x) for x in quadros_txt.split(',')]
    try: arm.animation_data.action_slot = arm.animation_data.action.slots[0]
    except Exception: pass
tag = conj if conj in ('nu', 'vestido', 'cosmetico', 'equipado') else 'parcial'
for f in (quadros if acao else [None]):
    if f is not None: sc.frame_set(f)
    for g in giros:
        pivot.rotation_euler = (0, 0, math.radians(g))
        name = f'{mode}-{tag}' + (f'-{acao}-{f:03d}' if f is not None else ('-pose' if '--pose' in a else '')) + f'-g{int(g) % 360:03d}.png'
        sc.render.filepath = os.path.join(out, name); bpy.ops.render.render(write_still=True)
print('KIT_OK', mode, conj, sc.render.resolution_x, sc.render.resolution_y)
