import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/audio/chip', () => ({ chip: {} }));
let data: string | null = null;
beforeEach(() => {
  vi.resetModules();
  data = null;
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'voidsun.settings' ? data : null, setItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('configurações resilientes', () => {
  it('uma configuração null não impede a abertura do jogo', async () => {
    data = 'null';
    const { settings } = await import('../src/app/settings.svelte');
    expect(settings.v.pace).toBe('normal');
    expect(settings.v.timeLimit).toBe(false);
  });
  it('valores inválidos e ajustes parciais não quebram a batalha', async () => {
    data = JSON.stringify({ rev: 2, pace: 'turbo', difficulty: 'impossível', music: 20, turnGuide: 'sim', tune: { battle: { hp: 2 } } });
    const { settings } = await import('../src/app/settings.svelte');
    expect(settings.v.pace).toBe('normal');
    expect(settings.v.difficulty).toBe('normal');
    expect(settings.v.music).toBe(1);
    expect(settings.v.turnGuide).toBe(true);
    expect(settings.v.tune.elite.hp).toBe(1);
    expect(settings.v.tune.battle.hp).toBe(2);
  });
  it('armazenamento bloqueado usa os padrões sem lançar erro', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError'); } });
    const { settings } = await import('../src/app/settings.svelte');
    expect(settings.v.tune.boss.hp).toBe(1);
  });
  it('restaurar padrões desfaz também os ajustes de inimigos', async () => {
    const { settings } = await import('../src/app/settings.svelte');
    settings.v.tune.battle.hp = 3;
    settings.reset();
    expect(settings.v.tune.battle.hp).toBe(1);
  });
});
