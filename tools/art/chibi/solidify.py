"""
Transforma a casca gerada pelo Pixal3D (com furos e paredes internas) em um sólido fechado e limpo:
voxeliza a superfície, veda furos pequenos, preenche o interior e extrai uma única superfície estanque.
Roda fora do Blender (precisa de scipy e scikit-image; o venv do ComfyUI tem os dois):
  ~/ComfyUI/venv/bin/python solidify.py entrada.npz saida.npz [resolução=384] [vedação=2]
"""
import sys, numpy as np
from scipy import ndimage as ndi
from skimage import measure

src, dst = sys.argv[1], sys.argv[2]
RES = int(sys.argv[3]) if len(sys.argv) > 3 else 384
SEAL = int(sys.argv[4]) if len(sys.argv) > 4 else 2
d = np.load(src); V, F = d['V'].astype(np.float64), d['F']
lo, hi = V.min(0), V.max(0); vox = (hi - lo).max() / RES; pad = SEAL + 4
dims = np.ceil((hi - lo) / vox).astype(int) + 2 * pad
grid = np.zeros(dims, dtype=bool)
def mark(P):
    i = np.floor((P - lo) / vox).astype(int) + pad
    grid[i[:, 0], i[:, 1], i[:, 2]] = True
tri = V[F]
mark(V)
# cada triângulo é amostrado numa grade baricêntrica fina o bastante para não deixar voxel vazio no meio
edge = np.maximum.reduce([np.linalg.norm(tri[:, a_] - tri[:, b_], axis=1) for a_, b_ in ((0, 1), (1, 2), (2, 0))])
steps = np.clip(np.ceil(edge / vox * 1.6).astype(int), 1, 12)
for n in np.unique(steps):
    t = tri[steps == n]
    for i in range(n + 1):
        for j in range(n + 1 - i):
            u, v_ = i / n, j / n
            mark(t[:, 0] * (1 - u - v_) + t[:, 1] * u + t[:, 2] * v_)
shell = grid.sum()
st = ndi.generate_binary_structure(3, 1)
sealed = ndi.binary_dilation(grid, st, iterations=SEAL)
filled = ndi.binary_fill_holes(sealed)
# o interior cresce de dentro para fora e para na casca original: vãos estreitos por fora (entre as coxas,
# entre os dedos, axilas) não são preenchidos, ao contrário de um fechamento morfológico comum
core = filled & ~sealed
for _ in range(SEAL + 2):
    core = ndi.binary_dilation(core, st) & ~grid
solid = core | grid
# mãos em "luva" (opcional, --luva=fração da largura ocupada por cada mão): fecha os vãos entre os dedos, que são finos
# demais para sobreviver à redução de malha e viram garras; o polegar, mais afastado, continua separado
LUVA = float(next((x.split('=')[1] for x in sys.argv if x.startswith('--luva=')), '0'))
if LUVA > 0:
    nx = solid.shape[0]; k = int(nx * LUVA); it = max(2, int(round(0.0065 / vox)))
    for sl in (slice(0, k + it), slice(nx - k - it, nx)):
        reg = np.pad(solid[sl], it, mode='constant')
        reg = ndi.binary_erosion(ndi.binary_dilation(reg, st, iterations=it), st, iterations=it)[it:-it, it:-it, it:-it]
        solid[sl] |= reg
lab, n = ndi.label(solid)
if n > 1:
    sizes = ndi.sum(solid, lab, range(1, n + 1)); solid = lab == (1 + int(np.argmax(sizes)))
field = ndi.gaussian_filter(solid.astype(np.float32), sigma=0.9)
verts, faces, _, _ = measure.marching_cubes(field, level=0.5)
verts = (verts - pad) * vox + lo
out = dict(V=verts.astype(np.float32), F=faces.astype(np.int32)[:, ::-1])
if 'C' in d and len(d['C']) == len(V):      # cor de cada ponto da superfície limpa = cor do ponto mais próximo da malha original
    from scipy.spatial import cKDTree
    _, near = cKDTree(V).query(verts, k=4)
    out['C'] = d['C'][near].mean(1).astype(np.float32)
np.savez(dst, **out)
print('SOLIDO_OK voxel', round(vox, 5), 'grade', dims.tolist(), 'casca', int(shell), 'sólido', int(solid.sum()), 'razão', round(solid.sum() / shell, 2), 'verts', len(verts), 'faces', len(faces))
