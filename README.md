# Darkstar Forge

Estúdio de criação de cartas do **Darkstar**, um TCG que funciona como um RPG de mesa em cartas. Cada cor de deck é um par de classes, com base em Pathfinder 2e e D&D 5e.

O programa roda totalmente no seu computador, sem servidor. Com ele você:

- cria e organiza as cartas por deck;
- personaliza cada peça do visual;
- monta a ficha e o boneco dos heróis;
- testa as cartas numa mesa de jogo contra um bot;
- exporta PNG em alta resolução e PDF para impressão (63 × 88 mm).

> **Licença:** software livre sob a GPL-3.0. A propriedade intelectual do Darkstar (nome, marca, artes, personagens, textos) **não** está coberta pela GPL.

## Como abrir

- **Pelo menu de aplicativos:** o atalho *Darkstar Forge* abre o programa.
- **Pela pasta:** dê dois cliques no script `Darkstar Forge`. Ele abre o AppImage mais recente de `release/`; se ainda não houver um, ele compila e abre.
- **Instaladores:** estão em [Releases](../../releases) (Linux AppImage/deb, Windows).

## O que tem dentro

| Tela | O que faz |
|---|---|
| **Biblioteca** | Coleções e decks com contagem de cartas, busca, filtros (tipo, custo, raridade, etiqueta), curva de custo, seleção múltipla, mover entre decks, PNG (zip) e PDF. Importa artes em lote pelo nome do arquivo, com escolha entre variações (ver grande, apagar, gerar mais pelo ComfyUI). Os botões **Editar coleção** e **Editar este deck** abrem a tela de tema. As cartas aparecem completas em alta resolução: cada uma é desenhada uma vez e guardada. |
| **Editor** | Abas **Texto** (PT/EN, símbolos no texto), **Jogo** (classes, custos, ATK/DEF, raridade, regra de custo, efeitos da Mesa; em cartas de equipamento, o espaço e os bônus), **Arte** (enviar, enquadrar, zoom, espelhar, pixelar) e **Aparência** (ajustes só daquela carta). Tem desfazer/refazer e Ctrl+S, e só grava ao salvar. |
| **Tema** | Aparência do deck inteiro ou da coleção, com carta de amostra: 14 estilos que se misturam peça a peça, cores de fundo/texto/destaque por peça (ataque e defesa separados), símbolos por recurso e por classe em 5 acabamentos ou com imagens suas (inclui uma coleção 3D), tamanhos e espaçamento. |
| **Verso** | Verso de cada coleção: estilo, cores, padrão, arte de fundo, emblema e título. |
| **Herói** | Galeria e ficha de cada herói: boneco em pixel art montado por peças (vira o retrato e a miniatura do campo), atributos, cartas de equipamento vestidas e dados de jogo. |
| **Mesa** | Protótipo jogável contra um bot: seleção de heróis e de cenário, mão inicial com troca, campo com bonecos animados, reações, níveis, efeitos visíveis, registro da batalha, música e sons. |
| **Ajustes** | Coleção aberta (nome, sigla e logo), decks, backup (.zip), restauração, planilha (.csv), espaço usado e créditos. |

## Artes

As artes das cartas e os cenários da Mesa são gerados no próprio computador pelo ComfyUI (Flux.1 dev + LoRA "Modern Pixel Art"). Os scripts ficam em `tools/comfyui/`; veja também [docs/artes.md](docs/artes.md).

## Para desenvolver

```bash
npm install
npm run dev          # abre em http://localhost:5173 (mostruário de estilos em /mostruario.html)
npm test             # testes automáticos
npm run app          # compila e abre no Electron
npm run dist:linux   # gera AppImage + deb em release/
npm run dist:windows # gera o instalador do Windows
```

### Organização do código

```
src/
  render/      motor de desenho da carta: SVG → imagem
    elements/  os estilos, peça a peça (ornado.ts, gotico.ts, …)
    icons/     símbolos (game-icons.net) e acabamentos
    compose.ts monta a carta; layout.ts, text.ts, palette.ts, defs.ts
    queue.ts   fila de imagens em alta resolução com cache
  model/       tipos, catálogo (classes, recursos, raridades), custos, pontuação, dados iniciais
  store/       banco local (IndexedDB), salvamento carta a carta, imagens
  ui/          telas (Svelte 5): library, editor, sheet, settings, common
  export/      PNG, PDF, backup, CSV
  data/        cartas de exemplo, tabela de mecânicas, raças
electron/      janela do programa desktop (segura: sem Node na página)
tests/         testes (Vitest)
```

Símbolos: [game-icons.net](https://game-icons.net), CC BY 3.0 (créditos no programa). Fontes: SIL OFL.
