const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/home/djabo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const root=path.resolve(__dirname,'../..'),job=JSON.parse(fs.readFileSync(path.join(__dirname,'scenes.json'),'utf8'));
const data=fs.readFileSync(path.join(root,job.file)).toString('base64'),ids=['santuario','floresta','campo','vulcao','masmorra','neve','deserto','pantano','cripta'];
const b=await chromium.launch({headless:true,args:['--no-sandbox']}),p=await b.newPage();
const cells=await p.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();return Array.from({length:9},(_,i)=>{const x=Math.round(i%3*image.width/3)+2,y=Math.round(Math.floor(i/3)*image.height/3)+2,w=Math.round((i%3+1)*image.width/3)-x-2,h=Math.round((Math.floor(i/3)+1)*image.height/3)-y-2;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);return canvas.toDataURL('image/webp',.97).split(',')[1];});},data);
fs.mkdirSync(path.join(root,'public/art/rework/scenes'),{recursive:true});cells.forEach((v,i)=>fs.writeFileSync(path.join(root,'public/art/rework/scenes',ids[i]+'.webp'),Buffer.from(v,'base64')));await b.close();console.log('9 cenários com chão livre');
})().catch(e=>{console.error(e);process.exitCode=1});
