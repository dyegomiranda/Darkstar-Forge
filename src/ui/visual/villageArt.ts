/** Cenário pixel art desenhado uma vez. As copas têm profundidade pelos pés,
 * separadas do piso; nenhuma decoração muda a grade de colisão. */
export type Cell = 'grass' | 'tree' | 'water' | 'house' | 'path';
export interface House { x: number; y: number; w: number; h: number; roof: string }
export interface Prop { x: number; y: number; foot: number; kind: 'tree' | 'house'; variant: number; canvas: HTMLCanvasElement }
export function villageArt(grid: Cell[][], houses: House[], tile = 32) {
  const width = grid[0].length * tile, height = grid.length * tile;
  const ground = document.createElement('canvas'); ground.width = width; ground.height = height;
  const g = ground.getContext('2d')!;
  const props: Prop[] = [];
  let seed = 771;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const rect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const shadow = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = 'rgb(20 34 40 / .27)'; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.fill();
  };
  const prop = (x: number, y: number, w: number, h: number, foot: number, kind: 'tree' | 'house', variant: number, paint: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    paint(canvas.getContext('2d')!); props.push({ x, y, foot, kind, variant, canvas });
  };
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
    const cell = grid[y][x], X = x * tile, Y = y * tile;
    const water = cell === 'water', path = cell === 'path';
    const grass = ['#52654b', '#53694d', '#566c50', '#50644b'];
    rect(g, X, Y, tile, tile, water ? '#34566a' : path ? '#a39575' : grass[Math.floor(rnd() * grass.length)]);
    for (let i = 0; i < 10; i++) {
      const dx = Math.floor(rnd() * 15) * 2, dy = Math.floor(rnd() * 15) * 2;
      rect(g, X + dx, Y + dy, water ? 4 + Math.floor(rnd() * 4) * 2 : 2, 2,
        water ? ['#3d687a', '#48798a', '#587d86'][i % 3] : path ? ['#b6a484', '#8d8269', '#c2b090'][i % 3] : ['#68805b', '#405846', '#7e8d63'][i % 3]);
      if (!water && !path && i < 3) rect(g, X + dx, Y + dy - 2, 2, 4, '#70845e');
    }
    // Bordas sólidas da margem e do calçamento acompanham as células, sem ruído aleatório de colisão.
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const other = grid[y + dy]?.[x + dx];
      if ((water && other !== 'water') || (path && other !== 'path' && other !== 'house')) {
        const edge = water ? '#a2a07b' : '#827a62';
        rect(g, X + (dx === 1 ? tile - 4 : 0), Y + (dy === 1 ? tile - 4 : 0), dx ? 4 : tile, dy ? 4 : tile, edge);
        if (water) rect(g, X + (dx === 1 ? tile - 6 : 2), Y + (dy === 1 ? tile - 6 : 2), dx ? 2 : tile - 4, dy ? 2 : tile - 4, '#648b89');
      }
    }
    if (path) {
      for (let i = 0; i < 3; i++) {
        const bx = X + (i % 2) * 15 + 2, by = Y + i * 10;
        rect(g, bx, by, 12, 7, i % 2 ? '#b0a48a' : '#9c937c');
        rect(g, bx, by, 10, 1, '#cab799');
      }
    }
    if (cell === 'grass' && rnd() < .13) {
      const fx = X + 10, fy = Y + 18;
      rect(g, fx, fy, 2, 6, '#364e42'); rect(g, fx - 2, fy - 2, 3, 3, '#bbaca8'); rect(g, fx + 2, fy, 2, 2, '#dec29e');
    }
    if (cell === 'tree') {
      shadow(X + 25, Y + 28, 24, 9);
      const variation = rnd();
      prop(X - 12, Y - 46, 58, 80, Y + 30, 'tree', variation < .38 ? 0 : variation < .7 ? 1 : variation < .76 ? 2 : 3, c => {
        rect(c, 26, 54, 9, 24, '#39423b'); rect(c, 28, 54, 3, 22, '#6d6550');
        rect(c, 21, 73, 19, 4, '#394d40');
        // Copas construídas por massas facetadas, com luz sempre no alto à esquerda.
        const blobs = [[8, 26, 26, 26], [24, 22, 26, 28], [14, 9, 30, 28], [5, 35, 43, 23]];
        for (const [bx, by, bw, bh] of blobs) {
          rect(c, bx + 2, by, bw - 4, bh, '#293f3c'); rect(c, bx, by + 4, bw, bh - 8, '#293f3c');
          rect(c, bx + 2, by + 2, bw - 8, bh - 8, variation < .5 ? '#435b45' : '#3c584b');
          rect(c, bx + 4, by + 2, bw - 14, 7, '#71845b');
          rect(c, bx + 5, by + 9, 6, 4, '#627957');
        }
        for (let j = 0; j < 25; j++) {
          const bx = 12 + Math.floor(rnd() * 30), by = 16 + Math.floor(rnd() * 35);
          rect(c, bx, by, 3 + Math.floor(rnd() * 3), 2, j % 3 ? '#506e50' : '#879266');
        }
      });
    }
  }
  for (const h of houses) {
    const X = h.x * tile, Y = h.y * tile, w = h.w * tile, height = h.h * tile;
    // O contato com o chão é desenhado junto à fundação; não há sombra solta no piso.
    prop(X - 8, Y - 38, w + 16, height + 42, Y + height, 'house', houses.indexOf(h), c => {
      const bottom = height + 38, eave = 86;
      rect(c, 14, eave, w - 12, bottom - eave, '#a79b7d');
      rect(c, 16, eave, w - 18, 8, '#6c6858');
      for (let y = eave + 12; y < bottom; y += 12) {
        rect(c, 14, y, w - 12, 1, '#857e68');
        for (let x = 18 + (y % 24 ? 12 : 0); x < w; x += 28) rect(c, x, y - 11, 1, 11, '#91876d');
      }
      rect(c, 14, eave, 6, bottom - eave, '#53584d'); rect(c, w - 4, eave, 6, bottom - eave, '#494f45');
      // Telhas escalonadas, beiral profundo e tijolos da chaminé.
      rect(c, w - 38, 15, 17, 30, '#686b61');
      for (let y = 16; y < 40; y += 6) rect(c, w - 37, y, 15, 1, '#989582');
      rect(c, w - 40, 12, 21, 5, '#b4aa8e');
      for (let y = 30; y < eave; y += 7) {
        const inset = Math.round((eave - y) * .18);
        rect(c, inset, y, w + 16 - inset * 2, 7, h.roof);
        rect(c, inset, y, w + 16 - inset * 2, 1, 'rgb(239 213 165 / .22)');
        for (let x = inset + (y % 2 ? 7 : 0); x < w + 10 - inset; x += 12) rect(c, x, y + 1, 1, 5, 'rgb(20 25 32 / .28)');
      }
      rect(c, 0, eave - 2, w + 16, 6, '#343f3e'); rect(c, 2, eave - 3, w + 12, 1, '#c2a77a');
      const door = 8 + Math.floor(h.w / 2) * tile + 6;
      rect(c, door - 3, bottom - 36, 26, 36, '#5d6052'); rect(c, door, bottom - 33, 20, 32, '#414e48');
      rect(c, door + 3, bottom - 32, 2, 29, '#637061'); rect(c, door + 14, bottom - 18, 2, 3, '#d6b671');
      rect(c, door - 6, bottom - 1, 32, 4, '#c1b295');
      for (const x of [28, w - 34]) {
        rect(c, x - 3, bottom - 40, 26, 26, '#555e53'); rect(c, x, bottom - 37, 20, 19, '#59727a');
        rect(c, x + 2, bottom - 36, 7, 7, '#c4c49e'); rect(c, x + 9, bottom - 37, 2, 19, '#a3977b');
        rect(c, x - 4, bottom - 18, 28, 4, '#7d7158');
        for (let j = 0; j < 5; j++) rect(c, x + j * 4, bottom - 15, 3, 5, j % 2 ? '#67815a' : '#947c80');
      }
    });
  }
  return { ground, props };
}

/** O atlas fica em uma única imagem; o recorte remove somente margens transparentes.
 * Os pés e a grade continuam iguais ao fallback, sem teleportar personagens. */
export async function refineVillageArt(art: ReturnType<typeof villageArt>): Promise<ReturnType<typeof villageArt>> {
  const image = new Image();
  image.src = new URL('cenarios/vila-atlas.png', document.baseURI).href;
  await image.decode();
  const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight;
  const c = source.getContext('2d', { willReadFrequently: true })!; c.drawImage(image, 0, 0);
  const pixels = c.getImageData(0, 0, source.width, source.height).data;
  const cw = source.width / 4, ch = source.height / 2;
  const clips = Array.from({ length: 8 }, (_, i) => {
    const x0 = Math.floor(i % 4 * cw), y0 = Math.floor(Math.floor(i / 4) * ch);
    let left = x0 + cw, top = y0 + ch, right = x0, bottom = y0;
    for (let y = y0; y < y0 + ch; y++) for (let x = x0; x < x0 + cw; x++) {
      if (pixels[(y * source.width + x) * 4 + 3] > 32) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  });
  const ground = document.createElement('canvas'); ground.width=art.ground.width; ground.height=art.ground.height;
  const floor=ground.getContext('2d')!; floor.drawImage(art.ground,0,0);
  const props = art.props.map(p => {
    const clip = clips[(p.kind === 'house' ? 0 : 4) + p.variant];
    if (clip.w <= 0 || clip.h <= 0) return p;
    const canvas = document.createElement('canvas'); canvas.width = p.canvas.width; canvas.height = p.canvas.height;
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const scale = Math.min((canvas.width - 2) / clip.w, (canvas.height - 4) / clip.h);
    const w = Math.round(clip.w * scale), h = Math.round(clip.h * scale);
    const dx=Math.round((canvas.width-w)/2),dy=canvas.height-h-4;
    if(p.kind==='house') {
      // Contato da fachada e da parede lateral: a base acompanha a perspectiva da arte.
      const poly=[[.08,.83],[.43,.93],[.72,.99],[.97,.84],[.55,.68],[.18,.7]];
      floor.fillStyle='#434d3b';floor.beginPath();poly.forEach(([x,y],i)=>{const X=p.x+dx+x*w,Y=p.y+dy+y*h+3;i?floor.lineTo(X,Y):floor.moveTo(X,Y);});floor.closePath();floor.fill();
      floor.strokeStyle='#333e35';floor.lineWidth=2;floor.stroke();
      // Caminho estreito até a porta das duas casas voltadas para a trilha.
      if(p.y<350){const door=p.x+dx+w*.43,bottom=p.y+dy+h*.94;floor.fillStyle='#7e795e';floor.fillRect(Math.round(door-10),Math.round(bottom),20,Math.max(0,352-bottom));
       floor.fillStyle='#a0987c';for(let y=bottom+6;y<350;y+=13)floor.fillRect(Math.round(door-7),Math.round(y),14,7);}
    }
    ctx.drawImage(source, clip.x, clip.y, clip.w, clip.h, dx, dy, w, h);
    return { ...p, canvas };
  });
  return { ...art, ground, props };
}
