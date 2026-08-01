/* ==========================================================
   MediaStore — IndexedDB para artes e imagens grandes
   + GC de órfãos + histórico de revisões slim
========================================================== */

var MediaStore = {
    DB_NAME: "tcg-studio-media-v1",
    STORE: "blobs",
    REV_STORE: "revisions",
    /** Biblioteca de artes do usuário (upload) — não é apagada pelo GC */
    ART_LIB: "artwork_lib",
    MAX_REVISIONS: 8,
    _db: null,

    isRef(v) {
        return typeof v === "string" && v.startsWith("idb:");
    },

    refKey(v) {
        return this.isRef(v) ? v.slice(4) : null;
    },

    makeRef(key) {
        return "idb:" + key;
    },

    isDataUrl(v) {
        return typeof v === "string" && v.startsWith("data:");
    },

    isHeavy(v) {
        return this.isDataUrl(v) && v.length > 800;
    },

    open() {
        if (this._db) return Promise.resolve(this._db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, 3);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(this.STORE)) {
                    db.createObjectStore(this.STORE);
                }
                if (!db.objectStoreNames.contains(this.REV_STORE)) {
                    db.createObjectStore(this.REV_STORE, { keyPath: "id", autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.ART_LIB)) {
                    db.createObjectStore(this.ART_LIB, { keyPath: "id" });
                }
            };
            req.onsuccess = () => {
                this._db = req.result;
                resolve(this._db);
            };
            req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
        });
    },

    async put(key, dataUrl) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, "readwrite");
            tx.objectStore(this.STORE).put(dataUrl, key);
            tx.oncomplete = () => resolve(this.makeRef(key));
            tx.onerror = () => reject(tx.error);
        });
    },

    async get(key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, "readonly");
            const req = tx.objectStore(this.STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    },

    async del(key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, "readwrite");
            tx.objectStore(this.STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async keys() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, "readonly");
            const req = tx.objectStore(this.STORE).getAllKeys();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    },

    async count() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, "readonly");
            const req = tx.objectStore(this.STORE).count();
            req.onsuccess = () => resolve(req.result || 0);
            req.onerror = () => reject(req.error);
        });
    },

    /** Coleta todas as keys idb referenciadas pelo projeto (slim ou hidratado) */
    collectRefs(project) {
        const keys = new Set();
        const take = (v) => {
            if (this.isRef(v)) keys.add(this.refKey(v));
        };
        Object.values(project?.cards || {}).forEach((card) => {
            if (!card) return;
            take(card.art?.src);
            take(card.artData);
        });
        const icons = project?.meta?.icons;
        if (icons) {
            take(icons.set);
            Object.values(icons.resources || {}).forEach(take);
            Object.values(icons.classes || {}).forEach(take);
            Object.values(icons.rarities || {}).forEach(take);
            Object.values(icons.combat || {}).forEach(take);
        }
        take(project?.meta?.setSymbolDataUrl);
        (project?.meta?.customTemplates || []).forEach((t) => take(t?.overlayDataUrl));
        (project?.meta?.customFonts || []).forEach((f) => take(f?.dataUrl));
        return keys;
    },

    async deleteCardMedia(cardId) {
        if (!cardId) return;
        await this.del("art:" + cardId);
        await this.del("artData:" + cardId);
    },

    /**
     * Remove blobs no IDB que não são referenciados pelo projeto.
     * @returns {{ removed: number, kept: number }}
     */
    async gc(project) {
        const used = this.collectRefs(project);
        // também marca keys art:cardId se a carta existe e tem dataURL em memória
        Object.values(project?.cards || {}).forEach((c) => {
            if (!c?.id) return;
            if (c.art?.src || c.artData) {
                used.add("art:" + c.id);
                used.add("artData:" + c.id);
            }
        });
        const all = await this.keys();
        let removed = 0;
        for (const k of all) {
            if (!used.has(k)) {
                await this.del(k);
                removed++;
            }
        }
        return { removed, kept: all.length - removed };
    },

    async estimateBlobBytes() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, "readonly");
            const req = tx.objectStore(this.STORE).getAll();
            req.onsuccess = () => {
                const vals = req.result || [];
                let bytes = 0;
                vals.forEach((v) => {
                    if (typeof v === "string") bytes += v.length;
                    else if (v instanceof ArrayBuffer) bytes += v.byteLength;
                    else if (v && v.byteLength) bytes += v.byteLength;
                });
                // dataURL base64 ≈ 4/3 bytes reais; reportamos chars como proxy
                resolve({ count: vals.length, approxChars: bytes, approxMB: bytes / (1024 * 1024) });
            };
            req.onerror = () => reject(req.error);
        });
    },

    _sizeofValue(v) {
        if (v == null) return 0;
        if (typeof v === "string") return v.length;
        if (v instanceof ArrayBuffer) return v.byteLength;
        if (v && typeof v.byteLength === "number") return v.byteLength;
        if (v && typeof v === "object") {
            try { return JSON.stringify(v).length; } catch (_) { return 0; }
        }
        return 0;
    },

    async _storeStats(storeName) {
        const db = await this.open();
        if (!db.objectStoreNames.contains(storeName)) {
            return { count: 0, approxChars: 0, approxMB: 0 };
        }
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readonly");
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => {
                const vals = req.result || [];
                let bytes = 0;
                vals.forEach((v) => { bytes += this._sizeofValue(v); });
                resolve({
                    count: vals.length,
                    approxChars: bytes,
                    approxMB: bytes / (1024 * 1024)
                });
            };
            req.onerror = () => reject(req.error);
        });
    },

    /**
     * Uso detalhado de armazenamento (IDB + localStorage + quota do browser).
     */
    async estimateUsage() {
        const [blobs, library, revisions] = await Promise.all([
            this._storeStats(this.STORE),
            this._storeStats(this.ART_LIB),
            this._storeStats(this.REV_STORE)
        ]);

        let lsBytes = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                const v = localStorage.getItem(k) || "";
                lsBytes += (k ? k.length : 0) + v.length;
            }
        } catch (_) {}

        let quota = null;
        try {
            if (navigator.storage?.estimate) {
                const est = await navigator.storage.estimate();
                quota = {
                    usage: est.usage || 0,
                    quota: est.quota || 0,
                    usageMB: (est.usage || 0) / (1024 * 1024),
                    quotaMB: (est.quota || 0) / (1024 * 1024),
                    pct: est.quota ? ((est.usage || 0) / est.quota) * 100 : null
                };
            }
        } catch (_) {}

        const idbChars = blobs.approxChars + library.approxChars + revisions.approxChars;
        // dataURL base64 ≈ 4/3 overhead; chars≈bytes proxy; estimate binary ≈ *0.75
        const idbEstBytes = idbChars * 0.75;
        const totalEstBytes = idbEstBytes + lsBytes * 2; // utf-16-ish for LS

        return {
            blobs,
            library,
            revisions,
            localStorage: {
                approxChars: lsBytes,
                approxKB: lsBytes / 1024
            },
            quota,
            totalApproxMB: totalEstBytes / (1024 * 1024),
            idbApproxMB: idbEstBytes / (1024 * 1024)
        };
    },

    async resolve(value) {
        if (!value) return value;
        if (this.isRef(value)) {
            const data = await this.get(this.refKey(value));
            return data || value;
        }
        return value;
    },

    async projectToSlim(project) {
        const slim = JSON.parse(JSON.stringify(project));
        const tasks = [];

        const park = (obj, prop, key) => {
            if (!obj) return;
            const v = obj[prop];
            if (!this.isHeavy(v)) return;
            tasks.push(
                this.put(key, v).then((ref) => {
                    obj[prop] = ref;
                })
            );
        };

        Object.values(slim.cards || {}).forEach((card) => {
            if (!card) return;
            if (card.art) park(card.art, "src", "art:" + card.id);
            if (this.isHeavy(card.artData)) {
                tasks.push(
                    this.put("artData:" + card.id, card.artData).then((ref) => {
                        card.artData = ref;
                        if (!card.art) card.art = {};
                        if (!card.art.src || this.isRef(card.art.src)) card.art.src = ref;
                    })
                );
            }
        });

        const icons = slim.meta?.icons;
        if (icons) {
            if (this.isHeavy(icons.set)) park(icons, "set", "icon:set");
            if (icons.resources) {
                Object.keys(icons.resources).forEach((k) => park(icons.resources, k, "icon:res:" + k));
            }
            if (icons.classes) {
                Object.keys(icons.classes).forEach((k) => park(icons.classes, k, "icon:cls:" + k));
            }
            if (icons.rarities) {
                Object.keys(icons.rarities).forEach((k) => park(icons.rarities, k, "icon:rar:" + k));
            }
            if (icons.combat) {
                Object.keys(icons.combat).forEach((k) => park(icons.combat, k, "icon:cbt:" + k));
            }
        }
        if (slim.meta && this.isHeavy(slim.meta.setSymbolDataUrl)) {
            park(slim.meta, "setSymbolDataUrl", "icon:setSymbol");
        }
        (slim.meta?.customTemplates || []).forEach((t) => {
            if (t) park(t, "overlayDataUrl", "tpl:" + t.id);
        });
        (slim.meta?.customFonts || []).forEach((f) => {
            if (f) park(f, "dataUrl", "font:" + f.id);
        });

        await Promise.all(tasks);
        return slim;
    },

    async hydrateProject(project) {
        if (!project) return project;
        const tasks = [];

        const fill = (obj, prop) => {
            if (!obj) return;
            const v = obj[prop];
            if (!this.isRef(v)) return;
            tasks.push(
                this.get(this.refKey(v)).then((data) => {
                    if (data) obj[prop] = data;
                })
            );
        };

        Object.values(project.cards || {}).forEach((card) => {
            if (!card) return;
            if (!card.art) card.art = {};
            fill(card.art, "src");
            if (this.isRef(card.artData)) {
                tasks.push(
                    this.get(this.refKey(card.artData)).then((data) => {
                        if (data) {
                            card.artData = data;
                            if (!card.art.src || this.isRef(card.art.src)) card.art.src = data;
                        }
                    })
                );
            } else if (this.isDataUrl(card.artData) && !card.art.src) {
                card.art.src = card.artData;
            }
        });

        const icons = project.meta?.icons;
        if (icons) {
            fill(icons, "set");
            if (icons.resources) Object.keys(icons.resources).forEach((k) => fill(icons.resources, k));
            if (icons.classes) Object.keys(icons.classes).forEach((k) => fill(icons.classes, k));
            if (icons.rarities) Object.keys(icons.rarities).forEach((k) => fill(icons.rarities, k));
            if (icons.combat) Object.keys(icons.combat).forEach((k) => fill(icons.combat, k));
        }
        if (project.meta) fill(project.meta, "setSymbolDataUrl");
        (project.meta?.customTemplates || []).forEach((t) => fill(t, "overlayDataUrl"));
        (project.meta?.customFonts || []).forEach((f) => fill(f, "dataUrl"));

        await Promise.all(tasks);
        return project;
    },

    async projectForExport(project) {
        const clone = JSON.parse(JSON.stringify(project));
        return this.hydrateProject(clone);
    },

    /** Guarda revisão slim (sem dataURLs pesados) */
    async pushRevision(slimProject, label) {
        const db = await this.open();
        if (!db.objectStoreNames.contains(this.REV_STORE)) return;
        const entry = {
            at: new Date().toISOString(),
            label: label || "auto",
            cards: Object.keys(slimProject.cards || {}).length,
            json: JSON.stringify(slimProject)
        };
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.REV_STORE, "readwrite");
            const store = tx.objectStore(this.REV_STORE);
            store.add(entry);
            tx.oncomplete = async () => {
                try {
                    await this._trimRevisions();
                    resolve();
                } catch (e) {
                    resolve();
                }
            };
            tx.onerror = () => reject(tx.error);
        });
    },

    async _trimRevisions() {
        const db = await this.open();
        const all = await new Promise((resolve, reject) => {
            const tx = db.transaction(this.REV_STORE, "readonly");
            const req = tx.objectStore(this.REV_STORE).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
        if (all.length <= this.MAX_REVISIONS) return;
        all.sort((a, b) => String(a.at).localeCompare(String(b.at)));
        const drop = all.slice(0, all.length - this.MAX_REVISIONS);
        const tx = db.transaction(this.REV_STORE, "readwrite");
        const store = tx.objectStore(this.REV_STORE);
        drop.forEach((e) => {
            if (e.id != null) store.delete(e.id);
        });
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    },

    async listRevisions() {
        const db = await this.open();
        if (!db.objectStoreNames.contains(this.REV_STORE)) return [];
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.REV_STORE, "readonly");
            const req = tx.objectStore(this.REV_STORE).getAll();
            req.onsuccess = () => {
                const list = (req.result || []).sort((a, b) => String(b.at).localeCompare(String(a.at)));
                resolve(list.map((e) => ({
                    id: e.id,
                    at: e.at,
                    label: e.label,
                    cards: e.cards,
                    bytes: (e.json || "").length
                })));
            };
            req.onerror = () => reject(req.error);
        });
    },

    async getRevision(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.REV_STORE, "readonly");
            const req = tx.objectStore(this.REV_STORE).get(id);
            req.onsuccess = () => {
                const e = req.result;
                if (!e?.json) return resolve(null);
                try {
                    resolve(JSON.parse(e.json));
                } catch (err) {
                    reject(err);
                }
            };
            req.onerror = () => reject(req.error);
        });
    },

    /* ---------- Biblioteca de artes do usuário (upload) ---------- */

    _newLibId() {
        if (typeof Id !== "undefined" && Id.uid) return "libart_" + Id.uid();
        return "libart_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    },

    /**
     * Salva arte enviada pelo usuário na biblioteca permanente.
     * @returns {{ id: string, name: string, at: string }}
     */
    async saveLibraryArt(dataUrl, name) {
        if (!dataUrl) throw new Error("dataUrl vazio");
        let db = await this.open();
        if (!db.objectStoreNames.contains(this.ART_LIB)) {
            this._db = null;
            db = await this.open();
        }
        const entry = {
            id: this._newLibId(),
            name: (name || "arte").replace(/\.[a-z0-9]+$/i, "").slice(0, 80) || "arte",
            fileName: name || "upload.jpg",
            dataUrl,
            at: new Date().toISOString()
        };
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.ART_LIB, "readwrite");
            tx.objectStore(this.ART_LIB).put(entry);
            tx.oncomplete = () => resolve({ id: entry.id, name: entry.name, at: entry.at });
            tx.onerror = () => reject(tx.error);
        });
    },

    /** Lista metadados + dataUrl (para thumbs da UI) */
    async listLibraryArt() {
        const db = await this.open();
        if (!db.objectStoreNames.contains(this.ART_LIB)) return [];
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.ART_LIB, "readonly");
            const req = tx.objectStore(this.ART_LIB).getAll();
            req.onsuccess = () => {
                const list = (req.result || []).slice().sort((a, b) =>
                    String(b.at || "").localeCompare(String(a.at || ""))
                );
                resolve(list);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async getLibraryArt(id) {
        if (!id) return null;
        const db = await this.open();
        if (!db.objectStoreNames.contains(this.ART_LIB)) return null;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.ART_LIB, "readonly");
            const req = tx.objectStore(this.ART_LIB).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    },

    async deleteLibraryArt(id) {
        if (!id) return;
        const db = await this.open();
        if (!db.objectStoreNames.contains(this.ART_LIB)) return;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.ART_LIB, "readwrite");
            tx.objectStore(this.ART_LIB).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async countLibraryArt() {
        const db = await this.open();
        if (!db.objectStoreNames.contains(this.ART_LIB)) return 0;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.ART_LIB, "readonly");
            const req = tx.objectStore(this.ART_LIB).count();
            req.onsuccess = () => resolve(req.result || 0);
            req.onerror = () => reject(req.error);
        });
    }
};
