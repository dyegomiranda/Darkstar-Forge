import bpy,numpy as np,sys
from pathlib import Path
sex=sys.argv[sys.argv.index('--')+1]
r=Path('/home/djabo/Downloads/Void Sun/tools/art/corpos-recriados-20261008')
bpy.ops.wm.open_mainfile(filepath=str(r/'work'/f'{sex}-body-clean.blend'))
o=bpy.data.objects['Base_'+sex];o.data.calc_loop_triangles()
v=np.empty(len(o.data.vertices)*3,np.float32);o.data.vertices.foreach_get('co',v);v=v.reshape((-1,3))
f=np.empty(len(o.data.loop_triangles)*3,np.int32);o.data.loop_triangles.foreach_get('vertices',f);f=f.reshape((-1,3))
np.savez(r/'work'/f'{sex}-body-clean.npz',V=v,F=f)
print('NPZ_EXPORTED',v.shape,f.shape)
