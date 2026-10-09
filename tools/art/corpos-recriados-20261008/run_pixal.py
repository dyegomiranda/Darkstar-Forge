import argparse,json,time,urllib.request,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parent
BASE=R.parent/'viability3d-20261007'
parser=argparse.ArgumentParser();parser.add_argument('sex',choices=['masculino','feminino']);args=parser.parse_args()
name='corpo-'+args.sex+'-recriado-20261008'
api='http://127.0.0.1:8189'
def req(path,body=None):
 data=None if body is None else json.dumps(body).encode()
 with urllib.request.urlopen(urllib.request.Request(api+path,data=data,headers={'Content-Type':'application/json'}),timeout=20) as response:return json.load(response)
graph=json.loads((BASE/'reports'/('corpo-'+args.sex+'-api.json')).read_text())
graph['1']['inputs']['image']=name+'.png'
# Native Blender render carries exact coverage; preserve fine digits instead of resegmenting them.
graph['34']={'class_type':'InvertMask','inputs':{'mask':['1',1]}}
graph['4']['inputs']['masks']=['34',0]
for node in graph.values():
 if 'filename_prefix' in node['inputs']:
  node['inputs']['filename_prefix']=name+'/'+node['inputs']['filename_prefix'].split('/')[-1]
# Keep tested resolution and resource envelope; detail comes from the improved reference.
(R/'reports'/(args.sex+'-workflow.json')).write_text(json.dumps(graph,indent=2))
submission=req('/prompt',{'prompt':graph,'client_id':'voidsun-corpos-recriados'})
(R/'reports'/(args.sex+'-submission.json')).write_text(json.dumps(submission,indent=2))
if 'prompt_id' not in submission:raise RuntimeError(submission)
print('Submitted',name,submission['prompt_id'],flush=True)
start=time.monotonic();samples=[];status='running';history=None;error=None;last=0
with (R/'reports'/(args.sex+'-telemetry.jsonl')).open('w') as log:
 while True:
  try:
   data=subprocess.check_output(['nvidia-smi','--query-gpu=memory.used,utilization.gpu,temperature.gpu','--format=csv,noheader,nounits'],text=True,timeout=5)
   mem,load,temp=map(int,data.strip().split(','))
   available=next(int(l.split()[1])//1024 for l in Path('/proc/meminfo').read_text().splitlines() if l.startswith('MemAvailable:'))
   elapsed=time.monotonic()-start
   sample={'elapsed_s':round(elapsed,1),'gpu_mib':mem,'load':load,'temp_c':temp,'ram_available_mib':available}
   samples.append(sample);log.write(json.dumps(sample)+'\n');log.flush()
   if elapsed-last>=20:print(json.dumps(sample),flush=True);last=elapsed
   if mem>10500 or available<4096 or temp>=80 or elapsed>1800:
    req('/interrupt',{});status='stopped_resource_budget';error=sample;break
   response=req('/history/'+submission['prompt_id'])
   if submission['prompt_id'] in response:
    history=response[submission['prompt_id']];status=history.get('status',{}).get('status_str','completed');break
   time.sleep(2)
  except Exception as e:
   status='monitor_error';error=str(e)
   try:req('/interrupt',{})
   except Exception:pass
   break
result={'case':name,'status':status,'seconds':round(time.monotonic()-start,1),'peak_gpu_mib':max((s['gpu_mib'] for s in samples),default=0),'min_available_ram_mib':min((s['ram_available_mib'] for s in samples),default=0),'error':error,'history':history}
(R/'reports'/(args.sex+'-generation.json')).write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='history'}),flush=True)
if status!='success':sys.exit(1)
