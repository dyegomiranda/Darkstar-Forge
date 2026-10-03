/**
 * Jornada: o modo solo com progressão. Código puro (sem tela).
 *
 *  - O herói NÃO sobe de nível durante a batalha: o nível vem da Jornada e sobe entre as batalhas.
 *  - Cada vitória dá XP, e cada etapa dá mais que a anterior; cada nível pede mais XP que o anterior.
 *  - A cada nível ganho, o jogador escolhe +1 Vigor, +1 Mana ou +3 Vida (como na batalha comum).
 *  - O deck acompanha o nível: só entram as cartas que o herói já pode usar; ao subir de nível,
 *    as cartas de nível maior (e as evoluções das cartas) vão sendo liberadas.
 *  - Não há fim: as etapas seguem, com oponentes cada vez mais fortes e um chefe a cada 5 etapas.
 *  - Perder não tira nada: o herói fica na mesma etapa e ganha um pouco de XP pela tentativa
 *    (desistir não dá XP).
 */
import type { Difficulty } from './bot';
import type { CardDef, HeroDef, StartBonus } from './types';

export interface JourneyState {
  stage: number; best: number; level: number; xp: number;
  vigor: number; mana: number; vida: number; pending: number;
  wins: number; losses: number;
}

export const JOURNEY_MAX_LEVEL = 30, DECK_SIZE = 40, BOSS_EVERY = 5;

export const newJourney = (): JourneyState => ({ stage: 1, best: 0, level: 1, xp: 0, vigor: 0, mana: 0, vida: 0, pending: 0, wins: 0, losses: 0 });

/** XP para passar do nível `level` ao seguinte: 40, 115, 210, 320, 445… (cada nível pede mais). */
export const xpToNext = (level: number): number => Math.round((40 * Math.pow(level, 1.5)) / 5) * 5;

export const isBoss = (stage: number): boolean => stage % BOSS_EVERY === 0;

/** XP de uma vitória na etapa (cresce a cada etapa; o chefe dá metade a mais). Derrota: um quarto. */
export function xpReward(stage: number, won: boolean): number {
  const win = Math.round((20 + 10 * stage) * (isBoss(stage) ? 1.5 : 1));
  return won ? win : Math.round(win / 4);
}

/** Resultado de uma batalha: soma o XP, sobe os níveis que couberem e avança a etapa na vitória. Devolve quantos níveis subiu. */
export function applyResult(j: JourneyState, won: boolean, forfeit = false): { xp: number; levels: number } {
  // desistir (ou perder por tempo) não dá XP: senão dava para juntar XP só desistindo
  const xp = forfeit && !won ? 0 : xpReward(j.stage, won);
  let levels = 0;
  j.xp += xp;
  while (j.level < JOURNEY_MAX_LEVEL && j.xp >= xpToNext(j.level)) { j.xp -= xpToNext(j.level); j.level++; j.pending++; levels++; }
  if (j.level >= JOURNEY_MAX_LEVEL) j.xp = 0;
  if (won) { j.wins++; j.best = Math.max(j.best, j.stage); j.stage++; } else j.losses++;
  return { xp, levels };
}

/** Escolha de um nível ganho. */
export function choose(j: JourneyState, what: 'vigor' | 'mana' | 'vida'): void {
  if (j.pending <= 0) return;
  j.pending--;
  if (what === 'vida') j.vida += 3; else j[what]++;
}

/** Como o herói do jogador entra na batalha. */
export const playerStart = (j: JourneyState): StartBonus => ({ level: j.level, vigor: j.vigor, mana: j.mana, vida: j.vida });

/** Nível do oponente da etapa: sobe 1 a cada 2 etapas (o chefe vem 1 acima). */
export const foeLevel = (stage: number): number => Math.min(JOURNEY_MAX_LEVEL, 1 + Math.floor((stage - 1) / 2) + (isBoss(stage) ? 1 : 0));

/**
 * Como o oponente entra: no nível da etapa, com os bônus de nível distribuídos pelo perfil dele
 * (2 no recurso principal, 1 no outro, 1 em Vida, e repete); o chefe tem vida a mais.
 */
export function foeStart(hero: HeroDef, stage: number): StartBonus {
  const level = foeLevel(stage);
  const main = hero.vigor >= hero.mana ? 'vigor' : 'mana', side = main === 'vigor' ? 'mana' : 'vigor';
  const out: StartBonus = { level, vigor: 0, mana: 0, vida: 0 };
  for (let i = 0; i < level - 1; i++) {
    const k = i % 4;
    if (k === 3) out.vida += 3;
    else if (k === 2 && hero[side] > 0) out[side]++;
    else out[main]++;
  }
  if (isBoss(stage)) out.vida += 6 + stage;
  return out;
}

/** O bot joga melhor conforme as etapas avançam. */
export const foeDifficulty = (stage: number): Difficulty => (stage <= 2 ? 'easy' : stage <= 6 ? 'normal' : 'hard');

/**
 * O deck na Jornada: só as cartas que o herói já pode usar no nível dele. Se faltarem cartas
 * para as 40, entram cópias a mais das cartas liberadas (das que têm menos cópias primeiro).
 */
export function journeyDeck(cards: CardDef[], level: number): CardDef[] {
  const ok = cards.filter((c) => c.game.level <= level).map((c) => ({ ...c, game: { ...c.game } }));
  if (!ok.length) return [];
  let total = ok.reduce((n, c) => n + c.game.copies, 0);
  // as Reações e os itens não se multiplicam: quem completa o deck são as habilidades comuns
  const pool = ok.filter((c) => c.game.kind !== 'reacao' && c.game.kind !== 'item');
  const fill = pool.length ? pool : ok;
  while (total < DECK_SIZE) {
    const least = fill.reduce((a, b) => (b.game.copies < a.game.copies ? b : a));
    least.game.copies++;
    total++;
  }
  return ok;
}

/** O que o nível `level` libera num deck: cartas daquele nível e evoluções daquele nível. */
export function unlocksAt(cards: CardDef[], level: number): { cards: CardDef[]; ranks: CardDef[] } {
  return {
    cards: cards.filter((c) => c.game.level === level),
    ranks: cards.filter((c) => c.game.level < level && c.game.ranks?.some((r) => r.level === level)),
  };
}
