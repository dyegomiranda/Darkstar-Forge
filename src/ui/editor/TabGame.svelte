<script lang="ts">
  import { Hash, Minus, Plus, Repeat, Sparkles, Search, Trash2, X } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { COLORS, RARITIES, RARITY_ORDER, RESOURCES, colorHex } from '../../model/catalog';
  import { evaluate, FREE_POINTS, MECHANICS, POINTS_PER_COST, rarityFor } from '../../model/scoring';
  import type { ColorId, CostPart, ResourceId } from '../../model/types';
  import { costTotal, MAX_COST_PARTS, setTotal } from '../../model/cost';
  import { MAX_REPEAT } from '../../render/costSeal';
  import { classIcon, RESOURCE_COLORS, RESOURCE_IDS, resourceIcon } from '../../render/icons/glyphs';
  import { lighten } from '../../render/color';
  import { vivid } from '../../render/palette';
  import Glyph from '../common/Glyph.svelte';
  import type { EditorState } from './editor.svelte';

  let { ed }: { ed: EditorState } = $props();

  const d = $derived(ed.draft);
  const ev = $derived(evaluate(d, { atk: L('Ataque', 'Attack'), def: L('Defesa', 'Defense') }));
  let mq = $state('');
  let tagInput = $state('');

  const COLOR_IDS = Object.keys(COLORS) as ColorId[];

  const MAX_COLORS = 5;

  /** Clique acrescenta a cor (até 5, na ordem dos cliques); clicar de novo tira. */
  function toggleColor(c: ColorId) {
    if (d.colors.includes(c)) { if (d.colors.length > 1) d.colors = d.colors.filter((x) => x !== c); }
    else if (d.colors.length < MAX_COLORS) d.colors = [...d.colors, c];
    ed.touch();
  }

  function step(field: 'atk' | 'def', delta: number) {
    if (d.stats) d.stats[field] = Math.max(0, d.stats[field] + delta);
    sync();
  }

  // ── custos (vários por carta) ──
  /** Qual linha de custo está com a grade de recursos aberta. */
  let resOpen = $state(-1);

  /** Recurso sugerido para um custo novo: o da classe da carta ainda não usado. */
  function nextResource(): ResourceId {
    const used = new Set(d.cost.map((p) => p.resource));
    const mine = d.colors.flatMap((c) => COLORS[c].resources);
    return mine.find((r) => !used.has(r)) ?? (RESOURCE_IDS as ResourceId[]).find((r) => !used.has(r)) ?? 'vigor';
  }

  function addCost() {
    if (d.cost.length >= MAX_COST_PARTS) return;
    const part: CostPart = { resource: nextResource(), amount: d.cost.length ? 1 : ev.suggestedCost, show: 'number' };
    d.cost = [...d.cost, part];
    if (d.cost.length > 1) d.costMode = 'manual';
    sync();
  }

  function removeCost(i: number) {
    d.cost = d.cost.filter((_, k) => k !== i);
    resOpen = -1;
    sync();
  }

  function setAmount(i: number, v: number) {
    d.cost[i].amount = Math.max(0, Math.round(v) || 0);
    d.costMode = 'manual';
    sync();
  }

  /** Mantém custo/raridade automáticos coerentes enquanto edita. */
  function sync() {
    const e = evaluate(d);
    if (d.cost.length && d.costMode === 'auto') d.cost = setTotal(d.cost, e.suggestedCost);
    if (d.rarityMode === 'auto') d.rarity = rarityFor(e.suggestedCost, d.cost.length ? costTotal(d) : e.suggestedCost);
    ed.touch();
  }

  function toggleMech(id: string) {
    d.mechanics = d.mechanics.includes(id) ? d.mechanics.filter((m) => m !== id) : [...d.mechanics, id];
    sync();
  }

  const mechList = $derived(MECHANICS.filter((m) => !mq || `${m.name} ${m.en} ${m.desc} ${m.tags.join(' ')}`.toLowerCase().includes(mq.toLowerCase())));

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !d.tags.includes(t)) { d.tags = [...d.tags, t]; ed.touch(); }
    tagInput = '';
  }
</script>

<div class="stack">
  <section class="stack s">
    <span class="section-title">{L('Deck e classe', 'Deck & class')}</span>
    <label class="field"><span>{L('Deck', 'Deck')}</span>
      <select class="select" bind:value={d.deckId} onchange={() => ed.touch()}>
        {#each app.project?.editions ?? [] as edn (edn.id)}
          <optgroup label={L(`Coleção: ${edn.name}`, `Collection: ${edn.name}`)}>
            {#each app.decksOf(edn.id) as dk (dk.id)}<option value={dk.id}>{dk.name[app.lang]}</option>{/each}
          </optgroup>
        {/each}
      </select>
    </label>
    <p class="muted small">{L('Trocar o deck move a carta para ele: ela passa a usar o tema (aparência) desse deck.', 'Changing the deck moves the card there: it takes on that deck\'s theme (look).')}</p>
    <div class="field">
      <span>{L('Cores / classes da carta (até 5, na ordem dos cliques)', 'Card colors / classes (up to 5, in click order)')}</span>
      <div class="colors">
        {#each COLOR_IDS as c}
          {@const pos = d.colors.indexOf(c)}
          <button class="col" class:on={pos >= 0} style="--c:{colorHex(c)}" title={COLORS[c].classes[app.lang]} onclick={() => toggleColor(c)}>
            <Glyph id={classIcon(c)} size={20} color={lighten(vivid(colorHex(c)), 0.4)} />
            {#if pos >= 0 && d.colors.length > 1}<i>{pos + 1}</i>{/if}
          </button>
        {/each}
      </div>
      <span class="muted small">{L('Como as cores aparecem (mistura, dourado multicor, cor livre): aba Aparência.', 'How colors show (blend, multicolor gold, free color): Look tab.')}</span>
    </div>
  </section>

  <section class="stack s">
    <div class="row between">
      <span class="section-title">{L('Custo', 'Cost')}{#if d.cost.length > 1} · {L('total', 'total')} {costTotal(d)}{/if}</span>
      <label class="toggle"><input type="checkbox" checked={d.cost.length > 0} onchange={(e) => { if ((e.currentTarget as HTMLInputElement).checked) addCost(); else { d.cost = []; resOpen = -1; sync(); } }} /> {L('Tem custo', 'Has a cost')}</label>
    </div>
    {#each d.cost as part, i}
      <div class="cpart">
        <div class="row wrap cp-row">
          <button class="resb pick" class:on={resOpen === i} title={L('Trocar recurso', 'Change resource')} onclick={() => (resOpen = resOpen === i ? -1 : i)}>
            <Glyph id={resourceIcon(part.resource)!} size={22} color={RESOURCE_COLORS[part.resource]} />
          </button>
          <div class="stepper">
            <button onclick={() => setAmount(i, part.amount - 1)}><Minus size={15} /></button>
            <input type="number" min="0" value={part.amount} oninput={(e) => setAmount(i, +(e.currentTarget as HTMLInputElement).value)} />
            <button onclick={() => setAmount(i, part.amount + 1)}><Plus size={15} /></button>
          </div>
          <div class="seg" title={L('Como aparece na carta', 'How it shows on the card')}>
            <button class:on={part.show !== 'repeat'} onclick={() => { part.show = 'number'; ed.touch(); }}><Hash size={13} /> {L('Número', 'Number')}</button>
            <button class:on={part.show === 'repeat'} onclick={() => { part.show = 'repeat'; ed.touch(); }}><Repeat size={13} /> {L('Repetir símbolo', 'Repeat symbol')}</button>
          </div>
          <button class="btn ghost sm icon" title={L('Tirar este custo', 'Remove this cost')} onclick={() => removeCost(i)}><Trash2 size={15} /></button>
        </div>
        {#if part.show === 'repeat' && (part.amount < 1 || part.amount > MAX_REPEAT)}
          <p class="muted small">{L(`Repete até ${MAX_REPEAT} símbolos; acima disso (ou 0) aparece o número.`, `Repeats up to ${MAX_REPEAT} symbols; above that (or 0) the number shows.`)}</p>
        {/if}
        {#if resOpen === i}
          <div class="res">
            {#each RESOURCE_IDS as r}
              <button class="resb" class:on={part.resource === r} title={RESOURCES[r].name[app.lang]} onclick={() => { part.resource = r as ResourceId; resOpen = -1; ed.touch(); }}>
                <Glyph id={resourceIcon(r)!} size={20} color={RESOURCE_COLORS[r]} />
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
    {#if d.cost.length}
      <div class="row wrap">
        {#if d.cost.length < MAX_COST_PARTS}
          <button class="btn sm" onclick={addCost}><Plus size={14} /> {L('Outro recurso', 'Another resource')}</button>
        {/if}
        <div class="seg">
          <button class:on={d.costMode === 'auto'} onclick={() => { d.costMode = 'auto'; sync(); }}><Sparkles size={13} /> {L('Automático', 'Automatic')}</button>
          <button class:on={d.costMode === 'manual'} onclick={() => { d.costMode = 'manual'; sync(); }}>{L('Manual', 'Manual')}</button>
        </div>
      </div>
      <p class="muted small">{L('Sugerido pela pontuação', 'Suggested by score')}: <b>{ev.suggestedCost}</b> {L('no total', 'in total')}{#if d.cost.length > 1 && d.costMode === 'auto'} · {L('no automático, o primeiro recurso completa a diferença', 'in automatic, the first resource makes up the difference')}{/if}</p>
    {/if}
  </section>

  <section class="stack s">
    <div class="row between">
      <span class="section-title">{L('Ataque e defesa', 'Attack & defense')}</span>
      <label class="toggle"><input type="checkbox" checked={!!d.stats} onchange={(e) => { d.stats = (e.currentTarget as HTMLInputElement).checked ? { atk: 1, def: 1 } : null; sync(); }} /> {L('Mostrar', 'Show')}</label>
    </div>
    {#if d.stats}
      <div class="grid2">
        {#each [['atk', L('Ataque', 'Attack')], ['def', L('Defesa', 'Defense')]] as [k, label]}
          <div class="field"><span>{label}</span>
            <div class="stepper">
              <button onclick={() => step(k as 'atk', -1)}><Minus size={15} /></button>
              <input type="number" min="0" bind:value={d.stats[k as 'atk']} oninput={sync} />
              <button onclick={() => step(k as 'atk', 1)}><Plus size={15} /></button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="stack s">
    <span class="section-title">{L('Raridade', 'Rarity')}</span>
    <div class="rar">
      {#each RARITY_ORDER as r}
        <button class:on={d.rarity === r} style="--g:{RARITIES[r].color}" onclick={() => { d.rarity = r; d.rarityMode = 'manual'; ed.touch(); }}>
          <span class="gem"></span>{RARITIES[r].name[app.lang]}
        </button>
      {/each}
    </div>
    <label class="toggle"><input type="checkbox" checked={d.rarityMode === 'auto'} onchange={(e) => { d.rarityMode = (e.currentTarget as HTMLInputElement).checked ? 'auto' : 'manual'; sync(); }} />
      {L('Automática: quanto mais barata que o sugerido, mais rara', 'Automatic: the cheaper than suggested, the rarer')}</label>
  </section>

  <section class="stack s">
    <div class="score">
      <div class="big"><b>{ev.score}</b><span>{L('pontos', 'points')}</span></div>
      <div class="grow">
        <p class="small muted">{L(`${FREE_POINTS} ponto é grátis; depois, a cada ${POINTS_PER_COST} pontos, +1 de custo.`, `${FREE_POINTS} point is free; then every ${POINTS_PER_COST} points = +1 cost.`)} {L('Sugestão', 'Suggestion')}: <b>{ev.suggestedCost}</b>
          · {L('raridade pelo custo atual', 'rarity for current cost')}: <b style="color:{RARITIES[ev.suggestedRarity].color}">{RARITIES[ev.suggestedRarity].name[app.lang]}</b></p>
        <div class="bd">{#each ev.breakdown as b}<span class="chip">{b.label} <b>{b.points > 0 ? '+' : ''}{b.points}</b></span>{/each}</div>
      </div>
    </div>
  </section>

  <section class="stack s">
    <span class="section-title">{L('Mecânicas (somam pontos)', 'Mechanics (add points)')}</span>
    <label class="search"><Search size={15} /><input placeholder={L('Filtrar mecânicas…', 'Filter mechanics…')} bind:value={mq} /></label>
    <div class="mechs">
      {#each mechList as m (m.id)}
        <label class="mech" class:on={d.mechanics.includes(m.id)} title={m.desc}>
          <input type="checkbox" checked={d.mechanics.includes(m.id)} onchange={() => toggleMech(m.id)} />
          <span class="grow"><b>{L(m.name, m.en)}</b><small>{m.desc}</small></span>
          <span class="pts">{m.points > 0 ? '+' : ''}{m.points}</span>
        </label>
      {/each}
    </div>
  </section>

  <section class="stack s">
    <span class="section-title">{L('Etiquetas', 'Tags')}</span>
    <div class="bd">
      {#each d.tags as tg}<span class="chip on">{tg}<button class="x" onclick={() => { d.tags = d.tags.filter((x) => x !== tg); ed.touch(); }}><X size={12} /></button></span>{/each}
      <input class="input tagin" placeholder={L('nova etiqueta + Enter', 'new tag + Enter')} bind:value={tagInput} onkeydown={(e) => e.key === 'Enter' && addTag()} />
    </div>
  </section>
</div>

<style>
  .s { gap: 10px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .between { justify-content: space-between; }
  .wrap { flex-wrap: wrap; }
  .small { font-size: 12.5px; margin: 0; }
  .colors { display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px; }
  .col { position: relative; aspect-ratio: 1; border-radius: 10px; border: 1px solid var(--line-2); display: grid; place-items: center; cursor: pointer;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 45%, #000), color-mix(in srgb, var(--c) 18%, #000)); opacity: .55; transition: all var(--t); }
  .col:hover { opacity: .9; }
  .col.on { opacity: 1; border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
  .col i { position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font: 700 10px/16px var(--ui); font-style: normal; }
  .res { display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px; }
  .resb { aspect-ratio: 1; border-radius: 9px; border: 1px solid var(--line-2); background: var(--surface); display: grid; place-items: center; cursor: pointer; opacity: .6; }
  .resb.on { opacity: 1; border-color: var(--accent); background: var(--surface-3); }
  .resb.pick { width: 38px; height: 38px; opacity: 1; }
  .cpart { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg-2); }
  .cp-row { gap: 8px; align-items: center; }
  .stepper { display: inline-flex; align-items: center; border: 1px solid var(--line-2); border-radius: 8px; background: var(--bg-2); overflow: hidden; }
  .stepper button { width: 34px; height: 36px; border: 0; background: none; color: var(--text-2); cursor: pointer; display: grid; place-items: center; }
  .stepper button:hover { background: var(--surface-2); color: var(--text); }
  .stepper input { width: 52px; height: 36px; border: 0; border-left: 1px solid var(--line); border-right: 1px solid var(--line); background: none; color: var(--text); text-align: center; font: 600 16px var(--ui); appearance: textfield; }
  .stepper input::-webkit-inner-spin-button { display: none; }
  .toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .rar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .rar button { height: 38px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); color: var(--text-2); font: 500 12.5px var(--ui); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
  .rar button.on { border-color: var(--g); color: var(--text); background: color-mix(in srgb, var(--g) 12%, var(--surface)); }
  .gem { width: 10px; height: 10px; transform: rotate(45deg); background: var(--g); box-shadow: 0 0 6px var(--g); }
  .score { display: flex; gap: 14px; align-items: flex-start; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
  .big { display: flex; flex-direction: column; align-items: center; min-width: 58px; }
  .big b { font-size: 28px; line-height: 1; color: var(--accent-2); }
  .big span { font-size: 11px; color: var(--muted); }
  .bd { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; align-items: center; }
  .bd .chip { cursor: default; height: 26px; font-size: 12px; }
  .search { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--muted); }
  .search input { flex: 1; border: 0; background: none; color: var(--text); font: 13.5px var(--ui); outline: none; min-width: 0; }
  .mechs { max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; border: 1px solid var(--line); border-radius: 10px; padding: 4px; background: var(--bg-2); }
  .mech { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border-radius: 7px; cursor: pointer; }
  .mech:hover { background: var(--surface-2); }
  .mech.on { background: var(--accent-soft); }
  .mech b { font-size: 13px; font-weight: 500; display: block; }
  .mech small { font-size: 11.5px; color: var(--muted); }
  .pts { font: 600 12px var(--ui); color: var(--accent); min-width: 26px; text-align: right; }
  .x { border: 0; background: none; color: inherit; cursor: pointer; display: grid; padding: 0; }
  .tagin { width: 170px; height: 28px; font-size: 12.5px; border-radius: 99px; }
</style>
