/* ==========================================================
   Utilitários de cor para painéis tintados por deck
========================================================== */

var ColorUtils = {

    parseHex(hex) {
        let h = String(hex || "#000000").replace("#", "");
        if (h.length === 3) h = h.split("").map((c) => c + c).join("");
        const n = parseInt(h, 16);
        return {
            r: (n >> 16) & 255,
            g: (n >> 8) & 255,
            b: n & 255
        };
    },

    toHex({ r, g, b }) {
        const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
        return `#${c(r)}${c(g)}${c(b)}`;
    },

    /** Mistura cor com preto (0 = original, 1 = preto) */
    darken(hex, amount = 0.55) {
        const { r, g, b } = this.parseHex(hex);
        return this.toHex({
            r: r * (1 - amount),
            g: g * (1 - amount),
            b: b * (1 - amount)
        });
    },

    /**
     * Preenchimento de painel: cor do deck escurecida + alpha.
     * Não usa branco — mantém o tom do deck (como nos protótipos).
     */
    panelRGBA(hex, opacity = 0.72) {
        const dark = this.darken(hex, 0.62);
        const { r, g, b } = this.parseHex(dark);
        const a = Math.max(0.15, Math.min(0.95, opacity));
        return `rgba(${r},${g},${b},${a})`;
    },

    strokeFor(colors) {
        if (!colors || !colors.length) return "#b92d20";
        if (colors.length === 1) return colors[0];
        return "url(#frameGrad)";
    }
};
