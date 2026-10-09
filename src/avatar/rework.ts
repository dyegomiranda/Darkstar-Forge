/** Atlas próprios do novo estilo. Aparências alteradas preservam o compositor de camadas.
 * Não troca roupas/equipamentos silenciosamente quando o jogador modifica o boneco. */
import { PRESET_AVATARS } from './presets';
import type { Anim, Avatar, Sheet } from './lpc';
import { EIGHT_DIRECTIONS } from './direction';
const signature = (av: Avatar) => JSON.stringify([av.body,av.skin,av.eyes,av.head,av.frame,av.face,av.race,Object.entries(av.parts).sort(([a],[b])=>a.localeCompare(b)).map(([slot,p])=>[slot,p?.id,p?.color,p?.tint,p?.style,p?.fx,p?.fxColor])]);
const ids = new Map(Object.entries(PRESET_AVATARS).map(([id,av])=>[signature(av),id]));
export const illustratedAvatarId = (av: Avatar): string | undefined => ids.get(signature(av));
interface Frame { x: number; y: number; w: number; h: number; footX: number; footY: number }
interface Atlas { image: HTMLImageElement; cells: Frame[][]; scale: number }
const atlases = new Map<string,Promise<Atlas>>();
async function atlas(id: string): Promise<Atlas> {
  let pending = atlases.get(id);
  if (!pending) {
    pending = (async()=> {
      const image = new Image(); image.src = new URL(`art/rework/heroFrames/${id}.png`,document.baseURI).href; await image.decode();
      if(image.width!==384||image.height!==512)throw new Error('Atlas normalizado inválido: '+id);
      const cells=Array.from({length:8},(_,row)=>Array.from({length:6},(_,col)=>({x:col*64,y:row*64,w:64,h:64,footX:col*64+32,footY:row*64+56})));
      return {image,cells,scale:1};
    })();
    atlases.set(id,pending);pending.catch(()=>atlases.delete(id));
  }
  return pending;
}
export async function illustratedSheet(av: Avatar, anim: Anim): Promise<Sheet | undefined> {
  const id=illustratedAvatarId(av);if(!id)return;
  const source=await atlas(id);
  const poses=anim==='idle'?[0]:anim==='walk'?[0,1,0,2]:anim==='hurt'?[0,3,0]:[3,4,5];
  const canvas=document.createElement('canvas'),size=64;
  canvas.width=poses.length*size;canvas.height=8*size;
  const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
  for(let row=0;row<8;row++)poses.forEach((pose,f)=> {
    const cell=source.cells[row][pose],k=source.scale;
    ctx.drawImage(source.image,cell.x,cell.y,cell.w,cell.h,Math.round(f*size+32+(cell.x-cell.footX)*k),Math.round(row*size+56+(cell.y-cell.footY)*k),Math.round(cell.w*k),Math.round(cell.h*k));
  });
  return {canvas,size,frames:poses.length,rows:8,directions:[...EIGHT_DIRECTIONS]};
}
