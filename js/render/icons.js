/* ==========================================================
   Darkstar Forge — Ícones (PNG de assets + fallback SVG)
========================================================== */

var Icons = {

    /** Nunca usar logo do set como recurso */
    /** PNG com fundo transparente (Imagine processado) — preenche o círculo sem “bolinha” extra */
    RESOURCE_ASSETS: {
        vigor:  "assets/icons/resources/vigor.png",
        fury:   "assets/icons/resources/fury.png",
        gold:   "assets/icons/resources/gold.png",
        mana:   "assets/icons/resources/mana.png",
        nature: "assets/icons/resources/nature.png",
        souls:  "assets/icons/resources/souls.png",
        shadow: "assets/icons/resources/shadow.png",
        faith:  "assets/icons/resources/faith.png",
        focus:  "assets/icons/resources/focus.png"
    },

    /** Ícones de classe (arte Imagine) + utilitários */
    CLASS_ASSETS: {
        red:    "assets/icons/classes/red.jpg",
        blue:   "assets/icons/classes/blue.jpg",
        green:  "assets/icons/classes/green.jpg",
        black:  "assets/icons/classes/black.jpg",
        purple: "assets/icons/classes/purple.jpg",
        white:  "assets/icons/classes/white.jpg",
        silver: "assets/icons/classes/silver.jpg",
        orange: "assets/icons/utility/resources.jpg",
        utility:"assets/icons/utility/resources.jpg",
        gear:   "assets/icons/utility/equipment.jpg"
    },

    customResource(id) {
        const c = Store.project?.meta?.icons?.resources?.[id] || null;
        if (!c) return null;
        // Bloqueia se for o mesmo dataURL do logo do set
        const set = Store.project?.meta?.setSymbolDataUrl || Store.project?.meta?.icons?.set;
        if (set && c === set) return null;
        if (typeof c === "string" && /icons\/set\/logo/i.test(c)) return null; // não usar logo do set como mana
        return c;
    },
    customClass(colorId) {
        return Store.project?.meta?.icons?.classes?.[colorId] || null;
    },
    customSet() {
        return Store.project?.meta?.setSymbolDataUrl
            || Store.project?.meta?.icons?.set
            || "assets/icons/set/logo.png";
    },
    customRarity(rarityId) {
        return Store.project?.meta?.icons?.rarities?.[rarityId] || null;
    },

    TOKEN_MAP: {
        mana: "mana", m: "mana",
        vigor: "vigor", v: "vigor",
        fury: "fury", furia: "fury",
        gold: "gold", ouro: "gold",
        nature: "nature", natural: "nature", n: "nature",
        souls: "souls", almas: "souls",
        shadow: "shadow", sombra: "shadow",
        faith: "faith", fe: "faith",
        focus: "focus", foco: "focus"
    },

    imgTag(src, size, alt = "") {
        if (!src) return "";
        return `<img class="icon-img" src="${src}" alt="${alt}" width="${size}" height="${size}" draggable="false"/>`;
    },

    resource(id, size = 28) {
        const custom = this.customResource(id);
        if (custom) return this.imgTag(custom, size, id);

        const asset = this.RESOURCE_ASSETS[id];
        if (asset) {
            // PNG transparente: preenche o slot (sem círculo preto extra da arte)
            const cls = id === "focus" ? "icon-img icon-focus icon-resource" : "icon-img icon-resource";
            return `<img class="${cls}" src="${asset}" alt="${id}" width="${size}" height="${size}" draggable="false"/>`;
        }

        // Fallback SVG mínimo
        return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" class="icon-svg">
          <circle cx="16" cy="16" r="12" fill="#888"/></svg>`;
    },

    classIcon(colorId, size = 28) {
        const custom = this.customClass(colorId);
        if (custom) return this.imgTag(custom, size, colorId);

        // Arte de classe / utilitário (PNG/JPG em assets)
        const asset = this.CLASS_ASSETS[colorId];
        if (asset) {
            return `<img class="icon-img icon-class" src="${asset}" alt="${colorId}" width="${size}" height="${size}" draggable="false"/>`;
        }

        const col = Catalog.colorById(colorId);
        const c = col.primary;
        const hi = col.highlight || c;

        // Fallback SVG se faltar asset
        const map = {
            /* Vermelho: espada + machado cruzados em X */
            "crossed-weapons": `
              <g stroke="${c}" fill="${hi}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <!-- espada (\\) -->
                <path d="M7 26 L20 8" stroke="${c}" stroke-width="2.2" fill="none"/>
                <path d="M18.2 5.5 L23.5 9.2 L21.2 11.2 L16 7.5 Z"/>
                <path d="M9.5 22.5 H14.2" stroke="${c}" stroke-width="2.4" fill="none"/>
                <rect x="5.5" y="25" width="4" height="3.2" rx="0.6" fill="${c}"/>
                <!-- machado (/) -->
                <path d="M25 26 L12 8" stroke="${c}" stroke-width="2.2" fill="none"/>
                <path d="M8.5 5.8 C6 7.5 6.2 12 9.5 13.5 L13.5 9.2 C11.5 7.2 10.5 6 8.5 5.8 Z"/>
                <path d="M18 22.5 H22.5" stroke="${c}" stroke-width="2.4" fill="none"/>
                <rect x="22.5" y="25" width="4" height="3.2" rx="0.6" fill="${c}"/>
              </g>`,
            /* Azul: grimório aberto */
            "arcane-orb": `
              <g fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round">
                <path d="M16 7 L5 10.5 V24 L16 27.5 L27 24 V10.5 Z" fill="${hi}" fill-opacity="0.35"/>
                <path d="M16 7 V27.5" stroke-width="1.6"/>
                <path d="M16 7 L5 10.5" /><path d="M16 7 L27 10.5"/>
                <path d="M5 24 L16 27.5 L27 24"/>
                <!-- linhas de texto -->
                <path d="M8 14 H13.5 M8 17 H13 M8 20 H13.2" stroke="${c}" stroke-width="1" opacity="0.75"/>
                <path d="M18.5 14 H24 M19 17 H24 M18.8 20 H23.5" stroke="${c}" stroke-width="1" opacity="0.75"/>
                <circle cx="16" cy="12" r="1.6" fill="${hi}" stroke="none"/>
              </g>`,
            /* Verde: pata com garras afiadas */
            "paw": `
              <g fill="${c}">
                <ellipse cx="16" cy="22.2" rx="7.4" ry="5.8"/>
                <circle cx="9.2" cy="12.5" r="3.1"/>
                <circle cx="22.8" cy="12.5" r="3.1"/>
                <circle cx="6.8" cy="18.2" r="2.6"/>
                <circle cx="25.2" cy="18.2" r="2.6"/>
                <!-- garras -->
                <path d="M7.6 9.2 L6.2 5.5 L9.4 8.4" fill="${hi}"/>
                <path d="M11.2 9 L10.6 4.8 L13.2 8.2" fill="${hi}"/>
                <path d="M20.8 9 L21.4 4.8 L18.8 8.2" fill="${hi}"/>
                <path d="M24.4 9.2 L25.8 5.5 L22.6 8.4" fill="${hi}"/>
                <path d="M5.2 15.2 L2.8 12.5 L6.6 14.5" fill="${hi}"/>
                <path d="M26.8 15.2 L29.2 12.5 L25.4 14.5" fill="${hi}"/>
              </g>`,
            /* Preto: caveira demoníaca */
            "skull-staff": `
              <g fill="${hi}" stroke="${c}" stroke-width="1">
                <path d="M16 3.5 C9.5 3.5 5.5 8.5 5.5 14.5 C5.5 18.5 7 21 9 23.5 L9 27.5 L12 26 L16 28.5 L20 26 L23 27.5 L23 23.5 C25 21 26.5 18.5 26.5 14.5 C26.5 8.5 22.5 3.5 16 3.5 Z"/>
                <!-- chifres -->
                <path d="M8 8 L4 2.5 L9.5 6.5" fill="${c}" stroke="none"/>
                <path d="M24 8 L28 2.5 L22.5 6.5" fill="${c}" stroke="none"/>
                <!-- olhos -->
                <ellipse cx="11.5" cy="14" rx="2.4" ry="3" fill="#0a0807" stroke="none"/>
                <ellipse cx="20.5" cy="14" rx="2.4" ry="3" fill="#0a0807" stroke="none"/>
                <path d="M14 19.5 H18 L16.5 22.5 Z" fill="#0a0807" stroke="none"/>
                <path d="M11 24 H21" stroke="#0a0807" stroke-width="1.2" fill="none"/>
              </g>`,
            /* Roxo: adaga detalhada */
            "dagger": `
              <g stroke="${c}" fill="${hi}" stroke-width="1" stroke-linejoin="round">
                <path d="M16 2.5 L18.8 16.5 L16 29.5 L13.2 16.5 Z"/>
                <path d="M16 2.5 L17.2 15 L16 16.5 L14.8 15 Z" fill="${c}" opacity="0.35" stroke="none"/>
                <path d="M10 16.2 H22" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>
                <path d="M11.5 16.2 H20.5" stroke="${hi}" stroke-width="1" opacity="0.7"/>
                <rect x="14.2" y="16.5" width="3.6" height="5.5" rx="0.6" fill="${c}"/>
                <path d="M13 22 H19 L17.5 25 H14.5 Z" fill="${c}"/>
                <circle cx="16" cy="15.2" r="1.1" fill="${hi}" stroke="${c}"/>
              </g>`,
            /* Branco/dourado: escudo com cruz */
            "sun-cross": `
              <g stroke="${c}" fill="${hi}" stroke-width="1.3" stroke-linejoin="round">
                <path d="M16 2.5 L27 7.5 V15.5 C27 22.5 22 27.5 16 29.5 C10 27.5 5 22.5 5 15.5 V7.5 Z" fill-opacity="0.4"/>
                <path d="M16 5 L24.5 8.5 V15.2 C24.5 20.8 20.5 25 16 26.8 C11.5 25 7.5 20.8 7.5 15.2 V8.5 Z" fill="${hi}" fill-opacity="0.55"/>
                <!-- cruz -->
                <path d="M16 9.5 V22.5 M10.5 16 H21.5" stroke="${c}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
                <path d="M16 10.5 V21.5 M11.5 16 H20.5" stroke="${hi}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.8"/>
              </g>`,
            /* Prata: flor de lótus */
            "lotus": `
              <g fill="${hi}" stroke="${c}" stroke-width="1" stroke-linejoin="round">
                <!-- pétalas traseiras -->
                <path d="M16 26 C8 20 6 12 11 7 C13 11 15 13 16 13 C17 13 19 11 21 7 C26 12 24 20 16 26 Z" opacity="0.55"/>
                <path d="M6 22 C4 14 9 8 14 10 C12 14 12 18 13 22 C10 22 7 23 6 22 Z" opacity="0.7"/>
                <path d="M26 22 C28 14 23 8 18 10 C20 14 20 18 19 22 C22 22 25 23 26 22 Z" opacity="0.7"/>
                <!-- pétala central -->
                <path d="M16 25 C12 18 13 9 16 5 C19 9 20 18 16 25 Z" fill="${c}" fill-opacity="0.85"/>
                <path d="M16 24 C14 18 14.5 11 16 8 C17.5 11 18 18 16 24 Z" fill="${hi}" stroke="none" opacity="0.5"/>
                <circle cx="16" cy="18" r="1.4" fill="${hi}" stroke="none"/>
              </g>`
        };
        const body = map[col.classIcon] || map["crossed-weapons"];
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" class="icon-svg">${body}</svg>`;
    },

    customCombat(kind) {
        // kind: "sword" | "shield"
        return Store.project?.meta?.icons?.combat?.[kind] || null;
    },

    sword(size = 28) {
        const custom = this.customCombat("sword");
        if (custom) return this.imgTag(custom, size, "atk");
        return this.imgTag("assets/icons/ui/sword.png", size, "atk");
    },
    shield(size = 28) {
        const custom = this.customCombat("shield");
        if (custom) return this.imgTag(custom, size, "def");
        return this.imgTag("assets/icons/ui/shield.png", size, "def");
    },
    setSymbol(size = 24) {
        return this.imgTag(this.customSet(), size, "set");
    },
    raritySymbol(rarityId, size = 18) {
        const custom = this.customRarity(rarityId);
        // ignora custom vazio/quebrado (causava retângulo preto)
        if (custom && String(custom).length > 32) {
            return this.imgTag(custom, size, rarityId);
        }
        const id = rarityId || "common";
        const r = Catalog.rarityById(id);
        // Comum: prata clara bem legível (não usa fill quase branco sem contorno)
        const fills = {
            common:   { fill: "#d8d2c8", stroke: "#2a241c", inner: "rgba(255,255,255,0.35)" },
            uncommon: { fill: "#3d9fff", stroke: "#0a2040", inner: "rgba(255,255,255,0.28)" },
            rare:     { fill: "#ffd000", stroke: "#5a4000", inner: "rgba(255,255,255,0.3)" },
            unique:   { fill: "#ff6a00", stroke: "#4a1800", inner: "rgba(255,255,255,0.25)" }
        };
        const col = fills[id] || fills.common;
        // Diamante clássico com contorno escuro (funciona em fundo escuro e claro)
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" class="icon-svg rarity-svg rarity-${id}">
          <path d="M10 1.4 L18.2 10 L10 18.6 L1.8 10 Z" fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M10 4.2 L15.2 10 L10 15.8 L4.8 10 Z" fill="${col.inner}" stroke="none"/>
        </svg>`;
    },

    parseRulesHTML(text, iconSize = 18) {
        const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        return String(text || "").split(/(\{[a-zA-Z]+\})/g).map((part) => {
            const m = part.match(/^\{([a-zA-Z]+)\}$/);
            if (m) {
                const resId = this.TOKEN_MAP[m[1].toLowerCase()];
                if (resId) return `<span class="inline-mana" title="${resId}">${this.resource(resId, iconSize)}</span>`;
            }
            return esc(part).replace(/\n/g, "<br>");
        }).join("");
    },

    /** HTML de opção de recurso com ícone (para custom select) */
    resourceOptionHTML(id, label) {
        return `<span class="res-opt">${this.resource(id, 18)} <span>${label}</span></span>`;
    }
};
