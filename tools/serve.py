#!/usr/bin/env python3
"""Servidor local do Darkstar Forge + API de listagem de artes.

Uso:
  python3 tools/serve.py [porta]

GET /api/artwork  → JSON { "files": ["a.png", ...] }
Lista automaticamente assets/artwork (sem manifesto manual).
"""
from __future__ import annotations

import json
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
ART_DIR = ROOT / "assets" / "artwork"
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}


def list_artwork() -> list[str]:
    if not ART_DIR.is_dir():
        return []
    files = []
    for p in sorted(ART_DIR.iterdir(), key=lambda x: x.name.lower()):
        if p.is_file() and p.suffix.lower() in IMG_EXT and not p.name.startswith("."):
            files.append(p.name)
    return files


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=str(directory or ROOT), **kwargs)

    def log_message(self, fmt, *args):
        # silencioso no dia a dia; descomente para debug
        # super().log_message(fmt, *args)
        pass

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path).rstrip("/") or "/"

        if path == "/api/artwork":
            body = json.dumps({"files": list_artwork()}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        return super().do_GET()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("TCG_STUDIO_PORT", "8765"))
    host = "127.0.0.1"
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer((host, port), partial(Handler, directory=ROOT))
    print(f"Darkstar Forge: http://{host}:{port}/  (API artes: /api/artwork)", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrado.")


if __name__ == "__main__":
    main()
