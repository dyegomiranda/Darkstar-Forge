/** Heróis jogáveis: as fichas do projeto que têm dados de jogo (deck, arma, equipamento). */
import { app } from '../../store/project.svelte';
import { buildHero } from '../../game/decks';
import { heroBaseOf } from '../../model/equipment';
import type { HeroDef } from '../../game/types';
import type { Character } from '../../model/types';
import { colorHex } from '../../model/catalog';

export const playable = (): Character[] => (app.project?.characters ?? []).filter((c) => c.play);
/** O herói pronto para a mesa: ficha + cartas de equipamento vestidas. */
export const heroDef = (c: Character): HeroDef => buildHero(heroBaseOf(c, app.cards));
export const characterOf = (id: string): Character | undefined => app.project?.characters.find((c) => c.id === id);
/** Cor do herói: a do deck que ele usa (ou a primeira classe da ficha). */
export const heroColor = (c: Character | undefined): string => colorHex(app.deck(c?.play?.deckId ?? '')?.colors[0] ?? c?.classColors[0] ?? 'red');
/** Cartas (com efeitos de jogo) do deck do herói e quantas são, contando cópias. */
export const deckCards = (c: Character) => app.cardsOf(c.play?.deckId ?? '').filter((x) => x.game);
export const deckCount = (c: Character) => deckCards(c).reduce((n, x) => n + (x.game?.copies ?? 1), 0);
