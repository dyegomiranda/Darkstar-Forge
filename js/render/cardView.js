/* ==========================================================
   Darkstar Forge — Renderização da carta no DOM
========================================================== */

var CardView = {

    /** Estado global de drag (um único par de listeners na window) */
    _drag: {
        active: false,
        card: null,
        artLayer: null,
        scale: 1,
        lastX: 0,
        lastY: 0,
        onPan: null,
        bound: false
    },

    _ensureDragListeners() {
        if (this._drag.bound) return;
        this._drag.bound = true;

        const move = (e) => {
            const d = this._drag;
            if (!d.active || !d.card) return;
            const x = e.clientX ?? e.touches?.[0]?.clientX;
            const y = e.clientY ?? e.touches?.[0]?.clientY;
            if (x == null) return;
            const dx = (x - d.lastX) / d.scale;
            const dy = (y - d.lastY) / d.scale;
            d.lastX = x;
            d.lastY = y;
            d.card.art = d.card.art || {};
            d.card.art.offsetX = (d.card.art.offsetX || 0) + dx;
            d.card.art.offsetY = (d.card.art.offsetY || 0) + dy;
            const img = d.artLayer?.querySelector(".card-art-img");
            if (img) {
                const zoom = (d.card.art.zoom ?? 100) / 100;
                const rot = d.card.art.rotation || 0;
                const mirror = d.card.art.mirror ? "scaleX(-1)" : "scaleX(1)";
                img.style.transform =
                    `translate(-50%, -50%) translate(${d.card.art.offsetX}px, ${d.card.art.offsetY}px) scale(${zoom}) rotate(${rot}deg) ${mirror}`;
            }
            if (d.onPan) d.onPan(d.card.art.offsetX, d.card.art.offsetY);
        };
        const up = () => { this._drag.active = false; };

        window.addEventListener("mousemove", move, { passive: true });
        window.addEventListener("mouseup", up, { passive: true });
        window.addEventListener("touchmove", move, { passive: false });
        window.addEventListener("touchend", up, { passive: true });
    },

    /**
     * @param {{scale?: number, interactive?: boolean, onArtPan?: function, light?: boolean}} opts
     * light: miniatura da biblioteca (sem drag, menos trabalho)
     */
    render(mount, card, { scale = 1, interactive = false, onArtPan = null, light = false } = {}) {
        if (!mount || !card) return;

        // Textos bilíngues (precisam vir antes do auto-layout da caixa de regras)
        const lang = (typeof I18n !== "undefined" && I18n.lang) || "pt-BR";
        const loc = (card.i18n && card.i18n[lang]) || null;
        const display = {
            name: loc?.name ?? card.name ?? "",
            type: loc?.type ?? card.type ?? "",
            subtype: loc?.subtype ?? card.subtype ?? "",
            rules: loc?.rules ?? card.rules ?? "",
            flavor: loc?.flavor ?? card.flavor ?? ""
        };

        const fonts = {
            title: card.style?.fontTitle ?? 30,
            type: card.style?.fontType ?? 25,
            rules: card.style?.fontRules ?? 23,
            footer: card.style?.fontFooter ?? 18,
            flavor: card.style?.fontFlavor ?? 26,
            cost: card.style?.fontCost ?? 28,
            stat: card.style?.fontStat ?? 34
        };

        // light: miniatura rápida — sem auto-altura pesada nem flavor longo
        if (light) {
            display.rules = (display.rules || "").slice(0, 90);
            display.flavor = "";
        }

        // Auto-altura da caixa de regras+flavor (cresce para cima)
        const layoutCard = light
            ? { ...card, style: { ...(card.style || {}), autoRulesHeight: false, rulesHeight: card.style?.rulesHeight ?? 220 } }
            : this._withAutoRulesHeight(card, display, fonts);

        const tpl = TemplateRegistry.get(layoutCard.templateId) || TemplateRegistry.get("classic-fullart");
        const L = tpl.layout(layoutCard);
        const colors = tpl.frameColorsFor
            ? tpl.frameColorsFor(layoutCard)
            : Catalog.resolveFrameColors(layoutCard.colorIds);

        const primaryColorId = (layoutCard.colorIds && layoutCard.colorIds[0]) || "red";
        const cost = (layoutCard.costs && layoutCard.costs[0]) || { resource: "vigor", amount: 0 };
        const rarity = Catalog.rarityById(layoutCard.rarity);
        const fam = (id, fallback) => {
            if (typeof FontCatalog === "undefined") return fallback;
            return FontCatalog.familyCss(id || fallback) || fallback;
        };
        const ff = {
            title: fam(layoutCard.style?.fontFamilyTitle, "comfortaa"),
            type: fam(layoutCard.style?.fontFamilyType, "noto-sans"),
            rules: fam(layoutCard.style?.fontFamilyRules, "noto-sans"),
            footer: fam(layoutCard.style?.fontFamilyFooter, "source-sans"),
            flavor: fam(layoutCard.style?.fontFamilyFlavor, "eb-garamond")
        };

        // usa layoutCard para o resto (mesmo objeto card + style auto)
        card = layoutCard;

        const art = card.art || {};
        const zoom = (art.zoom ?? 100) / 100;
        const ox = art.offsetX ?? 0;
        const oy = art.offsetY ?? 0;
        const rot = art.rotation ?? 0;
        const mirror = art.mirror ? "scaleX(-1)" : "scaleX(1)";

        const typeLine = [display.type, display.subtype].filter(Boolean).join(" | ");
        const outW = Math.round(tpl.width * scale);
        const outH = Math.round(tpl.height * scale);

        mount.innerHTML = "";
        mount.classList.add("card-mount");
        // fundo transparente: cantos do border-radius não pintam preto
        mount.style.cssText =
            `width:${outW}px;height:${outH}px;overflow:hidden;position:relative;flex-shrink:0;background:transparent;`;

        const root = document.createElement("div");
        root.className = "card-root";
        root.style.cssText = [
            `width:${tpl.width}px`,
            `height:${tpl.height}px`,
            `position:absolute`,
            `top:0`,
            `left:0`,
            `transform:scale(${scale})`,
            `transform-origin:top left`,
            `background:transparent`
        ].join(";");
        root.dataset.cardId = card.id;

        // Arte
        const artLayer = document.createElement("div");
        artLayer.className = "card-layer card-art" + (interactive && art.src ? " is-draggable" : "");
        if (art.src) {
            artLayer.innerHTML = `<img class="card-art-img" alt="" draggable="false" decoding="async"/>`;
            const img = artLayer.querySelector("img");
            img.src = art.src;
            img.style.transform =
                `translate(-50%, -50%) translate(${ox}px, ${oy}px) scale(${zoom}) rotate(${rot}deg) ${mirror}`;
        } else {
            artLayer.classList.add("card-art--empty");
            artLayer.innerHTML =
                `<div class="card-art-placeholder">Full Art<br><small>${interactive ? "Envie uma imagem · arraste para mover" : "Envie uma imagem"}</small></div>`;
        }
        root.appendChild(artLayer);

        const vignette = document.createElement("div");
        vignette.className = "card-layer card-vignette";
        vignette.style.pointerEvents = "none";
        root.appendChild(vignette);

        const frameLayer = document.createElement("div");
        frameLayer.className = "card-layer card-frame";
        frameLayer.style.pointerEvents = "none";
        const customTpl = this._customTemplate(card);
        if (customTpl && customTpl.overlayDataUrl) {
            frameLayer.innerHTML =
                `<img class="card-template-overlay" src="${customTpl.overlayDataUrl}" alt="" draggable="false"
                  style="width:100%;height:100%;object-fit:fill;pointer-events:none"/>`;
        } else if (tpl.buildFrameSVG) {
            frameLayer.innerHTML = tpl.buildFrameSVG(card, colors);
        }
        root.appendChild(frameLayer);

        const costSize = Math.round(L.costCircle.r * 2);
        // Cluster ícone+número: centro do conjunto = centro do círculo; número escala com o ícone
        const iconCostRaw = card.style?.iconResourceSize ?? 40;
        // cabe no diâmetro: ícone + gap + dígito ≈ 1.7 * ícone
        const maxIcon = Math.floor(L.costCircle.r * 2 * 0.48);
        const iconCost = Math.max(16, Math.min(iconCostRaw, maxIcon));
        const costFont = Math.round(iconCost * 0.82);
        const iconClass = card.style?.iconClassSize ?? Math.round(L.classCircle.r * 1.45);
        const iconSet = card.style?.iconSetSize ?? 30;
        const iconCombat = card.style?.iconCombatSize ?? 40;
        const raritySize = 22;

        const rulesText = light
            ? this._esc(display.rules || "")
            : Icons.parseRulesHTML(display.rules || "", Math.round(fonts.rules));
        const flavorHtml = (!light && display.flavor)
            ? `<div class="cv-flavor" style="font-size:${fonts.flavor}px;font-family:${ff.flavor}">${this._esc(display.flavor)}</div>`
            : "";

        const content = document.createElement("div");
        content.className = "card-layer card-content";
        content.style.pointerEvents = "none";
        content.innerHTML = `
          <div class="cv-cost" style="left:${L.costCircle.cx - L.costCircle.r}px;top:${L.costCircle.cy - L.costCircle.r}px;width:${costSize}px;height:${costSize}px;--cost-icon:${iconCost}px;--cost-font:${costFont}px">
            <span class="cv-cost-cluster">
              <span class="cv-cost-icon">${Icons.resource(cost.resource, iconCost)}</span>
              <span class="cv-cost-num">${cost.amount ?? 0}</span>
            </span>
          </div>
          <div class="cv-title" style="left:${L.title.x}px;top:${L.title.y}px;width:${L.title.w}px;height:${L.title.h}px;font-size:${fonts.title}px;font-family:${ff.title} !important">
            ${this._esc(display.name || "")}
          </div>
          <div class="cv-class" style="left:${L.classCircle.cx - iconClass / 2}px;top:${L.classCircle.cy - iconClass / 2}px;width:${iconClass}px;height:${iconClass}px">
            ${Icons.classIcon(primaryColorId, iconClass)}
          </div>
          <div class="cv-type" style="left:${L.typeBar.x + 22}px;top:${L.typeBar.y}px;width:${L.typeBar.w - 70}px;height:${L.typeBar.h}px;font-size:${fonts.type}px;font-family:${ff.type} !important">
            ${this._esc(typeLine)}
          </div>
          <div class="cv-rarity" style="left:${L.typeBar.x + L.typeBar.w - 48}px;top:${L.typeBar.y + (L.typeBar.h - raritySize) / 2}px;width:${raritySize}px;height:${raritySize}px">
            ${Icons.raritySymbol(card.rarity, raritySize)}
          </div>
          <div class="cv-rules" style="left:${L.rulesBox.x + 24}px;top:${L.rulesBox.y + 16}px;width:${L.rulesBox.w - 48}px;height:${L.rulesBox.h - 36}px;font-size:${fonts.rules}px;font-family:${ff.rules} !important">
            <div class="cv-rules-text">${rulesText}</div>
            ${flavorHtml}
          </div>
          <div class="cv-footer" style="left:${L.footer.x}px;top:${L.footer.y}px;width:${L.footer.w}px;font-size:${fonts.footer}px;font-family:${ff.footer} !important">
            ${this._esc(card.collectorNumber || "")}
            <span class="dot">·</span>
            ${this._esc(card.footerText || "")}
          </div>
          <div class="cv-set" style="left:${L.setSymbol.cx - iconSet / 2}px;top:${L.setSymbol.cy - iconSet / 2}px;width:${iconSet}px;height:${iconSet}px">
            ${Icons.setSymbol(iconSet)}
          </div>
          ${card.showCombat ? `
            <div class="cv-stat cv-atk" style="left:${L.attack.x}px;top:${L.attack.y}px;width:${L.attack.w}px;height:${L.attack.h}px;font-size:${fonts.stat}px">
              <span class="cv-stat-ico" style="width:${iconCombat}px;height:${iconCombat}px">${Icons.sword(iconCombat)}</span>
              <span class="cv-stat-num">${card.attack ?? 0}</span>
            </div>
            <div class="cv-stat cv-def" style="left:${L.defense.x}px;top:${L.defense.y}px;width:${L.defense.w}px;height:${L.defense.h}px;font-size:${fonts.stat}px">
              <span class="cv-stat-ico" style="width:${iconCombat}px;height:${iconCombat}px">${Icons.shield(iconCombat)}</span>
              <span class="cv-stat-num">${card.defense ?? 0}</span>
            </div>
          ` : ""}
        `;
        root.appendChild(content);
        mount.appendChild(root);

        if (interactive && art.src && !light) {
            this._ensureDragListeners();
            const start = (e) => {
                this._drag.active = true;
                this._drag.card = card;
                this._drag.artLayer = artLayer;
                this._drag.scale = scale;
                this._drag.onPan = onArtPan;
                this._drag.lastX = e.clientX ?? e.touches?.[0]?.clientX;
                this._drag.lastY = e.clientY ?? e.touches?.[0]?.clientY;
                e.preventDefault();
            };
            artLayer.addEventListener("mousedown", start);
            artLayer.addEventListener("touchstart", start, { passive: false });
        }

        return root;
    },

    _customTemplate(card) {
        const id = card.templateId;
        if (!id || id === "classic-fullart") return null;
        const list = Store.project?.meta?.customTemplates || [];
        return list.find((t) => t.id === id) || null;
    },

    /**
     * Estima altura da caixa de regras+flavor e aplica no style (cópia rasa).
     * autoRulesHeight padrão = true (cresce para cima até o limite do template).
     */
    _withAutoRulesHeight(card, display, fonts) {
        const style = { ...(card.style || {}) };
        const auto = style.autoRulesHeight !== false; // default on
        if (!auto) {
            return { ...card, style };
        }
        const boxInnerW = 658 - 48; // rulesBox.w - padding
        const rulesFs = fonts.rules || 23;
        const flavorFs = fonts.flavor || 26;
        const lineH = 1.38;
        const rulesLines = this._estimateLines(display.rules || "", boxInnerW, rulesFs);
        const flavorLines = display.flavor
            ? this._estimateLines(display.flavor, boxInnerW, flavorFs)
            : 0;
        const pad = 36; // padding vertical interno
        const flavorExtra = flavorLines
            ? 18 + Math.ceil(flavorLines * flavorFs * lineH) // borda + texto
            : 0;
        const needed = pad + Math.ceil(rulesLines * rulesFs * lineH) + flavorExtra;
        const base = style.rulesHeight ?? 300;
        // cresce se precisar; não encolhe abaixo do base do usuário
        const computed = Math.max(base, Math.min(520, needed));
        style._computedRulesH = computed;
        style.autoRulesHeight = true;
        return { ...card, style };
    },

    _estimateLines(text, boxW, fontSize) {
        const t = String(text || "");
        if (!t.trim()) return 1;
        // ~0.52em de largura média para Noto Sans
        const charsPerLine = Math.max(12, Math.floor(boxW / (fontSize * 0.52)));
        let lines = 0;
        t.split(/\n/).forEach((para) => {
            const len = para.length || 1;
            lines += Math.max(1, Math.ceil(len / charsPerLine));
        });
        return Math.max(1, lines);
    },

    _esc(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    },

    /**
     * Miniatura super leve para biblioteca.
     * Gera estrutura simplificada e leve sem recriar SVGs/frames complexos no DOM.
     */
    thumbnail(host, card, width = 160, opts = {}) {
        if (!host || !card) return null;
        const full = !!opts.full;

        // Se full=true, faz o render tradicional completo.
        if (full) {
            const tpl = TemplateRegistry.get(card.templateId) || TemplateRegistry.get("classic-fullart");
            const w = opts.nativeSize ? tpl.width : Math.max(40, Math.round(width));
            const scale = opts.nativeSize ? 1 : w / tpl.width;
            host.classList.remove("card-mount");
            host.innerHTML = "";
            const mount = document.createElement("div");
            mount.className = "card-mount";
            host.appendChild(mount);
            return this.render(mount, card, { scale, light: false, interactive: false });
        }

        // Caso padrão: Miniatura ultra-rápida e extremamente leve
        host.classList.remove("card-mount");
        host.innerHTML = "";
        const primaryColorId = (card.colorIds && card.colorIds[0]) || "red";
        const cost = (card.costs && card.costs[0]) || { resource: "vigor", amount: 0 };
        const art = card.art || {};

        const mount = document.createElement("div");
        mount.className = "card-mount fast-thumb";
        mount.style.cssText = "width:100%;height:100%;position:relative;background:#171310;border-radius:10px;overflow:hidden;";

        const artHtml = art.src 
            ? `<img src="${art.src}" style="width:100%;height:100%;object-fit:cover;" alt="" loading="lazy"/>`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#2a1810;color:#9a8c7a;font-size:12px;">Darkstar</div>`;

        mount.innerHTML = `
            ${artHtml}
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.6) 100%);pointer-events:none;"></div>
            <div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.7);padding:2px 6px;border-radius:12px;font-size:11px;font-weight:bold;color:#f0e6d8;display:flex;align-items:center;gap:4px;">
                ${cost.amount}
            </div>
            <div style="position:absolute;bottom:6px;left:6px;right:6px;font-size:11px;font-weight:bold;color:#f0e6d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000;">
                ${this._esc(card.name || "")}
            </div>
        `;
        host.appendChild(mount);
        return mount;
    }
};
