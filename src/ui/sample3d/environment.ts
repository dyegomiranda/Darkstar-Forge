import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {SampleMaterials} from './materials';
/** Leaf clusters grow on anchored branches, with surfaces in several planes rather than a tree billboard. */
export function dressEnvironment(root:T.Group,materials:SampleMaterials,time:{value:number}){
 const leafMaterials=new Map<number,T.MeshStandardMaterial>();
 const leaves:T.Mesh[]=[];
 root.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith('leaves-'))leaves.push(o);});
 for(const mesh of leaves){
  const tree=Number(mesh.name.split('-')[1]),golden=tree===2?1:0;
  let material=leafMaterials.get(golden);
  if(!material){material=new T.MeshStandardMaterial({map:materials.foliage,color:golden?0xfff3d4:0xd5e3a6,side:T.DoubleSide,alphaTest:.55,alphaToCoverage:true,roughness:.95,emissive:0x29320d,emissiveIntensity:.32});
   material.onBeforeCompile=shader=>{shader.uniforms.leafTime=time;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float leafTime;').replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat tip=uv.y; transformed.x+=sin(leafTime*2.3+position.x*3.+position.y)*tip*.034; transformed.z+=sin(leafTime*3.4+position.z*4.)*tip*.022;`);};material.customProgramCacheKey=()=>`oak-v2-${golden}`;leafMaterials.set(golden,material);}
  mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox!,center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const geometries:T.BufferGeometry[]=[];
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3;const g=new T.PlaneGeometry(Math.max(1.4,size.x*.64),Math.max(1.0,size.y*.87),4,3);const uv=g.getAttribute('uv');for(let j=0;j<uv.count;j++)uv.setX(j,(golden*.5+.009)+uv.getX(j)*.482);
   g.rotateY(angle);g.rotateZ(Math.sin(i*2.3)*.22);g.rotateX(i%2?.28:-.28);g.translate(center.x+Math.cos(angle)*size.x*.12,center.y+Math.sin(i*2)*size.y*.16,center.z+Math.sin(angle)*size.z*.12);geometries.push(g);
  }
  const g=mergeGeometries(geometries)!;for(const part of geometries)part.dispose();mesh.geometry.dispose();mesh.geometry=g;mesh.material=material;mesh.castShadow=true;mesh.receiveShadow=false;
 }
 const updated=new Set<T.Material>();
 root.updateMatrixWorld(true);
 root.traverse(o=>{if(!(o instanceof T.Mesh)||o.name.startsWith('leaves-'))return;
  for(const material of Array.isArray(o.material)?o.material:[o.material]){if(!(material instanceof T.MeshStandardMaterial)||updated.has(material))continue;updated.add(material);
   const map=material.name==='earth'?materials.earth:material.name==='bark'?materials.bark:/stone|rock/.test(material.name)?materials.stone:null;if(!map)continue;
   material.onBeforeCompile=shader=>{shader.uniforms.artSurface={value:map};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 artWorld; varying vec3 artNormal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nartWorld=(modelMatrix*vec4(transformed,1.)).xyz;artNormal=normalize(mat3(modelMatrix)*normal);');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 artWorld; varying vec3 artNormal; uniform sampler2D artSurface;').replace('#include <color_fragment>',`#include <color_fragment>\nvec3 w=pow(abs(artNormal),vec3(4.));w/=max(.001,w.x+w.y+w.z);vec3 art=texture2D(artSurface,artWorld.zy*.3).rgb*w.x+texture2D(artSurface,artWorld.xz*.3).rgb*w.y+texture2D(artSurface,artWorld.xy*.3).rgb*w.z;diffuseColor.rgb=mix(diffuseColor.rgb,art,${material.name==='earth'?'.40':'.48'});`);};material.customProgramCacheKey=()=>`surface-v2-${material.name}`;
  }
 });
}
