import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {BODIES,GEAR,RIG_VERSION,gaitFoot,solveLeg,requireGearFit,type BodyId,type HairId,type GearId} from './fit';
import type {SampleMaterials} from './materials';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
type Weights=(p:T.Vector3)=>[string,number][];
interface Part {mesh:T.SkinnedMesh;kind:'base'|'hair'|'gear';item?:GearId;covered?:string}
/** Genuine volumetric meshes, a shared skeleton and anatomy-derived garment shells. */
export class RigCharacter {
 readonly root=new T.Group();readonly rig=RIG_VERSION;
 private bones:Record<string,T.Bone>={};private indices:Record<string,number>={};private skeleton!:T.Skeleton;private parts:Part[]=[];private clock=0;private travel=0;private scale=1;private walk=0;private swingTime=2;
 body:BodyId;hair:HairId='short';showEquipment=false;
 gear=new Set<GearId>(['armor','weapon','boots','gloves','cape']);
 constructor(body:BodyId,private materials:SampleMaterials,private caster=false){this.body=body;this.build();}
 setBody(body:BodyId){this.body=body;this.releaseGeometry();this.build();}
 setHair(hair:HairId){this.hair=hair;this.releaseGeometry();this.build();}
 setGear(item:GearId,on:boolean){requireGearFit(this.body,item);if(on)this.gear.add(item);else this.gear.delete(item);this.visibility();}
 setEquipment(on:boolean){this.showEquipment=on;this.visibility();}
 socket(name:string){this.root.updateMatrixWorld(true);return this.bones[name]?.getWorldPosition(new T.Vector3())??this.root.getWorldPosition(new T.Vector3());}
 private build(){
  const p=BODIES[this.body],s=p.height/2.30;this.scale=s;this.clock=0;this.travel=0;this.walk=0;this.swingTime=2;this.bones={};this.indices={};
  const positions:Record<string,T.Vector3>={hips:V(0,1*s,0),spine:V(0,1.18*s,0),chest:V(0,1.45*s,0),neck:V(0,1.72*s,0),head:V(0,1.84*s,0),cloakL:V(-.20,1.57*s,-.23),cloakR:V(.20,1.57*s,-.23)};
  for(const [side,sign] of [['L',-1],['R',1]] as const){positions['upperArm'+side]=V(sign*p.shoulder,1.62*s,0);positions['forearm'+side]=V(sign*(p.shoulder+.075),1.22*s,0);positions['hand'+side]=V(sign*(p.shoulder+.09),.86*s,.02);positions['thigh'+side]=V(sign*.15,1*s,0);positions['shin'+side]=V(sign*.15,.54*s,0);positions['foot'+side]=V(sign*.15,.06*s,0);}
  const parents:Record<string,string>={spine:'hips',chest:'spine',neck:'chest',head:'neck',cloakL:'chest',cloakR:'chest'};for(const side of ['L','R']){parents['upperArm'+side]='chest';parents['forearm'+side]='upperArm'+side;parents['hand'+side]='forearm'+side;parents['thigh'+side]='hips';parents['shin'+side]='thigh'+side;parents['foot'+side]='shin'+side;}
  for(const name of Object.keys(positions)){const bone=new T.Bone();bone.name=name;bone.position.copy(positions[name]).sub(parents[name]?positions[parents[name]]:V());this.bones[name]=bone;this.indices[name]=Object.keys(this.indices).length;}
  for(const name of Object.keys(positions)){const bone=this.bones[name];if(parents[name])this.bones[parents[name]].add(bone);else this.root.add(bone);}
  this.root.updateMatrixWorld(true);this.skeleton=new T.Skeleton(Object.values(this.bones));
  const one=(bone:string):Weights=>()=>[[bone,1]];
  const torso:Weights=pos=>{const y=pos.y/s;if(y<1.18){const t=T.MathUtils.clamp((y-1)/.18,0,1);return [['hips',1-t],['spine',t]];}const t=T.MathUtils.clamp((y-1.18)/.27,0,1);return [['spine',1-t],['chest',t]];};
  const outfit=this.caster?this.materials.cloth:this.materials.green;
  this.box(V(0,1.38*s,p.depth+.045),V(.060,.54*s,.022),this.materials.leather,torso,'base',undefined,'tunic',-.52);
  this.box(V(0,1.54*s,p.depth+.048),V(.085,.045,.024),this.materials.gold,torso,'base',undefined,'tunic');
  const head=p.head;
  this.part(this.loft([[1.04*s,p.waist+.008,p.depth],[1.21*s,p.waist,p.depth],[1.47*s,p.chest,p.depth+.015],[1.61*s,p.shoulder*.87,p.depth*.91],[1.69*s,.105,.095]]),this.caster?this.materials.cloth:this.materials.green,torso,'base',undefined,'tunic');
  this.part(this.loft([[1.67*s,.088,.075],[1.85*s,.091,.079]]),this.materials.skin,one('neck'),'base');
  this.part(this.loft([[1.82*s,head*.56,.105,.025],[1.90*s,head*.79,.145,.012],[2.02*s,head,.171],[2.13*s,head*.94,.166],[2.24*s,head*.60,.116],[2.29*s,.018,.028]]),this.materials.face(this.body.startsWith('female'),head,s),one('head'),'base');
  for(const sign of [-1,1])this.ellipsoid(V(sign*head*.97,2.005*s,-.01),V(.037,.065,.027),this.materials.skin,one('head'),'base');
  const hairMat=this.caster?this.materials.hairBrown:this.materials.hairRed;
  this.hairCap(head,s,hairMat,one('head'));
  // Crown locks are short; the face and forehead are never covered by a giant hair sprite.
  for(let i=0;i<6;i++){const g=new T.SphereGeometry(1,10,7);g.scale(.063,.095,.035);g.rotateZ(-.8);g.translate((i-2.5)*.055,2.17*s,.125+(i%2)*.018);this.part(g,hairMat,one('head'),'hair');}
  if(this.hair!=='short'){
   for(let i=0;i<10;i++){const y=(2.02-i*.055)*s,z=-.23-i*.013;this.ellipsoid(V(this.hair==='braid'?.14:0,y,z),V(this.hair==='braid'?.048:.075,.055,.043),hairMat,one('head'),'hair');}
   this.ellipsoid(V(this.hair==='braid'?.14:0,1.75*s,-.30),V(.055,.025,.05),this.materials.leather,one('head'),'hair');
  }
  for(const [side,sign] of [['L',-1],['R',1]] as const){
   const x=sign*.15,armx=sign*p.shoulder,elbowx=sign*(p.shoulder+.075),wristx=sign*(p.shoulder+.09),r=p.limb,thigh=r*1.46,shin=r*1.12;
   const armWeights:Weights=pos=>{const t=T.MathUtils.clamp((1.29-pos.y/s)/.14,0,1);return [['upperArm'+side,1-t],['forearm'+side,t]];};
   this.part(this.loft([[.99*s,thigh*.9,thigh*.92],[.91*s,thigh,thigh],[.72*s,thigh*.87,thigh*.82],[.55*s,shin*.94,shin*.94]],x),this.materials.leather,pos=>{const t=T.MathUtils.clamp((.61-pos.y/s)/.12,0,1);return [['thigh'+side,1-t],['shin'+side,t]];},'base');
   this.part(this.loft([[.55*s,shin,shin],[.35*s,shin*.83,shin*.86],[.11*s,shin*.72,shin*.76]],x),this.materials.leather,one('shin'+side),'base');
   this.part(this.loft([[.015,.105,.16,.075],[.07,.112,.19,.075],[.17*s,.084,.12,.045]],x),this.materials.leather,one('foot'+side),'base',undefined,'shoes');
   this.part(this.loft([[1.64*s,r*1.34,r*1.30],[1.49*s,r*1.34,r*1.31],[1.43*s,r*1.26,r*1.25]],armx,elbowx,wristx),outfit,armWeights,'base',undefined,'tunic');
   this.part(this.loft([[1.63*s,r*1.18,r*1.18],[1.48*s,r*1.20,r*1.15],[1.23*s,r*.88,r*.92],[1.02*s,r*.87,r*.80],[.88*s,r*.62,r*.63]],armx,elbowx,wristx),this.materials.skin,armWeights,'base');
   this.ellipsoid(V(wristx,.81*s,.036),V(.052,.077,.040),this.materials.skin,one('hand'+side),'base',undefined,'hands');
   this.part(this.loft([[.12*s,shin+.025,shin+.024],[.39*s,shin+.025,shin+.026],[.54*s,shin+.023,shin+.025]],x),this.materials.steel,one('shin'+side),'gear','boots');
   this.part(this.loft([[.018,.123,.19,.073],[.085,.127,.208,.076],[.20*s,.105,.13,.044]],x),this.materials.steel,one('foot'+side),'gear','boots');
   this.part(this.loft([[.86*s,r+.028,r+.028],[1.07*s,r+.035,r+.026],[1.13*s,r+.038,r+.031]],wristx),this.materials.leather,one('forearm'+side),'gear','gloves');
   this.ellipsoid(V(wristx,.81*s,.036),V(.07,.084,.055),this.materials.leather,one('hand'+side),'gear','gloves');
   this.ellipsoid(V(sign*(p.shoulder+.006),1.60*s,0),V(r*1.78,.126,r*1.7),this.materials.steel,one('upperArm'+side),'gear','armor');
   this.ellipsoid(V(x,.55*s,shin+.026),V(shin*.94,.11,.041),this.materials.steel,one('shin'+side),'gear','armor');
  }
  this.part(this.loft([[1.055*s,p.waist+.042,p.depth+.039],[1.24*s,p.waist+.039,p.depth+.038],[1.48*s,p.chest+.037,p.depth+.052],[1.61*s,p.shoulder*.87+.035,p.depth*.91+.035],[1.69*s,.14,.132]]),this.materials.steel,torso,'gear','armor');
  this.part(this.loft([[1.08*s,p.waist+.048,p.depth+.045],[1.115*s,p.waist+.048,p.depth+.045]]),this.materials.gold,torso,'gear','armor');
  this.box(V(0,1.445*s,p.depth+.065),V(.11,.10,.015),this.materials.gold,one('chest'),'gear','armor');
  this.part(this.loft([[1.056*s,p.waist+.018,p.depth+.013],[1.106*s,p.waist+.019,p.depth+.014]]),this.materials.leather,torso,'base');
  this.box(V(0,1.083*s,p.depth+.025),V(.095,.075,.022),this.materials.gold,one('hips'),'base');
  this.helmet(head,s,one('head'));
  this.cape(s,p.depth,p.shoulder);
  const handX=p.shoulder+.09;
  if(this.caster){
   this.cylinder(V(handX,.23*s,.055),V(handX,1.84*s,.055),.027,this.materials.leather,one('handR'),'weapon');
   this.ellipsoid(V(handX,1.86*s,.055),V(.10,.12,.085),this.materials.flat(0x579ca7,.3),one('handR'),'gear','weapon');
   const ring=new T.TorusGeometry(.12,.014,7,20);ring.translate(handX,1.87*s,.055);this.part(ring,this.materials.gold,one('handR'),'gear','weapon');
  }else{
   this.cylinder(V(handX,.80*s,.015),V(handX,.80*s,.21),.029,this.materials.leather,one('handR'),'weapon');
   this.box(V(handX,.80*s,.205),V(.22,.036,.047),this.materials.gold,one('handR'),'gear','weapon');
   const shape=new T.Shape();shape.moveTo(-.045,0);shape.lineTo(.045,0);shape.lineTo(.032,.62);shape.lineTo(0,.78);shape.lineTo(-.032,.62);shape.closePath();const blade=new T.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.009,bevelThickness:.008});blade.rotateX(Math.PI/2);blade.translate(handX,.80*s,.24);this.part(blade,this.materials.steel,one('handR'),'gear','weapon');
  }
  const shieldx=-p.shoulder-.09;
  const shield=new T.CylinderGeometry(.24,.24,.047,16);shield.rotateX(Math.PI/2);shield.translate(shieldx,.92*s,.13);this.part(shield,this.materials.steel,one('handL'),'gear','shield');
  const trim=new T.TorusGeometry(.234,.017,6,22);trim.translate(shieldx,.92*s,.16);this.part(trim,this.materials.gold,one('handL'),'gear','shield');
  this.ellipsoid(V(shieldx,.92*s,.168),V(.06,.06,.03),this.materials.gold,one('handL'),'gear','shield');
  this.batchParts();this.visibility();this.root.updateMatrixWorld(true);
 }
 private visibility(){for(const part of this.parts){const active=this.showEquipment;part.mesh.visible=part.kind==='gear'?active&&this.gear.has(part.item!):part.kind==='hair'?!(active&&this.gear.has('helmet')):!part.covered||!active||![...this.gear].some(id=>GEAR[id].covers.includes(part.covered!));}}
 private part(geometry:T.BufferGeometry,material:T.Material,weights:Weights,kind:Part['kind'],item?:GearId,covered?:string){
  const pos=geometry.getAttribute('position'),ids:number[]=[],values:number[]=[];
  for(let i=0;i<pos.count;i++){const w=weights(V(pos.getX(i),pos.getY(i),pos.getZ(i)));for(let j=0;j<4;j++){ids.push(w[j]?this.indices[w[j][0]]:0);values.push(w[j]?.[1]??0);}}
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(values,4));
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name=kind==='gear'?`equipment-${item}`:covered??kind;mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);mesh.bind(this.skeleton);this.parts.push({mesh,kind,item,covered});return mesh;
 }
 private loft(rings:number[][],x=0,elbowx=x,wristx=x){rings=[...rings].sort((a,b)=>a[0]-b[0]);const n=20,vs:number[]=[],uv:number[]=[],idx:number[]=[];const ymin=rings[0][0],ymax=rings[rings.length-1][0];
  for(let i=0;i<rings.length;i++){const [y,rx,rz,z=0]=rings[i];const xx=elbowx===x?x:y/this.scale>=1.22?T.MathUtils.lerp(elbowx,x,T.MathUtils.clamp((y/this.scale-1.22)/.4,0,1)):T.MathUtils.lerp(wristx,elbowx,T.MathUtils.clamp((y/this.scale-.86)/.36,0,1));
   for(let j=0;j<=n;j++){const a=j*Math.PI*2/n;vs.push(xx+Math.cos(a)*rx,y,z+Math.sin(a)*rz);uv.push(j/n,(y-ymin)/(ymax-ymin||1));}}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;idx.push(a,b,a+1,a+1,b,b+1);}
  for(const [ring,flip]of [[0,true],[rings.length-1,false]] as const){for(let j=1;j<n-1;j++){const a=ring*(n+1);if(flip)idx.push(a,a+j,a+j+1);else idx.push(a,a+j+1,a+j);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
 private ellipsoid(p:T.Vector3,scale:T.Vector3,m:T.Material,w:Weights,kind:Part['kind'],item?:GearId,covered?:string){const g=new T.SphereGeometry(1,16,10);g.scale(scale.x,scale.y,scale.z);g.translate(p.x,p.y,p.z);return this.part(g,m,w,kind,item,covered);}
 private box(p:T.Vector3,scale:T.Vector3,m:T.Material,w:Weights,kind:Part['kind'],item?:GearId,covered?:string,angle=0){const g=new T.BoxGeometry(scale.x,scale.y,scale.z);g.rotateZ(angle);g.translate(p.x,p.y,p.z);return this.part(g,m,w,kind,item,covered);}
 private cylinder(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,w:Weights,item:GearId){const d=b.clone().sub(a),g=new T.CylinderGeometry(r,r,d.length(),12);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);this.part(g,m,w,'gear',item);}
 private hairCap(r:number,s:number,m:T.Material,w:Weights){const g=this.loft([[1.98*s,r+.025,.184],[2.15*s,r+.03,.186],[2.26*s,r*.63,.13],[2.32*s,.018,.03]]);const pos=g.getAttribute('position');for(let i=0;i<21;i++){const z=pos.getZ(i);pos.setY(i,(z>0?2.135:1.98)*s);}pos.needsUpdate=true;g.computeVertexNormals();this.part(g,m,w,'hair');}
 private helmet(r:number,s:number,w:Weights){this.part(this.loft([[2.095*s,r+.040,.209],[2.19*s,r*.91+.04,.182],[2.30*s,.075,.072]]),this.materials.steel,w,'gear','helmet');this.part(this.loft([[2.09*s,r+.046,.212],[2.115*s,r+.046,.212]]),this.materials.gold,w,'gear','helmet');for(const sign of [-1,1])this.box(V(sign*(r+.035),2.015*s,-.02),V(.035,.18,.19),this.materials.steel,w,'gear','helmet');}
 private cape(s:number,depth:number,shoulder:number){const vs:number[]=[],uv:number[]=[],idx:number[]=[];for(let row=0;row<6;row++)for(let col=0;col<7;col++){const t=row/5,u=col/6;vs.push((u-.5)*(shoulder*1.95+t*.22), (1.63-t*.72)*s,-depth-.09-t*.17+Math.sin(u*Math.PI*6)*.022);uv.push(u,t);}
  for(let row=0;row<5;row++)for(let col=0;col<6;col++){const a=row*7+col;idx.push(a,a+1,a+7,a+1,a+8,a+7);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=this.caster?this.materials.cloth:this.materials.green;
  const cloak=m.clone();cloak.side=T.DoubleSide;cloak.userData.owned=true;this.part(g,cloak,p=>{const t=T.MathUtils.clamp((1.6-p.y/s)/.7,0,1)*.65;return [['chest',1-t],[p.x<0?'cloakL':'cloakR',t]];},'gear','cape');}
 strike(){this.swingTime=0;}
 update(dt:number,moving:number,cast:number,spell:'fire'|'ice'|null){this.clock+=dt;this.travel+=moving;this.swingTime+=dt;this.walk=T.MathUtils.damp(this.walk,moving>0?1:0,18,dt);const s=this.scale,phase=this.travel/(1.08*s);for(const bone of Object.values(this.bones))bone.rotation.set(0,0,0);
  const bob=T.MathUtils.lerp(.004*Math.sin(this.clock*2),.018*Math.sin(phase*Math.PI*4),this.walk);this.bones.hips.position.y=.95*s+bob;
  for(const [side,sign]of [['L',-1],['R',1]] as const){const foot=gaitFoot(phase,sign);foot.z*=this.walk;foot.y*=this.walk;const pose=solveLeg(.95*s+bob,.06*s+foot.y*s,foot.z*s,.46*s,.48*s);this.bones['thigh'+side].rotation.x=pose.thigh;this.bones['shin'+side].rotation.x=pose.shin;this.bones['foot'+side].rotation.x=pose.foot;this.bones['upperArm'+side].rotation.x=T.MathUtils.lerp(Math.sin(this.clock*1.9)*.025,Math.sin(phase*Math.PI*2+(sign>0?Math.PI:0))*.24,this.walk);this.bones['forearm'+side].rotation.x=-.09;}
  this.bones.chest.rotation.y=Math.sin(phase*Math.PI*2)*.035*this.walk;
  this.bones.cloakL.rotation.x=-.05-Math.sin(this.clock*3.1)*.055-this.walk*.11;this.bones.cloakR.rotation.x=-.05-Math.sin(this.clock*3.1+.6)*.055-this.walk*.11;
  if(cast>0){const charge=Math.sin(Math.min(1,cast/.4)*Math.PI/2),release=cast>.7?Math.max(0,(1-cast)/.3):1,strength=charge*release;this.bones.upperArmR.rotation.x=-1.28*strength;this.bones.forearmR.rotation.x=-.44*strength;this.bones.handR.rotation.z=-.18*strength;this.bones.upperArmL.rotation.x=-.85*strength;this.bones.forearmL.rotation.x=-.38*strength;this.bones.chest.rotation.x=.05*strength;this.bones.head.rotation.x=-.06*strength;if(spell==='fire')this.bones.chest.rotation.y=-.09*strength;}
  if(this.swingTime<1.05&&cast===0){const t=this.swingTime/1.05,windup=Math.min(1,t/.34),cut=T.MathUtils.smoothstep(t,.34,.62),recovery=1-T.MathUtils.smoothstep(t,.65,1);this.bones.upperArmR.rotation.x=(-1.1*windup+.8*cut)*recovery;this.bones.upperArmR.rotation.z=(-.65*windup+1.1*cut)*recovery;this.bones.forearmR.rotation.x=(-.65*windup+.35*cut)*recovery;this.bones.chest.rotation.y=(-.28*windup+.6*cut)*recovery;this.bones.head.rotation.y=-this.bones.chest.rotation.y*.45;}
  this.root.updateMatrixWorld(true);
 }
 snapshot(){return {body:this.body,hair:this.hair,equipped:this.showEquipment,gear:[...this.gear],rig:this.rig,height:BODIES[this.body].height,skinMeshes:this.parts.length};}
 private batchParts(){
  const groups=new Map<string,Part[]>();for(const p of this.parts){const m=p.mesh.material as T.Material;const key=[m.uuid,p.kind,p.item??'',p.covered??''].join('/');const items=groups.get(key)??[];items.push(p);groups.set(key,items);}
  const result:Part[]=[];for(const items of groups.values()){if(items.length===1){result.push(items[0]);continue;}const geometry=mergeGeometries(items.map(p=>p.mesh.geometry));if(!geometry){result.push(...items);continue;}const first=items[0];for(const p of items){p.mesh.removeFromParent();p.mesh.geometry.dispose();}const mesh=new T.SkinnedMesh(geometry,first.mesh.material);mesh.name=first.mesh.name;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);mesh.bind(this.skeleton);result.push({...first,mesh});}this.parts=result;
 }
 private releaseGeometry(){for(const p of this.parts){p.mesh.geometry.dispose();if(!Array.isArray(p.mesh.material)&&p.mesh.material.userData.owned)p.mesh.material.dispose();p.mesh.removeFromParent();}this.parts=[];this.root.clear();this.skeleton?.dispose();}
 dispose(){this.releaseGeometry();}
}
