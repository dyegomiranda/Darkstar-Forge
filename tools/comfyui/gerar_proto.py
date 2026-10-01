"""
Gera as artes das cartas pelo ComfyUI local: Flux dev + LoRA "Modern Pixel Art" (UmeAiRT).
Uso: python3 tools/comfyui/gerar_proto.py tools/comfyui/prompts-proto.json [variações=4]   (o ComfyUI precisa estar ligado em 127.0.0.1:8188)
As imagens saem em artes-proto/<deck>_<número>[__vN].png (nomes que o "Importar artes" do app reconhece); o que já existe é pulado.
"""
import json, sys, time, urllib.request, urllib.parse, os
API = 'http://127.0.0.1:8188'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'artes-proto')
os.makedirs(OUT, exist_ok=True)
PRE = "UMEMPART, modern pixel art, "
COMP = (" Vertical trading card illustration, dynamic action pose, dramatic lighting, vivid colors. The subject fills the upper two thirds of the image; "
        "the bottom third is darker ground or mist with no important details. No text, no letters, no signature, no watermark, no logo, no border, no frame.")

def wf(prompt, seed, w=768, h=1072):
    return {
      "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-dev.safetensors", "weight_dtype": "fp8_e4m3fn"}},
      "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp16.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
      "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
      "10": {"class_type": "LoraLoader", "inputs": {"model": ["1", 0], "clip": ["2", 0], "lora_name": "ume_modern_pixelart.safetensors", "strength_model": 1.0, "strength_clip": 1.0}},
      "4": {"class_type": "CLIPTextEncode", "inputs": {"text": PRE + prompt + COMP, "clip": ["10", 1]}},
      "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["4", 0], "guidance": 3.5}},
      "6": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
      "7": {"class_type": "KSampler", "inputs": {"model": ["10", 0], "positive": ["5", 0], "negative": ["5", 0], "latent_image": ["6", 0],
             "seed": seed, "steps": 24, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
      "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
      "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "darkstar"}},
    }

def post(path, data):
    req = urllib.request.Request(API + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())
def get(path): return json.loads(urllib.request.urlopen(API + path).read())

jobs = json.load(open(sys.argv[1])); nvar = int(sys.argv[2]) if len(sys.argv) > 2 else 4
for j in jobs:
    for v in range(1, nvar + 1):
        # nome que o "Importar artes" do app entende: <deck>_<número>.png e __v2, __v3… para as variações
        dst = os.path.join(OUT, f"{j['id']}.png" if v == 1 else f"{j['id']}__v{v}.png")
        if os.path.exists(dst): continue
        t0 = time.time()
        pid = post('/prompt', {"prompt": wf(j['prompt'], j.get('seed', 7) * 100 + v)})['prompt_id']
        while True:
            time.sleep(2)
            h = get('/history/' + pid)
            if pid in h:
                st = h[pid].get('status', {})
                if st.get('status_str') == 'error': print('ERRO', j['id'], str(st)[:400], flush=True); break
                img = h[pid]['outputs']['9']['images'][0]
                q = urllib.parse.urlencode({'filename': img['filename'], 'subfolder': img['subfolder'], 'type': img['type']})
                open(dst, 'wb').write(urllib.request.urlopen(API + '/view?' + q).read())
                print('ok', j['id'], v, round(time.time() - t0), 's', flush=True); break
