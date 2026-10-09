"""
Passo 3 da cabeça careca: monta as peças em 3D, no mesmo espaço do modelo original (altura 1, olhando para −Y).
  Cabeca  malha nova a partir de raio.npy (uma esfera deformada), pintada com cor.png; mascara.png vai junto no arquivo
  Cabelo  faces originais do cabelo (com a pintura original)
  Faixa   faces originais da faixa (com o nó e as pontas)
Uso: blender -b modelo_normalizado.blend --python montar_cabeca.py -- pasta_do_passo2 saida.blend [--tris-cabelo=60000] [--tris-faixa=16000] [--grade=512]
"""
import bpy, bmesh, sys, json, math, numpy as np
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, dst = a[:2]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
info = json.load(open(src + '/cabeca.json')); C = np.array(info['centro']); Rn = np.load(src + '/raio.npy').astype(float); CL = np.load(src + '/classes.npy')
H, W = Rn.shape; NU = int(opt('grade', '512')); NV = NU // 2; fu, fv = W // NU, H // NV      # --grade=256 para a versão leve do jogo
r = Rn.reshape(NV, fv, NU, fu).mean((1, 3))                                   # média por bloco: uma amostra por vértice
for j in range(10):                      # perto dos polos as linhas da grade se juntam: mistura com a média do anel para não marcar um vinco
    k = 1 - j / 10
    for jj in (j, NV - 1 - j): r[jj] = r[jj] * (1 - k) + r[jj].mean() * k
u = (np.arange(NU) + 0.5) / NU; v = (np.arange(NV) + 0.5) / NV; phi = 2 * np.pi * (u - 0.5); lam = np.pi / 2 - np.pi * v
D = np.stack([np.sin(phi)[None, :] * np.cos(lam)[:, None], -np.cos(phi)[None, :] * np.cos(lam)[:, None], np.sin(lam)[:, None] * np.ones((1, NU))], -1)
Pg = C + D * r[..., None]
verts = [tuple(p) for p in Pg.reshape(-1, 3)]; uvs = [(u[i], 1 - v[j]) for j in range(NV) for i in range(NU)]
# coluna repetida na nuca para a pintura emendar
for j in range(NV): verts.append(tuple(Pg[j, 0])); uvs.append((1 + u[0], 1 - v[j]))
topo = len(verts); verts.append(tuple(C + np.array([0, 0, r[0].mean()]))); uvs.append((0.5, 1.0))
base = len(verts); verts.append(tuple(C - np.array([0, 0, r[-1].mean()]))); uvs.append((0.5, 0.0))
def idx(j, i): return j * NU + i if i < NU else NV * NU + j
faces = [(idx(j, i), idx(j + 1, i), idx(j + 1, i + 1), idx(j, i + 1)) for j in range(NV - 1) for i in range(NU)]
faces += [(topo, idx(0, i), idx(0, i + 1)) for i in range(NU)] + [(base, idx(NV - 1, i + 1), idx(NV - 1, i)) for i in range(NU)]
orig = next(x for x in bpy.data.objects if x.type == 'MESH')
me = bpy.data.meshes.new('Cabeca'); me.from_pydata(verts, [], faces); me.update()
uvl = me.uv_layers.new(name='UVMap')
for l in me.loops: uvl.data[l.index].uv = uvs[l.vertex_index]
for p in me.polygons: p.use_smooth = True
head = bpy.data.objects.new('Cabeca', me); bpy.context.scene.collection.objects.link(head)
img = bpy.data.images.load(src + '/cor.png'); img.pack(); msk = bpy.data.images.load(src + '/mascara.png'); msk.colorspace_settings.name = 'Non-Color'; msk.pack(); msk.use_fake_user = True
mat = bpy.data.materials.new('Cabeca'); mat.use_nodes = True; nt = mat.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.75
ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = img; ti.name = 'cor'; nt.links.new(ti.outputs['Color'], bs.inputs['Base Color'])
tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = msk; tm.name = 'mascara'
me.materials.append(mat); head['vs_pele'] = info['pele']; head['vs_centro'] = [float(x) for x in C]
# ── cabelo e faixa: faces do original, escolhidas pela direção (mapa de classes do passo 2) e pela própria cor ──
om = orig.data; nv = len(om.vertices); co = np.empty(nv * 3); om.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
lv = np.empty(len(om.loops), dtype=np.int32); om.loops.foreach_get('vertex_index', lv); tv = lv.reshape(-1, 3)
uvo = np.empty(len(om.loops) * 2); om.uv_layers[0].data.foreach_get('uv', uvo); tuv = uvo.reshape(-1, 3, 2)
timg = next(n.image for m in om.materials for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeTexImage' and n.image and n.image.name.startswith('Color'))
iw, ih = timg.size; px = np.empty(iw * ih * 4, dtype=np.float32); timg.pixels.foreach_get(px); px = px.reshape(ih, iw, 4)[:, :, :3]
cen = co[tv].mean(1); cuv = tuv.mean(1); col = px[np.clip((cuv[:, 1] % 1 * ih).astype(int), 0, ih - 1), np.clip((cuv[:, 0] % 1 * iw).astype(int), 0, iw - 1)]
mx = col.max(1); mn = col.min(1); val = mx; sat = (mx - mn) / np.maximum(mx, 1e-6); dl = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == col[:, 0], ((col[:, 1] - col[:, 2]) / dl) % 6, np.where(mx == col[:, 1], (col[:, 2] - col[:, 0]) / dl + 2, (col[:, 0] - col[:, 1]) / dl + 4)) / 6
d = cen - C; rr = np.linalg.norm(d, axis=1); dn = d / rr[:, None]
pu = (np.arctan2(dn[:, 0], -dn[:, 1]) / (2 * np.pi) + 0.5) % 1; pv = (np.pi / 2 - np.arcsin(np.clip(dn[:, 2], -1, 1))) / np.pi
cl = CL[np.clip((pv * H).astype(int), 0, H - 1), np.clip((pu * W).astype(int), 0, W - 1)]
z = cen[:, 2]; verm = ((hue < 0.045) | (hue > 0.95)) & (sat > 0.62) & (val > 0.2)
pele_ = ~verm & (val > 0.60) & (sat < 0.58) & (hue > 0.02) & (hue < 0.11)
marrom = (hue > 0.02) & (hue < 0.12) & (sat > 0.35) & ~((hue > 0.095) & (val > 0.5))      # sem o dourado das ombreiras
# ao lado do pescoço, abaixo das orelhas, o que há é o topo das ombreiras (dourado e aço escuros passam por "marrom"):
# essas faces não são cabelo — ficavam como cacos soltos junto aos ombros
f_cabelo = (z > 0.60) & ~verm & ~pele_ & (cl != 1) & (cl != 4) & (marrom | ((val < 0.3) & (z > 0.66))) & (rr < 0.40) & ~((np.abs(cen[:, 0]) > 0.185) & (z < 0.665))
f_faixa = verm & (z > 0.60) & (rr < 0.45)
def peca(nome, sel, ilha_minima, semente_z=None, apara=None):
    o = orig.copy(); o.data = orig.data.copy(); bpy.context.scene.collection.objects.link(o); o.name = nome; o.data.name = nome
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f, k in zip(bm.faces, sel) if not k], context='FACES')
    bmesh.ops.delete(bm, geom=[v_ for v_ in bm.verts if not v_.link_faces], context='VERTS')
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    if apara:      # fiapos na beira de baixo (onde o cabelo encostava na pele, na faixa e nas ombreiras): sai toda face
        for _ in range(apara[1]):      # cujos três cantos estão na borda — a tira some, a mecha só perde os dentes da beira
            bv_ = {v for e in bm.edges if len(e.link_faces) == 1 for v in e.verts}
            fora_ = [f for f in bm.faces if f.calc_center_median().z < apara[0] and all(v in bv_ for v in f.verts)]
            if not fora_: break
            bmesh.ops.delete(bm, geom=fora_, context='FACES')
        bmesh.ops.delete(bm, geom=[v_ for v_ in bm.verts if not v_.link_faces], context='VERTS')
    # ilhas: tira migalhas; para a faixa, fica só o que está ligado à faixa propriamente dita (o cachecol é outra ilha)
    vistos = set(); ilhas = []
    for f in bm.faces:
        if f in vistos: continue
        pilha = [f]; vistos.add(f); ilha = []
        while pilha:
            g = pilha.pop(); ilha.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in vistos: vistos.add(h); pilha.append(h)
        ilhas.append(ilha)
    fora = []
    for ilha in ilhas:
        zs = [f.calc_center_median().z for f in ilha[::max(1, len(ilha) // 200)]]
        if len(ilha) < ilha_minima or (semente_z is not None and max(zs) < semente_z): fora += ilha
    bmesh.ops.delete(bm, geom=fora, context='FACES'); bmesh.ops.delete(bm, geom=[v_ for v_ in bm.verts if not v_.link_faces], context='VERTS')
    bm.to_mesh(o.data); bm.free(); print('PECA', nome, len(o.data.polygons), 'faces em', len(ilhas), 'ilhas (antes da limpeza)'); return o
cab = peca('Cabelo', f_cabelo, 400, semente_z=0.675, apara=(0.72, 5)); fai = peca('Faixa', f_faixa, 400, semente_z=0.74)      # ilhas baixas = pontas de ombreira ou cachecol
for o, alvo in ((cab, int(opt('tris-cabelo', '60000'))), (fai, int(opt('tris-faixa', '16000')))):
    n = len(o.data.polygons)
    if n > alvo:
        m = o.modifiers.new('reduz', 'DECIMATE'); m.ratio = alvo / n; m.delimit = {'UV'}
        bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.ops.object.modifier_apply(modifier=m.name)
    for p in o.data.polygons: p.use_smooth = True
orig.name = 'Original'
bpy.ops.wm.save_as_mainfile(filepath=dst); print('MONTADA', dst, 'cabeça', len(me.polygons), 'faces')
