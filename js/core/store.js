/* ==========================================================
   Darkstar Forge — Persistência do projeto
========================================================== */

var Store = {
    KEY: "tcg-studio-v1",
    project: null,
    listeners: new Set(),

    /**
     * Carrega projeto: JSON slim no localStorage + artes no IndexedDB.
     * Preferir loadAsync(); load() ainda existe e inicia o async.
     */
    load() {
        // compat: dispara async (AppUI deve usar loadAsync)
        return this.loadAsync();
    },

    async loadAsync() {
        try {
            if (typeof MediaStore !== "undefined") await MediaStore.open();
        } catch (e) {
            console.warn("IndexedDB indisponível:", e);
        }
        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) {
                this.project = JSON.parse(raw);
                this._migrate();
                if (typeof MediaStore !== "undefined") {
                    await MediaStore.hydrateProject(this.project);
                }
                return this.project;
            }
        } catch (e) {
            console.warn("Falha ao carregar projeto:", e);
        }
        this.project = Seed.createProject();
        await this.saveAsync();
        return this.project;
    },

    _saveTimer: null,
    _emitTimer: null,
    _silent: false,
    _saveQueue: Promise.resolve(),

    /**
     * @param {{ silent?: boolean, emit?: boolean }} opts
     * silent: não notifica listeners (evita re-render da biblioteca a cada tecla)
     * Artes/dataURLs vão para IndexedDB; localStorage só guarda refs.
     */
    save(opts = {}) {
        // API síncrona compatível: enfileira save async
        this._saveQueue = this._saveQueue.then(() => this.saveAsync(opts)).catch((e) => {
            console.error("save failed", e);
            throw e;
        });
        return this._saveQueue;
    },

    async saveAsync(opts = {}) {
        if (!this.project) return;
        const silent = opts.silent === true || this._silent;
        const doEmit = opts.emit !== false && !silent;

        this._setSaveStatus("saving");
        this.project.meta.updatedAt = new Date().toISOString();

        let slim = this.project;
        try {
            if (typeof MediaStore !== "undefined") {
                await MediaStore.open();
                slim = await MediaStore.projectToSlim(this.project);
            }
        } catch (e) {
            console.warn("MediaStore extract falhou, tentando salvar inline:", e);
            slim = this.project;
        }

        let json;
        try {
            json = JSON.stringify(slim);
        } catch (e) {
            console.error("Falha ao serializar projeto", e);
            throw e;
        }

        try {
            // Backup só do JSON slim (sem re-duplicar imagens)
            if (!silent) this._rotateBackup(json);
            localStorage.setItem(this.KEY, json);
            // Histórico de revisões (slim) — não bloqueia se falhar
            if (!silent && typeof MediaStore !== "undefined" && MediaStore.pushRevision) {
                MediaStore.pushRevision(slim, "save").catch(() => {});
            }
            this._setSaveStatus("saved");
        } catch (e) {
            this._setSaveStatus("error");
            console.warn("localStorage cheio ou bloqueado:", e);
            try {
                Object.keys(localStorage)
                    .filter((k) => k.startsWith(this.KEY + "-bak"))
                    .forEach((k) => localStorage.removeItem(k));
                localStorage.setItem(this.KEY, json);
            } catch (e2) {
                // Último recurso: limpar seed art inline residual e tentar de novo
                try {
                    if (typeof MediaStore !== "undefined") {
                        const retry = await MediaStore.projectToSlim(this.project);
                        // forçar limpar artData embutido residual
                        Object.values(retry.cards || {}).forEach((c) => {
                            if (c && typeof c.artData === "string" && c.artData.startsWith("data:")) {
                                delete c.artData;
                            }
                        });
                        json = JSON.stringify(retry);
                        localStorage.setItem(this.KEY, json);
                    } else {
                        throw e2;
                    }
                } catch (e3) {
                    const err = new Error(
                        "Não foi possível salvar o projeto. Tente Exportar JSON (com artes) e limpar o armazenamento do site, ou use um navegador com IndexedDB."
                    );
                    err.cause = e3;
                    if (doEmit) this._emit();
                    throw err;
                }
            }
        }
        if (doEmit) this._emitDebounced();
    },

    _setSaveStatus(state) {
        // state: saving | saved | error | idle
        this._saveStatus = state;
        const el = document.getElementById("saveStatus");
        if (!el) return;
        const map = {
            saving: { t: "Salvando…", cls: "is-saving" },
            saved: { t: "Salvo", cls: "is-saved" },
            error: { t: "Erro ao salvar", cls: "is-error" },
            idle: { t: "", cls: "" }
        };
        const m = map[state] || map.idle;
        el.textContent = m.t;
        el.className = "save-status " + m.cls;
        if (state === "saved") {
            clearTimeout(this._saveStatusT);
            this._saveStatusT = setTimeout(() => {
                if (this._saveStatus === "saved") this._setSaveStatus("idle");
            }, 1800);
        }
    },

    _rotateBackup(json) {
        try {
            const prev = localStorage.getItem(this.KEY);
            if (!prev || prev === json) return;
            // Apenas 1 backup slim (evita estourar quota com 3 cópias)
            localStorage.setItem(this.KEY + "-bak1", prev);
            try { localStorage.removeItem(this.KEY + "-bak2"); } catch (_) {}
            try { localStorage.removeItem(this.KEY + "-bak3"); } catch (_) {}
        } catch (_) { /* ignora se cheio */ }
    },

    /** Restaura backup (1) */
    async restoreBackup(n = 1) {
        const raw = localStorage.getItem(this.KEY + "-bak" + n);
        if (!raw) throw new Error("Backup " + n + " não encontrado.");
        this.project = JSON.parse(raw);
        this._migrate();
        if (typeof MediaStore !== "undefined") await MediaStore.hydrateProject(this.project);
        await this.saveAsync();
        return this.project;
    },

    /**
     * trySave({ silent: true })  → autosave sem redesenhar UI
     * trySave()                  → salva e notifica (botões Salvar / voltar)
     */
    trySave(opts = {}) {
        const silent = opts.silent === true;
        const p = this.save({ silent, emit: !silent && opts.emit !== false });
        if (p && typeof p.then === "function") {
            return p.then(() => ({ ok: true })).catch((e) => ({ ok: false, error: e }));
        }
        try {
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e };
        }
    },

    /** Debounce de notificações UI */
    _emitDebounced() {
        const clear = (typeof clearTimeout !== "undefined" ? clearTimeout : globalThis.clearTimeout);
        const setT = (typeof setTimeout !== "undefined" ? setTimeout : globalThis.setTimeout);
        clear.call(null, this._emitTimer);
        this._emitTimer = setT(() => this._emit(), 200);
    },

    async resetToSeed() {
        this.project = Seed.createProject();
        await this.saveAsync();
    },

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    },

    _emit() {
        for (const fn of this.listeners) {
            try { fn(this.project); } catch (e) { console.error(e); }
        }
    },

    _migrate() {
        if (!this.project.version) this.project.version = 1;
        if (!this.project.meta) this.project.meta = {};
        if (!this.project.meta.icons) {
            this.project.meta.icons = { resources: {}, classes: {}, set: null, rarities: {}, combat: {} };
        }
        if (!this.project.meta.icons.rarities) this.project.meta.icons.rarities = {};
        if (!this.project.meta.icons.combat) this.project.meta.icons.combat = {};
        if (!this.project.meta.customTemplates) this.project.meta.customTemplates = [];
        if (!this.project.meta.customFonts) this.project.meta.customFonts = [];
        if (!this.project.meta.stylePresets) this.project.meta.stylePresets = [];
        if (!this.project.meta.tags || !this.project.meta.tags.length) {
            if (typeof TagSystem !== "undefined") {
                this.project.meta.tags = TagSystem.DEFAULTS.map((t) => ({
                    id: t.id,
                    label: { ...t.label }
                }));
            } else {
                this.project.meta.tags = [];
            }
        }
        if (!this.project.editions) this.project.editions = [];
        if (!this.project.cards) this.project.cards = {};

        // Sempre alinha cores: recursos → laranja; equipamentos → classe de sinergia
        // (idempotente; corrige projetos antigos e saves parciais)
        Object.values(this.project.cards).forEach((c) => {
            if (!c) return;
            if (c.deckId === "deck_resources" || c.category === "resource") {
                c.colorIds = ["orange"];
                c.category = "resource";
            }
            if (c.deckId === "deck_equipment" || c.category === "equipment") {
                c.category = "equipment";
                if (typeof Catalog !== "undefined" && Catalog.equipmentClassFor) {
                    if (!c.classAffinity) c.classAffinity = Catalog.equipmentClassFor(c);
                    c.colorIds = [c.classAffinity];
                }
            }
            if (!Array.isArray(c.effects)) {
                c.effects = (typeof EffectCatalog !== "undefined")
                    ? EffectCatalog.fromMechanics(c.mechanics)
                    : [];
            }
        });
        (this.project.editions || []).forEach((ed) => {
            (ed.decks || []).forEach((d) => {
                if (d.kind === "resources") {
                    d.colorIds = ["orange"];
                    d.name = d.name || "Recursos";
                    d.classes = "Ouro, poções e utilitários";
                }
                if (d.kind === "equipment") {
                    d.colorIds = ["gear"];
                    d.classes = "Itens (cor = sinergia de classe)";
                }
            });
        });
        if (!this.project.characters) this.project.characters = [];
        // Limpa ícones de recurso que apontam para o logo do set
        const setIcon = this.project.meta.setSymbolDataUrl || this.project.meta.icons?.set;
        if (this.project.meta.icons?.resources && setIcon) {
            Object.keys(this.project.meta.icons.resources).forEach((k) => {
                if (this.project.meta.icons.resources[k] === setIcon) {
                    delete this.project.meta.icons.resources[k];
                }
            });
        }
        Object.values(this.project.cards).forEach((c) => {
            if (!c.style) c.style = {};
            if (c.style.panelOpacity === 0.42) c.style.panelOpacity = 0.72;
            if (c.style.fontTitle == null || c.style.fontTitle === 26) c.style.fontTitle = 30;
            if (c.style.fontType == null || c.style.fontType === 18) c.style.fontType = 25;
            if (c.style.fontRules == null) c.style.fontRules = 20;
            if (c.style.fontFooter == null || c.style.fontFooter === 13) c.style.fontFooter = 18;
            if (!c.style.fontFamilyTitle) c.style.fontFamilyTitle = "eb-garamond";
            if (!c.style.fontFamilyType) c.style.fontFamilyType = "eb-garamond";
            if (!c.style.fontFamilyRules) c.style.fontFamilyRules = "eb-garamond";
            if (!c.style.fontFamilyFooter) c.style.fontFamilyFooter = "source-sans";
            if (c.style.iconResourceSize == null || c.style.iconResourceSize < 40) c.style.iconResourceSize = 40;
            if (c.style.iconClassSize == null || c.style.iconClassSize < 56) c.style.iconClassSize = 56;
            if (c.style.iconSetSize == null) c.style.iconSetSize = 30;
            if (c.style.fontStat == null || c.style.fontStat < 34) c.style.fontStat = 34;
            if (c.style.iconCombatSize == null || c.style.iconCombatSize < 40) c.style.iconCombatSize = 40;
            if (!Array.isArray(c.mechanics)) c.mechanics = [];
        });
        // Garante decks especiais na 1ª edição
        this.project.editions.forEach((ed) => {
            ed.decks.forEach((d) => { if (!d.kind) d.kind = "color"; });
        });
    },

    setCustomIcon(kind, key, dataUrl) {
        if (!this.project.meta.icons) {
            this.project.meta.icons = { resources: {}, classes: {}, set: null, rarities: {}, combat: {} };
        }
        if (!this.project.meta.icons.rarities) this.project.meta.icons.rarities = {};
        if (!this.project.meta.icons.combat) this.project.meta.icons.combat = {};
        if (kind === "set") {
            this.project.meta.setSymbolDataUrl = dataUrl;
            this.project.meta.icons.set = dataUrl;
        } else if (kind === "resource") {
            this.project.meta.icons.resources[key] = dataUrl;
        } else if (kind === "class") {
            this.project.meta.icons.classes[key] = dataUrl;
        } else if (kind === "rarity") {
            this.project.meta.icons.rarities[key] = dataUrl;
        } else if (kind === "combat") {
            if (!this.project.meta.icons.combat) this.project.meta.icons.combat = {};
            this.project.meta.icons.combat[key] = dataUrl; // key: sword | shield
        }
        this.save();
    },

    createEdition({ name, code, footerText } = {}) {
        const n = (this.project.editions?.length || 0) + 1;
        const edition = {
            id: ID.create("ed"),
            name: name || `${n}ª Edição`,
            code: code || `${n}ED`,
            footerText: footerText || `PT-BR · ${n}ª Ed.`,
            setSymbolId: "default",
            decks: [
                ...Object.values(Catalog.colors).map((c) => ({
                    id: `deck_${c.id}_${ID.create("d").slice(-4)}`,
                    colorIds: [c.id],
                    name: c.name,
                    classes: c.classes,
                    kind: "color",
                    cardIds: []
                })),
                {
                    id: ID.create("deck"), colorIds: ["silver"], name: "Recursos",
                    classes: "Ouro e utilitários", kind: "resources", cardIds: []
                },
                {
                    id: ID.create("deck"), colorIds: ["white"], name: "Equipamentos",
                    classes: "Itens do personagem", kind: "equipment", cardIds: []
                }
            ]
        };
        this.project.editions.push(edition);
        this.save();
        return edition;
    },

    addCustomTemplate({ name, overlayDataUrl }) {
        if (!this.project.meta.customTemplates) this.project.meta.customTemplates = [];
        const tpl = {
            id: ID.create("tpl"),
            name: name || "Template personalizado",
            overlayDataUrl,
            createdAt: new Date().toISOString()
        };
        this.project.meta.customTemplates.push(tpl);
        this.save();
        return tpl;
    },

    listTemplates() {
        const builtIn = TemplateRegistry.list().map((t) => ({ id: t.id, name: t.name, custom: false }));
        const custom = (this.project.meta.customTemplates || []).map((t) => ({
            id: t.id, name: t.name, custom: true
        }));
        return [...builtIn, ...custom];
    },

    /* ---------- Queries ---------- */

    getEdition(id) {
        return this.project.editions.find((e) => e.id === id) || null;
    },

    getDeck(editionId, deckId) {
        const ed = this.getEdition(editionId);
        if (!ed) return null;
        return ed.decks.find((d) => d.id === deckId) || null;
    },

    getCard(cardId) {
        return this.project.cards[cardId] || null;
    },

    listCards({ editionId, deckId, query } = {}) {
        let cards = Object.values(this.project.cards);
        if (editionId) cards = cards.filter((c) => c.editionId === editionId);
        if (deckId) cards = cards.filter((c) => c.deckId === deckId);
        if (query) {
            const q = query.toLowerCase().trim();
            cards = cards.filter((c) =>
                (c.name || "").toLowerCase().includes(q) ||
                (c.type || "").toLowerCase().includes(q) ||
                (c.rules || "").toLowerCase().includes(q)
            );
        }
        return cards.sort((a, b) =>
            String(a.collectorNumber || "").localeCompare(String(b.collectorNumber || ""), "pt", { numeric: true })
        );
    },

    /* ---------- Mutations ---------- */

    upsertCard(card) {
        if (!card.id) card.id = ID.create("card");
        card.updatedAt = new Date().toISOString();
        // classAffinity / effects defaults
        if (card.category === "equipment" || card.deckId === "deck_equipment") {
            if (!card.classAffinity && typeof Catalog !== "undefined" && Catalog.equipmentClassFor) {
                card.classAffinity = Catalog.equipmentClassFor(card);
            }
            if (card.classAffinity) card.colorIds = [card.classAffinity];
        }
        if (!Array.isArray(card.effects)) {
            card.effects = (typeof EffectCatalog !== "undefined")
                ? EffectCatalog.fromMechanics(card.mechanics)
                : [];
        }
        this.project.cards[card.id] = card;

        const deck = this.getDeck(card.editionId, card.deckId);
        if (deck && !deck.cardIds.includes(card.id)) {
            deck.cardIds.push(card.id);
        }
        return this.save().then(() => card);
    },

    async deleteCard(cardId) {
        const card = this.getCard(cardId);
        if (!card) return;
        const deck = this.getDeck(card.editionId, card.deckId);
        if (deck) deck.cardIds = deck.cardIds.filter((id) => id !== cardId);
        delete this.project.cards[cardId];
        try {
            if (typeof MediaStore !== "undefined") await MediaStore.deleteCardMedia(cardId);
        } catch (e) {
            console.warn("Falha ao limpar mídia da carta", e);
        }
        await this.saveAsync();
    },

    async duplicateCard(cardId) {
        const src = this.getCard(cardId);
        if (!src) return null;
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = ID.create("card");
        copy.name = (src.name || "Carta") + " (cópia)";
        copy.createdAt = new Date().toISOString();
        copy.updatedAt = copy.createdAt;
        // Re-grava arte sob nova key no IDB
        if (copy.art?.src && typeof MediaStore !== "undefined") {
            const srcArt = copy.art.src;
            if (MediaStore.isDataUrl(srcArt) || MediaStore.isRef(srcArt)) {
                const data = MediaStore.isRef(srcArt)
                    ? await MediaStore.get(MediaStore.refKey(srcArt))
                    : srcArt;
                if (data) {
                    copy.art.src = data; // em memória dataURL; saveAsync faz park em art:newId
                }
            }
        }
        if (copy.artData) delete copy.artData;
        this.project.cards[copy.id] = copy;
        const deck = this.getDeck(copy.editionId, copy.deckId);
        if (deck && !deck.cardIds.includes(copy.id)) deck.cardIds.push(copy.id);
        await this.saveAsync();
        return copy;
    },

    createBlankCard(editionId, deckId) {
        const deck = this.getDeck(editionId, deckId);
        const ed = this.getEdition(editionId);
        const colorIds = deck ? [...deck.colorIds] : ["red"];
        const primaryColor = Catalog.colorById(colorIds[0]);
        const primaryRes = primaryColor.resources[0];
        const kind = deck?.kind || "color";

        const n = this.listCards({ editionId, deckId }).length + 1;
        const total = Math.max(50, n);

        const type = kind === "equipment" ? "Equipamento" : kind === "resources" ? "Recurso" : "Ação";
        const defaultTags =
            kind === "equipment" ? ["equipment"] :
            kind === "resources" ? ["resource"] :
            ["action"];
        const card = {
            id: ID.create("card"),
            editionId,
            deckId,
            category: kind === "resources" ? "resource" : kind === "equipment" ? "equipment" : "deck",
            templateId: "classic-fullart",
            name: "Nova Carta",
            type,
            subtype: "",
            rules: "",
            flavor: "",
            i18n: {
                "pt-BR": { name: "Nova Carta", type, subtype: "", rules: "", flavor: "" },
                "en-US": { name: "New Card", type: kind === "equipment" ? "Equipment" : kind === "resources" ? "Resource" : "Action", subtype: "", rules: "", flavor: "" }
            },
            tags: defaultTags,
            effects: [],
            classAffinity: kind === "equipment" ? (colorIds[0] || null) : null,
            rarity: "common",
            collectorNumber: String(n).padStart(3, "0") + "/" + String(total).padStart(3, "0"),
            footerText: ed?.footerText || "PT-BR · 1ª Ed.",
            setSymbolId: ed?.setSymbolId || "default",
            colorIds,
            costs: [{ resource: kind === "equipment" || kind === "resources" ? "gold" : primaryRes, amount: 1 }],
            showCombat: kind === "color",
            attack: 1,
            defense: 1,
            mechanics: [],
            manualCost: false,
            manualRarity: false,
            autoCost: true,
            style: {
                panelOpacity: 0.72,
                strokeWidth: 2.4,
                glow: 8,
                rulesHeight: 300,
                frameColorOverrides: null,
                fontTitle: 30,
                fontType: 25,
                fontRules: 23,
                fontFooter: 18,
                fontFlavor: 26,
                fontCost: 28,
                fontStat: 34,
                fontFamilyTitle: "comfortaa",
                fontFamilyType: "noto-sans",
                fontFamilyRules: "noto-sans",
                fontFamilyFooter: "source-sans",
                fontFamilyFlavor: "eb-garamond",
                iconResourceSize: 40,
                iconClassSize: 56,
                iconSetSize: 30,
                iconCombatSize: 40
            },
            art: {
                src: null,
                zoom: 100,
                offsetX: 0,
                offsetY: 0,
                rotation: 0,
                mirror: false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (typeof Scoring !== "undefined") Scoring.apply(card, { forceCost: true });
        return this.upsertCard(card);
    },

    updateEdition(editionId, patch) {
        const ed = this.getEdition(editionId);
        if (!ed) return;
        Object.assign(ed, patch);
        this.save();
    },

    updateProjectMeta(patch) {
        Object.assign(this.project.meta, patch);
        this.save();
    },

    /* ---------- Import / Export ---------- */

    async exportJSON() {
        let data = this.project;
        try {
            if (typeof MediaStore !== "undefined") {
                data = await MediaStore.projectForExport(this.project);
            }
        } catch (e) {
            console.warn("export hydrate:", e);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${(this.project.meta.name || "projeto").replace(/\s+/g, "_")}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!data.editions || !data.cards) throw new Error("JSON inválido");
                    this.project = data;
                    this._migrate();
                    // Grava artes embutidas no IDB e slim no localStorage
                    await this.saveAsync();
                    if (typeof MediaStore !== "undefined") {
                        await MediaStore.hydrateProject(this.project);
                    }
                    resolve(this.project);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};
