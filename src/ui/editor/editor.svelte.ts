/**
 * Estado do editor: trabalha em RASCUNHOS. Nada muda no projeto até "Salvar",
 * e "Descartar" volta de verdade ao que estava salvo.
 *
 * A aparência pode ser editada em três escopos:
 *  card       — só esta carta (ajustes por cima do tema do deck) — é o que o editor de carta faz
 *  deck       — tema do deck: vale para todas as cartas dele
 *  collection — tema de todos os decks da coleção (cada deck mantém as suas cores)
 *
 * Deck e coleção são editados na tela de tema (aberta pela Biblioteca): ali o
 * estado é "só tema" — a carta é apenas a amostra, mostrada sem os ajustes
 * próprios, e nunca é gravada.
 *
 * Deck e coleção também são rascunho: a pré-visualização já mostra o resultado,
 * o botão Salvar fica ativo e, ao salvar, os ajustes próprios que as cartas
 * tinham nas mesmas peças são tirados (senão o tema não apareceria nelas).
 */
import { app } from '../../store/project.svelte';
import { applyScoring } from '../../model/scoring';
import { clearPath, copyPath, isDeckSpecific } from '../../model/lookPaths';
import type { Card, Deck, DeckKind, Lang } from '../../model/types';
import type { IconChoice, Look, PieceChoice, PieceSlot } from '../../render/compose';
import { mergeLook, type CardContext } from '../../render/card';
import { styleInfo, type PieceKind, type StyleId } from '../../render/elements';
import { ctxFor } from '../common/cardCtx';

export type LookScope = 'card' | 'deck' | 'collection';
type IconSlot = 'cost' | 'class' | 'atk' | 'def';
/** Um caminho do tema alterado; `wide` = feito no escopo da coleção. */
interface Touched { path: string; wide: boolean }

const clone = <T>(v: T): T => structuredClone($state.snapshot(v) as T);

export class EditorState {
  draft = $state<Card>(null as unknown as Card);
  /** Rascunho do tema do deck da carta. */
  deckLook = $state<Look>(null as unknown as Look);
  /** O que foi mudado no tema (deck/coleção) desde o último salvamento. */
  touched = $state<Touched[]>([]);
  /** Idioma do texto sendo editado (independe do idioma da interface). */
  lang = $state<Lang>('pt-BR');
  scope = $state<LookScope>('card');
  /** No escopo "coleção": que tipos de deck recebem a mudança (começa só com o tipo do deck aberto). */
  kinds = $state<DeckKind[]>([]);
  #saved = $state('');
  #past: string[] = [];
  #future: string[] = [];
  canUndo = $state(false);
  canRedo = $state(false);
  #timer: ReturnType<typeof setTimeout> | undefined;
  #last = '';
  #deckId: string;

  /** Aparência no momento em que a carta foi aberta (para "voltar ao que estava" por peça). */
  #openCard: Partial<Look> | undefined;
  #openDeck: Look;

  /** Só o tema está sendo editado (tela de tema): a carta é amostra e não é gravada. */
  readonly themeOnly: boolean;

  constructor(card: Card, scope: LookScope = 'card', themeOnly = false) {
    this.themeOnly = themeOnly;
    this.scope = scope;
    this.draft = themeOnly ? { ...clone(card), look: undefined } : clone(card);
    this.#deckId = card.deckId;
    this.deckLook = clone(app.deck(card.deckId)!.look);
    this.kinds = [app.deck(card.deckId)!.kind];
    this.lang = app.lang;
    this.#saved = this.#last = this.#serialize();
    this.#openCard = this.draft.look ? clone(this.draft.look) : undefined;
    this.#openDeck = clone(this.deckLook);
  }

  #serialize(): string {
    return JSON.stringify({ c: this.themeOnly ? null : this.draft, d: this.deckLook, t: this.touched });
  }

  /** Tela de tema: troca a carta de amostra (outra carta do mesmo deck), sem mexer no rascunho do tema. */
  setSample(card: Card): void {
    if (!this.themeOnly || card.deckId !== this.#deckId) return;
    this.draft = { ...clone(card), look: undefined };
  }

  get dirty(): boolean { return this.#serialize() !== this.#saved; }
  /** Há mudanças de tema (deck/coleção) esperando o Salvar. */
  get themeDirty(): boolean { return this.touched.length > 0; }
  get deck(): Deck { return app.deck(this.draft.deckId)!; }
  /** Tema do deck em uso na pré-visualização (o rascunho, se for o mesmo deck). */
  get baseLook(): Look { return this.draft.deckId === this.#deckId ? this.deckLook : this.deck.look; }
  /** Aparência efetiva (tema do deck + ajustes da carta). */
  get look(): Look { return mergeLook(this.baseLook, this.draft.look); }
  /** Contexto de desenho com o tema em rascunho. */
  ctx(): CardContext | null {
    const c = ctxFor(this.draft);
    return c ? { ...c, deck: { ...c.deck, look: this.baseLook } } : null;
  }
  /** Quantas cartas o escopo atual afeta. */
  get scopeCount(): number {
    if (this.scope === 'card') return 1;
    const decks = this.scope === 'deck' ? [this.deck] : this.targets;
    return decks.reduce((n, d) => n + app.cardsOf(d.id).length, 0);
  }

  /** Decks que recebem uma mudança de coleção: o aberto e os outros dos tipos marcados. */
  get targets(): Deck[] {
    return app.decksOf(this.deck.editionId).filter((d) => d.id === this.#deckId || this.kinds.includes(d.kind));
  }
  toggleKind(k: DeckKind): void {
    this.kinds = this.kinds.includes(k) ? this.kinds.filter((x) => x !== k) : [...this.kinds, k];
  }
  /** Como o tema de um deck fica depois de aplicar (cada deck mantém cores e símbolos próprios). */
  previewLook(d: Deck): Look {
    if (d.id === this.#deckId) return this.deckLook;
    const l = clone($state.snapshot(d.look) as Look);
    for (const t of this.touched) if (t.wide && !isDeckSpecific(t.path)) copyPath(l as never, this.deckLook as never, t.path, isDeckSpecific);
    return l;
  }

  /** Chame após cada alteração: agrupa digitação em passos de desfazer. */
  touch(): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#snapshot(), 350);
  }

  #snapshot() {
    const now = this.#serialize();
    if (now === this.#last) return;
    this.#past.push(this.#last);
    if (this.#past.length > 100) this.#past.shift();
    this.#future = [];
    this.#last = now;
    this.canUndo = true;
    this.canRedo = false;
  }

  #restore(json: string) {
    const s = JSON.parse(json) as { c: Card | null; d: Look; t: Touched[] };
    if (s.c) this.draft = s.c;
    this.deckLook = s.d;
    this.touched = s.t;
  }

  undo(): void {
    this.#snapshot();
    const prev = this.#past.pop();
    if (!prev) return;
    this.#future.push(this.#last);
    this.#last = prev;
    this.#restore(prev);
    this.canUndo = this.#past.length > 0;
    this.canRedo = true;
  }

  redo(): void {
    const next = this.#future.pop();
    if (!next) return;
    this.#past.push(this.#last);
    this.#last = next;
    this.#restore(next);
    this.canUndo = true;
    this.canRedo = this.#future.length > 0;
  }

  /** Grava a carta e, se houver, o tema do deck/coleção. Devolve quantas outras cartas mudaram. */
  save(): number {
    if (!this.themeOnly) applyScoring(this.draft);
    let others = 0;
    if (this.touched.length) others = this.#applyTheme();
    if (!this.themeOnly) app.putCard(this.draft);
    this.touched = [];
    this.#openDeck = clone(this.deckLook);
    this.#saved = this.#last = this.#serialize();
    return others;
  }

  #applyTheme(): number {
    const deck = app.deck(this.#deckId)!;
    const paths = [...new Set(this.touched.map((t) => t.path))];
    const wide = [...new Set(this.touched.filter((t) => t.wide).map((t) => t.path))].filter((p) => !isDeckSpecific(p));
    const others = wide.length ? this.targets.filter((d) => d.id !== deck.id) : [];
    const look = clone(this.deckLook);
    app.updateProject((p) => {
      for (const d of p.decks) {
        if (d.id === deck.id) d.look = structuredClone(look);
        else if (others.some((o) => o.id === d.id)) {
          const l = structuredClone($state.snapshot(d.look) as Look);
          for (const path of wide) copyPath(l as never, look as never, path, isDeckSpecific);
          d.look = l;
        }
      }
    });
    // as cartas passam a seguir o tema nas peças mudadas
    const changed: Card[] = [];
    const strip = (cards: Card[], ps: string[]) => {
      for (const c of cards) {
        if ((!this.themeOnly && c.id === this.draft.id) || !c.look || !ps.length) continue;
        const before = JSON.stringify(c.look);
        const l = clone(c.look);
        for (const path of ps) clearPath(l as never, path);
        if (JSON.stringify(l) !== before) changed.push({ ...c, look: Object.keys(l).length ? l : undefined });
      }
    };
    strip(app.cardsOf(deck.id), paths);
    for (const d of others) strip(app.cardsOf(d.id), wide);
    if (changed.length) app.putCards(changed);
    return changed.length;
  }

  discard(): void {
    const c = app.cards[this.draft.id];
    if (c) this.draft = this.themeOnly ? { ...clone(c), look: undefined } : clone(c);
    this.deckLook = clone(app.deck(this.#deckId)!.look);
    this.touched = [];
    this.#saved = this.#last = this.#serialize();
    this.#past = []; this.#future = [];
    this.canUndo = this.canRedo = false;
  }

  // ───────────── aparência (carta, deck ou coleção) ─────────────

  /**
   * Aplica uma mudança no alvo do escopo. `paths` diz o que mudou (para levar
   * às outras cartas/decks ao salvar e para tirar o ajuste próprio desta carta).
   */
  #write(paths: string[], fn: (l: Partial<Look>) => void): void {
    if (this.scope === 'card') {
      this.draft.look ??= {};
      fn(this.draft.look);
    } else {
      fn(this.deckLook);
      const wide = this.scope === 'collection';
      const next = this.touched.filter((t) => !paths.includes(t.path));
      this.touched = [...next, ...paths.map((path) => ({ path, wide: wide || this.touched.some((t) => t.path === path && t.wide) }))];
      // nesta carta, o ajuste próprio daquela peça sai (senão esconderia o tema)
      if (this.draft.look) {
        for (const p of paths) clearPath(this.draft.look as never, p);
        if (!Object.keys(this.draft.look).length) this.draft.look = undefined;
      }
    }
    this.touch();
  }

  setStyle(style: StyleId): void {
    this.#write(['style', 'pieces.*.style', 'pixelateArt'], (l) => {
      l.style = style;
      // trocar o estilo geral limpa escolhas de estilo por peça (mantém cores/ajustes)
      for (const p of Object.values(l.pieces ?? {})) if (p) delete (p as Partial<PieceChoice>).style;
      if (styleInfo(style).pixelArt) l.pixelateArt ??= 7; else if (l.pixelateArt === 7) delete l.pixelateArt;
    });
  }

  /** Escolhas em vigor de uma peça. `atk`/`def`: o que vale para os dois + o que for só daquele lado. */
  piece(slot: PieceSlot): PieceChoice {
    const side = slot === 'atk' || slot === 'def';
    const kind: PieceKind = side ? 'stat' : (slot as PieceKind);
    const own = side ? ({ ...this.look.pieces?.stat, ...this.look.pieces?.[slot] } as PieceChoice) : this.look.pieces?.[slot];
    // o estilo pode esconder a peça por padrão
    const byStyle = own?.hidden === undefined && !!styleInfo(this.look.style).hidden?.includes(kind);
    return { ...(own ?? { style: this.look.style }), ...(byStyle ? { hidden: true } : {}) };
  }

  /**
   * Muda uma peça. Em `stat` (ataque e defesa juntos) o valor passa a valer para
   * os dois: o que cada lado tinha de próprio naquele ajuste sai (ou, se vier do
   * tema de baixo, é coberto com o mesmo valor).
   */
  setPiece(slot: PieceSlot, patch: Partial<PieceChoice>, remove: (keyof PieceChoice)[] = []): void {
    const keys = [...Object.keys(patch), ...remove] as (keyof PieceChoice)[];
    const sides: PieceSlot[] = slot === 'stat' ? ['atk', 'def'] : [];
    const paths = [slot, ...sides].flatMap((s) => keys.map((k) => `pieces.${s}.${k}`));
    const below = this.scope === 'card' ? this.baseLook.pieces : undefined;
    this.#write(paths, (l) => {
      l.pieces ??= {};
      const cur = { ...(l.pieces[slot] ?? {}), ...patch } as PieceChoice;
      for (const k of remove) delete cur[k];
      l.pieces[slot] = cur;
      for (const s of sides) {
        const side = { ...(l.pieces[s] ?? {}) } as Record<string, unknown>;
        for (const k of keys) {
          // o tema de baixo tem um valor só desse lado: cobre com o novo; senão, o lado volta a seguir "os dois"
          if (below?.[s] && k in below[s]! && k in patch) side[k] = (patch as Record<string, unknown>)[k];
          else delete side[k];
        }
        if (Object.keys(side).length) l.pieces[s] = side as unknown as PieceChoice; else delete l.pieces[s];
      }
    });
  }

  setIcon(slot: IconSlot | 'set', patch: Partial<IconChoice>, remove: (keyof IconChoice)[] = []): void {
    const paths = [...Object.keys(patch), ...remove].map((k) => `icons.${slot}.${k}`);
    this.#write(paths, (l) => {
      l.icons ??= {};
      const cur = { ...(l.icons[slot] ?? {}), ...patch } as IconChoice;
      for (const k of remove) delete cur[k];
      (l.icons as Record<string, IconChoice>)[slot] = cur;
    });
  }

  /** Símbolo, cor ou imagem de um recurso do custo (mana, vigor…). */
  setResIcon(res: string, patch: Partial<IconChoice>, remove: (keyof IconChoice)[] = []): void {
    const keys = [...Object.keys(patch), ...remove];
    // o formato antigo guardava o símbolo do 1º recurso em icons.cost: sai junto, para não brigar com o novo
    const legacy = keys.filter((k) => k === 'glyph' || k === 'color' || k === 'image').map((k) => `icons.cost.${k}`);
    this.#write([...keys.map((k) => `icons.res.${res}.${k}`), ...legacy], (l) => {
      l.icons ??= {};
      const all = { ...(l.icons.res ?? {}) };
      const cur = { ...(all[res] ?? {}), ...patch } as IconChoice;
      for (const k of remove) delete cur[k];
      if (Object.keys(cur).length) all[res] = cur; else delete all[res];
      if (Object.keys(all).length) l.icons.res = all; else delete l.icons.res;
      if (l.icons.cost) for (const k of ['glyph', 'color', 'image'] as const) if (keys.includes(k)) delete l.icons.cost[k];
    });
  }

  /** Opções gerais dos símbolos (um por classe, ATK/DEF em placa ou medalhão). */
  setIconOption<K extends 'classMode' | 'statMode' | 'hideZeroCost'>(key: K, value: NonNullable<Look['icons']>[K]): void {
    this.#write([`icons.${key}`], (l) => { l.icons = { ...l.icons, [key]: value }; });
  }

  setLook(patch: Partial<Omit<Look, 'pieces' | 'icons'>>): void {
    this.#write(Object.keys(patch), (l) => Object.assign(l, patch));
  }

  // ───────────── voltar ao que estava (por peça / símbolo) ─────────────

  #current(): Partial<Look> | undefined { return this.scope === 'card' ? this.draft.look : this.deckLook; }
  #opened(): Partial<Look> | undefined { return this.scope === 'card' ? this.#openCard : this.#openDeck; }

  /** A peça mudou desde que a carta foi aberta? */
  pieceChanged(kind: PieceSlot): boolean {
    const slots: PieceSlot[] = kind === 'stat' ? ['stat', 'atk', 'def'] : [kind];
    return slots.some((s) => JSON.stringify(this.#current()?.pieces?.[s] ?? null) !== JSON.stringify(this.#opened()?.pieces?.[s] ?? null));
  }

  /** Volta só esta peça ao que estava quando a carta foi aberta. */
  revertPiece(kind: PieceSlot): void {
    const slots: PieceSlot[] = kind === 'stat' ? ['stat', 'atk', 'def'] : [kind];
    const opened = this.#opened()?.pieces;
    this.#write(slots.map((s) => `pieces.${s}`), (l) => {
      l.pieces ??= {};
      for (const s of slots) {
        const before = opened?.[s];
        if (before) l.pieces[s] = clone(before);
        else delete l.pieces[s];
      }
    });
  }

  /** Tira todos os ajustes de uma peça (fica o desenho padrão do estilo geral). */
  resetPiece(kind: PieceSlot): void {
    const slots: PieceSlot[] = kind === 'stat' ? ['stat', 'atk', 'def'] : [kind];
    this.#write(slots.map((s) => `pieces.${s}`), (l) => { for (const s of slots) delete l.pieces?.[s]; });
  }

  /** Os símbolos de um recurso mudaram desde que a tela foi aberta? */
  resIconChanged(res: string): boolean {
    return JSON.stringify(this.#current()?.icons?.res?.[res] ?? null) !== JSON.stringify(this.#opened()?.icons?.res?.[res] ?? null);
  }

  iconChanged(slot: IconSlot | 'set'): boolean {
    return JSON.stringify(this.#current()?.icons?.[slot] ?? null) !== JSON.stringify(this.#opened()?.icons?.[slot] ?? null);
  }

  revertIcon(slot: IconSlot | 'set'): void {
    const before = this.#opened()?.icons?.[slot];
    this.#write([`icons.${slot}`], (l) => {
      l.icons ??= {};
      if (before) (l.icons as Record<string, unknown>)[slot] = clone(before);
      else delete l.icons[slot];
    });
  }

  /** A carta tem ajustes próprios de aparência (por cima do tema)? */
  get hasCardLook(): boolean { return !!this.draft.look && Object.keys(this.draft.look).length > 0; }

  /**
   * Leva os ajustes próprios desta carta para o tema do deck (ou da coleção,
   * conforme o escopo): viram mudanças do tema e saem da carta.
   */
  promoteCardLook(): void {
    const own = this.draft.look;
    if (!own || this.scope === 'card') return;
    const paths: string[] = [];
    for (const [k, v] of Object.entries(own)) {
      if ((k === 'pieces' || k === 'icons') && v && typeof v === 'object') {
        for (const [sub, val] of Object.entries(v as Record<string, unknown>)) {
          if (val && typeof val === 'object') for (const prop of Object.keys(val)) paths.push(`${k}.${sub}.${prop}`);
          else paths.push(`${k}.${sub}`);
        }
      } else paths.push(k);
    }
    const source = clone(own);
    this.#write(paths, (l) => { for (const p of paths) copyPath(l as never, source as never, p); });
    this.draft.look = undefined;
    this.touch();
  }

  /** Remove todos os ajustes desta carta (volta ao tema do deck). */
  resetCardLook(): void {
    this.draft.look = undefined;
    this.touch();
  }
}
