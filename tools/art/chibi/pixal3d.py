"""
Imagem → modelo 3D pelo Pixal3D local (ComfyUI de pesquisa em 127.0.0.1:8189, o mesmo de tools/art/viability3d-20261007).
Uso: python3 pixal3d.py imagem.png nome        → outputs/<nome>/colored-raw_00001_.glb dentro da pasta do experimento
Uma geração por vez; interrompe se a GPU passar de 10,5 GB, a RAM livre cair abaixo de 4 GB ou a temperatura chegar a 80 °C.
"""
import json, shutil, subprocess, sys, time, urllib.request
from pathlib import Path
R = Path(__file__).resolve().parents[1] / 'viability3d-20261007'
API = 'http://127.0.0.1:8189'
img, name = Path(sys.argv[1]), sys.argv[2]
shutil.copy(img, R / 'inputs' / f'{name}.png')
graph = json.loads((R / 'reports/benchmark1024-api.json').read_text().replace('brunhild-reference-v2.png', f'{name}.png')
                   .replace('preprocess/brunhild-input', f'{name}/input').replace('brunhild1024/', f'{name}/'))
shutil.rmtree(R / 'outputs' / name, ignore_errors=True)
def req(path, body=None):
    r = urllib.request.Request(API + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=15))
def probe():
    g = subprocess.run(['nvidia-smi', '--query-gpu=memory.used,temperature.gpu', '--format=csv,noheader,nounits'], capture_output=True, text=True, timeout=5).stdout.split(',')
    ram = next(int(l.split()[1]) // 1024 for l in open('/proc/meminfo') if l.startswith('MemAvailable:'))
    return int(g[0]), int(g[1]), ram
t0 = time.monotonic(); pid = req('/prompt', {'prompt': graph, 'client_id': 'voidsun-chibi'})['prompt_id']; peak = 0
while True:
    mem, temp, ram = probe(); peak = max(peak, mem)
    if mem > 10500 or ram < 4096 or temp >= 80 or time.monotonic() - t0 > 900:
        try: req('/interrupt', {})
        except Exception: pass
        raise SystemExit(f'INTERROMPIDO {name}: GPU {mem} MiB, {temp} °C, RAM livre {ram} MiB')
    h = req('/history/' + pid)
    if pid in h:
        st = h[pid].get('status', {}).get('status_str')
        out = R / 'outputs' / name / 'colored-raw_00001_.glb'
        print('PIXAL3D', name, st, round(time.monotonic() - t0), 's', 'pico GPU', peak, 'MiB', out if out.exists() else 'SEM ARQUIVO', flush=True)
        sys.exit(0 if st == 'success' and out.exists() else 1)
    time.sleep(2)
