# Darkstar Forge

Estúdio de criação de cartas do **Darkstar**, um TCG que funciona como um RPG de mesa em cartas. Cada cor de deck é um par de classes, com base em Pathfinder 2e e D&D 5e.

O programa roda totalmente no seu computador, sem servidor. Com ele você:

- cria e organiza as cartas por deck;
- personaliza cada peça do visual;
- monta a ficha dos personagens;
- exporta PNG em alta resolução e PDF para impressão (63 × 88 mm).

> **Licença:** software livre sob a GPL-3.0. A propriedade intelectual do Darkstar (nome, marca, artes, personagens, textos) **não** está coberta pela GPL.

## Como abrir

- **Pelo menu de aplicativos:** o atalho *Darkstar Forge* abre o programa.
- **Pela pasta:** dê dois cliques no script `Darkstar Forge`. Ele abre o AppImage mais recente de `release/`; se ainda não houver um, ele compila e abre.
- **Instaladores:** estão em [Releases](../../releases) (Linux AppImage/deb, Windows).

## O que tem dentro

| Tela | O que faz |
|---|---|
| **Biblioteca** | Coleções (ex.: 1ª Edição e Classes — Pathfinder), decks com contagem 50/50, busca, filtros (tipo, custo, raridade, etiqueta), curva de custo, seleção múltipla, mover entre decks, PNG (zip) e PDF. As cartas aparecem completas em alta resolução: cada uma é desenhada uma vez e guardada, então a biblioteca abre na hora. |
| **Editor** | Abas **Texto** (PT/EN, símbolos no texto), **Jogo** (classes, até 4 custos por carta — cada um com recurso, quantidade e número ou símbolo repetido —, custo total automático ou manual, ATK/DEF, raridade, mecânicas com pontuação), **Arte** (enviar, enquadrar arrastando, zoom, espelhar, pixelar) e **Aparência**. Tem desfazer/refazer e Ctrl+S, e só grava ao salvar. |
| **Aparência** | 11 estilos (Ornado, Gótico, Arcano, Moderno, Selvagem, Pixel, Pixel Sombrio, Vazio, Espectral, Energia, Pixel Aço) que podem ser misturados peça a peça. Cada peça aceita cor, transparência, metal, cor do texto e fonte. Os símbolos vêm em 4 acabamentos (metal gravado, medalhão, silhueta, pixel), e ATK/DEF podem ficar em placas ou com o número no medalhão. **Imagem própria:** qualquer peça (ou a moldura inteira) pode ser um PNG de um modelo pronto, esticado, em 9 partes (cantos fixos) ou na proporção, com ajuste fino, margens do texto e tingimento pela cor da carta. Vale só para a carta ou como **tema do deck**. |
| **Verso** | Verso de cada coleção: estilo, cores, padrão, arte de fundo, emblema e título. No PDF frente e verso, cada carta sai com o verso da sua coleção. |
| **Ficha** | Vários personagens, com retrato, ancestralidade, classes, nível, pontos de vida, atributos com modificador e equipamento em "boneco" usando as cartas do deck de Equipamentos. Pode ser impressa. |
| **Ajustes** | Coleção aberta (nome, sigla e logo), tema de cada deck, backup (.zip), restauração, planilha (.csv), espaço usado e créditos. |

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
