import bpy,bmesh,numpy as np,sys
from pathlib import Path
sex=sys.argv[sys.argv.index('--')+1];r=Path('/home/djabo/Downloads/Void Sun/tools/art/corpos-recriados-20261008')
bpy.ops.wm.open_mainfile(filepath=str(r/'work'/f'{sex}-body-clean.blend'))
ob=bpy.data.objects['Base_'+sex];d=np.load(r/'work'/f'{sex}-body-solid.npz')
mesh=bpy.data.meshes.new('Volume-repaired original Pixal surface');mesh.from_pydata(d['V'].tolist(),[],d['F'].tolist());mesh.update();ob.data=mesh
bpy.context.view_layer.objects.active=ob
mod=ob.modifiers.new('Volume surface polish','SMOOTH');mod.factor=.45;mod.iterations=2;bpy.ops.object.modifier_apply(modifier=mod.name)
mesh.materials.append(bpy.data.materials['Mannequin_Peach'])
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
for p in mesh.polygons:p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(r/'work'/f'{sex}-body-solid.blend'));print('SOLID_BLEND_READY')
