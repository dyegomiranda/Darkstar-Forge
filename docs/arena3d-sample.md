> Atualização de 07/10/2026: Brunhild 3D passa a ser o padrão apenas nesta amostra; a comparação 2D continua disponível. Ver `docs/amostra-personagem-3d-2026-10-07.md`.

# Pátio do Sol Ausente — personagem 2D em cenário 3D

**Versão 3.12.0, 05/10/2026.** Abra o atalho Void Sun do menu de aplicativos → **Amostra visual 3D** → **Modelos e equipamentos**.

O usuário rejeitou os modelos humanos 3D da 3.11.0: aparência genérica, animação rígida e elmo mal ajustado. A direção autorizada agora é uma prova pequena de **pixel art 2D com oito vistas reais dentro do mesmo cenário 3D**. Não reativar os modelos rejeitados como padrão. O registro técnico anterior está em `docs/archive/arena3d-sample-3.11.md`; seus testes não equivalem a aprovação artística.

## O que avaliar

Uma nova Brunhild humana adulta, corpo normal atlético, cabelo curto e roupa de viagem. Oito vistas em repouso, seis desenhos de caminhada por vista, peitoral, elmo e espada em camadas. Kael e o esqueleto continuam com seus visuais anteriores: são referência de integração, não parte do rework artístico desta prova. Não houve troca das cartas, catálogo do criador, heróis salvos, campanha ou regras de batalha.

- **Ver personagem de perto** abre a vista frontal.
- Oito botões da oficina enquadram frente, costas, perfis e quatro diagonais. Todos usam múltiplos de 45 graus, correspondendo aos giros fixos.
- **Iniciar caminhada** percorre um circuito curto com oito rumos. **Parar caminhada** retorna ao slot; mover manualmente também encerra o circuito.
- **Mostrar itens equipados** compara o visual cosmético com peitoral, elmo e espada. Cada peça pode ser ligada/desligada. Escolhas temporárias, sem gravar no personagem real.
- **Mover Brunhild** e clicar num slot continuam disponíveis. Fogo/gelo continuam usando Kael e os efeitos existentes.
- A opção **Usar amostra de personagem 2D** compara com o sprite anterior, sem oferecer os modelos 3D rejeitados.

A câmera do cenário continua girando e aproximando suavemente por arraste/roda/pinça. Clássica, Isométrica e passos de 45 graus foram preservados. O personagem troca entre vistas discretas; não anunciar perspectiva contínua ou dezesseis vistas. Ele foi desenhado para a inclinação tática da amostra, não para qualquer ângulo vertical extremo.

## Contrato desta base

`public/art/sample3d/directional/manifest.json` declara o rig `human-adult-sample-v1`, a ordem das vistas **s, se, e, ne, n, nw, w, sw**, os pivôs dos pés, head/chest/hand por quadro, máscaras de cobertura e dimensões das peças. Quadro 192×192, pés em (96,176). A arte usa escala única por folha, sem esticar membros ou espelhar vistas para fabricar direções.

Corpo e equipamento são compostos juntos nos mesmos quadros. A recomposição ocorre ao trocar equipamento, não em cada atualização. As peças usam três atlas com oito vistas; peitoral acompanha o tronco, espada acompanha a mão, e a variante de cabeça com elmo substitui a região coberta. A máscara também remove pixels de cabelo isolados e seu contorno escuro que sobravam nas laterais, com margem de dois pixels limitada à cabeça. Ordem de camadas considera a oclusão da mão direita. Um item pode estar oculto pelo corpo em certos ângulos, como numa vista lateral.

A fase da passada depende da distância percorrida, preservando continuidade ao girar a câmera. A direção usa o azimute real da câmera, inclusive quando ela está enquadrando um personagem fora da origem; pequena histerese evita alternância de duas vistas perto da fronteira angular. Caminhada foi desacelerada para este pacote e a entrada do movimento é suavizada.

**Limites reais:** uma família humana e três peças; não há catálogo universal, novas raças, troca de corpo, novos cabelos, golpe/conjuração novos para Brunhild ou importador de cosméticos. Não prometer que qualquer PNG ou peça servirá automaticamente. Nova anatomia e nova animação exigem seus desenhos e encaixes compatíveis. Aparência adulta, beleza e fluidez ainda precisam de avaliação do usuário. Testes técnicos não aprovam esses aspectos.

## Arte e reprodução

Arte original gerada com a ferramenta integrada `image_gen.imagegen`, com a prancha local `characters-builds-v3.png` como referência. Quatro chamadas: primeira caminhada descartada por repetição de poses; caminhada corrigida; oito vistas em repouso; vinte e quatro vistas de equipamento. Sem uso de sprites comerciais de Sword of Convallaria.

- Fontes e prompts exatos: `tools/art/directional-sample/`, `prompts.json`.
- Preparação: `prepare.py` recorta e organiza a transparência, usa redimensionamento por vizinho mais próximo, declara encaixes e cria máscaras de cobertura. Não repinta a arte nem adapta outra anatomia por deformação. Separadores do atlas corrigido são explícitos porque sua folha tem margens irregulares; revisar antes de aplicar a outra imagem.
- Revisão de todas as vistas e loop de caminhada: `review.py`, `fitting-review.png`, `walk-review.gif`.
- Recursos consumidos: `public/art/sample3d/directional/`.
- Integridade/animação: `directional.ts`; compositor e apresentação: `directionalCharacter.ts`; integração e circuito: `arena.ts`; câmera: `orbit.ts`; controles: `Sample3D.svelte`.

Reconstruir recursos com `rtk proxy python3 tools/art/directional-sample/prepare.py` e galeria com `rtk proxy python3 tools/art/directional-sample/review.py`. Dependências Python locais: Pillow e NumPy.

## Cenário e segurança de execução

O GLB do ambiente, água, vegetação e efeitos são os da etapa anterior. Esta entrega concentra o trabalho no personagem. Permanecem limites de resolução de quatro milhões de pixels, atualização a 60 fps, pausa ao ocultar e descarte de recursos ao sair. Esses limites não constituem garantia contra falhas de driver nem benchmark mobile.

## Verificação

`tests/arena3d-directional.test.ts` verifica integridade do pacote, pivôs, quadros/dimensões, rejeição de recursos incompletos, fase por distância e correspondência dos oito ângulos fixos inclusive fora da origem. Testes de formação/câmera continuam ativos.

`tools/arena3d/qa-directional.cjs` usa perfil temporário, entra pelo botão do menu, verifica oito vistas/equipamento, percorre os oito rumos/seis quadros, testa movimento entre slots, câmera e saída. `VOIDSUN_QA_PACKED=1` usa o mesmo lançador do atalho; `VOIDSUN_QA_ZOOM=1.35` verifica a escala de interface do usuário. Todas as janelas de QA são fechadas ao terminar.

Verificação concluída: typecheck, build, empacotamento e 174 testes passaram (3 pulados). O pacote direcional foi verificado novamente após a limpeza dos contornos. QA pelo lançador do atalho, em perfil isolado e interface 135%, percorreu oito vistas/seis quadros, equipamento, movimento, câmera e saída sem erros. Resultados e capturas em `tools/art/directional-sample/qa/`; aproximadamente 55 fps observados nesta máquina, sem aprovação artística implícita.
