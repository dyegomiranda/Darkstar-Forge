"""Review sheet and walk loop from packed production layers (does not replace source art)."""
from PIL import Image,ImageDraw
from pathlib import Path
import json
SRC=Path(__file__).parent;ROOT=SRC.parents[2];base=ROOT/'public/art/sample3d/directional'
m=json.loads((base/'manifest.json').read_text());size=m['size'];idle=Image.open(base/'idle.png');walk=Image.open(base/'walk.png');gear={k:Image.open(base/v['file']) for k,v in m['gear'].items()};cover={k:Image.open(base/v) for k,v in m['cover'].items()}
def composite(row,frame=0,equipped=False,walking=False):
 src=walk if walking else idle;tile=src.crop((frame*size,row*size,(frame+1)*size,(row+1)*size));pose=m['poses'][row][frame] if walking else m['idlePoses'][row]
 def piece(k):
  d=m['gear'][k];img=gear[k].crop((row*d['width'],0,(row+1)*d['width'],d['height']));p=pose['head' if k=='helmet' else 'chest' if k=='armor' else 'hand'];v=d['pivot'];return img,(p['x']-v['x'],p['y']-v['y'])
 if equipped:
  if m['directions'][row] in ['se','e','ne']:
   rear=Image.new('RGBA',(size,size));img,xy=piece('weapon');rear.alpha_composite(img,xy);rear.alpha_composite(tile);tile=rear
  mask=Image.new('L',(size,size),0);ImageDraw.Draw(mask).polygon([(p['x'],p['y']) for p in pose['headMask']],fill=255);tile.paste((0,0,0,0),(0,0),mask)
  extra=cover['walk' if walking else 'idle'].crop((frame*size,row*size,(frame+1)*size,(row+1)*size));tile.paste((0,0,0,0),(0,0),extra.getchannel('A'))
  img,xy=piece('armor');tile.alpha_composite(img,xy)
  img,xy=piece('helmet');tile.alpha_composite(img,xy)
  if m['directions'][row] not in ['se','e','ne']:
   img,xy=piece('weapon');tile.alpha_composite(img,xy)
 return tile
review=Image.new('RGB',(size*8,size*2),(31,36,43))
for row in range(8):
 for v in range(2):
  im=composite(row,equipped=bool(v));review.paste(im,(row*size,v*size),im)
review.save(SRC/'fitting-review.png')
frames=[]
for f in range(6):
 im=Image.new('RGB',(size*4,size*2),(31,36,43))
 for r in range(8):
  tile=composite(r,frame=f,equipped=True,walking=True);im.paste(tile,(r%4*size,r//4*size),tile)
 frames.append(im)
frames[0].save(SRC/'walk-review.gif',save_all=True,append_images=frames[1:],duration=[100,90,90,100,90,90],loop=0)
print('Review: eight cosmetic/equipped views and animated six-pose walk.')
