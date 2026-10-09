import numpy as np,json,struct
from pathlib import Path
out=Path('/home/djabo/Downloads/Void Sun/tools/art/warrior-base-assessment-20261008')
raw=(out/'source/original-pool2640.glb').read_bytes();jl,jt=struct.unpack_from('<II',raw,12);d=json.loads(raw[20:20+jl]);bl,bt=struct.unpack_from('<II',raw,20+jl);blob=raw[28+jl:28+jl+bl]
def acc(i,n):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];dt=np.dtype('<f4' if a['componentType']==5126 else '<u4');offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.ndarray((a['count'],n),dtype=dt,buffer=blob,offset=offset,strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize)).copy()
pr=d['meshes'][0]['primitives'][0];p=acc(pr['attributes']['POSITION'],3);f=acc(pr['indices'],1).reshape(-1,3)
v,inv=np.unique(p,axis=0,return_inverse=True);tf=inv[f]
e=np.concatenate([tf[:,[0,1]],tf[:,[1,2]],tf[:,[2,0]]]);e.sort(1);ue,ec=np.unique(e,axis=0,return_counts=True)
qa={'unique_exact_vertices':len(v),'exact_boundary_edges':int((ec==1).sum()),'exact_edges_more_than_two_faces':int((ec>2).sum()),'triangles_with_repeated_geometric_vertices':int(((tf[:,0]==tf[:,1])|(tf[:,1]==tf[:,2])|(tf[:,0]==tf[:,2])).sum())}
sections=[];panel_svgs=[]
for idx,(title,height) in enumerate([('Cabeca / cranio',.55),('Torax / peitoral',.05),('Perna / joelho',-.40)]):
 # Intersect triangles with a horizontal plane. Output actual surface contours, not an assumed body shape.
 tri=p[f];seg=[]
 crossing=(tri[:,:,1].min(1)<height)&(tri[:,:,1].max(1)>height)
 for tt in tri[crossing]:
  hits=[]
  for a,b in [(0,1),(1,2),(2,0)]:
   aa=tt[a];bb=tt[b]
   if (aa[1]<height)!=(bb[1]<height):
    k=(height-aa[1])/(bb[1]-aa[1]); q=aa+(bb-aa)*k;hits.append(q[[0,2]].tolist())
  if len(hits)==2:seg.append(hits)
 lines=np.array(seg)
 # Quantized endpoints only connect numerical duplicates in the section graph.
 uv,ii=np.unique(np.round(lines.reshape(-1,2),5),axis=0,return_inverse=True)
 pairs=ii.reshape(-1,2);parent=list(range(len(uv)))
 def rt(x):
  while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
  return x
 for a,b in pairs:
  a=rt(int(a));b=rt(int(b));parent[b]=a
 lab=np.array([rt(i) for i in range(len(uv))]);lid,ct=np.unique(lab,return_counts=True)
 loops=[]
 for k,c in sorted(zip(lid.tolist(),ct.tolist()),key=lambda x:-x[1]):
  if c<4:continue
  vv=uv[lab==k];loops.append({'points':c,'min_depth_and_width':vv.min(0).tolist(),'max_depth_and_width':vv.max(0).tolist()})
 sections.append({'title':title,'local_gltf_y':height,'normalized_height_from_feet':height+1,'contour_components':loops})
 xbase=idx*410
 s=[f'<g transform="translate({xbase},0)"><rect width="400" height="410" fill="#1e242c"/><text x="200" y="30" text-anchor="middle" fill="white" font-family="sans-serif" font-size="19">{title}</text><text x="200" y="52" text-anchor="middle" fill="#bdc8d4" font-family="sans-serif" font-size="13">Corte horizontal real da malha</text>']
 for ll in lines:
  aa,bb=ll
  # x = body width gltf z, y = body depth gltf x; front at top.
  x1=200+aa[1]*260;y1=230-aa[0]*260;x2=200+bb[1]*260;y2=230-bb[0]*260
  s.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="#efc66c" stroke-width="1.5"/>')
 s.append('<text x="200" y="390" text-anchor="middle" fill="#bdc8d4" font-family="sans-serif" font-size="13">Frente acima; costas abaixo</text></g>');panel_svgs.append(''.join(s))
(out/'reports/crosssections.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1230" height="410">'+''.join(panel_svgs)+'</svg>')
qa['sections']=sections;(out/'reports/crosssections.json').write_text(json.dumps(qa,indent=2))
print(json.dumps(qa,indent=2))
