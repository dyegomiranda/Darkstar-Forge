import * as T from 'three';
/** A world-space river with flowing surface normals, Fresnel, animated caustics and shoreline foam. */
export function riverMaterial() {
  return new T.ShaderMaterial({
    uniforms: { time: {value:0}, tDiffuse:{value:null}, color:{value:new T.Color(0x64969c)}, textureMatrix:{value:new T.Matrix4()}, sunDirection: {value:new T.Vector3(-.4,.8,.35)} },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 mirrorUV; varying vec3 world; varying vec3 eye;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); world=w.xyz; eye=cameraPosition-w.xyz; mirrorUV=textureMatrix*vec4(position,1.); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `precision highp float;
      uniform float time; uniform sampler2D tDiffuse; varying vec4 mirrorUV; uniform vec3 sunDirection; varying vec3 world; varying vec3 eye;
      float river(float z){return -7.2+sin(z*.23)*.75;}
      float wave(vec2 p){
        return sin(p.x*3.7+p.y*1.3-time*.82)*.019 + sin(p.y*5.1-p.x*2.2-time*1.13)*.008 + sin(p.x*8.3+p.y*4.5-time*1.32)*.003;
      }
      void main(){
        vec2 p=world.xz; float edge=2.14-abs(p.x-river(p.y)); if(edge<0.)discard;
        float e=.014; float h=wave(p);
        vec3 n=normalize(vec3((h-wave(p+vec2(e,0.)))/e,1.,(h-wave(p+vec2(0.,e)))/e));
        vec3 v=normalize(eye); float fresnel=pow(1.-max(dot(n,v),0.),3.);
        vec3 shallow=vec3(.14,.47,.40), deep=vec3(.045,.25,.30);
        vec3 color=mix(shallow,deep,smoothstep(.05,1.6,edge));
        float caustic=pow(max(0.,sin(p.x*6.8+sin(p.y*3.8-time*.5)+time*.8)*sin(p.y*7.3+sin(p.x*4.2)+time*.75)),7.);
        color+=caustic*vec3(.09,.16,.1)*(1.-smoothstep(.7,1.6,edge));
        vec3 r=reflect(-v,n); float sparkle=pow(max(0.,dot(r,sunDirection)),90.);
        vec2 reflected=mirrorUV.xy/mirrorUV.w+n.xz*.015;
        vec3 reflection=texture2D(tDiffuse,reflected).rgb;
        color=mix(color,reflection,.21+fresnel*.48)+sparkle*vec3(.24,.22,.15);
        float foam=smoothstep(.94,1.,sin(p.y*19.-time*1.5+sin(p.y*2.4)*2.))*(1.-smoothstep(.08,.3,edge));
        foam+=smoothstep(.78,.98,sin(p.y*10.-time*2.6+p.x*4.5))*(1.-smoothstep(.02,.075,abs(edge-.13+sin(p.y*5.-time)*.07)))*.45;
        color=mix(color,vec3(.73,.85,.73),clamp(foam,0.,.7));
        // Crisp materials with smooth optical reflection; no screen-wide pixel enlargement.
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side:T.DoubleSide,
  });
}
