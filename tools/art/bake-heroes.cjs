const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/djabo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox']}),p=await b.newPage();await p.goto('http://127.0.0.1:5180');
 const ids=['brunhild','kael','lyra','morgana','vex','aldric','ren'];
 const output=path.join(root,'public/art/rework/heroFrames');fs.mkdirSync(output,{recursive:true});
 for(const id of ids){
  const data=await p.evaluate(async id=>{
   const {PRESET_AVATARS}=await import('/src/avatar/presets.ts'),{illustratedSheet}=await import('/tools/art/heroSource.ts');
   const av=PRESET_AVATARS[id];if(!av)throw new Error('Herói ausente: '+id);
   const idle=await illustratedSheet(av,'idle'),walk=await illustratedSheet(av,'walk'),attack=await illustratedSheet(av,'slash');
   const canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   for(let row=0;row<8;row++){
    ctx.drawImage(idle.canvas,0,row*64,64,64,0,row*64,64,64);
    for(const [src,out] of [[1,1],[3,2]])ctx.drawImage(walk.canvas,src*64,row*64,64,64,out*64,row*64,64,64);
    for(let col=0;col<3;col++)ctx.drawImage(attack.canvas,col*64,row*64,64,64,(col+3)*64,row*64,64,64);
   }
   return canvas.toDataURL('image/png').split(',')[1];
  },id);
  fs.writeFileSync(path.join(output,id+'.png'),Buffer.from(data,'base64'));console.log(id+': 48 quadros normalizados');
 }
 await b.close();
})().catch(e=>{console.error(e);process.exitCode=1});
