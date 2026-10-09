/** Atlas próprios do novo estilo. Aparências alteradas preservam o compositor de camadas.
 * Não troca roupas/equipamentos silenciosamente quando o jogador modifica o boneco. */
import { PRESET_AVATARS } from '../../src/avatar/presets';
import type { Anim, Avatar, Sheet } from '../../src/avatar/lpc';
import { EIGHT_DIRECTIONS } from '../../src/avatar/direction';
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
      const image = new Image(); image.src = new URL(`tools/art/source-atlases/heroes/${id}.png`,document.baseURI).href; await image.decode();
      const c = document.createElement('canvas'); c.width=image.width;c.height=image.height;
      const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);
      const data=ctx.getImageData(0,0,c.width,c.height).data;
      const cw=image.width/6,ch=image.height/8;
      const cells=Array.from({length:8},(_,row)=>Array.from({length:6},(_,col)=> {
        const x0=Math.round(col*cw),y0=Math.round(row*ch),x1=Math.round((col+1)*cw),y1=Math.round((row+1)*ch);
        // Descarta fragmentos pequenos de células vizinhas sem alterar o atlas.
        const seen=new Set<number>(),groups:{n:number,x:number,y:number,r:number,b:number}[]=[];
        for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++) {
          const key=py*c.width+px;if(seen.has(key)||data[key*4+3]<=96)continue;
          const stack=[key],group={n:0,x:px,y:py,r:px,b:py};seen.add(key);
          while(stack.length) {
            const q=stack.pop()!,qx=q%c.width,qy=Math.floor(q/c.width);
            group.n++;group.x=Math.min(group.x,qx);group.y=Math.min(group.y,qy);group.r=Math.max(group.r,qx);group.b=Math.max(group.b,qy);
            for(const [nx,ny] of [[qx-1,qy],[qx+1,qy],[qx,qy-1],[qx,qy+1]]) {
              const nk=ny*c.width+nx;
              if(nx>=x0&&nx<x1&&ny>=y0&&ny<y1&&!seen.has(nk)&&data[nk*4+3]>96){seen.add(nk);stack.push(nk);}
            }
          }
          groups.push(group);
        }
        const largest=Math.max(...groups.map(g=>g.n));
        let x=x1,y=y1,right=x0,bottom=y0;
        for(const group of groups.filter(g=>g.n>=largest*.03)) {x=Math.min(x,group.x);y=Math.min(y,group.y);right=Math.max(right,group.r);bottom=Math.max(bottom,group.b);}
        if(right<x||bottom<y)throw new Error(`Quadro vazio: ${id}/${row}/${col}`);
        const feet:number[]=[];
        for(let py=Math.max(y,bottom-6);py<=bottom;py++)for(let px=x;px<=right;px++)if(data[(py*c.width+px)*4+3]>160)feet.push(px);
        feet.sort((a,b)=>a-b);
        return {x,y,w:right-x+1,h:bottom-y+1,footX:feet[Math.floor(feet.length/2)]??x0+cw/2,footY:bottom+1};
      }));
      const heights=cells.map(row=>row[0].h).sort((a,b)=>a-b);
      return {image,cells,scale:48/heights[4]};
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
