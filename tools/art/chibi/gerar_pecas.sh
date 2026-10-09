#!/usr/bin/env bash
# Gera a imagem de cada peça SOZINHA sobre o manequim azul (FLUX.1 Kontext; ComfyUI ligado em 127.0.0.1:8188).
# Uso: bash gerar_pecas.sh "Peitoral Elmo ..." [sementes=1]
set -euo pipefail
HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"; OUT="$HERE/build/pecas"; mkdir -p "$OUT"
for n in $1; do
  PROMPT="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d["_comum"].replace("{item}", d[sys.argv[2]]))' "$HERE/pecas.json" "$n")"
  python3 "$HERE/kontext.py" "$OUT/base-azul.png" "$OUT/$n" "$PROMPT" "${2:-1}" 3.0
done
