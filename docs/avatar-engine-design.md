# Motor de aparência — proposta para Void Sun

Estado: contrato de produção proposto. A versão 3.11.0 tem uma prova humana 3D isolada de malhas/esqueleto/medidas/peças em `src/ui/sample3d/`; veja `docs/arena3d-sample.md`. Essa prova não implementa o catálogo completo, importador, raças ou migração. A prancha characters-builds-v3.png serve somente para avaliação visual. A prévia modular rejeitada continua desativada.

## Estado atualizado após o retorno sobre a 3.12.0

A prova humana 3D anterior foi rejeitada. A prova 2D de oito vistas da 3.12.0 também **não validou o contrato**: peitoral oculta braços, peças não compartilham exatamente a orientação e a caminhada não tem fases convincentes. Ver `docs/revisao-visual-3.12.md`. Âncoras estimadas e desenhos separados não bastam; uma direção nominal não assegura perspectiva comum. Não ampliar os recursos nem anunciar encaixe universal. Dezesseis vistas e alternativas de autoria/rig aguardam avaliação numa amostra pequena; esta sessão foi somente análise e documentação.

## O que existe e precisa mudar

O catálogo LPC distingue male, female e muscular, mas 19 raças são principalmente cabeças sobrepostas. Somente skeleton e zombie possuem frames corporais específicos. HeroCreator.chooseRace modifica cabeça, pele e acessórios; AppearancePicker aplica a mesma separação. Isso não atende à anatomia própria de orcs, goblins, minotauros, lobisomens e outras espécies.

O compositor experimental modern.ts recebe uma única imagem por peça, sem variantes por anatomia. O preparador de camadas anterior usa caixas estimadas por categoria para redimensionar e posicionar imagens. Esse método não será o contrato de produção: ele causa mudanças de escala, cabelos excessivos e sobreposições incorretas. A ordem das vistas também deve ser declarada por atlas, nunca presumida pelo consumidor.

## Estrutura de produção

Separar a identidade visual do personagem em espécie, anatomia, constituição, apresentação corporal, aparência cosmética e equipamento. Preservar os identificadores dos cosméticos e equipamentos existentes para não perder escolhas salvas. A migração de body/head/frame/race precisa ser explícita e versionada; ancestralidade de regras e espécie visual continuam escolhas relacionadas, mas não devem ser confundidas silenciosamente.

Uma base anatômica inclui a silhueta corporal completa, proporções, cabeça, mãos, pés e animações. Normal, atlético e musculoso são constituições com encaixes próprios, não o mesmo PNG esticado. Cada espécie mantém as formas aprovadas para ela. Famílias podem compartilhar o contrato de movimentos e os nomes das articulações, sem obrigar suas silhuetas a serem humanas.

Famílias iniciais para validar, não catálogo final aprovado:

| Família | Anatomia que deve ser avaliada | Variações necessárias |
| --- | --- | --- |
| Humanoide | humanos e espécies próximas, preservando diferenças próprias | normal, atlético, musculoso; apresentações masculina/feminina |
| Humanoide robusto | orcs e trolls, tronco, postura, mãos e cabeça próprios | tamanhos e constituições próprios |
| Corpo pequeno | goblins e outras espécies baixas | escala e proporções próprias, não miniatura humana |
| Reptiliana | draconatos, focinho, cauda, pés e mãos próprios | encaixes de elmo, luvas e botas |
| Bestial | lobisomens, minotauros e demais animais antropomorfos | famílias separadas conforme pernas, focinho, cascos e patas |
| Óssea e outras | esqueleto, morto-vivo, constructo e ser do vazio | corpo completo com detalhes específicos |
| Demoníaca | demônios e variações escolhidas | anatomia aprovada, pontos próprios para chifres, cauda e asas |

Não inferir cascos, pernas digitígradas ou asas para toda uma raça automaticamente: aprovar sua anatomia antes de definir o rig. Completar as demais espécies existentes sem remover opções atuais.

## Contrato de encaixe

Cada rig versionado declara as oito direções por nome e as animações por quadros, duração, fase de contato e eventos. Por quadro há âncoras de cabeça, pescoço, ombros, cintura, mãos, pés, costas, cauda e asas. Cabelo ainda precisa do contorno do crânio e linha da testa; posicionar apenas pelo centro não garante encaixe.

Uma peça declara família e constituições compatíveis, variante visual, ponto de fixação, pivô local, quadros correspondentes, regiões cobertas, máscaras de recorte e ordem das camadas por direção. A resolução seleciona a variante exata usando o rig do personagem. Equipar apenas escolhe a peça; nenhuma coordenada é editada na ficha do herói.

A malha de pixel e a escala são fixadas por rig e partilhadas pelas peças. A base experimental atual usa quadros físicos de 128 pixels, densidade 2 e pés em (64,112); esses valores são candidatos a validar com a arte aprovada, não licença para redimensionar qualquer fonte até caber. Armas largas e asas podem ter quadros maiores com pivôs explícitos e margens suficientes.

Armas, joias e outros acessórios rígidos podem compartilhar desenhos quando a perspectiva e o encaixe forem compatíveis. Armaduras, mangas, calças, elmos e botas precisam de variantes quando a superfície corporal muda. Um elmo para cabeça com focinho não vira um elmo humano deformado. Preparar essas variantes uma vez na criação do item elimina ajustes repetidos por personagem; não elimina o trabalho artístico necessário para uma nova anatomia.

Separar cabelo atrás/à frente, mangas, mãos, partes de capa e equipamento quando atravessarem diferentes planos do corpo. Máscaras impedem cabelo de invadir a face ou atravessar um elmo; o comportamento de chifres, asas e caudas com roupas é declarado no item. A mão secundária usa sua âncora e vista corretas, não espelhamento arbitrário da arma principal.

Os itens e seus efeitos de regras continuam equipados quando o jogador escolhe o cosmético. O resolvedor visual usa ou a aparência cosmética salva ou a aparência dos itens equipados, conservando anatomia, pele e traços biológicos. O compositor não altera os dados salvos.

## Importação e validação

Cadastrar novos recursos como pacotes de arte com imagem, metadados e variante de rig. Um importador valida dimensões, pivôs, identificadores, versões, direções, sequência de animação, cobertura de constituições e existência de máscaras antes de aceitar o pacote. Nada de selecionar outra peça parecida como substituto silencioso.

O catálogo publicado deve conter as variantes necessárias para todas as bases que oferece como compatíveis. Falta de variante bloqueia a publicação daquele pacote e informa qual desenho falta. Uma opção artística deliberada, como esconder cabelo sob elmo fechado, é uma regra explícita, nunca ausência de arquivo.

Gerar uma galeria de inspeção com vistas, movimentos e combinações extremas: cabelo curto/longo com elmo, barba com gola, chifres com elmo, cauda com calça, asas com capa, arma e escudo, dois anéis e duas armas. Conferir corpos normal/atlético/musculoso e cada família anatômica. Testes automáticos verificam integridade e limites; revisão visual ainda verifica a qualidade e o contato anatômico. Não prometer que qualquer PNG externo será adaptado perfeitamente sem preparação.

Compor e recolorir somente quando aparência ou equipamento mudarem. Cache limitado por rig, peças, cores e animação. Durante a batalha, reutilizar os quadros preparados em vez de remontar peças a cada atualização.

## Sequência controlada

1. Aprovar os rostos e as três constituições da prancha humana.
2. Fazer uma prova pequena de encaixe: uma base, um cabelo, uma armadura, um elmo e uma arma nas oito vistas e em movimento.
3. Testar o mesmo pacote em normal e musculoso, com variantes explícitas, antes de expandir.
4. Aprovar uma amostra de anatomia não humana e repetir a prova de encaixe.
5. Implementar o contrato, importador, resolvedor, validação e migração; só então produzir o restante do catálogo em lotes pequenos.

Critério de sucesso: cadastrar um novo pacote correto pelo contrato deve bastar para que seus recursos se encaixem em qualquer personagem dos rigs compatíveis, sem alterações por herói e sem deformar pixel art.
