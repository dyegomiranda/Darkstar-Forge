# Void Sun — revisão de qualidade e direção do jogo

Data: 4 de outubro de 2026. Projeto: `/home/djabo/Downloads/Void Sun`.

## Direção recomendada

Consolidar o Void Sun como RPG tático de cartas com heróis próprios e Jornada solo. O diferencial já existe: atributos, equipamento e posições no campo mudam o combate. O próximo investimento deve tornar essas decisões fáceis de entender e criar encontros que peçam estratégias diferentes. A direção visual desta rodada preserva a pixel art existente; a preferência do autor ainda não foi confirmada.

A pesquisa é qualitativa, feita em avaliações e discussões públicas. Ela aponta hipóteses para orientar desenvolvimento; não é pesquisa representativa de todos os jogadores e não demonstra que o Void Sun terá a mesma recepção.

## O que impressiona positivamente

| Prioridade | Evidência consultada | Aplicação no Void Sun |
|---|---|---|
| Decisões significativas e combinações | Discussão de jogadores sobre Slay the Spire e análise de Balatro | As classes precisam ter estilos distintos; posição, equipamento e seleção de cartas devem mudar o resultado. |
| Regras e interface legíveis | Jogadores destacam clareza e profundidade de Slay the Spire | Mostrar recursos em números, disponibilidade real de ações e explicações no momento da escolha. |
| Variedade entre partidas | Avaliações de Cobalt Core também criticam pouca variedade e estratégias dominantes | Diversificar chefes, padrões de inimigos, recompensas e caminhos; evitar que a Jornada apenas aumente números. |
| Feedback e personalidade | Análises de Balatro e Cobalt Core | Fazer cartas, impactos e sons comunicarem a jogada; preservar leitura do campo e permitir reduzir movimentos. |
| Balanceamento por iteração | Apresentação dos criadores de Slay the Spire na GDC | Testar com pessoas, medir resultados locais e revisar cartas sem lugar útil. Não balancear apenas por sensação ou porcentagem de vitórias do bot. |

Fontes:
- [Discussão da comunidade sobre Slay the Spire](https://www.reddit.com/r/deckbuildingroguelike/comments/1q1nhnw/why_does_slay_the_spire_still_dominate/).
- [Avaliações de jogadores de Cobalt Core](https://steamcommunity.com/app/2179850/reviews/?browsefilter=toprated).
- [Análise de Balatro, GameSpot](https://www.gamespot.com/reviews/balatro-review-one-more-blind/1900-6418192/).
- [Análise de Cobalt Core, PC Gamer](https://www.pcgamer.com/cobalt-core-review/).
- [Slay the Spire: Metrics Driven Design and Balance — Anthony Giovannetti, GDC 2019](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf).

## Implementado nesta rodada

### Combate e clareza

- Guia de turno com cartas jogáveis, atacantes disponíveis e acesso direto às regras.
- Vigor e Mana exibidos numericamente, além dos indicadores visuais.
- Confirmação antes de encerrar turno deixando ataques gratuitos disponíveis. Pode ser desligada nos ajustes.
- Ações bloqueadas durante a apresentação dos efeitos para evitar jogadas sobrepostas.
- Indicação correta de preparação durante a mão inicial; bônus negativos de equipamento sem o sinal contraditório `+-`.
- Bot, esperas e efeitos atrasados cancelados ao reiniciar, sair ou desmontar a batalha. Um trabalho antigo não pode passar a agir na partida nova.
- Cronômetro pausado com confirmação, escolha de versão de carta, menus ou janela em segundo plano. O limite vem desligado para novos perfis; preferências existentes são preservadas.

### Desempenho e imagens

- Pedidos simultâneos da mesma carta compartilham o desenho em andamento.
- Falhas no cache de imagem não impedem desenhar e mostrar a carta; falhas de gravação do cache são tratadas.
- Trocar a carta ou o contexto remove a imagem anterior durante o carregamento; falhas ao carregar mídia são capturadas.
- URLs de versos são liberadas quando o contexto muda; um trabalho concluído depois de sair da tela não cria uma URL abandonada.
- Biblioteca de impressão de PDF carregada sob demanda.
- O contador de FPS só mantém seu laço ativo quando habilitado.

### Dados, progressão e robustez

- Resultado repetido de um ponto já concluído não concede XP e progresso novamente.
- Deck da Jornada respeita limite de 40 cartas mesmo com mais de 40 cartas distintas, e respeita a quantidade possuída.
- Recriar uma carta cancela uma exclusão ainda pendente.
- Editar durante uma gravação não produz um estado falso de “Salvo”; o projeto é fotografado antes das operações assíncronas.
- Falhas de gravação recolocam apenas operações ainda relevantes na fila.
- Restauração de projeto, cartas e mídia feita numa transação; mídia e metadados do backup são preparados e verificados antes da troca. Uma falha preserva os dados anteriores.
- Configurações nulas, parciais ou com valores inválidos usam padrões seguros. Restaurar padrões também desfaz ajustes de inimigos.
- Redução de movimentos configurável e respeito à preferência do sistema operacional.
- Avisos do compilador no criador de heróis corrigidos sem alterar seu comportamento de rascunho por personagem.

## Pontos ainda a resolver para uma versão de alto padrão

| Ordem | Trabalho | Critério para concluir |
|---|---|---|
| 1 | Tutorial jogável de poucos minutos: recursos, golpe, alcance, reação e posicionamento | Jogadores novos terminam a primeira batalha sem ajuda externa e conseguem explicar suas decisões. |
| 2 | Encontros e chefes com identidade própria | Cada encontro importante exige adaptação; nenhuma classe tem uma sequência universal que resolve tudo. |
| 3 | Recompensas e construção de deck na Jornada | Escolher, recusar, substituir ou melhorar cartas muda o plano da partida; progressão não depende apenas de níveis maiores. |
| 4 | Revisão de texto e direção de arte | Hierarquia tipográfica, ícones, contraste, escala de sprites e efeitos são consistentes; nenhuma informação importante depende apenas de cor. |
| 5 | Prévia de alvos e consequências de ataques | Dano após defesa, alcance e risco de reação ficam claros sem revelar cartas ocultas do bot. |
| 6 | Robustez de backup e fechamento | Expandir a validação de todos os campos do backup e confirmar salvamento antes de fechar. A troca transacional e a validação prévia da mídia já foram implementadas nesta rodada. |
| 7 | Memória e responsividade sob carga | Cache em memória com orçamento e referências; IA com orçamento de tempo ou worker; perfis reais com muitas cartas e arte personalizada. |
| 8 | Testes com a comunidade | Sessões observadas com jogadores novos e experientes, registro de dúvidas, duração e sensação de justiça; revisões baseadas nesses resultados. |

A campanha e o multijogador ainda são áreas em construção. Completar o combate e uma Jornada pequena, variada e bem testada tem mais valor imediato que abrir várias frentes ao mesmo tempo. Uma grande reformulação de regras deve vir com versão própria de conteúdo e migração de dados; não deve apagar cartas e heróis existentes.

## Limites da verificação

Os testes automatizados cobrem regras e regressões encontradas; a inspeção visual usa navegador com perfil descartável. Isso não equivale a testar a experiência completa em todos os computadores, controle físico, Steam Deck ou Windows. Os simuladores opcionais continuam fora da execução padrão. Não foram modificados dados pessoais do jogador, histórico Git ou artes binárias.


## Validação da versão 3.9.6

- `npm run typecheck`: passou.
- `npm test`: 121 testes passaram; 3 simuladores opcionais ignorados (23 arquivos passaram, 3 ignorados).
- Build de produção: passou. Permanecem avisos de tamanho de chunks; não houve os avisos anteriores no criador de heróis.
- JavaScript principal: 1.567,57 kB antes → 1.154,11 kB depois, redução aproximada de 26%. Isso mede tamanho do código, não tempo percebido de abertura nem uso total de memória.
- Navegador, perfil descartável: seleção, posicionamento, mão inicial, combate, aviso de ataques gratuitos, cancelamento do aviso, saída durante a pausa do bot e persistência da redução de movimentos passaram, sem erros de página.
- IndexedDB real no navegador: falha de clonagem durante a restauração abortou a transação e preservou projeto e cartas anteriores.
- PDF de uma carta: gerado e baixado com sucesso após a mudança de carregamento sob demanda.
- AppImage Linux: `release/Void Sun-3.9.6.AppImage`, 151.630.123 bytes. O script `Void Sun` escolhe esse pacote como o mais recente.
- Instaladores anteriores preservados; dados do jogador e histórico Git preservados; alterações ainda sem commit.
- O AppImage foi empacotado, mas não houve teste manual completo da versão instalada ou build para Windows nesta rodada.
