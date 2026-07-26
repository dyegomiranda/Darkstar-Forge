# Darkstar Forge

**Darkstar Forge is free and open-source software licensed under the GNU General Public License v3.0 (GPL-3.0).**

You are free to use, study, modify, and redistribute the software under the terms of the license. Any distributed modified versions of the software must preserve the freedoms granted by the GPL and provide the corresponding source code as required by the license.

The Darkstar TCG intellectual property, including its name, logo, artwork, characters, lore, card designs, and other original creative content, is not covered by the GPL unless explicitly stated otherwise.

---

An offline card creation studio for the **Darkstar** trading card game.
Create cards, decks, upload custom artwork, symbols, and export high-resolution print-ready cards — completely local, with no server dependency.

### Quick Start for Players & Testers (No Terminal Required)

1. Navigate to the [**Releases** page](../../releases) of this repository.
2. Download the installer for your platform:
   - **Windows** → `Darkstar.Forge_*_x64-setup.exe` (double-click to install)
   - **Linux** → `*.AppImage` or `*.deb`
3. Launch **Darkstar Forge**.

*Uploaded artwork, custom icons, and symbols are stored locally in the application profile and persist across sessions.*

---

### Local Development (Web)

```bash
./ABRIR-DARKSTAR-FORGE
# or
python3 tools/serve.py 8765
```

Open `http://127.0.0.1:8765/` in your web browser.

---

### Desktop Build (Tauri)

```bash
npm install
npm run icon           # Generates app icons from assets/icons/set/logo.png
npm run tauri:build
```

---

### Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript (Offline SPA)
- IndexedDB + localStorage (Project metadata & local media storage)
- Tauri v2 (Cross-platform native desktop wrappers for Windows & Linux)

