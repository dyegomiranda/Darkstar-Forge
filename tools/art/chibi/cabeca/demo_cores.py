"""
Demonstração de troca de cores: mesma cabeça e mesmo corpo com pele, olhos e cabelo em outras cores.
A cor é trocada no material, usando a máscara (R = olhos, G = sobrancelhas, B = boca): é a mesma conta que o jogo fará.
Uso: blender -b personagem_anim.blend --python demo_cores.py -- saida.png
"""
import bpy, sys, math
from mathutils import Vector
out = sys.argv[sys.argv.index('--') + 1]
sc = bpy.context.scene; arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']; head = bpy.data.objects['Cabeca']; hair = bpy.data.objects['Cabelo']; band = bpy.data.objects['Faixa']
lin = lambda c: tuple((v / 255) ** 2.2 for v in c) + (1,)
PELE0 = tuple(head['vs_pele']); CAB0 = (0.47, 0.30, 0.19); FX0 = (0.62, 0.10, 0.10)
M0 = {'cabeca': head.data.materials[0], 'cabelo': hair.data.materials[0], 'pele': body.data.materials[0]}      # originais, antes de trocar
def material_cabeca(pele, olho, cabelo):
    m = M0['cabeca'].copy(); nt = m.node_tree; bs = nt.nodes['Principled BSDF']; cor = nt.nodes['cor']; mk = nt.nodes['mascara']
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(mk.outputs['Color'], sep.inputs['Color'])
    def mix(a_sock, cor_b, fac_sock, modo='MIX'):
        n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = modo
        nt.links.new(a_sock, n.inputs[6]); n.inputs[7].default_value = cor_b
        if fac_sock is None: n.inputs[0].default_value = 1.0
        else: nt.links.new(fac_sock, n.inputs[0])
        return n.outputs[2]
    razao = tuple((pele[i] / 255) ** 2.2 / (PELE0[i] ** 2.2) for i in range(3)) + (1,)
    s = mix(cor.outputs['Color'], razao, None, 'MULTIPLY')                      # pele: multiplica pela razão entre o tom novo e o original
    # olhos: a cor nova leva o degradê do olho original (mais escuro em cima), em vez de ficar chapada
    bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(cor.outputs['Color'], bw.inputs['Color'])
    rp = nt.nodes.new('ShaderNodeMapRange'); rp.inputs['From Min'].default_value = 0.0; rp.inputs['From Max'].default_value = 0.035; rp.inputs['To Min'].default_value = 0.45; rp.inputs['To Max'].default_value = 1.25; nt.links.new(bw.outputs['Val'], rp.inputs['Value'])
    oc = nt.nodes.new('ShaderNodeMix'); oc.data_type = 'RGBA'; oc.blend_type = 'MULTIPLY'; oc.inputs[0].default_value = 1.0; oc.inputs[6].default_value = lin(olho); nt.links.new(rp.outputs['Result'], oc.inputs[7])
    n_ = nt.nodes.new('ShaderNodeMix'); n_.data_type = 'RGBA'; nt.links.new(s, n_.inputs[6]); nt.links.new(oc.outputs[2], n_.inputs[7]); nt.links.new(sep.outputs['Red'], n_.inputs[0]); s = n_.outputs[2]
    s = mix(s, lin(tuple(v * 0.45 for v in cabelo)), sep.outputs['Green'])      # sobrancelhas: tom escuro do cabelo
    s = mix(s, lin(tuple(v * 0.55 for v in pele)), sep.outputs['Blue'])         # boca
    nt.links.new(s, bs.inputs['Base Color']); return m
def material_cabelo(cabelo):
    m = M0['cabelo'].copy(); nt = m.node_tree; bs = nt.nodes['Principled BSDF']; t = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeTexImage')
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = 'MULTIPLY'; n.inputs[0].default_value = 1.0
    nt.links.new(t.outputs['Color'], n.inputs[6]); n.inputs[7].default_value = tuple((cabelo[i] / 255) ** 2.2 / (CAB0[i] ** 2.2) for i in range(3)) + (1,); nt.links.new(n.outputs[2], bs.inputs['Base Color']); return m
def material_faixa(cor):
    m = M0['cabelo'].copy(); nt = m.node_tree; bs = nt.nodes['Principled BSDF']; t = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeTexImage')
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = 'MULTIPLY'; n.inputs[0].default_value = 1.0
    nt.links.new(t.outputs['Color'], n.inputs[6]); n.inputs[7].default_value = tuple((cor[i] / 255) ** 2.2 / (FX0[i] ** 2.2) for i in range(3)) + (1,); nt.links.new(n.outputs[2], bs.inputs['Base Color']); return m
def material_pele(pele):
    m = M0['pele'].copy()
    for n in m.node_tree.nodes:
        if n.bl_idname == 'ShaderNodeBsdfPrincipled': n.inputs['Base Color'].default_value = lin(pele)
    return m
V = [('original', (187, 143, 110), (12, 10, 10), (120, 77, 48), (158, 26, 26)), ('pele clara · olhos azuis · loiro · faixa azul', (232, 196, 170), (40, 90, 190), (214, 170, 80), (40, 70, 160)),
     ('pele escura · olhos verdes · preto · faixa amarela', (112, 74, 52), (40, 150, 80), (34, 30, 34), (210, 170, 40)), ('pele cinza · olhos vermelhos · branco · faixa roxa', (150, 152, 160), (190, 30, 30), (230, 230, 235), (110, 50, 150)),
     ('careca · olhos castanhos', (205, 160, 125), (110, 60, 25), (120, 77, 48), None)]
arm.animation_data.action = bpy.data.actions['Parado']
try: arm.animation_data.action_slot = arm.animation_data.action.slots[0]
except Exception: pass
sc.frame_set(0)
grupo = [arm, body, head, hair, band]; copias = []
for i, (nome, pele, olho, cab, faixa) in enumerate(V):
    x = (i - (len(V) - 1) / 2) * 0.62
    if i == 0: a2 = arm; objs = {'Corpo': body, 'Cabeca': head, 'Cabelo': hair, 'Faixa': band}
    else:
        a2 = arm.copy(); sc.collection.objects.link(a2); objs = {}
        for o in (body, head, hair, band):
            c = o.copy(); c.data = o.data.copy(); sc.collection.objects.link(c); c.parent = a2; objs[o.name] = c
            for md in c.modifiers:
                if md.type == 'ARMATURE': md.object = a2
    a2.location.x = x
    objs['Corpo'].data.materials.clear(); objs['Corpo'].data.materials.append(material_pele(pele))
    objs['Cabeca'].data.materials.clear(); objs['Cabeca'].data.materials.append(material_cabeca(pele, olho, cab))
    objs['Cabelo'].data.materials.clear(); objs['Cabelo'].data.materials.append(material_cabelo(cab))
    objs['Cabelo'].hide_render = faixa is None; objs['Faixa'].hide_render = faixa is None
    if faixa: objs['Faixa'].data.materials.clear(); objs['Faixa'].data.materials.append(material_faixa(faixa))
for o in sc.objects:
    if o.type == 'MESH' and o.name.split('.')[0] not in ('Corpo', 'Cabeca', 'Cabelo', 'Faixa'): o.hide_render = True
sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'; sc.render.resolution_x = 2400; sc.render.resolution_y = 900; sc.render.film_transparent = False
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.20, 0.21, 0.26, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 2.4; sun.rotation_euler = Vector((-0.35, -0.6, 0.72)).normalized().to_track_quat('Z', 'Y').to_euler()
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 3.25; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
T = Vector((0, 0, 0.47)); d = Vector((0.30, -1, 0.42)).normalized(); cam.location = T + d * 6; cam.rotation_euler = (T - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = out; bpy.ops.render.render(write_still=True); print('CORES_OK', [v[0] for v in V])
