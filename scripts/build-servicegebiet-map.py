#!/usr/bin/env python3
# Erzeugt das Servicegebiet-Kartenbild (Weg i) reproduzierbar aus OpenStreetMap-Tiles
# und konvertiert es via convert-images.py in die Asset-Varianten (Slug: servicegebiet-karte).
# DSGVO: Bild wird EINMALIG beim Build aus OSM-Tiles gestitcht und lokal ausgeliefert
# -> 0 externe Requests/Tracking zur Laufzeit. Attribution "© OpenStreetMap-Mitwirkende"
# ist auf der Karte sichtbar (figcaption .svc-map-attr in generate.mjs). OSM-Tile-Policy:
# einmaliges Stitchen einer Einzelkarte ist ok — NICHT in einer Schleife/CI dauernd neu ziehen.
#
# Aufruf vom Repo-Root:
#   python scripts/build-servicegebiet-map.py
#
# Danach die ausgegebenen PIN-Prozente mit PINPCT in scripts/generate.mjs (servicegebiet())
# abgleichen — sie sind projektionsstabil (gleich für z11/800 wie z12/1600), aber bei
# geändertem center/zoom/Ortssatz NEU setzen.
import math, json, urllib.request, io, os, sys, subprocess, tempfile
from PIL import Image

Z = 12
CLAT, CLNG = 52.535, 13.075   # Mitte der Bounding-Box der 7 Orte
W, H = 1600, 960              # 2x der Anzeige (Retina); Aspekt 5:3
WORLD = 256 * (2 ** Z)
UA = "BlanksteinSiteBuild/1.0 (servicegebiet map; contact noah@blankstein.de)"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ORTE = {
    "falkensee": (52.5606, 13.0928), "dallgow-doeberitz": (52.5384, 13.0531),
    "brieselang": (52.5889, 13.0033), "schoenwalde-glien": (52.6150, 13.1400),
    "wustermark": (52.5478, 12.9533), "gross-glienicke": (52.4647, 13.1083),
    "kladow": (52.4536, 13.1447),
}

def px(lng): return (lng + 180.0) / 360.0 * WORLD
def py(lat):
    r = math.radians(lat)
    return (1.0 - math.asinh(math.tan(r)) / math.pi) / 2.0 * WORLD

cx, cy = px(CLNG), py(CLAT)
left, top = cx - W / 2, cy - H / 2
tx0, tx1 = int(left // 256), int((cx + W / 2) // 256)
ty0, ty1 = int(top // 256), int((cy + H / 2) // 256)

canvas = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256), (233, 237, 240))
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        url = f"https://tile.openstreetmap.org/{Z}/{tx}/{ty}.png"
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20).read()
            canvas.paste(Image.open(io.BytesIO(data)).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
        except Exception as e:
            print("TILE FAIL", tx, ty, e, file=sys.stderr)

ox, oy = int(left - tx0 * 256), int(top - ty0 * 256)
crop = canvas.crop((ox, oy, ox + W, oy + H))

tmp = os.path.join(tempfile.gettempdir(), "servicegebiet-karte-src.png")
crop.save(tmp, "PNG")
subprocess.run([sys.executable, os.path.join("scripts", "convert-images.py"), tmp, "servicegebiet-karte", "map"],
               cwd=REPO, check=True)
os.remove(tmp)

pct = {s: [round((px(lng) - cx + W / 2) / W * 100, 2), round((py(lat) - cy + H / 2) / H * 100, 2)]
       for s, (lat, lng) in ORTE.items()}
print("PINPCT:", json.dumps(pct))
