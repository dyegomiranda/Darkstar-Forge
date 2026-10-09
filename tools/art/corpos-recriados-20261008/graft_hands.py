"""Repair two scanned mannequin hands using existing CC0 Quaternius hand surfaces.

The torso/head/limbs are the recovered Pixal3D reconstruction. Only donor hand
alignment and a welded wrist transition are authored here; no body is generated.
"""
import bpy,bmesh,json,math,sys
from pathlib import Path
from mathutils import Vector,Matrix

SEX=sys.argv[sys.argv.index('--')+1]
R=Path('/home/djabo/Downloads/Void Sun/tools/art/corpos-recriados-20261008')
SRC=Path('/home/djabo/Downloads/Void Sun/tools/art/viability3d-20261007/source/base/Universal Base Characters[Standard]/Base Characters/Godot - UE')
SOURCE=SRC/f'Superhero_{"Male" if SEX=="masculino" else "Female"}_FullBody.gltf'
TAU=2*math.pi

def vlist(v):return [round(float(x),7) for x in v]
def aim(ob,target):ob.rotation_euler=(target-ob.location).to_track_quat('-Z','Y').to_euler()
def progress(msg):print(msg,flush=True)

def boundary_loop(bm):
 edges=[e for e in bm.edges if e.is_boundary]
 if not edges:raise RuntimeError('No open wrist loop found')
 adjacency={}
 for e in edges:
  for v in e.verts:adjacency.setdefault(v,[]).append(e.other_vert(v))
 if any(len(n)!=2 for n in adjacency.values()):raise RuntimeError('Wrist boundary is not a simple closed loop')
 start=next(iter(adjacency));loop=[start];previous=None;current=start
 while True:
  candidates=[q for q in adjacency[current] if q is not previous]
  nxt=candidates[0]
  if nxt is start:break
  loop.append(nxt);previous,current=current,nxt
  if len(loop)>len(adjacency):raise RuntimeError('Invalid wrist traversal')
 if len(loop)!=len(adjacency):
  unseen=set(adjacency);clusters=[]
  while unseen:
   seed=unseen.pop();stack=[seed];cl=[]
   while stack:
    v=stack.pop();cl.append(v)
    for q in adjacency[v]:
     if q in unseen:unseen.remove(q);stack.append(q)
   clusters.append({'count':len(cl),'min':[min(v.co[i] for v in cl) for i in range(3)],'max':[max(v.co[i] for v in cl) for i in range(3)]})
  print('BOUNDARY_DIAGNOSTIC '+json.dumps(clusters),flush=True)
  raise RuntimeError('Multiple wrist boundary loops')
 return loop

def polar_order(loop,center,width,normal):
 angle=lambda v:math.atan2((v.co-center).dot(normal),(v.co-center).dot(width))%TAU
 ordered=sorted(loop,key=angle)
 for a,b in zip(ordered,ordered[1:]+ordered[:1]):
  if not any(e.other_vert(a) is b for e in a.link_edges):raise RuntimeError('Wrist is not a convex radial loop; needs explicit retopology')
 return ordered,[angle(v) for v in ordered]

def point_at(verts,angles,theta):
 theta%=TAU
 for i in range(len(verts)):
  a=angles[i];b=angles[(i+1)%len(angles)]
  if i==len(angles)-1:b+=TAU
  t=theta
  if t<a:t+=TAU
  if a<=t<=b:
   return verts[i].co.lerp(verts[(i+1)%len(verts)].co,(t-a)/max(1e-9,b-a))
 raise RuntimeError('Failed radial wrist interpolation')

def connect_equal(bm,a,b):
 for i in range(len(a)):bm.faces.new((a[i],a[(i+1)%len(a)],b[(i+1)%len(b)],b[i]))

def zipper(bm,a,aa,b,ba):
 # Unequal existing rings get a deterministic triangular strip, not intersecting caps.
 i=j=0;n=len(a);m=len(b)
 while i<n or j<m:
  nexta=aa[(i+1)%n]+(TAU if i+1>=n else 0) if i<n else 10*TAU
  nextb=ba[(j+1)%m]+(TAU if j+1>=m else 0) if j<m else 10*TAU
  if abs(nexta-nextb)<1e-7 and i<n and j<m:
   bm.faces.new((a[i%n],a[(i+1)%n],b[(j+1)%m],b[j%m]));i+=1;j+=1
  elif nexta<nextb:
   bm.faces.new((a[i%n],a[(i+1)%n],b[j%m]));i+=1
  else:
   bm.faces.new((a[i%n],b[(j+1)%m],b[j%m]));j+=1

SOURCE_STAGE='solid' if '--solid' in sys.argv else 'clean'
bpy.ops.wm.open_mainfile(filepath=str(R/'work'/f'{SEX}-body-{SOURCE_STAGE}.blend'))
body=bpy.data.objects['Base_'+SEX]
original_objects=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
donor_objects=[o for o in bpy.context.scene.objects if o not in original_objects]
rig=next(o for o in donor_objects if o.type=='ARMATURE')
donor=max([o for o in donor_objects if o.type=='MESH'],key=lambda o:len(o.data.vertices))
bone_coords={b.name:(rig.matrix_world@b.head_local,rig.matrix_world@b.tail_local) for b in rig.data.bones}

# glTF duplicates geometry at UV seams. Weld before normal/subdivision evaluation.
tmp=bmesh.new();tmp.from_mesh(donor.data);bmesh.ops.remove_doubles(tmp,verts=list(tmp.verts),dist=1e-6);bmesh.ops.recalc_face_normals(tmp,faces=list(tmp.faces));tmp.to_mesh(donor.data);tmp.free()
bpy.context.view_layer.objects.active=donor
sub=donor.modifiers.new('CC0 hand surface refinement','SUBSURF');sub.levels=1;sub.render_levels=1
bpy.ops.object.modifier_apply(modifier=sub.name)
donor_coords=[donor.matrix_world@v.co for v in donor.data.vertices]
donor_faces=[list(p.vertices) for p in donor.data.polygons]

bm=bmesh.new();bm.from_mesh(body.data)
reports=[]
for side,s in [('l',1),('r',-1)]:
 progress('Fitting '+SEX+' '+side)
 xcut=.64 if SEX=='masculino' else .66
 points=[v.co.copy() for v in bm.verts if abs(v.co.x-s*xcut)<.004]
 if not points:raise RuntimeError('Could not estimate recovered forearm section')
 center=Vector((s*xcut,(min(p.y for p in points)+max(p.y for p in points))/2,(min(p.z for p in points)+max(p.z for p in points))/2))
 direction=Vector((s*.955,0,-.296)).normalized()
 width=Vector((s*.296,0,.955)).normalized()
 normal=direction.cross(width).normalized()
 region=lambda v: v.co.x*s>.45 and v.co.z>.90
 selected_verts=[v for v in bm.verts if region(v)]
 selected_edges=[e for e in bm.edges if all(region(v) for v in e.verts)]
 selected_faces=[f for f in bm.faces if all(region(v) for v in f.verts)]
 bmesh.ops.bisect_plane(bm,geom=selected_verts+selected_edges+selected_faces,dist=1e-7,plane_co=center,plane_no=direction,clear_outer=True,clear_inner=False)
 oldloop=boundary_loop(bm);center=sum((v.co for v in oldloop),Vector())/len(oldloop)
 oldloop,angles=polar_order(oldloop,center,width,normal)

 # Existing donor is cut behind the wrist; its finger articulation stays intact.
 wrist=bone_coords[f'hand_{side}'][0]
 tips=[bone_coords[f'{name}_03_{side}'][1] for name in ['index','middle','ring','pinky']]
 sd=(sum(tips,Vector())/len(tips)-wrist).normalized()
 sw=(bone_coords[f'index_01_{side}'][0]-bone_coords[f'pinky_01_{side}'][0]).normalized();sw=(sw-sd*sw.dot(sd)).normalized();sn=sd.cross(sw).normalized()
 srcbasis=Matrix((sd,sw,sn)).transposed();dstbasis=Matrix((direction,width,normal)).transposed()
 target_wrist=center+direction*.082
 handscale=1.00 if SEX=='masculino' else 1.10
 transverse=1.13
 transform=dstbasis@Matrix.Diagonal((handscale,handscale*transverse,handscale*transverse))@srcbasis.transposed()
 hb=bmesh.new();vs=[hb.verts.new(p) for p in donor_coords]
 for f in donor_faces:hb.faces.new([vs[i] for i in f])
 bmesh.ops.bisect_plane(hb,geom=list(hb.verts)+list(hb.edges)+list(hb.faces),dist=1e-7,plane_co=wrist-sd*.055,plane_no=sd,clear_inner=True,clear_outer=False)
 hloop=boundary_loop(hb)
 for v in hb.verts:v.co=target_wrist+transform@(v.co-wrist)
 hcenter=sum((v.co for v in hloop),Vector())/len(hloop)
 translation=center+direction*.040-hcenter
 for v in hb.verts:v.co+=translation
 hcenter+=translation
 hloop,hangles=polar_order(hloop,hcenter,width,normal)
 mapping={v:bm.verts.new(v.co) for v in hb.verts}
 for f in hb.faces:bm.faces.new([mapping[v] for v in f.verts])
 newloop=[mapping[v] for v in hloop]
 last=oldloop
 for t in [1/3,2/3]:
  ring=[bm.verts.new(v.co.lerp(point_at(newloop,hangles,a),t)) for v,a in zip(oldloop,angles)]
  connect_equal(bm,last,ring);last=ring
 zipper(bm,last,angles,newloop,hangles)
 reports.append({'side':side,'source':str(SOURCE),'recovered_cut_center':vlist(center),'hand_anchor':vlist(target_wrist+translation),'direction':vlist(direction),'palm_normal':vlist(normal if side=='l' else -normal),'body_wrist_ring':len(oldloop),'donor_wrist_ring':len(newloop),'donor_faces':len(hb.faces),'finger_tip_positions':{name:vlist(target_wrist+translation+transform@(bone_coords[f'{name}_03_{side}'][1]-wrist)) for name in ['thumb','index','middle','ring','pinky']}})
 hb.free()

bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
stats={'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'zero_area_faces':sum(f.calc_area()<1e-12 for f in bm.faces)}
progress(str(stats))
if stats['boundary_edges'] or stats['non_manifold_edges'] or stats['zero_area_faces']:raise RuntimeError('Wrist graft failed closed-surface validation')
bm.to_mesh(body.data);bm.free()
for p in body.data.polygons:p.use_smooth=True
for o in donor_objects:bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.objects.active=body
bpy.ops.wm.save_as_mainfile(filepath=str(R/'work'/f'{SEX}-hands-fit.blend'))
(R/'reports'/f'{SEX}-hands-fit.json').write_text(json.dumps({'stage':'CC0 wrist graft; needs visual acceptance','sex':SEX,'source_body':str(R/'work'/f'{SEX}-body-{SOURCE_STAGE}.blend'),'donor_license':'Quaternius Universal Base Characters Standard CC0','hands':reports,'mesh':stats},indent=2)+'\n')

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.render.film_transparent=True
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Neutral studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,.95,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.view_settings.view_transform='AgX'
for name,loc,energy,size in [('Key',(-3,-4,5),230,4),('Fill',(3,-2,3),120,4),('Rim',(0,3,3),120,3)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc;aim(ob,Vector((0,0,1)))
data=bpy.data.cameras.new('Inspection');data.type='ORTHO';data.ortho_scale=2.45;cam=bpy.data.objects.new('Inspection',data);bpy.context.collection.objects.link(cam);scene.camera=cam
out=R/'renders';out.mkdir(exist_ok=True)
for view,angle in [('front',0),('three-quarter',45),('back',180)]:
 a=math.radians(angle);cam.location=(4*math.sin(a),-4*math.cos(a),1.03);aim(cam,Vector((0,0,1.03)))
 scene.render.filepath=str(out/f'{SEX}-{view}.png');bpy.ops.render.render(write_still=True)
scene.render.resolution_x=720;scene.render.resolution_y=720
data.ortho_scale=.40;h=Vector(reports[0]['hand_anchor'])
for view,offset in [('hand-front',Vector((0,-2,0))),('hand-back',Vector((0,2,0))),('hand-three-quarter',Vector((.65,-2,.55)))]:
 target=h+Vector(reports[0]['direction'])*.10;cam.location=target+offset;aim(cam,target);scene.render.filepath=str(out/f'{SEX}-{view}.png');bpy.ops.render.render(write_still=True)
progress('HAND_GRAFT_INSPECTION_READY '+SEX)
