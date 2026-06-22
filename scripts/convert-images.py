#!/usr/bin/env python3
# Blankstein Bild-Pipeline — konvertiert ein Quellbild in AVIF (q58) + WebP (q82) + JPEG-Fallback (q86),
# skaliert auf die Profil-Breiten und merged den Eintrag in assets/img/manifest.json.
# Crop steuert das CSS (object-position) — hier NICHT vorab croppen, nur skalieren (Aspekt bleibt erhalten).
#
# Run (ein Bild):
#   python scripts/convert-images.py <quelle> <slug> <profil>
#   profil: hero | gallery | square | tall
# Beispiel:
#   python scripts/convert-images.py ".../_selected/hub-steinreinigung-hero.png" hub-steinreinigung-hero hero
#
# Pillow >= 11 mit nativem AVIF-Support (features.check('avif') == True).
import sys, os, json
from PIL import Image, ImageOps

ASSET_DIR = "assets/img"
MANIFEST = os.path.join(ASSET_DIR, "manifest.json")
Q_AVIF, Q_WEBP, Q_JPEG = 58, 82, 86

# widths = erzeugte Breiten · fb = Fallback-Breite/-Ext (das <img src>) · avif = AVIF-Quelle erzeugen
PROFILES = {
    "hero":    {"widths": [480, 768, 864], "fb_w": 768, "fb_ext": "jpg", "avif": True},
    "gallery": {"widths": [400, 600, 800], "fb_w": 600, "fb_ext": "jpg", "avif": True},
    "square":  {"widths": [512, 768, 1024], "fb_w": 768, "fb_ext": "jpg", "avif": True},
    "tall":    {"widths": [480, 768, 960], "fb_w": 768, "fb_ext": "jpg", "avif": True},
    "map":     {"widths": [640, 960, 1280], "fb_w": 960, "fb_ext": "jpg", "avif": True},
}


def emit(src, slug, profile):
    if profile not in PROFILES:
        sys.exit(f"Unbekanntes Profil '{profile}' (erlaubt: {', '.join(PROFILES)})")
    p = PROFILES[profile]
    im = Image.open(src)
    im = ImageOps.exif_transpose(im).convert("RGB")  # EXIF-Rotation anwenden (Handy-Hochformat korrekt)
    sw, sh = im.size
    os.makedirs(ASSET_DIR, exist_ok=True)

    for w in p["widths"]:
        h = round(sh * w / sw)
        rs = im.resize((w, h), Image.LANCZOS)
        if p["avif"]:
            rs.save(os.path.join(ASSET_DIR, f"{slug}-{w}.avif"), format="AVIF", quality=Q_AVIF)
        rs.save(os.path.join(ASSET_DIR, f"{slug}-{w}.webp"), format="WEBP", quality=Q_WEBP, method=6)
        if w == p["fb_w"] and p["fb_ext"] == "jpg":
            rs.save(os.path.join(ASSET_DIR, f"{slug}-{w}.jpg"), format="JPEG",
                    quality=Q_JPEG, optimize=True, progressive=True)

    man = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            man = json.load(f)
    man[slug] = {"w": sw, "h": sh, "widths": p["widths"],
                 "avif": p["avif"], "fb_ext": p["fb_ext"], "fb_w": p["fb_w"]}
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(man, f, indent=1, ensure_ascii=False)
    print(f"OK {slug} ({sw}x{sh}, {profile}) -> {len(p['widths'])} Breiten + Manifest")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("Usage: python scripts/convert-images.py <quelle> <slug> <profil>")
    emit(sys.argv[1], sys.argv[2], sys.argv[3])
