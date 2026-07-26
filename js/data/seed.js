/* ==========================================================
   Seed — monta projeto a partir de SeedDecks (50/deck)
========================================================== */

var Seed = {

    _style() {
        return {
            panelOpacity: 0.72, strokeWidth: 2.4, glow: 8, rulesHeight: 300,
            fontTitle: 30, fontType: 25, fontRules: 23, fontFooter: 18, fontFlavor: 26,
            fontCost: 28, fontStat: 34,
            fontFamilyTitle: "comfortaa", fontFamilyType: "noto-sans",
            fontFamilyRules: "noto-sans", fontFamilyFooter: "source-sans",
            fontFamilyFlavor: "eb-garamond",
            iconResourceSize: 40, iconClassSize: 56, iconSetSize: 30, iconCombatSize: 40,
            autoRulesHeight: true
        };
    },

    _card(base) {
        const i18n = {
            "pt-BR": {
                name: base.name,
                type: base.type,
                subtype: base.subtype || "",
                rules: base.rules,
                flavor: base.flavor || ""
            },
            "en-US": {
                name: base.name_en || base.name,
                type: base.type_en || base.type,
                subtype: base.subtype_en || base.subtype || "",
                rules: base.rules_en || base.rules,
                flavor: base.flavor_en || base.flavor || ""
            }
        };
        const card = {
            id: ID.create("card"),
            editionId: "ed_primeira",
            templateId: "classic-fullart",
            // legado + i18n
            name: base.name,
            type: base.type,
            subtype: base.subtype || "",
            rules: base.rules,
            flavor: base.flavor || "",
            i18n,
            rarity: base.rarity || "common",
            collectorNumber: base.num || "001/050",
            footerText: "PT-BR · 1ª Ed.",
            colorIds: base.colorIds || ["red"],
            deckId: base.deckId,
            category: base.category || "deck",
            tags: base.tags || [],
            costs: base.costs || [{ resource: "vigor", amount: 1 }],
            showCombat: base.showCombat != null ? !!base.showCombat : !!(base.attack || base.defense),
            attack: base.attack ?? 0,
            defense: base.defense ?? 0,
            mechanics: base.mechanics || [],
            manualCost: false,
            manualRarity: false,
            autoCost: true,
            style: this._style(),
            art: {
                src: base.artData || null,
                zoom: 100, offsetX: 0, offsetY: 0, rotation: 0, mirror: false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (typeof Scoring !== "undefined") {
            Scoring.apply(card, { forceCost: true });
            if (base.rarity) { card.rarity = base.rarity; card.manualRarity = true; }
            if (base.forceCost && base.costs) {
                card.costs = JSON.parse(JSON.stringify(base.costs));
                card.manualCost = true;
                Scoring.apply(card);
            }
        }
        return card;
    },

    createProject() {
        const now = new Date().toISOString();
        // Só decks de classe (exclui orange/gear utilitários do catálogo)
        const CLASS_IDS = ["red", "blue", "green", "black", "purple", "white", "silver"];
        const colorDecks = CLASS_IDS.map((id) => {
            const c = Catalog.colors[id];
            return {
                id: `deck_${c.id}`,
                colorIds: [c.id],
                name: c.name,
                classes: c.classes,
                kind: "color",
                cardIds: []
            };
        });

        const project = {
            version: 3,
            meta: {
                name: "Darkstar Forge — Projeto",
                gameName: "",
                setSymbolDataUrl: null,
                icons: { resources: {}, classes: {}, set: null, rarities: {}, combat: {} },
                customTemplates: [],
                customFonts: [],
                stylePresets: [],
                tags: (typeof TagSystem !== "undefined" ? TagSystem.DEFAULTS.map((t) => ({ id: t.id, label: { ...t.label } })) : []),
                createdAt: now,
                updatedAt: now
            },
            editions: [{
                id: "ed_primeira",
                name: "Primeira Edição",
                code: "1ED",
                footerText: "PT-BR · 1ª Ed.",
                decks: [
                    ...colorDecks,
                    { id: "deck_resources", colorIds: ["orange"], name: "Recursos", classes: "Ouro, poções e utilitários", kind: "resources", cardIds: [] },
                    { id: "deck_equipment", colorIds: ["gear"], name: "Equipamentos", classes: "Itens (cor = sinergia de classe)", kind: "equipment", cardIds: [] }
                ]
            }],
            cards: {},
            characters: [{
                id: "char_1",
                name: "Aventureiro",
                raceId: "",
                raceCustom: "",
                level: 1,
                hp: (typeof Races !== "undefined" ? Races.suggestedHp("", 1) : 30),
                maxHp: (typeof Races !== "undefined" ? Races.suggestedHp("", 1) : 30),
                stats: (typeof Races !== "undefined" ? Races.suggestedStats("") : { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }),
                resources: {},
                slots: {
                    mainHand: null, offHand: null, head: null, chest: null, hands: null,
                    legs: null, feet: null, amulet: null, ring1: null, ring2: null
                },
                notes: ""
            }]
        };

        const data = (typeof SeedDecks !== "undefined") ? SeedDecks : {};
        Object.keys(data).forEach((deckId) => {
            const deck = project.editions[0].decks.find((d) => d.id === deckId);
            const defs = data[deckId];
            if (!deck || !defs) return;
            defs.forEach((def, i) => {
                let colorIds = def.colorIds;
                // Equipamentos: cor/ícone pela sinergia de classe
                let classAffinity = def.classAffinity;
                if (deckId === "deck_equipment" && typeof Catalog.equipmentClassFor === "function") {
                    classAffinity = classAffinity || Catalog.equipmentClassFor(def);
                    colorIds = [classAffinity];
                }
                if (deckId === "deck_resources") {
                    colorIds = ["orange"];
                }
                const card = this._card({
                    ...def,
                    colorIds,
                    classAffinity,
                    deckId,
                    num: String(i + 1).padStart(3, "0") + "/050"
                });
                if (classAffinity) card.classAffinity = classAffinity;
                if (typeof EffectCatalog !== "undefined") {
                    card.effects = EffectCatalog.fromMechanics(card.mechanics);
                }
                project.cards[card.id] = card;
                deck.cardIds.push(card.id);
            });
        });

        return project;
    }
};
