import * as T from 'three';
export type Spell = 'fire' | 'ice';
interface Particle { mesh:T.Mesh; velocity:T.Vector3; spin:T.Vector3; age:number; life:number; gravity:number; bounce:boolean; scale:number }
interface Cast { kind:Spell; age:number; start:T.Vector3; end:T.Vector3; bolt:T.Group; impacted:boolean; onImpact:()=>void; origin?:()=>T.Vector3 }
const random=(a:number,b:number)=>a+Math.random()*(b-a);
const glow=(color:number,opacity=1)=>new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity>=1});
/** Each ability owns its shape, palette, choreography and impact. Shared code only handles physics/lifetime. */
export class ArenaEffects {
  readonly root=new T.Group();
  private particles:Particle[]=[];
  private casts:Cast[]=[];
  private rings:{mesh:T.Mesh;age:number;life:number;speed:number}[]=[];
  private light=new T.PointLight(0xff7b35,0,7,1.8);
  private sphere=new T.IcosahedronGeometry(1,1);
  private shard=new T.ConeGeometry(1,2,5);
  private palettes={fire:[glow(0xffdc77),glow(0xff8036),glow(0x9a3038),glow(0x514a45,.17)],ice:[glow(0xc5ffff),glow(0x5ecfe7),glow(0x3873a5)]};
  constructor(scene:T.Scene){scene.add(this.root,this.light);}
  get busy(){return this.casts.length>0;}
  get count(){return this.particles.length;}
  private particle(position:T.Vector3,velocity:T.Vector3,color:Spell,index:number,size:number,life:number,gravity=0){
    if(this.particles.length>=220)return;
    const mesh=new T.Mesh(color==='ice'?this.shard:this.sphere,this.palettes[color][index]);
    mesh.position.copy(position);mesh.scale.setScalar(size);this.root.add(mesh);
    this.particles.push({mesh,velocity,spin:new T.Vector3(random(-4,4),random(-4,4),random(-4,4)),age:0,life,gravity,bounce:false,scale:size});
  }
  cast(kind:Spell,start:T.Vector3,end:T.Vector3,onImpact:()=>void,origin?:()=>T.Vector3):boolean {
    if(this.busy)return false;
    const bolt=new T.Group();bolt.position.copy(start);
    if(kind==='fire'){
      bolt.add(new T.Mesh(new T.IcosahedronGeometry(.17,1),this.palettes.fire[0]));
      const corona=new T.Mesh(new T.IcosahedronGeometry(.26,1),glow(0xf97633,.5));bolt.add(corona);
      // Three curling licks of flame around a hot, compact core.
      for(let i=0;i<3;i++){
        const points=Array.from({length:14},(_,n)=>new T.Vector3(Math.cos(n*.45+i*2.1)*(.1+n*.006),Math.sin(n*.45+i*2.1)*(.1+n*.006),n*.04));
        const tube=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.018,4,false),this.palettes.fire[1]);bolt.add(tube);
      }
    }else{
      const spear=new T.Mesh(new T.ConeGeometry(.12,1.4,6),this.palettes.ice[0]);spear.rotation.x=Math.PI/2;bolt.add(spear);
      for(let i=0;i<3;i++){
        const halo=new T.Mesh(new T.TorusGeometry(.24+i*.06,.015,4,20),this.palettes.ice[1]);halo.position.z=i*.15;halo.rotation.z=i*.7;bolt.add(halo);
      }
    }
    bolt.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),end.clone().sub(start).normalize());
    this.root.add(bolt);this.casts.push({kind,age:0,start:start.clone(),end:end.clone(),bolt,impacted:false,onImpact,origin});
    this.ring(start.clone().setY(.095),kind==='fire'?0xf6b85d:0x91e8f2,.7,.5);
    return true;
  }
  private ring(p:T.Vector3,color:number,life:number,speed:number){
    const mesh=new T.Mesh(new T.TorusGeometry(.35,.015,4,48),glow(color,.85));mesh.rotation.x=Math.PI/2;mesh.position.copy(p);this.root.add(mesh);
    this.rings.push({mesh,age:0,life,speed});
  }
  private impact(c:Cast){
    const p=c.end.clone();this.light.position.copy(p);this.light.color.set(c.kind==='fire'?0xff833a:0x91e8ff);this.light.intensity=9;
    if(c.kind==='fire'){
      // Radial flash, licks, then ascending smoke/embers: distinct phases, not a generic colored spray.
      this.ring(p.clone().setY(.10),0xffcc6c,.65,3.2);
      for(let i=0;i<65;i++){
        const a=random(0,Math.PI*2),v=random(.8,3.5);
        this.particle(p,new T.Vector3(Math.cos(a)*v,random(.7,3.9),Math.sin(a)*v),'fire',i%3,random(.025,.16),random(.4,.9),-3.7);
      }
      for(let i=0;i<16;i++)this.particle(p.clone().add(new T.Vector3(random(-.25,.25),.1,random(-.25,.25))),new T.Vector3(random(-.55,.55),random(.6,1.2),random(-.55,.55)),'fire',3,random(.09,.2),random(.9,1.4));
    }else{
      this.ring(p.clone().setY(.09),0x9eebfb,1,2.2);
      // Crystals grow radially, shatter, and fall as sharp fragments.
      for(let i=0;i<24;i++){
        const a=i*Math.PI*2/24;
        this.particle(p.clone().add(new T.Vector3(Math.cos(a)*.25,-.25,Math.sin(a)*.25)),new T.Vector3(Math.cos(a)*1.1,random(1.3,2.3),Math.sin(a)*1.1),'ice',i%3,random(.075,.19),random(.65,1.15),-4.5);
      }
      for(let i=0;i<35;i++)this.particle(p,new T.Vector3(random(-2,2),random(.2,2.3),random(-2,2)),'ice',i%3,.028,random(.4,.8),-1);
    }
    c.onImpact();
  }
  /** The planks themselves become debris, preserving their material, shape and world transform. */
  shatter(crate:T.Group){
    const center=new T.Vector3();crate.getWorldPosition(center);crate.updateWorldMatrix(true,true);
    const children=[...crate.children];
    for(const obj of children){
      if(!(obj instanceof T.Mesh))continue;
      const world=obj.matrixWorld.clone();crate.remove(obj);this.root.add(obj);obj.matrix.copy(world);obj.matrix.decompose(obj.position,obj.quaternion,obj.scale);
      this.particles.push({mesh:obj,velocity:obj.position.clone().sub(center).multiplyScalar(4).add(new T.Vector3(random(-1,1),random(2.1,4),random(-1,1))),spin:new T.Vector3(random(-7,7),random(-7,7),random(-7,7)),age:0,life:3.3,gravity:-8,bounce:true,scale:1});
    }
    crate.removeFromParent();
  }
  update(dt:number){
    this.light.intensity=Math.max(0,this.light.intensity-dt*11);
    for(const c of this.casts){
      c.age+=dt;if(c.age<.35&&c.origin)c.start.copy(c.origin());const t=Math.max(0,Math.min(1,(c.age-.35)/.58));c.bolt.position.lerpVectors(c.start,c.end,t);c.bolt.position.y+=Math.sin(t*Math.PI)*(c.kind==='fire'?.55:.08);
      c.bolt.rotateZ(dt*(c.kind==='fire'?5:9));
      if(!c.impacted){
        for(let i=0;i<2;i++)this.particle(c.bolt.position,new T.Vector3(random(-.15,.15),random(-.15,.25),random(-.15,.15)),c.kind,i%2,c.kind==='fire'?.065:.03,.27);
      }
      if(t>=1&&!c.impacted){c.impacted=true;this.remove(c.bolt);this.impact(c);}
    }
    this.casts=this.casts.filter(c=>c.age<1.8);
    for(const p of this.particles){
      p.age+=dt;p.velocity.y+=p.gravity*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=p.spin.x*dt;p.mesh.rotation.y+=p.spin.y*dt;p.mesh.rotation.z+=p.spin.z*dt;
      if(p.bounce&&p.mesh.position.y<.10){p.mesh.position.y=.10;p.velocity.y=Math.abs(p.velocity.y)*.27;p.velocity.x*=.65;p.velocity.z*=.65;p.spin.multiplyScalar(.5);}
      if(!p.bounce)p.mesh.scale.setScalar(p.scale*Math.max(.01,1-p.age/p.life)*(p.mesh.material===this.palettes.fire[3]?2.5:1));
      else if(p.age>p.life-.45)p.mesh.scale.multiplyScalar(Math.max(.05,1-dt*9));
    }
    this.particles=this.particles.filter(p=>{if(p.age<p.life)return true;this.remove(p.mesh,p.bounce);return false;});
    this.rings=this.rings.filter(r=>{r.age+=dt;r.mesh.scale.setScalar(1+r.age*r.speed*3);(r.mesh.material as T.MeshBasicMaterial).opacity=.85*(1-r.age/r.life);if(r.age<r.life)return true;this.remove(r.mesh);return false;});
  }
  private remove(object:T.Object3D,disposeMaterial=false){
    object.removeFromParent();object.traverse(child=>{if(child instanceof T.Mesh){if(child.geometry!==this.sphere&&child.geometry!==this.shard)child.geometry.dispose();const materials=Array.isArray(child.material)?child.material:[child.material];for(const m of materials)if(disposeMaterial||![...this.palettes.fire,...this.palettes.ice].includes(m))m.dispose();}});
  }
  dispose(){for(const obj of [...this.root.children])this.remove(obj);this.root.removeFromParent();this.light.removeFromParent();this.sphere.dispose();this.shard.dispose();for(const m of [...this.palettes.fire,...this.palettes.ice])m.dispose();}
}
