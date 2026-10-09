import json,struct,hashlib,time
from pathlib import Path
import numpy as np
out=Path('/home/djabo/Downloads/Void Sun/tools/art/warrior-base-assessment-20261008')
files=[out/'source/original-pool2640.glb',Path('/home/djabo/Downloads/chibi_armored_warrior_-_tripo_3d_vs_supavoxel.glb')]
def read(path):
    raw=path.read_bytes(); cursor=12; blob=None; doc=None
    while cursor<len(raw):
        length,typ=struct.unpack_from('<II',raw,cursor); cursor+=8
        if typ==0x4e4f534a:doc=json.loads(raw[cursor:cursor+length])
        if typ==0x004e4942:blob=raw[cursor:cursor+length]
        cursor+=length
    def acc(i):
        a=doc['accessors'][i]; v=doc['bufferViews'][a['bufferView']]
        types={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}; dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
        dtype=np.dtype(types[a['componentType']]); n=dims[a['type']]
        offset=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',dtype.itemsize*n)
        arr=np.ndarray((a['count'],n),dtype=dtype,buffer=blob,offset=offset,strides=(stride,dtype.itemsize)).copy()
        return arr
    poses=[]; faces=[]; base=0
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            pp=acc(prim['attributes']['POSITION']); ii=acc(prim['indices']).reshape(-1,3)
            poses.append(pp); faces.append(ii+base); base+=len(pp)
    return np.concatenate(poses),np.concatenate(faces)
p0,f0=read(files[0]);p1,f1=read(files[1])
print('GEOMETRY_LOADED',len(p0),len(f0),len(p1),len(f1),flush=True)
# Match geometric vertex positions at a shared tolerance. Original UV seams duplicate vertices.
def welded(pp): return np.unique(np.round(pp,6),axis=0,return_inverse=True)
u0,w0=welded(p0);u1,w1=welded(p1)
# Source mesh components: union edges after welding coincident UV seam positions.
parent=list(range(len(u0)));size=[1]*len(u0)
def root(x):
    while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
    return x
def union(a,b):
    a=root(a);b=root(b)
    if a==b:return
    if size[a]<size[b]:a,b=b,a
    parent[b]=a;size[a]+=size[b]
wf=w0[f0]
for a,b,c in wf:union(int(a),int(b));union(int(a),int(c))
labels=np.array([root(i) for i in range(len(u0))]);ids,counts=np.unique(labels,return_counts=True)
comp=[]
for ri,count in sorted(zip(ids.tolist(),counts.tolist()),key=lambda v:-v[1])[:30]:
    mask=labels==ri; verts=u0[mask];tri=int(np.count_nonzero(labels[wf[:,0]]==ri))
    comp.append({'welded_vertices':count,'triangles':tri,'min':verts.min(0).tolist(),'max':verts.max(0).tolist()})
# Exposed surface topology, with coincident UV seams welded for correct edge incidence.
e=np.concatenate((wf[:,[0,1]],wf[:,[1,2]],wf[:,[2,0]]));e.sort(axis=1)
ue,ec=np.unique(e,axis=0,return_counts=True)
res={'original_geometric_vertices':len(u0),'converted_geometric_vertices':len(u1),'original_triangles':len(f0),'converted_triangles':len(f1),'same_triangle_count':len(f0)==len(f1),'original_components_count':len(ids),'largest_components':comp,'original_boundary_edges':int(np.count_nonzero(ec==1)),'original_edges_more_than_two_faces':int(np.count_nonzero(ec>2)),'original_total_welded_edges':len(ue),'original_euler_characteristic':len(u0)-len(ue)+len(f0),'source_bounds':{'min':p0.min(0).tolist(),'max':p0.max(0).tolist()},'converted_bounds':{'min':p1.min(0).tolist(),'max':p1.max(0).tolist()},'note':'All position statistics are local mesh coordinates; original glTF node scale is 0.5.'}
# Compare quantized triangle point records; these capture surface equality, ignoring UV duplication/primitive split.
# Multiple decimal tolerances distinguish identical packing from numerical changes.
comparisons=[]
for decimals in [3,4,5,6]:
    def canonical(pp,ff):
        verts=np.round(pp*(10**decimals)).astype(np.int64)
        unique, inv=np.unique(verts,axis=0,return_inverse=True)
        tri=inv[ff];tri.sort(axis=1)
        order=np.lexsort((tri[:,2],tri[:,1],tri[:,0])); tri=tri[order]
        return unique,tri
    v0,t0=canonical(p0,f0);v1,t1=canonical(p1,f1)
    comparisons.append({'decimals':decimals,'same_quantized_unique_vertices':np.array_equal(v0,v1),'same_quantized_triangle_topology':np.array_equal(t0,t1)})
res['geometry_equivalence_checks']=comparisons
(out/'reports/geometry-analysis.json').write_text(json.dumps(res,indent=2))
print(json.dumps(res,indent=2),flush=True)
