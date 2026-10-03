import { describe, expect, it, vi } from 'vitest';
import { card, deck } from './fixtures';

vi.mock('../src/store/db', () => ({
  loadAll: async () => ({ project: undefined, cards: [] }),
  saveProject: async () => undefined, saveCards: async () => undefined, deleteCards: async () => undefined, wipe: async () => undefined,
}));

const { app } = await import('../src/store/project.svelte');
const { HERO_BASES } = await import('../src/game/decks');
const { heroBaseOf } = await import('../src/model/equipment');

describe('restaurar backup antigo', () => {
  it('passa pelas atualizações: estilos que saíram viram Neutro e o equipamento da ficha vira cartas vestidas', async () => {
    const old = {
      version: 2, name: 'Antigo', lang: 'pt-BR' as const,
      editions: [{ id: 'e', name: 'E', code: 'E' }],
      decks: [deck({ id: 'd', editionId: 'e', look: { style: 'ornado' as never, pieces: { header: { style: 'ornadoRegio' as never } } } })],
      characters: [{ id: 'h', name: 'Herói', raceId: '', classColors: ['red' as const], level: 1, hp: 30, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, slots: {}, notes: '', play: structuredClone(HERO_BASES[0]) }],
      themes: [], seeded: ['pf1', 'proto1', 'proto-rules-5', 'proto-heroes-1', 'proto-avatars-1'],
    };
    await app.replaceAll(old, [card({ id: 'c', deckId: 'd' })]);
    expect(app.deck('d')!.look.style).toBe('neutro');
    expect(app.deck('d')!.look.pieces?.header?.style).toBe('neutro');
    const hero = app.project!.characters[0];
    expect(Object.keys(hero.slots)).toHaveLength(1 + HERO_BASES[0].gear.length); // a arma e cada peça
    expect(heroBaseOf(hero, app.cards).weapon.dmg).toBe(HERO_BASES[0].weapon.dmg);
    // as cartas agrupadas por deck acompanham o que foi restaurado
    expect(app.cardsOf('d').map((c) => c.id)).toEqual(['c']);
  });
});
