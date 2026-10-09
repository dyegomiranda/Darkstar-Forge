<script lang="ts">
 import {onMount} from 'svelte';
 import {settings} from '../../app/settings.svelte';
 import {EFFECT_EVENT,type AbilityEffect,type EffectKind} from './abilityEffects';
 let canvas:HTMLCanvasElement;
 onMount(()=>{
  const ctx=canvas.getContext('2d')!;
  const colors:Record<EffectKind,string[]>={fire:['#fff1af','#ffbb57','#ef663b','#9c3b38'],ice:['#f1ffff','#a4e7f1','#59a8de','#436a9a'],light:['#fffce1','#ffe196','#e2b960','#a98852'],shadow:['#ede0ff','#bd86e1','#7954ab','#403651'],nature:['#e1f0a4','#a3cb72','#588d65','#335747'],arcane:['#e1e7ff','#a7b9fa','#737bdd','#4a4d93'],steel:['#fff5d9','#dac8a2','#a49272','#645c54'],arrow:['#eee1b3','#cab184','#947650','#55473a']};
  let effects:(AbilityEffect&{start:number})[]=[];let frame=0;
  const resize=()=>{canvas.width=innerWidth;canvas.height=innerHeight;ctx.imageSmoothingEnabled=false;};resize();window.addEventListener('resize',resize);
  const receive=(event:Event)=>{if(settings.v.reducedMotion)return;const e=(event as CustomEvent<AbilityEffect>).detail;effects.push({...e,start:performance.now()-(Math.hypot(e.from.x-e.to.x,e.from.y-e.to.y)<1?240:0)});effects=effects.slice(-12);if(!frame)frame=requestAnimationFrame(draw);};
  const draw=(now:number)=>{
   frame=0;ctx.clearRect(0,0,canvas.width,canvas.height);effects=effects.filter(e=>now-e.start<950);
   for(const e of effects){
    const age=(now-e.start)/1000,travel=Math.min(1,age/.24),impact=Math.max(0,(age-.24)/.7),alpha=1-impact;
    const palette=colors[e.kind],dx=e.to.x-e.from.x,dy=e.to.y-e.from.y,x=e.from.x+dx*travel,y=e.from.y+dy*travel;
    ctx.save();ctx.globalAlpha=alpha;
    // Different travel silhouettes: embers, ice shards, spectral ribbons and arrows.
    if(travel<1&&e.kind!=='steel'){
     if(e.kind==='arrow'){ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));ctx.strokeStyle=palette[1];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(4,0);ctx.stroke();ctx.fillStyle=palette[0];ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(0,-3);ctx.lineTo(0,3);ctx.fill();}
     else{for(let i=0;i<9;i++){const t=Math.max(0,travel-i*.018),px=e.from.x+dx*t,py=e.from.y+dy*t;ctx.fillStyle=palette[Math.min(3,Math.floor(i/3))];ctx.globalAlpha=1-i/10;const size=e.kind==='fire'?9-i*.6:e.kind==='ice'?6:7;ctx.fillRect(Math.round(px+Math.sin(i+age*16)*2),Math.round(py),size,size);}}
    }
    ctx.restore();if(travel<1)continue;
    ctx.save();ctx.translate(e.to.x,e.to.y);ctx.globalAlpha=alpha;const radius=10+impact*(e.kind==='fire'?65:40);ctx.strokeStyle=palette[1];ctx.lineWidth=Math.max(1,3*(1-impact));
    if(e.kind==='steel'){
     ctx.rotate((e.seed%6)*.35-.9);ctx.beginPath();ctx.ellipse(0,0,32+impact*14,12,-.3,-2.8,-.15);ctx.stroke();ctx.strokeStyle=palette[0];ctx.beginPath();ctx.moveTo(-24,16);ctx.lineTo(24,-16);ctx.stroke();
    }else if(e.kind==='ice'){
     for(let i=0;i<7;i++){const a=i*Math.PI*2/7+(e.seed%5)*.2;ctx.save();ctx.rotate(a);ctx.fillStyle=palette[i%3];ctx.beginPath();ctx.moveTo(0,-radius);ctx.lineTo(4,-radius*.35);ctx.lineTo(0,2);ctx.lineTo(-3,-radius*.35);ctx.closePath();ctx.fill();ctx.restore();}
    }else if(e.kind==='light'){
     ctx.beginPath();ctx.ellipse(0,12,radius,radius*.36,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=palette[0];for(let i=0;i<6;i++){const px=Math.cos(i*1.05)*radius*.65,py=-impact*50+i*5;ctx.fillRect(px-1,py-5,2,10);ctx.fillRect(px-4,py-1,8,2);}
    }else if(e.kind==='shadow'||e.kind==='arcane'){
     for(let i=0;i<3;i++){ctx.strokeStyle=palette[i];ctx.beginPath();ctx.ellipse(0,-impact*14,radius*(1-i*.15),radius*.4,i*1.05+impact*2,0,Math.PI*2);ctx.stroke();}
    }else if(e.kind==='nature'){
     for(let i=0;i<5;i++){ctx.strokeStyle=palette[i%3];ctx.beginPath();ctx.moveTo(0,15);ctx.bezierCurveTo(-radius+i*10,-10,radius-i*8,-15,-radius/2+i*12,-radius);ctx.stroke();}
    }
    const count=settings.v.quality==='low'?10:28;
    for(let i=0;i<count;i++){
     const a=i*2.399+(e.seed%37),speed=20+(i%7)*8,px=Math.cos(a)*speed*impact,py=Math.sin(a)*speed*impact+(e.kind==='fire'?impact*impact*40:-impact*15);
     ctx.fillStyle=palette[i%4];const size=e.kind==='fire'?Math.max(2,7*(1-impact)):2+i%3;
     ctx.save();ctx.translate(Math.round(px),Math.round(py));if(e.kind==='fire'||e.kind==='arrow'){ctx.rotate(a+impact*5);ctx.fillRect(-size/2,-size/2,size,size*.65);}else ctx.fillRect(-1,-1,size,2);ctx.restore();
    }
    ctx.restore();
   }
   if(effects.length)frame=requestAnimationFrame(draw);
  };
  window.addEventListener(EFFECT_EVENT,receive);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener(EFFECT_EVENT,receive);window.removeEventListener('resize',resize);};
 });
</script>
<canvas bind:this={canvas} class="ability-fx" aria-hidden="true"></canvas>
<style>.ability-fx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:26;image-rendering:pixelated;}</style>
