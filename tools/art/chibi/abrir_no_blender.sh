#!/usr/bin/env bash
# Abre um .blend na JANELA do Blender, visível para o usuário, com a ponte MCP ligada.
# Uso: bash tools/art/chibi/abrir_no_blender.sh [arquivo.blend]
#
# Por que assim: aberta por um processo em segundo plano no GNOME/Wayland, a janela nasce oculta (o gerenciador não
# a mostra nem dá foco). Pelo X11 (XWayland) dá para pedir ao gerenciador que a traga para a frente.
# --online-mode libera o acesso de rede só nesta execução (a ponte MCP do Blender Lab exige; a preferência salva
# "Allow Online Access" não é alterada). Arquivos salvos em modo de fundo não têm interface: carrega-se só os dados.
set -euo pipefail
HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
FILE="${1:-$HERE/build/brunhild/brunhild_anim.blend}"
BLENDER="${BLENDER:-$HOME/.local/bin/blender}"
PY="$(mktemp --suffix=.py)"
printf 'import bpy\nbpy.ops.wm.open_mainfile(filepath=%s, load_ui=False)\n' "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$FILE")" > "$PY"
for p in $(pgrep -x blender || true); do kill "$p"; done
sleep 1
(cd "$HOME" && setsid nohup env WAYLAND_DISPLAY=inexistente XDG_SESSION_TYPE=x11 "$BLENDER" --online-mode --python "$PY" >/tmp/voidsun-blender-janela.log 2>&1 </dev/null &)
for _ in $(seq 1 20); do ss -ltn 2>/dev/null | grep -q ':9876' && break; sleep 1; done
sleep 2
# No monitor principal a janela fica atrás do aplicativo do Claude; por padrão vai, maximizada, para o monitor da esquerda
# (ponto 120,320 da área de trabalho). VOIDSUN_BLENDER_MONITOR=X,Y muda o monitor; "nao" deixa onde abriu.
MON="${VOIDSUN_BLENDER_MONITOR:-120,320}"
if [[ "$MON" == "nao" ]]; then python3 "$HERE/janela_x11.py" --ativar="$(basename "$FILE" .blend)" | tail -1
else python3 "$HERE/janela_x11.py" --ativar="$(basename "$FILE" .blend)" --mover="$MON" | tail -1; fi
