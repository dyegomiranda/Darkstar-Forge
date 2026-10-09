---
name: voidsun-entrega-jogo
description: Como levar uma mudança ao jogo Void Sun e comprovar que funciona no aplicativo real. Use ao integrar assets, mudar a tela de amostra 3D ou gerar uma nova versão.
---
# Entrega no jogo

- Node é o do Electron: `ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron <script>` (tsc: `node_modules/typescript/bin/tsc -p .`; testes: `node_modules/vitest/vitest.mjs run`).
- Tela de teste 3D: `src/ui/sample3d/` (menu → Amostra visual 3D → Modelos e equipamentos).
- Subir a versão em `package.json` e `package-lock.json`; empacotar com `bash tools/empacotar.sh`.
- Conferir pelo lançador do atalho: `VOIDSUN_QA_PACKED=1 ... tools/arena3d/qa-chibi.cjs` (perfil isolado; o processo do jogo não pode herdar `ELECTRON_RUN_AS_NODE`). Capturas em `/tmp/voidsun-chibi-qa*`.
- O painel do navegador embutido pode estar oculto (sem quadros): usar a conferência pelo Electron.
- Preservar o trabalho de outros agentes; não commitar, reverter ou apagar sem pedido. Não renomear o perfil de dados `darkstar-forge`.
- Registrar o estado em `docs/CONTINUIDADE.md`.
