#!/usr/bin/env python3
"""
Monta as folhas de quadros das criaturas que não são bonecos de peças (animais,
máquinas de cerco, construções) a partir de pacotes livres do OpenGameArt.

Saída: public/creatures/<id>.png + src/data/creatures.json + src/data/creatures-credits.json
Cada folha tem 4 fileiras: parado de costas, parado de frente, ataque de costas,
ataque de frente (as duas vistas que o campo usa).

Os originais ficam em ~/Projetos/sprites-fonte (baixados na primeira vez).
"""
import json, os, urllib.request, zipfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.expanduser('~/Projetos/sprites-fonte')
OUT = os.path.join(ROOT, 'public/creatures')
OGA = 'https://opengameart.org/sites/default/files/'
FILES = {
    'wolfsheet1_0.png': OGA + 'wolfsheet1_0.png',
    'ballista.png': OGA + 'ballista.png', 'ballista-arm.png': OGA + 'ballista-arm.png', 'wheels-bg.png': OGA + 'wheels-bg.png', 'wheels-fg.png': OGA + 'wheels-fg.png',
    'castle8.png': OGA + 'castle8_0.png', 'animals.zip': OGA + 'lpc_animals_2022_v1.1.zip',
}
CREDITS = [
    {'what': 'Lobo', 'title': '[LPC] Wolf Animation', 'authors': "Stephen 'Redshrike' Challener; William.Thompsonj", 'license': 'CC-BY 3.0 / OGA-BY 3.0 / GPL 3.0', 'url': 'https://opengameart.org/content/lpc-wolf-animation'},
    {'what': 'Urso', 'title': '[LPC] bears, deer, lions and more', 'authors': 'tapatilorenzo', 'license': 'CC-BY 4.0', 'url': 'https://opengameart.org/content/lpc-bears-deer-lions-and-more'},
    {'what': 'Balista', 'title': '[LPC] Siege Weapons', 'authors': 'bluecarrot16; Herodom', 'license': 'CC-BY 3.0 / OGA-BY 3.0 / GPL 3.0', 'url': 'https://opengameart.org/content/lpc-siege-weapons'},
    {'what': 'Torre / muralha', 'title': 'LPC Castle Mega-Pack', 'authors': 'bluecarrot16', 'license': 'CC-BY-SA 3.0', 'url': 'https://opengameart.org/content/lpc-castle-mega-pack'},
]


def fetch():
    os.makedirs(SRC, exist_ok=True)
    for name, url in FILES.items():
        p = os.path.join(SRC, name)
        if not os.path.exists(p):
            print('baixando', url)
            urllib.request.urlretrieve(url, p)


def src(name):
    return Image.open(os.path.join(SRC, name)).convert('RGBA')


def sheet(cell, rows):
    """rows: 4 listas de quadros (imagens); cada quadro vai centrado embaixo da célula."""
    n = max(len(r) for r in rows)
    out = Image.new('RGBA', (cell[0] * n, cell[1] * 4))
    for ri, row in enumerate(rows):
        for fi, fr in enumerate(row):
            out.alpha_composite(fr, (fi * cell[0] + (cell[0] - fr.width) // 2, ri * cell[1] + cell[1] - fr.height))
    return out


def grid(im, w, h, cells):
    return [im.crop((c * w, r * h, c * w + w, r * h + h)) for c, r in cells]


def main():
    fetch()
    os.makedirs(OUT, exist_ok=True)
    meta = {}

    def save(cid, cell, rows, **extra):
        sheet(cell, rows).save(os.path.join(OUT, cid + '.png'), optimize=True)
        meta[cid] = {'cell': list(cell), 'idle': max(len(rows[0]), len(rows[1])), 'attack': max(len(rows[2]), len(rows[3])), **extra}

    # Lobo: metade esquerda da folha em quadros de 32×64 — de frente nas colunas 0–4, de costas nas 5–9; a mordida é a fileira 4
    w = src('wolfsheet1_0.png')
    save('wolf', (32, 64), [grid(w, 32, 64, [(5, 0)]), grid(w, 32, 64, [(0, 0)]), grid(w, 32, 64, [(c, 4) for c in range(5, 10)]), grid(w, 32, 64, [(c, 4) for c in range(5)])], fps=10)

    # Urso: quadros de 64×64; fileiras 0–3 andar (costas, direita, esquerda, frente), 4–7 atacar
    with zipfile.ZipFile(os.path.join(SRC, 'animals.zip')) as z:
        name = next(n for n in z.namelist() if n.endswith('bear, grizzly.png'))
        with z.open(name) as fh:
            b = Image.open(fh).convert('RGBA')
    px = b.load()
    for y in range(b.height):  # o fundo vazio da folha é magenta
        for x in range(b.width):
            if px[x, y][:3] == (255, 0, 255): px[x, y] = (0, 0, 0, 0)
    save('bear', (64, 64), [grid(b, 64, 64, [(0, 0)]), grid(b, 64, 64, [(0, 3)]), grid(b, 64, 64, [(c, 4) for c in range(4)]), grid(b, 64, 64, [(c, 7) for c in range(4)])], fps=7)

    # Balista: 4 camadas de 128×128, 6 quadros do disparo; fileira 0 aponta para cima, fileira 4 para baixo
    layers = [src(n) for n in ('wheels-bg.png', 'ballista.png', 'wheels-fg.png', 'ballista-arm.png')]
    full = Image.new('RGBA', layers[0].size)
    for l in layers: full.alpha_composite(l)
    up, down = grid(full, 128, 128, [(c, 0) for c in range(6)]), grid(full, 128, 128, [(c, 4) for c in range(6)])
    save('ballista', (128, 128), [up[:1], down[:1], up, down], fps=12, scale=0.75)

    # Torre: a torre redonda com ameias do pacote de castelo (sem animação)
    t = src('castle8.png').crop((448, 96, 512, 176))
    save('tower', (64, 80), [[t], [t], [t], [t]], fps=1)

    json.dump(meta, open(os.path.join(ROOT, 'src/data/creatures.json'), 'w'), indent=1)
    json.dump(CREDITS, open(os.path.join(ROOT, 'src/data/creatures-credits.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(meta), 'criaturas em public/creatures')


if __name__ == '__main__':
    main()
