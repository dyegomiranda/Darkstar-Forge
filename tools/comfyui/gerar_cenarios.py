"""
Gera os cenários do campo de batalha pelo ComfyUI local (Flux dev + LoRA "Modern Pixel Art"),
o mesmo fluxo das artes das cartas. Uso: python3 tools/comfyui/gerar_cenarios.py [variações=1]
Saída: public/cenarios/<id>.webp (1344×768, pixelado). O que já existe é pulado; com variações > 1,
as extras saem como <id>__v2.webp… para escolher (renomeie a preferida para <id>.webp).
"""
import io, json, os, sys, time, urllib.request, urllib.parse
from PIL import Image

API = 'http://127.0.0.1:8188'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'cenarios')
os.makedirs(OUT, exist_ok=True)
PRE = "UMEMPART, modern pixel art, detailed 16-bit RPG game map, crisp square pixels, limited color palette, "
# O campo de batalha (duas fileiras de três casas de cada lado) fica no MEIO da imagem, de cima a baixo:
# a faixa central inteira precisa ser chão livre, sem portas, escadas, corredores ou paredes nela.
COMP = (" Strict top-down bird's-eye view, orthographic, seen from directly above like a video game battle arena map. "
        "The whole middle of the image, a wide band from the top edge down to the bottom edge, is one continuous open flat floor with an even, calm texture and nothing on it: "
        "no doors, no gates, no stairs, no corridors, no walls, no paths, no bridges, no water and no objects anywhere in the middle. "
        "Scenery objects only along the far left and far right sides. "
        "Soft even lighting, slightly muted colors. No characters, no creatures, no people, no text, no letters, no UI, no border, no frame.")
SCENES = [
    ('floresta', 11, "a forest clearing: lush green grass in the middle, dense trees, bushes, ferns and mossy rocks around the edges, a few fallen leaves and small flowers"),
    ('campo', 12, "open grassy plains: short green and yellow grass in the middle, wooden fences, haystacks, wildflowers and a few boulders on the sides"),
    ('vulcao', 13, "a volcanic wasteland: dark ash and basalt ground in the middle, cracks with glowing orange lava, charred rocks and lava pools around the edges"),
    ('masmorra', 14, "a wide stone dungeon hall: worn grey flagstone floor filling the middle, stone walls, pillars, torches, chains and rubble only on the left and right sides"),
    ('neve', 15, "a frozen tundra: packed white and pale blue snow in the middle, snowy pine trees, ice crystals and frosted rocks around the edges"),
    ('deserto', 16, "a desert ruin: pale sand in the middle, broken sandstone columns, dry bushes, bones and cracked rock around the edges"),
    ('pantano', 17, "a dark swamp: firm muddy dark green ground filling the middle, murky water pools, dead trees, reeds and giant mushrooms on the sides"),
    ('cripta', 18, "an ancient crypt: dark cracked stone tiles with faint purple runes in the middle, tombstones, coffins, candles and skull piles around the edges"),
]

def wf(prompt, seed, w=1344, h=768):
    return {
      "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-dev.safetensors", "weight_dtype": "fp8_e4m3fn"}},
      "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp16.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
      "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
      "10": {"class_type": "LoraLoader", "inputs": {"model": ["1", 0], "clip": ["2", 0], "lora_name": "ume_modern_pixelart.safetensors", "strength_model": 1.0, "strength_clip": 1.0}},
      "4": {"class_type": "CLIPTextEncode", "inputs": {"text": PRE + prompt + "." + COMP, "clip": ["10", 1]}},
      "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["4", 0], "guidance": 3.5}},
      "6": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
      "7": {"class_type": "KSampler", "inputs": {"model": ["10", 0], "positive": ["5", 0], "negative": ["5", 0], "latent_image": ["6", 0],
             "seed": seed, "steps": 24, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
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
for sid, seed, prompt in SCENES:
    if only and sid not in only: continue
    for v in range(1, nvar + 1):
        dst = os.path.join(OUT, f"{sid}.webp" if v == 1 else f"{sid}__v{v}.webp")
        if os.path.exists(dst): continue
        t0 = time.time()
        pid = post('/prompt', {"prompt": wf(prompt, seed * 100 + 50 + v)})['prompt_id']
        while True:
            time.sleep(2)
            h = get('/history/' + pid)
            if pid in h: break
        imgs = [i for o in h[pid]['outputs'].values() for i in o.get('images', [])]
        if not imgs: print('ERRO', sid, v, flush=True); continue
        raw = urllib.request.urlopen(API + '/view?' + urllib.parse.urlencode(imgs[0])).read()
        pixelar(raw).save(dst, 'WEBP', quality=88, method=6)
        print('ok', sid, v, int(time.time() - t0), 's', flush=True)
