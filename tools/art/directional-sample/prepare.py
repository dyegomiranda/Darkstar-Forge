"""Pack source sprites without repainting them. Preserve source alpha and nearest pixels.
The manifest declares fitted anchors for this one adult human family, never per hero.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = Path(__file__).resolve().parents[3]
SRC = Path(__file__).parent
OUT = ROOT / 'public/art/sample3d/directional'
SIZE, FOOT, HEIGHT = 192, (96, 176), 158
DIRECTIONS = ['s','se','e','ne','n','nw','w','sw']

def sprites(path, cols, rows):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)[:,:,3]
    mask = a > 96
    seen = np.zeros(mask.shape, dtype=bool)
    groups = []
    for y,x in zip(*np.where(mask)):
        if seen[y,x]: continue
        stack=[(int(x),int(y))]; seen[y,x]=True
        points=[]
        while stack:
            px,py=stack.pop(); points.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<im.width and 0<=ny<im.height and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;stack.append((nx,ny))
        if len(points)<300: continue
        xs,ys=zip(*points)
        groups.append({'box':(min(xs),min(ys),max(xs)+1,max(ys)+1),'area':len(points)})
    if len(groups)!=cols*rows:
        if path.name != 'walk.png' or im.size != (1086,1448):
            raise ValueError(f'{path.name}: {len(groups)} major components; expected {cols*rows}. Inspect source instead of silently guessing.')
        # Source gutters are uneven and seven 1px outline bridges join adjacent rows.
        # Explicit reviewed separators isolate those frames; do not apply to another asset.
        xb=[0,229,386,539,691,844,1086]; yb=[0,190,369,546,728,909,1089,1269,1448]
        table=[]
        for row in range(rows):
            line=[]
            for col in range(cols):
                sub=mask[yb[row]:yb[row+1],xb[col]:xb[col+1]]
                # Select the main contiguous figure, excluding tiny outline remnants from neighbours.
                visited=np.zeros(sub.shape,dtype=bool); components=[]
                for sy,sx in zip(*np.where(sub)):
                    if visited[sy,sx]:continue
                    stack=[(int(sx),int(sy))];visited[sy,sx]=True;points=[]
                    while stack:
                        px,py=stack.pop();points.append((px,py))
                        for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                            if 0<=nx<sub.shape[1] and 0<=ny<sub.shape[0] and sub[ny,nx] and not visited[ny,nx]:
                                visited[ny,nx]=True;stack.append((nx,ny))
                    components.append(points)
                major=max(components,key=len);xx,yy=np.asarray(major).T
                if len(xx)<1000:raise ValueError('Incomplete source frame')
                line.append({'box':(int(xx.min())+xb[col],int(yy.min())+yb[row],int(xx.max())+1+xb[col],int(yy.max())+1+yb[row]),'area':len(xx)})
            table.append(line)
        return im,table
    groups.sort(key=lambda g:(g['box'][1]+g['box'][3])/2)
    table=[]
    for row in range(rows):
        cells=groups[row*cols:(row+1)*cols]
        cells.sort(key=lambda g:(g['box'][0]+g['box'][2])/2)
        table.append(cells)
    return im,table

def pack(path, cols, rows, scale=None):
    im,table=sprites(path,cols,rows)
    if scale is None:
        heights=sorted(g['box'][3]-g['box'][1] for line in table for g in line)
        scale=HEIGHT/heights[len(heights)//2]
    atlas=Image.new('RGBA',(SIZE*cols,SIZE*rows))
    poses=[]; boxes=[]
    for row,line in enumerate(table):
        ps=[];bs=[]
        for col,g in enumerate(line):
            x,y,r,b=g['box']
            # Crop only, no generated recolouring or anatomical deformation.
            tile=im.crop((x,y,r,b))
            w,h=round(tile.width*scale),round(tile.height*scale)
            tile=tile.resize((w,h),Image.Resampling.NEAREST)
            dx=FOOT[0]-w//2;dy=FOOT[1]-h
            if min(dx,dy)<4 or dx+w>SIZE-4:raise ValueError('Sprite overflows its frame.')
            atlas.alpha_composite(tile,(col*SIZE+dx,row*SIZE+dy))
            # Head/chest pivots follow visible contour, not cell bounds.
            pixels=np.asarray(tile); alpha=pixels[:,:,3]>150
            yy,xx=np.where(alpha[:round(h*.29)])
            hx=dx+round(float(np.median(xx)));hy=dy+round(h*.20)
            cy=dy+round(h*.42)
            band=alpha[round(h*.35):round(h*.48)]
            _,cx=np.where(band)
            chestx=dx+round(float(np.median(cx)))
            fractions=[.14,.18,.75,.84,.87,.22,.24,.12]
            handx=dx+round(w*fractions[row])
            handy=dy+round(h*.57)
            # Per-direction head mask leaves the torso/collar below it untouched.
            mask=[{'x':dx,'y':dy-1},{'x':dx+w,'y':dy-1},{'x':dx+w,'y':dy+round(h*.22)},{'x':hx+round(h*.15),'y':dy+round(h*.31)},{'x':hx-round(h*.15),'y':dy+round(h*.31)},{'x':dx,'y':dy+round(h*.22)}]
            ps.append({'head':{'x':hx,'y':hy},'chest':{'x':chestx,'y':cy},'hand':{'x':handx,'y':handy},'headMask':mask})
            bs.append({'source':[x,y,r,b],'packed':[dx,dy,w,h]})
        poses.append(ps);boxes.append(bs)
    return atlas,poses,boxes,scale

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    walk,poses,boxes,scale=pack(SRC/'walk.png',6,8)
    walk.save(OUT/'walk.png')
    idleSource,idleTable=sprites(SRC/'idle.png',4,2)
    idle=Image.new('RGBA',(SIZE,SIZE*8));idlePoses=[]
    # Idle source is a 4x2 turnaround; runtime rows use the same explicit order as walk.
    heights=[g['box'][3]-g['box'][1] for line in idleTable for g in line]
    idleScale=HEIGHT/sorted(heights)[len(heights)//2]
    for row,g in enumerate([g for line in idleTable for g in line]):
        x,y,r,b=g['box'];tile=idleSource.crop((x,y,r,b));w,h=round(tile.width*idleScale),round(tile.height*idleScale)
        tile=tile.resize((w,h),Image.Resampling.NEAREST);dx=FOOT[0]-w//2;dy=FOOT[1]-h
        idle.alpha_composite(tile,(dx,row*SIZE+dy))
        pose=json.loads(json.dumps(poses[row][0]));old=boxes[row][0]['packed']
        for key in ['head','chest','hand']:
            pose[key]['x']=round(dx+(pose[key]['x']-old[0])/old[2]*w)
            pose[key]['y']=round(dy+(pose[key]['y']-old[1])/old[3]*h)
        hx=pose['head']['x'];pose['headMask']=[{'x':dx,'y':dy-1},{'x':dx+w,'y':dy-1},{'x':dx+w,'y':dy+round(h*.22)},{'x':hx+round(h*.15),'y':dy+round(h*.31)},{'x':hx-round(h*.15),'y':dy+round(h*.31)},{'x':dx,'y':dy+round(h*.22)}]
        idlePoses.append(pose)
    idle.save(OUT/'idle.png')
    manifest={'version':1,'rig':'human-adult-sample-v1','size':SIZE,'foot':{'x':FOOT[0],'y':FOOT[1]},'directions':DIRECTIONS,'walk':{'file':'walk.png','frames':6,'stride':1.55},'idle':{'file':'idle.png','frames':1},'gear':{},'poses':poses,'idlePoses':idlePoses}
    (SRC/'packing.json').write_text(json.dumps({'walkScale':scale,'idleScale':idleScale,'walkBoxes':boxes},indent=2))
    gearSource,gearTable=sprites(SRC/'equipment.png',8,3)
    for row,(name,targetHeight) in enumerate([('helmet',52),('armor',58),('weapon',68)]):
        cells=gearTable[row]; heights=[round((g['box'][3]-g['box'][1])*(.82 if name=='helmet' else 1)) for g in cells]; factor=targetHeight/sorted(heights)[4]
        canvas=Image.new('RGBA',(128*8,128))
        for col,g in enumerate(cells):
            x,y,r,b=g['box'];b=y+round((b-y)*(.82 if name=='helmet' else 1));piece=gearSource.crop((x,y,r,b));piece=piece.resize((round((r-x)*factor),round((b-y)*factor)),Image.Resampling.NEAREST)
            canvas.alpha_composite(piece,(col*128+(128-piece.width)//2,12))
        canvas.save(OUT/(name+'.png'))
        pivotY=12+({'helmet':round(targetHeight*.70),'armor':round(targetHeight*.45),'weapon':round(targetHeight*.13)}[name])
        manifest['gear'][name]={'file':name+'.png','width':128,'height':128,'pivot':{'x':64,'y':pivotY}}
    # Coverage masks also remove isolated auburn pixels beyond the contour polygon.
    # This is a renderer mask, not a repaint of the source character.
    for name,atlas,ps in [('walk',walk,poses),('idle',idle,[[p] for p in idlePoses])]:
        mask=Image.new('RGBA',atlas.size); pixels=np.asarray(atlas).astype(np.int16)
        red=(pixels[:,:,0]-pixels[:,:,1]>40)&(pixels[:,:,0]>pixels[:,:,1]*1.55)&(pixels[:,:,0]>pixels[:,:,2]*1.7)&(pixels[:,:,1]<115)&(pixels[:,:,3]>0)
        for row,line in enumerate(ps):
            for frame,pose in enumerate(line):
                top=row*SIZE;left=frame*SIZE;bottom=min(SIZE,pose['head']['y']+23)
                yy,xx=np.where(red[top:top+bottom,left:left+SIZE])
                for y,x in zip(yy,xx):mask.putpixel((left+int(x),top+int(y)),(255,255,255,255))
        # Include the dark one-pixel contour beside auburn hair; colour-only masks
        # leave disconnected outline flecks visible behind a fitted helmet.
        mask=mask.filter(ImageFilter.MaxFilter(5))
        for row,line in enumerate(ps):
            for frame,pose in enumerate(line):
                top=row*SIZE;left=frame*SIZE;bottom=min(SIZE,pose['head']['y']+23)
                ImageDraw.Draw(mask).rectangle((left,top+bottom,left+SIZE-1,top+SIZE-1),fill=(0,0,0,0))
        mask.save(OUT/('head-cover-'+name+'.png'))
    manifest['cover']={'idle':'head-cover-idle.png','walk':'head-cover-walk.png'}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
    # Review all animation frames at native resolution, with clear separation.
    review=Image.new('RGB',walk.size,(29,35,43));review.paste(walk,(0,0),walk);review.save(SRC/'walk-review.png')
    print('Packed 48 walk frames, 8 idle views and 24 fitted equipment views.')
if __name__=='__main__':main()
