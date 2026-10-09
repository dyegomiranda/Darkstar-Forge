import { afterEach, beforeEach, expect, it, vi } from 'vitest';
let data: string | null = null;
beforeEach(() => { vi.resetModules(); data = null; vi.stubGlobal('localStorage', { getItem: () => data, setItem: (_: string, value: string) => { data = value; } }); });
afterEach(() => vi.unstubAllGlobals());
it('pular persiste; repetir reinicia somente o guia', async () => {
  const { tutorial } = await import('../src/app/tutorial.svelte');
  tutorial.choose(false); expect(tutorial.pending('battle')).toBe(false);
  expect(JSON.parse(data!).preference).toBe('skipped');
  tutorial.replay(); tutorial.advance('modes', 2); tutorial.advance('modes', 2);
  expect(tutorial.pending('modes')).toBe(false); expect(tutorial.pending('battle')).toBe(true);
  tutorial.emit('strike'); tutorial.restartBattle();
  expect(tutorial.events).toEqual({}); expect(tutorial.progress.finished).toContain('modes');
  tutorial.replay(); expect(tutorial.progress.finished).toEqual([]);expect(tutorial.progress.steps).toEqual({});
});
it('progresso por seção sobrevive a uma nova abertura', async () => {
  const { tutorial } = await import('../src/app/tutorial.svelte');
  tutorial.choose(true); tutorial.advance('solo', 5); tutorial.finish('journey');
  vi.resetModules(); const next = (await import('../src/app/tutorial.svelte')).tutorial;
  expect(next.index('solo')).toBe(1); expect(next.pending('journey')).toBe(false);
});

it('uma tentativa de treino não reabre automaticamente após sair ou recarregar', async () => {
  const { tutorial } = await import('../src/app/tutorial.svelte');
  tutorial.choose(true); expect(tutorial.shouldTrain()).toBe(true);
  expect(tutorial.beginBattle()).toBe(true);
  expect(tutorial.shouldTrain()).toBe(false);
  vi.resetModules(); const reloaded = (await import('../src/app/tutorial.svelte')).tutorial;
  expect(reloaded.shouldTrain()).toBe(false);
  expect(reloaded.beginBattle()).toBe(false);
  reloaded.replay(); expect(reloaded.shouldTrain()).toBe(true);
});
it('migra progresso antigo visto sem forçar outro duelo de treino', async () => {
  data = JSON.stringify({preference:'enabled',steps:{battle:3},finished:[]});
  const { tutorial } = await import('../src/app/tutorial.svelte');
  expect(tutorial.shouldTrain()).toBe(false);
});
