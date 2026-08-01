/* ==========================================================
   Internacionalização — PT-BR (padrão) e EN-US
========================================================== */

var I18n = {
    lang: "pt-BR",

    t(key) {
        const pack = this.strings[this.lang] || this.strings["pt-BR"];
        return pack[key] ?? this.strings["pt-BR"][key] ?? key;
    },

    setLang(lang) {
        if (!this.strings[lang]) lang = "pt-BR";
        this.lang = lang;
        try { localStorage.setItem("tcg-lang", lang); } catch (_) {}
        document.documentElement.lang = lang === "en-US" ? "en" : "pt-BR";
        this.applyChrome();
        // Re-render da view atual
        if (typeof AppUI !== "undefined") AppUI.render();
    },

    load() {
        try {
            const saved = localStorage.getItem("tcg-lang");
            if (saved && this.strings[saved]) this.lang = saved;
        } catch (_) {}
        this.applyChrome();
    },

    applyChrome() {
        const map = {
            btnLibrary: "nav.library",
            btnExportProject: "nav.export",
            btnImportProject: "nav.import",
            btnResetSeed: "nav.reset"
        };
        Object.entries(map).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.t(key);
        });
        const brand = document.querySelector(".brand-title");
        if (brand) brand.textContent = this.t("app.title");
        const sub = document.querySelector(".brand-sub");
        if (sub) sub.textContent = this.t("app.subtitle");
        const pn = document.getElementById("projectName");
        if (pn) pn.placeholder = this.t("app.projectName");
    },

    strings: {
        "pt-BR": {
            "app.title": "TCG × RPG Studio",
            "app.subtitle": "Editor modular de cartas",
            "app.projectName": "Nome do projeto",
            "nav.library": "Biblioteca",
            "nav.export": "Exportar JSON",
            "nav.import": "Importar JSON",
            "nav.reset": "Reset seed",
            "nav.lang": "Idioma",
            "lib.edition": "Edição",
            "lib.newEdition": "+ Nova edição",
            "lib.rename": "Renomear",
            "lib.footer": "Rodapé padrão",
            "lib.setSymbol": "Símbolo do set (logotipo)",
            "lib.clearSet": "Usar logotipo padrão",
            "lib.decks": "Decks / Coleções",
            "lib.classes": "Classes",
            "lib.special": "Coleções especiais",
            "lib.character": "Personagem",
            "lib.sheet": "Ficha do Personagem",
            "lib.actions": "Ações",
            "lib.newCard": "+ Nova carta",
            "lib.pdfDeck": "PDF do deck",
            "lib.pdfEdition": "PDF da edição",
            "lib.printDeck": "Imprimir deck",
            "lib.printEdition": "Imprimir edição",
            "lib.search": "Buscar cartas…",
            "lib.tags": "Tags do sistema",
            "lib.tagsEdit": "Editor de tags",
            "lib.tagsHint": "Tags filtram slots na ficha e classificam cartas.",
            "lib.tagAdd": "+ Nova tag",
            "lib.tagId": "ID (sem espaços)",
            "lib.tagLabelPt": "Rótulo PT-BR",
            "lib.tagLabelEn": "Rótulo EN-US",
            "sheet.title": "Ficha do Personagem",
            "sheet.back": "← Biblioteca",
            "sheet.print": "Imprimir ficha",
            "sheet.save": "Salvar",
            "sheet.clear": "Limpar ficha",
            "sheet.unsaved": "Alterações não salvas",
            "sheet.race": "Raça",
            "sheet.raceCustom": "Outra (manual)…",
            "sheet.level": "Nível",
            "sheet.hp": "PV",
            "sheet.equipment": "Equipamentos",
            "sheet.buffs": "Bônus dos equipamentos",
            "sheet.buffsEmpty": "Nenhum item equipado.",
            "sheet.buffsCombat": "Soma ATK/DEF dos itens:",
            "sheet.resources": "Recursos de jogo",
            "sheet.notes": "Anotações",
            "sheet.points": "Pontos de atributo",
            "sheet.pointsHint": "Base 10 em cada. Ao trocar a raça, atributos e PV máximos são recalculados. Ajuste livre depois, com cuidado de balanceamento.",
            "stat.str": "Força",
            "stat.dex": "Destreza",
            "stat.con": "Constituição",
            "stat.int": "Inteligência",
            "stat.wis": "Sabedoria",
            "stat.cha": "Carisma",
            "slot.mainHand": "Mão principal",
            "slot.offHand": "Mão secundária",
            "slot.head": "Cabeça",
            "slot.chest": "Peito",
            "slot.hands": "Mãos",
            "slot.legs": "Pernas",
            "slot.feet": "Pés",
            "slot.amulet": "Amuleto",
            "slot.ring1": "Anel 1",
            "slot.ring2": "Anel 2",
            "slot.empty": "— vazio —"
        },
        "en-US": {
            "app.title": "TCG × RPG Studio",
            "app.subtitle": "Modular card editor",
            "app.projectName": "Project name",
            "nav.library": "Library",
            "nav.export": "Export JSON",
            "nav.import": "Import JSON",
            "nav.reset": "Reset seed",
            "nav.lang": "Language",
            "lib.edition": "Edition",
            "lib.newEdition": "+ New edition",
            "lib.rename": "Rename",
            "lib.footer": "Default footer",
            "lib.setSymbol": "Set symbol (logo)",
            "lib.clearSet": "Use default logo",
            "lib.decks": "Decks / Collections",
            "lib.classes": "Classes",
            "lib.special": "Special collections",
            "lib.character": "Character",
            "lib.sheet": "Character Sheet",
            "lib.actions": "Actions",
            "lib.newCard": "+ New card",
            "lib.pdfDeck": "Deck PDF",
            "lib.pdfEdition": "Edition PDF",
            "lib.printDeck": "Print deck",
            "lib.printEdition": "Print edition",
            "lib.search": "Search cards…",
            "lib.tags": "System tags",
            "lib.tagsEdit": "Tag editor",
            "lib.tagsHint": "Tags filter sheet slots and classify cards.",
            "lib.tagAdd": "+ New tag",
            "lib.tagId": "ID (no spaces)",
            "lib.tagLabelPt": "Label PT-BR",
            "lib.tagLabelEn": "Label EN-US",
            "sheet.title": "Character Sheet",
            "sheet.back": "← Library",
            "sheet.print": "Print sheet",
            "sheet.save": "Save",
            "sheet.clear": "Clear sheet",
            "sheet.unsaved": "Unsaved changes",
            "sheet.race": "Race",
            "sheet.raceCustom": "Other (custom)…",
            "sheet.level": "Level",
            "sheet.hp": "HP",
            "sheet.equipment": "Equipment",
            "sheet.buffs": "Equipment bonuses",
            "sheet.buffsEmpty": "No items equipped.",
            "sheet.buffsCombat": "Item ATK/DEF total:",
            "sheet.resources": "Game resources",
            "sheet.notes": "Notes",
            "sheet.points": "Ability scores",
            "sheet.pointsHint": "Base 10 each. Changing race recalculates ability scores and max HP. Adjust freely afterwards with balance in mind.",
            "stat.str": "Strength",
            "stat.dex": "Dexterity",
            "stat.con": "Constitution",
            "stat.int": "Intelligence",
            "stat.wis": "Wisdom",
            "stat.cha": "Charisma",
            "slot.mainHand": "Main hand",
            "slot.offHand": "Off hand",
            "slot.head": "Head",
            "slot.chest": "Chest",
            "slot.hands": "Hands",
            "slot.legs": "Legs",
            "slot.feet": "Feet",
            "slot.amulet": "Amulet",
            "slot.ring1": "Ring 1",
            "slot.ring2": "Ring 2",
            "slot.empty": "— empty —"
        }
    }
};
