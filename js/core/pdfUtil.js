/* ==========================================================
   PdfUtil — PDF mínimo com páginas JPEG (sem dependências)
========================================================== */

var PdfUtil = {
    /**
     * @param {{ jpeg: Uint8Array, width: number, height: number }[]} pages
     *   width/height em pixels da imagem (proporção da página)
     * @param {{ pageWmm?: number, pageHmm?: number, filename?: string }} [opts]
     * @returns {Blob}
     */
    build(pages, opts = {}) {
        if (!pages || !pages.length) throw new Error("PDF sem páginas");

        const pageWmm = opts.pageWmm ?? 63;
        const pageHmm = opts.pageHmm ?? 88.9;
        // 1 mm = 72/25.4 pt
        const pageW = (pageWmm * 72) / 25.4;
        const pageH = (pageHmm * 72) / 25.4;

        const objects = [];
        const add = (body) => {
            objects.push(body);
            return objects.length; // 1-based object number
        };

        // Placeholder slots — filled after we know kids
        const catalogNum = add(null);
        const pagesNum = add(null);

        const pageObjNums = [];
        const contentObjNums = [];
        const imageObjNums = [];

        pages.forEach((page, i) => {
            const imgNum = add(null);
            imageObjNums.push(imgNum);
            const contentNum = add(null);
            contentObjNums.push(contentNum);
            const pageNum = add(null);
            pageObjNums.push(pageNum);

            const iw = page.width || 1;
            const ih = page.height || 1;
            // Content: draw image filling the page box
            const stream =
                `q\n${pageW.toFixed(4)} 0 0 ${pageH.toFixed(4)} 0 0 cm\n/Im${i} Do\nQ\n`;
            const streamBytes = this._utf8(stream);

            objects[contentNum - 1] =
                `<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream`;

            const jpeg = page.jpeg;
            objects[imgNum - 1] =
                `<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} ` +
                `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
                `/Length ${jpeg.length} >>\nstream\n`;
            // binary appended at serialize time via marker
            objects[imgNum - 1] = {
                header:
                    `<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} ` +
                    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
                    `/Length ${jpeg.length} >>\nstream\n`,
                binary: jpeg,
                footer: "\nendstream"
            };

            objects[pageNum - 1] =
                `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${pageW.toFixed(4)} ${pageH.toFixed(4)}] ` +
                `/Contents ${contentNum} 0 R /Resources << /XObject << /Im${i} ${imgNum} 0 R >> >> >>`;
        });

        const kids = pageObjNums.map((n) => `${n} 0 R`).join(" ");
        objects[pagesNum - 1] =
            `<< /Type /Pages /Kids [ ${kids} ] /Count ${pageObjNums.length} >>`;
        objects[catalogNum - 1] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`;

        return this._serialize(objects);
    },

    download(blob, filename) {
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename || "cards.pdf";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    },

    _utf8(str) {
        return new TextEncoder().encode(str);
    },

    _serialize(objects) {
        const parts = [];
        const offsets = [0];
        let pos = 0;

        const pushStr = (s) => {
            const b = typeof s === "string" ? this._utf8(s) : s;
            parts.push(b);
            pos += b.length;
        };

        pushStr("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

        for (let i = 0; i < objects.length; i++) {
            offsets.push(pos);
            const objNum = i + 1;
            pushStr(`${objNum} 0 obj\n`);
            const body = objects[i];
            if (body && typeof body === "object" && body.binary) {
                pushStr(body.header);
                parts.push(body.binary);
                pos += body.binary.length;
                pushStr(body.footer);
            } else {
                pushStr(String(body) + "\n");
            }
            pushStr("\nendobj\n");
        }

        const xrefPos = pos;
        const count = objects.length + 1;
        let xref = `xref\n0 ${count}\n`;
        xref += "0000000000 65535 f \n";
        for (let i = 1; i < count; i++) {
            xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
        }
        pushStr(xref);
        pushStr(
            `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
        );

        // Flatten Uint8Arrays
        const total = parts.reduce((n, p) => n + p.length, 0);
        const out = new Uint8Array(total);
        let o = 0;
        for (const p of parts) {
            out.set(p, o);
            o += p.length;
        }
        return new Blob([out], { type: "application/pdf" });
    },

    /** Canvas → JPEG Uint8Array (quality 0–1) */
    async canvasToJpeg(canvas, quality = 0.92) {
        const blob = await new Promise((res, rej) => {
            canvas.toBlob(
                (b) => (b ? res(b) : rej(new Error("toBlob JPEG falhou"))),
                "image/jpeg",
                quality
            );
        });
        const buf = await blob.arrayBuffer();
        return new Uint8Array(buf);
    }
};
