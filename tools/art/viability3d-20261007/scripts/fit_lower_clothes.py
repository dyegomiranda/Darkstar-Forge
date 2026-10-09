import bpy,bmesh
from mathutils import Matrix
from pathlib import Path
R=Path('/home/djabo/Downloads/Void Sun/tools/art/viability3d-20261007/outputs/game-sample');bpy.ops.wm.open_mainfile(filepath=str(R/'brunhild-editable.blend'))
rig=bpy.data.objects['BrunhildRig'];body=bpy.data.objects['BodyBase']
for tr in rig.animation_data.nla_tracks:tr.mute=True
for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
for name,color in [('Boots',(.075,.03,.015,1)),('Trousers',(.14,.065,.032,1))]:
 old=bpy.data.objects.get(name)
 if old:bpy.data.objects.remove(old,do_unlink=True)
 ob=body.copy();ob.data=body.data.copy();ob.name=name;bpy.context.collection.objects.link(ob)
 bm=bmesh.new();bm.from_mesh(ob.data)
 unwanted=[f for f in bm.faces if not ((f.calc_center_median().z<.40) if name=='Boots' else (.37<f.calc_center_median().z<1.06))]
 bmesh.ops.delete(bm,geom=unwanted,context='FACES_ONLY');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(ob.data);bm.free()
 for v in ob.data.vertices:v.co+=v.normal*.014;v.co.z=max(v.co.z,.002)
 mat=bpy.data.materials.new(name+' fitted leather');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=color;mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.83;ob.data.materials.clear();ob.data.materials.append(mat)
 for p in ob.data.polygons:p.material_index=0;p.use_smooth=True
 print('FITTED',name,len(ob.data.vertices),flush=True)
for tr in rig.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=str(R/'brunhild-editable.blend'))
bpy.ops.export_scene.gltf(filepath='/home/djabo/Downloads/Void Sun/public/art/sample3d/brunhild-test.glb',export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True)
