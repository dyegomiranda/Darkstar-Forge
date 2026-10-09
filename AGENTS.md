# Void Sun — contexto para agentes

@/home/djabo/.codex/RTK.md

## Entrada para continuar

Antes de planejar ou alterar o projeto, leia:

1. [Visão e objetivos](docs/visao-e-roadmap.md): direção solicitada pelo usuário, critérios de qualidade e funcionalidades futuras.
2. [Continuidade](docs/CONTINUIDADE.md): estado da entrega, limitações, arquivos e próximos testes.
3. [Amostra 3D](docs/arena3d-sample.md) e [motor de aparência proposto](docs/avatar-engine-design.md), quando trabalhar nesses sistemas.

Estas páginas registram contexto. A solicitação atual do usuário determina o escopo do trabalho. Objetivos futuros não autorizam implementar o roadmap inteiro de uma vez. Quando a tarefa for apenas registro, não altere código, artes, dados ou executáveis do jogo.

## Skills do projeto

Instruções reutilizáveis para arte 3D ficam em `tools/art/skills/<nome>/SKILL.md` (ligadas em `.claude/skills` e `~/.codex/skills`): direção de arte, revisão visual e entrega no jogo. Leia a que couber antes de trabalhar nesses temas.

## Preferências do usuário para este projeto

- **ORDEM OBRIGATÓRIA (08/10/2026): não entregar nada mal acabado.** Só apresentar como entrega, e só empacotar no aplicativo, o que estiver em perfeito estado. Se você mesmo enxerga defeitos, não é entrega. Se o limite for da ferramenta, avise o usuário e pare, em vez de gastar créditos em tentativas inferiores. Não substitua uma versão anterior por outra que não seja claramente melhor.

- Referência artística: Sword of Convallaria para toda a pixel art; o vídeo indicado em CONTINUIDADE é referência de integração e movimento.
- Produza amostras pequenas, revise no jogo e obtenha avaliação visual antes de expandir um novo estilo para todo o catálogo. Evite gastar geração de imagens com lotes que precisarão ser descartados.
- Preserve as cartas full art aprovadas do Protótipo e os dados do jogador. Faces adultas, proporções coerentes e anatomias próprias para cada espécie. Não reative a prévia modular rejeitada.
- O usuário prefere autonomia em ações rotineiras e reversíveis. Reserve pedidos de autorização para risco elevado ou decisões muito importantes, respeitando as instruções e limites aplicáveis.
- Diferencie recurso funcionando de acabamento artístico concluído. Geometria pixelizada e imagens geradas não garantem a qualidade desejada.
- Antes de editar, confira estrutura e estado do Git; preserve alterações preexistentes. Não descarte trabalho de outro agente. Verifique as mudanças com os testes adequados ao seu impacto.
- Ao entregar uma mudança jogável, verifique o aplicativo usado pelo atalho do menu de aplicativos. Abrir apenas a versão de desenvolvimento no navegador não completa a entrega.

O diretório atual é `/home/djabo/Downloads/Void Sun`. O nome e caminho antigos, Darkstar Forge, podem sobreviver em metadados históricos e na pasta de dados do Electron; não renomeie o perfil de dados sem migração e preservação explícitas.
