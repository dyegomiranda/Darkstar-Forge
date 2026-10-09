import { beforeEach, describe, expect, it, vi } from 'vitest';
import { card } from './fixtures';

// banco falso em memória: a 1ª gravação de cartas falha, as seguintes funcionam
const written: string[] = [];
let failNext = false;
let gate: Promise<void> | null = null;
let started: (() => void) | null = null;
const savedNames: string[] = [];
const deleted: string[] = [];
vi.mock('../src/store/db', () => ({
  loadAll: async () => ({ project: { version: 1, name: 'T', lang: 'pt-BR', editions: [], decks: [], characters: [], themes: [] }, cards: [] }),
  saveProject: async (p: { name: string }) => { savedNames.push(p.name); },
  saveCards: async (cards: { id: string }[]) => {
    started?.();
    if (gate) await gate;
    if (failNext) { failNext = false; throw new Error('disco cheio'); }
    written.push(...cards.map((c) => c.id));
  },
  deleteCards: async (ids: string[]) => { deleted.push(...ids); },
  wipe: async () => undefined,
  replaceProject: async () => undefined,
}));

const { app } = await import('../src/store/project.svelte');

beforeEach(async () => { failNext = false; gate = null; started = null; await app.flush(); await app.load(); await app.flush(); written.length = 0; savedNames.length = 0; deleted.length = 0; });

describe('salvamento', () => {


  it('uma falha não trava os salvamentos seguintes (e a carta não se perde)', async () => {
    failNext = true;
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

describe('salvamentos concorrentes', () => {
  it('editar durante uma gravação mantém o estado pendente até a próxima gravação', async () => {
    let release!: () => void;
    gate = new Promise<void>((resolve) => { release = resolve; });
    const begun = new Promise<void>((resolve) => { started = resolve; });
    app.updateProject((p) => { p.name = 'antes'; });
    app.putCard(card({ id: 'first' }));
    const flush = app.flush();
    await begun;
    app.updateProject((p) => { p.name = 'depois'; });
    app.putCard(card({ id: 'second' }));
    release();
    await flush;
    expect(savedNames.at(-1)).toBe('antes');
    expect(app.hasPending).toBe(true);
    expect(app.saveState).toBe('saving');
    gate = null;
    await app.flush();
    expect(savedNames.at(-1)).toBe('depois');
    expect(app.saveState).toBe('saved');
    expect(written).toContain('second');
  });
  it('restaurar uma carta antes de gravar cancela a exclusão pendente', async () => {
    app.putCard(card({ id: 'restored' }));
    app.deleteCards(['restored']);
    app.putCard(card({ id: 'restored' }));
    await app.flush();
    expect(written).toContain('restored');
    expect(deleted).not.toContain('restored');
  });
});
