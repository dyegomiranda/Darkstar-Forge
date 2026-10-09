"""Compose inspection sheets from real Blender renders; never retouch mesh/art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent.parent
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(fontpath,20)
cases=['brunhild512','brunhild1024','crate512','helmet512']
for case in cases:
    renders=root/'outputs'/case/'renders'
    required=[renders/f'angle-{a:03d}-256.png' for a in range(0,360,45)]
    if not all(p.exists() for p in required):
        raise SystemExit(f'Missing inspection renders: {case}')
    page=Image.new('RGB',(1040,620),'#202630');draw=ImageDraw.Draw(page)
    draw.text((18,12),case+' - malha gerada: oito vistas reais',font=font,fill='white')
    for i,(a,path) in enumerate(zip(range(0,360,45),required)):
        im=Image.open(path).convert('RGB')
        x=(i%4)*260;y=52+(i//4)*284
        page.paste(im,(x,y));draw.text((x+100,y+260),str(a)+'°',font=font,fill='white')
    page.save(renders/'eight-angles.png')
    Image.open(renders/'pixel-source-000-160.png').resize((640,640),Image.Resampling.NEAREST).save(renders/'pixel-preview-000-640.png')

page=Image.new('RGB',(1560,615),'#202630');draw=ImageDraw.Draw(page)
files=[root/'outputs/preprocess/brunhild-input_00001_.png',root/'outputs/brunhild512/renders/detail-000-768.png',root/'outputs/brunhild1024/renders/detail-000-768.png']
labels=['Entrada após preparo','Reconstrução 512','Reconstrução 1024']
captions=['Imagem de referência','721.536 triângulos','3.130.430 triângulos']
for i,(label,path) in enumerate(zip(labels,files)):
    draw.text((i*520+14,18),label,font=ImageFont.truetype(fontpath,23),fill='white')
    page.paste(Image.open(path).convert('RGB').resize((500,500),Image.Resampling.LANCZOS),(i*520+10,60))
    draw.text((i*520+14,578),captions[i],font=font,fill='#ccd2dc')
page.save(root/'outputs/reference-vs-reconstruction.png')
