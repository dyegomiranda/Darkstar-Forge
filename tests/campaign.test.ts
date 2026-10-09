import {describe,expect,it} from 'vitest';
import {canStand,findPath,frameForDistance,moveActor,newCampaign,POINTS,recoverCampaign,restoreCampaign,strikeWorld,tickEnemies} from '../src/game/campaign';
describe('A Última Brasa',()=>{
 it('as caixas bloqueiam a trilha; destruí-las abre uma rota válida sem cortar quinas',()=>{
  const s=newCampaign('hero');s.phase='trail';
  expect(findPath(s,POINTS.start,POINTS.ember)).toEqual([]);
  s.player.x=754;s.player.y=368;
  expect(strikeWorld(s,{x:816,y:368})?.killed).toBe(false);
  expect(strikeWorld(s,{x:816,y:368})?.killed).toBe(true);
  const path=findPath(s,POINTS.start,POINTS.ember);expect(path.length).toBeGreaterThan(0);
  expect(path.every(p=>canStand(s,p.x,p.y))).toBe(true);
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(a.x!==b.x&&a.y!==b.y){expect(canStand(s,a.x,b.y)).toBe(true);expect(canStand(s,b.x,a.y)).toBe(true);}}
 });
 it('mantém velocidade diagonal e passos equivalentes em taxas de quadro diferentes',()=>{
  const walk=(dt:number,diagonal=false)=>{const s=newCampaign();for(let i=0;i<Math.round(1/dt);i++)moveActor(s.player,1,diagonal?1:0,dt,false,()=>true);return s.player;};
  const a=walk(1/60),b=walk(1/120),diagonal=walk(1/60,true);
  expect(a.travel).toBeCloseTo(diagonal.travel,5);
  expect(Math.abs(a.travel-b.travel)).toBeLessThan(1);
  expect(a.dir).toBe('e');expect(diagonal.dir).toBe('se');
  expect(frameForDistance(32,4)).toBe(0);
  expect(frameForDistance(a.travel,4)).toBe(frameForDistance(diagonal.travel,4));
 });
 it('segue o eixo realmente livre e não anima passos contra a parede',()=>{
  const m={x:0,y:0,vx:0,vy:0,travel:0,dir:'s' as const};
  moveActor(m,1,1,.05,false,(x)=>x<=0);expect(m.x).toBe(0);expect(m.y).toBeGreaterThan(0);expect(m.dir).toBe('s');
  expect(moveActor(m,1,0,.05,false,()=>false)).toBe(0);
 });
 it('golpes respeitam direção, alcance, paredes e não atingem o mesmo eco duas vezes',()=>{
  const s=newCampaign();s.phase='trail';s.crates.forEach(c=>c.hp=0);s.player.x=850;s.player.y=368;
  expect(strikeWorld(s,{x:800,y:368})).toBeNull();
  expect(strikeWorld(s,{x:888,y:368})?.kind).toBe('enemy');
  expect(s.enemies[0].hp).toBe(2);expect(strikeWorld(s,{x:888,y:368})?.killed).toBe(true);
  expect(strikeWorld(s,{x:888,y:368})).toBeNull();
  const blocked=newCampaign();blocked.phase='trail';blocked.player.x=770;blocked.player.y=368;
  expect(strikeWorld(blocked,{x:888,y:368},220)?.kind).toBe('crate');expect(blocked.enemies[0].hp).toBe(4);
 });
 it('o aviso do inimigo permite sair do alcance e defender na direção correta',()=>{
  const s=newCampaign();s.phase='trail';s.crates.forEach(c=>c.hp=0);s.enemies.slice(1).forEach(e=>e.hp=0);s.player.x=868;s.player.y=368;
  const e=s.enemies[0];e.cooldown=0;tickEnemies(s,.02,null);expect(e.windup).toBeGreaterThan(0);
  s.player.x=840;expect(tickEnemies(s,.6,null).damage).toBe(false);
  s.player.x=868;e.cooldown=0;tickEnemies(s,.02,null);expect(tickEnemies(s,.6,{x:900,y:368}).blocked).toBe(true);expect(s.hp).toBe(12);
  e.cooldown=0;tickEnemies(s,.02,null);expect(tickEnemies(s,.6,{x:820,y:368}).damage).toBe(true);expect(s.hp).toBe(10);
 });
 it('reabre checkpoints seguros, conserva o progresso e trata dados inválidos',()=>{
  const s=newCampaign('x');s.phase='seal';s.crates[0].hp=0;s.enemies[0].hp=0;s.hp=0;recoverCampaign(s);
  expect(s.hp).toBe(12);expect(s.player.x).toBe(POINTS.ember.x);expect(s.enemies[0].hp).toBe(0);
  const restored=restoreCampaign(JSON.stringify(s))!;expect(restored.phase).toBe('seal');expect(restored.crates[0].hp).toBe(0);
  expect(restoreCampaign('{')).toBeNull();expect(restoreCampaign('null')).toBeNull();
  s.player.x=Infinity;expect(Number.isFinite(restoreCampaign(JSON.stringify(s))!.player.x)).toBe(true);
 });
});
