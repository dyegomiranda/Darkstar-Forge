/**
 * Teclado e controle (joystick) para navegar pelo jogo.
 *
 *  - Setas (ou direcional / alavanca esquerda): levam o foco para o botão mais
 *    próximo naquela direção, em qualquer tela (navegação espacial).
 *  - Confirmar (Enter / A): aciona o que está em foco.
 *  - Voltar (Esc / B): fecha o que estiver aberto; sem nada aberto, abre o menu
 *    (teclado) ou volta uma tela (controle). Start abre o menu.
 *  - LB / RB: aba anterior / seguinte. Y: encerra o turno; X: golpear (batalha).
 */
import { settings } from './settings.svelte';

type Dir = 'up' | 'down' | 'left' | 'right';
export interface InputHooks {
  /** Voltar uma tela (B do controle, sem nada aberto). */
  back: () => void;
  /** Abrir/fechar o menu (Start). */
  menu: () => void;
}

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
/** Janelas por cima da tela: enquanto uma estiver aberta, o foco não sai dela. */
const LAYERS = '[aria-modal="true"], .backdrop, .modal, .picker, .scene-modal, .gmenu, .pause, .respond, .intro, .lvl, .endbox';

const visible = (el: HTMLElement) => {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none';
};

/** A camada do alto (a última janela aberta) ou a página inteira. */
function scope(): HTMLElement {
  const layers = [...document.querySelectorAll<HTMLElement>(LAYERS)].filter((el) => el.getBoundingClientRect().width > 0);
  return layers[layers.length - 1] ?? document.body;
}
function candidates(): HTMLElement[] {
  return [...scope().querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
}

/** Leva o foco para o elemento mais próximo na direção pedida. */
export function moveFocus(dir: Dir): boolean {
  const all = candidates();
  if (!all.length) return false;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || cur === document.body || !all.includes(cur)) {
    (all.find((el) => el.hasAttribute('data-focus-first')) ?? all[0]).focus();
    return true;
  }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best: HTMLElement | null = null, bestScore = Infinity;
  for (const el of all) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    // tem de estar "para lá" da borda do atual naquela direção
    const ahead = dir === 'up' ? b.bottom <= a.top + 4 : dir === 'down' ? b.top >= a.bottom - 4 : dir === 'left' ? b.right <= a.left + 4 : b.left >= a.right - 4;
    if (!ahead) continue;
    const vertical = dir === 'up' || dir === 'down';
    const along = Math.abs(vertical ? dy : dx);
    // quem está alinhado (as faixas se sobrepõem) ganha de quem está na diagonal
    const overlap = vertical ? Math.min(a.right, b.right) - Math.max(a.left, b.left) : Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    const across = overlap > 0 ? 0 : Math.abs(vertical ? dx : dy);
    const score = along + across * 3;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (!best) return false;
  best.focus();
  best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}

/** O foco está num campo em que as setas têm uso próprio? */
function arrowsBusy(el: Element | null, key: string): boolean {
  if (!el) return false;
  const horiz = key === 'ArrowLeft' || key === 'ArrowRight';
  if (el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable) return true;
  if (el instanceof HTMLSelectElement) return !horiz;
  if (el instanceof HTMLInputElement) {
    if (el.type === 'range') return horiz;
    if (el.type === 'number') return true;
    if (['checkbox', 'radio', 'button', 'file', 'color'].includes(el.type)) return false;
    return horiz; // texto: ← → andam pelo texto; ↑ ↓ saem do campo
  }
  return false;
}

const DIRS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const usingKeys = (on: boolean) => document.body.classList.toggle('kbd-nav', on);
const pressEscape = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
/** Há alguma janela aberta por cima da tela? */
const layered = () => scope() !== document.body;

/** Aciona um botão da tela pelo seu papel (data-action), se existir e estiver disponível. */
export function trigger(action: string): boolean {
  const el = [...document.querySelectorAll<HTMLElement>(`[data-action="${action}"]`)].find(visible);
  if (!el) return false;
  el.click();
  return true;
}

export function startInput(hooks: InputHooks): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = DIRS[e.key];
    if (dir) {
      if (arrowsBusy(document.activeElement, e.key)) return;
      usingKeys(true);
      if (moveFocus(dir)) e.preventDefault();
      return;
    }
    if (e.key === 'Tab') usingKeys(true);
  };
  const onMouse = () => usingKeys(false);
  addEventListener('keydown', onKey);
  addEventListener('mousemove', onMouse, { passive: true });

  // ───── controle ─────
  let raf = 0;
  const held = new Map<string, number>(); // botão → quando repete
  const pad = () => [...(navigator.getGamepads?.() ?? [])].find((g) => g && g.connected && g.mapping === 'standard') ?? [...(navigator.getGamepads?.() ?? [])].find((g) => g && g.connected);
  /** Dispara ao apertar; direções repetem enquanto seguradas. */
  const fire = (id: string, down: boolean, now: number, repeat: boolean, fn: () => void) => {
    if (!down) { held.delete(id); return; }
    const next = held.get(id);
    if (next === undefined) { held.set(id, now + 380); fn(); }
    else if (repeat && now >= next) { held.set(id, now + 130); fn(); }
  };
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!settings.v.gamepad || !document.hasFocus()) return;
    const g = pad();
    if (!g) return;
    const b = (i: number) => !!g.buttons[i]?.pressed;
    const ax = g.axes[0] ?? 0, ay = g.axes[1] ?? 0;
    const go = (d: Dir) => () => { usingKeys(true); moveFocus(d); };
    fire('up', b(12) || ay < -0.55, now, true, go('up'));
    fire('down', b(13) || ay > 0.55, now, true, go('down'));
    fire('left', b(14) || ax < -0.55, now, true, go('left'));
    fire('right', b(15) || ax > 0.55, now, true, go('right'));
    fire('a', b(0), now, false, () => {
      usingKeys(true);
      const el = document.activeElement as HTMLElement | null;
      if (el && el !== document.body) el.click(); else moveFocus('down');
    });
    fire('b', b(1), now, false, () => { if (layered()) pressEscape(); else hooks.back(); });
    fire('x', b(2), now, false, () => { trigger('strike'); });
    fire('y', b(3), now, false, () => { trigger('end-turn'); });
    fire('start', b(9), now, false, () => hooks.menu());
    fire('lb', b(4), now, false, () => { cycleTab(-1); });
    fire('rb', b(5), now, false, () => { cycleTab(1); });
  };
  raf = requestAnimationFrame(loop);

  return () => { removeEventListener('keydown', onKey); removeEventListener('mousemove', onMouse); cancelAnimationFrame(raf); };
}

/** Aba anterior/seguinte da tela (elementos com data-tab; a atual tem a classe "on"). */
function cycleTab(step: number): void {
  const tabs = [...scope().querySelectorAll<HTMLElement>('[data-tab]')].filter(visible);
  if (tabs.length < 2) return;
  const i = Math.max(0, tabs.findIndex((t) => t.classList.contains('on')));
  const next = tabs[(i + step + tabs.length) % tabs.length];
  next.click();
  next.focus();
}
