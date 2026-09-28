/** Rotas por hash: #/biblioteca[/deck], #/carta/<id>, #/ficha, #/ajustes. */
export type Route =
  | { name: 'library'; deck?: string }
  | { name: 'editor'; id: string }
  | { name: 'sheet' }
  | { name: 'settings' };

function parse(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/');
  if (a === 'carta' && b) return { name: 'editor', id: decodeURIComponent(b) };
  if (a === 'ficha') return { name: 'sheet' };
  if (a === 'ajustes') return { name: 'settings' };
  return { name: 'library', deck: b ? decodeURIComponent(b) : undefined };
}

class Router {
  route = $state<Route>(parse(location.hash));
  /** Pergunta antes de sair (ex.: editor com alterações). Devolve false para cancelar. */
  guard: (() => Promise<boolean>) | null = null;
  #last = location.hash;

  constructor() {
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

  library(deck?: string) { this.go(deck ? `/biblioteca/${encodeURIComponent(deck)}` : '/biblioteca'); }
  editor(id: string) { this.go(`/carta/${encodeURIComponent(id)}`); }
}

export const router = new Router();
