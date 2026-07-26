# Plano — Studio de Cartas (TCG × RPG)

## Objetivo

Ferramenta local (HTML/JS, sem servidor) para **criar, organizar, editar, exportar e imprimir** cartas de um TCG híbrido com RPG de mesa. O design full-art atual é o **template inicial**, não o único.

## Requisitos confirmados

| # | Requisito | Solução |
|---|-----------|---------|
| 1 | Biblioteca, não editor de 1 carta | Edições → Decks/cores → Cartas, navegação + busca |
| 2 | Nome/rodapé/símbolo abertos | Campos editáveis por carta + defaults da edição |
| 2b | Templates modulares | Registry de templates (`classic-fullart` + slots futuros) |
| 3 | ATK/DEF opcional | Toggle `showCombat` |
| 4 | Personalização + híbridos | Cores múltiplas, opacity, stroke, glow, overrides |
| 5 | Ícones novos | SVG em `assets/icons/` |
| Print | Deck inteiro em tamanho MTG | 63×88 mm (2,5×3,5 in), 300 dpi export |

## Arquitetura

```
index.html
css/app.css
js/
  core/store.js       — persistência localStorage + import/export JSON
  core/id.js          — IDs
  data/catalog.js     — cores, recursos, raridades (canônico)
  data/seed.js        — 1ª edição + exemplos deck vermelho
  templates/
    registry.js
    classicFullArt.js — geometria + SVG do frame (ponto de partida)
  render/
    cardView.js       — monta a carta no DOM
    export.js         — PNG e impressão
  ui/
    app.js            — shell, rotas internas
    library.js        — biblioteca
    editor.js         — editor da carta
```

### Modelo de dados (resumo)

- **Project**: meta + edições
- **Edition**: nome, código, símbolo de set padrão, rodapé padrão, decks
- **Deck**: cor(es) `[red]` ou híbrido `[red, blue]`, classes, lista de cardIds
- **Card**: campos de jogo + `templateId` + `style` + `art` + `showCombat` + custos multi-recurso

Persistência: `localStorage` chave `tcg-studio-v1` + botões **Exportar/Importar projeto JSON**.

## Template system

Cada template implementa:

```js
{
  id, name,
  width: 750, height: 1050, // px @ ~300dpi para 2.5×3.5"
  buildFrame(svg, card, colors),
  layout(card) // boxes para texto/ícones
}
```

Trocar de template na UI só muda o renderer; dados da carta permanecem.

## Fases de implementação (esta entrega = F0–F2)

1. **F0** — Shell + store + seed + classic-fullart utilizável  
2. **F1** — Biblioteca (edições/decks/cartas) + editor completo  
3. **F2** — Export PNG + impressão de deck MTG  
4. **F3** (depois) — Designer visual de templates, segunda skin, scores de balanceamento  
5. **F4** (depois) — Conteúdo em massa (50 cartas/deck) com inspiração Pathfinder (nomes/mecânicas originais)

## Impressão MTG

- Carta lógica: **750×1050 px** (proporção 5:7)  
- CSS print: **63 mm × 88 mm** (aproximação prática de 63,5×88,9)  
- Modo “imprimir deck”: grade ou uma carta por página, só as cartas filtradas

## Direitos autorais / conteúdo

- Pathfinder/D&D: **inspiração de arquétipos**, sem copiar texto oficial  
- Nomes e regras das cartas: originais do projeto  
- Ícones e frames: gerados no studio

## Não-objetivos desta entrega

- Motor de regras / simulação de partida  
- Multiplayer  
- Conta na nuvem (só JSON local)
