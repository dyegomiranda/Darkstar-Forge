"""
Gera as versões leves (WebP qualidade 95) das artes HD das cartas e guarda os PNG originais fora do repositório.
  public/art/rework/cards-hd/*.png  →  public/art/rework/cards-hd/*.webp   (o que o jogo usa)
                                    →  artes-cartas-hd/*.png               (originais, só na máquina)
Para refazer a partir dos originais: python cartas_webp.py --dos-originais
Uso: ~/ComfyUI/venv/bin/python tools/art/cartas_webp.py
"""
import glob, os, shutil, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
JOGO, ORIG = os.path.join(RAIZ, 'public/art/rework/cards-hd'), os.path.join(RAIZ, 'artes-cartas-hd')
def conv(f):
    im = Image.open(f).convert('RGB'); out = os.path.join(JOGO, os.path.basename(f)[:-4] + '.webp'); im.save(out, 'WEBP', quality=95, method=6)
    assert Image.open(out).size == im.size, f
    return os.path.getsize(f), os.path.getsize(out)
os.makedirs(ORIG, exist_ok=True)
fs = sorted(glob.glob((ORIG if '--dos-originais' in sys.argv else JOGO) + '/*.png'))
with ThreadPoolExecutor(8) as ex: r = list(ex.map(conv, fs))
if '--dos-originais' not in sys.argv:
    for f in fs: shutil.move(f, os.path.join(ORIG, os.path.basename(f)))
print(len(fs), 'cartas; PNG %.0f MB -> WebP %.0f MB' % (sum(a for a, _ in r) / 1e6, sum(b for _, b in r) / 1e6))
