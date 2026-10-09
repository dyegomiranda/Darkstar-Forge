"""
Pinta no Blender uma forma limpa do Hunyuan3D usando a arte 2D do personagem, vista de frente e de costas:
 1. reduz a malha, abre em UV (Smart UV Project) e "assa" (bake do Cycles) a posição e a normal de cada pixel da textura;
 2. cada pixel recebe a cor da arte que o enxerga: a de FRENTE (a mesma imagem que gerou a forma) ou a de COSTAS
    (vista de trás do mesmo personagem, gerada pelo Kontext a partir da frente), com transição suave nas laterais;
 3. o que nenhuma das duas enxerga recebe a cor do ponto pintado mais próximo;
 4. margem em volta das ilhas, salva a textura e renderiza a conferência (corpo em 8 ângulos e closes).

Uso: blender -b --python pintar_hy.py -- forma.glb frente.png costas.png saida.blend pasta_previas [--tris=90000] [--tex=4096]
"""
import bpy, bmesh, sys, os, math, time, numpy as np
_t0 = time.time()
def log(*x): print('[%4ds]' % (time.time() - _t0), *x, flush=True)
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index('--') + 1:]
glb, img_path, back_path, dst, prev = a[:5]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
TRIS = int(opt('tris', '90000')); TEX = int(opt('tex', '4096'))
os.makedirs(prev, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
sc = bpy.context.scene
ms = [o for o in sc.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
for o in list(sc.objects):
    if o is not obj: bpy.data.objects.remove(o)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = obj.data
# normaliza: altura 1, pés no chão, centrado
co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
lo, hi = co.min(0), co.max(0); k = 1.0 / (hi[2] - lo[2])
co = (co - np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]])) * k
me.vertices.foreach_set('co', co.ravel()); me.update()
dense_bvh = BVHTree.FromPolygons([Vector(c) for c in co], [list(p.vertices) for p in me.polygons])
tris0 = sum(len(p.vertices) - 2 for p in me.polygons)
if tris0 > TRIS:
    d = obj.modifiers.new('reduz', 'DECIMATE'); d.ratio = TRIS / tris0; bpy.ops.object.modifier_apply(modifier=d.name)
me = obj.data
for p in me.polygons: p.use_smooth = True
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.quads_convert_to_tris(quad_method='BEAUTY', ngon_method='BEAUTY')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
bpy.ops.object.mode_set(mode='OBJECT')
me = obj.data; log('MALHA', len(me.vertices), 'vértices', len(me.polygons), 'triângulos')
co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
bvh = BVHTree.FromPolygons([Vector(c) for c in co], [list(p.vertices) for p in me.polygons])

# ── 1. bake de posição e normal ──
sc.render.engine = 'CYCLES'; sc.cycles.samples = 1; sc.cycles.device = 'CPU'
sc.render.bake.margin = 0; sc.render.bake.use_clear = True
mat = bpy.data.materials.new('Pintura'); mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(em.outputs[0], out.inputs['Surface'])
geo = nt.nodes.new('ShaderNodeNewGeometry'); mp = nt.nodes.new('ShaderNodeVectorMath'); mp.operation = 'MULTIPLY_ADD'
tgt = nt.nodes.new('ShaderNodeTexImage'); nt.nodes.active = tgt
me.materials.clear(); me.materials.append(mat)
def bake(src_socket, mul, add):
    im = bpy.data.images.new('bake', TEX, TEX, alpha=True, float_buffer=True, is_data=True); tgt.image = im
    nt.links.new(src_socket, mp.inputs[0]); mp.inputs[1].default_value = (mul,) * 3; mp.inputs[2].default_value = (add,) * 3
    nt.links.new(mp.outputs[0], em.inputs['Color'])
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type='EMIT')
    arr = np.array(im.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4); bpy.data.images.remove(im); return arr
bp = bake(geo.outputs['Position'], 0.4, 0.5); bn = bake(geo.outputs['Normal'], 0.5, 0.5)
has = bp[:, :, 2] > 0.05          # pixels não cobertos ficam em 0; a altura codificada de um ponto real é sempre >= 0,5
P = ((bp[:, :, :3] - 0.5) / 0.4)[has].astype(np.float64); N = ((bn[:, :, :3] - 0.5) / 0.5)[has].astype(np.float64)
N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
log('TEXELS', int(has.sum()), 'de', TEX * TEX)

# ── 2. projeção das artes: frente e costas ──
x0, x1, z0, z1 = co[:, 0].min(), co[:, 0].max(), co[:, 2].min(), co[:, 2].max()
def projetar(path, costas, nome):
    """Cor de cada pixel da textura vista pela arte (frente, ou costas = vista de trás, espelhada em X). Devolve cor e peso."""
    im = bpy.data.images.load(path); w, h = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3].astype(np.float64)      # linha 0 = topo, sRGB
    sil = np.abs(px - px[3, 3]).sum(2) > 0.10
    ys, xs = np.where(sil); ix0, ix1, iy0, iy1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    sx = -1.0 if costas else 1.0
    # silhueta da malha nessa vista, numa grade do mundo
    GX, GZ = np.meshgrid(np.linspace(x0, x1, 360), np.linspace(z1, z0, 400))
    yo, yd = (3.0, -1.0) if costas else (-3.0, 1.0)
    msil = np.array([bvh.ray_cast(Vector((float(X), yo, float(Z))), Vector((0, yd, 0)))[0] is not None for X, Z in zip(GX.ravel(), GZ.ravel())]).reshape(GX.shape)
    T = dict(ax=1.0, bx=0.0, az=1.0, bz=0.0)             # ajuste fino do registro (escala e deslocamento em pixels)
    def to_px(X, Z, T=T):
        u = (sx * X - (-x1 if costas else x0)) / (x1 - x0); v = (z1 - Z) / (z1 - z0)
        cxp, cyp = (ix0 + ix1) / 2, (iy0 + iy1) / 2
        return cxp + (ix0 + u * (ix1 - ix0) - cxp) * T['ax'] + T['bx'], cyp + (iy0 + v * (iy1 - iy0) - cyp) * T['az'] + T['bz']
    def iou(T_):
        fx, fy = to_px(GX, GZ, T_); xi = np.round(fx - 0.5).astype(int); yi = np.round(fy - 0.5).astype(int)
        ok = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h); isl = np.zeros(GX.shape, dtype=bool); isl[ok] = sil[yi[ok], xi[ok]]
        return (msil & isl).sum() / max(1, (msil | isl).sum()), isl
    best, _ = iou(T); first = best
    for rnd in range(3):                                 # busca por coordenadas: a arte tem um pouco de perspectiva, a malha não
        for key, vals in (('bz', np.arange(-14, 15, 1.0)), ('az', np.arange(0.95, 1.051, 0.005)), ('bx', np.arange(-14, 15, 1.0)), ('ax', np.arange(0.95, 1.051, 0.005))):
            for v_ in vals:
                T2 = dict(T); T2[key] = float(v_); sc_, _ = iou(T2)
                if sc_ > best + 1e-6: best, T = sc_, T2
    log('REGISTRO', nome, 'IoU', round(float(first), 4), '→', round(float(best), 4), {k: round(v, 3) for k, v in T.items()})
    _, isl = iou(T); ov = np.zeros(GX.shape + (4,), dtype=np.float32); ov[..., 0] = isl; ov[..., 1] = msil; ov[..., 2] = isl & msil; ov[..., 3] = 1
    oi = bpy.data.images.new('ov', GX.shape[1], GX.shape[0]); oi.pixels.foreach_set(ov[::-1].ravel()); oi.filepath_raw = os.path.join(prev, f'registro-{nome}.png'); oi.file_format = 'PNG'; oi.save()
    lin = np.where(px <= 0.04045, px / 12.92, ((px + 0.055) / 1.055) ** 2.4)
    # A borda da arte mistura cor com o fundo: vale só 3 px para dentro. Quem cai na borda ou um pouco fora (laterais do
    # modelo, pequenas diferenças entre arte e forma) usa a cor do pixel seguro mais próximo, até 16 px.
    inset = sil.copy()
    for _ in range(3): inset = inset & np.roll(inset, 1, 0) & np.roll(inset, -1, 0) & np.roll(inset, 1, 1) & np.roll(inset, -1, 1)
    ny, nx = np.meshgrid(np.arange(h), np.arange(w), indexing='ij'); near_y = np.where(inset, ny, -1); near_x = np.where(inset, nx, -1); got = inset.copy()
    for _ in range(16):
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            sh = np.roll(got, (dy, dx), (0, 1)); new = sh & ~got
            if new.any(): near_y[new] = np.roll(near_y, (dy, dx), (0, 1))[new]; near_x[new] = np.roll(near_x, (dy, dx), (0, 1))[new]; got |= new
    fx, fy = to_px(P[:, 0], P[:, 2], T)
    xr = np.clip(np.round(fx - 0.5).astype(int), 0, w - 1); yr = np.clip(np.round(fy - 0.5).astype(int), 0, h - 1)
    safe = inset[yr, xr]; reach = got[yr, xr]
    xi0 = np.clip(np.floor(fx - 0.5).astype(int), 0, w - 2); yi0 = np.clip(np.floor(fy - 0.5).astype(int), 0, h - 2)
    tx = np.clip(fx - 0.5 - xi0, 0, 1)[:, None]; ty = np.clip(fy - 0.5 - yi0, 0, 1)[:, None]
    c = (lin[yi0, xi0] * (1 - tx) + lin[yi0, xi0 + 1] * tx) * (1 - ty) + (lin[yi0 + 1, xi0] * (1 - tx) + lin[yi0 + 1, xi0 + 1] * tx) * ty
    c[~safe & reach] = lin[near_y[yr, xr], near_x[yr, xr]][~safe & reach]
    dv = Vector((0, 1, 0)) if costas else Vector((0, -1, 0))
    vis = np.fromiter((dense_bvh.ray_cast(Vector(p) + Vector(n) * 0.004 + dv * 0.002, dv)[0] is None for p, n in zip(P, N)), dtype=bool, count=len(P))
    facing = N[:, 1] if costas else -N[:, 1]
    return c, (0.02 + np.clip(facing / 0.30, 0, 1)) * (facing > -0.02) * vis * reach
VS, VT, VR = 1.16, Vector((0, 0, 0.5)), 1024            # câmera das vistas extras: escala, alvo, resolução
def cam_basis(az, el):
    r, e = math.radians(az), math.radians(el)
    back = Vector((math.sin(r) * math.cos(e), -math.cos(r) * math.cos(e), math.sin(e)))     # do alvo para a câmera
    right = Vector((0, 0, 1)).cross(back).normalized() if abs(back.z) < 0.999 else Vector((1, 0, 0))
    up = back.cross(right).normalized()
    return np.array(back), np.array(right), np.array(up)
def projetar_vista(path, az, el, nome):
    """Vista renderizada do próprio modelo (e limpa pelo Kontext): o mapeamento pixel↔ponto é o da câmera, exato."""
    im = bpy.data.images.load(path); w, h = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3].astype(np.float64)
    lin = np.where(px <= 0.04045, px / 12.92, ((px + 0.055) / 1.055) ** 2.4)
    sil = np.abs(px - px[3, 3]).sum(2) > 0.10
    back, right, up = cam_basis(az, el); rel = P - np.array(VT)
    def to_px(dx=0.0, dy=0.0):
        return w / 2 + (rel @ right) / VS * w + dx, h / 2 - (rel @ up) / VS * h + dy
    # o Kontext pode deslocar a imagem alguns pixels: escolhe o deslocamento em que mais pontos visíveis caem na silhueta
    dvec = Vector(back)
    vis = np.fromiter((dense_bvh.ray_cast(Vector(p) + Vector(n) * 0.004 + dvec * 0.002, dvec)[0] is None for p, n in zip(P, N)), dtype=bool, count=len(P))
    facing = N @ back; sel = np.nonzero(vis & (facing > 0.3))[0][::7]
    best = (-1, 0, 0)
    for dy in range(-8, 9, 2):
        for dx in range(-8, 9, 2):
            fx, fy = to_px(dx, dy); xr = np.clip(np.round(fx[sel] - 0.5).astype(int), 0, w - 1); yr = np.clip(np.round(fy[sel] - 0.5).astype(int), 0, h - 1)
            sc_ = sil[yr, xr].mean()
            if sc_ > best[0]: best = (sc_, dx, dy)
    log('VISTA', nome, 'dentro da silhueta', round(float(best[0]), 4), 'deslocamento', best[1:])
    inset = sil.copy()
    for _ in range(2): inset = inset & np.roll(inset, 1, 0) & np.roll(inset, -1, 0) & np.roll(inset, 1, 1) & np.roll(inset, -1, 1)
    fx, fy = to_px(best[1], best[2])
    xr = np.clip(np.round(fx - 0.5).astype(int), 0, w - 1); yr = np.clip(np.round(fy - 0.5).astype(int), 0, h - 1)
    xi0 = np.clip(np.floor(fx - 0.5).astype(int), 0, w - 2); yi0 = np.clip(np.floor(fy - 0.5).astype(int), 0, h - 2)
    tx = np.clip(fx - 0.5 - xi0, 0, 1)[:, None]; ty = np.clip(fy - 0.5 - yi0, 0, 1)[:, None]
    c = (lin[yi0, xi0] * (1 - tx) + lin[yi0, xi0 + 1] * tx) * (1 - ty) + (lin[yi0 + 1, xi0] * (1 - tx) + lin[yi0 + 1, xi0 + 1] * tx) * ty
    return c, np.clip((facing - 0.15) / 0.45, 0, 1) * vis * inset[yr, xr]
cf, wf = projetar(img_path, False, 'frente')
cb, wb = projetar(back_path, True, 'costas')
# A arte da frente é a que gerou a forma (registro mais fiel): onde ela enxerga o ponto, ela manda. A arte das costas só
# entra onde a frente não vê.
wb = wb * (1 - np.clip(wf / 0.10, 0, 1))
wsum = wf + wb; known = wsum > 0.015
col = np.zeros((len(P), 3)); col[known] = (cf[known] * wf[known, None] + cb[known] * wb[known, None]) / wsum[known, None]
# Vistas extras (laterais, de cima…): cada uma pinta o que ELA vê de frente e as artes principais veem de raspão.
for spec in [x for x in opt('vistas', '').split(';') if x]:
    az_, el_, path_ = spec.split(',', 2); cv, wv = projetar_vista(path_, float(az_), float(el_), f'{az_}/{el_}')
    main = np.clip(np.maximum(wf, wb) / 0.75, 0, 1)                     # confiança das artes principais (1 = vista de frente)
    k = wv * (1 - main) ; k = np.clip(k * 2.5, 0, 1)                    # a extra entra onde as principais são fracas
    col = col * (1 - k[:, None]) + cv * k[:, None]; known = known | (k > 0.2)
    wf = np.maximum(wf, k * 0.75)                                       # o que já foi pintado por uma extra passa a contar como coberto
log('PROJECAO frente', int((wf > 0.5).sum()), 'costas', int((wb > 0.5).sum()), 'sem arte (lados/escondido)', int((~known).sum()), 'de', len(P))
# ── 3. laterais, topo e partes escondidas ──
# Onde a arte só vê a superfície de raspão, a projeção estica poucos pixels por uma área grande e vira mancha. Nesses
# pontos a cor passa a ser a PREDOMINANTE (mediana) entre os pontos bem pintados mais próximos e voltados para o mesmo
# lado: o lado do cabelo recebe a cor do cabelo, a lateral da túnica o verde, sem riscos nem blocos.
conf = np.maximum(wf, wb); strong = known & (conf > 0.9)
si = np.nonzero(strong)[0][::4]
kd = kdtree.KDTree(len(si))
for i, j in enumerate(si): kd.insert(P[j], i)
kd.balance()
low = np.nonzero(~strong)[0]; M = np.zeros((len(low), 3)); Ns = N[si]; Cs = col[si]
for n_, j in enumerate(low):
    ids_ = np.fromiter((r[1] for r in kd.find_n(P[j], 28)), dtype=np.int64)
    same = ids_[(Ns[ids_] @ N[j]) > 0.15]
    M[n_] = np.median(Cs[same if len(same) >= 6 else ids_], axis=0)
t = np.clip((conf[low] - 0.35) / 0.55, 0, 1); t = t * t * (3 - 2 * t); t[~known[low]] = 0
col[low] = col[low] * t[:, None] + M * (1 - t[:, None])
log('LATERAIS', len(low), 'pixels pela cor predominante vizinha (', int((t == 0).sum()), 'totalmente)')
soft = np.zeros(len(P)); soft[low] = 1 - t

# ── 4. textura ──
log('TEXTURA compondo')
img = np.zeros((TEX, TEX, 3)); img[has] = col; hasp = has.copy()
# suaviza as emendas só na parte preenchida (média 5×5 dentro da própria superfície, duas passadas)
smap = np.zeros((TEX, TEX)); smap[has] = soft
for _ in range(2):
    acc = np.zeros_like(img); cnt = np.zeros((TEX, TEX))
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            sh = np.roll(has, (dy, dx), (0, 1)); acc += np.roll(img, (dy, dx), (0, 1)) * sh[:, :, None]; cnt += sh
    blur = acc / np.maximum(cnt, 1)[:, :, None]; k_ = (smap * has)[:, :, None]; img = img * (1 - k_) + blur * k_
for _ in range(16):
    if hasp.all(): break
    acc = np.zeros_like(img); cnt = np.zeros(hasp.shape)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.roll(hasp, (dy, dx), (0, 1)); acc += np.roll(img, (dy, dx), (0, 1)) * sh[:, :, None]; cnt += sh
    new = ~hasp & (cnt > 0); img[new] = acc[new] / cnt[new][:, None]; hasp |= new
srgb = np.where(img <= 0.0031308, img * 12.92, 1.055 * np.clip(img, 0, None) ** (1 / 2.4) - 0.055)
rgba = np.concatenate([np.clip(srgb, 0, 1), np.ones((TEX, TEX, 1))], 2).astype(np.float32)
tex = bpy.data.images.new('T_Personagem', TEX, TEX, alpha=False); tex.pixels.foreach_set(rgba.ravel())
tex.filepath_raw = os.path.splitext(dst)[0] + '_tex.png'; tex.file_format = 'PNG'; tex.save(); tex.pack()
nt.nodes.clear(); out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = tex
bs.inputs['Roughness'].default_value = 0.9; nt.links.new(ti.outputs['Color'], bs.inputs['Base Color']); nt.links.new(bs.outputs[0], out.inputs['Surface'])
obj.name = 'Personagem'
bpy.ops.wm.save_as_mainfile(filepath=dst)

# ── conferência: cor pura (sem luz) e com luz suave, de corpo inteiro e de perto ──
sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = True
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.75
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 1.6
sun.rotation_euler = Vector((-0.4, -0.6, 0.75)).normalized().to_track_quat('Z', 'Y').to_euler()
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
def shot(name, az, target, scale, res, el=5):
    cd.ortho_scale = scale; sc.render.resolution_x, sc.render.resolution_y = res
    r, e = math.radians(az), math.radians(el); dv = Vector((math.sin(r) * math.cos(e), -math.cos(r) * math.cos(e), math.sin(e)))
    cam.location = Vector(target) + dv * 6; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(prev, name + '.png'); bpy.ops.render.render(write_still=True)
for az in (0, 45, 90, 135, 180, 225, 270, 315): shot(f'corpo-{az:03d}', az, (0, 0, 0.5), 1.12, (640, 720))
shot('perto-rosto', 0, (0, 0, 0.80), 0.42, (900, 900)); shot('perto-rosto-45', 40, (0, 0, 0.80), 0.42, (900, 900)); shot('perto-nuca', 180, (0, 0, 0.80), 0.46, (900, 900))
shot('perto-tronco', 0, (0, 0, 0.48), 0.44, (900, 900)); shot('perto-tronco-costas', 180, (0, 0, 0.48), 0.44, (900, 900)); shot('perto-lado', 90, (0, 0, 0.5), 0.60, (900, 900))
shot('perto-cabelo-lado', 90, (0, 0, 0.82), 0.44, (900, 900)); shot('perto-cabelo-lado2', 270, (0, 0, 0.82), 0.44, (900, 900)); shot('perto-cabelo-cima', 0, (0, 0, 0.84), 0.46, (900, 900), 55)
shot('perto-mao', 15, (float(x1) * 0.80, 0, 0.56), 0.30, (900, 900), 25); shot('perto-botas', 20, (0, 0, 0.12), 0.40, (900, 900), 12)
# vistas em cor pura (sem luz), fundo branco, para o Kontext limpar e voltarem como vistas extras
rv = [x for x in opt('render-vistas', '').split(';') if x]
if rv:
    nt.nodes.clear(); out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission'); ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = tex
    nt.links.new(ti.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    sc.render.film_transparent = False; world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    sun.hide_render = True; sc.render.resolution_x = sc.render.resolution_y = VR; cd.ortho_scale = VS
    for spec in rv:
        az_, el_ = [float(v) for v in spec.split(',')]; back, right, up = cam_basis(az_, el_)
        cam.location = VT + Vector(back) * 6; cam.rotation_euler = (VT - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(prev, f'vista-{int(az_)}-{int(el_)}.png'); bpy.ops.render.render(write_still=True)
log('PINTURA_OK', dst)
