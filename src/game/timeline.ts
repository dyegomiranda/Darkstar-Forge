/** Cada batalha possui seus próprios atrasos: sair ou reiniciar cancela todos. */
export class BattleTimeline {
  #generation = 0;
  #timers = new Map<ReturnType<typeof setTimeout>, (() => void) | undefined>();

  get token(): number { return this.#generation; }
  current(token: number): boolean { return token === this.#generation; }

  schedule(fn: () => void, ms: number): void {
    const token = this.token;
    const timer = setTimeout(() => {
      this.#timers.delete(timer);
      if (this.current(token)) fn();
    }, ms);
    this.#timers.set(timer, undefined);
  }

  sleep(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.#timers.delete(timer); resolve(true); }, ms);
      this.#timers.set(timer, () => resolve(false));
    });
  }

  reset(): void {
    this.#generation++;
    for (const [timer, cancel] of this.#timers) { clearTimeout(timer); cancel?.(); }
    this.#timers.clear();
  }
}
