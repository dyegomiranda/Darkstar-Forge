# Darkstar Forge — progresso

**Atualizado:** 29/09/2026 (versão 2.2: peças feitas de imagem)
**Como abrir:** atalho *Darkstar Forge* no menu de aplicativos, ou o script `Darkstar Forge` na pasta.
**Código antigo:** preservado no git na etiqueta `legado-v1`.

## Versão 2.2 (29/09/2026)

### Peças feitas de imagem
Os estilos desenhados por código não reproduzem modelos pintados à mão; por isso agora dá para usar as próprias imagens.
- [x] Em Aparência, cada peça (e a moldura inteira) aceita um PNG/WebP/SVG no lugar do desenho do estilo
- [x] Encaixe: esticar, 9 partes (cantos fixos, para barras e caixa de regras que mudam de tamanho) ou manter proporção
- [x] Ajuste fino de posição e tamanho, margens do texto, tamanho das bordas e tingir com a cor da carta
- [x] "Só o texto, sem fundo": útil quando a moldura inteira já é uma imagem (modelo com a janela da arte transparente)
- [x] Funciona no editor, na biblioteca, no PNG/PDF exportado, no backup e como tema do deck
- [x] Correção: carta com ajustes próprios de aparência não abria de novo no editor

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
1. Gerar e testar o executável (AppImage) no computador Linux do usuário
2. Artes das cartas de exemplo
3. Motor de regras e simulação (futuro)

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
