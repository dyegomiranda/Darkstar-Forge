const {_electron}=require('/home/djabo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const root='/home/djabo/Downloads/Void Sun';const out=process.env.DJABO_QA_OUT||'/tmp/djabo-intro-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{let app;try{
 const profile='/tmp/djabo-intro-profile-'+process.pid;fs.mkdirSync(profile,{recursive:true});fs.writeFileSync(profile+'/janela.json',JSON.stringify({mode:'windowed',width:1440,height:900,zoom:1}));
 const env=Object.fromEntries(Object.entries({...process.env,DISPLAY:process.env.DISPLAY||':0',VOIDSUN_DATA:profile}).filter(([k])=>k!=='FORGE_DEV_URL'&&k!=='ELECTRON_RUN_AS_NODE'));
 const packed=process.env.VOIDSUN_QA_PACKED==='1';
 app=await _electron.launch({executablePath:packed?root+'/Void Sun':root+'/node_modules/electron/dist/electron',args:['--ozone-platform=x11','--disable-features=Vulkan','--no-sandbox',...(packed?[]:[root])],env,timeout:30000});
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.waitForTimeout(1400);await page.mouse.click(30,40);await page.waitForTimeout(1800);
 await page.evaluate(()=>{localStorage.setItem('voidsun.aviso','1');sessionStorage.setItem('voidsun.aviso.sessao','1');});
 for(let i=0;i<30;i++){for(const name of ['Próxima página','Entendido!','Pular tutorial']){const b=page.getByRole('button',{name,exact:true});if(await b.isVisible().catch(()=>false))await b.click({force:true});}await page.waitForTimeout(350);}
 await page.getByRole('button',{name:'Abertura Djabo 3D',exact:true}).click({timeout:15000});
 await page.waitForSelector('[data-intro-ready="true"]',{timeout:45000});
 const snap=async()=>JSON.parse(await page.locator('output[data-intro-snapshot]').getAttribute('data-intro-snapshot'));
 const capture=async(name)=>{const b64=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(out+'/'+name+'.png',Buffer.from(b64,'base64'));};
 const seek=async(t)=>{await page.getByRole('slider').fill(String(t));await page.waitForTimeout(150);};
 await seek(1.25);await capture('capacete');await seek(2.5);await capture('emergencia');await seek(3.8);await capture('golpe-1');await seek(4.2);await capture('golpe-2');await seek(7);await capture('assinatura');
 let s=await snap();assert.ok(s.clips.includes('Golpe'));assert.ok(s.triangles>10000&&s.triangles<160000,'orçamento geometria '+s.triangles);
 await page.getByLabel('Auras e rastro',{exact:true}).uncheck();await page.getByRole('button',{name:'Inspecionar modelo',exact:true}).click();await page.getByRole('button',{name:'Ver de frente',exact:true}).click();await page.waitForTimeout(500);await capture('modelo-frente-sem-vfx');
 const box=await page.locator('canvas').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+240,box.y+box.height*.5,{steps:24});await page.mouse.up();await page.waitForTimeout(550);await capture('modelo-lateral');
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+360,box.y+box.height*.5,{steps:24});await page.mouse.up();await page.waitForTimeout(550);await capture('modelo-costas');
 await page.getByLabel('Auras e rastro',{exact:true}).check();await page.getByRole('button',{name:'Reproduzir abertura',exact:true}).click();await page.waitForTimeout(4100);await capture('corte-em-movimento');await page.waitForTimeout(5500);s=await snap();assert.ok(s.time>=8.8);await capture('fim');
 await page.getByRole('button',{name:'Ver sem controles',exact:true}).click();
 if(process.env.DJABO_QA_VIDEO==='1'){
  fs.mkdirSync(out+'/frames',{recursive:true});const style=await page.addStyleTag({content:'.exit-full{visibility:hidden!important}'});
  const started=Date.now(),entries=[];let i=0;
  while(Date.now()-started<9600){const before=Date.now();const name='frames/'+String(i++).padStart(4,'0');await capture(name);entries.push({name,t:Date.now()-started});await page.waitForTimeout(Math.max(1,67-(Date.now()-before)));}
  fs.writeFileSync(out+'/frames.ffconcat','ffconcat version 1.0\n'+entries.map((e,i)=>`file '${e.name}.png'\nduration ${((entries[i+1]?.t??e.t+67)-e.t)/1000}\n`).join(''));
  await style.evaluate(e=>e.remove());
 }else await page.waitForTimeout(7000);
 await capture('cinema');await page.getByRole('button',{name:'Mostrar controles',exact:true}).click();
 await page.getByRole('button',{name:'‹ Menu',exact:true}).click();await page.waitForTimeout(300);await page.getByRole('button',{name:'Abertura Djabo 3D',exact:true}).click();await page.waitForSelector('[data-intro-ready="true"]',{timeout:45000});
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(out+'/resultado.json',JSON.stringify({packed,version:await app.evaluate(({app})=>app.getVersion()),errors,snapshot:s},null,2));console.log(JSON.stringify({packed,errors,snapshot:s}));
 }catch(e){console.error(e);process.exitCode=1;if(app){try{const b64=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(out+'/erro.png',Buffer.from(b64,'base64'));}catch{}}}
 finally{if(app)await app.close().catch(()=>{});}
})();
