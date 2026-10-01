import { describe, expect, it } from 'vitest';
import { build, TRACKS } from '../src/audio/tracks';

describe('faixas de música', () => {
  it('toda faixa monta: compassos de 16 passos, um acorde por compasso, partes do formulário existem', () => {
    for (const def of TRACKS) {
      const t = build(def);
      expect(t.steps % 16).toBe(0);
      expect(t.steps).toBeGreaterThan(16 * 16);
      expect(t.ev.some((e) => e?.some((x) => x.v === 'lead'))).toBe(true);
    }
  });
  it('há mais de uma faixa por clima (para o botão de próxima)', () => {
    for (const mood of ['menu', 'battle'] as const) expect(TRACKS.filter((t) => t.mood === mood).length).toBeGreaterThan(1);
  });
});
