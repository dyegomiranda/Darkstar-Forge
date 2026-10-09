"""
Encaixa no corpo-base um personagem vestido gerado pelo Pixal3D a partir de uma imagem da PRÓPRIA base vestida
(Kontext), e separa em peças trocáveis.

 1. Alinha: a imagem vestida está no mesmo enquadramento do render frontal da base, então a silhueta dela
    diz onde o modelo vestido fica no espaço da base (escala e posição).
 2. Separa por região + cor, conforme o perfil:
      traje     → Cabelo, Cabeca, Tunica, Calca, Luvas, Botas      (camada cosmética)
      armadura  → Elmo, Peitoral, Manoplas, Grevas                 (camada de equipamento)
      peca      → UMA peça gerada sozinha sobre o manequim azul (--nome=Peitoral, ver PECAS): a peça é tudo que não
                  é azul dentro da região esperada. Sem cortes entre peças: a borda é a borda real da roupa.
 3. Reduz cada peça, copia os pesos do corpo (ponto mais próximo) e liga ao mesmo esqueleto.
 4. Marca no corpo o que cada peça cobre (grupos mask_<Peça>) e cria forro/casca onde a peça gerada não tem malha.

Uso: blender -b base_ou_personagem.blend --python fit_outfit.py -- vestida.npz vestida.png saida.blend --perfil=traje|armadura [--ppu=882.76]
Pode ser rodado de novo sobre o .blend de saída para acrescentar outro perfil ao mesmo personagem.
"""
import bpy, bmesh, sys, os, math, numpy as np
from mathutils import kdtree
from mathutils import Vector
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index('--') + 1:]
npz, img_path, dst = a[0], a[1], a[2]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
PPU = float(opt('ppu', str(1024 / 1.16))); PERFIL = opt('perfil', 'traje'); LIMPO = '--limpo' in a   # malha já reconstruída pelo solidify.py
sc = bpy.context.scene
body = bpy.data.objects['Corpo']; arm = bpy.data.objects['Heroi']
bone = {b.name: b for b in arm.data.bones}
def bh(n): return arm.matrix_world @ bone[n].head_local
shoulder, elbow, wrist = bh('DEF-upper_arm.L'), bh('DEF-forearm.L'), bh('DEF-hand.L')
neck_z = bh('DEF-head').z; crotch = bh('DEF-hips').z - 0.032; ankle_z = bh('DEF-foot.L').z

d = np.load(npz); V = d['V'].astype(np.float64); F = d['F']; C = d['C'][:, :3].astype(np.float64)
# --cores=<npz bruto>: a FORMA vem de uma malha limpa (solidify.py: uma casca só, sem superfícies internas) e a COR vem
# dos pontos do modelo bruto, muito mais densos. Os pontos de cor entram como vértices sem faces e sofrem os mesmos ajustes.
is_src = np.zeros(len(V), dtype=bool)
if opt('cores', ''):
    d2 = np.load(opt('cores', '')); V = np.concatenate([V, d2['V'].astype(np.float64)]); C = np.concatenate([C, d2['C'][:, :3].astype(np.float64)])
    is_src = np.concatenate([is_src, np.ones(len(d2['V']), dtype=bool)])

# fragmentos soltos que o gerador às vezes deixa flutuando ao redor: fica só o que está ligado ao corpo
# (ocupação numa grade grossa + preenchimento a partir do tronco)
cell0 = 0.02; lo0 = V.min(0); key0 = np.floor((V - lo0) / cell0).astype(np.int64)
occ = set(map(tuple, np.unique(key0, axis=0)))
start = tuple(np.floor((np.median(V, axis=0) - lo0) / cell0).astype(np.int64))
if start not in occ: start = min(occ, key=lambda c: sum((c[i] - start[i]) ** 2 for i in range(3)))
seen0 = {start}; stack0 = [start]
while stack0:
    cx_, cy_, cz_ = stack0.pop()
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                nb = (cx_ + dx, cy_ + dy, cz_ + dz)
                if nb in occ and nb not in seen0: seen0.add(nb); stack0.append(nb)
dims0 = key0.max(0) + 2; grid0 = np.zeros(dims0, dtype=bool)
for c_ in seen0: grid0[c_] = True
keepv = grid0[key0[:, 0], key0[:, 1], key0[:, 2]]
if not keepv.all():
    print('FRAGMENTOS', int((~keepv).sum()), 'vértices soltos descartados')
    F = F[keepv[F].all(1)]
    newi = np.cumsum(keepv) - 1; V = V[keepv]; C = C[keepv]; is_src = is_src[keepv]; F = newi[F]

# ── 1. alinhamento pela silhueta da imagem ──
im = bpy.data.images.load(img_path); w, h = im.size
px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]      # linha 0 = topo
bg = px[4, 4]; sil = np.abs(px - bg).sum(2) > 0.12
ys, xs = np.where(sil); k = 1024.0 / w
ix0, ix1, iy0, iy1 = xs.min() * k, (xs.max() + 1) * k, ys.min() * k, (ys.max() + 1) * k
X0, X1 = (ix0 - 512) / PPU, (ix1 - 512) / PPU
Z1, Z0 = 0.5 - (iy0 - 512) / PPU, 0.5 - (iy1 - 512) / PPU
vx0, vx1, vz0, vz1 = V[:, 0].min(), V[:, 0].max(), V[:, 2].min(), V[:, 2].max()
sx, sz = (X1 - X0) / (vx1 - vx0), (Z1 - Z0) / (vz1 - vz0); s = (sx + sz) / 2
print('ALINHA escala x', round(sx, 4), 'z', round(sz, 4), 'imagem X', round(X0, 3), round(X1, 3), 'Z', round(Z0, 3), round(Z1, 3))
V[:, 0] = (V[:, 0] - (vx0 + vx1) / 2) * s + (X0 + X1) / 2
V[:, 2] = (V[:, 2] - vz0) * s + Z0 + ((Z1 - Z0) - (vz1 - vz0) * s) / 2
V[:, 1] *= s
dx_legs = float(np.percentile(V[V[:, 2] < 0.3, 0], 50)); V[:, 0] -= dx_legs          # pernas centradas no eixo
# Caminho de volta: de um ponto do personagem montado para o pixel da imagem que gerou a peça. Serve para pintar a
# frente da peça direto da imagem (nítida, sem as falhas de cor do modelo gerado).
XF = dict(R=np.eye(3), S=1.0, T=np.zeros(3), dz=0.0, hc=None, esc=1.0)
px_lin = np.where(px <= 0.04045, px / 12.92, ((px + 0.055) / 1.055) ** 2.4).astype(np.float64)
def to_image(P):
    Q = np.array(P, dtype=np.float64)
    if XF['hc'] is not None: Q = (Q - XF['hc']) / XF['esc'] + XF['hc']
    Q[:, 2] -= XF['dz']
    Q = ((Q - XF['T']) @ XF['R']) / XF['S']
    x_raw = (Q[:, 0] + dx_legs - (X0 + X1) / 2) / s + (vx0 + vx1) / 2
    z_raw = (Q[:, 2] - Z0 - ((Z1 - Z0) - (vz1 - vz0) * s) / 2) / s + vz0
    return (ix0 + (x_raw - vx0) / (vx1 - vx0) * (ix1 - ix0)) / k, (iy0 + (vz1 - z_raw) / (vz1 - vz0) * (iy1 - iy0)) / k
bme = body.data
bco = np.array([list(body.matrix_world @ v.co) for v in bme.vertices])
bn = np.array([list(v.normal) for v in bme.vertices])
def ymid(P, z0, z1):
    q = P[(np.abs(P[:, 0]) < 0.05) & (P[:, 2] > z0) & (P[:, 2] < z1)]; return (q[:, 1].min() + q[:, 1].max()) / 2
V[:, 1] += ymid(bco, crotch + 0.05, neck_z - 0.08) - ymid(V, crotch + 0.05, neck_z - 0.08)

# ── 1b. ajuste fino local (só no perfil "peca") ──
# O gerador redesenha o manequim com proporções um pouco diferentes. O manequim azul em volta da peça é casado com o
# corpo-base (ICP com escala): assim o elmo assenta na cabeça de verdade, a calça na cintura, etc.
if PERFIL == 'peca':
    NOME_ = opt('nome', '')
    g0 = np.clip(C, 0, 1) ** (1 / 2.2); mx0 = g0.max(1); mn0 = g0.min(1); dd0 = np.maximum(mx0 - mn0, 1e-6)
    hue0 = np.where(mx0 == g0[:, 0], ((g0[:, 1] - g0[:, 2]) / dd0) % 6, np.where(mx0 == g0[:, 1], (g0[:, 2] - g0[:, 0]) / dd0 + 2, (g0[:, 0] - g0[:, 1]) / dd0 + 4)) / 6.0
    vblue = (hue0 > 0.54) & (hue0 < 0.74) & ((mx0 - mn0) / np.maximum(mx0, 1e-6) > 0.55) & (mx0 > 0.20)
    vax, vz = np.abs(V[:, 0]), V[:, 2]
    ARTE_ = vblue.mean() < 0.03                      # imagem em tom de pele (arte aprovada), sem manequim azul
    alvo_ = None
    if NOME_ == 'Cabelo' and ARTE_:
        sat0 = (mx0 - mn0) / np.maximum(mx0, 1e-6)
        reg = ((hue0 < 0.09) | (hue0 > 0.97)) & (sat0 > 0.12) & (sat0 < 0.50) & (mx0 > 0.60) & (vz > neck_z + 0.01) & (vax < 0.20) & (V[:, 1] < np.median(V[vz > neck_z + 0.05, 1]))
        alvo_ = bpy.data.objects.get('Cabeca')       # o mesmo rosto: o cabelo assenta na cabeça que já está no corpo
    elif NOME_ in ('Elmo', 'Cabelo'): reg = vblue & (vz > neck_z - 0.10) & (vax < 0.22)
    elif NOME_ == 'Cabeca': reg = (vz > neck_z + 0.02) & (vax < 0.30)
    elif NOME_ in ('Manoplas', 'Luvas'): reg = vblue & (vax > shoulder.x - 0.02) & (vz > crotch) 
    elif NOME_ in ('Grevas', 'Botas'): reg = vblue & (vz < crotch + 0.14)
    elif NOME_ == 'Calca': reg = vblue & (vax < 0.30)
    else: reg = vblue
    ids = np.nonzero(reg)[0]
    if len(ids) > 800:
        rng = np.random.default_rng(1); ids = rng.choice(ids, min(7000, len(ids)), replace=False)
        if alvo_ is not None: tree0 = BVHTree.FromPolygons([alvo_.matrix_world @ v_.co for v_ in alvo_.data.vertices], [list(p_.vertices) for p_ in alvo_.data.polygons])
        else: tree0 = BVHTree.FromPolygons([Vector(c_) for c_ in bco], [list(p_.vertices) for p_ in bme.polygons])
        Sc, Rm, Tv = 1.0, np.eye(3), np.zeros(3)
        for it in range(25):
            Pm = (V[ids] @ Rm.T) * Sc + Tv
            Q = np.array([tuple(tree0.find_nearest(Vector(q))[0]) for q in Pm]); dist = np.linalg.norm(Q - Pm, axis=1)
            ok_ = dist <= np.percentile(dist, 80)
            A_ = V[ids][ok_]; B_ = Q[ok_]; ma, mb = A_.mean(0), B_.mean(0); Ac, Bc = A_ - ma, B_ - mb
            U_, D_, Vt_ = np.linalg.svd(Bc.T @ Ac / len(A_)); Sg = np.eye(3)
            if np.linalg.det(U_) * np.linalg.det(Vt_) < 0: Sg[2, 2] = -1
            Rm = U_ @ Sg @ Vt_; Sc = float(np.trace(np.diag(D_) @ Sg) / (Ac ** 2).sum(1).mean()); Tv = mb - Sc * (Rm @ ma)
        ang = math.degrees(math.acos(max(-1, min(1, (np.trace(Rm) - 1) / 2))))
        print('AJUSTE LOCAL', NOME_, 'pontos', len(ids), 'escala', round(Sc, 4), 'giro', round(ang, 2), 'graus, desloca', [round(float(x), 4) for x in (Sc * (Rm @ V[ids].mean(0)) + Tv - V[ids].mean(0))], 'erro médio', round(float(dist[ok_].mean()), 4))
        if 0.75 < Sc < 1.3 and ang < 25: V = (V @ Rm.T) * Sc + Tv; XF.update(R=Rm, S=Sc, T=Tv)
        else: print('AJUSTE LOCAL descartado (fora do razoável)')

# ── 2. classificação por face ──
cen = V[F].mean(1); col = C[F].mean(1)
srgb = np.clip(col, 0, 1) ** (1 / 2.2)
mx = srgb.max(1); mn = srgb.min(1); val = mx; sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
r, g, b = srgb[:, 0], srgb[:, 1], srgb[:, 2]; dd = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) / 6.0
ax, z = np.abs(cen[:, 0]), cen[:, 2]
green = (hue > 0.27) & (hue < 0.52) & (sat > 0.22)
skin = ((hue < 0.09) | (hue > 0.97)) & (sat > 0.12) & (sat < 0.50) & (val > 0.60)
red = ((hue < 0.045) | (hue > 0.96)) & (sat > 0.55) & (val > 0.18)
gold = (hue > 0.09) & (hue < 0.18) & (sat > 0.50) & (val > 0.45)
x_arm = shoulder.x + 0.03
in_arm = (ax > x_arm) & (z > crotch + 0.02) & (z < neck_z + 0.02)
head_reg = (z > neck_z - 0.005) & ~in_arm
part = np.full(len(F), -1, dtype=np.int8)

def region(fn): return np.array([bool(fn(p)) for p in bco])

if PERFIL == 'traje':
    PARTS = ['Cabelo', 'Cabeca', 'Tunica', 'Calca', 'Luvas', 'Botas']
    glove_col = in_arm & ~skin & ~green & (ax > shoulder.x + 0.07)
    x_cuff = float(np.percentile(ax[glove_col], 1.5)) if glove_col.sum() > 500 else wrist.x - 0.03
    low_gold = gold & (z < crotch - 0.04) & ~in_arm
    boot_top = float(np.percentile(z[low_gold], 99) + 0.004) if low_gold.sum() > 300 else ankle_z + 0.10
    part[head_reg] = 1
    part[red & (z > neck_z - 0.09) & (ax < 0.30) & ~in_arm] = 0
    part[(z > neck_z + 0.30 * (1 - neck_z)) & red] = 0
    # mechas alaranjadas (brilho do cabelo) na metade de cima da cabeça também são cabelo: se ficarem no rosto, furam o elmo
    part[head_reg & (z > neck_z + 0.42 * (1 - neck_z)) & ((hue < 0.085) | (hue > 0.95)) & (sat > 0.5)] = 0
    part[skin & (z > shoulder.z - 0.03) & (z <= neck_z - 0.005) & (ax < 0.07)] = 1
    lower = ~in_arm & (z <= neck_z - 0.005) & (part < 0)
    hem_z = float(np.percentile(z[green & lower], 1.0)) if (green & lower).sum() > 500 else crotch
    dark = (val < 0.24) & ~green
    part[lower] = 2
    part[lower & ((dark & (z < crotch + 0.10)) | (z < hem_z - 0.006))] = 3
    part[lower & (z < boot_top)] = 5
    part[green] = 2
    part[in_arm & (ax >= x_cuff) & ~green] = 4
    part[in_arm & (ax < x_cuff) & ~green] = -1                               # braço nu: é pele do corpo-base
    part[(part == 2) & skin & (z > crotch + 0.10) & (ax > 0.06)] = -1          # ombro de pele grudado na cava
    part[(part == 2) & skin & (z > shoulder.z - 0.03) & (ax <= 0.07)] = 1      # pescoço vai com a cabeça
    waist_z = crotch + 0.125
    print('LIMITES punho', round(x_cuff, 3), 'cano da bota', round(boot_top, 3), 'barra da túnica', round(hem_z, 3), 'pescoço', round(neck_z, 3), 'virilha', round(crotch, 3))
    # manchas não-verdes nas costas da túnica viram o verde mediano
    tn = (part == 2) & green & (z > crotch + 0.10)
    if tn.sum() > 100:
        med = np.median(C[np.unique(F[tn].ravel())], axis=0)
        e1 = V[F[:, 1]] - V[F[:, 0]]; e2 = V[F[:, 2]] - V[F[:, 0]]; nrm = np.cross(e1, e2); nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
        bad = (part == 2) & ~green & ~gold & (z > crotch + 0.17) & (z < shoulder.z + 0.03) & (ax < x_arm) & (nrm[:, 1] > 0.1)
        C[np.unique(F[bad].ravel())] = med
    trouser_col = np.median(C[np.unique(F[(part == 3)].ravel())], axis=0) if (part == 3).sum() > 100 else np.array([0.02, 0.02, 0.02])
    torso = lambda p: abs(p[0]) < x_arm + 0.004
    SPEC = {
        'Cabelo': dict(budget=20000, cell=0.0050, rigid=True, mask=None, slot='cabelo'),
        'Cabeca': dict(budget=24000, cell=0.0034, rigid=True, mask=region(lambda p: p[2] > neck_z + 0.004), slot='rosto'),
        'Tunica': dict(budget=20000, cell=0.0046, mask='ray', slot='tronco', fill=0.20,
                       mask_limit=region(lambda p: p[2] > hem_z - 0.01),
                       lining=dict(where=region(lambda p: torso(p) and hem_z - 0.004 < p[2] < neck_z - 0.004), offset=-0.0018, color='near')),
        'Calca': dict(budget=12000, cell=0.0046, slot='pernas',
                      mask=region(lambda p: torso(p) and boot_top - 0.012 < p[2] < waist_z - 0.012),
                      lining=dict(where=region(lambda p: torso(p) and boot_top - 0.02 < p[2] < waist_z), offset=0.0026, color=tuple(trouser_col), all=True)),
        'Luvas': dict(budget=8000, cell=0.0040, mask=region(lambda p: abs(p[0]) > x_cuff + 0.04), slot='maos'),
        'Botas': dict(budget=8000, cell=0.0042, mask=region(lambda p: p[2] < boot_top - 0.012), slot='pes'),
    }
    LAYER = 'cosmetico'
elif PERFIL == 'peca':
    NOME = opt('nome', '')
    knee_z = bh('DEF-shin.L').z
    blue = (hue > 0.54) & (hue < 0.74) & (sat > 0.55) & (val > 0.20)            # o manequim (aço e malha azulados têm saturação baixa e ficam)
    body_reg = lambda zmin, zmax, xmax: (z > zmin) & (z < zmax) & (ax < xmax)
    arm_band = (z > crotch + 0.02) & (z < neck_z + 0.06)
    PECAS = {
        'Elmo': dict(camada='equipamento', slot='cabeca', rigid=True, budget=22000, cell=0.0036, fill=0.16, escala=1.03, keep=(z > neck_z - 0.035) & (ax < 0.34) & ~((ax > x_arm + 0.02) & (z < neck_z + 0.03))),
        'Peitoral': dict(camada='equipamento', slot='tronco', budget=34000, cell=0.0046, sharpen=3, mask='ray', lining=True,
                         keep=(z > knee_z + 0.015) & (z < neck_z + 0.075) & (ax < elbow.x + 0.004) & ~((z > neck_z + 0.02) & (ax > 0.12) & (ax < x_arm))),
        'Manoplas': dict(camada='equipamento', slot='maos', budget=10000, cell=0.0040, sharpen=3, mask='ray', keep=(ax > elbow.x - 0.012) & arm_band),
        'Grevas': dict(camada='equipamento', slot='pernas', budget=18000, cell=0.0044, sharpen=3, mask='abaixo', chao=True, keep=body_reg(-1, knee_z + 0.075, 0.26)),
        'Tunica': dict(camada='cosmetico', slot='tronco', budget=22000, cell=0.0046, mask='ray', lining=True, keep=body_reg(knee_z, neck_z + 0.05, elbow.x)),
        'Calca': dict(camada='cosmetico', slot='pernas', budget=14000, cell=0.0046, mask='ray', lining=True, keep=body_reg(ankle_z - 0.03, crotch + 0.17, 0.26)),
        'Luvas': dict(camada='cosmetico', slot='maos', budget=8000, cell=0.0040, mask='ray', keep=(ax > elbow.x + 0.05) & arm_band),
        'Botas': dict(camada='cosmetico', slot='pes', budget=9000, cell=0.0042, mask='abaixo', chao=True, keep=body_reg(-1, knee_z + 0.01, 0.26)),
        'Cabelo': dict(camada='cosmetico', slot='cabelo', rigid=True, budget=24000, cell=0.0044, fill=0.30, escala=1.035, keep=(z > neck_z - 0.07) & (ax < 0.36) & ~((ax > x_arm + 0.02) & (z < neck_z + 0.03))),
        # a cabeça com rosto vem de uma imagem em tom de pele (sem manequim azul): fica tudo do pescoço para cima
        'Cabeca': dict(camada='cosmetico', slot='rosto', rigid=True, budget=24000, cell=0.0034, keep=head_reg, tudo=True, mask=region(lambda p: p[2] > neck_z + 0.004)),
    }
    cfg = PECAS[NOME]
    ARTE = blue.mean() < 0.03
    if NOME == 'Cabelo' and ARTE:      # cabelo da arte aprovada: separado pela cor (ruivo + mechas claras no alto da cabeça)
        cfg = dict(cfg, tudo=True, escala=1.02)
        part[(z > neck_z - 0.09) & (ax < 0.32) & (red | (((hue < 0.085) | (hue > 0.95)) & (sat > 0.5) & (z > neck_z + 0.11)))] = 0
    else:
        part[cfg['keep'] & (np.ones(len(F), dtype=bool) if cfg.get('tudo') else ~blue)] = 0
    pv_ = np.unique(F[part == 0].ravel())
    if cfg.get('chao') and len(pv_):          # calçados: a sola fica logo abaixo da sola do pé, seja qual for a perna que o gerador desenhou
        dz = -0.012 - V[pv_, 2].min(); V[:, 2] += dz; cen[:, 2] += dz; z = cen[:, 2]; XF['dz'] = float(dz); print('CHAO', NOME, 'desloca', round(float(dz), 4))
    if cfg.get('escala') and len(pv_):        # cabelo e elmo um pouco maiores que a cabeça, para a cabeça com rosto caber dentro
        hc = np.array([0.0, float(np.median(V[pv_, 1])), neck_z + 0.13]); V[pv_] = (V[pv_] - hc) * cfg['escala'] + hc; XF.update(hc=hc, esc=cfg['escala'])
    PARTS = [NOME]; LAYER = cfg['camada']
    # a região do corpo em que esta peça pode esconder pele / ganhar forro: a mesma faixa, medida nos vértices do corpo
    bax, bz = np.abs(bco[:, 0]), bco[:, 2]
    lim = {'Peitoral': (bz > knee_z + 0.03) & (bz < neck_z + 0.03) & (bax < elbow.x - 0.01), 'Manoplas': bax > elbow.x + 0.005, 'Luvas': bax > elbow.x + 0.06,
           'Grevas': (bz < crotch + 0.02) & (bax < 0.26), 'Tunica': (bz > knee_z) & (bz < neck_z + 0.01) & (bax < elbow.x - 0.01),
           'Calca': (bz < crotch + 0.16) & (bax < 0.26), 'Botas': (bz < knee_z) & (bax < 0.26)}.get(NOME)
    SPEC = {NOME: dict(budget=cfg['budget'], cell=cfg['cell'], rigid=cfg.get('rigid', False), slot=cfg['slot'], sharpen=cfg.get('sharpen', 1), fill=cfg.get('fill', 0.10),
                       mask=cfg.get('mask'), sem_azul=not cfg.get('tudo'), borda=True, textura=True)}
    if lim is not None: SPEC[NOME]['mask_limit'] = lim
    if cfg.get('lining'): SPEC[NOME]['lining'] = dict(where=lim, offset=-0.0018, color='near', cov=True)
    print('PEÇA ÚNICA', NOME, 'azul', int(blue.sum()), 'de', len(F))
else:
    PARTS = ['Elmo', 'Peitoral', 'Manoplas', 'Grevas']
    # barra da saia/escarcelas: onde deixa de existir malha no plano central, descendo a partir da cintura
    z_hem = crotch
    for zz in np.arange(crotch + 0.06, 0.12, -0.004):
        if not ((ax < 0.012) & (z >= zz) & (z < zz + 0.004)).any(): z_hem = float(zz + 0.004); break
    x_gaunt = elbow.x - 0.012
    helm = head_reg & ((z > neck_z + 0.035) | (skin & (ax < 0.07))) & ((ax < 0.17) | (z > neck_z + 0.09))
    part[head_reg & ~helm] = 1
    part[helm] = 0
    # o elmo é só o metal: o rosto por baixo é sempre a mesma Cabeca cosmética (um rosto único, sem versão distorcida por armadura)
    part[helm & (skin | red | (((hue < 0.08) | (hue > 0.95)) & (sat > 0.55) & (val > 0.42)) | ((val > 0.55) & (sat < 0.45) & (hue < 0.12)))] = -1
    part[~head_reg & ~in_arm] = 1
    part[in_arm] = 1
    part[in_arm & (ax >= x_gaunt)] = 2
    part[~head_reg & ~in_arm & (z < z_hem)] = 3
    print('LIMITES barra', round(z_hem, 3), 'manopla', round(float(x_gaunt), 3), 'pescoço', round(neck_z, 3), 'virilha', round(crotch, 3))
    SPEC = {
        'Elmo': dict(budget=22000, cell=0.0036, rigid=True, mask=None, slot='cabeca'),
        'Peitoral': dict(budget=30000, cell=0.0046, mask='ray', slot='tronco', fill=0.16,
                         mask_limit=region(lambda p: p[2] > z_hem - 0.02 and abs(p[0]) < x_gaunt + 0.004),
                         lining=dict(where=region(lambda p: z_hem - 0.006 < p[2] < neck_z - 0.004 and abs(p[0]) < x_gaunt), offset=-0.0018, color='near')),
        'Manoplas': dict(budget=10000, cell=0.0040, mask=region(lambda p: abs(p[0]) > x_gaunt + 0.035), slot='maos'),
        'Grevas': dict(budget=18000, cell=0.0044, slot='pernas', fill=0.10,
                       mask=region(lambda p: p[2] < z_hem - 0.012 and abs(p[0]) < x_arm + 0.004),
                       lining=dict(where=region(lambda p: ankle_z + 0.01 < p[2] < z_hem + 0.004 and abs(p[0]) < x_arm + 0.004), offset=-0.0018, color='near', all=True)),
    }
    LAYER = 'equipamento'
for i, n in enumerate(PARTS): print('PEÇA', n, int((part == i).sum()), 'faces')

# ── 3. peças ──
def cluster(pv, pf, pc, cell):
    """Funde os vértices que caem na mesma célula de uma grade (posição e cor médias). Aguenta qualquer topologia,
    inclusive as mechas finas e soltas do cabelo, onde a redução por colapso do Blender empaca."""
    key = np.floor(pv / cell).astype(np.int64); key -= key.min(0)
    dims = key.max(0) + 1
    flat = (key[:, 0] * dims[1] + key[:, 1]) * dims[2] + key[:, 2]
    uq, inv = np.unique(flat, return_inverse=True)
    cnt = np.bincount(inv).astype(np.float64)[:, None]
    nv = np.zeros((len(uq), 3)); np.add.at(nv, inv, pv); nv /= cnt
    nc = np.zeros((len(uq), pc.shape[1])); np.add.at(nc, inv, pc); nc /= cnt
    nf = inv[pf]
    ok = (nf[:, 0] != nf[:, 1]) & (nf[:, 1] != nf[:, 2]) & (nf[:, 0] != nf[:, 2]); nf = nf[ok]
    _, first = np.unique(np.sort(nf, axis=1), axis=0, return_index=True); nf = nf[np.sort(first)]
    return nv.astype(np.float32), nf.astype(np.int32), nc.astype(np.float32)

def bake_texture(o, pts, cols, cell, path, projetar=None, casca=0.0):
    """Cor repintada numa textura. Cada triângulo da peça ganha a sua própria célula num atlas (não depende de abrir a
    malha em UV, o que falha nestas malhas geradas) e cada pixel recebe a MEDIANA das cores dos 5 pontos mais próximos da
    malha original (milhões de pontos): a cor deixa de depender da quantidade de vértices e os pontos soltos somem.
    Entre os pontos próximos vale só a CAMADA DE FORA: o modelo gerado tem superfícies internas (globo ocular, interior da
    boca, mechas de baixo do cabelo) que não podem manchar a pele."""
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.quads_convert_to_tris(quad_method='BEAUTY', ngon_method='BEAUTY')
    bpy.ops.object.mode_set(mode='OBJECT')
    me = o.data; nt = len(me.polygons)
    n = int(math.ceil(math.sqrt(nt / 2 + 2))); size = n * cell
    li = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', li)
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    T3 = co[li].reshape(-1, 3, 3)
    t = np.arange(nt); c = t // 2 + 1; x0 = (c % n) * cell; y0 = (c // n) * cell; up = (t % 2) == 1
    lowc = np.array([[1.0, 1.0], [cell - 2.5, 1.0], [1.0, cell - 2.5]]); upc = np.array([[cell - 1.0, cell - 1.0], [2.5, cell - 1.0], [cell - 1.0, 2.5]])
    corners = np.where(up[:, None, None], upc[None], lowc[None]) + np.stack([x0, y0], 1)[:, None, :]
    uvl = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap'); uvl.data.foreach_set('uv', (corners / size).ravel())
    ii, jj = np.meshgrid(np.arange(cell), np.arange(cell))
    def weights(mask, cn):
        px = np.stack([ii[mask] + 0.5, jj[mask] + 0.5], 1); A, B, C_ = cn
        den = (B[1] - C_[1]) * (A[0] - C_[0]) + (C_[0] - B[0]) * (A[1] - C_[1])
        w0 = ((B[1] - C_[1]) * (px[:, 0] - C_[0]) + (C_[0] - B[0]) * (px[:, 1] - C_[1])) / den
        w1 = ((C_[1] - A[1]) * (px[:, 0] - C_[0]) + (A[0] - C_[0]) * (px[:, 1] - C_[1])) / den
        W = np.clip(np.stack([w0, w1, 1 - w0 - w1], 1), 0, 1); W /= W.sum(1, keepdims=True)
        return W, ii[mask], jj[mask]
    img = np.ones((size * size, 3))
    if casca > 0:
        # forma limpa + cor do modelo bruto: valem só os pontos de cor que estão na casca de fora (até "casca" da superfície).
        # Onde o modelo bruto tem um furo na pele, os pontos mais próximos seriam o globo ocular ou o interior da boca.
        shell_bvh = BVHTree.FromPolygons([Vector(c_) for c_ in co], [list(p_.vertices) for p_ in me.polygons])
        ok_s = np.fromiter((shell_bvh.find_nearest(Vector(q), casca)[0] is not None for q in pts), dtype=bool, count=len(pts))
        print('CASCA', o.name, int(ok_s.sum()), 'de', len(pts), 'pontos de cor na camada de fora'); pts = pts[ok_s]; cols = cols[ok_s]
    step = max(1, len(pts) // 1200000); dp = pts[::step]; dc = cols[::step]
    kd = kdtree.KDTree(len(dp))
    for i_, q in enumerate(dp): kd.insert(q, i_)
    kd.balance()
    total = 0
    if projetar is not None: self_bvh = BVHTree.FromPolygons([Vector(c_) for c_ in co], [list(p_.vertices) for p_ in me.polygons])
    for is_up, cn, mask in ((False, lowc, (ii + jj) <= cell - 2), (True, upc, (ii + jj) >= cell - 1)):
        W, pi, pj = weights(mask, cn); sel = np.nonzero(up == is_up)[0]
        if not len(sel): continue
        P = np.einsum('mk,tkd->tmd', W, T3[sel]).reshape(-1, 3)
        pix = ((y0[sel][:, None] + pj[None]) * size + (x0[sel][:, None] + pi[None])).ravel()
        tn = np.cross(T3[sel][:, 1] - T3[sel][:, 0], T3[sel][:, 2] - T3[sel][:, 0]); tn /= np.maximum(np.linalg.norm(tn, axis=1, keepdims=True), 1e-12)
        N = np.repeat(tn, W.shape[0], axis=0)
        near = np.array([[r[1] for r in kd.find_n(q, 8)] for q in P], dtype=np.int64)
        depth = np.einsum('nkd,nd->nk', dp[near] - P[:, None, :], N)                 # quanto cada vizinho está para fora da superfície
        outer = depth >= depth.max(1, keepdims=True) - 0.0012
        cc = np.where(outer[:, :, None], dc[near], np.nan)
        col3 = np.nanmedian(cc, axis=1)
        if projetar is not None:
            # frente da peça: a cor vem direto da imagem (o que a câmera da imagem enxergava), misturada suavemente nas bordas
            front = np.clip((-tn[:, 1] - 0.35) / 0.35, 0, 1)
            cent = T3[sel].mean(1) + tn * 0.003
            vis = np.array([self_bvh.ray_cast(Vector(c_), Vector((0, -1, 0)))[0] is None for c_ in cent])
            wt = np.repeat(front * vis, W.shape[0])
            fx, fy = projetar['fn'](P); ih, iw = projetar['img'].shape[:2]
            xi = np.clip(np.round(fx).astype(np.int64), 0, iw - 1); yi = np.clip(np.round(fy).astype(np.int64), 0, ih - 1)
            pc_ = projetar['img'][yi, xi]
            ok_p = (np.abs(projetar['srgb'][yi, xi] - projetar['bg']).sum(1) > 0.14) & (fx >= 0) & (fx < iw) & (fy >= 0) & (fy < ih)
            if projetar.get('sem_azul'):
                g_ = projetar['srgb'][yi, xi]; ok_p &= ~((g_[:, 2] > g_[:, 0] * 1.35) & (g_[:, 2] > g_[:, 1] * 1.2) & (g_.max(1) - g_.min(1) > 0.25))
            # só confia na imagem quando ela concorda, em linhas gerais, com a cor do modelo (evita pintar fundo/manequim na borda)
            ok_p &= np.abs(pc_ - col3).sum(1) < 0.55
            wt = wt * ok_p
            col3 = pc_ * wt[:, None] + col3 * (1 - wt[:, None]); proj_n = int((wt > 0.5).sum())
            print('PROJECAO', o.name, 'lado', 'cima' if is_up else 'baixo', proj_n, 'de', len(pix))
        img[pix] = col3; total += len(pix)
    img = img.reshape(size, size, 3); img[:cell, :cell] = 1.0                           # célula 0, branca: é onde o forro aponta
    srgb_ = np.where(img <= 0.0031308, img * 12.92, 1.055 * np.clip(img, 0, None) ** (1 / 2.4) - 0.055)
    rgba = np.concatenate([np.clip(srgb_, 0, 1), np.ones((size, size, 1))], axis=2).astype(np.float32)
    im = bpy.data.images.get('T_' + o.name)
    if im: bpy.data.images.remove(im)
    im = bpy.data.images.new('T_' + o.name, size, size, alpha=False); im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = path; im.file_format = 'PNG'; im.save(); im.pack()
    print('TEXTURA', o.name, size, 'px,', nt, 'triângulos,', total, 'pixels pintados a partir de', len(dp), 'pontos')
    return im

def smooth_normals(o, rounds=8):
    """Sombreamento limpo: as normais vêm de uma cópia bem alisada da malha, enquanto a forma (silhueta) fica como está.
    Sem isso o relevo miúdo das malhas geradas vira pontos escuros no sombreamento em faixas."""
    me = o.data; bm = bmesh.new(); bm.from_mesh(me)
    for _ in range(rounds): bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update(); nr = [tuple(v.normal) if v.normal.length > 0 else (0, 0, 1) for v in bm.verts]; bm.free()
    for p_ in me.polygons: p_.use_smooth = True
    me.normals_split_custom_set_from_vertices(nr)

gnames = [g_.name for g_ in body.vertex_groups]
deform = [i for i, n in enumerate(gnames) if not n.startswith('mask_')]
bw = np.zeros((len(bme.vertices), len(gnames)), dtype=np.float32)
for v in bme.vertices:
    for gr in v.groups: bw[v.index, gr.group] = gr.weight
bw[:, [i for i in range(len(gnames)) if i not in deform]] = 0
bpoly = [list(p.vertices) for p in bme.polygons]
# árvore de busca na malha ORIGINAL do corpo (sem as máscaras das peças já encaixadas, que removem faces)
body_bvh = BVHTree.FromPolygons([Vector(c_) for c_ in bco], bpoly)
bbm = bmesh.new(); bbm.from_mesh(bme); bbm.verts.ensure_lookup_table()
def erode(cov, rings=1):
    for _ in range(rings):
        cov = np.array([cov[v.index] and all(cov[e.other_vert(v).index] for e in v.link_edges) for v in bbm.verts])
    return cov
def dilate(cov, rings=1):
    for _ in range(rings):
        cov = np.array([cov[v.index] or any(cov[e.other_vert(v).index] for e in v.link_edges) for v in bbm.verts])
    return cov

for i, name in enumerate(PARTS):
    sp = SPEC[name]
    f = F[part == i]
    if len(f) < 50: print('VAZIA', name); continue
    for old in [o for o in bpy.data.objects if o.name == name]: bpy.data.objects.remove(old)
    idx, inv = np.unique(f.ravel(), return_inverse=True)
    if sp.get('sem_azul'):
        vc_ = C[idx].copy(); fl = inv.reshape(-1, 3)
        g_ = np.clip(vc_, 0, 1) ** (1 / 2.2); mx_ = g_.max(1); mn_ = g_.min(1)
        azul = (g_[:, 2] >= mx_ - 1e-6) & ((mx_ - mn_) / np.maximum(mx_, 1e-6) > 0.50) & (g_[:, 2] > g_[:, 1] * 1.25) & (mx_ > 0.2)
        for _ in range(6):
            if not azul.any(): break
            ok_ = ~azul[fl]; n_ok = ok_.sum(1)
            mean = (vc_[fl] * ok_[:, :, None]).sum(1) / np.maximum(n_ok, 1)[:, None]
            acc = np.zeros_like(vc_); cnt_ = np.zeros(len(vc_))
            for k_ in range(3):
                sel = azul[fl[:, k_]] & (n_ok > 0)
                np.add.at(acc, fl[sel, k_], mean[sel]); np.add.at(cnt_, fl[sel, k_], 1)
            got = cnt_ > 0; vc_[got] = acc[got] / cnt_[got][:, None]; azul &= ~got
        C[idx] = vc_
    if LIMPO: pv, pf, pc = V[idx].astype(np.float32), inv.reshape(-1, 3).astype(np.int32), np.c_[C[idx], np.ones(len(idx))].astype(np.float32)
    else: cell = sp['cell']; pv, pf, pc = cluster(V[idx], inv.reshape(-1, 3), np.c_[C[idx], np.ones(len(idx))], cell)
    while not LIMPO and len(pf) > sp['budget'] * 2.0 and cell < 0.012:       # malhas muito emaranhadas: grade mais grossa até caber
        cell *= 1.18; pv, pf, pc = cluster(V[idx], inv.reshape(-1, 3), np.c_[C[idx], np.ones(len(idx))], cell)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(pv)); me.vertices.foreach_set('co', pv.ravel())
    me.loops.add(len(pf) * 3); me.loops.foreach_set('vertex_index', pf.ravel())
    me.polygons.add(len(pf)); me.polygons.foreach_set('loop_start', np.arange(0, len(pf) * 3, 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(len(pf), 3, dtype=np.int32))
    me.update(calc_edges=True)
    ca = me.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT'); ca.data.foreach_set('color', pc.ravel())
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    # migalhas soltas, rasgos pequenos, normais, alisamento de forma e cor
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    seen = set(); dead = []
    for v in bm.verts:
        if v.index in seen: continue
        stack = [v]; seen.add(v.index); comp = [v]
        while stack:
            u = stack.pop()
            for e in u.link_edges:
                w_ = e.other_vert(u)
                if w_.index not in seen: seen.add(w_.index); stack.append(w_); comp.append(w_)
        if len(comp) < max(300, len(bm.verts) * 0.01): dead += comp
    bmesh.ops.delete(bm, geom=dead, context='VERTS')
    used = set(); small = []
    for e0 in [e for e in bm.edges if e.is_boundary]:
        if e0.index in used: continue
        loop = [e0]; used.add(e0.index); stack = [e0]
        while stack:
            e = stack.pop()
            for v in e.verts:
                for e2 in v.link_edges:
                    if e2.is_boundary and e2.index not in used: used.add(e2.index); loop.append(e2); stack.append(e2)
        if sum(e.calc_length() for e in loop) < sp.get('fill', 0.08) and len(loop) >= 3: small += loop
    if small:
        try: bmesh.ops.holes_fill(bm, edges=small, sides=0)
        except Exception as ex: print('RASGO_ERRO', ex)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sp.get('borda') and name != 'Cabelo':
        for _ in range(6):
            mv = {}
            for v in bm.verts:
                nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
                if len(nb) == 2: mv[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
            for v, c_ in mv.items(): v.co = c_
    if name != 'Cabelo': bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    cl = bm.verts.layers.float_color.get('Color')
    if cl:
        for _ in range(3):
            newc = {}
            for v in bm.verts:
                ring = {v}
                for e in v.link_edges:
                    w_ = e.other_vert(v); ring.add(w_)
                    for e2 in w_.link_edges: ring.add(e2.other_vert(w_))
                cols = np.array([w_[cl][:3] for w_ in ring])
                newc[v] = tuple(np.median(cols, axis=0)) + (1.0,)
            for v, c_ in newc.items(): v[cl] = c_
    if name != 'Cabelo':
        for _ in range(2): bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(me); bm.free()
    tris = len(me.polygons)
    if tris > sp['budget']:
        dm = o.modifiers.new('reduz', 'DECIMATE'); dm.ratio = sp['budget'] / tris
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=dm.name)
    me = o.data
    for p in me.polygons: p.use_smooth = True
    pcol_keep = None
    mat = bpy.data.materials.new('M_' + name); mat.use_nodes = True
    nt = mat.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.9
    vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Color'
    if sp.get('textura'):
        pcol_keep = np.empty(len(me.vertices) * 4, dtype=np.float32); me.color_attributes['Color'].data.foreach_get('color', pcol_keep); pcol_keep = pcol_keep.reshape(-1, 4)
        PROJ = dict(fn=to_image, img=px_lin, srgb=px.astype(np.float64), bg=np.array(bg, dtype=np.float64), sem_azul=bool(sp.get('sem_azul'))) if '--projetar' in a else None      # experimental: o registro imagem↔modelo ainda não é confiável
        if is_src.any():
            lo_, hi_ = V[idx].min(0) - 0.03, V[idx].max(0) + 0.03
            sm_ = is_src & (V >= lo_).all(1) & (V <= hi_).all(1)
            if sp.get('sem_azul'): sm_ &= ~vblue
            if name == 'Cabeca':
                # O modelo gerado traz "flocos" esbranquiçados na pele (junto aos olhos, orelhas) e vermelho-escuros no queixo.
                # Fora da região dos olhos, esses pontos não servem de cor: a pele em volta preenche o lugar.
                g_ = np.clip(C, 0, 1) ** (1 / 2.2); mxp = g_.max(1); mnp = g_.min(1); ddp = np.maximum(mxp - mnp, 1e-6); satp = (mxp - mnp) / np.maximum(mxp, 1e-6)
                huep = np.where(mxp == g_[:, 0], ((g_[:, 1] - g_[:, 2]) / ddp) % 6, np.where(mxp == g_[:, 1], (g_[:, 2] - g_[:, 0]) / ddp + 2, (g_[:, 0] - g_[:, 1]) / ddp + 4)) / 6.0
                front_ = V[:, 1] < np.median(V[sm_, 1])
                iris = sm_ & front_ & (huep > 0.05) & (huep < 0.14) & (satp > 0.60) & (mxp > 0.45) & (V[:, 2] > neck_z + 0.03)
                if iris.sum() > 200:
                    ez = float(np.median(V[iris, 2])); exl = float(np.median(V[iris & (V[:, 0] < 0), 0])); exr = float(np.median(V[iris & (V[:, 0] > 0), 0]))
                    in_eye = (np.abs(V[:, 2] - ez) < 0.013) & ((np.abs(V[:, 0] - exl) < 0.036) | (np.abs(V[:, 0] - exr) < 0.036)) & front_
                    floco = ((satp < 0.17) & (mxp > 0.30)) | ((mxp < 0.48) & ((huep < 0.05) | (huep > 0.93)) & (satp > 0.30) & (V[:, 2] < ez - 0.045))
                    tira = sm_ & floco & ~in_eye
                    print('PELE', name, 'olhos em z', round(ez, 3), 'x', round(exl, 3), round(exr, 3), '| flocos removidos da cor:', int(tira.sum()), 'de', int(sm_.sum()))
                    sm_ &= ~tira
            tex = bake_texture(o, V[sm_], C[sm_], 8, os.path.join(os.path.dirname(npz), 'tex_' + name + '.png'), PROJ, casca=0.003)
        else:
            tex = bake_texture(o, V[idx], C[idx], 8, os.path.join(os.path.dirname(npz), 'tex_' + name + '.png'), PROJ)
        me = o.data
        # a triangulação/UV pode ter mudado a ordem: guarda a cor por vértice só para colorir o forro, e deixa a peça branca
        pcol_keep = np.empty(len(me.vertices) * 4, dtype=np.float32); me.color_attributes['Color'].data.foreach_get('color', pcol_keep); pcol_keep = pcol_keep.reshape(-1, 4)
        me.color_attributes['Color'].data.foreach_set('color', np.ones(len(me.vertices) * 4, dtype=np.float32))
        smooth_normals(o)
        ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = tex; ti.interpolation = 'Linear'
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
        nt.links.new(ti.outputs['Color'], mx.inputs[6]); nt.links.new(vc.outputs['Color'], mx.inputs[7]); nt.links.new(mx.outputs[2], bs.inputs['Base Color'])
    else:
        nt.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
    me.materials.append(mat)
    # pesos: peças da cabeça são rígidas; o resto copia do corpo pelo ponto mais próximo
    if sp.get('rigid'):
        o.vertex_groups.new(name='DEF-head').add(range(len(me.vertices)), 1.0, 'REPLACE')
    else:
        vg = {}
        for v in me.vertices:
            loc, nor, fi, dist = body_bvh.find_nearest(o.matrix_world @ v.co)
            vs = bpoly[fi]; ws = np.array([1.0 / max(1e-6, (Vector(bco[j]) - loc).length) for j in vs]); ws /= ws.sum()
            wsum = (bw[vs] * ws[:, None]).sum(0)
            if sp.get('sharpen', 1) != 1: wsum = wsum ** sp['sharpen']; wsum = wsum / max(1e-9, wsum.sum())
            for gi in np.nonzero(wsum > 0.01)[0]: vg.setdefault(gi, []).append((v.index, float(wsum[gi])))
        for gi, lst in vg.items():
            grp = o.vertex_groups.new(name=gnames[gi])
            for vi, wt in lst: grp.add([vi], wt, 'REPLACE')
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
        bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=1 if sp.get('sharpen', 1) != 1 else 3)
        bpy.ops.object.vertex_group_normalize_all(lock_active=False)
        bpy.ops.object.mode_set(mode='OBJECT')
    # o que a peça cobre no corpo
    t = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())
    cov = None; is_ray = isinstance(sp.get('mask'), str) and sp['mask'] == 'ray'
    if isinstance(sp.get('mask'), str) and sp['mask'] == 'abaixo':      # calçados: esconde o pé e a perna inteiros abaixo do cano
        top_z = max((o.matrix_world @ v.co).z for v in o.data.vertices)
        cov = (bco[:, 2] < top_z - 0.02) & (np.abs(bco[:, 0]) < 0.26)
    if isinstance(sp.get('mask'), np.ndarray): cov = sp['mask'].copy()
    elif is_ray:
        cov = np.zeros(len(bco), dtype=bool)
        for j in range(len(bco)):
            p = Vector(bco[j]); n_ = Vector(bn[j])
            if t.ray_cast(p + n_ * 0.0005, n_, 0.09)[0] is not None or t.find_nearest(p, 0.006)[0] is not None: cov[j] = True
        cov = erode(dilate(cov, 5), 5)                # fecha os buracos da cobertura (rasgos da peça gerada)
        if 'mask_limit' in sp: cov &= sp['mask_limit']
    # forro/casca: cópia das faces do corpo por baixo da peça, com os pesos do próprio corpo. Qualquer rasgo ou
    # parte que a geração não modelou (cós da calça sob a túnica) mostra tecido, nunca pele ou vazio.
    ln = sp.get('lining')
    if ln is not None:
        lin = ln['where'] if ln.get('all') else ((erode(cov, 1) & ln['where']) if ln.get('cov') else (dilate(cov, 1) & ln['where']))
        lf = [list(p.vertices) for p in bme.polygons if all(lin[j] for j in p.vertices)]
        if lf:
            ids = sorted({j for f_ in lf for j in f_}); remap = {j: k_ for k_, j in enumerate(ids)}
            pcol = np.empty(len(o.data.vertices) * 4, dtype=np.float32); o.data.color_attributes['Color'].data.foreach_get('color', pcol); pcol = pcol.reshape(-1, 4)
            if pcol_keep is not None and len(pcol_keep) == len(pcol): pcol = pcol_keep
            ppoly = [list(p.vertices) for p in o.data.polygons]
            lme = bpy.data.meshes.new('Forro')
            lme.from_pydata([list(Vector(bco[j]) + Vector(bn[j]) * ln['offset']) for j in ids], [], [[remap[j] for j in f_] for f_ in lf]); lme.update()
            lca = lme.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT')
            for k_, j in enumerate(ids):
                if ln['color'] == 'near':
                    near = t.find_nearest(Vector(bco[j]))
                    lca.data[k_].color = tuple(pcol[ppoly[near[2]]].mean(0)) if near[0] is not None else (0.2, 0.2, 0.2, 1)
                else: lca.data[k_].color = tuple(ln['color'][:3]) + (1.0,)
            for pl in lme.polygons: pl.use_smooth = True
            if sp.get('textura'):
                lu = lme.uv_layers.new(name='UVMap'); lu.data.foreach_set('uv', np.full(len(lme.loops) * 2, 4.0 / max(1, tex.size[0])))
            lo = bpy.data.objects.new('Forro', lme); sc.collection.objects.link(lo)
            for gi in deform:
                sel = [(k_, float(bw[j, gi])) for k_, j in enumerate(ids) if bw[j, gi] > 0.005]
                if sel:
                    grp = lo.vertex_groups.new(name=gnames[gi])
                    for k_, wt in sel: grp.add([k_], wt, 'REPLACE')
            lme.materials.append(mat)
            bpy.ops.object.select_all(action='DESELECT'); lo.select_set(True); o.select_set(True); bpy.context.view_layer.objects.active = o
            bpy.ops.object.join()
            print('FORRO', name, len(ids), 'vértices')
    if cov is not None:
        if is_ray or ln is not None: cov = erode(cov, 2 if sp.get('borda') else 1)
        gname = 'mask_' + name
        g_ = body.vertex_groups.get(gname)
        if g_: body.vertex_groups.remove(g_)
        g_ = body.vertex_groups.new(name=gname); g_.add([int(j) for j in np.nonzero(cov)[0]], 1.0, 'REPLACE')
        mm = body.modifiers.get(gname) or body.modifiers.new(gname, 'MASK'); mm.vertex_group = gname; mm.invert_vertex_group = True
        o['vs_mask'] = gname
    o.parent = arm; md = o.modifiers.new('Esqueleto', 'ARMATURE'); md.object = arm
    o['vs_slot'] = sp['slot']; o['vs_layer'] = LAYER
    print('PRONTA', name, len(o.data.vertices), 'vértices', len(o.data.polygons), 'faces', 'cobre', int(cov.sum()) if cov is not None else 0)
bbm.free()
bpy.ops.wm.save_as_mainfile(filepath=dst)
print('ENCAIXE_OK', PERFIL, dst)
