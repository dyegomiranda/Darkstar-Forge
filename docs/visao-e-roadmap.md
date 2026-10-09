# Void Sun — visão de produto e objetivos

Registro solicitado pelo usuário em **05/10/2026**, horário de referência America/Recife. Documento durável para Codex, Claude Opus 5.5 e outros agentes. Descreve objetivos e critérios; não declara funcionalidades futuras como concluídas nem autoriza implementar todas imediatamente.

## Experiência desejada

Void Sun deve ser um RPG de cartas com alto padrão de arte, movimento e apresentação, capaz de sustentar uma campanha de exploração e aventuras compartilhadas. O tema do Sol Vazio deve orientar a identidade do mundo e da história. O jogador deve apreciar um mundo bonito, com pixel art profissional, inclusive durante deslocamentos, contemplação e batalhas.

A referência artística é **Sword of Convallaria**: paletas coesas, materiais e vegetação bem trabalhados, personagens legíveis, profundidade e iluminação integradas. Criar arte original com essa referência de qualidade. O usuário rejeitou aspecto de blocos tipo Minecraft, arte genérica simplificada, ilustração anime infantil e soluções visuais precárias apresentadas como acabamento final.

## Direção imediata autorizada em 05/10/2026

Após rejeitar a prova humana 3D da 3.11.0, o usuário autorizou um personagem **2D em oito direções**, com movimento e equipamento em camadas dentro do cenário 3D. Oito vistas devem corresponder aos ângulos fixos de 45 graus. Avaliar a arte no jogo antes de expandir; dezesseis vistas são possibilidade posterior. A prova não migra o catálogo, não resolve todas as raças nem cancela os objetivos de cenário 3D/câmera contínua. O histórico abaixo explica as alternativas anteriores; esta direção imediata prevalece.

## Avaliação posterior da 3.12.0 — prevalece sobre a autorização inicial

O usuário gostou da beleza da arte, mas apontou estilo ainda distante de Sword of Convallaria, braços cobertos pela armadura, orientação incoerente entre partes e passada não natural. Oito vistas não tiveram o resultado esperado ao girar a câmera; dezesseis são hipótese de teste posterior, sem aprovação de produção em lote. Novas referências em `docs/references/feedback-3.12-2026-10-05/` e diagnóstico em `docs/revisao-visual-3.12.md`. Pode haver ligeiro aumento da resolução dos pixels, preservando a linguagem artística. Em 05/10 foi solicitado apenas registro/análise para retomar após a ausência do usuário. Resolver contrato de poses, articulações e camadas antes de multiplicar ângulos/itens. Rig 2D e autoria 3D para exportar sprites são alternativas em avaliação, sem escolha de ferramenta/migração.

## Mundo 3D e personagens: direção a validar

A amostra atual usa cenário 3D real e heróis 2D direcionais. O usuário quer experimentar também **personagens 3D com aparência pixel art**, no mesmo microambiente, antes de decidir como ampliar a produção. Essa possibilidade não é uma migração integral já aprovada nem uma escolha definitiva entre sprites e modelos.

O teste deve demonstrar um personagem adulto em escala real de jogo, com silhueta adequada, caminhada, conjuração, ataque e visualização por vários ângulos. Avaliar nitidez, estabilidade dos pixels, contato dos pés, iluminação, sombras e compatibilidade dos equipamentos. Comparar com os personagens existentes no mesmo ambiente. Nenhum teste justifica trocar todo o catálogo antes da avaliação visual do usuário.

A aparência modular deve permitir corpos normais, atléticos e mais musculosos, sem tornar o modelo musculoso desproporcionalmente baixo. Raças como orcs, demônios e outras devem ter anatomias próprias. Cosméticos e equipamentos precisam de encaixes declarados e variantes compatíveis; novos itens não devem exigir ajustes manuais por personagem. O padrão visual deve mostrar o cosmético escolhido; a opção de mostrar itens equipados muda a representação, sem desligar seus efeitos de regras.

## Câmera e interação em PC e mobile

- Pretensão de disponibilizar o jogo em **mobile**, além de PC. A versão atual não deve ser anunciada como produto mobile pronto.
- O jogador deve poder arrastar a tela para girar o cenário continuamente e apreciar vários ângulos. No PC, oferecer interação equivalente por mouse/controles.
- Esse recurso é especialmente interessante no modo espectador e na exploração da campanha.
- Preservar também uma câmera fixa bem composta: a beleza da batalha não deve depender de girar a câmera.
- Gestos de câmera precisam conviver com seleção, arrastar cartas e interface. A escolha exata de gestos, botões, limites verticais e acessibilidade permanece aberta para um teste futuro.

Rotação contínua do cenário é viável na base atual. Heróis com sprites ainda mudam entre vistas discretas. A solução para personagens, equipamento e movimento precisa ser validada junto da câmera; girar um mesmo desenho não produz todas as vistas corretas.

## Batalhas integradas ao local explorado

O objetivo é que **o local onde o jogador se encontra na campanha também seja o campo da batalha**, usando o mesmo ambiente construído. Ao iniciar um encontro, a câmera aproxima/enquadra a área e o jogo apresenta o modo de cartas, com transição visual contínua.

A apresentação deve incluir o sorteio de quem começa, escolha da mão inicial/mulligan e os elementos habituais: grimório, cemitério, slots de frente e retaguarda, equipamentos, divisões dos campos e barras de status. Jogador e inimigo mantêm formações realmente opostas, ancoradas no chão e no mesmo sistema de coordenadas da cena. O objetivo visual é permanecer no lugar explorado, sem substituir a experiência por uma nova tela com cenário pré-pronto.

Esta experiência ainda precisa de projeto e implementação. O enquadramento por zoom, sozinho, não resolve área disponível, obstáculos, distribuição das unidades, preparação do encontro, interface, regras e retorno à exploração. Reutilizar o mundo não implica prometer ausência absoluta de carregamento ou processamento.

## Apresentação das batalhas e biomas

Ataques e magias devem percorrer o campo com movimentos convincentes, preparação, impacto e recuperação. Buffs, auras e encantamentos visíveis devem dar personalidade à batalha, com boa leitura e sem esconder cartas, alvos ou formações. Cada magia precisa de identidade de cor, forma e ritmo, além de clareza de estado e duração.

Água merece acabamento próprio: corrente, superfície, margens, transparência/reflexos e integração com o terreno. O usuário deseja **lava e ambientes vulcânicos**, **pântanos** e outros biomas. Cada ambiente precisa de identidade e comportamento apropriados, incluindo materiais, iluminação, vegetação e efeitos; ainda não são recursos concluídos.

Vegetação deve responder ao vento com movimento coerente de galhos e folhas. Destruição deve lançar pedaços do objeto, com trajetória e reação física, mantendo controle de desempenho e limpeza. Água, lava, fumaça e folhagem precisam ser avaliadas em movimento, não apenas em capturas estáticas.

## Campanha cooperativa futura

Visão de **co-op para até quatro jogadores** explorarem o mundo, fazerem quests e enfrentarem bosses por batalhas de cartas. Personagens podem ter builds e papéis complementares, por exemplo tanque, DPS, healer e atacante à distância. Esses exemplos não fixam um sistema obrigatório de quatro classes.

Não há co-op pronto. Regras de turnos e recursos em grupo, campos/slots de múltiplos aliados, sincronização da exploração, autoridade de estado, conexão/reconexão, progressão compartilhada e balanceamento de bosses permanecem em aberto. Nenhuma arquitetura de rede, servidor ou migração de motor foi escolhida por esta conversa.

## Prioridade imediata e critérios de qualidade

O usuário considera a amostra promissora, mas ainda incompleta. Os problemas mais evidentes são **serrilhado excessivo em todo o cenário**, **movimento ruim de caminhada/conjuração** e **folhagem com aparência low res/low poly**. Também precisam de acabamento materiais, sombras, água e efeitos de impacto/fumaça.

Na retomada, concentrar a avaliação em uma porção pequena do ambiente e poucos modelos. Ordem sugerida para discussão/teste: nitidez e estabilidade visual; uma árvore bem acabada; uma caminhada e conjuração convincentes; um personagem 3D em pixel art; água e efeitos. Validar na escala real, em movimento, nas duas câmeras e em rotação. Só depois expandir recursos e biomas.

A aprovação das cartas do Protótipo não é aprovação de toda nova arte. Manter full art vertical nítida, foco principal acima da caixa de regras e personagens com rostos adultos. Não reintroduzir arte antiga ou modelos rejeitados para completar catálogo rapidamente.

Desempenho mobile precisa ser medido em aparelhos representativos; resultados em RTX 4070 não validam celular. Qualidade escalável pode ajustar custo de efeitos, sombras, reflexos e detalhe mantendo a direção artística. As decisões concretas e a plataforma de distribuição serão feitas quando o usuário autorizar essa etapa.
