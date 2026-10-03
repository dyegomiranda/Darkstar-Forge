/** Heróis jogáveis: as fichas do projeto que têm dados de jogo (deck, arma, equipamento). */
import { app } from '../../store/project.svelte';
import { buildHero } from '../../game/decks';
import { heroBaseOf } from '../../model/equipment';
import type { HeroDef, StartBonus } from '../../game/types';
import type { Difficulty } from '../../game/bot';
import type { Card, Character } from '../../model/types';
import { buildCards, buildProblem } from '../../model/builds';
import { colorHex } from '../../model/catalog';

export const playable = (): Character[] => (app.project?.characters ?? []).filter((c) => c.play);
/** O herói pronto para a mesa: ficha + cartas de equipamento vestidas. */
export const heroDef = (c: Character): HeroDef => buildHero(heroBaseOf(c, app.cards));
export const characterOf = (id: string): Character | undefined => app.project?.characters.find((c) => c.id === id);
/** Cor do herói: a do deck que ele usa (ou a primeira classe da ficha). */
export const heroColor = (c: Character | undefined): string => colorHex(app.deck(c?.play?.deckId ?? '')?.colors[0] ?? c?.classColors[0] ?? 'red');
/**
 * Cartas (com efeitos de jogo) do deck em uso pelo herói e quantas são, contando cópias:
 * o deck montado escolhido (inventário de decks) ou, sem ele, o deck padrão da classe.
 */
export function deckCards(c: Character): Card[] {
  const b = app.build(c.buildId);
  return b ? buildCards(b, app.cards) : app.cardsOf(c.play?.deckId ?? '').filter((x) => x.game);
}
export const deckCount = (c: Character) => deckCards(c).reduce((n, x) => n + (x.game?.copies ?? 1), 0);
/** Nome do deck em uso. */
export const deckName = (c: Character): string => app.build(c.buildId)?.name ?? app.deck(c.play?.deckId ?? '')?.name[app.lang] ?? '';
/** O deck em uso pode entrar em batalha? (o montado precisa ter exatamente 40 cartas) */
export const deckReady = (c: Character): boolean => { const b = app.build(c.buildId); return b ? !buildProblem(b, app.cards) : deckCount(c) > 0; };

/** Batalha já montada por outro modo (a Jornada): heróis, níveis e dificuldade vêm de fora, e o resultado volta por `onEnd`. */
export interface FixedMatch {
  myId: string; botId: string;
  /** Como cada herói entra (nível e bônus): [você, oponente]. Os decks ficam só com as cartas desses níveis. */
  start: [StartBonus, StartBonus];
  difficulty: Difficulty;
  /** Texto curto da batalha (ex.: "Etapa 3"). */
  label: string;
  /** `forfeit`: a partida acabou por desistência ou por tempo. */
  onEnd: (won: boolean, forfeit: boolean) => void;
  /** Saiu antes de a batalha começar. */
  onLeave: () => void;
}
