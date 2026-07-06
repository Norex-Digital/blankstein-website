#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""og:image-Pipeline (Spec §4 MUSS, fixt Befund A7 — og:image-404 darf es nie wieder geben).

Liest assets/img/og-jobs.json (geschrieben von scripts/generate.mjs) und rendert je Seite ein
1200×630-JPG: links Navy-Panel mit Logo, Seitentitel und Domain-Zeile, rechts ein ECHTES Motiv
(cover-crop aus dem groessten vorhandenen Derivat des Manifest-Slugs). Output geht nach
assets/img/og/ UND direkt nach website/assets/img/og/ (damit kein zweiter generate-Lauf noetig ist).

Reihenfolge im Build-Loop:
  node scripts/validate-data.mjs && node scripts/generate.mjs
  && python scripts/build-og-images.py && node scripts/gates.mjs
(gates.mjs prueft die Existenz jeder referenzierten og-Datei — fehlender build-og-Schritt wird ROT.)

Idempotent: identische Jobs ueberschreiben identisch; verwaiste Dateien in assets/img/og/ werden entfernt.
Muster/Pillow-Konventionen wie scripts/convert-images.py.
"""
import io, json, os, re, sys

from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

W, H = 1200, 630
PANEL_W = 640                     # Navy-Panel links, Motiv rechts (560px)
NAVY = (8, 40, 63)                # --navy
NAVY_DEEP = (5, 27, 46)           # --navy-deep
ACCENT = (26, 86, 219)            # --accent #1A56DB
FG = (255, 255, 255)
FG_MUTED = (175, 192, 209)        # #AFC0D1
JOBS = "assets/img/og-jobs.json"
OUT_DIRS = ["assets/img/og", "website/assets/img/og"]
LOGO = "assets/img/logo-weiss.png"
QUALITY = 84


MONTSERRAT_VAR = "assets/fonts/montserrat-var.ttf"  # variable TTF (github google/fonts, OFL) — WOFF2 kann Pillow nicht


def find_font(bold=True, size=48):
    """Titel rendert in Montserrat wie die Site-Headlines (seit Typo-Umbau 07.07.).
    Variable TTF + set_variation_by_axes (800 = ExtraBold, 500 = Medium fuer die Fusszeile);
    Fallback: System-TTF-Kette, dann Pillows skalierbarer Default (Pillow >= 10.1)."""
    if os.path.exists(MONTSERRAT_VAR):
        try:
            f = ImageFont.truetype(MONTSERRAT_VAR, size)
            try:
                f.set_variation_by_axes([800 if bold else 500])
            except OSError:
                pass  # FreeType ohne Variation-Support: Default-Instanz (400) ist akzeptabel
            return f
        except OSError:
            pass
    candidates = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf",
         "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/Library/Fonts/Arial Bold.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
        if bold else
        ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf",
         "/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    )
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default(size=size)


def largest_source(slug):
    """Groesstes vorhandenes Raster-Derivat des Slugs (webp bevorzugt, jpg-Fallback)."""
    best, best_w = None, 0
    for f in os.listdir("assets/img"):
        m = re.match(rf"^{re.escape(slug)}-(\d+)\.(webp|jpg)$", f)
        if m and int(m.group(1)) >= best_w:
            # bei gleicher Breite webp bevorzugen (verlustaermer als jpg q86)
            if int(m.group(1)) > best_w or f.endswith(".webp"):
                best, best_w = os.path.join("assets/img", f), int(m.group(1))
    return best


def cover(im, w, h):
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    im = im.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    x = (im.width - w) // 2
    y = max(0, round((im.height - h) * 0.38))  # leicht oberhalb der Mitte croppen (Motivschwerpunkt)
    return im.crop((x, y, x + w, y + h))


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def render(job):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    # Motiv rechts
    src = largest_source(job["motif"])
    if src:
        motif = cover(Image.open(src).convert("RGB"), W - PANEL_W, H)
        img.paste(motif, (PANEL_W, 0))
    # Accent-Trennlinie
    d.rectangle([PANEL_W - 6, 0, PANEL_W - 1, H], fill=ACCENT)
    # Panel-Verlauf unten (dezente Tiefe)
    d.rectangle([0, H - 8, PANEL_W - 6, H], fill=NAVY_DEEP)
    # Logo
    y = 72
    if os.path.exists(LOGO):
        logo = Image.open(LOGO).convert("RGBA")
        lw = 300
        lh = round(logo.height * lw / logo.width)
        logo = logo.resize((lw, lh), Image.LANCZOS)
        img.paste(logo, (72, y), logo)
        y += lh + 56
    # Titel (max 4 Zeilen)
    title = job["title"].strip()
    f_title = find_font(bold=True, size=54)
    lines = wrap(d, title, f_title, PANEL_W - 144)
    if len(lines) > 4:
        f_title = find_font(bold=True, size=44)
        lines = wrap(d, title, f_title, PANEL_W - 144)[:4]
    for ln in lines:
        d.text((72, y), ln, font=f_title, fill=FG)
        y += round(f_title.size * 1.22)
    # Fusszeile (Montserrat Medium)
    f_sub = find_font(bold=False, size=26)
    d.text((72, H - 92), "blankstein-havelland.de · Richtpreis 7 €/m²", font=f_sub, fill=FG_MUTED)
    return img


def main():
    if not os.path.exists(JOBS):
        sys.exit(f"FEHLT: {JOBS} — erst node scripts/generate.mjs laufen lassen")
    jobs = json.load(io.open(JOBS, encoding="utf-8"))["jobs"]
    for d_ in OUT_DIRS:
        os.makedirs(d_, exist_ok=True)
    want = set()
    for job in jobs:
        img = render(job)
        name = f"{job['slug']}.jpg"
        want.add(name)
        for d_ in OUT_DIRS:
            img.save(os.path.join(d_, name), format="JPEG", quality=QUALITY, optimize=True, progressive=True)
        print(f"  og/{name}  ({job['motif']})")
    # verwaiste og-Dateien entfernen (idempotent aufraeumen)
    removed = 0
    for d_ in OUT_DIRS:
        for f in os.listdir(d_):
            if f.endswith(".jpg") and f not in want:
                os.remove(os.path.join(d_, f))
                removed += 1
    print(f"OK: {len(jobs)} og:image-Dateien gebaut (1200×630), {removed} verwaiste entfernt")


if __name__ == "__main__":
    main()
