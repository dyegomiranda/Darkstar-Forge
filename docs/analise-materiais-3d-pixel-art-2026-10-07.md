# Análise dos materiais de referência: 3D pixel art

Data da consulta: 07/10/2026. Relacionado ao [plano de produção](plano-3d-pixel-art-2026-10-07.md).

## Método e limites

Os 17 arquivos de vídeo foram encontrados em `/home/djabo/Downloads/AI knowledge/`. A ordem dos anexos difere da numeração da explicação, portanto as observações são identificadas pelo título. Foram inspecionados 24 quadros distribuídos por vídeo longo e 12 por vídeo curto, além de quadros em resolução maior nos pontos importantes. Sequências de 2 segundos com 6 quadros/segundo foram usadas para observar água, jitter, vento e os vídeos de trys/zel. Isso permite avaliar comportamento local de movimento, não certificar todas as animações nem o pipeline interno dos autores.

Não foi feita reprodução contínua integral, análise de toda a faixa de áudio, execução do demo ou medição de desempenho dos exemplos. Não afirmar que os anúncios provam qualidade, velocidade, licença ou funcionamento local; esses pontos foram conferidos nas fontes oficiais quando disponíveis.

Os dois links do X não ficaram acessíveis pelo navegador de pesquisa, mas os vídeos locais correspondentes foram inspecionados visualmente. A conversa com Gemini é uma referência de opinião, não uma instrução do usuário ou uma fonte técnica definitiva.

## Observações por vídeo

| Arquivo | Evidência visual e utilidade | Consequência para o plano |
| --- | --- | --- |
| NEW FREE Addon Has Everything You Need for Pixel Art (Blender evee) | Painéis e demonstrações identificam Blender Pixel Kit, de SouthernShotty. Há câmeras, prévia pixelizada, contornos, toon/flat e conversão de imagem/paleta. Quadros detalhados em 1:52, 5:38 e 10:20. | Útil para padronizar autoria e testar aparência rapidamente. Não melhora sozinho a malha/rig nem exporta seu compositor como shader Godot. |
| How I solved my biggest pixel art problem, Pixel Perfect | Mostra instabilidade de pixels durante movimento, diagramas de coordenadas/câmera e compensação de posições. Sequência adicional por volta de 4:01. | Tratar jitter como problema do pipeline de imagem. Manter simulação contínua, investigar quantização da representação e diferenças entre translação, rotação e zoom. |
| The Secret to Crisp 3D Pixel Art Rendering, Pixel Perfect | Exemplos de amostragem, comparação de resolução e tratamento de cor/paleta. A aparência final depende da preparação antes da ampliação. | Comparar render direto de baixa resolução com pré-filtragem e redução controlada. Pixelização uniforme grosseira não é sinônimo de direção de arte. |
| Volumetric Lighting in Pixel Art, Pixel Perfect | Sombras projetadas, ruído de nuvens, amostragem da iluminação e feixes em cena de floresta/ponte. | Usar luz para composição e atmosfera, com custo escalável. Volumetria é acabamento; não conserta objetos feios. |
| How I Created Pixel Art Oceans, Pixel Perfect | Demonstra ondas, combinação de camadas, profundidade da água, espuma, reflexos e contato de água com objetos. Sequência adicional em 12:35. | Construir água com relação à cena e movimento local coerente. Não animar um background inteiro como substituto. |
| Pixal3D on 6GB VRAM, Better Than Trellis 2 | Workflow mostrado inclui extensões/quantização GGUF e comparações de modelos. Há resultados interessantes, mas exemplos selecionados. | Comparar candidatos na GPU local; não extrapolar um título para memória/velocidade do pipeline nativo completo ou declarar Pixal sempre superior. |
| New Local 3D AI Generator Is Pixel-Perfect, Pixal3D | Comparações de objetos, textura e alinhamento com referência em vários ângulos. | Pixal3D é candidato para geração de malha. Pixel-aligned diz respeito à correspondência com imagem, não à obtenção automática do estilo pixel art. |
| Trellis.2 and Pixal3D are now native in ComfyUI core | Vídeo curto anuncia integração e mostra entrada/resultado. | Confirmado na documentação oficial; verificar versão local e dependências. Usar workflow nativo fixado se funcionar, em vez de acumular extensões antigas. |
| New Open-Source AI Animation is Here | UniMate anima esqueletos diversos com texto e exemplos de alteração/composição de movimentos. Outros segmentos mostram ferramentas que não fazem parte da proposta gratuita. | Interessante como pesquisa, mas pesos NC não servem como base comercial escolhida. Exige um personagem já rigado e revisão de resultado. |
| Recreating t3ssel8r style 3D pixel art in Godot | Cena estilizada, câmera ortográfica, materiais, profundidade/normais e tratamento de vegetação. | Demonstra componentes úteis do render. Não equivale a copiar a aparência de SoC ou obter automaticamente personagens acabados. |
| Godot 4.8 is a HUGE update | Demonstra recursos e cenas do desenvolvimento do motor; não é comprovação de pipeline de arte pixelizada pronto. | Conferir versão estável e custo de migração. A pesquisa oficial nesta data indica estável 4.7.2 e preview 4.8-dev7. |
| Opus 5.5 Just Took Over Blender | Assistente cria um conjunto de objetos e arranjos de cenário a partir de referências; por volta de 9:28 há uma coleção apresentada em editor 3D. | Automação por IA/Python é útil para props e cenas. Capacidade de gerar muitos objetos não demonstra anatomia, pesos ou encaixes corretos. Não exige copiar aquele kit. |
| 3D PixelArt Tutorial - Godot | A vila no início e em 11:20 tem luz, materiais e composição atraentes. O tutorial também mostra primitivas e implementação de shader. Quadros adicionais em 0:02, 0:08 e 11:20. | Referência visual especialmente útil. O download anexado não inclui a vila; construir arte original e adaptar o shader é trabalho adicional. |
| Stylized Grass & Trees for Pixel Art 3D in Godot 4 | Demonstra preparo da vegetação, atributos da malha/materiais e deformação pelo vento. Sequência em 14:12 mostra variação do contorno da copa e sombra. | Usar máscaras e deformação de partes; evitar mover uma árvore inteira rigidamente. O estilo colorido e simplificado desse tutorial não é, por si, a meta artística do Void Sun. |
| 3D Pixel Art in Godot 4 | Vídeo curto de ruína, vegetação e iluminação em diferentes condições/ângulos. | Referência de coerência de luz e volumes no cenário; reutilizar princípios, não assets de origem indefinida. |
| zel, vídeo da dungeon | Ambiente de pedra/musgo, paredes de altura variada, leitura de quartos e profundidade. Personagem pequeno explora o ambiente. Sequência adicional de 0:01 a 0:03. | Referência de composição e material. O vídeo não permite confirmar sozinho engine, estrutura dos personagens ou licença dos recursos. |
| trys, blood in the water | Personagem mais alto, capa e arma com preparação/recuperação, deslocamento e resposta da água. Sequência adicional de 0:16 a 0:18. | Usar timing, apoio e reação como referências de movimento. Manter a proporção compacta atual; não decidir mudança de corpo apenas por esse exemplo. |

## Demonstração PixelageGames anexada

Arquivo local: `3DPixelArt_Tutorial.7z`, aproximadamente 69 KB. O conteúdo examinado inclui projeto Godot 4.4, shader de detecção de bordas, cena com primitivas/mesh de demonstração, textura quadriculada e metadados Git. Licença MIT, Copyright 2025 Eduardo Schildt. Não inclui o conjunto de casas, vegetação e acabamento da vila exibida no vídeo.

A [página do autor](https://pixelagegames.itch.io/godot-3d-pixelart-demo) apresenta o demo gratuito. Ele é uma base de estudo do shader, não um cenário pronto para substituição do mapa atual. Preservar a licença se houver adaptação de código. Não copiar `.git` do arquivo para o projeto.

O shader depende de profundidade/normais e de Forward+. A [documentação oficial](https://docs.godotengine.org/en/stable/tutorials/shaders/screen-reading_shaders.html) confirma a limitação de normal/roughness para Mobile/Compatibility. Adaptação, avaliação de bordas, seleção de materiais e estratégia móvel são requisitos do piloto.

## Conversa com Gemini: propostas úteis e correções

Documento local: `Conversa com o Gemini sobre uma possível estratégia.pdf`, 11 páginas; texto e todas as páginas renderizadas inspecionados.

São úteis: pensar em autoria 3D, roupas compartilhando esqueleto, geração assistida por IA, escolha deliberada de iluminação/render e formas de produzir sprites a partir de um rig comum. A distinção entre autoria e apresentação evita que cada peça tenha uma perspectiva independente.

Pontos que não devem virar premissas:

1. **HD-2D não implica personagens 3D.** O PDF generaliza SoC/Octopath como personagens 3D com shader. A [entrevista publicada pela Epic com os criadores de Octopath](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true) descreve personagens pixelizados 2D em ambientes 3D. A pipeline interna exata de SoC não foi confirmada nesta pesquisa. Definir a nossa técnica pelo resultado desejado, não por uma suposição sobre o concorrente.
2. **Colocar uma roupa como filha de um osso não resolve todo equipamento.** Serve para acessórios rígidos apropriados. Roupas que atravessam articulações precisam de pesos, geometria, máscaras e correções; proporções e anatomias diferentes exigem variantes.
3. **Pixelização não substitui modelagem e direção de arte.** Não há garantia de igualdade com pixel art desenhada ou de qualidade profissional apenas por ativar um shader.
4. **Automação total e percentuais de esforço não foram demonstrados.** O arquivo cita facilidade e relações de esforço sem medir o caso Void Sun. O custo decisivo é provar uma personagem adulta equipada e animada com todas as vistas.
5. **Voxel não é obrigatório.** A proposta GazPrash/voxel pode ter méritos para outros estilos, mas conflita com a intenção de evitar blocos Minecraft. Estruturas voxel internas de geradores não obrigam uma malha final visivelmente cúbica.
6. **Sprites não são inerentemente inferiores.** Autoria 3D para sprites pode resolver alinhamento e reutilização muito bem; a troca de vistas permanece uma limitação para a câmera contínua e precisa de avaliação.
7. **Complementos pagos não entram no núcleo gratuito.** Não transformar sugestões de Pencil+/Flat Kit/serviços de geração em dependências do plano.

O plano não exige que o usuário modele ou programe. Exige que o agente mantenha o processo, faça correções e entregue etapas avaliáveis. Aprovação de aparência continua com o usuário; não é possível substituir isso por contagem de testes.

## Comparação com os testes anteriores do Void Sun

| Questão | Amostra de oito vistas | Prova 3D proposta |
| --- | --- | --- |
| Cabeça/tronco em direção diferente dos pés | Peças desenhadas separadamente podem divergir | Corpo e itens passam pela mesma pose/câmera; a origem da divergência desaparece |
| Braços escondidos pelo peitoral | Sobreposição de imagens sem profundidade anatômica | Geometria, pesos e oclusão reais; ainda revisar interseções e ombreiras |
| Elmo enterrado | Ajuste de camada/imagem insuficiente | Volume, fixação e cobertura de cabelo definidos e testados |
| Caminhada sem alternância | Poucas poses e articulação implausível | Clipes de rig, contato dos pés, timing e adaptação à velocidade |
| Saltos ao girar câmera | Oito vistas são discretas; dezesseis reduzem mas não eliminam | Mesma malha em todos os ângulos; pixelização ainda pode apresentar shimmer |
| Produção de novos itens | Muitas vistas e movimentos a combinar | Uma peça preparada por família/variante, reutilizável em movimentos compatíveis |
| Arte bonita | Alguns sprites foram elogiados | Qualidade 3D ainda precisa ser provada; não é um ganho garantido pela técnica |

O problema dos modelos 3D anteriores foi também artístico e de animação. A nova tentativa só se justifica com geometria e materiais melhores, rig padronizado, movimento adaptado e pixelização avaliada desde o início. Não chamar essa mudança de engine de correção automática.

## Fontes oficiais e decisões de licença

| Fonte | Constatação e uso no plano |
| --- | --- |
| [Blender Pixel Kit](https://superhivemarket.com/products/blender-pixel-kit) | Addon do vídeo, opção $0, GPL, Blender 5.1 listado. Compatibilidade local ainda não executada. |
| [Pixal3D, código](https://github.com/TencentARC/Pixal3D) e [modelo](https://huggingface.co/TencentARC/Pixal3D) | Candidato de reconstrução de malha; MIT para componentes principais, sem rig/armadura automática. |
| [Pixal3D NOTICE](https://raw.githubusercontent.com/TencentARC/Pixal3D/master/NOTICE) | Separar componentes próprios de terceiros e preservar atribuições aplicáveis. |
| [TRELLIS.2, código](https://github.com/microsoft/TRELLIS.2) e [pesos](https://huggingface.co/microsoft/TRELLIS.2-4B) | MIT para componentes principais; requisitos de referência não equivalem a execução quantizada de baixo consumo. |
| [ComfyUI: Pixal3D](https://docs.comfy.org/tutorials/3d/pixal3d) e [TRELLIS.2](https://docs.comfy.org/tutorials/3d/trellis2) | Workflows nativos e modelos quantizados documentados; pode exigir versão recente. Separar do ComfyUI local de julho. |
| [DINOv3, licença](https://raw.githubusercontent.com/facebookresearch/dinov3/main/LICENSE.md) | Dependência do workflow com licença própria; não descrevê-la como MIT/Apache só porque o gerador principal é MIT. Acesso/download pode exigir aceite inicial. |
| [UniMate, repositório oficial](https://github.com/Friedrich-M/UniMate) | Código MIT; checkpoints CC BY-NC 4.0; fontes de dados têm termos próprios. Atualização recente aceita rigs próprios. Fora da base comercial proposta. |
| [Quaternius Animation Library](https://quaternius.itch.io/universal-animation-library) e [Library 2](https://quaternius.itch.io/universal-animation-library-2) | CC0, pacote Standard gratuito. Pro/Source pagos não fazem parte do plano. Adaptar movimentos, não adotar aparência do modelo exemplo. |
| [UniRig, código](https://github.com/VAST-AI-Research/UniRig) e [modelo](https://huggingface.co/VAST-AI/UniRig) | MIT nas fontes consultadas; a ficha e componentes disponíveis precisam ser conferidos na integração. Auxílio opcional, não promessa de rig perfeito. |
| [SDXL 1.0](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) | Opção local de conceito com licença OpenRAIL++; origem e termos de checkpoints adicionais precisam ser registrados. |
| [Godot estável](https://godotengine.org/download/linux/) e [preview](https://godotengine.org/download/preview/) | Estável 4.7.2 e 4.8-dev7 nesta consulta. Não escolher versão de desenvolvimento como base só pelo vídeo. |
| [Godot: screen-reading shaders](https://docs.godotengine.org/en/stable/tutorials/shaders/screen-reading_shaders.html) | Normal/roughness da tela exige Forward+; prever variante móvel. |
| [PixelageGames demo](https://pixelagegames.itch.io/godot-3d-pixelart-demo) | Download livre para estudo; arquivo fornecido inclui LICENSE MIT, shader e demo pequeno. |
| [Octopath, entrevista Epic](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true) | Corrige generalização sobre personagens 3D em todo HD-2D. |

Não concluir que um modelo é utilizável para qualquer finalidade por ter apenas o código livre. Registrar versão, origem e licença de cada checkpoint e recurso selecionado. Não distribuir pesos de geração no aplicativo. Essa distinção serve à escolha de dependências do projeto, não é uma certificação jurídica de todo conteúdo produzido.

## Registro para retomada

Direção recomendada: piloto de 3D real estilizado com pixelização no runtime; referência compacta/adulta; família de rig e itens preparada; movimentos gratuitos adaptados; laboratório Godot estável; engine final decidida após prova. O usuário pediu este plano, não autorizou instalar ou substituir o jogo nesta sessão.

O inventário em `research/3d-pixel-art-2026-10-07/inventory.json` conserva títulos, caminhos, durações e dimensões dos arquivos locais. Esses caminhos e as referências visuais são material de pesquisa privada, não assets distribuíveis. Análise completa não equivale a testes dos geradores ou aprovação de arte nova.
