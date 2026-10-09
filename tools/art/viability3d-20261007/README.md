# Experimento local Pixal3D — 07/10/2026

Teste de viabilidade separado do jogo. Resultados, capturas e limites: [relatório](../../../docs/teste-viabilidade-3d-2026-10-07.md).

Status: geração/GLB/inspeção técnica concluídos; arte, rig, topologia de produção, animação e encaixes não aprovados. Elmo reconstruído com fundo fechado; não equipar.

## Arquivos

- `inputs/`: referência original, prompts; referências e geometria conhecida de caixa/elmo para controles.
- `outputs/`: GLBs brutos, cenas `.blend`, oito vistas e comparação. Binários grandes permanecem locais e são ignorados pelo Git.
- `reports/`: grafos API usados, versões, hashes, métricas e histórico real. `crate512-attempt1-*` preserva a execução encerrada pelo orçamento.
- `scripts/`: descarga verificada, inicialização separada, monitor, controles e inspeção.
- `source/`: fontes consultadas, requisitos e licenças. Não há fonte de jogo comercial copiada.
- `runtime/`, `models/`: instalação/checkpoints locais, ignorados pelo Git.

## Reproduzir nesta máquina

Executar a partir desta pasta, com o jogo/editor pesado fechado. A instalação original `/home/djabo/ComfyUI` fornece bibliotecas pesadas por um arquivo `.pth`; não atualizá-la automaticamente. Versões efetivas: `reports/python-versions.json`. O runtime de pesquisa está fixado no commit `af89add63f71a487fde45efc7fba744f3455ae73`.

1. Conferir/recuperar os seis checkpoints: `rtk proxy python scripts/download_models.py`. Arquivos existentes também são verificados por SHA-256; um erro de hash não é ignorado.
2. Em um terminal separado, iniciar: `rtk proxy python scripts/start_runtime.py`. Usa localhost 8189, reserva de 3 GB e nenhum cache de execução. Não carrega custom nodes/APIs. O script confere a revisão e os links de modelos antes de iniciar.
3. Em outro terminal: `rtk proxy python scripts/run_benchmark.py benchmark`. Uma geração por vez; limite de 30 min, GPU total 10.500 MiB, RAM disponível mínima 4.096 MiB, temperatura abaixo de 80 °C. O monitor encerra apenas o servidor deste experimento se atingir o orçamento.
4. Após conferir `status: success` no resultado, inspecionar: `rtk proxy env OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 /home/djabo/.local/bin/blender --background --threads 2 --python-exit-code 1 --python scripts/inspect_blender.py -- brunhild512`.
5. Parar o servidor com Ctrl+C ao terminar. Abrir `outputs/brunhild512/inspection.blend` para examinar a malha. Nenhum processo permanece obrigatório em segundo plano.

Outros casos: `benchmark1024`, `crate512`, `helmet512`. Pastas de inspeção correspondentes: `brunhild1024`, `crate512`, `helmet512`. Conferir a conclusão de cada caso antes de executar a inspeção. `benchmark1024` inclui a base no grafo; com o padrão atual sem cache, seu tempo será diferente do refinamento histórico de 18,18 s.

`make_prop_fixtures.py` recria controles paramétricos e referências, não arte final. `make_review.py` monta pranchas das capturas reais e amplia a prévia 160 por vizinho mais próximo; não pinta nem repara a geometria. `inspect_helmet_source.py` confirma a abertura do controle conhecido. Os grafos executados já estão preservados: não regenerá-los ou sobrescrever resultados históricos sem necessidade.

## Recuperação do ambiente

O clone de pesquisa e o ambiente virtual já existem. Para outra máquina/sessão, consultar `source/comfy_requirements.txt`, `reports/python-versions.json`, `reports/runtime-revision.txt` e o manifesto de checkpoints. Fixar a mesma revisão do ComfyUI e resolver suas dependências em um ambiente separado. Nesta máquina, os modelos do clone são links para `models/<categoria>` deste experimento. O script recusa substituições inesperadas.

O reaproveitamento das bibliotecas é uma dependência explícita, não um isolamento absoluto. Se a instalação original mudar, verificar as versões antes de comparar tempos. Não instalar várias versões de CUDA ou drivers para repetir este resultado. Os GLBs gerados ainda não são assets otimizados para runtime.

## Licenças e origens

[Pixal3D](https://github.com/TencentARC/Pixal3D), licença MIT/NOTICE preservados. [ComfyUI](https://github.com/Comfy-Org/ComfyUI), GPL-3.0, licença preservada junto da cópia de código nativo. Checkpoints repacotados: [Comfy-Org/Pixal3D](https://huggingface.co/Comfy-Org/Pixal3D), [MoGe](https://huggingface.co/Comfy-Org/MoGe), [BiRefNet](https://huggingface.co/Comfy-Org/BiRefNet). A licença [DINOv3](https://github.com/facebookresearch/dinov3/blob/main/LICENSE.md) e a licença MoGe estão preservadas em `source/`. Não interpretar o rótulo de um repacotamento como substituição das licenças dos componentes.

Blender e a reconstrução local não cobraram serviço de geração. A criação da referência usou duas chamadas da ferramenta de imagens da conversa, uma inicial e uma correção de proporções. Nenhuma chave/API paga alternativa foi configurada.
