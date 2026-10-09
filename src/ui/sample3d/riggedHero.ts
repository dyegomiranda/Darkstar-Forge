import * as T from 'three';
import { PixelStatue } from './statue';

export interface HeroManifest {
  height:number; clips:Record<string,{duration:number;loop:boolean;speed?:number}>;
  parts:{name:string;slot:string;layer:string;regions:{name:string;hiddenBy:string[]}[]}[]; body:{name:string;hiddenBy:string[]}[];
}
const HEIGHT=1.5,FADE=.14;
/** Herói com esqueleto e peças que ligam e desligam (cabeça, cabelo, faixa…); corre, golpeia e pode ser pixelizado. */
export class RiggedHero extends PixelStatue {
  private mixer:T.AnimationMixer;private actions=new Map<string,T.AnimationAction>();private current='';private oneShot='';
  private held=false;private kick=0;private jolt=0;private front=new T.Vector3();private bones:Record<string,T.Object3D|undefined>={};private qa=new T.Quaternion();private qb=new T.Quaternion();private qc=new T.Quaternion();private axis=new T.Vector3();
  private pieces=new Map<string,T.Object3D[]>();private regions:{object:T.Object3D;hiddenBy:string[]}[]=[];private on=new Set<string>();
  constructor(model:T.Object3D,clips:T.AnimationClip[],readonly manifest:HeroManifest){
    super(model,{height:HEIGHT/manifest.height,turn:0,half:HEIGHT*.86});      // folga no quadro para braço e arma no golpe
    this.mixer=new T.AnimationMixer(model);
    for(const clip of clips){const info=manifest.clips[clip.name];if(!info)continue;const action=this.mixer.clipAction(clip);if(!info.loop){action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;}this.actions.set(clip.name,action);}
    const find=(name:string)=>model.getObjectByName(name.replace(/[.\s]/g,''))??model.getObjectByName(name);
    for(const part of manifest.parts){const objects=part.regions.map(r=>find(r.name)).filter((o):o is T.Object3D=>!!o);this.pieces.set(part.name,objects);this.on.add(part.name);}
    for(const region of manifest.body){const object=find(region.name);if(object)this.regions.push({object,hiddenBy:region.hiddenBy});}
    for(const n of ['DEF-thigh.L','DEF-thigh.R','DEF-shin.L','DEF-shin.R','DEF-upper_arm.L','DEF-upper_arm.R','DEF-forearm.L','DEF-forearm.R','DEF-neck','DEF-head'])this.bones[n]=find(n);
    this.mixer.addEventListener('finished',()=>{this.oneShot='';});
    this.apply();this.fade('Parado',0);
  }
  private apply(){
    for(const[name,objects]of this.pieces)for(const o of objects)o.visible=this.on.has(name);
    // a parte do corpo coberta por uma peça vestida some (ex.: a cabeça lisa do corpo-base sob a cabeça do herói)
    for(const r of this.regions)r.object.visible=!r.hiddenBy.some(p=>this.on.has(p));
  }
  setPiece(name:string,on:boolean){if(on)this.on.add(name);else this.on.delete(name);this.apply();}
  private fade(name:string,time=FADE){
    const next=this.actions.get(name);if(!next||this.current===name)return;const previous=this.actions.get(this.current);
    next.reset().setEffectiveWeight(1).play();if(previous)previous.crossFadeTo(next,time,false);this.current=name;
  }
  /** Ação de uma vez só (golpe, conjurar, dano); ao terminar volta a parado/correr. */
  play(name:string){if(this.actions.has(name)){this.oneShot=name;this.current='';this.fade(name);}}
  /** Suspenso no ar pelo jogador: flutua de pé, olha para baixo, abre um pouco os braços e deixa as pernas balançando.
   *  No instante em que sobe leva um susto (braços e pernas abrem de repente); `energy` (0–1) agita mais quando é sacudido. */
  setHeld(on:boolean){if(on!==this.held){this.held=on;if(on){this.oneShot='';this.jolt=1;this.fade('Parado',.08);}}}
  private turn(bone:T.Object3D|undefined,axis:T.Vector3,angle:number,parentWorld:T.Quaternion){
    // gira o osso em torno de um eixo do personagem (no mundo), seja qual for a orientação local do osso
    if(!bone)return;this.qb.setFromAxisAngle(axis,angle);this.qc.copy(parentWorld).invert();bone.quaternion.premultiply(this.qc.multiply(this.qb).multiply(parentWorld));
  }
  private dangle(dt:number,energy:number){
    // pernas agitadas o tempo todo, como quem está com medo e quer descer; sacudir o cursor agita ainda mais
    this.jolt*=Math.exp(-3.2*dt);this.kick+=dt*(8.5+7*energy+5*this.jolt);const t=this.kick,j=this.jolt,amp=.55+.25*energy+.25*j;this.holder.updateMatrixWorld(true);
    this.holder.getWorldQuaternion(this.qa);this.axis.set(1,0,0).applyQuaternion(this.qa).normalize();this.front.set(0,0,1).applyQuaternion(this.qa).normalize();
    // cabeça: olha para o chão, com um leve vaivém de quem procura onde vai cair
    const neck=this.bones['DEF-neck'],head=this.bones['DEF-head'];
    if(neck?.parent){neck.parent.getWorldQuaternion(this.qa);this.turn(neck,this.axis,.16,this.qa);neck.updateMatrixWorld(true);neck.getWorldQuaternion(this.qa);this.turn(head,this.axis,.42-.3*j+.05*Math.sin(t*.7),this.qa);this.turn(head,this.front,.07*Math.sin(t*.45),this.qa);}
    for(const[side,phase,sign]of[['L',0,1],['R',Math.PI,-1]] as const){
      const thigh=this.bones['DEF-thigh.'+side],shin=this.bones['DEF-shin.'+side],arm=this.bones['DEF-upper_arm.'+side],fore=this.bones['DEF-forearm.'+side];
      // pernas esperneando alternadas, com o joelho dobrando a cada chute
      if(thigh?.parent){thigh.parent.getWorldQuaternion(this.qa);this.turn(thigh,this.axis,-.18-amp*Math.sin(t+phase),this.qa);this.turn(thigh,this.front,sign*.1*j,this.qa);thigh.updateMatrixWorld(true);thigh.getWorldQuaternion(this.qa);this.turn(shin,this.axis,.35+amp*1.3*(1+Math.sin(t+phase-1.1))*.5,this.qa);}
      // braços um pouco abertos, como quem se equilibra; no susto sobem de repente
      if(arm?.parent){arm.parent.getWorldQuaternion(this.qa);this.turn(arm,this.front,sign*(.38+.75*j+.07*Math.sin(t*.9+phase)),this.qa);arm.updateMatrixWorld(true);arm.getWorldQuaternion(this.qa);this.turn(fore,this.front,sign*(.15+.3*j),this.qa);}
    }
  }
  animate(dt:number,moving:boolean,speed:number,energy=0){
    if(this.held){this.mixer.update(dt);this.dangle(dt,energy);return;}
    if(!this.oneShot){
      this.fade(moving?'Correr':'Parado');
      // o passo acompanha a velocidade real: sem isso os pés deslizam no chão
      const run=this.actions.get('Correr'),own=(this.manifest.clips.Correr?.speed??0)*HEIGHT/this.manifest.height;
      if(run)run.timeScale=moving&&own>0?T.MathUtils.clamp(speed/own,.6,2.2):1;
    }
    this.mixer.update(dt);
  }
  snapshot(){return{...super.snapshot(),clip:this.oneShot||this.current,pieces:[...this.on]};}
  dispose(){this.mixer.stopAllAction();super.dispose();}
}
