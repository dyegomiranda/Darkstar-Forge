/**
 * Jornada: o modo solo com progressão. Código puro (sem tela).
 *
 *  - O herói NÃO sobe de nível durante a batalha: o nível vem da Jornada e sobe entre as batalhas.
 *  - Cada vitória dá XP, e cada etapa dá mais que a anterior; cada nível pede mais XP que o anterior.
 *  - A cada nível ganho, o jogador escolhe +1 Vigor, +1 Mana ou +3 Vida (como na batalha comum).
 *  - O deck acompanha o nível: só entram as cartas que o herói já pode usar; ao subir de nível,
 *    as cartas de nível maior (e as evoluções das cartas) vão sendo liberadas.
 *  - Cada jornada tem um MAPA gerado na hora (nunca igual): caminhos que se dividem e se cruzam,
 *    com batalhas, campos de treino (escolher 1 de 3 cartas) e, no fim, um chefe. Vencido o chefe,
 *    vem um mapa novo, com oponentes mais fortes. Não há fim.
 *  - Perder não tira nada: o herói fica na mesma etapa e ganha um pouco de XP pela tentativa
 *    (desistir não dá XP).
 */
import type { Difficulty } from './bot';
import type { CardDef, HeroDef, StartBonus } from './types';

/** battle = inimigo comum da região; elite = o herói da região (mini-chefe, um por bioma); boss = o chefe do mapa. */
export type NodeKind = 'battle' | 'elite' | 'training' | 'boss';
export interface MapNode {
  id: number;
  /** Camada (0 = começo; a última é a do chefe) e faixa (de cima para baixo). */
  layer: number; lane: number;
  /** Posição no mapa, de 0 a 1. */
  x: number; y: number;
  kind: NodeKind;
  /** Região do mapa (id do cenário da batalha: floresta, vulcao, cripta…). */
  biome: string;
  /** Mini-chefe: id do herói. Chefe: id do monstro. (O inimigo comum sai do bioma.) */
  foe?: string;
  /** Nós para onde este leva. */
  next: number[];
}
export interface JourneyMap {
  seed: number; nodes: MapNode[];
  /** Último nó concluído (null = ainda no começo). */
  at: number | null; cleared: number[];
  /** Centros das regiões do mapa (cada uma com o seu bioma): o terreno e os oponentes de cada área saem daqui. */
  regions?: { x: number; y: number; biome: string }[];
}

export interface JourneyState {
  /** Batalhas vencidas + 1 (só para o registro). */
  stage: number; best: number; level: number; xp: number;
  vigor: number; mana: number; vida: number; pending: number;
  wins: number; losses: number;
  /** Mapas já concluídos (chefes vencidos): cada um deixa os oponentes mais fortes. */
  tier?: number;
  map?: JourneyMap;
  /** Vida perdida que o herói carrega (só no modo "a vida não volta depois da batalha"); o Acampamento zera. */
  hurt?: number;
}

export const JOURNEY_MAX_LEVEL = 30, DECK_SIZE = 40, MAX_COPIES = 4;
/** Camadas de um mapa antes do chefe e faixas (linhas) em cada camada. */
export const LAYERS = 7, LANES = 5;

export const newJourney = (): JourneyState => ({ stage: 1, best: 0, level: 1, xp: 0, vigor: 0, mana: 0, vida: 0, pending: 0, wins: 0, losses: 0, tier: 0 });

/** XP para passar do nível `level` ao seguinte: 40, 115, 210, 320, 445… (cada nível pede mais). */
export const xpToNext = (level: number): number => Math.round((40 * Math.pow(level, 1.5)) / 5) * 5;

/** Dificuldade de um ponto do mapa: cresce a cada camada e a cada mapa concluído. */
export const depthOf = (tier: number, layer: number): number => tier * (LAYERS + 1) + layer + 1;

/** XP de uma vitória (cresce com a profundidade; o mini-chefe dá metade a mais e o chefe, o dobro). Derrota: um quarto. */
export function xpReward(depth: number, won: boolean, boss = false, elite = false): number {
  const win = Math.round((20 + 8 * depth) * (boss ? 2 : elite ? 1.5 : 1));
  return won ? win : Math.round(win / 4);
}

/** Soma XP e sobe os níveis que couberem. Devolve quantos níveis subiu. */
export function addXp(j: JourneyState, xp: number): number {
  let levels = 0;
  j.xp += xp;
  while (j.level < JOURNEY_MAX_LEVEL && j.xp >= xpToNext(j.level)) { j.xp -= xpToNext(j.level); j.level++; j.pending++; levels++; }
  if (j.level >= JOURNEY_MAX_LEVEL) j.xp = 0;
  return levels;
}

// ───────────── o mapa ─────────────

/** Sorteio com semente (o mesmo mapa sempre que a semente for a mesma). */
export function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Gera um mapa: vários caminhos saem da esquerda e andam uma camada por vez, subindo ou descendo
 * uma faixa (ou seguindo reto); onde dois caminhos pisam no mesmo ponto, eles se juntam — é isso
 * que cria as bifurcações e os cruzamentos. Todos terminam no chefe.
 * `foes`: o herói de cada região (o mini-chefe do bioma; um por bioma). `boss`: o chefe do mapa.
 * Cada bioma tem UM herói; os outros pontos de batalha da região são inimigos comuns, mais fracos.
 * O mapa não depende de quem joga: é o mesmo para qualquer herói.
 */
export function generateMap(seed: number, foes: { id: string; biome: string }[], boss: { id: string; biome: string }): JourneyMap {
  const rand = rng(seed);
  const key = (l: number, n: number) => l * LANES + n;
  const edges = new Map<number, Set<number>>();
  const used = new Set<number>();
  const starts = [...Array(LANES).keys()].sort(() => rand() - 0.5);
  const PATHS = 6;
  for (let p = 0; p < PATHS; p++) {
    // os primeiros caminhos saem de faixas diferentes; os outros, de qualquer uma
    let lane = p < 3 ? starts[p] : Math.floor(rand() * LANES);
    used.add(key(0, lane));
    for (let l = 0; l < LAYERS - 1; l++) {
      const step = rand() < 0.34 ? -1 : rand() < 0.5 ? 0 : 1;
      const to = Math.max(0, Math.min(LANES - 1, lane + step));
      const a = key(l, lane), b = key(l + 1, to);
      (edges.get(a) ?? edges.set(a, new Set()).get(a)!).add(b);
      used.add(b);
      lane = to;
    }
  }
  const order = [...used].sort((a, b) => a - b);
  const idOf = new Map(order.map((k, i) => [k, i]));
  const nodes: MapNode[] = order.map((k, id) => {
    const layer = Math.floor(k / LANES), lane = k % LANES;
    return {
      id, layer, lane, kind: 'battle', biome: '',
      x: (layer + 1 + (rand() - 0.5) * 0.36) / (LAYERS + 1.75),
      y: (lane + 0.5 + (rand() - 0.5) * 0.5) / LANES,
      next: [...(edges.get(k) ?? [])].map((t) => idOf.get(t)!).sort((a, b) => a - b),
    };
  });
  const parents = (n: MapNode) => nodes.filter((p) => p.next.includes(n.id));
  // campos de treino: nunca na 1ª camada, nunca dois seguidos no mesmo caminho; o mapa tem pelo menos 3
  const canTrain = (n: MapNode) => n.layer > 0 && n.kind === 'battle' && !parents(n).some((p) => p.kind === 'training') && !n.next.some((c) => nodes[c].kind === 'training');
  for (const n of nodes) if (canTrain(n) && rand() < (n.layer === LAYERS - 1 ? 0.45 : 0.2)) n.kind = 'training';
  for (let guard = 0; nodes.filter((n) => n.kind === 'training').length < 3 && guard < 60; guard++) {
    const n = nodes[Math.floor(rand() * nodes.length)];
    if (canTrain(n)) n.kind = 'training';
  }
  // regiões: cada bioma dos oponentes ocupa uma área do mapa (os centros ficam bem espalhados); a do chefe fica no fim
  const biomes = [...new Set(foes.map((f) => f.biome))].sort(() => rand() - 0.5);
  const regions: { x: number; y: number; biome: string }[] = [{ x: 0.97, y: 0.5, biome: boss.biome }];
  for (let i = 0; i < biomes.length; i++) {
    // melhor de vários sorteios: o ponto mais longe dos centros que já existem
    let best = { x: 0, y: 0 }, far = -1;
    for (let t = 0; t < 14; t++) {
      const c = { x: 0.06 + rand() * 0.76, y: 0.08 + rand() * 0.84 };
      const d = Math.min(...regions.map((r) => Math.hypot(r.x - c.x, (r.y - c.y) * 0.6)));
      if (d > far) { far = d; best = c; }
    }
    regions.push({ ...best, biome: biomes[i] });
  }
  const regionOf = (n: { x: number; y: number }) => regions.reduce((a, b) => (Math.hypot(b.x - n.x, (b.y - n.y) * 0.6) < Math.hypot(a.x - n.x, (a.y - n.y) * 0.6) ? b : a)).biome;
  for (const n of nodes) n.biome = regionOf(n);
  // o mini-chefe de cada bioma: o herói da região, no ponto de batalha mais fundo dela (um só por bioma)
  for (const f of foes) {
    const spots = nodes.filter((n) => n.kind === 'battle' && n.biome === f.biome).sort((a, b) => b.layer - a.layer || a.id - b.id);
    if (spots[0]) { spots[0].kind = 'elite'; spots[0].foe = f.id; }
  }
  const bossNode: MapNode = { id: nodes.length, layer: LAYERS, lane: Math.floor(LANES / 2), kind: 'boss', biome: boss.biome, foe: boss.id, x: (LAYERS + 1.05) / (LAYERS + 1.75), y: 0.5, next: [] };
  for (const n of nodes) if (n.layer === LAYERS - 1) n.next = [bossNode.id];
  nodes.push(bossNode);
  return { seed, nodes, at: null, cleared: [], regions };
}

/** Os pontos que o jogador pode escolher agora. */
export function available(m: JourneyMap): MapNode[] {
  if (m.at === null) return m.nodes.filter((n) => n.layer === 0);
  return m.nodes[m.at].next.map((id) => m.nodes[id]);
}

/** Conclui um ponto do mapa (batalha vencida, treino feito). */
export function clearNode(j: JourneyState, id: number): void {
  if (!j.map) return;
  j.map.at = id;
  j.map.cleared.push(id);
}

/**
 * Resultado de uma batalha num ponto do mapa: XP (nenhum se desistiu), níveis e, na vitória, o ponto
 * fica concluído. Vencer o chefe encerra o mapa: o próximo é sorteado de novo, mais difícil.
 */
export function applyResult(j: JourneyState, node: MapNode, won: boolean, forfeit = false): { xp: number; levels: number } {
  const boss = node.kind === 'boss';
  const xp = forfeit && !won ? 0 : xpReward(depthOf(j.tier ?? 0, node.layer), won, boss, node.kind === 'elite');
  const levels = addXp(j, xp);
  if (won) {
    j.wins++; j.stage++; j.best = Math.max(j.best, j.stage - 1);
    clearNode(j, node.id);
    if (boss) { j.tier = (j.tier ?? 0) + 1; j.map = undefined; }
  } else j.losses++;
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

/** Nível do oponente: sobe 1 a cada 2 pontos de profundidade (o chefe vem 1 acima). */
export const foeLevel = (depth: number, boss = false): number => Math.min(JOURNEY_MAX_LEVEL, 1 + Math.floor((depth - 1) / 2) + (boss ? 1 : 0));

/**
 * Como o oponente entra: no nível da profundidade, com os bônus de nível distribuídos pelo perfil dele
 * (2 no recurso principal, 1 no outro, 1 em Vida, e repete); o chefe ganha vida a mais a cada mapa.
 */
export function foeStart(hero: HeroDef, depth: number, boss = false): StartBonus {
  const level = foeLevel(depth, boss);
  const main = hero.vigor >= hero.mana ? 'vigor' : 'mana', side = main === 'vigor' ? 'mana' : 'vigor';
  const out: StartBonus = { level, vigor: 0, mana: 0, vida: 0 };
  for (let i = 0; i < level - 1; i++) {
    const k = i % 4;
    if (k === 3) out.vida += 3;
    else if (k === 2 && hero[side] > 0) out[side]++;
    else out[main]++;
  }
  if (boss) out.vida += Math.floor(depth / 2);
  return out;
}

/**
 * Inimigo comum de uma região: usa o deck do herói dela, mas o boneco é mais fraco — menos vida,
 * atributos menores (algumas cartas do deck ficam fora do alcance dele), golpe e defesas mais fracos.
 */
export function minionOf(hero: HeroDef, id: string, name: string): HeroDef {
  const attrs = Object.fromEntries(Object.entries(hero.attrs).map(([k, v]) => [k, Math.max(0, v - 1)])) as HeroDef['attrs'];
  return {
    ...hero, id, name, attrs, maxHp: Math.max(12, Math.round(hero.maxHp * 0.58)),
    weapon: { ...hero.weapon, dmg: Math.max(1, hero.weapon.dmg - 1) }, armor: Math.max(0, hero.armor - 1), resist: Math.max(0, hero.resist - 1),
  };
}

/** O bot joga melhor conforme a profundidade. */
export const foeDifficulty = (depth: number): Difficulty => (depth <= 3 ? 'easy' : depth <= 10 ? 'normal' : 'hard');

/**
 * O deck na Jornada: só as cartas que o herói já pode usar no nível dele. Se faltarem cartas
 * para as 40, entram cópias a mais das cartas liberadas (das que têm menos cópias primeiro),
 * sem passar de 4 cópias (nem do que o jogador tem: `cap`). Reações e itens não se multiplicam.
 */
export function journeyDeck(cards: CardDef[], level: number, cap: (c: CardDef) => number = () => MAX_COPIES): CardDef[] {
  const ok = cards.filter((c) => c.game.level <= level && c.game.copies > 0).map((c) => ({ ...c, game: { ...c.game } }));
  let total = ok.reduce((n, c) => n + c.game.copies, 0);
  // cartas demais (o deck inicial mais as recompensas ganhas): saem cópias das cartas mais repetidas, as de nível mais baixo primeiro
  while (total > DECK_SIZE) {
    const most = ok.reduce((a, b) => (b.game.copies > a.game.copies || (b.game.copies === a.game.copies && b.game.level < a.game.level) ? b : a));
    if (most.game.copies <= 1) break;
    most.game.copies--;
    total--;
  }
  const room = (c: CardDef) => c.game.copies < Math.min(MAX_COPIES, cap(c));
  const pick = (pool: CardDef[]) => pool.filter(room).reduce<CardDef | null>((a, b) => (!a || b.game.copies < a.game.copies ? b : a), null);
  const common = ok.filter((c) => c.game.kind !== 'reacao' && c.game.kind !== 'item');
  while (total < DECK_SIZE) {
    const least = pick(common) ?? pick(ok);
    if (!least) break;
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

/**
 * Cartas oferecidas como recompensa (até 3): só as que o jogador ainda não tem em 4 cópias; de preferência
 * as do nível do herói; faltando, as de nível mais próximo (primeiro abaixo, depois acima).
 * `have`: quantas cópias o jogador tem de cada carta.
 */
export function rewardChoices<T extends { id: string; level: number }>(pool: T[], level: number, have: (id: string) => number, rand: () => number, n = 3): T[] {
  const open = pool.filter((c) => have(c.id) < MAX_COPIES);
  const dist = (c: T) => (c.level === level ? 0 : c.level < level ? level - c.level : (c.level - level) + 0.5);
  return open.map((c) => ({ c, k: dist(c) + rand() * 0.9 })).sort((a, b) => a.k - b.k).slice(0, n).map((x) => x.c);
}
