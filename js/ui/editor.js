/* ==========================================================
   Darkstar Forge — Editor de carta
========================================================== */

var EditorUI = {
    card: null,
    _timer: null,
    _savedJson: null,
    _editLang: "pt-BR",
    dirty: false,

    mount(root, cardId) {
        const src = Store.getCard(cardId);
        if (!src) {
            root.innerHTML = `<div class="empty-state"><p>Carta não encontrada.</p>
              <button class="btn" id="backLib">Voltar</button></div>`;
            root.querySelector("#backLib")?.addEventListener("click", () => AppUI.openLibrary());
            return;
        }
        // Cópia de trabalho — só grava no Store ao Salvar
        this.card = JSON.parse(JSON.stringify(src));
        if (!this.card.i18n) {
            this.card.i18n = {
                "pt-BR": { name: this.card.name||"", type: this.card.type||"", subtype: this.card.subtype||"", rules: this.card.rules||"", flavor: this.card.flavor||"" },
                "en-US": { name: this.card.name||"", type: this.card.type||"", subtype: this.card.subtype||"", rules: this.card.rules||"", flavor: this.card.flavor||"" }
            };
        }
        if (!Array.isArray(this.card.tags)) this.card.tags = [];
        this._editLang = (typeof I18n !== "undefined" && I18n.lang) || "pt-BR";
        this._savedJson = this._snapshot(this.card);
        this.dirty = false;

        root.innerHTML = `
          <section class="editor" id="editorLayout">
            <aside class="editor-panel" id="editorPanel">
              <div class="panel-scroll">
                <div class="panel-actions top">
                  <button type="button" class="btn ghost" id="btnBack">← Biblioteca</button>
                  <button type="button" class="btn" id="btnDup">Duplicar</button>
                  <button type="button" class="btn primary" id="btnSave">Salvar</button>
                </div>
                <div id="dirtyBadge" class="dirty-badge" hidden>Alterações não salvas</div>

                <h3>Idioma da carta</h3>
                <div class="lang-switch card-lang" id="cardLangSwitch">
                  <button type="button" class="lang-btn" data-clang="pt-BR">🇧🇷 PT-BR</button>
                  <button type="button" class="lang-btn" data-clang="en-US">🇺🇸 EN-US</button>
                </div>
                <p class="hint">Edite o texto em cada idioma. A UI global troca o idioma exibido nas cartas.</p>

                <h3>Identidade</h3>
                <label class="field"><span>Nome</span>
                  <input id="fName" type="text" maxlength="60" class="case-free"/></label>
                <div class="row2">
                  <label class="field"><span>Tipo</span>
                    <div class="type-combo" id="typeCombo">
                      <input id="fType" type="text" class="case-free field-control" autocomplete="off" placeholder="Tipo da carta"/>
                      <button type="button" class="type-combo-btn" id="btnTypeList" title="Lista de tipos" aria-label="Abrir lista de tipos">▾</button>
                      <div class="type-combo-menu" id="typeComboMenu" hidden>
                        ${Catalog.cardTypes.map((t) =>
                          `<button type="button" class="type-combo-item" data-type="${t}">${t}</button>`
                        ).join("")}
                      </div>
                    </div>
                  </label>
                  <label class="field"><span>Subtipo</span>
                    <input id="fSubtype" type="text" class="case-free"/></label>
                </div>
                <label class="field"><span>Regras / habilidades</span>
                  <textarea id="fRules" rows="6" class="case-free"></textarea></label>
                <div class="symbol-bar" id="symbolBar">
                  <span class="symbol-bar-label">Inserir símbolo:</span>
                  ${Object.values(Catalog.resources).map((r) => `
                    <button type="button" class="sym-btn" data-token="{${r.id}}" title="${r.name}">
                      ${Icons.resource(r.id, 18)}
                      <span>${r.name}</span>
                    </button>`).join("")}
                </div>
                <p class="hint">Use tokens no texto, ex.: gaste 1 {mana} ou {fury}. Clique nos botões para inserir.</p>
                <label class="field"><span>Flavor / lore (opcional)</span>
                  <textarea id="fFlavor" rows="2" class="case-free"></textarea></label>
                <p class="editor-section-hint">Fonte e tamanho do flavor ficam em Tipografia.</p>

                <h3>Custo e combate</h3>
                <p class="editor-section-hint">Custo de recurso da classe · ATK/DEF para criaturas, mercenários e itens de combate.</p>
                <div class="row3">
                  <label class="field"><span>Recurso</span>
                    <div id="fResourceWrap" class="icon-select-wrap"></div>
                    <input type="hidden" id="fResource"/></label>
                  <label class="field"><span>Custo</span>
                    <input id="fCost" type="number" min="0" max="20"/></label>
                  <label class="field check"><span>Mostrar ATK/DEF</span>
                    <input id="fShowCombat" type="checkbox" checked/></label>
                </div>
                <div class="row2" id="combatRow">
                  <label class="field"><span>Ataque</span>
                    <input id="fAtk" type="number" min="0" max="99"/></label>
                  <label class="field"><span>Defesa</span>
                    <input id="fDef" type="number" min="0" max="99"/></label>
                </div>
                <label class="field check"><span>Custo manual (desliga auto)</span>
                  <input id="fManualCost" type="checkbox"/></label>
                <label class="field check"><span>Raridade manual (desliga auto)</span>
                  <input id="fManualRarity" type="checkbox"/></label>
                <div class="score-box" id="scoreBox">
                  <div class="score-line"><strong>Pontuação:</strong> <span id="scoreVal">0</span></div>
                  <div class="score-line muted" id="scoreFormula"></div>
                  <div class="score-line"><strong>Custo sugerido:</strong> <span id="scoreCost">1</span>
                    · <strong>Raridade auto:</strong> <span id="scoreRarity">comum</span></div>
                  <div class="score-breakdown muted" id="scoreBreak"></div>
                  <button type="button" class="btn small" id="btnRecalcScore">Recalcular custo automático</button>
                </div>
                <h3>Mecânicas (pontuação)</h3>
                <div id="mechList" class="mech-list"></div>

                <h3>Efeitos estruturados</h3>
                <p class="editor-section-hint">Dados para validação/export e futuro simulador (paralelo ao texto de regras).</p>
                <div id="effectList" class="effect-list"></div>
                <button type="button" class="btn small" id="btnAddEffect">+ Efeito</button>
                <button type="button" class="btn ghost small" id="btnEffectsFromMech">Gerar a partir das mecânicas</button>

                <h3>Cores (híbrido)</h3>
                <div id="colorPick" class="color-pick"></div>
                <p class="hint">1 cor = mono · 2+ = híbrido (gradiente no frame).</p>
                <label class="field" id="classAffinityWrap" hidden>
                  <span>Sinergia de classe (equipamento)</span>
                  <select id="fClassAffinity" class="field-control">
                    <option value="">(auto)</option>
                    ${["red","blue","green","black","purple","white","silver"].map((id) => {
                        const col = Catalog.colors[id];
                        return `<option value="${id}">${col.name} — ${col.classes}</option>`;
                    }).join("")}
                  </select>
                </label>

                <h3>Raridade & rodapé</h3>
                <div class="row2">
                  <label class="field"><span>Raridade</span>
                    <select id="fRarity">
                      ${Catalog.rarities.map((r) => `<option value="${r.id}">${r.label}</option>`).join("")}
                    </select></label>
                  <label class="field"><span>Nº colecionador</span>
                    <input id="fNumber" type="text" placeholder="001/050" class="case-free"/></label>
                </div>
                <label class="field"><span>Texto do rodapé</span>
                  <input id="fFooter" type="text" class="case-free"/></label>
                <label class="field"><span>Símbolo de raridade custom (para o nível selecionado)</span>
                  <input id="fIconRarity" type="file" accept="image/*"/></label>
                <p class="hint">Sem contorno colorido por padrão. Upload opcional de PNG por raridade.</p>

                <h3>Arte (Full Art)</h3>
                <p class="editor-section-hint">Arraste a arte na pré-visualização para reposicionar.</p>
                <div class="panel-group">
                  <label class="field"><span>Upload</span>
                    <input id="fArt" type="file" accept="image/*"/></label>
                  <label class="field"><span>Zoom: <b id="zmVal">100%</b></span>
                    <input id="fZoom" type="range" min="50" max="250" value="100"/></label>
                  <label class="field"><span>Posição X</span>
                    <input id="fOX" type="range" min="-400" max="400" value="0"/></label>
                  <label class="field"><span>Posição Y</span>
                    <input id="fOY" type="range" min="-400" max="400" value="0"/></label>
                  <label class="field check"><span>Espelhar</span>
                    <input id="fMirror" type="checkbox"/></label>
                  <button type="button" class="btn ghost small" id="btnClearArt">Remover arte</button>
                  <h4 class="subhead">Biblioteca de artes</h4>
                  <p class="hint">
                    <strong>Upload</strong> salva a arte na biblioteca do programa (fica disponível para reutilizar em qualquer carta).
                    Também lista arquivos em <code>assets/artwork</code> (seed).
                  </p>
                  <div id="artworkLib" class="artwork-lib"></div>
                  <button type="button" class="btn ghost small" id="btnRefreshArtwork">Atualizar lista</button>
                </div>

                <h3>Tipografia</h3>
                <p class="editor-section-hint">Padrão: título Comfortaa 30 · tipo Noto Sans 25 · regras Noto Sans 23 · rodapé Source Sans 18 · flavor EB Garamond 26.</p>
                <div class="panel-group">
                  <label class="field"><span>Fonte do título</span>
                    <select id="fFamTitle" class="font-select"></select></label>
                  <label class="field"><span>Tamanho do título: <b id="ftTitle">30</b>px</span>
                    <input id="fFontTitle" type="range" min="18" max="48" value="30"/></label>
                  <label class="field"><span>Fonte do tipo</span>
                    <select id="fFamType" class="font-select"></select></label>
                  <label class="field"><span>Tamanho do tipo: <b id="ftType">25</b>px</span>
                    <input id="fFontType" type="range" min="14" max="36" value="25"/></label>
                  <label class="field"><span>Fonte das regras</span>
                    <select id="fFamRules" class="font-select"></select></label>
                  <label class="field"><span>Tamanho das regras: <b id="ftRules">23</b>px</span>
                    <input id="fFontRules" type="range" min="14" max="32" value="23"/></label>
                  <label class="field"><span>Fonte do rodapé</span>
                    <select id="fFamFooter" class="font-select"></select></label>
                  <label class="field"><span>Tamanho do rodapé: <b id="ftFooter">18</b>px</span>
                    <input id="fFontFooter" type="range" min="12" max="26" value="18"/></label>
                  <label class="field"><span>Fonte do flavor</span>
                    <select id="fFamFlavor" class="font-select"></select></label>
                  <label class="field"><span>Tamanho do flavor: <b id="ftFlavor">26</b>px</span>
                    <input id="fFontFlavor" type="range" min="12" max="36" value="26"/></label>
                  <label class="field"><span>Importar fonte (ttf / otf / woff / woff2)</span>
                    <input id="fFontImport" type="file" accept=".ttf,.otf,.woff,.woff2,font/*"/></label>
                </div>

                <h3>Ícones e combate visual</h3>
                <div class="panel-group">
                  <label class="field"><span>Ícone de recurso: <b id="icResVal">40</b>px</span>
                    <input id="fIconResSize" type="range" min="20" max="56" value="40"/></label>
                  <label class="field"><span>Ícone de classe: <b id="icClsVal">56</b>px</span>
                    <input id="fIconClsSize" type="range" min="28" max="72" value="56"/></label>
                  <label class="field"><span>Logotipo (set): <b id="icSetVal">30</b>px</span>
                    <input id="fIconSetSize" type="range" min="16" max="48" value="30"/></label>
                  <label class="field"><span>Tamanho ATK/DEF: <b id="ftStat">34</b>px</span>
                    <input id="fFontStat" type="range" min="20" max="48" value="34"/></label>
                  <label class="field"><span>Ícone ATK/DEF: <b id="icCbtVal">40</b>px</span>
                    <input id="fIconCombatSize" type="range" min="18" max="56" value="40"/></label>
                  <label class="field"><span>Símbolo custom de Ataque (espada)</span>
                    <input id="fIconSword" type="file" accept="image/*"/></label>
                  <label class="field"><span>Símbolo custom de Defesa (escudo)</span>
                    <input id="fIconShield" type="file" accept="image/*"/></label>
                </div>

                <h3>Template & frame</h3>
                <div class="panel-group">
                  <label class="field"><span>Template</span>
                    <select id="fTemplate"></select></label>
                  <label class="field"><span>Enviar template (PNG/SVG overlay full art)</span>
                    <input id="fTemplateUpload" type="file" accept="image/png,image/svg+xml,image/*"/></label>
                  <p class="hint">Overlay na proporção 5:7, transparente sobre a arte.</p>
                  <label class="field"><span>Opacidade dos painéis: <b id="opVal">72%</b></span>
                    <input id="fOpacity" type="range" min="40" max="92" value="72"/></label>
                  <label class="field"><span>Espessura do frame: <b id="stVal">2.4</b></span>
                    <input id="fStroke" type="range" min="1" max="6" step="0.1" value="2.4"/></label>
                  <label class="field"><span>Glow: <b id="glVal">8</b></span>
                    <input id="fGlow" type="range" min="0" max="30" value="8"/></label>
                  <label class="field"><span>Altura da caixa de regras: <b id="rhVal">300</b></span>
                    <input id="fRulesH" type="range" min="160" max="400" value="300"/></label>
                </div>

                <h3>Ícones personalizados (projeto)</h3>
                <div class="panel-group">
                  <label class="field"><span>Logotipo do jogo (set)</span>
                    <input id="fIconSet" type="file" accept="image/*"/></label>
                  <label class="field"><span>Ícone do recurso desta carta</span>
                    <input id="fIconRes" type="file" accept="image/*"/></label>
                  <label class="field"><span>Ícone de classe (cor primária da carta)</span>
                    <input id="fIconClass" type="file" accept="image/*"/></label>
                  <p class="hint">PNG transparente. Padrões em assets/icons.</p>
                </div>

                <h3>Preset de estilo</h3>
                <div class="panel-group">
                  <label class="field"><span>Preset salvo</span>
                    <select id="fPresetList"></select></label>
                  <div class="preset-actions">
                    <div class="row2">
                      <button type="button" class="btn small" id="btnSavePreset">Salvar estilo atual</button>
                      <button type="button" class="btn small" id="btnApplyPreset">Aplicar preset</button>
                    </div>
                    <button type="button" class="btn small primary" id="btnApplyPresetDeck">Aplicar a toda a coleção/deck</button>
                  </div>
                  <p class="hint">Salva cores, tipografia, opacidade, glow, ícones e template.</p>
                </div>

                <h3>Tags</h3>
                <div id="tagMulti" class="tag-multi"></div>
                <p class="hint">Filtram slots na ficha. Edite a lista em Biblioteca → Tags.</p>

                <div class="panel-actions bottom">
                  <button type="button" class="btn" id="btnExportPNG">Exportar PNG</button>
                  <button type="button" class="btn danger ghost" id="btnDelete">Excluir carta</button>
                </div>
              </div>
            </aside>
            <div class="panel-resizer" id="editorResizer" title="Arraste para redimensionar"></div>
            <main class="editor-stage">
              <div id="cardPreview" class="card-preview"></div>
              <p class="stage-hint">Pré-visualização · 750×1050 px · arraste a arte para reposicionar</p>
            </main>
          </section>
        `;

        this.fillForm();
        this.bind();
        this._initResizer();
        this.refreshPreview();
    },

    fillForm() {
        const c = this.card;
        const loc = (c.i18n && c.i18n[this._editLang]) || {};
        document.getElementById("fName").value = loc.name ?? c.name ?? "";
        document.getElementById("fType").value = loc.type ?? c.type ?? "";
        document.getElementById("fSubtype").value = loc.subtype ?? c.subtype ?? "";
        document.getElementById("fRules").value = loc.rules ?? c.rules ?? "";
        document.getElementById("fFlavor").value = loc.flavor ?? c.flavor ?? "";
        document.getElementById("fCost").value = c.costs?.[0]?.amount ?? 1;
        // card language buttons
        document.querySelectorAll("#cardLangSwitch .lang-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.clang === this._editLang);
        });
        this._fillPresets();
        this._fillTags();
        document.getElementById("fShowCombat").checked = c.showCombat !== false;
        document.getElementById("fAtk").value = c.attack ?? 1;
        document.getElementById("fDef").value = c.defense ?? 1;
        document.getElementById("fManualCost").checked = !!c.manualCost;
        document.getElementById("fManualRarity").checked = !!c.manualRarity;
        document.getElementById("fRarity").value = c.rarity || "common";
        document.getElementById("fNumber").value = c.collectorNumber || "";
        document.getElementById("fFooter").value = c.footerText || "";
        this._fillTemplateSelect(c.templateId || "classic-fullart");
        this._fillFontSelects(c);
        document.getElementById("fOpacity").value = Math.round((c.style?.panelOpacity ?? 0.72) * 100);
        document.getElementById("fStroke").value = c.style?.strokeWidth ?? 2.4;
        document.getElementById("fGlow").value = c.style?.glow ?? 8;
        document.getElementById("fRulesH").value = c.style?.rulesHeight ?? 300;
        document.getElementById("fFontTitle").value = c.style?.fontTitle ?? 30;
        document.getElementById("fFontType").value = c.style?.fontType ?? 25;
        document.getElementById("fFontRules").value = c.style?.fontRules ?? 23;
        document.getElementById("fFontFooter").value = c.style?.fontFooter ?? 18;
        if (document.getElementById("fFontFlavor")) {
            document.getElementById("fFontFlavor").value = c.style?.fontFlavor ?? 26;
        }
        document.getElementById("fZoom").value = c.art?.zoom ?? 100;
        document.getElementById("fOX").value = c.art?.offsetX ?? 0;
        document.getElementById("fOY").value = c.art?.offsetY ?? 0;
        document.getElementById("fMirror").checked = !!c.art?.mirror;

        this._buildResourceSelect(c.costs?.[0]?.resource || "vigor");
        this._buildMechanicsList(c);
        this._buildEffectsList(c);
        const affWrap = document.getElementById("classAffinityWrap");
        const affSel = document.getElementById("fClassAffinity");
        const isEquip = c.category === "equipment" || c.deckId === "deck_equipment";
        if (affWrap) affWrap.hidden = !isEquip;
        if (affSel && isEquip) {
            affSel.value = c.classAffinity || (c.colorIds && c.colorIds[0]) || "";
        }
        this._loadArtworkLib();
        document.getElementById("fIconResSize").value = c.style?.iconResourceSize ?? 40;
        document.getElementById("fIconClsSize").value = c.style?.iconClassSize ?? 56;
        document.getElementById("fIconSetSize").value = c.style?.iconSetSize ?? 30;
        document.getElementById("fFontStat").value = c.style?.fontStat ?? 34;
        document.getElementById("fIconCombatSize").value = c.style?.iconCombatSize ?? 40;

        const pick = document.getElementById("colorPick");
        pick.innerHTML = Object.values(Catalog.colors).map((col) => {
            const on = (c.colorIds || []).includes(col.id) ? "on" : "";
            return `<button type="button" class="swatch ${on}" data-color="${col.id}"
              title="${col.name} — ${col.classes}" style="background:${col.primary}"></button>`;
        }).join("");

        this._syncCombatVisibility();
        this._syncLabels();
    },

    bind() {
        const live = [
            "fName", "fType", "fSubtype", "fRules", "fFlavor",
            "fResource", "fCost", "fShowCombat", "fAtk", "fDef",
            "fRarity", "fNumber", "fFooter", "fTemplate",
            "fOpacity", "fStroke", "fGlow", "fRulesH",
            "fFontTitle", "fFontType", "fFontRules", "fFontFooter", "fFontFlavor",
            "fFamTitle", "fFamType", "fFamRules", "fFamFooter", "fFamFlavor",
            "fIconResSize", "fIconClsSize", "fIconSetSize",
            "fFontStat", "fIconCombatSize",
            "fManualCost", "fManualRarity",
            "fZoom", "fOX", "fOY", "fMirror"
        ];
        live.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            const ev = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
            el.addEventListener(ev, () => this.applyFromForm(true));
        });

        document.querySelectorAll("#cardLangSwitch .lang-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                this.applyFromForm(false);
                this._editLang = btn.dataset.clang;
                this.fillForm();
                this.refreshPreview();
            });
        });

        // Combo de tipo: lista sempre completa (não filtra pelo texto atual)
        this._bindTypeCombo();

        document.getElementById("btnAddEffect")?.addEventListener("click", () => {
            if (!Array.isArray(this.card.effects)) this.card.effects = [];
            this.card.effects.push({ type: "damage", amount: 1, target: "any" });
            this._buildEffectsList(this.card);
            this.applyFromForm(true);
        });
        document.getElementById("btnEffectsFromMech")?.addEventListener("click", () => {
            if (typeof EffectCatalog === "undefined") return;
            this.card.effects = EffectCatalog.fromMechanics(this.card.mechanics || []);
            this._buildEffectsList(this.card);
            this.applyFromForm(true);
        });
        document.getElementById("fClassAffinity")?.addEventListener("change", () => this.applyFromForm(true));
        document.getElementById("btnRefreshArtwork")?.addEventListener("click", () => this._loadArtworkLib(true));

        document.getElementById("btnSavePreset")?.addEventListener("click", () => {
            this.applyFromForm(false);
            const name = prompt("Nome do preset de estilo:", "Meu estilo");
            if (!name) return;
            StylePreset.save(name, StylePreset.extract(this.card));
            this._fillPresets();
            alert("Preset salvo no projeto.");
        });
        document.getElementById("btnApplyPreset")?.addEventListener("click", () => {
            const id = document.getElementById("fPresetList")?.value;
            const entry = StylePreset.list().find((p) => p.id === id);
            if (!entry) return alert("Selecione um preset.");
            StylePreset.apply(this.card, entry.preset);
            this.fillForm();
            this.applyFromForm(true);
        });
        document.getElementById("btnApplyPresetDeck")?.addEventListener("click", async () => {
            const id = document.getElementById("fPresetList")?.value;
            const entry = StylePreset.list().find((p) => p.id === id);
            if (!entry) return alert("Selecione um preset.");
            if (!confirm("Aplicar este estilo a TODAS as cartas do deck/coleção atual?")) return;
            this.applyFromForm(false);
            await this._commitSave();
            const cards = Store.listCards({ editionId: this.card.editionId, deckId: this.card.deckId });
            StylePreset.applyToCards(entry.preset, cards);
            await Store.saveAsync();
            this.card = JSON.parse(JSON.stringify(Store.getCard(this.card.id)));
            this._savedJson = this._snapshot(this.card);
            this.dirty = false;
            this._updateDirtyBadge();
            this.fillForm();
            this.refreshPreview();
            alert(`Estilo aplicado a ${cards.length} cartas.`);
        });

        // Inserir símbolos no texto
        document.getElementById("symbolBar")?.addEventListener("click", (e) => {
            const btn = e.target.closest(".sym-btn");
            if (!btn) return;
            const ta = document.getElementById("fRules");
            const token = btn.dataset.token + " ";
            const start = ta.selectionStart ?? ta.value.length;
            const end = ta.selectionEnd ?? ta.value.length;
            ta.value = ta.value.slice(0, start) + token + ta.value.slice(end);
            ta.focus();
            const pos = start + token.length;
            ta.setSelectionRange(pos, pos);
            this.applyFromForm(true);
        });

        document.getElementById("colorPick").addEventListener("click", (e) => {
            const btn = e.target.closest(".swatch");
            if (!btn) return;
            const id = btn.dataset.color;
            let ids = [...(this.card.colorIds || [])];
            if (ids.includes(id)) {
                if (ids.length > 1) ids = ids.filter((x) => x !== id);
            } else {
                ids.push(id);
            }
            this.card.colorIds = ids;
            document.querySelectorAll("#colorPick .swatch").forEach((s) => {
                s.classList.toggle("on", ids.includes(s.dataset.color));
            });
            this.applyFromForm(true);
        });

        document.getElementById("fArt").addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            this._readImageFile(f, async (dataUrl) => {
                this.card.art = this.card.art || {};
                this.card.art.src = dataUrl;
                this.card.art.fileName = f.name || "upload.jpg";
                this.applyFromForm(true);
                // Salva na biblioteca permanente do programa (IndexedDB) para reutilizar
                try {
                    if (typeof MediaStore !== "undefined") {
                        await MediaStore.saveLibraryArt(dataUrl, f.name || "upload.jpg");
                        this._artworkCache = null; // força refresh
                        this._loadArtworkLib(true);
                    }
                } catch (err) {
                    console.warn("Não foi possível salvar arte na biblioteca:", err);
                }
            });
            e.target.value = "";
        });

        document.getElementById("btnClearArt").addEventListener("click", () => {
            if (this.card.art) this.card.art.src = null;
            this.applyFromForm(true);
        });

        // Uploads de ícones do projeto
        document.getElementById("fIconSet").addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            this._readImageFile(f, (url) => {
                try {
                    Store.setCustomIcon("set", null, url);
                    this.refreshPreview();
                } catch (err) {
                    alert(err.message || "Falha ao salvar ícone");
                }
            });
        });
        document.getElementById("fIconRes").addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const res = document.getElementById("fResource").value;
            this._readImageFile(f, (url) => {
                try {
                    Store.setCustomIcon("resource", res, url);
                    this.refreshPreview();
                } catch (err) {
                    alert(err.message || "Falha ao salvar ícone");
                }
            });
        });
        document.getElementById("fIconClass").addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const colorId = (this.card.colorIds && this.card.colorIds[0]) || "red";
            this._readImageFile(f, (url) => {
                try {
                    Store.setCustomIcon("class", colorId, url);
                    this.refreshPreview();
                } catch (err) {
                    alert(err.message || "Falha ao salvar ícone");
                }
            });
        });

        document.getElementById("fIconRarity")?.addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const rarity = document.getElementById("fRarity").value;
            this._readImageFile(f, (url) => {
                try {
                    Store.setCustomIcon("rarity", rarity, url);
                    this.refreshPreview();
                } catch (err) {
                    alert(err.message || "Falha ao salvar raridade");
                }
            }, true);
        });

        document.getElementById("fIconSword")?.addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            this._readImageFile(f, (url) => {
                try {
                    Store.setCustomIcon("combat", "sword", url);
                    this.refreshPreview();
                } catch (err) { alert(err.message || "Falha"); }
            }, true);
        });
        document.getElementById("fIconShield")?.addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            this._readImageFile(f, (url) => {
                try {
                    Store.setCustomIcon("combat", "shield", url);
                    this.refreshPreview();
                } catch (err) { alert(err.message || "Falha"); }
            }, true);
        });

        document.getElementById("btnRecalcScore")?.addEventListener("click", () => {
            this.card.manualCost = false;
            document.getElementById("fManualCost").checked = false;
            const ev = Scoring.apply(this.card, { forceCost: true });
            document.getElementById("fCost").value = ev.suggestedCost;
            document.getElementById("fRarity").value = this.card.rarity;
            this._updateScoreUI();
            this.refreshPreview();
            Store.trySave();
        });

        document.getElementById("fCost")?.addEventListener("change", () => {
            // Qualquer edição manual do custo ativa modo manual + raridade auto
            this.card.manualCost = true;
            document.getElementById("fManualCost").checked = true;
            if (!document.getElementById("fManualRarity").checked) {
                this.card.manualRarity = false;
            }
        });

        document.getElementById("fFontImport")?.addEventListener("change", async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
                const entry = await FontCatalog.importFontFile(f);
                this._fillFontSelects(this.card);
                // aplica na fonte do título por padrão
                document.getElementById("fFamTitle").value = entry.id;
                this.applyFromForm(true);
                alert(`Fonte "${entry.name}" importada.`);
            } catch (err) {
                console.error(err);
                alert("Não foi possível importar a fonte.");
            }
            e.target.value = "";
        });

        document.getElementById("fTemplateUpload")?.addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const name = prompt("Nome deste template:", f.name.replace(/\.[^.]+$/, "")) || "Template personalizado";
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const tpl = Store.addCustomTemplate({ name, overlayDataUrl: reader.result });
                    this.card.templateId = tpl.id;
                    this._fillTemplateSelect(tpl.id);
                    this.applyFromForm(true);
                } catch (err) {
                    alert(err.message || "Falha ao adicionar template");
                }
            };
            reader.readAsDataURL(f);
        });

        document.getElementById("btnBack").addEventListener("click", async () => {
            this.applyFromForm(false);
            if (this._isDirty()) {
                const choice = await UIModal.unsavedChanges();
                if (choice === "cancel") return;
                if (choice === "save") {
                    const result = await this._commitSave();
                    if (!result.ok) {
                        alert(result.error?.message || "Falha ao salvar");
                        return;
                    }
                }
            }
            AppUI.openLibrary();
        });

        document.getElementById("btnSave").addEventListener("click", async () => {
            this.applyFromForm(false);
            const result = await this._commitSave();
            if (result.ok) this._flash("Salvo");
            else alert(result.error?.message || "Falha ao salvar");
        });

        document.getElementById("btnDup").addEventListener("click", async () => {
            this.applyFromForm(false);
            if (this._isDirty()) {
                if (!confirm("Duplicar usará o estado atual (mesmo não salvo na carta original). Continuar?")) return;
            }
            await this._commitSave();
            const copy = await Store.duplicateCard(this.card.id);
            if (copy) AppUI.openEditor(copy.id);
        });

        document.getElementById("btnDelete").addEventListener("click", async () => {
            if (confirm("Excluir esta carta permanentemente?")) {
                await Store.deleteCard(this.card.id);
                AppUI.openLibrary();
            }
        });

        document.getElementById("btnExportPNG").addEventListener("click", async () => {
            this.applyFromForm(false);
            try {
                await Export.cardToPNG(this.card);
            } catch (err) {
                console.error(err);
                alert("Exportação PNG falhou. Use Chrome/Edge ou Imprimir deck.");
            }
        });
    },

    _fillTemplateSelect(selectedId) {
        const sel = document.getElementById("fTemplate");
        if (!sel) return;
        const list = Store.listTemplates();
        sel.innerHTML = list.map((t) =>
            `<option value="${t.id}">${t.name}${t.custom ? " (custom)" : ""}</option>`
        ).join("");
        if (selectedId) sel.value = selectedId;
    },

    _fillFontSelects(card) {
        const map = {
            fFamTitle: card.style?.fontFamilyTitle || "comfortaa",
            fFamType: card.style?.fontFamilyType || "noto-sans",
            fFamRules: card.style?.fontFamilyRules || "noto-sans",
            fFamFooter: card.style?.fontFamilyFooter || "source-sans",
            fFamFlavor: card.style?.fontFamilyFlavor || "eb-garamond"
        };
        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = FontCatalog.list().map((f) =>
                `<option value="${f.id}" style="font-family:${f.family.replace(/"/g, "&quot;")}">${f.name}</option>`
            ).join("");
            el.value = val;
            el.classList.add("font-select-styled");
            const applyFace = () => {
                el.style.fontFamily = FontCatalog.familyCss(el.value);
                // force style on options where supported
                [...el.options].forEach((opt) => {
                    const f = FontCatalog.get(opt.value);
                    if (f) opt.style.fontFamily = f.family;
                });
            };
            applyFace();
            el.addEventListener("change", applyFace);
        });
    },

    _resDocCloseBound: false,

    _buildResourceSelect(selected) {
        const wrap = document.getElementById("fResourceWrap");
        const hidden = document.getElementById("fResource");
        if (!wrap || !hidden) return;
        hidden.value = selected;
        wrap.innerHTML = `
          <button type="button" class="icon-select-btn" id="resSelectBtn">
            ${Icons.resource(selected, 20)}
            <span>${Catalog.resourceById(selected).name}</span>
            <span class="caret">▾</span>
          </button>
          <div class="icon-select-menu" id="resSelectMenu" hidden></div>`;
        const menu = wrap.querySelector("#resSelectMenu");
        menu.innerHTML = Object.values(Catalog.resources).map((r) => `
          <button type="button" class="icon-select-item" data-id="${r.id}">
            ${Icons.resource(r.id, 20)}
            <span>${r.name}</span>
          </button>`).join("");
        const btn = wrap.querySelector("#resSelectBtn");
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.hidden = !menu.hidden;
        });
        menu.querySelectorAll(".icon-select-item").forEach((item) => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                hidden.value = item.dataset.id;
                menu.hidden = true;
                // Atualiza só o botão, sem recriar listeners de document
                btn.innerHTML = `${Icons.resource(item.dataset.id, 20)}<span>${Catalog.resourceById(item.dataset.id).name}</span><span class="caret">▾</span>`;
                this.applyFromForm(true);
            });
        });
        if (!this._resDocCloseBound) {
            this._resDocCloseBound = true;
            document.addEventListener("click", () => {
                const m = document.getElementById("resSelectMenu");
                if (m) m.hidden = true;
            });
        }
    },

    _buildMechanicsList(card) {
        const box = document.getElementById("mechList");
        if (!box) return;
        const selected = new Set(card.mechanics || []);
        const list = ScoringTable.list().sort((a, b) => a.name.localeCompare(b.name, "pt"));
        box.innerHTML = list.map((m) => `
          <label class="mech-item" title="${m.desc || ""}">
            <input type="checkbox" data-mech="${m.id}" ${selected.has(m.id) ? "checked" : ""}/>
            <span class="mech-pts">${m.points >= 0 ? "+" : ""}${m.points}</span>
            <span>${m.name}</span>
          </label>`).join("");
        box.querySelectorAll("[data-mech]").forEach((cb) => {
            cb.addEventListener("change", () => {
                const id = cb.dataset.mech;
                const set = new Set(this.card.mechanics || []);
                if (cb.checked) set.add(id); else set.delete(id);
                this.card.mechanics = [...set];
                this.applyFromForm(true);
            });
        });
    },

    _updateScoreUI() {
        if (typeof Scoring === "undefined" || !this.card) return;
        const s = Scoring.summary(this.card);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set("scoreVal", s.score);
        set("scoreCost", s.suggestedCost);
        set("scoreRarity", Catalog.rarityById(s.autoRarity).label);
        set("scoreFormula", s.formula);
        set("scoreBreak", s.breakdown.map((b) => `${b.points >= 0 ? "+" : ""}${b.points} ${b.label}`).join(" · ") || "—");
    },

    _resizerBound: false,

    _initResizer() {
        const layout = document.getElementById("editorLayout");
        const handle = document.getElementById("editorResizer");
        if (!layout || !handle) return;

        const KEY = "tcg-editor-panel-w";
        const saved = localStorage.getItem(KEY);
        if (saved) layout.style.setProperty("--panel-w", saved + "px");

        // Listeners globais uma única vez
        if (!EditorUI._resizerBound) {
            EditorUI._resizerBound = true;
            EditorUI._resizeDrag = null;
            window.addEventListener("mousemove", (e) => {
                const st = EditorUI._resizeDrag;
                if (!st) return;
                const w = Math.max(280, Math.min(560, e.clientX - st.left));
                st.layout.style.setProperty("--panel-w", w + "px");
                localStorage.setItem(KEY, String(Math.round(w)));
            });
            window.addEventListener("mouseup", () => {
                if (!EditorUI._resizeDrag) return;
                EditorUI._resizeDrag.handle.classList.remove("active");
                EditorUI._resizeDrag = null;
                if (AppUI.state.view === "editor") EditorUI.refreshPreview();
            });
        }

        handle.addEventListener("mousedown", (e) => {
            const rect = layout.getBoundingClientRect();
            EditorUI._resizeDrag = { layout, handle, left: rect.left };
            handle.classList.add("active");
            e.preventDefault();
        });
    },

    _readImageFile(file, cb, keepPng = false) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                // Arte de carta: comprime para caber e performar; IDB guarda o blob
                const maxSide = keepPng ? 512 : 1100;
                let { width, height } = img;
                if (width > maxSide || height > maxSide) {
                    const s = maxSide / Math.max(width, height);
                    width = Math.round(width * s);
                    height = Math.round(height * s);
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = keepPng
                    ? canvas.toDataURL("image/png")
                    : canvas.toDataURL("image/jpeg", 0.78);
                cb(dataUrl);
            };
            img.onerror = () => cb(reader.result);
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    },

    applyFromForm() {
        const c = this.card;
        if (!c.i18n) c.i18n = { "pt-BR": {}, "en-US": {} };
        if (!c.i18n[this._editLang]) c.i18n[this._editLang] = {};
        const loc = c.i18n[this._editLang];
        loc.name = document.getElementById("fName").value;
        loc.type = document.getElementById("fType").value;
        loc.subtype = document.getElementById("fSubtype").value;
        loc.rules = document.getElementById("fRules").value;
        loc.flavor = document.getElementById("fFlavor").value;
        // espelha no idioma atual da UI (e campos legados)
        const uiLang = (typeof I18n !== "undefined" && I18n.lang) || "pt-BR";
        const show = c.i18n[uiLang] || loc;
        c.name = show.name || loc.name;
        c.type = show.type || loc.type;
        c.subtype = show.subtype || loc.subtype;
        c.rules = show.rules || loc.rules;
        c.flavor = show.flavor || loc.flavor;

        c.costs = [{
            resource: document.getElementById("fResource").value,
            amount: Number(document.getElementById("fCost").value) || 0
        }];
        c.showCombat = document.getElementById("fShowCombat").checked;
        c.attack = Number(document.getElementById("fAtk").value) || 0;
        c.defense = Number(document.getElementById("fDef").value) || 0;
        c.manualCost = document.getElementById("fManualCost").checked;
        c.manualRarity = document.getElementById("fManualRarity").checked;
        c.rarity = document.getElementById("fRarity").value;
        c.mechanics = [...(this.card.mechanics || [])];
        c.collectorNumber = document.getElementById("fNumber").value;
        c.footerText = document.getElementById("fFooter").value;
        c.templateId = document.getElementById("fTemplate").value;
        // tags
        c.tags = [...document.querySelectorAll("#tagMulti input[type=checkbox]:checked")].map((el) => el.value);

        // classAffinity (equipamento)
        const affEl = document.getElementById("fClassAffinity");
        if (affEl && !affEl.closest("[hidden]")) {
            c.classAffinity = affEl.value || null;
            if (c.classAffinity) c.colorIds = [c.classAffinity];
        }

        // effects from UI
        c.effects = this._readEffectsFromUI();

        c.style = c.style || {};
        c.style.panelOpacity = Number(document.getElementById("fOpacity").value) / 100;
        c.style.strokeWidth = Number(document.getElementById("fStroke").value);
        c.style.glow = Number(document.getElementById("fGlow").value);
        c.style.rulesHeight = Number(document.getElementById("fRulesH").value);
        c.style.fontTitle = Number(document.getElementById("fFontTitle").value);
        c.style.fontType = Number(document.getElementById("fFontType").value);
        c.style.fontRules = Number(document.getElementById("fFontRules").value);
        c.style.fontFooter = Number(document.getElementById("fFontFooter").value);
        c.style.fontFlavor = Number(document.getElementById("fFontFlavor")?.value) || 26;
        c.style.fontFamilyTitle = document.getElementById("fFamTitle")?.value || "comfortaa";
        c.style.fontFamilyType = document.getElementById("fFamType")?.value || "noto-sans";
        c.style.fontFamilyRules = document.getElementById("fFamRules")?.value || "noto-sans";
        c.style.fontFamilyFooter = document.getElementById("fFamFooter")?.value || "source-sans";
        c.style.fontFamilyFlavor = document.getElementById("fFamFlavor")?.value || "eb-garamond";
        c.style.iconResourceSize = Number(document.getElementById("fIconResSize")?.value) || 40;
        c.style.iconClassSize = Number(document.getElementById("fIconClsSize")?.value) || 56;
        c.style.iconSetSize = Number(document.getElementById("fIconSetSize")?.value) || 30;
        c.style.fontStat = Number(document.getElementById("fFontStat")?.value) || 34;
        c.style.iconCombatSize = Number(document.getElementById("fIconCombatSize")?.value) || 40;

        if (typeof Scoring !== "undefined") {
            if (!c.manualCost) {
                Scoring.apply(c, { forceCost: true });
                document.getElementById("fCost").value = c.costs[0].amount;
            } else {
                Scoring.apply(c);
                if (!c.manualRarity) document.getElementById("fRarity").value = c.rarity;
            }
        }
        this._updateScoreUI();

        c.art = c.art || {};
        c.art.zoom = Number(document.getElementById("fZoom").value);
        c.art.offsetX = Number(document.getElementById("fOX").value);
        c.art.offsetY = Number(document.getElementById("fOY").value);
        c.art.mirror = document.getElementById("fMirror").checked;

        this._syncCombatVisibility();
        this._syncLabels();
        this.refreshPreview();
        this._markDirty();
    },

    _isDirty() {
        try {
            this.applyFromForm();
            const dirty = this._snapshot(this.card) !== this._savedJson;
            this.dirty = dirty;
            this._updateDirtyBadge();
            return dirty;
        } catch (_) {
            return !!this.dirty;
        }
    },

    _markDirty() {
        try {
            this.dirty = this._snapshot(this.card) !== this._savedJson;
        } catch (_) {
            this.dirty = true;
        }
        this._updateDirtyBadge();
    },

    _updateDirtyBadge() {
        const b = document.getElementById("dirtyBadge");
        if (!b) return;
        let dirty = this.dirty;
        try {
            dirty = this._snapshot(this.card) !== this._savedJson;
            this.dirty = dirty;
        } catch (_) {}
        b.hidden = !dirty;
    },

    /** Snapshot para dirty — sem serializar dataURL da arte */
    _snapshot(card) {
        try {
            const c = JSON.parse(JSON.stringify(card));
            if (c.art) {
                const src = c.art.src || "";
                c.art.src = src
                    ? (src.startsWith("data:") ? `data:#${src.length}` : src)
                    : "";
            }
            if (c.artData && String(c.artData).startsWith("data:")) {
                c.artData = `data:#${c.artData.length}`;
            }
            return JSON.stringify(c);
        } catch (_) {
            return String(Date.now());
        }
    },

    async _commitSave() {
        this.applyFromForm();
        try {
            if (!this.card.id) this.card.id = ID.create("card");
            this.card.updatedAt = new Date().toISOString();
            if (this.card.category === "equipment" || this.card.deckId === "deck_equipment") {
                if (this.card.classAffinity) this.card.colorIds = [this.card.classAffinity];
            }
            Store.project.cards[this.card.id] = this.card;
            const deck = Store.getDeck(this.card.editionId, this.card.deckId);
            if (deck && !deck.cardIds.includes(this.card.id)) deck.cardIds.push(this.card.id);
            await Store.saveAsync();
            this._savedJson = this._snapshot(this.card);
            this.dirty = false;
            this._updateDirtyBadge();
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e };
        }
    },

    _buildEffectsList(card) {
        const box = document.getElementById("effectList");
        if (!box || typeof EffectCatalog === "undefined") return;
        if (!Array.isArray(card.effects)) card.effects = [];
        const types = EffectCatalog.TYPES;
        box.innerHTML = card.effects.map((e, i) => {
            const typeOpts = types.map((t) =>
                `<option value="${t.id}" ${e.type === t.id ? "selected" : ""}>${EffectCatalog.label(t.id)}</option>`
            ).join("");
            return `<div class="effect-row" data-i="${i}">
              <select data-ef="type" class="field-control">${typeOpts}</select>
              <input data-ef="amount" type="number" class="field-control" style="width:64px" value="${e.amount ?? 0}" title="amount"/>
              <input data-ef="keyword" type="text" class="field-control" placeholder="keyword" value="${this._escAttr(e.keyword || "")}"/>
              <button type="button" class="btn ghost tiny" data-ef-del="${i}">×</button>
            </div>`;
        }).join("") || `<p class="hint muted">Nenhum efeito estruturado.</p>`;
        box.querySelectorAll("[data-ef]").forEach((el) => {
            el.addEventListener("change", () => this.applyFromForm(true));
            el.addEventListener("input", () => this.applyFromForm(true));
        });
        box.querySelectorAll("[data-ef-del]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const i = Number(btn.getAttribute("data-ef-del"));
                this.card.effects.splice(i, 1);
                this._buildEffectsList(this.card);
                this.applyFromForm(true);
            });
        });
    },

    _readEffectsFromUI() {
        const rows = document.querySelectorAll("#effectList .effect-row");
        if (!rows.length) return this.card.effects || [];
        return [...rows].map((row) => {
            const type = row.querySelector('[data-ef="type"]')?.value || "other";
            const amount = Number(row.querySelector('[data-ef="amount"]')?.value) || 0;
            const keyword = row.querySelector('[data-ef="keyword"]')?.value || "";
            const e = { type };
            if (amount) e.amount = amount;
            if (keyword) e.keyword = keyword;
            if (type === "damage" && !e.target) e.target = "any";
            return typeof EffectCatalog !== "undefined" ? EffectCatalog.normalize(e) : e;
        }).filter(Boolean);
    },

    _escAttr(s) {
        return String(s || "").replace(/"/g, "&quot;");
    },

    /**
     * Biblioteca de artes:
     * 1) Uploads do usuário (IndexedDB — permanente no app/browser)
     * 2) Pasta assets/artwork (seed / arquivos soltos)
     */
    async _loadArtworkLib(force) {
        const box = document.getElementById("artworkLib");
        if (!box) return;
        if (!force && this._artworkCache) {
            this._renderArtworkLib(box, this._artworkCache);
            return;
        }
        box.innerHTML = `<p class="hint muted">Carregando biblioteca de artes…</p>`;

        const items = [];

        // 1) Biblioteca do usuário (upload) — sempre, funciona no Electron e no browser
        try {
            if (typeof MediaStore !== "undefined") {
                const lib = await MediaStore.listLibraryArt();
                lib.forEach((e) => {
                    items.push({
                        kind: "user",
                        id: e.id,
                        name: e.name || e.fileName || "arte",
                        dataUrl: e.dataUrl
                    });
                });
            }
        } catch (err) {
            console.warn("listLibraryArt:", err);
        }

        // 2) Pasta assets/artwork (seed)
        let folderFiles = [];
        try {
            const res = await fetch("/api/artwork?" + Date.now(), { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                folderFiles = Array.isArray(data) ? data : (data.files || []);
            }
        } catch (_) { /* ignore */ }
        if (!folderFiles.length) {
            try {
                folderFiles = await this._listArtworkFromDir();
            } catch (_) { /* ignore */ }
        }
        if (!folderFiles.length) {
            try {
                const res = await fetch("assets/artwork/manifest.json?" + Date.now(), { cache: "no-store" });
                if (res.ok) {
                    const list = await res.json();
                    folderFiles = Array.isArray(list) ? list : (list.files || []);
                }
            } catch (_) { /* ignore */ }
        }
        folderFiles.forEach((f) => {
            const name = typeof f === "string" ? f : f.name;
            const path = typeof f === "string" ? "assets/artwork/" + f : (f.path || ("assets/artwork/" + f.name));
            items.push({ kind: "folder", name, path });
        });

        this._artworkCache = items;
        this._renderArtworkLib(box, items);
    },

    /** Extrai nomes de imagens do HTML de diretório do SimpleHTTPServer */
    async _listArtworkFromDir() {
        const res = await fetch("assets/artwork/?" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("dir " + res.status);
        const html = await res.text();
        const exts = /\.(png|jpe?g|webp|gif|svg)$/i;
        const names = new Set();
        const re = /href\s*=\s*["']([^"']+)["']/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            let href = decodeURIComponent(m[1].split("?")[0]);
            if (href === "../" || href === "/" || href.endsWith("/")) continue;
            const base = href.replace(/^.*\//, "");
            if (exts.test(base) && !base.startsWith(".")) names.add(base);
        }
        return [...names].sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
    },

    _renderArtworkLib(box, items) {
        if (!items?.length) {
            box.innerHTML = `<p class="hint muted">
              Nenhuma arte na biblioteca ainda.<br>
              Use <strong>Upload</strong> acima — a imagem fica salva e reaparece aqui.
            </p>`;
            return;
        }
        const userN = items.filter((i) => i.kind === "user").length;
        const folderN = items.filter((i) => i.kind === "folder").length;
        box.innerHTML =
            `<p class="hint muted" style="grid-column:1/-1;margin:0 0 4px">
              ${userN} suas · ${folderN} pasta · clique para aplicar
            </p>` +
            items.map((it) => {
                if (it.kind === "user") {
                    return `<div class="artwork-thumb-wrap" data-lib-id="${this._escAttr(it.id)}">
                <button type="button" class="artwork-thumb" data-lib-art="${this._escAttr(it.id)}" title="${this._escAttr(it.name)}">
                  <img src="${it.dataUrl}" alt="" loading="lazy"/>
                  <span>${this._escAttr(it.name)}</span>
                </button>
                <button type="button" class="artwork-thumb-del" data-lib-del="${this._escAttr(it.id)}" title="Remover da biblioteca">×</button>
              </div>`;
                }
                const path = it.path;
                return `<button type="button" class="artwork-thumb" data-art="${this._escAttr(path)}" title="${this._escAttr(it.name)}">
              <img src="${this._escAttr(path)}?t=${Date.now()}" alt="" loading="lazy"/>
              <span>${this._escAttr(it.name)}</span>
            </button>`;
            }).join("");

        box.querySelectorAll("[data-lib-art]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-lib-art");
                try {
                    const entry = await MediaStore.getLibraryArt(id);
                    if (!entry?.dataUrl) throw new Error("não encontrada");
                    this.card.art = this.card.art || {};
                    this.card.art.src = entry.dataUrl;
                    this.card.art.fileName = entry.fileName || entry.name;
                    this.applyFromForm(true);
                } catch (e) {
                    alert("Não foi possível carregar a arte da biblioteca.");
                }
            });
        });
        box.querySelectorAll("[data-lib-del]").forEach((btn) => {
            btn.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                const id = btn.getAttribute("data-lib-del");
                if (!confirm("Remover esta arte da biblioteca do programa?")) return;
                try {
                    await MediaStore.deleteLibraryArt(id);
                    this._artworkCache = null;
                    this._loadArtworkLib(true);
                } catch (e) {
                    alert("Falha ao remover.");
                }
            });
        });
        box.querySelectorAll("[data-art]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const path = btn.getAttribute("data-art");
                try {
                    const r = await fetch(path + (path.includes("?") ? "&" : "?") + "t=" + Date.now());
                    if (!r.ok) throw new Error(r.status);
                    const blob = await r.blob();
                    const reader = new FileReader();
                    reader.onload = () => {
                        const img = new Image();
                        img.onload = () => {
                            const maxSide = 1100;
                            let { width, height } = img;
                            if (width > maxSide || height > maxSide) {
                                const s = maxSide / Math.max(width, height);
                                width = Math.round(width * s);
                                height = Math.round(height * s);
                            }
                            const canvas = document.createElement("canvas");
                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                            this.card.art = this.card.art || {};
                            this.card.art.src = canvas.toDataURL("image/jpeg", 0.78);
                            this.card.art.fileName = path.split("/").pop().split("?")[0];
                            this.applyFromForm(true);
                        };
                        img.src = reader.result;
                    };
                    reader.readAsDataURL(blob);
                } catch (e) {
                    alert("Não foi possível carregar: " + path);
                }
            });
        });
    },

    _bindTypeCombo() {
        const input = document.getElementById("fType");
        const btn = document.getElementById("btnTypeList");
        const menu = document.getElementById("typeComboMenu");
        if (!input || !btn || !menu) return;

        const open = () => {
            menu.hidden = false;
            // destaca o valor atual sem filtrar a lista
            menu.querySelectorAll(".type-combo-item").forEach((item) => {
                item.classList.toggle("active", item.dataset.type === input.value);
            });
        };
        const close = () => { menu.hidden = true; };

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (menu.hidden) open(); else close();
        });
        // clique no input: se quiser ver lista, usa a seta; digitar livre continua ok
        menu.querySelectorAll(".type-combo-item").forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.value = item.dataset.type || "";
                close();
                this.applyFromForm(true);
            });
        });
        if (!this._typeComboDocBound) {
            this._typeComboDocBound = true;
            document.addEventListener("click", (e) => {
                const wrap = document.getElementById("typeCombo");
                if (wrap && !wrap.contains(e.target)) {
                    const m = document.getElementById("typeComboMenu");
                    if (m) m.hidden = true;
                }
            });
        }
    },

    _fillPresets() {
        const sel = document.getElementById("fPresetList");
        if (!sel || typeof StylePreset === "undefined") return;
        const list = StylePreset.list();
        sel.innerHTML = list.length
            ? list.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")
            : `<option value="">(nenhum preset)</option>`;
    },

    _fillTags() {
        const box = document.getElementById("tagMulti");
        if (!box || typeof TagSystem === "undefined") return;
        const tags = TagSystem.list();
        const selected = new Set(this.card.tags || []);
        box.innerHTML = tags.map((t) => `
          <label class="tag-chip">
            <input type="checkbox" value="${t.id}" ${selected.has(t.id) ? "checked" : ""}/>
            <span>${TagSystem.label(t.id)}</span>
          </label>`).join("");
        box.querySelectorAll("input").forEach((inp) => {
            inp.addEventListener("change", () => this.applyFromForm());
        });
    },

    persist() {
        return this._commitSave();
    },

    _previewRaf: 0,

    refreshPreview() {
        // Coalesce re-renders no mesmo frame (muitos inputs disparam applyFromForm)
        if (this._previewRaf) cancelAnimationFrame(this._previewRaf);
        this._previewRaf = requestAnimationFrame(() => {
            this._previewRaf = 0;
            this._doRefreshPreview();
        });
    },

    _doRefreshPreview() {
        const mount = document.getElementById("cardPreview");
        if (!mount || !this.card) return;
        const stage = mount.parentElement;
        const maxW = Math.min(420, Math.max(280, (stage?.clientWidth || 480) - 48));
        const scale = maxW / 750;
        CardView.render(mount, this.card, {
            scale,
            interactive: true,
            onArtPan: (x, y) => {
                const ox = document.getElementById("fOX");
                const oy = document.getElementById("fOY");
                if (ox) ox.value = Math.round(x);
                if (oy) oy.value = Math.round(y);
                this._markDirty();
            }
        });
    },

    _syncCombatVisibility() {
        const on = document.getElementById("fShowCombat")?.checked;
        const row = document.getElementById("combatRow");
        if (row) row.style.opacity = on ? "1" : "0.4";
        const a = document.getElementById("fAtk");
        const d = document.getElementById("fDef");
        if (a) a.disabled = !on;
        if (d) d.disabled = !on;
    },

    _syncLabels() {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        set("opVal", document.getElementById("fOpacity")?.value + "%");
        set("stVal", document.getElementById("fStroke")?.value);
        set("glVal", document.getElementById("fGlow")?.value);
        set("rhVal", document.getElementById("fRulesH")?.value);
        set("zmVal", document.getElementById("fZoom")?.value + "%");
        set("ftTitle", document.getElementById("fFontTitle")?.value);
        set("ftType", document.getElementById("fFontType")?.value);
        set("ftRules", document.getElementById("fFontRules")?.value);
        set("ftFooter", document.getElementById("fFontFooter")?.value);
        set("ftFlavor", document.getElementById("fFontFlavor")?.value);
        set("icResVal", document.getElementById("fIconResSize")?.value);
        set("icClsVal", document.getElementById("fIconClsSize")?.value);
        set("icSetVal", document.getElementById("fIconSetSize")?.value);
        set("ftStat", document.getElementById("fFontStat")?.value);
        set("icCbtVal", document.getElementById("fIconCombatSize")?.value);
    },

    _flash(msg) {
        const btn = document.getElementById("btnSave");
        if (!btn) return;
        const t = btn.textContent;
        btn.textContent = msg;
        setTimeout(() => { btn.textContent = t; }, 900);
    }
};
