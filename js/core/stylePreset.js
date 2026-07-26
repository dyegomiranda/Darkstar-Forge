/* ==========================================================
   Presets de estilo da carta — salvar / aplicar
========================================================== */

var StylePreset = {

    /** Campos de style + cores + layout relevantes */
    extract(card) {
        return {
            style: JSON.parse(JSON.stringify(card.style || {})),
            colorIds: [...(card.colorIds || [])],
            templateId: card.templateId || "classic-fullart",
            showCombat: !!card.showCombat
        };
    },

    apply(card, preset, { colors = true, style = true, template = true } = {}) {
        if (!preset) return card;
        if (style && preset.style) {
            card.style = { ...(card.style || {}), ...JSON.parse(JSON.stringify(preset.style)) };
        }
        if (colors && preset.colorIds) {
            card.colorIds = [...preset.colorIds];
        }
        if (template && preset.templateId) {
            card.templateId = preset.templateId;
        }
        return card;
    },

    list() {
        return Store.project?.meta?.stylePresets || [];
    },

    save(name, preset) {
        if (!Store.project.meta.stylePresets) Store.project.meta.stylePresets = [];
        const id = ID.create("preset");
        const entry = { id, name: name || "Preset", preset, createdAt: new Date().toISOString() };
        Store.project.meta.stylePresets.push(entry);
        Store.save();
        return entry;
    },

    remove(id) {
        if (!Store.project.meta.stylePresets) return;
        Store.project.meta.stylePresets = Store.project.meta.stylePresets.filter((p) => p.id !== id);
        Store.save();
    },

    applyToCards(preset, cards) {
        cards.forEach((c) => {
            this.apply(c, preset);
            c.updatedAt = new Date().toISOString();
        });
        Store.save();
    }
};
