# Void Sun

**Void Sun** é um RPG de mesa em forma de jogo de cartas. Você é o herói: a ancestralidade, os atributos e o equipamento saem da sua ficha, e o deck são as habilidades da sua classe (cada cor de deck é um par de classes, com base em Pathfinder 2e e D&D 5e).

O jogo roda totalmente no seu computador, sem servidor. Ele traz:

- **Modo batalha** contra o jogo, com 7 heróis prontos (um por cor de classe) e cinco níveis de dificuldade;
- **Jornada**: o modo solo com progressão — um mapa sorteado a cada jornada, com regiões, inimigos de cada bioma, mini-chefes, acampamentos e um chefe no fim; o herói sobe de nível entre as batalhas e ganha cartas novas;
- **Cartas que evoluem** com o nível do herói e **decks de batalha** montados pelo jogador (40 cartas);
- **Criação de personagem**, com boneco em pixel art;
- **Construtor de decks**: um editor completo de cartas, decks, temas e coleções, com exportação em PNG e PDF para impressão (63 × 88 mm);
- configurações de vídeo, som, jogo e controles (teclado e joystick).

A **campanha** (mapa aberto, história, criaturas e chefes) e o **multijogador** estão em construção.

**Para jogar:** baixe o instalador em [Releases](https://github.com/dyegomiranda/Void-Sun/releases) — `.exe` no Windows, `.AppImage` ou `.deb` no Linux. Ele já traz os heróis, os decks e as artes das cartas.

> **Licença:** software livre sob a GPL-3.0. A propriedade intelectual do jogo (nome, marca, artes, personagens, textos) **não** está coberta pela GPL.

## Como abrir

- **Pelo menu de aplicativos:** o atalho *Void Sun* abre o jogo.
- **Pela pasta:** dê dois cliques no script `Void Sun`. Ele abre o AppImage mais recente de `release/`; se ainda não houver um, ele compila e abre.
- **Instaladores:** estão em [Releases](../../releases) (Linux AppImage/deb, Windows).

## O que tem dentro

| Tela | O que faz |
|---|---|
| **Tela inicial** | Menu principal: Campanha (em construção), Modo batalha, Criação de personagem, Construtor de decks, Configurações e Sobre o jogo. |
| **Modo batalha** | Solo (contra o jogo), Jornada (solo com progressão, mapa e chefe) ou Multijogador (em construção). Na batalha solo: seleção de heróis, cenário, dificuldade e velocidade; mão inicial com troca; campo com bonecos animados, reações, níveis, efeitos visíveis, registro, música e sons. |
| **Criação de personagem** | Galeria de heróis e o criador, em cinco abas: **Identidade** (nome, classe, ancestralidade, retrato, história), **Atributos** (18 pontos para distribuir, com limite), **Aparência** (boneco em pixel art, com uma miniatura por opção), **Equipamento** (cartas vestidas) e **Deck e recursos**. Trabalha num rascunho: só "Salvar personagem" grava. |
| **Construtor de decks** | **Biblioteca** (coleções, decks, busca, filtros, curva de custo, importação de artes, PNG e PDF), **Editor** de carta (texto, jogo, arte, aparência), **Tema** do deck ou da coleção (14 estilos que se misturam peça a peça), **Coleção** (nome, sigla, selo e decks) e **Verso** das cartas. |
| **Configurações** | **Vídeo** (em janela, maximizada ou tela cheia; resolução; escala da interface; qualidade gráfica; contador de quadros), **Som** (geral, música, efeitos), **Jogo** (idioma, dificuldade, velocidade, limite de tempo), **Controles** (teclas configuráveis e joystick) e **Dados** (backup, restauração, planilha, espaço usado). |
| **Sobre o jogo** | O que é o Void Sun, versão e créditos. |

### Controles

- **Teclado:** setas navegam por qualquer tela, Enter confirma, Esc fecha o que estiver aberto ou abre o menu. Na batalha: `E` encerra o turno, `G` golpeia, `T` troca de posição, `L` abre o registro (todas configuráveis). F11 alterna a tela cheia.
- **Joystick:** direcional ou alavanca esquerda navegam, A confirma, B volta, X golpeia, Y encerra o turno, LB/RB trocam de aba, Start abre o menu.

## Artes

A arte da tela inicial e dos modos, as artes das cartas e os cenários do campo são gerados no próprio computador pelo ComfyUI (Flux.1 dev + LoRA "Modern Pixel Art"). Os scripts ficam em `tools/comfyui/` (`gerar_telas.py`, `gerar_cenarios.py`, `gerar_proto.py`); veja também [docs/artes.md](docs/artes.md). As peças dos bonecos vêm do Liberated Pixel Cup (`tools/lpc/montar.py`).

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
  app/         moldura do jogo: rotas, configurações, teclado e joystick, estilos
  game/        regras da batalha (motor), bot com níveis de dificuldade, decks do protótipo
  avatar/      boneco do herói em pixel art (peças do LPC) e criaturas do campo
  render/      motor de desenho da carta: SVG → imagem
    elements/  os estilos, peça a peça (neutro.ts, gotico.ts, …)
    icons/     símbolos (game-icons.net) e acabamentos
    compose.ts monta a carta; layout.ts, text.ts, palette.ts, defs.ts
    queue.ts   fila de imagens em alta resolução com cache
  model/       tipos, catálogo (classes, recursos, raridades), regras da ficha do herói, equipamento, dados iniciais
  store/       banco local (IndexedDB), salvamento carta a carta, imagens
  ui/          telas (Svelte 5): home, game, hero, library, editor, settings, common
  export/      PNG, PDF, backup, CSV
  data/        cartas de exemplo, tabela de mecânicas, raças, catálogo de peças do boneco
electron/      janela do jogo (segura: sem Node na página) e a ponte para modo de tela e escala
tests/         testes (Vitest); tools/sim/ tem os simuladores bot × bot
```

Símbolos: [game-icons.net](https://game-icons.net), CC BY 3.0 (créditos no jogo). Fontes: SIL OFL.
