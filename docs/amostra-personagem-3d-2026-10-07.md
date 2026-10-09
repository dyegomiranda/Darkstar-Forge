# Amostra de personagem 3D — 7 de outubro de 2026

> **Atualização prioritária de 07/10/2026: amostra 3.12.1 reprovada pelo usuário.** Botas parecem meias; olhos ficam brancos em certos ângulos; túnica torta e buraco na axila revelam interior do tronco; conjuração carrega e lança com mãos diferentes. QA técnico anterior não validou esses aspectos. Antes de continuar, leia [Handoff para Claude](HANDOFF-CLAUDE-2026-10-07.md). Nenhuma correção no jogo foi feita nesta passagem de registro.


Escopo autorizado: integrar uma Brunhild temporária ao Pátio do Sol Ausente, com corpo humano sem roupa incorporada, traje independente, olhos corrigidos, corrida e conjuração. Não substituir heróis salvos ou expandir o catálogo.

## Acesso

Abra o Void Sun pelo menu de aplicativos e entre em **Amostra visual 3D → Modelos e equipamentos**. O modelo 3D é a visualização inicial. **Ver personagem de perto**, **Iniciar corrida**, **Conjurar Brasa do Vazio** e **Roupa de viagem separada** permitem avaliar a amostra. A caixa de seleção inferior mantém a comparação com o personagem 2D anterior. As alterações são temporárias.

## Estrutura efetivamente entregue

- Corpo anatômico com topologia de animação, material de pele e pés sem botas: a roupa não está pintada ou incorporada no corpo.
- Túnica, calças e botas são meshes independentes, com os pesos do mesmo esqueleto; calças e botas construídas como cascas independentes da superfície anatômica, preservando os pesos exatos da base. O primeiro ajuste por shrinkwrap deformou as peças geradas e foi descartado. Estas duas peças ainda têm material simples de teste, sem ornamentação final. Partes da pele cobertas são ocultadas durante o uso do traje e reaparecem quando ele é retirado.
- Cabeça/cabelo derivados da reconstrução Pixal3D da referência original. Permanecem juntos nesta amostra; não representam um catálogo de cabelos intercambiáveis.
- Olhos reais criados no Blender: esclera, íris castanha, pupila e reflexo, ligados ao osso da cabeça. As cavidades da reconstrução não continham superfícies adequadas para corrigir somente com cor.
- Animações `Idle`, `Run` e `Cast`. A conjuração combina preparação, disparo e recuperação; o efeito utiliza a posição da mão animada.
- Cena 3D verdadeira com rotação contínua e vistas fixas, sem alterar a posição dos slots. Geometria que tapa o personagem é ocultada durante a inspeção e restaurada ao reenquadrar a arena.

## Fontes gratuitas e licença

A estrutura anatômica utiliza o kit **Universal Base Characters Standard** do Quaternius (CC0), obtido gratuitamente em https://quaternius.itch.io/universal-base-characters. Foram adaptadas proporções e material; a cabeça original da referência foi preservada.

Os movimentos são do **Universal Animation Library Standard**, disponibilizado pelo próprio autor sob CC0 em https://opengameart.org/content/universal-animation-library. Este download de 2025 possui 45 movimentos. Foram utilizados `Idle_Loop`, `Jog_Fwd_Loop`, `Spell_Simple_Enter`, `Spell_Simple_Shoot` e `Spell_Simple_Exit`. Retargeting e montagem realizados no Blender; não se trata de animação gerada por UniMate.

Licenças originais e arquivos de origem estão em `tools/art/viability3d-20261007/source`. A tentativa de gerar uma referência anatômica adulta sem roupa foi bloqueada pela ferramenta de imagens. A base foi construída/adaptada diretamente em 3D, sem contornar o bloqueio e sem serviço pago adicional.

## Arquivos e reprodução

Modelo do jogo: `public/art/sample3d/brunhild-test.glb`.

Fonte editável: `tools/art/viability3d-20261007/outputs/game-sample/brunhild-editable.blend`.

Executar sequencialmente, no Blender local, com `--background --threads 2 --python-exit-code 1 --python`:

1. `tools/art/viability3d-20261007/scripts/build_imported.py`
2. `tools/art/viability3d-20261007/scripts/repair_surface.py`
3. `tools/art/viability3d-20261007/scripts/finalize_surface.py`
4. `tools/art/viability3d-20261007/scripts/add_eyes.py`
5. `tools/art/viability3d-20261007/scripts/fit_lower_clothes.py`

O retargeting utiliza orientação global relativa à pose de repouso, transferida para a hierarquia do esqueleto anatômico. Movimento no mundo pertence à arena, não ao deslocamento raiz da animação.

## Limites da amostra

A amostra permite avaliar a integração. **Não é acabamento artístico aprovado nem o visual final de Sword of Convallaria.** Gola, cabelo, pequenos defeitos da reconstrução, anatomia, silhueta e transições ainda devem ser avaliados pelo usuário. O encaixe desta roupa não prova compatibilidade automática de qualquer armadura ou raça. Não foram criados elmo ou catálogo de equipamentos 3D nesta entrega.

A malha do rosto foi mantida em maior detalhe. A redução automática abriu falhas; remesh aplicado ao fragmento aberto também falhou. A recuperação de superfície original, soldagem de vértices coincidentes, reparo de pequenas bordas e inserção de olhos funcionais substituem esses experimentos. Não repetir o remesh descartado como solução pronta. Otimização para mobile e acabamento de renderização pixel art permanecem pendentes.

## Verificação

Registro de execução real em Electron: `tools/arena3d/qa-imported.cjs`. Exercita carga, retirada do traje, corrida, conjuração, comparação 2D e saída com descarte da cena. Capturas e métricas são salvas em `/tmp/voidsun-imported-*`; a versão empacotada é verificada pelo mesmo lançador usado no menu de aplicativos, em perfil de dados isolado.


Resultado final: versão Linux **3.12.1** empacotada e aberta pelo lançador do atalho; navegação pela opção do menu confirmada. QA em perfil isolado passou, sem erros de execução, incluindo corpo/traje, corrida, conjuração, comparação 2D e saída. Taxa de quadros registrada ao final: 55 fps neste computador, não um benchmark de mobile. As capturas finais foram inspecionadas visualmente e preservadas em `tools/art/viability3d-20261007/outputs/game-sample/qa/`. Typecheck e build passaram; 12 testes de câmera, layout e direções passaram.

O GLB desta prova tem aproximadamente **37 MB e 992 mil triângulos**; não está pronto para distribuição mobile nem para multiplicação por dezenas de personagens. O relatório de asset com hash e clipes está em `tools/art/viability3d-20261007/reports/game-sample-asset.json`. A aprovação visual e retopologia/otimização precedem a expansão.
