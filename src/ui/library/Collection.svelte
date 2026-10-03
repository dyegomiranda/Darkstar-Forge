<script lang="ts">
  import { BookOpen, Layers, Image as ImageIcon, Paintbrush } from '@lucide/svelte';
  import { router } from '../../app/router.svelte';
  import { app } from '../../store/project.svelte';
  import { importImage, ensureMedia, mediaUrl } from '../../store/media';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { COLORS, colorHex } from '../../model/catalog';
  import { STYLES } from '../../render/elements';
  import { classIcon } from '../../render/icons/glyphs';
  import { lighten } from '../../render/color';
  import { vivid } from '../../render/palette';
  import Glyph from '../common/Glyph.svelte';
  import EditionPicker from '../common/EditionPicker.svelte';

  let logoInput: HTMLInputElement;
  let logoTick = $state(0);

  const ed = $derived(app.edition());
  /** Deck que serve de amostra ao editar a coleção: o primeiro deck de classe com cartas. */
  const themeDeck = $derived([...app.decksOf().filter((d) => d.kind === 'class'), ...app.decksOf()].find((d) => app.cardsOf(d.id).length));
  // logo da coleção escolhida (muda ao trocar de coleção)
  $effect(() => { const id = ed?.setMediaId; if (id) void ensureMedia(id).then(() => logoTick++); });

  async function setLogo(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const id = await importImage(f, f.name);
    app.updateProject((p) => { (p.editions.find((e) => e.id === app.editionId) ?? p.editions[0]).setMediaId = id; });
    logoTick++;
    ui.toast(L('Logo da edição atualizado', 'Set logo updated'));
  }
  const logo = $derived.by(() => { void logoTick; return ed?.setMediaId ? mediaUrl(ed.setMediaId) : '/brand/logo.png'; });

</script>

<div class="settings">
  <div class="inner">
    <section class="panel sec">
      <header><BookOpen size={18} /><h2>{L('Coleção', 'Collection')}</h2><span class="grow"></span><EditionPicker /></header>
      <div class="cols">
        <div class="stack">
          <label class="field"><span>{L('Nome do jogo / projeto', 'Game / project name')}</span>
            <input class="input" value={app.project?.name} oninput={(e) => app.updateProject((p) => { p.name = (e.currentTarget as HTMLInputElement).value; })} /></label>
          <div class="grid2">
            <label class="field"><span>{L('Nome da edição', 'Edition name')}</span>
              <input class="input" value={ed?.name} oninput={(e) => app.updateProject((p) => { (p.editions.find((x) => x.id === app.editionId) ?? p.editions[0]).name = (e.currentTarget as HTMLInputElement).value; })} /></label>
            <label class="field"><span>{L('Sigla no rodapé', 'Footer code')}</span>
              <input class="input" value={ed?.code} oninput={(e) => app.updateProject((p) => { (p.editions.find((x) => x.id === app.editionId) ?? p.editions[0]).code = (e.currentTarget as HTMLInputElement).value; })} /></label>
          </div>
        </div>
        <div class="logo">
          <span class="label">{L('Selo da edição', 'Set symbol')}</span>
          <button class="logo-btn" onclick={() => logoInput.click()}><img src={logo} alt="" /></button>
          <button class="btn sm" onclick={() => logoInput.click()}><ImageIcon size={14} /> {L('Trocar imagem', 'Change image')}</button>
          <input type="file" accept="image/*" hidden bind:this={logoInput} onchange={(e) => setLogo((e.currentTarget as HTMLInputElement).files)} />
        </div>
      </div>
    </section>

    <section class="panel sec">
      <header><Layers size={18} /><h2>{L('Decks e temas', 'Decks & themes')}</h2></header>
      <p class="muted">{L('Os decks da coleção aberta. O visual (estilo, cores, peças, símbolos) se edita na tela de tema: “Editar tema” abre a do deck e “Editar coleção” muda todos de uma vez.', 'The decks of the open collection. The look (style, colors, pieces, symbols) is edited on the theme screen: “Edit theme” opens the deck’s and “Edit collection” changes all at once.')}</p>
      <div class="decks">
        {#each app.decksOf() as d, i (d.id)}
          {@const n = app.cardsOf(d.id).length}
          <div class="deck">
            <span class="emb" style="--c:{colorHex(d.colors[0])}"><Glyph id={classIcon(d.colors[0])} size={20} color={lighten(vivid(colorHex(d.colors[0])), 0.35)} /></span>
            <div class="grow stack tight">
              <input class="input" value={d.name[app.lang]} oninput={(e) => app.updateProject((p) => { p.decks.find((x) => x.id === d.id)!.name[app.lang] = (e.currentTarget as HTMLInputElement).value; })} />
              <span class="muted small">{COLORS[d.colors[0]].classes[app.lang]} · {n} {L('cartas', 'cards')} · {L('estilo', 'style')} {STYLES.find((x) => x.id === d.look.style)?.name ?? 'Neutro'}</span>
            </div>
            <button class="btn sm" disabled={!n} title={n ? '' : L('O deck precisa de pelo menos uma carta para servir de amostra', 'The deck needs at least one card to serve as a sample')} onclick={() => router.theme('deck', d.id)}><Paintbrush size={14} /> {L('Editar tema', 'Edit theme')}</button>
            <span class="ord">{i + 1}</span>
          </div>
        {/each}
      </div>
      {#if themeDeck}
        <div class="row wrap">
          <button class="btn" onclick={() => router.theme('collection', themeDeck.id)}><Paintbrush size={15} /> {L('Editar coleção (todos os decks de uma vez)', 'Edit collection (all decks at once)')}</button>
        </div>
      {/if}
    </section>

  </div>
</div>

<style>
  .settings { height: 100%; overflow-y: auto; }
  .inner { max-width: 960px; margin: 0 auto; padding: 28px 28px 80px; display: flex; flex-direction: column; gap: 18px; }
  .sec { padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; }
  .sec header { display: flex; align-items: center; gap: 10px; color: var(--accent); }
  .sec h2 { font-size: 16px; color: var(--text); }
  .sec p { margin: 0; line-height: 1.6; }
  .small { font-size: 12.5px; }
  .wrap { flex-wrap: wrap; }
  .cols { display: grid; grid-template-columns: 1fr 180px; gap: 24px; align-items: start; }
  .logo { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .logo-btn { width: 110px; height: 110px; border-radius: 50%; border: 1px solid var(--line-2); background: var(--bg-2); padding: 12px; cursor: pointer; }
  .logo-btn img { width: 100%; height: 100%; object-fit: contain; }
  .decks { display: flex; flex-direction: column; gap: 8px; }
  .deck { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--bg-2); }
  .tight { gap: 3px; }
  .emb { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: none;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 55%, #000), color-mix(in srgb, var(--c) 25%, #000)); }
  .ord { width: 24px; text-align: center; color: var(--muted); font-size: 12px; }
  @media (max-width: 760px) { .inner { padding: 18px 14px 80px; } .cols { grid-template-columns: 1fr; } .ord { display: none; } }
</style>
