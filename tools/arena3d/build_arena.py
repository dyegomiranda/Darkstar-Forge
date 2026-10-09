"""Void Sun: authored, editable arena geometry. Run: blender -b -t 2 --python tools/arena3d/build_arena.py.
Coordinates are game X/Y(up)/Z, converted to Blender only at the mesh boundary.
No generated image, borrowed game asset, or primitive terrain tile is used.
"""
import bpy, bmesh, math, random
from mathutils import Vector
from pathlib import Path
R = random.Random(4917)
ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
materials = {}

def mat(name, color, roughness=1):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Roughness'].default_value=roughness
    v=m.node_tree.nodes.new('ShaderNodeVertexColor'); v.layer_name='Col'; m.node_tree.links.new(v.outputs['Color'],bs.inputs['Base Color'])
    materials[name]=(m,color); return name
stone=mat('limestone',(.37,.385,.32)); pale=mat('carved-stone',(.49,.46,.36)); rock=mat('river-rock',(.35,.42,.4))
soil=mat('earth',(.30,.34,.19)); moss=mat('moss',(.29,.43,.16)); bark=mat('bark',(.28,.19,.10)); leaf=mat('foliage',(.15,.26,.05))
grass=mat('grass',(.19,.29,.08)); wood=mat('wood',(.41,.26,.12)); brass=mat('brass',(.51,.36,.13),.65)
flower=mat('flowers',(.83,.68,.33)); cloth=mat('banner',(.2,.31,.37)); dark=mat('dark-stone',(.16,.21,.23))

class Batch:
    def __init__(self, name, material): self.name=name; self.material=material; self.v=[]; self.f=[]; self.c=[]
    def add(self, vertices, faces, tint=1, color=None):
        o=len(self.v); self.v.extend(vertices); self.f.extend(tuple(o+i for i in face) for face in faces)
        base=color or materials[self.material][1]
        self.c.extend([tuple(min(1,max(0,x*tint)) for x in base)]*len(vertices))
    def mesh(self, origin=(0,0,0), parent=None):
        if not self.v: return
        mesh=bpy.data.meshes.new(self.name)
        mesh.from_pydata([(x-origin[0],-(z-origin[2]),y-origin[1]) for x,y,z in self.v],[],self.f); mesh.update()
        bm=bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
        mesh.materials.append(materials[self.material][0]); a=mesh.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
        for item,col in zip(a.data,self.c): item.color=(*col,1)
        obj=bpy.data.objects.new(self.name,mesh); bpy.context.collection.objects.link(obj); obj.parent=parent; obj.location=(0,0,0) if parent else (origin[0],-origin[2],origin[1])
        return obj
batches={k:Batch('arena-'+k,k) for k in materials}

def box(b, pos, size, tint=1, yaw=0, chipped=0):
    x,y,z=pos; a,h,d=size; vs=[]
    for yy in [-h/2,h/2]:
        for xx,zz in [(-a/2,-d/2),(a/2,-d/2),(a/2,d/2),(-a/2,d/2)]:
            xx+=R.uniform(-chipped,chipped); zz+=R.uniform(-chipped,chipped)
            vs.append((x+xx*math.cos(yaw)-zz*math.sin(yaw), y+yy, z+xx*math.sin(yaw)+zz*math.cos(yaw)))
    # Split top into inset lip for less perfect rectangular stone.
    if chipped:
        top=vs[4:]; q=len(vs)
        vs.extend([(x+(vx-x)*.94,vy+.025,z+(vz-z)*.94) for vx,vy,vz in top])
        faces=[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,q+1,q),(5,6,q+2,q+1),(6,7,q+3,q+2),(7,4,q,q+3),(q,q+1,q+2,q+3)]
    else: faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    b.add(vs,faces,tint)

def tube(b, points, radii, sides=7, tint=1):
    vs=[]
    for n,p in enumerate(points):
        tangent=Vector(points[min(n+1,len(points)-1)])-Vector(points[max(0,n-1)])
        tangent.normalize(); axis=tangent.cross(Vector((0,0,1)))
        if axis.length<.01: axis=tangent.cross(Vector((1,0,0)))
        axis.normalize(); axis2=tangent.cross(axis).normalized()
        for j in range(sides):
            v=Vector(p)+radii[n]*(axis*math.cos(j*math.tau/sides)+axis2*math.sin(j*math.tau/sides)); vs.append(tuple(v))
    faces=[tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))]
    for n in range(len(points)-1):
        for j in range(sides): faces.append((n*sides+j,n*sides+(j+1)%sides,(n+1)*sides+(j+1)%sides,(n+1)*sides+j))
    b.add(vs,faces,tint)

def boulder(x,y,z,sx,sy,sz, material=rock):
    vs=[]; sides=9
    for ring,(r,yy) in enumerate([(.68,-.44),(1,0),(.63,.39),(.1,.57)]):
        for n in range(sides):
            angle=n*math.tau/sides+ring*.19
            vs.append((x+math.cos(angle)*sx*r*R.uniform(.83,1.16),y+yy*sy*R.uniform(.9,1.1),z+math.sin(angle)*sz*r*R.uniform(.85,1.1)))
    for n in range(3):
        for j in range(sides):
            i=n*sides+j; k=n*sides+(j+1)%sides
            batches[material].add([vs[i],vs[k],vs[k+sides],vs[i+sides]],[(0,1,2),(0,2,3)],R.uniform(.82,1.15))

def river_center(z): return -7.2+math.sin(z*.23)*.75

def ground_height(x,z):
    edge=abs(x-river_center(z))-1.6
    return -.75+min(1,max(0,edge/.95))*.73+max(0,abs(z)-8)*.07

# A continuous landscape, with sloping banks into the river instead of an extruded board/island.
for iz in range(86):
    z=-32+iz*.75
    for ix in range(86):
        x=-32+ix*.75; corners=[(x,z),(x+.75,z),(x+.75,z+.75),(x,z+.75)]
        vs=[]
        for xx,zz in corners:
            yy=ground_height(xx,zz)
            if abs(xx)<4.8 and abs(zz)<5: yy=-.07
            vs.append((xx,yy,zz))
        batches[soil].add(vs,[(0,3,2),(0,2,1)],1)
        for i,(xx,yy,zz) in enumerate(vs):
            n=.5+.19*math.sin(xx*.7+math.sin(zz*.5)*1.7)+.14*math.sin(zz*1.12+xx*.31)+.1*math.sin(xx*2.3-zz*.8)
            base=(.17+n*.058,.23+n*.09,.09+n*.029)
            batches[soil].c[len(batches[soil].c)-4+i]=base

# Hand staggered courtyard courses; different-sized chipped slabs and broken edges.
for iz in range(14):
    z=-4.75+iz*.73; x=-4.65-(iz%2)*.42
    while x<4.7:
        w=R.choice([.78,.9,1.05,1.21]); center=x+w*.5
        if abs(center)<4.62:
            box(batches[stone],(center,-.004,z),(w-.045,.12,.685),R.uniform(.83,1.14),chipped=.021)
        x+=w
# Perimeter stones sunken into ground, with breaks rather than tall block edges.
for z in [-5.07,5.07]:
    for x in [-4.1,-3.2,-2.3,-1.4,-.5,.4,1.3,2.2,3.1,4]: box(batches[pale],(x,.018,z),(.86,.22,.31),R.uniform(.9,1.1),chipped=.025)
for x in [-4.9,4.9]:
    for z in [-4.4,-3.5,-2.6,-1.7,-.8,.1,1,1.9,2.8,3.7,4.6]:
        if R.random()<.86: box(batches[pale],(x,.035,z),(.28,.22,.85),R.uniform(.9,1.1),chipped=.022)

# Masonry bridge, inset voussoirs, parapets and worn stair ends. Continuous arch opening.
for z in [-1.3,1.3]:
    for segment in range(15):
        a=segment*math.pi/15; bb=(segment+1)*math.pi/15
        vs=[]
        for zz in [z-.2,z+.2]:
            for r,angle in [(2.08,a),(2.5,a),(2.5,bb),(2.08,bb)]:
                vs.append((-7.2+math.cos(angle)*r,-1.7+math.sin(angle)*.83*r,zz))
        batches[stone].add(vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],R.uniform(.86,1.12))
    for row in range(2):
        for ix in range(6): box(batches[pale],(-9.65+ix*.89,.47+row*.32,z),(.83,.29,.44),R.uniform(.9,1.13),chipped=.015)
    for ix in range(7):box(batches[pale],(-9.77+ix*.77,1.13,z),(.74,.15,.58),R.uniform(.9,1.1),chipped=.013)
for ix in range(7):
    for iz in range(4): box(batches[stone],(-9.68+ix*.83,.27,-.91+iz*.6),(.79,.17,.56),R.uniform(.92,1.12),chipped=.012)
for x in [-10.35,-4.25]:
    for n in range(3):box(batches[stone],(x+(n-1)*.34, .13-n*.085,0),(.38,.18,2.15),R.uniform(.9,1.05),chipped=.022)

# Ruined sanctuary wall north of combat, with broken Gothic arch and an eclipse medallion.
for row in range(8):
    for ix in range(17):
        x=-5.3+ix*.66+(row%2)*.32
        if abs(x)<1.75 and row<6: continue
        if abs(x)>4.1 and row>3+R.choice([0,1,2]):continue
        box(batches[stone],(x,.23+row*.42,-6.35),(.615,.386,.58),R.uniform(.84,1.14),chipped=.025)
for side in [-1,1]:
    for j in range(5):box(batches[pale],(side*1.63,.29+j*.43,-6.02),(.43,.4,.66),R.uniform(.9,1.08),chipped=.015)
for segment in range(13):
    a=segment*math.pi/13; bb=(segment+1)*math.pi/13
    vs=[]
    for zz in [-6.4,-5.97]:
        for r,angle in [(1.42,a),(1.85,a),(1.85,bb),(1.42,bb)]:vs.append((math.cos(angle)*r,2.02+math.sin(angle)*r,zz))
    batches[pale].add(vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],R.uniform(.88,1.1))
# Far fallen arch stones/rubble.
for n in range(16):
    x=R.uniform(-5.4,5.4); z=R.uniform(-7.1,-5.45)
    if abs(x)<1.65:continue
    box(batches[stone],(x,.2,z),(R.uniform(.4,.8),R.uniform(.18,.45),.53),R.uniform(.8,1.1),R.uniform(-.6,.6),.08)
# Metal black sun mounted inside arch, a sculpted object instead of a painted background.
center=(0,2.55,-6.26)
for j in range(32):
    a=j*math.tau/32; bb=(j+1)*math.tau/32
    tube(batches[brass],[(math.cos(a)*.68,2.55+math.sin(a)*.68,-6.26),(math.cos(bb)*.68,2.55+math.sin(bb)*.68,-6.26)],[.045,.045],5)
for j in range(12):
    a=j*math.tau/12
    tube(batches[brass],[(math.cos(a)*.83,2.55+math.sin(a)*.83,-6.26),(math.cos(a)*1.08,2.55+math.sin(a)*1.08,-6.26)],[.045,.018],5)
# Column remnants right; fluted shafts/capitals with vegetation.
for x,z,h in [(5.65,-3.2,2.45),(5.55,3.7,1.3),(-4.9,-4.2,1.55)]:
    box(batches[pale],(x,.12,z),(1.06,.25,1.06),chipped=.025)
    tube(batches[pale],[(x,.24,z),(x,h,z)],[.32,.29],12)
    for k in range(10):
        a=k*math.tau/10
        tube(batches[stone],[(x+math.cos(a)*.29,.31,z+math.sin(a)*.29),(x+math.cos(a)*.28,h-.1,z+math.sin(a)*.28)],[.045,.036],4,.9)
    box(batches[pale],(x,h,z),(.84,.22,.84),chipped=.02)

# river-bank rocks at actual bank height, not floating ornaments.
for n in range(76):
    z=R.uniform(-13,12); side=R.choice([-1,1]); x=river_center(z)+side*R.uniform(1.15,2.24)
    s=R.uniform(.23,.75);boulder(x,ground_height(x,z)+s*.16,z,s,s*.65,s*.8)
for n in range(35):
    x=R.uniform(5.5,13);z=R.uniform(-12,12);s=R.uniform(.25,1.05);boulder(x,ground_height(x,z)+s*.1,z,s,s*.74,s*.8)

# Trees are branching meshes. Each upper branch is a separate anchored node, with individual leaves.
for tree,(x,z,scale,golden) in enumerate([(8.2,7.0,1.04,False),(6.9,-7.7,1.1,False),(-4.8,-7.6,.92,True),(-12,5.9,1.05,False)]):
    y=ground_height(x,z)
    tube(batches[bark],[(x,y,z),(x+.08,y+1.1*scale,z-.04),(x-.18,y+2.6*scale,z+.1),(x-.05,y+3.5*scale,z)],[.39*scale,.27*scale,.2*scale,.09*scale],9)
    for j in range(6):
        a=j*math.tau/6
        tube(batches[bark],[(x+math.cos(a)*.84,y-.02,z+math.sin(a)*.84),(x+math.cos(a)*.35,y+.28,z+math.sin(a)*.35),(x,y+.95,z)],[.1,.15,.13],5)
    for branch in range(9):
        angle=branch*2.4+tree*.3; height=(1.85+branch*.13)*scale
        origin=(x,y+height,z); group=bpy.data.objects.new('wind-branch-%s-%s'%(tree,branch),None); bpy.context.collection.objects.link(group); group.location=(x,-z,y+height)
        ex=x+math.cos(angle)*(1.12+branch*.065)*scale; ez=z+math.sin(angle)*(1.12+branch*.065)*scale; ey=y+height+(1.1+R.random()*.8)*scale
        b=Batch('twig-%s-%s'%(tree,branch),bark)
        tube(b,[origin,((x+ex)*.5,y+height+.35,(z+ez)*.5),(ex,ey,ez)],[.105*scale,.066*scale,.026*scale],6)
        b.mesh(origin,group)
        leaves=Batch('leaves-%s-%s'%(tree,branch),leaf)
        for j in range(330):
            a=R.random()*math.tau; r=math.sqrt(R.random())*1.14*scale
            px=ex+math.cos(a)*r; pz=ez+math.sin(a)*r; py=ey+R.uniform(-.28,.82)*scale-(r*r)*.19
            length=R.uniform(.17,.33)*scale; width=length*.42; phi=R.random()*math.tau
            # A bent, tapered leaf with midrib; actual independent tip vertices receive wind in runtime.
            dx=math.cos(phi)*length; dz=math.sin(phi)*length; wx=-math.sin(phi)*width; wz=math.cos(phi)*width
            vs=[(px,py,pz),(px+dx*.55+wx,py+.045,pz+dz*.55+wz),(px+dx,py+.01,pz+dz),(px+dx*.55-wx,py-.015,pz+dz*.55-wz),(px+dx*.5,py+.035,pz+dz*.5)]
            color=(.39,.24,.035) if golden else (.14,.25,.035)
            color=tuple(v*R.uniform(.84,1.2) for v in color)
            leaves.add(vs,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],R.uniform(.78,1.32),color)
        # Opaque inner leaf masses give depth under independently fluttering surface leaves.
        for l in range(4):
            a=l*math.tau/4; cx=ex+math.cos(a)*.35*scale; cz=ez+math.sin(a)*.35*scale; cy=ey+.15*scale
            vv=[];ff=[];sides=12
            for j in range(7):
                ph=math.pi*j/6
                for k in range(sides):
                    aa=k*math.tau/sides+j*.08
                    rr=math.sin(ph)*(1+.07*math.sin(aa*7+j))
                    vv.append((cx+math.cos(aa)*rr*.64*scale,cy+math.cos(ph)*.43*scale,cz+math.sin(aa)*rr*.60*scale))
            for j in range(6):
                for k in range(sides):
                    ff.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
            leaves.add(vv,ff,R.uniform(.75,.98),(.24,.14,.025) if golden else (.09,.19,.023))
        leaves.mesh(origin,group)
# Grass, ferns and flower stems in clumps (avoid arena/bridge paths).
for n in range(1200):
    x=R.uniform(-13,11); z=R.uniform(-11,10)
    if abs(x)<5.15 and abs(z)<5.25:continue
    if abs(x-river_center(z))<1.75 or (-11<x<-4 and abs(z)<1.65):continue
    y=ground_height(x,z)
    for j in range(R.randrange(3,7)):
        px=x+R.uniform(-.2,.2);pz=z+R.uniform(-.2,.2);h=R.uniform(.12,.43);a=R.random()*math.tau;w=.026
        batches[grass].add([(px-w,y,pz),(px+w,y,pz),(px+math.cos(a)*.07,y+h,pz+math.sin(a)*.07)],[(0,1,2)],R.uniform(.72,1.32))
    if R.random()<.14:
        for j in range(3):
            a=j*math.tau/3;px=x+math.cos(a)*.14;pz=z+math.sin(a)*.14
            tube(batches[grass],[(px,y,pz),(px,y+.25,pz)],[.012,.008],3)
            for p in range(5):
                aa=p*math.tau/5
                batches[flower].add([(px,y+.26,pz),(px+math.cos(aa)*.075,y+.29,pz+math.sin(aa)*.075),(px+math.cos(aa+.8)*.06,y+.28,pz+math.sin(aa+.8)*.06)],[(0,1,2)],R.uniform(.85,1.15))
# Ivy trails cling to sanctuary masonry, with leaves away from tactical slots.
for n in range(35):
    x=R.uniform(-5.3,5.3); h=R.uniform(.4,2.7)
    if abs(x)<1.92:continue
    for j in range(10):
        px=x+math.sin(j*.7)*.10; yy=h-j*.16
        if yy<0:break
        batches[leaf].add([(px,yy,-5.995),(px-.12,yy+.08,-5.96),(px-.08,yy-.07,-5.97),(px+.1,yy-.06,-5.96),(px+.12,yy+.07,-5.97)],[(0,1,2),(0,3,4)],R.uniform(.8,1.15))
# Brazier stands with proper physical support.
for x,z in [(-3.1,-5.8),(3.1,-5.8)]:
    box(batches[dark],(x,.14,z),(.6,.27,.6),chipped=.025)
    tube(batches[dark],[(x,.23,z),(x,.92,z)],[.15,.12],8)
    tube(batches[brass],[(x,.9,z),(x,1.14,z)],[.16,.37],9)
# Deep-blue hanging standards on stone ruin.
for x in [-3.55,3.55]:
    tube(batches[brass],[(x-.5,2.7,-5.89),(x+.5,2.7,-5.89)],[.04,.04],6)
    vs=[(x-.37,2.66,-5.88),(x+.37,2.66,-5.88),(x+.37,1.4,-5.87),(x,1.2,-5.87),(x-.37,1.4,-5.87)]
    batches[cloth].add(vs,[(0,1,2),(0,2,3),(0,3,4)])
for b in batches.values():b.mesh()
# Authoring view/lights stay in .blend, runtime creates its own cameras and lights.
bpy.ops.object.camera_add(location=(19,-24,23)); cam=bpy.context.object; cam.name='authoring-camera';cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=27;bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='SUN',location=(4,-6,12));sun=bpy.context.object;sun.data.energy=2.3;sun.rotation_euler=(.4,-.45,-.3)
bpy.context.scene.world.color=(.28,.36,.4)
bpy.context.scene.render.resolution_x=1600;bpy.context.scene.render.resolution_y=1000;bpy.context.scene.render.resolution_percentage=100
out=ROOT/'public/art/sample3d/arena.glb';out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tools/arena3d/arena.blend'))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_cameras=False,export_lights=False,export_apply=True,export_vertex_color='MATERIAL',export_all_vertex_colors=False)
print('ARENA_EXPORTED',out.stat().st_size)
