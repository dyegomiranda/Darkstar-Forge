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

  /** Janela de opções do PDF (layout, versos, virada da folha). null = cancelou. */
  pdf = $state<PdfAsk | null>(null);
  askPdf(count: number, backsOnly = false): Promise<PdfChoice | null> {
    return new Promise((resolve) => { this.pdf = { count, backsOnly, resolve: (v) => { this.pdf = null; resolve(v); } }; });
  }
}

export interface PdfChoice { layout: 'a4' | 'single'; backs: 'none' | 'with' | 'only'; flip: 'long' | 'short' }
export interface PdfAsk { count: number; backsOnly: boolean; resolve: (v: PdfChoice | null) => void }

export const ui = new UI();
