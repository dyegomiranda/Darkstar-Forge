#!/usr/bin/env python3
"""
Gera as artes das cartas no ComfyUI (no seu computador) a partir de prompts-pf.json.

Uso básico (com o ComfyUI aberto):
    python3 tools/comfyui/gerar_artes.py

Cada imagem é salva como <id>.png (ex.: artes-pf/pf-red_001.png), o nome que a
Biblioteca → "Importar artes" do Darkstar Forge entende. Veja docs/artes.md.

Só usa a biblioteca padrão do Python (nada para instalar).
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

AQUI = os.path.dirname(os.path.abspath(__file__))


def pedir(url, dados=None, tempo=60):
    req = urllib.request.Request(url, data=json.dumps(dados).encode() if dados is not None else None,
                                 headers={"Content-Type": "application/json"} if dados is not None else {})
    with urllib.request.urlopen(req, timeout=tempo) as r:
        return r.read()


def modelos(servidor):
    info = json.loads(pedir(f"{servidor}/object_info/CheckpointLoaderSimple"))
    return info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]


def fluxo(ckpt, positivo, negativo, a):
    """Fluxo simples texto → imagem (formato de API do ComfyUI)."""
    return {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": a.largura, "height": a.altura, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": positivo, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negativo, "clip": ["4", 1]}},
        "3": {"class_type": "KSampler", "inputs": {
            "seed": a._semente, "steps": a.passos, "cfg": a.cfg, "sampler_name": a.sampler, "scheduler": a.scheduler,
            "denoise": 1.0, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "darkstar/" + a._nome, "images": ["8", 0]}},
    }


def gerar(servidor, wf, tempo_max):
    cliente = str(uuid.uuid4())
    r = json.loads(pedir(f"{servidor}/prompt", {"prompt": wf, "client_id": cliente}))
    if "prompt_id" not in r:
        raise RuntimeError(f"o ComfyUI recusou o pedido: {r}")
    pid = r["prompt_id"]
    inicio = time.time()
    while time.time() - inicio < tempo_max:
        hist = json.loads(pedir(f"{servidor}/history/{pid}"))
        if pid in hist:
            item = hist[pid]
            status = item.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"erro no ComfyUI: {status.get('messages')}")
            for saida in item.get("outputs", {}).values():
                for img in saida.get("images", []):
                    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img.get("subfolder", ""), "type": img.get("type", "output")})
                    return pedir(f"{servidor}/view?{q}", tempo=120)
            if status.get("completed"):
                raise RuntimeError("o ComfyUI terminou sem devolver imagem")
        time.sleep(1.5)
    raise TimeoutError("demorou demais (use --tempo-max para esperar mais)")


def main():
    p = argparse.ArgumentParser(description="Gera as artes das cartas do Darkstar Forge no ComfyUI.")
    p.add_argument("--servidor", default="http://127.0.0.1:8188", help="endereço do ComfyUI (padrão: %(default)s)")
    p.add_argument("--modelo", help="nome do checkpoint (veja com --listar); padrão: o primeiro SDXL encontrado")
    p.add_argument("--listar", action="store_true", help="só mostra os modelos (checkpoints) instalados")
    p.add_argument("--prompts", default=os.path.join(AQUI, "prompts-pf.json"))
    p.add_argument("--saida", default="artes-pf", help="pasta onde salvar (padrão: %(default)s)")
    p.add_argument("--so", help="gerar só estas cartas, separadas por vírgula (ex.: pf-red_001,pf-blue_009)")
    p.add_argument("--variacoes", type=int, default=1, help="quantas versões por carta (as extras viram <id>__v2.png…)")
    p.add_argument("--refazer", action="store_true", help="gera de novo mesmo se o arquivo já existir")
    p.add_argument("--largura", type=int, default=832)
    p.add_argument("--altura", type=int, default=1216)
    p.add_argument("--passos", type=int, default=30)
    p.add_argument("--cfg", type=float, default=6.0)
    p.add_argument("--sampler", default="dpmpp_2m")
    p.add_argument("--scheduler", default="karras")
    p.add_argument("--semente", type=int, default=2026, help="semente base (mesma semente = mesma imagem)")
    p.add_argument("--tempo-max", type=int, default=900, help="segundos de espera por imagem")
    a = p.parse_args()

    try:
        lista = modelos(a.servidor)
    except (urllib.error.URLError, OSError) as e:
        sys.exit(f"Não consegui falar com o ComfyUI em {a.servidor} ({e}).\nAbra o ComfyUI primeiro (cd ~/ComfyUI && python3 main.py) e rode de novo.")
    if a.listar or not lista:
        print("Modelos instalados:" if lista else "Nenhum modelo (checkpoint) instalado em ComfyUI/models/checkpoints.")
        for m in lista:
            print("  -", m)
        return
    ckpt = a.modelo or next((m for m in lista if "xl" in m.lower()), lista[0])
    if ckpt not in lista:
        sys.exit(f"Modelo '{ckpt}' não encontrado. Use --listar para ver os nomes.")
    if "flux" in ckpt.lower() and a.cfg == 6.0:
        # modelos Flux trabalham com cfg 1 e sampler euler
        a.cfg, a.sampler, a.scheduler = 1.0, "euler", "simple"
    print(f"Modelo: {ckpt}  ·  {a.largura}×{a.altura}  ·  {a.passos} passos  ·  cfg {a.cfg}  ·  {a.sampler}/{a.scheduler}")

    cartas = json.load(open(a.prompts, encoding="utf-8"))["cards"]
    if a.so:
        quero = {x.strip() for x in a.so.split(",") if x.strip()}
        cartas = [c for c in cartas if c["id"] in quero]
        faltam = quero - {c["id"] for c in cartas}
        if faltam:
            print("Aviso: não achei", ", ".join(sorted(faltam)))
    os.makedirs(a.saida, exist_ok=True)

    total = len(cartas) * a.variacoes
    feito = 0
    for i, c in enumerate(cartas):
        for v in range(1, a.variacoes + 1):
            feito += 1
            nome = c["id"] if v == 1 else f"{c['id']}__v{v}"
            destino = os.path.join(a.saida, nome + ".png")
            if os.path.exists(destino) and not a.refazer:
                print(f"[{feito}/{total}] {nome} já existe — pulando")
                continue
            a._nome, a._semente = nome, a.semente + i * 97 + (v - 1) * 7919
            print(f"[{feito}/{total}] {c['nome']} ({nome}) …", end="", flush=True)
            t0 = time.time()
            try:
                png = gerar(a.servidor, fluxo(ckpt, c["prompt"], c["negative"] if a.cfg > 1.0 else "", a), a.tempo_max)
            except Exception as e:  # segue para a próxima carta
                print(f" ERRO: {e}")
                continue
            with open(destino, "wb") as f:
                f.write(png)
            print(f" ok ({time.time() - t0:.0f} s)")
    print(f"\nPronto. Imagens em: {os.path.abspath(a.saida)}")
    print("No Darkstar Forge: Biblioteca → coleção \"Classes — Pathfinder\" → Importar artes → selecione todas as imagens.")


if __name__ == "__main__":
    main()
