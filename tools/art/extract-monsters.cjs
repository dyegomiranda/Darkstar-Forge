const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/djabo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
const rows=[['skeleton','demon','stone','flame','wolf','bear','tower'],['hawk','spirit','thief','angel','sword','whelp','guardian'],['ballista','dragon']];
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox']}),p=await b.newPage();
 const jobs=JSON.parse(fs.readFileSync(path.join(__dirname,'monsters.json'),'utf8'));
 fs.mkdirSync(path.join(root,'public/creatures/rework'),{recursive:true});
 fs.mkdirSync(path.join(root,'public/heroes/rework'),{recursive:true});
 for(let index=0;index<jobs.length;index++){
  const data=fs.readFileSync(path.join(root,jobs[index].file)).toString('base64');
  const images=await p.evaluate(async({data,rows})=>{
   const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
   const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
   const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
   const rgba=ctx.getImageData(0,0,source.width,source.height).data;
   if(rgba[3]>0)throw new Error('Atlas precisa de transparência');
   const cells=Array.from({length:rows},(_,row)=>Array.from({length:6},(_,col)=>{
    const left=Math.round(col*image.width/6),top=Math.round(row*image.height/rows),right=Math.round((col+1)*image.width/6),bottom=Math.round((row+1)*image.height/rows);
    let x=right,y=bottom,r=left,bt=top;
    for(let py=top;py<bottom;py++)for(let px=left;px<right;px++)if(rgba[(py*image.width+px)*4+3]>96){x=Math.min(x,px);y=Math.min(y,py);r=Math.max(r,px);bt=Math.max(bt,py);}
    if(r<x||bt<y)throw new Error('Célula vazia');
    const feet=[];for(let py=Math.max(y,bt-5);py<=bt;py++)for(let px=x;px<=r;px++)if(rgba[(py*image.width+px)*4+3]>160)feet.push(px);
    feet.sort((a,b)=>a-b);
    return{x,y,w:r-x+1,h:bt-y+1,footX:feet[Math.floor(feet.length/2)]??(x+r)/2,footY:bt+1};
   }));
   return cells.map(row=>{
    const canvas=document.createElement('canvas');canvas.width=192;canvas.height=256;
    const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
    const k=48/Math.max(row[0].w,row[0].h,row[1].w,row[1].h);
    const draw=(pose,outRow,frame)=>{const f=row[pose];context.drawImage(image,f.x,f.y,f.w,f.h,Math.round(frame*64+32+(f.x-f.footX)*k),Math.round(outRow*64+56+(f.y-f.footY)*k),Math.round(f.w*k),Math.round(f.h*k));};
    draw(1,0,0);draw(0,1,0);[1,4,5].forEach((pose,f)=>draw(pose,2,f));[0,2,3].forEach((pose,f)=>draw(pose,3,f));
    const portrait=document.createElement('canvas');portrait.width=64;portrait.height=64;portrait.getContext('2d').drawImage(canvas,0,64,64,64,0,0,64,64);
    return {sheet:canvas.toDataURL('image/png').split(',')[1],portrait:portrait.toDataURL('image/png').split(',')[1]};
   });
  },{data,rows:rows[index].length});
  images.forEach((image,i)=>{fs.writeFileSync(path.join(root,'public/creatures/rework',rows[index][i]+'.png'),Buffer.from(image.sheet,'base64'));fs.writeFileSync(path.join(root,'public/heroes/rework',rows[index][i]+'.png'),Buffer.from(image.portrait,'base64'));});
  console.log(jobs[index].id+': '+images.length+' criaturas');
 }
 await b.close();
})().catch(e=>{console.error(e);process.exitCode=1});
