#!/usr/bin/env bash
# Prepara pasta dist/ limpa para empacotar com Tauri (sem PDF gigante, prints, etc.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
echo "→ Preparando $DIST"

rm -rf "$DIST"
mkdir -p "$DIST"

# Frontend
cp "$ROOT/index.html" "$DIST/"
cp -a "$ROOT/css" "$DIST/css"
cp -a "$ROOT/js" "$DIST/js"

# Assets úteis (seed de artes + ícones + fontes). Sem Pathfinder PDF / capturas.
mkdir -p "$DIST/assets"
for sub in artwork icons fonts templates textures exports; do
  if [[ -d "$ROOT/assets/$sub" ]]; then
    cp -a "$ROOT/assets/$sub" "$DIST/assets/$sub"
  fi
done

# Remove lixo se copiado
find "$DIST" -type f \( -name '*.pdf' -o -name 'Captura*.png' -o -name '.DS_Store' \) -delete 2>/dev/null || true

# README embutido
cat > "$DIST/LEIA-ME.txt" <<'EOF'
Darkstar Forge
====================
Seus dados (cartas, artes enviadas, ícones, símbolos) ficam salvos
no perfil do aplicativo (IndexedDB + armazenamento local).

Use Upload no editor para adicionar artes à biblioteca do programa.
Exportar JSON / pack para backup e envio a amigos.
EOF

echo "→ dist pronto:"
du -sh "$DIST" "$DIST"/* 2>/dev/null | head -20
