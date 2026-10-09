"""
Passo 2 da cabeça careca (roda fora do Blender: numpy + scipy + PIL).
Lê a varredura de raios.py e produz, na mesma grade (longitude × latitude):
  raio.npy      distância do centro até a cabeça SEM cabelo, faixa e cachecol
  cor.png       pintura da cabeça careca (pele original onde existia; pele contínua onde havia cabelo)
  mascara.png   R = olhos, G = sobrancelhas, B = boca/nariz (para trocar cores no jogo)
  classes.png   conferência do que foi reconhecido
Regra: onde o original tem PELE, a forma e a cor são as do original, sem alteração. O que estava coberto é completado
por uma superfície lisa (elipsoide ajustado à pele e à faixa) que nunca passa para fora do cabelo/faixa originais.
Uso: python careca.py varredura.npz pasta_saida
"""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, out = sys.argv[1:3]
d = np.load(src); R, Z, COL, C = d['R'].astype(float), d['Z'].astype(float), d['COL'].astype(float), d['C']
H, W = R.shape; valido = np.isfinite(R) & (R > 0.05) & (Z > 0.50)      # abaixo disso já é ombro e cachecol
r, g, b = COL[..., 0], COL[..., 1], COL[..., 2]; mx = COL.max(2); mn = COL.min(2); val = mx; sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
hue = np.zeros_like(mx); dlt = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == r, ((g - b) / dlt) % 6, np.where(mx == g, (b - r) / dlt + 2, (r - g) / dlt + 4)) / 6
vv = (np.arange(H) + 0.5) / H; uu = (np.arange(W) + 0.5) / W; phi = 2 * np.pi * (uu - 0.5); lam = np.pi / 2 - np.pi * vv
frente = (np.abs(phi) < np.radians(80))[None, :] * np.ones((H, 1), bool)
vermelho = valido & ((hue < 0.045) | (hue > 0.95)) & (sat > 0.62) & (val > 0.2)
pele = valido & ~vermelho & (val > 0.60) & (sat < 0.58) & (hue > 0.02) & (hue < 0.11) & (Z > 0.50) & (Z < 0.725)
def wrap(m, f):      # operações com emenda na nuca
    p = np.concatenate([m[:, -W // 8:], m, m[:, :W // 8]], 1); return f(p)[:, W // 8:W // 8 + W]
lab = wrap(pele, lambda p: ndi.label(p)[0]); tam = np.bincount(lab.ravel()); tam[0] = 0
pele = lab == tam.argmax()                                   # rosto + orelhas: uma região só
centro = (np.abs(phi) < np.radians(45))[None, :] * np.ones((H, 1), bool)
linhas = np.nonzero((pele & centro).any(1))[0]; topo_rosto, queixo = linhas.min(), linhas.max()
janela = centro & (np.arange(H)[:, None] >= topo_rosto - H // 60) & (np.arange(H)[:, None] <= queixo)
# olhos e sobrancelhas: traços pretos dentro do rosto. O olho é alto; a sobrancelha é larga e fina e pode encostar nele.
semente = valido & (val < 0.14) & janela; Hf = queixo - topo_rosto
nucleo = ndi.binary_opening(semente, structure=np.ones((max(3, int(0.18 * Hf)), 1), bool))     # some o que é fino na vertical
lab, n = ndi.label(nucleo); tam = ndi.sum(nucleo, lab, range(1, n + 1)); olhos = np.zeros((H, W), bool); caixas = []
for i in (np.argsort(tam)[::-1][:2] + 1):
    ys, xs = np.nonzero(lab == i); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); larg = x1 - x0 + 1
    y = y1                                                   # sobe até a linha em que o preto fica bem mais largo que o olho: ali começa a sobrancelha
    while y > y0:
        linha = semente[y - 1, max(0, x0 - 2 * larg):x1 + 2 * larg]; 
        if linha.sum() > 1.45 * larg: break
        y -= 1
    topo = y; y = y1
    while y + 1 < queixo and (~pele[y + 1, x0:x1 + 1]).mean() > 0.5: y += 1
    olhos[topo:y + 1, x0:x1 + 1] = ~pele[topo:y + 1, x0:x1 + 1]; caixas.append((x0, x1, topo, y))
yo = np.mean([c[2] for c in caixas]); xo = [(c[0] + c[1]) / 2 for c in caixas]; lo_ = np.mean([c[1] - c[0] for c in caixas])
meio = np.mean(xo); vao = abs(xo[0] - xo[1]) - lo_            # espaço entre os olhos: ali fica a mecha de cabelo, não sobrancelha
lab, n = ndi.label(semente & ~olhos); sobr = np.zeros((H, W), bool)
for i in range(1, n + 1):
    m = lab == i; ys, xs = np.nonzero(m)
    if len(ys) < 2e-5 * H * W: continue
    cxb = xs.mean()
    if ys.mean() < yo + 0.2 * lo_ and min(abs(cxb - x) for x in xo) < 1.6 * lo_ and abs(cxb - meio) > 0.45 * vao:
        g = ndi.binary_dilation(m, iterations=max(4, W // 250)) & ~pele & ~olhos
        g[:max(0, ys.min() - 2)] = False; g[:, int(meio - 0.30 * vao):int(meio + 0.30 * vao)] = False
        sobr |= ndi.binary_fill_holes(ndi.binary_closing(g | m, iterations=2)) & ~olhos
perto_vermelho = ndi.binary_dilation(vermelho, iterations=max(3, W // 400))      # a borda da faixa e do cachecol não é rosto
sobr &= ~perto_vermelho; olhos &= ~perto_vermelho
conhecido = (ndi.binary_fill_holes(pele) | olhos | sobr) & valido & ~perto_vermelho
conhecido = ndi.binary_opening(conhecido, iterations=1) | olhos | sobr
tracos = olhos | sobr
faixa = vermelho & (Z > 0.695); cachecol = vermelho & ~faixa
cabelo = valido & ~conhecido & ~vermelho & (Z > 0.58) & (hue > 0.02) & (hue < 0.12) & (sat > 0.35)
# Para a FORMA, a beirada da pele original não conta: ali a superfície já sobe para encostar no cabelo, na faixa ou no
# cachecol, e manter isso deixaria um friso desenhando onde eles estavam. A beirada é refeita junto com a parte coberta.
cor_conhecida = conhecido
# No rosto a beirada descartada é larga (o friso das costeletas e do queixo tem uns 4°); nas orelhas, que são finas, é estreita.
zona_rosto = (np.abs(phi) < np.radians(56))[None, :]
conhecido = (ndi.binary_erosion(conhecido, iterations=max(3, W // 85)) & zona_rosto) | (ndi.binary_erosion(conhecido, iterations=max(3, W // 300)) & ~zona_rosto) | ndi.binary_erosion(olhos | sobr, iterations=2)
# Beirada de baixo (onde o cachecol apertava a bochecha, do queixo até a orelha): descartada numa faixa larga em toda a volta.
cachecol0 = vermelho & (Z <= 0.695)
perto_cachecol = ndi.binary_dilation(cachecol0, iterations=max(4, W // 100))
conhecido &= ~perto_cachecol | ndi.binary_erosion(olhos | sobr, iterations=2)
# ── forma ──
u2, v2 = np.meshgrid(phi, lam); D = np.stack([np.sin(u2) * np.cos(v2), -np.cos(u2) * np.cos(v2), np.sin(v2)], -1)
P = C + D * R[..., None]
ESP_FAIXA, ESP_CABELO, ESP_OUTRO = 0.008, 0.016, 0.010
alto = cabelo & (Z > 0.80)                               # só o cabelo de cima é volumoso; o de baixo da faixa (costeletas, nuca) é rente à pele
teto = np.where(valido, R - np.where(faixa, ESP_FAIXA, np.where(alto, ESP_CABELO, np.where(cabelo, 0.003, ESP_OUTRO))), np.inf)
# vales do cabelo: o couro cabeludo fica sob o ponto mais fundo de cada vizinhança
vale = wrap(np.where(alto, R, np.inf), lambda p: ndi.minimum_filter(p, size=(H // 14, W // 14))); vale = np.where(alto & np.isfinite(vale), vale - ESP_CABELO, np.inf)
rente_baixo = cabelo & ~alto & (Z < 0.72); z_cachecol = float(np.percentile(Z[cachecol], 97)) if cachecol.any() else 0.0
teto = np.minimum(teto, vale)
# frestas estreitas (entre os dentes do cabelo da nuca, dobras da faixa) viram um rebaixo largo e raso em vez de furinhos
atras = (np.abs(phi) > np.radians(95))[None, :] * np.ones((H, 1), bool)      # só atrás das orelhas: perto do rosto isso criaria um degrau na beira da pele
# Nuca e queixo, refinados em 09/10 a pedido do usuário:
#  - nuca: o limite passa a ser a altura típica (mediana) do cabelo rente, não o fundo de cada fresta entre os dentes.
#    A cabeça fica lisa ali; entre os dentes do cabelo pode aparecer pele, como numa nuca de verdade;
#  - queixo/maxilar: o cachecol deixa de limitar a forma (ele apertava a bochecha e marcava um vinco). Ali a cabeça
#    segue a continuação lisa da pele do rosto. Se o cachecol voltar como peça, cobre essa região por fora.
med_rente = wrap(np.where(valido & ~cor_conhecida, R, np.nan), lambda p: ndi.generic_filter(p[::4, ::4], np.nanmedian, size=(H // 4 // 14, W // 4 // 28), mode='nearest').repeat(4, 0).repeat(4, 1)[:p.shape[0], :p.shape[1]])
teto = np.where(cor_conhecida, np.inf, teto); teto = np.where(atras & rente_baixo & np.isfinite(med_rente), med_rente - 0.006, teto)
teto = np.where(cachecol | (valido & ~cor_conhecida & ~cabelo & ~faixa & (Z < z_cachecol)), np.inf, teto)      # cabelo e faixa continuam valendo
teto = np.where(cor_conhecida & valido, R, teto)              # a pele original é o próprio limite: a beirada refeita pode chegar até ela
# ── crânio: construção direta, sem ajuste cego ──
# A faixa dá a volta na cabeça, mas por cima do cabelo: o crânio fica mais para dentro. Quanto? Mede-se onde há pele logo
# abaixo da faixa (testa e frente das orelhas): a diferença entre a faixa e essa pele é a espessura do cabelo ali, e ela
# é estendida para a nuca. Faixa menos essa espessura = contorno horizontal do crânio (dado medido, não inventado).
# Esse contorno é levado para cima e para baixo por um perfil de ovo: o topo sobe até onde o fundo das mechas deixa,
# e a base fecha logo abaixo do queixo. Depois a pele real do rosto e das orelhas entra por cima (ver "esp").
coslat = np.cos(lam)[:, None]; sinlat = np.sin(lam)[:, None]
fx = faixa & (R < wrap(np.where(faixa, R, np.inf), lambda p: ndi.minimum_filter(p, size=(H // 8, 1))) + 0.01)       # faixa sem o nó e as pontas
hor = np.where(fx, R * coslat, np.nan)
with np.errstate(all='ignore'): rho = np.nanmedian(hor, 0)
ok_ = np.isfinite(rho); rho = np.interp(np.arange(W), np.nonzero(ok_)[0], rho[ok_], period=W)
rho = ndi.gaussian_filter1d(ndi.median_filter(rho, size=W // 40, mode='wrap'), W / 60, mode='wrap')
linha_base_faixa = np.where(fx, np.arange(H)[:, None], -1).max(0)                 # última linha da faixa em cada longitude
esp_cabelo = np.full(W, np.nan)
for i in range(W):
    j0 = linha_base_faixa[i]
    if j0 < 0: continue
    col_ = pele[j0:j0 + H // 12, i]
    if col_.sum() > H // 80: esp_cabelo[i] = rho[i] - np.median((R * coslat)[j0:j0 + H // 12, i][col_])
ok_ = np.isfinite(esp_cabelo); print('ESPESSURA do cabelo sob a faixa: medida em %.0f%% da volta; mediana %.4f (min %.4f, max %.4f)' % (100 * ok_.mean(), np.nanmedian(esp_cabelo), np.nanmin(esp_cabelo), np.nanmax(esp_cabelo)))
esp_cabelo = np.interp(np.arange(W), np.nonzero(ok_)[0], np.clip(esp_cabelo[ok_], 0.008, 0.05), period=W)
esp_cabelo = ndi.gaussian_filter1d(ndi.median_filter(esp_cabelo, size=W // 30, mode='wrap'), W / 40, mode='wrap')
rho = rho - esp_cabelo
z_faixa = float(np.median(Z[fx])); z_queixo = float(Z[pele].min()); Z_EQ = 0.68; c_baixo = Z_EQ - (z_queixo - 0.006)
def perfil_ovo(z, c_cima):
    f = np.sqrt(np.clip(1 - ((z - Z_EQ) / np.where(z >= Z_EQ, c_cima, c_baixo)) ** 2, 0, 1)); f0 = np.sqrt(1 - ((z_faixa - Z_EQ) / c_cima) ** 2); return f / f0
def raio_cranio(c_cima):                 # resolve, para cada direção, a distância em que o raio cruza o ovo
    lo_r = np.zeros((H, W)); hi_r = np.full((H, W), 0.45)
    for _ in range(34):
        m = (lo_r + hi_r) / 2; dentro_ = m * coslat < rho[None, :] * perfil_ovo(C[2] + m * sinlat, c_cima)
        lo_r = np.where(dentro_, m, lo_r); hi_r = np.where(dentro_, hi_r, m)
    return (lo_r + hi_r) / 2
alto_ok = alto & np.isfinite(vale); a_, b_ = 0.14, min(0.32, 1.30 * float(rho.mean()))        # topo no máximo 30% mais alto que largo
for _ in range(12):                      # topo mais alto que ainda fica sob o fundo das mechas (tolerância: 2% dos pontos)
    c_ = (a_ + b_) / 2; viol = (raio_cranio(c_)[alto_ok] > vale[alto_ok]).mean()
    if viol > 0.02: b_ = c_
    else: a_ = c_
c_cima = a_; RE = raio_cranio(c_cima)
print('CRANIO contorno da faixa: lado %.4f frente %.4f costas %.4f (z %.3f) | topo z %.4f, base z %.4f, queixo %.4f' % (rho[W * 3 // 4], rho[W // 2], rho[0], z_faixa, Z_EQ + c_cima, Z_EQ - c_baixo, z_queixo),
      '| fora do teto antes do corte: %.2f%%' % (100 * (np.isfinite(teto) & ~conhecido & (RE > teto) & (Z > 0.66)).mean()))
cen = np.array([C[0], C[1], Z_EQ]); raios = np.array([rho[W * 3 // 4], (rho[W // 2] + rho[0]) / 2, c_cima])
def suave(m, s): return wrap(m, lambda p: ndi.gaussian_filter(p, s, mode='nearest'))
# diferença entre a pele real e o elipsoide, espalhada suavemente para dentro da parte coberta
dif = np.where(conhecido, R - RE, 0.0); peso = conhecido.astype(float); s = W / 40
esp = suave(dif * peso, s) / np.maximum(suave(peso, s), 1e-3) * np.clip(suave(peso, s) * 3, 0, 1)
esp *= np.clip(1 - (np.arange(H)[:, None] - queixo) / (0.09 * H), 0, 1) ** 1.5      # abaixo do queixo a cabeça fecha em direção ao pescoço
# mechas e dobras fundas não afundam o crânio: o teto só vale até 0,012 abaixo do elipsoide — mas a cabeça nunca chega
# a menos de 0,003 da superfície original (nada de pele atravessando o cabelo ou a faixa)
bruto = np.where(valido & ~cor_conhecida, R, np.inf); limite = bruto - 0.003
limite = np.where(atras & rente_baixo & np.isfinite(med_rente), med_rente - 0.006, limite); limite = np.where(np.isinf(teto) & ~cor_conhecida, np.inf, limite)
limite = np.where(cor_conhecida & valido, R, limite)
teto = np.minimum(np.maximum(teto, RE - 0.012), limite)
alvo = np.minimum(RE + esp, teto)
# o teto tem degraus (bordas de mechas, da faixa): alisa o alvo e volta a limitar, poucas vezes, para não encolher a cabeça
Rn = np.where(conhecido, R, alvo)
# o teto tem o relevo do cabelo (dentes da nuca, costeletas, borda da faixa): alisar e limitar várias vezes deixa a
# superfície lisa que passa por baixo de tudo isso, sem a marca das mechas. Como o teto não desce mais que 0,012, a cabeça não encolhe.
for it in range(70):
    sm = suave(Rn, W / 100 if it < 20 else W / 150 if it < 60 else W / 400); Rn = np.where(conhecido, R, np.minimum(sm, teto))
borda = ndi.binary_dilation(conhecido, iterations=W // 200) & ~conhecido      # emenda com a pele original: transição curta e lisa
Rn = np.where(borda, np.minimum(suave(Rn, W / 500), teto), Rn)
furo = ~conhecido; print('RECONSTRUIDO %.1f%% da cabeça; pele original %.1f%%' % (100 * furo.mean(), 100 * conhecido.mean()),
      '| folga média sob o cabelo/faixa %.4f' % np.mean((R - Rn)[furo & valido & (Z > 0.62)]), '| pontos fora do original', int((Rn > R + 1e-6)[furo & valido].sum()))
np.save(out + '/raio.npy', Rn.astype(np.float32))
np.save(out + '/classes.npy', (cor_conhecida * 1 + (cabelo & ~cor_conhecida) * 2 + (faixa & ~cor_conhecida) * 3 + (cachecol & ~cor_conhecida) * 4).astype(np.uint8))
if '--debug' in sys.argv: np.savez(out + '/debug.npz', R=R, RE=RE, esp=esp, teto=teto, Rn=Rn, conhecido=conhecido, cor=cor_conhecida, alvo=alvo, Z=Z, faixa=faixa, cabelo=cabelo, lam=lam)
# ── cor ──
ero = ndi.binary_erosion(pele & ~ndi.binary_dilation(tracos, iterations=3), iterations=max(2, W // 500))
cor_pele = np.percentile(COL[ero], 65, axis=0); sg = W / 90
peso = suave(ero.astype(float), sg)
local = np.stack([suave(COL[..., i] * ero, sg) / np.maximum(peso, 1e-4) for i in range(3)], -1)
razao = np.where(peso[..., None] > 0.25, np.clip(local / cor_pele, 0.8, 1.25), 1.0)      # só onde há pele suficiente em volta para medir
plano = np.clip(COL / razao, 0, 1)                                      # pele original sem o sombreado largo
# a beirada da pele original guarda a sombra do cabelo/cachecol: no rosto ela é trocada pela cor lisa numa faixa larga
dentro = (ndi.binary_erosion(cor_conhecida & ~perto_cachecol, iterations=max(3, W // 85)) & zona_rosto) | (ndi.binary_erosion(cor_conhecida & ~perto_cachecol, iterations=max(3, W // 170)) & ~zona_rosto) | ndi.binary_erosion(tracos, iterations=1)
alfa = np.clip(suave(dentro.astype(float), W / 250) * 2 - 0.6, 0, 1)[..., None] * cor_conhecida[..., None]
TEX = plano * alfa + cor_pele * (1 - alfa)
Image.fromarray((np.clip(TEX, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out + '/cor.png')
# ── máscaras ── R = olhos, G = sobrancelhas, B = boca e nariz (traços fechados dentro da pele, abaixo dos olhos)
boca = cor_conhecida & ~pele & ~tracos & (np.arange(H)[:, None] > yo) & centro & (np.abs(COL - cor_pele).sum(2) > 0.25)
MK = np.stack([ndi.binary_dilation(olhos), ndi.binary_dilation(sobr), boca], -1)
Image.fromarray((MK * 255).astype(np.uint8)).save(out + '/mascara.png')
cls = np.zeros((H, W, 3), np.uint8); cls[cabelo] = (120, 80, 40); cls[faixa] = (220, 30, 30); cls[cachecol] = (120, 0, 80); cls[cor_conhecida] = (240, 200, 170); cls[sobr] = (0, 160, 0); cls[olhos] = (0, 80, 255); cls[boca] = (255, 0, 255)
Image.fromarray(cls).save(out + '/classes.png')
# perfis para conferência: corte de lado (frente–costas) e de frente (lado a lado), original × careca
def perfil(col_a, col_b, nome):
    im = np.full((700, 700, 3), 255, np.uint8)
    for RR, corp in ((R, (170, 120, 70)), (Rn, (230, 60, 60))):
        for col, sg_ in ((col_a, 1), (col_b, -1)):
            rr = RR[:, col]; ok = np.isfinite(rr) & (rr > 0.05); x = sg_ * rr * np.cos(lam); y = rr * np.sin(lam)
            xi = np.clip((350 + x * 1500).astype(int), 0, 699); yi = np.clip((350 - y * 1500).astype(int), 0, 699); im[yi[ok], xi[ok]] = corp
    Image.fromarray(im).save(out + f'/perfil-{nome}.png')
perfil(W // 2, 0, 'lado'); perfil(W * 3 // 4, W // 4, 'frente')
json.dump({'centro': [float(x) for x in C], 'elipsoide_centro': [float(x) for x in cen], 'elipsoide_raios': [float(x) for x in raios], 'pele': [float(x) for x in cor_pele], 'grade': [W, H]}, open(out + '/cabeca.json', 'w'), indent=1)
print('PELE', (cor_pele * 255).round().astype(int), 'olhos px', int(olhos.sum()), 'sobrancelhas px', int(sobr.sum()), 'boca px', int(boca.sum()))
