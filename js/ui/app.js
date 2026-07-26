/* ==========================================================
   Darkstar Forge — Shell da aplicação
========================================================== */

var AppUI = {
    state: {
        view: "library", // library | editor | print
        editionId: null,
        deckId: null,
        cardId: null,
        query: ""
    },

    async init() {
        if (typeof I18n !== "undefined") I18n.load();
        const main = document.getElementById("main");
        if (main) {
            main.innerHTML = `<div class="empty-state"><p>Carregando projeto…</p></div>`;
        }
        try {
            await Store.loadAsync();
        } catch (e) {
            console.error(e);
            alert("Falha ao carregar o projeto: " + (e.message || e));
        }
        if (typeof TagSystem !== "undefined") TagSystem.ensure();
        if (typeof FontCatalog !== "undefined") {
            FontCatalog.ensureGoogleLoaded();
            FontCatalog.restoreCustomFonts().catch(() => {});
        }
        const ed = Store.project?.editions?.[0];
        this.state.editionId = ed?.id || null;
        this.state.deckId = ed?.decks?.[0]?.id || null;

        this.bindChrome();
        this.render();
        Store.subscribe(() => {
            if (this.state.view === "library") {
                clearTimeout(this._libRefreshT);
                this._libRefreshT = setTimeout(() => {
                    if (this.state.view === "library") LibraryUI.renderGrid?.();
                }, 300);
            }
        });
    },

    bindChrome() {
        document.querySelectorAll("#langSwitch .lang-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const lang = btn.dataset.lang;
                document.querySelectorAll("#langSwitch .lang-btn").forEach((b) => {
                    b.classList.toggle("active", b.dataset.lang === lang);
                });
                I18n.setLang(lang);
            });
            if (typeof I18n !== "undefined") {
                btn.classList.toggle("active", btn.dataset.lang === I18n.lang);
            }
        });

        document.getElementById("btnLibrary")?.addEventListener("click", async () => {
            if (this.state.view === "editor" && typeof EditorUI !== "undefined" && EditorUI._isDirty?.()) {
                const choice = await UIModal.unsavedChanges();
                if (choice === "cancel") return;
                if (choice === "save") {
                    const r = await EditorUI._commitSave();
                    if (!r.ok) {
                        alert(r.error?.message || "Falha ao salvar");
                        return;
                    }
                }
            } else if (this.state.view === "sheet" && typeof CharacterSheetUI !== "undefined" && CharacterSheetUI._isDirty?.()) {
                const choice = await UIModal.unsavedChanges();
                if (choice === "cancel") return;
                if (choice === "save") {
                    const r = CharacterSheetUI._commitSave();
                    if (r && typeof r.then === "function") {
                        const rr = await r;
                        if (!rr.ok) {
                            alert(rr.error?.message || "Falha ao salvar");
                            return;
                        }
                    } else if (r && !r.ok) {
                        alert(r.error?.message || "Falha ao salvar");
                        return;
                    }
                }
            }
            this.openLibrary();
        });

        window.addEventListener("beforeunload", (e) => {
            const dirtyEditor = this.state.view === "editor" && typeof EditorUI !== "undefined" && EditorUI.dirty;
            const dirtySheet = this.state.view === "sheet" && typeof CharacterSheetUI !== "undefined" && CharacterSheetUI.dirty;
            if (dirtyEditor || dirtySheet) {
                e.preventDefault();
                e.returnValue = "";
            }
        });
        document.getElementById("btnExportProject")?.addEventListener("click", async () => {
            try {
                await Store.exportJSON();
            } catch (e) {
                alert("Exportação falhou: " + (e.message || e));
            }
        });
        document.getElementById("btnExportPack")?.addEventListener("click", () => this.exportPack());
        document.getElementById("btnDiagnostics")?.addEventListener("click", () => this.openDiagnostics());
        document.getElementById("btnImportProject")?.addEventListener("click", () => {
            document.getElementById("importFile").click();
        });
        document.getElementById("importFile")?.addEventListener("change", async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
                await Store.importJSON(f);
                const ed = Store.project.editions[0];
                this.state.editionId = ed?.id;
                this.state.deckId = ed?.decks?.[0]?.id;
                this.state.view = "library";
                this.render();
            } catch (err) {
                alert("Não foi possível importar: " + err.message);
            }
            e.target.value = "";
        });
        document.getElementById("btnResetSeed")?.addEventListener("click", async () => {
            if (confirm("Isso apaga o projeto atual e restaura o seed da 1ª edição. Continuar?")) {
                await Store.resetToSeed();
                const ed = Store.project.editions[0];
                this.state.editionId = ed.id;
                this.state.deckId = ed.decks[0].id;
                this.state.cardId = null;
                this.state.view = "library";
                this.render();
            }
        });

        // Atalho: restaurar último backup (Ctrl+Shift+B)
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === "B" || e.key === "b")) {
                e.preventDefault();
                (async () => {
                    try {
                        await Store.restoreBackup(1);
                        const ed = Store.project.editions[0];
                        this.state.editionId = ed?.id;
                        this.state.deckId = ed?.decks?.[0]?.id;
                        this.state.view = "library";
                        this.render();
                        alert("Backup 1 restaurado.");
                    } catch (err) {
                        alert(err.message || "Sem backup.");
                    }
                })();
            }
            if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
                if (this.state.view === "editor" && typeof EditorUI !== "undefined") {
                    e.preventDefault();
                    (async () => {
                        EditorUI.applyFromForm?.(false);
                        const r = await EditorUI._commitSave?.();
                        if (r && !r.ok) alert(r.error?.message || "Falha ao salvar");
                    })();
                } else if (this.state.view === "sheet" && typeof CharacterSheetUI !== "undefined") {
                    e.preventDefault();
                    CharacterSheetUI.applyFromForm?.();
                    const r = CharacterSheetUI._commitSave?.();
                    if (r && typeof r.then === "function") {
                        r.then((rr) => { if (rr && !rr.ok) alert(rr.error?.message || "Falha ao salvar"); });
                    } else if (r && !r.ok) alert(r.error?.message || "Falha ao salvar");
                }
            }
        });
        document.getElementById("projectName")?.addEventListener("change", (e) => {
            Store.updateProjectMeta({ name: e.target.value });
            this.updateTitle();
        });
    },

    openEditor(cardId) {
        this.state.cardId = cardId;
        this.state.view = "editor";
        this.render();
    },

    openLibrary() {
        this.state.view = "library";
        this.state.cardId = null;
        this.render();
    },

    async exportPack() {
        if (typeof ZipUtil === "undefined") {
            alert("ZipUtil não carregado.");
            return;
        }
        try {
            Store._setSaveStatus?.("saving");
            const full = typeof MediaStore !== "undefined"
                ? await MediaStore.projectForExport(Store.project)
                : Store.project;
            const files = [];
            const json = JSON.stringify(full, null, 2);
            files.push({ name: "project.json", data: json });
            const cards = Object.values(full.cards || {});
            for (const c of cards) {
                const src = c.art?.src;
                if (!src || !String(src).startsWith("data:")) continue;
                const bytes = await ZipUtil.dataUrlToBytes(src);
                const ext = src.includes("image/png") ? "png" : "jpg";
                const safe = (c.name || c.id || "card").replace(/[^\w\-]+/g, "_").slice(0, 40);
                files.push({ name: `art/${safe}_${c.id}.${ext}`, data: bytes });
            }
            const zip = ZipUtil.build(files);
            const safeName = (Store.project.meta?.name || "projeto").replace(/\s+/g, "_");
            ZipUtil.download(zip, `${safeName}_pack.zip`);
            Store._setSaveStatus?.("saved");
        } catch (e) {
            console.error(e);
            Store._setSaveStatus?.("error");
            alert("Falha no pack: " + (e.message || e));
        }
    },

    async openDiagnostics() {
        const cards = Object.values(Store.project?.cards || {});
        const noArt = cards.filter((c) => !c.art?.src && !c.artData).length;
        const withArt = cards.length - noArt;
        let lsBytes = 0;
        try {
            const raw = localStorage.getItem(Store.KEY) || "";
            lsBytes = raw.length;
        } catch (_) {}
        let media = { count: 0, approxMB: 0 };
        let revs = [];
        let gcInfo = null;
        try {
            if (typeof MediaStore !== "undefined") {
                await MediaStore.open();
                media = await MediaStore.estimateBlobBytes();
                revs = await MediaStore.listRevisions();
            }
        } catch (e) {
            console.warn(e);
        }
        const deckIssues = [];
        (Store.project?.editions || []).forEach((ed) => {
            (ed.decks || []).filter((d) => d.kind === "color").forEach((d) => {
                const n = Store.listCards({ editionId: ed.id, deckId: d.id }).length;
                if (n !== 50) deckIssues.push(`${d.name}: ${n}/50`);
            });
        });

        const prev = document.getElementById("uiModalRoot");
        if (prev) prev.remove();
        const root = document.createElement("div");
        root.id = "uiModalRoot";
        root.className = "ui-modal-root";
        root.innerHTML = `
          <div class="ui-modal-backdrop" id="diagBackdrop"></div>
          <div class="ui-modal ui-modal-wide" role="dialog">
            <h3>Diagnóstico do projeto</h3>
            <div class="diag-grid">
              <div><strong>Cartas</strong><br>${cards.length} total · ${withArt} com arte · ${noArt} sem arte</div>
              <div><strong>localStorage</strong><br>${(lsBytes / 1024).toFixed(1)} KB (JSON slim)</div>
              <div><strong>IndexedDB (artes)</strong><br>${media.count} blobs · ~${media.approxMB.toFixed(2)} MB (proxy)</div>
              <div><strong>Decks de classe ≠ 50</strong><br>${deckIssues.length ? deckIssues.join("<br>") : "Nenhum"}</div>
              <div><strong>Revisões salvas</strong><br>${revs.length ? revs.slice(0, 5).map((r) => `${r.at.slice(0, 19)} · ${r.cards} cartas`).join("<br>") : "Nenhuma"}</div>
            </div>
            <div class="ui-modal-actions">
              <button type="button" class="btn" id="btnDiagGc">Limpar mídia órfã (GC)</button>
              <button type="button" class="btn" id="btnDiagRev">Restaurar revisão…</button>
              <button type="button" class="btn primary" id="btnDiagClose">Fechar</button>
            </div>
            <p class="hint" id="diagMsg"></p>
          </div>`;
        document.body.appendChild(root);
        const close = () => root.remove();
        root.querySelector("#diagBackdrop")?.addEventListener("click", close);
        root.querySelector("#btnDiagClose")?.addEventListener("click", close);
        root.querySelector("#btnDiagGc")?.addEventListener("click", async () => {
            try {
                gcInfo = await MediaStore.gc(Store.project);
                document.getElementById("diagMsg").textContent =
                    `GC: removidos ${gcInfo.removed}, mantidos ${gcInfo.kept}.`;
            } catch (e) {
                document.getElementById("diagMsg").textContent = "GC falhou: " + (e.message || e);
            }
        });
        root.querySelector("#btnDiagRev")?.addEventListener("click", async () => {
            if (!revs.length) {
                alert("Nenhuma revisão.");
                return;
            }
            const pick = prompt(
                "ID da revisão para restaurar:\n" + revs.map((r) => `${r.id} — ${r.at}`).join("\n"),
                String(revs[0].id)
            );
            if (pick == null) return;
            try {
                const proj = await MediaStore.getRevision(Number(pick) || pick);
                if (!proj) throw new Error("Revisão não encontrada");
                if (!confirm("Substituir o projeto atual por esta revisão slim? Artes no IDB são reutilizadas se as keys coincidirem.")) return;
                Store.project = proj;
                Store._migrate();
                await MediaStore.hydrateProject(Store.project);
                await Store.saveAsync();
                this.state.editionId = Store.project.editions[0]?.id;
                this.state.deckId = Store.project.editions[0]?.decks?.[0]?.id;
                this.state.view = "library";
                this.render();
                close();
                alert("Revisão restaurada.");
            } catch (e) {
                alert(e.message || e);
            }
        });
    },

    render() {
        this.updateTitle();
        const main = document.getElementById("main");
        main.innerHTML = "";

        if (this.state.view === "editor") {
            EditorUI.mount(main, this.state.cardId);
        } else if (this.state.view === "sheet") {
            CharacterSheetUI.mount(main);
        } else {
            LibraryUI.mount(main);
        }

        document.body.dataset.view = this.state.view;
    },

    updateTitle() {
        const name = Store.project?.meta?.name || "Darkstar Forge";
        document.title = name;
        const el = document.getElementById("projectName");
        if (el && document.activeElement !== el) el.value = name;
        const ed = Store.getEdition(this.state.editionId);
        const deck = Store.getDeck(this.state.editionId, this.state.deckId);
        const crumb = document.getElementById("breadcrumb");
        if (crumb) {
            crumb.textContent = [
                ed?.name || "Edição",
                deck ? `${deck.name} — ${deck.classes}` : null,
                this.state.view === "editor" ? "Editor" : "Biblioteca"
            ].filter(Boolean).join(" · ");
        }
    }
};

document.addEventListener("DOMContentLoaded", () => AppUI.init());
