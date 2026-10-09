#!/usr/bin/env bash
# Gera o modelo 3D de cada imagem de peça (build/pecas/<Nome>-<semente>.png) e converte para .npz.
# Uso: bash gerar_3d.sh "Peitoral:1 Elmo:1 ..."     (o ComfyUI do Flux, porta 8188, precisa estar DESLIGADO: 12 GB de VRAM)
set -euo pipefail
HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"; R="$HERE/../viability3d-20261007"; OUT="$HERE/build/pecas"
if curl -s http://127.0.0.1:8188/system_stats >/dev/null 2>&1; then echo "Desligue antes o ComfyUI da porta 8188."; exit 1; fi
if ! curl -s http://127.0.0.1:8189/system_stats >/dev/null 2>&1; then
  (cd "$R/runtime/ComfyUI" && OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 nohup ../venv/bin/python main.py --listen 127.0.0.1 --port 8189 --disable-auto-launch --disable-all-custom-nodes --offline --disable-dynamic-vram --lowvram --reserve-vram 3 --cache-none --preview-method none --output-directory "$R/outputs" --input-directory "$R/inputs" >/tmp/voidsun-pixal3d.log 2>&1 &)
  for _ in $(seq 1 40); do curl -s http://127.0.0.1:8189/system_stats >/dev/null 2>&1 && break; sleep 2; done
fi
for item in $1; do
  n="${item%%:*}"; s="${item##*:}"
  python3 "$HERE/pixal3d.py" "$OUT/$n-$s.png" "peca-$n" || { echo "FALHOU $n"; continue; }
  (cd /tmp && OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 "${BLENDER:-$HOME/.local/bin/blender}" -b --threads 2 --python "$HERE/glb_to_npz.py" -- "$R/outputs/peca-$n/colored-raw_00001_.glb" "$OUT/$n.npz" 2>&1 | grep -E "NPZ_OK|Error" || true)
  cp "$OUT/$n-$s.png" "$OUT/$n.png"
done
