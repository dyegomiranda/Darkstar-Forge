/* ==========================================================
   Darkstar Forge — Biblioteca
========================================================== */

var LibraryUI = {
    filters: { cost: "", type: "", rarity: "", tag: "", color: "" },
    simplified: false,

    mount(root) {
        root.innerHTML = `
          <section class="library" id="libraryLayout">
            <aside class="lib-sidebar" id="libSidebar">
              <div class="panel">
                <h3 data-i18n="lib.edition">Edição</h3>
                <select id="editionSelect" class="field-control"></select>
                <div class="row2" style="margin-top:8px">
                  <button type="button" id="btnNewEdition" class="btn small primary" data-i18n="lib.newEdition">+ Nova edição</button>
                  <button type="button" id="btnRenameEdition" class="btn small ghost" data-i18n="lib.rename">Renomear</button>
                </div>
                <label class="field" style="margin-top:10px">
                  <span data-i18n="lib.footer">Rodapé padrão</span>
                  <input id="editionFooter" type="text" maxlength="48" class="field-control case-free" autocomplete="off"/>
                </label>
                <label class="field">
                  <span data-i18n="lib.setSymbol">Símbolo do set</span>
                  <input id="setSymbolUpload" type="file" accept="image/*"/>
                </label>
                <button type="button" id="btnClearSetSymbol" class="btn ghost small" data-i18n="lib.clearSet">Usar logotipo padrão</button>
              </div>
              <div class="panel">
                <h3 data-i18n="lib.decks">Decks / Coleções</h3>
                <div id="deckList" class="deck-list"></div>
              </div>
              <div class="panel">
                <h3 data-i18n="lib.character">Personagem</h3>
                <button type="button" id="btnCharacterSheet" class="btn" data-i18n="lib.sheet">Ficha do Personagem</button>
              </div>
              <div class="panel">
                <h3 data-i18n="lib.tags">Tags do sistema</h3>
                <p class="hint" data-i18n="lib.tagsHint">Tags filtram slots na ficha e classificam cartas.</p>
                <div id="tagEditorList" class="tag-editor-list"></div>
                <button type="button" id="btnAddTag" class="btn small" data-i18n="lib.tagAdd">+ Nova tag</button>
              </div>
              <div class="panel panel-actions-box">
                <h3 data-i18n="lib.actions">Ações</h3>
                <div class="actions-stack">
                  <button type="button" id="btnNewCard" class="btn primary" data-i18n="lib.newCard">+ Nova carta</button>
                  <button type="button" id="btnPdfDeck" class="btn" data-i18n="lib.pdfDeck">PDF do deck</button>
                  <button type="button" id="btnPdfEdition" class="btn ghost" data-i18n="lib.pdfEdition">PDF da edição</button>
                  <button type="button" id="btnPrintDeck" class="btn ghost" data-i18n="lib.printDeck">Imprimir deck</button>
                  <button type="button" id="btnPrintEdition" class="btn ghost" data-i18n="lib.printEdition">Imprimir edição</button>
                </div>
              </div>
            </aside>
            <div class="panel-resizer" id="libResizer" title="Arraste para redimensionar"></div>
            <div class="lib-main">
              <header class="lib-toolbar">
                <input id="searchCards" type="search" class="field-control" data-i18n-placeholder="lib.search" placeholder="Buscar cartas…"/>
                <div class="lib-stats" id="libStats"></div>
                <button type="button" class="btn ghost small" id="btnDeckValidate" title="Validar deck / curva">Validar</button>
                <button type="button" class="btn small" id="btnExportTable" title="Exportar tabela do deck">Exportar tabela</button>
                <label class="check-inline" title="Mostrar apenas a arte, sem a moldura da carta (mais rápido)">
                  <input type="checkbox" id="chkSimplified"/> Versão simplificada
                </label>
              </header>
              <div class="lib-filters" id="libFilters">
                <label class="filter-field"><span>Custo</span>
                  <select id="fltCost" class="field-control">
                    <option value="">Todos</option>
                    <option value="0">0</option>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                    <option value="4">4</option><option value="5">5</option><option value="6">6+</option>
                  </select>
                </label>
                <label class="filter-field"><span>Tipo</span>
                  <select id="fltType" class="field-control">
                    <option value="">Todos</option>
                  </select>
                </label>
                <label class="filter-field"><span>Raridade</span>
                  <select id="fltRarity" class="field-control">
                    <option value="">Todas</option>
                    <option value="common">Comum</option>
                    <option value="uncommon">Incomum</option>
                    <option value="rare">Rara</option>
                    <option value="unique">Única</option>
                  </select>
                </label>
                <label class="filter-field"><span>Tag / keyword</span>
                  <select id="fltTag" class="field-control">
                    <option value="">Todas</option>
                  </select>
                </label>
                <label class="filter-field"><span>Classe (cor)</span>
                  <select id="fltColor" class="field-control">
                    <option value="">Todas</option>
                  </select>
                </label>
                <button type="button" class="btn ghost small" id="btnClearFilters">Limpar filtros</button>
              </div>
              <div id="deckCurve" class="deck-curve-panel" hidden></div>
              <div id="cardGrid" class="card-grid"></div>
            </div>
          </section>
        `;
        this.bind(root);
        this._initResizer();
        this._applyI18n(root);
        this.render();
    },

    _applyI18n(root) {
        if (typeof I18n === "undefined") return;
        root.querySelectorAll("[data-i18n]").forEach((el) => {
            el.textContent = I18n.t(el.getAttribute("data-i18n"));
        });
        root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
            el.placeholder = I18n.t(el.getAttribute("data-i18n-placeholder"));
        });
    },

    bind(root) {
        root.querySelector("#editionSelect").addEventListener("change", (e) => {
            AppUI.state.editionId = e.target.value;
            const ed = Store.getEdition(AppUI.state.editionId);
            AppUI.state.deckId = ed?.decks?.[0]?.id || null;
            AppUI.updateTitle();
            this.render();
        });

        root.querySelector("#btnNewEdition").addEventListener("click", () => {
            const name = prompt("Nome da nova edição:", `${(Store.project.editions.length + 1)}ª Edição`);
            if (name === null) return;
            const code = prompt("Código curto (ex.: 2ED):", `${Store.project.editions.length + 1}ED`);
            if (code === null) return;
            const ed = Store.createEdition({ name: name.trim() || "Nova Edição", code: (code || "NED").trim() });
            // Garante decks de recursos/equip se createEdition só cria cores
            this._ensureSpecialDecks(ed);
            AppUI.state.editionId = ed.id;
            AppUI.state.deckId = ed.decks[0]?.id || null;
            this.render();
        });

        root.querySelector("#btnRenameEdition").addEventListener("click", () => {
            const ed = Store.getEdition(AppUI.state.editionId);
            if (!ed) return;
            const name = prompt("Nome da edição:", ed.name);
            if (name === null || !name.trim()) return;
            const code = prompt("Código:", ed.code);
            if (code === null) return;
            Store.updateEdition(ed.id, { name: name.trim(), code: code.trim() });
            this.render();
        });

        root.querySelector("#editionFooter").addEventListener("input", (e) => {
            Store.updateEdition(AppUI.state.editionId, { footerText: e.target.value });
        });

        root.querySelector("#setSymbolUpload").addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                try { Store.setCustomIcon("set", null, reader.result); this.renderGrid(); }
                catch (err) { alert(err.message || "Falha"); }
            };
            reader.readAsDataURL(f);
        });

        root.querySelector("#btnClearSetSymbol").addEventListener("click", () => {
            Store.updateProjectMeta({ setSymbolDataUrl: null });
            if (Store.project.meta.icons) Store.project.meta.icons.set = null;
            Store.trySave();
            this.renderGrid();
        });

        root.querySelector("#btnNewCard").addEventListener("click", () => {
            const card = Store.createBlankCard(AppUI.state.editionId, AppUI.state.deckId);
            const deck = Store.getDeck(AppUI.state.editionId, AppUI.state.deckId);
            if (deck?.kind === "resources") card.category = "resource";
            if (deck?.kind === "equipment") card.category = "equipment";
            card.showCombat = deck?.kind === "equipment" || deck?.kind === "resources" ? false : true;
            Store.upsertCard(card);
            AppUI.openEditor(card.id);
        });

        root.querySelector("#btnPdfDeck")?.addEventListener("click", () => {
            const cards = Store.listCards({
                editionId: AppUI.state.editionId,
                deckId: AppUI.state.deckId
            });
            const deck = Store.getDeck(AppUI.state.editionId, AppUI.state.deckId);
            const name = (deck?.name || "deck").replace(/\s+/g, "_");
            Export.cardsToPDF(cards, { filename: `${name}.pdf` });
        });

        root.querySelector("#btnPdfEdition")?.addEventListener("click", () => {
            const cards = Store.listCards({ editionId: AppUI.state.editionId });
            const ed = Store.getEdition(AppUI.state.editionId);
            const name = (ed?.code || ed?.name || "edicao").replace(/\s+/g, "_");
            Export.cardsToPDF(cards, { filename: `${name}_edicao.pdf` });
        });

        root.querySelector("#btnPrintDeck").addEventListener("click", () => {
            Export.printCards(Store.listCards({
                editionId: AppUI.state.editionId,
                deckId: AppUI.state.deckId
            }));
        });

        root.querySelector("#btnPrintEdition").addEventListener("click", () => {
            Export.printCards(Store.listCards({ editionId: AppUI.state.editionId }));
        });

        root.querySelector("#btnCharacterSheet").addEventListener("click", () => {
            AppUI.state.view = "sheet";
            AppUI.render();
        });

        root.querySelector("#btnAddTag")?.addEventListener("click", () => {
            if (typeof TagSystem === "undefined") return;
            const id = prompt(I18n.t("lib.tagId") + ":", "custom_tag");
            if (id === null || !id.trim()) return;
            const pt = prompt(I18n.t("lib.tagLabelPt") + ":", id.trim());
            if (pt === null) return;
            const en = prompt(I18n.t("lib.tagLabelEn") + ":", pt);
            if (en === null) return;
            try {
                TagSystem.add(id, pt.trim(), (en || pt).trim());
                this.renderTagEditor();
            } catch (err) {
                alert(err.message || "Falha ao criar tag");
            }
        });

        root.querySelector("#searchCards").addEventListener("input", (e) => {
            AppUI.state.query = e.target.value;
            this.renderGrid();
        });

        root.querySelector("#btnDeckValidate")?.addEventListener("click", () => {
            this.showValidation();
        });

        root.querySelector("#btnExportTable")?.addEventListener("click", () => {
            this.openExportTable();
        });
        root.querySelector("#chkSimplified")?.addEventListener("change", (e) => {
            this.simplified = !!e.target.checked;
            this.renderGrid();
        });

        ["fltCost", "fltType", "fltRarity", "fltTag", "fltColor"].forEach((id) => {
            root.querySelector("#" + id)?.addEventListener("change", (e) => {
                const map = {
                    fltCost: "cost", fltType: "type", fltRarity: "rarity",
                    fltTag: "tag", fltColor: "color"
                };
                this.filters[map[id]] = e.target.value;
                this.renderGrid();
            });
        });
        root.querySelector("#btnClearFilters")?.addEventListener("click", () => {
            this.filters = { cost: "", type: "", rarity: "", tag: "", color: "" };
            ["fltCost", "fltType", "fltRarity", "fltTag", "fltColor"].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.value = "";
            });
            this.renderGrid();
        });
    },

    _fillFilterOptions(cards) {
        const typeSel = document.getElementById("fltType");
        const tagSel = document.getElementById("fltTag");
        const colorSel = document.getElementById("fltColor");
        if (typeSel) {
            const types = [...new Set(cards.map((c) => c.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
            const cur = this.filters.type;
            typeSel.innerHTML = `<option value="">Todos</option>` +
                types.map((t) => `<option value="${this._esc(t)}" ${t === cur ? "selected" : ""}>${this._esc(t)}</option>`).join("");
        }
        if (tagSel && typeof TagSystem !== "undefined") {
            const cur = this.filters.tag;
            tagSel.innerHTML = `<option value="">Todas</option>` +
                TagSystem.list().map((t) =>
                    `<option value="${t.id}" ${t.id === cur ? "selected" : ""}>${this._esc(TagSystem.label(t.id))}</option>`
                ).join("");
        }
        if (colorSel) {
            const cur = this.filters.color;
            const cols = Object.values(Catalog.colors);
            colorSel.innerHTML = `<option value="">Todas</option>` +
                cols.map((c) =>
                    `<option value="${c.id}" ${c.id === cur ? "selected" : ""}>${this._esc(c.name)} — ${this._esc(c.classes)}</option>`
                ).join("");
        }
        // restore other filter selects
        const costEl = document.getElementById("fltCost");
        if (costEl) costEl.value = this.filters.cost;
        const rarEl = document.getElementById("fltRarity");
        if (rarEl) rarEl.value = this.filters.rarity;
    },

    _applyFilters(cards) {
        const f = this.filters;
        return cards.filter((c) => {
            if (f.cost !== "") {
                const amt = Number(c.costs?.[0]?.amount) || 0;
                if (f.cost === "6") {
                    if (amt < 6) return false;
                } else if (amt !== Number(f.cost)) return false;
            }
            if (f.type && c.type !== f.type) return false;
            if (f.rarity && c.rarity !== f.rarity) return false;
            if (f.tag) {
                const tags = c.tags || [];
                const mechs = c.mechanics || [];
                if (!tags.includes(f.tag) && !mechs.includes(f.tag)) return false;
            }
            if (f.color) {
                const ids = c.colorIds || [];
                if (!ids.includes(f.color)) return false;
            }
            return true;
        });
    },

    openExportTable() {
        const all = Store.listCards({
            editionId: AppUI.state.editionId,
            deckId: AppUI.state.deckId
        });
        const cards = this._applyFilters(all);
        const deck = Store.getDeck(AppUI.state.editionId, AppUI.state.deckId);
        const en = I18n?.lang === "en-US";
        const cols = [
            { id: "name", label: en ? "Name" : "Nome", on: true },
            { id: "name_en", label: en ? "Name EN" : "Nome EN", on: true },
            { id: "type", label: en ? "Type" : "Tipo", on: true },
            { id: "subtype", label: en ? "Subtype" : "Subtipo", on: true },
            { id: "cost", label: en ? "Cost" : "Custo", on: true },
            { id: "resource", label: en ? "Resource" : "Recurso", on: true },
            { id: "class", label: en ? "Class color" : "Classe (cor)", on: true },
            { id: "rarity", label: en ? "Rarity" : "Raridade", on: true },
            { id: "attack", label: "ATK", on: true },
            { id: "defense", label: "DEF", on: true },
            { id: "rules", label: en ? "Rules" : "Regras", on: true },
            { id: "rules_en", label: en ? "Rules EN" : "Regras EN", on: false },
            { id: "flavor", label: "Flavor / lore", on: true },
            { id: "flavor_en", label: "Flavor EN", on: false },
            { id: "tags", label: "Tags", on: true },
            { id: "mechanics", label: en ? "Mechanics" : "Mecânicas", on: true },
            { id: "collector", label: en ? "Collector #" : "Nº colecionador", on: false },
            { id: "score", label: "Score", on: false },
            { id: "effects", label: en ? "Effects" : "Efeitos", on: true },
            { id: "classAffinity", label: en ? "Class affinity" : "Sinergia classe", on: true }
        ];
        const checks = cols.map((c) =>
            `<label class="export-col"><input type="checkbox" data-col="${c.id}" ${c.on ? "checked" : ""}/> ${c.label}</label>`
        ).join("");

        // Modal customizado com checkboxes de coluna
        const prev = document.getElementById("uiModalRoot");
        if (prev) prev.remove();
        const root = document.createElement("div");
        root.id = "uiModalRoot";
        root.className = "ui-modal-root";
        root.innerHTML = `
          <div class="ui-modal-backdrop" data-act="cancel"></div>
          <div class="ui-modal ui-modal-wide" role="dialog">
            <h3>${en ? "Export deck table" : "Exportar tabela do deck"}</h3>
            <p class="ui-modal-msg">${cards.length} cartas · ${this._esc(deck?.name || "")}</p>
            <p class="hint">${en ? "Select columns:" : "Selecione as colunas:"}</p>
            <div class="export-cols">${checks}</div>
            <div class="ui-modal-actions">
              <button type="button" class="btn primary" data-fmt="csv">${en ? "Download CSV" : "Baixar CSV"}</button>
              <button type="button" class="btn" data-fmt="tsv">${en ? "Download TSV" : "Baixar TSV"}</button>
              <button type="button" class="btn ghost" id="btnExportCancel">${en ? "Cancel" : "Cancelar"}</button>
            </div>
          </div>`;
        document.body.appendChild(root);
        const close = () => { root.remove(); };
        // backdrop e botão Cancelar (selectors específicos — não misturar)
        root.querySelector(".ui-modal-backdrop")?.addEventListener("click", close);
        root.querySelector("#btnExportCancel")?.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
        });
        root.querySelectorAll("[data-fmt]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const selected = [...root.querySelectorAll(".export-cols input:checked")].map((el) => el.dataset.col);
                if (!selected.length) {
                    alert(en ? "Select at least one column." : "Selecione ao menos uma coluna.");
                    return;
                }
                this._downloadTable(cards, selected, btn.dataset.fmt);
                close();
            });
        });
        document.addEventListener("keydown", function onEsc(e) {
            if (e.key === "Escape") {
                close();
                document.removeEventListener("keydown", onEsc);
            }
        });
    },

    _cardField(c, col) {
        const lang = I18n?.lang || "pt-BR";
        const loc = c.i18n?.[lang] || {};
        const en = c.i18n?.["en-US"] || {};
        const colorId = (c.colorIds && c.colorIds[0]) || "";
        const colMeta = Catalog.colorById(colorId);
        switch (col) {
            case "name": return loc.name || c.name || "";
            case "name_en": return en.name || c.name || "";
            case "type": return loc.type || c.type || "";
            case "subtype": return loc.subtype || c.subtype || "";
            case "cost": return c.costs?.[0]?.amount ?? "";
            case "resource": return c.costs?.[0]?.resource || "";
            case "class": return colMeta ? `${colMeta.name} (${colMeta.classes})` : colorId;
            case "rarity": return Catalog.rarityById(c.rarity).label;
            case "attack": return c.showCombat ? (c.attack ?? "") : "";
            case "defense": return c.showCombat ? (c.defense ?? "") : "";
            case "rules": return (loc.rules || c.rules || "").replace(/\r?\n/g, " · ");
            case "rules_en": return (en.rules || "").replace(/\r?\n/g, " · ");
            case "flavor": return (loc.flavor || c.flavor || "").replace(/\r?\n/g, " ");
            case "flavor_en": return (en.flavor || "").replace(/\r?\n/g, " ");
            case "tags": return (c.tags || []).join(", ");
            case "mechanics": return (c.mechanics || []).join(", ");
            case "collector": return c.collectorNumber || "";
            case "score": return c.score != null ? c.score : "";
            case "effects": return typeof EffectCatalog !== "undefined"
                ? EffectCatalog.summary(c.effects)
                : (c.effects || []).map((e) => e.type).join(", ");
            case "classAffinity": return c.classAffinity || (c.colorIds && c.colorIds[0]) || "";
            default: return "";
        }
    },

    _downloadTable(cards, columns, fmt) {
        const sep = fmt === "tsv" ? "\t" : ",";
        const esc = (v) => {
            const s = String(v ?? "");
            if (fmt === "tsv") return s.replace(/\t/g, " ").replace(/\r?\n/g, " ");
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const header = columns.join(sep);
        const rows = cards.map((c) => columns.map((col) => esc(this._cardField(c, col))).join(sep));
        const body = [header, ...rows].join("\n");
        const blob = new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        const deck = Store.getDeck(AppUI.state.editionId, AppUI.state.deckId);
        const safe = (deck?.name || "deck").replace(/[^\w\-]+/g, "_");
        a.href = URL.createObjectURL(blob);
        a.download = `${safe}_cartas.${fmt === "tsv" ? "tsv" : "csv"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },

    showValidation() {
        const deck = Store.getDeck(AppUI.state.editionId, AppUI.state.deckId);
        const cards = Store.listCards({
            editionId: AppUI.state.editionId,
            deckId: AppUI.state.deckId
        });
        if (typeof DeckTools === "undefined") {
            alert("DeckTools não carregado.");
            return;
        }
        const kind = deck?.kind || "color";
        const report = DeckTools.validate(cards, {
            kind,
            enforceCurve: kind === "color"
        });
        const panel = document.getElementById("deckCurve");
        if (panel) {
            panel.hidden = false;
            panel.innerHTML = `
              <div class="curve-head">
                <strong>Curva · média ${report.avg.toFixed(2)} · ${report.size} cartas</strong>
                ${DeckTools.curveBarsHTML(report.curve, kind === "color" ? DeckTools.TARGET_CURVE : null)}
              </div>
              <div class="curve-msgs">
                ${report.errors.map((e) => `<div class="curve-err">⚠ ${this._esc(e)}</div>`).join("")}
                ${report.warnings.map((w) => `<div class="curve-warn">· ${this._esc(w)}</div>`).join("")}
                ${report.ok && !report.warnings.length ? `<div class="curve-ok">Deck válido e curva no alvo.</div>` : ""}
              </div>`;
        }
        if (report.errors.length) {
            alert("Problemas:\n" + report.errors.join("\n") +
                (report.warnings.length ? "\n\nAvisos:\n" + report.warnings.slice(0, 6).join("\n") : ""));
        } else if (report.warnings.length) {
            alert("Avisos de balanceamento:\n" + report.warnings.slice(0, 10).join("\n"));
        } else {
            alert(I18n.lang === "en-US" ? "Deck looks good." : "Deck ok — tamanho e regras básicas ok.");
        }
    },

    _ensureSpecialDecks(ed) {
        if (!ed.decks.find((d) => d.kind === "resources")) {
            ed.decks.push({
                id: ID.create("deck"), colorIds: ["orange"], name: "Recursos",
                classes: "Ouro, poções e utilitários", kind: "resources", cardIds: []
            });
        } else {
            const rd = ed.decks.find((d) => d.kind === "resources");
            if (rd && (!rd.colorIds || rd.colorIds[0] === "silver" || rd.colorIds[0] === "white")) {
                rd.colorIds = ["orange"];
            }
        }
        if (!ed.decks.find((d) => d.kind === "equipment")) {
            ed.decks.push({
                id: ID.create("deck"), colorIds: ["gear"], name: "Equipamentos",
                classes: "Itens (cor = sinergia de classe)", kind: "equipment", cardIds: []
            });
        } else {
            const eq = ed.decks.find((d) => d.kind === "equipment");
            if (eq && eq.colorIds && (eq.colorIds[0] === "white" || eq.colorIds[0] === "silver")) {
                eq.colorIds = ["gear"];
            }
        }
        Store.save();
    },

    render() {
        const edSelect = document.getElementById("editionSelect");
        if (!edSelect) return;

        if (!Store.getEdition(AppUI.state.editionId) && Store.project.editions[0]) {
            AppUI.state.editionId = Store.project.editions[0].id;
        }

        const ed = Store.getEdition(AppUI.state.editionId);
        if (ed) this._ensureSpecialDecks(ed);

        edSelect.innerHTML = Store.project.editions.map((e) =>
            `<option value="${e.id}" ${e.id === AppUI.state.editionId ? "selected" : ""}>${this._esc(e.name)} (${this._esc(e.code)})</option>`
        ).join("");

        const footer = document.getElementById("editionFooter");
        if (footer && document.activeElement !== footer) footer.value = ed?.footerText || "";

        if (ed && !ed.decks.find((d) => d.id === AppUI.state.deckId)) {
            AppUI.state.deckId = ed.decks[0]?.id || null;
        }

        const deckList = document.getElementById("deckList");
        const colorDecks = (ed?.decks || []).filter((d) => d.kind !== "resources" && d.kind !== "equipment");
        const special = (ed?.decks || []).filter((d) => d.kind === "resources" || d.kind === "equipment");

        const chip = (d) => {
            const col = Catalog.colorById(d.colorIds[0]);
            const count = Store.listCards({ editionId: ed.id, deckId: d.id }).length;
            const active = d.id === AppUI.state.deckId ? "active" : "";
            const kindLabel = d.kind === "resources" ? "Recursos" : d.kind === "equipment" ? "Equipamentos" : d.classes;
            return `
              <button type="button" class="deck-chip ${active}" data-deck="${d.id}" style="--chip:${col.primary}">
                <span class="deck-swatch" style="background:${col.primary}"></span>
                <span class="deck-meta">
                  <strong>${this._esc(d.name)}</strong>
                  <small>${this._esc(kindLabel)}</small>
                  <small class="muted">${count} cartas</small>
                </span>
              </button>`;
        };

        const tClass = (typeof I18n !== "undefined") ? I18n.t("lib.classes") : "Classes";
        const tSpec = (typeof I18n !== "undefined") ? I18n.t("lib.special") : "Coleções especiais";
        deckList.innerHTML =
            `<div class="deck-group-label">${tClass}</div>` +
            colorDecks.map(chip).join("") +
            `<div class="deck-group-label">${tSpec}</div>` +
            special.map(chip).join("");

        deckList.querySelectorAll(".deck-chip").forEach((btn) => {
            btn.addEventListener("click", () => {
                AppUI.state.deckId = btn.dataset.deck;
                AppUI.updateTitle();
                this.render();
            });
        });

        this.renderTagEditor();
        this.renderGrid();
        AppUI.updateTitle();
    },

    renderTagEditor() {
        const box = document.getElementById("tagEditorList");
        if (!box || typeof TagSystem === "undefined") return;
        const tags = TagSystem.list();
        const lang = (typeof I18n !== "undefined" && I18n.lang) || "pt-BR";
        box.innerHTML = tags.map((t) => {
            const label = t.label?.[lang] || t.label?.["pt-BR"] || t.id;
            return `
              <div class="tag-editor-row" data-tag="${this._esc(t.id)}">
                <code class="tag-id">${this._esc(t.id)}</code>
                <span class="tag-label">${this._esc(label)}</span>
                <button type="button" class="btn ghost tiny" data-tag-act="edit" title="Editar">✎</button>
                <button type="button" class="btn danger ghost tiny" data-tag-act="del" title="Remover">×</button>
              </div>`;
        }).join("") || `<p class="hint muted">—</p>`;

        box.querySelectorAll(".tag-editor-row").forEach((row) => {
            const id = row.dataset.tag;
            row.querySelector('[data-tag-act="edit"]')?.addEventListener("click", () => {
                const t = TagSystem.list().find((x) => x.id === id);
                if (!t) return;
                const pt = prompt(I18n.t("lib.tagLabelPt") + ":", t.label?.["pt-BR"] || id);
                if (pt === null) return;
                const en = prompt(I18n.t("lib.tagLabelEn") + ":", t.label?.["en-US"] || pt);
                if (en === null) return;
                TagSystem.update(id, pt.trim(), en.trim());
                this.renderTagEditor();
            });
            row.querySelector('[data-tag-act="del"]')?.addEventListener("click", () => {
                if (!confirm(`Remover tag "${id}"?`)) return;
                TagSystem.remove(id);
                this.renderTagEditor();
            });
        });
    },

    renderGrid() {
        const grid = document.getElementById("cardGrid");
        const stats = document.getElementById("libStats");
        if (!grid) return;

        const allCards = Store.listCards({
            editionId: AppUI.state.editionId,
            deckId: AppUI.state.deckId,
            query: AppUI.state.query
        });
        this._fillFilterOptions(allCards);
        const cards = this._applyFilters(allCards);

        if (stats) {
            const ed = Store.getEdition(AppUI.state.editionId);
            const deck = Store.getDeck(AppUI.state.editionId, AppUI.state.deckId);
            let extra = "";
            if (typeof DeckTools !== "undefined" && allCards.length) {
                const avg = DeckTools.averageCost(allCards);
                extra = ` · média custo ${avg.toFixed(1)}`;
                if (deck?.kind === "color" && allCards.length !== 50) extra += ` · ⚠ ${allCards.length}/50`;
            }
            const filt = cards.length !== allCards.length ? ` · filtradas ${cards.length}/${allCards.length}` : "";
            stats.textContent = `${allCards.length} carta${allCards.length === 1 ? "" : "s"}${filt} · ${ed?.name || ""}${extra}`;
        }
        // atualiza mini-curva se painel aberto
        const panel = document.getElementById("deckCurve");
        if (panel && !panel.hidden && typeof DeckTools !== "undefined") {
            const deck = Store.getDeck(AppUI.state.editionId, AppUI.state.deckId);
            const report = DeckTools.validate(allCards, { kind: deck?.kind || "color", enforceCurve: deck?.kind === "color" });
            panel.innerHTML = `
              <div class="curve-head">
                <strong>Curva · média ${report.avg.toFixed(2)} · ${report.size} cartas</strong>
                ${DeckTools.curveBarsHTML(report.curve, deck?.kind === "color" ? DeckTools.TARGET_CURVE : null)}
              </div>`;
        }

        if (!cards.length) {
            grid.innerHTML = `
              <div class="empty-state">
                <p>${allCards.length ? "Nenhuma carta com estes filtros." : "Nenhuma carta nesta coleção."}</p>
                ${allCards.length
                    ? `<button type="button" class="btn ghost" id="btnEmptyClearFilt">Limpar filtros</button>`
                    : `<button type="button" class="btn primary" id="btnEmptyNew">Criar primeira carta</button>`}
              </div>`;
            grid.querySelector("#btnEmptyNew")?.addEventListener("click", () => {
                const card = Store.createBlankCard(AppUI.state.editionId, AppUI.state.deckId);
                AppUI.openEditor(card.id);
            });
            grid.querySelector("#btnEmptyClearFilt")?.addEventListener("click", () => {
                document.getElementById("btnClearFilters")?.click();
            });
            return;
        }

        const lang = (typeof I18n !== "undefined" && I18n.lang) || "pt-BR";
        grid.innerHTML = cards.map((c) => {
            const loc = c.i18n?.[lang];
            const name = loc?.name || c.name || "";
            const type = loc?.type || c.type || "";
            const subtype = loc?.subtype || c.subtype || "";
            return `
          <article class="card-tile" data-id="${c.id}">
            <div class="card-tile-preview" id="thumb_${c.id}"></div>
            <div class="card-tile-info">
              <strong>${this._esc(name)}</strong>
              <span>${this._esc(type)}${subtype ? " · " + this._esc(subtype) : ""}</span>
              <span class="muted">${this._esc(c.collectorNumber || "")} · ${Catalog.rarityById(c.rarity).label}
                ${c.score != null ? " · score " + c.score : ""}</span>
            </div>
            <div class="card-tile-actions">
              <button type="button" data-act="edit" class="btn small">Editar</button>
              <button type="button" data-act="dup" class="btn ghost small">Duplicar</button>
              <button type="button" data-act="del" class="btn danger small">Excluir</button>
            </div>
          </article>`;
        }).join("");

        // Miniaturas: render em tamanho nativo (750×1050, scale=1).
        // O CSS (100cqw/750 + --thumb-scale) encolhe o mount para 100% da largura do tile.
        // Assim a carta NUNCA fica “menor e à esquerda” por medição JS errada.
        // Renderização ultra-rápida: Lazy loading por demanda usando IntersectionObserver.
        // Apenas desenha no DOM as cartas que estão VISÍVEIS na tela do usuário.
        if (this._gridObserver) this._gridObserver.disconnect();
        this._gridObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const preview = entry.target;
                    const cardId = preview.dataset.cardId;
                    const card = cards.find((item) => item.id === cardId);
                    if (card && !preview._rendered) {
                        preview._rendered = true;
                        preview.innerHTML = "";
                        // Padrão: carta completa. Simplified = apenas a arte.
                        const useFull = !this.simplified;
                        CardView.thumbnail(preview, card, 750, { full: useFull, nativeSize: true });
                        const w = preview.clientWidth || 220;
                        preview.style.setProperty("--thumb-scale", String(w / 750));
                        // Chromium: força renderização de alta qualidade no downscale
                        preview.style.setProperty("image-rendering", "auto");
                    }
                }
            });
        }, { rootMargin: "200px 0px" });

        cards.forEach((c) => {
            const preview = document.getElementById("thumb_" + c.id);
            if (preview) {
                preview.dataset.cardId = c.id;
                this._gridObserver.observe(preview);
            }
        });

        grid.querySelectorAll(".card-tile").forEach((tile) => {
            const id = tile.dataset.id;
            tile.querySelector('[data-act="edit"]').addEventListener("click", () => AppUI.openEditor(id));
            tile.querySelector('[data-act="dup"]').addEventListener("click", async () => {
                const copy = await Store.duplicateCard(id);
                if (copy) this.render();
            });
            tile.querySelector('[data-act="del"]').addEventListener("click", async () => {
                if (confirm("Excluir esta carta?")) {
                    await Store.deleteCard(id);
                    this.render();
                }
            });
            tile.querySelector(".card-tile-preview").addEventListener("click", () => AppUI.openEditor(id));
        });
    },

    _resizerBound: false,

    _initResizer() {
        const layout = document.getElementById("libraryLayout");
        const handle = document.getElementById("libResizer");
        if (!layout || !handle) return;
        const KEY = "tcg-lib-panel-w";
        const saved = localStorage.getItem(KEY);
        if (saved) layout.style.setProperty("--panel-w", saved + "px");

        if (!LibraryUI._resizerBound) {
            LibraryUI._resizerBound = true;
            LibraryUI._resizeDrag = null;
            window.addEventListener("mousemove", (e) => {
                const st = LibraryUI._resizeDrag;
                if (!st) return;
                const w = Math.max(220, Math.min(480, e.clientX - st.left));
                st.layout.style.setProperty("--panel-w", w + "px");
                localStorage.setItem(KEY, String(Math.round(w)));
            });
            window.addEventListener("mouseup", () => {
                if (!LibraryUI._resizeDrag) return;
                LibraryUI._resizeDrag.handle.classList.remove("active");
                LibraryUI._resizeDrag = null;
            });
        }

        handle.addEventListener("mousedown", (e) => {
            const rect = layout.getBoundingClientRect();
            LibraryUI._resizeDrag = { layout, handle, left: rect.left };
            handle.classList.add("active");
            e.preventDefault();
        });
    },

    _esc(s) {
        return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }
};
