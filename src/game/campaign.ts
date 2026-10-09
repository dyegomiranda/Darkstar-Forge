/** Mini-campanha: simulação pura, checkpoints e colisão, independente da tela. */
import { facing, type Facing } from '../avatar/direction';
export { frameForDistance } from '../avatar/walk';
export const TILE=32, WIDTH=1280, HEIGHT=768, CAMPAIGN_HP=12;
export const POINTS={start:{x:608,y:368},guide:{x:640,y:304},ember:{x:944,y:368},beacon:{x:1120,y:368}};
export type Phase='intro'|'arrival'|'trail'|'seal'|'rekindle'|'complete';
export interface Point {x:number;y:number}
export interface Motion extends Point {vx:number;vy:number;travel:number;dir:Facing}
export interface Crate extends Point {id:string;hp:number}
export interface Echo extends Point {id:string;hp:number;hx:number;hy:number;windup:number;cooldown:number;dir:Facing}
export interface CampaignState {
 version:1;heroId:string;phase:Phase;player:Motion;hp:number;elapsed:number;
 crates:Crate[];enemies:Echo[];invulnerable:number;
}
export const HOUSES=[{x:6,y:5,w:5,h:4,roof:'#785b55'},{x:14,y:4,w:5,h:4,roof:'#4b6179'},{x:8,y:16,w:5,h:4,roof:'#686d4e'}];
export type Cell='grass'|'tree'|'water'|'house'|'path';
export const GRID:Cell[][]=Array.from({length:24},(_,y)=>Array.from({length:40},(_,x):Cell=>{
 if(x<2||y<2||x>=38||y>=22)return 'tree';
 if(x===25&&y>=2&&y<=21&&y!==11&&y!==12)return 'tree';
 if(((x-32)/3.8)**2+((y-18)/2.2)**2<1)return 'water';
 if(y===11||y===12||(x===20&&y>8&&y<16)||(x===34&&y>=9&&y<=14))return 'path';
 if((y===5||y===20)&&x>27&&x<37)return 'tree';
 return 'grass';
}));
for(const h of HOUSES)for(let y=h.y;y<h.y+h.h;y++)for(let x=h.x;x<h.x+h.w;x++)GRID[y][x]='house';
const START_CRATES:Crate[]=[{id:'crate-north',x:816,y:368,hp:4},{id:'crate-south',x:816,y:400,hp:4}];
const START_ENEMIES:Echo[]=[{id:'echo-1',x:888,y:368,hx:888,hy:368,hp:4,windup:0,cooldown:.4,dir:'s'},{id:'echo-2',x:960,y:320,hx:960,hy:320,hp:4,windup:0,cooldown:.8,dir:'s'},{id:'echo-3',x:1016,y:416,hx:1016,hy:416,hp:4,windup:0,cooldown:1.2,dir:'s'}];
export function newCampaign(heroId=''):CampaignState{return {version:1,heroId,phase:'intro',player:{...POINTS.start,vx:0,vy:0,travel:0,dir:'s'},hp:CAMPAIGN_HP,elapsed:0,crates:structuredClone(START_CRATES),enemies:structuredClone(START_ENEMIES),invulnerable:0};}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const solid=(x:number,y:number)=>{const cell=GRID[Math.floor(y/TILE)]?.[Math.floor(x/TILE)];return !cell||['tree','water','house'].includes(cell);};
export function canStand(s:CampaignState,x:number,y:number):boolean{
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 if([[x-9,y-4],[x+9,y-4],[x-9,y+5],[x+9,y+5]].some(([a,b])=>solid(a,b)))return false;
 return !s.crates.some(c=>c.hp>0&&Math.abs(x-c.x)<25&&Math.abs(y-c.y)<21);
}
export function clearSight(s:CampaignState,a:Point,b:Point,ignoreCrate?:string):boolean{
 const length=distance(a,b),n=Math.max(1,Math.ceil(length/8));
 for(let i=1;i<n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;
 if(solid(x,y)||s.crates.some(c=>c.id!==ignoreCrate&&c.hp>0&&Math.abs(x-c.x)<16&&Math.abs(y-c.y)<16))return false;
 }return true;
}
/** Velocidade e direção seguem o deslocamento real, inclusive ao deslizar numa parede. */
export function moveActor(m:Motion,dx:number,dy:number,dt:number,run:boolean,free:(x:number,y:number)=>boolean):number{
 const len=Math.hypot(dx,dy),target=run?176:112,blend=1-Math.exp(-dt*(len?18:28));
 m.vx+=((len?dx/len*target:0)-m.vx)*blend;m.vy+=((len?dy/len*target:0)-m.vy)*blend;
 if(!len&&Math.hypot(m.vx,m.vy)<1)m.vx=m.vy=0;
 const before={x:m.x,y:m.y};
 const steps=Math.max(1,Math.ceil(Math.hypot(m.vx,m.vy)*dt/6));
 for(let i=0;i<steps;i++){
  const nx=m.x+m.vx*dt/steps,ny=m.y+m.vy*dt/steps;
  if(free(nx,ny)){m.x=nx;m.y=ny;}
  else{if(free(nx,m.y))m.x=nx;else m.vx=0;if(free(m.x,ny))m.y=ny;else m.vy=0;}
 }
 const moved=distance(before,m);m.travel+=moved;
 if(moved>.001)m.dir=facing(m.x-before.x,m.y-before.y,m.dir);
 return moved;
}
/** Busca de caminho pelas células; diagonais nunca atravessam quinas sólidas. */
export function findPath(s:CampaignState,from:Point,to:Point):Point[]{
 const cell=(p:Point)=>({x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE)});
 const a=cell(from),b=cell(to),key=(x:number,y:number)=>y*40+x;
 if(!canStand(s,to.x,to.y))return [];
 const start=key(a.x,a.y),end=key(b.x,b.y),queue=[start],seen=new Map<number,number>([[start,-1]]);
 for(let i=0;i<queue.length&&!seen.has(end);i++){
  const id=queue[i],x=id%40,y=Math.floor(id/40);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const nx=x+dx,ny=y+dy,n=key(nx,ny);
   if(nx<0||nx>=40||ny<0||ny>=24||seen.has(n)||!canStand(s,nx*TILE+16,ny*TILE+16))continue;
   if(dx&&dy&&(!canStand(s,(x+dx)*TILE+16,y*TILE+16)||!canStand(s,x*TILE+16,(y+dy)*TILE+16)))continue;
   seen.set(n,id);queue.push(n);
  }
 }
 if(!seen.has(end))return [];
 const result:Point[]=[];for(let id=end;id!==start;id=seen.get(id)!)result.unshift({x:(id%40)*TILE+16,y:Math.floor(id/40)*TILE+16});
 if(!result.length||distance(result[result.length-1],to)>1)result.push({...to});
 return result;
}
export interface Hit {id:string;at:Point;kind:'crate'|'enemy';killed:boolean}
/** Um golpe atinge uma vez o alvo mais próximo dentro do arco, sem atravessar paredes. */
export function strikeWorld(s:CampaignState,aim:Point,range=72):Hit|null{
 if(s.hp<=0||s.phase==='intro'||s.phase==='arrival'||s.phase==='complete')return null;
 const dx=aim.x-s.player.x,dy=aim.y-s.player.y,len=Math.hypot(dx,dy);if(!len)return null;
 const targets=[...s.crates.filter(c=>c.hp>0).map(c=>({target:c,kind:'crate' as const})),...s.enemies.filter(e=>e.hp>0).map(e=>({target:e,kind:'enemy' as const}))];
 const chosen=targets.filter(({target})=>{const d=distance(s.player,target);return d<=range&&d>0&&((target.x-s.player.x)*dx+(target.y-s.player.y)*dy)/(d*len)>.55&&clearSight(s,s.player,target,target.id);}).sort((a,b)=>distance(s.player,a.target)-distance(s.player,b.target))[0];
 if(!chosen)return null;chosen.target.hp=Math.max(0,chosen.target.hp-2);
 return {id:chosen.target.id,at:{x:chosen.target.x,y:chosen.target.y},kind:chosen.kind,killed:chosen.target.hp===0};
}
export function tickEnemies(s:CampaignState,dt:number,guard:Point|null):{blocked:boolean;damage:boolean}{
 s.invulnerable=Math.max(0,s.invulnerable-dt);let blocked=false,damage=false;
 if(s.phase!=='trail'&&s.phase!=='seal')return {blocked,damage};
 for(const e of s.enemies){
  if(e.hp<=0)continue;e.cooldown=Math.max(0,e.cooldown-dt);
  const d=distance(e,s.player);e.dir=facing(s.player.x-e.x,s.player.y-e.y,e.dir);
  if(e.windup>0){
   e.windup=Math.max(0,e.windup-dt);
   if(!e.windup){e.cooldown=1.4;
    if(d<=44&&clearSight(s,e,s.player)&&s.invulnerable<=0&&s.hp>0){
     const g=guard?{x:guard.x-s.player.x,y:guard.y-s.player.y}:null;
     const gl=g?Math.hypot(g.x,g.y):0;
     const facingGuard=g&&gl>0&&d>0&&((e.x-s.player.x)*g.x+(e.y-s.player.y)*g.y)/(d*gl)>.2;
     if(facingGuard)blocked=true;else{s.hp=Math.max(0,s.hp-2);s.invulnerable=.8;damage=true;}
    }
   }continue;
  }
  if(d<38){if(!e.cooldown)e.windup=.55;continue;}
  const chase=d<170&&distance(e,{x:e.hx,y:e.hy})<145&&clearSight(s,e,s.player);
  const destination=chase?s.player:{x:e.hx,y:e.hy},len=distance(e,destination);if(len<3)continue;
  const dx=(destination.x-e.x)/len*56*dt,dy=(destination.y-e.y)/len*56*dt;
  const free=(x:number,y:number)=>canStand(s,x,y)&&!s.enemies.some(o=>o.id!==e.id&&o.hp>0&&Math.hypot(x-o.x,y-o.y)<20);
  if(free(e.x+dx,e.y+dy)){e.x+=dx;e.y+=dy;}else if(free(e.x+dx,e.y))e.x+=dx;else if(free(e.x,e.y+dy))e.y+=dy;
 }return {blocked,damage};
}
export function recoverCampaign(s:CampaignState):void{
 s.hp=CAMPAIGN_HP;s.invulnerable=1;
 const point=['seal','rekindle','complete'].includes(s.phase)?POINTS.ember:POINTS.start;
 s.player={...point,vx:0,vy:0,travel:s.player.travel,dir:'s'};
 for(const e of s.enemies){if(e.hp>0)e.hp=4;e.windup=0;e.cooldown=1;e.x=e.hx;e.y=e.hy;}
}
export function restoreCampaign(raw:string|null):CampaignState|null{
 try{
  const v=JSON.parse(raw??'null');if(!v||v.version!==1||typeof v.heroId!=='string'||!['intro','arrival','trail','seal','rekindle','complete'].includes(v.phase))return null;
  const s=newCampaign(v.heroId);s.phase=v.phase;s.hp=Number.isFinite(v.hp)?Math.max(0,Math.min(CAMPAIGN_HP,v.hp)):CAMPAIGN_HP;s.elapsed=Number.isFinite(v.elapsed)?Math.max(0,Math.min(86400,v.elapsed)):0;
  for(const c of s.crates){const saved=v.crates?.find?.((x:Crate)=>x.id===c.id);if(saved&&Number.isFinite(saved.hp))c.hp=Math.max(0,Math.min(4,saved.hp));}
  for(const e of s.enemies){const saved=v.enemies?.find?.((x:Echo)=>x.id===e.id);if(saved&&Number.isFinite(saved.hp))e.hp=Math.max(0,Math.min(4,saved.hp));}
  if(v.player&&canStand(s,v.player.x,v.player.y))s.player={...s.player,x:v.player.x,y:v.player.y};
  if(!s.hp)recoverCampaign(s);
  return s;
 }catch{return null;}
}
