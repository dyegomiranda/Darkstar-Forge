<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload, FlipHorizontal2, Trash2, Crosshair, Grid3x3 } from '@lucide/svelte';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { importImage, ensureMedia } from '../../store/media';
  import { listMedia } from '../../store/db';
  import type { EditorState } from './editorState.svelte';

  let { ed }: { ed: EditorState } = $props();

  let over = $state(false);
  let busy = $state(false);
  let library = $state<{ id: string; url: string; name: string }[]>([]);
  let input: HTMLInputElement;

  const art = $derived(ed.draft.art);

  async function loadLibrary() {
    const rows = (await listMedia()).filter((m) => m.type.startsWith('image/')).sort((a, b) => b.addedAt - a.addedAt);
    library = (await Promise.all(rows.map(async (m) => ({ id: m.id, name: m.name, url: (await ensureMedia(m.id)) ?? '' })))).filter((x) => x.url);
  }
  onMount(loadLibrary);

  async function take(files: FileList | null | undefined) {
    const f = files?.[0];
    if (!f || !f.type.startsWith('image/')) { if (f) ui.toast(L('Escolha um arquivo de imagem', 'Pick an image file'), 'error'); return; }
    busy = true;
    try {
      const id = await importImage(f, f.name);
      use(id);
      await loadLibrary();
    } catch (e) {
      ui.toast(L('Não foi possível abrir a imagem', 'Could not open the image'), 'error');
      console.error(e);
    } finally { busy = false; }
  }

  function use(id: string) {
    ed.draft.art = { mediaId: id, zoom: 1, x: 0, y: 0, mirror: false };
    ed.touch();
  }
  const set = (patch: Partial<typeof art>) => { Object.assign(ed.draft.art, patch); ed.touch(); };
  const pixel = $derived(!!ed.look.pixelateArt);
</script>

<div class="stack">
  <button class="drop" class:over class:busy onclick={() => input.click()}
    ondragover={(e) => { e.preventDefault(); over = true; }} ondragleave={() => (over = false)}
    ondrop={(e) => { e.preventDefault(); over = false; void take(e.dataTransfer?.files); }}>
    <Upload size={22} />
    <b>{busy ? L('Carregando…', 'Loading…') : L('Enviar arte', 'Upload art')}</b>
    <span>{L('Clique ou arraste uma imagem aqui (JPG, PNG, WebP)', 'Click or drop an image here (JPG, PNG, WebP)')}</span>
  </button>
  <input type="file" accept="image/*" hidden bind:this={input} onchange={(e) => take((e.currentTarget as HTMLInputElement).files)} />

  {#if art.mediaId}
    <section class="stack s">
      <span class="section-title">{L('Enquadramento', 'Framing')}</span>
      <label class="field"><span>{L('Zoom', 'Zoom')} · {Math.round(art.zoom * 100)}%</span>
        <input type="range" min="0.5" max="4" step="0.01" value={art.zoom} oninput={(e) => set({ zoom: +(e.currentTarget as HTMLInputElement).value })} />
      </label>
      <label class="field"><span>{L('Horizontal', 'Horizontal')} · {art.x}px</span>
        <input type="range" min="-900" max="900" step="1" value={art.x} oninput={(e) => set({ x: +(e.currentTarget as HTMLInputElement).value })} />
      </label>
      <label class="field"><span>{L('Vertical', 'Vertical')} · {art.y}px</span>
        <input type="range" min="-1200" max="1200" step="1" value={art.y} oninput={(e) => set({ y: +(e.currentTarget as HTMLInputElement).value })} />
      </label>
      <div class="row wrap">
        <button class="btn sm" onclick={() => set({ zoom: 1, x: 0, y: 0 })}><Crosshair size={15} /> {L('Centralizar', 'Center')}</button>
        <button class="btn sm" class:on={art.mirror} onclick={() => set({ mirror: !art.mirror })}><FlipHorizontal2 size={15} /> {L('Espelhar', 'Mirror')}</button>
        <button class="btn sm" class:on={pixel} onclick={() => ed.setLook({ pixelateArt: pixel ? undefined : 7 })}><Grid3x3 size={15} /> {L('Pixelar', 'Pixelate')}</button>
        <button class="btn sm danger" onclick={() => { ed.draft.art = { zoom: 1, x: 0, y: 0, mirror: false }; ed.touch(); }}><Trash2 size={15} /> {L('Remover', 'Remove')}</button>
      </div>
    </section>
  {/if}

  {#if library.length}
    <section class="stack">
      <span class="section-title">{L('Artes já enviadas', 'Uploaded art')}</span>
      <div class="lib">
        {#each library as m (m.id)}
          <button class="thumb" class:on={m.id === art.mediaId} title={m.name} onclick={() => use(m.id)}>
            <img src={m.url} alt={m.name} loading="lazy" />
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .drop { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 26px 16px; border: 1.5px dashed var(--line-2); border-radius: 14px;
    background: var(--surface); color: var(--text-2); cursor: pointer; font: inherit; transition: all var(--t); }
  .drop:hover, .drop.over { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
  .drop.busy { opacity: .6; pointer-events: none; }
  .drop span { font-size: 12.5px; color: var(--muted); }
  .s { gap: 12px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .wrap { flex-wrap: wrap; }
  .btn.on { border-color: var(--accent); color: var(--accent-2); background: var(--accent-soft); }
  .lib { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 8px; }
  .thumb { padding: 0; border: 2px solid transparent; border-radius: 9px; overflow: hidden; background: var(--surface); cursor: pointer; aspect-ratio: 5 / 7; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumb:hover { border-color: var(--line-2); }
  .thumb.on { border-color: var(--accent); }
</style>
