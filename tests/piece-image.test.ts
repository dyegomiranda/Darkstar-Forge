import { describe, expect, it } from 'vitest';
import { Defs } from '../src/render/defs';
import { DEFAULT_PAD, drawPieceImage, imageContent } from '../src/render/pieceImage';
import { cardInput, lookMediaIds, renderKey } from '../src/render/card';
import { card, deck } from './fixtures';

const box = { x: 48, y: 700, w: 654, h: 244 };

describe('peças feitas de imagem', () => {
  it('9 partes: cantos no tamanho fixo e 9 recortes', () => {
    const d = new Defs('t');
    const svg = drawPieceImage(d, box, { src: 'IMG', w: 300, h: 200, fit: 'nine', slice: [60, 60, 60, 60], sliceScale: 1 }, '#f00');
    expect(svg.match(/<image /g)).toHaveLength(9);
    expect(svg.match(/clip-path=/g)).toHaveLength(9);
    // canto de cima à esquerda: 60×60 da imagem vira 60×60 na carta, sem esticar
    expect(d.toString()).toContain('<rect x="48" y="700" width="60.4" height="60.4"/>');
    expect(svg).not.toContain('<svg');
  });

  it('sem imagem (só texto): nada é desenhado, mas o texto tem lugar', () => {
    expect(drawPieceImage(new Defs('t'), box, { fit: 'stretch' }, '#f00')).toBe('');
    const [t, r, b, l] = DEFAULT_PAD.rules;
    expect(imageContent('rules', box, { fit: 'stretch' })).toEqual({ x: 48 + l, y: 700 + t, w: 654 - l - r, h: 244 - t - b });
  });

  it('ajuste fino move e redimensiona a peça', () => {
    const c = imageContent('header', { x: 100, y: 50, w: 500, h: 80 }, { fit: 'stretch', dx: 10, dy: -5, dw: 20, dh: 10, pad: [0, 0, 0, 0] });
    expect(c).toEqual({ x: 110, y: 45, w: 520, h: 90 });
  });

  it('tingir aplica um filtro na cor da carta', () => {
    const d = new Defs('t');
    const svg = drawPieceImage(d, box, { src: 'IMG', fit: 'stretch', tint: 0.6 }, '#2f7cff');
    expect(svg).toContain('filter="url(#');
    expect(d.toString()).toContain('flood-color="#2f7cff"');
  });

  it('a imagem da peça é carregada e a chave de cache usa o id (não a URL temporária)', () => {
    const look = { style: 'ornado' as const, pieces: { rules: { style: 'ornado' as const, image: { mediaId: 'abc', fit: 'nine' as const } } } };
    expect(lookMediaIds(look)).toEqual(['abc']);
    const c = card({ look });
    const k1 = renderKey(c, { deck: deck(), lang: 'pt-BR', mediaUrl: () => 'blob:1' });
    const k2 = renderKey(c, { deck: deck(), lang: 'pt-BR', mediaUrl: () => 'blob:2' });
    expect(k1).toBe(k2);
    expect(cardInput(c, { deck: deck(), lang: 'pt-BR', mediaUrl: () => 'blob:9' }).look.pieces?.rules?.image?.src).toBe('blob:9');
  });
});
