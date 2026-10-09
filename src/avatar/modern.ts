/** Personagens modulares: todas as camadas compartilham o mesmo quadro e pivô. */
import artwork from '../data/avatar-art.json';
import type { Facing } from './direction';
const ATLAS_DIRECTIONS: Facing[] = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
import { LPC, FX_COLORS, TINTS, itemOf, type Anim, type Avatar, type Material, type Part, type Sheet, type SlotId } from './lpc';

interface Layer { asset: string; material: Material; slot: string }
const catalog = artwork as { complete: boolean; previewEnabled?: boolean; layers: Record<string, Layer> };
export const avatarArtPreview = catalog.previewEnabled === true && typeof location !== 'undefined' && new URLSearchParams(location.search).get('avatarPreview') === '1';
const sources = new Map<string, Promise<HTMLImageElement>>();
const painted = new Map<string, HTMLCanvasElement>();
const SIZE = 128;
async function source(id: string): Promise<HTMLImageElement> {
  const layer = catalog.layers[id];
  if (!layer) throw new Error('Camada de personagem ausente: ' + id);
  let pending = sources.get(id);
  if (!pending) {
    pending = (async () => {
      const im = new Image(); im.src = new URL(layer.asset, document.baseURI).href;
      await im.decode();
      if (im.width !== SIZE * 6 || im.height !== SIZE * 8) throw new Error('Atlas de personagem inválido: ' + id);
      return im;
    })();
    sources.set(id, pending);
    if (sources.size > 48) sources.delete(sources.keys().next().value!);
    pending.catch(() => sources.delete(id));
  }
  return pending;
}
const rgb = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
async function layer(id: string, part: Part | undefined, av: Avatar): Promise<CanvasImageSource> {
  const im = await source(id), mat = catalog.layers[id].material;
  const name = mat === 'body' ? (part?.color ?? av.skin) : mat === 'eye' ? av.eyes : part?.color;
  const ramp = part?.tint && TINTS[part.tint] ? TINTS[part.tint].ramp : name ? LPC.palettes[mat]?.colors[name] : undefined;
  if (!ramp) return im;
  const key = id + JSON.stringify([ramp, part?.style]);
  const previous = painted.get(key); if (previous) return previous;
  const c = document.createElement('canvas');c.width = im.width;c.height = im.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;ctx.drawImage(im, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height), colors = ramp.map(rgb);
  for (let i = 0; i < data.data.length; i += 4) {
    const d = data.data; if (d[i + 3] < 100) continue;
    const max = Math.max(d[i], d[i+1], d[i+2]), min = Math.min(d[i], d[i+1], d[i+2]);
    if (max < 32) continue; // preserve the drawn outline
    const skin = d[i] > d[i+1] * 1.06 && d[i+1] > d[i+2] * 1.05;
    if (mat === 'body' && !skin) continue;
    if ((mat === 'metal' || mat === 'cloth') && max - min > max * .24) continue; // inset jewels and wood retain their colours
    const lum = (d[i] * .3 + d[i+1] * .59 + d[i+2] * .11) / 255;
    const col = colors[Math.min(colors.length - 1, Math.floor(Math.pow(lum, .8) * colors.length))];
    d[i] = col[0]; d[i+1] = col[1]; d[i+2] = col[2];
  }
  ctx.putImageData(data, 0, 0);painted.set(key, c);
  if (painted.size > 32) painted.delete(painted.keys().next().value!);
  return c;
}
const FRONT_ORDER = ['tail','wings','cape','back','body','legs','feet','torso','arms','shoulders','belt','neck','race','expression','eyes','nose','ears','eyebrows','hair','beard','mustache','horns','head','crest','visor','face','hands','ring','ring2','shield','offhand','weapon'];
export async function modernSheet(av: Avatar, anim: Anim, preview = false): Promise<Sheet | undefined> {
  const testing = preview || avatarArtPreview;
  if (!catalog.complete && !testing) return;
  const requestedBody = av.frame ? 'frame-' + av.frame : 'body-' + av.body;
  const body = catalog.layers[requestedBody] ? requestedBody : testing ? 'body-' + (av.body === 'female' ? 'female' : 'male') : requestedBody;
  const picks: { id: string; slot: string; part?: Part }[] = [{id: body,slot:'body'}];
  if (av.head) picks.push({id:'race-' + av.head,slot:'race'});
  if (!av.head && av.face) picks.push({id:'expression-' + av.face,slot:'expression'});
  for (const [slot,part] of Object.entries(av.parts) as [SlotId,Part][]) {
    if (!part || !itemOf(slot,part.id)) continue;
    if (av.head && ['eyes','eyebrows','nose','beard','mustache'].includes(slot)) continue;
    picks.push({id:part.id,slot,part});
  }
  // A prévia não modifica a ficha: peças ainda não produzidas ficam ausentes apenas neste teste.
  const available = testing ? picks.filter(p => catalog.layers[p.id]) : picks;
  picks.splice(0, picks.length, ...available);
  const layers = await Promise.all(picks.map(p => layer(p.id,p.part,av)));
  const poses = anim === 'idle' ? [0] : anim === 'walk' ? [0,1,0,2] : anim === 'hurt' ? [0,3,5] : anim === 'spellcast' ? [3,4,3,5] : [3,4,5];
  const canvas = document.createElement('canvas');canvas.width = SIZE * poses.length;canvas.height = SIZE * 8;
  const ctx = canvas.getContext('2d')!;ctx.imageSmoothingEnabled = false;
  let fx: Sheet['fx'];
  const wp = av.parts.weapon;
  const mask = wp?.fx ? document.createElement('canvas') : undefined;
  if (mask) { mask.width = canvas.width;mask.height = canvas.height; }
  for (let row = 0;row < 8;row++) {
    const back = row >= 3 && row <= 5;
    const order = back ? FRONT_ORDER.filter(s => !['back','cape','wings','tail'].includes(s)).concat(['cape','back','tail','wings']) : FRONT_ORDER;
    const indices = picks.map((p,i)=>i).sort((a,b)=>order.indexOf(picks[a].slot)-order.indexOf(picks[b].slot));
    for (const i of indices) poses.forEach((pose,f) => {
      const p = picks[i];
      ctx.save();
      if (p.slot === 'ring2' || p.slot === 'offhand') { ctx.translate(f * SIZE * 2 + SIZE, 0);ctx.scale(-1,1); }
      ctx.drawImage(layers[i],pose * SIZE,row * SIZE,SIZE,SIZE,f * SIZE,row * SIZE,SIZE,SIZE);
      ctx.restore();
      if (mask && p.slot === 'weapon') mask.getContext('2d')!.drawImage(layers[i],pose * SIZE,row * SIZE,SIZE,SIZE,f * SIZE,row * SIZE,SIZE,SIZE);
    });
  }
  if (mask && wp?.fx) fx = {mask,kind:wp.fx,color:wp.fxColor && FX_COLORS[wp.fxColor] ? wp.fxColor : 'purple'};
  return {canvas,size:SIZE,density:2,frames:poses.length,rows:8,directions:[...ATLAS_DIRECTIONS],fx};
}
