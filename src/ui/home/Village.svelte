<!-- A Última Brasa: uma missão curta, com exploração, golpes e um duelo de cartas. -->
<script lang="ts">
 import {onMount} from 'svelte';
 import {app} from '../../store/project.svelte';
 import {L} from '../../app/i18n.svelte';
 import {router} from '../../app/router.svelte';
 import {shell} from '../../app/shell.svelte';
 import {chip} from '../../audio/chip';
 import {settings} from '../../app/settings.svelte';
 import ScreenBar from '../common/ScreenBar.svelte';
 import HeroPortrait from '../common/HeroPortrait.svelte';
 import AvatarSprite from '../../avatar/AvatarSprite.svelte';
 import SheetSprite from '../../avatar/SheetSprite.svelte';
 import Atmosphere from '../visual/Atmosphere.svelte';
 import Game from '../game/Game.svelte';
 import {villageArt,refineVillageArt} from '../visual/villageArt';
 import {avatarForCharacter} from '../../avatar/equipment';
 import {compose,LPC,attackAnim,type Anim} from '../../avatar/lpc';
 import {ANIMATION_FPS} from '../../avatar/animation';
 import {facing,type Facing} from '../../avatar/direction';
 import {playable,deckReady,deckCards,heroDef,type FixedMatch} from '../game/heroes';
 import {CAMPAIGN_HP,GRID,HOUSES,WIDTH,HEIGHT,POINTS,canStand,clearSight,distance,findPath,moveActor,newCampaign,recoverCampaign,restoreCampaign,strikeWorld,tickEnemies,type CampaignState,type Point} from '../../game/campaign';
 const SAVE='voidsun.campaign.last-ember.v1';
 const chars=$derived(playable().filter(c=>c.avatar&&deckReady(c)));
 const read=()=>{try{return restoreCampaign(localStorage.getItem(SAVE));}catch{return null;}};
 let state=$state<CampaignState>(read()??newCampaign());
 const hero=$derived(chars.find(c=>c.id===state.heroId)??chars[0]);
 const guide=$derived(chars.find(c=>c.id==='hero-lyra')??chars.find(c=>c.id!==hero?.id)??hero);
 const keeper=$derived(chars.find(c=>c.id==='hero-aldric'&&c.id!==hero?.id)??chars.find(c=>c.id!==hero?.id)??hero);
 const visual=$derived(avatarForCharacter(hero,app.cards));
 let art=$state(villageArt(GRID,HOUSES));
 let mode=$state<'wasd'|'click'>((()=>{try{return localStorage.getItem('voidsun.campanha.modo')==='click'?'click':'wasd';}catch{return 'wasd';}})());
 let visualReady=$state(false);
 $effect(()=>{const av=visual;if(!av){visualReady=false;return;}let active=true;visualReady=false;Promise.all((['idle','walk',attackAnim(av),'hurt'] as Anim[]).map(a=>compose(av,a,'layered'))).then(()=>{if(active)visualReady=true;}).catch(()=>{if(active)tell(L('Não foi possível carregar a animação. Tente abrir a campanha novamente.','The animation could not load. Try reopening the campaign.'));});return()=>{active=false;};});
 let attackDuration=.5;
 let stage=$state<HTMLDivElement>(),scale=$state(.75),anim=$state<Anim>('idle'),attackClock=0,attackCooldown=0,attackAim=$state<Point>({...POINTS.start}),impact=false;
 let defending=$state(false),attackFlash=$state(0),hurtFlash=$state(0),pulse=$state(0);
 let mouse=$state<Point>({x:POINTS.start.x,y:POINTS.start.y+80}),path=$state<Point[]>([]);
 let pending:string|null=null;
 const keys=new Set<string>();
 let jump=$state(0),jumpClock=0;
 let battle=$state<FixedMatch|null>(null);
 type Choice={text:string;run:()=>void};
 type Dialogue={speaker:string;anchor:'guide'|'keeper'|'hero';lines:string[];index:number;done?:()=>void;label?:string;options?:Choice[]};
 let viewSize=$state({width:1280,height:768});
 let dialogue=$state<Dialogue|null>(null);
 let notice=$state(''),noticeTime=0;
 type Particle=Point&{vx:number;vy:number;age:number;color:string;life:number;width:number;height:number;rotation:number;spin:number;floor?:number;bounced?:boolean};
 let particles=$state<Particle[]>([]);
 let floats=$state<(Point&{id:number;text:string;age:number})[]>([]);
 let seq=0;
 const objective=$derived(state.phase==='intro'?L('Escolha um herói para entrar na vila.','Choose a hero to enter the village.'):state.phase==='arrival'?L('Converse com Nara junto à trilha.','Talk to Nara beside the trail.'):state.phase==='trail'?state.crates.every(c=>c.hp>0)?L('Abra a passagem bloqueada com seus golpes.','Strike the crates to open the blocked trail.'):state.enemies.some(e=>e.hp>0)?L('Afaste os ecos do vazio e recupere a brasa.','Drive away the void echoes and recover the ember.'):L('Recolha a brasa junto às raízes luminosas.','Collect the ember by the glowing roots.'):state.phase==='seal'?L('Leve a brasa ao vigia do farol.','Bring the ember to the lighthouse keeper.'):state.phase==='rekindle'?L('Reacenda o farol com a brasa.','Rekindle the lighthouse with the ember.'):L('Vale das Cinzas ainda lembra seu nome.','Ashen Vale still remembers its name.'));
 const objectivePoint=$derived(state.phase==='arrival'?POINTS.guide:state.phase==='trail'?state.crates.every(c=>c.hp>0)?state.crates[0]:POINTS.ember:POINTS.beacon);
 const speechPosition=$derived.by(()=>{const at=dialogue?.anchor==='keeper'?{x:POINTS.beacon.x-40,y:POINTS.beacon.y-35}:dialogue?.anchor==='hero'?state.player:POINTS.guide;const rawX=(viewSize.width-WIDTH*scale)/2+at.x*scale,y=(viewSize.height-HEIGHT*scale)/2+(at.y-60)*scale-8;const half=Math.min(340,viewSize.width-32)/2;const x=Math.max(half+16,Math.min(viewSize.width-half-16,rawX));return {x,y,tail:rawX-x,height:Math.max(100,y-8)};});
 const minutes=$derived(Math.floor(state.elapsed/60)+':'+String(Math.floor(state.elapsed)%60).padStart(2,'0'));
 function save(){try{localStorage.setItem(SAVE,JSON.stringify($state.snapshot(state)));}catch{/* continua jogável sem armazenamento */}}
 function setMode(value:'wasd'|'click'){mode=value;path=[];pending=null;keys.clear();try{localStorage.setItem('voidsun.campanha.modo',value);}catch{}stage?.focus();}
 function tell(text:string){notice=text;noticeTime=3.6;}
 function stop(){keys.clear();path=[];pending=null;defending=false;state.player.vx=state.player.vy=0;}
 function line(speaker:string,lines:string[],done?:()=>void,label?:string,anchor:Dialogue['anchor']='guide',options?:Choice[]){stop();anim='idle';dialogue={speaker,anchor,lines,index:0,done,label,options};}
 function choose(choice:Choice){dialogue=null;choice.run();if(!dialogue)stage?.focus();}
 function questChoices():Choice[]{return [{text:L('Vou recuperar a brasa','I will recover the ember'),run:()=>{state.phase='trail';save();tell(L('Missão recebida: A Última Brasa.','Quest accepted: The Last Ember.'));}}, {text:L('Como enfrento os ecos?','How do I fight the echoes?'),run:()=>line('Nara',[L('Eles anunciam o golpe antes de atacar. Afaste-se ou defenda na direção deles. Dois golpes bastam para dissipar cada eco. As caixas também cedem a dois golpes.','They signal before striking. Move away or guard toward them. Two strikes disperse each echo. The crates also break after two strikes.')],questOffer)}, {text:L('Agora não','Not right now'),run:()=>line('Nara',[L('Eu espero. Quando estiver pronto, volte a falar comigo.','I will wait. Talk to me again when you are ready.')])}];}
 function questOffer(){line('Nara',[L('Enquanto houver uma brasa, esta vila ainda terá uma história. Você pode recuperá-la?','While one ember remains, this village still has a story. Can you recover it?')],undefined,undefined,'guide',questChoices());}
 function keeperChoices():Choice[]{return [{text:L('Enfrentar o vigia','Challenge the keeper'),run:startBattle},{text:L('Preciso de um momento','I need a moment'),run:()=>line(L('Vigia do Farol','Lighthouse Keeper'),[L('Respire. A brasa pode esperar mais um instante.','Breathe. The ember can wait a little longer.')],undefined,undefined,'keeper')}];}
 function next(){if(!dialogue||(dialogue.options&&dialogue.index===dialogue.lines.length-1))return;if(dialogue.index<dialogue.lines.length-1){dialogue.index++;return;}const done=dialogue.done;dialogue=null;done?.();stage?.focus();}
 function begin(){if(!hero)return;state.heroId=hero.id;state.phase='arrival';save();chip.music('menu');stage?.focus();}
 function replay(){stop();state=newCampaign(hero?.id??'');dialogue=null;save();}
 function recover(){stop();recoverCampaign(state);attackClock=attackCooldown=0;anim='idle';save();stage?.focus();}
 function interact(id:string){
  if(!hero||dialogue||battle||state.hp<=0)return;
  const at=id==='guide'?POINTS.guide:id==='ember'?POINTS.ember:POINTS.beacon;
  if(distance(state.player,at)>82||!clearSight(state,state.player,at)){tell(L('Chegue mais perto para interagir.','Move closer to interact.'));return;}
  if(id==='guide'){
   if(state.phase==='arrival')line('Nara',[
    L('Meu irmão esqueceu meu nome esta manhã. O Void Sun não apaga só a luz: leva embora o que lembramos.','My brother forgot my name this morning. The Void Sun does not only take light: it takes what we remember.'),
    L('Os ecos levaram a última brasa do farol para a mata. Abra a trilha, recupere-a e procure o vigia. Enquanto houver uma brasa, esta vila ainda terá uma história.','The echoes carried the lighthouse’s last ember into the woods. Clear the trail, recover it and find the keeper. While one ember remains, this village still has a story.')
   ],undefined,undefined,'guide',questChoices());
   else line('Nara',[state.phase==='complete'?L('Ele lembrou meu nome. Ainda não vencemos o sol vazio… mas hoje ele não levou nossa história.','He remembered my name. We have not defeated the empty sun… but today it did not take our story.'):L('A passagem fica a leste. Golpeie as caixas, não as árvores. A brasa está além dos ecos.','The passage lies east. Strike the crates, not the trees. The ember is beyond the echoes.')]);
  }else if(id==='ember'){
   if(state.phase!=='trail'){tell(L('Você já está carregando a brasa.','You are already carrying the ember.'));return;}
   if(state.enemies.some(e=>e.hp>0)){tell(L('Os ecos ainda prendem a brasa. Afaste-os primeiro.','The echoes still hold the ember. Drive them away first.'));return;}
   state.phase='seal';state.hp=CAMPAIGN_HP;save();chip.sfx('heal');
   line(hero.name,[L('Ela não queima. Dentro da luz, ouço alguém chamar: “Nara”. A brasa guardou a lembrança que o vazio tentou levar.','It does not burn. Inside the light, I hear someone call: “Nara”. The ember held the memory the void tried to take.')],undefined,undefined,'hero');
  }else if(state.phase==='seal'){
   line(L('Vigia do Farol','Lighthouse Keeper'),[
    L('Jurei não deixar o vazio passar. Mas ele tomou minhas lembranças… e já não sei distinguir uma brasa de uma mentira.','I swore not to let the void pass. But it took my memories… and I can no longer tell an ember from a lie.'),
    L('Mostre-me que sua vontade ainda é sua. Vença meu grimório e eu abrirei o selo do farol.','Show me your will is still your own. Defeat my grimoire and I will open the lighthouse seal.')
   ],undefined,undefined,'keeper',keeperChoices());
  }else if(state.phase==='rekindle'){
   state.phase='complete';save();chip.sfx('victory');
   line(hero.name,[
    L('A luz retorna ao farol. Nas janelas da vila, alguém chama por Nara — e desta vez se lembra de quem ela é.','Light returns to the lighthouse. In the village windows, someone calls for Nara — and this time remembers who she is.'),
    L('O Void Sun continua no céu. Uma brasa não pode derrotá-lo. Mas pode guardar um nome. E um nome pode ser o começo de uma resistência.','The Void Sun remains in the sky. One ember cannot defeat it. But it can preserve a name. And a name can begin a resistance.')
   ],undefined,undefined,'hero');
  }else tell(L('O farol aguarda a última brasa.','The lighthouse awaits the last ember.'));
 }
 function nearest(){const ids=['guide',...(state.phase==='trail'?['ember']:[]),'keeper'];return ids.map(id=>({id,d:distance(state.player,id==='guide'?POINTS.guide:id==='ember'?POINTS.ember:POINTS.beacon)})).sort((a,b)=>a.d-b.d)[0];}
 function startBattle(){
  if(!hero||!keeper)return;stop();save();
  const foe=structuredClone($state.snapshot(keeper));foe.id='campaign-lighthouse-keeper';foe.name=L('Vigia do Farol','Lighthouse Keeper');
  const def=heroDef(keeper);const tuned={...def,id:foe.id,name:foe.name,maxHp:18,armor:0,resist:0,weapon:{...def.weapon,dmg:3},gear:[]};
  battle={myId:hero.id,botId:foe.id,start:[{level:1,vigor:0,mana:0,vida:0},{level:1,vigor:0,mana:0,vida:0}],difficulty:'easy',scene:'santuario',label:L('A Última Brasa · o vigia','The Last Ember · the keeper'),guest:{char:foe,hero:tuned,cards:deckCards(keeper).filter(c=>!c.game?.effects.some(e=>e.k==='heal'||e.k==='push'||(e.k==='strike'&&e.then==='push')))},rules:{avatarMode:'layered',botMovement:false,hpCap:24,playerFirst:true,heroOff:false,actionLimit:false,pace:'fast',timeLimit:false},
   onLeave:()=>{battle=null;chip.music('menu');},
   onEnd:(won)=>{battle=null;chip.music('menu');state.hp=CAMPAIGN_HP;state.player={...state.player,x:1060,y:368,vx:0,vy:0,dir:'e'};if(won)state.phase='rekindle';save();line(L('Vigia do Farol','Lighthouse Keeper'),[won?L('Nara… agora eu lembro. Leve a brasa ao pedestal. Este selo foi feito para proteger a vila, não para aprisionar sua luz.','Nara… now I remember. Bring the ember to the pedestal. This seal was meant to protect the village, not imprison its light.'):L('Sua luz ainda vacila. Respire. O selo continuará aqui quando você estiver pronto para tentar novamente.','Your light still falters. Breathe. The seal will be here when you are ready to try again.')],undefined,undefined,'keeper');}};
 }
 function world(e:MouseEvent):Point{const r=stage!.getBoundingClientRect();return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
 function strike(aim=mouse){
  if(!visual||!visualReady||attackCooldown>0||dialogue||battle||defending||state.hp<=0||state.phase==='intro'||state.phase==='complete')return;
  if(state.phase==='arrival'){tell(L('Converse com Nara primeiro.','Talk to Nara first.'));return;}
  if(distance(state.player,aim)<1)aim={x:state.player.x,y:state.player.y+80};
  path=[];pending=null;attackAim={...aim};state.player.dir=facing(aim.x-state.player.x,aim.y-state.player.y,state.player.dir);
  state.player.vx=state.player.vy=0;anim=attackAnim(visual);attackDuration=LPC.anims[anim].frames/ANIMATION_FPS[anim];attackClock=attackDuration;attackCooldown=attackDuration+.08;impact=false;chip.sfx(anim==='shoot'?'arrow':anim==='spellcast'?'magic':'slash');
 }
 function spawnImpact(at:Point,color:string,text?:string){
  if(text)floats.push({...at,id:seq++,text,age:0});
  if(settings.v.reducedMotion||settings.v.quality==='low')return;
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;particles.push({...at,vx:Math.cos(angle)*45,vy:Math.sin(angle)*35-30,age:0,color,life:.55,width:3,height:3,rotation:0,spin:0});}
  if(particles.length>48)particles.splice(0,particles.length-48);
 }
 function breakWood(at:Point){
  if(settings.v.reducedMotion)return;
  const count=settings.v.quality==='low'?8:24;
  for(let i=0;i<count;i++){
   const angle=Math.PI*2*i/count,speed=45+Math.random()*85;
   particles.push({x:at.x,y:at.y-18,vx:Math.cos(angle)*speed,vy:-70-Math.random()*100,age:0,color:['#cda777','#8d623f','#e4c295','#60432e'][i%4],life:1.25+Math.random()*.35,width:3+Math.random()*8,height:2+Math.random()*4,rotation:Math.random()*180,spin:(Math.random()-.5)*650,floor:at.y+Math.sin(angle)*16});
  }
  if(particles.length>120)particles.splice(0,particles.length-120);
 }
 function approach(id:string,at:Point){
  if(distance(state.player,at)<=70){if(id==='guide'||id==='ember'||id==='keeper')interact(id);else strike(at);return;}
  const candidates=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;const p={x:at.x+Math.cos(a)*56,y:at.y+Math.sin(a)*56};if(canStand(state,p.x,p.y))candidates.push(p);}
  candidates.sort((a,b)=>distance(a,state.player)-distance(b,state.player));
  for(const p of candidates){const route=findPath(state,state.player,p);if(route.length){path=route;pending=id;return;}}
  tell(L('A passagem está bloqueada. Aproxime-se das caixas para golpeá-las.','The passage is blocked. Move close to the crates to strike them.'));
 }
 function click(e:MouseEvent){stage?.focus();if(dialogue||battle||state.hp<=0)return;mouse=world(e);if(mode==='click'){path=findPath(state,state.player,mouse);pending=null;if(!path.length)tell(L('Não há caminho livre até esse ponto.','There is no clear path to that point.'));}else strike();}
 function targetClick(e:MouseEvent,id:string,at:Point){e.stopPropagation();mouse=at;stage?.focus();if(dialogue||battle)return;if(mode==='click')approach(id,at);else if(['guide','ember','keeper'].includes(id))interact(id);else strike(at);}
 function viewport(node:HTMLDivElement){const resize=()=>{viewSize={width:node.clientWidth,height:node.clientHeight};scale=Math.max(.25,Math.floor(Math.min(node.clientWidth/WIDTH,node.clientHeight/HEIGHT)*4)/4);};const ro=new ResizeObserver(resize);ro.observe(node);resize();return {destroy:()=>ro.disconnect()};}
 function paint(node:HTMLCanvasElement,source:HTMLCanvasElement){const update=(c:HTMLCanvasElement)=>{node.width=c.width;node.height=c.height;node.getContext('2d')!.drawImage(c,0,0);};update(source);return {update};}
 function beaconArt(node:HTMLCanvasElement,lit:boolean){
  const draw=(light:boolean)=>{node.width=64;node.height=100;const c=node.getContext('2d')!;c.imageSmoothingEnabled=false;
   const r=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
   r(4,89,56,8,'#303c40');r(8,85,48,5,'#8e978d');r(12,80,40,5,'#b3b19a');
   r(20,42,24,38,'#4a5655');r(22,42,8,38,'#8b9688');r(30,42,6,38,'#798578');r(36,42,6,38,'#5f7067');
   for(let y=48;y<80;y+=10){r(21,y,21,2,'#36494a');r(y%20?28:36,y-8,2,8,'#435854');}
   r(16,38,32,5,'#35484b');r(12,33,40,5,'#8c947f');r(14,29,36,5,'#b4ad8b');r(20,27,24,3,'#38434b');
   r(29,51,6,14,light?'#eed195':'#8474a1');r(26,56,12,3,light?'#ffe3a1':'#a091bb');
   if(light){r(25,13,14,14,'#d57940');r(29,5,8,22,'#edab5d');r(25,18,14,8,'#f1bc72');r(30,14,5,13,'#ffe3a1');r(35,9,3,9,'#b66b43');}
   else{r(26,18,12,8,'#63556e');r(29,13,6,13,'#8c7899');r(28,21,9,5,'#a18caf');}
  };draw(lit);return {update:draw};
 }
 function crateArt(node:HTMLCanvasElement,hp:number){
  const draw=(health:number)=>{node.width=40;node.height=42;const c=node.getContext('2d')!;c.imageSmoothingEnabled=false;
   const rect=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
   rect(2,11,36,28,'#332b25');rect(4,9,32,28,'#7f5a3a');
   for(let i=0;i<4;i++){rect(5,10+i*6,30,5,i%2?'#936946':'#896140');rect(7,11+i*6,22,1,'#b58a5e');rect(12+i*3,13+i*6,10,1,'#65452f');}
   rect(4,7,31,3,'#c59a64');rect(35,11,3,27,'#513b2c');rect(4,32,31,4,'#b08859');rect(7,10,4,26,'#b38a5b');rect(28,10,4,26,'#b38a5b');
   for(const x of [8,29])for(const y of [12,33])rect(x,y,2,2,'#343b3b');
   if(health<4){rect(17,15,2,5,'#332720');rect(15,19,2,8,'#332720');rect(18,26,2,5,'#332720');}
  };draw(hp);return {update:draw};
 }
 onMount(()=>{
  let active=true,last=performance.now(),raf=0,saveClock=0;
  refineVillageArt(art).then(value=>{if(active)art=value;}).catch(()=>undefined);
  if(hero&&!state.heroId)state.heroId=hero.id;
  if(!canStand(state,state.player.x,state.player.y))recoverCampaign(state);
  chip.music('menu');
  const release=()=>{stop();last=performance.now();save();};
  const down=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||battle||shell.menu)return;
   if((e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]'))return;
   const k=e.key.toLowerCase(),walk=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'];
   if(dialogue){const choices=dialogue.index===dialogue.lines.length-1?dialogue.options:undefined;if(choices&&/^[1-9]$/.test(k)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&choices[Number(k)-1])choose(choices[Number(k)-1]);return;}if(k==='e'||k==='enter'||k===' '){if((e.target as HTMLElement)?.closest('.balloon button'))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&!choices)next();}return;}
   if(state.phase==='intro'||state.hp<=0)return;
   if(walk.includes(k)||['e','f',' '].includes(k)){e.preventDefault();e.stopImmediatePropagation();}
   if(k==='e'&&!e.repeat){const near=nearest();if(near)interact(near.id);}
   if(k==='f'&&!e.repeat)strike();
   if(k===' '&&!jumpClock&&!attackClock)jumpClock=.001;
   keys.add(k);
  };
  const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
  const loop=(now:number)=>{
   const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;
   if(!document.hidden&&!shell.menu){
    if(state.phase!=='intro'&&state.phase!=='complete'){state.elapsed+=dt;saveClock+=dt;if(saveClock>2){save();saveClock=0;}}
    if(!battle&&!dialogue&&state.phase!=='intro'&&state.hp>0){
     pulse+=dt;attackCooldown=Math.max(0,attackCooldown-dt);attackFlash=Math.max(0,attackFlash-dt);hurtFlash=Math.max(0,hurtFlash-dt);
     if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)notice='';}
     if(attackClock>0){attackClock=Math.max(0,attackClock-dt);
      if(!impact&&attackClock<=attackDuration*.60){impact=true;const range=heroDef(hero!).weapon.via==='melee'?72:210;const hit=strikeWorld(state,attackAim,range);attackFlash=.16;if(hit){if(hit.killed&&hit.kind==='crate')breakWood(hit.at);spawnImpact(hit.at,hit.kind==='crate'?'#cda777':'#bfa0ed',hit.killed?hit.kind==='crate'?L('Passagem aberta','Path open'):L('Eco dissipado','Echo dispersed'):'−2');chip.sfx(hit.killed&&hit.kind==='enemy'?'death':'hit');save();}}
      if(!attackClock)anim='idle';
     }else if(defending){state.player.vx=state.player.vy=0;state.player.dir=facing(mouse.x-state.player.x,mouse.y-state.player.y,state.player.dir);anim='idle';}
     else{
      let dx=mode==='wasd'?Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')):0;
      let dy=mode==='wasd'?Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')):0;
      if(dx||dy){path=[];pending=null;}
      if(!dx&&!dy&&path.length){
       const nextPoint=path[0],len=distance(state.player,nextPoint);
       if(len<5){path.shift();state.player.vx=state.player.vy=0;if(!path.length&&pending){const id=pending;pending=null;const at=id==='guide'?POINTS.guide:id==='ember'?POINTS.ember:id==='keeper'?POINTS.beacon:state.crates.find(c=>c.id===id)??state.enemies.find(c=>c.id===id);if(at){if(['guide','ember','keeper'].includes(id))interact(id);else strike(at);}}}
       else{dx=nextPoint.x-state.player.x;dy=nextPoint.y-state.player.y;}
      }
      if(!attackClock&&!dialogue){const moved=moveActor(state.player,dx,dy,dt,keys.has('shift'),(x,y)=>canStand(state,x,y));anim=moved>.01?'walk':'idle';if(!moved&&path.length&&(dx||dy)){path=[];pending=null;}}
     }
     const result=tickEnemies(state,dt,defending?mouse:null);if(result.damage){hurtFlash=.25;spawnImpact(state.player,'#dd7b75','−2');chip.sfx('hit');save();}if(result.blocked){spawnImpact(state.player,'#bdddf1',L('Defendido','Blocked'));chip.sfx('block');}
     if(state.hp<=0){stop();anim='hurt';save();}
     if(jumpClock){jumpClock+=dt;jump=settings.v.reducedMotion?0:Math.sin(Math.min(1,jumpClock/.42)*Math.PI)*18;if(jumpClock>=.42){jumpClock=0;jump=0;}}
     for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.floor===undefined?120:340)*dt;p.rotation+=p.spin*dt;if(p.floor!==undefined&&p.y>=p.floor&&p.vy>0){p.y=p.floor;if(!p.bounced){p.vy*=-.28;p.vx*=.5;p.spin*=.4;p.bounced=true;}else{p.vx*=Math.max(0,1-dt*8);p.vy=0;p.spin=0;}}}particles=particles.filter(p=>p.age<p.life);
     for(const f of floats)f.age+=dt;floats=floats.filter(f=>f.age<.9);
    }
   }
   raf=requestAnimationFrame(loop);
  };
  raf=requestAnimationFrame(loop);addEventListener('keydown',down,true);addEventListener('keyup',up);addEventListener('blur',release);document.addEventListener('visibilitychange',release);
  return()=>{active=false;cancelAnimationFrame(raf);save();removeEventListener('keydown',down,true);removeEventListener('keyup',up);removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);};
 });
</script>

{#if battle}
 <Game fixed={battle}/>
{:else}
<div class="campaign">
 <ScreenBar title={L('A Última Brasa','The Last Ember')} kicker={L('Campanha · aventura curta','Campaign · short adventure')} back={L('Menu','Menu')} onback={()=>{save();router.go('/');}}>
  <span class="duration">{L('Cerca de 5 minutos','About 5 minutes')}</span>
 </ScreenBar>
 <div class="journal">
  <div><small>{L('Uma luz contra o Void Sun','A light against the Void Sun')}</small><strong data-campaign-objective>{objective}</strong></div>
  <div class="life"><span>♥ {state.hp}/{CAMPAIGN_HP}</span><i><b style="width:{state.hp/CAMPAIGN_HP*100}%"></b></i></div>
  <span class="time">{minutes}</span>
 </div>
 <div class="viewport" use:viewport>
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events, a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div class="world" class:restored={state.phase==='complete'} class:damaged={hurtFlash>0} tabindex="0" role="application" aria-label={L('Campo da campanha. WASD para andar, E interage, F golpeia.','Campaign field. WASD moves, E interacts, F strikes.')} bind:this={stage}
   style="width:{WIDTH}px;height:{HEIGHT}px;transform:scale({scale})"
   onmousemove={e=>mouse=world(e)} onclick={click} oncontextmenu={e=>e.preventDefault()}
   onmousedown={e=>{if(e.button===2&&!dialogue&&state.phase!=='intro'&&!attackClock){e.preventDefault();mouse=world(e);defending=true;stop();defending=true;}}}
   onmouseup={e=>{if(e.button===2)defending=false;}} onmouseleave={()=>defending=false}>
   <canvas class="ground" use:paint={art.ground}></canvas>
   <div class="void-shade"></div>
   {#each art.props as p,i(i)}<canvas class="prop" use:paint={p.canvas} style="left:{p.x}px;top:{p.y}px;z-index:{p.foot}"></canvas>{/each}
   <div class="atmosphere"><Atmosphere scene="floresta" rays={false}/></div>
   <div class="label village-label">{L('Vale das Cinzas','Ashen Vale')}</div><div class="label forest-label">{L('Trilha dos Ecos','Echo Trail')}</div>
   <div class="void-sun" aria-hidden="true"></div>
   {#if state.phase!=='intro'&&state.phase!=='complete'}<div class="objective-ring" style="left:{objectivePoint.x}px;top:{objectivePoint.y}px"></div>{/if}
   {#if guide?.avatar}
    <button class="figure resident" data-campaign="guide" style="left:{POINTS.guide.x}px;top:{POINTS.guide.y}px;z-index:{POINTS.guide.y}" onclick={e=>targetClick(e,'guide',POINTS.guide)} aria-label={L('Conversar com Nara','Talk to Nara')}>
     <AvatarSprite renderMode="layered" avatar={avatarForCharacter(guide,app.cards)!} dir="s" scale={1}/><small>Nara</small><span class="quest-sign">{state.phase==='arrival'?'!':'◇'}</span>
    </button>
   {/if}
   {#each state.crates.filter(c=>c.hp>0) as c(c.id)}
    <button class="crate figure" data-campaign={c.id} style="left:{c.x}px;top:{c.y}px;z-index:{c.y}" onclick={e=>targetClick(e,c.id,c)} aria-label={L('Golpear caixa de madeira','Strike wooden crate')}><canvas use:crateArt={c.hp}></canvas><span class="object-hp"><i style="width:{c.hp/4*100}%"></i></span></button>
   {/each}
   {#each state.crates.filter(c=>c.hp===0) as c(c.id)}<div class="debris" style="left:{c.x}px;top:{c.y}px" aria-hidden="true"><i></i><b></b><em></em></div>{/each}
   {#each state.enemies.filter(e=>e.hp>0) as e(e.id)}
    <button class="figure echo" class:windup={e.windup>0} data-campaign={e.id} style="left:{e.x}px;top:{e.y}px;z-index:{Math.round(e.y)};--float:{settings.v.reducedMotion?0:Math.sin(pulse*2+e.hx)*2}px" onclick={ev=>targetClick(ev,e.id,e)} aria-label={L('Golpear eco do vazio','Strike void echo')}>
     <span class="echo-doll"><SheetSprite id="rework/spirit" def={{cell:[64,64],idle:1,attack:3,fps:8}} scale={.85} attacking={e.windup>0} back={e.dir==='n'||e.dir==='ne'||e.dir==='nw'}/></span>
     <span class="object-hp"><i style="width:{e.hp/4*100}%"></i></span>{#if e.windup>0}<span class="danger-circle" style="--charge:{1-e.windup/.55}"></span>{/if}
    </button>
   {/each}
   {#if state.phase==='trail'}
    <button class="ember" data-campaign="ember" style="left:{POINTS.ember.x}px;top:{POINTS.ember.y}px;z-index:{POINTS.ember.y-1}" onclick={e=>targetClick(e,'ember',POINTS.ember)} aria-label={L('Recuperar a última brasa','Recover the last ember')}><span class="ember-art"><i></i><b></b></span><small>{L('Última Brasa','Last Ember')}</small></button>
   {/if}
   <button class="beacon" class:lit={state.phase==='complete'} data-campaign="beacon" style="left:{POINTS.beacon.x}px;top:{POINTS.beacon.y}px;z-index:{POINTS.beacon.y}" onclick={e=>targetClick(e,'keeper',POINTS.beacon)} aria-label={state.phase==='rekindle'?L('Reacender o farol','Rekindle the lighthouse'):L('Conversar com o vigia do farol','Talk to the lighthouse keeper')}>
    <canvas class="beacon-art" use:beaconArt={state.phase==='complete'}></canvas><small>{L('Farol da Memória','Memory Lighthouse')}</small>
   </button>
   {#if keeper?.avatar&&state.phase!=='complete'}
    <div class="figure keeper" style="left:{POINTS.beacon.x-40}px;top:{POINTS.beacon.y-35}px;z-index:{POINTS.beacon.y-35}" aria-hidden="true"><AvatarSprite renderMode="layered" avatar={avatarForCharacter(keeper,app.cards)!} dir="sw" scale={1}/></div>
   {/if}
   {#if visual}
    <div class="figure player" data-campaign="player" data-x={Math.round(state.player.x)} data-y={Math.round(state.player.y)} data-facing={state.player.dir} data-anim={anim}
     class:hurt={hurtFlash>0} style="left:{Math.round(state.player.x)}px;top:{Math.round(state.player.y)}px;z-index:{Math.round(state.player.y)}">
     <span class="hero-shadow"></span>
     <span class="doll" style="transform:translateY({-jump}px)"><AvatarSprite renderMode="layered" avatar={visual} {anim} dir={state.player.dir} scale={1} travel={state.player.travel} loop={anim==='walk'||anim==='idle'} shadow={false}/></span>
     {#if defending}<span class="guard" style="transform:rotate({Math.atan2(mouse.y-state.player.y,mouse.x-state.player.x)*180/Math.PI}deg)"></span>{/if}
     {#if attackFlash>0&&!settings.v.reducedMotion}<span class="swing" style="transform:rotate({Math.atan2(attackAim.y-state.player.y,attackAim.x-state.player.x)*180/Math.PI}deg)"></span>{/if}
     {#if state.phase==='seal'||state.phase==='rekindle'}<span class="carried-ember"></span>{/if}
    </div>
   {/if}
   {#each particles as p,i(i)}<i class="particle" style="left:{p.x}px;top:{p.y}px;opacity:{Math.min(1,(p.life-p.age)*4)};background:{p.color};width:{p.width}px;height:{p.height}px;transform:rotate({p.rotation}deg)"></i>{/each}
   {#each floats as f(f.id)}<span class="float" style="left:{f.x}px;top:{f.y-50-f.age*26}px;opacity:{1-f.age/.9}">{f.text}</span>{/each}
   {#if path.length}<span class="destination" style="left:{path[path.length-1].x}px;top:{path[path.length-1].y}px"></span>{/if}
  </div>
   {#if dialogue}
    <div class="balloon" role="dialog" aria-modal="true" aria-label={dialogue.speaker} data-speaker={dialogue.anchor}
     style="left:{speechPosition.x}px;top:{speechPosition.y}px;--tail-offset:{speechPosition.tail}px;--max-height:{speechPosition.height}px">
     <div class="speech-body"><small>{dialogue.speaker}</small><p>{dialogue.lines[dialogue.index]}</p>
      {#if dialogue.options&&dialogue.index===dialogue.lines.length-1}
       <div class="opts">{#each dialogue.options as option,k}<button onclick={()=>choose(option)}><b>{k+1}</b>{option.text}</button>{/each}</div>
      {:else}<button class="speech-next" onclick={next}>{dialogue.index<dialogue.lines.length-1?L('Continuar','Continue'):dialogue.label??L('Continuar','Continue')} <span>↵</span></button>{/if}
     </div>
    </div>
   {/if}
 </div>
 <div class="controls"><span>{mode==='wasd'?L('WASD / setas: andar · Clique / F: golpear','WASD / arrows: move · Click / F: strike'):L('Clique: caminhar ou interagir · F: golpear','Click: walk or interact · F: strike')} · {L('E: interagir · Shift: correr · Espaço: pular · Botão direito: defender','E: interact · Shift: run · Space: jump · Right button: guard')}</span><button class="btn sm ghost" onclick={()=>setMode(mode==='wasd'?'click':'wasd')}>{mode==='wasd'?L('Usar clique para andar','Use click to move'):L('Usar WASD','Use WASD')}</button></div>
 {#if notice}<div class="notice" role="status">{notice}</div>{/if}

 {#if state.phase==='intro'}
  <div class="story-overlay"><div class="story" tabindex="-1" role="dialog" aria-modal="true" aria-label={L('A Última Brasa','The Last Ember')}><small>VOID SUN · {L('Prólogo jogável','Playable prologue')}</small><h1>{L('A Última Brasa','The Last Ember')}</h1><p>{L('O sol continua no céu. Mas já não ilumina: devora lembranças. Em Vale das Cinzas, um farol guarda o último nome que a vila ainda sabe pronunciar. Sua brasa acaba de desaparecer.','The sun remains in the sky. But it no longer gives light: it devours memories. In Ashen Vale, a lighthouse holds the last name the village can still speak. Its ember has just disappeared.')}</p><p class="promise">{L('Uma missão · exploração e golpes · um duelo de cartas · cerca de 5 minutos','One quest · exploration and strikes · one card duel · about 5 minutes')}</p>
   <div class="heroes">{#each chars as c(c.id)}<button class:selected={c.id===hero?.id} aria-label={c.name} title={c.name} onclick={()=>state.heroId=c.id}><HeroPortrait hero={c} size={40}/><span>{c.name}</span></button>{/each}</div>
   <button class="btn primary big" disabled={!hero||!visualReady} onclick={begin}>{L('Entrar em Vale das Cinzas','Enter Ashen Vale')}</button>{#if !hero}<p>{L('Crie um herói com um deck de batalha para começar.','Create a hero with a battle deck to begin.')}</p>{/if}
  </div></div>
 {:else if state.hp<=0}
  <div class="story-overlay"><div class="story" tabindex="-1" role="dialog" aria-modal="true" aria-label={L('Retomar a trilha','Resume the trail')}><h2>{L('A brasa ainda espera','The ember still waits')}</h2><p>{L('Os ecos fizeram você recuar. As passagens abertas e sua missão continuam preservadas.','The echoes forced you back. Your opened passages and quest progress are preserved.')}</p><button class="btn primary" onclick={recover}>{L('Voltar ao último refúgio','Return to the last refuge')}</button></div></div>
 {:else if state.phase==='complete'&&!dialogue}
  <div class="finish"><small>{L('Missão concluída','Quest completed')}</small><h2>{L('Uma vila. Um nome. Uma brasa.','One village. One name. One ember.')}</h2><p>{L('Este é só o começo da resistência ao Void Sun.','This is only the beginning of the resistance against the Void Sun.')}</p><div><button class="btn primary" onclick={()=>router.go('/')}>{L('Voltar ao menu','Return to menu')}</button><button class="btn" onclick={replay}>{L('Jogar novamente','Play again')}</button></div></div>
 {/if}
</div>
{/if}

<style>
 .beacon-art{position:absolute;width:64px;height:100px;left:50%;bottom:0;transform:translateX(-50%);image-rendering:pixelated}.lit .beacon-art{filter:drop-shadow(0 0 8px #eaba6460)}
 .campaign{position:relative;height:100%;display:flex;flex-direction:column;background:#0b1118;color:#e3ddcf}
 .duration{margin-left:auto;color:var(--muted);font:12px var(--ui)}
 .journal{display:flex;align-items:center;gap:24px;padding:12px 24px;border-bottom:1px solid #494230;background:linear-gradient(90deg,#1d2225,#121822)}
 .journal>div:first-child{display:grid;gap:5px;flex:1}.journal small{font-size:10px;letter-spacing:.18em;color:#c3a566;text-transform:uppercase}.journal strong{font-size:14px;font-weight:500}
 .life{display:grid;gap:5px;font-size:12px}.life i{width:100px;height:5px;background:#402c30}.life b{display:block;height:100%;background:#d38368;transition:width .15s}.time{font-size:12px;color:#b8ac91;font-variant-numeric:tabular-nums}
 .viewport{position:relative;flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse,#334138,#111921);padding:10px}
 .world{position:relative;flex-shrink:0;outline:0;overflow:hidden;transform-origin:center;isolation:isolate;image-rendering:pixelated}
 .ground{position:absolute;inset:0;image-rendering:pixelated}.prop{position:absolute;pointer-events:none;image-rendering:pixelated}
 .void-shade{position:absolute;inset:0;background:linear-gradient(100deg,#263d5230,#100e3260);pointer-events:none;transition:opacity 2s}.restored .void-shade{opacity:.1}
 .atmosphere{position:absolute;inset:0;pointer-events:none;z-index:900}
 .label{position:absolute;top:60px;font:13px var(--pixel);letter-spacing:.18em;color:#fff3d8b0;text-shadow:2px 2px #253434;pointer-events:none}.village-label{left:260px}.forest-label{left:880px}
 .void-sun{position:absolute;left:965px;top:50px;width:50px;height:50px;border-radius:50%;background:#12101e;box-shadow:0 0 0 2px #d2b6eb,0 0 20px #9477b780;pointer-events:none}.restored .void-sun{box-shadow:0 0 0 2px #d9c39a,0 0 16px #c9aa6b50}
 .figure{position:absolute;width:64px;height:64px;transform:translate(-50%,-87.5%);border:0;padding:0;background:transparent;overflow:visible;color:#e9dfc4}
 button.figure{cursor:pointer}.figure small{position:absolute;top:100%;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;text-shadow:1px 1px 2px #111}
 button.figure:hover :global(.av),button.figure:focus-visible :global(.av){filter:drop-shadow(0 0 3px #ead297)}
 .quest-sign{position:absolute;left:28px;top:-18px;color:#ffe3a1;font:bold 18px var(--ui);text-shadow:0 0 8px #edc074}.objective-ring{position:absolute;width:44px;height:18px;transform:translate(-50%,-50%);border:2px dashed #e8c579aa;border-radius:50%;pointer-events:none;z-index:1}
 .crate{width:40px;height:42px;transform:translate(-50%,-85%)}.crate canvas{width:40px;height:42px;image-rendering:pixelated}.crate:hover canvas{filter:brightness(1.2)}
 .object-hp{position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);height:3px;width:30px;background:#2d2931;box-shadow:0 1px #10191c}.object-hp i{display:block;height:100%;background:#dba889}
 .debris{position:absolute;width:34px;height:18px;transform:translate(-50%,-50%);pointer-events:none}.debris i,.debris b,.debris em{position:absolute;width:20px;height:4px;background:#967553;box-shadow:0 2px #483a2e;transform:rotate(18deg)}.debris b{left:14px;top:7px;transform:rotate(-22deg);width:15px}.debris em{left:4px;top:12px;width:10px}
 .echo{width:54px;height:54px;transform:translate(-50%,-85%)}.echo-doll{display:block;transform:translateY(var(--float));filter:drop-shadow(0 0 3px #7c5aab)}.echo .object-hp i{background:#c4a6e4}
 .danger-circle{position:absolute;left:6px;bottom:0;width:42px;height:17px;border-radius:50%;border:2px solid #f29b91;box-shadow:0 0 8px #c9606460;background:#ac4a4a30;pointer-events:none}.windup .echo-doll{filter:brightness(1.4) drop-shadow(0 0 5px #e68f99)}
 .ember{position:absolute;width:40px;height:32px;border:0;background:transparent;transform:translate(-50%,-100%);cursor:pointer}.ember i,.carried-ember{position:absolute;width:8px;height:12px;border-radius:40%;background:#fff0b8;box-shadow:0 0 0 3px #cf853c,0 0 22px 10px #eeac5360}.ember i{left:16px;top:10px}.ember b{position:absolute;left:8px;top:26px;width:25px;height:5px;background:#5b5843}.ember small{position:absolute;left:-22px;top:38px;white-space:nowrap;font-size:11px;color:#ffe0a1;text-shadow:1px 1px #111}
 .beacon{position:absolute;width:66px;height:102px;border:0;padding:0;background:transparent;transform:translate(-50%,-92%);cursor:pointer;color:#e9dfc4}.beacon small{position:absolute;top:106px;left:-30px;white-space:nowrap;font-size:11px}
 .keeper{pointer-events:none}.player{pointer-events:none}.hero-shadow{position:absolute;left:19px;bottom:3px;width:26px;height:8px;border-radius:50%;background:#192a2b80}.doll{position:relative;display:block}.hurt .doll{filter:brightness(1.8) sepia(.5)}
 .guard,.swing{position:absolute;left:9px;top:16px;width:46px;height:35px;border-right:3px solid #c6e6f6;border-radius:50%;box-shadow:5px 0 6px #88c0d840;transform-origin:center}.swing{border-color:#ffe1ab;width:58px;left:3px;box-shadow:4px 0 7px #ffb27a60}.carried-ember{left:39px;top:34px;width:4px;height:6px;box-shadow:0 0 0 1px #cf853c,0 0 10px 4px #eeac5370}
 .particle{position:absolute;width:3px;height:3px;z-index:1050;pointer-events:none}.float{position:absolute;transform:translateX(-50%);font:bold 12px var(--ui);color:#fff0c8;text-shadow:1px 1px #19131d;z-index:1100;pointer-events:none;white-space:nowrap}
 .destination{position:absolute;width:20px;height:8px;border:2px solid #e4d5a7;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}
 .controls{display:flex;justify-content:center;align-items:center;gap:16px;padding:8px 12px;font:12px/1.4 var(--ui);color:#b7b9b1;border-top:1px solid #404535}.notice{position:absolute;left:50%;bottom:84px;transform:translateX(-50%);z-index:1300;padding:10px 16px;background:#111821ed;border:1px solid #b99d60;color:#f1dbaa;max-width:80%;font-size:13px;text-align:center}
 .story-overlay{position:absolute;inset:0;z-index:1500;display:grid;place-items:center;background:#060b13d6;padding:24px}
 .story{width:min(680px,100%);text-align:center;padding:32px;border:1px solid #a38c5e;background:linear-gradient(150deg,#243039,#131a25);box-shadow:0 18px 80px #0008}.story>small{font-size:11px;letter-spacing:.22em;color:#c9aa71}.story h1{font:30px var(--display);margin:14px 0 18px;color:#f6e6bb}.story p{font:15px/1.7 var(--ui);color:#deddd2}.story p.promise{font-size:12px;color:#bea97b}
 .heroes{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin:20px 0}.heroes button{display:grid;justify-items:center;gap:5px;border:1px solid #5c665e;background:#101923;padding:5px;cursor:pointer;color:#c9cfbf;font-size:10px}.heroes button.selected{border-color:#e4c58c;background:#544735}.story .big{margin-top:8px}
 .balloon{position:absolute;transform:translate(-50%,-100%);width:min(340px,calc(100% - 32px));z-index:5000;color:#fff;background:rgb(0 0 0 / .78);border:1px solid rgb(255 255 255 / .16);border-radius:10px;box-shadow:0 6px 14px rgb(0 0 0 / .5);font:500 13px/1.35 var(--ui);text-align:left}
 .balloon::after{content:'';position:absolute;left:calc(50% + var(--tail-offset));top:100%;margin-left:-6px;border:6px solid transparent;border-top-color:rgb(0 0 0 / .78);pointer-events:none}
 .speech-body{padding:9px 12px;max-height:var(--max-height);overflow:auto;border-radius:inherit}.speech-body>small{display:block;font-size:11px;color:#fff;opacity:.8}.speech-body p{margin:5px 0 9px;color:#fff}
 .opts{display:grid;gap:5px}.opts button,.speech-next{display:flex;gap:8px;align-items:baseline;width:100%;text-align:left;padding:6px 9px;border-radius:7px;border:1px solid rgb(255 255 255 / .22);background:rgb(255 255 255 / .07);color:#fff;font:500 12.5px var(--ui);cursor:pointer}.opts b{color:#ffd36a}.opts button:hover,.opts button:focus-visible,.speech-next:hover,.speech-next:focus-visible{background:rgb(255 255 255 / .15);border-color:rgb(255 255 255 / .4);outline:1px solid #ffffff80}.speech-next{justify-content:space-between}
 .ember-art{position:absolute;inset:0}.crate:hover canvas,.crate:focus-visible canvas,.ember:hover .ember-art,.ember:focus-visible .ember-art,.beacon:hover .beacon-art,.beacon:focus-visible .beacon-art{filter:drop-shadow(0 0 2px #ffe7a6) drop-shadow(0 0 5px #ffcd5a80)}
 .finish{position:absolute;left:50%;bottom:72px;transform:translateX(-50%);z-index:1400;text-align:center;padding:24px 32px;width:min(680px,90%);background:#17221fed;border:1px solid #c6ab6d;box-shadow:0 20px 60px #0009}.finish>small{color:#e6cc8a;letter-spacing:.18em;font-size:11px}.finish h2{font:24px var(--display);color:#f4e5be}.finish p{font-size:13px;color:#c4c7b8}.finish>div{display:flex;justify-content:center;gap:10px;margin-top:16px}
 @media(max-width:850px){.duration,.time{display:none}.journal{padding:8px 12px;gap:10px}.journal strong{font-size:12px}.controls{font-size:10px;gap:6px}.story{padding:20px}.balloon{font-size:13px}}
</style>
