/* ==========================================================
   Tags do sistema + defaults de equipamento por slot
========================================================== */

var TagSystem = {

    DEFAULTS: [
        { id: "creature", label: { "pt-BR": "Criatura", "en-US": "Creature" } },
        { id: "spell", label: { "pt-BR": "Magia", "en-US": "Spell" } },
        { id: "action", label: { "pt-BR": "Ação", "en-US": "Action" } },
        { id: "ability", label: { "pt-BR": "Habilidade", "en-US": "Ability" } },
        { id: "mercenary", label: { "pt-BR": "Mercenário", "en-US": "Mercenary" } },
        { id: "resource", label: { "pt-BR": "Recurso", "en-US": "Resource" } },
        { id: "equipment", label: { "pt-BR": "Equipamento", "en-US": "Equipment" } },
        { id: "weapon", label: { "pt-BR": "Arma", "en-US": "Weapon" } },
        { id: "offhand", label: { "pt-BR": "Mão secundária", "en-US": "Off-hand" } },
        { id: "head", label: { "pt-BR": "Cabeça", "en-US": "Head" } },
        { id: "chest", label: { "pt-BR": "Peito", "en-US": "Chest" } },
        { id: "hands", label: { "pt-BR": "Mãos", "en-US": "Hands" } },
        { id: "legs", label: { "pt-BR": "Pernas", "en-US": "Legs" } },
        { id: "feet", label: { "pt-BR": "Pés", "en-US": "Feet" } },
        { id: "amulet", label: { "pt-BR": "Amuleto", "en-US": "Amulet" } },
        { id: "ring", label: { "pt-BR": "Anel", "en-US": "Ring" } },
        { id: "enchantment", label: { "pt-BR": "Encantamento", "en-US": "Enchantment" } },
        { id: "summon", label: { "pt-BR": "Invocação", "en-US": "Summon" } }
    ],

    /** Quais tags um slot aceita */
    SLOT_TAGS: {
        mainHand: ["weapon"],
        offHand: ["offhand", "weapon"],
        head: ["head"],
        chest: ["chest"],
        hands: ["hands"],
        legs: ["legs"],
        feet: ["feet"],
        amulet: ["amulet"],
        ring1: ["ring"],
        ring2: ["ring"]
    },

    ensure() {
        if (!Store.project.meta.tags || !Store.project.meta.tags.length) {
            Store.project.meta.tags = this.DEFAULTS.map((t) => ({
                id: t.id,
                label: { ...t.label }
            }));
        }
        return Store.project.meta.tags;
    },

    list() {
        return this.ensure();
    },

    label(id) {
        const lang = (typeof I18n !== "undefined" && I18n.lang) || "pt-BR";
        const t = this.list().find((x) => x.id === id);
        if (!t) return id;
        return t.label?.[lang] || t.label?.["pt-BR"] || t.id;
    },

    cardsForSlot(slotKey) {
        const allowed = this.SLOT_TAGS[slotKey] || [];
        return Store.listCards({}).filter((c) => {
            if (c.category !== "equipment" && c.deckId !== "deck_equipment") return false;
            const tags = c.tags || [];
            if (!tags.length) return false;
            return tags.some((t) => allowed.includes(t));
        });
    },

    add(id, labelPt, labelEn) {
        this.ensure();
        const clean = String(id || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, "");
        if (!clean) throw new Error("ID inválido");
        if (this.list().some((t) => t.id === clean)) throw new Error("Tag já existe");
        Store.project.meta.tags.push({
            id: clean,
            label: {
                "pt-BR": labelPt || clean,
                "en-US": labelEn || labelPt || clean
            }
        });
        Store.save();
        return clean;
    },

    update(id, labelPt, labelEn) {
        const t = this.list().find((x) => x.id === id);
        if (!t) return;
        t.label = t.label || {};
        if (labelPt != null) t.label["pt-BR"] = labelPt;
        if (labelEn != null) t.label["en-US"] = labelEn;
        Store.save();
    },

    remove(id) {
        // não remove defaults estruturais de slot se quiser — permite, mas avisa no UI
        this.ensure();
        Store.project.meta.tags = Store.project.meta.tags.filter((t) => t.id !== id);
        Store.save();
    }
};
