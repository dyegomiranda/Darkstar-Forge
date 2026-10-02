"""
Gera as artes de fundo das telas do jogo (tela inicial e modos) pelo ComfyUI local
(Flux dev + LoRA "Modern Pixel Art"), o mesmo fluxo das artes das cartas e dos cenários.
Uso: python3 tools/comfyui/gerar_telas.py [variações=1] [id…]
Saída: public/ui/<id>.webp (pixelado). O que já existe é pulado; com variações > 1, as extras
saem como <id>__v2.webp… para escolher (renomeie a preferida para <id>.webp).
"""
import io, json, os, sys, time, urllib.request, urllib.parse
from PIL import Image

API = 'http://127.0.0.1:8188'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'ui')
os.makedirs(OUT, exist_ok=True)
PRE = "UMEMPART, modern pixel art, highly detailed 16-bit fantasy game key art, crisp square pixels, limited color palette, dramatic lighting, "
END = " Dark, mysterious, cosmic mood. No text, no letters, no logo, no UI, no border, no frame, no watermark."
# (id, semente, largura, altura, descrição)
ARTS = [
    ('titulo', 31, 1920, 1088,
     "wide cinematic landscape: a colossal black sun in total eclipse hangs in the upper right of the sky, a perfect black disc ringed by a thin blazing white-gold corona with long violet and magenta flares, "
     "over a dark alien wasteland of jagged obsidian cliffs and the broken ruins of an ancient tower. Deep indigo and purple night sky full of stars and a faint nebula. "
     "On a cliff edge in the lower left, seen from behind, a single small cloaked wanderer holding a staff looks at the eclipse. Faint embers drift in the air. "
     "The left third of the image is darker and calm, with mostly empty sky."),
    ('batalha-solo', 41, 1024, 1280,
     "vertical composition: a lone armored warrior seen from behind, cape flowing, sword lowered, standing on dark rocky ground and facing a towering shadowy horned monster with glowing violet eyes, "
     "under a black sun in total eclipse with a thin white-gold corona in a deep indigo starry sky."),
    ('batalha-multi', 42, 1024, 1280,
     "vertical composition: two rival heroes facing each other in a duel on a dark stone arena, on the left an armored knight with a sword and red cape, on the right a hooded mage with a glowing blue staff, "
     "both in profile, sparks between them, under a black sun in total eclipse with a thin white-gold corona in a deep indigo starry sky."),
    ('campanha', 43, 1024, 1280,
     "vertical composition: a winding road through a dark fantasy world map landscape seen from a high cliff, distant ruined castle, dead forest, mountains and a glowing violet rift on the horizon, "
     "a small party of three travelers with a lantern walking the road, under a black sun in total eclipse with a thin white-gold corona in a deep indigo starry sky."),
]

def wf(prompt, seed, w, h):
    return {
      "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-dev.safetensors", "weight_dtype": "fp8_e4m3fn"}},
      "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp16.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
      "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
      "10": {"class_type": "LoraLoader", "inputs": {"model": ["1", 0], "clip": ["2", 0], "lora_name": "ume_modern_pixelart.safetensors", "strength_model": 1.0, "strength_clip": 1.0}},
      "4": {"class_type": "CLIPTextEncode", "inputs": {"text": PRE + prompt + END, "clip": ["10", 1]}},
      "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["4", 0], "guidance": 3.5}},
      "6": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
      "7": {"class_type": "KSampler", "inputs": {"model": ["10", 0], "positive": ["5", 0], "negative": ["5", 0], "latent_image": ["6", 0],
             "seed": seed, "steps": 26, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
      "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
      "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "voidsun-tela"}},
    }

def pixelar(data, grade=4, cores=96):
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
for aid, seed, w, h, prompt in ARTS:
    if only and aid not in only: continue
    for v in range(1, nvar + 1):
        dst = os.path.join(OUT, f"{aid}.webp" if v == 1 else f"{aid}__v{v}.webp")
        if os.path.exists(dst): continue
        t0 = time.time()
        pid = post('/prompt', {"prompt": wf(prompt, seed * 100 + v, w, h)})['prompt_id']
        while True:
            time.sleep(2)
            hist = get('/history/' + pid)
            if pid in hist: break
        imgs = [i for o in hist[pid]['outputs'].values() for i in o.get('images', [])]
        if not imgs: print('ERRO', aid, v, flush=True); continue
        raw = urllib.request.urlopen(API + '/view?' + urllib.parse.urlencode(imgs[0])).read()
        pixelar(raw).save(dst, 'WEBP', quality=90, method=6)
        print('ok', aid, v, int(time.time() - t0), 's', flush=True)
