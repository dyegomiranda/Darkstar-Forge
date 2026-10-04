/**
 * Estado do projeto na memória + salvamento.
 *
 * - Cada carta alterada é gravada sozinha, 400 ms depois da última mudança.
 * - Uma falha de gravação NÃO trava as próximas (o erro aparece e a fila segue).
 * - Editar uma carta trabalha numa cópia; só "Salvar" (ou autossalvar) aplica.
 */
import { applyScoring } from '../model/scoring';
import { editionDecks, OLD_EDITION_ID, PF_ID, pfCollection, presetHeroes, PROTO_ID, protoCollection, seedProject } from '../model/seed';
import { newId } from '../model/id';
import { syncLook } from '../model/lookPaths';
import { MAX_COPIES, ownedCopies } from '../model/builds';
import { normalizeCard } from '../model/cost';
import { PROTO_GEAR_DECK, migrateGear, presetSlots, protoEquipment, SLOTS } from '../model/equipment';
import { adoptStyles } from '../avatar/sets';
import { HERO_BASES } from '../game/decks';
import { upgradeHero } from '../model/hero';
import { PROJECT_VERSION, type Build, type Card, type ColorId, type Deck, type Lang, type Project, type ResourceId } from '../model/types';
import * as store from './db';
import { PRESET_AVATARS } from '../avatar/presets';
import { importImage } from './media';

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
    void this.#addProtoArt();
  }

  /**
   * Artes em pixel art das cartas do Protótipo (vêm junto com o app, em art/proto/).
   * Só entram em cartas que ainda não têm imagem; roda uma vez.
   */
  async #addProtoArt(): Promise<void> {
    const MARK = 'proto-art-5';
    const p = this.project!;
    if (p.seeded?.includes(MARK)) return;
    const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cache = new Map<string, string | null>();
    for (const c of Object.values(this.cards)) {
      if (!c.game || !c.deckId.startsWith('proto-') || c.art.mediaId) continue;
      const key = slug(c.text['en-US'].name);
      if (!cache.has(key)) {
        try {
          const r = await fetch(new URL(`art/proto/${key}.webp`, document.baseURI));
          cache.set(key, r.ok ? await importImage(await r.blob(), `${key}.webp`) : null);
        } catch { cache.set(key, null); }
      }
      const id = cache.get(key);
      if (!id) continue;
      this.putCard({ ...this.cards[c.id], art: { ...c.art, mediaId: id, zoom: 1, x: 0, y: 0 } });
    }
    // só marca como feito quando todas as artes existem (enquanto o conjunto estiver incompleto, tenta de novo ao abrir)
    if (cache.size && ![...cache.values()].some((v) => v === null)) this.updateProject((pr) => { pr.seeded = [...(pr.seeded ?? []), MARK]; });
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
    // heróis prontos com os 10 espaços de equipamento (3.6): os vazios recebem as peças do modelo; o que o jogador vestiu fica
    const FULL = 'preset-gear-2';
    if (!p.seeded?.includes(FULL)) {
      p.seeded = [...(p.seeded ?? []), FULL];
      changed = true;
      const eq = protoEquipment(p.editions.some((e) => e.id === PROTO_ID) ? PROTO_ID : p.editions[0]?.id ?? PROTO_ID);
      // as cartas do catálogo acompanham os números novos (a arte e a aparência de cada uma ficam)
      if (p.decks.some((d) => d.id === PROTO_GEAR_DECK)) for (const c of eq.cards) {
        const old = this.cards[c.id];
        this.cards[c.id] = old ? { ...old, text: c.text, gear: c.gear, tags: c.tags, rarity: c.rarity, cost: [], n: c.n } : c;
        this.#dirtyCards.add(c.id);
      }
      for (const ch of p.characters) {
        if (!ch.preset) continue;
        const two = this.cards[ch.slots.mainHand ?? '']?.gear?.weapon?.hands === 2;
        for (const [slot, id] of Object.entries(presetSlots(ch.preset)) as [keyof typeof ch.slots, string][]) {
          if (ch.slots[slot] || !this.cards[id] || (two && slot === 'offHand')) continue;
          ch.slots[slot] = id;
        }
      }
    }
    // a antiga 1ª Edição (amostra de cartas sem jogo) sai, a pedido — só fica se algum herói jogar com um deck dela
    const DROP = 'drop-ed1-1';
    if (!p.seeded?.includes(DROP)) {
      p.seeded = [...(p.seeded ?? []), DROP];
      changed = true;
      if (p.editions.some((e) => e.id === OLD_EDITION_ID)) {
        const ids = new Set(p.decks.filter((d) => d.editionId === OLD_EDITION_ID).map((d) => d.id));
        const cards = Object.values(this.cards).filter((c) => ids.has(c.deckId));
        const used = p.characters.some((ch) => ids.has(ch.play?.deckId ?? ''));
        if (!used) {
          p.editions = p.editions.filter((e) => e.id !== OLD_EDITION_ID);
          p.decks = p.decks.filter((d) => !ids.has(d.id));
          for (const c of cards) { delete this.cards[c.id]; this.#dirtyCards.delete(c.id); this.#deletedCards.add(c.id); }
        }
      }
    }
    // os decks Roxo, Bege e Prata (3.5) e os seus heróis chegam a quem já tinha o jogo
    const DECKS7 = 'proto-decks-7';
    if (!p.seeded?.includes(DECKS7) && p.editions.some((e) => e.id === PROTO_ID)) {
      p.seeded = [...(p.seeded ?? []), DECKS7];
      changed = true;
      const col = protoCollection();
      for (const d of col.decks) {
        if (d.kind !== 'class' || p.decks.some((x) => x.id === d.id)) continue;
        p.decks.push(d);
        for (const c of col.cards) if (c.deckId === d.id) { this.cards[c.id] = c; this.#dirtyCards.add(c.id); }
      }
      for (const h of presetHeroes()) if (!p.characters.some((c) => c.id === h.id || c.preset === h.preset)) p.characters.push(h);
    }
    // cartas do Protótipo acompanham as regras atuais (custos, efeitos, cópias, cartas novas, deck de Itens e decks dos chefes);
    // a carta antiga é achada pelo nome (em inglês) no mesmo deck: arte e aparência ficam
    const RULES = 'proto-rules-8';
    if (!p.seeded?.includes(RULES) && p.editions.some((e) => e.id === PROTO_ID)) {
      p.seeded = [...(p.seeded ?? []), RULES];
      changed = true;
      const col = protoCollection();
      for (const d of col.decks) if ((d.kind === 'resources' || d.kind === 'monster') && !p.decks.some((x) => x.id === d.id)) p.decks.push(d);
      const mine = Object.values(this.cards).filter((c) => c.deckId.startsWith('proto-') && this.deckKindOf(p, c.deckId) !== 'equipment');
      const keep = new Set<string>(), moved = new Map<string, string>();
      for (const fresh of col.cards) {
        if (this.deckKindOf(p, fresh.deckId) === 'equipment' || !p.decks.some((d) => d.id === fresh.deckId)) continue;
        const name = fresh.text['en-US'].name;
        const old = mine.find((c) => c.deckId === fresh.deckId && c.text['en-US'].name === name && !keep.has(c.id));
        if (old) {
          keep.add(old.id);
          this.cards[old.id] = { ...old, n: fresh.n, text: fresh.text, cost: fresh.cost, stats: fresh.stats, rarity: fresh.rarity, tags: fresh.tags, game: fresh.game, art: { ...old.art, icon: fresh.art.icon } };
          this.#dirtyCards.add(old.id);
          continue;
        }
        // carta nova: se uma de mesmo nome já existia noutro deck (as poções saíram dos decks de classe), herda a arte dela
        const twin = mine.find((c) => c.text['en-US'].name === name && c.art.mediaId);
        const card = twin ? { ...fresh, art: { ...twin.art, icon: fresh.art.icon } } : fresh;
        this.cards[card.id] = card;
        this.#dirtyCards.add(card.id);
        keep.add(card.id);
        for (const c of mine) if (c.text['en-US'].name === name) moved.set(c.id, card.id);
      }
      // o que sobrou nos decks de classe (os itens que saíram deles) sai; os decks montados passam a apontar para a carta nova
      const ITEM_NAMES = new Set(col.cards.filter((c) => c.game?.kind === 'item').map((c) => c.text['en-US'].name));
      const gone = mine.filter((c) => !keep.has(c.id) && c.game?.kind === 'item' && ITEM_NAMES.has(c.text['en-US'].name));
      for (const c of gone) { delete this.cards[c.id]; this.#dirtyCards.delete(c.id); this.#deletedCards.add(c.id); }
      for (const b of p.builds ?? []) for (const [cid, n] of Object.entries(b.cards)) {
        if (this.cards[cid]) continue;
        delete b.cards[cid];
        const to = moved.get(cid);
        if (to) b.cards[to] = Math.min(4, (b.cards[to] ?? 0) + n);
      }
    }
    // os estilos Ornado, Ornado Régio e Ornado Marfim saíram: o que os usava passa para o Neutro (uma vez)
    const STYLES_MARK = 'styles-neutro-1';
    if (!p.seeded?.includes(STYLES_MARK)) {
      p.seeded = [...(p.seeded ?? []), STYLES_MARK];
      changed = true;
      const GONE = new Set(['ornado', 'ornadoRegio', 'ornadoMarfim']);
      const fix = (o: unknown): boolean => {
        if (!o || typeof o !== 'object') return false;
        let hit = false;
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (k === 'style' && typeof v === 'string' && GONE.has(v)) { (o as Record<string, unknown>)[k] = 'neutro'; hit = true; }
          else if (v && typeof v === 'object' && k !== 'text' && k !== 'game') hit = fix(v) || hit;
        }
        return hit;
      };
      fix(p);
      // recursos e equipamentos continuam sem selo de classe (o Neutro antigo escondia por padrão)
      for (const d of p.decks) if (d.kind !== 'class' && d.look?.style === 'neutro' && !d.look.pieces?.class) d.look.pieces = { ...d.look.pieces, class: { style: 'neutro', hidden: true } };
      for (const c of Object.values(this.cards)) if (c.look && fix(c.look)) this.#dirtyCards.add(c.id);
    }
    // heróis prontos viram fichas (uma vez; se o usuário apagar, não voltam)
    const HEROES_MARK = 'proto-heroes-1';
    if (!p.seeded?.includes(HEROES_MARK)) {
      p.seeded = [...(p.seeded ?? []), HEROES_MARK];
      changed = true;
      for (const h of presetHeroes()) if (!p.characters.some((c) => c.id === h.id)) p.characters.push(h);
    }
    // equipamento vira carta: entra o deck de Equipamentos do Protótipo e a arma/peças de cada ficha passam para cartas vestidas
    const GEAR_MARK = 'proto-equipment-1';
    if (!p.seeded?.includes(GEAR_MARK)) {
      p.seeded = [...(p.seeded ?? []), GEAR_MARK];
      changed = true;
      const edId = p.editions.some((e) => e.id === PROTO_ID) ? PROTO_ID : p.editions[0]?.id;
      if (edId) {
        if (!p.decks.some((d) => d.id === PROTO_GEAR_DECK)) {
          const eq = protoEquipment(edId);
          p.decks.push(eq.deck);
          for (const c of eq.cards) if (!this.cards[c.id]) { this.cards[c.id] = c; this.#dirtyCards.add(c.id); }
        }
        let n = Math.max(0, ...Object.values(this.cards).filter((c) => c.deckId === PROTO_GEAR_DECK).map((c) => c.n));
        for (const ch of p.characters) {
          for (const c of migrateGear(ch, this.cards, PROTO_GEAR_DECK, () => ++n)) { this.cards[c.id] = c; this.#dirtyCards.add(c.id); }
        }
      }
    }
    // equipamentos refeitos (3.5): o catálogo novo substitui as peças antigas; cartas de equipamento
    // sem bônus nenhum (a amostra antiga, com custo em ouro) saem; as fichas trocam as peças que sumiram
    const GEAR2_MARK = 'gear-overhaul-1';
    if (!p.seeded?.includes(GEAR2_MARK)) {
      p.seeded = [...(p.seeded ?? []), GEAR2_MARK];
      changed = true;
      const edId = p.editions.some((e) => e.id === PROTO_ID) ? PROTO_ID : p.editions[0]?.id;
      if (edId) {
        const eq = protoEquipment(edId);
        if (!p.decks.some((d) => d.id === PROTO_GEAR_DECK)) p.decks.push(eq.deck);
        for (const c of eq.cards) {
          const old = this.cards[c.id];
          this.cards[c.id] = old ? { ...old, text: c.text, gear: c.gear, tags: c.tags, rarity: c.rarity, cost: [], art: { ...old.art, icon: c.art.icon } } : c;
          this.#dirtyCards.add(c.id);
        }
        const kinds = new Map(p.decks.map((d) => [d.id, d.kind]));
        const gone = new Set(Object.values(this.cards).filter((c) => c.id.startsWith('proto-eq-')
          || (kinds.get(c.deckId) === 'equipment' && c.deckId !== PROTO_GEAR_DECK && !(c.gear && Object.keys(c.gear).length))).map((c) => c.id));
        for (const ch of p.characters) for (const sl of SLOTS) {
          const id = ch.slots[sl.id];
          if (!id || !gone.has(id)) continue;
          // peça antiga de um herói pronto: entra a peça nova do mesmo herói nesse espaço (se ele tiver)
          const m = /^proto-eq-(.+)-[a-z]+$/.exec(id);
          const repl = m ? presetSlots(m[1])[sl.id] : undefined;
          if (repl && this.cards[repl]) ch.slots[sl.id] = repl; else delete ch.slots[sl.id];
        }
        for (const id of gone) { delete this.cards[id]; this.#dirtyCards.delete(id); this.#deletedCards.add(id); }
        // heróis prontos: os espaços vazios ganham as peças novas do modelo; a vida base acompanha o modelo se não foi mexida
        const OLD_HP: Record<string, number> = { brunhild: 23 };
        for (const ch of p.characters) {
          const b = ch.preset ? HERO_BASES.find((h) => h.id === ch.preset) : undefined;
          if (!b) continue;
          for (const [slot, id] of Object.entries(presetSlots(b.id)) as [keyof typeof ch.slots, string][]) if (!ch.slots[slot] && this.cards[id]) ch.slots[slot] = id;
          if (ch.play && OLD_HP[b.id] === ch.play.baseHp) ch.play.baseHp = b.baseHp;
        }
      }
    }
    // os heróis prontos ganham o boneco em pixel art (uma vez; quem já tem boneco fica como está)
    const AVATARS_MARK = 'proto-avatars-1';
    if (!p.seeded?.includes(AVATARS_MARK)) {
      p.seeded = [...(p.seeded ?? []), AVATARS_MARK];
      changed = true;
      for (const c of p.characters) if (c.preset && !c.avatar && PRESET_AVATARS[c.preset]) c.avatar = structuredClone(PRESET_AVATARS[c.preset]);
    }
    // todo herói pode batalhar: fichas sem dados de jogo ganham os da classe; os atributos de jogo passam a vir da ficha
    const PLAY_MARK = 'heroes-play-1';
    if (!p.seeded?.includes(PLAY_MARK)) {
      p.seeded = [...(p.seeded ?? []), PLAY_MARK];
      changed = true;
      const playable = [...p.decks].sort((a, b) => a.order - b.order).filter((d) => Object.values(this.cards).some((c) => c.deckId === d.id && c.game));
      for (const c of p.characters) upgradeHero(c, playable);
    }
    // a pele agora pinta o boneco inteiro: os esqueletos que já existiam continuam cor de osso
    const BONE_MARK = 'skeleton-skin-1';
    if (!p.seeded?.includes(BONE_MARK)) {
      p.seeded = [...(p.seeded ?? []), BONE_MARK];
      changed = true;
      for (const c of p.characters) if (c.avatar?.frame === 'skeleton') c.avatar.skin = 'bone';
    }
    // as luvas ganharam a categoria Mãos (antes dividiam o lugar com braçadeiras e braçais)
    const HANDS_MARK = 'gloves-hands-1';
    if (!p.seeded?.includes(HANDS_MARK)) {
      p.seeded = [...(p.seeded ?? []), HANDS_MARK];
      changed = true;
      for (const c of p.characters) {
        const parts = c.avatar?.parts;
        if (parts?.arms?.id === 'arms_gloves') { parts.hands = parts.arms; delete parts.arms; }
      }
    }
    // peças de conjunto vestidas antes do feitio próprio (3.4) passam a ter o feitio do conjunto
    const STYLE_MARK = 'set-style-1';
    if (!p.seeded?.includes(STYLE_MARK)) {
      p.seeded = [...(p.seeded ?? []), STYLE_MARK];
      changed = true;
      for (const c of p.characters) if (c.avatar) adoptStyles(c.avatar);
    }
    // o jogo passou a se chamar Void Sun: os nomes que ainda eram os de fábrica acompanham (o que o usuário renomeou fica)
    const NAME_MARK = 'rename-voidsun-1';
    if (!p.seeded?.includes(NAME_MARK)) {
      p.seeded = [...(p.seeded ?? []), NAME_MARK];
      changed = true;
      if (p.name === 'Darkstar') p.name = 'Void Sun';
      for (const e of p.editions) {
        if (e.name === 'Protótipo — Mesa de teste') e.name = 'Protótipo';
        if (e.back?.title === 'Darkstar') e.back.title = 'Void Sun';
      }
    }
    if (!changed) return;
    this.#projectDirty = true;
    this.#schedule();
  }

  // ───────────── leitura ─────────────

  deckKindOf(p: Project, deckId: string): Deck['kind'] | undefined { return p.decks.find((d) => d.id === deckId)?.kind; }
  deck(id: string): Deck | undefined { return this.project?.decks.find((d) => d.id === id); }
  get decks(): Deck[] { return [...(this.project?.decks ?? [])].sort((a, b) => a.order - b.order); }
  /** Decks da coleção aberta (ou da informada). */
  decksOf(editionId = this.editionId): Deck[] { return this.decks.filter((d) => d.editionId === editionId); }
  /** Edição pelo id; sem id, a coleção aberta. */
  edition(id?: string) { const eds = this.project?.editions; return eds?.find((e) => e.id === (id ?? this.editionId)) ?? eds?.[0]; }

  /** Coleção nova, vazia, com os 9 decks de sempre (uma cor de classe cada, Recursos e Equipamentos). Devolve o id. */
  addEdition(name: string): string {
    const id = newId('ed');
    const code = name.trim().slice(0, 8) || 'NOVA';
    this.updateProject((p) => {
      p.editions.push({ id, name: name.trim() || 'Nova coleção', code });
      const decks = editionDecks(id, `${id}-`);
      // modelo padrão do usuário: os decks novos já nascem com ele (cada um com as suas cores e símbolos)
      const tpl = p.themes?.find((t) => t.id === p.defaultThemeId);
      if (tpl) for (const d of decks) if (d.kind === 'class') d.look = syncLook(d.look as never, $state.snapshot(tpl.look) as never) as typeof d.look;
      p.decks.push(...decks);
    });
    this.editionId = id;
    return id;
  }
  /** Heróis que jogam com decks desta coleção (ela não pode sair enquanto eles a usam). */
  heroesUsing(editionId: string): string[] {
    const ids = new Set(this.decksOf(editionId).map((d) => d.id));
    return (this.project?.characters ?? []).filter((c) => ids.has(c.play?.deckId ?? '')).map((c) => c.name || '?');
  }
  /** Apaga a coleção com os seus decks e cartas. Não apaga a última nem uma que algum herói usa. */
  removeEdition(editionId: string): boolean {
    const p = this.project;
    if (!p || p.editions.length < 2 || this.heroesUsing(editionId).length) return false;
    const ids = new Set(p.decks.filter((d) => d.editionId === editionId).map((d) => d.id));
    this.deleteCards(Object.values(this.cards).filter((c) => ids.has(c.deckId)).map((c) => c.id));
    this.updateProject((pr) => {
      pr.editions = pr.editions.filter((e) => e.id !== editionId);
      pr.decks = pr.decks.filter((d) => !ids.has(d.id));
    });
    if (this.editionId === editionId) this.editionId = p.editions[0]?.id ?? '';
    return true;
  }

  /**
   * Cartas agrupadas por deck, já em ordem. Montado uma vez e refeito só quando
   * alguma carta entra, sai, muda de deck ou de número — as telas pedem esta lista
   * muitas vezes por desenho (contagens, filtros, temas).
   */
  #byDeck = $derived.by(() => {
    const map = new Map<string, Card[]>();
    for (const c of Object.values(this.cards)) {
      const list = map.get(c.deckId);
      if (list) list.push(c); else map.set(c.deckId, [c]);
    }
    for (const list of map.values()) list.sort((a, b) => a.n - b.n);
    return map;
  });

  /** Cartas de um deck, pela ordem do número. (Não altere a lista devolvida: ela é compartilhada.) */
  cardsOf(deckId: string): Card[] {
    return this.#byDeck.get(deckId) ?? [];
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
    // deck de Equipamentos: a carta nasce como equipamento (sem custo nem ataque/defesa; o espaço e os bônus se escolhem na aba Jogo)
    if (deck.kind === 'equipment') {
      return {
        id: newId('card'), deckId, n,
        text: { 'pt-BR': { ...blank, name: 'Novo equipamento', type: 'Equipamento' }, 'en-US': { ...blank, name: 'New equipment', type: 'Equipment' } },
        colors, cost: [], stats: null, rarity: 'common', mechanics: [], tags: [], costMode: 'manual', rarityMode: 'manual',
        art: { zoom: 1, x: 0, y: 0, mirror: false }, gear: {}, createdAt: now, updatedAt: now,
      };
    }
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

  // ───────────── inventário de decks (decks de batalha montados) ─────────────
  get builds(): Build[] { return this.project?.builds ?? []; }
  build(id: string | undefined): Build | undefined { return id ? this.builds.find((b) => b.id === id) : undefined; }
  /** Deck montado novo; `fromDeck` começa com as cartas (e cópias) de um deck da biblioteca. */
  addBuild(name: string, colors: ColorId[], fromDeck?: string): Build {
    const cards: Record<string, number> = {};
    if (fromDeck) for (const c of this.cardsOf(fromDeck)) if (c.game && c.game.copies > 0) cards[c.id] = c.game.copies;
    const b: Build = { id: newId('build'), name, cards, colors };
    this.updateProject((p) => { p.builds = [...(p.builds ?? []), b]; });
    return this.build(b.id)!;
  }
  /** Modo desenvolvedor ligado (vem dos Ajustes; a tela principal mantém em dia): todas as cartas valem 4 cópias. */
  devAll = $state(false);
  /** Cópias que o jogador tem de uma carta (veja model/builds.ts). */
  ownedOf(card: Card | undefined): number {
    // modo desenvolvedor: tudo liberado
    if (this.devAll && card?.game) return MAX_COPIES;
    return ownedCopies(card, card ? this.deck(card.deckId) : undefined, this.project?.owned);
  }
  /** Cópias que o jogador ganhou de verdade (sem o modo desenvolvedor): é o que vale para as recompensas. */
  earnedOf(card: Card | undefined): number { return ownedCopies(card, card ? this.deck(card.deckId) : undefined, this.project?.owned); }
  /** O jogador ganha 1 cópia da carta (até 4). */
  grant(cardId: string): void {
    this.updateProject((p) => { const o = (p.owned ??= {}); o[cardId] = Math.min(MAX_COPIES, (o[cardId] ?? 0) + 1); });
  }
  removeBuild(id: string): void {
    this.updateProject((p) => {
      p.builds = (p.builds ?? []).filter((b) => b.id !== id);
      for (const c of p.characters) if (c.buildId === id) delete c.buildId;
    });
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
    // backup de uma versão anterior do programa: passa pelas mesmas atualizações de quando o app abre
    // (estilos que saíram, equipamento em cartas, coleções novas…)
    this.#addMissingCollections();
    await this.flush();
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
