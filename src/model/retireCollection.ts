import type { Card, Project } from './types';

/** Retira a coleção descontinuada e suas referências, preservando cartas próprias. */
export function withoutPathfinder(project: Project, cards: Card[]): { project: Project; cards: Card[]; mediaIds: Set<string> } {
  const ids = new Set(project.decks.filter(d => d.editionId === 'pf1').map(d => d.id));
  const removed = cards.filter(c => ids.has(c.deckId) || c.deckId.startsWith('pf-'));
  const cardIds = new Set(removed.map(c => c.id));
  const mediaIds = new Set(removed.flatMap(c => c.art.mediaId ? [c.art.mediaId] : []));
  if (!removed.length && !project.editions.some(e => e.id === 'pf1') && !ids.size) return { project, cards, mediaIds };
  const result = structuredClone(project);
  result.editions = result.editions.filter(e => e.id !== 'pf1');
  result.decks = result.decks.filter(d => !ids.has(d.id) && !d.id.startsWith('pf-'));
  for (const hero of result.characters) {
    for (const slot of Object.keys(hero.slots) as (keyof typeof hero.slots)[]) if (cardIds.has(hero.slots[slot] ?? '')) delete hero.slots[slot];
    if (hero.play && (ids.has(hero.play.deckId) || hero.play.deckId.startsWith('pf-'))) hero.play.deckId = 'proto-' + hero.play.deckId.replace(/^pf-/, '');
  }
  for (const build of result.builds ?? []) for (const id of cardIds) delete build.cards[id];
  for (const id of cardIds) if (result.owned) delete result.owned[id];
  result.seeded = [...new Set([...(result.seeded ?? []).filter(id => id !== 'pf1'), 'drop-pf-1'])];
  const kept = cards.filter(c => !cardIds.has(c.id));
  const references = JSON.stringify([result, kept]);
  for (const id of mediaIds) if (references.includes(JSON.stringify(id))) mediaIds.delete(id);
  return { project: result, cards: kept, mediaIds };
}
