import bpy,bmesh
from mathutils import Matrix
from pathlib import Path
R=Path('/home/djabo/Downloads/Void Sun/tools/art/viability3d-20261007/outputs/game-sample');bpy.ops.wm.open_mainfile(filepath=str(R/'brunhild-editable.blend'))
head=bpy.data.objects['HeadHair'];rig=bpy.data.objects['BrunhildRig']
bm=bmesh.new();bm.from_mesh(head.data);print('BEFORE',len(bm.verts),len(bm.faces),flush=True)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00003)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));boundary=[e for e in bm.edges if e.is_boundary];print('BOUNDARY',len(boundary),flush=True);bmesh.ops.holes_fill(bm,edges=boundary,sides=0);bm.to_mesh(head.data);bm.free()
for p in head.data.polygons:p.use_smooth=True
# Repaint both pupil centers on the existing eye whites, rather than adding geometry.
a=head.data.color_attributes['Color']
for i,v in enumerate(head.data.vertices):
 p=v.co
 if p.y<-.09:
  for x in [-.123,-.017]:
   u=(p.x-x)/.025;z=(p.z-1.699)/.010
   if u*u+z*z<1:
    ix=(p.x-x)/.007;a.data[i].color=(.02,.008,.004,1) if ix*ix+z*z<.4 else (.23,.1,.028,1) if ix*ix+z*z<1 else (.55,.51,.42,1)
for t in rig.animation_data.nla_tracks:t.mute=False
bpy.ops.wm.save_as_mainfile(filepath=str(R/'brunhild-editable.blend'))
bpy.ops.export_scene.gltf(filepath='/home/djabo/Downloads/Void Sun/public/art/sample3d/brunhild-test.glb',export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True)
print('REPAIRED',len(head.data.vertices),len(head.data.polygons),flush=True)
