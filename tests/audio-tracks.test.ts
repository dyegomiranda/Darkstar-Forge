import { describe, expect, it } from 'vitest';
import { build, TRACKS } from '../src/audio/tracks';

describe('faixas de música', () => {
  it('toda faixa monta e é só instrumental de fundo', () => {
    for (const def of TRACKS) {
      const t = build(def);
      expect(t.steps % 16).toBe(0);
      expect(t.steps).toBeGreaterThan(16 * 16);
      expect(t.ev.some((e) => e?.some((x) => x.v === 'bass'))).toBe(true);
      // instrumental de fundo: nenhuma voz solista
      expect(t.ev.flat().every((x) => !x || ['arp', 'pad', 'bass', 'gtr', 'kick', 'snare', 'hat', 'crash', 'tom', 'choir', 'bell', 'str', 'brass', 'taiko', 'roll'].includes(x.v))).toBe(true);
    }
  });
  it('há mais de uma faixa por clima (para o botão de próxima)', () => {
    for (const mood of ['title', 'menu', 'battle'] as const) expect(TRACKS.filter((t) => t.mood === mood).length).toBeGreaterThan(1);
  });
});
