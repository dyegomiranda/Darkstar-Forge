#!/usr/bin/env python3
"""
Gera as artes das cartas no ComfyUI (no seu computador) a partir de prompts-pf.json.

Uso básico (com o ComfyUI aberto):
    python3 tools/comfyui/gerar_artes.py --listar     # mostra os modelos encontrados
    python3 tools/comfyui/gerar_artes.py              # gera as 81 artes

Funciona com os dois jeitos de instalar modelos no ComfyUI:
  - Flux (Dev/Schnell) em arquivos separados: modelo em models/diffusion_models (ou unet),
    codificadores de texto (t5xxl + clip_l) em models/text_encoders (ou clip) e VAE (ae) em models/vae
    — o mesmo fluxo do exemplo "Flux Dev" do ComfyUI;
  - modelo de arquivo único em models/checkpoints (SDXL, SD 1.5, Flux "checkpoint").

Cada imagem é salva como <id>.png (ex.: artes-pf/pf-red_001.png), o nome que a
Biblioteca → "Importar artes" do Void Sun entende. Veja docs/artes.md.

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

# Início comum dos prompts (prompts-pf.json). Para o Flux ele é trocado: citar "cartas de Magic"
# e "pintura a óleo" faz o Flux imitar carta impressa/quadro assinado e desenhar letras e
# assinaturas falsas nos cantos; e ele não entende "sem texto" (a negação só lembra o texto).
ESTILO_PADRAO = ("fantasy trading card game illustration in the style of Magic: The Gathering card art, "
                 "painterly digital oil painting, dramatic cinematic lighting, rich detailed textures, "
                 "epic composition, highly detailed, masterpiece")
ESTILO_FLUX = ("epic high fantasy concept art, painterly digital painting with visible brushstrokes, "
               "dramatic cinematic lighting, rich saturated colors, detailed textures, heroic composition, "
               "correct anatomy, the scene fills the entire picture edge to edge")


def prompt_flux(prompt):
    """Prompt adaptado ao Flux (ver ESTILO_FLUX)."""
    return ESTILO_FLUX + prompt[len(ESTILO_PADRAO):] if prompt.startswith(ESTILO_PADRAO) else prompt


def pedir(url, dados=None, tempo=60):
    req = urllib.request.Request(url, data=json.dumps(dados).encode() if dados is not None else None,
                                 headers={"Content-Type": "application/json"} if dados is not None else {})
    try:
        with urllib.request.urlopen(req, timeout=tempo) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        # o ComfyUI explica o problema no corpo da resposta (ex.: arquivo de modelo com outro nome)
        corpo = e.read().decode("utf-8", "replace")
        try:
            j = json.loads(corpo)
            msg = j.get("error", {}).get("message", "") if isinstance(j.get("error"), dict) else str(j.get("error", ""))
            detalhes = [f"{n}: {x.get('message')} {x.get('details', '')}".strip() for n, v in j.get("node_errors", {}).items() for x in v.get("errors", [])]
            corpo = "; ".join([m for m in [msg, *detalhes] if m]) or corpo
        except ValueError:
            pass
        raise RuntimeError(f"o ComfyUI recusou o pedido ({e.code}): {corpo[:600]}") from None


def opcoes(info, no, campo):
    """Lista de valores aceitos por um campo de um nó (ex.: arquivos de modelo)."""
    try:
        spec = info[no]["input"]["required"][campo]
    except (KeyError, TypeError):
        return []
    # formato antigo: [[opções], {...}]  ·  formato novo: ["COMBO", {"options": [...]}]
    if isinstance(spec, list) and spec:
        if isinstance(spec[0], list):
            return spec[0]
        if spec[0] == "COMBO" and len(spec) > 1 and isinstance(spec[1], dict):
            return spec[1].get("options", [])
    return []


def descobrir(servidor):
    """O que está instalado no ComfyUI."""
    info = {}
    for no in ("CheckpointLoaderSimple", "UNETLoader", "DualCLIPLoader", "VAELoader"):
        try:
            info.update(json.loads(pedir(f"{servidor}/object_info/{no}")))
        except RuntimeError:
            pass
    clips = opcoes(info, "DualCLIPLoader", "clip_name1")
    return {
        "checkpoints": opcoes(info, "CheckpointLoaderSimple", "ckpt_name"),
        "unets": opcoes(info, "UNETLoader", "unet_name"),
        "clips": clips,
        "vaes": opcoes(info, "VAELoader", "vae_name"),
        "dual_tem_device": "device" in info.get("DualCLIPLoader", {}).get("input", {}).get("optional", {}),
    }


def achar(lista, *pistas):
    for p in pistas:
        for x in lista:
            if p in x.lower():
                return x
    return None


def corte(a):
    """Gera a imagem mais alta e corta a faixa de baixo: é ali que o Flux costuma "assinar" o quadro."""
    return {
        "14": {"class_type": "ImageCrop", "inputs": {"image": ["8", 0], "width": a.largura, "height": a.altura, "x": 0, "y": 0}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "void-sun/" + a._nome, "images": ["14", 0]}},
    }


def fluxo_flux(m, positivo, a):
    """Flux em arquivos separados (igual ao exemplo Flux Dev do ComfyUI)."""
    dual = {"clip_name1": m["t5"], "clip_name2": m["clip_l"], "type": "flux"}
    if m["dual_tem_device"]:
        dual["device"] = "default"
    return {
        "10": {"class_type": "UNETLoader", "inputs": {"unet_name": m["unet"], "weight_dtype": a.peso}},
        "11": {"class_type": "DualCLIPLoader", "inputs": dual},
        "12": {"class_type": "VAELoader", "inputs": {"vae_name": m["vae"]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": positivo, "clip": ["11", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["11", 0]}},
        "13": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["6", 0], "guidance": a.guia}},
        "5": {"class_type": "EmptySD3LatentImage", "inputs": {"width": a.largura, "height": a.altura + a.corte, "batch_size": 1}},
        "3": {"class_type": "KSampler", "inputs": {
            "seed": a._semente, "steps": a.passos, "cfg": 1.0, "sampler_name": a.sampler, "scheduler": a.scheduler,
            "denoise": 1.0, "model": ["10", 0], "positive": ["13", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["12", 0]}},
        **corte(a),
    }


def fluxo_ckpt(ckpt, positivo, negativo, a):
    """Modelo de arquivo único (SDXL, SD 1.5…)."""
    return {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": a.largura, "height": a.altura + a.corte, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": positivo, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negativo, "clip": ["4", 1]}},
        "3": {"class_type": "KSampler", "inputs": {
            "seed": a._semente, "steps": a.passos, "cfg": a.cfg, "sampler_name": a.sampler, "scheduler": a.scheduler,
            "denoise": 1.0, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        **corte(a),
    }


def gerar(servidor, wf, tempo_max):
    r = json.loads(pedir(f"{servidor}/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())}))
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
                msgs = [m[1].get("exception_message", "") for m in status.get("messages", []) if isinstance(m, list) and len(m) > 1 and isinstance(m[1], dict)]
                raise RuntimeError("erro no ComfyUI: " + ("; ".join(x for x in msgs if x) or str(status.get("messages"))))
            for saida in item.get("outputs", {}).values():
                for img in saida.get("images", []):
                    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img.get("subfolder", ""), "type": img.get("type", "output")})
                    return pedir(f"{servidor}/view?{q}", tempo=120)
            if status.get("completed"):
                raise RuntimeError("o ComfyUI terminou sem devolver imagem")
        time.sleep(1.5)
    raise TimeoutError("demorou demais (use --tempo-max para esperar mais)")


def main():
    p = argparse.ArgumentParser(description="Gera as artes das cartas do Void Sun no ComfyUI.")
    p.add_argument("--servidor", default="http://127.0.0.1:8188", help="endereço do ComfyUI (padrão: %(default)s)")
    p.add_argument("--listar", action="store_true", help="só mostra os modelos encontrados")
    p.add_argument("--modelo", help="arquivo do modelo: Flux (diffusion_models/unet) ou checkpoint; padrão: detecta sozinho")
    p.add_argument("--t5", help="Flux: codificador de texto T5 (padrão: o que tiver 't5' no nome)")
    p.add_argument("--clip-l", dest="clip_l", help="Flux: codificador CLIP-L (padrão: o que tiver 'clip_l' no nome)")
    p.add_argument("--vae", help="Flux: VAE (padrão: o que tiver 'ae' no nome)")
    p.add_argument("--peso", default="default", help="Flux: weight_dtype (default, fp8_e4m3fn… — fp8 usa menos memória)")
    p.add_argument("--guia", type=float, default=3.5, help="Flux: guidance (padrão: %(default)s)")
    p.add_argument("--prompts", default=os.path.join(AQUI, "prompts-pf.json"))
    p.add_argument("--saida", default="artes-pf", help="pasta onde salvar (padrão: %(default)s)")
    p.add_argument("--so", help="gerar só estas cartas, separadas por vírgula (ex.: pf-red_001,pf-blue_009)")
    p.add_argument("--variacoes", type=int, default=1, help="quantas versões por carta (as extras viram <id>__v2.png…)")
    p.add_argument("--refazer", action="store_true", help="gera de novo mesmo se o arquivo já existir")
    p.add_argument("--largura", type=int, default=832)
    p.add_argument("--altura", type=int, default=1152)
    p.add_argument("--passos", type=int, help="padrão: 20 no Flux, 30 nos outros")
    p.add_argument("--cfg", type=float, default=6.0, help="só para modelos que não são Flux")
    p.add_argument("--sampler", help="padrão: euler no Flux, dpmpp_2m nos outros")
    p.add_argument("--scheduler", help="padrão: simple no Flux, karras nos outros")
    p.add_argument("--corte", type=int, default=64, help="px gerados a mais embaixo e cortados (tira assinaturas falsas; 0 = desliga)")
    p.add_argument("--semente", type=int, default=2026, help="semente base (mesma semente = mesma imagem)")
    p.add_argument("--tempo-max", type=int, default=1800, help="segundos de espera por imagem")
    a = p.parse_args()
    a.corte = max(0, round(a.corte / 16) * 16)  # múltiplo de 16 (exigência dos modelos)

    try:
        m = descobrir(a.servidor)
    except (urllib.error.URLError, OSError) as e:
        sys.exit(f"Não consegui falar com o ComfyUI em {a.servidor} ({e}).\n"
                 "Abra o ComfyUI primeiro (cd ~/ComfyUI, ative o venv e rode: python main.py) e rode de novo.")

    flux_unets = [u for u in m["unets"] if "flux" in u.lower()] or m["unets"]
    if a.listar:
        for titulo, lista in (("Flux / modelos de difusão (models/diffusion_models ou unet)", m["unets"]),
                              ("Codificadores de texto (models/text_encoders ou clip)", m["clips"]),
                              ("VAE (models/vae)", m["vaes"]),
                              ("Checkpoints de arquivo único (models/checkpoints)", m["checkpoints"])):
            print(f"{titulo}:" + ("".join(f"\n  - {x}" for x in lista) if lista else " nenhum"))
        return

    # escolhe o modo: Flux em partes (se houver) ou checkpoint
    usar_flux = (a.modelo in m["unets"]) if a.modelo else bool(flux_unets)
    if usar_flux:
        m["unet"] = a.modelo or flux_unets[0]
        m["t5"] = a.t5 or achar(m["clips"], "t5")
        m["clip_l"] = a.clip_l or achar(m["clips"], "clip_l", "clip-l", "clipl")
        m["vae"] = a.vae or achar(m["vaes"], "ae.", "flux", "ae")
        falta = [n for n, k in (("codificador T5 (--t5)", "t5"), ("codificador CLIP-L (--clip-l)", "clip_l"), ("VAE (--vae)", "vae")) if not m[k]]
        if falta:
            sys.exit("Não achei: " + ", ".join(falta) + ". Rode com --listar e informe os nomes.")
        a.passos = a.passos or 20
        a.sampler, a.scheduler = a.sampler or "euler", a.scheduler or "simple"
        print(f"Flux: {m['unet']}  ·  texto: {m['t5']} + {m['clip_l']}  ·  VAE: {m['vae']}")
        print(f"      {a.largura}×{a.altura} (gera {a.corte} px a mais embaixo e corta)  ·  {a.passos} passos  ·  guidance {a.guia}  ·  {a.sampler}/{a.scheduler}  ·  peso {a.peso}")
    else:
        ck = m["checkpoints"]
        if not ck:
            sys.exit("Não achei nenhum modelo. Rode com --listar para ver o que o ComfyUI encontrou.")
        ckpt = a.modelo or next((x for x in ck if "xl" in x.lower()), ck[0])
        if ckpt not in ck:
            sys.exit(f"Modelo '{ckpt}' não encontrado. Use --listar para ver os nomes.")
        if "flux" in ckpt.lower():
            a.cfg = 1.0
        a.passos = a.passos or (20 if "flux" in ckpt.lower() else 30)
        a.sampler = a.sampler or ("euler" if "flux" in ckpt.lower() else "dpmpp_2m")
        a.scheduler = a.scheduler or ("simple" if "flux" in ckpt.lower() else "karras")
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
    erros = 0
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
                # Flux não usa prompt negativo: usa o estilo adaptado (sem citar cartas/texto)
                wf = fluxo_flux(m, prompt_flux(c["prompt"]), a) if usar_flux \
                    else fluxo_ckpt(ckpt, c["prompt"], c["negative"], a)
                png = gerar(a.servidor, wf, a.tempo_max)
            except Exception as e:  # segue para a próxima carta
                erros += 1
                print(f" ERRO: {e}")
                if erros >= 3 and feito == erros:
                    sys.exit("As 3 primeiras deram erro — parei para você conferir (mande o print).")
                continue
            with open(destino, "wb") as f:
                f.write(png)
            print(f" ok ({time.time() - t0:.0f} s)")
    print(f"\nPronto. Imagens em: {os.path.abspath(a.saida)}")
    print("No Void Sun: Biblioteca → coleção \"Classes — Pathfinder\" → Importar artes → selecione todas as imagens.")


if __name__ == "__main__":
    main()
