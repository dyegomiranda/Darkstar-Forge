# Elmo — rascunhos visuais, 08/10/2026

**STATUS: NÃO APROVADO PARA CONVERSÃO/ENCAIXE 3D.**

Pedido original: [PROMPT-CHATGPT.md](../PROMPT-CHATGPT.md). Foram geradas apenas frente e costas do elmo, por edição com image_gen integrado. Não foram produzidas outras peças nem alterado o jogo.

## Arquivos

- `elmo-frente-rascunho.png`: desenho frontal do elmo, rosto aberto.
- `elmo-costas-rascunho.png`: vista traseira após uma tentativa de corrigir o alinhamento.
- `prompts.json`: prompts exatos utilizados, modo e decisão de escopo.

Aço cinza neutro com borda dourada; sem azul no elmo, chifres ou plumas. O cinza neutro resolve o conflito entre “aço cinza-azulado” e a regra explícita de não usar azul na peça.

## Falhas verificadas — não anunciar como entrega pronta

1. A ferramenta retornou **1254 × 1254**, embora o prompt pedisse 1024 × 1024.
2. O molde não foi conservado pixel a pixel. A comparação abaixo normaliza SOMENTE em memória para medição; os arquivos salvos são os originais da geração, sem redimensionamento ou composição posterior.
3. Frente: limites do corpo azul normalizados ficam em x=152–872 e pés em y=921; original x=151–872 e y=921. Há alterações de iluminação/cor e contorno fora do elmo.
4. Costas: limites do corpo azul normalizados ficam em x=145–878 e pés em y=911; original x=151–872 e y=921. O corpo foi alargado/deslocado pela geração.
5. A correção solicitando preservação integral do molde não resolveu a divergência traseira.

Portanto, estes PNGs servem **somente para avaliar o desenho do elmo**. Não são moldes geométricos confiáveis nem provam folga uniforme/encaixe tridimensional. Não substituir os moldes originais e não passar esses rascunhos diretamente ao Pixal3D como peças finais.

## Ponto de parada

Parar aqui, conforme o pedido de mostrar somente o elmo antes de outras peças e a ordem de qualidade em AGENTS.md. Não gerar ombreiras, peitoral, braçadeiras, cinturão ou botas a partir deste resultado. Não gastar novas gerações repetindo uma limitação de preservação já observada.

Para alcançar a invariância exigida, o fluxo posterior precisa manter o manequim como base imutável e trabalhar a peça em uma camada/máscara controlada, verificando dimensões e orientação antes da reconstrução 3D.

