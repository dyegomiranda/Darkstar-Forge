import { untrack } from 'svelte';
export type TutorialPreference = 'ask' | 'enabled' | 'skipped';
export interface TutorialProgress { preference: TutorialPreference; steps: Record<string, number>; finished: string[]; battleStarted: boolean }
const KEY = 'voidsun.tutorial.v1';
export function readTutorial(raw: string | null): TutorialProgress {
  try {
    const data = JSON.parse(raw ?? '{}');
    const preference = ['ask', 'enabled', 'skipped'].includes(data?.preference) ? data.preference : 'ask';
    const steps: Record<string, number> = {};
    if (data?.steps && typeof data.steps === 'object') for (const [key, value] of Object.entries(data.steps))
      if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 100) steps[key] = value;
    const finished: string[] = Array.isArray(data?.finished) ? data.finished.filter((x: unknown) => typeof x === 'string') : [];
    // Versões anteriores não registravam a tentativa: aproveita o progresso já visto.
    const battleStarted = data?.battleStarted === true || (steps.battle ?? 0) > 0 || finished.some(x => ['initiative', 'opening', 'battle'].includes(x));
    return { preference, steps, finished, battleStarted };
  } catch { return { preference: 'ask', steps: {}, finished: [], battleStarted: false }; }
}
function load() { try { return readTutorial(localStorage.getItem(KEY)); } catch { return readTutorial(null); } }
class TutorialState {
  progress = $state<TutorialProgress>(load());
  events = $state<Record<string, number>>({});
  get enabled() { return this.progress.preference === 'enabled'; }
  pending(area: string) { return this.enabled && !this.progress.finished.includes(area); }
  shouldTrain() { return this.pending('battle') && !this.progress.battleStarted; }
  beginBattle() {
    if (!this.shouldTrain()) return false;
    this.restartBattle();
    this.progress.battleStarted = true; this.save();
    return true;
  }
  index(area: string) { return this.progress.steps[area] ?? 0; }
  save() { untrack(() => { try { localStorage.setItem(KEY, JSON.stringify(this.progress)); } catch { /* funciona também sem armazenamento */ } }); }
  choose(enabled: boolean) { this.progress.preference = enabled ? 'enabled' : 'skipped'; this.save(); }
  advance(area: string, length: number) {
    untrack(() => {
      if (!this.pending(area)) return;
      const next = this.index(area) + 1;
      this.progress = { ...this.progress, steps: { ...this.progress.steps, [area]: next }, finished: next >= length ? [...this.progress.finished, area] : [...this.progress.finished] };
      this.save();
    });
  }
  finish(area: string) { untrack(() => { if (!this.progress.finished.includes(area)) this.progress = { ...this.progress, finished: [...this.progress.finished, area] }; this.save(); }); }
  emit(event: string) { this.events[event] = (this.events[event] ?? 0) + 1; }
  replay() { this.progress = { preference: 'enabled', steps: {}, finished: [], battleStarted: false }; this.events = {}; this.save(); }
  restartBattle() { for (const key of ['initiative', 'opening', 'battle', 'reaction', 'level']) { delete this.progress.steps[key]; this.progress.finished = this.progress.finished.filter((x) => x !== key); } this.events = {}; this.save(); }
}
export const tutorial = new TutorialState();
