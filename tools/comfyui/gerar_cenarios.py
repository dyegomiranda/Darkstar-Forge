"""
Gera os cenários do campo de batalha pelo ComfyUI local (Flux dev + LoRA "Modern Pixel Art"),
o mesmo fluxo das artes das cartas. Uso: python3 tools/comfyui/gerar_cenarios.py [variações=1]
Saída: public/cenarios/<id>.webp (1344×768, pixelado). O que já existe é pulado; com variações > 1,
as extras saem como <id>__v2.webp… para escolher (renomeie a preferida para <id>.webp).
"""
import io, json, os, random, sys, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFilter

API = 'http://127.0.0.1:8188'
OUT = os.environ.get('OUT') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'cenarios')
os.makedirs(OUT, exist_ok=True)
PRE = "UMEMPART, modern pixel art, detailed 16-bit RPG game map, crisp square pixels, limited color palette, "
# O campo de batalha (duas fileiras de três casas de cada lado) é uma coluna ALTA no meio da tela:
# de 30% a 70% da largura e quase toda a altura. Ali só pode haver chão. Para o Flux respeitar isso, a
# geração parte de um rascunho (chão liso na faixa do meio, cenário nas laterais) — img2img.
FLOOR_X = (0.29, 0.71)
COMP = (" Strict top-down bird's-eye view, orthographic, seen from directly above like a video game battle arena map. "
        "A wide straight vertical strip of open flat ground runs through the center of the image from the very top edge to the very bottom edge, "
        "filling the middle forty percent of the width, with an even, calm floor texture and nothing on it: "
        "no walls, no doors, no stairs, no paths, no water, no objects in the central strip. "
        "All scenery objects stay in the left third and the right third of the image. "
        "Soft even lighting, slightly muted colors. No characters, no creatures, no people, no text, no letters, no UI, no border, no frame.")
# (id, semente, descrição, cor do chão, cor das laterais) — as cores só servem ao rascunho
SCENES = [
    ('floresta', 11, "a forest clearing: lush green grass in the middle, dense trees, bushes, ferns and mossy rocks around the edges, a few fallen leaves and small flowers", (72, 110, 52), (28, 52, 30)),
    ('campo', 12, "open grassy plains: short green and yellow grass in the middle, wooden fences, haystacks, wildflowers and a few boulders on the sides", (120, 140, 70), (70, 96, 48)),
    ('vulcao', 13, "a volcanic wasteland: dark ash and basalt ground in the middle, cracks with glowing orange lava, charred rocks and lava pools around the edges", (52, 44, 44), (30, 20, 20)),
    ('masmorra', 14, "a wide stone dungeon hall: worn grey flagstone floor filling the middle, stone walls, pillars, torches, chains and rubble only on the left and right sides", (92, 96, 104), (34, 32, 38)),
    ('neve', 15, "a frozen tundra: packed white and pale blue snow in the middle, snowy pine trees, ice crystals and frosted rocks around the edges", (214, 226, 236), (120, 140, 160)),
    ('deserto', 16, "a desert ruin: pale sand in the middle, broken sandstone columns, dry bushes, bones and cracked rock around the edges", (214, 186, 132), (140, 110, 72)),
    ('pantano', 17, "a dark swamp: firm muddy dark green ground filling the middle, murky water pools, dead trees, reeds and giant mushrooms on the sides", (54, 66, 44), (24, 34, 28)),
    ('cripta', 18, "an ancient crypt: large square dark purple flagstone floor tiles (not bricks) with faint runes in the middle, tombstones, coffins, candles and skull piles around the edges", (62, 54, 82), (22, 18, 32)),
]

def guide(floor, side, seed, w=1344, h=768):
    """Rascunho: laterais escuras e manchadas (onde vai o cenário), faixa do meio lisa na cor do chão."""
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h), side)
    d = ImageDraw.Draw(im)
    for _ in range(260):
        x = rnd.choice([rnd.uniform(0, FLOOR_X[0] * w), rnd.uniform(FLOOR_X[1] * w, w)])
        y, r = rnd.uniform(0, h), rnd.uniform(18, 70)
        k = rnd.uniform(0.6, 2.6)
        d.ellipse((x - r, y - r, x + r, y + r), fill=tuple(max(0, min(255, int(c * k))) for c in side))
    x0, x1 = int(FLOOR_X[0] * w), int(FLOOR_X[1] * w)
    d.rectangle((x0, -10, x1, h + 10), fill=floor)
    im = im.filter(ImageFilter.GaussianBlur(6))
    # um pouco de grão no chão, para o Flux desenhar textura e não um bloco chapado
    px = im.load()
    for _ in range(9000):
        x, y = rnd.randrange(x0, x1), rnd.randrange(h)
        k = rnd.uniform(0.85, 1.12)
        px[x, y] = tuple(max(0, min(255, int(c * k))) for c in px[x, y])
    return im

BASE = os.environ.get('BASE')  # pasta com os cenários antigos: o rascunho parte deles

def guide_from(src, seed):
    """Rascunho a partir do cenário antigo: as laterais ficam; a faixa do meio vira o chão dele, repetido de cima a baixo."""
    im = Image.open(src).convert('RGB')
    w, h = im.size
    x0, x1 = int(FLOOR_X[0] * w), int(FLOOR_X[1] * w)
    tile = im.crop((x0, int(h * 0.40), x1, int(h * 0.60)))
    band = Image.new('RGB', (x1 - x0, h))
    for i, y in enumerate(range(0, h, tile.height)):
        band.paste(tile if i % 2 == 0 else tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM), (0, y))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rectangle((x0 + 14, 0, x1 - 14, h), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(12))
    full = im.copy(); full.paste(band, (x0, 0))
    return Image.composite(full, im, mask)

def upload(im, name):
    buf = io.BytesIO(); im.save(buf, 'PNG')
    bd = '----cenario'
    body = (f'--{bd}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\nContent-Type: image/png\r\n\r\n').encode() + buf.getvalue() + f'\r\n--{bd}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{bd}--\r\n'.encode()
    req = urllib.request.Request(API + '/upload/image', data=body, headers={'Content-Type': f'multipart/form-data; boundary={bd}'})
    return json.loads(urllib.request.urlopen(req).read())['name']

DENOISE = float(os.environ.get('DENOISE', '0.84'))

def wf(prompt, seed, init, w=1344, h=768):
    return {
      "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-dev.safetensors", "weight_dtype": "fp8_e4m3fn"}},
      "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp16.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
      "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
      "10": {"class_type": "LoraLoader", "inputs": {"model": ["1", 0], "clip": ["2", 0], "lora_name": "ume_modern_pixelart.safetensors", "strength_model": 1.0, "strength_clip": 1.0}},
      "4": {"class_type": "CLIPTextEncode", "inputs": {"text": PRE + prompt + "." + COMP, "clip": ["10", 1]}},
      "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["4", 0], "guidance": 3.5}},
      "11": {"class_type": "LoadImage", "inputs": {"image": init}},
      "6": {"class_type": "VAEEncode", "inputs": {"pixels": ["11", 0], "vae": ["3", 0]}},
      "7": {"class_type": "KSampler", "inputs": {"model": ["10", 0], "positive": ["5", 0], "negative": ["5", 0], "latent_image": ["6", 0],
             "seed": seed, "steps": 24, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": DENOISE}},
      "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
      "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "darkstar-cenario"}},
    }

def pixelar(data, grade=4, cores=64):
    im = Image.open(io.BytesIO(data)).convert('RGB')
    small = im.resize((im.width // grade, im.height // grade), Image.Resampling.BOX)
    small = small.quantize(colors=cores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    return small.resize((small.width * grade, small.height * grade), Image.Resampling.NEAREST)

def post(path, data):
    req = urllib.request.Request(API + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())
def get(path): return json.loads(urllib.request.urlopen(API + path).read())

nvar = int(sys.argv[1]) if len(sys.argv) > 1 else 1
only = sys.argv[2:]
for sid, seed, prompt, floor, side in SCENES:
    if only and sid not in only: continue
    for v in range(1, nvar + 1):
        dst = os.path.join(OUT, f"{sid}.webp" if v == 1 else f"{sid}__v{v}.webp")
        if os.path.exists(dst): continue
        t0 = time.time()
        g = guide_from(os.path.join(BASE, f'{sid}.webp'), seed) if BASE else guide(floor, side, seed * 100 + v)
        init = upload(g, f'cenario-guia-{sid}-{v}.png')
        pid = post('/prompt', {"prompt": wf(prompt, seed * 100 + 70 + v, init)})['prompt_id']
        while True:
            time.sleep(2)
            h = get('/history/' + pid)
            if pid in h: break
        imgs = [i for o in h[pid]['outputs'].values() for i in o.get('images', [])]
        if not imgs: print('ERRO', sid, v, flush=True); continue
        raw = urllib.request.urlopen(API + '/view?' + urllib.parse.urlencode(imgs[0])).read()
        pixelar(raw).save(dst, 'WEBP', quality=88, method=6)
        print('ok', sid, v, int(time.time() - t0), 's', flush=True)
