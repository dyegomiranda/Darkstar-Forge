import { describe, expect, it } from 'vitest';
import { mergeLook, renderKey, footerText } from '../src/render/card';
import { card, deck } from './fixtures';

describe('aparência e cache', () => {
  it('ajustes da carta prevalecem sobre o tema do deck, peça a peça', () => {
    const base = { style: 'gotico' as const, pieces: { header: { style: 'gotico' as const, opacity: 0.5 } }, icons: { atk: { glyph: 'broadsword' } } };
    const m = mergeLook(base, { pieces: { header: { style: 'ornado' } }, icons: { atk: { color: '#fff' } } });
    expect(m.style).toBe('gotico');
    expect(m.pieces?.header).toEqual({ style: 'ornado', opacity: 0.5 });
    expect(m.icons?.atk).toEqual({ glyph: 'broadsword', color: '#fff' });
  });

  it('chave de cache é estável e não depende da URL temporária da arte', () => {
    const c = card({ art: { mediaId: 'abc', zoom: 1, x: 0, y: 0, mirror: false } });
    const k1 = renderKey(c, { deck: deck(), lang: 'pt-BR', mediaUrl: () => 'blob:1' });
    const k2 = renderKey(c, { deck: deck(), lang: 'pt-BR', mediaUrl: () => 'blob:2' });
    expect(k1).toBe(k2);
    const k3 = renderKey({ ...c, text: { ...c.text, 'pt-BR': { ...c.text['pt-BR'], name: 'Outro' } } }, { deck: deck(), lang: 'pt-BR', mediaUrl: () => '' });
    expect(k3).not.toBe(k1);
  });

  it('mudar o tema do deck muda a chave (a imagem é redesenhada)', () => {
    const c = card();
    const a = renderKey(c, { deck: deck(), lang: 'pt-BR', mediaUrl: () => '' });
    const b = renderKey(c, { deck: deck({ look: { style: 'pixel' } }), lang: 'pt-BR', mediaUrl: () => '' });
    expect(a).not.toBe(b);
  });

  it('rodapé mostra número, idioma e edição', () => {
    expect(footerText(card({ n: 4 }), { deck: deck(), lang: 'pt-BR', mediaUrl: () => '', edition: { id: 'ed1', name: '1ª', code: '1ª Ed.' } })).toBe('004/050 · PT-BR · 1ª Ed.');
  });
});

describe('o que a carta está usando', () => {
  it('tamanho do número separado do símbolo e cores aplicadas no relatório', async () => {
    // sem navegador: um medidor de texto de faz de conta (10 px por letra)
    (globalThis as Record<string, unknown>).OffscreenCanvas = class { getContext() { return { font: '', measureText: (t: string) => ({ width: t.length * 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }) }; } };
    const { composeEx } = await import('../src/render/compose');
    const base = { uid: 't', colors: ['#b92d20'], colorId: 'red', name: 'A', typeLine: 'B', rules: 'C', rarity: 'common', cost: [{ resource: 'vigor', amount: 2 }], stats: { atk: 1, def: 2 } };
    const a = composeEx({ ...base, look: { style: 'claro' }, info: true });
    // no Claro o ataque tem fundo na cor da carta e a defesa é branca
    expect(a.info.fill.def).toBe('#ffffff');
    expect(a.info.fill.atk).not.toBe('#ffffff');
    expect(a.info.ink.header).toMatch(/^#[0-9a-f]{6}$/i);
    const b = composeEx({ ...base, look: { style: 'claro', pieces: { def: { style: 'claro', fill: '#102030' } } }, info: true });
    expect(b.info.fill.def).toBe('#102030');
    expect(b.info.fill.atk).toBe(a.info.fill.atk);
    // número com tamanho próprio: o desenho muda só quando o valor muda
    const s1 = composeEx({ ...base, look: { style: 'neutro', icons: { cost: { size: 1.4 } } } }).svg;
    const s2 = composeEx({ ...base, look: { style: 'neutro', icons: { cost: { size: 1.4, numSize: 1 } } } }).svg;
    expect(s1).not.toBe(s2);
  });
});
