# Void Sun — direção de arte e movimento

Referência escolhida: Sword of Convallaria, pelo acabamento do pixel art, personagens expressivos e integração entre sprites e iluminação. Referência oficial: https://store.steampowered.com/app/2526380/Sword_of_Convallaria/ . Criar personagens e ambientes próprios do universo de Void Sun.

## Alvo visual

Silhuetas legíveis, proporções consistentes entre personagens, animações desenhadas quadro a quadro, paleta controlada e materiais distinguíveis. Preservar pixels nítidos nos sprites; iluminação, sombra de contato e atmosfera devem reforçar volume sem apagar contornos. Evitar excesso de brilho que esconda equipamento ou sinais de gameplay. Cenários e personagens precisam compartilhar perspectiva, escala e direção de luz.

## Movimento

O alvo de produção é oito vistas reais: N, NE, E, SE, S, SW, W, NW. Andar em diagonal mantém a mesma velocidade linear que andar nos eixos. Andar, correr, parar e atacar devem ter transições claras e pés estáveis no chão. Preferir animação de corrida própria em vez de apenas acelerar a caminhada.

O acervo LPC atual possui quatro vistas; deslocamento diagonal na vila já existe. A direção lógica agora usa oito setores, mas o desenho diagonal ainda usa a vista lateral mais próxima. Isso é compatibilidade temporária, não um sprite diagonal pronto. O renderer aceita a ordem explícita de linhas em atlas futuros; o compositor e todas as camadas precisam receber os novos atlas juntos antes de ativar oito vistas reais. Não distorcer ou rotacionar um boneco de quatro vistas para fingir novas vistas.

## Equipamentos e aparência

Padrão: visual escolhido pelo jogador. “Mostrar itens equipados” na ficha/inventário usa apenas camadas das cartas equipadas, preservando corpo, cabelo e traços biológicos. A aparência original continua salva e retorna ao desligar a opção. O modo visual não altera atributos.

A composição usa correspondências explícitas do catálogo e permite configurar camadas e cores no editor de equipamentos. Algumas peças compartilham sprites provisórios; anéis, instrumentos, livros, orbes e armas secundárias ainda precisam de camadas próprias. Espaços vazios ou sem sprite não herdam a roupa cosmética. Duas mãos bloqueiam o visual da mão secundária, como já acontece nos atributos.

## Produção dos novos assets

Primeira entrega artística: um personagem completo, um conjunto de armadura, uma arma e um cenário pequeno na mesma perspectiva, com idle/walk/attack nas oito vistas. Validar em movimento antes de ampliar o catálogo. Cada camada deve informar tamanho do quadro, pivô dos pés, ordem das direções, quadros por animação e ordem de sobreposição por direção. Todos os equipamentos precisam acompanhar os mesmos pivôs e quadros do corpo. Testar encaixe em todas as vistas, leitura em tamanho de jogo, ausência de tremor, colisão e custo de composição.

O jogo ainda não atingiu o acabamento gráfico da referência; esta atualização organiza o comportamento e o contrato necessário para produzir essa arte com consistência.

## Entrega visual 3.9.9

- Santuário do Sol Velado: cenário original com pedra, vegetação, profundidade atmosférica e sol eclipsado. Novo padrão para perfis sem escolha de cenário; escolhas anteriores são preservadas.
- Atlas original de quatro casas e quatro árvores com transparência. A vila recorta as células, ajusta suas margens e mantém pivôs, posição de chão e colisão. Piso com caminho de pedras, margens do lago, flores e sombras de contato; árvores e casas ocultam os personagens segundo a altura dos pés.
- Luz quente/fria, vinheta discreta, raios e partículas por ambiente. Neve na tundra, brasas no vulcão, partículas suaves nos demais; a mesa escura continua disponível. As cartas e indicadores não recebem recoloração.
- Prévia do herói no santuário, com base e iluminação de contorno. Equipamentos e aparência continuam funcionando em camadas.
- Corrida sincroniza a cadência de caminhada com a velocidade. Andar contra obstáculos para a animação. Conversas aparecem acima das copas. Cliques na vila levam em conta o tamanho efetivamente desenhado, inclusive com escala da interface.
- Qualidade alta: 24 partículas; média: 10; baixa: sem partículas/raios. Reduzir movimentos e a preferência do sistema congelam as partículas. Animação de ambiente é interrompida quando a janela está oculta. Pisos e objetos são rasterizados uma única vez; nenhum filtro de desfoque é aplicado às casas, árvores ou bonecos.

Os dois assets foram gerados como arte original e revisados dentro do jogo. Os PNGs originais estão em public/cenarios/santuario.png e public/cenarios/vila-atlas.png. Não foram usados assets de Sword of Convallaria. A iluminação é uma composição 2D; não é um renderer 3D/HDR. Novas vistas diagonais desenhadas dos personagens e camadas de equipamento continuam pendentes. O acervo LPC mantém seus créditos e seu estilo próprios.

## Entrega 3.10.0 — piso, catálogo e referência revisada

A referência direta para as cartas passa a ser as duas pranchas que o jogador escolheu nesta sessão: `tools/art/source-atlases/cards-00.png` e `cards-09.png`. Manter blocos de pixels visíveis, rostos pequenos e simplificados, figuras compactas em relação ao cenário e materiais naturais. Versões com olhos grandes, aparência infantil e acabamento de ilustração anime foram descartadas antes da integração.

- 254 ilustrações verticais: 182 habilidades/itens/invocações, incluindo as cartas do dragão, e 72 equipamentos oficiais, incluindo o conjunto antigo. Arquivos em `public/art/rework/cards/`. Todo o catálogo jogável pré-definido tem ilustração. Cartas de exemplo do editor e criações do jogador preservam suas próprias imagens.
- Composição full art de 5:7: o cenário cobre a carta inteira. Personagem, item e ação principal ocupam a parte superior; a região inferior continua o ambiente atrás da caixa de regras. Conferência com o desenho real de títulos, custos e regras, sem criar uma janela quadrada para a arte.
- As artes oficiais antigas são reconhecidas pelo hash da mídia. Imagens enviadas pelo jogador são preservadas, inclusive em equipamentos. A mudança visual não regrava decks ou mídias dos backups; o cache é invalidado pela versão do desenho.
- Sete heróis pré-definidos recebem atlas originais em oito vistas, com quadros de caminhada e ataque. Arquivos usados no jogo: `public/art/rework/heroFrames/`. Quadros de 64×64 e pivô dos pés (32,56) são preparados previamente para reduzir carregamento e evitar análise de transparência em cada abertura. As pranchas grandes ficam na pasta de produção.
- Dezesseis figuras de criaturas/máquinas, incluindo o guardião do tutorial e o dragão, usam vistas de frente e costas e quadros de ataque. Nem todas têm oito vistas: as figuras do campo não usam caminhada livre. Esqueleto e zumbi ainda compartilham a figura identificada pelo ícone, como no catálogo atual.
- Nove cenários novos em perspectiva elevada, com chão central livre. Os slots são ladrilhos projetados com espessura, sombra de contato e cor por ambiente. Pés dos heróis ficam ancorados à superfície; posicionamento e batalha usam os mesmos pisos. Árvores, paredes e arcos ficam no contorno da área jogável.

As aparências personalizadas e o modo Mostrar itens equipados continuam usando o compositor LPC de camadas. Esse acervo ainda precisa de novas camadas compatíveis para completar o rework de toda a personalização; não substituímos escolhas de roupa por personagens fixos. As novas figuras dos heróis são usadas somente quando a aparência corresponde exatamente a um dos sete presets.

## Origem e reprodução

As imagens selecionadas foram produzidas com a ferramenta integrada de geração de imagens (skill imagegen), como arte original. Os prompts finais de cada prancha, seus assuntos e caminhos ficam em `tools/art/production.json`; criaturas em `tools/art/monsters.json`; cenários em `tools/art/scenes.json`. Os originais selecionados ficam em `tools/art/source-atlases/`. Os scripts de preparação só separam células, ajustam pivôs e geram os arquivos usados pelo renderer; não pintam personagens nem esticam as ilustrações. Pranchas descartadas não entram no aplicativo.

## Nitidez e substituição do Protótipo — 3.10.1

As 254 ilustrações são extraídas dos atlas aprovados em PNG sem perdas, na resolução nativa de cada célula. A imagem dentro do SVG usa `image-rendering: pixelated`: amplia os pixels sem suavizar suas bordas. O cache da carta completa passa a 1500 × 2100, preservando a definição de texto e molduras em inspeção e telas de maior densidade. Isso elimina a suavização adicional; não inventa detalhes além da resolução original dos atlas.

Projetos existentes recebem uma atualização única (`proto-art-rework-2`) que troca as referências de arte das cartas reconhecidas do catálogo Protótipo por arquivos novos, elimina a referência à mídia antiga nessas cartas e restaura o enquadramento full art. A atualização cobre também equipamentos e restauração de backups anteriores. Novos projetos já nascem com as referências atuais; não importam mais arquivos de `art/proto/`. Cartas originais do jogador fora do catálogo permanecem intactas. Após essa atualização, uploads feitos pelo jogador são preservados nas próximas aberturas. Os arquivos antigos do banco não são apagados, pois podem ser usados por outras cartas.

## Ilustrações individuais — 3.10.2

As células anteriores tinham apenas 261 × 365 pixels. A produção individual reconstrói as 254 ilustrações em aproximadamente 1060 × 1484 pixels, com pequenas variações entre saídas: quatro vezes mais resolução em cada dimensão, com novos detalhes desenhados na origem. Não é uma ampliação das células antigas. As composições aprovadas continuam como referência de assunto, ação, ambiente e paleta, em `tools/art/source-cards-low/`. Os arquivos usados pelo jogo ficam em `public/art/rework/cards-hd/`.

A ferramenta integrada de geração de imagens (skill imagegen) produziu as novas ilustrações. O prompt de produção e a procedência de cada imagem ficam em `tools/art/hd-production.json`. A orientação exige uma única imagem vertical full art, materiais em pequenos agrupamentos de pixels, figuras compactas, rostos discretos, ação principal acima da caixa de regras e ausência de bordas, linhas e textos.

Arte e cache da carta completa usam PNG sem perdas; o cache permanece em 1500 × 2100. O desenho da arte inclui uma margem mínima sob o recorte, e o contorno adicional do editor foi removido para evitar a linha lateral. Referências antigas a imagens oficiais são resolvidas para os arquivos atuais, inclusive em projetos já abertos. Imagens próprias enviadas pelo jogador continuam preservadas.

Somente as fontes ficam no cache permanente de dados embutidos; as ilustrações grandes não ganham uma segunda cópia permanente em base64 na memória. A ferramenta de extração dos atlas produz um manifesto de referência separado e não sobrescreve o catálogo de alta resolução.
