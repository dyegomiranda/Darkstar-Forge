/**
 * Estado do editor: trabalha em RASCUNHOS. Nada muda no projeto até "Salvar",
 * e "Descartar" volta de verdade ao que estava salvo.
 *
 * A aparência pode ser editada em três escopos:
 *  card       — só esta carta (ajustes por cima do tema do deck)
 *  deck       — tema do deck: vale para todas as cartas dele
 *  collection — tema de todos os decks da coleção (cada deck mantém as suas cores)
 *
 * Deck e coleção também são rascunho: a pré-visualização já mostra o resultado,
 * o botão Salvar fica ativo e, ao salvar, os ajustes próprios que as cartas
 * tinham nas mesmas peças são tirados (senão o tema não apareceria nelas).
 */
import { app } from '../../store/project.svelte';
import { applyScoring } from '../../model/scoring';
import { clearPath, copyPath, isDeckSpecific } from '../../model/lookPaths';
import type { Card, Deck, Lang } from '../../model/types';
import type { IconChoice, Look, PieceChoice } from '../../render/compose';
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

  constructor(card: Card) {
    this.draft = clone(card);
    this.#deckId = card.deckId;
    this.deckLook = clone(app.deck(card.deckId)!.look);
    this.lang = app.lang;
    this.#saved = this.#last = this.#serialize();
    this.#openCard = this.draft.look ? clone(this.draft.look) : undefined;
    this.#openDeck = clone(this.deckLook);
  }

  #serialize(): string {
    return JSON.stringify({ c: this.draft, d: this.deckLook, t: this.touched });
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
    const decks = this.scope === 'deck' ? [this.deck] : app.decksOf(this.deck.editionId);
    return decks.reduce((n, d) => n + app.cardsOf(d.id).length, 0);
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
    const s = JSON.parse(json) as { c: Card; d: Look; t: Touched[] };
    this.draft = s.c;
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
    applyScoring(this.draft);
    let others = 0;
    if (this.touched.length) others = this.#applyTheme();
    app.putCard(this.draft);
    this.touched = [];
    this.#openDeck = clone(this.deckLook);
    this.#saved = this.#last = this.#serialize();
    return others;
  }

  #applyTheme(): number {
    const deck = app.deck(this.#deckId)!;
    const paths = [...new Set(this.touched.map((t) => t.path))];
    const wide = [...new Set(this.touched.filter((t) => t.wide).map((t) => t.path))].filter((p) => !isDeckSpecific(p));
    const others = wide.length ? app.decksOf(deck.editionId).filter((d) => d.id !== deck.id) : [];
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
        if (c.id === this.draft.id || !c.look || !ps.length) continue;
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
    if (c) this.draft = clone(c);
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

  piece(kind: PieceKind): PieceChoice {
    const own = this.look.pieces?.[kind];
    // o estilo pode esconder a peça por padrão (ex.: Neutro sem selo de classe)
    const byStyle = own?.hidden === undefined && !!styleInfo(this.look.style).hidden?.includes(kind);
    return { ...(own ?? { style: this.look.style }), ...(byStyle ? { hidden: true } : {}) };
  }

  setPiece(kind: PieceKind, patch: Partial<PieceChoice>, remove: (keyof PieceChoice)[] = []): void {
    const paths = [...Object.keys(patch), ...remove].map((k) => `pieces.${kind}.${k}`);
    this.#write(paths, (l) => {
      l.pieces ??= {};
      const cur = { ...(l.pieces[kind] ?? {}), ...patch } as PieceChoice;
      for (const k of remove) delete cur[k];
      l.pieces[kind] = cur;
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
  pieceChanged(kind: PieceKind): boolean {
    return JSON.stringify(this.#current()?.pieces?.[kind] ?? null) !== JSON.stringify(this.#opened()?.pieces?.[kind] ?? null);
  }

  /** Volta só esta peça ao que estava quando a carta foi aberta. */
  revertPiece(kind: PieceKind): void {
    const before = this.#opened()?.pieces?.[kind];
    this.#write([`pieces.${kind}`], (l) => {
      l.pieces ??= {};
      if (before) l.pieces[kind] = clone(before);
      else delete l.pieces[kind];
    });
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
