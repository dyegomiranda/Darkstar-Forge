"""
Passo 1 da cabeça careca: "fotografa" a cabeça do modelo original em volta de um centro, numa grade de direções
(longitude × latitude). Para cada direção guarda a distância até a superfície visível, a altura do ponto e a cor da pintura.
Uso: blender -b modelo_normalizado.blend --python raios.py -- saida.npz largura altura cx cy cz
O modelo já deve estar com altura 1, pés em z = 0 e olhando para −Y (ver diag/normalização).
Convenção: u = longitude (0,5 = frente, 0 e 1 = nuca), v = latitude (0 = topo, 1 = embaixo).
"""
import bpy, sys, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]; out = a[0]; W, H = int(a[1]), int(a[2]); C = Vector([float(x) for x in a[3:6]])
o = next(x for x in bpy.data.objects if x.type == 'MESH'); me = o.data
nv = len(me.vertices); co = np.empty(nv * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
nl = len(me.loops); lv = np.empty(nl, dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
uv = np.empty(nl * 2); me.uv_layers[0].data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
tv = lv.reshape(-1, 3); tuv = uv.reshape(-1, 3, 2)                       # o modelo é todo de triângulos
keep = np.nonzero(co[tv][:, :, 2].max(1) > 0.42)[0]                     # só a região da cabeça
bvh = BVHTree.FromPolygons([Vector(c) for c in co], [tuple(int(i) for i in t) for t in tv[keep]])
img = next(n.image for m in me.materials for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeTexImage' and n.image and n.image.name.startswith('Color'))
iw, ih = img.size; px = np.empty(iw * ih * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(ih, iw, 4)[:, :, :3]
u = (np.arange(W) + 0.5) / W; v = (np.arange(H) + 0.5) / H
phi = 2 * np.pi * (u - 0.5); lam = np.pi / 2 - np.pi * v
D = np.stack([np.sin(phi)[None, :] * np.cos(lam)[:, None], -np.cos(phi)[None, :] * np.cos(lam)[:, None], np.sin(lam)[:, None] * np.ones((1, W))], -1)
R = np.full((H, W), np.nan); F = np.full((H, W), -1, dtype=np.int64); L = np.zeros((H, W, 3))
for j in range(H):
    for i in range(W):
        d = Vector(D[j, i]); loc, nor, idx, dist = bvh.ray_cast(C + d * 1.5, -d)      # de fora para dentro: a superfície que se vê
        if loc is not None: R[j, i] = 1.5 - dist; F[j, i] = keep[idx]; L[j, i] = loc
ok = F >= 0; f = F[ok]; p = L[ok]
p0, p1, p2 = co[tv[f, 0]], co[tv[f, 1]], co[tv[f, 2]]
v0, v1, v2 = p1 - p0, p2 - p0, p - p0
d00 = (v0 * v0).sum(1); d01 = (v0 * v1).sum(1); d11 = (v1 * v1).sum(1); d20 = (v2 * v0).sum(1); d21 = (v2 * v1).sum(1); den = d00 * d11 - d01 * d01 + 1e-20
b1 = (d11 * d20 - d01 * d21) / den; b2 = (d00 * d21 - d01 * d20) / den; b0 = 1 - b1 - b2
t = tuv[f, 0] * b0[:, None] + tuv[f, 1] * b1[:, None] + tuv[f, 2] * b2[:, None]
x = np.clip(t[:, 0] % 1.0 * iw - 0.5, 0, iw - 1.001); y = np.clip(t[:, 1] % 1.0 * ih - 0.5, 0, ih - 1.001)
x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
c = (px[y0, x0] * (1 - fx) + px[y0, x0 + 1] * fx) * (1 - fy) + (px[y0 + 1, x0] * (1 - fx) + px[y0 + 1, x0 + 1] * fx) * fy
COL = np.zeros((H, W, 3), dtype=np.float32); COL[ok] = c
np.savez_compressed(out, R=R.astype(np.float32), Z=L[:, :, 2].astype(np.float32), COL=COL, C=np.array(C[:]), F=F)
print('RAIOS', W, H, 'acertos', int(ok.sum()), 'de', W * H, 'centro', [round(x, 4) for x in C])
