import { expect, it } from 'vitest';
import { seedProject } from '../src/model/seed';
import { withoutPathfinder } from '../src/model/retireCollection';
it('novos projetos possuem somente a coleção Protótipo', () => {
 const s = seedProject(); expect(s.project.editions.map(e => e.name)).toEqual(['Protótipo']);
 expect(s.cards.some(c => c.deckId.startsWith('pf-'))).toBe(false);
});
it('remove Classes e mídias exclusivas, conservando mídia compartilhada e cartas próprias', () => {
 const { project, cards } = seedProject();
 project.editions.push({id:'pf1',name:'Classes — Pathfinder',code:'CLS'});
 project.decks.push({...project.decks[0], id:'pf-red',editionId:'pf1'});
 const old = {...cards[0],id:'pf-old',deckId:'pf-red',art:{...cards[0].art,mediaId:'exclusive'}};
 const shared = {...old,id:'pf-shared',art:{...old.art,mediaId:'shared'}};
 const own = {...cards[0],id:'my-card',art:{...cards[0].art,mediaId:'shared'}};
 project.builds=[{id:'b',name:'B',cards:{'pf-old':2,'my-card':1},colors:['red']}];
 project.characters[0].slots.head='pf-old';
 const result=withoutPathfinder(project,[...cards,old,shared,own]);
 expect(result.project.editions).toHaveLength(1);
 expect(result.cards.find(c=>c.id==='my-card')).toBe(own);
 expect(result.mediaIds).toEqual(new Set(['exclusive']));
 expect(result.project.builds![0].cards).toEqual({'my-card':1});
 expect(result.project.characters[0].slots.head).toBeUndefined();
 expect(project.characters[0].slots.head).toBe('pf-old');
 expect(withoutPathfinder(result.project,result.cards).project).toBe(result.project);
});
