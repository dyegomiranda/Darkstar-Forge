/* ==========================================================
   Darkstar Forge — Export PNG, PDF e impressão (proporção MTG)
========================================================== */

var Export = {

    /** Poker/MTG: 63.5 × 88.9 mm; usamos 63 × 88.9 arredondando impressão */
    PRINT_W_MM: 63,
    PRINT_H_MM: 88.9,
    /** Raio de canto poker ≈ 3.5 mm */
    PRINT_RADIUS_MM: 3.5,
    CARD_W: 750,
    CARD_H: 1050,
    /** Raio em px no canvas 750 (3.5/63.5 * 750 ≈ 41.3) */
    CARD_RADIUS_PX: 42,
    _pdfAbort: false,

    async cardToPNG(card, filename) {
        const canvas = await this._cardToCanvas(card);
        try {
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/png");
            a.download = filename || `${(card.name || "carta").replace(/\s+/g, "_")}.png`;
            a.click();
        } finally {
            /* canvas discarded */
        }
    },

    /**
     * Rasteriza uma carta em canvas off-screen.
     * @returns {Promise<HTMLCanvasElement>}
     */
    async _cardToCanvas(card) {
        const tpl = TemplateRegistry.get(card.templateId) || TemplateRegistry.get("classic-fullart");
        const w = tpl.width || this.CARD_W;
        const h = tpl.height || this.CARD_H;

        const holder = document.createElement("div");
        holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;`;
        document.body.appendChild(holder);
        CardView.render(holder, card, { scale: 1 });
        try {
            // Aguarda fontes/imagens um frame
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            return await this._domToCanvas(holder.querySelector(".card-root"), w, h);
        } finally {
            holder.remove();
        }
    },

    /**
     * Exporta cartas em PDF (1 carta/página, tamanho poker) com barra de progresso.
     * @param {object[]} cards
     * @param {{ filename?: string }} [opts]
     */
    async cardsToPDF(cards, opts = {}) {
        if (!cards || !cards.length) {
            alert(I18n?.lang === "en-US" ? "No cards to export." : "Nenhuma carta para exportar.");
            return;
        }
        if (typeof PdfUtil === "undefined") {
            alert("PdfUtil não carregado.");
            return;
        }

        this._pdfAbort = false;
        const en = I18n?.lang === "en-US";
        const prog = typeof UIModal !== "undefined"
            ? UIModal.progress({
                title: en ? "Exporting PDF" : "Exportando PDF",
                message: en
                    ? `Preparing ${cards.length} cards…`
                    : `Preparando ${cards.length} cartas…`,
                onCancel: () => { this._pdfAbort = true; }
            })
            : null;

        const pages = [];
        try {
            for (let i = 0; i < cards.length; i++) {
                if (this._pdfAbort) {
                    prog?.close();
                    return;
                }
                const card = cards[i];
                const label = card.name || card.id || `#${i + 1}`;
                prog?.update(
                    i,
                    cards.length,
                    en ? `Rendering ${i + 1}/${cards.length}: ${label}` : `Renderizando ${i + 1}/${cards.length}: ${label}`
                );

                const canvas = await this._cardToCanvas(card);
                const jpeg = await PdfUtil.canvasToJpeg(canvas, 0.9);
                pages.push({
                    jpeg,
                    width: canvas.width,
                    height: canvas.height
                });

                // Yield so the progress UI can paint
                await new Promise((r) => setTimeout(r, 0));
            }

            if (this._pdfAbort) {
                prog?.close();
                return;
            }

            prog?.update(
                cards.length,
                cards.length,
                en ? "Building PDF…" : "Montando PDF…"
            );

            const blob = PdfUtil.build(pages, {
                pageWmm: this.PRINT_W_MM,
                pageHmm: this.PRINT_H_MM
            });
            const base = opts.filename
                || (Store.project?.meta?.name || "darkstar").replace(/\s+/g, "_")
                    + `_${cards.length}cartas`;
            PdfUtil.download(blob, base.endsWith(".pdf") ? base : `${base}.pdf`);
            prog?.update(cards.length, cards.length, en ? "Done!" : "Concluído!");
            await new Promise((r) => setTimeout(r, 350));
        } catch (e) {
            console.error(e);
            alert((en ? "PDF export failed: " : "Falha ao exportar PDF: ") + (e.message || e));
        } finally {
            prog?.close();
        }
    },

    printCards(cards) {
        if (!cards.length) {
            alert("Nenhuma carta para imprimir.");
            return;
        }

        // Escala fixa numérica (mm→px @ 96dpi) — mais confiável que calc(mm/px)
        const pxPerMm = 96 / 25.4;
        const targetW = this.PRINT_W_MM * pxPerMm;
        const scale = targetW / this.CARD_W;

        const pages = cards.map((card, i) => {
            const mount = document.createElement("div");
            CardView.render(mount, card, { scale: 1 });
            const root = mount.querySelector(".card-root");
            if (root) {
                root.style.position = "relative";
                root.style.transform = "none";
                root.style.top = "auto";
                root.style.left = "auto";
                root.style.borderRadius = this.CARD_RADIUS_PX + "px";
            }
            return `<div class="print-slot" data-i="${i}">
              <div class="print-scale" style="transform:scale(${scale})">
                ${root ? root.outerHTML : mount.innerHTML}
              </div>
            </div>`;
        }).join("\n");

        const critical = this._criticalCSS();
        const html = `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8"/>
<title>Impressão — ${cards.length} cartas</title>
<base href="${location.href.replace(/[^/]*$/, "")}"/>
<link rel="stylesheet" href="assets/fonts/local-fonts.css"/>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0;
    background: #fff;
    font-family: "EB Garamond", Georgia, serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    display: flex;
    flex-wrap: wrap;
    gap: 2.5mm;
    align-content: flex-start;
    justify-content: flex-start;
  }
  .print-slot {
    width: ${this.PRINT_W_MM}mm;
    height: ${this.PRINT_H_MM}mm;
    overflow: hidden;
    position: relative;
    border-radius: ${this.PRINT_RADIUS_MM}mm;
    page-break-inside: avoid;
    break-inside: avoid;
    background: #0a0807;
  }
  .print-scale {
    width: ${this.CARD_W}px;
    height: ${this.CARD_H}px;
    transform-origin: top left;
  }
  .print-scale .card-root {
    width: ${this.CARD_W}px !important;
    height: ${this.CARD_H}px !important;
    position: relative !important;
    transform: none !important;
    border-radius: ${this.CARD_RADIUS_PX}px !important;
    overflow: hidden;
    background: #0a0807;
  }
  ${critical}
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-slot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>
<div class="sheet">${pages}</div>
<script>
  window.onload = function () {
    setTimeout(function () { window.print(); }, 600);
  };
<\/script>
</body></html>`;

        // Usa iframe em vez de window.open (evita bloqueio de popup no WebKit)
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;border:none;";
        document.body.appendChild(iframe);
        iframe.contentDocument.write(html);
        iframe.contentDocument.close();
        // Dispara impressão após carregar
        setTimeout(() => {
            try { iframe.contentWindow.print(); }
            catch (e) { alert("Não foi possível imprimir: " + (e.message || e)); }
            // Remove o iframe após impressão (ou timeout de 30s)
            setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 30000);
        }, 800);
    },

    async _domToCanvas(el, w, h) {
        const clone = el.cloneNode(true);
        clone.style.transform = "none";
        clone.style.position = "relative";
        const data = new XMLSerializer().serializeToString(clone);
        const style = this._criticalCSS();
        const svg =
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
            `<foreignObject width="100%" height="100%">` +
            `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px">` +
            `<style>${style}</style>${data}</div></foreignObject></svg>`;

        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        const img = new Image();
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = () => rej(new Error("Falha ao rasterizar carta."));
            img.src = url;
        });

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0a0807";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        return canvas;
    },

    _criticalCSS() {
        return `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .card-root {
            position: relative; width: 750px; height: 1050px; overflow: hidden;
            border-radius: 42px; font-family: "EB Garamond", Georgia, "Times New Roman", serif;
            background: #0a0807; box-shadow: none;
          }
          .card-layer { position: absolute; inset: 0; }
          .card-art { background: #0a0807; overflow: hidden; }
          .card-art-img {
            position:absolute; top:50%; left:50%; width:100%; height:100%;
            object-fit:cover; transform-origin:center center;
          }
          .card-art--empty { display:flex;align-items:center;justify-content:center;color:#777;text-align:center; }
          .card-vignette { background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.28) 100%); }
          .card-content { color: #f4ebe0; line-height: 1.25; pointer-events: none; }
          .card-template-overlay { width:100%; height:100%; object-fit:fill; display:block; }
          .cv-cost, .cv-class, .cv-title, .cv-type, .cv-rules, .cv-footer, .cv-set, .cv-stat, .cv-rarity {
            position: absolute;
          }
          .cv-title {
            display:flex;align-items:center;justify-content:center;
            font-family: "EB Garamond", Georgia, serif;
            font-weight: 600; letter-spacing: 0.01em; text-transform: none !important;
            text-align: center; text-shadow: 0 1px 3px #000; line-height: 1.12; padding: 0 6px;
            font-variant: normal;
          }
          .cv-type {
            display:flex;align-items:center; letter-spacing: .02em;
            text-transform: none !important; font-weight: 600; text-shadow: 0 1px 2px #000;
            font-family: "EB Garamond", Georgia, serif;
          }
          .cv-rules { overflow: hidden; line-height: 1.38; text-shadow: 0 1px 2px #000;
            font-family: "EB Garamond", Georgia, serif; }
          .cv-flavor { margin-top: 10px; font-style: italic; opacity: .88; font-size: 0.9em; }
          .cv-footer { opacity: .95; display:flex; gap:6px; align-items:center; font-weight:600; }
          .cv-cost { display:flex; align-items:center; justify-content:center; font-weight:800; overflow:visible; }
          .cv-cost-cluster { display:inline-flex; flex-direction:row; align-items:center; justify-content:center; gap:calc(var(--cost-icon,34px)*0.06); max-width:96%; transform-origin:center center; line-height:0; }
          .cv-flavor { margin-top:8px; font-style:italic; opacity:.9; border-top:1px solid rgba(255,255,255,.12); padding-top:6px; }
          .cv-cost-num { font-weight:800; text-shadow:0 1px 3px #000; font-size:var(--cost-font, calc(var(--cost-icon,34px)*0.82)); line-height:1; height:var(--cost-icon,34px); display:flex; align-items:center; }
          .cv-cost-icon { width:var(--cost-icon,34px); height:var(--cost-icon,34px); display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
          .cv-cost-icon .icon-img, .cv-cost-icon svg, .cv-stat-ico .icon-img, .cv-stat-ico svg { width:100%!important; height:100%!important; object-fit:contain; display:block; }
          .cv-class, .cv-set { display:flex;align-items:center;justify-content:center; }
          .cv-stat { display:flex; align-items:center; justify-content:center; gap: 6px; }
          .cv-stat-num { font-weight: 800; text-shadow: 0 2px 4px #000; }
          .cv-stat-ico { display:flex; align-items:center; justify-content:center; flex-shrink:0; }
          .card-frame-svg { width: 100%; height: 100%; display: block; }
          .icon-img { object-fit: contain; display:block; }
          .inline-mana { display:inline-flex; vertical-align:-0.25em; margin:0 1px; line-height:0; }
        `;
    }
};
