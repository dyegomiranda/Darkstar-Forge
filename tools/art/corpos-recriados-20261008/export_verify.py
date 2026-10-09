import bpy,bmesh,json,sys,math
from pathlib import Path
from mathutils import Vector
R=Path('/home/djabo/Downloads/Void Sun/tools/art/corpos-recriados-20261008')
sex=sys.argv[sys.argv.index('--')+1]
source=R/'work'/f'{sex}-hands-fit.blend';stage=R/'work'/'export-check';stage.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));body=bpy.data.objects['Base_'+sex]
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
path=stage/f'corpo-{sex}.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_apply=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];report=[]
for ob in meshes:
 coords=[ob.matrix_world@v.co for v in ob.data.vertices];ob.parent=None;ob.matrix_world.identity()
 for v,p in zip(ob.data.vertices,coords):v.co=p
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bm.verts.index_update();bm.verts.ensure_lookup_table();vis=bytearray(len(bm.verts));components=0
 for v in bm.verts:
  if vis[v.index]:continue
  components+=1;vis[v.index]=1;stack=[v]
  while stack:
   u=stack.pop()
   for e in u.link_edges:
    w=e.other_vert(u)
    if not vis[w.index]:vis[w.index]=1;stack.append(w)
 d={'name':ob.name,'vertices_welded':len(bm.verts),'faces':len(bm.faces),'components':components,'boundary_edges':sum(e.is_boundary for e in bm.edges),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'zero_area_faces':sum(f.calc_area()<1e-13 for f in bm.faces),'finite_vertices':all(math.isfinite(c) for v in bm.verts for c in v.co),'volume':bm.calc_volume(signed=True)}
 report.append(d);bm.to_mesh(ob.data);bm.free();ob.name='Base_'+sex
 if d['boundary_edges'] or d['non_manifold_edges'] or d['zero_area_faces'] or d['components']!=1 or not d['finite_vertices'] or d['volume']<=0:raise RuntimeError('GLB failed structural validation '+str(d))
(R/'reports'/f'{sex}-glb-roundtrip.json').write_text(json.dumps({'file':str(path),'meshes':report,'bytes':path.stat().st_size},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(R/'work'/f'{sex}-export-review.blend'));print(json.dumps(report),flush=True)
