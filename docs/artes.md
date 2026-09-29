# Artes das cartas com o ComfyUI

As 81 cartas da coleção **Classes — Pathfinder** têm um prompt pronto cada, no estilo das artes de
Magic: The Gathering (`tools/comfyui/prompts-pf.json`). O script abaixo manda todos para o seu
ComfyUI e salva cada imagem com o nome que o Darkstar Forge entende.

## 1. Abra o ComfyUI

No terminal (fish), **com o venv ativado**. Sem ele, o Python pega outro pacote `comfy` e dá o
erro `No module named 'comfy.options'`:

```
cd ~/ComfyUI
source venv/bin/activate.fish
python main.py
```

Espere aparecer `To see the GUI go to: http://127.0.0.1:8188` e deixe essa janela aberta.
Não precisa abrir o navegador nem montar o fluxo: o script faz isso sozinho.

## 2. Veja os modelos e faça um teste com 3 cartas

Em **outro** terminal (aqui não precisa do venv):

```
cd ~/Downloads/"Darkstar Forge"
python3 tools/comfyui/gerar_artes.py --listar
python3 tools/comfyui/gerar_artes.py --so pf-red_001,pf-blue_002,pf-equipment_001
```

O script reconhece sozinho o **Flux em arquivos separados**, que é o mesmo fluxo do exemplo
"Flux Dev" do ComfyUI:
- modelo em `models/diffusion_models` ou `unet`;
- codificadores de texto `t5xxl` e `clip_l` em `models/text_encoders` ou `clip`;
- VAE `ae` em `models/vae`.

Com o Flux, ele usa 832×1152, 20 passos, guidance 3.5 e euler/simple. Se você tiver mais de um
arquivo de cada tipo, escolha com `--modelo`, `--t5`, `--clip-l` e `--vae` (os nomes aparecem no
`--listar`). Modelos de arquivo único (SDXL etc., em `models/checkpoints`) também funcionam.

As imagens vão para a pasta `artes-pf/`. Se gostar, gere todas (as que já existem são puladas):

```
python3 tools/comfyui/gerar_artes.py
```

Dicas:

- `--variacoes 3` gera 3 versões de cada carta (`pf-red_001.png`, `pf-red_001__v2.png`, `pf-red_001__v3.png`).
  Fique com a melhor e renomeie para `pf-red_001.png`.
- `--refazer --so pf-red_004 --semente 123` gera de novo uma carta que não ficou boa (outra semente = outra imagem).
- Pouca memória na placa de vídeo: `--peso fp8_e4m3fn` (Flux) ou `--largura 640 --altura 896`.
- Se as 3 primeiras cartas derem erro, o script para e mostra o motivo. Mande o print.
- O Flux costuma "assinar" o quadro no canto de baixo. Por isso o script gera a imagem 64 px mais alta e corta
  essa faixa antes de salvar (a imagem final continua 832×1152). `--corte 128` corta mais; `--corte 0` desliga.

## 3. Coloque as artes nas cartas

No Darkstar Forge: **Biblioteca → Coleção "Classes — Pathfinder" → Importar artes** e selecione
todas as imagens da pasta `artes-pf`. Cada uma vai para a carta do mesmo nome
(`pf-red_001.png` = carta nº 1 do deck vermelho da coleção). Também funciona com o nome da carta
(`corte-duplo.png` ou `Corte Duplo.jpg`).

Depois, na aba **Arte** do editor, dá para arrastar e dar zoom para enquadrar melhor.

## Usar outra IA (ChatGPT, Midjourney…)

Todos os prompts estão em `docs/prompts-pf.md`, prontos para copiar e colar, com o nome do arquivo
de cada carta. Salve as imagens com esses nomes e importe do mesmo jeito.
