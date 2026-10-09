import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
api = 'http://127.0.0.1:8189'
parser = argparse.ArgumentParser()
parser.add_argument('case', choices=['preprocess','benchmark','benchmark1024','crate512','helmet512','chibi-a','chibi-b','chibi-b1024','chibi-c','chibi-base','corpo-masculino','corpo-feminino','chibi-vestida','chibi-armadura'])
args = parser.parse_args()
graph = json.loads((root/f'reports/{args.case}-api.json').read_text())
config = json.loads((root/'reports/benchmark-config.json').read_text())

def request(path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(api+path,data=data,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=15) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        print(error.read().decode(),flush=True)
        raise

def stop_owned_server():
    try:
        request('/interrupt', {})
    except Exception:
        pass
    # Only terminate the isolated server whose command and working directory match this experiment.
    import psutil
    expected_cwd = str((root/'runtime/ComfyUI').resolve())
    for process in psutil.process_iter(['pid','cmdline','cwd']):
        try:
            command = process.info['cmdline'] or []
            if process.info['cwd'] == expected_cwd and 'main.py' in command and '8189' in command:
                process.terminate()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

def telemetry():
    probe = subprocess.run(['nvidia-smi','--query-gpu=memory.used,utilization.gpu,temperature.gpu','--format=csv,noheader,nounits'],capture_output=True,text=True,timeout=5)
    values = probe.stdout.strip().split(',')
    gpu_mem,gpu_load,gpu_temp = map(lambda x:int(x.strip()),values)
    available = next(int(line.split()[1])//1024 for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
    return {'elapsed_s':round(time.monotonic()-start,2),'gpu_memory_mib':gpu_mem,'gpu_utilization_percent':gpu_load,'gpu_temp_c':gpu_temp,'available_ram_mib':available}

start = time.monotonic()
submission = request('/prompt', {'prompt':graph,'client_id':'voidsun-local-viability'})
prompt_id = submission['prompt_id']
(root/f'reports/{args.case}-submission.json').write_text(json.dumps(submission,indent=2)+'\n')
print('Submitted',args.case,prompt_id,flush=True)
samples=[]
status='running'
error=None
history=None
last_print=0
output=root/f'reports/{args.case}-result.json'
with (root/f'reports/{args.case}-telemetry.jsonl').open('w') as log:
    try:
        while True:
            sample=telemetry();samples.append(sample);log.write(json.dumps(sample)+'\n');log.flush()
            if sample['elapsed_s']-last_print>=15:
                print(json.dumps(sample),flush=True);last_print=sample['elapsed_s']
            if sample['gpu_memory_mib']>config['max_total_gpu_memory_mib'] or sample['available_ram_mib']<config['min_available_ram_mib'] or sample['gpu_temp_c']>=config['max_gpu_temp_c'] or sample['elapsed_s']>config['max_seconds']:
                status='stopped_resource_budget';error=sample;stop_owned_server();break
            data=request('/history/'+prompt_id)
            if prompt_id in data:
                history=data[prompt_id];status=history.get('status',{}).get('status_str','completed');break
            time.sleep(2)
    except Exception as exc:
        status='monitor_error';error=str(exc);stop_owned_server()
        print(type(exc).__name__,str(exc),flush=True)
result={'case':args.case,'prompt_id':prompt_id,'status':status,'elapsed_seconds':round(time.monotonic()-start,2),'peak_gpu_memory_mib':max((x['gpu_memory_mib'] for x in samples),default=None),'peak_gpu_temp_c':max((x['gpu_temp_c'] for x in samples),default=None),'min_available_ram_mib':min((x['available_ram_mib'] for x in samples),default=None),'telemetry_interval_seconds':2,'error':error,'history':history}
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='history'}),flush=True)
if status!='success': sys.exit(1)
