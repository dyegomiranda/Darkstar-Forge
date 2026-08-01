/* ==========================================================
   Diálogos modais (substitui confirm/alert em fluxos críticos)
========================================================== */

var UIModal = {

    /**
     * Diálogo de alterações não salvas.
     * @returns {Promise<"save"|"discard"|"cancel">}
     */
    unsavedChanges(opts = {}) {
        const title = opts.title || (I18n?.lang === "en-US"
            ? "Unsaved changes"
            : "Existem alterações não salvas");
        const message = opts.message || (I18n?.lang === "en-US"
            ? "What do you want to do?"
            : "O que deseja fazer?");
        const en = I18n?.lang === "en-US";
        return this.choose({
            title,
            message,
            buttons: [
                { id: "discard", label: en ? "Leave without saving" : "Sair sem salvar", className: "btn danger ghost" },
                { id: "save", label: en ? "Save and leave" : "Salvar e sair", className: "btn primary" },
                { id: "cancel", label: en ? "Keep editing" : "Cancelar e continuar editando", className: "btn" }
            ]
        });
    },

    /**
     * @param {{ title: string, message?: string, buttons: {id:string,label:string,className?:string}[] }} opts
     * @returns {Promise<string>} id do botão clicado
     */
    choose(opts) {
        return new Promise((resolve) => {
            const prev = document.getElementById("uiModalRoot");
            if (prev) prev.remove();

            const root = document.createElement("div");
            root.id = "uiModalRoot";
            root.className = "ui-modal-root";
            root.innerHTML = `
              <div class="ui-modal-backdrop" data-act="cancel"></div>
              <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="uiModalTitle">
                <h3 id="uiModalTitle">${this._esc(opts.title || "")}</h3>
                ${opts.message ? `<p class="ui-modal-msg">${this._esc(opts.message)}</p>` : ""}
                <div class="ui-modal-actions">
                  ${(opts.buttons || []).map((b) =>
                    `<button type="button" class="${b.className || "btn"}" data-act="${this._esc(b.id)}">${this._esc(b.label)}</button>`
                  ).join("")}
                </div>
              </div>`;
            document.body.appendChild(root);

            const finish = (id) => {
                root.remove();
                document.removeEventListener("keydown", onKey);
                resolve(id);
            };
            const onKey = (e) => {
                if (e.key === "Escape") finish("cancel");
            };
            document.addEventListener("keydown", onKey);

            root.querySelectorAll("[data-act]").forEach((el) => {
                el.addEventListener("click", (e) => {
                    e.preventDefault();
                    finish(el.getAttribute("data-act") || "cancel");
                });
            });

            // Foco no botão principal (salvar se existir)
            const primary = root.querySelector(".btn.primary") || root.querySelector(".ui-modal-actions .btn");
            primary?.focus();
        });
    },

    /**
     * Modal de progresso cancelável.
     * @returns {{ update: (current:number, total:number, message?:string)=>void, close: ()=>void }}
     */
    progress(opts = {}) {
        const prev = document.getElementById("uiModalRoot");
        if (prev) prev.remove();

        const en = I18n?.lang === "en-US";
        const root = document.createElement("div");
        root.id = "uiModalRoot";
        root.className = "ui-modal-root";
        root.innerHTML = `
          <div class="ui-modal-backdrop"></div>
          <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="uiProgressTitle">
            <h3 id="uiProgressTitle">${this._esc(opts.title || (en ? "Working…" : "Processando…"))}</h3>
            <p class="ui-modal-msg" id="uiProgressMsg">${this._esc(opts.message || "")}</p>
            <div class="progress-track" aria-hidden="true">
              <div class="progress-bar" id="uiProgressBar" style="width:0%"></div>
            </div>
            <p class="hint" id="uiProgressPct">0%</p>
            <div class="ui-modal-actions">
              <button type="button" class="btn ghost" id="uiProgressCancel">${en ? "Cancel" : "Cancelar"}</button>
            </div>
          </div>`;
        document.body.appendChild(root);

        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            root.remove();
        };
        root.querySelector("#uiProgressCancel")?.addEventListener("click", () => {
            try { opts.onCancel?.(); } catch (_) {}
            const msg = root.querySelector("#uiProgressMsg");
            if (msg) msg.textContent = en ? "Cancelling…" : "Cancelando…";
        });

        return {
            update(current, total, message) {
                if (closed) return;
                const t = Math.max(1, total || 1);
                const c = Math.max(0, Math.min(current, t));
                const pct = Math.round((c / t) * 100);
                const bar = root.querySelector("#uiProgressBar");
                const pctEl = root.querySelector("#uiProgressPct");
                const msg = root.querySelector("#uiProgressMsg");
                if (bar) bar.style.width = pct + "%";
                if (pctEl) pctEl.textContent = `${pct}% · ${c}/${t}`;
                if (message != null && msg) msg.textContent = message;
            },
            close
        };
    },

    _esc(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
};
