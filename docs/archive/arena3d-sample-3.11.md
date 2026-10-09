# Pátio do Sol Ausente — amostra 3D

**Atualização 3.11.0, 05/10/2026.** Acesso pelo atalho Void Sun do menu de aplicativos → **Amostra visual 3D**. Também disponível no menu Modo batalha. Rota `#/amostra-3d`.

A cena é uma prova pequena e separada do jogo. Não altera aparência salva, cartas do Protótipo, decks, campanha ou partidas existentes. Não substitui o catálogo de personagens. O usuário deve avaliar o desenho no aplicativo antes de ampliar a produção. O acabamento ainda não equivale à referência Sword of Convallaria.

## Controles

- Arrastar o cenário com mouse/um dedo gira a câmera continuamente, incluindo inclinação vertical limitada. Roda do mouse ou pinça com dois dedos aproxima/afasta. Soltar o arraste permite uma breve desaceleração.
- Clássica e Isométrica reenquadram o mesmo mundo suavemente. Os botões de giro mantêm os passos de 45 graus, também com transição suave.
- **Modelos e equipamentos** abre a oficina: escolha Brunhild/Kael, corpo masculino/feminino normal/forte e cabelo curto/trança/rabo de cavalo. **Ver personagem de perto** enquadra a frente do personagem; **Testar golpe** demonstra preparo, corte e recuperação.
- O padrão mostra o cosmético. **Mostrar itens equipados** habilita armadura, elmo, arma, escudo, botas, luvas e capa. As escolhas são temporárias e individuais por personagem. Elmo oculta o cabelo e as peças cobrem as respectivas roupas/mãos/pés.
- **Testar personagens 3D** compara os novos volumes com os sprites anteriores no mesmo cenário.
- **Mover Brunhild** (M): clique em um slot livre do seu campo. **Brasa do Vazio** (1) e **Lança de Geada** (2): clique no esqueleto ou na caixa. **Restaurar caixa** (R) permite repetir. Esc retorna à seleção.
- Vento, água, slots e equipamento do esqueleto podem ser ligados/desligados.

## Personagens e encaixe

Os personagens novos são **malhas 3D volumétricas com ossos e texturas**, não desenhos planos com vistas diferentes. Quatro anatomias humanas são declaradas em `fit.ts`. Os corpos fortes são mais altos, com ombros/membros maiores e cabeça de largura preservada.

Todas as peças da amostra são construídas a partir dessas medidas e vinculadas ao mesmo esqueleto. Armaduras têm folga declarada; capa e proteções de pernas acompanham a dimensão corporal. Regiões cobertas são ocultadas para evitar interseção das roupas de baixo. Cabeça, mãos, pés e tronco possuem pontos de fixação nomeados.

A caminhada usa distância percorrida para determinar a passada e resolve o contato do tornozelo por cinemática de duas articulações. Os pés permanecem orientados ao chão; entrada/saída da passada e mudanças de orientação são interpoladas. Conjuração levanta as mãos antes da saída do projétil, cuja origem acompanha a mão durante a preparação. O golpe tem preparo/corte/recuperação próprios.

**Limites:** somente esta família humana e estas sete peças são oferecidas nesta prova. Não há importador completo, migração de heróis, novos orcs/demônios, biblioteca de armaduras de produção ou promessa de adaptar qualquer recurso externo. Novas anatomias exigem medidas/rigs e variantes artísticas preparados e validados. `docs/avatar-engine-design.md` explica o contrato de produção proposto.

## Cenário e renderização

O cenário continua sendo o GLB 3D editável de Blender. Os doze slots usam coordenadas comuns do mundo, com frentes opostas e retaguardas atrás. Câmara, seleção e efeitos compartilham essas posições.

Novas texturas de pedra, terra e casca são projetadas pelas três direções da superfície, evitando o esticamento em paredes verticais. Folhagem usa grupos de folhas texturizados distribuídos em várias orientações sobre os galhos reais, com recorte de transparência; galhos giram nos pontos de fixação e as pontas das folhas deformam com o vento. Não há um único desenho de árvore girado para acompanhar a câmera.

O rio tem reflexão, ondas em várias direções, margens com espuma e cáusticas restritas. Fogo e gelo mantêm sequências e formatos separados. Destruição libera as tábuas/cintas reais, com gravidade, rotação, quique e remoção ao terminar.

Antialias está ativo; a antiga ampliação de metade da resolução foi removida. Texturas dos personagens usam pixels e paleta controlados. A resolução interna é limitada a quatro milhões de pixels e a execução a 60 fps. A cena pausa quando oculta e libera recursos ao sair. Esses limites controlam custo, sem aplicar desfoque global. Não são benchmark mobile nem garantia contra falhas de driver.

## Fontes e manutenção

- Geometria do ambiente: `tools/arena3d/arena.blend`, `tools/arena3d/build_arena.py`, `public/art/sample3d/arena.glb`. Reconstruir com Blender 5.2.2 LTS.
- Malhas/esqueleto/animação humana: `src/ui/sample3d/character.ts`; medidas e contrato: `fit.ts`.
- Materiais/folhagem: `materials.ts`, `environment.ts`; água: `water.ts`; efeitos: `effects.ts`.
- Câmara/gestos: `orbit.ts`; formações: `layout.ts`; integração/renderização: `arena.ts`; interface: `Sample3D.svelte`.
- Três imagens originais produzidas com a ferramenta integrada `image_gen.imagegen`: `public/art/sample3d/v2/foliage.png`, `materials.png`, `faces-hair.png`. Origem, prompts exatos e transparência: `tools/arena3d/v2/prompts.json`. Os arquivos fontes foram preservados; células do atlas são amostradas em tempo de execução, sem substituição das cartas aprovadas.
- Testes: `tests/arena3d-layout.test.ts`, `arena3d-orbit.test.ts`, `arena3d-rig.test.ts`. Verificam formações, seleção, gestos, contato dos pés, rig compartilhado e cobertura do cabelo pelo elmo.
- QA jogável: `tools/arena3d/qa.cjs`, usando perfil temporário. `VOIDSUN_QA_PACKED=1` escolhe o mesmo lançador do atalho; `VOIDSUN_QA_ZOOM=1.35` verifica a escala usada pelo jogador. Ajustar o caminho da instalação local de Playwright ao rodar noutra máquina.

## Estabilidade após o reinício relatado

Durante esta etapa o usuário relatou congelamento e reinício forçado. O journal do boot anterior registrou NVIDIA Xid 16 repetido e falha de modeset/Vblank; não foi encontrado registro de OOM. Esses registros não estabelecem qual aplicativo disparou o problema. Nenhum driver ou configuração do sistema foi alterado.

A amostra passou a ter os limites acima. No Linux, o Electron desabilita a via opcional Vulkan e conserva WebGL acelerado. QA usa uma janela menor e X11 apenas no processo de teste. A correção não deve ser anunciada como eliminação comprovada do congelamento do sistema. Conferir novamente logs se o problema reaparecer.

## Verificação da entrega 3.11.0

Typecheck, build e empacotamento aprovados. Conjunto completo: 170 testes aprovados, 3 casos preexistentes pulados; últimos ajustes de animação conferidos novamente pelos 16 testes 3D. O QA empacotado via lançador do atalho, em perfil isolado e escala 135%, passou oficina, quatro corpos, cabelos/equipamentos/golpe, arraste sem movimento acidental, zoom, seleção/movimento, fogo/gelo e destruição/restauração/limpeza, comparação com sprites e saída da cena. Sem erros de execução/shader. Cerca de 55 fps nesta máquina com teto de 60, sem novos Xid nos registros consultados após o reinício. Resultados em `tools/arena3d/v2/qa-results.json`; imagens de revisão em `tools/art/previews/sample3d-v2/`.
