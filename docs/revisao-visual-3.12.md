# Revisão visual da amostra 3.12.0 — retorno do usuário

Registro de **05/10/2026**, America/Recife. O usuário vai sair e pretende retomar em cerca de dois dias. Pediu **análise e registro apenas**: não alterar código, gerar imagens, instalar ferramentas, empacotar ou expandir modelos nesta sessão. Não há tarefa agendada nem trabalho em segundo plano.

## Avaliação que prevalece

O usuário achou a arte bonita e de boa qualidade, mas **ainda fora do estilo desejado**. A amostra equipada apresenta erros evidentes de anatomia e orientação; a caminhada não é natural. A transição das oito vistas ao girar a câmera também não agradou. A amostra 3.12.0 não está aprovada para expandir o catálogo. Dezesseis vistas são uma possibilidade para um próximo teste, não autorização para produzir um lote inteiro agora.

Os 174 testes e o QA anterior verificaram funcionamento, índices/dimensões e execução. Não validaram encaixe anatômico, sequência convincente da passada ou fidelidade artística. Não usar esses resultados para contrariar o diagnóstico visual do usuário.

## Evidências fornecidas

As sete imagens foram vistas no próprio chat. Os caminhos locais foram conferidos: **as cinco referências de Sword of Convallaria estavam disponíveis e foram copiadas sem alterações** para `docs/references/feedback-3.12-2026-10-05/`, com hashes em `index.json`. Os arquivos marcados `1.png` e `2.png` não estavam presentes nos caminhos declarados; suas marcações foram analisadas no chat e descritas abaixo. As pranchas originais sem marcações continuam em `tools/art/directional-sample/fitting-review.png` e `tools/art/directional-sample/qa/walk-contact-review.png`. Referências privadas, fora dos recursos de execução do jogo; não alegar que as duas imagens anotadas foram arquivadas.

- **1.png:** comparação de oito vistas cosméticas/equipadas; retângulos vermelhos mostram braços/ombros mal encaixados; áreas verdes chamam atenção para diferenças entre orientação de cabeça/tronco e pernas/pés nas diagonais posteriores.
- **2.png:** sequência equipada de caminhada; faixas vermelhas mostram o problema dos braços/tronco nas duas vistas de perfil. O usuário relata falta de alternância natural das pernas.
- **sword-of-convallaria-faycal-build-battle-crop.jpg:** batalha em acampamento incendiado; personagens compactos, roupas legíveis, solo irregular, madeira e fogo integrados a luz quente e sombras frias.
- **sword-of-convallaria-test.jpg:** panorama de vila/vale com vegetação em primeiro plano e personagens vistos de costas. Logo cobre parte da imagem; não usá-la para medir anatomia fina.
- **Screenshot_100.jpg:** interior rico em móveis, pisos, madeira, plantas, tecidos e luz de lareira/janela; volumes e materiais coerentes. Captura comprimida/escalada, não atlas de pixels originais.
- **c9cc4048aec13563e29e1e381ca7f599ae756091.jpg:** cena sob árvore com grupo, raízes, flores, sombra/luz salpicada e fundo desfocado; referência de profundidade, escala relativa e paleta.
- **185a244766fee213dc71b796696c8c42cee13500.jpg:** acampamento incendiado com vários personagens e corpos no chão; roupas, poses, narrativa ambiental, luz e efeitos integrados.

Não deduzir a tecnologia interna de Sword of Convallaria a partir dessas capturas. São referências de aparência, não permissão para reutilizar seus recursos comerciais.

## Diagnóstico dos encaixes

A leitura de `src/ui/sample3d/directionalCharacter.ts` confirma uma limitação estrutural: o corpo inteiro é desenhado primeiro; depois o peitoral inteiro passa por cima dele. Não existem camadas independentes de braço próximo, braço distante, ombro e mão para preservar sua oclusão. Isso explica a perda visual de partes dos braços, sobretudo nos perfis. O equipamento muda de posição pelo pivô, mas não tem desenho específico de cada pose da caminhada.

As peças e a base foram geradas separadamente. A mesma etiqueta de direção não garante que tenham a mesma perspectiva, eixo dos ombros e inclinação da cabeça. Os encaixes estimados em `tools/art/directional-sample/prepare.py` usam proporções/medianas da silhueta: são referências de posição, não articulações e superfícies anatomicamente correspondentes. Deslocar uma peça por alguns pixels não corrige um desenho orientado para outro ângulo.

O elmo usa uma cabeça completa, incluindo outro desenho do rosto, enquanto uma máscara remove a cabeça original. Isso torna a consistência da direção, identidade e proporção dependente da correspondência entre dois desenhos. A limpeza de cabelo anterior só tratou resíduos; não resolveu esse contrato.

**Correção a preparar numa futura sessão:** uma pose mestra por vista; roupas desenhadas sobre essa mesma pose; cabeça/elmo com eixo comum; separação de membros próximos/distantes, mangas e ombros; ordem das camadas por vista e pose; pontos reais de ombro/cotovelo/punho/quadril/pés; regiões cobertas explícitas. Peitoral e mangas não podem apagar indiscriminadamente o braço da base. Cada item deve ter variantes compatíveis por família anatômica, sem ajustes por herói. Validar perfil e diagonal posterior primeiro, pois expõem mais os erros.

## Diagnóstico da caminhada

As pranchas mostram repetição de silhuetas e poses que não estabelecem bem apoio, passagem e troca de peso. Seis índices percorridos não equivalem a seis fases corretas de um ciclo. A animação por distância existente ajuda a controlar velocidade, mas não corrige o desenho nem a ordem das pernas.

Um próximo ciclo deve distinguir os dois pés e revisar: contato de um pé; absorção do peso; passagem da perna oposta; contato do outro pé; absorção; passagem inversa. Braços acompanham a perna oposta; quadril/tronco têm movimento moderado; pé apoiado não desliza no chão. Calibrar distância por ciclo e duração a partir da passada realmente desenhada. Mais quadros sem boas poses não garantem fluidez. Não apresentar interpolação/borracha ou simples oscilação do sprite inteiro como solução.

Verificar a sequência quadro a quadro, em loop lento e na velocidade real, cosmética e equipada. Acessórios devem acompanhar a mesma fase, não ficar presos a uma pose parada. O problema é do processo de produção/composição, não deve ser atribuído só ao limite de oito direções.

## Alternativas para orientação, movimento e equipamentos

| Técnica | Benefício | Limite/custo real |
| --- | --- | --- |
| Sprites desenhados em 16 vistas | Passos de 22,5° em vez de 45°; menor salto durante o giro | Continua discreto; mais vistas para cada corpo/item/ação. Não resolve anatomia ou animação erradas. |
| Esqueleto 2D com peças e desenhos por vista | Articulações comuns, troca de roupas e reuso do movimento; ordem de camadas controlada | O rig gira peças dentro do plano; não inventa vistas laterais/costas. Deformações e rotação de pixels precisam de revisão. |
| Modelo 3D de produção usado para gerar sprites 2D | Corpo/equipamento compartilham rig, perspectiva e poses; pode exportar 8/16/mais vistas sistematicamente | Exige um modelo, materiais e animação artisticamente bons. Mais vistas aumentam atlas/memória/exportação. Não reaproveitar automaticamente os bonecos 3D rejeitados. |
| Personagem 3D em tempo real com renderização pixel art | Perspectiva realmente contínua e oclusão espacial | Retoma o custo de modelagem/rig/materiais já discutido; não escolhido nesta sessão. |

A documentação oficial do [Spine sobre skins](https://esotericsoftware.com/spine-skins) descreve reutilização das animações com peças de aparência; [slots e ordem de desenho](https://esotericsoftware.com/spine-slots) dão suporte à separação das camadas. Isso fundamenta a alternativa de rig 2D, não uma promessa de rotação 3D automática. Não há escolha nem compra de licença de Spine nesta sessão.

O Blender permite câmera ortográfica e exportação de animação em sequência de imagens: [câmeras](https://docs.blender.org/manual/en/2.80/render/cameras.html), [renderização de animações](https://docs.staging.blender.org/manual/en/latest/render/output/animation.html). A proposta de usar um modelo para gerar sprites é uma aplicação dessas ferramentas, não a afirmação de que Sword of Convallaria usa esse fluxo.

Misturar duas vistas com transparência pode causar imagem dupla; deformar uma foto não recupera partes ocultas. Mapas de profundidade/normais ajudam em parallax/iluminação, mas não produzem por si só anatomia correta em 360°. Não tratar essas técnicas como atalhos garantidos para eliminar o trabalho artístico.

**Recomendação provisória:** primeiro corrigir contrato e um ciclo numa amostra mínima. Depois comparar uma pequena faixa de giro com vistas intermediárias de 22,5°, mantendo os oito ângulos fixos atuais. Se o custo de desenhar cada peça continuar inviável, avaliar um modelo de autoria para exportação 2D antes de escolher o fluxo definitivo. Nenhuma migração ou ferramenta foi autorizada por este registro.

## Aproximação artística das referências

A diferença não é só resolução. A amostra atual tem contorno muito pesado, rosto mais ilustrado, acabamentos arredondados e proporções/silhuetas que lembram outro RPG. Nas referências, a leitura depende mais de massas de cor, sombreamento seletivo, detalhes contidos no rosto, roupas com identidade e escala consistente dentro da cena.

Avaliar cabeça, comprimento das pernas, largura dos ombros, mãos e botas em recortes equivalentes e na escala de jogo; não determinar medidas exatas a partir de JPEGs ampliados. Adulto não significa alongar o corpo indiscriminadamente ou tornar todos musculosos. Aumentar ligeiramente a resolução dos pixels é aceitável ao usuário, desde que preserve desenho intencional, nitidez e linguagem comum entre personagem e ambiente.

Cenários: materiais de pedra/madeira/tecido distintos; paletas coesas; sombras coloridas e luz local; vegetação em massas com variação e raízes; irregularidades naturais do chão; objetos ancorados; profundidade e detalhe distribuído conforme o foco. A imagem sob a árvore e o interior mostram que composição e iluminação importam tanto quanto a quantidade de detalhes. Evitar plataforma vazia com textura repetida e objetos genéricos. Água, vento, fogo e destruição continuam exigindo análise em movimento; fotos não aprovam suas animações.

## Próxima sessão: prova pequena e critérios

1. Ler este registro, a continuidade e o retorno do usuário antes de gerar ou alterar qualquer modelo.
2. Definir uma ficha visual curta a partir das novas referências e medir a escala no microambiente existente.
3. Planejar uma base e um peitoral/elmo em um perfil e uma diagonal problemática, com camadas e ângulos coincidentes; conferir comparação equipada/cosmética.
4. Validar um ciclo de caminhada em perfil antes de multiplicá-lo para todas as direções.
5. Testar vistas intermediárias apenas numa faixa curta de giro; comparar custo/qualidade de 8/16 ou fluxo de autoria com rig.
6. Revisão visual real: ombros/braços completos, cabeça/tronco/pernas coerentes, silhueta consistente, passada alternada, pé no chão e roupas acompanhando a pose. Aprovação do usuário antes de expandir.

Esta lista organiza a retomada; não significa que essas implementações foram feitas ou que continuarão automaticamente enquanto o usuário estiver fora. Nesta sessão foram alterados somente registros de documentação.
