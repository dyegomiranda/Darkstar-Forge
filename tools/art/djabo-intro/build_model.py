"""Prepare the image-reconstructed Djabo mesh; this script does not model the character from primitives.
Colors and surfaces come from Pixal3D. It normalizes, reduces, rigs and exports editable sources.
"""
import bpy, bmesh, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[3]
BASE=Path(__file__).resolve().parent
OUT=BASE/'build';OUT.mkdir(exist_ok=True)
DELIVERY=ROOT/'public/art/djabo-intro';DELIVERY.mkdir(parents=True,exist_ok=True)
RAW=ROOT/'tools/art/viability3d-20261007/outputs'

def fresh(path):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
 obj=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 clean=OUT/('body-solid.npz' if 'body' in str(path.parent) else 'sword-solid.npz')
 if not clean.exists():raise FileNotFoundError(f'Prepare the closed volume first: {clean}; see README.md')
 if clean.exists():
  data=np.load(clean);mesh=bpy.data.meshes.new('Closed reconstruction');mesh.from_pydata(data['V'].tolist(),[],data['F'].tolist());mesh.update()
  obj.data=mesh
  color=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');color.data.foreach_set('color',data['C'].reshape(-1));mesh.color_attributes.active_color=color
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 return obj

def coordinates(obj):
 a=np.empty(len(obj.data.vertices)*3,dtype=np.float32);obj.data.vertices.foreach_get('co',a);return a.reshape(-1,3)

def reduce(obj,triangles):
 bm=bmesh.new();bm.from_mesh(obj.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.00055)
 bm.to_mesh(obj.data);bm.free();obj.data.update()
 count=sum(len(p.vertices)-2 for p in obj.data.polygons)
 if count>triangles:
  m=obj.modifiers.new('Production reduction','DECIMATE');m.ratio=triangles/count;m.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=m.name)
 bm=bmesh.new();bm.from_mesh(obj.data)
 loose=[v for v in bm.verts if not v.link_faces]
 if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
 bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(obj.data);bm.free()
 obj.data.validate(clean_customdata=False);obj.data.update()
 for p in obj.data.polygons:p.use_smooth=True

obj=fresh(RAW/'djabo-logo-body/colored-raw_00001_.glb');obj.name='Djabo_ArmoredBody'
V=coordinates(obj);lo=V.min(0);hi=V.max(0);H=hi[2]-lo[2]
obj.data.transform(Matrix.Scale(1/H,4)@Matrix.Translation((-(lo[0]+hi[0])/2, -(lo[1]+hi[1])/2, -lo[2])))
# Generated volume contains hidden internal sheets; remesh the surface before reducing.
# Reproject source vertex colors onto the closed surface instead of regenerating the art.
sourceV=coordinates(obj);attr=obj.data.color_attributes.active_color
loops=np.empty(len(obj.data.loops),dtype=np.int32);obj.data.loops.foreach_get('vertex_index',loops)
rgba=np.empty(len(attr.data)*4,dtype=np.float32);attr.data.foreach_get('color',rgba);rgba=rgba.reshape(-1,4)
sourceC=np.zeros((len(sourceV),4),dtype=np.float32);counts=np.zeros(len(sourceV),dtype=np.float32)
if attr.domain=='POINT':sourceC=rgba;counts[:]=1
else:np.add.at(sourceC,loops,rgba);np.add.at(counts,loops,1);sourceC/=np.maximum(counts[:,None],1)
valid=np.where(counts>0)[0][::2];tree=KDTree(len(valid))
for i,index in enumerate(valid):tree.insert(sourceV[index],int(index))
tree.balance()
# The externally filled volume has a single watertight surface.
# Preserve silhouette; only a light surface relaxation removes reconstruction speckles.
m=obj.modifiers.new('Surface polish','SMOOTH');m.factor=.25;m.iterations=2;bpy.ops.object.modifier_apply(modifier=m.name)
reduce(obj,110000);V=coordinates(obj)
for a in list(obj.data.color_attributes):obj.data.color_attributes.remove(a)
c=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
paint=np.ones((len(V),4),dtype=np.float32)
for i,point in enumerate(V):_,index,_=tree.find(point);paint[i]=sourceC[index]
# Restore the narrow red visor lights from the user logo, lost in the single-view reconstruction.
# Surface colors, not a floating overlay or baked aura. The inner corners slope downward.
ax=np.abs(V[:,0]);eye_height=.875+ax*.25
visor=(ax>.012)&(ax<.057)&(np.abs(V[:,2]-eye_height)<.0038)&(V[:,1]<-.063)
paint[visor,:3]=[.95,.002,.008]
print('VISOR_RED_VERTICES',int(visor.sum()),flush=True)
c.data.foreach_set('color',paint.reshape(-1));obj.data.color_attributes.active_color=c
print('CLOSED_SURFACE',len(V),sum(len(p.vertices)-2 for p in obj.data.polygons),flush=True)
# Armor retains its closed source surface. Geometry is never cut at the axilla or neck.
# Articulated adult proportions measured against the clean frontal reference; height includes the horn tips.
J={'pelvis':(0,0,.475),'neck':(0,0,.803),'head':(0,0,.83),
 'shoulder':(.135,0,.765),'elbow':(.177,0,.638),'wrist':(.208,-.01,.49),'hand':(.213,-.018,.425),
 'hip':(.061,0,.475),'knee':(.073,0,.290),'ankle':(.076,0,.072),'ball':(.080,-.06,.022),'toe':(.080,-.092,.018)}
# Existing Quaternius-compatible naming allows authentic library motion to be retargeted.
B=[('root',None,(0,0,0),(0,.12,0),False),
 ('DEF-hips','root',J['pelvis'],(0,0,.53),True),
 ('DEF-spine.001','DEF-hips',(0,0,.53),(0,0,.62),True),
 ('DEF-spine.002','DEF-spine.001',(0,0,.62),(0,0,.70),True),
 ('DEF-spine.003','DEF-spine.002',(0,0,.70),(0,0,.787),True),
 ('DEF-neck','DEF-spine.003',(0,0,.787),J['head'],True),
 ('DEF-head','DEF-neck',J['head'],(0,0,.96),True)]
for S,sgn in [('L',1),('R',-1)]:
 def v(key):x,y,z=J[key];return (x*sgn,y,z)
 B += [(f'DEF-shoulder.{S}','DEF-spine.003',(.018*sgn,0,.77),v('shoulder'),True),
 (f'DEF-upper_arm.{S}',f'DEF-shoulder.{S}',v('shoulder'),v('elbow'),True),
 (f'DEF-forearm.{S}',f'DEF-upper_arm.{S}',v('elbow'),v('wrist'),True),
 (f'DEF-hand.{S}',f'DEF-forearm.{S}',v('wrist'),v('hand'),True),
 (f'DEF-thigh.{S}','DEF-hips',v('hip'),v('knee'),True),
 (f'DEF-shin.{S}',f'DEF-thigh.{S}',v('knee'),v('ankle'),True),
 (f'DEF-foot.{S}',f'DEF-shin.{S}',v('ankle'),v('ball'),True),
 (f'DEF-toe.{S}',f'DEF-foot.{S}',v('ball'),v('toe'),True)]
a=bpy.data.armatures.new('DjaboSkeleton');arm=bpy.data.objects.new('Heroi',a);bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT');bones={}
for name,parent,head,tail,deform in B:
 b=a.edit_bones.new(name);b.head=head;b.tail=tail;b.use_deform=deform
 if parent:b.parent=bones[parent]
 bones[name]=b
bpy.ops.armature.select_all(action='SELECT');bpy.ops.armature.calculate_roll(type='GLOBAL_NEG_Y');bpy.ops.object.mode_set(mode='OBJECT')
# Distance weights confined to anatomical chains avoid opposite-arm bleed through narrow armpits.
groups={name:obj.vertex_groups.new(name=name) for name,parent,h,t,d in B if d}
bonespec={name:(np.array(h),np.array(t)) for name,parent,h,t,d in B if d}
def distance(point,head,tail):
 axis=tail-head;k=np.clip(np.dot(point-head,axis)/np.dot(axis,axis),0,1);return np.linalg.norm(point-head-k*axis)
for index,p in enumerate(V):
 x,y,z=map(float,p);S='L' if x>=0 else 'R';ax=abs(x)
 if z>.81: candidates=['DEF-head','DEF-neck'] if z<.845 else ['DEF-head']
 elif z>.37 and ax>float(np.interp(z,[.37,.50,.62,.77,.81],[.20,.185,.16,.11,.13])):
  candidates=[f'DEF-shoulder.{S}',f'DEF-upper_arm.{S}',f'DEF-forearm.{S}',f'DEF-hand.{S}']
 elif z<.49 and ax>.025:
  candidates=[f'DEF-thigh.{S}',f'DEF-shin.{S}',f'DEF-foot.{S}',f'DEF-toe.{S}']
  if z>.435:candidates+=['DEF-hips']
 else:candidates=['DEF-hips','DEF-spine.001','DEF-spine.002','DEF-spine.003','DEF-neck']
 d=sorted([(distance(p,*bonespec[n]),n) for n in candidates])[:2]
 # Hard armor centers remain rigid; blend only in a narrow articulation neighborhood.
 if len(d)==1 or d[1][0]-d[0][0]>.016:groups[d[0][1]].add([index],1,'REPLACE')
 else:
  w=np.exp(-np.array([d[0][0],d[1][0]])/.012);w/=w.sum()
  for val,(_,name) in zip(w,d):groups[name].add([index],float(val),'REPLACE')
obj.parent=arm;m=obj.modifiers.new('DjaboArmature','ARMATURE');m.object=arm
obj['asset_origin']='User Djabo logo -> imagegen clean reference -> Pixal3D';obj['vs_role']='mascot';obj['auras_baked']=False
arm['vs_hand_socket']='DEF-hand.R';arm['vs_rig']='djabo-mascot-v1'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'djabo-rigged.blend'))
print('RIGGED',len(V),'verts')
# Adapt the existing animation transfer WITHOUT the chibi-only artificial head tilt correction.
code=(ROOT/'tools/art/chibi/retarget_ual.py').read_text()
code=code.replace("LIFT = {'DEF-neck': Matrix.Rotation(math.radians(-7), 3, 'X'), 'DEF-head': Matrix.Rotation(math.radians(-11), 3, 'X'), 'DEF-spine.003': Matrix.Rotation(math.radians(-3), 3, 'X')}", 'LIFT = {}')
code=code.replace("LEVEL = {'DEF-neck': 0.4, 'DEF-head': 0.65}",'LEVEL = {}')
lib=ROOT/'tools/art/viability3d-20261007/source/animation/Animation Library[Standard]/Godot/AnimationLibrary_Godot_Standard.glb'
sys.argv=['blender','--',str(lib),str(OUT/'djabo.blend')];exec(compile(code,'retarget-djabo','exec'))
# Rigid helmet and shoulder structures keep their design; crossfade is handled by the renderer.
bpy.ops.export_scene.gltf(filepath=str(DELIVERY/'djabo.glb'),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_all_influences=False,export_def_bones=False,export_extras=True)
body_stats={'vertices':len(V),'triangles':sum(len(p.vertices)-2 for p in obj.data.polygons),'clips':[a.name for a in bpy.data.actions]}
# Weapon: orient the reconstructed geometry along +Z (becomes +Y in glTF), grip at origin.
sword=fresh(RAW/'djabo-logo-katana/colored-raw_00001_.glb');sword.name='Djabo_Katana';V=coordinates(sword)
center=V.mean(0);e,w=np.linalg.eigh(np.cov((V-center).T));axis=w[:,-1]
if np.dot(axis,np.array([1,0,1]))<0:axis=-axis
long=(V-center)@axis;span=np.ptp(long)
depth=np.array([0.,1.,0.]);depth-=axis*np.dot(axis,depth);depth/=np.linalg.norm(depth);width=np.cross(depth,axis)
# The handle sits in the hand; the blade starts at approximately z=.20.
N=np.column_stack(((V-center)@width/span,(V-center)@depth/span,(long-long.min())/span-.10))
sword.data.vertices.foreach_set('co',N.astype(np.float32).reshape(-1));sword.data.update()
# A second collapse can stall on internal sheets; remove them with a closed voxel surface.
sc=sword.data.color_attributes.active_color;lp=np.empty(len(sword.data.loops),dtype=np.int32);sword.data.loops.foreach_get('vertex_index',lp)
rc=np.empty(len(sc.data)*4,dtype=np.float32);sc.data.foreach_get('color',rc);rc=rc.reshape(-1,4)
c0=np.zeros((len(N),4),dtype=np.float32);ct=np.zeros(len(N),dtype=np.float32);c0=rc if sc.domain=='POINT' else c0
if sc.domain!='POINT':np.add.at(c0,lp,rc);np.add.at(ct,lp,1);c0/=np.maximum(ct[:,None],1)
k=KDTree(len(N))
for i,v in enumerate(N):k.insert(v,i)
k.balance();reduce(sword,14000)
for a in list(sword.data.color_attributes):sword.data.color_attributes.remove(a)
sc=sword.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');cc=np.ones((len(sword.data.vertices),4),dtype=np.float32)
for i,v in enumerate(sword.data.vertices):
 _,index,_=k.find(v.co);cc[i]=c0[index]
 if v.co.z>.18:
  detail=min(float(np.mean(cc[i,:3]))*.025,.012)
  cc[i,:3]=np.array([.018,.017,.021])+detail
sc.data.foreach_set('color',cc.reshape(-1));sword.data.color_attributes.active_color=sc
mat=bpy.data.materials.new('Black steel — no purple aura');mat.use_nodes=True
principled=mat.node_tree.nodes.get('Principled BSDF');principled.inputs['Metallic'].default_value=.55;principled.inputs['Roughness'].default_value=.42
vertex=mat.node_tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='Color';mat.node_tree.links.new(vertex.outputs['Color'],principled.inputs['Base Color'])
sword.data.materials.clear();sword.data.materials.append(mat)
sword['vs_blade_axis']='glTF +Y';sword['vs_grip_origin']=[0,0,0];sword['auras_baked']=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'katana.blend'))
bpy.ops.export_scene.gltf(filepath=str(DELIVERY/'katana.glb'),export_format='GLB',export_animations=False,export_extras=True)
manifest={'version':1,'origin':'User-supplied Djabo logo','body':body_stats,'weapon':{'triangles':sum(len(p.vertices)-2 for p in sword.data.polygons),'grip':[0,0,0],'axis':'Y','blade_material':'black steel; purple aura separate'},'vfx':'separate runtime shaders and world-space blade trail','review':'not yet approved'}
(DELIVERY/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('DELIVERY',str(DELIVERY),json.dumps(manifest))
