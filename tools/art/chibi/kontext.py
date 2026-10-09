"""
Edição por instrução com o FLUX.1 Kontext no ComfyUI local (127.0.0.1:8188): mantém o personagem e muda só o que o texto pede.
Uso: python3 kontext.py entrada.png saida_prefixo "instrução em inglês" [sementes=1,2] [guidance=2.5]
Precisa: models/diffusion_models/flux1-kontext-dev-Q5_K_S.gguf e o custom node ComfyUI-GGUF.
"""
import json, os, shutil, sys, time, urllib.parse, urllib.request
API = 'http://127.0.0.1:8188'
COMFY_INPUT = os.path.expanduser('~/ComfyUI/input')
src, dst, text = sys.argv[1], sys.argv[2], sys.argv[3]
seeds = [int(x) for x in (sys.argv[4] if len(sys.argv) > 4 else '1,2').split(',')]
guidance = float(sys.argv[5]) if len(sys.argv) > 5 else 2.5
name = 'voidsun-kontext-' + os.path.basename(src)
shutil.copy(src, os.path.join(COMFY_INPUT, name))

def wf(seed):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "flux1-kontext-dev-Q5_K_S.gguf"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp16.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "20": {"class_type": "LoadImage", "inputs": {"image": name}},
        "21": {"class_type": "FluxKontextImageScale", "inputs": {"image": ["20", 0]}},
        "22": {"class_type": "VAEEncode", "inputs": {"pixels": ["21", 0], "vae": ["3", 0]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": text, "clip": ["2", 0]}},
        "23": {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["4", 0], "latent": ["22", 0]}},
        "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["23", 0], "guidance": guidance}},
        "24": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["5", 0], "negative": ["24", 0], "latent_image": ["22", 0],
              "seed": seed, "steps": 22, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "voidsun-kontext"}},
    }

def post(p, d):
    req = urllib.request.Request(API + p, data=json.dumps(d).encode(), headers={'Content-Type': 'application/json'})
    try: return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e: print(e.read().decode()[:1500]); raise
def get(p): return json.loads(urllib.request.urlopen(API + p).read())

for seed in seeds:
    t0 = time.time(); pid = post('/prompt', {"prompt": wf(seed)})['prompt_id']
    while True:
        time.sleep(3); h = get('/history/' + pid)
        if pid in h:
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error': print('ERRO', str(st)[:900]); break
            im = h[pid]['outputs']['9']['images'][0]
            q = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im['subfolder'], 'type': im['type']})
            open(f'{dst}-{seed}.png', 'wb').write(urllib.request.urlopen(API + '/view?' + q).read())
            print('ok', os.path.basename(dst), seed, round(time.time() - t0), 's', flush=True); break
os.remove(os.path.join(COMFY_INPUT, name))
