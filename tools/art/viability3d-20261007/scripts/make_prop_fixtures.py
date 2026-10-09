"""Known 3D round-trip fixtures; NOT proposed final game artwork."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parent.parent

def material(name,color,metallic=0.0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    s=m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value=(*color,1)
    s.inputs['Metallic'].default_value=metallic
    s.inputs['Roughness'].default_value=0.65
    return m

def cube(name,location,scale,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    mod=o.modifiers.new('Small manufactured bevel','BEVEL');mod.width=0.012;mod.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def render_fixture(name):
    scene=bpy.context.scene
    objects=[o for o in scene.objects if o.type=='MESH']
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root/'inputs'/f'{name}-ground-truth.glb'),use_selection=True,export_apply=True)
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32
    scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.film_transparent=True
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    world=bpy.data.worlds.new('Soft fixture light');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.35
    scene.world=world
    for loc,power,size in [((3,-4,5),400,4),((-3,-1,3),200,3),((0,4,4),150,3)]:
        data=bpy.data.lights.new('Fixture light','AREA');data.energy=power;data.size=size
        obj=bpy.data.objects.new('Fixture light',data);scene.collection.objects.link(obj);obj.location=loc
        obj.rotation_euler=(Vector((0,0,0.55))-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Fixture camera');data.type='ORTHO';data.ortho_scale=1.9
    obj=bpy.data.objects.new('Fixture camera',data);scene.collection.objects.link(obj)
    obj.location=(2.4,-4,2.7);obj.rotation_euler=(Vector((0,0,0.55))-obj.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=obj;scene.render.filepath=str(root/'inputs'/f'{name}-reference.png')
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'inputs'/f'{name}-ground-truth.blend'))

bpy.ops.wm.read_factory_settings(use_empty=True)
wood=[material('Diagnostic timber '+str(i),c) for i,c in enumerate([(0.36,0.17,0.065),(0.43,0.22,0.09),(0.30,0.125,0.045)])]
dark=material('Dark iron fittings',(0.11,0.12,0.13),0.6)
for axis in ['x','y']:
    for sign in [-1,1]:
        for i in range(5):
            pos=[0,0,0.58];pos[0 if axis=='x' else 1]=sign*0.52
            pos[1 if axis=='x' else 0]=(i-2)*0.204
            scale=(0.09,0.194,1.04) if axis=='x' else (0.194,0.09,1.04)
            cube('Wall board',pos,scale,wood[i%3])
        for z in [0.16,1.0]:
            pos=[0,0,z];pos[0 if axis=='x' else 1]=sign*0.58
            scale=(0.07,1.13,0.16) if axis=='x' else (1.13,0.07,0.16)
            cube('Frame rail',pos,scale,wood[1])
for i in range(5):cube('Lid board',((i-2)*0.204,0,1.145),(0.194,1.08,0.08),wood[i%3])
for x in [-0.38,0.38]:
    for y in [-0.6,0.6]:
        cube('Iron strap',(x,y,0.58),(0.06,0.04,1.0),dark)
render_fixture('crate')

bpy.ops.wm.read_factory_settings(use_empty=True)
steel=material('Diagnostic blue steel',(0.23,0.30,0.38),0.45)
trim=material('Brass rim',(0.57,0.36,0.12),0.5)
verts=[];faces=[];n=64;rings=16
# Closed-thickness dome, open below. A measurable hollow test for the generator.
for inner in [False,True]:
    for ring in range(rings+1):
        theta=(ring+0.025)/(rings+0.025)*math.pi/2
        rx,ry,rz=(0.44,0.39,0.50) if not inner else (0.39,0.34,0.45)
        for j in range(n):
            phi=j*2*math.pi/n
            verts.append((rx*math.sin(theta)*math.cos(phi),ry*math.sin(theta)*math.sin(phi),0.48+rz*math.cos(theta)))
        if ring:
            base=(rings+1)*n if inner else 0
            for j in range(n):
                a=base+(ring-1)*n+j;b=base+(ring-1)*n+(j+1)%n
                c=base+ring*n+(j+1)%n;d=base+ring*n+j
                faces.append((d,c,b,a) if inner else (a,b,c,d))
offset=(rings+1)*n
for j in range(n):faces.append((rings*n+j,rings*n+(j+1)%n,offset+rings*n+(j+1)%n,offset+rings*n+j))
mesh=bpy.data.meshes.new('Hollow helmet shell');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Hollow helmet shell',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(steel)
for p in mesh.polygons:p.use_smooth=True
bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,major_radius=0.43,minor_radius=0.025,location=(0,0,0.48))
rim=bpy.context.object;rim.name='Helmet rim';rim.scale.y=0.9;rim.data.materials.append(trim)
for x in [-0.405,0.405]:cube('Cheek guard',(x,0.05,0.35),(0.07,0.23,0.28),steel)
render_fixture('helmet')
(root/'reports/prop-fixtures.json').write_text(json.dumps({'purpose':'Synthetic geometric round-trip controls, not proposed final art or fitted wearable equipment.','crate':'Individual boards and iron fittings; source geometry retained.','helmet':'Hollow shell open below; source geometry retained to check whether single-view reconstruction preserves the opening.'},indent=2)+'\n')
