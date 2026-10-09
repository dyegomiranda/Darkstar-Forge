import { describe,it,expect } from 'vitest';
import * as T from 'three';
import { ARENA_SLOTS,cameraPose,spriteFacing } from '../src/ui/sample3d/layout';
describe('one physical battle arena, independent of presentation',()=>{
  it('opposes matching columns and puts both rear ranks behind their own front',()=>{
    for(let column=0;column<3;column++){
      const p=ARENA_SLOTS.find(s=>s.team==='player'&&s.rank==='front'&&s.column===column)!;
      const e=ARENA_SLOTS.find(s=>s.team==='enemy'&&s.rank==='front'&&s.column===column)!;
      expect(p.x).toBe(e.x);expect(p.y).toBe(e.y);expect(p.z).toBe(-e.z);
      const pb=ARENA_SLOTS.find(s=>s.team==='player'&&s.rank==='back'&&s.column===column)!;
      const eb=ARENA_SLOTS.find(s=>s.team==='enemy'&&s.rank==='back'&&s.column===column)!;
      expect(pb.z).toBeGreaterThan(p.z);expect(eb.z).toBeLessThan(e.z);
    }
  });
  it.each(['classic','isometric'] as const)('projects and picks all twelve floor centers with the %s camera',view=>{
    const scene=new T.Scene();const camera=new T.OrthographicCamera(-15,15,10,-10,.1,150);const p=cameraPose(view);
    camera.position.set(p.x,p.y,p.z);camera.lookAt(0,.5,0);camera.updateMatrixWorld();
    const geom=new T.PlaneGeometry(2.05,1.82),mat=new T.MeshBasicMaterial();
    const floors=ARENA_SLOTS.map(s=>{const m=new T.Mesh(geom,mat);m.rotation.x=-Math.PI/2;m.position.set(s.x,s.y,s.z);m.userData.id=s.id;
      m.add(new T.LineSegments(new T.EdgesGeometry(geom),new T.LineBasicMaterial()));scene.add(m);return m;});
    scene.updateMatrixWorld(true);const ray=new T.Raycaster();
    for(const slot of ARENA_SLOTS){
      const point=new T.Vector3(slot.x,slot.y,slot.z).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1);expect(Math.abs(point.y)).toBeLessThan(1);
      ray.setFromCamera(new T.Vector2(point.x,point.y),camera);
      expect(ray.intersectObjects(floors,false)[0]?.object.userData.id).toBe(slot.id);
    }
    geom.dispose();mat.dispose();
  });
  it('selects back/front sprite views by camera and character heading',()=>{
    expect(spriteFacing(0,0)).toBe('s');expect(spriteFacing(Math.PI,0)).toBe('n');
    expect(spriteFacing(0,Math.PI)).toBe('n');expect(spriteFacing(Math.PI,Math.PI)).toBe('s');
    expect(spriteFacing(Math.PI/2,0)).toBe('e');expect(spriteFacing(0,Math.PI/2)).toBe('w');
  });
});
