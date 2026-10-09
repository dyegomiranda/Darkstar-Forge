import bpy,bmesh,json,sys,math
from pathlib import Path
from mathutils import Vector
root=Path('/home/djabo/Downloads/Void Sun/tools/art/corpos-recriados-20261008')
sex=sys.argv[sys.argv.index('--')+1];suffix=sys.argv[sys.argv.index('--')+2] if len(sys.argv)>sys.argv.index('--')+2 else 'hands-fit'
source=root/'work'/f'{sex}-{suffix}.blend';out=root/'work'/f'{sex}-{suffix}-review';out.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render]
scene=bpy.context.scene
for o in list(scene.objects):
 if o.type in ['LIGHT','CAMERA']:bpy.data.objects.remove(o,do_unlink=True)
world=bpy.data.worlds.new('Review neutral');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.027,.032,.04,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45;scene.world=world
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=2
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.render.film_transparent=False
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
for name,position,energy,size in [('Key',(-3,-4,4),420,4),('Fill',(3,-2,3),180,3),('Rim',(0,4,4),320,3)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Inspection camera');camera=bpy.data.objects.new('Inspection camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera;camera_data.type='ORTHO'
def render(name,pos,target,scale,size):
 camera.location=Vector(pos);camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.ortho_scale=scale
 scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.resolution_percentage=100;scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True);print('Captured',name,flush=True)
for angle in range(0,360,45):
 a=math.radians(angle);render('body-'+str(angle).zfill(3),(4*math.sin(a),-4*math.cos(a),1.4),(0,0,1.0),2.7,512)
render('head-front',(0,-4,1.73),(0,0,1.72),.68,768)
render('axilla-left',(.35,-4,1.36),(.35,0,1.36),.5,768)
render('feet-front',(0,-4,.23),(0,0,.22),.7,768)
# Hands coordinate selection uses the actual fitted bounds, includes full wrist transitions.
for sign,label in [(1,'left'),(-1,'right')]:
 coords=[o.matrix_world@v.co for o in objects for v in o.data.vertices if sign*(o.matrix_world@v.co).x>.73]
 if not coords:continue
 lo=Vector(tuple(min(p[i] for p in coords) for i in range(3)));hi=Vector(tuple(max(p[i] for p in coords) for i in range(3)));target=(lo+hi)*.5;scale=max(hi.x-lo.x,hi.z-lo.z)*1.3
 for a,name in [(0,'front'),(180,'back'),(60,'side'),(-45,'three-quarter')]:
  a=math.radians(a);pos=target+Vector((4*math.sin(a),-4*math.cos(a),.5 if name=='three-quarter' else 0))
  render('hand-'+label+'-'+name,pos,target,scale,1024)
reports=[]
for ob in objects:
 bm=bmesh.new();bm.from_mesh(ob.data);bm.verts.ensure_lookup_table();bm.verts.index_update();visited=bytearray(len(bm.verts));components=0
 for v in bm.verts:
  if visited[v.index]:continue
  components+=1;stack=[v];visited[v.index]=1
  while stack:
   u=stack.pop()
   for e in u.link_edges:
    w=e.other_vert(u)
    if not visited[w.index]:visited[w.index]=1;stack.append(w)
 volume=bm.calc_volume(signed=True)
 reports.append({'object':ob.name,'vertices':len(bm.verts),'faces':len(bm.faces),'triangles':sum(len(f.verts)-2 for f in bm.faces),'components':components,'boundary_edges':sum(e.is_boundary for e in bm.edges),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'zero_area_faces':sum(f.calc_area()<1e-13 for f in bm.faces),'volume':volume,'finite_coordinates':all(math.isfinite(c) for v in bm.verts for c in v.co)})
 bm.free()
(root/'reports'/f'{sex}-{suffix}-review.json').write_text(json.dumps(reports,indent=2))
print(json.dumps(reports),flush=True)
