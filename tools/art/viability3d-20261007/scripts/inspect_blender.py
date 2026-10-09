import bpy, json, math, sys, time
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent.parent
case = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'brunhild512'
directory = root / 'outputs' / case
candidates = sorted(directory.glob('colored-raw_*.glb'))
if not candidates:
    raise FileNotFoundError(f'No completed colored mesh for {case}: inspect the benchmark result first.')
mesh_path = candidates[-1]
renders = directory / 'renders'
renders.mkdir(exist_ok=True)
start = time.monotonic()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(mesh_path))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
lower = Vector(tuple(min(p[i] for p in points) for i in range(3)))
upper = Vector(tuple(max(p[i] for p in points) for i in range(3)))
stats = {
    'source': str(mesh_path.relative_to(root)),
    'mesh_objects': len(meshes),
    'vertices': sum(len(o.data.vertices) for o in meshes),
    'polygons': sum(len(o.data.polygons) for o in meshes),
    'triangles': sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),
    'armatures': sum(o.type == 'ARMATURE' for o in bpy.context.scene.objects),
    'uv_layers': [list(o.data.uv_layers.keys()) for o in meshes],
    'color_attributes': [list(o.data.color_attributes.keys()) for o in meshes],
    'bounds_before': {'min': list(lower), 'max': list(upper)},
    'render_notes': 'Imported real generated GLB. CPU Cycles, unlit generated vertex colors (no denoising or texture repairs). No sculpting, retopology, rigging, armor or animation edits.',
}
for obj in meshes:
    for material in obj.data.materials:
        if not material:
            continue
        material.use_nodes = True
        nodes = material.node_tree.nodes
        nodes.clear()
        color = nodes.new('ShaderNodeVertexColor')
        color.layer_name = 'Color'
        shader = nodes.new('ShaderNodeEmission')
        shader.inputs['Strength'].default_value = 1.0
        output = nodes.new('ShaderNodeOutputMaterial')
        material.node_tree.links.new(color.outputs['Color'], shader.inputs['Color'])
        material.node_tree.links.new(shader.outputs['Emission'], output.inputs['Surface'])
# Import glTF Y-up -> Blender Z-up is performed by Blender's importer.
# Normalize only root transforms; preserve generated geometry and colors.
parents = [o for o in bpy.context.scene.objects if o.parent is None]
container = bpy.data.objects.new('Generated model - normalized', None)
bpy.context.collection.objects.link(container)
for obj in parents:
    matrix = obj.matrix_world.copy()
    obj.parent = container
    obj.matrix_world = matrix
height = upper.z - lower.z
container.scale = (2.0/height,)*3
container.location = Vector((-(lower.x+upper.x)/2, -(lower.y+upper.y)/2, -lower.z)) * (2.0/height)
bpy.context.view_layer.update()

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.cycles.use_denoising = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast' if 'Medium High Contrast' in [] else 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
world = bpy.data.worlds.new('Neutral charcoal studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.055,0.065,0.08,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
scene.world = world

def area(name, location, energy, size, color):
    lamp = bpy.data.lights.new(name,'AREA')
    lamp.energy=energy; lamp.shape='DISK'; lamp.size=size; lamp.color=color
    obj=bpy.data.objects.new(name,lamp);bpy.context.collection.objects.link(obj)
    obj.location=location; obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()

area('Soft key',(3,-4,5),180,4,(1,0.94,0.86))
area('Soft fill',(-3,-1,3),100,4,(0.85,0.92,1))
area('Back fill',(0,4,4),100,4,(1,1,1))
camera_data=bpy.data.cameras.new('Orthographic inspection')
camera=bpy.data.objects.new('Orthographic inspection',camera_data)
bpy.context.collection.objects.link(camera)
camera_data.type='ORTHO';camera_data.ortho_scale=2.6
scene.camera=camera
def camera_angle(degrees):
    radians=math.radians(degrees)
    camera.location=(4*math.sin(radians),-4*math.cos(radians),2.2)
    camera.rotation_euler=(Vector((0,0,1.05))-camera.location).to_track_quat('-Z','Y').to_euler()

for degrees in range(0,360,45):
    camera_angle(degrees)
    scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100
    scene.render.filepath=str(renders/f'angle-{degrees:03d}-256.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED',degrees,flush=True)

camera_angle(0)
scene.render.resolution_x=768;scene.render.resolution_y=768
scene.render.filepath=str(renders/'detail-000-768.png')
bpy.ops.render.render(write_still=True)
scene.render.resolution_x=160;scene.render.resolution_y=160
scene.render.filepath=str(renders/'pixel-source-000-160.png')
bpy.ops.render.render(write_still=True)
if case.startswith('helmet'):
    camera.location = (0,-2,-2)
    camera.rotation_euler = (Vector((0,0,1.0))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x=512; scene.render.resolution_y=512
    scene.render.filepath=str(renders/'underside-512.png')
    bpy.ops.render.render(write_still=True)
    hit, location, normal, face, obj, matrix = scene.ray_cast(bpy.context.evaluated_depsgraph_get(), Vector((0,0,-1)), Vector((0,0,1)))
    stats['center_underside_ray']={'hit':hit,'height':float(location.z) if hit else None,'normalized_model_height':2.0}
bpy.ops.wm.save_as_mainfile(filepath=str(directory/'inspection.blend'))
stats['inspection_seconds']=round(time.monotonic()-start,2)
(root/'reports'/f'{case}-mesh-inspection.json').write_text(json.dumps(stats,indent=2)+'\n')
print(json.dumps(stats),flush=True)
