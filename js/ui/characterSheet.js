/* ==========================================================
   Ficha do Personagem
   — cópia de trabalho (só grava ao Salvar)
   — raça sempre reaplica stats + PV
   — slots por TagSystem + previews centralizadas
========================================================== */

var CharacterSheetUI = {

    SLOT_KEYS: [
        ["mainHand", "slot.mainHand"],
        ["offHand", "slot.offHand"],
        ["head", "slot.head"],
        ["chest", "slot.chest"],
        ["hands", "slot.hands"],
        ["legs", "slot.legs"],
        ["feet", "slot.feet"],
        ["amulet", "slot.amulet"],
        ["ring1", "slot.ring1"],
        ["ring2", "slot.ring2"]
    ],

    STATS: ["str", "dex", "con", "int", "wis", "cha"],

    char: null,
    _savedJson: null,
    dirty: false,

    mount(root) {
        if (!Store.project.characters || !Store.project.characters.length) {
            Store.project.characters = [this._defaultChar()];
            Store.trySave({ silent: true });
        }
        // Migração única: ficha padrão não deve vir com Humano pré-selecionado
        if (!Store.project.meta.migratedBlankRace) {
            Store.project.characters.forEach((ch) => {
                if (ch.raceId === "human" || ch.raceId === "custom") {
                    ch.raceId = "";
                    ch.raceCustom = "";
                    ch.stats = Races.suggestedStats("");
                    const lvl = ch.level || 1;
                    ch.maxHp = Races.suggestedHp("", lvl);
                    ch.hp = ch.maxHp;
                }
            });
            Store.project.meta.migratedBlankRace = true;
            Store.trySave({ silent: true });
        }
        // cópia de trabalho
        const src = Store.project.characters[0];
        this.char = JSON.parse(JSON.stringify(src));
        this._migrateSlots(this.char);
        if ("classPrimary" in this.char) delete this.char.classPrimary;
        if (!this.char.raceId) this.char.raceId = "";
        this._savedJson = JSON.stringify(this.char);
        this.dirty = false;
        this.render(root);
    },

    _defaultChar() {
        // Raça em branco por padrão (impressão: escrever à mão)
        const stats = Races.suggestedStats("");
        const maxHp = Races.suggestedHp("", 1);
        return {
            id: "char_1",
            name: "Aventureiro",
            raceId: "",
            raceCustom: "",
            level: 1,
            hp: maxHp,
            maxHp,
            stats,
            resources: {},
            slots: this._emptySlots(),
            notes: ""
        };
    },

    _emptySlots() {
        const s = {};
        this.SLOT_KEYS.forEach(([k]) => { s[k] = null; });
        return s;
    },

    _migrateSlots(c) {
        if (!c.slots) c.slots = this._emptySlots();
        const map = {
            weapon: "mainHand",
            offhand: "offHand",
            armor: "chest",
            helm: "head",
            accessory1: "amulet",
            accessory2: "ring1"
        };
        Object.entries(map).forEach(([old, neu]) => {
            if (c.slots[old] && !c.slots[neu]) c.slots[neu] = c.slots[old];
            delete c.slots[old];
        });
        this.SLOT_KEYS.forEach(([k]) => {
            if (!(k in c.slots)) c.slots[k] = null;
        });
        if (c.raceId == null) c.raceId = "";
        if (c.raceId === "custom") c.raceId = "";
        if (!c.stats) c.stats = Races.suggestedStats(c.raceId);
        if (c.maxHp == null) c.maxHp = Races.suggestedHp(c.raceId, c.level || 1);
        if (c.hp == null) c.hp = c.maxHp;
    },

    _cardsForSlot(slotKey) {
        if (typeof TagSystem !== "undefined" && TagSystem.cardsForSlot) {
            const tagged = TagSystem.cardsForSlot(slotKey);
            if (tagged.length) return tagged;
        }
        return Store.listCards({}).filter(
            (x) => x.category === "equipment" || x.deckId === "deck_equipment"
        );
    },

    _equippedCards() {
        const c = this.char;
        const out = [];
        this.SLOT_KEYS.forEach(([key, i18nKey]) => {
            const id = c.slots?.[key];
            if (!id) return;
            const card = Store.getCard(id);
            if (card) out.push({ key, i18nKey, card });
        });
        return out;
    },

    _buffSummaryHTML() {
        const equipped = this._equippedCards();
        if (!equipped.length) {
            return `<p class="hint muted">${I18n.t("sheet.buffsEmpty")}</p>`;
        }
        let sumAtk = 0;
        let sumDef = 0;
        let hasCombat = false;
        const lines = equipped.map(({ i18nKey, card }) => {
            const slotLabel = I18n.t(i18nKey);
            const rules = (card.rules || "").replace(/\s+/g, " ").trim();
            const short = rules.length > 110 ? rules.slice(0, 107) + "…" : rules;
            let combat = "";
            if (card.showCombat || card.attack || card.defense) {
                hasCombat = true;
                const a = Number(card.attack) || 0;
                const d = Number(card.defense) || 0;
                sumAtk += a;
                sumDef += d;
                combat = ` · ATK ${a} / DEF ${d}`;
            }
            return `<li class="buff-line">
              <strong>${this._esc(slotLabel)}</strong>
              <span class="buff-name">${this._esc(card.name)}</span>
              <span class="muted">${this._esc(card.type || "")}${combat}</span>
              ${short ? `<div class="buff-rules">${this._esc(short)}</div>` : ""}
            </li>`;
        });
        const total = hasCombat
            ? `<div class="buff-totals"><strong>${I18n.t("sheet.buffsCombat")}</strong>
                ATK ${sumAtk} · DEF ${sumDef}</div>`
            : "";
        return `<ul class="buff-list">${lines.join("")}</ul>${total}`;
    },

    /** Aplica raça nos stats/PV (sempre que o dropdown muda) */
    _applyRace(raceId, level) {
        this.char.raceId = raceId || "";
        this.char.raceCustom = "";
        const lvl = Math.max(1, Number(level) || 1);
        this.char.level = lvl;
        this.char.stats = Races.suggestedStats(this.char.raceId);
        this.char.maxHp = Races.suggestedHp(this.char.raceId, lvl);
        this.char.hp = this.char.maxHp;
    },

    render(root) {
        const c = this.char;
        const lang = I18n.lang;

        // Primeira opção: em branco (impressão manual)
        const raceOpts =
            `<option value="" ${!c.raceId ? "selected" : ""}></option>` +
            Races.list.filter((r) => r.id !== "custom").map((r) => {
                const sel = c.raceId === r.id ? "selected" : "";
                return `<option value="${r.id}" ${sel}>${r.icon} ${r.name[lang] || r.name["pt-BR"]}</option>`;
            }).join("");

        const slotHTML = this.SLOT_KEYS.map(([key, i18nKey]) => {
            const id = c.slots?.[key];
            const optsCards = this._cardsForSlot(key);
            const ids = new Set(optsCards.map((x) => x.id));
            if (id && !ids.has(id)) {
                const cur = Store.getCard(id);
                if (cur) optsCards.unshift(cur);
            }
            const opts = optsCards.map((eq) =>
                `<option value="${eq.id}" ${eq.id === id ? "selected" : ""}>${this._esc(eq.name)}</option>`
            ).join("");
            return `
              <div class="sheet-slot">
                <div class="sheet-slot-label">${I18n.t(i18nKey)}</div>
                <select data-slot="${key}" class="field-control">
                  <option value="">${I18n.t("slot.empty")}</option>
                  ${opts}
                </select>
                <div class="sheet-slot-card" id="slotPrev_${key}"></div>
              </div>`;
        }).join("");

        const statsHTML = this.STATS.map((s) => `
          <div class="stat-box">
            <div class="stat-label">${I18n.t("stat." + s)}</div>
            <input data-stat="${s}" type="number" value="${c.stats?.[s] ?? 10}" class="field-control stat-input"/>
            <div class="stat-mod">${this._mod(c.stats?.[s] ?? 10)}</div>
          </div>`).join("");

        root.innerHTML = `
          <section class="char-sheet-page">
            <header class="sheet-toolbar">
              <button type="button" class="btn ghost" id="btnSheetBack">${I18n.t("sheet.back")}</button>
              <h2>${I18n.t("sheet.title")}</h2>
              <div id="sheetDirtyBadge" class="dirty-badge" hidden>${I18n.t("sheet.unsaved")}</div>
              <button type="button" class="btn primary" id="btnSheetSave">${I18n.t("sheet.save")}</button>
              <button type="button" class="btn" id="btnSheetPrint">${I18n.t("sheet.print")}</button>
              <button type="button" class="btn danger ghost" id="btnSheetClear">${I18n.t("sheet.clear")}</button>
            </header>

            <div class="sheet-layout">
              <div class="sheet-paper" id="printSheet">
                <div class="sheet-banner">
                  <div class="sheet-crest">${Icons.setSymbol(48)}</div>
                  <div class="sheet-banner-main">
                    <input id="chName" class="sheet-name" value="${this._esc(c.name)}" />
                    <div class="sheet-subrow">
                      <label class="sheet-field sheet-field-race">
                        <span>${I18n.t("sheet.race")}</span>
                        <select id="chRace" class="field-control race-select">${raceOpts}</select>
                      </label>
                      <label class="sheet-field">
                        <span>${I18n.t("sheet.level")}</span>
                        <input id="chLevel" type="number" min="1" max="20" value="${c.level}" class="field-control"/>
                      </label>
                      <div class="sheet-hp">
                        <span>${I18n.t("sheet.hp")}</span>
                        <div class="sheet-hp-inputs">
                          <input id="chHp" type="number" value="${c.hp}" class="field-control"/>
                          <span>/</span>
                          <input id="chMaxHp" type="number" value="${c.maxHp}" class="field-control"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 class="sheet-section-title">${I18n.t("sheet.points")}</h3>
                <p class="hint">${I18n.t("sheet.pointsHint")}</p>
                <div class="sheet-stats">${statsHTML}</div>

                <h3 class="sheet-section-title">${I18n.t("sheet.equipment")}</h3>
                <div class="sheet-slots">${slotHTML}</div>

                <h3 class="sheet-section-title">${I18n.t("sheet.buffs")}</h3>
                <div class="sheet-buffs" id="sheetBuffs">${this._buffSummaryHTML()}</div>

                <div class="sheet-print-block sheet-block-end">
                  <h3 class="sheet-section-title">${I18n.t("sheet.resources")}</h3>
                  <div class="sheet-resources">
                    ${Object.keys(Catalog.resources).map((rid) => `
                      <label class="sheet-res">
                        ${Icons.resource(rid, 20)}
                        <span>${Catalog.resourceById(rid).name}</span>
                        <input data-res="${rid}" type="number" min="0" value="${c.resources?.[rid] ?? 0}" class="field-control"/>
                      </label>`).join("")}
                  </div>

                  <h3 class="sheet-section-title">${I18n.t("sheet.notes")}</h3>
                  <textarea id="chNotes" class="field-control sheet-notes" rows="4">${this._esc(c.notes || "")}</textarea>
                </div>
              </div>
            </div>
          </section>
        `;

        // Preview preenche o slot 63×88,9 mm (proporção carta)
        requestAnimationFrame(() => {
            this.SLOT_KEYS.forEach(([key]) => {
                const id = c.slots?.[key];
                const el = document.getElementById("slotPrev_" + key);
                if (!el) return;
                if (!id) {
                    el.classList.add("is-empty");
                    el.innerHTML = "";
                    return;
                }
                el.classList.remove("is-empty");
                const card = Store.getCard(id);
                if (!card) return;
                // Host .sheet-slot-card fica o quadro; thumbnail cria .card-mount filho centrado
                el.classList.remove("card-mount");
                el.removeAttribute("style");
                // largura em px ≈ 63mm no monitor (96dpi → ~238px); usa clientWidth do slot
                const w = Math.max(120, Math.floor(el.clientWidth || 238));
                CardView.thumbnail(el, card, w);
            });
        });

        this._updateDirtyBadge();
        this.bind(root);
    },

    bind(root) {
        root.querySelector("#btnSheetBack")?.addEventListener("click", async () => {
            this.applyFromForm();
            if (this._isDirty()) {
                const choice = await UIModal.unsavedChanges();
                if (choice === "cancel") return;
                if (choice === "save") {
                    const r = this._commitSave();
                    if (!r.ok) {
                        alert(r.error?.message || "Falha ao salvar");
                        return;
                    }
                }
                // discard: não grava
            }
            AppUI.openLibrary();
        });

        root.querySelector("#btnSheetSave")?.addEventListener("click", () => {
            this.applyFromForm();
            const r = this._commitSave();
            if (r.ok) alert(I18n.lang === "en-US" ? "Sheet saved." : "Ficha salva.");
            else alert(r.error?.message || "Falha ao salvar");
        });

        root.querySelector("#btnSheetPrint")?.addEventListener("click", async () => {
            this.applyFromForm();
            if (this._isDirty()) {
                const choice = await UIModal.choose({
                    title: I18n.lang === "en-US" ? "Unsaved sheet" : "Ficha não salva",
                    message: I18n.lang === "en-US"
                        ? "Print the current (unsaved) state?"
                        : "Imprimir o estado atual (mesmo sem salvar)?",
                    buttons: [
                        { id: "print", label: I18n.lang === "en-US" ? "Print" : "Imprimir", className: "btn primary" },
                        { id: "cancel", label: I18n.lang === "en-US" ? "Cancel" : "Cancelar", className: "btn" }
                    ]
                });
                if (choice !== "print") return;
            }
            this.print();
        });

        root.querySelector("#btnSheetClear")?.addEventListener("click", async () => {
            const en = I18n.lang === "en-US";
            const choice = await UIModal.choose({
                title: en ? "Clear character sheet?" : "Limpar ficha do personagem?",
                message: en
                    ? "This resets name, race, stats, equipment and notes on this draft. Save afterwards to persist."
                    : "Isso reinicia nome, raça, atributos, equipamentos e anotações neste rascunho. Salve depois para gravar.",
                buttons: [
                    { id: "clear", label: en ? "Clear sheet" : "Limpar ficha", className: "btn danger" },
                    { id: "cancel", label: en ? "Cancel" : "Cancelar", className: "btn" }
                ]
            });
            if (choice !== "clear") return;
            this.char = this._defaultChar();
            this.dirty = true;
            this.render(document.getElementById("main"));
            this._markDirty();
        });

        root.querySelector("#chRace")?.addEventListener("change", (e) => {
            const raceId = e.target.value;
            const lvl = Number(document.getElementById("chLevel")?.value) || this.char.level || 1;
            this._applyRace(raceId, lvl);
            this.render(document.getElementById("main"));
            this._markDirty();
        });

        root.querySelector("#chLevel")?.addEventListener("change", () => {
            const raceId = document.getElementById("chRace")?.value || this.char.raceId || "";
            const lvl = Number(document.getElementById("chLevel")?.value) || 1;
            this.char.level = lvl;
            const prevMax = this.char.maxHp;
            this.char.maxHp = Races.suggestedHp(raceId, lvl);
            // se estava no máximo, sobe/desce junto; senão só cap
            if (this.char.hp >= prevMax) this.char.hp = this.char.maxHp;
            else this.char.hp = Math.min(this.char.hp, this.char.maxHp);
            const maxEl = document.getElementById("chMaxHp");
            const hpEl = document.getElementById("chHp");
            if (maxEl) maxEl.value = this.char.maxHp;
            if (hpEl) hpEl.value = this.char.hp;
            this.applyFromForm();
            this._markDirty();
        });

        const soft = () => {
            this.applyFromForm();
            this._markDirty();
        };
        ["chName", "chHp", "chMaxHp", "chNotes"].forEach((id) => {
            root.querySelector("#" + id)?.addEventListener("input", soft);
            root.querySelector("#" + id)?.addEventListener("change", soft);
        });
        root.querySelectorAll("[data-stat]").forEach((el) => {
            el.addEventListener("input", () => {
                soft();
                const box = el.closest(".stat-box");
                const mod = box?.querySelector(".stat-mod");
                if (mod) mod.textContent = this._mod(el.value);
            });
            el.addEventListener("change", soft);
        });
        root.querySelectorAll("[data-res]").forEach((el) => {
            el.addEventListener("input", soft);
            el.addEventListener("change", soft);
        });
        root.querySelectorAll("[data-slot]").forEach((el) => {
            el.addEventListener("change", () => {
                this.applyFromForm();
                this._markDirty();
                this.render(document.getElementById("main"));
            });
        });
    },

    applyFromForm() {
        const c = this.char;
        if (!c) return;
        c.name = document.getElementById("chName")?.value ?? c.name;
        c.raceId = document.getElementById("chRace")?.value ?? c.raceId ?? "";
        c.raceCustom = "";
        c.level = Number(document.getElementById("chLevel")?.value) || 1;
        c.hp = Number(document.getElementById("chHp")?.value) || 0;
        c.maxHp = Number(document.getElementById("chMaxHp")?.value) || 30;
        c.notes = document.getElementById("chNotes")?.value || "";
        delete c.classPrimary;
        c.stats = c.stats || {};
        document.querySelectorAll("[data-stat]").forEach((el) => {
            c.stats[el.dataset.stat] = Number(el.value) || 10;
        });
        c.resources = c.resources || {};
        document.querySelectorAll("[data-res]").forEach((el) => {
            c.resources[el.dataset.res] = Number(el.value) || 0;
        });
        c.slots = c.slots || this._emptySlots();
        document.querySelectorAll("[data-slot]").forEach((el) => {
            c.slots[el.dataset.slot] = el.value || null;
        });
    },

    _isDirty() {
        try {
            this.applyFromForm();
            const dirty = JSON.stringify(this.char) !== this._savedJson;
            this.dirty = dirty;
            this._updateDirtyBadge();
            return dirty;
        } catch (_) {
            return !!this.dirty;
        }
    },

    _markDirty() {
        try {
            this.dirty = JSON.stringify(this.char) !== this._savedJson;
        } catch (_) {
            this.dirty = true;
        }
        this._updateDirtyBadge();
    },

    _updateDirtyBadge() {
        const b = document.getElementById("sheetDirtyBadge");
        if (!b) return;
        let dirty = this.dirty;
        try {
            dirty = JSON.stringify(this.char) !== this._savedJson;
            this.dirty = dirty;
        } catch (_) {}
        b.hidden = !dirty;
    },

    _commitSave() {
        this.applyFromForm();
        try {
            Store.project.characters[0] = JSON.parse(JSON.stringify(this.char));
            Store.save();
            this._savedJson = JSON.stringify(this.char);
            this.dirty = false;
            this._updateDirtyBadge();
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e };
        }
    },

    print() {
        const paper = document.querySelector(".sheet-paper");
        if (!paper) return;
        const win = window.open("", "_blank");
        if (!win) return alert("Pop-up bloqueado");
        // Na impressão: esconde selects de equipamento e deixa só o quadro 63×88,9 mm
        // (a carta física cobre essa área). Raça em branco permanece para escrita manual.
        win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
          <title>${this.char.name}</title>
          <link rel="stylesheet" href="css/app.css"/>
          <style>
            @page { size: A4; margin: 10mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body{background:#fff;padding:6mm;color:#111;font-size:11pt}
            .sheet-paper{box-shadow:none;border:1px solid #333;max-width:100%}
            .field-control,input,select,textarea{background:#fff!important;color:#111!important;border-color:#999!important}
            .dirty-badge,.sheet-toolbar,.hint{display:none!important}
            .sheet-slot select{display:none!important}
            .sheet-slot-card{
              width:63mm!important;height:88.9mm!important;
              border:1px solid #666!important;background:#fafafa!important;
              margin:0 auto!important;
            }
            .sheet-slot-card .card-mount{display:none!important}
            .sheet-slots{
              grid-template-columns:repeat(2, 1fr)!important;
              gap:8mm!important;
              page-break-inside:auto;
            }
            .sheet-slot{page-break-inside:avoid;break-inside:avoid}
            .sheet-banner,.sheet-stats,.sheet-buffs{page-break-inside:avoid;break-inside:avoid}
            .sheet-print-block,.sheet-block-end{
              page-break-inside:avoid!important;
              break-inside:avoid!important;
              page-break-before:auto;
            }
            .sheet-block-end{
              page-break-before:auto;
              break-before:auto;
              margin-top:8mm;
              border-top:1px solid #ccc;
              padding-top:4mm;
            }
            .sheet-notes{min-height:40mm!important}
            .race-select{min-height:28px;min-width:240px}
            .sheet-section-title{page-break-after:avoid}
            /* Impressão: campos de nível, PV e atributos VAZIOS (preenchimento à mão) */
            #chLevel, #chHp, #chMaxHp, [data-stat] { color: transparent !important; -webkit-text-fill-color: transparent !important; }
            .stat-mod { visibility: hidden !important; }
          </style></head><body>${paper.outerHTML}
          <script>
            // Garante valores limpos no print (não mexe no documento principal)
            document.querySelectorAll('#chLevel,#chHp,#chMaxHp,[data-stat]').forEach(function(el){ el.value=''; el.removeAttribute('value'); });
            setTimeout(function(){window.print()},500);
          </script></body></html>`);
        win.document.close();
    },

    _mod(n) {
        const m = Math.floor((Number(n) - 10) / 2);
        return (m >= 0 ? "+" : "") + m;
    },
    _esc(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
};
