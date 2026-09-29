import { describe, expect, it } from 'vitest';
import { cardColors } from '../src/render/compose';
import { vivid, MULTICOLOR_GOLD } from '../src/render/palette';
import { toHsl } from '../src/render/color';

describe('cores da carta', () => {
  const five = ['#b92d20', '#2f7cff', '#4d8b34', '#6b3eb6', '#c3a15a', '#97a1af'];

  it('aceita até 5 cores', () => {
    expect(cardColors(five, { style: 'ornado' })).toHaveLength(5);
  });

  it('dourado multicor só vale para cartas de 2+ cores', () => {
    expect(cardColors(five.slice(0, 2), { style: 'ornado', colorMode: 'ouro' })).toEqual([MULTICOLOR_GOLD]);
    expect(cardColors(five.slice(0, 1), { style: 'ornado', colorMode: 'ouro' })).toEqual(['#b92d20']);
  });

  it('cores livres substituem as das classes', () => {
    expect(cardColors(five, { style: 'ornado', colorMode: 'livre', tint: ['#000000'] })).toEqual(['#000000']);
  });

  it('preto continua escuro (não vira cinza) e branco continua claro', () => {
    expect(toHsl(vivid('#000000')).l).toBeLessThan(0.12);
    expect(toHsl(vivid('#ffffff')).l).toBeGreaterThan(0.85);
  });
});
