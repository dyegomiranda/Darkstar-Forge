# TCG × RPG Studio Progress (Darkstar Forge)

**Last updated:** 2026-07-25 (A+B robustness package)  
**Project folder:** `/home/djabo/Downloads/Darkstar Forge`  
**How to open:** `./Darkstar\ Forge` (double-click → "Run in Terminal") — or find **Darkstar Forge** in the app grid (Super+Search). Terminal fallback: `python3 tools/serve.py 8765` + open browser.  

---

## How to resume work

1. Read this `progress.md`.
2. Check **Done** and **Deferred** sections.
3. Code + this file = project state (does not depend on chat conversation).
4. After seed changes: **Reset seed** in the app if localStorage is outdated.
5. Shortcuts: **Ctrl+S** saves · **Ctrl+Shift+B** restores slim backup.

---

## Persistence (important)

| What | Where | Limit |
|------|-------|-------|
| Project metadata (cards without base64) | `localStorage` `tcg-studio-v1` | ~5–10 MB typical |
| **Card artwork, custom icons, templates, fonts** | **IndexedDB** `tcg-studio-media-v1` | **Hundreds of MB** (browser limit) |
| Slim backup | `tcg-studio-v1-bak1` | 1 copy |
| Language / panel widths | `tcg-lang`, `tcg-*-panel-w` | small |

- **Yes, it persists across days** in the same browser/profile.
- Art **no longer** fills up localStorage: `idb:art:…` refs in JSON; bytes in IndexedDB.
- **Export JSON** hydrates artwork back into the file (portable full backup).
- Clearing site data wipes localStorage **and** IndexedDB.

---

## Done (summary)

### Core / storage
- [x] **MediaStore (IndexedDB)** — `js/core/mediaStore.js`
- [x] `Store.saveAsync` / `loadAsync` — slim in LS + media in IDB
- [x] Compressed artwork upload (max ~1100px, JPEG 0.78)
- [x] Export/import JSON with artwork embedded on export

### Cards / UI
- [x] Editor, library, character sheet, print, presets, tags, 3-button dirty modal
- [x] Balanced mana curve + seed 50×9 with rich names/rules
- [x] Auto-height rule box (grows upward) + flavor text
- [x] Library thumbnails = full card render
- [x] Combo type (always full list)
- [x] **Type bar** above rules + depth shadow
- [x] Deck filters + CSV/TSV table export
- [x] Class icons (Imagine) in `assets/icons/classes/*.jpg`
- [x] Resource icons (Imagine → transparent PNG) in `assets/icons/resources/*.png`
- [x] Resources: orange; equipment: color by class affinity
- [x] Common rarity fixed (light diamond + outline, no broken img)
- [x] Defaults: resource 40px · ATK/DEF num 34 · combat icon 40 · class 56
- [x] Character sheet: race in white, HP aligned, print clean level/HP/stats

### Launcher
- [x] `Darkstar Forge` (bash script) + `Darkstar Forge.desktop` (app grid shortcut with icon)

---

## Deferred / next

1. Combat engine / simulation (XP, gold, in-game keywords)
2. Batch PDF export with progress
3. 100% offline embedded fonts
4. Multi-character on sheet
5. Art pipeline by name (Imagine per card)
6. Undo/redo · full editor i18n · automated tests
7. Convert **class** icons JPG → transparent PNG (like resources)
8. "Used space" UI (IndexedDB quota)

---

## Key files

| File | Role |
|------|------|
| `js/core/mediaStore.js` | IndexedDB artwork |
| `js/core/store.js` | loadAsync/saveAsync slim |
| `js/render/icons.js` | Class + resource + rarity |
| `js/ui/editor.js` | Editor / artwork upload |
| `js/ui/library.js` | Filters / table export |
| `js/ui/characterSheet.js` | Character sheet |
| `js/data/seed.js` + `seedDecks.js` | Seed |
| `assets/icons/classes/*` | Class icons |
| `assets/icons/resources/*.png` | Transparent resource icons |
| `progress.md` | This file |

---

## Session 2026-07-18 (this batch)

- [x] Full storage → IndexedDB for artwork (no practical LS limit)
- [x] Common rarity bug (black rectangle) → readable SVG diamond
- [x] Resources without black "circle": transparent PNG + object-fit contain
- [x] Update this `.md`

**For the user now:** reload with **Ctrl+Shift+R**. If storage is still dirty, **Export JSON** first, then clear site data and **Import JSON**, or **Reset seed** and re-add artwork (now in IDB).

---

## Robustness package A+B (2026-07-25)

### A — short term
- [x] Light thumbnails by default + **Full Preview** checkbox
- [x] Orphan media GC + delete clears IDB; duplicate rewrites art
- [x] Async save with **Saving…/Saved** indicator + await on critical flows
- [x] `assets/artwork` library in editor (`manifest.json` + apply to card)
- [x] **Diagnostics** (LS, IDB, cards without art, decks ≠50, revisions, GC, restore revision)

### B — medium term
- [x] `EffectCatalog` + structured effect UI in editor
- [x] `classAffinity` in equipment (preferred over regex)
- [x] Slim revision history in IndexedDB (up to 8)
- [x] **Export pack** ZIP (project.json + artwork) via ZipUtil store-only
- [x] Optional offline fonts: `assets/fonts/local-fonts.css` + README

---

## Folder cleanup (2026-07-25)

### Removed (junk)
- `Ajustes jogo de cartas_files/` (~31 MB)
- `Ajustes-jogo-de-cartas.pdf`
- `_chat_extract.txt`, `Erros para o Grok.txt`
- `_legacy/` (old code)
- `assets/icons/resources/*.jpg` (duplicates; app uses `.png`)
- `assets/icons/ui/tcg-studio.png` (unreferenced)
- `data/scoring-table.json` (unused; scoring in `js/data/scoringTable.js`)

### Kept / reorganized
- **App icon:** `assets/icons/set/logotcg.png` (moved from root; desktop shortcut)
- **Card set logo:** `assets/icons/set/logo.png`
- **User artwork:** `assets/artwork/`
- Reference: `Pathfinder 2e … PT-BR.pdf`, `About the game.txt`, `tools/`, `docs/`
