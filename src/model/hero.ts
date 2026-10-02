/**
 * Regras da ficha do herói: ancestralidade, pontos de atributo e os dados de jogo.
 *
 * Atributos (como no RPG de mesa): todos começam em 10; a ancestralidade soma os
 * seus bônus e penalidades; o jogador distribui um total fixo de pontos por cima.
 * Cada 2 pontos valem +1 de modificador, e é o modificador que as cartas pedem
 * (FOR 3, INT 4…). Não há outra lista de atributos: a mesa lê daqui.
 */
import racesData from '../data/races.json';
import { COLORS } from './catalog';
import { newId } from './id';
import type { Character, ColorId, Deck, Stat } from './types';
import { ATTRS, type Attr, type HeroBase } from '../game/types';
import { defaultAvatar, type Body } from '../avatar/lpc';

export interface Race { id: string; name: Record<string, string>; boosts: Partial<Record<Stat, number>>; flaws: Partial<Record<Stat, number>>; hp: number; desc: Record<string, string> }
export const RACES = racesData as Race[];
export const raceOf = (id: string | undefined) => RACES.find((r) => r.id === id);

export const STATS: { id: Stat; attr: Attr; pt: string; en: string; full: [string, string]; what: [string, string]; does: [string, string] }[] = [
  { id: 'str', attr: 'for', pt: 'FOR', en: 'STR', full: ['Força', 'Strength'], what: ['golpes e armas pesadas', 'strikes and heavy weapons'],
    does: ['A potência do corpo. Libera as cartas de golpes pesados, investidas e fúria: é o atributo de guerreiros e bárbaros.', 'Raw bodily power. Unlocks heavy strikes, charges and rage cards: the attribute of fighters and barbarians.'] },
  { id: 'dex', attr: 'des', pt: 'DES', en: 'DEX', full: ['Destreza', 'Dexterity'], what: ['arcos, lâminas leves e esquiva', 'bows, light blades and dodging'],
    does: ['Agilidade e pontaria. Libera tiros certeiros, esquivas, armadilhas e golpes rápidos: é o atributo de patrulheiros e ladinos.', 'Agility and aim. Unlocks precise shots, dodges, traps and quick strikes: the attribute of rangers and rogues.'] },
  { id: 'con', attr: 'con', pt: 'CON', en: 'CON', full: ['Constituição', 'Constitution'], what: ['resistência e fôlego', 'toughness and stamina'],
    does: ['Saúde e fôlego. Libera as cartas de aguentar pancada e de recuperar o fôlego; serve a qualquer herói que fica na linha de frente.', 'Health and stamina. Unlocks cards for taking hits and catching your breath; useful to any front-line hero.'] },
  { id: 'int', attr: 'int', pt: 'INT', en: 'INT', full: ['Inteligência', 'Intelligence'], what: ['magias arcanas', 'arcane spells'],
    does: ['Estudo e raciocínio. Libera as magias arcanas mais fortes e os truques de quem prepara o que vai lançar: é o atributo de magos.', 'Study and reasoning. Unlocks the strongest arcane spells and the tricks of those who prepare their casting: the attribute of wizards.'] },
  { id: 'wis', attr: 'sab', pt: 'SAB', en: 'WIS', full: ['Sabedoria', 'Wisdom'], what: ['natureza, cura e percepção', 'nature, healing and perception'],
    does: ['Instinto e ligação com o mundo. Libera curas, companheiros animais e magias da natureza: é o atributo de druidas e clérigos.', 'Instinct and a bond with the world. Unlocks healing, animal companions and nature magic: the attribute of druids and clerics.'] },
  { id: 'cha', attr: 'car', pt: 'CAR', en: 'CHA', full: ['Carisma', 'Charisma'], what: ['pactos, liderança e invocações', 'pacts, leadership and summons'],
    does: ['Força de presença. Libera pactos, maldições e invocações mais poderosas: é o atributo de bruxos, necromantes e bardos.', 'Force of presence. Unlocks pacts, curses and stronger summons: the attribute of warlocks, necromancers and bards.'] },
];

/** Pontos que o jogador distribui (9 melhorias de +2). */
export const STAT_POINTS = 18;
/** Maior valor que um atributo alcança na criação. */
export const STAT_MAX = 18;
/** Quanto dá para baixar um atributo abaixo do valor de partida (não devolve pontos). */
export const STAT_DROP = 2;
/** Vida base de quem não tem ancestralidade escolhida (o mesmo que um humano). */
const PLAIN_HP = 8;

/** Bônus (ou penalidade) da ancestralidade num atributo. */
export const raceMod = (c: Pick<Character, 'raceId'>, s: Stat): number => { const r = raceOf(c.raceId); return (r?.boosts[s] ?? 0) + (r?.flaws[s] ?? 0); };
/** Valor de partida do atributo: 10 + ancestralidade. */
export const statBase = (c: Pick<Character, 'raceId'>, s: Stat): number => 10 + raceMod(c, s);
export const statMod = (v: number): number => Math.floor((v - 10) / 2);
/** Pontos já gastos (só conta o que está acima do valor de partida). */
export const pointsSpent = (c: Pick<Character, 'raceId' | 'stats'>): number => STATS.reduce((n, s) => n + Math.max(0, c.stats[s.id] - statBase(c, s.id)), 0);
export const pointsLeft = (c: Pick<Character, 'raceId' | 'stats'>): number => STAT_POINTS - pointsSpent(c);
export const canRaise = (c: Pick<Character, 'raceId' | 'stats'>, s: Stat): boolean => c.stats[s] < STAT_MAX && (c.stats[s] < statBase(c, s) || pointsLeft(c) > 0);
export const canLower = (c: Pick<Character, 'raceId' | 'stats'>, s: Stat): boolean => c.stats[s] > statBase(c, s) - STAT_DROP;

/** Atributos de jogo (o que as cartas pedem): o modificador de cada atributo, de 0 a 5. */
export function gameAttrs(c: Pick<Character, 'stats'>): Record<Attr, number> {
  const out = {} as Record<Attr, number>;
  for (const s of STATS) out[s.attr] = Math.max(0, Math.min(5, statMod(c.stats[s.id])));
  return out;
}

/** Troca a ancestralidade: os bônus antigos saem, os novos entram; o que o jogador distribuiu fica. */
export function setRace(c: Character, id: string): void {
  const hpOf = (rid: string) => raceOf(rid)?.hp ?? PLAIN_HP;
  const before = hpOf(c.raceId);
  for (const s of STATS) {
    const spent = c.stats[s.id] - statBase(c, s.id);
    c.stats[s.id] = statBase({ raceId: id }, s.id) + spent;
  }
  c.raceId = id;
  // a vida base acompanha a ancestralidade (anão e orc aguentam mais; elfo e goblin, menos)
  if (c.play) c.play.baseHp = Math.max(10, c.play.baseHp + hpOf(id) - before);
  for (const s of STATS) c.stats[s.id] = Math.min(STAT_MAX, c.stats[s.id]);
}

/** Deck de jogo para uma classe: o do Protótipo dessa cor, senão o primeiro que servir. */
export function deckFor(color: ColorId, playable: Deck[]): string {
  return (playable.find((d) => d.id === `proto-${color}`) ?? playable.find((d) => d.colors[0] === color) ?? playable[0])?.id ?? '';
}

/** Dados de jogo de partida para uma classe (sem equipamento: isso vem das cartas vestidas). */
export function defaultPlay(id: string, name: string, color: ColorId, playable: Deck[], raceId = ''): HeroBase {
  const cls = COLORS[color].classes;
  const first = (t: string) => t.split('/')[0].trim();
  // classes de magia começam com mais Mana; as de combate, com mais Vigor
  const vigor = ({ red: 3, purple: 3, silver: 2, green: 2, white: 1, black: 1, blue: 0 } as Partial<Record<ColorId, number>>)[color] ?? 2;
  return {
    id, name, className: [first(cls['pt-BR']), first(cls['en-US'])], deckId: deckFor(color, playable),
    attrs: Object.fromEntries(ATTRS.map((a) => [a, 0])) as Record<Attr, number>,
    baseHp: 22 + (raceOf(raceId)?.hp ?? PLAIN_HP),
    weapon: { name: ['Desarmado', 'Unarmed'], dmg: 1, via: 'melee' }, gear: [],
    vigor, mana: 3 - vigor, row: 0, col: 1,
    icon: ({ red: 'horned-helm', blue: 'pointy-hat', green: 'hood', black: 'hooded-figure', purple: 'hooded-assassin', white: 'holy-symbol', silver: 'meditation' } as Partial<Record<ColorId, string>>)[color] ?? 'hooded-figure',
  };
}

/** Herói novo, do zero: humano, uma classe, atributos sem distribuir e um boneco simples para vestir. */
export function blankHero(color: ColorId, playable: Deck[], body: Body = 'male'): Character {
  const id = newId('char');
  const c: Character = {
    id, name: '', raceId: 'human', classColors: [color], level: 1, hp: 30,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, slots: {}, notes: '',
    avatar: defaultAvatar(body),
  };
  for (const s of STATS) c.stats[s.id] = statBase(c, s.id);
  c.play = defaultPlay(id, '', color, playable, c.raceId);
  return c;
}

/**
 * Fichas antigas: quem não tinha dados de jogo ganha os da sua classe (todo herói pode
 * batalhar), e os atributos de jogo soltos passam para os atributos da ficha.
 */
export function upgradeHero(c: Character, playable: Deck[]): void {
  if (!c.play) c.play = defaultPlay(c.id, c.name, c.classColors[0] ?? 'red', playable, c.raceId);
  else {
    const now = gameAttrs(c);
    for (const s of STATS) if (c.play.attrs[s.attr] !== now[s.attr]) c.stats[s.id] = Math.max(c.stats[s.id], 10 + 2 * c.play.attrs[s.attr]);
  }
  if (!c.avatar && !c.portraitMediaId && !c.preset) c.avatar = defaultAvatar('male');
}

// ───────────── sugestões de distribuição (para quem não tem familiaridade com RPG) ─────────────

/** Uma sugestão pronta: onde gastar os 18 pontos e para quem ela serve. `spend` = pontos por atributo, em ordem de importância. */
export interface Build { id: string; pt: string; en: string; info: [string, string]; classes: ColorId[]; spend: [Stat, number][] }
export const BUILDS: Build[] = [
  { id: 'berserker', pt: 'Berserker', en: 'Berserker', classes: ['red'], spend: [['str', 8], ['con', 6], ['dex', 2], ['wis', 2]],
    info: ['Bate forte e aguenta pancada. Tudo em Força, com Constituição para ficar de pé.', 'Hits hard and takes a beating. All in on Strength, with Constitution to stay standing.'] },
  { id: 'guardian', pt: 'Guardião', en: 'Guardian', classes: ['red', 'white'], spend: [['con', 8], ['str', 6], ['wis', 2], ['cha', 2]],
    info: ['A muralha do grupo: muita Constituição e Força suficiente para revidar.', 'The party wall: lots of Constitution and enough Strength to hit back.'] },
  { id: 'duelist', pt: 'Duelista', en: 'Duelist', classes: ['purple', 'red'], spend: [['dex', 8], ['str', 4], ['con', 4], ['int', 2]],
    info: ['Rápido e preciso: Destreza no máximo, com um pouco de Força e fôlego.', 'Quick and precise: Dexterity maxed, with a bit of Strength and stamina.'] },
  { id: 'archmage', pt: 'Arquimago', en: 'Archmage', classes: ['blue'], spend: [['int', 8], ['str', 4], ['dex', 4], ['con', 2]],
    info: ['Vive das magias arcanas: Inteligência no máximo e o resto para não cair no primeiro golpe.', 'Lives off arcane spells: Intelligence maxed and the rest to survive the first hit.'] },
  { id: 'ranger', pt: 'Patrulheiro', en: 'Ranger', classes: ['green'], spend: [['dex', 8], ['wis', 6], ['con', 4]],
    info: ['Arco, armadilhas e companheiros animais: Destreza e Sabedoria juntas.', 'Bow, traps and animal companions: Dexterity and Wisdom together.'] },
  { id: 'druid', pt: 'Druida', en: 'Druid', classes: ['green', 'white'], spend: [['wis', 8], ['con', 6], ['dex', 4]],
    info: ['Curas e forças da natureza: Sabedoria no máximo e corpo resistente.', 'Healing and forces of nature: Wisdom maxed and a sturdy body.'] },
  { id: 'warlock', pt: 'Bruxo', en: 'Warlock', classes: ['black', 'silver'], spend: [['cha', 8], ['dex', 6], ['con', 4]],
    info: ['Pactos, maldições e invocações: Carisma no máximo e Destreza para a lâmina.', 'Pacts, curses and summons: Charisma maxed and Dexterity for the blade.'] },
  { id: 'balanced', pt: 'Equilibrado', en: 'Balanced', classes: [], spend: [['str', 4], ['dex', 4], ['con', 4], ['int', 2], ['wis', 2], ['cha', 2]],
    info: ['Um pouco de tudo. Não libera as cartas mais exigentes, mas não tem ponto fraco.', 'A bit of everything. Does not unlock the most demanding cards, but has no weak spot.'] },
];

/** Os atributos que a sugestão dá a este herói (respeita a ancestralidade, o máximo e o total de pontos). */
export function buildStats(c: Pick<Character, 'raceId'>, b: Build): Record<Stat, number> {
  const out = {} as Record<Stat, number>;
  for (const s of STATS) out[s.id] = statBase(c, s.id);
  let left = STAT_POINTS;
  const add = (s: Stat, n: number) => { const k = Math.max(0, Math.min(n, STAT_MAX - out[s], left)); out[s] += k; left -= k; };
  for (const [s, n] of b.spend) add(s, n);
  // o que sobrou (atributo que bateu no máximo por causa da ancestralidade) vai para os próximos da lista, de 2 em 2
  for (let guard = 0; left > 0 && guard < 40; guard++) for (const [s] of b.spend) add(s, Math.min(2, left));
  return out;
}
