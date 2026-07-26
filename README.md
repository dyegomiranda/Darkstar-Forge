# Darkstar Forge

**Darkstar Forge is free and open-source software licensed under the GNU General Public License v3.0 (GPL-3.0).**

You are free to use, study, modify, and redistribute the software under the terms of the license. Any distributed modified versions of the software must preserve the freedoms granted by the GPL and provide the corresponding source code as required by the license.

The Darkstar TCG intellectual property, including its name, logo, artwork, characters, lore, card designs, and other original creative content, is not covered by the GPL unless explicitly stated otherwise.

---

An offline card creation studio for the **Darkstar** trading card game.
Create cards, decks, upload custom artwork, symbols, and export high-resolution print-ready cards — completely local, with no server dependency.

### Quick Start (Desktop)

1. Navigate to the [**Releases** page](../../releases) of this repository.
2. Download the installer for your platform:
   - **Windows** → `Darkstar.Forge_*_x64-setup.exe` (double-click to install)
   - **Linux** → `*.AppImage` or `*.deb`
3. Launch **Darkstar Forge**.

*Uploaded artwork, custom icons, and symbols are stored locally in the application profile and persist across sessions.*

---

### Local Development (Web)

```bash
./Darkstar\ Forge
# or double-click the Darkstar Forge script in the file manager → "Run in Terminal"
# or install the app shortcut:
cp Darkstar\ Forge.desktop ~/.local/share/applications/
# (then find "Darkstar Forge" in the app grid, with icon)
# Dev fallback:
python3 tools/serve.py 8765
```

Open `http://127.0.0.1:8765/` in your web browser.

---

### Desktop Build (Electron)

```bash
npm install
npm run build:linux    # Linux (AppImage + deb)
npm run build:windows  # Windows (NSIS installer)
npm run build:all      # Both platforms
```

---

### Run Electron (development)

```bash
npm run electron
```

---

### Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript (Offline SPA)
- IndexedDB + localStorage (Project metadata & local media storage)
- Electron (Cross-platform native desktop wrapper)
