"""
Imagem → malha 3D pelo Hunyuan3D 2.1 (checkpoint oficial reempacotado pela Comfy-Org, nós nativos do ComfyUI de pesquisa
em 127.0.0.1:8189). A versão aberta gera SÓ A FORMA (sem cor/textura); 2.5 e 3.x não têm pesos públicos.
Uso: python3 hunyuan3d.py imagem.png nome [octree=384] [passos=30] [semente=7]   → outputs/<nome>/hy_00001_.glb
Interrompe se a GPU passar de 10,5 GB, a RAM livre cair abaixo de 4 GB ou a temperatura chegar a 80 °C.
"""
import json, shutil, subprocess, sys, time, urllib.request
from pathlib import Path
R = Path(__file__).resolve().parents[1] / 'viability3d-20261007'
API = 'http://127.0.0.1:8189'
img, name = Path(sys.argv[1]), sys.argv[2]
octree = int(sys.argv[3]) if len(sys.argv) > 3 else 384; steps = int(sys.argv[4]) if len(sys.argv) > 4 else 30; seed = int(sys.argv[5]) if len(sys.argv) > 5 else 7
shutil.copy(img, R / 'inputs' / f'{name}.png'); shutil.rmtree(R / 'outputs' / name, ignore_errors=True)
g = {
 '1': {'class_type': 'ImageOnlyCheckpointLoader', 'inputs': {'ckpt_name': 'hunyuan_3d_v2.1.safetensors'}},
 '2': {'class_type': 'LoadImage', 'inputs': {'image': f'{name}.png'}},
 '20': {'class_type': 'LoadBackgroundRemovalModel', 'inputs': {'bg_removal_name': 'birefnet.safetensors'}},
 '21': {'class_type': 'RemoveBackground', 'inputs': {'bg_removal_model': ['20', 0], 'image': ['2', 0]}},
 '22': {'class_type': 'ImageCropToMask', 'inputs': {'images': ['2', 0], 'masks': ['21', 0], 'width': 1024, 'height': 1024, 'pad_factor': 1.1, 'grow_mask': 0, 'background': '#ffffff'}},
 '23': {'class_type': 'SaveImage', 'inputs': {'images': ['22', 0], 'filename_prefix': f'{name}/input'}},
 '3': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['1', 0], 'shift': 1.0}},
 '13': {'class_type': 'CLIPVisionEncode', 'inputs': {'clip_vision': ['1', 1], 'image': ['22', 0], 'crop': 'center'}},
 '6': {'class_type': 'Hunyuan3Dv2Conditioning', 'inputs': {'clip_vision_output': ['13', 0]}},
 '4': {'class_type': 'EmptyLatentHunyuan3Dv2', 'inputs': {'resolution': 4096, 'batch_size': 1}},
 '7': {'class_type': 'KSampler', 'inputs': {'model': ['3', 0], 'positive': ['6', 0], 'negative': ['6', 1], 'latent_image': ['4', 0], 'seed': seed, 'steps': steps, 'cfg': 5.0, 'sampler_name': 'euler', 'scheduler': 'normal', 'denoise': 1.0}},
 '8': {'class_type': 'VAEDecodeHunyuan3D', 'inputs': {'samples': ['7', 0], 'vae': ['1', 2], 'num_chunks': 8000, 'octree_resolution': octree}},
 '9': {'class_type': 'VoxelToMesh', 'inputs': {'voxel': ['8', 0], 'algorithm': 'surface net', 'threshold': 0.6}},
 '10': {'class_type': 'SaveGLB', 'inputs': {'mesh': ['9', 0], 'filename_prefix': f'{name}/hy'}},
}
def req(path, body=None):
    r = urllib.request.Request(API + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    try: return json.load(urllib.request.urlopen(r, timeout=20))
    except urllib.error.HTTPError as e: print(e.read().decode()[:1500]); raise
def probe():
    v = subprocess.run(['nvidia-smi', '--query-gpu=memory.used,temperature.gpu', '--format=csv,noheader,nounits'], capture_output=True, text=True, timeout=5).stdout.split(',')
    ram = next(int(l.split()[1]) // 1024 for l in open('/proc/meminfo') if l.startswith('MemAvailable:'))
    return int(v[0]), int(v[1]), ram
t0 = time.monotonic(); pid = req('/prompt', {'prompt': g, 'client_id': 'voidsun-hy3d'})['prompt_id']; peak = 0
while True:
    mem, temp, ram = probe(); peak = max(peak, mem)
    if mem > 10500 or ram < 4096 or temp >= 80 or time.monotonic() - t0 > 1200:
        try: req('/interrupt', {})
        except Exception: pass
        raise SystemExit(f'INTERROMPIDO {name}: GPU {mem} MiB, {temp} °C, RAM livre {ram} MiB')
    h = req('/history/' + pid)
    if pid in h:
        st = h[pid].get('status', {}); out = sorted((R / 'outputs' / name).glob('hy_*.glb'))
        print('HUNYUAN3D', name, st.get('status_str'), round(time.monotonic() - t0), 's', 'pico GPU', peak, 'MiB', out[0] if out else 'SEM ARQUIVO', flush=True)
        if st.get('status_str') != 'success': print(str(st)[:1200])
        sys.exit(0 if st.get('status_str') == 'success' and out else 1)
    time.sleep(2)
