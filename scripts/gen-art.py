#!/usr/bin/env python3
"""Genera las ilustraciones de las casillas con Cloudflare Workers AI (FLUX schnell).

Uso:  python3 scripts/gen-art.py [id ...]     (sin ids: todas)

Necesita la variable CLOUDFLARE_ACCOUNT_ID. El token (CLOUDFLARE_API_TOKEN) lo añade el
proxy del entorno como "network secret"; si no hay proxy, se manda desde la variable.
Cada imagen sale sobre fondo blanco, se le quita el fondo (relleno desde las esquinas),
se recorta y se guarda en public/art/<id>.webp a 256 px.
"""

import base64
import io
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw

STYLE = (
    "cute cartoon game icon, glossy 3D casual mobile board game style, bold dark navy outline, "
    "vibrant saturated colors, single object centered, isolated on pure white background, "
    "no shadow, no text, no letters"
)

SUBJECTS = {
    "salida": "a small cute rocket ship crash-landed tilted in the ground with smoke puffs",
    "meta": "a huge glowing alien mothership flying saucer with colorful lights and a green tractor beam",
    "posada": "a retro space gas station fuel pump, red and chrome",
    "a_beber": "a big glass of red wine with ice cubes and a straw",
    "duelo": "two cute cartoon game dice with funny competitive faces and yellow stars between them",
    "oca": "a small cute flying saucer UFO with a light blue glass dome and a few magic sparkles around it",
    "laberinto": "a group of three cute grey space rocks floating among small comets",
    "regla": "a golden judge gavel on top of a rolled parchment scroll",
    "cultural": "a big red question mark on a quiz card",
    "hipnosis": "a floating pink and purple hypnotic spiral lollipop-like swirl disc, thick outline",
    "carcel": "a small space police jail cell with metal bars and a blue siren light on top",
    "muerte": "a floating swirling black hole vortex with a purple and orange glowing ring, floating in the air",
    "patinazo": "the planet saturn with orange rings and a banana peel on the rings",
    "posicion": "a pair of big cartoon googly eyes looking sideways",
    "rasgo": "a white laboratory microscope",
    "esclavo": "heavy metal chains with a golden padlock",
    "reto": "a retro silver microphone with yellow stars",
}

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "art")
SIZE = 256


def generate(prompt: str) -> Image.Image:
    account = os.environ["CLOUDFLARE_ACCOUNT_ID"]
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/@cf/black-forest-labs/flux-1-schnell"
    cmd = ["curl", "-sS", "-m", "120", "-X", "POST", url, "-H", "Content-Type: application/json",
           "-d", json.dumps({"prompt": prompt, "steps": 8})]
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    res = json.loads(subprocess.run(cmd, capture_output=True, check=True).stdout)
    if not res.get("success", True) or "result" not in res:
        raise RuntimeError(res.get("errors"))
    return Image.open(io.BytesIO(base64.b64decode(res["result"]["image"]))).convert("RGBA")


def cut_out(img: Image.Image) -> Image.Image:
    """Quita el fondo blanco rellenando desde los bordes y recorta lo que sobra."""
    w, h = img.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for xy in seeds:
        if img.getpixel(xy)[3] and min(img.getpixel(xy)[:3]) > 200:
            ImageDraw.floodfill(img, xy, (0, 0, 0, 0), thresh=60)
    box = img.getbbox()
    img = img.crop(box) if box else img
    side = max(img.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return square.resize((SIZE, SIZE), Image.LANCZOS)


def main(ids: list[str]) -> None:
    os.makedirs(OUT, exist_ok=True)
    for key in ids or SUBJECTS:
        try:
            img = cut_out(generate(f"{SUBJECTS[key]}, {STYLE}"))
        except RuntimeError as e:  # el filtro a veces rechaza prompts inocentes: se cambia y se repite
            print("fallo", key, e)
            continue
        path = os.path.join(OUT, f"{key}.webp")
        img.save(path, quality=88, method=6)
        print("ok", key, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main(sys.argv[1:])
