const {_electron}=require('/home/djabo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{let app;try{
const root='/home/djabo/Downloads/Void Sun',profile='/tmp/djabo-alpha-'+process.pid;fs.mkdirSync(profile,{recursive:true});
const env=Object.fromEntries(Object.entries({...process.env,DISPLAY:':0',VOIDSUN_DATA:profile}).filter(([k])=>!['ELECTRON_RUN_AS_NODE','FORGE_DEV_URL'].includes(k)));
app=await _electron.launch({executablePath:root+'/node_modules/electron/dist/electron',args:['--ozone-platform=x11','--no-sandbox',root],env});
const page=await app.firstWindow();await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.webContents.setZoomFactor(1);w.setContentSize(1294,1294);});
const svg=fs.readFileSync(root+'/public/brand/djabo-vector/symbol-selected-18-alpha.svg','utf8');await page.goto('data:text/html;charset=utf-8,'+encodeURIComponent('<html><head><style>html,body{margin:0;background:transparent;}svg{display:block;}</style></head><body>'+svg+'</body></html>'));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));await page.setViewportSize({width:1280,height:1280});
await page.waitForTimeout(400);await page.locator('svg').screenshot({path:root+'/public/brand/djabo-vector/symbol-selected-18-alpha.png',omitBackground:true});
await page.addStyleTag({content:'html,body{background:#d6d6d6!important}'});await page.locator('svg').screenshot({path:root+'/exports/djabo-opening-3.12.8/alpha-on-gray.png'});
console.log('Rendered exact original silhouette with alpha.');
}finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
