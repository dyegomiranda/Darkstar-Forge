<script lang="ts">
  import lpcCredits from '../../data/lpc-credits.json';
  import creatureCredits from '../../data/creatures-credits.json';
  const lpcAuthors = [...new Set(Object.values(lpcCredits as Record<string, { authors: string[] }>).flatMap((c) => c.authors))].sort((a, b) => a.localeCompare(b));
  import { onMount } from 'svelte';
  import { Download, Upload, FileSpreadsheet, HardDrive, RotateCcw, Award, BookOpen, Layers, Image as ImageIcon, Trash, Paintbrush } from '@lucide/svelte';
  import { router } from '../../app/router.svelte';
  import { app } from '../../store/project.svelte';
  import { importImage, ensureMedia, mediaUrl } from '../../store/media';
  import { pruneRenders, storageEstimate, db } from '../../store/db';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { COLORS, colorHex } from '../../model/catalog';
  import { STYLES } from '../../render/elements';
  import { classIcon } from '../../render/icons/glyphs';
  import { AUTHORS, ICONS } from '../../render/icons/game-icons';
  import { lighten } from '../../render/color';
  import { vivid } from '../../render/palette';
  import { renderKey } from '../../render/card';
  import { exportBackup, exportCsv, importBackup } from '../../export/exporters.svelte';
  import { ctxFor } from '../common/cardCtx';
  import Glyph from '../common/Glyph.svelte';
  import EditionPicker from '../common/EditionPicker.svelte';

  let usage = $state({ used: 0, quota: 0 });
  let renders = $state(0);
  let backupInput: HTMLInputElement;
  let logoInput: HTMLInputElement;
  let logoTick = $state(0);

  const ed = $derived(app.edition());
  /** Deck que serve de amostra ao editar a coleção: o primeiro deck de classe com cartas. */
  const themeDeck = $derived([...app.decksOf().filter((d) => d.kind === 'class'), ...app.decksOf()].find((d) => app.cardsOf(d.id).length));
  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

  async function refresh() {
    usage = await storageEstimate();
    renders = (await (await db()).count('renders'));
  }
  onMount(() => { void refresh(); });
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

  async function cleanCache() {
    const keep = new Set(Object.values(app.cards).map((c) => { const ctx = ctxFor(c); return ctx ? renderKey(c, ctx) : ''; }));
    const n = await pruneRenders(keep);
    await refresh();
    ui.toast(L(`${n} imagens antigas removidas do cache`, `${n} stale images removed from cache`));
  }

  async function reset() {
    const r = await ui.confirm({
      title: L('Recomeçar do zero?', 'Start over?'),
      text: L('Apaga TODAS as cartas, decks, personagens e artes deste projeto e recria as coleções de exemplo.\nFaça um backup antes se quiser guardar algo.', 'Deletes ALL cards, decks, characters and art in this project and recreates the sample collections.\nMake a backup first if you want to keep anything.'),
      ok: L('Apagar e recomeçar', 'Erase and start over'), danger: true,
    });
    if (r !== 'ok') return;
    await app.resetToSeed();
    await refresh();
    ui.toast(L('Projeto recriado', 'Project recreated'));
  }

  const iconAuthors = $derived([...new Set(Object.values(ICONS).map((i) => i.author))].map((a) => AUTHORS[a] ?? a));
</script>

<div class="settings">
  <div class="inner">
    <h1>{L('Ajustes', 'Settings')}</h1>

    <section class="panel sec">
      <header><BookOpen size={18} /><h2>{L('Projeto e edição', 'Project & edition')}</h2><span class="grow"></span><EditionPicker /></header>
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

    <section class="panel sec">
      <header><HardDrive size={18} /><h2>{L('Backup e arquivos', 'Backup & files')}</h2></header>
      <p class="muted">{L('Tudo fica salvo neste computador. O backup é um único arquivo .zip com cartas, decks, personagens e artes — guarde-o no MEGA, pendrive ou onde preferir.', 'Everything is saved on this computer. The backup is a single .zip file with cards, decks, characters and art — keep it anywhere you like.')}</p>
      <div class="row wrap">
        <button class="btn primary" onclick={exportBackup}><Download size={16} /> {L('Fazer backup (.zip)', 'Make backup (.zip)')}</button>
        <button class="btn" onclick={() => backupInput.click()}><Upload size={16} /> {L('Restaurar backup', 'Restore backup')}</button>
        <button class="btn" onclick={() => exportCsv(app.decks.flatMap((d) => app.cardsOf(d.id)))}><FileSpreadsheet size={16} /> {L('Planilha de cartas (.csv)', 'Card spreadsheet (.csv)')}</button>
        <input type="file" accept=".zip,application/zip" hidden bind:this={backupInput} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) void importBackup(f).then(refresh); }} />
      </div>
      <div class="usage">
        <div class="row"><span class="grow">{L('Espaço usado', 'Storage used')}: <b>{mb(usage.used)}</b>{usage.quota ? ` ${L('de', 'of')} ${mb(usage.quota)}` : ''}</span>
          <span class="muted small">{renders} {L('imagens de cartas em cache', 'cached card images')}</span>
          <button class="btn sm ghost" onclick={cleanCache}><Trash size={14} /> {L('Limpar cache antigo', 'Clean stale cache')}</button></div>
        <div class="bar"><div style="width:{usage.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0}%"></div></div>
      </div>
    </section>

    <section class="panel sec danger-zone">
      <header><RotateCcw size={18} /><h2>{L('Recomeçar', 'Start over')}</h2></header>
      <div class="row wrap">
        <p class="muted grow">{L('Apaga o projeto atual e recria as cartas de exemplo.', 'Erases the current project and recreates the sample cards.')}</p>
        <button class="btn danger" onclick={reset}>{L('Apagar tudo e recomeçar', 'Erase everything and start over')}</button>
      </div>
    </section>

    <section class="panel sec">
      <header><Award size={18} /><h2>{L('Créditos', 'Credits')}</h2></header>
      <p><b>Darkstar Forge</b> — {L('software livre sob a licença GPL-3.0. A propriedade intelectual de Darkstar (nome, marca, artes, textos) não está coberta pela GPL.', 'free software under the GPL-3.0 license. Darkstar intellectual property (name, logo, art, texts) is not covered by the GPL.')}</p>
      <p>{L('Símbolos', 'Symbols')}: <a href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a>, {L('licença', 'license')} <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a> — {L('autores', 'by')} {iconAuthors.join(', ')}.</p>
      <p>{L('Fontes (SIL Open Font License)', 'Fonts (SIL Open Font License)')}: EB Garamond, Cinzel, Cormorant Garamond, Marcellus, Noto Sans, Pixelify Sans, Silkscreen, Grenze Gotisch, Barlow Condensed, Uncial Antiqua, Inter.</p>
      <p>{L('Bonecos dos heróis (peças em pixel art)', 'Hero dolls (pixel art parts)')}: <a href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator" target="_blank" rel="noreferrer">Universal LPC Spritesheet Character Generator</a> / Liberated Pixel Cup, {L('licenças', 'licenses')} CC-BY-SA 3.0, GPL 3.0 {L('e', 'and')} OGA-BY 3.0 — {L('artistas', 'artists')}: {lpcAuthors.join(', ')}. {L('A lista por peça, com as fontes, está no arquivo', 'The per-part list, with sources, is in the file')} <code>src/data/lpc-credits.json</code>.</p>
      <p>{L('Criaturas do campo (OpenGameArt)', 'Field creatures (OpenGameArt)')}: {#each creatureCredits as c, i}{i ? '; ' : ''}{c.what} — <a href={c.url} target="_blank" rel="noreferrer">{c.title}</a>, {c.authors} ({c.license}){/each}.</p>
      <p>{L('Símbolos 3D', '3D symbols')}: <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer">Fluent Emoji</a> (Microsoft), {L('licença', 'license')} MIT.</p>
      <p>{L('Cenários do campo de batalha e artes das cartas do Protótipo: gerados no próprio computador com Flux.1 dev e o LoRA “Modern Pixel Art” (UmeAiRT).', 'Battlefield sceneries and Prototype card art: generated locally with Flux.1 dev and the “Modern Pixel Art” LoRA (UmeAiRT).')}</p>
      <p>{L('Música e sons: sintetizados pelo próprio programa.', 'Music and sounds: synthesized by the program itself.')}</p>
      <p class="muted small">{L('Regras inspiradas no Pathfinder 2e (Paizo) e D&D 5e, adaptadas; nenhum texto oficial é reproduzido.', 'Rules inspired by Pathfinder 2e (Paizo) and D&D 5e, adapted; no official text is reproduced.')}</p>
    </section>
  </div>
</div>

<style>
  .settings { height: 100%; overflow-y: auto; }
  .inner { max-width: 960px; margin: 0 auto; padding: 28px 28px 80px; display: flex; flex-direction: column; gap: 18px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
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
  .usage { background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
  .bar { height: 6px; border-radius: 6px; background: var(--surface-3); margin-top: 8px; overflow: hidden; }
  .bar div { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); }
  .danger-zone { border-color: rgb(226 87 76 / .3); }
  .danger-zone header { color: var(--danger); }
  @media (max-width: 760px) { .inner { padding: 18px 14px 80px; } .cols { grid-template-columns: 1fr; } .ord { display: none; } }
</style>
