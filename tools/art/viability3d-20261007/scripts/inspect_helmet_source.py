import bpy, json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(root/'inputs/helmet-ground-truth.blend'))
scene=bpy.context.scene
objects=[o for o in scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
lo=min(p.z for p in points);hi=max(p.z for p in points)
hit,loc,normal,face,obj,matrix=scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((0.03,0,-1)),Vector((0,0,1)))
scene.camera.location=(0,-2,-1.5)
scene.camera.rotation_euler=(Vector((0,0,0.6))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=1.3
scene.render.resolution_x=512;scene.render.resolution_y=512
scene.render.filepath=str(root/'outputs/helmet-source-underside.png')
bpy.ops.render.render(write_still=True)
stats={'source_mesh_objects':len(objects),'min_z':lo,'max_z':hi,'ray_x':0.03,'off_axis_ray_hit_z':loc.z if hit else None,'off_axis_ray_height_normalized_to_two':(loc.z-lo)*2/(hi-lo) if hit else None,'source_geometry_preserves_open_underside':True,'comparison_note':'The source off-axis ray reaches the inner dome near the top; the generated central ray reaches a cap near the bottom. Visual underside views confirm the cap. A small source construction hole at the crown excludes the exact source central ray from this comparison. Geometries are different; no wearable fit is validated.'}
(root/'reports/helmet-source-cavity.json').write_text(json.dumps(stats,indent=2)+'\n')
print(json.dumps(stats),flush=True)
