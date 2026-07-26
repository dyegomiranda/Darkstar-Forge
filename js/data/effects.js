/* ==========================================================
   Schema de efeitos estruturados (paralelo ao texto de regras)
   Base para validação, export e futuro simulador
========================================================== */

var EffectCatalog = {

    TYPES: [
        { id: "damage", label: { "pt-BR": "Dano", "en-US": "Damage" }, fields: ["amount", "target"] },
        { id: "heal", label: { "pt-BR": "Cura", "en-US": "Heal" }, fields: ["amount"] },
        { id: "draw", label: { "pt-BR": "Comprar cartas", "en-US": "Draw" }, fields: ["amount"] },
        { id: "gain_resource", label: { "pt-BR": "Ganhar recurso", "en-US": "Gain resource" }, fields: ["resource", "amount"] },
        { id: "buff_atk", label: { "pt-BR": "+ATK", "en-US": "+ATK" }, fields: ["amount", "duration"] },
        { id: "buff_def", label: { "pt-BR": "+DEF", "en-US": "+DEF" }, fields: ["amount", "duration"] },
        { id: "keyword", label: { "pt-BR": "Palavra-chave", "en-US": "Keyword" }, fields: ["keyword"] },
        { id: "summon", label: { "pt-BR": "Invocar", "en-US": "Summon" }, fields: ["atk", "def"] },
        { id: "control", label: { "pt-BR": "Controle / imobilizar", "en-US": "Control" }, fields: ["duration"] },
        { id: "counter", label: { "pt-BR": "Anular magia", "en-US": "Counter" }, fields: ["maxCost"] },
        { id: "prevent_damage", label: { "pt-BR": "Prevenir dano", "en-US": "Prevent damage" }, fields: ["amount"] },
        { id: "other", label: { "pt-BR": "Outro (texto)", "en-US": "Other" }, fields: ["note"] }
    ],

    TARGETS: ["any", "creature", "player", "all_enemies", "self"],
    DURATIONS: ["instant", "turn", "battle", "permanent"],
    KEYWORDS: [
        "haste", "flying", "reach", "trample", "first_strike", "vigilance",
        "deathtouch", "lifelink", "taunt", "regenerate", "pierce"
    ],

    label(id) {
        const lang = (typeof I18n !== "undefined" && I18n.lang) || "pt-BR";
        const t = this.TYPES.find((x) => x.id === id);
        return t ? (t.label[lang] || t.label["pt-BR"]) : id;
    },

    normalizeList(list) {
        if (!Array.isArray(list)) return [];
        return list.map((e) => this.normalize(e)).filter(Boolean);
    },

    normalize(e) {
        if (!e || !e.type) return null;
        const out = { type: String(e.type) };
        if (e.amount != null) out.amount = Number(e.amount) || 0;
        if (e.target) out.target = String(e.target);
        if (e.resource) out.resource = String(e.resource);
        if (e.duration) out.duration = String(e.duration);
        if (e.keyword) out.keyword = String(e.keyword);
        if (e.atk != null) out.atk = Number(e.atk) || 0;
        if (e.def != null) out.def = Number(e.def) || 0;
        if (e.maxCost != null) out.maxCost = Number(e.maxCost) || 0;
        if (e.note) out.note = String(e.note).slice(0, 200);
        return out;
    },

    /** Converte mecânicas de scoring em efeitos básicos (heurística) */
    fromMechanics(mechanics) {
        const out = [];
        (mechanics || []).forEach((m) => {
            const id = String(m);
            if (/^damage_(\d+)$/.test(id)) {
                out.push({ type: "damage", amount: Number(RegExp.$1), target: "any" });
            } else if (/^heal_(\d+)$/.test(id)) {
                out.push({ type: "heal", amount: Number(RegExp.$1) });
            } else if (/^draw_(\d+)$/.test(id)) {
                out.push({ type: "draw", amount: Number(RegExp.$1) });
            } else if (id === "gain_resource_1") {
                out.push({ type: "gain_resource", amount: 1 });
            } else if (id === "gain_resource_2") {
                out.push({ type: "gain_resource", amount: 2 });
            } else if (["haste", "flying", "reach", "trample", "first_strike", "vigilance", "deathtouch", "lifelink", "taunt", "pierce"].includes(id)) {
                out.push({ type: "keyword", keyword: id === "regenerate_1" ? "regenerate" : id });
            } else if (id.startsWith("regenerate")) {
                out.push({ type: "keyword", keyword: "regenerate" });
            } else if (id === "summon") {
                out.push({ type: "summon", atk: 1, def: 1 });
            } else if (id === "counterspell") {
                out.push({ type: "counter", maxCost: 3 });
            } else if (id === "control") {
                out.push({ type: "control", duration: "turn" });
            } else if (id === "shield_block") {
                out.push({ type: "prevent_damage", amount: 2 });
            }
        });
        return out;
    },

    summary(effects) {
        const list = this.normalizeList(effects);
        if (!list.length) return "—";
        return list.map((e) => {
            const lab = this.label(e.type);
            if (e.amount != null && e.type !== "keyword") return `${lab} ${e.amount}`;
            if (e.keyword) return e.keyword;
            if (e.note) return `${lab}: ${e.note}`;
            return lab;
        }).join(" · ");
    }
};
