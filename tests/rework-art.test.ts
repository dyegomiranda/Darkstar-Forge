import { existsSync, openSync, readSync, closeSync } from 'node:fs';
import { expect, it } from 'vitest';
import { protoCollection } from '../src/model/seed';
import { reworkAsset, withPrototypeArt } from '../src/render/reworkArt';
import assets from '../src/data/rework-art.json';
import hashes from '../src/data/builtin-art-hashes.json';
it('todas as ilustrações oficiais têm arquivo; equipamentos recebem arte sem sobrescrever uploads', () => {
  for (const asset of Object.values(assets)) expect(existsSync(new URL('../public/'+asset,import.meta.url)),asset).toBe(true);
  for (const card of protoCollection().cards.filter(c=>c.gear)) {
    expect(reworkAsset(card),card.id).toBeDefined();
    expect(reworkAsset({...card,art:{...card.art,mediaId:'imagem-personalizada'}})).toBeUndefined();
  }
});
it('reconhece mídia oficial e preserva imagens e assets personalizados', () => {
  const base=protoCollection().cards.find(c=>c.game)!;
  for(const [id,name] of Object.entries(hashes)) expect(reworkAsset({...base,art:{...base.art,mediaId:id}})).toBe((assets as Record<string,string>)[name]);
  expect(reworkAsset({...base,art:{...base.art,asset:'minha-imagem.webp'}})).toBeUndefined();
});

it('nenhuma carta do catálogo jogável fica sem ilustração', () => {
  for(const card of protoCollection().cards) expect(reworkAsset(card),card.text['en-US'].name).toBeDefined();
});

it('substitui a arte antiga do Protótipo e reinicia o enquadramento sem alterar a carta', () => {
  const original = protoCollection().cards.find(c => c.game)!;
  const old = { ...original, art: { mediaId: 'arte-antiga-nao-mapeada', icon: original.art.icon, zoom: 3, x: 80, y: -70, mirror: true } };
  const updated = withPrototypeArt(old);
  expect(updated.art).toEqual({ asset: reworkAsset(original), icon: original.art.icon, zoom: 1, x: 0, y: 0, mirror: false });
  expect(updated.game).toBe(old.game);
  expect(updated.text).toBe(old.text);
  const outside = { ...old, deckId: 'meu-deck' };
  expect(withPrototypeArt(outside)).toBe(outside);
  const custom = { ...old, text: { ...old.text, 'en-US': { ...old.text['en-US'], name: 'Minha carta original' } } };
  expect(withPrototypeArt(custom)).toBe(custom);
});

it('as fontes de cada carta têm resolução própria, sem recortes pequenos de atlas', () => {
  for (const asset of Object.values(assets)) {
    // WebP com perda ("VP8 "): largura e altura ficam nos bytes 26–29
    const header = Buffer.alloc(30);
    const fd = openSync(new URL('../public/' + asset, import.meta.url), 'r');
    try { readSync(fd, header, 0, header.length, 0); } finally { closeSync(fd); }
    expect(header.toString('ascii', 0, 4) + header.toString('ascii', 8, 16), asset).toBe('RIFFWEBPVP8 ');
    expect(header.readUInt16LE(26) & 0x3fff, asset).toBeGreaterThanOrEqual(750);
    expect(header.readUInt16LE(28) & 0x3fff, asset).toBeGreaterThanOrEqual(1050);
  }
});
it('referências anteriores à arte oficial apontam para a fonte atual', () => {
  const base = protoCollection().cards.find(c => c.game)!;
  const name = base.text['en-US'].name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  expect(reworkAsset({ ...base, art: { ...base.art, asset: 'art/rework/cards/' + name + '.png' } })).toBe(reworkAsset(base));
  expect(reworkAsset({ ...base, art: { ...base.art, asset: 'art/rework/cards-hd/' + name + '.png' } })).toBe(reworkAsset(base));
});
