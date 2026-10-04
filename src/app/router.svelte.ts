/**
 * Rotas por hash: #/ (tela inicial), #/batalha (modos), #/batalha/solo, #/heroi[/<id>|/novo],
 * #/batalha/jornada, #/baralhos[/<id>] (decks de batalha montados), #/decks[/deck], #/carta/<id>, #/tema/deck/<deck>, #/tema/colecao/<deck>, #/verso, #/colecao, #/ajustes, #/sobre.
 */
export type Route =
  | { name: 'home' }
  | { name: 'modes' }
  | { name: 'about' }
  | { name: 'library'; deck?: string }
  | { name: 'collection' }
  | { name: 'editor'; id: string }
  | { name: 'theme'; scope: 'deck' | 'collection'; deck: string }
  | { name: 'back' }
  | { name: 'sheet'; id?: string }
  | { name: 'game' }
  | { name: 'journey' }
  | { name: 'campaign' }
  | { name: 'multi' }
  | { name: 'builds'; id?: string }
  | { name: 'settings' };

function parse(hash: string): Route {
  const [, a, b, c] = hash.replace(/^#/, '').split('/');
  if (a === 'carta' && b) return { name: 'editor', id: decodeURIComponent(b) };
  if (a === 'tema' && (b === 'deck' || b === 'colecao') && c) return { name: 'theme', scope: b === 'deck' ? 'deck' : 'collection', deck: decodeURIComponent(c) };
  if (a === 'verso') return { name: 'back' };
  if (a === 'colecao') return { name: 'collection' };
  if (a === 'ficha' || a === 'heroi') return { name: 'sheet', id: b ? decodeURIComponent(b) : undefined };
  if (a === 'batalha' && b === 'jornada') return { name: 'journey' };
  if (a === 'batalha' && b === 'multi') return { name: 'multi' };
  if (a === 'campanha') return { name: 'campaign' };
  if (a === 'baralhos') return { name: 'builds', id: b ? decodeURIComponent(b) : undefined };
  if (a === 'mesa' || (a === 'batalha' && b === 'solo')) return { name: 'game' };
  if (a === 'batalha') return { name: 'modes' };
  if (a === 'ajustes') return { name: 'settings' };
  if (a === 'sobre') return { name: 'about' };
  if (a === 'decks' || a === 'biblioteca') return { name: 'library', deck: b ? decodeURIComponent(b) : undefined };
  return { name: 'home' };
}

class Router {
  // (fora do navegador — nos testes — não há endereço: fica a tela inicial)
  route = $state<Route>(parse(typeof location === 'undefined' ? '' : location.hash));
  /** Pergunta antes de sair (ex.: editor com alterações). Devolve false para cancelar. */
  guard: (() => Promise<boolean>) | null = null;
  /** Para onde o botão "voltar" de uma tela deve ir (ex.: ficha aberta a partir da seleção da Mesa). */
  returnTo: string | null = null;
  #last = typeof location === 'undefined' ? '' : location.hash;

  constructor() {
    if (typeof location === 'undefined') return;
    addEventListener('hashchange', async () => {
      if (location.hash === this.#last) return;
      if (this.guard && !(await this.guard())) { history.replaceState(null, '', this.#last); return; }
      this.#last = location.hash;
      this.route = parse(location.hash);
    });
  }

  go(path: string): void {
    location.hash = path;
  }

  /** Troca o endereço sem perguntar nada nem deixar a página anterior no histórico (ex.: herói novo que acabou de ser salvo). */
  replace(path: string): void {
    history.replaceState(null, '', `#${path}`);
    this.#last = location.hash;
    this.route = parse(location.hash);
  }

  /** A tela "acima" da atual (para o botão de voltar e para o B do controle). */
  parent(): string {
    const r = this.route;
    if (r.name === 'game' || r.name === 'journey' || r.name === 'multi') return '/batalha';
    if (r.name === 'editor' || r.name === 'theme' || r.name === 'back' || r.name === 'collection' || r.name === 'builds') return '/decks';
    if (r.name === 'sheet' && r.id) return '/heroi';
    return '/';
  }

  library(deck?: string) { this.go(deck ? `/decks/${encodeURIComponent(deck)}` : '/decks'); }
  editor(id: string) { this.go(`/carta/${encodeURIComponent(id)}`); }
  /** Tela de tema: do deck, ou da coleção (tendo esse deck como amostra). */
  theme(scope: 'deck' | 'collection', deck: string) { this.go(`/tema/${scope === 'deck' ? 'deck' : 'colecao'}/${encodeURIComponent(deck)}`); }
}

export const router = new Router();
