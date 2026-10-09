<script lang="ts">
  import { onMount } from 'svelte';
  import {settings} from '../../app/settings.svelte';
  import WaterSurface from './WaterSurface.svelte';
  import {refineVillageArt} from './villageArt';
  let { scene = 'santuario' }: { scene?: string } = $props();
  let canvas: HTMLCanvasElement;
  let vegetation: HTMLCanvasElement;
  let redraw = () => {};
  $effect(() => { void scene; redraw(); });
  onMount(() => {
    let plants: {x:number;y:number;image:HTMLCanvasElement;phase:number;width:number;height:number}[]=[];
    let frame=0,last=0,alive=true;
    let trees:HTMLCanvasElement[]=[];
    const empty=document.createElement('canvas');empty.width=1;empty.height=1;
    const samples=Array.from({length:4},(_,variant)=>{const canvas=document.createElement('canvas');canvas.width=90;canvas.height=120;return {x:0,y:0,foot:120,kind:'tree' as const,variant,canvas};});
    void refineVillageArt({ground:empty,props:samples}).then(art=>{if(alive){trees=art.props.map(p=>p.canvas);redraw();}}).catch(()=>{});
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new ResizeObserver(() => redraw());
    redraw = () => {
      const host = canvas.parentElement!;
      const w = Math.max(1, Math.round(host.clientWidth / 2));
      const h = Math.max(1, Math.round(host.clientHeight / 2));
      canvas.width = w; canvas.height = h; vegetation.width=w;vegetation.height=h;plants=[];
      const ctx = canvas.getContext('2d')!;
      let seed = 947;
      const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const cold = scene === 'neve';
      const fire = scene === 'vulcao';
      const sand = scene === 'deserto';
      const dark = ['masmorra', 'cripta', 'mesa'].includes(scene);
      const grass = cold ? '#a9bbc0' : fire ? '#605952' : sand ? '#afa273' : dark ? '#52625a' : '#738469';
      const floor = cold ? ['#b9c5c6','#a5b7be','#ccd1ca'] : fire ? ['#726d69','#655e5a','#82736b'] : sand ? ['#bba988','#c5b391','#aa987a'] : ['#9b9983','#aaa48c','#8c8e7a'];
      const poly = (points: number[][], fill: string, stroke?: string) => {
        ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(Math.round(x),Math.round(y)) : ctx.moveTo(Math.round(x),Math.round(y)));
        ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
      };
      // A single projected ground plane, rather than an illustration behind a board.
      // Every pavement stone and environmental prop shares these two world axes.
      const sx=w*.047, sy=h*.038, ox=w*.50, oy=h*.10;
      const world=(x:number,y:number,z=0) => [ox+(x-y)*sx,oy+(x+y)*sy-z];
      const quad=(x:number,y:number,dx:number,dy:number,z=0) => [world(x,y,z),world(x+dx,y,z),world(x+dx,y+dy,z),world(x,y+dy,z)];
      const edge=[world(-1,-1),world(10,-1),world(11,5),world(10,11),world(5,12),world(-1,10),world(-2,4)];
      // Organic rock skirt: varied facets and fissures, with no cubic terrain stacks.
      for(let i=0;i<edge.length;i++){
        const a=edge[i],b=edge[(i+1)%edge.length];
        poly([a,b,[b[0],b[1]+27],[a[0],a[1]+27]], i<3?'#6c7167':'#505c57');
        for(let j=0;j<18;j++){
          const t=rand(),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
          ctx.strokeStyle=j%2?'#798076':'#424f4b';ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x-2,y+10+rand()*12);ctx.stroke();
        }
      }
      poly(edge,grass);
      ctx.save();ctx.beginPath();edge.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
      // Irregular stone paving with broken corners, restrained colour and visible joints.
      for(let x=-2;x<13;x+=.45)for(let y=-2;y<13;y+=.45){
        const a=world(x+.03,y+.03),b=world(x+.43,y+.03),c=world(x+.43,y+.43),d=world(x+.03,y+.43);
        poly([a,[b[0]-rand()*2,b[1]],b,[c[0],c[1]-rand()*2],c,d],floor[Math.floor(rand()*floor.length)],'#777e70');
        if(rand()<.38){ctx.strokeStyle='#c1bda2';ctx.beginPath();ctx.moveTo(a[0]+1,a[1]+1);ctx.lineTo(b[0]-1,b[1]+1);ctx.stroke();}
        if(rand()<.28){const p=world(x+.08,y+.12),q=world(x+.21,y+.24),r=world(x+.26,y+.39);ctx.strokeStyle='#737b6e';ctx.beginPath();ctx.moveTo(...p as [number,number]);ctx.lineTo(...q as [number,number]);ctx.lineTo(...r as [number,number]);ctx.stroke();}
      }
      // Moss collects around the outer rim; the playable center stays unobstructed.
      for(let i=0;i<650;i++){
        const x=rand()*12-1,y=rand()*12-1;if(x>1&&x<9&&y>1&&y<9)continue;
        const p=world(x,y);ctx.fillStyle=i%3?grass:cold?'#d4dbd4':'#91a17a';ctx.fillRect(Math.round(p[0]),Math.round(p[1]),2+rand()*4,1+rand()*2);
      }
      ctx.restore();
      const stone=(x:number,y:number,dx:number,dy:number,height:number)=>{
        const base=quad(x,y,dx,dy),top=quad(x,y,dx,dy,height);
        poly([top[1],top[2],base[2],base[1]],'#646e69','#525e58');
        poly([top[2],top[3],base[3],base[2]],'#7e8475','#58635c');
        poly(top,'#bab69a','#d0c9ac');
        for(let z=7;z<height;z+=7){const a=world(x+dx,y+dy,z),b=world(x,y+dy,z);ctx.strokeStyle='#5d6960';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
      };
      // Low ruin walls, irregular pillars, and steps: props, never raised slot blocks.
      for(let x=-1;x<9;x+=1.2)stone(x,-.7,1.1,.45,7+rand()*7);
      for(let y=0;y<9;y+=1.4)stone(-.7,y,.45,1.2,7+rand()*6);
      for(const [x,y] of [[-1,0],[7,-1],[-1,7]]){const p=world(x,y),height=26+rand()*12;ctx.fillStyle='#7c857b';ctx.fillRect(p[0]-7,p[1]-height,14,height);ctx.fillStyle='#a1a694';ctx.fillRect(p[0]-5,p[1]-height,5,height);ctx.fillStyle='#c0bca1';ctx.beginPath();ctx.ellipse(p[0],p[1]-height,8,4,0,0,Math.PI*2);ctx.fill();for(let k=5;k<height;k+=8){ctx.strokeStyle='#69776b';ctx.beginPath();ctx.moveTo(p[0]-7,p[1]-k);ctx.lineTo(p[0]+7,p[1]-k);ctx.stroke();}}
      for(let n=0;n<5;n++)stone(4+n*.15,10+n*.36,2-n*.10,.5,Math.max(0,8-n*2));
      const tree=(x:number,y:number)=>{
        const p=world(x,y);ctx.fillStyle='#344c42';ctx.beginPath();ctx.ellipse(p[0]+6,p[1]+3,20,7,0,0,Math.PI*2);ctx.fill();
        if(trees.length){plants.push({x:p[0],y:p[1],image:trees[Math.floor(rand()*trees.length)],phase:rand()*6,width:90,height:120});return;}
        ctx.fillStyle='#5a5948';ctx.fillRect(Math.round(p[0])-2,Math.round(p[1])-30,5,30);
        const image=document.createElement('canvas');image.width=60;image.height=50;const leaves=image.getContext('2d')!;
        // Rounded foliage volumes assembled from irregular pixel clusters.
        for(let i=0;i<160;i++){
          const angle=rand()*Math.PI*2,r=Math.sqrt(rand());const ax=30+Math.cos(angle)*r*23,ay=25+Math.sin(angle)*r*17;
          leaves.fillStyle=cold?['#73949b','#9bbbc0','#c6d8d6'][Math.floor(rand()*3)]:['#374e40','#526b4b','#789061'][Math.min(2,Math.floor((1-rand()*.3-ay/65)*3))];
          leaves.fillRect(Math.round(ax),Math.round(ay),3+rand()*5,2+rand()*4);
        }
        plants.push({x:p[0],y:p[1]-26,image,phase:rand()*6,width:60,height:50});
      };
      tree(-1,3);tree(3,-1);tree(9,-1);tree(-1,8);
      // Warm torch light, subtle contact shadows and a distant eclipsed sun.
      for(const [x,y] of [[-.3,1],[7,-.3],[10,8]]){
        const p=world(x,y);ctx.fillStyle='#494d43';ctx.fillRect(p[0]-1,p[1]-13,3,13);
        ctx.fillStyle='#d99458';ctx.fillRect(p[0]-2,p[1]-18,5,5);ctx.fillStyle='#f3d28b';ctx.fillRect(p[0],p[1]-19,2,4);
      }
      const veil=ctx.createLinearGradient(0,0,0,h);veil.addColorStop(0,'rgba(10,17,26,.38)');veil.addColorStop(.5,'rgba(10,17,26,0)');veil.addColorStop(1,'rgba(10,17,26,.60)');ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);
    };
    const wind=(now:number)=>{
      frame=requestAnimationFrame(wind);if(document.hidden||now-last<(settings.v.quality==='low'?66:33))return;last=now;
      const c=vegetation.getContext('2d')!;c.clearRect(0,0,vegetation.width,vegetation.height);c.imageSmoothingEnabled=false;
      for(const plant of plants){const t=(reduced.matches||settings.v.reducedMotion)?0:now/1000;const sway=(reduced.matches||settings.v.reducedMotion)?0:Math.sin(t*.85+plant.phase)*.035+Math.sin(t*1.9+plant.phase)*.012;
        c.save();c.translate(Math.round(plant.x),Math.round(plant.y));c.transform(1,0,sway,1,0,0);c.drawImage(plant.image,-plant.width/2,-plant.height+4);c.restore();}
    };frame=requestAnimationFrame(wind);
    observer.observe(canvas.parentElement!);redraw();
    return () => {alive=false;cancelAnimationFrame(frame);observer.disconnect();redraw=()=>{};};
  });
</script>
<WaterSurface />
<canvas bind:this={canvas} class="arena-scene" aria-hidden="true"></canvas>
<canvas bind:this={vegetation} class="arena-scene foliage" aria-hidden="true"></canvas>
<style>
  .foliage { z-index: -1 !important; }
  .arena-scene { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -2; pointer-events: none; image-rendering: pixelated; }
</style>
