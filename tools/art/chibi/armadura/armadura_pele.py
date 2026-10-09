"""
Veste no corpo-base a armadura do guerreiro original como UMA malha contínua presa ao esqueleto ("pele" com pesos).
Não há cortes: cada vértice segue um osso, e em volta de cada junta (ombro, cotovelo, cintura, quadril, joelho,
tornozelo) há uma faixa estreita em que o peso passa de um osso para o outro. Por isso a junta dobra sem abrir.

Como encaixa: a pose do guerreiro (braços pendurados) é tratada como uma POSE do nosso esqueleto. Para cada osso há uma
transformação rígida que leva o segmento do guerreiro (junta → junta, medidas no modelo) ao osso do corpo-base em
descanso. A posição de descanso de cada vértice é a mistura dessas transformações pelos mesmos pesos — então, quando o
esqueleto fica na pose do guerreiro, a armadura volta exatamente à forma original.

Regiões (altura do personagem = 1, olhando para −Y; medidas do próprio modelo):
  capa: atrás do corpo (y > 0,068; perto das pernas y > 0,105) → acompanha só o peito, inteira;
  braços: |x| > 0,195, de z 0,20 a 0,44; pernas: z < 0,18; o resto é tronco (peito acima de z 0,30, quadril abaixo).
Uso: blender -b base_c_cabeca.blend --python armadura_pele.py -- guerreiro_norm.blend saida.blend [--recuo=0.010]
"""
import bpy, bmesh, sys, numpy as np
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]; src, dst = a[:2]
def opt(k, d): return next((x.split('=', 1)[1] for x in a if x.startswith(f'--{k}=')), d)
arm = bpy.data.objects['Heroi']; body = bpy.data.objects['Corpo']; head = bpy.data.objects['Cabeca']; B = arm.data.bones; MW = arm.matrix_world
C = Vector(head['vs_centro']); D = Vector((-C.x, (MW @ B['DEF-head'].head_local).y - float(opt('recuo', '0.010')) - C.y, 0))     # mesmo deslocamento da cabeça
with bpy.data.libraries.load(src) as (f, t): t.objects = ['Guerreiro']
o = t.objects[0]; bpy.context.scene.collection.objects.link(o); o.name = 'Armadura'; o.data.name = 'Armadura'; me = o.data
# ── o que é armadura: tudo abaixo do pescoço, mais o cachecol; sem a pele do queixo, a faixa e o nó ──
co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
lv = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', lv); tv = lv.reshape(-1, 3); c = co[tv].mean(1)
uv = np.empty(len(me.loops) * 2); me.uv_layers[0].data.foreach_get('uv', uv); cuv = uv.reshape(-1, 3, 2).mean(1)
img = next(n.inputs['Base Color'].links[0].from_node.image for m in me.materials for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled' and n.inputs['Base Color'].is_linked)
iw, ih = img.size; px = np.empty(iw * ih * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(ih, iw, 4)[:, :, :3]
col = px[np.clip((cuv[:, 1] % 1 * ih).astype(int), 0, ih - 1), np.clip((cuv[:, 0] % 1 * iw).astype(int), 0, iw - 1)]
mx = col.max(1); mn = col.min(1); sat = (mx - mn) / np.maximum(mx, 1e-6); dl = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == col[:, 0], ((col[:, 1] - col[:, 2]) / dl) % 6, np.where(mx == col[:, 1], (col[:, 2] - col[:, 0]) / dl + 2, (col[:, 0] - col[:, 1]) / dl + 4)) / 6
verm = ((hue < 0.045) | (hue > 0.95)) & (sat > 0.6) & (mx > 0.18); rr = np.hypot(c[:, 0], c[:, 1] + 0.045)
# acima do pescoço ficam só o cachecol (vermelho, junto ao pescoço) e o topo das ombreiras (longe do eixo da cabeça, não vermelho)
fica = (c[:, 2] < 0.585) | (verm & (c[:, 2] < 0.69) & (rr < 0.215)) | (~verm & (np.abs(c[:, 0]) > 0.185) & (c[:, 2] < 0.615))      # topo das ombreiras: pela posição (ao lado do pescoço), não pela cor
fica &= ~(~verm & (mx > 0.60) & (sat < 0.58) & (hue > 0.02) & (hue < 0.11) & (c[:, 2] > 0.50) & (rr < 0.21))      # pele do queixo e do pescoço: é da cabeça
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for f, k in zip(bm.faces, fica) if not k], context='FACES'); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
# ilhas soltas pequenas (restos do nó da faixa, lascas) saem; para isso as emendas de pintura são unidas só na conta
tmp = bm.copy(); bmesh.ops.remove_doubles(tmp, verts=tmp.verts, dist=1e-6); tmp.faces.ensure_lookup_table(); vistos = set(); pequenas = []
for f in tmp.faces:
    if f in vistos: continue
    pilha = [f]; vistos.add(f); ilha = []
    while pilha:
        g_ = pilha.pop(); ilha.append(g_)
        for e in g_.edges:
            for h in e.link_faces:
                if h not in vistos: vistos.add(h); pilha.append(h)
    if len(ilha) < 400: pequenas += [tuple(round(x, 5) for x in g_.calc_center_median()) for g_ in ilha]
tmp.free(); pq = set(pequenas)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if tuple(round(x, 5) for x in f.calc_center_median()) in pq], context='FACES'); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
# Ombreiras: no original a cabeça e o cabelo entravam nelas, então o topo da cúpula nunca existiu — sobra um buraco de
# beira serrilhada. Reconstrução sem costura: mede-se a esfera da cúpula que existe, tira-se a beira serrilhada e põe-se
# por baixo um "forro" de aço com a mesma esfera (3 mm para dentro), virado para o buraco. Onde a ombreira existe, o
# forro fica escondido; onde falta, é ele que aparece, e a cúpula lê como inteira.
import numpy as np_, math as m_
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6); uvl = bm.loops.layers.uv.active; tampas = 0; uvs_cupula = []; cupulas = []
# Tiras e serrilhas: onde o tecido e as ombreiras encostavam na cabeça e no cabelo sobraram tiras de um ou dois
# triângulos de largura e beiras serrilhadas, que ficavam no ar como cacos. "Descascar": sai toda face cujos três cantos
# estão na borda. Uma tira some inteira; uma peça larga só perde os dentes da beira (a aparada por distância, testada
# antes, comia o cachecol e ficou pior).
def descascar(zmin, vezes):
    tot_ = 0
    for _ in range(vezes):
        bv_ = {v for e in bm.edges if len(e.link_faces) == 1 for v in e.verts}
        fora_ = [f for f in bm.faces if f.calc_center_median().z > zmin and all(v in bv_ for v in f.verts)]
        if not fora_: break
        bmesh.ops.delete(bm, geom=fora_, context='FACES'); tot_ += len(fora_)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS'); return tot_
print('TIRAS e serrilhas retiradas:', descascar(0.50, 5), 'faces')
def aneis():
    borda = [e for e in bm.edges if len(e.link_faces) == 1]; visto = set(); res = []
    for e0 in borda:
        if e0 in visto: continue
        anel = []; pilha = [e0]; visto.add(e0)
        while pilha:
            e = pilha.pop(); anel.append(e)
            for v in e.verts:
                for e2 in v.link_edges:
                    if e2 not in visto and len(e2.link_faces) == 1: visto.add(e2); pilha.append(e2)
        res.append(anel)
    return res
def do_lado(anel, sx): cen = sum((v.co for e in anel for v in e.verts), Vector()) / (2 * len(anel)); return cen.x * sx > 0.15 and cen.z > 0.50 and len(anel) >= 6
def vermelha(f):                               # tecido (cachecol, capa): não entra na limpeza da beira
    u_ = sum((l[uvl].uv for l in f.loops), Vector((0, 0))) / len(f.loops); c_ = px[int(u_.y % 1 * ih) % ih, int(u_.x % 1 * iw) % iw]
    return c_[0] > 0.18 and c_[0] > 3.5 * c_[1] and c_[0] > 3.5 * c_[2]      # vermelho mesmo: o dourado na sombra é alaranjado e não entra
for sx in (1, -1):
    pts = np_.array([v.co[:] for v in bm.verts if 0.225 < v.co.x * sx < 0.31 and -0.11 < v.co.y < 0.04 and 0.47 < v.co.z < 0.60])
    for _ in range(3):
        A_ = np_.c_[2 * pts, np_.ones(len(pts))]; sol = np_.linalg.lstsq(A_, (pts ** 2).sum(1), rcond=None)[0]; cen_ = sol[:3]; raio = float(np_.sqrt(sol[3] + (cen_ ** 2).sum()))
        d_ = np_.abs(np_.linalg.norm(pts - cen_, axis=1) - raio); pts = pts[d_ < max(0.006, np_.percentile(d_, 70))]
    cen_ = Vector(cen_)
    bv = {v for anel in aneis() if do_lado(anel, sx) for e in anel for v in e.verts}
    if not bv: continue
    bco = np_.array([v.co[:] for v in bv]); eixo = (Vector(bco.mean(0)) - cen_).normalized()
    # A cúpula de aço é refeita INTEIRA pelo forro (uma superfície só, sem remendo): saem
    #  - o aço da cúpula original, do meio para cima (a faixa dourada de baixo fica);
    #  - o "colarinho" que subia da ombreira para encostar na cabeça e no cabelo (tudo o que fica para fora da esfera,
    #    acima do meio) — sem a cabeça ali, vira caco no ar;
    #  - a beira serrilhada do buraco.
    def cor(f): u_ = sum((l[uvl].uv for l in f.loops), Vector((0, 0))) / len(f.loops); return px[int(u_.y % 1 * ih) % ih, int(u_.x % 1 * iw) % iw]
    def tira(f):
        c_ = f.calc_center_median()
        if c_.x * sx < 0.12 or c_.z < 0.44: return False
        rad = (c_ - cen_).length; k_ = cor(f)
        # logo ACIMA da cúpula só existe ar num modelo limpo: tudo o que está ali (tiras de couro e fivelas da capa, o
        # colarinho que subia até a cabeça) sai, menos o vermelho vivo do cachecol, que repousa sobre a ombreira
        if rad > raio + 0.0035 and c_.z > cen_.z + 0.01 and m_.hypot(c_.x - cen_.x, c_.y - cen_.y) < raio * 0.95 and not (k_[0] > 0.30 and k_[0] > 3.5 * k_[1] and k_[0] > 3.5 * k_[2]): return True
        # a faixa dourada contorna a BASE da cúpula; o que sobe acima disso, fora da esfera, é a ponta que ia até a cabeça
        if rad > raio + 0.003 and c_.z > cen_.z + 0.035 and not (k_[0] > 0.30 and k_[0] > 3.5 * k_[1] and k_[0] > 3.5 * k_[2]): return True
        if vermelha(f): return False
        aco_ = not (k_[0] > 0.25 and k_[0] > 1.6 * k_[2] and (k_.max() - k_.min()) / k_.max() > 0.4)      # tudo o que não é dourado
        if abs(rad - raio) < 0.007 and c_.z > cen_.z - 0.004 and aco_: return True
        dist = float(np_.min(np_.linalg.norm(bco - np_.array(c_[:]), axis=1)))
        return dist < 0.014 or (raio + 0.0035 < rad < raio + 0.06 and c_.z > cen_.z + 0.02)
    perto = [f for f in bm.faces if tira(f)]; eixo = Vector((sx * 0.25, -0.05, 1)).normalized()
    # cor do forro: a cor típica do aço que a cúpula original tinha (mediana), tirada de um ponto real da pintura
    ac_ = [(f, cor(f)) for f in perto if abs((f.calc_center_median() - cen_).length - raio) < 0.007]; uv_aco = None
    if ac_:
        med = np_.median(np_.array([k_ for _, k_ in ac_]), 0); fm = min(ac_, key=lambda t_: float(np_.abs(t_[1] - med).sum()))[0]
        uv_aco = (sum((l[uvl].uv for l in fm.loops), Vector((0, 0))) / len(fm.loops)).copy(); print('  aço da cúpula', (med * 255).round().astype(int))
    bmesh.ops.delete(bm, geom=perto, context='FACES'); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # forro: calota da esfera em volta do eixo que aponta para o buraco
    u_ = eixo.orthogonal().normalized(); w_ = eixo.cross(u_); r_ = raio; NT, NA, ABERT = 16, 36, m_.radians(97)
    def ponto(t, a_): return cen_ + (eixo * m_.cos(t) + (u_ * m_.cos(a_) + w_ * m_.sin(a_)) * m_.sin(t)) * r_
    topo = bm.verts.new(ponto(0, 0)); fileiras = [[bm.verts.new(ponto(ABERT * i / NT, 2 * m_.pi * j / NA)) for j in range(NA)] for i in range(1, NT + 1)]; novas = []
    for j in range(NA): novas.append(bm.faces.new((topo, fileiras[0][j], fileiras[0][(j + 1) % NA])))
    for i in range(NT - 1):
        for j in range(NA):
            a0, a1, b0, b1 = fileiras[i][j], fileiras[i][(j + 1) % NA], fileiras[i + 1][j], fileiras[i + 1][(j + 1) % NA]; novas.append(bm.faces.new((a0, b0, b1))); novas.append(bm.faces.new((a0, b1, a1)))
    for f in novas:
        f.smooth = True
        if f.normal.dot(f.calc_center_median() - cen_) < 0: f.normal_flip()
        for l in f.loops: l[uvl].uv = uv_aco if uv_aco is not None else (2.5, 2.5)
    if uv_aco is not None: uvs_cupula.append(np_.array(uv_aco[:]))
    cupulas.append((np_.array(cen_[:]), raio))
    tampas += len(novas); print('OMBREIRA', 'E' if sx > 0 else 'D', 'centro', [round(x, 3) for x in cen_], 'raio', round(raio, 3), 'eixo do buraco', [round(x, 2) for x in eixo], 'beira retirada', len(perto))
bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3]); print('  depois das ombreiras:', descascar(0.50, 5), 'faces'); bm.normal_update()
print('FORRO das ombreiras:', tampas, 'faces')
bm.to_mesh(me); bm.free(); me.update()
# tecido vermelho (capa e cachecol): reconhecido pela cor, face a face, e levado aos vértices pela posição (a malha tem
# vértices repetidos nas emendas da pintura). A capa dá a volta nos braços e desce até as pernas; sem isto esses pedaços
# seguiriam o braço ou a perna e esticariam.
lv = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', lv); tv = lv.reshape(-1, 3)
uv = np.empty(len(me.loops) * 2); me.uv_layers[0].data.foreach_get('uv', uv); cuv = uv.reshape(-1, 3, 2).mean(1)
col = px[np.clip((cuv[:, 1] % 1 * ih).astype(int), 0, ih - 1), np.clip((cuv[:, 0] % 1 * iw).astype(int), 0, iw - 1)]
mx = col.max(1); mn = col.min(1); sat = (mx - mn) / np.maximum(mx, 1e-6); dl = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == col[:, 0], ((col[:, 1] - col[:, 2]) / dl) % 6, np.where(mx == col[:, 1], (col[:, 2] - col[:, 0]) / dl + 2, (col[:, 0] - col[:, 1]) / dl + 4)) / 6
tecido_f = ((hue < 0.022) | (hue > 0.96)) & (sat > 0.62) & (mx > 0.06)      # vermelho de verdade; o couro marrom das botas e luvas fica de fora
# Forro do cachecol: no original o vão entre o queixo e o cachecol é pintado de preto (o rosto largo o tampava). Com
# a cabeça nova esse preto aparece como uma mancha embaixo do queixo. O forro passa a usar o vermelho-escuro da sombra do
# próprio cachecol (as faces apontam para um ponto da pintura com essa cor), e o vão lê como dobra do tecido.
co_ = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co_); cf = co_.reshape(-1, 3)[tv].mean(1)
vermelho_f = ((hue < 0.045) | (hue > 0.95)) & (sat > 0.5) & (mx > 0.10)
tampa_f = (np.abs(cuv - 2.5) < 1e-4).all(1)
for u_c in uvs_cupula: tampa_f |= (np.abs(uv.reshape(-1, 3, 2) - u_c) < 1e-6).all((1, 2))      # as cúpulas refeitas não são forro do cachecol
aco = np.nonzero(~tampa_f & (sat < 0.3) & (mx > 0.30) & (mx < 0.48) & (np.abs(cf[:, 0]) > 0.21) & (cf[:, 2] > 0.46) & (cf[:, 2] < 0.56))[0]
sem_cor = (np.abs(cuv - 2.5) < 1e-4).all(1)
if sem_cor.any() and len(aco): aco = aco[np.argsort(mx[aco])]; uv3 = uv.reshape(-1, 3, 2); uv3[sem_cor] = cuv[aco[int(len(aco) * 0.6)]]; me.uv_layers[0].data.foreach_set('uv', uv3.ravel())
forro = ~vermelho_f & ~tampa_f & (np.hypot(cf[:, 0], cf[:, 1] + 0.045) < 0.195) & (np.abs(cf[:, 0]) < 0.17) & (cf[:, 2] > 0.47)
sombra = np.nonzero(vermelho_f & (mx > 0.20) & (mx < 0.27) & (cf[:, 2] > 0.50))[0]
if forro.any() and len(sombra):
    alvo_uv = cuv[sombra[len(sombra) // 2]]; uv3 = uv.reshape(-1, 3, 2); uv3[forro] = alvo_uv; me.uv_layers[0].data.foreach_set('uv', uv3.ravel()); tecido_f = tecido_f | forro
    print('FORRO do cachecol:', int(forro.sum()), 'faces repintadas com', (px[int(alvo_uv[1] % 1 * ih), int(alvo_uv[0] % 1 * iw)] * 255).round().astype(int))
# ── pesos por vértice ──
n = len(me.vertices); p = np.empty(n * 3); me.vertices.foreach_get('co', p); p = p.reshape(-1, 3); x, y, z = p[:, 0], p[:, 1], p[:, 2]
def sobe(v, a_, b_): t_ = np.clip((v - a_) / (b_ - a_), 0, 1); return t_ * t_ * (3 - 2 * t_)       # 0 abaixo de a_, 1 acima de b_, suave no meio
chave = lambda q: (np.round(q * 2e4).astype(np.int64) * np.array([1, 100003, 10000000019])).sum(1)
vermelhos = set(chave(p[np.unique(tv[tecido_f].ravel())]).tolist()); tecido = np.fromiter((k in vermelhos for k in chave(p).tolist()), dtype=bool, count=n)
tecido &= (y > 0.03) | (z > 0.42)                                        # a capa fica atrás; na frente só o cachecol, lá em cima
capa = tecido | ((y > 0.068) & (z >= 0.165)) | ((y > 0.085) & (z > 0.115) & (z < 0.165))
no_braco = ~capa & (np.abs(x) > 0.195) & (z > 0.20) & (z < 0.44) & (y < 0.068)
na_perna = ~capa & (z < 0.18) & (np.abs(x) > 0.03) & (y < 0.125)
# Cada membro é UMA peça ligada. Dentro das caixas acima também caem lascas que não são o membro (a beira de dentro da
# capa ao lado do braço, a ponta do saiote junto da perna): se seguissem o braço ou a perna, sairiam voando com ele.
# Fica como membro só o maior pedaço ligado de cada caixa; o resto volta para o tronco.
sold = {}; ident = np.fromiter((sold.setdefault(k, len(sold)) for k in chave(p).tolist()), dtype=np.int64, count=n)      # vértices repetidos nas emendas contam como um
def maior_pedaco(mask):
    pai = np.arange(len(sold))
    def raiz(i):
        while pai[i] != i: pai[i] = pai[pai[i]]; i = pai[i]
        return i
    for t3 in ident[tv[mask[tv].all(1)]]:
        r0, r1, r2 = raiz(t3[0]), raiz(t3[1]), raiz(t3[2]); pai[r1] = r0; pai[r2] = r0
    idx = np.nonzero(mask)[0]; rz = np.array([raiz(i) for i in ident[idx]]); vals, cont = np.unique(rz, return_counts=True)
    fica_ = np.zeros(n, bool); fica_[idx[rz == vals[cont.argmax()]]] = True; return fica_, int(mask.sum() - fica_.sum())
for nome_, m_, lado_ in (('braço E', no_braco, x > 0), ('braço D', no_braco, x < 0), ('perna E', na_perna, x > 0), ('perna D', na_perna, x < 0)):
    bom, fora_ = maior_pedaco(m_ & lado_); m_[lado_ & ~bom] = False; print('MEMBRO', nome_, 'lascas devolvidas ao tronco:', fora_, 'vértices')
W = {}
def soma(nome, w): W[nome] = W.get(nome, 0) + w
# tronco: o peso sobe aos poucos pelos quatro ossos da coluna (quadril → … → peito), como no corpo. Com só dois ossos
# e uma faixa estreita na cintura, a armadura cisalhava quando o tronco torce no golpe.
tronco = ~no_braco & ~na_perna; ZT = [0.21, 0.28, 0.36, 0.44]; OT = ['DEF-hips', 'DEF-spine.001', 'DEF-spine.002', 'DEF-spine.003']
for i_, k_ in enumerate(OT):
    sobe_ = np.clip((z - ZT[i_ - 1]) / (ZT[i_] - ZT[i_ - 1]), 0, 1) if i_ > 0 else np.ones(n); desce_ = np.clip((ZT[i_ + 1] - z) / (ZT[i_ + 1] - ZT[i_]), 0, 1) if i_ < 3 else np.ones(n)
    soma(k_, np.minimum(sobe_, desce_) * tronco)      # a capa entra aqui também: acompanha a coluna pela altura, como um manto pesado colado às costas
for lado, sg in (('L', x > 0), ('R', x < 0)):
    m = no_braco & sg; ante = 1 - sobe(z, 0.315, 0.345); ombro = sobe(z, 0.395, 0.435)          # cotovelo e ombro
    soma('DEF-forearm.' + lado, ante * m); soma('DEF-upper_arm.' + lado, (1 - ante) * (1 - ombro) * m); soma('DEF-spine.003', (1 - ante) * ombro * m)
    m = na_perna & sg; pe = 1 - sobe(z, 0.040, 0.070); canela = 1 - sobe(z, 0.090, 0.120); quadril = sobe(z, 0.150, 0.180)   # tornozelo, joelho, quadril
    soma('DEF-foot.' + lado, pe * m); soma('DEF-shin.' + lado, (1 - pe) * canela * m); soma('DEF-thigh.' + lado, (1 - pe) * (1 - canela) * (1 - quadril) * m); soma('DEF-hips', (1 - pe) * (1 - canela) * quadril * m)
# Ombreira inteira (cúpula + faixa dourada em volta) é uma placa rígida presa ao peito. Sem isto, a parte de baixo da
# faixa caía na regra do braço e, com o braço aberto, girava para cima: eram os "cacos" dourados ao lado do pescoço.
for cen_c, raio_c in cupulas:
    wp = 1 - sobe(np.linalg.norm(p - cen_c, axis=1), raio_c + 0.014, raio_c + 0.034)
    for k_ in list(W): W[k_] = W[k_] * (1 - wp)
    soma('DEF-spine.003', wp)
tot = sum(W.values()); assert np.all(tot > 0.999), 'vértice sem osso'
# No modelo original há partes fundidas que no corpo não são vizinhas: o lado de dentro da capa com as pernas e os
# braços, a mão com o saiote, uma perna com a outra. Uma face assim ligaria vértices de ossos que se movem separados e
# esticaria como um elástico. Ficam só as faces cujos vértices seguem o mesmo osso ou ossos vizinhos no esqueleto.
nomes = list(W); dom = np.stack([W[k] for k in nomes], 1).argmax(1)
def ramo(k): return k.replace('DEF-', '').split('.')[0], (k.split('.')[-1] if k.split('.')[-1] in ('L', 'R') else '')
VIZ = {('forearm', 'upper_arm'), ('upper_arm', 'spine'), ('spine', 'hips'), ('hips', 'thigh'), ('thigh', 'shin'), ('shin', 'foot')}
def vizinhos(a_, b_):
    (na, la), (nb, lb) = ramo(nomes[a_]), ramo(nomes[b_])
    if a_ == b_: return True
    if la and lb and la != lb: return False
    if na == nb: return True                      # ossos da mesma parte (os quatro da coluna, por exemplo)
    return (na, nb) in VIZ or (nb, na) in VIZ
tab = np.array([[vizinhos(i, j) for j in range(len(nomes))] for i in range(len(nomes))])
d3 = dom[tv]; ponte = ~(tab[d3[:, 0], d3[:, 1]] & tab[d3[:, 1], d3[:, 2]] & tab[d3[:, 0], d3[:, 2]])
ponte |= capa[tv].any(1) & (np.array([ramo(k)[0] not in ('spine', 'hips') for k in nomes])[d3]).any(1)      # a capa só se liga ao tronco, nunca a braços e pernas
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); bmesh.ops.delete(bm, geom=[f for f, k in zip(bm.faces, ponte) if k], context='FACES_ONLY')
# lascas que ficaram soltas depois disso
tmp = bm.copy(); bmesh.ops.remove_doubles(tmp, verts=tmp.verts, dist=1e-6); tmp.faces.ensure_lookup_table(); vistos = set(); pq = set()
for f in tmp.faces:
    if f in vistos: continue
    pilha = [f]; vistos.add(f); ilha = []
    while pilha:
        g_ = pilha.pop(); ilha.append(g_)
        for e in g_.edges:
            for h in e.link_faces:
                if h not in vistos: vistos.add(h); pilha.append(h)
    if len(ilha) < 60: pq |= {tuple(round(x_, 5) for x_ in g_.calc_center_median()) for g_ in ilha}
tmp.free(); bmesh.ops.delete(bm, geom=[f for f in bm.faces if tuple(round(x_, 5) for x_ in f.calc_center_median()) in pq], context='FACES_ONLY')
bm.to_mesh(me); bm.free(); me.update(); assert len(me.vertices) == n
print('PONTES entre partes não vizinhas removidas:', int(ponte.sum()), 'faces; lascas:', len(pq))
# Alisamento dos pesos pela vizinhança da malha: onde dois vértices vizinhos seguiriam ossos diferentes de uma vez (a
# beira de dentro da capa junto ao quadril, por exemplo), a passagem vira gradual e a face não estica nem rasga.
lv = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', lv); tv = lv.reshape(-1, len(me.polygons) and 3)
ar = np.concatenate([ident[tv[:, [0, 1]]], ident[tv[:, [1, 2]]], ident[tv[:, [2, 0]]]]); ar = np.concatenate([ar, ar[:, ::-1]])
Ws = np.zeros((len(sold), len(nomes))); cnt = np.zeros(len(sold)); np.add.at(Ws, ident, np.stack([W[k] for k in nomes], 1)); np.add.at(cnt, ident, 1); Ws /= np.maximum(cnt, 1)[:, None]
for _ in range(10):
    acc = Ws.copy(); viz_ = np.ones(len(sold)); np.add.at(acc, ar[:, 0], Ws[ar[:, 1]]); np.add.at(viz_, ar[:, 0], 1); Ws = acc / viz_[:, None]
Ws /= Ws.sum(1, keepdims=True)
for j, k in enumerate(nomes): W[k] = Ws[ident, j]
# ── transformação de cada osso: segmento do guerreiro → osso do corpo-base em descanso ──
J = {'ombro': (0.25, -0.01, 0.435), 'cotovelo': (0.268, -0.03, 0.33), 'pulso': (0.275, -0.04, 0.25), 'quadril': (0.125, -0.03, 0.185), 'joelho': (0.135, -0.035, 0.105), 'tornozelo': (0.15, -0.03, 0.04), 'ponta': (0.15, -0.14, 0.012)}
SEG = {'DEF-upper_arm': ('ombro', 'cotovelo'), 'DEF-forearm': ('cotovelo', 'pulso'), 'DEF-thigh': ('quadril', 'joelho'), 'DEF-shin': ('joelho', 'tornozelo'), 'DEF-foot': ('tornozelo', 'ponta')}
T = {}
for nome in W:
    base = nome.split('.')[0]; lado = nome[-1]
    if base in SEG and lado in 'LR' and '.' in nome and nome.split('.')[-1] in ('L', 'R'):
        sx = 1 if lado == 'L' else -1; w0 = Vector(J[SEG[base][0]]); w0.x *= sx; w1 = Vector(J[SEG[base][1]]); w1.x *= sx
        b0 = MW @ B[nome].head_local; b1 = MW @ B[nome].tail_local
        T[nome] = Matrix.Translation(b0) @ (w1 - w0).normalized().rotation_difference((b1 - b0).normalized()).to_matrix().to_4x4() @ Matrix.Translation(-w0)
    else: T[nome] = Matrix.Translation(D)
ph = np.concatenate([p, np.ones((n, 1))], 1); novo = np.zeros((n, 3))
for nome, w in W.items(): novo += (ph @ np.array(T[nome]).T)[:, :3] * w[:, None]
me.vertices.foreach_set('co', novo.ravel()); me.update()
for nome, w in W.items():
    g = o.vertex_groups.new(name=nome); idx = np.nonzero(w > 1e-4)[0]
    for i in idx: g.add([int(i)], float(w[i]), 'REPLACE')
for q in me.polygons: q.use_smooth = True
o.parent = arm; md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
o['vs_layer'] = 'equipamento'; o['vs_slot'] = 'conjunto'
# com a armadura vestida o corpo some, menos o pescoço (a armadura é fechada: não há fresta para mostrar pele)
# com a armadura o corpo some inteiro (a cabeça é peça à parte): entre o cachecol e as ombreiras apareceria pele
g = body.vertex_groups.new(name='mask_Armadura'); g.add([v.index for v in body.data.vertices], 1.0, 'REPLACE')
md = body.modifiers.new('mask_Armadura', 'MASK'); md.vertex_group = g.name; md.invert_vertex_group = True
# Malha de baixo: cópia escura do corpo (sem mãos, pés e cabeça), um pouco encolhida. Onde a armadura tem uma fresta
# (as fusões removidas acima, a parte de dentro do saiote) aparece essa malha, e não o vazio.
malha = body.copy(); malha.data = body.data.copy(); bpy.context.scene.collection.objects.link(malha); malha.name = 'Malha'; malha.data.name = 'Malha'
for md_ in list(malha.modifiers):
    if md_.type == 'MASK': malha.modifiers.remove(md_)
gi_ = {g_.index: g_.name for g_ in malha.vertex_groups}; bm = bmesh.new(); bm.from_mesh(malha.data); dl_ = bm.verts.layers.deform.verify(); bm.normal_update()
fora_ = [v for v in bm.verts if v.co.z > 0.555 or sum(w_ for g_, w_ in v[dl_].items() if any(k_ in gi_[g_] for k_ in ('DEF-hand', 'DEF-foot', 'DEF-toe'))) > 0.5]
bmesh.ops.delete(bm, geom=fora_, context='VERTS')
for v in bm.verts: v.co -= v.normal * 0.008
bm.to_mesh(malha.data); bm.free()
for g_ in [g_ for g_ in malha.vertex_groups if g_.name.startswith('mask_')]: malha.vertex_groups.remove(g_)
mm = bpy.data.materials.new('Malha'); mm.use_nodes = True; mm.diffuse_color = (0.03, 0.026, 0.03, 1); mm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.03, 0.026, 0.03, 1); mm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
malha.data.materials.clear(); malha.data.materials.append(mm); malha['vs_layer'] = 'equipamento'; malha['vs_slot'] = 'malha'
if 'vs_pele' in malha: del malha['vs_pele']
print('ARMADURA', n, 'vértices', len(me.polygons), 'faces; ossos', {k: int((v > 0.5).sum()) for k, v in W.items()})
bpy.ops.wm.save_as_mainfile(filepath=dst)
