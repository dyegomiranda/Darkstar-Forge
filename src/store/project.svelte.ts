/**
 * Estado do projeto na memória + salvamento.
 *
 * - Cada carta alterada é gravada sozinha, 400 ms depois da última mudança.
 * - Uma falha de gravação NÃO trava as próximas (o erro aparece e a fila segue).
 * - Editar uma carta trabalha numa cópia; só "Salvar" (ou autossalvar) aplica.
 */
import { applyScoring } from '../model/scoring';
import { PF_ID, pfCollection, PROTO_ID, protoCollection, protoWeapon, seedProject } from '../model/seed';
import { effectsText } from '../game/text';
import { newId } from '../model/id';
import { normalizeCard } from '../model/cost';
import { PROJECT_VERSION, type Card, type ColorId, type Deck, type Lang, type Project, type ResourceId } from '../model/types';
import * as store from './db';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Onde fica guardada a última coleção aberta (preferência deste computador). */
export const LAST_EDITION = 'darkstar.colecao';

class ProjectState {
  project = $state<Project | null>(null);
  cards = $state<Record<string, Card>>({});
  ready = $state(false);
  saveState = $state<SaveState>('idle');
  saveError = $state('');
  /** Coleção (edição) aberta na biblioteca, no verso e nos ajustes. */
  editionId = $state('');

  #dirtyCards = new Set<string>();
  #deletedCards = new Set<string>();
  #projectDirty = false;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #saving: Promise<void> = Promise.resolve();

  get lang(): Lang { return this.project?.lang ?? 'pt-BR'; }

  async load(): Promise<void> {
    const { project, cards } = await store.loadAll();
    if (project) {
      this.project = project;
      this.cards = Object.fromEntries(cards.map((c) => [c.id, normalizeCard(c)]));
      this.#upgrade(cards);
      this.#addMissingCollections();
    } else {
      const s = seedProject();
      this.project = s.project;
      this.cards = Object.fromEntries(s.cards.map((c) => [c.id, c]));
      await store.saveProject(s.project);
      await store.saveCards(s.cards);
    }
    // abre na última coleção usada (senão, na primeira)
    let last = '';
    try { last = localStorage.getItem(LAST_EDITION) ?? ''; } catch { /* sem armazenamento local */ }
    const eds = this.project!.editions;
    this.editionId = eds.some((e) => e.id === last) ? last : eds[0]?.id ?? '';
    this.ready = true;
  }

  /** Projeto de versão antiga: regrava as cartas já convertidas (custo em lista). */
  #upgrade(cards: Card[]): void {
    const p = this.project!;
    if ((p.version ?? 0) >= PROJECT_VERSION) return;
    p.version = PROJECT_VERSION;
    for (const c of cards) this.#dirtyCards.add(c.id);
    this.#projectDirty = true;
    this.#schedule();
  }

  /**
   * Acrescenta coleções de exemplo novas a projetos antigos — uma vez só, sem tocar no resto.
   * Vai pela fila normal de salvamento (uma falha não impede o app de abrir).
   */
  #addMissingCollections(): void {
    const p = this.project!;
    let changed = false;
    for (const [id, make] of [[PF_ID, pfCollection], [PROTO_ID, protoCollection]] as const) {
      if (p.seeded?.includes(id)) continue;
      p.seeded = [...(p.seeded ?? []), id];
      changed = true;
      if (p.editions.some((e) => e.id === id)) continue;
      const col = make();
      p.editions.push(col.edition);
      p.decks.push(...col.decks);
      for (const c of col.cards) { this.cards[c.id] = c; this.#dirtyCards.add(c.id); }
    }
    // textos das cartas do protótipo reescritos (dano exato nos golpes, lembretes curtos)
    const TEXT2 = 'proto-text-3';
    if (!p.seeded?.includes(TEXT2)) {
      p.seeded = [...(p.seeded ?? []), TEXT2];
      changed = true;
      for (const c of Object.values(this.cards)) {
        if (!c.game || !c.deckId.startsWith('proto-')) continue;
        for (const l of ['pt-BR', 'en-US'] as const) c.text[l].rules = effectsText(c.game.effects, l, protoWeapon(c.deckId));
        this.#dirtyCards.add(c.id);
      }
    }
    if (!changed) return;
    this.#projectDirty = true;
    this.#schedule();
  }

  // ───────────── leitura ─────────────

  deck(id: string): Deck | undefined { return this.project?.decks.find((d) => d.id === id); }
  get decks(): Deck[] { return [...(this.project?.decks ?? [])].sort((a, b) => a.order - b.order); }
  /** Decks da coleção aberta (ou da informada). */
  decksOf(editionId = this.editionId): Deck[] { return this.decks.filter((d) => d.editionId === editionId); }
  /** Edição pelo id; sem id, a coleção aberta. */
  edition(id?: string) { const eds = this.project?.editions; return eds?.find((e) => e.id === (id ?? this.editionId)) ?? eds?.[0]; }

  cardsOf(deckId: string): Card[] {
    return Object.values(this.cards).filter((c) => c.deckId === deckId).sort((a, b) => a.n - b.n);
  }

  // ───────────── escrita ─────────────

  /** Grava uma carta (cópia vinda do editor ou alteração direta). */
  putCard(card: Card): void {
    const c = applyScoring($state.snapshot(card) as Card);
    c.updatedAt = Date.now();
    this.cards[c.id] = c;
    this.#dirtyCards.add(c.id);
    this.#schedule();
  }

  putCards(cards: Card[]): void {
    for (const card of cards) {
      const c = applyScoring($state.snapshot(card) as Card);
      c.updatedAt = Date.now();
      this.cards[c.id] = c;
      this.#dirtyCards.add(c.id);
    }
    this.#schedule();
  }

  newCard(deckId: string): Card {
    const deck = this.deck(deckId)!;
    const n = Math.max(0, ...this.cardsOf(deckId).map((c) => c.n)) + 1;
    const colors: ColorId[] = [...deck.colors];
    const res = { red: 'vigor', blue: 'mana', green: 'nature', black: 'souls', purple: 'shadow', white: 'faith', silver: 'focus', orange: 'gold', gear: 'gold' }[colors[0]] as ResourceId;
    const now = Date.now();
    const blank = { name: '', type: '', subtype: '', rules: '', flavor: '' };
    return {
      id: newId('card'), deckId, n,
      text: { 'pt-BR': { ...blank, name: 'Nova carta', type: 'Criatura' }, 'en-US': { ...blank, name: 'New card', type: 'Creature' } },
      colors, cost: [{ resource: res, amount: 1, show: 'number' }], stats: { atk: 1, def: 1 }, rarity: 'common',
      mechanics: [], tags: [], costMode: 'auto', rarityMode: 'auto',
      art: { zoom: 1, x: 0, y: 0, mirror: false }, createdAt: now, updatedAt: now,
    };
  }

  duplicate(id: string): Card {
    const src = this.cards[id];
    const copy: Card = { ...structuredClone($state.snapshot(src) as Card), id: newId('card'), n: Math.max(...this.cardsOf(src.deckId).map((c) => c.n)) + 1 };
    for (const l of Object.keys(copy.text) as Lang[]) copy.text[l].name += ' (cópia)';
    this.putCard(copy);
    return copy;
  }

  deleteCards(ids: string[]): void {
    for (const id of ids) {
      delete this.cards[id];
      this.#dirtyCards.delete(id);
      this.#deletedCards.add(id);
    }
    this.#schedule();
  }

  /** Alterações no projeto (decks, edições, idioma, personagens…). */
  updateProject(fn: (p: Project) => void): void {
    if (!this.project) return;
    fn(this.project);
    this.#projectDirty = true;
    this.#schedule();
  }

  async replaceAll(project: Project, cards: Card[]): Promise<void> {
    cards = cards.map(normalizeCard);
    project.version = PROJECT_VERSION;
    await this.flush();
    await store.wipe();
    await store.saveProject(project);
    await store.saveCards(cards);
    this.project = project;
    this.cards = Object.fromEntries(cards.map((c) => [c.id, c]));
    if (!project.editions.some((e) => e.id === this.editionId)) this.editionId = project.editions[0]?.id ?? '';
  }

  async resetToSeed(): Promise<void> {
    const s = seedProject();
    await this.replaceAll(s.project, s.cards);
  }

  // ───────────── salvamento ─────────────

  #schedule() {
    this.saveState = 'saving';
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.flush(), 400);
  }

  /** Grava tudo o que está pendente. Pode ser chamado a qualquer momento (ex.: ao fechar). */
  flush(): Promise<void> {
    if (this.#timer) { clearTimeout(this.#timer); this.#timer = null; }
    // encadeia, mas cada gravação trata o próprio erro: uma falha não bloqueia as seguintes
    this.#saving = this.#saving.then(() => this.#write()).catch(() => undefined);
    return this.#saving;
  }

  async #write(): Promise<void> {
    const ids = [...this.#dirtyCards];
    const del = [...this.#deletedCards];
    const proj = this.#projectDirty;
    if (!ids.length && !del.length && !proj) { if (this.saveState === 'saving') this.saveState = 'saved'; return; }
    this.#dirtyCards.clear();
    this.#deletedCards.clear();
    this.#projectDirty = false;
    try {
      const cards = ids.map((id) => this.cards[id]).filter(Boolean).map((c) => $state.snapshot(c) as Card);
      if (cards.length) await store.saveCards(cards);
      if (del.length) await store.deleteCards(del);
      if (proj && this.project) await store.saveProject($state.snapshot(this.project) as Project);
      this.saveState = 'saved';
      this.saveError = '';
    } catch (e) {
      // devolve à fila para tentar de novo na próxima alteração/fechamento
      ids.forEach((id) => this.#dirtyCards.add(id));
      del.forEach((id) => this.#deletedCards.add(id));
      if (proj) this.#projectDirty = true;
      this.saveState = 'error';
      this.saveError = e instanceof Error ? e.message : String(e);
      console.error('Falha ao salvar', e);
    }
  }

  get hasPending(): boolean {
    return this.#dirtyCards.size > 0 || this.#deletedCards.size > 0 || this.#projectDirty;
  }
}

export const app = new ProjectState();
