import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { compose, type Avatar, type Sheet } from '../../avatar/lpc';
import { PRESET_AVATARS } from '../../avatar/presets';
import { directionRow } from '../../avatar/direction';
import { ARENA_SLOTS, spriteFacing, type CameraView, type ArenaSlot } from './layout';
import { ArenaEffects, type Spell } from './effects';
import { riverMaterial } from './water';
import {ArenaOrbit,type OrbitSnapshot} from './orbit';
import {SampleMaterials} from './materials';
import {RigCharacter} from './character';
import { DirectionalCharacter, loadDirectionalAssets, type DirectionalAssets } from './directionalCharacter';
import { PixelStatue } from './statue';
import { RiggedHero, type HeroManifest } from './riggedHero';
import { SAMPLE_DIRECTIONS, type SampleEquipment, type SampleDirection } from './directional';
import {dressEnvironment} from './environment';
export interface Label { id:string; name:string; x:number; y:number; selected:boolean; enemy:boolean }
export interface ArenaStats { fps:number; frameMs?:number; draws:number; triangles:number; particles:number; crate:{x:number;y:number;alive:boolean}; slots:{id:string;x:number;y:number}[];orbit?:OrbitSnapshot;models?:ReturnType<RigCharacter['snapshot']>[];sprites?:ReturnType<DirectionalCharacter['snapshot']>[];walkingDemo?:boolean;statue?:ReturnType<PixelStatue['snapshot']>;hero?:ReturnType<RiggedHero['snapshot']>;actors?:{id:string;slot:string;moving:boolean;x:number;y:number;z:number}[] }
interface Actor { id:string; name:string; team:'player'|'enemy'; slot:string; root:T.Group; visual?:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>; sheets?:Record<string,Sheet>; textures?:Record<string,T.CanvasTexture>; attack:string; until:number; yaw:number; rig?:RigCharacter;pixel?:DirectionalCharacter;statue?:PixelStatue;hero?:RiggedHero;path?:T.Vector3[];pathIndex?:number;speed?:number;ring?:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>;lift?:number;liftV?:number;sway?:T.Vector2;swayV?:T.Vector2;squash?:number;castAt?:number;spell?:Spell;travel?:number; target?:T.Vector3 }
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const url=(path:string)=>new URL(path,document.baseURI).href;
/** Isolated renderer: never writes decks, campaign progress, hero appearance or battle settings. */
// reposicionar: altura em que o personagem flutua sob o cursor e ponto do corpo em torno do qual ele balança (o peito)
const HOLD=1.75,GRIP=.9;
export class SampleArena {
  readonly renderer:T.WebGLRenderer;
  readonly scene=new T.Scene();
  readonly camera=new T.OrthographicCamera(-15,15,10,-10,.1,150);
  readonly effects:ArenaEffects;private fill=new T.DirectionalLight(0xdceaf7,.8);
  private actors:Actor[]=[];
  private floors:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>[]=[];
  private branches:T.Object3D[]=[];
  private flames:T.Mesh[]=[];
  private crate=new T.Group();
  private river?:Reflector;
  private arena?:T.Group;
  private time={value:0};
  private raf=0;private last=0;private frames=0;private reportAt=0;private elapsed=0;
  private inspecting=false;private occluded=new Set<T.Object3D>();
  private disposed=false;private wind=true;private movingWater=true;private slots=true;
  readonly orbit:ArenaOrbit;private materials?:SampleMaterials;private prototypes=false;private directionalAssets?:DirectionalAssets;private directionalPreview=true;private chibi?:T.Object3D;private heroAsset?:{scene:T.Object3D;clips:T.AnimationClip[];manifest:HeroManifest};private heroLook:'heroi'|'chibi'|'sprite'='heroi';
  private selected='brunhild';private mode:'inspect'|'move'|'fire'|'ice'='inspect';
  private renderMs=0;
  // personagem suspenso pelo jogador (reposicionar): flutua sob o cursor, balança de leve e cai no slot ao soltar
  private grab?:{actor:Actor;pointer:number;from:string;point:T.Vector3;vel:T.Vector3;last:T.Vector3;energy:number;slot?:ArenaSlot};private ground=new T.Plane(new T.Vector3(0,1,0),0);
  private ray=new T.Raycaster();private ndc=new T.Vector2();private shadowMat:T.MeshBasicMaterial;
  constructor(private canvas:HTMLCanvasElement,private onLabels:(v:Label[])=>void,private onStats:(v:ArenaStats)=>void,private onNote:(note:string)=>void,private onError:(message:string)=>void){
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.06;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
    this.scene.background=new T.Color(0x6b8580);this.scene.fog=new T.Fog(0x6b8580,40,90);
    this.scene.add(new T.HemisphereLight(0xc0d8df,0x615033,.95));
    const sun=new T.DirectionalLight(0xffe0ab,2.25);sun.position.set(-8,18,9);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.1,far:70});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;sun.shadow.radius=2;this.scene.add(sun);
    const rim=new T.DirectionalLight(0x9ca4d0,.3);rim.position.set(7,9,-10);this.scene.add(rim,this.fill,this.fill.target);
    // Contact shadows have grounded feet even for billboards, which cannot supply volumetric shadows.
    const shadow=document.createElement('canvas');shadow.width=64;shadow.height=64;const c=shadow.getContext('2d')!;const g=c.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'rgba(25,31,21,.48)');g.addColorStop(1,'rgba(25,31,21,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
    const st=new T.CanvasTexture(shadow);this.shadowMat=new T.MeshBasicMaterial({map:st,transparent:true,depthWrite:false});
    this.effects=new ArenaEffects(this.scene);
    this.orbit=new ArenaOrbit(canvas,this.camera,this.pick,()=>{},this.tryGrab);this.canvas.addEventListener('pointermove',this.grabMove);this.canvas.addEventListener('pointerup',this.grabEnd);this.canvas.addEventListener('pointercancel',this.grabEnd);this.orbit.update(1);this.canvas.addEventListener('pointermove',this.hover);this.canvas.addEventListener('webglcontextlost',this.contextLost);window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',()=>this.keys.clear());
    this.makeSlots();this.makeCrate();this.setCamera('isometric');
  }
  async load(){
    const [gltf,materials,directional,chibi,hero,heroManifest]=await Promise.all([new GLTFLoader().loadAsync(url('art/sample3d/arena.glb')),SampleMaterials.load(),loadDirectionalAssets(),new GLTFLoader().loadAsync(url('art/sample3d/guerreiro-chibi.glb')),new GLTFLoader().loadAsync(url('art/sample3d/heroi/heroi.glb')),fetch(url('art/sample3d/heroi/heroi.json')).then(r=>r.json() as Promise<HeroManifest>)]);this.heroAsset={scene:hero.scene,clips:hero.animations,manifest:heroManifest};this.materials=materials;this.directionalAssets=directional;this.chibi=chibi.scene;
    if(this.disposed){this.disposeObject(gltf.scene);materials.dispose();return;}
    this.arena=gltf.scene;
    this.arena.traverse(obj=>{
      if(obj.name.startsWith('wind-branch'))this.branches.push(obj);
      if(!(obj instanceof T.Mesh))return;
      obj.castShadow=true;obj.receiveShadow=true;
      for(const mat of (Array.isArray(obj.material)?obj.material:[obj.material])){
        if(!(mat instanceof T.MeshStandardMaterial))continue;
        mat.roughness=.97;
        if(mat.name==='foliage'||mat.name==='grass'||mat.name==='flowers'){mat.side=T.DoubleSide;if(!mat.userData.wind){this.windShader(mat,mat.name==='grass');mat.userData.wind=true;}}
        
      }
    });
    for(const child of this.crate.children){if(child instanceof T.Mesh&&child.geometry instanceof T.BoxGeometry&&child.geometry.parameters.height>.3){const mat=child.material as T.MeshStandardMaterial;mat.map=materials.bark;mat.color.set(0xc9b594);mat.needsUpdate=true;}}
    dressEnvironment(this.arena,materials,this.time);this.scene.add(this.arena);
    const water=riverMaterial();
    this.river=new Reflector(new T.PlaneGeometry(13,34),{textureWidth:512,textureHeight:512,multisample:2,clipBias:.003,shader:{uniforms:water.uniforms,vertexShader:water.vertexShader,fragmentShader:water.fragmentShader}});
    water.dispose();this.river.rotation.x=-Math.PI/2;this.river.position.set(-7.2,-.35,0);this.scene.add(this.river);
    for(const x of [-3.1,3.1]){
      const flame=new T.Mesh(new T.IcosahedronGeometry(.22,1),new T.MeshBasicMaterial({color:0xffbd60}));flame.position.set(x,1.4,-5.8);flame.scale.set(.7,1.5,.7);this.scene.add(flame);this.flames.push(flame);
      const glow=new T.PointLight(0xffaa46,1.5,3,2);glow.position.set(x,1.5,-5.8);this.scene.add(glow);
    }
    await Promise.all([this.makeActor('brunhild','Brunhild','player','player-front-1','slash'),this.makeActor('kael','Kael','player','player-back-0','spellcast')]);this.applyHeroLook();
    if(this.disposed)return;
    for(const a of this.actors)if(a.pixel&&a.visual)a.visual.visible=false;
    this.makeSkeleton();this.resize();this.last=performance.now();this.reportAt=this.last;
    this.raf=requestAnimationFrame(this.tick);
    this.onNote('Escolha uma habilidade e clique no alvo. A caixa de madeira também pode ser destruída.');
  }
  private surfaceShader(mat:T.MeshStandardMaterial){
    mat.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 detailWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ndetailWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 detailWorld;');
      const isStone=/stone|rock/.test(mat.name);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 cell=floor(detailWorld*38.); float n=fract(sin(dot(cell,vec3(12.989,78.233,39.425)))*43758.5453);
        diffuseColor.rgb *= ${isStone?'(.9+floor(n*4.)*.044)':'(.95+floor(n*3.)*.035)'};
        ${mat.name==='earth'?`vec2 p=detailWorld.xz;
        float blades=fract(sin(dot(floor(p*34.),vec2(32.7,79.1)))*4517.);
        diffuseColor.rgb*=.82+floor(blades*5.)*.071;
        float moss=sin(p.x*3.1+sin(p.y*2.3))*sin(p.y*3.3-p.x*.8);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.17,.20,.084),smoothstep(.6,.95,moss)*.16);`:''}
        ${mat.name==='bark'?`float grain=sin(detailWorld.y*2.+detailWorld.x*49.+sin(detailWorld.z*21.)*2.);diffuseColor.rgb*=.89+step(-.2,grain)*.18;`:''}
      `);
    };mat.customProgramCacheKey=()=>`arena-${mat.name}`;
  }
  private windShader(mat:T.MeshStandardMaterial,grass:boolean){
    mat.onBeforeCompile=shader=>{
      shader.uniforms.windTime=this.time;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float windTime;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float phase=position.x*2.1+position.z*.7;
        float flutter=sin(windTime*3.7+position.x*29.+position.z*17.);
        float weight=${grass?'clamp(position.y*3.,0.,1.)':'(.4+.6*abs(sin(position.x*13.+position.z*7.)))'};
        transformed.x+=sin(windTime*1.5+phase)*weight*${grass?'.085':'.022'};
        transformed.z+=flutter*weight*${grass?'.015':'.018'};
      `);
    };mat.customProgramCacheKey=()=>grass?'wind-grass':'wind-leaf';
  }
  private makeSlots(){
    for(const slot of ARENA_SLOTS){
      const geom=new T.PlaneGeometry(2.05,1.82);
      const floor=new T.Mesh(geom,new T.MeshBasicMaterial({color:slot.team==='player'?0x82d6dc:0xf2bc75,transparent:true,opacity:.10,depthWrite:false}));
      floor.rotation.x=-Math.PI/2;floor.position.set(slot.x,slot.y,slot.z);floor.userData.slot=slot;this.scene.add(floor);this.floors.push(floor);
      const edge=new T.LineSegments(new T.EdgesGeometry(geom),new T.LineBasicMaterial({color:slot.team==='player'?0x9bcdd0:0xc3ab79,transparent:true,opacity:.72}));edge.position.z=.003;floor.add(edge);
    }
  }
  private async makeActor(id:string,name:string,team:Actor['team'],slot:string,attack:string){
    const av=PRESET_AVATARS[id];
    const sheets=await Promise.all([compose(av,'idle'),compose(av,attack as 'slash'|'spellcast'),compose(av,'walk')]);if(this.disposed)return;
    const textures=sheets.map(s=>{const tx=new T.CanvasTexture(s.canvas);tx.colorSpace=T.SRGBColorSpace;tx.magFilter=T.NearestFilter;tx.minFilter=T.NearestFilter;tx.generateMipmaps=false;return tx;});
    const h=2.05;const geom=new T.PlaneGeometry(2.05,h);geom.translate(0,h*.375,0);
    const visual=new T.Mesh(geom,new T.MeshBasicMaterial({map:textures[0],transparent:true,alphaTest:.2,side:T.DoubleSide}));
    const root=new T.Group();root.userData.actor=id;root.add(visual);const tile=ARENA_SLOTS.find(s=>s.id===slot)!;root.position.set(tile.x,tile.y,tile.z);
    const shadow=new T.Mesh(new T.PlaneGeometry(1.65,1.1),this.shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.004;shadow.name='sombra';root.add(shadow);this.scene.add(root);
    // anel no chão: aparece ao reposicionar, sob quem pode ser levantado
    const ring=team==='player'?new T.Mesh(new T.RingGeometry(.62,.8,40),new T.MeshBasicMaterial({color:0xffe19a,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide})):undefined;if(ring){ring.rotation.x=-Math.PI/2;ring.position.y=.02;ring.visible=false;root.add(ring);}
    const pixel=id==='brunhild'?new DirectionalCharacter(this.directionalAssets!):undefined;if(pixel)root.add(pixel.visual);visual.visible=!pixel;
    // figura 3D parada do teste: divide o lugar com a amostra 2D de oito vistas
    const statue=pixel&&this.chibi?new PixelStatue(this.chibi):undefined;if(statue){root.add(statue.root);this.scene.traverse(o=>{if(o instanceof T.Light)o.layers.enable(1);});}
    const hero=pixel&&this.heroAsset?new RiggedHero(this.heroAsset.scene,this.heroAsset.clips,this.heroAsset.manifest):undefined;if(hero){root.add(hero.root);this.scene.traverse(o=>{if(o instanceof T.Light)o.layers.enable(1);});}
    this.actors.push({id,name,team,slot,root,visual,pixel,statue,hero,ring,sheets:{idle:sheets[0],attack:sheets[1],walk:sheets[2]},textures:{idle:textures[0],attack:textures[1],walk:textures[2]},attack,until:0,yaw:team==='player'?Math.PI:0});
  }
  private makeSkeleton(){
    const root=new T.Group();root.userData.actor='skeleton';const bone=new T.MeshStandardMaterial({color:0xd2cab0,roughness:1});const cavity=new T.MeshStandardMaterial({color:0x2f3133,roughness:1});const joint=new T.SphereGeometry(1,10,7);
    const mesh=(g:T.BufferGeometry,p:T.Vector3,scale:T.Vector3,material=bone)=>{const m=new T.Mesh(g,material);m.position.copy(p);m.scale.copy(scale);m.castShadow=true;root.add(m);return m;};
    const line=(a:T.Vector3,b:T.Vector3,r=.045)=>{const d=b.clone().sub(a);const m=mesh(new T.CylinderGeometry(r*.85,r,d.length(),7),a.clone().add(b).multiplyScalar(.5),V(1,1,1));m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());};
    // Skull sockets, nasal aperture, mandible and individual teeth, then a visibly open rib cage.
    mesh(joint,V(0,1.62,.005),V(.19,.22,.16));
    for(const x of [-.075,.075])mesh(joint,V(x,1.65,.145),V(.06,.065,.031),cavity);
    mesh(new T.ConeGeometry(.038,.085,3),V(0,1.575,.153),V(1,1,1),cavity);
    mesh(new T.BoxGeometry(.21,.035,.13),V(0,1.47,.025),V(1,1,1));
    for(let i=0;i<7;i++)mesh(new T.BoxGeometry(.024,.029,.026),V((i-3)*.028,1.5,.12),V(1,1,1));
    line(V(0,.82,-.065),V(0,1.44,-.065),.042);
    for(let i=0;i<5;i++){
      const y=1.28-i*.074,w=.23-i*.014;
      const points=Array.from({length:21},(_,n)=>{const a=n*Math.PI*2/20;return V(Math.cos(a)*w,y-Math.abs(Math.cos(a))*.033,Math.sin(a)*.135-.01);});
      mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.022,5,false),V(),V(1,1,1));
    }
    line(V(0,1.31,.126),V(0,.96,.115),.025);
    for(const side of [-1,1]){
      line(V(0,1.39,0),V(side*.27,1.34,0),.035);line(V(side*.27,1.34,0),V(side*.36,1.02,.02));line(V(side*.36,1.02,.02),V(side*.34,.79,.13),.035);
      mesh(joint,V(side*.36,1.02,.02),V(.052,.052,.052));mesh(joint,V(side*.34,.76,.13),V(.055,.078,.033));
      line(V(side*.105,.8,0),V(side*.13,.47,.01),.055);line(V(side*.13,.47,.01),V(side*.15,.14,.04),.038);mesh(joint,V(side*.13,.47,.01),V(.058,.067,.058));
      line(V(side*.15,.12,.01),V(side*.15,.095,.19),.045);
      for(let i=0;i<4;i++)line(V(side*.15+(i-1.5)*.023,.09,.16),V(side*.15+(i-1.5)*.023,.08,.24),.012);
    }
    const hips=new T.Mesh(new T.TorusGeometry(.13,.05,6,12),bone);hips.rotation.x=Math.PI/2;hips.position.y=.82;root.add(hips);
    const boneMeshes=root.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&o.material===bone);
    const parts=boneMeshes.map(m=>{m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix);m.removeFromParent();return g;});
    const merged=mergeGeometries(parts);if(merged){const body=new T.Mesh(merged,bone);body.castShadow=true;root.add(body);}for(const g of parts)g.dispose();
    const tile=ARENA_SLOTS.find(s=>s.id==='enemy-front-0')!;root.position.set(tile.x,tile.y,tile.z);this.scene.add(root);
    const shield=new T.Mesh(new T.CylinderGeometry(.22,.22,.045,12),new T.MeshStandardMaterial({color:0x617877,metalness:.3,roughness:.65}));shield.rotation.x=Math.PI/2;shield.position.set(-.35,.94,.12);shield.name='equipped-shield';root.add(shield);
    const sword=new T.Mesh(new T.BoxGeometry(.055,.65,.027),new T.MeshStandardMaterial({color:0xc1cfd0,metalness:.6,roughness:.35}));sword.position.set(.34,.9,.16);sword.rotation.z=-.2;sword.name='equipped-sword';root.add(sword);
    this.actors.push({id:'skeleton',name:'Esqueleto',team:'enemy',slot:tile.id,root,attack:'slash',until:0,yaw:0});
  }
  private makeCrate(){
    this.crate=new T.Group();this.crate.position.set(3.9,.52,.5);this.crate.userData.crate=true;
    const m=new T.MeshStandardMaterial({color:0x987142,roughness:.95});this.surfaceShader(m);const metal=new T.MeshStandardMaterial({color:0x484e48,metalness:.3,roughness:.8});
    // All boards can detach, including side pieces and bands; no generic substitute debris.
    for(let side=0;side<4;side++)for(let n=0;n<5;n++){
      const mesh=new T.Mesh(new T.BoxGeometry(.168,.88,.056),m.clone());const a=side*Math.PI/2;mesh.position.set(Math.sin(a)*.47+Math.cos(a)*(n-2)*.176,0,Math.cos(a)*.47-Math.sin(a)*(n-2)*.176);mesh.rotation.y=a;mesh.castShadow=true;this.crate.add(mesh);
    }
    for(let n=0;n<5;n++){const mesh=new T.Mesh(new T.BoxGeometry(.176,.057,.94),m.clone());mesh.position.set((n-2)*.176,.46,0);mesh.castShadow=true;this.crate.add(mesh);}
    for(const y of [-.29,.29])for(let side=0;side<4;side++){const mesh=new T.Mesh(new T.BoxGeometry(.97,.058,.034),metal.clone());mesh.rotation.y=side*Math.PI/2;mesh.position.set(Math.sin(side*Math.PI/2)*.49,y,Math.cos(side*Math.PI/2)*.49);this.crate.add(mesh);}
    this.scene.add(this.crate);m.dispose();metal.dispose();
  }
  private pick=(e:PointerEvent)=>{
    if(e.button!==0||this.effects.busy)return;this.pointer(e);
    const hit=this.pickHit();if(!hit)return;
    let item=hit.object;while(item.parent&&!item.userData.crate&&!item.userData.slot&&!item.userData.actor)item=item.parent;
    if(item.userData.crate){if(this.mode==='fire'||this.mode==='ice')this.cast(this.mode,this.crate.position.clone());else this.onNote('A caixa é destrutível. Escolha Brasa do Vazio ou Lança de Geada e clique nela.');return;}
    const slot=(item.userData.slot??ARENA_SLOTS.find(s=>s.id===this.actors.find(a=>a.id===item.userData.actor)?.slot)) as ArenaSlot|undefined;if(!slot)return;const actor=this.actors.find(a=>a.slot===slot.id);
    if(this.mode==='move'){
      if(slot.team!=='player'||actor){this.onNote(actor?`Este slot está ocupado por ${actor.name}. Escolha um slot livre.`:'Escolha um slot do seu campo.');return;}
      const hero=this.actors.find(a=>a.id===this.selected)!;hero.path=undefined;hero.slot=slot.id;hero.target=V(slot.x,slot.y,slot.z);this.onNote(`${hero.name}: ${slot.rank==='front'?'frente':'retaguarda'}, coluna ${slot.column+1}.`);
    }else if((this.mode==='fire'||this.mode==='ice')&&actor?.team==='enemy')this.cast(this.mode,actor.root.position.clone().add(V(0,.9,0)),actor);
    else if(actor){this.selected=actor.id;this.onNote(`${actor.name} · ${slot.rank==='front'?'frente':'retaguarda'}.`);}
  };
  private hover=(e:PointerEvent)=>{if(this.orbit.snapshot().dragging||this.grab)return;this.pointer(e);if(this.mode==='move'&&this.actorAt(e)){this.canvas.style.cursor='grab';return;}const hit=this.pickHit();this.canvas.style.cursor=hit?'pointer':'default';};
  /** Personagem do jogador sob o cursor, medido na tela (vale para sprite, modelo liso ou pixelizado). */
  private actorAt(e:PointerEvent){
    const r=this.canvas.getBoundingClientRect();let best:Actor|undefined,score=1e9;
    for(const a of this.actors){if(a.team!=='player')continue;
      const foot=a.root.position.clone().project(this.camera),head=a.root.position.clone().add(V(0,1.6,0)).project(this.camera);
      const fx=(foot.x*.5+.5)*r.width+r.left,fy=(-foot.y*.5+.5)*r.height+r.top,hy=(-head.y*.5+.5)*r.height+r.top,h=Math.max(24,fy-hy);
      const dx=Math.abs(e.clientX-fx)/(h*.42),dy=(e.clientY-(fy+hy)/2)/(h*.62),d=Math.hypot(dx,dy);if(d<1&&d<score){best=a;score=d;}}
    return best;
  }
  private holdPoint(e:PointerEvent,target:T.Vector3){this.pointer(e);this.ray.setFromCamera(this.ndc,this.camera);this.ground.constant=-(.096+HOLD);return this.ray.ray.intersectPlane(this.ground,target);}
  private tryGrab=(e:PointerEvent)=>{
    if(this.mode!=='move'||this.grab||this.effects.busy)return false;const actor=this.actorAt(e);if(!actor)return false;
    const point=new T.Vector3();if(!this.holdPoint(e,point))return false;
    this.canvas.setPointerCapture(e.pointerId);this.canvas.style.cursor='grabbing';actor.path=undefined;actor.target=undefined;actor.speed=0;this.selected=actor.id;
    actor.sway??=new T.Vector2();actor.swayV??=new T.Vector2();actor.liftV=3.2;actor.hero?.setHeld(true);
    this.grab={actor,pointer:e.pointerId,from:actor.slot,point,vel:new T.Vector3(),last:actor.root.position.clone(),energy:0};this.onNote(`${actor.name} suspenso! Solte sobre um slot livre do seu campo.`);return true;
  };
  private grabMove=(e:PointerEvent)=>{if(this.grab&&e.pointerId===this.grab.pointer)this.holdPoint(e,this.grab.point);};
  private grabEnd=(e:PointerEvent)=>{
    const g=this.grab;if(!g||e.pointerId!==g.pointer)return;this.grab=undefined;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);this.canvas.style.cursor='default';
    const a=g.actor,slot=g.slot??ARENA_SLOTS.find(s=>s.id===g.from)!;a.slot=slot.id;a.hero?.setHeld(false);a.target=undefined;a.root.userData.drop=V(slot.x,slot.y,slot.z);
    this.onNote(g.slot&&g.slot.id!==g.from?`${a.name}: ${slot.rank==='front'?'frente':'retaguarda'}, coluna ${slot.column+1}.`:`${a.name} voltou para o lugar.`);
  };
  private pickHit(){
    const targets:T.Object3D[]=[...this.floors];
    if(this.mode!=='move')for(const root of [this.crate,...this.actors.map(a=>a.root)])root.traverse(o=>{if(o instanceof T.Mesh){let visible=o.visible;o.traverseAncestors(parent=>{visible=visible&&parent.visible;});if(visible&&(Array.isArray(o.material)?o.material.some(m=>m.visible):o.material.visible))targets.push(o);}});
    // Decorative border lines have a wide ray threshold; only surfaces are interactive.
    return this.ray.intersectObjects(targets,false)[0];
  }
  private pointer(e:PointerEvent){const r=this.canvas.getBoundingClientRect();this.ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);}
  private cast(kind:Spell,end:T.Vector3,target?:Actor){
    const hero=this.actors.find(a=>a.id==='brunhild')!;
    const caster=this.actors.find(a=>a.id==='kael')!;const start=this.prototypes&&caster.rig?caster.rig.socket('handR'):caster.root.position.clone().add(V(0,1.1,0));caster.yaw=Math.atan2(end.x-start.x,end.z-start.z);caster.until=this.elapsed+1.25;caster.castAt=this.elapsed;caster.spell=kind;
    this.effects.cast(kind,start,end,()=>{if(target)target.until=this.elapsed+.18;else if(this.crate.parent)this.effects.shatter(this.crate);},()=>this.prototypes&&caster.rig?caster.rig.socket('handR'):start);this.onNote(kind==='fire'?'Brasa do Vazio · núcleo, impacto e fragmentos.':'Lança de Geada · formação, disparo e estilhaços.');
  }
  action(mode:'inspect'|'move'|'fire'|'ice'){this.mode=mode;this.onNote(mode==='move'?'Selecione um personagem: clique e segure para levantá-lo, e solte sobre um slot livre.':mode==='fire'?'Clique no esqueleto ou na caixa para lançar fogo.':mode==='ice'?'Clique no esqueleto ou na caixa para lançar gelo.':'Selecione um personagem para ver sua posição.');}
  setCamera(view:CameraView){this.inspecting=false;for(const o of this.occluded)o.visible=true;this.occluded.clear();this.orbit.preset(view);}
  rotate(amount:number){this.orbit.rotate(amount);}
  changeZoom(amount:number){this.orbit.zoomBy(1+amount);}
  inspectHero(id='brunhild'){const actor=this.actors.find(a=>a.id===id);if(actor){this.selected=id;this.mode='inspect';this.inspecting=true;this.orbit.inspect(actor.root.position,actor.yaw);}}
  setSampleEquipment(on:boolean){this.actors.find(a=>a.pixel)?.pixel?.setEquipment(on);}
  setSampleGear(item:SampleEquipment,on:boolean){this.actors.find(a=>a.pixel)?.pixel?.setGear(item,on);}
  setDirectionalPreview(on:boolean){this.directionalPreview=on;this.applyHeroLook();}
  swingSample(){for(const a of this.actors)a.hero?.play('Golpe');}
  playHero(clip:string){for(const a of this.actors)a.hero?.play(clip);}
  setHeroPiece(name:string,on:boolean){for(const a of this.actors)a.hero?.setPiece(name,on);}
  setHeroLook(look:'heroi'|'chibi'|'sprite'){this.heroLook=look;this.applyHeroLook();}
  setChibiPixels(pixels:number){for(const a of this.actors){a.statue?.setPixels(pixels);a.hero?.setPixels(pixels);}}
  private applyHeroLook(){for(const a of this.actors)if(a.pixel){const hero=this.heroLook==='heroi'&&!!a.hero,chibi=this.heroLook==='chibi'&&!!a.statue,other=hero||chibi;if(a.hero)a.hero.visible=hero;if(a.statue)a.statue.visible=chibi;a.pixel.visual.visible=!other&&this.directionalPreview;if(a.visual)a.visual.visible=!other&&!this.directionalPreview;a.name=hero?'Herói':chibi?'Guerreiro':'Brunhild';}}
  private keys=new Set<string>();
  private keyDown=(e:KeyboardEvent)=>{if(e.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(('wasdqe'.includes(k)&&k.length===1)||k==='shift')this.keys.add(k);};
  private keyUp=(e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());};
  castSample(){const enemy=this.actors.find(a=>a.id==='skeleton');if(enemy&&!this.effects.busy)this.cast('fire',enemy.root.position.clone().add(V(0,.9,0)),enemy);}
  viewSampleDirection(direction:SampleDirection){const a=this.actors.find(a=>a.pixel);if(a){this.selected=a.id;this.mode='inspect';this.inspecting=true;this.orbit.inspectDirection(a.root.position,a.yaw,SAMPLE_DIRECTIONS.indexOf(direction)*Math.PI/4);}}
  walkSample(on:boolean){
    const a=this.actors.find(a=>a.pixel);if(!a)return;
    if(on){
      a.path=[[-.85,1.4],[.85,1.4],[1.65,2.2],[1.65,3.3],[.85,4.1],[-.85,4.1],[-1.65,3.3],[-1.65,2.2]].map(([x,z])=>V(x,.096,z));
      a.pathIndex=0;a.target=a.path[0].clone();this.onNote('Brunhild percorre as oito direções. Gire a câmera para conferir a caminhada e o encaixe das peças.');
    }else{a.path=undefined;const slot=ARENA_SLOTS.find(s=>s.id===a.slot)!;a.target=V(slot.x,slot.y,slot.z);this.onNote('Retornando ao slot.');}
  }
  setWind(on:boolean){this.wind=on;}
  setWater(on:boolean){this.movingWater=on;}
  setSlots(on:boolean){this.slots=on;for(const floor of this.floors)floor.visible=on;}
  setEquipment(on:boolean){const skeleton=this.actors.find(a=>a.id==='skeleton');for(const child of skeleton?.root.children??[])if(child.name.startsWith('equipped-'))child.visible=on;}
  restoreCrate(){if(!this.crate.parent)this.makeCrate();}
  resize(){
    const r=this.canvas.getBoundingClientRect();const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25,Math.sqrt(4_000_000/(w*h))));this.renderer.setSize(w,h,false);this.orbit.resize(w,h);
  }
  private tick=(now:number)=>{
    if(this.disposed)return;if(now-this.last<1000/240-.5){this.raf=requestAnimationFrame(this.tick);return;}const dt=Math.min(.035,(now-this.last)/1000);this.last=now;
    if(!document.hidden){
      if(this.keys.size){const k=this.keys,sp=9*dt;const fast=k.has('shift')?2.5:1;
        // estilo editor: W/S avançam e recuam para onde a câmera olha (aproxima de verdade), A/D andam de lado, Q/E descem e sobem
        this.orbit.pan((k.has('d')?1:0)-(k.has('a')?1:0),(k.has('w')?1:0)-(k.has('s')?1:0),sp*fast);const dolly=(k.has('w')?1:0)-(k.has('s')?1:0);if(dolly)this.orbit.dolly(Math.exp(dolly*1.5*fast*dt));if(k.has('q'))this.orbit.lift(-sp*fast);if(k.has('e'))this.orbit.lift(sp*fast);this.inspecting=false;}
      const t0=performance.now();this.orbit.update(dt);this.fill.position.copy(this.camera.position);this.fill.target.position.set(0,1,0);this.elapsed+=dt;if(this.wind)this.time.value+=dt;
      const t=this.time.value;
      for(let i=0;i<this.branches.length;i++){const b=this.branches[i];b.rotation.z=Math.sin(t*1.15+i*.77)*.018+Math.sin(t*.45+i)*.012;b.rotation.x=Math.sin(t*.85+i*.53)*.014;}
      for(const f of this.flames){f.scale.y=1.5+Math.sin(this.elapsed*9+f.position.x)*.16;f.rotation.y=this.elapsed;}
      if(this.river&&this.movingWater)(this.river.material as T.ShaderMaterial).uniforms.time.value+=dt;
      const yaw=this.orbit.snapshot().yaw;
      const g=this.grab;
      if(g){
        // segue o cursor com um pequeno atraso; a velocidade alimenta o balanço e o esperneio
        const a=g.actor,p=a.root.position,k=1-Math.exp(-16*dt);p.x+=(g.point.x-p.x)*k;p.z+=(g.point.z-p.z)*k;
        g.vel.set((p.x-g.last.x)/Math.max(dt,1e-4),0,(p.z-g.last.z)/Math.max(dt,1e-4));g.last.copy(p);g.energy=T.MathUtils.damp(g.energy,T.MathUtils.clamp(g.vel.length()/9,0,1),6,dt);
        let best:ArenaSlot|undefined,d0=1.5;for(const s of ARENA_SLOTS){if(s.team!=='player'||this.actors.some(o=>o!==a&&o.slot===s.id))continue;const d=Math.hypot(s.x-p.x,s.z-p.z);if(d<d0){d0=d;best=s;}}g.slot=best;
      }
      for(const a of this.actors){
        if(a.team==='player'){
          const held=g?.actor===a,drop=a.root.userData.drop as T.Vector3|undefined;a.sway??=new T.Vector2();a.swayV??=new T.Vector2();
          // altura: mola até a mão enquanto seguro; gravidade ao soltar, com um quique ao tocar o chão
          if(held){a.liftV=(a.liftV??0)+((HOLD-GRIP+.05*Math.sin(this.elapsed*2.3)-(a.lift??0))*70-(a.liftV??0)*11)*dt;a.lift=(a.lift??0)+a.liftV*dt;}      // sobe de uma vez e fica boiando
          else if((a.lift??0)>0||drop){
            if(drop){const k=1-Math.exp(-12*dt);a.root.position.x+=(drop.x-a.root.position.x)*k;a.root.position.z+=(drop.z-a.root.position.z)*k;}
            a.liftV=(a.liftV??0)-22*dt;a.lift=(a.lift??0)+a.liftV*dt;
            if(a.lift<=0){a.lift=0;a.liftV=0;a.squash=1;if(drop){a.root.position.set(drop.x,drop.y,drop.z);a.root.userData.drop=undefined;}}
          }
          // balanço: os pés ficam para trás do movimento e oscilam até parar
          const tx=held?T.MathUtils.clamp(g!.vel.z*.05,-.4,.4):0,tz=held?T.MathUtils.clamp(-g!.vel.x*.05,-.4,.4)+.04*Math.sin(this.elapsed*1.7):0;
          a.swayV.x+=((tx-a.sway.x)*55-a.swayV.x*5)*dt;a.swayV.y+=((tz-a.sway.y)*55-a.swayV.y*5)*dt;a.sway.addScaledVector(a.swayV,dt);
          a.squash=Math.max(0,(a.squash??0)-dt*3.4);const lift=a.lift??0,sq=Math.sin((a.squash??0)*Math.PI)*.16;      // amassa de leve ao pousar; ao subir o corpo NÃO estica (o usuário achou que parecia borracha)
          if(a.hero){a.hero.root.position.y=lift;a.hero.root.scale.set(1+sq*.6,1-sq,1+sq*.6);a.hero.setSwing(a.sway.x,a.sway.y,GRIP);}
          if(a.statue){a.statue.root.position.y=lift;a.statue.setSwing(a.sway.x,a.sway.y,GRIP);}
          if(a.pixel)a.pixel.visual.position.y=lift;if(a.visual){a.visual.position.y=lift;a.visual.scale.set(1+sq*.6,1-sq,1);}
          const shadow=a.root.getObjectByName('sombra');if(shadow)shadow.scale.setScalar(1/(1+lift*.9));
          if(a.ring){const on=this.mode==='move'&&!held;a.ring.visible=on;if(on){const pulse=.5+.5*Math.sin(this.elapsed*4.2);a.ring.material.opacity=g?.12:.35+.3*pulse;a.ring.scale.setScalar(1+.06*pulse);}}
        }
        const before=a.root.position.clone();
        if(a.target){
          const d=a.target.clone().sub(a.root.position);if(d.lengthSq()>.00001)a.yaw=Math.atan2(d.x,d.z);
          a.speed=T.MathUtils.damp(a.speed??0,2.2,8,dt);const step=dt*a.speed;
          if(d.length()<=step){a.root.position.copy(a.target);a.target=undefined;
            if(a.path){a.pathIndex=((a.pathIndex??0)+1)%a.path.length;a.target=a.path[a.pathIndex].clone();}
            else a.speed=0;
          }else a.root.position.addScaledVector(d.normalize(),step);
        }
        if(a.castAt!==undefined&&this.elapsed>=a.until){a.castAt=undefined;a.spell=undefined;}
        const distance=before.distanceTo(a.root.position);a.travel=(a.travel??0)+distance;
        if(a.rig){const diff=T.MathUtils.euclideanModulo(a.yaw-a.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;a.root.rotation.y+=diff*(1-Math.exp(-16*dt));a.rig.update(dt,distance,a.castAt!==undefined?T.MathUtils.clamp((this.elapsed-a.castAt)/1.25,0,1):0,a.until>this.elapsed?a.spell??null:null);}
        if(a.pixel){a.root.rotation.y=0;a.pixel.update(distance>.000001,distance,a.yaw,yaw,this.camera.quaternion);a.statue?.update(a.yaw,this.renderer,this.scene,this.camera);if(a.hero?.visible){const held=this.grab?.actor===a;a.hero.animate(dt,!held&&!(a.lift??0)&&distance>.000001,distance/Math.max(dt,1e-4),held?this.grab!.energy:0);a.hero.update(a.yaw,this.renderer,this.scene,this.camera);}}
        if(!this.prototypes&&a.visual&&a.sheets&&a.textures&&(!a.pixel||!this.directionalPreview)){
          const dangling=this.grab?.actor===a,phase=a.until>this.elapsed?'attack':a.target||dangling?'walk':'idle';const s=a.sheets[phase],tx=a.textures[phase];
          // sprite pendurado: as pernas do ciclo de andar viram o esperneio, e o boneco inclina com o balanço
          const row=directionRow(spriteFacing(a.yaw,yaw),s.directions);const frame=phase==='idle'?0:dangling?Math.floor(this.elapsed*(9+10*this.grab!.energy))%s.frames:phase==='walk'?Math.floor((a.travel??0)/1.08*s.frames)%s.frames:Math.min(s.frames-1,Math.floor((.58-(a.until-this.elapsed))*9));
          tx.repeat.set(1/s.frames,1/s.rows);tx.offset.set(Math.max(0,frame)/s.frames,1-(row+1)/s.rows);a.visual.material.map=tx;a.visual.quaternion.copy(this.camera.quaternion);if(a.sway&&(a.lift??0)>0)a.visual.rotateZ(T.MathUtils.clamp((a.sway.y*Math.cos(yaw)-a.sway.x*Math.sin(yaw))*1.1,-.6,.6));
        }else if(!a.rig&&!a.pixel){a.root.rotation.y=a.yaw;}
      }
      if(this.inspecting&&this.arena){for(const o of this.occluded)o.visible=true;this.occluded.clear();const hero=this.actors.find(a=>a.id==='brunhild')!;for(const height of [.35,1,1.7]){const end=hero.root.position.clone().add(V(0,height,0));const direction=end.clone().sub(this.camera.position);const ray=new T.Raycaster(this.camera.position,direction.clone().normalize(),0,direction.length()-.12);for(const hit of ray.intersectObject(this.arena,true)){const box=new T.Box3().setFromObject(hit.object);if(box.max.y>1.1){hit.object.visible=false;this.occluded.add(hit.object);}}}}
      this.effects.update(dt);
      this.renderer.render(this.scene,this.camera);
      this.renderMs+=performance.now()-t0;this.frames++;
      if(now-this.reportAt>200){
        const labels=this.actors.map(a=>{const p=a.root.position.clone().add(V(0,(a.lift??0)+(a.statue?.visible||a.hero?.visible?1.85:a.pixel?2.65:a.rig?2.5:2.02),0)).project(this.camera);return{id:a.id,name:a.name,x:(p.x*.5+.5)*100,y:(-p.y*.5+.5)*100,selected:a.id===this.selected,enemy:a.team==='enemy'};});this.onLabels(labels);
        const slots=ARENA_SLOTS.map(s=>{const p=V(s.x,s.y,s.z).project(this.camera);return{id:s.id,x:p.x*.5+.5,y:-p.y*.5+.5};});
        const cp=this.crate.position.clone().project(this.camera);
        this.onStats({crate:{x:cp.x*.5+.5,y:-cp.y*.5+.5,alive:!!this.crate.parent},fps:Math.round(this.frames*1000/(now-this.reportAt)),frameMs:Math.round(this.renderMs/Math.max(1,this.frames)*100)/100,draws:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,particles:this.effects.count,slots,orbit:this.orbit.snapshot(),sprites:this.actors.flatMap(a=>a.pixel?[a.pixel.snapshot()]:[]),statue:this.actors.find(a=>a.statue)?.statue?.snapshot(),hero:this.actors.find(a=>a.hero)?.hero?.snapshot(),walkingDemo:this.actors.some(a=>!!a.path),models:this.actors.flatMap(a=>a.rig?[a.rig.snapshot()]:[]),actors:this.actors.map(a=>({id:a.id,slot:a.slot,moving:!!a.target,x:a.root.position.x,y:a.root.position.y,z:a.root.position.z}))});this.frames=0;this.renderMs=0;this.reportAt=now;
      }
      const selected=this.actors.find(a=>a.id===this.selected);
      for(const floor of this.floors){floor.material.opacity=this.grab?(floor.userData.slot.id===this.grab.slot?.id?.5:.14):floor.userData.slot.id===selected?.slot ? .32 : .19;}
    }else{this.reportAt=now;this.frames=0;}
    this.raf=requestAnimationFrame(this.tick);
  };
  private contextLost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(this.raf);this.onError('O dispositivo perdeu o acesso à cena 3D. Reabra a amostra para continuar.');};
  private disposeObject(object:T.Object3D){const geometries=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();object.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]))mats.add(m);}});for(const g of geometries)g.dispose();for(const m of mats)m.dispose();}
  dispose(){
    this.disposed=true;cancelAnimationFrame(this.raf);this.orbit.dispose();this.canvas.removeEventListener('pointermove',this.hover);this.canvas.removeEventListener('webglcontextlost',this.contextLost);window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);this.canvas.removeEventListener('pointermove',this.grabMove);this.canvas.removeEventListener('pointerup',this.grabEnd);this.canvas.removeEventListener('pointercancel',this.grabEnd);
    for(const a of this.actors){a.rig?.dispose();a.pixel?.dispose();a.statue?.dispose();a.hero?.dispose();}this.materials?.dispose();this.effects.dispose();this.river?.dispose();for(const a of this.actors)for(const t of Object.values(a.textures??{}))t.dispose();this.shadowMat.map?.dispose();this.disposeObject(this.scene);this.renderer.dispose();
  }
}
