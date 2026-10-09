"""
Coloca no personagem uma peça RÍGIDA pintada (saída de pintar_hy.py) na posição medida no molde (separar_peca.py) e a
prende a um osso. A peça não deforma: só acompanha o osso.
Uso: blender -b personagem.blend --python vestir_peca.py -- peca.blend medida.json Nome osso saida.blend [--slot=elmo] [--fundo=1.0]
  --fundo / --largo: fator de escala só na profundidade (frente–costas) ou na largura. A casca gerada tem espessura, então
  o vão interno é menor que o contorno desenhado; a folga evita que o corpo atravesse a peça.
"""
import bpy, sys, json
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]; src, med, nome, osso, dst = a[:5]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
m = json.load(open(med)); arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']
with bpy.data.libraries.load(src) as (f, t): t.objects = [n for n in f.objects if n == 'Personagem']
o = t.objects[0]; bpy.context.scene.collection.objects.link(o)
co = [v.co for v in o.data.vertices]; lo = Vector(map(min, zip(*co))); hi = Vector(map(max, zip(*co)))
x0, x1 = m['x']; z0, z1 = m['z']; k = ((x1 - x0) / (hi.x - lo.x) + (z1 - z0) / (hi.z - lo.z)) / 2
# profundidade: centro do corpo na mesma faixa de altura (a imagem de frente não informa a posição frente–costas)
by = [v.co.y for v in body.data.vertices if z0 <= (body.matrix_world @ v.co).z <= z1 and x0 <= v.co.x <= x1]; cy = (min(by) + max(by)) / 2
T = Matrix.Translation(Vector(((x0 + x1) / 2, cy, (z0 + z1) / 2))) @ Matrix.Diagonal(Vector((k * float(opt('largo', '1.0')), k * float(opt('fundo', '1.0')), k, 1))) @ Matrix.Translation(-(lo + hi) / 2)
o.data.transform(T); o.data.update(); o.name = nome; o.data.name = nome
o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = osso; o.matrix_world = Matrix.Identity(4)
o['vs_layer'] = 'equipamento'; o['vs_slot'] = opt('slot', nome.lower())
print('VESTIDA', nome, 'escala', round(k, 4), 'profundidade corpo', round(max(by) - min(by), 3), 'peça', round((hi.y - lo.y) * k * float(opt('fundo', '1.0')), 3))
bpy.ops.wm.save_as_mainfile(filepath=dst)
