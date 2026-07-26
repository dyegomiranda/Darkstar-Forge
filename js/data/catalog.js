/* ==========================================================
   TCG Studio — Catálogo canônico (cores, recursos, raridades)
   Inspirado em arquétipos de RPG de mesa; conteúdo original.
========================================================== */

var Catalog = {

    /** Proporção MTG: 2.5" × 3.5" → 750 × 1050 @ 300dpi */
    CARD_PX: { w: 750, h: 1050 },
    CARD_MM: { w: 63, h: 88 },

    rarities: [
        { id: "common",   label: "Comum",   color: "#e8e8e8" },
        { id: "uncommon", label: "Incomum", color: "#3d9fff" },
        { id: "rare",     label: "Rara",    color: "#ffd000" },
        { id: "unique",   label: "Única",   color: "#ff6a00" }
    ],

    /**
     * Cores de deck = identidades de classe.
     * resources: recursos primários + secundários disponíveis no deck.
     */
    colors: {
        red: {
            id: "red",
            name: "Vermelho",
            classes: "Guerreiro / Bárbaro",
            primary: "#b92d20",
            highlight: "#d74c3b",
            shadow: "#591711",
            resources: ["vigor", "fury", "gold"],
            classIcon: "crossed-weapons"
        },
        blue: {
            id: "blue",
            name: "Azul",
            classes: "Mago / Feiticeiro",
            primary: "#2f7cff",
            highlight: "#68a4ff",
            shadow: "#143e7d",
            resources: ["mana"],
            classIcon: "arcane-orb"
        },
        green: {
            id: "green",
            name: "Verde",
            classes: "Druida / Guardião",
            primary: "#4d8b34",
            highlight: "#7bc45a",
            shadow: "#1e3d14",
            resources: ["nature"],
            classIcon: "paw"
        },
        black: {
            id: "black",
            name: "Preto",
            classes: "Bruxo / Necromante",
            primary: "#3a3a3a",
            highlight: "#6a6a6a",
            shadow: "#111111",
            resources: ["souls"],
            classIcon: "skull-staff"
        },
        purple: {
            id: "purple",
            name: "Roxo",
            classes: "Ladino / Assassino",
            primary: "#6b3eb6",
            highlight: "#9b6fe0",
            shadow: "#2a1548",
            resources: ["shadow"],
            classIcon: "dagger"
        },
        white: {
            id: "white",
            name: "Branco / Dourado",
            classes: "Clérigo / Paladino",
            primary: "#c3a15a",
            highlight: "#e8d090",
            shadow: "#5a4820",
            resources: ["faith"],
            classIcon: "sun-cross"
        },
        silver: {
            id: "silver",
            name: "Prata",
            classes: "Monge / Bardo",
            primary: "#97a1af",
            highlight: "#c5ccd6",
            shadow: "#3a4048",
            resources: ["focus"],
            classIcon: "lotus"
        },
        /** Deck de recursos (ouro, poções, utilitários) — neutro laranja */
        orange: {
            id: "orange",
            name: "Laranja",
            classes: "Recursos / Utilitários",
            primary: "#e07a2a",
            highlight: "#f0a050",
            shadow: "#5a3010",
            resources: ["gold"],
            classIcon: "utility"
        },
        /** Cor neutra para equipamentos sem sinergia de classe */
        gear: {
            id: "gear",
            name: "Equipamento",
            classes: "Itens / Gear",
            primary: "#8a9098",
            highlight: "#c0c6ce",
            shadow: "#2a2e34",
            resources: ["gold"],
            classIcon: "gear"
        }
    },

    resources: {
        vigor:  { id: "vigor",  name: "Vigor",            icon: "vigor",  color: "#5dce4a" },
        fury:   { id: "fury",   name: "Fúria",             icon: "fury",   color: "#ff5a2a" },
        gold:   { id: "gold",   name: "Ouro",              icon: "gold",   color: "#e0b040" },
        mana:   { id: "mana",   name: "Mana",              icon: "mana",   color: "#3d8bff" },
        nature: { id: "nature", name: "Essência Natural",  icon: "nature", color: "#6fbf4a" },
        souls:  { id: "souls",  name: "Almas",             icon: "souls",  color: "#9b7bff" },
        shadow: { id: "shadow", name: "Sombra",            icon: "shadow", color: "#8a5cff" },
        faith:  { id: "faith",  name: "Fé",                icon: "faith",  color: "#f0d080" },
        // cinza mais claro + brilho para legibilidade no painel escuro
        focus:  { id: "focus",  name: "Foco",              icon: "focus",  color: "#e8eef8" }
    },

    /**
     * Sinergia de equipamento → cor de classe (frame + ícone).
     * Prefere card.classAffinity; senão infere por tags/nome.
     */
    equipmentClassFor(card) {
        if (card?.classAffinity && this.colors[card.classAffinity]) {
            return card.classAffinity;
        }
        const tags = card?.tags || [];
        const name = ((card?.name || "") + " " + (card?.subtype || "")).toLowerCase();
        if (tags.includes("weapon") || /espada|machado|martelo|lança|alabarda|clava|escudo torre|peitoral|grevas de placas|elmo de aço|manoplas de aço/.test(name)) {
            if (/cajado|orbe|túnica|diadema|capuz do mago|anel do arquimago|medalhão arcano/.test(name)) return "blue";
            if (/adaga|silencios|gatuno|veneno/.test(name)) return "purple";
            if (/arco|percursor|élfic|couro|bota de marcha/.test(name)) return "green";
            if (/sagrad|fé|paladin|anjo|cruz/.test(name)) return "white";
            if (/monge|sandália|ki|lótus|foco/.test(name)) return "silver";
            return "red";
        }
        if (tags.includes("offhand")) {
            if (/orbe|foco/.test(name)) return "blue";
            if (/adaga/.test(name)) return "purple";
            return "red"; // escudos
        }
        if (tags.includes("head")) {
            if (/capuz|diadema|mago|arcano/.test(name)) return "blue";
            if (/alado|elmo/.test(name)) return "white";
            if (/couro/.test(name)) return "green";
            return "red";
        }
        if (tags.includes("chest")) {
            if (/túnica|ritual|robe/.test(name)) return "blue";
            if (/guardião|placa|malha/.test(name)) return "red";
            if (/couro|gibão/.test(name)) return "green";
            return "red";
        }
        if (tags.includes("hands")) {
            if (/runic|bracelete/.test(name)) return "blue";
            if (/gatuno|ladrão/.test(name)) return "purple";
            if (/sagrad/.test(name)) return "white";
            return "red";
        }
        if (tags.includes("legs") || tags.includes("feet")) {
            if (/élfic|percursor|silencios|couro|marcha/.test(name)) return "green";
            if (/monge|sandália/.test(name)) return "silver";
            if (/alada|asa/.test(name)) return "white";
            if (/placa|aço/.test(name)) return "red";
            return "green";
        }
        if (tags.includes("amulet") || tags.includes("ring")) {
            if (/arcano|arquimago|mana/.test(name)) return "blue";
            if (/fé|sagrad|proteção/.test(name)) return "white";
            if (/vigor|força/.test(name)) return "red";
            if (/dragão/.test(name)) return "red";
            return "white";
        }
        return "gear";
    },

    cardTypes: [
        "Criatura",
        "Ação",
        "Habilidade",
        "Equipamento",
        "Arma",
        "Armadura",
        "Encantamento",
        "Magia",
        "Aliado",
        "Mercenário",
        "Relíquia",
        "Terreno"
    ],

    templates: [
        { id: "classic-fullart", name: "Clássico Full Art" }
    ],

    /** Resolve lista de cores hex a partir de colorIds */
    resolveFrameColors(colorIds) {
        const ids = Array.isArray(colorIds) && colorIds.length
            ? colorIds
            : ["red"];
        return ids.map((id) => {
            const c = this.colors[id];
            return c ? c.primary : "#b92d20";
        });
    },

    rarityById(id) {
        return this.rarities.find((r) => r.id === id) || this.rarities[0];
    },

    colorById(id) {
        return this.colors[id] || this.colors.red;
    },

    resourceById(id) {
        return this.resources[id] || this.resources.vigor;
    }
};

