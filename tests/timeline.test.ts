import { afterEach, describe, expect, it, vi } from 'vitest';
import { BattleTimeline } from '../src/game/timeline';

afterEach(() => vi.useRealTimers());
describe('ciclo de vida da batalha', () => {
  it('sair cancela efeitos atrasados e libera um bot que estava aguardando', async () => {
    vi.useFakeTimers();
    const timeline = new BattleTimeline();
    const effect = vi.fn();
    const token = timeline.token;
    timeline.schedule(effect, 900);
    const wait = timeline.sleep(2000);
    timeline.reset();
    expect(await wait).toBe(false);
    expect(timeline.current(token)).toBe(false);
    await vi.runAllTimersAsync();
    expect(effect).not.toHaveBeenCalled();
  });
  it('reiniciar não cancela os efeitos da nova partida', async () => {
    vi.useFakeTimers();
    const timeline = new BattleTimeline();
    const old = vi.fn(), fresh = vi.fn();
    timeline.schedule(old, 100);
    timeline.reset();
    timeline.schedule(fresh, 100);
    const wait = timeline.sleep(100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await wait).toBe(true);
    expect(old).not.toHaveBeenCalled();
    expect(fresh).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
