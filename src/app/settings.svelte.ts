/**
 * Configurações do jogo (deste computador): vídeo, som, jogo e controles.
 * Ficam no armazenamento local; a parte de janela é repassada ao programa (Electron),
 * que também a guarda para abrir já no modo certo.
 */
import { chip } from '../audio/chip';
import type { Difficulty } from '../game/bot';

export type DisplayMode = 'windowed' | 'maximized' | 'fullscreen';
export type Quality = 'high' | 'medium' | 'low';
export type Pace = 'slow' | 'normal' | 'fast';
/** Ações com tecla configurável. */
export type KeyAction = 'confirm' | 'back' | 'endTurn' | 'strike' | 'swap' | 'log';
export const KEY_ACTIONS: { id: KeyAction; pt: string; en: string; where: [string, string] }[] = [
  { id: 'confirm', pt: 'Confirmar', en: 'Confirm', where: ['em qualquer tela', 'anywhere'] },
  { id: 'back', pt: 'Voltar / abrir o menu', en: 'Back / open the menu', where: ['em qualquer tela', 'anywhere'] },
  { id: 'endTurn', pt: 'Encerrar o turno', en: 'End the turn', where: ['na batalha', 'in battle'] },
  { id: 'strike', pt: 'Golpear', en: 'Strike', where: ['na batalha', 'in battle'] },
  { id: 'swap', pt: 'Trocar posição', en: 'Change position', where: ['na batalha', 'in battle'] },
  { id: 'log', pt: 'Registro da batalha', en: 'Battle log', where: ['na batalha', 'in battle'] },
];
const DEFAULT_KEYS: Record<KeyAction, string> = { confirm: 'Enter', back: 'Escape', endTurn: 'e', strike: 'g', swap: 't', log: 'l' };

export interface Settings {
  display: DisplayMode;
  /** Tamanho da janela no modo "em janela": 'LARGURAxALTURA'. */
  resolution: string;
  /** Escala da interface (1 = 100%). */
  uiScale: number;
  quality: Quality;
  showFps: boolean;
  master: number;
  music: number;
  sfx: number;
  mute: boolean;
  muteInBackground: boolean;
  pace: Pace;
  difficulty: Difficulty;
  timeLimit: boolean;
  showLog: boolean;
  gamepad: boolean;
  keys: Record<KeyAction, string>;
}

const KEY = 'voidsun.settings';
const DEFAULTS: Settings = {
  display: 'maximized', resolution: '1600x900', uiScale: 1, quality: 'high', showFps: false,
  master: 1, music: 0.6, sfx: 0.8, mute: false, muteInBackground: true,
  pace: 'normal', difficulty: 'normal', timeLimit: true, showLog: true,
  gamepad: true, keys: { ...DEFAULT_KEYS },
};

/** O que o programa (Electron) oferece à página; no navegador não existe. */
export interface Host {
  setDisplay(o: { mode: DisplayMode; width: number; height: number }): Promise<void>;
  setZoom(z: number): Promise<void>;
  info(): Promise<{ width: number; height: number; mode: DisplayMode }>;
  quit(): void;
  onMode(fn: (mode: DisplayMode) => void): void;
}
export const host = (): Host | undefined => (globalThis as unknown as { voidsun?: Host }).voidsun;

function load(): Settings {
  let s: Partial<Settings> = {};
  try { s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>; } catch { /* usa o padrão */ }
  // primeira vez: aproveita o que a versão anterior guardava (som e opções da mesa)
  if (!localStorage.getItem(KEY)) {
    try {
      const som = JSON.parse(localStorage.getItem('darkstar.som') ?? '{}') as { music?: number; sfx?: number; mute?: boolean };
      const mesa = JSON.parse(localStorage.getItem('darkstar.mesa') ?? '{}') as { pace?: Pace; timeLimit?: boolean; showLog?: boolean };
      s = { music: som.music, sfx: som.sfx, mute: som.mute, pace: mesa.pace, timeLimit: mesa.timeLimit, showLog: mesa.showLog };
      for (const k of Object.keys(s) as (keyof Settings)[]) if (s[k] === undefined) delete s[k];
    } catch { /* sem dados antigos */ }
  }
  return { ...DEFAULTS, ...s, keys: { ...DEFAULT_KEYS, ...(s.keys ?? {}) } };
}

class SettingsState {
  v = $state<Settings>(load());
  /** Tamanho da tela (para a lista de resoluções). */
  screen = $state({ width: typeof screen === 'undefined' ? 1920 : screen.width, height: typeof screen === 'undefined' ? 1080 : screen.height });

  /** Quando a página pediu a última troca de modo (a janela avisa estados de passagem enquanto troca: esses são ignorados). */
  lastSet = 0;

  /** Resoluções que cabem na tela deste computador. */
  get resolutions(): string[] {
    const all = [[1280, 720], [1366, 768], [1600, 900], [1920, 1080], [2560, 1440], [3840, 2160]];
    return all.filter(([w, h]) => w <= this.screen.width && h <= this.screen.height).map(([w, h]) => `${w}x${h}`);
  }

  save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.v)); } catch { /* sem armazenamento local */ } }
  reset(): void { this.v = { ...DEFAULTS, keys: { ...DEFAULT_KEYS } }; }
  resetKeys(): void { this.v.keys = { ...DEFAULT_KEYS }; }

  /** Aplica vídeo (janela, escala, qualidade). `win` falso = não mexe no modo da janela (ao abrir, o programa já a deixou como estava). */
  applyVideo(win = true): void {
    const s = this.v, h = host();
    const [w, hh] = s.resolution.split('x').map(Number);
    if (h) { if (win) { this.lastSet = Date.now(); void h.setDisplay({ mode: s.display, width: w || 1600, height: hh || 900 }); } void h.setZoom(s.uiScale); }
    else if (win || s.uiScale !== 1) {
      // no navegador: tela cheia pelo próprio navegador e escala por CSS
      (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = String(s.uiScale);
      if (s.display === 'fullscreen' && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      if (s.display !== 'fullscreen' && document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    }
    document.body.classList.toggle('q-medium', s.quality === 'medium');
    document.body.classList.toggle('q-low', s.quality === 'low');
  }

  applyAudio(): void {
    const s = this.v;
    chip.setMaster(s.master);
    chip.setMusicVol(s.music);
    chip.setSfxVol(s.sfx);
    if (chip.muted !== s.mute) chip.setMute(s.mute);
  }

  /** Nome legível de uma tecla. */
  keyName(k: string): string {
    return ({ ' ': 'Espaço', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter' } as Record<string, string>)[k] ?? (k.length === 1 ? k.toUpperCase() : k);
  }
  /** A tecla apertada é a da ação? */
  is(e: KeyboardEvent, a: KeyAction): boolean {
    const k = this.v.keys[a];
    return e.key === k || (k.length === 1 && e.key.toLowerCase() === k.toLowerCase());
  }
}

export const settings = new SettingsState();
