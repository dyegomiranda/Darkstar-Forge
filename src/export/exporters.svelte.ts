/**
 * Exportações: PNG (1500×2100 ≈ 600 dpi), ZIP de PNGs, PDF para impressão
 * (uma carta por página 63×88 mm ou folha A4 3×3 com marcas de corte),
 * backup completo (ZIP com projeto + cartas + imagens) e planilha CSV.
 */
import { strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { PDFDocument, rgb } from 'pdf-lib';
import { L } from '../app/i18n.svelte';
import { ui } from '../app/ui.svelte';
import { COLORS, RARITIES } from '../model/catalog';
import { PROJECT_VERSION, type Card, type Project } from '../model/types';
import { cardInput } from '../render/card';
import { compose } from '../render/compose';
import { rasterize } from '../render/raster';
import { getMedia, listMedia, putMedia } from '../store/db';
import { app } from '../store/project.svelte';
import { ctxFor, ensureCardMedia } from '../ui/common/cardCtx';

const MM = 72 / 25.4;
const CARD_MM = { w: 63, h: 88 };

export function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'carta';

export async function cardBlob(card: Card, width = 1500, type = 'image/png', quality = 0.92): Promise<Blob> {
  await ensureCardMedia(card);
  const ctx = ctxFor(card);
  if (!ctx) throw new Error('Deck não encontrado');
  return rasterize(compose(cardInput(card, ctx)), width, type, quality);
}

/** Executa uma tarefa por carta mostrando progresso (cancelável). */
async function withProgress<T>(label: string, cards: Card[], fn: (c: Card) => Promise<T>): Promise<T[] | null> {
  let cancelled = false;
  const out: T[] = [];
  ui.progress = { label, done: 0, total: cards.length, cancel: () => { cancelled = true; } };
  try {
    for (const c of cards) {
      if (cancelled) return null;
      out.push(await fn(c));
      ui.progress = { ...ui.progress!, done: out.length };
    }
    return out;
  } finally {
    ui.progress = null;
  }
}

export async function exportPng(card: Card): Promise<void> {
  try {
    download(await cardBlob(card), `${String(card.n).padStart(3, '0')}-${slug(card.text[app.lang].name)}.png`);
    ui.toast(L('Imagem exportada', 'Image exported'));
  } catch (e) {
    ui.toast(L('Não foi possível exportar a imagem', 'Could not export the image'), 'error');
    console.error(e);
  }
}

export async function exportPngZip(cards: Card[]): Promise<void> {
  if (!cards.length) return;
  const files: Zippable = {};
  const done = await withProgress(L('Gerando imagens…', 'Rendering images…'), cards, async (c) => {
    const b = await cardBlob(c);
    files[`${String(c.n).padStart(3, '0')}-${slug(c.text[app.lang].name)}.png`] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }];
  });
  if (!done) return;
  download(new Blob([zipSync(files)], { type: 'application/zip' }), `darkstar-cartas-${cards.length}.zip`);
  ui.toast(L(`${cards.length} imagens exportadas`, `${cards.length} images exported`));
}

export async function exportPdf(cards: Card[]): Promise<void> {
  if (!cards.length) return;
  const mode = await ui.confirm({
    title: L('PDF para impressão', 'Print PDF'),
    text: L(`${cards.length} cartas no tamanho real (63 × 88 mm).\nFolha A4: 9 cartas por página, com marcas de corte.\nUma por página: para gráficas que pedem arquivo por carta.`,
      `${cards.length} cards at real size (63 × 88 mm).\nA4 sheet: 9 cards per page with crop marks.\nOne per page: for print shops that want one card per page.`),
    ok: L('Folha A4 (3 × 3)', 'A4 sheet (3 × 3)'), third: L('Uma por página', 'One per page'),
  });
  if (mode === 'cancel') return;
  const images = await withProgress(L('Preparando o PDF…', 'Preparing PDF…'), cards, async (c) => new Uint8Array(await (await cardBlob(c, 1500, 'image/jpeg', 0.93)).arrayBuffer()));
  if (!images) return;
  const pdf = await PDFDocument.create();
  const cw = CARD_MM.w * MM, ch = CARD_MM.h * MM;
  if (mode === 'third') {
    for (const bytes of images) {
      const img = await pdf.embedJpg(bytes);
      pdf.addPage([cw, ch]).drawImage(img, { x: 0, y: 0, width: cw, height: ch });
    }
  } else {
    const A4 = { w: 210 * MM, h: 297 * MM };
    const gap = 2 * MM;
    const ox = (A4.w - (3 * cw + 2 * gap)) / 2, oy = (A4.h - (3 * ch + 2 * gap)) / 2;
    for (let i = 0; i < images.length; i += 9) {
      const page = pdf.addPage([A4.w, A4.h]);
      for (let k = 0; k < 9 && i + k < images.length; k++) {
        const img = await pdf.embedJpg(images[i + k]);
        const col = k % 3, row = Math.floor(k / 3);
        const x = ox + col * (cw + gap), y = A4.h - oy - (row + 1) * ch - row * gap;
        page.drawImage(img, { x, y, width: cw, height: ch });
      }
      // marcas de corte: prolongam as bordas de cada carta para fora da grade
      const mark = (x1: number, y1: number, x2: number, y2: number) =>
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.4, color: rgb(0.35, 0.35, 0.35) });
      const len = 5 * MM, off = 1.5 * MM;
      const top = A4.h - oy, bottom = oy;
      for (let col = 0; col < 3; col++) {
        for (const x of [ox + col * (cw + gap), ox + col * (cw + gap) + cw]) {
          mark(x, top + off, x, top + off + len);
          mark(x, bottom - off, x, bottom - off - len);
        }
      }
      for (let row = 0; row < 3; row++) {
        for (const y of [top - row * (ch + gap), top - row * (ch + gap) - ch]) {
          mark(ox - off, y, ox - off - len, y);
          mark(A4.w - ox + off, y, A4.w - ox + off + len, y);
        }
      }
    }
  }
  download(new Blob([(await pdf.save()) as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), `darkstar-${cards.length}-cartas.pdf`);
  ui.toast(L('PDF pronto', 'PDF ready'));
}

// ───────────── backup ─────────────

export async function exportBackup(): Promise<void> {
  if (!app.project) return;
  await app.flush();
  const files: Zippable = {
    'project.json': strToU8(JSON.stringify($state.snapshot(app.project), null, 1)),
    'cards.json': strToU8(JSON.stringify(Object.values($state.snapshot(app.cards)), null, 1)),
  };
  for (const m of await listMedia()) {
    files[`media/${m.id}`] = [new Uint8Array(await m.blob.arrayBuffer()), { level: 0 }];
    files[`media/${m.id}.json`] = strToU8(JSON.stringify({ name: m.name, type: m.type }));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  download(new Blob([zipSync(files)], { type: 'application/zip' }), `darkstar-backup-${stamp}.zip`);
  ui.toast(L('Backup salvo', 'Backup saved'));
}

export async function importBackup(file: File): Promise<void> {
  const r = await ui.confirm({
    title: L('Restaurar backup?', 'Restore backup?'),
    text: L('O projeto atual será substituído pelo do arquivo.', 'The current project will be replaced by the one in the file.'),
    ok: L('Restaurar', 'Restore'), danger: true,
  });
  if (r !== 'ok') return;
  try {
    const z = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const dec = new TextDecoder();
    const project = JSON.parse(dec.decode(z['project.json'])) as Project;
    const cards = JSON.parse(dec.decode(z['cards.json'])) as Card[];
    if (!project || !Array.isArray(cards) || (project.version ?? 0) > PROJECT_VERSION) throw new Error(L('Arquivo de backup inválido ou de versão mais nova.', 'Invalid or newer backup file.'));
    await app.replaceAll(project, cards);
    for (const [path, bytes] of Object.entries(z)) {
      const m = path.match(/^media\/([0-9a-f]+)$/);
      if (!m) continue;
      const meta = z[`${path}.json`] ? JSON.parse(dec.decode(z[`${path}.json`])) : { name: '', type: 'image/png' };
      await putMedia(new Blob([bytes], { type: meta.type }), meta.name);
    }
    ui.toast(L('Backup restaurado', 'Backup restored'));
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : String(e), 'error', 6000);
  }
}

export async function exportCsv(cards: Card[]): Promise<void> {
  const lang = app.lang;
  const head = ['#', L('Deck', 'Deck'), L('Nome', 'Name'), L('Tipo', 'Type'), L('Subtipo', 'Subtype'), L('Custo', 'Cost'), L('Recurso', 'Resource'), 'ATK', 'DEF', L('Raridade', 'Rarity'), L('Regras', 'Rules'), L('Ambientação', 'Flavor')];
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = cards.map((c) => {
    const t = c.text[lang];
    const d = app.deck(c.deckId);
    return [c.n, d ? COLORS[d.colors[0]].classes[lang] : '', t.name, t.type, t.subtype, c.cost?.amount ?? '', c.cost?.resource ?? '', c.stats?.atk ?? '', c.stats?.def ?? '', RARITIES[c.rarity].name[lang], t.rules, t.flavor].map(q).join(';');
  });
  download(new Blob(['﻿' + [head.map(q).join(';'), ...rows].join('\r\n')], { type: 'text/csv' }), 'darkstar-cartas.csv');
}

export async function mediaBlob(id: string): Promise<Blob | undefined> {
  return (await getMedia(id))?.blob;
}
