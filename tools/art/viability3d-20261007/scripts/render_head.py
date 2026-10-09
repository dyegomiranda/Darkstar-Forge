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
d=bpy.data.cameras.new('Face');d.type='ORTHO';d.ortho_scale=.6;o=bpy.data.objects.new('Face',d);bpy.context.collection.objects.link(o);o.location=(-.025,-4,1.8);o.rotation_euler=(Vector((-.025,-.02,1.75))-o.location).to_track_quat('-Z','Y').to_euler();s.camera=o;s.render.filepath='/tmp/voidsun-face-render.png';bpy.ops.render.render(write_still=True)
