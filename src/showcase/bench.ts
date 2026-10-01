/**
 * Bancada de estilos (só no desenvolvimento): desenha cartas de exemplo de um
 * estilo, lado a lado, para comparar com os modelos de referência.
 * No console: __bench('vazio') — ou __bench('vazio', ['blue','purple']).
 */
import { compose, type ComposeInput } from '../render/compose';
import { colorHex } from '../model/catalog';
import type { ColorId } from '../model/types';
import type { StyleId } from '../render/elements';

const SAMPLES: Omit<ComposeInput, 'uid' | 'look' | 'colors' | 'colorId' | 'classIds'>[] = [
  { name: 'Sentinela Veterana', typeLine: 'Criatura | Humana · Guerreira', rules: 'Vigilância. Ataque Reativo: uma vez por turno, quando um inimigo ataca perto dela, ela golpeia primeiro.', flavor: 'Quem passa por ela, passa ferido.', footer: '006/050 · PT-BR · CLS', rarity: 'uncommon', cost: [{ resource: 'vigor', amount: 3, show: 'number' }], stats: { atk: 2, def: 3 }, setIcon: '/brand/logo.png' },
  { name: 'Bola de Fogo', typeLine: 'Magia | Mago · Fogo', rules: 'Cause 3 de dano a cada criatura inimiga.', flavor: 'Um grão de luz, depois o sol inteiro.', footer: '002/050 · PT-BR · CLS', rarity: 'common', cost: [{ resource: 'mana', amount: 4, show: 'number' }], stats: null, setIcon: '/brand/logo.png' },
  { name: 'Morwen, a Rainha Cinzenta', typeLine: 'Criatura | Lendária · Necromante', rules: 'Vampirismo. Sempre que outra criatura morrer, ganhe 1 {souls} e ponha em jogo um Esqueleto 1/1.', flavor: 'Seu reino não tem vivos.', footer: '009/050 · PT-BR · CLS', rarity: 'unique', cost: [{ resource: 'souls', amount: 2, show: 'number' }], stats: { atk: 3, def: 3 }, setIcon: '/brand/logo.png' },
];
const ARTS: Record<string, string> = { red: 'pf-red_006', blue: 'pf-blue_002', black: 'pf-black_009', purple: 'pf-purple_009', green: 'pf-green_009', white: 'pf-white_009', silver: 'pf-silver_009' };

function bench(style: StyleId, decks: ColorId[] = ['red', 'blue', 'black'], width = 330): string {
  let host = document.getElementById('bench');
  if (!host) {
    host = document.createElement('div');
    host.id = 'bench';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:#1b1a1f;display:flex;gap:14px;padding:14px;flex-wrap:wrap;align-content:flex-start;overflow:auto';
    host.onclick = (e) => { if (e.target === host) host!.remove(); };
    document.body.appendChild(host);
  }
  host.innerHTML = decks.map((d, i) => {
    const s = SAMPLES[i % SAMPLES.length];
    const svg = compose({ ...s, uid: `b${i}`, colors: [colorHex(d)], colorId: d, classIds: [d], look: { style }, art: { src: `/artes-pf/${ARTS[d] ?? ARTS.red}.png`, zoom: 1, x: 0, y: 0 } });
    return `<div style="width:${width}px">${svg.replace('<svg ', '<svg style="width:100%;height:auto;display:block" ')}</div>`;
  }).join('');
  return 'ok';
}

(window as unknown as { __bench: typeof bench }).__bench = bench;
