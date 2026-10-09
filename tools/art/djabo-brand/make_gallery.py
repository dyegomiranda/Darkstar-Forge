"""Arrange unmodified concept previews into numbered selection sheets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[3]/'exports/djabo-symbols-2026-10-08'
font=ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf',24)
for first,name in [(1,'propostas-01-10.png'),(11,'minimalistas-11-20.png')]:
    board=Image.new('RGB',(2000,920),'#080808');draw=ImageDraw.Draw(board)
    for j,n in enumerate(range(first,first+10)):
        source=root/f'{n:02}.png'
        if not source.exists():break
        x=(j%5)*400;y=(j//5)*460
        im=Image.open(source).convert('RGB');im.thumbnail((390,390),Image.Resampling.LANCZOS)
        board.paste(im,(x+(400-im.width)//2,y+8+(390-im.height)//2))
        draw.text((x+200,y+415),f'{n:02}',font=font,fill='#a8a8a8',anchor='mm')
    else:board.save(root/name)
