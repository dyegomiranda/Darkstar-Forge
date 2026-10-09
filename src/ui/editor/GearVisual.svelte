<script lang="ts">
  import { L } from '../../app/i18n.svelte';
  import { equipmentLook, VISUAL_SLOTS } from '../../avatar/equipment';
  import { LPC, colorsOf, type Part, type SlotId } from '../../avatar/lpc';
  import type { Card } from '../../model/types';
  let { card, tag, onchange }: { card: Card; tag: string; onchange: (parts: Partial<Record<SlotId, Part>>) => void } = $props();
  const slots = $derived(LPC.slots.filter((s) => VISUAL_SLOTS[tag]?.includes(s.id)));
  const appearance = $derived(equipmentLook(card));
  function choose(slot: SlotId, id: string) {
    const next = { ...appearance };
    if (id) next[slot] = { id }; else delete next[slot];
    onchange(next);
  }
</script>
<div class="stack s">
  <span class="section-title">{L('Visual no personagem', 'Character appearance')}</span>
  {#each slots as slot (slot.id)}
    <label class="field"><span>{L(slot.pt, slot.en)}</span>
      <select class="select" value={appearance[slot.id]?.id ?? ''} onchange={(e) => choose(slot.id, e.currentTarget.value)}>
        <option value="">{L('Sem camada visual', 'No visual layer')}</option>
        {#each slot.items as item (item.id)}<option value={item.id}>{L(item.pt, item.en)}</option>{/each}
      </select>
    </label>
    {@const item = slot.items.find((i) => i.id === appearance[slot.id]?.id)}
    {#if item && colorsOf(item, slot.id).length}
      <label class="field"><span>{L('Cor', 'Color')}</span><select class="select" value={appearance[slot.id]?.color ?? ''} onchange={(e) => onchange({ ...appearance, [slot.id]: { ...appearance[slot.id]!, color: e.currentTarget.value || undefined } })}>
        <option value="">{L('Original', 'Original')}</option>
        {#each colorsOf(item, slot.id) as color}<option value={color.name}>{color.name}</option>{/each}
      </select></label>
    {/if}
  {/each}
  <small class="muted">{L('Usado quando “Mostrar itens equipados” está ativo. Peças incompatíveis com o corpo ficam sem camada. Anéis não possuem sprite neste acervo.', 'Used when “Show equipped items” is enabled. Parts incompatible with the body have no layer. Rings have no sprite in this collection.')}</small>
</div>
