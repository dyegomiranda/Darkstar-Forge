/**
 * Estado do editor: trabalha numa CÓPIA da carta. Nada muda no projeto até
 * "Salvar" — e "Descartar" volta de verdade ao que estava salvo.
 * Desfazer/refazer guarda o texto da carta (a arte é só um id, então é leve).
 */
import { app } from '../../store/project.svelte';
import { applyScoring } from '../../model/scoring';
import type { Card, Lang } from '../../model/types';
import type { IconChoice, Look, PieceChoice } from '../../render/compose';
import { mergeLook } from '../../render/card';
import { styleInfo, type PieceKind, type StyleId } from '../../render/elements';

export type LookScope = 'card' | 'deck';

export class EditorState {
  draft = $state<Card>(null as unknown as Card);
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

  /** Aparência no momento em que a carta foi aberta (para "voltar ao que estava" por peça). */
  #openCard: Partial<Look> | undefined;
  #openDeck: Look;

  constructor(card: Card) {
    this.draft = structuredClone($state.snapshot(card) as Card);
    this.lang = app.lang;
    this.#saved = this.#last = JSON.stringify(this.draft);
    this.#openCard = this.draft.look ? structuredClone(this.draft.look) : undefined;
    this.#openDeck = structuredClone($state.snapshot(app.deck(card.deckId)!.look) as Look);
  }

  get dirty(): boolean { return JSON.stringify(this.draft) !== this.#saved; }
  get deck() { return app.deck(this.draft.deckId)!; }
  /** Aparência efetiva (tema do deck + ajustes da carta). */
  get look(): Look { return mergeLook(this.deck.look, this.draft.look); }

  /** Chame após cada alteração: agrupa digitação em passos de desfazer. */
  touch(): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#snapshot(), 350);
  }

  #snapshot() {
    const now = JSON.stringify(this.draft);
    if (now === this.#last) return;
    this.#past.push(this.#last);
    if (this.#past.length > 100) this.#past.shift();
    this.#future = [];
    this.#last = now;
    this.canUndo = true;
    this.canRedo = false;
  }

  undo(): void {
    this.#snapshot();
    const prev = this.#past.pop();
    if (!prev) return;
    this.#future.push(this.#last);
    this.#last = prev;
    this.draft = JSON.parse(prev);
    this.canUndo = this.#past.length > 0;
    this.canRedo = true;
  }

  redo(): void {
    const next = this.#future.pop();
    if (!next) return;
    this.#past.push(this.#last);
    this.#last = next;
    this.draft = JSON.parse(next);
    this.canUndo = true;
    this.canRedo = this.#future.length > 0;
  }

  save(): void {
    applyScoring(this.draft);
    app.putCard(this.draft);
    this.#saved = this.#last = JSON.stringify(this.draft);
  }

  discard(): void {
    const c = app.cards[this.draft.id];
    if (c) this.draft = structuredClone($state.snapshot(c) as Card);
    this.#saved = this.#last = JSON.stringify(this.draft);
    this.#past = []; this.#future = [];
    this.canUndo = this.canRedo = false;
  }

  // ───────────── aparência (carta ou deck inteiro) ─────────────

  #lookTarget(): Partial<Look> {
    if (this.scope === 'deck') return this.deck.look;
    this.draft.look ??= {};
    return this.draft.look;
  }

  #write(fn: (l: Partial<Look>) => void): void {
    if (this.scope === 'deck') app.updateProject(() => fn(this.deck.look));
    else { fn(this.#lookTarget()); this.touch(); }
  }

  setStyle(style: StyleId): void {
    this.#write((l) => {
      l.style = style;
      // trocar o estilo geral limpa escolhas de estilo por peça (mantém cores/ajustes)
      for (const p of Object.values(l.pieces ?? {})) if (p) delete (p as Partial<PieceChoice>).style;
      if (styleInfo(style).pixelArt) l.pixelateArt ??= 7; else if (l.pixelateArt === 7) delete l.pixelateArt;
    });
  }

  piece(kind: PieceKind): PieceChoice {
    return this.look.pieces?.[kind] ?? { style: this.look.style };
  }

  setPiece(kind: PieceKind, patch: Partial<PieceChoice>, remove: (keyof PieceChoice)[] = []): void {
    this.#write((l) => {
      l.pieces ??= {};
      const cur = { ...(l.pieces[kind] ?? {}), ...patch } as PieceChoice;
      for (const k of remove) delete cur[k];
      l.pieces[kind] = cur;
    });
  }

  setIcon(slot: 'cost' | 'class' | 'atk' | 'def', patch: Partial<IconChoice>, remove: (keyof IconChoice)[] = []): void {
    this.#write((l) => {
      l.icons ??= {};
      const cur = { ...(l.icons[slot] ?? {}), ...patch };
      for (const k of remove) delete cur[k];
      l.icons[slot] = cur;
    });
  }

  setLook(patch: Partial<Look>): void {
    this.#write((l) => Object.assign(l, patch));
  }

  // ───────────── voltar ao que estava (por peça / símbolo) ─────────────

  #current(): Partial<Look> | undefined { return this.scope === 'deck' ? this.deck.look : this.draft.look; }
  #opened(): Partial<Look> | undefined { return this.scope === 'deck' ? this.#openDeck : this.#openCard; }

  /** A peça mudou desde que a carta foi aberta? */
  pieceChanged(kind: PieceKind): boolean {
    return JSON.stringify(this.#current()?.pieces?.[kind] ?? null) !== JSON.stringify(this.#opened()?.pieces?.[kind] ?? null);
  }

  /** Volta só esta peça ao que estava quando a carta foi aberta. */
  revertPiece(kind: PieceKind): void {
    const before = this.#opened()?.pieces?.[kind];
    this.#write((l) => {
      l.pieces ??= {};
      if (before) l.pieces[kind] = structuredClone($state.snapshot(before) as PieceChoice);
      else delete l.pieces[kind];
    });
  }

  iconChanged(slot: 'cost' | 'class' | 'atk' | 'def'): boolean {
    return JSON.stringify(this.#current()?.icons?.[slot] ?? null) !== JSON.stringify(this.#opened()?.icons?.[slot] ?? null);
  }

  revertIcon(slot: 'cost' | 'class' | 'atk' | 'def'): void {
    const before = this.#opened()?.icons?.[slot];
    this.#write((l) => {
      l.icons ??= {};
      if (before) l.icons[slot] = structuredClone($state.snapshot(before) as IconChoice);
      else delete l.icons[slot];
    });
  }

  /** Remove todos os ajustes desta carta (volta ao tema do deck). */
  resetCardLook(): void {
    this.draft.look = undefined;
    this.touch();
  }
}
