"""Voxel volume repair, derived from the project's earlier shell-fill approach.
No hand shape is synthesized; the rejected scanned hands are replaced afterward.
"""
import sys,os,json,threading,time
from pathlib import Path
import numpy as np,psutil
from scipy import ndimage as ndi
from skimage import measure

sex=sys.argv[1];r=Path('/home/djabo/Downloads/Void Sun/tools/art/corpos-recriados-20261008')
def guard():
 p=psutil.Process()
 while True:
  if psutil.virtual_memory().available<4*1024**3 or p.memory_info().rss>4*1024**3:
   print('RESOURCE_GUARD_STOP',flush=True);os._exit(1)
  time.sleep(.5)
threading.Thread(target=guard,daemon=True).start()
d=np.load(r/'work'/f'{sex}-body-clean.npz');v=d['V'];f=d['F'];lo=v.min(0);hi=v.max(0);pitch=.0035;seal=2;pad=8
dims=np.ceil((hi-lo)/pitch).astype(int)+2*pad
grid=np.zeros(dims,dtype=bool)
def mark(points):
 idx=np.floor((points-lo)/pitch).astype(np.int32)+pad
 grid[idx[:,0],idx[:,1],idx[:,2]]=True
tri=v[f];mark(v)
edges=np.maximum.reduce([np.linalg.norm(tri[:,i]-tri[:,j],axis=1) for i,j in [(0,1),(1,2),(2,0)]])
steps=np.clip(np.ceil(edges/pitch*1.6).astype(np.int32),1,12)
for n in np.unique(steps):
 t=tri[steps==n]
 for i in range(n+1):
  for j in range(n+1-i):
   a,b=i/n,j/n;mark(t[:,0]*(1-a-b)+t[:,1]*a+t[:,2]*b)
print('VOXEL_SHELL',dims.tolist(),int(grid.sum()),flush=True)
del tri,edges,steps
st=ndi.generate_binary_structure(3,1)
# Seal small reconstruction gaps; extract only enclosed core, then recover the
# outside from the original shell so axilla/thigh gaps keep their silhouette.
sealed=ndi.binary_dilation(grid,st,iterations=seal)
filled=ndi.binary_fill_holes(sealed)
core=filled&~sealed
for _ in range(seal+2):core=ndi.binary_dilation(core,st)&~grid
solid=core|grid
del sealed,filled,core
lab,n=ndi.label(solid)
if n>1:
 counts=np.bincount(lab.ravel());counts[0]=0;solid=lab==int(np.argmax(counts))
del lab
voxel_count=int(solid.sum());field=ndi.gaussian_filter(solid.astype(np.float32),sigma=.75)
vv,ff,_,_=measure.marching_cubes(field,level=.5)
vv=(vv-pad)*pitch+lo
np.savez(r/'work'/f'{sex}-body-solid.npz',V=vv.astype(np.float32),F=ff.astype(np.int32))
report={'pitch':pitch,'grid':dims.tolist(),'solid_voxels':voxel_count,'volume':voxel_count*pitch**3,'vertices':len(vv),'faces':len(ff),'method':'barycentric surface voxelization, small-gap seal, binary fill holes, preserved shell recovery, marching cubes','rss_mib':psutil.Process().memory_info().rss/1024**2}
(r/'reports'/f'{sex}-body-solid.json').write_text(json.dumps(report,indent=2));print('VOLUME_REPAIR_READY',json.dumps(report),flush=True)
