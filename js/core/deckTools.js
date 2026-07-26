/* ==========================================================
   Validação de deck + curva de mana + utilitários de balance
========================================================== */

var DeckTools = {

    /** Curva alvo (50 cartas) — alinhada ao seed e mana inicial ~3 */
    TARGET_CURVE: { 1: 12, 2: 12, 3: 10, 4: 8, 5: 5, 6: 3 },
    TARGET_SIZE: 50,

    costOf(card) {
        return Number(card?.costs?.[0]?.amount) || 0;
    },

    curve(cards) {
        const hist = {};
        (cards || []).forEach((c) => {
            const k = this.costOf(c);
            hist[k] = (hist[k] || 0) + 1;
        });
        return hist;
    },

    averageCost(cards) {
        if (!cards?.length) return 0;
        const sum = cards.reduce((a, c) => a + this.costOf(c), 0);
        return sum / cards.length;
    },

    /**
     * Valida um deck/coleção.
     * @returns {{ ok:boolean, errors:string[], warnings:string[], curve:object, size:number, avg:number }}
     */
    validate(cards, opts = {}) {
        const list = cards || [];
        const errors = [];
        const warnings = [];
        const size = list.length;
        const curve = this.curve(list);
        const avg = this.averageCost(list);
        const targetSize = opts.targetSize ?? this.TARGET_SIZE;
        const isColorDeck = opts.kind === "color" || opts.enforceCurve;

        if (isColorDeck) {
            if (size !== targetSize) {
                errors.push(`Deck deve ter exatamente ${targetSize} cartas (tem ${size}).`);
            }
            const target = opts.targetCurve || this.TARGET_CURVE;
            Object.keys(target).forEach((cost) => {
                const want = target[cost];
                const have = curve[cost] || 0;
                if (have !== want) {
                    warnings.push(`Custo ${cost}: ${have} cartas (alvo ${want}).`);
                }
            });
            // custos fora 1–6
            Object.keys(curve).forEach((cost) => {
                const n = Number(cost);
                if (n < 1 || n > 6) warnings.push(`Custo fora da curva padrão: ${cost} (${curve[cost]} cartas).`);
            });
            if (avg < 2.4 || avg > 3.3) {
                warnings.push(`Custo médio ${avg.toFixed(2)} (ideal ~2.7–2.9 para mana inicial 3).`);
            }
        }

        // Únicas: no máximo 1 cópia por nome
        const byName = {};
        list.forEach((c) => {
            const n = (c.name || "").trim().toLowerCase();
            if (!n) return;
            byName[n] = (byName[n] || 0) + 1;
            if (c.rarity === "unique" && byName[n] > 1) {
                errors.push(`Carta única duplicada: "${c.name}".`);
            }
        });

        // Equipamento sem tag de slot
        list.forEach((c) => {
            if (c.category === "equipment" || c.deckId === "deck_equipment") {
                const tags = c.tags || [];
                if (!tags.length) warnings.push(`Equipamento sem tags: "${c.name}".`);
            }
        });

        return { ok: errors.length === 0, errors, warnings, curve, size, avg };
    },

    /** HTML compacto da curva (barras) */
    curveBarsHTML(curve, target) {
        const t = target || this.TARGET_CURVE;
        const costs = [0, 1, 2, 3, 4, 5, 6, 7];
        const max = Math.max(1, ...costs.map((c) => Math.max(curve[c] || 0, t[c] || 0)));
        return `<div class="curve-bars" title="Curva de custo">${costs.map((c) => {
            const n = curve[c] || 0;
            if (!n && !t[c]) return "";
            const h = Math.round((n / max) * 100);
            const ok = t[c] == null || n === t[c];
            return `<div class="curve-col ${ok ? "ok" : "off"}" title="Custo ${c}: ${n}${t[c] != null ? " / alvo " + t[c] : ""}">
              <div class="curve-bar" style="height:${h}%"></div>
              <span class="curve-n">${n}</span>
              <span class="curve-c">${c}</span>
            </div>`;
        }).join("")}</div>`;
    }
};
