<script lang="ts">
  import { onMount } from 'svelte';
  import {settings} from '../../app/settings.svelte';
  let canvas: HTMLCanvasElement;
  onMount(() => {
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
    if(!gl)return;
    const shader=(type:number,source:string)=>{
      const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;
    };
    const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 point; void main(){gl_Position=vec4(point,0.,1.);}');
    const fragment=shader(gl.FRAGMENT_SHADER,`
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}
      float segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));}
      vec2 project(vec2 p){return vec2(.50+(p.x-p.y)*.047,.10+(p.x+p.y)*.038);}
      float shore(vec2 p){
        vec2 a=project(vec2(-1.,-1.)),b=project(vec2(10.,-1.)),c=project(vec2(11.,5.)),d=project(vec2(10.,11.)),e=project(vec2(5.,12.)),f=project(vec2(-1.,10.)),g=project(vec2(-2.,4.));
        // The rock skirt extends below the ground. Foam follows its actual foot.
        vec2 foot=vec2(0.,27./resolution.y);a+=foot;b+=foot;c+=foot;d+=foot;e+=foot;f+=foot;g+=foot;
        return min(min(min(segment(p,a,b),segment(p,b,c)),min(segment(p,c,d),segment(p,d,e))),min(min(segment(p,e,f),segment(p,f,g)),segment(p,g,a)));
      }
      void main(){
        vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
        vec2 p=vec2(uv.x*resolution.x/resolution.y,uv.y)*9.;
        vec2 current=vec2(time*.055,-time*.024);
        float n=fbm(p+current),fine=fbm(p*3.1-current*.7);
        float swell=sin(p.x*2.1+p.y*1.8+time*.58+n*2.)*.5+.5;
        float depth=shore(uv),shallow=exp(-depth*24.);
        vec3 color=mix(vec3(.075,.19,.25),vec3(.19,.39,.40),shallow*.72+n*.24);
        // Crossing wave trains perturb each other rather than sliding a flat texture.
        float crest=pow(max(0.,sin(p.x*8.+p.y*11.-time*1.4+n*8.)*sin(p.y*7.-time*.9+fine*5.)),5.);
        color+=vec3(.10,.18,.17)*crest*(.35+shallow*.6);
        color+=vec3(.04,.08,.07)*(swell-.5);
        float caustic=pow(1.-abs(fine*2.-1.),12.)*shallow;
        color+=vec3(.045,.10,.07)*caustic;
        float foam=exp(-depth*130.)*smoothstep(.40,.75,noise(p*13.+current*2.)+swell*.22);
        color=mix(color,vec3(.53,.66,.62),foam*.65);
        // Reflections are broken by ripple clusters; distant water stays subdued.
        float reflection=pow(max(0.,fine),7.)*(.25+.75*shallow);
        color+=vec3(.25,.29,.22)*reflection;
        color*=1.-smoothstep(.55,1.15,uv.y)*.35;
        gl_FragColor=vec4(color,1.);
      }
    `);
    if(!vertex||!fragment){if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);return;}
    const program=gl.createProgram()!;gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);return;}
    gl.useProgram(program);const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const point=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
    const res=gl.getUniformLocation(program,'resolution'),time=gl.getUniformLocation(program,'time');
    const observer=new ResizeObserver(()=>{
      canvas.width=Math.max(1,Math.round(canvas.clientWidth/2));canvas.height=Math.max(1,Math.round(canvas.clientHeight/2));
      gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(res,canvas.width,canvas.height);
    });observer.observe(canvas);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=-100;
    const animate=(now:number)=>{frame=requestAnimationFrame(animate);if(document.hidden||now-last<(settings.v.quality==='low'?66:33))return;last=now;gl.uniform1f(time,(reduced.matches||settings.v.reducedMotion)?0:now/1000);gl.drawArrays(gl.TRIANGLES,0,6);};frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);};
  });
</script>
<canvas bind:this={canvas} class="water" aria-hidden="true"></canvas>
<style>
 .water { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -3; pointer-events: none; image-rendering: pixelated; background: #243e49; }
</style>
