/* ==========================================================
   Fontes — lista expandida (open source / Google Fonts)
========================================================== */

var FontCatalog = {

    builtins: [
        // Display / fantasia
        { id: "cinzel", name: "Cinzel", family: "'Cinzel', serif", google: "Cinzel:wght@500;600;700" },
        { id: "cinzel-dec", name: "Cinzel Decorative", family: "'Cinzel Decorative', serif", google: "Cinzel+Decorative:wght@400;700" },
        { id: "orbitron", name: "Orbitron", family: "'Orbitron', sans-serif", google: "Orbitron:wght@500;700" },
        { id: "metamorphous", name: "Metamorphous", family: "'Metamorphous', serif", google: "Metamorphous" },
        { id: "medievalsharp", name: "MedievalSharp", family: "'MedievalSharp', serif", google: "MedievalSharp" },
        { id: "im-fell", name: "IM Fell English", family: "'IM Fell English', serif", google: "IM+Fell+English:ital@0;1" },
        // Serif legíveis
        { id: "eb-garamond", name: "EB Garamond", family: "'EB Garamond', Georgia, serif", google: "EB+Garamond:ital,wght@0,500;0,700;1,500" },
        { id: "libre-baskerville", name: "Libre Baskerville", family: "'Libre Baskerville', Georgia, serif", google: "Libre+Baskerville:ital,wght@0,400;0,700;1,400" },
        { id: "kameron", name: "Kameron", family: "'Kameron', serif", google: "Kameron:wght@400;600;700" },
        { id: "cardo", name: "Cardo", family: "'Cardo', Georgia, serif", google: "Cardo:ital,wght@0,400;0,700;1,400" },
        { id: "cormorant", name: "Cormorant Garamond", family: "'Cormorant Garamond', serif", google: "Cormorant+Garamond:ital,wght@0,500;0,700;1,500" },
        // Sans modernas
        { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif", google: "Montserrat:wght@400;600;700" },
        { id: "inter", name: "Inter", family: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;600;700" },
        { id: "noto-sans", name: "Noto Sans", family: "'Noto Sans', sans-serif", google: "Noto+Sans:wght@400;600;700" },
        { id: "raleway", name: "Raleway", family: "'Raleway', sans-serif", google: "Raleway:wght@400;600;700" },
        { id: "nunito-sans", name: "Nunito Sans", family: "'Nunito Sans', sans-serif", google: "Nunito+Sans:wght@400;600;700" },
        { id: "rubik", name: "Rubik", family: "'Rubik', sans-serif", google: "Rubik:wght@400;600;700" },
        { id: "ubuntu", name: "Ubuntu", family: "'Ubuntu', sans-serif", google: "Ubuntu:wght@400;500;700" },
        { id: "saira", name: "Saira", family: "'Saira', sans-serif", google: "Saira:wght@400;600;700" },
        { id: "quicksand", name: "Quicksand", family: "'Quicksand', sans-serif", google: "Quicksand:wght@400;600;700" },
        { id: "space-grotesk", name: "Space Grotesk", family: "'Space Grotesk', sans-serif", google: "Space+Grotesk:wght@400;600;700" },
        { id: "josefin-sans", name: "Josefin Sans", family: "'Josefin Sans', sans-serif", google: "Josefin+Sans:wght@400;600;700" },
        { id: "lexend", name: "Lexend", family: "'Lexend', sans-serif", google: "Lexend:wght@400;600;700" },
        { id: "fredoka", name: "Fredoka", family: "'Fredoka', sans-serif", google: "Fredoka:wght@400;600" },
        { id: "comfortaa", name: "Comfortaa", family: "'Comfortaa', sans-serif", google: "Comfortaa:wght@400;600;700" },
        { id: "source-sans", name: "Source Sans 3", family: "'Source Sans 3', sans-serif", google: "Source+Sans+3:wght@400;600;700" },
        { id: "source-code", name: "Source Code Pro", family: "'Source Code Pro', monospace", google: "Source+Code+Pro:wght@400;600" },
        // Script / decorativas
        { id: "caveat", name: "Caveat", family: "'Caveat', cursive", google: "Caveat:wght@400;600;700" },
        { id: "tangerine", name: "Tangerine", family: "'Tangerine', cursive", google: "Tangerine:wght@400;700" },
        { id: "italianno", name: "Italianno", family: "'Italianno', cursive", google: "Italianno" },
        { id: "ephesis", name: "Ephesis", family: "'Ephesis', cursive", google: "Ephesis" },
        { id: "island-moments", name: "Island Moments", family: "'Island Moments', cursive", google: "Island+Moments" }
    ],

    _loaded: new Set(),

    list() {
        const custom = (Store.project?.meta?.customFonts || []).map((f) => ({
            id: f.id, name: f.name + " (importada)", family: f.family, custom: true
        }));
        return [...this.builtins, ...custom];
    },

    get(id) {
        return this.list().find((f) => f.id === id) || this.builtins[0];
    },

    familyCss(id) {
        return this.get(id).family;
    },

    ensureGoogleLoaded() {
        const needed = this.builtins.filter((f) => f.google && !this._loaded.has(f.id)).map((f) => f.google);
        if (!needed.length) return;
        let link = document.getElementById("tcg-google-fonts");
        if (!link) {
            link = document.createElement("link");
            link.id = "tcg-google-fonts";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        // Google CSS2 limita URL — carrega em 2 lotes se necessário
        const chunk = (arr, n) => {
            const out = [];
            for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
            return out;
        };
        const batches = chunk(needed, 14);
        batches.forEach((batch, idx) => {
            let el = document.getElementById("tcg-google-fonts-" + idx);
            if (!el) {
                el = document.createElement("link");
                el.id = "tcg-google-fonts-" + idx;
                el.rel = "stylesheet";
                document.head.appendChild(el);
            }
            el.href = "https://fonts.googleapis.com/css2?family=" + batch.join("&family=") + "&display=swap";
        });
        this.builtins.forEach((f) => this._loaded.add(f.id));
    },

    async importFontFile(file) {
        const name = file.name.replace(/\.[^.]+$/, "");
        const id = "custom_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now().toString(36);
        const dataUrl = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
        });
        const familyName = "CustomFont_" + id;
        const face = new FontFace(familyName, `url(${dataUrl})`);
        await face.load();
        document.fonts.add(face);
        if (!Store.project.meta.customFonts) Store.project.meta.customFonts = [];
        const entry = { id, name, family: `'${familyName}', Georgia, serif`, dataUrl };
        Store.project.meta.customFonts.push(entry);
        Store.save();
        this._loaded.add(id);
        return entry;
    },

    async restoreCustomFonts() {
        for (const f of (Store.project?.meta?.customFonts || [])) {
            if (!f.dataUrl) continue;
            try {
                const familyName = f.family.match(/'([^']+)'/)?.[1] || f.id;
                const face = new FontFace(familyName, `url(${f.dataUrl})`);
                await face.load();
                document.fonts.add(face);
                this._loaded.add(f.id);
            } catch (e) { console.warn("Fonte custom:", f.name, e); }
        }
    }
};
