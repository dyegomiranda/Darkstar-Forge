/**
 * Mostruário rápido de estilos (só no servidor de desenvolvimento). No console da página:
 *   (await import('/tools/dev/estilos.ts')).show(['neutro', 'lenda'], { w: 480 })
 * Cobre a tela com três cartas de exemplo por estilo; `hide()` tira.
 */
import { compose, type ComposeInput, type Look } from '../../src/render/compose';
import type { StyleId } from '../../src/render/elements';

const CARDS: Partial<ComposeInput>[] = [
  { colors: ['#b92d20'], colorId: 'red', art: { src: '/artes-proto/proto-red_001.png' }, name: 'Golpe Brutal', typeLine: 'Ataque — Guerreiro', rules: 'Golpe (Machado): 3 de dano corpo a corpo.\nSe o alvo estiver Marcado, compre 1 carta.', flavor: 'O aço fala antes da língua.', cost: [{ resource: 'vigor', amount: 2, show: 'repeat' }], rarity: 'common' },
  { colors: ['#2a62c9'], colorId: 'blue', art: { src: '/artes-proto/proto-blue_003.png' }, name: 'Elemental de Pedra', typeLine: 'Invocação — Elemental', rules: 'Guarda. Enquanto estiver na frente, criaturas inimigas precisam atacá-lo primeiro.', cost: [{ resource: 'mana', amount: 3 }], stats: { atk: 2, def: 5 }, rarity: 'rare' },
  { colors: ['#2f8a3c', '#5b3a8a'], colorId: 'green', classIds: ['green', 'black'], artIcon: 'wolf-howl', name: 'Pacto da Floresta Sombria', typeLine: 'Magia — Ritual', rules: 'Cure 3 PV do seu herói e aflija todas as criaturas inimigas. Depois, invoque um Lobo 3/2 com Rápido.', flavor: 'A mata cobra o que empresta.', cost: [{ resource: 'nature', amount: 1 }, { resource: 'souls', amount: 2 }], stats: { atk: 4, def: 4 }, rarity: 'unique' },
];

export function show(styles: StyleId[], o: { w?: number; look?: Partial<Look>; only?: number } = {}): string {
  hide();
  const wrap = document.createElement('div');
  wrap.id = 'dev-estilos';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#3a3a3e;display:flex;flex-wrap:wrap;gap:10px;padding:10px;align-content:flex-start;overflow:auto';
  document.documentElement.appendChild(wrap);
  for (const st of styles) CARDS.forEach((c, i) => {
    if (o.only != null && o.only !== i) return;
    const d = document.createElement('div');
    d.style.cssText = `width:${o.w ?? 330}px;flex:none`;
    d.innerHTML = compose({ uid: `dev-${st}-${i}`, footer: 'PROTO · 012/071 · Darkstar', ...c, look: { style: st, ...o.look } } as ComposeInput);
    (d.firstChild as SVGElement).style.cssText = 'width:100%;height:auto;display:block;border-radius:14px';
    wrap.appendChild(d);
  });
  return 'ok';
}

export const hide = () => document.getElementById('dev-estilos')?.remove();
