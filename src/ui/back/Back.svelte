<script lang="ts">
  import Coach from '../common/Coach.svelte';
  import { LESSONS } from '../../app/tutorialLessons';
  import { untrack } from 'svelte';
  import { Upload, Trash2, ImageDown, Plus, X, RotateCcw, Printer } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { importImage } from '../../store/media';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { STYLES } from '../../render/elements';
  import { ICON_STYLES } from '../../render/icons/render';
  import { ICONS } from '../../render/icons/game-icons';
  import { ICON_NAMES } from '../../render/icons/glyphs';
  import { composeBack, defaultBack } from '../../render/back';
  import { rasterize } from '../../render/raster';
  import type { BlendMode } from '../../render/palette';
  import type { CardBack } from '../../model/types';
  import Glyph from '../common/Glyph.svelte';
  import EditionPicker from '../common/EditionPicker.svelte';
  import { backInput, backOf, ensureBackMedia } from './backCtx';
  import { download, exportBacksPdf } from '../../export/exporters.svelte';

  let ready = $state(0);
  let artInput: HTMLInputElement;

  const ed = $derived(app.edition());
  const b = $derived(backOf(ed));

  // ao trocar de coleção, carrega o logo e a arte do verso dela
  $effect(() => {
    const e = ed;
    void e?.id; void e?.setMediaId; void e?.back?.art?.mediaId;
    untrack(() => ensureBackMedia(e)).then(() => ready++);
  });

  // desenha no máximo uma vez por quadro (seletor de cor fluido)
  let svg = $state('');
  let frame = 0;
  $effect(() => {
    void ready;
    const inp = backInput(ed, 'backlive');
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { svg = composeBack(inp); });
    return () => cancelAnimationFrame(frame);
  });

  function set(patch: Partial<CardBack>) {
    app.updateProject((p) => {
      const e = p.editions.find((x) => x.id === ed?.id) ?? p.editions[0];
      e.back = { ...(e.back ?? defaultBack()), ...patch };
    });
  }

  async function setArt(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const id = await importImage(f, f.name);
    set({ art: { mediaId: id, zoom: 1, x: 0, y: 0, opacity: 0.85 } });
    ready++;
  }

  async function exportPng() {
    await ensureBackMedia(ed);
    download(await rasterize(composeBack(backInput(ed, 'backpng')), 1500), 'verso.png');
    ui.toast(L('Verso exportado', 'Back exported'));
  }

  const PATTERNS: [CardBack['pattern'], string, string][] = [['nenhum', 'Nenhum', 'None'], ['raios', 'Raios', 'Rays'], ['losangos', 'Losangos', 'Diamonds'], ['estrelas', 'Estrelas', 'Stars'], ['circulos', 'Círculos', 'Circles']];
  const BLENDS: [BlendMode, string, string][] = [['degrade', 'Degradê', 'Gradient'], ['faixas', 'Faixas', 'Bands'], ['divisao', 'Divisão reta', 'Hard split'], ['vertical', 'Vertical', 'Vertical'], ['diagonal', 'Diagonal', 'Diagonal']];
  const ICON_IDS = Object.keys(ICONS);
</script>

<div class="page">
  <aside data-tutorial="card-back-controls" class="side">
    <header>
      <h1>{L('Verso das cartas', 'Card back')}</h1>
      <EditionPicker />
      <p class="muted">{L(`Igual para todas as cartas de “${ed?.name}”. Salvo automaticamente.`, `Shared by every card in “${ed?.name}”. Saved automatically.`)}</p>
    </header>

    <section class="stack s">
      <span class="section-title">{L('Estilo', 'Style')}</span>
      <div class="chips">{#each STYLES as s}<button class="chip" class:on={b.style === s.id} onclick={() => set({ style: s.id })}>{s.name}</button>{/each}</div>
      <label class="toggle"><input type="checkbox" checked={b.frame} onchange={(e) => set({ frame: (e.currentTarget as HTMLInputElement).checked })} /> {L('Moldura em volta', 'Border around')}</label>
    </section>

    <section class="stack s">
      <span class="section-title">{L('Cores', 'Colors')}</span>
      <div class="row wrap">
        {#each b.colors as c, i}
          <span class="tint"><input type="color" value={c} oninput={(e) => { const cs = [...b.colors]; cs[i] = (e.currentTarget as HTMLInputElement).value; set({ colors: cs }); }} />
            {#if b.colors.length > 1}<button class="x" onclick={() => set({ colors: b.colors.filter((_, j) => j !== i) })}><X size={12} /></button>{/if}</span>
        {/each}
        {#if b.colors.length < 3}<button class="btn sm ghost" onclick={() => set({ colors: [...b.colors, b.colors[b.colors.length - 1]] })}><Plus size={14} /> {L('Cor', 'Color')}</button>{/if}
      </div>
      {#if b.colors.length > 1}
        <select class="select" value={b.blend} onchange={(e) => set({ blend: (e.currentTarget as HTMLSelectElement).value as BlendMode })}>
          {#each BLENDS as [id, pt, en]}<option value={id}>{L(pt, en)}</option>{/each}
        </select>
      {/if}
      <label class="field"><span>{L('Padrão decorativo', 'Pattern')}</span>
        <select class="select" value={b.pattern} onchange={(e) => set({ pattern: (e.currentTarget as HTMLSelectElement).value as CardBack['pattern'] })}>
          {#each PATTERNS as [id, pt, en]}<option value={id}>{L(pt, en)}</option>{/each}
        </select>
      </label>
    </section>

    <section class="stack s">
      <span class="section-title">{L('Arte de fundo', 'Background art')}</span>
      <div class="row wrap">
        <button class="btn sm" onclick={() => artInput.click()}><Upload size={14} /> {b.art ? L('Trocar arte', 'Change art') : L('Enviar arte', 'Upload art')}</button>
        {#if b.art}<button class="btn sm danger" onclick={() => set({ art: undefined })}><Trash2 size={14} /> {L('Remover', 'Remove')}</button>{/if}
      </div>
      <input type="file" accept="image/*" hidden bind:this={artInput} onchange={(e) => setArt((e.currentTarget as HTMLInputElement).files)} />
      {#if b.art}
        {@const art = b.art}
        <label class="field"><span>{L('Visibilidade', 'Visibility')} · {Math.round(art.opacity * 100)}%</span>
          <input type="range" min="0.05" max="1" step="0.01" value={art.opacity} oninput={(e) => set({ art: { ...art, opacity: +(e.currentTarget as HTMLInputElement).value } })} /></label>
        <label class="field"><span>{L('Zoom', 'Zoom')} · {Math.round(art.zoom * 100)}%</span>
          <input type="range" min="0.5" max="3" step="0.01" value={art.zoom} oninput={(e) => set({ art: { ...art, zoom: +(e.currentTarget as HTMLInputElement).value } })} /></label>
      {/if}
    </section>

    <section class="stack s">
      <span class="section-title">{L('Emblema central', 'Center emblem')}</span>
      <div class="seg full">
        <button class:on={b.emblem === 'logo'} onclick={() => set({ emblem: 'logo' })}>{L('Logo da edição', 'Set logo')}</button>
        <button class:on={b.emblem === 'simbolo'} onclick={() => set({ emblem: 'simbolo' })}>{L('Símbolo', 'Symbol')}</button>
        <button class:on={b.emblem === 'nenhum'} onclick={() => set({ emblem: 'nenhum' })}>{L('Nenhum', 'None')}</button>
      </div>
      {#if b.emblem === 'simbolo'}
        <div class="seg full">{#each ICON_STYLES as s}<button class:on={b.iconStyle === s.id} onclick={() => set({ iconStyle: s.id })}>{L(s.name, s.en)}</button>{/each}</div>
        <div class="icons">
          {#each ICON_IDS as g}<button class="gl" class:on={b.icon === g} title={ICON_NAMES[g] ?? g} onclick={() => set({ icon: g })}><Glyph id={g} size={22} color="#e7dcc6" /></button>{/each}
        </div>
      {/if}
      <label class="field"><span>{L('Tamanho', 'Size')} · {Math.round(b.emblemSize * 100)}%</span>
        <input type="range" min="0.2" max="0.7" step="0.01" value={b.emblemSize} oninput={(e) => set({ emblemSize: +(e.currentTarget as HTMLInputElement).value })} /></label>
      <label class="toggle"><input type="checkbox" checked={b.medallion} onchange={(e) => set({ medallion: (e.currentTarget as HTMLInputElement).checked })} /> {L('Medalhão atrás do emblema', 'Medallion behind the emblem')}</label>
    </section>

    <section class="stack s">
      <label class="toggle"><input type="checkbox" checked={b.showTitle} onchange={(e) => set({ showTitle: (e.currentTarget as HTMLInputElement).checked })} /> {L('Título', 'Title')}</label>
      {#if b.showTitle}<input class="input" value={b.title} oninput={(e) => set({ title: (e.currentTarget as HTMLInputElement).value })} />{/if}
    </section>

    <div class="row wrap">
      <button class="btn" onclick={exportPng}><ImageDown size={15} /> {L('Exportar PNG', 'Export PNG')}</button>
      <button class="btn" onclick={() => exportBacksPdf()}><Printer size={15} /> {L('PDF só de versos', 'Backs-only PDF')}</button>
      <button class="btn ghost" onclick={() => set(defaultBack())}><RotateCcw size={15} /> {L('Verso padrão', 'Default back')}</button>
    </div>
    <p class="muted small">{L('Para imprimir frente e verso das cartas, use “PDF para imprimir” na Biblioteca e escolha incluir os versos.', 'To print fronts and backs, use “Print PDF” in the Library and choose to include backs.')}</p>
  </aside>

  <section class="stage">
    <div class="card">{@html svg}</div>
  </section>
</div>

<Coach area="back" lessons={LESSONS.back} />

<style>
  .page { display: grid; grid-template-columns: minmax(360px, 440px) 1fr; height: 100%; }
  .side { border-right: 1px solid var(--line); overflow-y: auto; padding: 22px 22px 60px; display: flex; flex-direction: column; gap: 18px; }
  h1 { font-size: 22px; }
  header p { margin: 4px 0 0; font-size: 13px; }
  .s { gap: 10px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
  .small { font-size: 12.5px; margin: 0; }
  .wrap { flex-wrap: wrap; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .full { display: flex; width: 100%; }
  .full button { flex: 1; justify-content: center; }
  .toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .tint { position: relative; }
  .tint .x { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; border: 0; background: var(--surface-3); color: var(--text-2); display: grid; place-items: center; cursor: pointer; padding: 0; }
  .icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); gap: 5px; max-height: 190px; overflow-y: auto; padding: 4px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg-2); }
  .gl { aspect-ratio: 1; border-radius: 8px; border: 1px solid transparent; background: none; display: grid; place-items: center; cursor: pointer; }
  .gl:hover { background: var(--surface-2); }
  .gl.on { border-color: var(--accent); background: var(--accent-soft); }
  .stage { display: grid; place-items: center; padding: 28px; background: radial-gradient(ellipse at 50% 40%, #1d1917 0%, #0c0b0a 70%); min-height: 0; overflow: auto; }
  .card { width: min(440px, 100%, calc((100vh - 80px) / 1.4)); aspect-ratio: 750 / 1050; border-radius: 4.8% / 3.43%; overflow: hidden; box-shadow: 0 30px 70px rgb(0 0 0 / .7); }
  .card :global(svg) { width: 100%; height: 100%; display: block; }
  @media (max-width: 900px) { .page { grid-template-columns: 1fr; overflow-y: auto; } .stage { order: -1; } .side { overflow: visible; border-right: 0; } }
</style>
