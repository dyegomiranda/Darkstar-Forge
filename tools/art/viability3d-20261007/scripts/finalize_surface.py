import bpy,bmesh
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
from pathlib import Path
R=Path('/home/djabo/Downloads/Void Sun/tools/art/viability3d-20261007');bpy.ops.wm.open_mainfile(filepath=str(R/'outputs/game-sample/brunhild-editable.blend'))
rig=bpy.data.objects['BrunhildRig'];head=bpy.data.objects['HeadHair']
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(next((R/'outputs/brunhild1024').glob('colored-raw_*.glb'))));raw=next(o for o in bpy.context.scene.objects if o not in before and o.type=='MESH')
pts=[raw.matrix_world@Vector(p) for p in raw.bound_box];lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));scale=2/(hi.z-lo.z);center=Vector(((hi.x+lo.x)/2,(hi.y+lo.y)/2,lo.z))
a=raw.data.color_attributes['Color'];cols=[(1,1,1,1)]*len(raw.data.vertices)
if a.domain=='POINT':cols=[tuple(c.color) for c in a.data]
else:
 for l in raw.data.loops:cols[l.vertex_index]=tuple(a.data[l.index].color)
ids=[v.index for v in raw.data.vertices if ((raw.matrix_world@v.co-center)*scale).z>1.55];tree=KDTree(len(ids))
for i in ids:tree.insert((raw.matrix_world@raw.data.vertices[i].co-center)*scale,i)
tree.balance()
for a in list(head.data.color_attributes):head.data.color_attributes.remove(a)
a=head.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for i,v in enumerate(head.data.vertices):
 co,index,d=tree.find(v.co);c=cols[index];p=v.co
 if p.y<-.085 and min(c[:3])>.11 and max(c[:3])-min(c[:3])<.15:
  for ex,ez in [(-.094,1.632),(-.028,1.638)]:
   u=(p.x-ex)/.008;z=(p.z-ez)/.010
   if u*u+z*z<1:c=(.02,.008,.004,1) if u*u+z*z<.4 else (.23,.10,.028,1)
 a.data[i].color=c
# Repair small reconstruction openings in clothing while retaining existing skin weights.
for ob in [o for o in bpy.context.scene.objects if o.name in ['Tunic','Boots','Trousers']]:
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00003);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bm.to_mesh(ob.data);bm.free()
 for p in ob.data.polygons:p.use_smooth=True
bpy.data.objects.remove(raw,do_unlink=True)
for t in rig.animation_data.nla_tracks:t.mute=False
bpy.ops.wm.save_as_mainfile(filepath=str(R/'outputs/game-sample/brunhild-editable.blend'))
bpy.ops.export_scene.gltf(filepath='/home/djabo/Downloads/Void Sun/public/art/sample3d/brunhild-test.glb',export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True)
print('CLEAN_HEAD',len(head.data.vertices),len(head.data.polygons),flush=True)
