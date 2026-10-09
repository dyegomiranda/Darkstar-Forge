import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector,Matrix
R=Path('/home/djabo/Downloads/Void Sun/tools/art/viability3d-20261007')
OUT=R/'outputs/game-sample';OUT.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(next((R/'source/base').rglob('Superhero_Female_FullBody.gltf'))))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rig.name='BrunhildRig'
body=bpy.data.objects['Superhero_Female'];body.name='BodyBase'
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o!=body:bpy.data.objects.remove(o,do_unlink=True)
# Anatomical topology, not a recolored garment. Leave source topology and skin weights editable.
skin=bpy.data.materials.new('Skin');skin.diffuse_color=(.62,.32,.21,1);skin.use_nodes=True
skin.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.62,.32,.21,1)
skin.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.86
body.data.materials.clear();body.data.materials.append(skin)
# Remove source head: the generated identity is preserved as a separate head/hair mesh.
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z>1.56],context='VERTS');bm.to_mesh(body.data);bm.free()
# Less exaggerated shoulders/arms than the superhero source; compatible rest-bone lengths remain unchanged.
for v in body.data.vertices:
 if v.co.z>1.0 and abs(v.co.x)<.23:v.co.x*=.93
for p in body.data.polygons:p.use_smooth=True
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(next((R/'outputs/brunhild1024').glob('colored-raw_*.glb'))))
raw=next(o for o in bpy.context.scene.objects if o not in before and o.type=='MESH')
pts=[raw.matrix_world@Vector(p) for p in raw.bound_box];lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));s=2/(hi.z-lo.z)
for v in raw.data.vertices:v.co=(raw.matrix_world@v.co-Vector(((hi.x+lo.x)/2,(hi.y+lo.y)/2,lo.z)))*s
raw.matrix_world=Matrix.Identity(4)
# Preserve the generated head surface for the first visual trial.
# This source is deliberately kept at higher detail until the reconstruction is artistically approved.
print('SOURCE',len(raw.data.vertices),len(raw.data.polygons),flush=True)
attr=raw.data.color_attributes.get('Color');print('RAW',len(raw.data.vertices),attr.domain,flush=True)
colors=[(1,1,1,1)]*len(raw.data.vertices)
if attr.domain=='POINT':colors=[tuple(d.color) for d in attr.data]
else:
 for l in raw.data.loops:colors[l.vertex_index]=tuple(attr.data[l.index].color)
def category(poly):
 z=sum(raw.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
 c=[sum(colors[i][k] for i in poly.vertices)/len(poly.vertices) for k in range(3)]
 if z>1.56:return 'HeadHair'
 if z<.49:return 'Boots'
 if z<.92:return 'Trousers'
 # Bare arms are discarded, leaving only clothing from the generated reconstruction.
 if c[0]>c[1]*1.27 and c[0]>c[2]*1.6 and c[0]>.28:return None
 return 'Tunic'
parts={k:[] for k in ['HeadHair','Boots','Trousers','Tunic']}
for p in raw.data.polygons:
 k=category(p)
 if k:parts[k].append(p)
def segment_weights(p):
 # Smooth closest-bone weights on the same skeleton used by the anatomical base.
 names=['pelvis','spine_01','spine_02','spine_03','neck_01','Head','thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r']
 d=[]
 for name in names:
  b=rig.data.bones[name];a=b.head_local;t=b.tail_local;v=t-a;u=max(0,min(1,(p-a).dot(v)/max(v.length_squared,1e-8)));dist=(p-a-v*u).length
  if name.startswith(('thigh','calf','foot')) and ('_l' in name)!=(p.x>0):dist+=.7
  d.append((dist,name))
 d.sort();chosen=d[:2];w=[math.exp(-d*18) for d,n in chosen];total=sum(w)
 return [(n,x/total) for (d,n),x in zip(chosen,w)]
export=[body]
for name,polys in parts.items():
 ids=sorted({i for p in polys for i in p.vertices});idx={n:i for i,n in enumerate(ids)}
 me=bpy.data.meshes.new(name);me.from_pydata([raw.data.vertices[i].co for i in ids],[],[[idx[i] for i in p.vertices] for p in polys]);me.update()
 ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);export.append(ob)
 ca=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for ii,i in enumerate(ids):
  c=colors[i];p=raw.data.vertices[i].co
  # Correct reconstructed white eye patches on the actual facial surface.
  if name=='HeadHair' and p.y<-.09:
   for eye_x in [-.123,-.017]:
    ex=(p.x-eye_x)/.025;ez=(p.z-1.735)/.010
    if ex*ex+ez*ez<1:
     iris=(p.x-eye_x)/.007
     c=(.025,.012,.006,1) if iris*iris+ez*ez<.45 else (.24,.105,.035,1) if iris*iris+ez*ez<1 else (.57,.52,.42,1)
  ca.data[ii].color=c
 mat=bpy.data.materials.new(name+' vertex pigment');mat.use_nodes=True;n=mat.node_tree.nodes;vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],n['Principled BSDF'].inputs['Base Color']);n['Principled BSDF'].inputs['Roughness'].default_value=.9;me.materials.append(mat)
 for poly in me.polygons:poly.use_smooth=True
 if name!='HeadHair':
  bpy.context.view_layer.objects.active=ob
  for obj in bpy.context.selected_objects:obj.select_set(False)
  ob.select_set(True)
  dec=ob.modifiers.new('Garment optimization','DECIMATE');dec.ratio=.12;bpy.ops.object.modifier_apply(modifier=dec.name)
  me=ob.data
  # Vertex ids change after optimization; use the actual resulting rest surface for weight transfer below.
 for b in rig.data.bones:ob.vertex_groups.new(name=b.name)
 for ii,v in enumerate(me.vertices):
  w=[('Head',1)] if name=='HeadHair' else segment_weights(v.co)
  for bn,weight in w:ob.vertex_groups[bn].add([ii],weight,'REPLACE')
 mod=ob.modifiers.new('Shared humanoid skeleton','ARMATURE');mod.object=rig;ob.parent=rig
bpy.data.objects.remove(raw,do_unlink=True)
# Body segment meshes allow coverage masking without clothing baked into the base.
# Fit lower garments to anatomy and transfer the anatomical deformation weights.
for ob in export[1:]:
 if ob.name=='HeadHair':continue
 bpy.context.view_layer.objects.active=ob
 for o in bpy.context.selected_objects:o.select_set(False)
 ob.select_set(True)
 if ob.name in ['Boots','Trousers']:
  fit=ob.modifiers.new('Anatomical garment fit','SHRINKWRAP');fit.target=body;fit.wrap_method='NEAREST_SURFACEPOINT';fit.offset=.022 if ob.name=='Boots' else .012
  # Apply before the armature; the garment is fitted in the same rest pose.
  bpy.ops.object.modifier_move_up(modifier=fit.name)
  bpy.ops.object.modifier_apply(modifier=fit.name)
 transfer=ob.modifiers.new('Anatomy skin weights','DATA_TRANSFER');transfer.object=body;transfer.use_vert_data=True;transfer.data_types_verts={'VGROUP_WEIGHTS'};transfer.vert_mapping='POLYINTERP_NEAREST';transfer.layers_vgroup_select_src='ALL';transfer.layers_vgroup_select_dst='NAME';transfer.mix_mode='REPLACE'
 bpy.ops.object.modifier_move_up(modifier=transfer.name);bpy.ops.object.modifier_apply(modifier=transfer.name)
# Split covered skin only after weight transfer. The body itself remains an unclothed anatomical base.
bm=bmesh.new();bm.from_mesh(body.data)
covered=[f for f in bm.faces if (sum(v.co.z for v in f.verts)/len(f.verts)<1.02 or (abs(sum(v.co.x for v in f.verts)/len(f.verts))<.145 and sum(v.co.z for v in f.verts)/len(f.verts)<1.46))]
for f in bm.faces:f.material_index=1 if f in covered else 0
bm.to_mesh(body.data);bm.free()
coveredmat=skin.copy();coveredmat.name='Covered anatomy';body.data.materials.append(coveredmat)
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(next((R/'source/animation').rglob('*.glb'))))
source=next(o for o in bpy.context.scene.objects if o not in before and o.type=='ARMATURE')
mapping={'pelvis':'DEF-hips','spine_01':'DEF-spine.001','spine_02':'DEF-spine.002','spine_03':'DEF-spine.003','neck_01':'DEF-neck','Head':'DEF-head','root':'root'}
for side in ['l','r']:
 S=side.upper()
 for t,n in [('clavicle','shoulder'),('upperarm','upper_arm'),('lowerarm','forearm'),('hand','hand'),('thigh','thigh'),('calf','shin'),('foot','foot'),('ball','toe')]:mapping[t+'_'+side]='DEF-'+n+'.'+S
 for finger in ['index','middle','ring','pinky','thumb']:
  for i in range(1,4):mapping[f'{finger}_0{i}_{side}']=f'DEF-{("f_" if finger!="thumb" else "")}{finger}.0{i}.{S}'
actions=[]
all_actions=list(bpy.data.actions)
for label,needle in [('Idle','Idle_Loop'),('Run','Jog_Fwd_Loop'),('Cast','Spell_Simple_Shoot')]:
 sa=next(a for a in all_actions if a.name==needle or a.name.endswith('|'+needle));source.animation_data.action=sa
 for tr in source.animation_data.nla_tracks:tr.mute=True
 rig.animation_data_create();rig.animation_data.action=None
 for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4);pb.rotation_mode='QUATERNION'
 frame_start,frame_end=map(int,sa.frame_range);bpy.context.scene.render.fps=30
 sequence=[]
 for part in (['Spell_Simple_Enter','Spell_Simple_Shoot','Spell_Simple_Exit'] if label=='Cast' else [needle]):
  act=next(a for a in all_actions if a.name==part or a.name.endswith('|'+part));sequence.extend((act,f) for f in range(int(act.frame_range[0]),int(act.frame_range[1])+1))
 for fi,(act,f) in enumerate(sequence):
  source.animation_data.action=act;bpy.context.scene.frame_set(f);poses={}
  for pb in rig.pose.bones:
   sb=source.pose.bones.get(mapping.get(pb.name,''))
   if not sb:continue
   rest=pb.bone.matrix_local;orient=sb.matrix.to_quaternion()@sb.bone.matrix_local.to_quaternion().inverted()@rest.to_quaternion()
   pos=rest.translation.copy()
   if pb.parent:
    pm=poses.get(pb.parent.name,pb.parent.bone.matrix_local);pos=pm@(pb.parent.bone.matrix_local.inverted()@pos)
   elif pb.name=='root':pos=Vector((0,0,0))
   if pb.name=='pelvis':pos+=sb.matrix.translation-sb.bone.matrix_local.translation
   desired=orient.to_matrix().to_4x4();desired.translation=pos;poses[pb.name]=desired
   pb.matrix_basis=pb.bone.convert_local_to_pose(desired,rest,parent_matrix=poses.get(pb.parent.name,pb.parent.bone.matrix_local) if pb.parent else Matrix.Identity(4),parent_matrix_local=pb.parent.bone.matrix_local if pb.parent else Matrix.Identity(4),invert=True)
   pb.keyframe_insert('rotation_quaternion',frame=fi+1,group=pb.name);pb.keyframe_insert('location',frame=fi+1,group=pb.name)
 action=rig.animation_data.action;action.name=label;actions.append(action)
 rig.animation_data.action=None
 print('CLIP',label,frame_end-frame_start+1,flush=True)
for o in list(bpy.context.scene.objects):
 if o not in export and o!=rig:bpy.data.objects.remove(o,do_unlink=True)
for a in actions:
 track=rig.animation_data.nla_tracks.new();track.name=a.name;track.strips.new(a.name,1,a)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'brunhild-editable.blend'))
dest=Path('/home/djabo/Downloads/Void Sun/public/art/sample3d/brunhild-test.glb')
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_animations=True,export_nla_strips=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_yup=True)
print('EXPORTED',dest,flush=True)
