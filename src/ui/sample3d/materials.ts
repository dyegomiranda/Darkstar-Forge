import * as T from 'three';
/** Exact atlas cell extraction for GPU textures; preserves source pixels and alpha. */
export class SampleMaterials {
 private textures:T.Texture[]=[];
 readonly skin:T.MeshStandardMaterial;readonly cloth:T.MeshStandardMaterial;readonly green:T.MeshStandardMaterial;readonly leather:T.MeshStandardMaterial;readonly steel:T.MeshStandardMaterial;readonly gold:T.MeshStandardMaterial;
 readonly stone:T.Texture;readonly earth:T.Texture;readonly bark:T.Texture;readonly foliage:T.Texture;readonly hairRed:T.MeshStandardMaterial;readonly hairBrown:T.MeshStandardMaterial;private faces:T.Texture[];
 private materials:T.Material[]=[];private flats=new Map<string,T.MeshStandardMaterial>();
 constructor(atlas:HTMLImageElement,foliage:HTMLImageElement,faces:HTMLImageElement){
  const tile=(col:number,row:number)=>{const w=Math.floor(atlas.width/3),h=Math.floor(atlas.height/3);const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(atlas,col*w,row*h,w,h,0,0,w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.LinearMipmapLinearFilter;t.wrapS=t.wrapT=T.RepeatWrapping;this.textures.push(t);return t;};
  const make=(map:T.Texture,color=0xffffff,metalness=0,roughness=.9)=>{const m=new T.MeshStandardMaterial({map,color,metalness,roughness});this.materials.push(m);return m;};
  this.skin=make(tile(0,0),0xffffff,0,.97);this.cloth=make(tile(1,0),0xffffff);this.green=make(tile(2,0),0xffffff);this.leather=make(tile(0,1),0xdfd1bd);this.steel=make(tile(1,1),0xe4ebee,.2,.65);this.gold=make(tile(2,1),0xffdd9a,.25,.7);
  this.stone=tile(0,2);this.earth=tile(1,2);this.bark=tile(2,2);
  const cut=(x:number,y:number,w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d')!.drawImage(faces,x,y,w,h,0,0,w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.LinearMipmapLinearFilter;this.textures.push(t);return t;};
  const fw=Math.floor(faces.width/2),fh=Math.round(faces.height*.475);this.faces=[cut(0,0,fw,fh),cut(fw,0,fw,fh)];this.hairRed=make(cut(0,fh,fw,faces.height-fh),0xc5a393);this.hairBrown=make(cut(fw,fh,fw,faces.height-fh),0xd3bdac);
  this.foliage=new T.Texture(foliage);this.foliage.needsUpdate=true;this.foliage.colorSpace=T.SRGBColorSpace;this.foliage.magFilter=T.NearestFilter;this.foliage.minFilter=T.LinearMipmapLinearFilter;this.textures.push(this.foliage);
 }
 flat(color:number,roughness=.9){const key=`${color}/${roughness}`;const existing=this.flats.get(key);if(existing)return existing;const m=new T.MeshStandardMaterial({color,roughness});this.materials.push(m);this.flats.set(key,m);return m;}
 face(female:boolean,width:number,scale:number){const m=this.skin.clone();m.userData.owned=true;m.onBeforeCompile=shader=>{shader.uniforms.faceArt={value:this.faces[female?1:0]};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 facePoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nfacePoint=position;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 facePoint;uniform sampler2D faceArt;').replace('#include <map_fragment>',`#include <map_fragment>\nvec2 faceUV=vec2(facePoint.x/${width*2.1}+.5,(facePoint.y-${1.80*scale})/${.46*scale});float faceMask=smoothstep(.035,.12,facePoint.z);diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(faceArt,clamp(faceUV,0.,1.)).rgb,faceMask);`);};m.customProgramCacheKey=()=>`face-${female}-${width}-${scale}`;return m;}
 dispose(){for(const t of this.textures)t.dispose();for(const m of this.materials)m.dispose();}
 static async load(){const load=(path:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Falha na textura ${path}`));img.src=new URL(path,document.baseURI).href;});const [a,f,h]=await Promise.all([load('art/sample3d/v2/materials.png'),load('art/sample3d/v2/foliage.png'),load('art/sample3d/v2/faces-hair.png')]);return new SampleMaterials(a,f,h);}
}
