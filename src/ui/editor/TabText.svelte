<script lang="ts">
  import { L } from '../../app/i18n.svelte';
  import { CARD_TYPES, RESOURCES } from '../../model/catalog';
  import { RESOURCE_COLORS, RESOURCE_IDS, resourceIcon } from '../../render/icons/glyphs';
  import { applyScoring } from '../../model/scoring';
  import Glyph from '../common/Glyph.svelte';
  import type { EditorState } from './editor.svelte';

  let { ed }: { ed: EditorState } = $props();

  let rules: HTMLTextAreaElement;
  const t = $derived(ed.draft.text[ed.lang]);
  const other = $derived(ed.lang === 'pt-BR' ? 'en-US' : 'pt-BR');

  /** Tipos que lutam: escolher um deles liga ATK/DEF automaticamente. */
  const COMBAT_TYPES = new Set(['Criatura', 'Aliado', 'Mercenário']);

  const typeIdx = $derived(CARD_TYPES.findIndex((ct) => ct[ed.lang] === t.type));

  function setType(v: string) {
    if (v === 'other') { t.type = ''; ed.touch(); return; }
    const ct = CARD_TYPES[+v];
    // o tipo é o mesmo nos dois idiomas: troca os dois juntos
    ed.draft.text['pt-BR'].type = ct['pt-BR'];
    ed.draft.text['en-US'].type = ct['en-US'];
    if (COMBAT_TYPES.has(ct['pt-BR']) && !ed.draft.stats) toggleStats(true);
    ed.touch();
  }

  function toggleStats(on: boolean) {
    ed.draft.stats = on ? (ed.draft.stats ?? { atk: 1, def: 1 }) : null;
    applyScoring(ed.draft);
    ed.touch();
  }

  /** Insere {recurso} na posição do cursor — vira o símbolo na carta. */
  function insert(token: string) {
    const s = rules.selectionStart, e = rules.selectionEnd;
    t.rules = t.rules.slice(0, s) + `{${token}}` + t.rules.slice(e);
    ed.touch();
    requestAnimationFrame(() => { rules.focus(); rules.selectionStart = rules.selectionEnd = s + token.length + 2; });
  }
</script>

<div class="stack">
  <div class="row between">
    <span class="section-title">{L('Idioma do texto da carta', 'Card text language')}</span>
    <div class="seg">
      <button class:on={ed.lang === 'pt-BR'} onclick={() => (ed.lang = 'pt-BR')}>Português</button>
      <button class:on={ed.lang === 'en-US'} onclick={() => (ed.lang = 'en-US')}>English</button>
    </div>
  </div>

  <label class="field"><span>{L('Nome', 'Name')}</span>
    <input class="input big" bind:value={t.name} oninput={() => ed.touch()} placeholder={ed.draft.text[other].name} />
  </label>

  <div class="grid2">
    <div class="field"><span>{L('Tipo', 'Type')}</span>
      <select class="select" value={typeIdx >= 0 ? String(typeIdx) : 'other'} onchange={(e) => setType((e.currentTarget as HTMLSelectElement).value)}>
        {#each CARD_TYPES as ct, i}<option value={String(i)}>{ct[ed.lang]}</option>{/each}
        <option value="other">{L('Outro (digitar)…', 'Other (type it)…')}</option>
      </select>
      {#if typeIdx < 0}
        <input class="input" bind:value={t.type} oninput={() => ed.touch()} placeholder={L('Nome do tipo', 'Type name')} />
      {/if}
    </div>
    <label class="field"><span>{L('Subtipo', 'Subtype')}</span>
      <input class="input" bind:value={t.subtype} oninput={() => ed.touch()} placeholder={L('ex.: Bárbaro, Morto-vivo', 'e.g. Barbarian, Undead')} />
    </label>
  </div>
  <label class="toggle">
    <input type="checkbox" checked={!!ed.draft.stats} onchange={(e) => toggleStats((e.currentTarget as HTMLInputElement).checked)} />
    {L('Tem ataque e defesa (ATK/DEF)', 'Has attack and defense (ATK/DEF)')}
  </label>

  <div class="field">
    <span>{L('Regras', 'Rules')}</span>
    <textarea class="textarea" rows="6" bind:this={rules} bind:value={t.rules} oninput={() => ed.touch()}></textarea>
    <div class="tokens">
      <span class="muted small">{L('Inserir símbolo:', 'Insert symbol:')}</span>
      {#each RESOURCE_IDS as r}
        <button class="tok" title={RESOURCES[r].name[ed.lang]} onclick={() => insert(r)}>
          <Glyph id={resourceIcon(r)!} size={17} color={RESOURCE_COLORS[r]} />
        </button>
      {/each}
    </div>
    <span class="muted small">{L('Quebra de linha = novo parágrafo. {mana}, {vigor}… viram símbolos.', 'Line break = new paragraph. {mana}, {vigor}… become symbols.')}</span>
  </div>

  <label class="field"><span>{L('Ambientação (texto em itálico)', 'Flavor text (italic)')}</span>
    <textarea class="textarea" rows="3" bind:value={t.flavor} oninput={() => ed.touch()}></textarea>
  </label>

  {#if !ed.draft.text[other].rules && t.rules}
    <p class="note">
      {other === 'en-US' ? L('A versão em inglês ainda está sem regras.', 'The English version has no rules yet.') : L('A versão em português ainda está sem regras.', 'The Portuguese version has no rules yet.')}
      <button class="btn sm ghost" onclick={() => (ed.lang = other)}>{other === 'en-US' ? L('Editar em inglês', 'Edit English') : L('Editar em português', 'Edit Portuguese')}</button>
    </p>
  {/if}
</div>

<style>
  .between { justify-content: space-between; flex-wrap: wrap; }
  .big { height: 42px; font-size: 16px; font-weight: 500; }
  .tokens { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
  .tok { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); cursor: pointer; }
  .tok:hover { background: var(--surface-3); border-color: #4a413c; }
  .small { font-size: 12px; }
  .toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .note { font-size: 12.5px; color: #e8b25a; background: rgb(232 178 90 / .08); border: 1px solid rgb(232 178 90 / .25); border-radius: 8px; padding: 8px 10px; margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
</style>
