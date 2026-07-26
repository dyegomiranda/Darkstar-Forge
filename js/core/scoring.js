/* ==========================================================
   Motor de pontuação → custo sugerido → raridade automática
========================================================== */

var Scoring = {

    /**
     * Calcula score da carta.
     * @returns {{ score, breakdown, suggestedCost, autoRarity }}
     */
    evaluate(card) {
        const T = ScoringTable;
        const breakdown = [];
        let score = 0;

        const atk = Number(card.attack) || 0;
        const def = Number(card.defense) || 0;
        const show = !!card.showCombat;

        if (show) {
            const a = atk * (T.attackPointValue ?? 1);
            const d = def * (T.defensePointValue ?? 1);
            if (a) { score += a; breakdown.push({ label: `Ataque ${atk}`, points: a }); }
            if (d) { score += d; breakdown.push({ label: `Defesa ${def}`, points: d }); }
        }

        // Dano descrito em mecânicas damage_N já conta; regras livres não pontuam automaticamente
        const mechs = Array.isArray(card.mechanics) ? card.mechanics : [];
        mechs.forEach((id) => {
            const m = T.get(id);
            if (!m) return;
            score += m.points;
            breakdown.push({ label: m.name, points: m.points, id });
        });

        score = Math.max(0, score);
        const suggestedCost = this.scoreToCost(score);
        const actualCost = Number(card.costs?.[0]?.amount);
        const cost = Number.isFinite(actualCost) ? actualCost : suggestedCost;
        const autoRarity = this.rarityFromCosts(suggestedCost, cost, card);

        return { score, breakdown, suggestedCost, autoRarity, actualCost: cost };
    },

    scoreToCost(score) {
        const ppc = ScoringTable.pointsPerCost || 3;
        if (score <= 0) return 0;
        return Math.max(1, Math.ceil(score / ppc));
    },

    /**
     * Se o custo manual for MENOR que o sugerido, a carta fica "acima da curva"
     * → raridade sobe. Se for maior ou igual, fica comum (ou mantém se unique forçada).
     */
    rarityFromCosts(suggested, actual, card) {
        // Carta marcada como única por tema (lendária) — respeita se manual lock
        if (card.rarityLocked) return card.rarity || "common";

        const diff = suggested - actual; // positivo = barata demais
        if (diff <= 0) return "common";
        if (diff === 1) return "uncommon";
        if (diff === 2) return "rare";
        return "unique";
    },

    /**
     * Aplica custo automático e raridade na carta.
     * @param {object} card
     * @param {{ forceCost?: boolean, forceRarity?: boolean }} opts
     *   forceCost: sobrescreve o custo com o sugerido
     *   forceRarity: sobrescreve raridade com auto
     */
    apply(card, opts = {}) {
        const ev = this.evaluate(card);
        card.score = ev.score;
        card.suggestedCost = ev.suggestedCost;
        card.scoreBreakdown = ev.breakdown;

        if (!card.costs || !card.costs.length) {
            card.costs = [{ resource: "vigor", amount: ev.suggestedCost }];
        }

        if (opts.forceCost || card.autoCost !== false) {
            // autoCost default true para cartas novas
            if (card.manualCost !== true) {
                card.costs[0].amount = ev.suggestedCost;
            }
        }

        if (opts.forceRarity || (card.manualRarity !== true && card.manualCost === true)) {
            // Só auto-ajusta raridade quando o custo foi alterado manualmente
            card.rarity = ev.autoRarity;
        } else if (card.manualRarity !== true && card.manualCost !== true) {
            // Custo automático: raridade comum por padrão
            card.rarity = card.rarity || "common";
        }

        // Se custo manual e diferente do sugerido, atualiza raridade sugerida
        if (card.manualCost === true && card.manualRarity !== true) {
            card.rarity = ev.autoRarity;
        }

        return ev;
    },

    /** Resumo textual para UI */
    summary(card) {
        const ev = this.evaluate(card);
        const lines = ev.breakdown.map((b) => `${b.points >= 0 ? "+" : ""}${b.points} ${b.label}`);
        return {
            ...ev,
            text: lines.join(" · ") || "Sem pontos",
            formula: `Score ${ev.score} → custo sugerido ${ev.suggestedCost} (${ScoringTable.pointsPerCost} pts/custo)`
        };
    }
};
