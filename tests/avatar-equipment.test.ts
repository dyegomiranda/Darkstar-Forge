import { describe, expect, it } from "vitest";
import { avatarForCharacter, equipmentLook, EQUIPMENT_LOOKS } from "../src/avatar/equipment";
import { defaultAvatar, itemOf } from "../src/avatar/lpc";
import { protoEquipment } from "../src/model/equipment";
import type { Character } from "../src/model/types";
const cards = Object.fromEntries(protoEquipment("test").cards.map((c) => [c.id, c]));
const hero = (): Character => ({ id: "h", name: "Hero", raceId: "human", classColors: ["red"], level: 1, hp: 10, stats: {str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1}, slots: {}, notes: "", avatar: defaultAvatar() });
describe("visual do equipamento", () => {
  it("preserva a aparência escolhida por padrão e ao desligar a opção", () => {
    const h = hero(), saved = structuredClone(h.avatar);
    h.slots.mainHand = "eq-dagger";
    expect(avatarForCharacter(h, cards)).toEqual(saved);
    h.showEquipped = true;
    expect(avatarForCharacter(h, cards)?.parts.weapon?.id).toBe("weapon_sword_dagger");
    expect(h.avatar).toEqual(saved);
    h.showEquipped = false;
    expect(avatarForCharacter(h, cards)).toEqual(saved);
  });
  it("retira roupa cosmética dos espaços vazios e mantém anatomia", () => {
    const h = hero(); h.showEquipped = true;
    h.avatar!.parts.horns = { id: "head_horns_curled" };
    const result = avatarForCharacter(h, cards)!;
    expect(result.parts.torso).toBeUndefined();
    expect(result.parts.legs).toBeUndefined();
    expect(result.parts.hair).toEqual(h.avatar!.parts.hair);
    expect(result.parts.horns).toEqual(h.avatar!.parts.horns);
    expect(result.parts.hair).not.toBe(h.avatar!.parts.hair);
  });
  it("compõe peças de vários espaços e ignora mão secundária com duas mãos", () => {
    const h = hero(); h.showEquipped = true;
    h.slots = { mainHand: "eq-longsword", offHand: "eq-shield", chest: "eq-plate", feet: "eq-ironboots" };
    expect(avatarForCharacter(h, cards)?.parts.shield).toBeDefined();
    expect(avatarForCharacter(h, cards)?.parts.torso?.id).toBe("torso_armour_plate");
    h.slots.mainHand = "eq-greatsword";
    expect(avatarForCharacter(h, cards)?.parts.shield).toBeUndefined();
  });
  it("objeto visual vazio remove o sprite padrão; peças inválidas não aparecem", () => {
    const h = hero(); h.showEquipped = true; h.slots.mainHand = "eq-dagger";
    const overridden = { ...cards, "eq-dagger": { ...cards["eq-dagger"], gear: { ...cards["eq-dagger"].gear, appearance: {} } } };
    expect(avatarForCharacter(h, overridden)?.parts.weapon).toBeUndefined();
    overridden["eq-dagger"].gear.appearance = { weapon: { id: "missing" }, torso: { id: "torso_clothes_robe" } } as {};
    expect(avatarForCharacter(h, overridden)?.parts.weapon).toBeUndefined();
    expect(avatarForCharacter(h, overridden)?.parts.torso).toBeUndefined();
  });
  it("todas as correspondências apontam para sprites existentes", () => {
    for (const look of Object.values(EQUIPMENT_LOOKS)) for (const [slot, part] of Object.entries(look)) {
      expect(itemOf(slot as Parameters<typeof itemOf>[0], part!.id), part!.id).toBeDefined();
    }
  });
});

it("não deixa camadas vazias da prévia ocultarem equipamento em produção", () => {
 for (const card of Object.values(cards)) for (const [slot,look] of Object.entries(equipmentLook(card))) {
  expect(itemOf(slot as Parameters<typeof itemOf>[0],look!.id)?.layers.length, card.id).toBeGreaterThan(0);
 }
});
