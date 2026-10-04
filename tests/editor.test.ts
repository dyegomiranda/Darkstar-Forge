import { describe, expect, it, vi } from 'vitest';
import { card, deck } from './fixtures';

vi.mock('../src/store/db', () => ({
  loadAll: async () => ({ project: { version: 1, name: 'T', lang: 'pt-BR', editions: [], decks: [], characters: [], themes: [] }, cards: [] }),
  saveProject: async () => undefined, saveCards: async () => undefined, deleteCards: async () => undefined, wipe: async () => undefined,
}));

const { app } = await import('../src/store/project.svelte');
const { EditorState } = await import('../src/ui/editor/editorState.svelte');

describe('editor', () => {
  it('edita uma cópia: nada muda no projeto até salvar; descartar volta ao salvo', async () => {
    await app.load();
    app.project!.decks.push(deck());
    app.putCard(card({ id: 'x' }));
    const ed = new EditorState(app.cards.x);
    ed.draft.text['pt-BR'].name = 'Mudado';
    expect(app.cards.x.text['pt-BR'].name).toBe('Golpe');
    expect(ed.dirty).toBe(true);
    ed.discard();
    expect(ed.draft.text['pt-BR'].name).toBe('Golpe');
    expect(ed.dirty).toBe(false);
    ed.draft.text['pt-BR'].name = 'Salvo';
    ed.save();
    expect(app.cards.x.text['pt-BR'].name).toBe('Salvo');
    // depois de salvar, continuar editando NÃO altera o projeto (a cópia segue separada)
    ed.draft.text['pt-BR'].name = 'Rascunho';
    expect(app.cards.x.text['pt-BR'].name).toBe('Salvo');
  });
});
