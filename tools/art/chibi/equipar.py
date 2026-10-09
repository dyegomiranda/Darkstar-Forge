"""
Prende itens RÍGIDOS baixados (armas, escudos) aos ossos de um personagem já animado. Cada item vira uma malha filha de um
osso: acompanha a mão ou o antebraço sem deformar. Uso:
  blender -b personagem_anim.blend --python equipar.py -- saida.blend
Os itens e de onde vêm estão na lista ITENS abaixo (teste: katana e conjunto Daédrico do Sketchfab, CC-BY).
"""
import bpy, sys, os, math
from mathutils import Vector, Matrix
dst = sys.argv[sys.argv.index('--') + 1]
D = os.path.expanduser('~/Downloads/sketchfab')
sc = bpy.context.scene; arm = bpy.data.objects['Heroi']
def bone_world(n): b = arm.data.bones[n]; return arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local

def importar(path):
    before = set(bpy.data.objects)
    (bpy.ops.import_scene.fbx if path.lower().endswith('.fbx') else bpy.ops.import_scene.gltf)(filepath=path)
    return [o for o in bpy.data.objects if o not in before]
def textura(o, arquivo):
    mat = bpy.data.materials.new('M_' + o.name); mat.use_nodes = True; nt = mat.node_tree
    ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(arquivo); ti.image.pack()
    bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.8; nt.links.new(ti.outputs['Color'], bs.inputs['Base Color'])
    o.data.materials.clear(); o.data.materials.append(mat)
def aplicar(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
def eixo_longo(o):
    co = [v.co for v in o.data.vertices]; lo = Vector(map(min, zip(*co))); hi = Vector(map(max, zip(*co))); s = hi - lo
    i = max(range(3), key=lambda k: s[k]); return i, lo, hi
def prender(o, nome, osso, punho, direcao, alvo_pos, alvo_dir, comprimento, camada, torcer=0.0):
    """Leva o ponto 'punho' do item para alvo_pos, alinha 'direcao' com alvo_dir, escala para 'comprimento' e prende ao osso."""
    i, lo, hi = eixo_longo(o); k = comprimento / (hi[i] - lo[i])
    R = direcao.normalized().rotation_difference(alvo_dir.normalized()).to_matrix().to_4x4()
    T = Matrix.Translation(alvo_pos) @ Matrix.Rotation(torcer, 4, alvo_dir.normalized()) @ R @ Matrix.Scale(k, 4) @ Matrix.Translation(-punho)
    o.data.transform(T); o.data.update()
    for p in o.data.polygons: p.use_smooth = True
    o.name = nome; o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = osso
    o.matrix_world = Matrix.Identity(4)                     # mantém a malha onde está, agora seguindo o osso
    o['vs_layer'] = camada; o['vs_slot'] = 'arma' if 'Escudo' not in nome else 'escudo'
    print('PRESO', nome, 'em', osso, 'comprimento', round(comprimento, 3))

def engrossar(o, k):
    # armas de chibi são mais grossas que as reais: engrossa nos dois eixos curtos para a lâmina não sumir em pixel
    i, lo, hi = eixo_longo(o); c = (lo + hi) / 2
    for v in o.data.vertices:
        for j in range(3):
            if j != i: v.co[j] = c[j] + (v.co[j] - c[j]) * k
hR, tR = bone_world('DEF-hand.R'); hL, tL = bone_world('DEF-hand.L'); fL, _ = bone_world('DEF-forearm.L')
palmR = hR + (tR - hR) * 0.9 + Vector((0, 0, -0.012)); FRENTE = Vector((0, -1, 0.12))

# ── katana (kaiyi97, CC-BY): lâmina + punho; a bainha fica de fora ──
objs = importar(f'{D}/tanjiro-katana-nichirintou/source/Nichirintou/upload2.FBX')
ms = {o.name.split('.')[0]: o for o in objs if o.type == 'MESH'}
for o in ms.values(): aplicar(o)
cabo, lam = ms['cloth'], ms['blade']
textura(cabo, f'{D}/tanjiro-katana-nichirintou/textures/cloth_albedo.jpeg'); textura(lam, f'{D}/tanjiro-katana-nichirintou/textures/blade_albedo.jpeg')
gc = sum((v.co for v in cabo.data.vertices), Vector()) / len(cabo.data.vertices)
# separa as partes soltas da malha 'blade' e fica só com as que encostam no punho (a espada); a bainha vai embora
bpy.ops.object.select_all(action='DESELECT'); lam.select_set(True); bpy.context.view_layer.objects.active = lam
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
partes = [o for o in bpy.context.selected_objects if o.type == 'MESH']
i0, lo0, hi0 = eixo_longo(cabo)
def fora_do_eixo(o):
    # distância do centro da parte à linha do punho (eixo longo): a bainha fica ao lado da espada, fora dessa linha
    co = [v.co for v in o.data.vertices]; c = (Vector(map(min, zip(*co))) + Vector(map(max, zip(*co)))) / 2 - gc; c[i0] = 0
    return c.length
perto = [o for o in partes if fora_do_eixo(o) < 0.10]; fora = [o for o in partes if o not in perto]
# entre as próximas pode haver a boca da bainha: fica o grupo ligado ao maior objeto próximo
for o in fora: bpy.data.objects.remove(o)
bpy.ops.object.select_all(action='DESELECT')
for o in perto + [cabo]: o.select_set(True)
bpy.context.view_layer.objects.active = cabo; bpy.ops.object.join(); kat = cabo
i, lo, hi = eixo_longo(kat); cen = sum((v.co for v in kat.data.vertices), Vector()) / len(kat.data.vertices)
dirn = Vector((0, 0, 0)); dirn[i] = 1.0 if cen[i] > gc[i] else -1.0
engrossar(kat, 1.7); prender(kat, 'Katana', 'DEF-hand.R', gc, dirn, palmR, FRENTE, 0.66, 'katana')
print('KATANA partes', len(partes), 'mantidas', len(perto))

# ── conjunto Daédrico (OrangeSauceu, CC-BY): espada longa na mão direita, escudo no antebraço esquerdo ──
objs = importar(f'{D}/the-elders-scrolls-blades-daedric-weapon-kit/source/TESB Daedric Weapon Pack.fbx')
dm = {o.name: o for o in objs if o.type == 'MESH'}
esp = dm['1stPersonDaedricSword']; esc = dm['DaedricShield_mesh']
for o in list(dm.values()):
    if o not in (esp, esc): bpy.data.objects.remove(o)
for o in (esp, esc): aplicar(o)
TX = f'{D}/the-elders-scrolls-blades-daedric-weapon-kit/textures/'
textura(esp, TX + 'DaedricSword_alb.png'); textura(esc, TX + 'Daedric_Shield_alb.png')
i, lo, hi = eixo_longo(esp); co = [v.co for v in esp.data.vertices]
# o cabo é a ponta mais fina: compara a largura média nos dois extremos do eixo longo
def larg(a, b):
    sel = [c for c in co if a <= c[i] <= b]; j = [k for k in range(3) if k != i]
    return max((max(c[j[0]] for c in sel) - min(c[j[0]] for c in sel)), (max(c[j[1]] for c in sel) - min(c[j[1]] for c in sel))) if sel else 9
# o cabo fica na ponta mais próxima da guarda, e a guarda é o trecho mais largo da espada: acha a fatia mais larga e vê de que lado está
L = hi[i] - lo[i]; fat = max(range(20), key=lambda q: larg(lo[i] + L * q / 20, lo[i] + L * (q + 1) / 20)); cabo_no_lo = fat < 10
print('GUARDA na fatia', fat, 'de 20; cabo no lado', 'baixo' if cabo_no_lo else 'alto')
punho = sum(co, Vector()) / len(co); punho[i] = lo[i] + L * 0.10 if cabo_no_lo else hi[i] - L * 0.10
dirn = Vector((0, 0, 0)); dirn[i] = 1.0 if cabo_no_lo else -1.0
engrossar(esp, 1.25); prender(esp, 'EspadaDaedrica', 'DEF-hand.R', punho, dirn, palmR, FRENTE, 0.62, 'daedrico')
# escudo: centro no antebraço esquerdo, face para fora (+X é o lado esquerdo do personagem), ponta para cima
i, lo, hi = eixo_longo(esc); co = [v.co for v in esc.data.vertices]; s = hi - lo
fino = min(range(3), key=lambda k: s[k]); n = Vector((0, 0, 0)); n[fino] = 1.0
braco = (hL - fL).normalized(); N = Vector((0, 0, 1)); N = (N - braco * N.dot(braco)).normalized()   # dorso do antebraço (palma para baixo)
cen = (lo + hi) / 2; alvo = fL + (hL - fL) * 0.55 + N * 0.045
k = 0.36 / s[i]; R1 = n.rotation_difference(N).to_matrix().to_4x4()
up = Vector((0, 0, 0)); up[i] = 1.0; up2 = R1.to_3x3() @ up; alvo_up = -braco      # ponta de cima do escudo voltada para o cotovelo
ang = math.atan2(up2.cross(alvo_up).dot(N), up2.dot(alvo_up))
T = Matrix.Translation(alvo) @ Matrix.Rotation(ang, 4, N) @ R1 @ Matrix.Scale(k, 4) @ Matrix.Translation(-cen)
esc.data.transform(T); esc.data.update(); esc.name = 'EscudoDaedrico'; esc.parent = arm; esc.parent_type = 'BONE'; esc.parent_bone = 'DEF-forearm.L'; esc.matrix_world = Matrix.Identity(4)
esc['vs_layer'] = 'daedrico'; esc['vs_slot'] = 'escudo'; print('PRESO EscudoDaedrico em DEF-forearm.L')
for o in list(bpy.data.objects):
    if o.type not in ('MESH', 'ARMATURE') : bpy.data.objects.remove(o)
bpy.ops.wm.save_as_mainfile(filepath=dst); print('EQUIPADO_OK', dst)
