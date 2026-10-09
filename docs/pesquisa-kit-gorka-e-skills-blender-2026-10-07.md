# Pesquisa: Gorka AI Game Dev Kit e alternativa para Void Sun

Data: 7 de outubro de 2026. Esta é uma investigação e proposta; nenhum pacote foi instalado e nenhum asset foi gerado nesta etapa. Atualizado para incluir o plano de efeitos visuais com Effekseer e orientação de instalação para o Claude.

## Método e limites

Inspecionei o HTML público do site do kit, dez quadros do vídeo local “Opus 5.5 Just Took Over Blender.mp4” (45, 130, 180, 205, 250, 280, 315, 370, 440 e 568 segundos), documentação pública, árvores de arquivos e licenças de três repositórios gratuitos. Também li o validador da alternativa de majidmanzarpour. Não assisti integralmente ao vídeo nem acessei o conteúdo vendido. Os números e funcionalidades do kit comercial são anúncios do vendedor, não resultados reproduzidos por nós.

## O que o pacote comercial anuncia

A [página do Gorka Games](https://kit.gorkachallenge.com/) anuncia a versão 1.0 por US$ 19, pagamento único, com cinco workflows, sete comandos e 32 scripts auxiliares. A assinatura do Claude é separada.

Os cinco fluxos são: referência para cena Blender; cena para nível jogável Unreal; folha de referências para objetos individuais e apresentação; roupas/armaduras para o Mannequin da Unreal; animações para esse Mannequin. O instalador integra Claude, Blender MCP e uma ponte própria para executar Python na Unreal. São anunciados Windows/macOS; Linux não é listado. A integração Unreal não atende diretamente ao jogo atual, que usa Svelte/Three/Electron.

No [vídeo](https://www.youtube.com/watch?v=F0GadTErfxs&t=250s), a instalação identifica o plugin `gamedev-kit@gorka-games` e as skills `blender-asset-pack` e `blender-scene-builder`, além de duas skills de Mannequin sem nomes legíveis nos quadros analisados. Aos 440 segundos, aparecem objetos separados no Blender; aos 568, um showcase na Unreal. Isso evidencia a demonstração de props, mas não comprova qualidade de anatomia, encaixe ou animação dos nossos personagens.

O componente aberto identificado pelo próprio vendedor é o [mcp-for-blender](https://github.com/ahujasid/mcp-for-blender), licença MIT. Ele conecta a IA ao Blender; não é, por si só, um gerador de modelos nem um sistema de direção artística. A instalação mostrada no vídeo cita a versão 2.1.8.

Não encontrei uma cópia pública identificável das skills vendidas. Não há evidência suficiente para concluir que o autor apenas compilou os repositórios abaixo. Não conhecemos os nomes/conteúdos dos 32 scripts ou dos sete comandos.

## Alternativas abertas verificadas

| Projeto | Conteúdo observado | Uso para Void Sun |
|---|---|---|
| [majidmanzarpour/blender-game-skills](https://github.com/majidmanzarpour/blender-game-skills) | MIT; uma skill, oito scripts auxiliares e um template Python | Melhor base inicial para referência, revisão visual, validação, exportação e reimportação |
| [arjun988/blender-skills](https://github.com/arjun988/blender-skills) | MIT; 94 skills únicas, espelhadas para Claude/Cursor; sem scripts Python auxiliares na árvore inspecionada | Biblioteca de orientações para selecionar módulos específicos de modelagem, materiais, rig e ambientes |
| [RobLe3/cc-blender-skill](https://github.com/RobLe3/cc-blender-skill) | MIT; 30 skills no plugin, módulos de referência, animação, exportação e revisão | Complementos para o fluxo; algumas alternativas propostas usam serviços externos, que devem ser excluídos do nosso fluxo gratuito |

Revisões inspecionadas, para reprodução:

- majidmanzarpour: `f0ef29385a03de139957e6f700b801cdc00b7e29`.
- arjun988: `8f778d2405a214b508d4c7d80742be8e43acdd52`.
- RobLe3: `11016c9a5847897491dde935c346571bd7548e3d`.

Não instalei nem executei esses projetos. A contagem de arquivos não prova qualidade. As skills orientam a IA e usam ferramentas; não contêm automaticamente um artista treinado ou um personagem pronto. O próprio README do RobLe3 distingue correção técnica de qualidade estética e reconhece limitações na criação de rostos humanos a partir de primitivas.

### Lacuna concreta de validação

O [validate.py inspecionado](https://github.com/majidmanzarpour/blender-game-skills/blob/f0ef29385a03de139957e6f700b801cdc00b7e29/skills/blender-image-to-3d/scripts/validate.py) verifica orçamento de triângulos, UV quando solicitado, pesos e escala. Entretanto, bordas abertas no corpo comum não são necessariamente falhas; fechamento obrigatório é aplicado a colisores. Coleções solicitadas ausentes ou vazias também precisam de uma verificação adicional explícita. Logo, não devemos confiar nesse script isoladamente para impedir o buraco na axila ou aceitar uma exportação sem partes esperadas.

## Nosso kit proposto

Um pacote pequeno, com sete skills carregadas conforme a tarefa, evita jogar dezenas de instruções simultaneamente no contexto. Deve funcionar com Claude e Codex, preservando atribuições/licenças MIT de qualquer componente reaproveitado.

1. **Direção e inventário.** Ler a imagem, identificar cada objeto, registrar estilo, escala, paleta, vistas disponíveis e partes inferidas. Definir quantidade e critérios de aceitação antes de gerar.
2. **Props e ambientes.** Construir um script reproduzível por asset no Blender, com componentes reutilizáveis, pivô e materiais. Produzir objetos separados; não usar uma imagem como substituto da geometria. Vegetação, água e destruição exigem fluxos próprios de animação e execução no jogo.
3. **Corpo e equipamento.** Trabalhar sobre uma base limpa e um esqueleto compartilhado. Armaduras rígidas e roupas deformáveis usam tratamentos distintos. Definir famílias de corpo e compatibilidade explícita; não prometer encaixe universal entre humanos e raças de anatomias diferentes.
4. **Animação.** Usar ações compartilhadas e eventos de habilidade ligados à mão/osso correto. Avaliar contato dos pés, troca de apoio, quadril, tronco, transições e poses extremas. Scripts não substituem a revisão visual do movimento.
5. **Revisão e correção.** Renderizar na câmera e no tamanho real do jogo, em vários ângulos e poses. Comparar com a referência. Rejeitar partes ausentes, pele/olhos incoerentes, buracos indevidos, interseções e roupas com orientação errada. Preservar uma base corporal completa no arquivo mestre; eventual ocultação no jogo deve respeitar cada combinação de equipamentos.
6. **Entrega e teste.** Salvar `.blend`, `.glb` individual, texturas, imagens de revisão e manifesto com dimensões, pivô e compatibilidade. Reimportar o arquivo exportado no Blender e testar no visualizador Three do jogo, não apenas confiar no arquivo de trabalho.

7. **Efeitos visuais.** Criar receitas editáveis de magias, ataques e auras; sincronizar com eventos de animação e avaliar dentro do mesmo processo de pixelização do mundo. Usar Effekseer, Blender e o código do jogo nas responsabilidades descritas abaixo.

O Blender pode ser controlado por Python em modo headless, como já fazemos. O MCP é opcional para inspeção/interação no editor. Não precisamos migrar para Unreal ou comprar o kit para reproduzir esse princípio de trabalho.

## Primeiro piloto recomendado

Antes de personagens ou pacotes grandes, validar três props de uma referência pequena: caixa de madeira quebrável, barril e coluna de pedra. A caixa testa separação em peças; a coluna testa escala e encaixe no chão; o barril testa forma e materiais. A destruição completa só estará comprovada quando os fragmentos funcionarem dentro do jogo.

Para cada objeto: referência/inventário → modelagem → revisão em vários ângulos → render no tamanho de gameplay → exportação → reimportação → visualização no microambiente. Rodar uma tarefa pesada por vez, salvar checkpoints e limitar as tentativas de correção. Quando a mesma falha persistir, registrar a causa e interromper a repetição automática.

Somente depois de aprovar esse fluxo, voltar a um personagem com uma roupa, botas e uma habilidade. A qualidade artística deve ser validada em amostras pequenas pelo usuário antes de ampliar a produção. Automatização da execução é viável; aprovação estética não deve ser presumida por um relatório numérico.

## Efeitos visuais: Effekseer, Blender e integração no jogo

### Direção escolhida e limites da pesquisa

Recomendação: usar **Effekseer como ferramenta principal de autoria de efeitos**, complementado por Blender e pelo código/shaders do Void Sun. A [ferramenta oficial](https://effekseer.github.io/en/) é gratuita e aberta, com efeitos de partículas e modelos. O [runtime oficial para navegador](https://github.com/effekseer/EffekseerForWeb) documenta integração com Three.js. Isso permite investigar a integração no jogo atual sem migrar de engine. Não significa que ela já esteja instalada, testada ou compatível com todos os nossos passes de renderização.

O vídeo da [postagem enviada pelo usuário](https://x.com/KanaWorks_AI/status/2107752774423511539) não pôde ser visualizado diretamente nesta pesquisa. Não foi confirmado qual ponte o autor utilizou, se publicou seu código ou se seu fluxo funciona no Linux.

Foi encontrado o projeto aberto [effekseer-ai](https://github.com/laodeng000/effekseer-ai), licença MIT, com CLI e servidor MCP para criar documentos, editar componentes/propriedades e exportar efeitos. Sua configuração verificada pelo mantenedor é **Windows, Effekseer 1.80.6, Python 3.11+ e .NET 9**, utilizando `EffekseerCore.dll`. Não tratar essa ponte como compatível com nosso Linux sem teste. A [distribuição oficial do editor](https://effekseer.github.io/en/download.html) inclui Linux; editor Linux e ponte de automação Windows são componentes diferentes.

### Responsabilidades

| Componente | Responsabilidade |
|---|---|
| Effekseer | Projéteis mágicos, cortes e rastros, clarões, impactos, escudos, auras, buffs, fumaça e partículas das explosões |
| Blender | Modelos/texturas utilizados nos efeitos e preparação de objetos com fragmentos separados |
| Código/shaders do jogo | Água e lava, vento na vegetação, luzes no ambiente, trajetória e colisão de destroços, sincronização com gameplay |

Uma caixa destruída precisa de tábuas reais preparadas no Blender e lançadas pelo jogo, além de clarão, poeira e faíscas no Effekseer. Uma animação visual de explosão não substitui fragmentação e colisão. Os acontecimentos do jogo comandam os efeitos; a quantidade de partículas ou o tempo de renderização não determina dano ou resultado da batalha.

### Integração artística: uma mesma pixelização para mundo e efeitos

Esta é uma exigência de implementação e revisão, ainda não um resultado comprovado:

- Renderizar mundo e efeitos no mesmo processo de pixelização, com tamanho de pixel coerente. Não colocar os efeitos em um canvas de alta resolução por cima da imagem pixelizada do mundo.
- Inspecionar a arquitetura atual antes de integrar. O runtime deve desenhar no alvo de renderização apropriado, utilizando câmera, escala e profundidade coerentes; então a composição passa pela pixelização final. Validar o compartilhamento do contexto e restaurar o estado gráfico do Three conforme a documentação da versão escolhida.
- Controlar paleta, filtragem das texturas, contraste e formas. Evitar partículas borradas e halos que eliminem o desenho dos pixels. Luz e bloom precisam ser avaliados na composição final; configurações bonitas no editor não comprovam o resultado no jogo.
- Manter trajetórias e animações fluidas. Pixelizar a aparência não significa reduzir arbitrariamente a frequência da simulação ou criar movimentos travados.
- Validar oclusão: um efeito atrás de uma parede/personagem deve respeitar a profundidade quando pertinente. Escudos, transparências, distorção e interseções exigem inspeção em vários ângulos.
- Desenhar cada habilidade com composição, silhueta, ritmo e identidade próprios. Uma única animação recolorida não atende à variedade artística desejada.
- Preservar a leitura dos personagens, slots e alvos; o efeito não deve esconder o campo inteiro nem pixelizar a interface de cartas e textos junto com o mundo.

A [documentação de renderização](https://effekseer.github.io/Help_Tool/en/ToolReference/rendererCommon.html) descreve filtragem, mistura, profundidade e animação de texturas. [Soft particles e outros recursos avançados](https://effekseer.github.io/Helps/18x/Tool/en/ToolReference/rendererCommonAd.html) dependem do suporte do ambiente de execução. Não assumir que todos os recursos do editor serão reproduzidos no runtime web sem validação.

### Fluxo automatizado proposto

**Descrição da habilidade → receita editável → criação/exportação → execução no microambiente do jogo → captura de vários momentos e ângulos → revisão pela IA → correção → aprovação visual do usuário.**

Cada receita deve registrar identidade, paleta, tamanho, duração, origem, alvo/trajetória, fases de preparação/lançamento/impacto/dissipação, recursos e parâmetros de qualidade. Salvar o documento-fonte editável, texturas/modelos necessários, arquivos de runtime e imagens/vídeos de revisão. Fixar versões e registrar a origem/licença dos recursos.

Ligar preparação e lançamento aos eventos da animação do personagem. Usar o osso/socket da mão ou arma correta e fazer o impacto coincidir com a chegada ao alvo. Não repetir o problema anterior de carregar uma magia em uma mão e lançar com a outra por erro de integração. Definir se cada componente acompanha o personagem ou permanece no ponto do mundo após ser emitido.

A revisão deve capturar antecipação, lançamento, deslocamento, impacto e dissipação, além de reproduzir a sequência completa. Imagens isoladas não provam boa animação. Testar câmera contínua, ângulos fixos e zoom, olhando o resultado no tamanho real de gameplay.

Rodar tarefas pesadas sequencialmente, manter checkpoints e limitar ciclos de correção. Interromper repetição que não elimina a mesma falha e registrar a causa. Não gerar dezenas de efeitos antes de validar o piloto.

### Três amostras obrigatórias

| Amostra | Identidade proposta | O que precisa comprovar |
|---|---|---|
| Corte de espada | Arco curto legível, rastro que acompanha a lâmina e impacto breve | Encaixe na arma, orientação do corte, sincronização do contato e leitura em vários ângulos |
| Projétil do Vazio | Núcleo escuro com energia violeta, rastro próprio e dissipação característica | Origem na mão correta, trajetória fluida, chegada ao alvo e impacto sincronizado |
| Escudo mágico | Forma envolvente legível, ativação, sustentação e término próprios | Encaixe no corpo, transparência/profundidade, acompanhamento do personagem e leitura ao girar a câmera |

Essas identidades são direções para o teste, não artes já aprovadas. O objetivo é comprovar três tipos distintos: efeito preso à arma, efeito que viaja pelo mundo e efeito envolvendo o corpo. A aprovação precede a expansão para cura, fogo, gelo, veneno, encantamentos e demais habilidades.

### Desempenho e aceitação

Comparar o microambiente sem efeitos com um efeito e com várias instâncias simultâneas. Registrar tempo de frame, consumo de memória, quantidade de partículas/draw calls quando disponíveis e limite de efeitos ativos. Definir o orçamento a partir de medições e de aparelhos-alvo; compatibilidade mobile não é garantia de desempenho mobile.

Criar perfis de qualidade que reduzam partículas secundárias, distorção e custos de transparência preservando identidade e informação de gameplay. Limpar instâncias finalizadas, liberar recursos ao sair da amostra e compartilhar recursos repetidos. Interromper a avaliação se houver consumo excessivo ou instabilidade; o computador já congelou durante uma etapa anterior do projeto.

Aceitar o piloto somente quando: os três efeitos forem editáveis/reproduzíveis; origem e eventos estiverem corretos; pixelização/paleta forem coerentes com o mundo; rotação/zoom não revelarem falhas relevantes; movimento e sequência completa tiverem revisão visual; recursos forem carregados sem erros; e desempenho tiver medições. Separar explicitamente **compilado**, **executado**, **visualmente inspecionado** e **aprovado pelo usuário**.

## Sequência para instalação e continuidade pelo Claude

1. Confirmar o checkout atual, ler as instruções do projeto e inspecionar os componentes já instalados. O caminho usado nesta atualização é `/home/djabo/Downloads/Void Sun`; não presumir que o caminho antigo `Darkstar Forge` ainda exista. Preservar alterações em andamento.
2. Preparar a base Blender com scripts de revisão/exportação selecionados. Não instalar automaticamente todas as 94 skills nem carregar todos os pacotes juntos. Conservar licenças e fixar revisões. Serviços pagos e downloads opcionais de assets não fazem parte do plano gratuito.
3. Se usar Blender MCP, manter a conexão local e desativar telemetria; controle Python/headless continua sendo uma alternativa válida. A ponte Unreal do pacote comercial não é necessária.
4. Instalar uma versão oficial compatível do editor Effekseer para Linux e selecionar o runtime web correspondente. Verificar versões dos formatos exportados, materiais e recursos, além do carregamento do WebAssembly no ambiente do jogo.
5. **Resolver a automação no Linux como teste de viabilidade separado.** Não instalar a ponte `effekseer-ai` assumindo compatibilidade. Verificar se há suporte Linux comprovado ou se uma ponte pequena baseada nas APIs/fontes oficiais é viável. A [CLI oficial](https://effekseer.github.io/Helps/18x/Tool/en/ToolReference/index.html) oferece operações de conversão/exportação, mas isso não comprova autoria completa de efeitos por IA. Se a etapa de autoria depender de Windows, registrar a limitação e apresentar a alternativa concreta antes de introduzir Wine, máquina virtual ou uma mudança de plataforma.
6. Integrar primeiro um efeito simples oficial, com licença conferida, para verificar câmera, profundidade, alvo de renderização, pixelização e encerramento. Ele serve apenas como teste técnico; não substitui as três amostras autorais.
7. Produzir o piloto de três props e as três amostras de efeitos em etapas pequenas. Guardar fontes editáveis e revisar no microambiente real. Não substituir em massa as artes/efeitos atuais nem migrar o jogo de engine durante esse teste.
8. Entregar uma instrução simples de acesso pelo atalho normal do usuário, capturas e relatório de aceitação. Não considerar suficiente funcionar somente no navegador aberto pelo agente.

Esta atualização registra o direcionamento para o próximo agente; não executa instalações ou mudanças no jogo. Ferramentas gratuitas não eliminam o consumo de créditos do Claude/Codex. A automação de efeitos em Linux e a qualidade final ainda dependem do teste descrito acima.

## Recomendação

Criar nosso pacote adaptado ao Void Sun usando a infraestrutura de revisão/exportação aberta como ponto de partida e orientações selecionadas dos demais projetos. O valor do kit comercial está na organização dos fluxos e integração demonstrada, além da ponte gratuita. Não é preciso acessar ou copiar seus arquivos privados para construir uma alternativa funcional. As ferramentas podem ser gratuitas e locais; o uso de Claude/Codex continuará sujeito aos créditos da conta. Acrescentar Effekseer ao kit de efeitos, com Blender e shaders do jogo como complementos. A viabilidade artística e técnica ainda precisa ser comprovada pelos pilotos, principalmente para personagens, animações, automação de efeitos no Linux e composição pixelizada dentro do jogo.
