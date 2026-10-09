import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { SAMPLE_DIRECTIONS, sampleDirection, sampleWalkFrame, validateDirectionalManifest, type DirectionalManifest } from '../src/ui/sample3d/directional';
import { ArenaOrbit } from '../src/ui/sample3d/orbit';
const manifest = JSON.parse(readFileSync(new URL('../public/art/sample3d/directional/manifest.json', import.meta.url), 'utf8')) as DirectionalManifest;
class Surface extends EventTarget { style={touchAction:'',cursor:''}; }
describe('Eight-view sample is a complete, compatible animation package',()=>{
  it('includes every direction, every pose anchor, and matching atlas dimensions',()=>{
    expect(()=>validateDirectionalManifest(manifest)).not.toThrow();
    for (const [name,width,height] of [[manifest.walk.file,manifest.size*6,manifest.size*8],[manifest.idle.file,manifest.size,manifest.size*8],...Object.values(manifest.gear).map(g=>[g.file,g.width*8,g.height])] as [string,number,number][]) {
      const png=readFileSync(new URL('../public/art/sample3d/directional/'+name,import.meta.url));
      expect(png.readUInt32BE(16)).toBe(width);expect(png.readUInt32BE(20)).toBe(height);
    }
  });
  it('rejects missing directions, animation poses and fitted equipment instead of silently substituting',()=>{
    for (const change of [(m:DirectionalManifest)=>m.directions=['s','s','e','ne','n','nw','w','sw'],(m:DirectionalManifest)=>m.poses[2].pop(),(m:DirectionalManifest)=>delete (m.gear as Partial<DirectionalManifest['gear']>).helmet]) {
      const m=structuredClone(manifest);change(m);expect(()=>validateDirectionalManifest(m)).toThrow();
    }
  });
  it('keeps the same stride phase across camera changes and irregular frame rates',()=>{
    const distance=2.87, frames=manifest.walk.frames, stride=manifest.walk.stride;
    for(const yaw of [0,Math.PI/4,Math.PI,Math.PI*5]){
      const before=sampleWalkFrame(distance,frames,stride);sampleDirection(.7,yaw);
      expect(sampleWalkFrame(distance,frames,stride)).toBe(before);
    }
    let travel=0;for(const d of [.1,.8,.003,.5,.567,.9])travel+=d;
    expect(sampleWalkFrame(travel,frames,stride)).toBe(sampleWalkFrame(distance,frames,stride));
  });
  it('selects the actual intended view at every locked 45 degree angle, also after inspecting off-centre actors',()=>{
    const surface=new Surface(),camera=new T.OrthographicCamera(),orbit=new ArenaOrbit(surface as unknown as HTMLCanvasElement,camera,()=>{},()=>{});
    orbit.resize(1200,800);const facing=Math.PI,position=new T.Vector3(6,.096,-3);
    try {
      SAMPLE_DIRECTIONS.forEach((direction,i)=>{
        orbit.inspectDirection(position,facing,i*Math.PI/4);orbit.update(2);
        expect(sampleDirection(facing,orbit.snapshot().yaw)).toBe(direction);
      });
      orbit.preset('classic');orbit.update(2);expect(sampleDirection(facing,orbit.yaw)).toBe('n');
      orbit.preset('isometric');orbit.update(2);expect(sampleDirection(facing,orbit.yaw)).toBe('ne');
    } finally {orbit.dispose();}
  });
});
