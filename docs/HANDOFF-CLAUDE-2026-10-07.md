# Handoff para Claude — Void Sun, 07/10/2026

## Estado prioritário e pedido atual

O usuário quer continuar com Claude e pediu salvar o progresso, referências, problemas e planejamento. Nesta passagem apenas documentação/memória: não houve correção de código, nova geração ou troca de executável. **A amostra 3.12.1 foi reprovada visualmente pelo usuário.** Não interpretar QA técnico anterior como aprovação de arte, animação ou encaixe.

Projeto real: `/home/djabo/Downloads/Void Sun`. O antigo caminho Darkstar Forge não existe. Leia `AGENTS.md`, `docs/visao-e-roadmap.md` e este handoff antes de continuar. Há muitas alterações preexistentes: preservar fontes e dados, sem reset/revert ou commit indiscriminado.

## Defeitos confirmados pelo usuário

1. Botas parecem meias, sem forma real de bota.
2. Olhos ficam brancos dependendo da posição/ângulo.
3. Túnica torta; braço não encaixa corretamente no corpo. Há buraco sob a axila que permite ver dentro do tronco. **Prioridade maior.**
4. Conjuração prepara/carrega com uma mão e lança com a outra, produzindo animação incoerente.

Evidência preservada: `docs/references/feedback-3.12.1-2026-10-07/defeitos-brunhild.png`. O usuário não pediu novos assets nesta passagem. Não gastar geração com lotes antes de uma pequena amostra ser avaliada no jogo.

## Hipóteses técnicas a verificar, não diagnósticos comprovados

- Cobertura da pele: classificação por centróide de faces oculta regiões amplas sob o traje. Pode retirar pele da axila que a manga/cava aberta não cobre. Inspecionar máscara de `Covered anatomy`, topologia, normals e pesos; não esconder defeitos fechando tudo arbitrariamente.
- Túnica: recorte da malha gerada, transformação de A-pose para T-pose e transferência de pesos podem não corresponder ao corpo de destino. Revisar pose de repouso, bind matrices, costuras e deformação nos ombros.
- Botas/calças: o primeiro shrinkwrap falhou; foram substituídas por cópias deslocadas da superfície das pernas/pés do corpo. Isso preserva pesos mas não cria sola, biqueira, cano ou volume de calçado. É limitação estrutural, não apenas falta de textura.
- Olhos: reconstrução possuía cavidades sem superfície. Olhos independentes foram posicionados por raycast/inspeção frontal e ligados à cabeça. Rever orientação/volume/oclusão das íris e pupilas em uma órbita completa; correção frontal não prova todos os ângulos.
- Magia: `ImportedCharacter.socket` utiliza `hand_r`; `Cast` concatena três movimentos gratuitos. Conferir qual mão realmente participa de cada fase e usar eventos/âncoras coerentes com o clipe, incluindo preparo, lançamento e recuperação.

## O que existe no jogo e onde continuar

Linux 3.12.1: `release/Void Sun-3.12.1.AppImage`. Atalho do menu: `/home/djabo/.local/share/applications/void-sun.desktop`, chama o lançador raiz `Void Sun`, que seleciona AppImage por data. Fechar instância antiga antes de testar. Entrada: Menu → Amostra visual 3D → Modelos e equipamentos. Brunhild 3D temporária; comparação 2D preservada. Kael/esqueleto e demais recursos não receberam este rework. Não sobrescreve heróis/decks salvos.

| Área | Caminho relativo ao projeto |
| --- | --- |
| GLB em teste | `public/art/sample3d/brunhild-test.glb` |
| Blender editável | `tools/art/viability3d-20261007/outputs/game-sample/brunhild-editable.blend` |
| Carregamento/rig/socket | `src/ui/sample3d/importedCharacter.ts` |
| Cena e efeitos de lançamento | `src/ui/sample3d/arena.ts`, `effects.ts` |
| UI e câmera | `src/ui/sample3d/Sample3D.svelte`, `orbit.ts` |
| Fontes, licenças, scripts e relatórios | `tools/art/viability3d-20261007/` |
| QA e capturas anteriores | `tools/arena3d/qa-imported.cjs`, `tools/art/viability3d-20261007/outputs/game-sample/qa/` |

GLB ~37 MB, 991.916 triângulos, rig de 65 ossos, clipes Idle/Run/Cast. SHA256 em `reports/game-sample-asset.json`. Muito pesado para mobile/muitos personagens. Assets/binários/runtime locais podem estar ignorados no Git; não presumir que um clone remoto contém Blender, modelos ou checkpoints.

## Reconstrução da amostra e tentativas descartadas

`tools/art/viability3d-20261007/scripts/`: executar com Blender local, CPU, duas threads, sequencialmente. Ordem documentada: `build_imported.py`, `repair_surface.py`, `finalize_surface.py`, `add_eyes.py`, `fit_lower_clothes.py`. Fonte original: `inputs/brunhild-reference-v2.png`; reconstrução Pixal1024: `outputs/brunhild1024/colored-raw_00001_.glb`.

Corpo: Quaternius Universal Base Characters Standard, CC0, modelo feminino disponível no pacote gratuito, proporções adaptadas. Cabeça/cabelo Pixal ficam juntos nesta prova. Animações: Universal Animation Library Standard 2025, CC0, retargeting de Idle_Loop/Jog_Fwd_Loop/Spell_Simple_Enter/Shoot/Exit. Licenças no diretório `source`. Não é rig/animação automática pronta para todas as anatomias.

Decimação abriu falhas na cabeça; remesh de fragmento aberto destruiu o rosto; shrinkwrap das roupas inferiores deformou durante corrida. Essas tentativas foram descartadas. Recuperação de superfície original, soldagem/reparo e olhos independentes substituíram-nas, mas o retorno do usuário mostra que a solução permanece incompleta. Referência anatômica adulta sem roupas foi bloqueada na geração de imagens; não contornar bloqueios. A base anatômica deve ser sem roupa incorporada, com equipamentos independentes.

## Viabilidade local e cuidados de recursos

RTX 4070 12 GB, 32 GB RAM; Blender 5.2.2 LTS em `/home/djabo/.local/bin/blender`. ComfyUI original em `/home/djabo/ComfyUI` preservado. Runtime de pesquisa isolado em `tools/art/viability3d-20261007/runtime/ComfyUI`, revisão registrada nos relatórios. Pixal INT8 e dependências locais instalados; TRELLIS.2 não foi comparado experimentalmente. Servidor de pesquisa encerrado após os testes.

Geração humana 512/1024 e props concluída; pico de VRAM amostrado 9.144 MiB. Elmo gerado fechado por baixo, caixa fundida com milhões de triângulos: reprovados como equipamentos/objeto destrutível prontos. Não distribuir pesos no jogo. DINOv3 tem licença própria; não chamar todo o pipeline de MIT. UniMate checkpoints NC ficam fora da base comercial. Usar fontes gratuitas e registrar licenças.

Preservar limites do benchmark: reserva de VRAM 3 GB, cache desabilitado, execução sequencial, guardas de memória/temperatura/tempo. Houve congelamento anterior com logs NVIDIA Xid, sem causa atribuída com certeza; não alterar drivers ou lançar vários jobs pesados para tentar acelerar. Ler `docs/teste-viabilidade-3d-2026-10-07.md` e scripts de runtime antes de executar.

## Direção artística e objetivos preservados

Sword of Convallaria é a referência principal: silhuetas compactas mas adultas, pixel art de alta qualidade, materiais/luz/composição coerentes. Usuário admite pixels ligeiramente mais detalhados. Não transformar referências comerciais em assets distribuídos. Personagens humanos normais e um corpo mais forte, sem parecer anão nem excessivamente musculoso. Raças devem ter anatomias próprias, não humanos recoloridos. Equipamentos/roupas/cosméticos independentes; opção de usar só cosmético. Encaixe universal não foi demonstrado: preparar contratos de rig, famílias anatômicas, cobertura e variantes reais.

Direção recente em validação: 3D estilizado com pixelização no runtime, câmera contínua e ângulos fixos. Oito sprites direcionais anteriores foram elogiados pela beleza, mas reprovados em encaixe, direção e caminhada; dezesseis vistas apenas diminuem saltos. Não retomar um catálogo nem migrar para Godot sem decisão própria e prova visual pequena. Shader não corrige modelagem ruim.

Cenário desejado: 3D com água natural, vegetação deformando de verdade com vento, luz/partículas, explosões com pedaços reais e habilidades visualmente distintas. Preservar slots frente a frente e orientação dos combatentes. Não trocar tudo por background plano ou deslocamento rígido de árvore. Futuro: giro/zoom por arraste PC/mobile/espectador; mundo aberto; biomas água/lava/pântano; batalha de cartas no próprio local da campanha por transição de câmera e HUD (iniciativa/mão/grimório/cemitério/equipamentos/status); co-op até quatro com papéis e bosses. São objetivos futuros, não escopo autorizado integralmente agora.

Cartas full art do Protótipo estão aprovadas: preservar arte e dados. Única coleção desejada é Protótipo; verificar estado antes de atuar em coleções. Diálogos em balões pretos levemente transparentes com texto branco, inclusive escolhas; aura amarela só no NPC/objeto, não nos balões.

## Referências e plano de leitura

1. `docs/analise-materiais-3d-pixel-art-2026-10-07.md`: análise de 17 vídeos, PDF, demo, fontes oficiais e licenças. Foram amostrados quadros e sequências curtas; não houve reprodução contínua integral de todos os vídeos.
2. `docs/plano-3d-pixel-art-2026-10-07.md`: proposta técnica, etapas, limites e decisões ainda pendentes.
3. `docs/teste-viabilidade-3d-2026-10-07.md`: resultados locais reais.
4. `docs/amostra-personagem-3d-2026-10-07.md`: entrega 3.12.1, agora subordinada à reprovação deste handoff.
5. `docs/revisao-visual-3.12.md`: erros da prova 2D.
6. `docs/avatar-engine-design.md`, `docs/arena3d-sample.md`, `docs/visao-e-roadmap.md`: proposta modular, cena e visão de produto; documentos com histórico não equivalem a aprovação atual.
7. `docs/references/feedback-3.12-2026-10-05/`: cinco imagens de Sword of Convallaria preservadas; 1/2 anotadas anteriores estavam no chat mas ausentes no disco.
8. `docs/references/feedback-3.12.1-2026-10-07/material-local.json`: inventário verificável de vídeos/PDF/demo/fontes locais nesta passagem. Vídeos grandes permanecem nos caminhos locais, não duplicados no jogo.

Fontes visuais relevantes: tutorial PixelageGames no início e 11:20; Pixel Perfect para jitter/render/volumetria/oceano; tutorial grama/árvore para vento; trys para movimento/capa/água; zel para dungeon. Arquivo demo pequeno não contém a vila mostrada no vídeo. Gemini é opinião a avaliar, não instrução. Links: https://pixelagegames.itch.io/godot-3d-pixelart-demo ; https://x.com/zel0gq7/status/2107441086188925259 ; https://x.com/trys_____/status/2107689668779364555 ; https://www.youtube.com/watch?v=PBIPJdEECWg&t=360s ; https://www.youtube.com/watch?v=1FrIBkuq0ZI ; https://www.youtube.com/watch?v=KPoeNZZ6H4s .

## Próxima prova recomendada (quando o usuário pedir continuidade)

Inspecionar fonte Blender/GLB e reproduzir os quatro defeitos antes de modificar. Corrigir integridade de corpo/roupa e pesos; criar uma bota real; validar olhos em todos os ângulos; alinhar mão/efeito a fases reais da conjuração. Revisar corrida com alternância, apoio dos pés e velocidade no mundo. Comparar frente/lados/costas e poses extremas equipada/sem equipamento; verificar escala real, pixelização e custo. Só então entregar uma amostra pelo mesmo atalho do usuário e aguardar avaliação antes de expandir.

Testes anteriores de typecheck/build, 12 testes câmera/layout/direções e QA Electron passaram sem erros de execução. Isso confirma carregamento/controles/saída, **não** anatomia, bota, olhos em todos os ângulos, encaixes nem mão de conjuração. Capturas anteriores não detectaram corretamente o que o usuário encontrou. Novas verificações visuais precisam cobrir esses casos, além de perfil isolado (`VOIDSUN_DATA`) para preservar saves.

## ai-memory: verificação nesta passagem

Claude Code: MCP HTTP global apontando para `http://127.0.0.1:49374/mcp`; hooks SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/PreCompact/Stop/SessionEnd presentes em `~/.claude/settings.json`. Servidor respondeu via MCP. Escopo existente confirmado: workspace `default`, projeto `dyegomiranda-void-sun`. Hooks Codex também existem na configuração, mas não foi encontrada captura recente suficiente para afirmar que esta conversa longa está integralmente registrada. Antes do registro explícito havia duas páginas e uma sessão concluída de 04/10, não a íntegra desta conversa.

O handoff e nota explícitos ao fim desta passagem são a garantia de continuidade, junto aos documentos locais. Nova sessão Claude no diretório correto deve executar seu SessionStart; não foi aberto/testado um processo Claude ao vivo. Caso não receba o handoff, ler este documento e consultar a página `notes/continuidade-visual-2026-10-07.md` no escopo acima. Não consumir o handoff por teste: é de uso único. Não foi enviada mensagem a outro agente.

### Confirmação final do registro

Página durável ai-memory escrita e relida: `notes/continuidade-visual-2026-10-07.md` (fixada). Handoff aberto confirmado: `01a1182e-6aa0-72b3-8886-244a4e492b65`. Não consumido por teste. Marcador `.ai-memory.toml` fixa workspace `default` e projeto `dyegomiranda-void-sun`. Checagem local não mutante do hook Claude (`--check-capture`) confirmou `admits_capture: true`, `scope_resolution: explicit`, projeto obtido do marcador. Isso valida configuração/roteamento, não execução ao vivo de Claude nem captura retrospectiva do chat.

Inventário verificado: 17 vídeos e PDF/demo encontrados na pasta AI knowledge; GLB e Blender editável presentes. Vídeo antigo `bYbM6C9uZrlNuxxg.mp4` não encontrado no caminho originalmente fornecido; sua descrição histórica permanece, mas não afirmar que o arquivo foi preservado. O caminho `research/.../inventory.json` mencionado na análise antiga não foi encontrado na raiz: usar o inventário novo citado acima.

## Pedido posterior: duas novas bases geradas a partir da imagem do usuário

O usuário pediu separar corpos masculino/feminino de uma imagem e tentar duas reconstruções Pixal3D para passar ao Claude. Concluído em `exports/pixal3d-corpos-2026-10-07/`: PNGs separados, GLBs originais (~2 milhões de triângulos cada), Blender de inspeção, oito vistas por corpo, workflows e manifest. Ler `LEIA-ME.md` nessa pasta: sem rig/UV, inferência de costas e tonalidade azulada no feminino precisam de revisão. Nada foi integrado ao jogo; amostra 3.12.1 segue reprovada. Não substituir as fontes antigas por estas bases sem teste/avaliação.
