#!/usr/bin/env bash
# Gera o AppImage usando o Node que vem dentro do Electron (não depende do Node do sistema).
# Uso: bash tools/empacotar.sh
set -euo pipefail
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
cd "$DIR"
ENODE="$DIR/node_modules/electron/dist/electron"
SHIM="$(mktemp -d)"
trap 'rm -rf "$SHIM"' EXIT
# "node" para os programas que o empacotador chama
printf '#!/usr/bin/env bash\nELECTRON_RUN_AS_NODE=1 exec "%s" "$@"\n' "$ENODE" > "$SHIM/node"
chmod +x "$SHIM/node"
cat > "$SHIM/eb.cjs" <<JS
process.noAsar = true;
process.argv = [process.execPath, '--linux', 'AppImage', '--publish', 'never'];
require('$DIR/node_modules/electron-builder/cli.js');
JS
ELECTRON_RUN_AS_NODE=1 "$ENODE" node_modules/vite/bin/vite.js build
PATH="$SHIM:$PATH" ELECTRON_NO_ASAR=1 ELECTRON_RUN_AS_NODE=1 "$ENODE" "$SHIM/eb.cjs"
ls -la release/*.AppImage
