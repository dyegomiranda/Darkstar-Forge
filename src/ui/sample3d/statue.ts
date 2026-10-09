import * as T from 'three';

const LAYER=1;
export interface StatueOptions { height?:number; half?:number; turn?:number }
/** Modelo 3D visto liso ou como sprite de resolução fixa: o tamanho do pixel acompanha o personagem, não a tela. */
export class PixelStatue {
  readonly root=new T.Group();
  protected holder=new T.Group();private camera:T.OrthographicCamera;private height:number;private half:number;
  private target=new T.WebGLRenderTarget(64,64,{type:T.HalfFloatType,magFilter:T.NearestFilter,minFilter:T.NearestFilter,depthBuffer:true});
  private board:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;private swing=new T.Vector2();private pivot=1.15;private pixels=0;private clear=new T.Color();private centre=new T.Vector3();private forward=new T.Vector3();
  constructor(model:T.Object3D,options:StatueOptions={}){
    // mesma altura dos outros bonecos do pátio (Kael ocupa cerca de 1,5 unidade do quadro de 2,05)
    this.height=options.height??1.5;this.half=options.half??this.height*.77;this.camera=new T.OrthographicCamera(-this.half,this.half,this.half,-this.half,.1,60);
    model.scale.setScalar(this.height);model.rotation.y=options.turn??-Math.PI/2;
    // a cena não tem mapa de ambiente: metal puro refletiria preto e o aço ficaria quase negro
    model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m instanceof T.MeshStandardMaterial){m.metalness=Math.min(m.metalness,.06);m.roughness=Math.max(m.roughness,.6);}}});
    this.holder.add(model);this.camera.layers.set(LAYER);
    this.board=new T.Mesh(new T.PlaneGeometry(this.half*2,this.half*2),new T.ShaderMaterial({uniforms:{map:{value:this.target.texture},texel:{value:1/64}},transparent:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      // contorno escuro de um pixel em volta da silhueta, como nos sprites desenhados
      fragmentShader:`uniform sampler2D map;uniform float texel;varying vec2 vUv;
        void main(){vec4 c=texture2D(map,vUv);
          if(c.a<.5){float n=max(max(texture2D(map,vUv+vec2(texel,0.)).a,texture2D(map,vUv-vec2(texel,0.)).a),max(texture2D(map,vUv+vec2(0.,texel)).a,texture2D(map,vUv-vec2(0.,texel)).a));if(n<.5)discard;c=vec4(.012,.008,.016,1.);}
          gl_FragColor=vec4(c.rgb,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`}));
    this.board.position.y=this.height/2;this.root.add(this.holder,this.board);this.setPixels(72);
  }
  /** Altura do personagem em pixels de arte; 0 mostra o modelo liso. */
  setPixels(pixels:number){
    this.pixels=pixels;const on=pixels>0;this.board.visible=on;this.holder.traverse(o=>o.layers.set(on?LAYER:0));
    if(on){const size=Math.round(pixels*this.half*2/this.height);this.target.setSize(size,size);this.board.material.uniforms.texel.value=1/size;}
  }
  set visible(v:boolean){this.root.visible=v;}
  get visible(){return this.root.visible;}
  /** Balanço de quem está suspenso no ar: inclina em torno de um ponto do corpo (o peito), não dos pés. Ângulos em radianos, eixos do mundo. */
  setSwing(x:number,z:number,pivot=1.15){this.swing.set(x,z);this.pivot=pivot;}
  update(yaw:number,renderer:T.WebGLRenderer,scene:T.Scene,view:T.Camera){
    const sx=this.swing.x,sz=this.swing.y,p=this.pivot;this.holder.rotation.order='ZXY';this.holder.rotation.set(sx,yaw,sz);
    this.holder.position.set(p*Math.cos(sx)*Math.sin(sz),p-p*Math.cos(sx)*Math.cos(sz),-p*Math.sin(sx));
    if(!this.root.visible||!this.pixels)return;
    this.board.quaternion.copy(view.quaternion);this.root.getWorldPosition(this.centre).y+=this.height/2;view.getWorldDirection(this.forward);
    this.camera.position.copy(this.centre).addScaledVector(this.forward,-20);this.camera.quaternion.copy(view.quaternion);this.camera.updateMatrixWorld();
    const background=scene.background,alpha=renderer.getClearAlpha();renderer.getClearColor(this.clear);scene.background=null;
    renderer.setRenderTarget(this.target);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(scene,this.camera);
    renderer.setRenderTarget(null);renderer.setClearColor(this.clear,alpha);scene.background=background;
  }
  snapshot(){return{pixels:this.pixels,visible:this.root.visible,size:this.target.width};}
  dispose(){this.target.dispose();}
}
