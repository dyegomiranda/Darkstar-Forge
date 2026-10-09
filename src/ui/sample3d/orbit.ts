import * as T from 'three';
import type { CameraView } from './layout';
export type OrbitSnapshot={yaw:number;pitch:number;zoom:number;dragging:boolean};
/** Continuous angles belong to the camera; pointer movement never changes arena coordinates. */
export class ArenaOrbit {
  yaw=Math.PI/4;pitch=Math.atan2(23.5,26);zoom=1.23;
  private targetYaw=this.yaw;private targetPitch=this.pitch;private targetZoom=this.zoom;
  private focus=new T.Vector3(0,.5,0);private targetFocus=this.focus.clone();
  private pointers=new Map<number,{x:number;y:number}>();private origin?:{x:number;y:number;button:number};
  private traveled=false;private pinch=0;private inertia=0;private velocity=0;private lastMove=0;
  private size={w:1,h:1};private active=true;
  /** `intercept` devolve true quando o toque é de outra interação (ex.: levantar um personagem); a câmera então o ignora. */
  constructor(private canvas:HTMLCanvasElement,private camera:T.OrthographicCamera,private click:(e:PointerEvent)=>void,private changed:()=>void,private intercept?:(e:PointerEvent)=>boolean){
    canvas.style.touchAction='none';canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.move);canvas.addEventListener('pointerup',this.up);canvas.addEventListener('pointercancel',this.cancel);canvas.addEventListener('wheel',this.wheel,{passive:false});canvas.addEventListener('contextmenu',this.menu);
  }
  preset(view:CameraView){this.targetYaw=view==='isometric'?Math.PI/4:0;this.targetPitch=Math.atan2(view==='isometric'?23.5:26.5,26);this.targetZoom=1.23;this.targetFocus.set(0,.5,0);this.inertia=0;this.changed();}
  /** Desloca o ponto observado no plano do chão, relativo à câmera (WASD). */
  pan(right:number,forward:number,amount:number){const k=amount/Math.max(.6,this.zoom)*1.6;this.targetFocus.x+=(Math.cos(this.yaw)*right-Math.sin(this.yaw)*forward)*k;this.targetFocus.z+=(-Math.sin(this.yaw)*right-Math.cos(this.yaw)*forward)*k;this.changed();}
  /** Avanço/recuo da câmera livre (W/S): pode chegar mais perto que o zoom da roda, para inspecionar o modelo. */
  dolly(factor:number){this.targetZoom=T.MathUtils.clamp(this.targetZoom*factor,.65,14);this.changed();}
  /** Sobe ou desce o ponto observado. */
  lift(amount:number){this.targetFocus.y=T.MathUtils.clamp(this.targetFocus.y+amount/Math.max(.6,this.zoom)*1.6,-1,12);this.changed();}
  rotate(delta:number){this.targetYaw+=delta;this.inertia=0;this.changed();}
  zoomBy(factor:number){this.targetZoom=T.MathUtils.clamp(this.targetZoom*factor,.65,Math.max(6.5,this.targetZoom));this.changed();}
  inspect(position:T.Vector3,facing=0){this.targetYaw=facing;this.inertia=0;this.targetFocus.copy(position).add(new T.Vector3(0,1.15,0));this.targetZoom=5.3;this.targetPitch=.48;this.changed();}
  inspectDirection(position:T.Vector3,facing:number,relative:number){this.targetYaw=facing-relative;this.inertia=0;this.targetFocus.copy(position).add(new T.Vector3(0,1.15,0));this.targetZoom=5.3;this.targetPitch=.62;this.changed();}
  resize(w:number,h:number){this.size={w,h};this.project();}
  update(dt:number){
    if(!this.pointers.size&&Math.abs(this.inertia)>.0001){this.targetYaw+=this.inertia*dt;this.inertia*=Math.exp(-7*dt);}
    const a=1-Math.exp(-14*dt);this.yaw+=(this.targetYaw-this.yaw)*a;this.pitch+=(this.targetPitch-this.pitch)*a;this.zoom+=(this.targetZoom-this.zoom)*a;this.focus.lerp(this.targetFocus,a);
    const r=37.7;this.camera.position.set(this.focus.x+Math.sin(this.yaw)*Math.cos(this.pitch)*r,this.focus.y+Math.sin(this.pitch)*r,this.focus.z+Math.cos(this.yaw)*Math.cos(this.pitch)*r);this.camera.lookAt(this.focus);this.project();this.camera.updateMatrixWorld();
  }
  snapshot():OrbitSnapshot{return {yaw:this.yaw,pitch:this.pitch,zoom:this.zoom,dragging:this.traveled&&this.pointers.size>0};}
  private project(){const h=9.2/this.zoom;this.camera.left=-h*this.size.w/this.size.h;this.camera.right=-this.camera.left;this.camera.top=h;this.camera.bottom=-h;this.camera.updateProjectionMatrix();}
  private distance(){const p=[...this.pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
  private down=(e:PointerEvent)=>{if(!this.active||![0,1,2].includes(e.button))return;if(e.button===0&&!this.pointers.size&&this.intercept?.(e))return;this.canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.inertia=0;
    if(this.pointers.size===1){this.origin={x:e.clientX,y:e.clientY,button:e.button};this.traveled=false;this.velocity=0;this.lastMove=performance.now();}else{this.traveled=true;this.pinch=this.distance();}this.canvas.style.cursor='grabbing';};
  private move=(e:PointerEvent)=>{const p=this.pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointers.size>=2){const d=this.distance();if(this.pinch>0&&d>0)this.zoomBy(d/this.pinch);this.pinch=d;this.traveled=true;return;}
    if(this.origin&&Math.hypot(e.clientX-this.origin.x,e.clientY-this.origin.y)>6)this.traveled=true;
    if(!this.traveled)return;this.targetYaw-=dx*.007;this.targetPitch=T.MathUtils.clamp(this.targetPitch+dy*.004,.28,1.12);const now=performance.now();this.velocity=T.MathUtils.clamp(-dx*.007/Math.max(.008,(now-this.lastMove)/1000),-3,3);this.lastMove=now;this.changed();};
  private up=(e:PointerEvent)=>{if(!this.pointers.has(e.pointerId))return;const canClick=this.pointers.size===1&&!this.traveled&&this.origin?.button===0;this.pointers.delete(e.pointerId);if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);
    if(!this.pointers.size){this.inertia=this.traveled&&performance.now()-this.lastMove<100?this.velocity:0;this.canvas.style.cursor='default';this.origin=undefined;this.pinch=0;}else{this.traveled=true;this.pinch=this.distance();}
    if(canClick)this.click(e);};
  private cancel=(e:PointerEvent)=>{if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);this.canvas.style.cursor='default';this.pointers.delete(e.pointerId);this.traveled=true;this.inertia=0;this.origin=undefined;this.pinch=0;};
  private wheel=(e:WheelEvent)=>{e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?this.size.h:1;this.zoomBy(Math.exp(-T.MathUtils.clamp(e.deltaY*unit,-240,240)*.0017));};
  private menu=(e:Event)=>e.preventDefault();
  dispose(){this.active=false;for(const id of this.pointers.keys())if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);this.pointers.clear();this.canvas.style.touchAction='';this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('pointercancel',this.cancel);this.canvas.removeEventListener('wheel',this.wheel);this.canvas.removeEventListener('contextmenu',this.menu);}
}
