"""
Prepara um corpo-base gerado pelo Pixal3D para animação: limpa a malha (remalha por voxels, simetria,
retopologia QuadriFlow), aplica uma cor de pele única (trocável no jogo), monta o esqueleto com os mesmos
nomes de ossos da "Universal Animation Library" (Quaternius, CC0) medindo as articulações na própria malha,
e calcula os pesos automáticos do Blender.

Uso: blender -b --python prep_base.py -- corpo.glb saida.blend [--faces=9000] [--teste=pasta_de_prévias]
"""
import bpy, bmesh, sys, os, math, numpy as np
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index('--') + 1:]
src, dst = a[0], a[1]
FACES = int(next((x.split('=')[1] for x in a if x.startswith('--faces=')), '9000'))
TEST = next((x.split('=', 1)[1] for x in a if x.startswith('--teste=')), None)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
if src.endswith('.npz'):      # sólido fechado vindo do solidify.py
    d = np.load(src); me = bpy.data.meshes.new('Corpo'); me.from_pydata(d['V'].tolist(), [], d['F'].tolist()); me.update()
    obj = bpy.data.objects.new('Corpo', me); sc.collection.objects.link(obj)
else:
    bpy.ops.import_scene.gltf(filepath=src)
    obj = max((o for o in sc.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
for o in list(sc.objects):
    if o is not obj: bpy.data.objects.remove(o)
bpy.context.view_layer.objects.active = obj; obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = obj.data

def coords(m=None):
    m = m or obj.data
    co = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', co); return co.reshape(-1, 3)

# ── cor de pele: a da referência do usuário (sRGB 0–255), convertida para o espaço linear do Blender ──
def lin(c): c /= 255.0; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
PELE = [float(x) for x in next((x.split('=')[1] for x in a if x.startswith('--pele=')), '216,177,168').split(',')]
skin = tuple(lin(c) for c in PELE) + (1.0,)
print('PELE', PELE, [round(x, 3) for x in skin])

def keep_largest():
    """O gerador deixa bolhas internas; fica só a casca principal."""
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    seen = set(); comps = []
    for v in bm.verts:
        if v.index in seen: continue
        stack = [v]; seen.add(v.index); comp = [v]
        while stack:
            u = stack.pop()
            for e in u.link_edges:
                w = e.other_vert(u)
                if w.index not in seen: seen.add(w.index); stack.append(w); comp.append(w)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    dead = [v for c in comps[1:] for v in c]
    bmesh.ops.delete(bm, geom=dead, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data); bm.free(); obj.data.update()
    return len(comps) - 1

# ── normaliza: pés no chão, altura 1, centro no eixo ──
co = coords()
zmin, zmax = co[:, 2].min(), co[:, 2].max(); H0 = zmax - zmin
head = co[co[:, 2] > zmin + 0.78 * H0]
cx = (head[:, 0].min() + head[:, 0].max()) / 2
me.transform(Matrix.Scale(1 / H0, 4) @ Matrix.Translation((-cx, 0, -zmin)))
co = coords(); cy = np.median(co[(co[:, 2] > 0.3) & (co[:, 2] < 0.6) & (np.abs(co[:, 0]) < 0.05)][:, 1])
me.transform(Matrix.Translation((0, -cy, 0)))

# ── malha limpa ──
def stats(tag):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    print('ETAPA', tag, 'verts', len(bm.verts), 'faces', len(bm.faces), 'arestas_ruins', sum(1 for e in bm.edges if not e.is_manifold)); bm.free()
for attr in list(me.color_attributes): me.color_attributes.remove(attr)
me.remesh_voxel_size = 0.0032; me.remesh_voxel_adaptivity = 0.0
if not src.endswith('.npz'): bpy.ops.object.voxel_remesh()
print('BOLHAS', keep_largest()); stats('entrada')
sm = obj.modifiers.new('suave', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 2
bpy.ops.object.modifier_apply(modifier=sm.name)
mi = obj.modifiers.new('espelho', 'MIRROR'); mi.use_axis = (True, False, False); mi.use_bisect_axis = (True, False, False)
mi.use_mirror_merge = True; mi.merge_threshold = 0.0006; mi.use_clip = True
bpy.ops.object.modifier_apply(modifier=mi.name); print('BOLHAS', keep_largest()); stats('espelho')
obj.data.remesh_voxel_size = 0.0026; bpy.ops.object.voxel_remesh(); print('BOLHAS', keep_largest()); stats('voxel2')
if '--liso-virilha' in a:
    # corpo neutro: a região entre as pernas fica lisa, como num manequim
    cz = coords(); zs_ = np.arange(0.10, 0.60, 0.004)
    cr_ = next((z_ for z_ in zs_ if ((np.abs(cz[:, 0]) < 0.006) & (cz[:, 2] >= z_) & (cz[:, 2] < z_ + 0.004)).any()), 0.35)
    bm = bmesh.new(); bm.from_mesh(obj.data)
    reg = [v for v in bm.verts if abs(v.co.x) < 0.075 and cr_ - 0.03 < v.co.z < cr_ + 0.11 and v.co.y < 0.01]
    for _ in range(120): bmesh.ops.smooth_vert(bm, verts=reg, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(obj.data); bm.free(); obj.data.update(); print('VIRILHA', len(reg), 'vértices alisados em z~', round(float(cr_), 3))
V = coords().copy()            # malha densa: é nela que as articulações são medidas
print('DENSA', len(V))
try:
    r = bpy.ops.object.quadriflow_remesh(use_mesh_symmetry=True, use_preserve_sharp=False, use_preserve_boundary=False,
                                         preserve_attributes=False, smooth_normals=True, mode='FACES', target_faces=FACES, seed=1)
except Exception as e:
    r = {'CANCELLED'}; print('QUADRIFLOW_ERRO', e)
print('QUADRIFLOW', r, len(obj.data.polygons))
if 'FINISHED' not in r or len(obj.data.polygons) > FACES * 3:
    print('QUADRIFLOW falhou; usando redução por colapso')
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    d = obj.modifiers.new('reduz', 'DECIMATE'); d.ratio = min(1.0, FACES * 2 / tris); d.use_symmetry = True; d.symmetry_axis = 'X'
    bpy.ops.object.modifier_apply(modifier=d.name)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.00005); bpy.ops.mesh.delete_loose(); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
me = obj.data
bpy.ops.object.shade_smooth()
obj.name = 'Corpo'; me.name = 'Corpo'
print('MALHA', len(me.vertices), 'vértices', len(me.polygons), 'faces')

mat = bpy.data.materials.new('Pele'); mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = skin; bsdf.inputs['Roughness'].default_value = 0.85
mat.diffuse_color = skin
me.materials.clear(); me.materials.append(mat)

# ── articulações medidas na malha (personagem olha para -Y; +X é o lado esquerdo dele) ──
def sl(mask): return V[mask]
def ext(p, ax): return (p[:, ax].min(), p[:, ax].max()) if len(p) else (0.0, 0.0)

# virilha: ponto mais baixo onde existe malha no plano central
zs = np.arange(0.10, 0.60, 0.004)
crotch = next((z for z in zs if len(sl((np.abs(V[:, 0]) < 0.006) & (V[:, 2] >= z) & (V[:, 2] < z + 0.004))) > 0), 0.35)
def ycenter(z):
    p = sl((np.abs(V[:, 0]) < 0.03) & (V[:, 2] >= z - 0.004) & (V[:, 2] < z + 0.004))
    return (p[:, 1].min() + p[:, 1].max()) / 2 if len(p) else 0.0

# braço esquerdo: fatias em X, de fora para dentro
xmax = V[:, 0].max(); arm = []
for x in np.arange(xmax - 0.004, 0.02, -0.004):
    p = sl((V[:, 0] >= x) & (V[:, 0] < x + 0.004) & (V[:, 2] > crotch))
    if len(p) < 3: continue
    z0, z1 = ext(p, 2); y0, y1 = ext(p, 1)
    arm.append((x, (y0 + y1) / 2, (z0 + z1) / 2, z1 - z0, y1 - y0))
arm = np.array(arm)
thick = np.median(arm[: len(arm) // 2, 3])
inner = next((i for i, r in enumerate(arm) if r[3] > max(0.16, thick * 2.6)), len(arm) - 1)   # aqui a fatia já pega o tronco
x_torso = arm[inner][0]
seg = arm[: max(3, inner - 3)]
fz = np.polyfit(seg[:, 0], seg[:, 2], 1); fy = np.polyfit(seg[:, 0], seg[:, 1], 1)
L = xmax - x_torso
sx = x_torso + 0.012
shoulder = Vector((sx, np.polyval(fy, sx), np.polyval(fz, sx)))
cand = [r for r in seg if x_torso + 0.50 * L < r[0] < xmax - 0.10 * L]
wr = min(cand, key=lambda r: r[3] * r[4]) if cand else None
wx = wr[0] if wr is not None else xmax - 0.24 * L
wx = min(max(wx, x_torso + 0.58 * L), xmax - 0.16 * L)
wrist = Vector((wx, np.polyval(fy, wx), np.polyval(fz, wx)))
elbow = (shoulder + wrist) / 2; elbow.y += 0.004
hand_end = Vector((xmax - 0.01, np.polyval(fy, xmax), np.polyval(fz, xmax)))

# pescoço: menor espessura frente-costas da coluna central entre o peito e a cabeça
best = (9, 0.6)
for z in np.arange(shoulder.z + 0.012, shoulder.z + 0.16, 0.004):
    p = sl((np.abs(V[:, 0]) < 0.02) & (V[:, 2] >= z) & (V[:, 2] < z + 0.004))
    if len(p) > 3:
        t = np.ptp(p[:, 1])
        if t < best[0]: best = (t, z)
neck_z = best[1]
# perna esquerda: fatias em Z
def legc(z):
    p = sl((V[:, 0] > 0.004) & (V[:, 2] >= z - 0.004) & (V[:, 2] < z + 0.004) & (V[:, 0] < x_torso + 0.01))
    if not len(p): return None
    x0, x1 = ext(p, 0); y0, y1 = ext(p, 1); return ((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0)
lc = legc(crotch - 0.02)
hip = Vector((lc[0], ycenter(crotch + 0.03) + 0.004, crotch + 0.032))
best = (9, 0.08)
for z in np.arange(0.045, min(0.16, crotch * 0.5), 0.004):
    c = legc(z)
    if c and c[2] * c[3] < best[0]: best = (c[2] * c[3], z)
ankle_z = min(max(best[1], 0.055), 0.11)
c = legc(ankle_z); ankle = Vector((c[0], c[1] + 0.006, ankle_z))
kz = (hip.z + ankle.z) / 2 + 0.006; c = legc(kz); knee = Vector((c[0], c[1] - 0.008, kz))
foot = sl((V[:, 0] > 0.004) & (V[:, 2] < 0.05) & (V[:, 0] < x_torso + 0.01))
toe_y = foot[:, 1].min(); fx = (foot[:, 0].min() + foot[:, 0].max()) / 2
ball = Vector((fx, ankle.y + 0.62 * (toe_y - ankle.y), 0.014)); toe = Vector((fx, toe_y + 0.004, 0.014))

pz = crotch + 0.032; span = neck_z - pz
def sp(k): z = pz + span * k; return Vector((0, ycenter(z), z))
head_base = Vector((0, ycenter(neck_z), neck_z + 0.012)); head_top = Vector((0, head_base.y, 0.985))
J = dict(crotch=crotch, neck=neck_z, shoulder=shoulder, elbow=elbow, wrist=wrist, hip=hip, knee=knee, ankle=ankle)
print('JUNTAS', {k: ([round(x, 3) for x in v] if isinstance(v, Vector) else round(float(v), 3)) for k, v in J.items()})

def mir(v): return Vector((-v.x, v.y, v.z))
B = [('root', None, Vector((0, 0, 0)), Vector((0, 0.12, 0)), False),
     ('DEF-hips', 'root', sp(0.0), sp(0.20), True), ('DEF-spine.001', 'DEF-hips', sp(0.20), sp(0.45), True),
     ('DEF-spine.002', 'DEF-spine.001', sp(0.45), sp(0.70), True), ('DEF-spine.003', 'DEF-spine.002', sp(0.70), sp(0.95), True),
     ('DEF-neck', 'DEF-spine.003', sp(0.95), head_base, True), ('DEF-head', 'DEF-neck', head_base, head_top, True)]
clav = Vector((0.018, shoulder.y - 0.01, shoulder.z + 0.004))
for S, f in (('L', lambda v: v.copy()), ('R', mir)):
    B += [(f'DEF-shoulder.{S}', 'DEF-spine.003', f(clav), f(shoulder), True),
          (f'DEF-upper_arm.{S}', f'DEF-shoulder.{S}', f(shoulder), f(elbow), True),
          (f'DEF-forearm.{S}', f'DEF-upper_arm.{S}', f(elbow), f(wrist), True),
          (f'DEF-hand.{S}', f'DEF-forearm.{S}', f(wrist), f(wrist + (hand_end - wrist) * 0.45), True),
          (f'DEF-thigh.{S}', 'DEF-hips', f(hip), f(knee), True), (f'DEF-shin.{S}', f'DEF-thigh.{S}', f(knee), f(ankle), True),
          (f'DEF-foot.{S}', f'DEF-shin.{S}', f(ankle), f(ball), True), (f'DEF-toe.{S}', f'DEF-foot.{S}', f(ball), f(toe), True)]
ad = bpy.data.armatures.new('Esqueleto'); arm_o = bpy.data.objects.new('Heroi', ad); sc.collection.objects.link(arm_o)
bpy.context.view_layer.objects.active = arm_o
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
for name, parent, h, t, deform in B:
    b = ad.edit_bones.new(name); b.head = h; b.tail = t; b.use_deform = deform
    if parent: b.parent = eb[parent]
    eb[name] = b
bpy.ops.armature.select_all(action='SELECT'); bpy.ops.armature.calculate_roll(type='GLOBAL_NEG_Y')
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); arm_o.select_set(True); bpy.context.view_layer.objects.active = arm_o
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
ng = sum(1 for v in obj.data.vertices if len(v.groups)); print('PESOS', ng, 'de', len(obj.data.vertices), 'vértices com peso')
if ng < len(obj.data.vertices) * 0.9:
    raise SystemExit('pesos automáticos falharam')
obj['vs_slot'] = 'corpo'; obj['vs_pele'] = list(skin[:3])
bpy.ops.wm.save_as_mainfile(filepath=dst)
print('BASE_OK', dst)

if TEST:
    os.makedirs(TEST, exist_ok=True)
    sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = True; sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x = 520; sc.render.resolution_y = 560
    w = bpy.data.worlds.new('w'); sc.world = w; w.color = (0.20, 0.21, 0.25)
    cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 1.25
    cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
    def shot(name, az, el=8):
        r, e = math.radians(az), math.radians(el); c = Vector((0, 0, 0.5))
        d = Vector((math.sin(r) * math.cos(e), -math.cos(r) * math.cos(e), math.sin(e)))
        cam.location = c + d * 4; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(TEST, name + '.png'); bpy.ops.render.render(write_still=True)
    for az in (0, 45, 90, 180): shot(f'repouso-{az:03d}', az)
    # pose de teste: braços para baixo, um joelho dobrado à frente, tronco torcido
    def rot(name, axis, deg):
        pb = arm_o.pose.bones[name]; bpy.context.view_layer.update()
        h = (arm_o.matrix_world @ pb.matrix).translation
        pb.matrix = arm_o.matrix_world.inverted() @ (Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-h) @ arm_o.matrix_world @ pb.matrix)
        bpy.context.view_layer.update()
    rot('DEF-spine.002', 'Z', 18)
    rot('DEF-upper_arm.L', 'Y', 52); rot('DEF-upper_arm.R', 'Y', -40); rot('DEF-forearm.R', 'Z', 70)
    rot('DEF-thigh.L', 'X', -55); rot('DEF-shin.L', 'X', 70); rot('DEF-thigh.R', 'X', 18); rot('DEF-head', 'Z', -25)
    for az in (0, 45, 135, 300): shot(f'pose-{az:03d}', az)
    print('TESTE_OK')
