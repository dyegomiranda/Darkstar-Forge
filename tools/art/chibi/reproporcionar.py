"""
Muda as proporções de um corpo-base JÁ PRONTO (malha + esqueleto na pose de descanso) sem remodelar nada: a mesma
deformação é aplicada aos vértices e aos ossos. Alvo padrão: proporção do "Chibi Armored Warrior" (cabeça ≈ 36% da
altura sem o cabelo, tronco longo, pernas de ≈ 19%).
Uso: blender -b base.blend --python reproporcionar.py -- saida.blend [--queixo=0.58] [--topo=0.94] [--pele=R,G,B]
Pontos de controle (altura do corpo = 1): chão, tornozelo, joelho, quadril, queixo, topo.
"""
import bpy, sys, numpy as np
from mathutils import Vector
dst = sys.argv[sys.argv.index('--') + 1]
arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']; B = arm.data.bones
z_de = [0.0, B['DEF-foot.L'].head_local.z, B['DEF-shin.L'].head_local.z, B['DEF-thigh.L'].head_local.z, B['DEF-head'].head_local.z, 1.0]
def _op(k, d): return float(next((x.split('=')[1] for x in sys.argv if x.startswith(f'--{k}=')), d))
z_para = [0.0, 0.045, 0.105, 0.19, _op('queixo', 0.58), _op('topo', 0.94)]
KH = (z_para[5] - z_para[4]) / (z_de[5] - z_de[4])            # escala da cabeça (igual nos três eixos)
KP, KT = 1.30, 1.25                                            # grossura das pernas e do tronco
KL, KW = 0.90, 1.40                                            # braços: comprimento e grossura (curtos e roliços)
pesc = B['DEF-neck'].head_local.z; queixo = z_de[4]; cy = 0.006   # centro frente–costas da cabeça
def corpo(p):
    p = np.asarray(p, dtype=float); z = p[..., 2]
    zn = np.interp(z, z_de, z_para)
    k = np.interp(z, [0, z_de[3], z_de[3] + 0.05, pesc, queixo + 0.03, 1], [KP, KP, KT, KT, KH, KH])
    ky = k * np.interp(z, [0, z_de[1], z_de[2]], [0.72, 0.72, 1.0])      # pés mais curtos: com a perna curta, o pé comprido vira nadadeira
    out = np.empty_like(p); out[..., 0] = p[..., 0] * k; out[..., 1] = cy + (p[..., 1] - cy) * ky; out[..., 2] = zn; return out
SO = {s: np.array(B[f'DEF-upper_arm.{s}'].head_local) for s in 'LR'}; SN = {s: corpo(SO[s]) for s in 'LR'}
EIXO = {s: (lambda v: v / np.linalg.norm(v))(np.array(B[f'DEF-hand.{s}'].tail_local) - SO[s]) for s in 'LR'}
def braco(p, s):
    d = np.asarray(p, dtype=float) - SO[s]; ao = (d @ EIXO[s])[..., None] * EIXO[s]     # parte ao longo do braço e parte atravessada
    return SN[s] + KL * ao + KW * (d - ao)
me = body.data; co = np.array([v.co[:] for v in me.vertices]); novo = corpo(co)
gi = {g.index: g.name for g in body.vertex_groups}
for s in 'LR':
    w = np.zeros(len(co))
    for v in me.vertices:
        w[v.index] = sum(g.weight for g in v.groups if any(k in gi[g.group] for k in ('upper_arm', 'forearm', 'hand')) and gi[g.group].endswith('.' + s))
    w = np.clip(w, 0, 1)[:, None]; novo = novo * (1 - w) + braco(co, s) * w
for v, c in zip(me.vertices, novo): v.co = c
me.update()
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
for eb in arm.data.edit_bones:
    s = eb.name[-1] if any(k in eb.name for k in ('upper_arm', 'forearm', 'hand')) else None
    f = (lambda p: braco(p, s)) if s else corpo
    h, t = f(eb.head[:]), f(eb.tail[:])
    if 'shoulder' in eb.name: t = SN[eb.name[-1]]
    eb.head = Vector(h); eb.tail = Vector(t)
bpy.ops.object.mode_set(mode='OBJECT')
zs = [v.co.z for v in me.vertices]; print('REPROPORCIONADO altura', round(max(zs) - min(zs), 3), 'cabeça', round(KH, 3), 'queixo', z_para[4], 'ombro', [round(x, 3) for x in SN['L']])
body['vs_proporcao'] = 'chibi-guerreiro'
pele = next((x.split('=')[1] for x in sys.argv if x.startswith('--pele=')), None)
if pele:
    rgb = [(int(v) / 255) ** 2.2 for v in pele.split(',')] + [1.0]; body['vs_pele'] = rgb[:3]
    for m in me.materials:
        if m: m.diffuse_color = rgb
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.bl_idname == 'ShaderNodeBsdfPrincipled' and not n.inputs['Base Color'].is_linked: n.inputs['Base Color'].default_value = rgb
                if n.bl_idname == 'ShaderNodeRGB': n.outputs[0].default_value = rgb
    for ca in me.color_attributes:
        for d in ca.data: d.color = rgb
bpy.ops.wm.save_as_mainfile(filepath=dst)
