import { beforeEach, describe, expect, it, vi } from 'vitest';
import { card } from './fixtures';

// banco falso em memória: a 1ª gravação de cartas falha, as seguintes funcionam
const written: string[] = [];
let failNext = true;
vi.mock('../src/store/db', () => ({
  loadAll: async () => ({ project: { version: 1, name: 'T', lang: 'pt-BR', editions: [], decks: [], characters: [], themes: [] }, cards: [] }),
  saveProject: async () => undefined,
  saveCards: async (cards: { id: string }[]) => {
    if (failNext) { failNext = false; throw new Error('disco cheio'); }
    written.push(...cards.map((c) => c.id));
  },
  deleteCards: async () => undefined,
  wipe: async () => undefined,
}));

const { app } = await import('../src/store/project.svelte');

describe('salvamento', () => {
  beforeEach(async () => { await app.load(); });

  it('uma falha não trava os salvamentos seguintes (e a carta não se perde)', async () => {
    app.putCard(card({ id: 'a' }));
    await app.flush();
    expect(app.saveState).toBe('error');
    expect(written).not.toContain('a');

    app.putCard(card({ id: 'b' }));
    await app.flush();
    expect(app.saveState).toBe('saved');
    // a carta que falhou antes foi gravada junto na tentativa seguinte
    expect(written).toEqual(expect.arrayContaining(['a', 'b']));
  });
});
