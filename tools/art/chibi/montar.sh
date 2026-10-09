#!/usr/bin/env bash
# Monta a personagem a partir das peças geradas SOZINHAS (build/pecas/<Nome>.npz + .png):
# corpo-base → encaixe de cada peça → máscaras entre peças → animações → GLB do jogo.
# Uso: bash montar.sh ["Cabeca Cabelo ..."] [--sem-exportar]
set -euo pipefail
HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"; B="$HERE/build"; ROOT="$(cd "$HERE/../../.." && pwd)"
BL="${BLENDER:-$HOME/.local/bin/blender}"; OUT="$B/brunhild/pecas.blend"
LIST="${1:-Cabeca Cabelo Tunica Calca Luvas Botas Elmo Peitoral Manoplas Grevas}"
SRC="${BASE:-$B/base_f.blend}"      # BASE=<arquivo> continua de um personagem já montado (para refazer só uma peça)
for n in $LIST; do
  [[ -f "$B/pecas/$n.npz" ]] || { echo "FALTA $n"; continue; }
  GEO="$B/pecas/$n.npz"; EXTRA=()
  # se existir <Peça>-solido.npz (solidify.py), a forma vem dele (casca única e limpa) e a cor do modelo bruto
  if [[ -f "$B/pecas/$n-solido.npz" ]]; then GEO="$B/pecas/$n-solido.npz"; EXTRA=(--limpo "--cores=$B/pecas/$n.npz"); fi
  (cd /tmp && "$BL" -b "$SRC" --python "$HERE/fit_outfit.py" -- "$GEO" "$B/pecas/$n.png" "$OUT" --perfil=peca --nome="$n" "${EXTRA[@]}" 2>&1 | grep -E "^AJUSTE|^CHAO|^CASCA|^PELE|^PROJECAO|^PRONTA|^VAZIA|Error|Traceback|line [0-9]+" | cut -c1-200) || true
  SRC="$OUT"
done
(cd /tmp && "$BL" -b "$OUT" --python "$HERE/mascaras.py" -- "$OUT" 2>&1 | grep -E "^MASCARA|Error|Traceback|line [0-9]+" | cut -c1-160) || true
[[ "${2:-}" == "--sem-exportar" ]] && exit 0
ANIM="$B/brunhild/pecas_anim.blend"
(cd /tmp && "$BL" -b "$OUT" --python "$HERE/retarget_ual.py" -- "$HERE/../viability3d-20261007/source/animation/Animation Library[Standard]/Godot/AnimationLibrary_Godot_Standard.glb" "$ANIM" 2>&1 | grep -E "ANIM_OK|Error|Traceback|line [0-9]+" | cut -c1-160)
(cd /tmp && "$BL" -b "$ANIM" --python "$HERE/export_glb.py" -- "$ROOT/public/art/chibi/brunhild.glb" "$ROOT/public/art/chibi/brunhild.json" 2>&1 | grep -E "REGIOES|VELOCIDADES|EXPORT_OK|Error|Traceback|line [0-9]+" | cut -c1-260)
