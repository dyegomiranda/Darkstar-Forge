"""
Máscaras ENTRE peças: quando uma peça fica por cima de outra (bota sobre a calça, elmo sobre a cabeça), a parte de baixo que
ficou coberta é marcada no grupo "mask_<PeçaDeCima>" da peça de baixo. O jogo esconde essa parte só enquanto a de cima
está vestida, então nada atravessa e nada some quando a peça de cima é tirada.

Uso: blender -b personagem.blend --python mascaras.py -- saida.blend
"""
import bpy, bmesh, sys, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

dst = sys.argv[sys.argv.index('--') + 1]
# (peça de cima, peça de baixo, alcance do raio, protege o que olha para a frente?)
# O cabelo e o elmo NÃO escondem a cabeça: ela fica inteira por baixo (se o cabelo tiver uma falha, aparece couro cabeludo,
# não um buraco). Calçados "engolem" a barra da calça: tudo da calça abaixo do cano some (calça por dentro da bota).
PARES = [('Tunica', 'Calca', 0.06, False), ('Peitoral', 'Calca', 0.08, False), ('Botas', 'Calca', 'cano', False), ('Grevas', 'Calca', 'cano', False)]
for top, under, reach, keep_front in PARES:
    ot, ou = bpy.data.objects.get(top), bpy.data.objects.get(under)
    if not ot or not ou: continue
    tv = [ot.matrix_world @ v.co for v in ot.data.vertices]; tree = BVHTree.FromPolygons(tv, [list(p.vertices) for p in ot.data.polygons])
    me = ou.data; bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.normal_update()
    n = len(bm.verts); cov = np.zeros(n, dtype=bool); front = np.zeros(n, dtype=bool)
    top_z = max(q.z for q in tv)
    for v in bm.verts:
        p = ou.matrix_world @ v.co; nr = v.normal
        front[v.index] = nr.y < -0.25
        if reach == 'cano': cov[v.index] = p.z < top_z - 0.012
        elif tree.ray_cast(p + nr * 0.0005, nr, reach)[0] is not None or tree.find_nearest(p, 0.004)[0] is not None: cov[v.index] = True
    def dil(c):
        return np.array([c[v.index] or any(c[e.other_vert(v).index] for e in v.link_edges) for v in bm.verts])
    def ero(c):
        return np.array([c[v.index] and all(c[e.other_vert(v).index] for e in v.link_edges) for v in bm.verts])
    if reach != 'cano':
        for _ in range(3): cov = dil(cov)
        for _ in range(5): cov = ero(cov)                   # fecha buracos e recua 2 anéis da borda da peça de cima
    if keep_front: cov &= ~front                            # o rosto nunca é escondido
    bm.free()
    g = ou.vertex_groups.get('mask_' + top)
    if g: ou.vertex_groups.remove(g)
    g = ou.vertex_groups.new(name='mask_' + top); g.add([int(i) for i in np.nonzero(cov)[0]], 1.0, 'REPLACE')
    mm = ou.modifiers.get('mask_' + top) or ou.modifiers.new('mask_' + top, 'MASK'); mm.vertex_group = 'mask_' + top; mm.invert_vertex_group = True
    print('MASCARA', top, 'sobre', under, int(cov.sum()), 'de', n)
bpy.ops.wm.save_as_mainfile(filepath=dst)
print('MASCARAS_OK', dst)
