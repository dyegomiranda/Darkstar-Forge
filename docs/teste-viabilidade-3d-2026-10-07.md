# Void Sun — teste local de reconstrução 3D

07/10/2026. Experimento separado do jogo, em `tools/art/viability3d-20261007/`.

**Resultado: a geração local e a inspeção no Blender são viáveis nesta máquina. A qualidade artística e a preparação para personagem customizável ainda não estão aprovadas.**

A RTX 4070 gerou um personagem e dois controles de geometria. Todos os GLBs concluídos foram importados e renderizados no Blender, em oito ângulos. O personagem foi comparado em duas resoluções de reconstrução. O teste revelou problemas concretos no rosto, no peso da malha e na abertura do elmo; essas falhas impedem colocar os arquivos diretamente no jogo.

## Referência e reconstrução

Uma referência original orientou o teste: adulta, cabelo curto, braços afastados, roupa de viagem, corpo inteiro visível. Houve uma geração inicial e uma correção direcionada de proporções. A primeira versão foi descartada como entrada por estar alta e realista demais. Os dois prompts e o caminho de origem foram preservados em `inputs/reference-prompts.json`.

A segunda imagem é **entrada técnica**, não design aprovado. Ela ainda apresenta linguagem de ilustração e não comprova fidelidade a Sword of Convallaria. A roupa está junto do corpo na imagem e na reconstrução; este arquivo não representa ainda uma base anatômica modular com roupas separadas.

BiRefNet removeu o fundo; a imagem foi centralizada em 1024 × 1024, com margem e sem cortar mãos ou botas. O Pixal3D reconstruiu uma malha verdadeira. O Blender importou o GLB e exibiu a geometria gerada; nenhum rosto foi esculpido, pintado por cima ou substituído na comparação.

![Entrada e duas reconstruções](../tools/art/viability3d-20261007/outputs/reference-vs-reconstruction.png)

![Oito vistas da reconstrução 1024](../tools/art/viability3d-20261007/outputs/brunhild1024/renders/eight-angles.png)

As vistas mostram o mesmo objeto tridimensional em rotações de 45°. Não são oito desenhos produzidos separadamente. Elas servem para inspeção, sem limitar o futuro personagem a oito direções.

## Medições

| Caso | Tempo registrado | Pico de GPU amostrado | Triângulos do GLB colorido | Resultado |
|---|---:|---:|---:|---|
| Personagem 512 | 40,41 s | 8.760 MiB | 721.536 | Concluído |
| Personagem 1024, refinamento | 18,18 s adicionais | 9.144 MiB | 3.130.430 | Concluído, base 512 em cache |
| Caixa 512, segunda tentativa | 76,71 s | 8.408 MiB | 5.253.982 | Concluído |
| Elmo 512 | 66,71 s | 8.122 MiB | 2.218.284 | Concluído; abertura incorreta |

Os números 512/1024 identificam a resolução espacial da reconstrução, não o tamanho da imagem de referência nem a resolução final do jogo. Mesmo a configuração 512 pode gerar milhões de triângulos em objetos de maior volume ocupado.

O primeiro tempo do personagem exclui a remoção de fundo já executada, que levou 20,20 s. O refinamento 1024 reutilizou etapas anteriores: **18,18 s não é o tempo de uma geração 1024 completa do zero**. Os tempos excluem download, instalação e renderização no Blender. Caixa/elmo usaram uma configuração diferente de cache e não constituem comparação de velocidade entre objetos.

Memória, temperatura e RAM disponível foram amostradas a cada dois segundos, para a máquina inteira. Os picos incluem desktop e outros processos; um pico muito breve pode ficar entre amostras. O maior pico das execuções concluídas foi 9.144 MiB, aproximadamente 8,93 GiB; a maior temperatura foi 62 °C. Em todas as execuções concluídas restaram ao menos 13.110 MiB de RAM disponível. Isso não é medição de desempenho de uma batalha nem validação mobile.

A primeira tentativa da caixa chegou a 10.585 MiB e foi encerrada pelo monitor ao ultrapassar o orçamento de 10.500 MiB. Não foi um teste concluído. A repetição manteve o mesmo orçamento de interrupção, aumentou a reserva solicitada ao ComfyUI de 2 para 3 GB e desativou o cache intermediário. Essa alteração permitiu concluir a caixa. O registro da tentativa interrompida foi preservado, sem apagar a falha.

## O que funcionou e o que precisa mudar

**Personagem:** silhueta, cabelo curto, roupa, mãos e botas são reconhecíveis; cabeça, tronco e pernas pertencem à mesma geometria. O refinamento aumentou a definição da roupa, das fivelas e do cabelo. Porém os olhos perderam a expressão aberta da referência, há manchas em superfícies e os detalhes pequenos continuam frágeis. Pixelizar esse arquivo não corrige esses defeitos. A versão maior foi mantida como material de diagnóstico, não escolhida automaticamente como base final.

**Preparação:** todos os GLBs coloridos têm uma única malha, cores por vértice, nenhuma camada UV e nenhum esqueleto de animação. Corpo, cabelo e roupa não têm separação funcional. Os arquivos brutos são pesados demais para adotar diretamente. Ainda precisamos provar redução/retopologia adequada à deformação, transferência de aparência e separação de peças. Apenas reduzir triângulos não valida rosto, juntas ou encaixes.

**Caixa:** o gerador preservou sua aparência geral. O controle original foi construído no Blender com tábuas separadas; o arquivo reconstruído é uma malha única, sem componentes semânticos de ruptura. A geração não entregou automaticamente uma caixa quebrável. Para estruturas simples, autoria paramétrica no Blender preserva peças, medidas e baixo custo com mais controle; estes controles geométricos não são propostas de arte final.

**Elmo:** a forma externa foi reconhecida, mas o fundo ficou fechado por uma superfície. Uma vista única de cima não forneceu informação suficiente para garantir o volume interno. A inspeção inferior confirmou o fechamento. O controle original possui abertura; não foi equipado no personagem.

![Controle original: abertura inferior](../tools/art/viability3d-20261007/outputs/helmet-source-underside.png)

![Reconstrução: superfície fechando a abertura](../tools/art/viability3d-20261007/outputs/helmet512/renders/underside-512.png)

Foi registrado também um teste de interseção da geometria. A construção de controle tem uma pequena abertura no polo superior; por isso a medição comparativa do controle usa um raio ligeiramente fora do eixo, além da inspeção visual inferior. As coordenadas e essa ressalva constam em `reports/helmet-source-cavity.json`. Não afirmar que esse controle é uma peça final com topologia/encaixe aprovado.

## Renderização pixel art

As capturas usam câmera ortográfica e as cores geradas por vértice, sem iluminação aplicada sobre o material, para separar problemas de reconstrução de problemas de luz. A geometria e as cores não foram retocadas. A cena de inspeção usa renderização CPU, com dois threads.

Há uma prévia técnica renderizada em 160 × 160 e ampliada por vizinho mais próximo em cada pasta `renders/`. Ela mostra perda de leitura na escala pequena. **Não é o renderizador pixel art final:** ainda faltam o tratamento de luz/sombra, bordas, estabilidade temporal, materiais e avaliação em movimento. Blender Pixel Kit, shader Godot, rig, caminhada e armaduras não foram implementados nesta etapa.

## Ambiente instalado e preservação

- Blender existente: 5.2.2 LTS. Instalação original preservada.
- ComfyUI de pesquisa: 0.39.0, commit `af89add63f71a487fde45efc7fba744f3455ae73`, dentro do experimento.
- Python 3.14.7; PyTorch 2.13.0+cu130, CUDA 13.0. O ambiente de pesquisa reaproveita bibliotecas pesadas da instalação existente por caminho de leitura, com os pacotes atualizados somente no ambiente separado. Não é uma distribuição totalmente autônoma.
- Seis checkpoints, cerca de 9,95 GB decimais, baixados uma vez e verificados com SHA-256. URLs fixadas por revisão em `reports/model-download-plan.json`.
- Nós nativos; custom nodes e APIs externas desativados. Servidor somente em `127.0.0.1:8189`, encerrado após os testes.
- Pixal3D e seus componentes têm origens/licenças registradas. DINOv3 possui licença própria; não chamar o conjunto inteiro de MIT. Nenhum serviço pago de reconstrução foi usado. A referência foi criada com a ferramenta de imagens desta conversa.
- Jogo, cartas Protótipo, perfil, lançador e instalação ComfyUI original não foram alterados por este teste. Não há nova versão jogável nem migração para Godot.

## Decisão e próximo passo

O hardware permite continuar uma prova pequena. O Pixal3D é útil para reconstrução inicial e estudo de volumes, mas **não demonstrou produção automática de um personagem modular pronto**. Neste teste não há motivo para produzir um catálogo ou gerar novamente todas as artes.

Antes de animação, a próxima prova deve resolver uma base humana compacta e adulta: rosto legível, cabelo curto correto, roupa de referência ajustada ao corpo, peças separadas e geometria adequada a juntas. Usar as referências de Sword of Convallaria como direção visual e comparar de frente, perfil, costas e na escala de jogo. Rosto e corpo precisam ser avaliados antes de ampliar para corpo forte ou outras anatomias.

No Blender, padronizar medidas, rig e regiões de cobertura. Equipamentos devem ter volume interno e fixação testados; sua forma externa pode partir da geração, mas a região funcional precisa obedecer à anatomia. O elmo deste teste fica reprovado para equipar. Depois provar uma passada completa com alternância, apoio do pé e deformação, e só então o renderizador pixel art em movimento. A IA operará essas etapas; o usuário avaliará o resultado visual.

Os arquivos fonte, parâmetros, resultados e instruções de reprodução estão no [README do experimento](../tools/art/viability3d-20261007/README.md). Fluxo nativo consultado: [documentação Pixal3D do ComfyUI](https://docs.comfy.org/tutorials/3d/pixal3d); gerador: [TencentARC/Pixal3D](https://github.com/TencentARC/Pixal3D).
