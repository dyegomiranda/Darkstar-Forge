/* ==========================================================
   Raças / Ancestralidades — bônus de atributo (inspirado PF2e)
   Base: cada atributo começa em 10.
   Ancestralidade: tipicamente +2 / +2 / −2 (ou free boosts simplificados).
   Conteúdo original; arquétipos genéricos de fantasia.
========================================================== */

var Races = {

    /** Lista ordenada */
    list: [
        {
            id: "human",
            name: { "pt-BR": "Humano", "en-US": "Human" },
            icon: "🧑",
            // Humanos flexíveis: +2 em dois à escolha — aplicamos +2 FOR e +2 CAR como sugestão
            boosts: { str: 2, cha: 2 },
            flaws: {},
            hp: 8,
            desc: { "pt-BR": "Versáteis e ambiciosos.", "en-US": "Versatile and ambitious." }
        },
        {
            id: "elf",
            name: { "pt-BR": "Elfo", "en-US": "Elf" },
            icon: "🧝",
            boosts: { dex: 2, int: 2 },
            flaws: { con: -2 },
            hp: 6,
            desc: { "pt-BR": "Ágeis e longevos.", "en-US": "Graceful and long-lived." }
        },
        {
            id: "dwarf",
            name: { "pt-BR": "Anão", "en-US": "Dwarf" },
            icon: "🧔",
            boosts: { con: 2, wis: 2 },
            flaws: { cha: -2 },
            hp: 10,
            desc: { "pt-BR": "Resistentes e teimosos.", "en-US": "Stout and steadfast." }
        },
        {
            id: "halfling",
            name: { "pt-BR": "Halfling", "en-US": "Halfling" },
            icon: "🦶",
            boosts: { dex: 2, wis: 2 },
            flaws: { str: -2 },
            hp: 6,
            desc: { "pt-BR": "Pequenos e sortudos.", "en-US": "Small and lucky." }
        },
        {
            id: "gnome",
            name: { "pt-BR": "Gnomo", "en-US": "Gnome" },
            icon: "🧙",
            boosts: { con: 2, cha: 2 },
            flaws: { str: -2 },
            hp: 8,
            desc: { "pt-BR": "Curiosos e mágicos.", "en-US": "Curious and magical." }
        },
        {
            id: "orc",
            name: { "pt-BR": "Orc", "en-US": "Orc" },
            icon: "👹",
            boosts: { str: 2, con: 2 },
            flaws: { int: -2 },
            hp: 10,
            desc: { "pt-BR": "Fortes e ferozes.", "en-US": "Strong and fierce." }
        },
        {
            id: "goblin",
            name: { "pt-BR": "Goblin", "en-US": "Goblin" },
            icon: "👺",
            boosts: { dex: 2, cha: 2 },
            flaws: { wis: -2 },
            hp: 6,
            desc: { "pt-BR": "Astutos e caóticos.", "en-US": "Clever and chaotic." }
        },
        {
            id: "tiefling",
            name: { "pt-BR": "Tiefling", "en-US": "Tiefling" },
            icon: "😈",
            boosts: { cha: 2, int: 2 },
            flaws: { wis: -2 },
            hp: 8,
            desc: { "pt-BR": "Herança infernal.", "en-US": "Infernal heritage." }
        },
        {
            id: "aasimar",
            name: { "pt-BR": "Aasimar", "en-US": "Aasimar" },
            icon: "😇",
            boosts: { wis: 2, cha: 2 },
            flaws: {},
            hp: 8,
            desc: { "pt-BR": "Herança celestial.", "en-US": "Celestial heritage." }
        },
        {
            id: "dragonborn",
            name: { "pt-BR": "Draconato", "en-US": "Dragonborn" },
            icon: "🐉",
            boosts: { str: 2, cha: 2 },
            flaws: {},
            hp: 10,
            desc: { "pt-BR": "Sangue de dragão.", "en-US": "Dragon blood." }
        },
        // "Outra (manual)" removida: ficha usa raça em branco para escrita à mão na impressão
    ],

    /** PV base do jogador no TCG (antes do bônus de ancestralidade) */
    TCG_BASE_HP: 30,
    /** PV por nível após o 1º (progressão de campanha) */
    HP_PER_LEVEL: 5,

    get(id) {
        if (!id) return null;
        return this.list.find((r) => r.id === id) || null;
    },

    label(id, lang) {
        const r = this.get(id);
        if (!r) return "";
        return r.name[lang] || r.name["pt-BR"];
    },

    /**
     * Atributos sugeridos (base 10 + boosts/flaws no estilo PF2e).
     * Sem raça selecionada → todos 10 (jogador preenche à mão).
     */
    suggestedStats(raceId) {
        const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        const r = this.get(raceId);
        if (!r) return stats;
        Object.entries(r.boosts || {}).forEach(([k, v]) => { stats[k] = (stats[k] || 10) + v; });
        Object.entries(r.flaws || {}).forEach(([k, v]) => { stats[k] = (stats[k] || 10) + v; });
        return stats;
    },

    /**
     * PV iniciais do personagem (TCG × RPG):
     *   PV = 30 (base de partida do jogo) + HP de ancestralidade (PF2e Remaster)
     *       + 5 × (nível − 1)
     *
     * HP de ancestralidade (livro do jogador PF2e, valores típicos):
     *   Anão/Orc/Draconato 10 · Humano/Gnomo/Tiefling/Aasimar 8 · Elfo/Halfling/Goblin 6
     * Sem raça: apenas 30 (espaço em branco na ficha impressa).
     */
    suggestedHp(raceId, level = 1) {
        const lvl = Math.max(1, Number(level) || 1);
        const r = this.get(raceId);
        const ancestryHp = r ? (r.hp || 8) : 0;
        return this.TCG_BASE_HP + ancestryHp + this.HP_PER_LEVEL * Math.max(0, lvl - 1);
    }
};
