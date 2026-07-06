# -*- coding: utf-8 -*-
"""Sichttext-NearDup der Orts-Schwestern (Spec §4: < 40 %). Run: python scripts/check-neardup-sichttext.py
Misst mit difflib.SequenceMatcher ueber den sichtbaren <main>-Text der GEBAUTEN Orts-HTMLs
(data-pagetype="ort") — ergaenzt das 3-Gramm-Jaccard-Gate in gates.mjs um eine sequenzielle Metrik.
Exit 1 sobald ein Paar >= 40 %."""
import io, os, re, sys, difflib, itertools

# Windows-Konsole (cp1252) vertraegt die Haekchen nicht — Ausgabe hart auf UTF-8 stellen
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = "website"
LIMIT = 0.40

def visible_main_text(html):
    m = re.search(r'<main id="main">([\s\S]*?)</main>', html)
    body = m.group(1) if m else html
    body = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", body)
    body = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", body)
    body = re.sub(r"<[^>]+>", " ", body)
    body = body.replace("&amp;", "&")
    body = re.sub(r"&[a-z]+;", " ", body)
    return re.sub(r"\s+", " ", body).strip().lower()

pages = {}
for dirpath, _, files in os.walk(ROOT):
    for f in files:
        if not f.endswith(".html"):
            continue
        p = os.path.join(dirpath, f)
        h = io.open(p, encoding="utf-8").read()
        if 'data-pagetype="ort"' in h:
            url = "/" + os.path.relpath(p, ROOT).replace("\\", "/").replace("index.html", "")
            pages[url] = visible_main_text(h)

if len(pages) < 2:
    print("WARN: <2 Orts-Seiten gefunden — nichts zu vergleichen")
    sys.exit(0)

fails = 0
worst = (0.0, "", "")
print(f"=== NearDup Sichttext (difflib) · {len(pages)} Orts-Seiten · Limit < {LIMIT:.0%} ===")
for (u1, t1), (u2, t2) in itertools.combinations(sorted(pages.items()), 2):
    r = difflib.SequenceMatcher(None, t1, t2).ratio()
    flag = "  ✗" if r >= LIMIT else "  ✓"
    print(f"{flag} {r:6.1%}  {u1} ~ {u2}")
    if r >= LIMIT:
        fails += 1
    if r > worst[0]:
        worst = (r, u1, u2)

print(f"\nMax: {worst[0]:.1%} ({worst[1]} ~ {worst[2]})")
if fails:
    print(f"ERGEBNIS: ROT — {fails} Paare >= {LIMIT:.0%}")
    sys.exit(1)
print("ERGEBNIS: GRÜN — alle Orts-Schwestern unter 40 % Sichttext-Ähnlichkeit")
