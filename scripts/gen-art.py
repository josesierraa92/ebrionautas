#!/usr/bin/env python3
"""Genera las ilustraciones de las casillas con Cloudflare Workers AI (FLUX schnell).

Uso:  python3 scripts/gen-art.py [grupo | grupo/id ...]     (sin argumentos: todo)

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
    "3D render, cozy stylized mobile board game asset, soft clay material, smooth matte plastic, Blender, "
    "soft studio lighting, ambient occlusion, vibrant saturated pastel colors, no outlines, "
    "three-quarter top-down isometric view, single object centered, standing directly on nothing, no base, "
    "no platform, no ground, isolated on pure white background, no text"
)

# Ilustraciones de cada tipo de casilla (tarjetas y títulos grandes).
TILES = {
    "salida": "a small cute rocket ship crash-landed tilted in the grass with smoke puffs",
    "meta": "a huge glowing alien mothership flying saucer with colorful lights and a soft green light beam",
    "posada": "a retro space gas station fuel pump, red and chrome",
    "a_beber": "a big glass of red wine with ice cubes and a straw",
    "duelo": "two cute cartoon game dice with funny competitive faces and yellow stars between them",
    "oca": "a small cute flying saucer UFO with a light blue glass dome and a few magic sparkles around it",
    "laberinto": "a group of three cute grey space rocks floating among small comets",
    "regla": "a golden judge gavel on top of a rolled parchment scroll",
    "cultural": "a big red question mark on a quiz card",
    "hipnosis": "a floating pink and purple hypnotic spiral lollipop-like swirl disc",
    "carcel": "a small space police jail cell with metal bars and a blue siren light on top",
    "muerte": "a floating swirling black hole vortex with a purple and orange glowing ring",
    "patinazo": "the planet saturn with orange rings and a banana peel on the rings",
    "posicion": "a pair of big cartoon googly eyes",
    "rasgo": "a white laboratory microscope",
    "esclavo": "heavy metal chains with a golden padlock",
    "reto": "a retro silver microphone with yellow stars",
}

# Decoración del tablero (de pie sobre el césped).
DECO = {
    "tree": "a round fluffy stylized tree with bright green leaves and a brown trunk",
    "tree2": "a tall stylized tree with layered rounded lime green foliage",
    "ptree": "a round fluffy alien tree with glowing purple and pink foliage",
    "pine": "a stylized teal pine tree with three soft rounded layers",
    "bush": "a cluster of three round leafy green bushes",
    "mush": "a cluster of three cute red mushrooms with white dots",
    "rock": "a small cluster of glowing blue crystals on a grey rock",
    "logs": "a small stack of brown firewood",
    "ufo": "a small purple flying saucer tilted on its side with a little smoke coming out",
    "cauldron": "a campfire with a small black cooking pot full of bubbling red drink",
    "tent": "a small orange triangular camping tent seen from the side",
    "flowers": "a small patch of white daisies with yellow centers",
    "rocket": "a tall red and dark grey metal cartoon rocket standing on its fins",
    "mothership": "a huge alien mothership flying saucer, silver and purple, with a glass dome and colorful lights",
}

# Fichas: un marciano por color de jugador (mismo orden que PLAYER_COLORS).
ALIEN = "a cute chubby little {} alien character with two antennas, big round eyes, rosy cheeks, tiny arms and legs, standing, full body, happy"
ALIENS = {str(i): ALIEN.format(c) for i, c in enumerate(["green", "blue", "pink", "yellow", "red", "turquoise", "orange", "purple"])}

GROUPS = {"tile": (TILES, "", False), "deco": (DECO, "deco", True), "alien": (ALIENS, "alien", True)}

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "art")
SIZE = 256


def generate(prompt: str) -> Image.Image:
    account = os.environ["CLOUDFLARE_ACCOUNT_ID"]
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/@cf/black-forest-labs/flux-1-schnell"
    cmd = ["curl", "-sS", "-m", "120", "-X", "POST", url, "-H", "Content-Type: application/json",
           "-d", json.dumps({"prompt": prompt, "steps": 6})]
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    res = json.loads(subprocess.run(cmd, capture_output=True, check=True).stdout)
    if not res.get("success", True) or "result" not in res:
        raise RuntimeError(res.get("errors"))
    return Image.open(io.BytesIO(base64.b64decode(res["result"]["image"]))).convert("RGBA")


def clear_background(img: Image.Image) -> Image.Image:
    """Vuelve transparente el fondo: todo lo claro y gris (blanco, sombras suaves) conectado con los bordes."""
    w, h = img.size
    px = img.load()
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or (min(r, g, b) > 170 and max(r, g, b) - min(r, g, b) < 22):
                mp[x, y] = 255
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if mp[xy] == 255:
            ImageDraw.floodfill(mask, xy, 128)
    out = img.copy()
    alpha = img.getchannel("A")
    alpha.paste(0, mask=Image.eval(mask, lambda v: 255 if v == 128 else 0))
    out.putalpha(alpha)
    return out


def cut_out(img: Image.Image, bottom: bool) -> Image.Image:
    """Quita el fondo y recorta lo que sobra.
    `bottom`: el objeto queda apoyado abajo (para ponerlo de pie sobre el césped)."""
    img = clear_background(img)
    box = img.getbbox()
    img = img.crop(box) if box else img
    side = max(img.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - img.width) // 2, side - img.height if bottom else (side - img.height) // 2))
    return square.resize((SIZE, SIZE), Image.LANCZOS)


def main(args: list[str]) -> None:
    """Argumentos: un grupo ("tile", "deco", "alien") o "grupo/id"; sin argumentos, todo."""
    jobs = []
    for arg in args or list(GROUPS):
        group, _, key = arg.partition("/")
        subjects = GROUPS[group][0]
        jobs += [(group, k) for k in ([key] if key else subjects)]
    for group, key in jobs:
        subjects, folder, bottom = GROUPS[group]
        try:
            img = cut_out(generate(f"{subjects[key]}, {STYLE}"), bottom)
        except RuntimeError as e:  # el filtro a veces rechaza prompts inocentes: se cambia y se repite
            print("fallo", group, key, e)
            continue
        os.makedirs(os.path.join(OUT, folder), exist_ok=True)
        path = os.path.join(OUT, folder, f"{key}.webp")
        img.save(path, quality=88, method=6)
        print("ok", group, key, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main(sys.argv[1:])
