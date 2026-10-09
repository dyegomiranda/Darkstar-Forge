> **Histórico reprovado pelo usuário em 08/10/2026.** A direção atual é a abertura vetorial monocromática; veja `exports/djabo-vector-2026-10-08/LEIA-ME.md`. Não reativar esta prova 3D como abertura.

# Djabo — personagem e abertura 3D, amostra de 07/10/2026

## Direção

Mascote adulto alongado do logo do usuário. A regra chibi dos heróis NÃO se aplica a este personagem. Armadura angular negra, chifres vermelhos, capacete fechado, canais vermelhos integrados. A lâmina da katana é NEGRA: a cor roxa pertence exclusivamente aos VFX. Nenhuma fumaça, aura ou texto está incorporado à geometria.

Logo original e referências limpas: `inputs/`. As referências foram geradas com imagegen a partir do logo do próprio usuário. O corpo e a arma foram reconstruídos separadamente com Pixal3D local. A referência de arma saiu com reflexos de aço cinza; a lâmina foi corrigida para aço negro nos atributos de cor da malha e no material Blender, conservando o cabo. Não tomar a referência cinza como decisão de direção de arte.

## Arquivos e reutilização

- `build/djabo.blend`: personagem, esqueleto e oito clipes transferidos da biblioteca Quaternius.
- `build/djabo-rigged.blend`: mesma malha com esqueleto antes da transferência de movimentos.
- `build/katana.blend`: arma separada com material aço negro.
- `public/art/djabo-intro/`: GLBs e manifesto consumidos pelo jogo.
- `exports/djabo-intro-3d-2026-10-07/`: cópias portáteis dos modelos, fontes e referências para outras IAs.
- `src/ui/intro3d/`: cena, linha de tempo, shaders das auras, rastro espacial e interface de avaliação.

A arma tem eixo longitudinal +Y no GLB, origem de empunhadura explícita e é anexada a `DEF-hand.R`. Corpo normalizado a uma unidade incluindo os chifres; na cena escala 2. Auras são objetos independentes. As duas fendas vermelhas do visor foram recuperadas por pintura dos atributos de cor da própria superfície, pois a reconstrução perdeu esses detalhes. Canais vermelhos são luminosidade própria do material; são parte do design da armadura.

O corpo tem aproximadamente 110 mil triângulos, katana 14 mil; a cena com auras fica abaixo de 160 mil. Animações: Parado, Andar, Correr, Guarda, Golpe, Conjurar, Dano, Morte. **Esta abertura usa Guarda, Golpe e a inspeção em Parado. Os demais clipes estão disponíveis para futura revisão; sua qualidade não está aprovada.**

## Fluxo reprodutível

1. Em um servidor ComfyUI local isolado, executar `run_pixal.py body` / `run_pixal.py sword`. Graphs e telemetria: `reports/`. Os caminhos e limites reutilizam o ambiente local de `tools/art/viability3d-20261007/`. Não abrir outra geração simultânea.
2. Brutos: `tools/art/viability3d-20261007/outputs/djabo-logo-body/` e `djabo-logo-katana/`.
3. Exportar cada bruto com `tools/art/chibi/glb_to_npz.py` no Blender para `build/body-raw.npz` e `build/sword-raw.npz`.
4. Executar `tools/art/chibi/solidify.py` com o Python do venv ComfyUI: corpo resolução 400, vedação 2; arma resolução 420, vedação 1. Saídas `body-solid.npz`, `sword-solid.npz`.
5. Blender em background, quatro threads, `--python tools/art/djabo-intro/build_model.py`. O preparador reprojeta cores, reduz a superfície fechada, ajusta pesos restritos à anatomia, cria esqueleto e transfere os clipes. **Não substituir por primitivas procedurais.**
6. Typecheck e build; `qa.cjs` usa Electron real em perfil separado. Para o empacotado, `VOIDSUN_QA_PACKED=1`; `DJABO_QA_OUT` escolhe pasta das capturas.

A limpeza volumétrica é necessária: apenas colapsar o bruto manteve folhas internas, granulação e centenas de milhares de triângulos. O remesh do Blender sozinho não resolveu. As primeiras avaliações detectaram pesos de mão contaminando a perna e placas do quadril recebendo influência do braço; foram corrigidos com faixas anatômicas e conferência de imagens.

## Cinemática e limites

Duração 9 segundos: aproximação do capacete, revelação do corpo, preparação e corte, assinatura “Developed by / Djabo”. Auras negras usam deformação espacial e ruído animado; katana tem energia roxa independente e rastro calculado pelo movimento real da arma. Mundo e VFX passam pelo mesmo render de baixa resolução, ampliação nearest-neighbor; tipografia permanece nítida.

Os VFX desta amostra são shaders próprios Three.js; NÃO são assets Effekseer. Não instalar ou apresentar um sistema Effekseer como concluído por causa desta amostra. Câmera de inspeção contínua, zoom, pausa, repetição, controles de pixels, auras e navegação temporal. Render limitado a 60 fps e 2,2 milhões de pixels de saída; gerações Pixal limitadas e encerradas após o trabalho.

A rota é `#/abertura-3d`, botão “Abertura Djabo 3D” no menu. A abertura automática anterior permanece até a avaliação artística. Sem áudio novo nesta amostra. Refinamento de empunhadura/dedos, transições da armadura sob movimentos extremos e direção dos efeitos deve continuar a partir deste modelo; não declarar aprovação visual do usuário.

## Origem e licença

Logo: fornecido pelo usuário. Referências novas: imagegen. Reconstrução local: Pixal3D (licença arquivada no ambiente de viabilidade). Movimentos transferidos: Quaternius Universal Animation Library, CC0, `source/animation/Animation Library[Standard]/License.txt`. Malha do manequim de animação não acompanha a entrega; apenas o movimento foi transferido.
