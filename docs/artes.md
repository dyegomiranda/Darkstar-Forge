# Artes das cartas com o ComfyUI

As 81 cartas da coleção **Classes — Pathfinder** têm um prompt pronto cada, no estilo das artes de
Magic: The Gathering (`tools/comfyui/prompts-pf.json`). O script abaixo manda todos para o seu
ComfyUI e salva cada imagem com o nome que o Darkstar Forge entende.

## 1. Abra o ComfyUI

No terminal:

```
cd ~/ComfyUI
python3 main.py
```

Deixe essa janela aberta. Você precisa de pelo menos um modelo em `ComfyUI/models/checkpoints`.
Modelos **SDXL** voltados a fantasia/ilustração costumam dar resultados melhores que os SD 1.5.

## 2. Veja os modelos e faça um teste com 3 cartas

Em **outro** terminal, na pasta do projeto:

```
cd ~/Downloads/"Darkstar Forge"
python3 tools/comfyui/gerar_artes.py --listar
python3 tools/comfyui/gerar_artes.py --modelo NOME_DO_MODELO --so pf-red_001,pf-blue_002,pf-equipment_001
```

As imagens vão para a pasta `artes-pf/`. Se gostar, gere todas (as que já existem são puladas):

```
python3 tools/comfyui/gerar_artes.py --modelo NOME_DO_MODELO
```

Dicas:

- `--variacoes 3` gera 3 versões de cada carta (`pf-red_001.png`, `pf-red_001__v2.png`, `pf-red_001__v3.png`).
  Fique com a melhor e renomeie para `pf-red_001.png`.
- `--refazer --so pf-red_004` gera de novo uma carta que não ficou boa (mude também `--semente 123`
  para sair uma imagem diferente).
- Modelo **Flux**: o script ajusta sozinho (cfg 1, sampler euler).
- Placa de vídeo com pouca memória: use `--largura 640 --altura 896`.

## 3. Coloque as artes nas cartas

No Darkstar Forge: **Biblioteca → Coleção "Classes — Pathfinder" → Importar artes** e selecione
todas as imagens da pasta `artes-pf`. Cada uma vai para a carta do mesmo nome
(`pf-red_001.png` = carta nº 1 do deck vermelho da coleção). Também funciona com o nome da carta
(`corte-duplo.png` ou `Corte Duplo.jpg`).

Depois, na aba **Arte** do editor, dá para arrastar e dar zoom para enquadrar melhor.

## Usar outra IA (ChatGPT, Midjourney…)

Todos os prompts estão em `docs/prompts-pf.md`, prontos para copiar e colar, com o nome do arquivo
de cada carta. Salve as imagens com esses nomes e importe do mesmo jeito.
