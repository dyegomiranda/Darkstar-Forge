/* ==========================================================
   Template: Ornato Pergaminho (Solução A — Inkscape Trace)

   O frame é o SVG traçado do mock (paths reais da arte).
   O TEXTO NÃO usa “caixas” opacas: o CardView desenha título,
   tipo, regras etc. com fundo transparente, assentado nos
   painéis naturais do frame (como na carta de exemplo).

   assets/templates/ornate-traced-frame.svg
   data-role: parchment | gold | metal-hi|mid|deep|dark | accent-special
========================================================== */

var OrnateParchment = {
    id: "ornate-parchment",
    name: "Ornato Pergaminho",
    width: 750,
    height: 1050,
    contentTheme: "parchment",

    DEFAULTS: {
        // Opacidade alta por padrão: detalhes do trace devem aparecer
        panelOpacity: 1.0,
        strokeWidth: 2.2,
        glow: 8,
        rulesHeight: 280
    },

    FRAME_URL: "assets/templates/ornate-traced-frame.svg",
    _baseSvg: null,
    _loading: null,

    load() {
        if (this._baseSvg) return Promise.resolve(this._baseSvg);
        if (this._loading) return this._loading;
        this._loading = fetch(this.FRAME_URL)
            .then((r) => {
                if (!r.ok) throw new Error("Falha ao carregar " + this.FRAME_URL);
                return r.text();
            })
            .then((txt) => {
                this._baseSvg = txt.replace(/<\?xml[^>]*\?>/, "").trim();
                // Segurança: nunca manter máscaras de conteúdo se existirem
                this._baseSvg = this._baseSvg.replace(
                    /<g[^>]*id=["']content-masks["'][\s\S]*?<\/g>/gi,
                    ""
                );
                return this._baseSvg;
            })
            .catch((e) => {
                console.error(e);
                this._loading = null;
                throw e;
            });
        return this._loading;
    },

    /**
     * Slots alinhados aos painéis do mock (texto “dentro” do elemento,
     * sem retângulos de fundo no HTML).
     */
    layout(card) {
        const def = this.DEFAULTS;
        let rulesH = card?.style?.rulesHeight ?? def.rulesHeight;
        if (card?.style?.autoRulesHeight && card?.style?._computedRulesH) {
            rulesH = card.style._computedRulesH;
        }
        rulesH = Math.max(200, Math.min(340, Number(rulesH) || def.rulesHeight));

        // Coordenadas calibradas no frame 750×1050 (mock)
        const cy = 98;
        const r = 48;
        const leftCx = 90;
        const rightCx = 660;
        const typeY = 548;
        const typeH = 46;
        // painel de regras começa sob a type bar
        const rulesY = 608;
        const rulesBottom = 950;
        const maxRulesH = rulesBottom - rulesY;
        rulesH = Math.min(rulesH, maxRulesH);

        return {
            header: { x: 168, y: 58, w: 414, h: 54 },
            costCircle: { cx: leftCx, cy, r },
            classCircle: { cx: rightCx, cy, r },
            // título no pergaminho do banner (sem fundo extra)
            title: { x: 175, y: 62, w: 400, h: 48 },
            // tipo na barra metálica
            typeBar: { x: 100, y: typeY, w: 520, h: typeH },
            // regras no pergaminho interno
            rulesBox: { x: 118, y: rulesY + 8, w: 514, h: rulesH - 12 },
            attack: { x: 508, y: 972, w: 100, h: 54 },
            defense: { x: 620, y: 972, w: 100, h: 54 },
            setSymbol: { cx: 375, cy: 998, r: 24 },
            footer: { x: 52, y: 982, w: 200, h: 28 },
            bottomReserve: 100
        };
    },

    frameColorsFor(card) {
        if (card?.style?.frameColorOverrides?.length) {
            return card.style.frameColorOverrides;
        }
        return Catalog.resolveFrameColors(card?.colorIds);
    },

    _mix(hex, t, toward) {
        const a = ColorUtils.parseHex(hex);
        const b = ColorUtils.parseHex(toward);
        return ColorUtils.toHex({
            r: a.r + (b.r - a.r) * t,
            g: a.g + (b.g - a.g) * t,
            b: a.b + (b.b - a.b) * t
        });
    },

    /**
     * Recolor que preserva nuance: usa a luminância da cor original do path
     * para misturar a cor do deck com branco/preto (stack do multicolor).
     */
    _recolorFillFromOriginal(origHex, primaryHex, role) {
        if (role === "gold") return "#d4a84b";
        if (role === "parchment" || role === "accent-special") return null;
        if (!origHex || !origHex.startsWith("#")) {
            return this._mix(primaryHex, 0.25, "#000000");
        }
        const o = ColorUtils.parseHex(origHex);
        const lum = (o.r + o.g + o.b) / (3 * 255);
        // claro → metal iluminado; escuro → metal profundo (mantém camadas do trace)
        if (lum > 0.72) {
            return this._mix(primaryHex, 0.35, "#ffffff");
        }
        if (lum > 0.45) {
            return this._mix(primaryHex, 0.15 + (0.72 - lum) * 0.5, "#000000");
        }
        if (lum > 0.22) {
            return this._mix(primaryHex, 0.4 + (0.45 - lum) * 0.6, "#000000");
        }
        return this._mix(primaryHex, 0.72, "#000000");
    },

    _recolor(svgText, cols, style) {
        const primary = (cols && cols[0]) || "#b92d20";
        // Opacidade global NÃO deve lavar o frame: só glow opcional.
        // (panelOpacity no clássico controla painéis semi-transparentes;
        //  no trace, as nuances vêm do stack de paths.)
        const glow = style?.glow ?? this.DEFAULTS.glow;
        const uid = "ot" + Math.random().toString(36).slice(2, 8);

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svg = doc.documentElement;
        if (!svg || svg.querySelector("parsererror")) {
            return svgText;
        }

        doc.querySelectorAll("#content-masks, .content-masks").forEach((n) => n.remove());

        svg.setAttribute("width", "750");
        svg.setAttribute("height", "1050");
        svg.setAttribute("viewBox", "0 0 750 1050");
        svg.setAttribute("class", "card-frame-svg ornate-traced");
        svg.setAttribute("data-template", "ornate-parchment");

        doc.querySelectorAll("[data-role]").forEach((el) => {
            const role = el.getAttribute("data-role");
            if (!role || role === "parchment" || role === "accent-special") return;
            const orig =
                el.getAttribute("data-orig-fill") ||
                (el.getAttribute("style") || "").match(/fill:\s*([^;]+)/i)?.[1];
            const fill = this._recolorFillFromOriginal(orig, primary, role);
            if (!fill) return;
            let st = el.getAttribute("style") || "";
            if (/fill\s*:/i.test(st)) {
                st = st.replace(/fill\s*:\s*[^;]+/i, "fill:" + fill);
            } else {
                st = "fill:" + fill + ";" + st;
            }
            el.setAttribute("style", st);
        });

        const g = Math.max(0, Math.min(30, Number(glow) || 0));
        if (g > 0) {
            let defs = svg.querySelector("defs");
            if (!defs) {
                defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
                svg.insertBefore(defs, svg.firstChild);
            }
            const filter = doc.createElementNS("http://www.w3.org/2000/svg", "filter");
            filter.setAttribute("id", uid + "-glow");
            filter.setAttribute("x", "-12%");
            filter.setAttribute("y", "-12%");
            filter.setAttribute("width", "124%");
            filter.setAttribute("height", "124%");
            filter.innerHTML =
                `<feDropShadow dx="0" dy="0" stdDeviation="${(g * 0.35).toFixed(2)}" ` +
                `flood-color="${primary}" flood-opacity="${Math.min(0.35, 0.05 + g * 0.01).toFixed(3)}"/>`;
            defs.appendChild(filter);
            svg.setAttribute("style", `filter:url(#${uid}-glow)`);
        }

        return new XMLSerializer().serializeToString(svg);
    },

    buildFrameSVG(card, colors) {
        const cols = colors?.length ? colors : ["#b92d20"];
        const style = card?.style || {};
        if (!this._baseSvg) {
            this.load().then(() => {
                try {
                    if (typeof EditorUI !== "undefined" && EditorUI.card) {
                        EditorUI.refreshPreview?.();
                    }
                } catch (_) {}
            });
            return this._placeholder(cols);
        }
        return this._recolor(this._baseSvg, cols, style);
    },

    buildFrameSVGThumb(card, colors) {
        return this.buildFrameSVG(card, colors);
    },

    _placeholder(cols) {
        const c = cols[0] || "#b92d20";
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050" class="card-frame-svg">
  <text x="375" y="520" text-anchor="middle" fill="#888" font-size="16">Carregando moldura…</text>
  <circle cx="90" cy="98" r="40" fill="${c}" opacity="0.5"/>
  <circle cx="660" cy="98" r="40" fill="${c}" opacity="0.5"/>
</svg>`;
    }
};

TemplateRegistry.register(OrnateParchment);
