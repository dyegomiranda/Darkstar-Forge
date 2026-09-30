<script lang="ts">
  import { ChevronDown, RotateCcw, Eye, EyeOff, Info, Undo2, Plus, X, ImagePlus, Trash2 } from '@lucide/svelte';
  import { ensureAll, importImage, mediaUrl } from '../../store/media';
  import { ui } from '../../app/ui.svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { colorHex } from '../../model/catalog';
  import { STYLES, piece, type PieceKind, type StyleId } from '../../render/elements';
  import { CARD_FONTS } from '../../render/fonts';
  import { cardColors, compose, frameOn, type Look } from '../../render/compose';
  import { cardInput, mergeLook } from '../../render/card';
  import { Defs } from '../../render/defs';
  import { skeleton } from '../../render/layout';
  import { ICON_STYLES, type IconStyle } from '../../render/icons/render';
  import { ATK_CHOICES, DEF_CHOICES, ICON_NAMES, RESOURCE_COLORS, classChoices, resourceChoices } from '../../render/icons/glyphs';
  import { makePalette, type BlendMode, type MetalKind } from '../../render/palette';
    import Glyph from '../common/Glyph.svelte';
  import { pieceThumb } from './thumbs';
  import PieceImagePanel from './PieceImagePanel.svelte';
  import type { EditorState } from './editor.svelte';

  let { ed }: { ed: EditorState } = $props();

  let open = $state<PieceKind | null>(null);
  const look = $derived(ed.look);
  /** Cores que a carta usa de fato (depois do modo de cor). */
  const colors = $derived(cardColors(ed.draft.colors.map(colorHex), look));
  const deckCount = $derived(app.cardsOf(ed.draft.deckId).length);
  const edition = $derived(app.edition(ed.deck.editionId));
  const collectionCount = $derived(app.decksOf(ed.deck.editionId).reduce((n, d) => n + app.cardsOf(d.id).length, 0));
  const SIZE_SLOTS: { slot: 'cost' | 'class' | 'atk' | 'def' | 'set'; pt: string; en: string }[] = [
    { slot: 'cost', pt: 'Custo', en: 'Cost' }, { slot: 'class', pt: 'Classe', en: 'Class' },
    { slot: 'atk', pt: 'Ataque', en: 'Attack' }, { slot: 'def', pt: 'Defesa', en: 'Defense' }, { slot: 'set', pt: 'Selo da edição', en: 'Set symbol' },
  ];
  const FONTS = [...new Set(CARD_FONTS.map((f) => f.family))];

  const PIECES: { kind: PieceKind; pt: string; en: string }[] = [
    { kind: 'header', pt: 'Barra de título', en: 'Title bar' },
    { kind: 'cost', pt: 'Selo de custo', en: 'Cost seal' },
    { kind: 'class', pt: 'Selo de classe', en: 'Class seal' },
    { kind: 'typeBar', pt: 'Barra de tipo', en: 'Type bar' },
    { kind: 'rules', pt: 'Caixa de regras', en: 'Rules box' },
    { kind: 'stat', pt: 'Ataque e defesa', en: 'Attack & defense' },
    { kind: 'footer', pt: 'Rodapé', en: 'Footer' },
    { kind: 'set', pt: 'Selo da edição', en: 'Set seal' },
    { kind: 'frame', pt: 'Moldura em volta da carta', en: 'Card border' },
  ];
  const BORDERS: [MetalKind | '', string, string][] = [['', 'Do estilo', 'Style default'], ['deck', 'Na cor da carta', 'Card color'], ['gold', 'Ouro', 'Gold'], ['silver', 'Prata', 'Silver'], ['bronze', 'Bronze', 'Bronze'], ['iron', 'Ferro', 'Iron']];
  const MODES: [NonNullable<Look['colorMode']>, string, string][] = [['classes', 'Das classes', 'From classes'], ['ouro', 'Dourado multicor', 'Multicolor gold'], ['primeira', 'Só a 1ª cor', 'First color only'], ['livre', 'Cores livres', 'Free colors']];
  const BLENDS: [BlendMode, string, string][] = [['faixas', 'Faixas', 'Bands'], ['degrade', 'Degradê suave', 'Smooth gradient'], ['divisao', 'Divisão reta', 'Hard split'], ['vertical', 'Vertical', 'Vertical'], ['diagonal', 'Diagonal', 'Diagonal']];

  // miniaturas dos estilos: pesadas, então só atualizam 300 ms depois da última mudança
  let styleThumbs = $state<Record<string, string>>({});
  $effect(() => {
    const snap = JSON.stringify(ed.draft) + JSON.stringify(ed.deckLook);
    const t = setTimeout(() => {
      void snap;
      const ctx = ed.ctx();
      if (!ctx) return;
      const base = mergeLook(ed.baseLook, ed.draft.look);
      styleThumbs = Object.fromEntries(STYLES.map((s) => {
        const inp = cardInput({ ...ed.draft, look: undefined }, { ...ctx, lang: ed.lang, deck: { ...ctx.deck, look: { ...base, style: s.id, pieces: {}, pixelateArt: s.pixelArt ? 7 : undefined } } });
        inp.uid = `sc-${s.id}`;
        return [s.id, compose(inp)];
      }));
    }, styleThumbs.ornado ? 300 : 0);
    return () => clearTimeout(t);
  });

  /** Cor do texto que o estilo usa quando o usuário não escolheu nenhuma. */
  function defaultInk(kind: PieceKind, st: StyleId, pieceColors: string[], metal?: MetalKind): string {
    const S = skeleton(260);
    const box = kind === 'stat' ? S.atk : kind === 'frame' ? S.card : (S as unknown as Record<string, typeof S.card>)[kind];
    const ps = piece(st, kind);
    const c = ps.render({ box, pal: makePalette(pieceColors, metal ?? ps.metal, look.blend ?? 'faixas'), defs: new Defs('ink'), opacity: 1 }).text.color;
    return /^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff';
  }

  const frameShown = $derived(frameOn(look));
  const iconStyle = $derived((look.icons?.class?.style ?? STYLES.find((s) => s.id === look.style)?.icons ?? 'emblema') as IconStyle);
  const mode = $derived(look.colorMode ?? 'classes');
  const tint = $derived(look.tint?.length ? look.tint : [colorHex(ed.draft.colors[0])]);

  function setAllIconStyles(s: IconStyle) {
    for (const slot of ['cost', 'class', 'atk', 'def'] as const) ed.setIcon(slot, { style: s });
  }
  // ── símbolos próprios (imagem enviada pelo usuário) ──
  type Slot = 'cost' | 'class' | 'atk' | 'def';
  let symInput: HTMLInputElement;
  let symSlot: Slot = 'cost';
  let symTick = $state(0);
  $effect(() => {
    const ids = (['cost', 'class', 'atk', 'def'] as const).map((k) => look.icons?.[k]?.image?.mediaId).filter(Boolean) as string[];
    if (ids.some((id) => !mediaUrl(id))) void ensureAll(ids).then(() => symTick++);
  });
  const symUrl = (id: string) => { void symTick; return mediaUrl(id); };
  function pickSymbol(slot: Slot) { symSlot = slot; symInput.click(); }
  async function uploadSymbol(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    try {
      const id = await importImage(f, f.name);
      ed.setIcon(symSlot, { image: { mediaId: id, recolor: false } });
      symTick++;
    } catch (e) {
      ui.toast(L('Não consegui abrir essa imagem.', 'Could not open that image.'), 'error', 5000);
    } finally { symInput.value = ''; }
  }

  function setTint(i: number, v: string) { const t = [...tint]; t[i] = v; ed.setLook({ tint: t }); }
</script>

<div class="stack">
  <section class="scope" class:wide={ed.scope !== 'card'}>
    <span class="section-title">{L('Onde as mudanças valem', 'Where changes apply')}</span>
    <div class="seg full three">
      <button class:on={ed.scope === 'card'} onclick={() => (ed.scope = 'card')}><b>{L('Esta carta', 'This card')}</b><small>1</small></button>
      <button class:on={ed.scope === 'deck'} onclick={() => (ed.scope = 'deck')}><b>{L('Deck inteiro', 'Whole deck')}</b><small>{deckCount}</small></button>
      <button class:on={ed.scope === 'collection'} onclick={() => (ed.scope = 'collection')}><b>{L('Coleção inteira', 'Whole collection')}</b><small>{collectionCount}</small></button>
    </div>
    <p class="note"><Info size={14} />
      <span>
        {#if ed.scope === 'card'}
          {L('Ajustes só desta carta, por cima do tema do deck.', 'Tweaks for this card only, on top of the deck theme.')}
        {:else if ed.scope === 'deck'}
          {L(`Muda o tema das ${deckCount} cartas deste deck. As cartas que tinham ajuste próprio na mesma peça passam a seguir o tema.`,
            `Changes the theme of all ${deckCount} cards in this deck. Cards with their own tweak on the same piece will follow the theme.`)}
        {:else}
          {L(`Muda o tema de todos os decks de “${edition?.name ?? ''}” (${collectionCount} cartas). Cada deck mantém as suas cores e os seus símbolos de classe e de custo.`,
            `Changes the theme of every deck in “${edition?.name ?? ''}” (${collectionCount} cards). Each deck keeps its own colors and class/cost symbols.`)}
        {/if}
        {L(' Nada é gravado até você clicar em Salvar.', ' Nothing is written until you click Save.')}
      </span>
    </p>
    {#if ed.scope === 'card' && ed.draft.look}
      <button class="btn sm ghost" onclick={() => ed.resetCardLook()}><RotateCcw size={14} /> {L('Tirar todos os ajustes desta carta (usar o tema do deck)', 'Remove all tweaks on this card (use deck theme)')}</button>
    {/if}
  </section>

  <section class="stack s">
    <span class="section-title">{L('Estilo geral', 'Overall style')}</span>
    <div class="styles">
      {#each STYLES as s (s.id)}
        <button class="st" class:on={look.style === s.id} onclick={() => ed.setStyle(s.id)} title={s.description}>
          <div class="mini">{#if styleThumbs[s.id]}{@html styleThumbs[s.id]}{:else}<div class="skeleton fill"></div>{/if}</div>
          <span>{s.name}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="stack s">
    <span class="section-title">{L('Cores da carta', 'Card colors')}</span>
    <div class="modes">
      {#each MODES as [id, pt, en]}
        <button class="chip" class:on={mode === id} onclick={() => ed.setLook({ colorMode: id })}>{L(pt, en)}</button>
      {/each}
    </div>
    {#if mode === 'livre'}
      <div class="tints">
        {#each tint as c, i}
          <span class="tint"><input type="color" value={c} oninput={(e) => setTint(i, (e.currentTarget as HTMLInputElement).value)} />
            {#if tint.length > 1}<button class="x" title={L('Tirar', 'Remove')} onclick={() => ed.setLook({ tint: tint.filter((_, j) => j !== i) })}><X size={12} /></button>{/if}</span>
        {/each}
        {#if tint.length < 5}<button class="btn sm ghost" onclick={() => ed.setLook({ tint: [...tint, tint[tint.length - 1]] })}><Plus size={14} /> {L('Cor', 'Color')}</button>{/if}
      </div>
    {:else if mode === 'ouro'}
      <p class="muted small">{L('Cartas de 2 ou mais classes ficam douradas; de uma classe só, mantêm a cor dela.', 'Cards with 2+ classes turn gold; single-class cards keep their color.')}</p>
    {/if}
    {#if colors.length > 1}
      <label class="field"><span>{L('Como as cores se misturam', 'How colors blend')}</span>
        <select class="select" value={look.blend ?? 'faixas'} onchange={(e) => ed.setLook({ blend: (e.currentTarget as HTMLSelectElement).value as BlendMode })}>
          {#each BLENDS as [id, pt, en]}<option value={id}>{L(pt, en)}</option>{/each}
        </select>
      </label>
    {/if}
  </section>

  <section class="stack s">
    <span class="section-title">{L('Peças (misture estilos à vontade)', 'Pieces (mix styles freely)')}</span>
    <div class="pieces">
      {#each PIECES as p (p.kind)}
        {@const ch = ed.piece(p.kind)}
        {@const st = ch.style ?? look.style}
        {@const isFrame = p.kind === 'frame'}
        {@const pc = ch.colors?.length ? ch.colors : colors}
        {@const changed = ed.pieceChanged(p.kind)}
        <div class="pc" class:open={open === p.kind}>
          <button class="pc-head" onclick={() => (open = open === p.kind ? null : p.kind)}>
            <span class="sw" style="background:{pc[0]}"></span>
            <b>{L(p.pt, p.en)}</b>
            {#if changed}<span class="dot-ch" title={L('Alterada desde que abriu', 'Changed since opened')}></span>{/if}
            <span class="muted">{isFrame && !frameShown ? L('desligada', 'off') : ch.image ? (ch.image.mediaId ? L('imagem', 'image') : L('só texto', 'text only')) : STYLES.find((x) => x.id === st)?.name}</span>
            <ChevronDown size={16} />
          </button>
          {#if open === p.kind}
            <div class="pc-body">
              <div class="row wrap">
                <button class="btn sm" disabled={!changed} onclick={() => ed.revertPiece(p.kind)} title={L('Desfaz só as mudanças desta peça', 'Undo only this piece')}><Undo2 size={14} /> {L('Voltar ao que estava', 'Back to how it was')}</button>
                <button class="btn sm ghost" onclick={() => ed.setPiece(p.kind, { style: st }, ['colors', 'opacity', 'metal', 'ink', 'font', 'hidden', 'image', 'fill', 'size'])}><RotateCcw size={14} /> {L('Padrão do estilo', 'Style default')}</button>
              </div>
              {#if isFrame}
                <label class="toggle"><input type="checkbox" checked={frameShown}
                  onchange={(e) => (e.currentTarget as HTMLInputElement).checked ? ed.setPiece('frame', { style: look.style }, ['hidden']) : ed.setPiece('frame', { hidden: true })} />
                  {L('Mostrar moldura', 'Show the border')}</label>
              {:else}
                <label class="toggle"><input type="checkbox" checked={!ch.hidden} onchange={(e) => ed.setPiece(p.kind, { hidden: !(e.currentTarget as HTMLInputElement).checked })} />
                  {#if ch.hidden}<EyeOff size={14} />{:else}<Eye size={14} />{/if} {L('Mostrar esta peça', 'Show this piece')}</label>
              {/if}
              <PieceImagePanel {ed} kind={p.kind} />
              <div class="thumbs" class:dim={!!ch.image}>
                {#each STYLES as s (s.id)}
                  <button class="th" class:on={st === s.id} title={s.name} onclick={() => ed.setPiece(p.kind, { style: s.id })}>
                    {@html pieceThumb(s.id, p.kind, pc)}
                    <span>{s.name}</span>
                  </button>
                {/each}
              </div>
              <div class="grid2">
                <div class="field"><span>{L('Cor', 'Color')}</span>
                  <div class="row">
                    <input type="color" value={pc[0]} oninput={(e) => ed.setPiece(p.kind, { colors: [(e.currentTarget as HTMLInputElement).value] })} />
                    <button class="btn sm ghost" disabled={!ch.colors} onclick={() => ed.setPiece(p.kind, {}, ['colors'])}>{L('Da carta', 'Card')}</button>
                  </div>
                </div>
                <label class="field"><span>{L('Borda', 'Border')}</span>
                  <select class="select" value={ch.metal ?? ''} onchange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value as MetalKind; v ? ed.setPiece(p.kind, { metal: v }) : ed.setPiece(p.kind, {}, ['metal']); }}>
                    {#each BORDERS as [v, pt, en]}<option value={v}>{L(pt, en)}</option>{/each}
                  </select>
                </label>
              </div>
              <label class="field"><span>{L('Opacidade do fundo', 'Background opacity')} · {Math.round((ch.opacity ?? piece(st, p.kind).opacity) * 100)}%</span>
                <input type="range" min="0" max="1" step="0.01" value={ch.opacity ?? piece(st, p.kind).opacity} oninput={(e) => ed.setPiece(p.kind, { opacity: +(e.currentTarget as HTMLInputElement).value })} />
              </label>
              {#if !isFrame}
                <div class="grid2">
                  <div class="field"><span>{L('Cor do fundo', 'Background color')}</span>
                    <div class="row">
                      <input type="color" value={ch.fill ?? '#2a2320'} oninput={(e) => ed.setPiece(p.kind, { fill: (e.currentTarget as HTMLInputElement).value })} />
                      <button class="btn sm ghost" disabled={!ch.fill} onclick={() => ed.setPiece(p.kind, {}, ['fill'])}>{L('Do estilo', 'Style')}</button>
                    </div>
                  </div>
                  {#if p.kind !== 'rules'}
                    {@const sz = ch.size ?? 1}
                    <label class="field"><span>{L('Tamanho da peça', 'Piece size')} · {Math.round(sz * 100)}%</span>
                      <div class="row">
                        <input type="range" min="0.5" max="1.6" step="0.05" value={sz} oninput={(e) => ed.setPiece(p.kind, { size: +(e.currentTarget as HTMLInputElement).value })} />
                        <button class="btn sm ghost icon" title={L('Tamanho padrão', 'Default size')} disabled={sz === 1} onclick={() => ed.setPiece(p.kind, {}, ['size'])}><RotateCcw size={13} /></button>
                      </div>
                    </label>
                  {/if}
                </div>
              {/if}
              {#if !isFrame && p.kind !== 'set'}
                <div class="grid2">
                  <div class="field"><span>{L('Cor do texto', 'Text color')}</span>
                    <div class="row">
                      <input type="color" value={ch.ink ?? defaultInk(p.kind, st, pc, ch.metal)} oninput={(e) => ed.setPiece(p.kind, { ink: (e.currentTarget as HTMLInputElement).value })} />
                      <button class="btn sm ghost" disabled={!ch.ink} onclick={() => ed.setPiece(p.kind, {}, ['ink'])}>{L('Padrão', 'Default')}</button>
                    </div>
                  </div>
                  <label class="field"><span>{L('Fonte', 'Font')}</span>
                    <select class="select" value={ch.font ?? ''} onchange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; v ? ed.setPiece(p.kind, { font: v }) : ed.setPiece(p.kind, {}, ['font']); }}>
                      <option value="">{L('Do estilo', 'Style default')}</option>
                      {#each FONTS as f}<option value={f} style="font-family:'{f}'">{f}</option>{/each}
                    </select>
                  </label>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <section class="stack s">
    <span class="section-title">{L('Símbolos', 'Symbols')}</span>
    <div class="field"><span>{L('Acabamento (todos os símbolos)', 'Finish (all symbols)')}</span>
      <div class="seg full">
        {#each ICON_STYLES as s}<button class:on={iconStyle === s.id} onclick={() => setAllIconStyles(s.id)}>{L(s.name, s.en)}</button>{/each}
      </div>
    </div>

    <div class="field">
      <span>{L('Tamanho dos símbolos (dentro da peça)', 'Symbol size (inside the piece)')}</span>
      <div class="sizes">
        {#each SIZE_SLOTS as z (z.slot)}
          {@const v = look.icons?.[z.slot]?.size ?? 1}
          <label class="sz"><span>{L(z.pt, z.en)}</span>
            <input type="range" min="0.5" max="1.8" step="0.05" value={v} oninput={(e) => ed.setIcon(z.slot, { size: +(e.currentTarget as HTMLInputElement).value })} />
            <button class="pct" title={L('Voltar ao padrão', 'Reset')} disabled={v === 1} onclick={() => ed.setIcon(z.slot, {}, ['size'])}>{Math.round(v * 100)}%</button>
          </label>
        {/each}
      </div>
    </div>

    {#snippet picker(slot: 'cost' | 'class' | 'atk' | 'def', title: string, ids: string[], color: string)}
      {@const cur = look.icons?.[slot]?.glyph ?? ids[0]}
      {@const im = look.icons?.[slot]?.image}
      <div class="field">
        <div class="row"><span class="grow label">{title}</span>
          <button class="btn sm ghost" disabled={!ed.iconChanged(slot)} onclick={() => ed.revertIcon(slot)}><Undo2 size={13} /> {L('Voltar ao que estava', 'Back to how it was')}</button></div>
        <div class="glyphs">
          {#each ids as g}
            <button class="gl" class:on={cur === g} title={ICON_NAMES[g] ?? g} onclick={() => ed.setIcon(slot, { glyph: g })}><Glyph id={g} size={26} color={look.icons?.[slot]?.color ?? color} /></button>
          {/each}
          <input type="color" title={L('Cor do símbolo', 'Symbol color')} value={look.icons?.[slot]?.color ?? color} oninput={(e) => ed.setIcon(slot, { color: (e.currentTarget as HTMLInputElement).value })} />
          <button class="btn sm ghost icon" title={L('Cor padrão', 'Default color')} disabled={!look.icons?.[slot]?.color} onclick={() => ed.setIcon(slot, {}, ['color'])}><RotateCcw size={14} /></button>
        </div>
        <div class="row wrap symrow">
          {#if im}
            <span class="symimg">{#if symUrl(im.mediaId)}<img src={symUrl(im.mediaId)} alt="" />{/if}</span>
            <label class="toggle"><input type="checkbox" checked={!!im.recolor} onchange={(e) => ed.setIcon(slot, { image: { ...im, recolor: (e.currentTarget as HTMLInputElement).checked } })} />
              {L('Pintar na cor escolhida', 'Paint with the chosen color')}</label>
            <button class="btn sm ghost" onclick={() => pickSymbol(slot)}><ImagePlus size={14} /> {L('Trocar', 'Change')}</button>
            <button class="btn sm ghost" onclick={() => ed.setIcon(slot, {}, ['image'])}><Trash2 size={14} /> {L('Usar os símbolos acima', 'Use the symbols above')}</button>
          {:else}
            <button class="btn sm ghost" onclick={() => pickSymbol(slot)} title={L('PNG/SVG com fundo transparente; colorido ou de uma cor só', 'PNG/SVG with transparent background; full color or single color')}><ImagePlus size={14} /> {L('Enviar meu símbolo (PNG)', 'Upload my symbol (PNG)')}</button>
          {/if}
        </div>
      </div>
    {/snippet}

    <input type="file" accept="image/png,image/webp,image/svg+xml" hidden bind:this={symInput} onchange={(e) => uploadSymbol((e.currentTarget as HTMLInputElement).files)} />
    {#if ed.draft.cost.length}
      {@render picker('cost', L('Custo', 'Cost') + (ed.draft.cost.length > 1 ? L(' (1º recurso)', ' (1st resource)') : ''), resourceChoices(ed.draft.cost[0].resource), RESOURCE_COLORS[ed.draft.cost[0].resource])}
    {/if}
    {@render picker('class', L('Classe', 'Class') + (ed.draft.colors.length > 1 && look.icons?.classMode !== 'primeira' ? L(' (1ª classe)', ' (1st class)') : ''), classChoices(ed.draft.colors[0]), '#e8dcc4')}
    {#if ed.draft.colors.length > 1}
      <label class="toggle"><input type="checkbox" checked={look.icons?.classMode !== 'primeira'} onchange={(e) => ed.setIconOption('classMode', (e.currentTarget as HTMLInputElement).checked ? 'todas' : 'primeira')} />
        {L('Mostrar o símbolo de cada classe da carta (o selo se alarga)', 'Show a symbol for each of the card\'s classes (the seal widens)')}</label>
    {/if}
    {#if ed.draft.stats}
      {@render picker('atk', L('Ataque', 'Attack'), ATK_CHOICES, '#d3dae3')}
      {@render picker('def', L('Defesa', 'Defense'), DEF_CHOICES, '#d3dae3')}
      <div class="field"><span>{L('Como mostrar ATK/DEF', 'How to show ATK/DEF')}</span>
        <div class="seg full">
          <button class:on={(look.icons?.statMode ?? 'placa') === 'placa'} onclick={() => ed.setIconOption('statMode', 'placa')}>{L('Em placas', 'In plates')}</button>
          <button class:on={look.icons?.statMode === 'emblema'} onclick={() => ed.setIconOption('statMode', 'emblema')}>{L('Número no medalhão', 'Number in medallion')}</button>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .symrow { gap: 8px; align-items: center; margin-top: 4px; }
  .symimg { width: 34px; height: 34px; border-radius: 6px; border: 1px solid var(--line-2); display: grid; place-items: center; overflow: hidden; background: repeating-conic-gradient(#3a3a3a 0 25%, #2a2a2a 0 50%) 0 0 / 10px 10px; }
  .symimg img { max-width: 100%; max-height: 100%; }
  .thumbs.dim { opacity: .45; }
  .scope { display: flex; flex-direction: column; gap: 8px; position: sticky; top: -20px; z-index: 5; background: var(--bg); padding: 12px 0 14px; margin-top: -12px; border-bottom: 1px solid var(--line); }
  .scope.wide .note { border-color: var(--accent); background: var(--accent-soft); }
  .three button { flex-direction: column; gap: 1px; padding: 7px 4px; height: auto; }
  .three b { font-weight: 600; font-size: 12.5px; }
  .three small { font-size: 11px; opacity: .7; }
  .sizes { display: flex; flex-direction: column; gap: 6px; }
  .sz { display: grid; grid-template-columns: 110px 1fr 52px; align-items: center; gap: 10px; font-size: 13px; color: var(--text-2); }
  .pct { border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text-2); border-radius: 7px; font: 500 12px var(--ui); padding: 3px 0; cursor: pointer; font-variant-numeric: tabular-nums; }
  .pct:disabled { opacity: .55; cursor: default; }
  .full { display: flex; width: 100%; }
  .full button { flex: 1; justify-content: center; }
  .note { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: var(--text-2); margin: 0; padding: 9px 11px; border-radius: 9px; background: var(--surface); border: 1px solid var(--line); }
  .note :global(svg) { flex: none; margin-top: 2px; color: var(--accent); }
  .s { gap: 12px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .small { font-size: 12.5px; margin: 0; }
  .wrap { flex-wrap: wrap; }
  .styles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .st { display: flex; flex-direction: column; gap: 6px; align-items: center; padding: 6px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); cursor: pointer; font: 500 12px var(--ui); }
  .st:hover { border-color: var(--line-2); color: var(--text); }
  .st.on { border-color: var(--accent); color: var(--accent-2); box-shadow: 0 0 0 2px var(--accent-soft); }
  .mini { width: 100%; aspect-ratio: 750 / 1050; border-radius: 6px; overflow: hidden; }
  .mini :global(svg) { width: 100%; height: 100%; display: block; }
  .fill { width: 100%; height: 100%; }
  .modes { display: flex; flex-wrap: wrap; gap: 6px; }
  .tints { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .tint { position: relative; }
  .tint .x { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; border: 0; background: var(--surface-3); color: var(--text-2); display: grid; place-items: center; cursor: pointer; padding: 0; }
  .pieces { display: flex; flex-direction: column; gap: 6px; }
  .pc { border: 1px solid var(--line); border-radius: 11px; background: var(--surface); overflow: hidden; }
  .pc.open { border-color: var(--line-2); }
  .pc-head { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 0; background: none; color: var(--text); cursor: pointer; font: inherit; text-align: left; }
  .pc-head b { font-weight: 500; flex: 1; }
  .pc-head span.muted { font-size: 12px; }
  .pc-head :global(svg) { color: var(--muted); transition: transform var(--t); }
  .pc.open .pc-head :global(svg) { transform: rotate(180deg); }
  .dot-ch { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
  .sw { width: 14px; height: 14px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgb(255 255 255 / .2); }
  .pc-body { padding: 4px 12px 14px; display: flex; flex-direction: column; gap: 12px; }
  .thumbs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .th { display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 9px; border: 1px solid var(--line); background: var(--bg-2); color: var(--muted); cursor: pointer; font: 500 11px var(--ui); }
  .th :global(svg) { width: 100%; height: 54px; display: block; border-radius: 5px; }
  .th.on { border-color: var(--accent); color: var(--accent-2); }
  .toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .glyphs { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .gl { width: 42px; height: 42px; border-radius: 10px; border: 1px solid var(--line-2); background: var(--bg-2); display: grid; place-items: center; cursor: pointer; }
  .gl:hover { border-color: #4a413c; background: var(--surface-2); }
  .gl.on { border-color: var(--accent); background: var(--accent-soft); }
</style>
