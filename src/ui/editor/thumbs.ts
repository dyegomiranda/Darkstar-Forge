/** Miniaturas para escolher estilos: uma peça sozinha, recortada, sobre fundo escuro. */
import { Defs } from '../../render/defs';
import { piece, type PieceKind, type StyleId } from '../../render/elements';
import { skeleton } from '../../render/layout';
import { makePalette, type MetalKind } from '../../render/palette';

let n = 0;
const cache = new Map<string, string>();

export function pieceThumb(style: StyleId, kind: PieceKind, colors: string[], metal?: MetalKind): string {
  const key = `${style}|${kind}|${colors.join(',')}|${metal ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = skeleton(240);
  const box = kind === 'stat' ? S.atk : kind === 'frame' ? S.card : (S as unknown as Record<string, typeof S.card>)[kind];
  const defs = new Defs(`th${++n}`);
  const ps = piece(style, kind);
  const out = ps.render({ box, pal: makePalette(colors, metal ?? ps.metal), defs, opacity: ps.opacity });
  const pad = kind === 'frame' ? 0 : kind === 'rules' ? 30 : 34;
  const vb = kind === 'frame' ? '0 0 750 1050' : `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}`;
  const bg = `<rect x="-200" y="-200" width="1200" height="1500" fill="#2a2320"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${defs}${bg}${out.svg}</svg>`;
  if (cache.size > 400) cache.clear();
  cache.set(key, svg);
  return svg;
}
