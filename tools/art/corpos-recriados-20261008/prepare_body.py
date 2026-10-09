import bpy, bmesh, json, math, sys
from pathlib import Path
from mathutils import Vector
sex=sys.argv[sys.argv.index('--')+1]
R=Path('/home/djabo/Downloads/Void Sun/tools/art/corpos-recriados-20261008')
source=Path('/home/djabo/.local/share/Trash/files/pixal3d-corpos-2026-10-07')/f'corpo-{sex}.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
ob=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=ob
ob.select_set(True)
# Bake importer orientation; recover the mannequin proportions without generating a new character.
mat=ob.matrix_world.copy();coords=[mat@v.co for v in ob.data.vertices]
lo=Vector(tuple(min(p[i] for p in coords) for i in range(3)))
hi=Vector(tuple(max(p[i] for p in coords) for i in range(3)))
scale=2/(hi.z-lo.z);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
ob.parent=None;ob.matrix_world.identity()
for v,p in zip(ob.data.vertices,coords):v.co=(p-center)*scale
ob.name='Base_'+sex
# Generated mesh has tiny islands and scan noise; clean only at a finer than visible size.
ob.data.remesh_voxel_size=.0035
bpy.ops.object.voxel_remesh()
mod=ob.modifiers.new('Surface cleanup','SMOOTH');mod.factor=.55;mod.iterations=5
bpy.ops.object.modifier_apply(modifier=mod.name)
for attr in list(ob.data.color_attributes):ob.data.color_attributes.remove(attr)
material=bpy.data.materials.new('Mannequin_Peach');material.use_nodes=True
bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.67,.43,.39,1);bsdf.inputs['Roughness'].default_value=.6
ob.data.materials.clear();ob.data.materials.append(material)
for p in ob.data.polygons:p.use_smooth=True
# Keep one connected body, remove isolated bits.
bm=bmesh.new();bm.from_mesh(ob.data)
bm.verts.ensure_lookup_table();bm.verts.index_update()
print('Component check',len(bm.verts),len(bm.faces),flush=True)
visited=bytearray(len(bm.verts));components=[]
for v in bm.verts:
 if visited[v.index]:continue
 stack=[v];visited[v.index]=1;comp=[]
 while stack:
  u=stack.pop();comp.append(u)
  for e in u.link_edges:
   w=e.other_vert(u)
   if not visited[w.index]:visited[w.index]=1;stack.append(w)
 components.append(comp)
components.sort(key=len,reverse=True)
remove=[v for comp in components[1:] for v in comp]
if remove:bmesh.ops.delete(bm,geom=remove,context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
report={'input':str(source),'components_removed':[len(c) for c in components[1:]],'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges)}
bm.to_mesh(ob.data);bm.free()
bpy.ops.wm.save_as_mainfile(filepath=str(R/'work'/f'{sex}-body-clean.blend'))
(R/'reports'/f'{sex}-body-clean.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report),flush=True)
