<script lang="ts">
  import { ChevronDown, RotateCcw, Eye, EyeOff, Info } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { colorHex } from '../../model/catalog';
  import { STYLES, piece, type PieceKind, type StyleId } from '../../render/elements';
  import { CARD_FONTS } from '../../render/fonts';
  import { compose } from '../../render/compose';
  import { cardInput, mergeLook } from '../../render/card';
  import { ICON_STYLES, type IconStyle } from '../../render/icons/render';
  import { ATK_CHOICES, DEF_CHOICES, ICON_NAMES, RESOURCE_COLORS, classChoices, resourceChoices } from '../../render/icons/glyphs';
  import type { MetalKind } from '../../render/palette';
  import { ctxFor } from '../common/cardCtx';
  import Glyph from '../common/Glyph.svelte';
  import { pieceThumb } from './thumbs';
  import type { EditorState } from './editor.svelte';

  let { ed }: { ed: EditorState } = $props();

  let open = $state<PieceKind | null>(null);
  const look = $derived(ed.look);
  const colors = $derived(ed.draft.colors.map(colorHex));
  const deckCount = $derived(app.cardsOf(ed.draft.deckId).length);
  const FONTS = [...new Set(CARD_FONTS.map((f) => f.family))];

  const PIECES: { kind: PieceKind; pt: string; en: string }[] = [
    { kind: 'header', pt: 'Nome', en: 'Name' },
    { kind: 'cost', pt: 'Selo de custo', en: 'Cost seal' },
    { kind: 'class', pt: 'Selo de classe', en: 'Class seal' },
    { kind: 'typeBar', pt: 'Barra de tipo', en: 'Type bar' },
    { kind: 'rules', pt: 'Caixa de regras', en: 'Rules box' },
    { kind: 'stat', pt: 'Ataque e defesa', en: 'Attack & defense' },
    { kind: 'footer', pt: 'Rodapé', en: 'Footer' },
    { kind: 'set', pt: 'Selo da edição', en: 'Set seal' },
    { kind: 'frame', pt: 'Moldura em volta', en: 'Card border' },
  ];
  const METALS: [MetalKind | '', string, string][] = [['', 'Do estilo', 'Style default'], ['deck', 'Cor do deck', 'Deck color'], ['gold', 'Ouro', 'Gold'], ['silver', 'Prata', 'Silver'], ['bronze', 'Bronze', 'Bronze'], ['iron', 'Ferro', 'Iron']];

  /** Miniatura da carta inteira num estilo (para escolher o estilo geral). */
  function styleCard(style: StyleId): string {
    const ctx = ctxFor(ed.draft);
    if (!ctx) return '';
    const base = mergeLook(ed.deck.look, ed.draft.look);
    const inp = cardInput({ ...ed.draft, look: undefined }, { ...ctx, lang: ed.lang, deck: { ...ctx.deck, look: { ...base, style, pieces: {}, pixelateArt: style === 'pixel' ? 7 : undefined } } });
    inp.uid = `sc-${style}`;
    return compose(inp);
  }
  const styleThumbs = $derived(Object.fromEntries(STYLES.map((s) => [s.id, styleCard(s.id)])));

  const frameOn = $derived(!!look.pieces?.frame && !look.pieces.frame.hidden);
  const iconStyle = $derived((look.icons?.class?.style ?? STYLES.find((s) => s.id === look.style)?.icons ?? 'emblema') as IconStyle);

  function setAllIconStyles(s: IconStyle) {
    for (const slot of ['cost', 'class', 'atk', 'def'] as const) ed.setIcon(slot, { style: s });
  }
</script>

<div class="stack">
  <section class="scope">
    <div class="seg full">
      <button class:on={ed.scope === 'card'} onclick={() => (ed.scope = 'card')}>{L('Só esta carta', 'This card only')}</button>
      <button class:on={ed.scope === 'deck'} onclick={() => (ed.scope = 'deck')}>{L(`Tema do deck (${deckCount} cartas)`, `Deck theme (${deckCount} cards)`)}</button>
    </div>
    <p class="note"><Info size={14} />
      {ed.scope === 'deck'
        ? L('Mudanças aqui valem para todas as cartas do deck e são salvas na hora.', 'Changes here apply to every card in the deck and are saved immediately.')
        : L('Ajustes só desta carta, por cima do tema do deck. Salve para aplicar.', 'Tweaks for this card only, on top of the deck theme. Save to apply.')}
    </p>
    {#if ed.scope === 'card' && ed.draft.look}
      <button class="btn sm ghost" onclick={() => ed.resetCardLook()}><RotateCcw size={14} /> {L('Voltar ao tema do deck', 'Back to deck theme')}</button>
    {/if}
  </section>

  <section class="stack s">
    <span class="section-title">{L('Estilo geral', 'Overall style')}</span>
    <div class="styles">
      {#each STYLES as s (s.id)}
        <button class="st" class:on={look.style === s.id} onclick={() => ed.setStyle(s.id)} title={s.description}>
          <div class="mini">{@html styleThumbs[s.id]}</div>
          <span>{s.name}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="stack s">
    <span class="section-title">{L('Peças (misture estilos à vontade)', 'Pieces (mix styles freely)')}</span>
    <div class="pieces">
      {#each PIECES as p (p.kind)}
        {@const ch = ed.piece(p.kind)}
        {@const st = ch.style ?? look.style}
        {@const isFrame = p.kind === 'frame'}
        <div class="pc" class:open={open === p.kind}>
          <button class="pc-head" onclick={() => (open = open === p.kind ? null : p.kind)}>
            <span class="sw" style="background:{ch.colors?.[0] ?? colors[0]}"></span>
            <b>{L(p.pt, p.en)}</b>
            <span class="muted">{isFrame && !frameOn ? L('desligada', 'off') : STYLES.find((x) => x.id === st)?.name}</span>
            <ChevronDown size={16} />
          </button>
          {#if open === p.kind}
            <div class="pc-body">
              {#if isFrame}
                <label class="toggle"><input type="checkbox" checked={frameOn}
                  onchange={(e) => (e.currentTarget as HTMLInputElement).checked ? ed.setPiece('frame', { style: look.style }, ['hidden']) : ed.setPiece('frame', { hidden: true })} />
                  {L('Mostrar moldura em volta da carta (o padrão é full art, sem borda)', 'Show a border around the card (default is borderless full art)')}</label>
              {:else}
                <label class="toggle"><input type="checkbox" checked={!ch.hidden} onchange={(e) => ed.setPiece(p.kind, { hidden: !(e.currentTarget as HTMLInputElement).checked })} />
                  {#if ch.hidden}<EyeOff size={14} />{:else}<Eye size={14} />{/if} {L('Mostrar esta peça', 'Show this piece')}</label>
              {/if}
              <div class="thumbs">
                {#each STYLES as s (s.id)}
                  <button class="th" class:on={st === s.id} title={s.name} onclick={() => ed.setPiece(p.kind, { style: s.id })}>
                    {@html pieceThumb(s.id, p.kind, ch.colors ?? colors)}
                    <span>{s.name}</span>
                  </button>
                {/each}
              </div>
              <div class="grid2">
                <div class="field"><span>{L('Cor', 'Color')}</span>
                  <div class="row">
                    <input type="color" value={ch.colors?.[0] ?? colors[0]} oninput={(e) => ed.setPiece(p.kind, { colors: [(e.currentTarget as HTMLInputElement).value] })} />
                    <button class="btn sm ghost" onclick={() => ed.setPiece(p.kind, {}, ['colors'])}>{L('Do deck', 'Deck')}</button>
                  </div>
                </div>
                <label class="field"><span>{L('Metal', 'Metal')}</span>
                  <select class="select" value={ch.metal ?? ''} onchange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value as MetalKind; v ? ed.setPiece(p.kind, { metal: v }) : ed.setPiece(p.kind, {}, ['metal']); }}>
                    {#each METALS as [v, pt, en]}<option value={v}>{L(pt, en)}</option>{/each}
                  </select>
                </label>
              </div>
              <label class="field"><span>{L('Transparência do fundo', 'Background opacity')} · {Math.round((ch.opacity ?? piece(st, p.kind).opacity) * 100)}%</span>
                <input type="range" min="0" max="1" step="0.01" value={ch.opacity ?? piece(st, p.kind).opacity} oninput={(e) => ed.setPiece(p.kind, { opacity: +(e.currentTarget as HTMLInputElement).value })} />
              </label>
              {#if !isFrame && p.kind !== 'set'}
                <div class="grid2">
                  <div class="field"><span>{L('Cor do texto', 'Text color')}</span>
                    <div class="row">
                      <input type="color" value={ch.ink ?? '#ffffff'} oninput={(e) => ed.setPiece(p.kind, { ink: (e.currentTarget as HTMLInputElement).value })} />
                      <button class="btn sm ghost" onclick={() => ed.setPiece(p.kind, {}, ['ink'])}>{L('Padrão', 'Default')}</button>
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

    {#snippet picker(slot: 'cost' | 'class' | 'atk' | 'def', title: string, ids: string[], color: string)}
      {@const cur = look.icons?.[slot]?.glyph ?? ids[0]}
      <div class="field"><span>{title}</span>
        <div class="glyphs">
          {#each ids as g}
            <button class="gl" class:on={cur === g} title={ICON_NAMES[g] ?? g} onclick={() => ed.setIcon(slot, { glyph: g })}><Glyph id={g} size={26} color={look.icons?.[slot]?.color ?? color} /></button>
          {/each}
          <input type="color" title={L('Cor do símbolo', 'Symbol color')} value={look.icons?.[slot]?.color ?? color} oninput={(e) => ed.setIcon(slot, { color: (e.currentTarget as HTMLInputElement).value })} />
          <button class="btn sm ghost icon" title={L('Cor padrão', 'Default color')} onclick={() => ed.setIcon(slot, {}, ['color'])}><RotateCcw size={14} /></button>
        </div>
      </div>
    {/snippet}

    {#if ed.draft.cost}
      {@render picker('cost', L('Custo', 'Cost'), resourceChoices(ed.draft.cost.resource), RESOURCE_COLORS[ed.draft.cost.resource])}
    {/if}
    {@render picker('class', L('Classe', 'Class'), classChoices(ed.draft.colors[0]), '#e8dcc4')}
    {#if ed.draft.stats}
      {@render picker('atk', L('Ataque', 'Attack'), ATK_CHOICES, '#d3dae3')}
      {@render picker('def', L('Defesa', 'Defense'), DEF_CHOICES, '#d3dae3')}
      <div class="field"><span>{L('Como mostrar ATK/DEF', 'How to show ATK/DEF')}</span>
        <div class="seg full">
          <button class:on={(look.icons?.statMode ?? 'placa') === 'placa'} onclick={() => ed.setLook({ icons: { ...look.icons, statMode: 'placa' } })}>{L('Em placas', 'In plates')}</button>
          <button class:on={look.icons?.statMode === 'emblema'} onclick={() => ed.setLook({ icons: { ...look.icons, statMode: 'emblema' } })}>{L('Número no medalhão', 'Number in medallion')}</button>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .scope { display: flex; flex-direction: column; gap: 8px; }
  .full { display: flex; width: 100%; }
  .full button { flex: 1; justify-content: center; }
  .note { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: var(--text-2); margin: 0; padding: 9px 11px; border-radius: 9px; background: var(--surface); border: 1px solid var(--line); }
  .note :global(svg) { flex: none; margin-top: 2px; color: var(--accent); }
  .s { gap: 12px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .styles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .st { display: flex; flex-direction: column; gap: 6px; align-items: center; padding: 6px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); cursor: pointer; font: 500 12px var(--ui); }
  .st:hover { border-color: var(--line-2); color: var(--text); }
  .st.on { border-color: var(--accent); color: var(--accent-2); box-shadow: 0 0 0 2px var(--accent-soft); }
  .mini { width: 100%; aspect-ratio: 750 / 1050; border-radius: 6px; overflow: hidden; }
  .mini :global(svg) { width: 100%; height: 100%; display: block; }
  .pieces { display: flex; flex-direction: column; gap: 6px; }
  .pc { border: 1px solid var(--line); border-radius: 11px; background: var(--surface); overflow: hidden; }
  .pc.open { border-color: var(--line-2); }
  .pc-head { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 0; background: none; color: var(--text); cursor: pointer; font: inherit; text-align: left; }
  .pc-head b { font-weight: 500; flex: 1; }
  .pc-head span.muted { font-size: 12px; }
  .pc-head :global(svg) { color: var(--muted); transition: transform var(--t); }
  .pc.open .pc-head :global(svg) { transform: rotate(180deg); }
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
