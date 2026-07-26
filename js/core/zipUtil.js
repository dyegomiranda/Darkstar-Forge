/* ==========================================================
   ZIP store-only (sem compressão) — export pack offline
========================================================== */

var ZipUtil = {

    /** @param {{name:string, data:Uint8Array|string}[]} files */
    build(files) {
        const enc = new TextEncoder();
        const parts = [];
        const central = [];
        let offset = 0;

        const u16 = (n) => {
            const b = new Uint8Array(2);
            b[0] = n & 255; b[1] = (n >> 8) & 255;
            return b;
        };
        const u32 = (n) => {
            const b = new Uint8Array(4);
            b[0] = n & 255; b[1] = (n >> 8) & 255;
            b[2] = (n >> 16) & 255; b[3] = (n >> 24) & 255;
            return b;
        };
        const concat = (arrs) => {
            const len = arrs.reduce((a, x) => a + x.length, 0);
            const out = new Uint8Array(len);
            let o = 0;
            arrs.forEach((x) => { out.set(x, o); o += x.length; });
            return out;
        };
        const crcTable = this._crcTable();
        const crc32 = (data) => {
            let c = 0xffffffff;
            for (let i = 0; i < data.length; i++) {
                c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
            }
            return (c ^ 0xffffffff) >>> 0;
        };

        files.forEach((f) => {
            const nameBytes = enc.encode(f.name.replace(/\\/g, "/"));
            let data = f.data;
            if (typeof data === "string") data = enc.encode(data);
            if (!(data instanceof Uint8Array)) data = new Uint8Array(data || []);
            const crc = crc32(data);
            const size = data.length;

            const local = concat([
                u32(0x04034b50),
                u16(20), u16(0), u16(0),
                u16(0), u16(0),
                u32(crc), u32(size), u32(size),
                u16(nameBytes.length), u16(0),
                nameBytes,
                data
            ]);
            parts.push(local);

            const cen = concat([
                u32(0x02014b50),
                u16(20), u16(20), u16(0), u16(0),
                u16(0), u16(0),
                u32(crc), u32(size), u32(size),
                u16(nameBytes.length), u16(0), u16(0),
                u16(0), u16(0), u32(0),
                u32(offset),
                nameBytes
            ]);
            central.push(cen);
            offset += local.length;
        });

        const centralBlob = concat(central);
        const end = concat([
            u32(0x06054b50),
            u16(0), u16(0),
            u16(files.length), u16(files.length),
            u32(centralBlob.length),
            u32(offset),
            u16(0)
        ]);
        return concat([...parts, centralBlob, end]);
    },

    _crcTable() {
        if (this.__crc) return this.__crc;
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[n] = c >>> 0;
        }
        this.__crc = table;
        return table;
    },

    async dataUrlToBytes(dataUrl) {
        if (!dataUrl || typeof dataUrl !== "string") return new Uint8Array(0);
        if (!dataUrl.startsWith("data:")) {
            const enc = new TextEncoder();
            return enc.encode(dataUrl);
        }
        const res = await fetch(dataUrl);
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
    },

    download(bytes, filename) {
        const blob = new Blob([bytes], { type: "application/zip" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename || "pack.zip";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
};
