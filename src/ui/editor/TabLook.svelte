<!--
  Aparência: estilo geral, cores, peças (uma a uma) e símbolos.

  A mesma tela serve para a carta (ajustes só dela, por cima do tema do deck) e
  para o tema do deck ou da coleção (aberto pela Biblioteca) — quem decide é o
  escopo do estado recebido.

  Os seletores de cor mostram sempre a cor que está de fato aplicada na carta
  (vinda do estilo ou escolhida), lida do próprio desenho.
-->
<script lang="ts">
  import { ChevronDown, RotateCcw, Eye, EyeOff, Info, Undo2, Plus, X, ImagePlus, Trash2, Link2, Unlink2, Paintbrush } from '@lucide/svelte';
  import { ensureAll, importImage, mediaUrl } from '../../store/media';
  import { ui } from '../../app/ui.svelte';
  import { app } from '../../store/project.svelte';
  import { router } from '../../app/router.svelte';
  import { L } from '../../app/i18n.svelte';
  import { COLORS, colorHex, RESOURCES } from '../../model/catalog';
  import { lighten } from '../../render/color';
  import { vivid } from '../../render/palette';
  import { STYLES, piece, type PieceKind } from '../../render/elements';
  import { CARD_FONTS } from '../../render/fonts';
  import { cardColors, compose, composeEx, defaultFill, frameOn, type ComposeInfo, type IconChoice, type Look, type PieceSlot } from '../../render/compose';
  import { cardInput, mergeLook } from '../../render/card';
  import { ICON_STYLES, type IconStyle } from '../../render/icons/render';
  import { ATK_CHOICES, DEF_CHOICES, iconName, RESOURCE_COLORS, classChoices, resourceChoices } from '../../render/icons/glyphs';
  import { makePalette, type BlendMode, type MetalKind } from '../../render/palette';
  import { Defs } from '../../render/defs';
  import { skeleton } from '../../render/layout';
  import Glyph from '../common/Glyph.svelte';
  import { pieceThumb } from './thumbs';
  import PieceImagePanel from './PieceImagePanel.svelte';
  import type { ColorId, ResourceId } from '../../model/types';
  import type { EditorState } from './editor.svelte';

  let { ed }: { ed: EditorState } = $props();

  let open = $state<PieceKind | null>(null);
  /** Ataque e defesa: mexer nos dois juntos ou em um só. */
  let side = $state<'stat' | 'atk' | 'def'>('stat');
  let openSym = $state<string | null>(null);
  const look = $derived(ed.look);
  const theme = $derived(ed.scope !== 'card');
  /** Cores que a carta usa de fato (depois do modo de cor). */
  const colors = $derived(cardColors(ed.draft.colors.map(colorHex), look));
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
    }, styleThumbs.neutro ? 300 : 0);
    return () => clearTimeout(t);
  });

  // o que a carta está usando de fato (cores de texto, fundo e símbolos): alimenta os seletores
  let used = $state<ComposeInfo>({ ink: {}, fill: {}, icon: {} });
  $effect(() => {
    const snap = JSON.stringify(ed.draft) + JSON.stringify(ed.deckLook);
    const t = setTimeout(() => {
      void snap;
      const ctx = ed.ctx();
      if (ctx) used = composeEx({ ...cardInput(ed.draft, { ...ctx, lang: ed.lang }), uid: 'used', info: true }).info;
    }, 120);
    return () => clearTimeout(t);
  });
  const hex = (c: string | undefined, fallback: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback);
  /**
   * Peça que a carta de amostra não mostra (ex.: ataque e defesa numa carta sem
   * eles): as cores vêm do desenho da peça sozinha, com as mesmas escolhas.
   */
  function probe(slot: PieceSlot): { ink?: string; fill?: string } {
    const kind: PieceKind = slot === 'atk' || slot === 'def' ? 'stat' : (slot as PieceKind);
    const ch = ed.piece(slot);
    const S = skeleton(260);
    const box = slot === 'atk' || slot === 'def' ? S[slot] : kind === 'stat' ? S.atk : kind === 'frame' ? S.card : (S as unknown as Record<string, typeof S.card>)[kind];
    const ps = piece(ch.style ?? look.style, kind);
    const args = { box, pal: makePalette(ch.colors?.length ? ch.colors : colors, ch.metal ?? ps.metal, look.blend ?? 'faixas'), defs: new Defs('probe'), opacity: 1, variant: slot === 'def' ? 'def' as const : kind === 'stat' ? 'atk' as const : undefined, layout: S };
    return { ink: ps.render(args).text.color, fill: defaultFill(ps, args) };
  }
  const inkOf = (slot: PieceSlot) => used.ink[slot] ?? probe(slot).ink;
  const fillOf = (slot: PieceSlot) => (slot in used.ink ? used.fill[slot] : probe(slot).fill);

  const frameShown = $derived(frameOn(look));
  const iconStyle = $derived((look.icons?.cost?.style ?? look.icons?.class?.style ?? STYLES.find((s) => s.id === look.style)?.icons ?? 'emblema') as IconStyle);
  const mode = $derived(look.colorMode ?? 'classes');
  const tint = $derived(look.tint?.length ? look.tint : [colorHex(ed.draft.colors[0])]);
  function setTint(i: number, v: string) { const t = [...tint]; t[i] = v; ed.setLook({ tint: t }); }
  function setAllIconStyles(s: IconStyle) { for (const slot of ['cost', 'class', 'atk', 'def'] as const) ed.setIcon(slot, { style: s }); }

  /** Onde a peça aberta grava: a própria, ou só o ataque/só a defesa. */
  const slotOf = (kind: PieceKind): PieceSlot => (kind === 'stat' ? side : kind);
  /** De qual desenho ler as cores aplicadas (em "os dois", lê o ataque). */
  const usedSlot = (kind: PieceKind): PieceSlot => (kind === 'stat' ? (side === 'def' ? 'def' : 'atk') : kind);
  const statsDiffer = $derived(inkOf('atk') !== inkOf('def') || fillOf('atk') !== fillOf('def'));

  // ── recursos cujo símbolo dá para escolher ──
  /** Na carta: os recursos do custo dela. No tema: todos os que as cartas dos decks atingidos usam. */
  const resources = $derived.by((): ResourceId[] => {
    const cards = theme ? (ed.scope === 'deck' ? [ed.deck] : ed.targets).flatMap((d) => app.cardsOf(d.id)) : [ed.draft];
    const seen = new Set<ResourceId>(ed.draft.cost.map((p) => p.resource));
    for (const c of cards) for (const p of c.cost) seen.add(p.resource);
    return (Object.keys(RESOURCES) as ResourceId[]).filter((r) => seen.has(r));
  });
  /** Escolha em vigor para um recurso (o formato antigo guardava a do 1º recurso junto do custo). */
  function resPick(r: ResourceId): IconChoice {
    const first = ed.draft.cost[0]?.resource === r;
    const c = look.icons?.cost;
    return { ...(first && c ? { glyph: c.glyph, color: c.color, image: c.image } : {}), ...look.icons?.res?.[r] };
  }

  /** Classes cujo símbolo dá para escolher: na carta, as dela; no tema, todas as das cartas dos decks atingidos. */
  const classes = $derived.by((): ColorId[] => {
    const cards = theme ? (ed.scope === 'deck' ? [ed.deck] : ed.targets).flatMap((d) => app.cardsOf(d.id)) : [ed.draft];
    const seen = new Set<ColorId>(ed.draft.colors);
    for (const c of cards) for (const col of c.colors) seen.add(col);
    if (!seen.size) seen.add(ed.deck.colors[0]);
    return (Object.keys(COLORS) as ColorId[]).filter((c) => seen.has(c));
  });
  function clsPick(id: ColorId): IconChoice {
    const first = (ed.draft.colors[0] ?? ed.deck.colors[0]) === id;
    const c = look.icons?.class;
    return { ...(first && c ? { glyph: c.glyph, color: c.color, image: c.image } : {}), ...look.icons?.cls?.[id] };
  }

  // ── símbolos próprios (imagem enviada pelo usuário) ──
  type IconKey = 'atk' | 'def' | `res:${ResourceId}` | `cls:${ColorId}`;
  let symInput: HTMLInputElement;
  let symKey: IconKey = 'atk';
  let symTick = $state(0);
  const pickOf = (k: IconKey): IconChoice => (k.startsWith('res:') ? resPick(k.slice(4) as ResourceId) : k.startsWith('cls:') ? clsPick(k.slice(4) as ColorId) : look.icons?.[k as 'atk'] ?? {});
  function writeIcon(k: IconKey, patch: Partial<IconChoice>, remove: (keyof IconChoice)[] = []) {
    if (k.startsWith('res:')) ed.setResIcon(k.slice(4), patch, remove);
    else if (k.startsWith('cls:')) ed.setClsIcon(k.slice(4), patch, remove);
    else ed.setIcon(k as 'atk', patch, remove);
  }
  $effect(() => {
    const ids = [...(['class', 'atk', 'def'] as const).map((k) => look.icons?.[k]?.image?.mediaId), look.icons?.cost?.image?.mediaId, ...Object.values(look.icons?.res ?? {}).map((i) => i?.image?.mediaId), ...Object.values(look.icons?.cls ?? {}).map((i) => i?.image?.mediaId)].filter(Boolean) as string[];
    if (ids.some((id) => !mediaUrl(id))) void ensureAll(ids).then(() => symTick++);
  });
  const symUrl = (id: string) => { void symTick; return mediaUrl(id); };
  function pickSymbol(k: IconKey) { symKey = k; symInput.click(); }
  async function uploadSymbol(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    try {
      const id = await importImage(f, f.name);
      writeIcon(symKey, { image: { mediaId: id, recolor: false } });
      symTick++;
    } catch {
      ui.toast(L('Não consegui abrir essa imagem.', 'Could not open that image.'), 'error', 5000);
    } finally { symInput.value = ''; }
  }

  // ── tamanhos: símbolo e número juntos (padrão) ou separados ──
  type SizeSlot = 'cost' | 'atk' | 'def';
  const iconSize = (s: SizeSlot | 'class' | 'set') => look.icons?.[s]?.size ?? 1;
  /** O número do custo acompanha o símbolo se não tiver tamanho próprio; os de ataque/defesa ficam em 100%. */
  const numSize = (s: SizeSlot) => look.icons?.[s]?.numSize ?? (s === 'cost' ? iconSize(s) : 1);
  let split = $state<Partial<Record<SizeSlot, boolean>>>({});
  const isSplit = (s: SizeSlot) => split[s] ?? Math.abs(iconSize(s) - numSize(s)) > 0.001;
  /** Juntos: no custo o conjunto todo cresce (sem tamanho próprio do número); em ataque/defesa os dois recebem o mesmo valor. */
  function setBoth(s: SizeSlot, v: number) { if (s === 'cost') ed.setIcon(s, { size: v }, ['numSize']); else ed.setIcon(s, { size: v, numSize: v }); }
  function toggleSplit(s: SizeSlot) {
    const now = !isSplit(s);
    split[s] = now;
    // ao juntar de novo, o número volta a ter o tamanho do símbolo
    if (!now) setBoth(s, iconSize(s));
  }
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const val = (e: Event) => (e.currentTarget as HTMLInputElement).value;
</script>

<div class="stack">
  {#if !theme}
    <section class="where">
      <p class="note"><Info size={14} />
        <span>{L('Aqui você ajusta só esta carta, por cima do tema do deck. Para mudar o deck inteiro ou a coleção, use “Editar este deck” ou “Editar coleção” na Biblioteca.',
          'Here you tweak this card only, on top of the deck theme. To change the whole deck or the collection, use “Edit this deck” or “Edit collection” in the Library.')}</span></p>
      <div class="row wrap">
        <button class="btn sm" onclick={() => router.go(`/tema/deck/${encodeURIComponent(ed.draft.deckId)}`)}><Paintbrush size={14} /> {L('Editar o tema deste deck', 'Edit this deck\'s theme')}</button>
        {#if ed.draft.look}
          <button class="btn sm ghost" onclick={() => ed.resetCardLook()}><RotateCcw size={14} /> {L('Tirar os ajustes desta carta', 'Remove this card\'s tweaks')}</button>
        {/if}
      </div>
    </section>
  {/if}

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
          <span class="tint"><input type="color" value={c} oninput={(e) => setTint(i, val(e))} />
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

  <!-- Um seletor de cor: mostra a cor aplicada; o ponto marca que foi escolhida à mão; o botão volta ao padrão. -->
  {#snippet colorField(label: string, value: string, custom: boolean, set: (v: string) => void, reset: () => void, resetTip: string, off = '')}
    <div class="cf" class:off={!!off} title={off}>
      <span class="cf-l">{label}{#if custom}<i class="dot-ch" title={L('Escolhida por você', 'Chosen by you')}></i>{/if}</span>
      <div class="cf-r">
        <input type="color" {value} disabled={!!off} oninput={(e) => set(val(e))} />
        <code>{off ? '—' : value.toUpperCase()}</code>
        <button class="btn sm ghost icon" title={resetTip} disabled={!custom} onclick={reset}><RotateCcw size={13} /></button>
      </div>
    </div>
  {/snippet}

  <section class="stack s">
    <span class="section-title">{L('Peças (misture estilos à vontade)', 'Pieces (mix styles freely)')}</span>
    <div class="pieces">
      {#each PIECES as p (p.kind)}
        {@const slot = slotOf(p.kind)}
        {@const ch = ed.piece(open === p.kind ? slot : p.kind)}
        {@const st = ch.style ?? look.style}
        {@const isFrame = p.kind === 'frame'}
        {@const pc = ch.colors?.length ? ch.colors : colors}
        {@const changed = ed.pieceChanged(p.kind)}
        <div class="pc" class:open={open === p.kind}>
          <button class="pc-head" onclick={() => (open = open === p.kind ? null : p.kind)}>
            <span class="sw" style="background:{pc[0]}"></span>
            <b>{L(p.pt, p.en)}</b>
            {#if changed}<span class="dot-ch" title={L('Alterada desde que abriu', 'Changed since opened')}></span>{/if}
            <span class="muted">{isFrame && !frameShown ? L('desligada', 'off') : ch.hidden && !isFrame ? L('escondida', 'hidden') : ch.image ? (ch.image.mediaId ? L('imagem', 'image') : L('sem desenho', 'no drawing')) : STYLES.find((x) => x.id === st)?.name}</span>
            <ChevronDown size={16} />
          </button>
          {#if open === p.kind}
            {@const u = usedSlot(p.kind)}
            {@const op = ch.opacity ?? piece(st, p.kind).opacity}
            <div class="pc-body">
              <div class="row wrap">
                {#if isFrame}
                  <label class="toggle grow"><input type="checkbox" checked={frameShown}
                    onchange={(e) => (e.currentTarget as HTMLInputElement).checked ? ed.setPiece('frame', { style: look.style }, ['hidden']) : ed.setPiece('frame', { hidden: true })} />
                    {L('Mostrar a moldura', 'Show the border')}</label>
                {:else}
                  <label class="toggle grow"><input type="checkbox" checked={!ch.hidden} onchange={(e) => ed.setPiece(slot, { hidden: !(e.currentTarget as HTMLInputElement).checked })} />
                    {#if ch.hidden}<EyeOff size={14} />{:else}<Eye size={14} />{/if} {L('Mostrar esta peça', 'Show this piece')}</label>
                {/if}
                <button class="btn sm ghost" disabled={!changed} onclick={() => ed.revertPiece(p.kind)} title={L('Desfaz o que você mudou nesta peça desde que abriu a tela', 'Undo what you changed on this piece since opening')}><Undo2 size={14} /> {L('Desfazer', 'Undo')}</button>
                <button class="btn sm ghost" onclick={() => ed.resetPiece(p.kind)} title={L('Tira todos os ajustes desta peça: volta ao desenho do estilo geral', 'Remove every tweak on this piece: back to the overall style')}><RotateCcw size={14} /> {L('Padrão', 'Default')}</button>
              </div>

              {#if p.kind === 'stat'}
                <div class="field"><span>{L('O que você está ajustando', 'What you are adjusting')}</span>
                  <div class="seg full">
                    <button class:on={side === 'stat'} onclick={() => (side = 'stat')}>{L('Os dois', 'Both')}</button>
                    <button class:on={side === 'atk'} onclick={() => (side = 'atk')}>{L('Só o ataque', 'Attack only')}</button>
                    <button class:on={side === 'def'} onclick={() => (side = 'def')}>{L('Só a defesa', 'Defense only')}</button>
                  </div>
                  {#if side === 'stat' && statsDiffer}
                    <span class="muted small">{L('Ataque e defesa estão com cores diferentes: as cores abaixo são as do ataque. Mudar aqui iguala os dois.', 'Attack and defense have different colors: the ones below are the attack\'s. Changing here makes both equal.')}</span>
                  {/if}
                </div>
              {/if}

              <div class="field"><span>{L('Desenho da peça', 'Piece drawing')}</span>
                <div class="thumbs">
                  {#each STYLES as s (s.id)}
                    <button class="th" class:on={!ch.image && st === s.id} title={s.name} onclick={() => ed.setPiece(slot, { style: s.id }, ['image'])}>
                      {@html pieceThumb(s.id, p.kind, pc)}
                      <span>{s.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
              <PieceImagePanel {ed} {slot} />

              <div class="field"><span>{L('Cores', 'Colors')}</span>
                <div class="cfs">
                  {@render colorField(L('Cor da peça', 'Piece color'), pc[0], !!ch.colors,
                    (v) => ed.setPiece(slot, { colors: [v] }), () => ed.setPiece(slot, {}, ['colors']), L('Usar a cor da carta', 'Use the card color'))}
                  {#if !isFrame || fillOf(u)}
                    {@render colorField(L('Fundo', 'Background'), hex(ch.fill ?? fillOf(u), '#000000'), !!ch.fill,
                      (v) => ed.setPiece(slot, { fill: v }), () => ed.setPiece(slot, {}, ['fill']), L('Usar o fundo do estilo', 'Use the style background'),
                      ch.image ? L('Com imagem ou sem desenho, a peça não tem fundo para colorir.', 'With an image or no drawing, the piece has no background to color.')
                        : !ch.fill && !fillOf(u) ? L('Neste estilo, esta peça não tem fundo para colorir.', 'In this style, this piece has no background to color.') : '')}
                  {/if}
                  {#if !isFrame && p.kind !== 'set'}
                    {@render colorField(p.kind === 'cost' || p.kind === 'stat' ? L('Número', 'Number') : L('Texto', 'Text'), hex(ch.ink ?? inkOf(u), '#ffffff'), !!ch.ink,
                      (v) => ed.setPiece(slot, { ink: v }), () => ed.setPiece(slot, {}, ['ink']), L('Usar a cor do estilo', 'Use the style color'),
                      p.kind === 'class' ? L('O selo de classe só tem o símbolo: a cor dele fica em Símbolos.', 'The class seal only has the symbol: its color is under Symbols.') : '')}
                  {/if}
                </div>
              </div>

              <div class="grid2">
                <label class="field"><span>{L('Borda', 'Border')}</span>
                  <select class="select" value={ch.metal ?? ''} onchange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value as MetalKind; v ? ed.setPiece(slot, { metal: v }) : ed.setPiece(slot, {}, ['metal']); }}>
                    {#each BORDERS as [v, pt, en]}<option value={v}>{L(pt, en)}</option>{/each}
                  </select>
                </label>
                {#if !isFrame && p.kind !== 'set'}
                  <label class="field"><span>{L('Fonte', 'Font')}</span>
                    <select class="select" value={ch.font ?? ''} onchange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; v ? ed.setPiece(slot, { font: v }) : ed.setPiece(slot, {}, ['font']); }}>
                      <option value="">{L('Do estilo', 'Style default')}</option>
                      {#each FONTS as f}<option value={f} style="font-family:'{f}'">{f}</option>{/each}
                    </select>
                  </label>
                {/if}
              </div>
              <div class="sl"><span>{L('Opacidade do fundo', 'Background opacity')}</span>
                <input type="range" min="0" max="1" step="0.01" value={op} oninput={(e) => ed.setPiece(slot, { opacity: +val(e) })} />
                <button class="pct" title={L('Voltar ao padrão do estilo', 'Back to the style default')} disabled={ch.opacity == null} onclick={() => ed.setPiece(slot, {}, ['opacity'])}>{pct(op)}</button>
              </div>
              {#if !isFrame && p.kind !== 'rules'}
                {@const sz = ch.size ?? 1}
                <div class="sl"><span>{L('Tamanho da peça', 'Piece size')}</span>
                  <input type="range" min="0.5" max="1.6" step="0.05" value={sz} oninput={(e) => ed.setPiece(slot, { size: +val(e) })} />
                  <button class="pct" title={L('Voltar a 100%', 'Back to 100%')} disabled={ch.size == null} onclick={() => ed.setPiece(slot, {}, ['size'])}>{pct(sz)}</button>
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
      <div class="seg full wrapseg">
        {#each ICON_STYLES as s}<button class:on={iconStyle === s.id} onclick={() => setAllIconStyles(s.id)}>{L(s.name, s.en)}</button>{/each}
      </div>
    </div>

    <div class="field">
      <span>{L('Tamanhos (dentro da peça)', 'Sizes (inside the piece)')}</span>
      <div class="sizes">
        {#snippet sizePair(s: SizeSlot, label: string)}
          {@const sp = isSplit(s)}
          <div class="szg">
            <div class="szh"><span>{label}</span>
              <button class="link" class:on={!sp} onclick={() => toggleSplit(s)} title={sp ? L('Juntar: símbolo e número voltam a crescer juntos', 'Link: symbol and number grow together again') : L('Separar: ajustar o símbolo e o número cada um no seu tamanho', 'Unlink: size the symbol and the number separately')}>
                {#if sp}<Unlink2 size={13} /> {L('separados', 'separate')}{:else}<Link2 size={13} /> {L('juntos', 'linked')}{/if}</button>
            </div>
            {#if sp}
              <div class="sl"><span>{L('Símbolo', 'Symbol')}</span>
                <input type="range" min="0.5" max="1.8" step="0.05" value={iconSize(s)} oninput={(e) => ed.setIcon(s, { size: +val(e), numSize: numSize(s) })} />
                <button class="pct" title={L('Voltar a 100%', 'Back to 100%')} disabled={iconSize(s) === 1} onclick={() => ed.setIcon(s, { size: 1, numSize: numSize(s) })}>{pct(iconSize(s))}</button></div>
              <div class="sl"><span>{L('Número', 'Number')}</span>
                <input type="range" min="0.5" max="1.8" step="0.05" value={numSize(s)} oninput={(e) => ed.setIcon(s, { numSize: +val(e) })} />
                <button class="pct" title={L('Voltar a 100%', 'Back to 100%')} disabled={numSize(s) === 1} onclick={() => ed.setIcon(s, { numSize: 1 })}>{pct(numSize(s))}</button></div>
            {:else}
              <div class="sl"><span>{L('Símbolo e número', 'Symbol and number')}</span>
                <input type="range" min="0.5" max="1.8" step="0.05" value={iconSize(s)} oninput={(e) => setBoth(s, +val(e))} />
                <button class="pct" title={L('Voltar a 100%', 'Back to 100%')} disabled={iconSize(s) === 1} onclick={() => ed.setIcon(s, {}, ['size', 'numSize'])}>{pct(iconSize(s))}</button></div>
            {/if}
          </div>
        {/snippet}
        {#snippet sizeOne(s: 'class' | 'set', label: string)}
          <div class="szg"><div class="sl"><span>{label}</span>
            <input type="range" min="0.5" max="1.8" step="0.05" value={iconSize(s)} oninput={(e) => ed.setIcon(s, { size: +val(e) })} />
            <button class="pct" title={L('Voltar a 100%', 'Back to 100%')} disabled={iconSize(s) === 1} onclick={() => ed.setIcon(s, {}, ['size'])}>{pct(iconSize(s))}</button></div></div>
        {/snippet}
        {@render sizePair('cost', L('Custo', 'Cost'))}
        {@render sizeOne('class', L('Classe', 'Class'))}
        {@render sizePair('atk', L('Ataque', 'Attack'))}
        {@render sizePair('def', L('Defesa', 'Defense'))}
        {@render sizeOne('set', L('Selo da edição', 'Set symbol'))}
      </div>
    </div>

    <label class="toggle"><input type="checkbox" checked={look.icons?.hideZeroCost ?? STYLES.find((x) => x.id === look.style)?.hideZeroCost ?? false}
      onchange={(e) => ed.setIconOption('hideZeroCost', (e.currentTarget as HTMLInputElement).checked)} />
      {L('Esconder o selo de custo quando o custo for 0 (a barra do nome ocupa o espaço)', 'Hide the cost seal when the cost is 0 (the title bar takes the space)')}</label>

    <!-- Um símbolo: qual desenho, de que cor, ou uma imagem sua. Fechado, mostra o que está em uso. -->
    {#snippet picker(key: IconKey, title: string, ids: string[], applied: string)}
      {@const pk = pickOf(key)}
      {@const cur = pk.glyph ?? ids[0]}
      {@const im = pk.image}
      {@const custom = !!(pk.glyph || pk.color || pk.image)}
      <div class="pc" class:open={openSym === key}>
        <button class="pc-head" onclick={() => (openSym = openSym === key ? null : key)}>
          <span class="cur">{#if im && symUrl(im.mediaId)}<img src={symUrl(im.mediaId)} alt="" />{:else}<Glyph id={cur} size={20} color={applied} />{/if}</span>
          <b>{title}</b>
          {#if custom}<span class="dot-ch" title={L('Escolhido por você', 'Chosen by you')}></span>{/if}
          <span class="muted">{im ? L('imagem sua', 'your image') : iconName(cur, app.lang !== 'pt-BR')}</span>
          <ChevronDown size={16} />
        </button>
        {#if openSym === key}
          <div class="pc-body">
            <div class="glyphs" class:dim={!!im}>
              {#each ids as g}
                <button class="gl" class:on={!im && cur === g} title={iconName(g, app.lang !== 'pt-BR')} onclick={() => writeIcon(key, { glyph: g }, ['image'])}><Glyph id={g} size={26} color={applied} /></button>
              {/each}
            </div>
            <div class="cfs">
              {@render colorField(L('Cor do símbolo', 'Symbol color'), hex(pk.color ?? applied, '#ffffff'), !!pk.color,
                (v) => writeIcon(key, { color: v }), () => writeIcon(key, {}, ['color']), L('Usar a cor padrão', 'Use the default color'),
                im && !im.recolor ? L('A imagem está com as cores originais. Marque “Pintar na cor escolhida” para usar esta cor.', 'The image keeps its own colors. Check “Paint with the chosen color” to use this one.') : '')}
            </div>
            <div class="row wrap symrow">
              {#if im}
                <span class="symimg">{#if symUrl(im.mediaId)}<img src={symUrl(im.mediaId)} alt="" />{/if}</span>
                <label class="toggle"><input type="checkbox" checked={!!im.recolor} onchange={(e) => writeIcon(key, { image: { ...im, recolor: (e.currentTarget as HTMLInputElement).checked } })} />
                  {L('Pintar na cor escolhida', 'Paint with the chosen color')}</label>
                <button class="btn sm ghost" onclick={() => pickSymbol(key)}><ImagePlus size={14} /> {L('Trocar', 'Change')}</button>
                <button class="btn sm ghost" onclick={() => writeIcon(key, {}, ['image'])}><Trash2 size={14} /> {L('Tirar a imagem', 'Remove image')}</button>
              {:else}
                <button class="btn sm ghost" onclick={() => pickSymbol(key)} title={L('PNG/SVG com fundo transparente; colorido ou de uma cor só', 'PNG/SVG with transparent background; full color or single color')}><ImagePlus size={14} /> {L('Usar uma imagem minha (PNG)', 'Use my own image (PNG)')}</button>
              {/if}
              <span class="grow"></span>
              <button class="btn sm ghost" disabled={!custom} onclick={() => writeIcon(key, {}, ['glyph', 'color', 'image'])}><RotateCcw size={14} /> {L('Padrão', 'Default')}</button>
            </div>
          </div>
        {/if}
      </div>
    {/snippet}

    <input type="file" accept="image/png,image/webp,image/svg+xml" hidden bind:this={symInput} onchange={(e) => uploadSymbol((e.currentTarget as HTMLInputElement).files)} />
    <div class="field">
      <span>{L('Qual símbolo', 'Which symbol')}</span>
      {#if theme && resources.length + classes.length > 2}
        <span class="muted small">{L('Há um símbolo para cada recurso e para cada classe: cada carta mostra os do recurso que ela custa e da classe dela.', 'There is one symbol per resource and per class: each card shows the ones for the resource it costs and for its class.')}</span>
      {/if}
      <div class="pieces">
        {#each resources as r (r)}
          {@render picker(`res:${r}`, `${L('Custo', 'Cost')} — ${RESOURCES[r].name[app.lang]}`, resourceChoices(r), used.icon[`res:${r}`] ?? resPick(r).color ?? RESOURCE_COLORS[r])}
        {/each}
        {#each classes as c (c)}
          {@render picker(`cls:${c}`, `${L('Classe', 'Class')} — ${COLORS[c].classes[app.lang]}`, classChoices(c), hex(clsPick(c).color ?? used.icon[`cls:${c}`], lighten(vivid(colorHex(c)), 0.3)))}
        {/each}
        {#if ed.draft.stats || theme}
          {@render picker('atk', L('Ataque', 'Attack'), ATK_CHOICES, hex(used.icon.atk, '#d3dae3'))}
          {@render picker('def', L('Defesa', 'Defense'), DEF_CHOICES, hex(used.icon.def, '#d3dae3'))}
        {/if}
      </div>
    </div>
    {#if ed.draft.colors.length > 1}
      <label class="toggle"><input type="checkbox" checked={look.icons?.classMode !== 'primeira'} onchange={(e) => ed.setIconOption('classMode', (e.currentTarget as HTMLInputElement).checked ? 'todas' : 'primeira')} />
        {L('Mostrar o símbolo de cada classe da carta (o selo se alarga)', 'Show a symbol for each of the card\'s classes (the seal widens)')}</label>
    {/if}
    {#if ed.draft.stats || theme}
      <div class="field"><span>{L('Como mostrar ataque e defesa', 'How to show attack and defense')}</span>
        <div class="seg full">
          <button class:on={(look.icons?.statMode ?? 'placa') === 'placa'} onclick={() => ed.setIconOption('statMode', 'placa')}>{L('Em placas', 'In plates')}</button>
          <button class:on={look.icons?.statMode === 'emblema'} onclick={() => ed.setIconOption('statMode', 'emblema')}>{L('Número no medalhão', 'Number in medallion')}</button>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .where { display: flex; flex-direction: column; gap: 8px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
  .note { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: var(--text-2); margin: 0; padding: 9px 11px; border-radius: 9px; background: var(--surface); border: 1px solid var(--line); }
  .note :global(svg) { flex: none; margin-top: 2px; color: var(--accent); }
  .symrow { gap: 8px; align-items: center; }
  .symimg { width: 34px; height: 34px; border-radius: 6px; border: 1px solid var(--line-2); display: grid; place-items: center; overflow: hidden; background: repeating-conic-gradient(#3a3a3a 0 25%, #2a2a2a 0 50%) 0 0 / 10px 10px; }
  .symimg img { max-width: 100%; max-height: 100%; }
  .full { display: flex; width: 100%; }
  .full button { flex: 1; justify-content: center; }
  .wrapseg { flex-wrap: wrap; }
  .wrapseg button { flex: 1 1 30%; }
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
  .pc-head > :global(svg) { color: var(--muted); transition: transform var(--t); }
  .pc.open .pc-head > :global(svg) { transform: rotate(180deg); }
  .cur { width: 24px; height: 24px; display: grid; place-items: center; flex: none; }
  .cur img { max-width: 100%; max-height: 100%; }
  .dot-ch { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex: none; }
  .sw { width: 14px; height: 14px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgb(255 255 255 / .2); }
  .pc-body { padding: 4px 12px 14px; display: flex; flex-direction: column; gap: 12px; }
  .thumbs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .th { display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 9px; border: 1px solid var(--line); background: var(--bg-2); color: var(--muted); cursor: pointer; font: 500 11px var(--ui); }
  .th :global(svg) { width: 100%; height: 54px; display: block; border-radius: 5px; }
  .th.on { border-color: var(--accent); color: var(--accent-2); }
  .toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .glyphs { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .glyphs.dim { opacity: .5; }
  .gl { width: 42px; height: 42px; border-radius: 10px; border: 1px solid var(--line-2); background: var(--bg-2); display: grid; place-items: center; cursor: pointer; }
  .gl:hover { border-color: #4a413c; background: var(--surface-2); }
  .gl.on { border-color: var(--accent); background: var(--accent-soft); }

  /* seletores de cor: rótulo em cima, cor + código + voltar ao padrão */
  .cfs { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
  .cf { display: flex; flex-direction: column; gap: 5px; padding: 8px; border-radius: 9px; border: 1px solid var(--line); background: var(--bg-2); min-width: 0; }
  .cf.off { opacity: .5; }
  .cf-l { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: var(--muted); }
  .cf-r { display: flex; align-items: center; gap: 6px; }
  .cf-r input[type=color] { width: 30px; height: 30px; flex: none; }
  .cf-r code { flex: 1; font: 500 11px ui-monospace, monospace; color: var(--text-2); min-width: 0; overflow: hidden; }

  /* controles deslizantes: rótulo, barra, valor (clicar no valor volta ao padrão) */
  .sl { display: grid; grid-template-columns: 124px 1fr 52px; align-items: center; gap: 10px; font-size: 12.5px; color: var(--text-2); }
  .pct { border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text-2); border-radius: 7px; font: 500 12px var(--ui); padding: 3px 0; cursor: pointer; font-variant-numeric: tabular-nums; }
  .pct:disabled { opacity: .55; cursor: default; }
  .sizes { display: flex; flex-direction: column; gap: 6px; }
  .szg { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 9px; border: 1px solid var(--line); background: var(--surface); }
  .szh { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 600; color: var(--text); }
  .link { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 8px; border-radius: 99px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--text-2); font: 500 11.5px var(--ui); cursor: pointer; }
  .link.on { color: var(--accent-2); border-color: rgb(216 176 106 / .5); background: var(--accent-soft); }
</style>
