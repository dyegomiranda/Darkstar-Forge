// Recorta células dos atlas gerados. Não retoca nem estica a ilustração.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/home/djabo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../..');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(path.join(__dirname, 'production.json'), 'utf8'));
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  const page = await browser.newPage();
  // Este acervo é só a referência de composição. O manifesto de produção usa as fontes individuais HD.
  const manifest = {};
  fs.mkdirSync(path.join(root, 'public/art/rework/cards'), {recursive:true});
  for (const job of jobs) {
    const data = fs.readFileSync(path.join(root, job.file)).toString('base64');
    const cells = await page.evaluate(async ({data, count}) => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const ratio = image.width / image.height;
      if (ratio < 0.67 || ratio > 0.76) throw new Error('Atlas não é vertical 5:7: ' + image.width + 'x' + image.height);
      const output = [];
      for (let i=0; i<count; i++) {
        let x = Math.round((i%4)*image.width/4)+2, y = Math.round(Math.floor(i/4)*image.height/4)+2;
        let w = Math.round((i%4+1)*image.width/4)-x-2, h = Math.round((Math.floor(i/4)+1)*image.height/4)-y-2;
        // Remove apenas a linha divisória de produção; mantém 5:7 sem distorcer pixels.
        if(w/h>5/7){const width=Math.floor(h*5/7);x+=Math.floor((w-width)/2);w=width;}else{const height=Math.floor(w*7/5);y+=Math.floor((h-height)/2);h=height;}
        const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
        output.push(canvas.toDataURL('image/png').split(',')[1]);
      }
      return output;
    }, {data,count:job.subjects.length});
    cells.forEach((data,i)=> {
      const name = job.subjects[i], relative = 'art/rework/cards/' + name + '.png';
      fs.writeFileSync(path.join(root,'public',relative),Buffer.from(data,'base64'));
      manifest[name]=relative;
    });
    console.log(job.id + ': ' + cells.length + ' ilustrações verticais');
  }
  fs.writeFileSync(path.join(__dirname,'low-art-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await browser.close();
})().catch(error=> {console.error(error);process.exitCode=1;});
