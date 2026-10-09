import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector
out = Path('/home/djabo/Downloads/Void Sun/tools/art/warrior-base-assessment-20261008')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out / 'source/original-pool2640.glb'))
models = [o for o in bpy.context.scene.objects if o.type == 'MESH']
stats = []
for o in models:
    stats.append({'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'materials':[m.name for m in o.data.materials],'dimensions':list(o.dimensions),'modifiers':[m.type for m in o.modifiers],'uv_layers':[u.name for u in o.data.uv_layers]})
print('IMPORT_STATS',json.dumps(stats),flush=True)
(out/'reports/blender-import.json').write_text(json.dumps(stats,indent=2))
# Normalize scale on this inspection copy, preserving all source geometry.
bounds=[o.matrix_world @ Vector(c) for o in models for c in o.bound_box]
lo=Vector([min(v[i] for v in bounds) for i in range(3)])
hi=Vector([max(v[i] for v in bounds) for i in range(3)])
center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
scale=2.0/(hi.z-lo.z)
for o in models:
    o.matrix_world.translation-=center
    o.scale*=scale
    o.location*=scale
    for f in o.data.polygons: f.use_smooth=True
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED'
scene.render.threads=2
scene.render.resolution_x=640
scene.render.resolution_y=768
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.world=bpy.data.worlds.new('Inspection World')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.055,.065,.08,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4
scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.01))
floor=bpy.context.object; floor.name='Inspection Ground'
mat=bpy.data.materials.new('Inspection Ground Material'); mat.diffuse_color=(.08,.09,.11,1); floor.data.materials.append(mat)
def light(name,loc,power,size):
    d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.shape='DISK'; d.size=size
    o=bpy.data.objects.new(name,d); scene.collection.objects.link(o); o.location=loc
    o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key',(3,-4,5),500,4)
light('Fill',(-3,-1,3),300,3)
light('Rim',(0,4,4),450,3)
cam_d=bpy.data.cameras.new('Inspection Camera'); cam=bpy.data.objects.new('Inspection Camera',cam_d); scene.collection.objects.link(cam); scene.camera=cam
cam_d.type='ORTHO'; cam_d.ortho_scale=2.5
for label,angle in [('angle-000',0),('angle-090',90),('angle-180',180),('angle-270',270)]:
    a=math.radians(angle); cam.location=(4*math.sin(a),-4*math.cos(a),1.22)
    cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/'renders'/f'{label}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED',label,flush=True)
cam.location=(3,-4,2.25); cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(out/'renders/three-quarter.png'); bpy.ops.render.render(write_still=True)
# Save the inspection project before any diagnostic-only material override.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'source/inspection.blend'))
clay=bpy.data.materials.new('Diagnostic Clay'); clay.diffuse_color=(.42,.5,.58,1); clay.use_nodes=True
clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.42,.5,.58,1)
clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8
scene.view_layers[0].material_override=clay
scene.render.filepath=str(out/'renders/clay-three-quarter.png'); bpy.ops.render.render(write_still=True)
print('INSPECTION_DONE',flush=True)
