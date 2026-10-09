<script lang="ts">
  import { onMount } from 'svelte';
  import { ui } from '../../app/ui.svelte';
  import { tutorial } from '../../app/tutorial.svelte';
  import { L } from '../../app/i18n.svelte';
  import type { Lesson } from '../../app/tutorialLessons';
  let { area, lessons, active = true }: { area: string; lessons: Lesson[]; active?: boolean } = $props();
  const index = $derived(tutorial.index(area));
  const lesson = $derived(lessons[index]);
  const visible = $derived(active && !ui.ask && tutorial.pending(area) && !!lesson);
  let documentZoom = $state(1);
  let anchor = $state<DOMRect | null>(null), box = $state<HTMLDivElement>();
  let x = $state(16), y = $state(16), side = $state<'top' | 'bottom' | 'left' | 'right'>('top'), arrow = $state(36);
  // Ações feitas antes do balão também contam: o jogador não precisa repetir uma carta já usada.
  $effect(() => {
    if (active && tutorial.pending(area) && index >= lessons.length) { queueMicrotask(() => tutorial.finish(area)); return; }
    if (tutorial.pending(area) && lesson?.event && (tutorial.events[lesson.event] ?? 0) > 0) {
      const expected = index, section = area;
      queueMicrotask(() => { if (tutorial.index(section) === expected) tutorial.advance(section, lessons.length); });
    }
  });
  onMount(() => {
    let lastTarget: HTMLElement | null = null;
    const position = () => {
      if (!visible || !lesson) { anchor = null; lastTarget = null; return; }
      const target = document.querySelector<HTMLElement>(lesson.target);
      if (!target || !target.getClientRects().length) { anchor = null; return; }
      if (target !== lastTarget) { target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); lastTarget = target; }
      documentZoom = Number(getComputedStyle(document.documentElement).zoom) || 1;
      const r = target.getBoundingClientRect();
      if (!r.width || !r.height) { anchor = null; return; }
      anchor = r;
      const width = Math.min(344, innerWidth - 24), height = box?.offsetHeight ?? 180;
      if (r.left >= width + 26 || innerWidth - r.right >= width + 26) {
        side = r.left >= width + 26 ? 'left' : 'right';
        x = side === 'left' ? r.left - width - 14 : r.right + 14;
        y = Math.max(12, Math.min(innerHeight - height - 12, r.top + r.height / 2 - height / 2));
        arrow = Math.max(20, Math.min(height - 20, r.top + r.height / 2 - y));
      } else {
        x = Math.max(12, Math.min(innerWidth - width - 12, r.left + r.width / 2 - width / 2));
        side = r.top >= height + 26 ? 'top' : 'bottom';
        y = side === 'top' ? r.top - height - 14 : Math.min(innerHeight - height - 12, r.bottom + 14);
        y = Math.max(12, y);
        arrow = Math.max(20, Math.min(width - 20, r.left + r.width / 2 - x));
      }
    };
    const timer = setInterval(position, 120);
    position();
    return () => clearInterval(timer);
  });
  function next() { tutorial.advance(area, lessons.length); }
</script>
{#if visible && anchor}
  <div class="coach-ring" style="zoom:{1 / documentZoom};left:{anchor.left - 4}px;top:{anchor.top - 4}px;width:{anchor.width + 8}px;height:{anchor.height + 8}px" aria-hidden="true"></div>
  <div class="coach {side}" bind:this={box} role="region" aria-label={L('Tutorial guiado', 'Guided tutorial')} aria-live="polite" style="zoom:{1 / documentZoom};left:{x}px;top:{y}px;--arrow:{arrow}px">
    <small>{L('Tutorial', 'Tutorial')} · {index + 1}/{lessons.length}</small>
    <strong>{L(lesson.title[0], lesson.title[1])}</strong>
    <p>{L(lesson.text[0], lesson.text[1])}</p>
    {#if lesson.event}<span class="task">{L('Experimente a ação destacada para continuar.', 'Try the highlighted action to continue.')}</span>{/if}
    <footer>
      <button onclick={() => tutorial.finish(area)}>{L('Pular esta seção', 'Skip this section')}</button>
      <button class="next" onclick={next}>{lesson.event ? L('Já sei', 'I know this') : index === lessons.length - 1 ? L('Entendi', 'Got it') : L('Próximo', 'Next')}</button>
    </footer>
  </div>
{/if}
<style>
  .coach-ring { position: fixed; z-index: 89; border: 2px solid #f2c979; border-radius: 8px; box-shadow: 0 0 0 3px rgb(0 0 0 / .4); pointer-events: none; }
  .coach { position: fixed; z-index: 90; width: min(344px, calc(100vw - 24px)); padding: 14px 16px; color: #fff0d5; background: #171222; border: 1px solid #f2c979; border-radius: 10px; box-shadow: 0 8px 28px rgb(0 0 0 / .6); font: 14px/1.45 var(--ui); }
  .coach::before { content: ''; position: absolute; top: -7px; left: calc(var(--arrow) - 6px); width: 12px; height: 12px; background: #171222; border-left: 1px solid #f2c979; border-top: 1px solid #f2c979; transform: rotate(45deg); }
  .coach.top::before { top: auto; bottom: -7px; transform: rotate(225deg); }
  .coach.left::before { top: calc(var(--arrow) - 6px); left: auto; right: -7px; transform: rotate(135deg); }
  .coach.right::before { top: calc(var(--arrow) - 6px); left: -7px; transform: rotate(-45deg); }
  .coach { pointer-events: none; } .coach button { pointer-events: auto; }
  small { display: block; color: #c5b6d9; font-size: 11px; margin-bottom: 5px; }
  strong { font-size: 16px; } p { margin: 7px 0 10px; } .task { display: block; color: #f2c979; font-size: 12px; }
  footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; }
  button { border: 0; background: transparent; color: #c5b6d9; font: inherit; font-size: 12px; cursor: pointer; padding: 6px 4px; }
  button.next { background: #f2c979; color: #231a0d; border-radius: 5px; padding: 6px 12px; font-weight: 700; }
  button:focus-visible { outline: 2px solid white; outline-offset: 2px; }
</style>
