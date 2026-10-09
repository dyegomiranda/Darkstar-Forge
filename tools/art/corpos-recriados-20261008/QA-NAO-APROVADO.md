# Corpos-base — revisão interrompida, 08/10/2026

**Resultado: NÃO ENTREGAR MODELOS.** O usuário pediu PNG e GLB masculino/feminino da referência original, com mãos corretas e sem artefatos. Esse resultado não foi alcançado. Nenhum GLB final foi exportado, nenhum arquivo do jogo foi alterado e nenhuma nova inferência Pixal foi executada nesta tentativa.

## O que foi recuperado

Os PNGs originais e GLBs antigos estavam na lixeira em `/home/djabo/.local/share/Trash/files/pixal3d-corpos-2026-10-07/`. PNGs foram copiados para `references/`, sem alteração. GLBs antigos permanecem como fonte reprovada, não como entrega.

## O que foi tentado

1. Inspeção da referência e do fluxo: a referência já oculta vários dedos. O fluxo antigo já usava refinamento 1024; simplesmente repetir com mais passos não garante anatomia.
2. Edição apenas das mãos com o gerador de imagens: bloqueada pela ferramenta, sem resultado utilizado.
3. Limpeza das superfícies Pixal antigas no Blender: material uniforme, remoção de fragmentos soltos, remesh apenas do corpo e suavização. Foram eliminados 1772 fragmentos no masculino e 1631 no feminino.
4. Inspeção de mãos reais CC0 Quaternius, com cinco dedos e superfície contínua. Depois de soldar vértices duplicados do glTF, cada mão tem um único anel de corte no antebraço.
5. Enxerto tentado no masculino: a seção do corpo abre 14 anéis, em vez de um. Não foi criada uma união artificial entre cavidades.
6. Tentativa adicional de preenchimento volumétrico a 0,0035 unidade por voxel (CPU, ~446 MB RAM): ainda 12 anéis na seção, e topologia muito porosa.

## Evidência

`reports/masculino-topology-limit.json`: a malha limpa tem Euler −8900; a tentativa volumétrica ainda tem Euler −2738. Superfície sem bordas abertas não significa volume corporal limpo. A junção de punho continuou reprovada. Não executar feminino após falha desse método no masculino.

`work/*-body-clean.blend`, `*-body-solid.blend` e NPZ são intermediários reprovados. Não copiar para o jogo nem para uma pasta de entrega. `graft_hands.py` aborta nos controles de topologia antes de salvar qualquer mãos-fit.

## Próximo caminho concreto

Construir uma base com topologia de animação controlada, usando as referências recuperadas como guia de proporções, ou conseguir uma reconstrução Pixal realmente volumétrica. Não voltar a prometer qualidade apenas aumentando resolução. As mãos CC0 podem ajudar na retopologia, mas não corrigem a malha corporal porosa por si só. Validar corpo completo, mãos/punhos/axilas/pés em close e por múltiplas vistas antes de entregar.

A origem técnica precisa ser informada: recuperação + reparação Blender não equivale a nova geração Pixal. O runtime isolado iniciado para o trabalho foi encerrado; ComfyUI habitual e dados do jogo preservados.
