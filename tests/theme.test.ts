import { describe, expect, it, vi } from 'vitest';
import { clearPath, copyPath, isDeckSpecific } from '../src/model/lookPaths';
import { card, deck } from './fixtures';

vi.mock('../src/store/db', () => ({
  loadAll: async () => ({ project: { version: 1, name: 'T', lang: 'pt-BR', editions: [{ id: 'e', name: 'E', code: 'E' }], decks: [], characters: [], themes: [], seeded: ['pf1'] }, cards: [] }),
  saveProject: async () => undefined, saveCards: async () => undefined, deleteCards: async () => undefined, wipe: async () => undefined,
}));

const { app } = await import('../src/store/project.svelte');
const { EditorState } = await import('../src/ui/editor/editor.svelte');

describe('caminhos da aparência', () => {
  it('apaga um caminho e limpa grupos vazios', () => {
    const l = { style: 'ornado', pieces: { header: { style: 'gotico' }, cost: { style: 'pixel', opacity: 0.5 } } } as never;
    clearPath(l, 'pieces.*.style');
    expect(l).toEqual({ style: 'ornado', pieces: { cost: { opacity: 0.5 } } });
  });

  it('copia para outro deck sem levar as cores dele', () => {
    const from = { style: 'gotico', pieces: { header: { opacity: 0.4, colors: ['#ff0000'] } } } as never;
    const to = { style: 'ornado', pieces: { header: { colors: ['#0000ff'] } } } as never;
    copyPath(to, from, 'pieces.header', isDeckSpecific);
    copyPath(to, from, 'style', isDeckSpecific);
    expect(to).toEqual({ style: 'gotico', pieces: { header: { opacity: 0.4, colors: ['#0000ff'] } } });
  });
});

describe('tema no editor', () => {
  it('deck/coleção são rascunho: Salvar liga, aplica e tira os ajustes próprios das cartas', async () => {
    await app.load();
    app.project!.decks.push(deck({ id: 'a', editionId: 'e', colors: ['red'] }), deck({ id: 'b', editionId: 'e', colors: ['blue'], look: { style: 'ornado', pieces: { header: { style: 'ornado', colors: ['#0000ff'] } } } }));
    app.putCard(card({ id: 'x', deckId: 'a' }));
    app.putCard(card({ id: 'y', deckId: 'a', look: { style: 'pixel' } }));
    app.putCard(card({ id: 'z', deckId: 'b', look: { pieces: { header: { ink: '#ffffff', opacity: 0.2 } as never } } }));
    const ed = new EditorState(app.cards.x);
    ed.scope = 'collection';
    ed.setStyle('gotico');
    ed.setPiece('header', { opacity: 0.5, colors: ['#ff0000'] });
    expect(ed.dirty).toBe(true);
    expect(app.deck('a')!.look.style).not.toBe('gotico'); // ainda não gravou
    expect(ed.look.style).toBe('gotico'); // mas a pré-visualização já mostra
    ed.save();
    expect(ed.dirty).toBe(false);
    expect(app.deck('a')!.look.style).toBe('gotico');
    expect(app.deck('b')!.look.style).toBe('gotico');
    expect(app.deck('b')!.look.pieces?.header).toEqual({ opacity: 0.5, colors: ['#0000ff'] }); // cor do deck B fica
    expect(app.cards.y.look).toBeUndefined(); // estilo próprio saiu
    expect(app.cards.z.look?.pieces?.header).toEqual({ ink: '#ffffff' }); // opacidade própria saiu, cor do texto fica
  });

  it('ajustes feitos em "Esta carta" podem ser levados para o deck e aplicados nele', () => {
    app.putCard(card({ id: 'w', deckId: 'a' }));
    const ed = new EditorState(app.cards.w);
    ed.setPiece('rules', { fill: '#123456' });
    ed.scope = 'deck';
    expect(ed.hasCardLook).toBe(true);
    ed.promoteCardLook();
    expect(ed.hasCardLook).toBe(false);
    ed.save();
    expect(app.deck('a')!.look.pieces?.rules?.fill).toBe('#123456');
    expect(app.cards.w.look).toBeUndefined();
  });
});

describe('ajustes finos da aparência', () => {
  it('ataque e defesa: "os dois" vale para os dois; um lado só não mexe no outro', () => {
    app.putCard(card({ id: 's1', deckId: 'a' }));
    const ed = new EditorState(app.cards.s1);
    ed.setPiece('atk', { fill: '#ff0000' });
    expect(ed.piece('atk').fill).toBe('#ff0000');
    expect(ed.piece('def').fill).toBeUndefined();
    ed.setPiece('stat', { fill: '#00ff00' });
    expect(ed.piece('atk').fill).toBe('#00ff00');
    expect(ed.piece('def').fill).toBe('#00ff00');
    ed.setPiece('def', { ink: '#0000ff' });
    expect(ed.piece('atk').ink).toBeUndefined();
    ed.resetPiece('stat');
    expect(ed.look.pieces?.stat).toBeUndefined();
    expect(ed.look.pieces?.atk).toBeUndefined();
    expect(ed.look.pieces?.def).toBeUndefined();
  });

  it('mexer no selo de custo não muda o selo de classe (nem o contrário)', () => {
    const ed = new EditorState(app.cards.s1);
    const before = JSON.stringify(ed.piece('class'));
    ed.setPiece('cost', { style: 'gotico', fill: '#112233', ink: '#ffffff' }, ['image']);
    expect(JSON.stringify(ed.piece('class'))).toBe(before);
    expect(ed.look.icons?.class).toBeUndefined();
  });

  it('símbolo por recurso: vale para a coleção inteira; o de classe fica em cada deck', () => {
    app.putCard(card({ id: 'm1', deckId: 'b', cost: [{ resource: 'mana', amount: 2, show: 'number' }] }));
    const ed = new EditorState(app.cards.x, 'collection', true);
    ed.setResIcon('mana', { glyph: 'f3d-droplet' });
    ed.setResIcon('vigor', { glyph: 'f3d-red-heart' });
    ed.setIcon('class', { glyph: 'brutal-helm' });
    ed.save();
    expect(app.deck('b')!.look.icons?.res).toEqual({ mana: { glyph: 'f3d-droplet' }, vigor: { glyph: 'f3d-red-heart' } });
    expect(app.deck('b')!.look.icons?.class).toBeUndefined();
    expect(app.deck('a')!.look.icons?.class).toEqual({ glyph: 'brutal-helm' });
  });

  it('tela de tema: a carta de amostra não é gravada e as cartas do deck passam a seguir o tema', () => {
    app.putCard(card({ id: 'k1', deckId: 'a', look: { pieces: { rules: { fill: '#aaaaaa' } as never } } }));
    const ed = new EditorState(app.cards.k1, 'deck', true);
    expect(ed.draft.look).toBeUndefined(); // amostra sem os ajustes próprios
    expect(ed.dirty).toBe(false);
    ed.setPiece('rules', { fill: '#123123' });
    ed.save();
    expect(app.deck('a')!.look.pieces?.rules?.fill).toBe('#123123');
    expect(app.cards.k1.look).toBeUndefined(); // o ajuste próprio na mesma peça saiu
    expect(app.cards.k1.text['pt-BR'].name).toBe('Golpe');
  });
});

describe('símbolo por classe', () => {
  it('na coleção, cada classe tem o seu símbolo e ele vai para todos os decks', () => {
    const ed = new EditorState(app.cards.x, 'collection', true);
    ed.setClsIcon('red', { glyph: 'battle-axe' });
    ed.setClsIcon('blue', { glyph: 'wizard-staff' });
    ed.save();
    expect(app.deck('a')!.look.icons?.cls).toEqual({ red: { glyph: 'battle-axe' }, blue: { glyph: 'wizard-staff' } });
    expect(app.deck('b')!.look.icons?.cls).toEqual({ red: { glyph: 'battle-axe' }, blue: { glyph: 'wizard-staff' } });
    // o símbolo antigo (só da 1ª classe do deck) sai ao escolher o novo
    expect(app.deck('a')!.look.icons?.class?.glyph).toBeUndefined();
  });
});
