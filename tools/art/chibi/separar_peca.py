"""
Separa do molde a peça desenhada por cima do manequim azul e mede onde ela fica no corpo.
Uso: python separar_peca.py molde.png desenho.png saida.png [medida.json]
 - o desenho pode ter outro tamanho ou um leve desvio: a escala e a posição vêm do contorno azul (pontas das mãos e pés);
 - saída: a peça sozinha, em fundo branco, e a caixa dela em unidades do modelo (altura do corpo = 1, pés em z = 0).
O molde é o render de moldes.py: câmera ortográfica de 1,25 unidade, centrada em x = 0, z = 0,5.
"""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
molde, des, out = sys.argv[1:4]; med = sys.argv[4] if len(sys.argv) > 4 else None
def azul(a): r, g, b = [a[..., i].astype(int) for i in range(3)]; return (b > r + 45) & (b > g + 15)
def caixa_corpo(m):
    # largura pelas pontas das mãos e base pelos pés; o topo fica de fora porque a peça pode cobrir a cabeça
    ys, xs = np.nonzero(m); return xs.min(), xs.max(), ys.max()
M = np.asarray(Image.open(molde).convert('RGB')); D = np.asarray(Image.open(des).convert('RGB'))
mx0, mx1, myb = caixa_corpo(azul(M)); dx0, dx1, dyb = caixa_corpo(azul(D))
k = (dx1 - dx0) / (mx1 - mx0)                                  # pixels do desenho por pixel do molde
r, g, b = [D[..., i].astype(int) for i in range(3)]
fundo = (np.minimum(np.minimum(r, g), b) > 205) & (np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b) < 18)
peca = ~fundo & ~azul(D)
peca = ndi.binary_opening(peca, iterations=2); lab, n = ndi.label(peca)
big = 1 + int(np.argmax(ndi.sum(peca, lab, range(1, n + 1)))); peca = ndi.binary_closing(lab == big, iterations=3)
# borda: tira um pixel de mistura com o azul/fundo
peca = ndi.binary_erosion(peca, iterations=1)
ys, xs = np.nonzero(peca); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
rgba = np.dstack([D, (peca * 255).astype(np.uint8)])[y0:y1 + 1, x0:x1 + 1]
im = Image.fromarray(rgba); lado = int(max(im.size) * 1.12); bg = Image.new('RGB', (lado, lado), (255, 255, 255)); bg.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2), im)
bg.resize((1024, 1024), Image.LANCZOS).save(out); im.save(out.replace('.png', '-rgba.png'))
U = 1024 / 1.25                                                # pixels do molde por unidade
def para_modelo(px, py):                                       # pixel do desenho → pixel do molde → unidades do modelo
    mxp = (px - (dx0 + dx1) / 2) / k + (mx0 + mx1) / 2; myp = (py - dyb) / k + myb
    return (mxp - 512) / U, 0.5 - (myp - 512) / U
ax, az = para_modelo(x0, y1); bx, bz = para_modelo(x1, y0)
m = {'escala_desenho': round(k, 4), 'x': [round(ax, 4), round(bx, 4)], 'z': [round(az, 4), round(bz, 4)], 'pixels': [int(x0), int(y0), int(x1), int(y1)]}
print('PECA', json.dumps(m))
if med: json.dump(m, open(med, 'w'))
