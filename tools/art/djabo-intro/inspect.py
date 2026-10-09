import bpy,sys,json,numpy as np
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
out=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 co=np.array([tuple(v.co) for v in o.data.vertices])
 out.append({'name':o.name,'vertices':len(co),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'min':co.min(0).tolist(),'max':co.max(0).tolist(),'color':[(a.name,a.domain,a.data_type) for a in o.data.color_attributes]})
print('INSPECTION',json.dumps(out))
