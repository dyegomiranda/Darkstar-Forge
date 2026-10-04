/** Heróis jogáveis: as fichas do projeto que têm dados de jogo (deck, arma, equipamento). */
import { app } from '../../store/project.svelte';
import { buildHero } from '../../game/decks';
import { heroBaseOf } from '../../model/equipment';
import type { HeroDef, StartBonus } from '../../game/types';
import type { Difficulty } from '../../game/bot';
import type { Build, Card, Character } from '../../model/types';
import { buildCards, buildFits, buildProblem } from '../../model/builds';
import { colorHex } from '../../model/catalog';

export const playable = (): Character[] => (app.project?.characters ?? []).filter((c) => c.play);
/** O herói pronto para a mesa: ficha + cartas de equipamento vestidas. */
export const heroDef = (c: Character): HeroDef => buildHero(heroBaseOf(c, app.cards));
/** Personagens de fora das fichas do jogador (os chefes da Jornada), só enquanto a batalha dura. */
export const guests = new Map<string, Character>();
export const characterOf = (id: string): Character | undefined => guests.get(id) ?? app.project?.characters.find((c) => c.id === id);
/** Cor do herói: a do deck que ele usa (ou a primeira classe da ficha). */
export const heroColor = (c: Character | undefined): string => colorHex(app.deck(c?.play?.deckId ?? '')?.colors[0] ?? c?.classColors[0] ?? 'red');
/** O deck montado em uso pelo herói (só vale se for das classes dele). */
export function activeBuild(c: Character): Build | undefined {
  const b = app.build(c.buildId);
  return b && buildFits(b, c.classColors) ? b : undefined;
}
/**
 * Cartas (com efeitos de jogo) do deck em uso pelo herói e quantas são, contando cópias:
 * o deck montado escolhido (inventário de decks) ou, sem ele, o deck padrão da classe.
 */
export function deckCards(c: Character): Card[] {
  const b = activeBuild(c);
  // (no deck padrão não entram as cartas de recompensa: elas têm 0 cópias até o jogador pô-las num deck montado)
  return b ? buildCards(b, app.cards) : app.cardsOf(c.play?.deckId ?? '').filter((x) => x.game && x.game.copies > 0);
}
export const deckCount = (c: Character) => deckCards(c).reduce((n, x) => n + (x.game?.copies ?? 1), 0);
/** Nome do deck em uso. */
export const deckName = (c: Character): string => activeBuild(c)?.name ?? app.deck(c.play?.deckId ?? '')?.name[app.lang] ?? '';
/** O deck em uso pode entrar em batalha? (o montado precisa ter exatamente 40 cartas) */
export const deckReady = (c: Character): boolean => { const b = activeBuild(c); return b ? !buildProblem(b, app.cards) : deckCount(c) > 0; };

/** Batalha já montada por outro modo (a Jornada): heróis, níveis e dificuldade vêm de fora, e o resultado volta por `onEnd`. */
export interface FixedMatch {
  myId: string; botId: string;
  /** Como cada herói entra (nível e bônus): [você, oponente]. Os decks ficam só com as cartas desses níveis. */
  start: [StartBonus, StartBonus];
  difficulty: Difficulty;
  /** Cenário da batalha (a região do mapa). */
  scene?: string;
  /** Oponente que não é uma ficha do jogador (chefe): a ficha de mentira dele e o herói já pronto. */
  guest?: { char: Character; hero: HeroDef };
  /** Texto curto da batalha (ex.: "Etapa 3"). */
  label: string;
  /** `forfeit`: a partida acabou por desistência ou por tempo. */
  onEnd: (won: boolean, forfeit: boolean) => void;
  /** Saiu antes de a batalha começar. */
  onLeave: () => void;
}

/**
 * O deck do herói na Jornada: o deck em uso e, se for o deck padrão da classe, também as cartas de
 * recompensa que o jogador já ganhou dessa classe (com as cópias que tem). É assim que o deck cresce.
 */
export function journeyCards(c: Character): Card[] {
  const base = deckCards(c);
  if (activeBuild(c)) return base;
  const extra = app.cardsOf(c.play?.deckId ?? '').filter((x) => x.game && x.game.copies === 0 && app.ownedOf(x) > 0).map((x) => ({ ...x, game: { ...x.game!, copies: app.ownedOf(x) } }));
  return [...base, ...extra];
}
