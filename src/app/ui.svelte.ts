/** Avisos (toasts), perguntas de confirmação e barra de progresso globais. */
export interface Toast { id: number; kind: 'ok' | 'error' | 'info'; text: string }
export interface Ask { title: string; text: string; ok: string; cancel?: string; danger?: boolean; third?: string; resolve: (v: 'ok' | 'cancel' | 'third') => void }
export interface Progress { label: string; done: number; total: number; cancel?: () => void }

class UI {
  toasts = $state<Toast[]>([]);
  ask = $state<Ask | null>(null);
  progress = $state<Progress | null>(null);
  #n = 0;

  toast(text: string, kind: Toast['kind'] = 'ok', ms = 3200): void {
    const t = { id: ++this.#n, kind, text };
    this.toasts.push(t);
    setTimeout(() => { this.toasts = this.toasts.filter((x) => x.id !== t.id); }, ms);
  }

  /** Pergunta com 2 ou 3 botões. */
  confirm(o: Omit<Ask, 'resolve'>): Promise<'ok' | 'cancel' | 'third'> {
    return new Promise((resolve) => { this.ask = { ...o, resolve: (v) => { this.ask = null; resolve(v); } }; });
  }
}

export const ui = new UI();
