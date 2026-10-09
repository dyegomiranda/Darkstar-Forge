import bpy,math
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/home/djabo/Downloads/Void Sun/tools/art/viability3d-20261007/outputs/game-sample/brunhild-editable.blend')
r=bpy.data.objects['BrunhildRig']
for t in r.animation_data.nla_tracks:t.mute=True
for b in r.pose.bones:b.matrix_basis.identity()
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=640;s.render.resolution_y=640;s.render.resolution_percentage=100;s.view_settings.view_transform='Standard'
w=bpy.data.worlds.new('Studio');w.use_nodes=True;w.node_tree.nodes['Background'].inputs['Color'].default_value=(.18,.18,.18,1);w.node_tree.nodes['Background'].inputs['Strength'].default_value=.8;s.world=w
for loc,power in [((2,-3,4),160),((-3,-1,3),110)]:
 d=bpy.data.lights.new('Key','AREA');d.energy=power;d.size=3;o=bpy.data.objects.new('Key',d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.7))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Face');d.type='ORTHO';d.ortho_scale=.6;o=bpy.data.objects.new('Face',d);bpy.context.collection.objects.link(o);o.location=(-.025,-4,1.8);o.rotation_euler=(Vector((-.025,-.02,1.75))-o.location).to_track_quat('-Z','Y').to_euler();s.camera=o;
from mathutils.bvhtree import BVHTree
from mathutils import Matrix
head=bpy.data.objects['HeadHair'];bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();ev=head.evaluated_get(dg);tree=BVHTree.FromObject(head,dg)
right=o.matrix_world.to_3x3().col[0].normalized();up=o.matrix_world.to_3x3().col[1].normalized();facing=o.matrix_world.to_3x3().col[2].normalized();direction=-facing
inv=ev.matrix_world.inverted();rest=r.data.bones['Head'].matrix_local@r.pose.bones['Head'].matrix.inverted()@r.matrix_world.inverted()
colors={'Sclera':(.66,.60,.49,1),'Iris':(.18,.075,.015,1),'Pupil':(.006,.003,.001,1),'Highlight':(.82,.76,.62,1)}
for ob in list(bpy.context.scene.objects):
 if ob.name.startswith('Eye-'):bpy.data.objects.remove(ob,do_unlink=True)
def eye_mesh(name,center,sizes):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1)
 ob=bpy.context.object;ob.name=name
 for v in ob.data.vertices:v.co=rest@(center+right*v.co.x*sizes[0]+up*v.co.z*sizes[1]+facing*v.co.y*sizes[2])
 ob.matrix_world=Matrix.Identity(4);ob.parent=r
 mat=bpy.data.materials.new(name);mat.diffuse_color=colors[name.split('-')[2]];mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=mat.diffuse_color;bs.inputs['Roughness'].default_value=.8;ob.data.materials.append(mat)
 for p in ob.data.polygons:p.use_smooth=True
 group=ob.vertex_groups.new(name='Head');group.add(list(range(len(ob.data.vertices))),1,'REPLACE');mod=ob.modifiers.new('Head socket','ARMATURE');mod.object=r
for index,cx in enumerate([204/640,322/640]):
 cy=1-370/640;orig=o.matrix_world.translation+right*((cx-.5)*d.ortho_scale)+up*((cy-.5)*d.ortho_scale)
 hits=[]
 for du,dv in [(-.022,0),(.022,0),(0,.022),(0,-.022)]:
  start=orig+right*du*d.ortho_scale+up*dv*d.ortho_scale;loc,n,fi,dist=tree.ray_cast(inv@start,inv.to_3x3()@direction)
  if loc is not None:hits.append((ev.matrix_world@loc-start).dot(direction))
 if not hits:raise RuntimeError('Eye socket missing')
 hits.sort();depth=hits[0];center=orig+direction*(depth+.014)
 print('EYE_SOCKET',index,list(center),hits,flush=True)
 eye_mesh(f'Eye-{index}-Sclera',center,(.024,.011,.017))
 eye_mesh(f'Eye-{index}-Iris',center+facing*.016,(.008,.009,.002))
 eye_mesh(f'Eye-{index}-Pupil',center+facing*.018,(.004,.005,.001))
 eye_mesh(f'Eye-{index}-Highlight',center+facing*.019+right*.003+up*.004,(.0018,.002,.0007))
s.render.filepath='/tmp/voidsun-face-render.png';bpy.ops.render.render(write_still=True)
for ob in list(bpy.context.scene.objects):
 if ob.type in ['LIGHT','CAMERA']:bpy.data.objects.remove(ob,do_unlink=True)
for tr in r.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath='/home/djabo/Downloads/Void Sun/tools/art/viability3d-20261007/outputs/game-sample/brunhild-editable.blend')
bpy.ops.export_scene.gltf(filepath='/home/djabo/Downloads/Void Sun/public/art/sample3d/brunhild-test.glb',export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True)
