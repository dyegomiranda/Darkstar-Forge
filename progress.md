# Void Sun — progresso

**Atualizado:** 02/10/2026 (versão 3.2: tela de abertura do desenvolvedor e aviso da primeira vez)
**Como abrir:** atalho *Void Sun* no menu de aplicativos, ou o script `Void Sun` na pasta.
**Código antigo:** preservado no git na etiqueta `legado-v1`. Até a 2.9 o programa se chamava Darkstar Forge.

## Versão 3.2 (02/10/2026)

- [x] Tela de abertura com o logotipo do desenvolvedor ("Developed by" + o demônio guitarrista + "Djabo"); some sozinha e qualquer clique ou tecla pula
- [x] Aviso da primeira vez que o jogo abre (duas páginas, PT/EN): "Entendido!" não mostra mais, "Sair" fecha o jogo
- [x] Tela inicial: à esquerda do sol só o feixe roxo (os raios do sol ficam só do lado direito)

## Versão 3.1 (02/10/2026)

- [x] Abrir Configurações não muda mais o tamanho da janela; o modo guardado pelo programa é a referência
- [x] Resoluções até a maior tela ligada (2K, 4K) e escala da interface automática (a mesma aparência em 1080p, 2K e 4K)
- [x] Tela inicial: sem o subtítulo, feixe roxo também à esquerda do sol (a mesma arte, espelhada no lugar) e música épica própria (coro, metais, cordas e tambores)
- [x] Aparência é a 2ª aba; paleta e efeitos ficam embaixo das miniaturas; bonecos sempre centralizados
- [x] Categoria Olhos (16 olhares, ciclope, 31 cores: naturais e de monstro), sobrancelhas, 7 tons de cabelo entre o castanho e o preto, pele negra
- [x] Raça do boneco (orc, goblin, troll, draconato, vampiro, esqueleto…) e a ancestralidade escolhida já veste o boneco
- [x] 14 conjuntos de armadura e roupa (Daédrico, Ébano, Sombra da noite, Celestial…), 12 metais e 7 tecidos novos, adornos e viseiras de elmo
- [x] Armas e escudos: tinta do metal/pintura e magia imbuída (aura, chamas, fumaça, faíscas) com cor
- [x] Equipamento: o boneco no centro com os espaços dos lados; a escolha abre numa janela por cima, com a carta grande ao lado
- [x] Atributos: o que cada um faz, quantas cartas do deck pedem e sugestões prontas que distribuem os pontos
- [x] Zoom das cartas em fileira (mão inicial, mão da batalha): cresce no lugar e as vizinhas abrem espaço, sem atraso
- [x] Esc na batalha pausa o jogo e abre o menu no centro da tela

## Versão 3.0 (02/10/2026)

### De editor com jogo dentro para jogo com editor dentro
- [x] Novo nome: **Void Sun** (janela, atalho, lançador, pacote, textos); os dados continuam na mesma pasta do computador
- [x] Tela inicial em pixel art (arte do sol eclipsado, logotipo dentro do disco, coroa pulsando, estrelas e brasas) com o menu principal
- [x] Campanha e Multijogador aparecem apagados, com o adesivo "Em construção"
- [x] A barra lateral saiu: cada tela tem uma barra no alto (voltar, título, ações) e o Esc abre o menu de pausa
- [x] Modo batalha → Solo / Multijogador; Sobre o jogo (com os créditos)

### Criação de personagem
- [x] Herói novo começa do zero (sem modelo); dá para duplicar um herói existente
- [x] Rascunho: botão "Salvar personagem", "Descartar" e pergunta ao sair com alterações
- [x] Atributos com limite: 18 pontos, máximo 18 por atributo, bônus da ancestralidade por cima; os atributos de jogo passam a ser os modificadores da ficha
- [x] Todo herói pode batalhar (fichas antigas sem dados de jogo ganham os da classe)
- [x] Aparência refeita: categorias à esquerda e uma miniatura por opção, já no herói
- [x] Mais de 200 peças: camiseta, casacos, vestidos, quimonos, 33 coberturas de cabeça, 28 armas, bigodes, narizes, orelhas, cintos, colares, mochilas…
- [x] Chifres, asas e cauda com cor própria; barba por fazer translúcida; barba e bigode nascem da cor do cabelo
- [x] Botões de animação corrigidos ("Ataque da arma" fica marcado enquanto toca)
- [x] Equipamento: seletor em tela cheia com cartas grandes e zoom no lugar

### Batalha
- [x] Dificuldade: Muito fácil, Fácil, Normal, Difícil (o bot de antes) e Muito difícil (planeja o turno e começa com +5 de vida e 1 carta a mais)
- [x] Atalhos de teclado (encerrar turno, golpear, trocar posição, registro) e Esc abrindo o menu da partida

### Configurações
- [x] Vídeo: em janela (com resolução), maximizada ou tela cheia; escala da interface; qualidade gráfica; contador de quadros
- [x] Som: volume geral, música, efeitos, silenciar, silenciar em segundo plano
- [x] Jogo: idioma, dificuldade, velocidade, limite de tempo, registro
- [x] Controles: teclas configuráveis e joystick (navegação por direcional em todas as telas)

## Versão 2.3 (30/09/2026)

### Aparência sem sustos
- [x] A pré-visualização não percebia mudanças no tema do deck (parecia que o estilo não mudava) — corrigido
- [x] "Onde as mudanças valem": **esta carta**, **deck inteiro** ou **coleção inteira**; tudo é rascunho (Salvar liga, Descartar desfaz)
- [x] Ao aplicar ao deck/coleção, as cartas deixam o ajuste próprio naquela peça e seguem o tema; na coleção, cada deck mantém cores e símbolos de classe/custo
- [x] Tamanho dos símbolos de custo, classe, ATK, DEF e do selo da edição
- [x] Biblioteca: a carta sobe e cresce ao passar o mouse; zoom mais rápido

### Estilos refeitos a partir das referências
- [x] Cada estilo pode ter arranjo próprio (onde fica cada peça), moldura com fundo e janela de arte
- [x] Vazio (Dracanis Void), Espectral (TCG Vol. 5), Energia (tipo V), Pixel Aço (TCG Creator vol. 18), Pixel Sombrio (Fantasy TCG Pixel Art)

### Regras
- [x] Proposta de regras publicada para discussão: níveis e mana, XP, três ações, frente e retaguarda, ficha como herói

## Versão 2.2 (29/09/2026)

### Peças feitas de imagem
Os estilos desenhados por código não reproduzem modelos pintados à mão; por isso agora dá para usar as próprias imagens.
- [x] Em Aparência, cada peça (e a moldura inteira) aceita um PNG/WebP/SVG no lugar do desenho do estilo
- [x] Encaixe: esticar, 9 partes (cantos fixos, para barras e caixa de regras que mudam de tamanho) ou manter proporção
- [x] Ajuste fino de posição e tamanho, margens do texto, tamanho das bordas e tingir com a cor da carta
- [x] "Só o texto, sem fundo": útil quando a moldura inteira já é uma imagem (modelo com a janela da arte transparente)
- [x] Funciona no editor, na biblioteca, no PNG/PDF exportado, no backup e como tema do deck
- [x] Correção: carta com ajustes próprios de aparência não abria de novo no editor

### Símbolos, versão e artes
- [x] Versão do programa (e commit/data da compilação) na barra lateral, abaixo do PT/EN
- [x] Carta de várias classes mostra um símbolo por classe no selo, que se alarga (como o de custo); opção em Aparência para mostrar só o da 1ª classe
- [x] Símbolos próprios: custo, classe, ATK e DEF aceitam uma imagem (PNG/SVG), com as cores originais ou pintada na cor escolhida
- [x] Biblioteca → **Importar artes**: várias imagens de uma vez, cada uma na carta do mesmo nome (`pf-red_001.png` ou `corte-duplo.png`)
- [x] 81 prompts detalhados no estilo MTG (`tools/comfyui/prompts-pf.json` e `docs/prompts-pf.md`) e script que gera tudo no ComfyUI (`tools/comfyui/gerar_artes.py`, guia em `docs/artes.md`)

## Versão 2.1 (29/09/2026)

### Correções
- [x] Mudar o custo, o ATK, a DEF ou o recurso do custo no editor agora atualiza a carta na hora (antes a pré-visualização não percebia a mudança do número)
- [x] Símbolos no acabamento **Pixel** não somem mais quando ficam pequenos na tela (os "pixels" crescem conforme o símbolo diminui)

### Vários custos por carta
- [x] Cada carta pode ter até 4 custos, cada um com recurso e quantidade (ex.: 2 Vigor + 1 Mana)
- [x] Cada custo mostra o número ao lado do símbolo **ou** repete o símbolo (como no MTG, até 6 vezes)
- [x] O selo de custo se alarga nos 6 estilos; os símbolos diminuem e, se forem muitos, passam para duas fileiras; o nome da carta encolhe para dar espaço
- [x] Custo total = soma: vale na pontuação, na raridade automática, no filtro e na ordenação da biblioteca, na curva de custo e na planilha CSV
- [x] No modo automático, o primeiro recurso completa a diferença para o total sugerido
- [x] Cartas e backups antigos (um custo só) são convertidos sozinhos ao abrir

### Estilos novos (fase C)
- [x] **Pixel Sombrio** (ref.: "Dark Elf TCG Cards"): ferro escuro, arremates e chifres de osso, faixa do nome na cor da classe, selos redondos e pergaminho rasgado — desenhado pixel a pixel
- [x] **Vazio** (ref.: Pixarts "Void" Vol. 2): cromo com brilho na cor da classe, cantos em degrau, custo em gema facetada, soquetes redondos, faixa com pontas de andorinha
- [x] **Espectral** (ref.: Pixarts Vol. 5): prata com filigrana de espinhos, plaquinhas claras de pontas escuras, painel de texto claro e orbes vítreos
- [x] **Energia** (ref.: modelo "tipo V" da Etsy): corpo preto com faixa prateada em V, barra do nome em degradê da cor do tipo, esferas de energia (o custo vira esferas coloridas com o símbolo preto) e barras pretas com curvas prateadas
- [x] **Pixel Aço** (ref.: "TCG Creator vol. 18", Behance): moldura de aço chanfrada, placa do nome gravada, slots escuros para números, medalhão dentado e painel de pedra gasta; o metal escolhido vira a cor da moldura (aço, ouro, bronze, ferro ou cor da classe)
- [x] Motor de pixel art compartilhado (`src/render/elements/pxengine.ts`) para os estilos em pixel
- [x] Todos funcionam com vários custos, verso, miniaturas da Aparência e mistura peça a peça; cor, metal, transparência, texto e fonte ajustáveis

### Coleções
- [x] Seletor de coleção nas telas **Verso** e **Ajustes** (cada coleção tem seu verso, nome, sigla e logo)
- [x] No PDF frente e verso, cada carta leva o verso da **sua** coleção

## Versão 2.0 (28/09/2026)

### Reescrita
- [x] Vite + TypeScript + Svelte 5 + Electron seguro (protocolo `app://`, sem Node na página)
- [x] Modelo de dados único e versionado. O texto fica só em `text[idioma]`, e cada carta pertence a um deck
- [x] Banco IndexedDB: uma linha por carta, imagens como Blob e sem duplicar a mesma arte
- [x] Salvamento a cada carta alterada. Uma falha não trava os próximos salvamentos (antes travava até reabrir)
- [x] O editor trabalha numa cópia: "Descartar" volta de fato ao que estava salvo (antes não voltava)
- [x] O custo digitado à mão é respeitado (antes a pontuação sobrescrevia)
- [x] Exportação PNG/PDF com fontes e símbolos embutidos (antes saía sem eles)
- [x] Ids de SVG únicos por carta (antes a cor de uma carta vazava para outra)
- [x] Biblioteca com rolagem virtual e imagens em alta resolução guardadas em cache, desenhadas em segundo plano
- [x] Interface nova e responsiva: Biblioteca, Editor (Texto/Jogo/Arte/Aparência), Ficha e Ajustes
- [x] PT/EN em toda a interface e nas cartas
- [x] Testes automáticos (`npm test`)
- [x] Limpeza: cerca de 570 MB de lixo de build e o código antigo removidos

### Visual das cartas
- [x] 6 estilos misturáveis peça a peça: Ornado, Gótico, Arcano (astrolábio), Moderno, Selvagem e Pixel
- [x] Personalização por peça: cor, transparência, metal, cor do texto e fonte
- [x] Moldura em volta da carta opcional (o padrão é full art, sem borda)
- [x] Símbolos de game-icons.net em 4 acabamentos (metal gravado, medalhão, silhueta, pixel), com opções por recurso, classe, ATK e DEF
- [x] ATK/DEF em placas ou com o número no medalhão

### Depois da 2.0
- [x] Coleção **Classes (Pathfinder)**: 81 cartas (9 por deck) com a tabela de pontuação revisada
- [x] Verso das cartas e PDF frente e verso; até 5 cores por carta com modos de mistura

## Próximos passos
1. Decidir as perguntas em aberto da proposta de regras (mana única, 3 ações, dano que fica, saque)
2. Atualizar a tabela de mecânicas e o molde das cartas (◆ ações, fileira, XP) e reescrever as cartas de exemplo
3. Imprimir um deck de teste e jogar
4. Motor de regras e simulação (futuro)

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `src/render/compose.ts` | Monta a carta (peças + textos + símbolos) |
| `src/render/costSeal.ts` + `src/model/cost.ts` | Selo com vários custos; soma e conversão das cartas antigas |
| `src/render/elements/*.ts` | Os estilos, peça a peça |
| `src/render/icons/` | Símbolos e acabamentos |
| `src/model/scoring.ts` + `src/data/mechanics.json` | Balanceamento (pontos → custo → raridade) |
| `src/store/project.svelte.ts` | Estado e salvamento |
| `src/ui/editor/TabLook.svelte` | Painel de aparência |
| `mostruario.html` | Página de desenvolvimento com todos os estilos e símbolos |
