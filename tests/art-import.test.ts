import { describe, expect, it } from 'vitest';
import { matchCard, slug } from '../src/export/artImport';
import prompts from '../tools/comfyui/prompts-pf.json';
import pf from '../src/data/pf-cards.json';
import { card } from './fixtures';

const cards = [
  card({ id: 'a', deckId: 'pf-red', n: 1, text: { 'pt-BR': { name: 'Corte Duplo', type: '', subtype: '', rules: '', flavor: '' }, 'en-US': { name: 'Double Slice', type: '', subtype: '', rules: '', flavor: '' } } }),
  card({ id: 'b', deckId: 'red', n: 1, text: { 'pt-BR': { name: 'Bola de Fogo', type: '', subtype: '', rules: '', flavor: '' }, 'en-US': { name: 'Fireball', type: '', subtype: '', rules: '', flavor: '' } } }),
  card({ id: 'c', deckId: 'pf-blue', n: 2, text: { 'pt-BR': { name: 'Bola de Fogo', type: '', subtype: '', rules: '', flavor: '' }, 'en-US': { name: 'Fireball', type: '', subtype: '', rules: '', flavor: '' } } }),
];
const edOf = (d: string) => (d.startsWith('pf-') ? 'pf1' : 'ed1');

describe('importar artes em lote', () => {
  it('nome sem acentos, minúsculo e com hífens', () => {
    expect(slug('Palavra Final do Patrono!')).toBe('palavra-final-do-patrono');
    expect(slug('Fôlego de Aço')).toBe('folego-de-aco');
  });

  it('acha a carta pelo deck + número (nome gerado pelo script do ComfyUI)', () => {
    expect(matchCard('pf-red_001.png', cards, edOf)?.id).toBe('a');
    expect(matchCard('PF-BLUE_2.webp', cards, edOf)?.id).toBe('c');
  });

  it('acha pelo nome da carta, em PT ou EN, preferindo a coleção aberta', () => {
    expect(matchCard('Corte Duplo.jpg', cards, edOf)?.id).toBe('a');
    expect(matchCard('double-slice.png', cards, edOf)?.id).toBe('a');
    expect(matchCard('Bola de Fogo.png', cards, edOf, 'pf1')?.id).toBe('c');
    expect(matchCard('bola-de-fogo.png', cards, edOf, 'ed1')?.id).toBe('b');
  });

  it('variações e nomes desconhecidos não entram por engano', () => {
    expect(matchCard('pf-red_001__v2.png', cards, edOf)).toBeUndefined();
    expect(matchCard('qualquer.png', cards, edOf)).toBeUndefined();
  });

  it('há um prompt para cada uma das 81 cartas da coleção Classes, com o nome certo do arquivo', () => {
    const ids = new Set((pf as { deck: string; n: number }[]).map((c) => `pf-${c.deck}_${String(c.n).padStart(3, '0')}`));
    const list = (prompts as { cards: { id: string; prompt: string; negative: string }[] }).cards;
    expect(list).toHaveLength(81);
    expect(new Set(list.map((c) => c.id))).toEqual(ids);
    for (const c of list) {
      expect(c.prompt).toContain('Magic: The Gathering');
      expect(c.negative).toContain('text');
    }
  });
});
