# Kickoff-Prompt: Echte Fotos analysieren + auf der Blankstein-Website zuordnen

> **Für einen frischen Chat** (Blankstein-Kontext). Alles unten ist selbstständig — kein Vorwissen aus anderen Sessions nötig. In den Chat kopieren. (Agent-validiert gegen das echte Repo, 3 Fehler + Lücken eingearbeitet.)

---

Du bist der dritte Kopf der Marke **Blankstein** (Steinreinigung & Terrassenpflege im Havelland, 2. Marke der Haus- & Gartenservice Havelland GbR). Sprache: **Deutsch**, Output minimal, kein Yes-Man — hinterfrage, leg Tradeoffs offen.

## Was passiert ist (Durchbruch)
Wir haben **52 echte Fotos (JPG) + 4 Videos (MP4)** von echten/alten Aufträgen bekommen: Vorher/Nachher, Arbeitsbilder mit Equipment (Kärcher/Flächenreiniger), verschiedene Flächentypen (Beton-/Platten-Terrassen, Klinker-/Pflaster-Höfe, Einfahrten, Wege, auch Gewerbeflächen). **Bis jetzt lief die ganze Website mit generierten KI-Bildern** — das ist ein **UWG-Risiko** (erfundene Ergebnis-Belege) und der größte Trust-Mangel. Die echten Fotos lösen das.

## Deine Aufgabe
**Analysiere alle echten Bilder, ordne sie der Website zu und liefere einen Einbau-Plan** — welches echte Bild welchen KI-Platzhalter ersetzt, welche echten Vorher/Nachher-Paare existieren, was wir an Trust/Conversion gewinnen, und welche Bilder NICHT taugen. **Noch nicht einbauen** — erst Analyse + Plan, dann Maurice-Abnahme, dann Einbau.

## Wo alles liegt
- **Echte Fotos:** `G:\Meine Ablage\Fotos-Steinreinigung\` (Windows; in Git Bash: `/g/Meine Ablage/Fotos-Steinreinigung`) — 52 `.JPG` + 4 `.MP4`, UUID-Dateinamen, keine Unterordner. (Mac: derselbe Drive-Pfad unter „Meine Ablage".)
- **Code-Repo (Wahrheit):** `C:\Norex\blankstein-website\` — statische Site aus `scripts/generate.mjs` + `assets/css/site.css`, reines HTML/CSS + Vanilla-JS, kein Framework.
- **Bild-Pipeline:** `python scripts/convert-images.py <quelle> <slug> <profil>` → erzeugt AVIF/WebP/JPEG in den Profil-Breiten + merged `assets/img/manifest.json`. **Profile:** `hero` [480/768/864] · `gallery` [400/600/800] · `square` [512/768/1024] · `tall` [480/768/960] · `map` [640/960/1280]. **Skaliert nur, croppt NICHT** (Aspekt bleibt, Crop steuert CSS via object-position). **Standard:** Galeriebild → `gallery`, Hero → `hero`; `square` (nur die V/N-Diagonalen) + `tall` (nur Schaden/Edu-Hochformat) sind Spezialfälle. **Quellpfad-Quoting Pflicht** (Leerzeichen!), Beispiel: `python scripts/convert-images.py "/g/Meine Ablage/Fotos-Steinreinigung/<uuid>.JPG" gal-terrasse gallery`.
- **EXIF-Orientierung — ACHTUNG:** Alle 52 Dateien sind `.JPG` (KEIN HEIC). `convert-images.py` wendet **keine** EXIF-Rotation an (`Image.open(src).convert('RGB')` ohne `ImageOps.exif_transpose`) → Hochformat-Handy-Fotos können falsch gedreht rauskommen. Vor Einbau prüfen → Quelle physisch rotieren ODER das Skript einmalig um `ImageOps.exif_transpose(im)` ergänzen.
- **Manifest:** `assets/img/manifest.json` (alle aktuellen Bild-Slugs + w/h).
- **Render:** `scripts/generate.mjs`, Bilder via `pic(slug, { cls, alt, sizes, lcp, decorative })` — Hero-Bilder mit `lcp:true` (LCP-Priorität), Rest lazy. **Verdrahtung wichtig:** Hub-Bilder (Hero/Edu/Galerie) stehen NICHT als Literale im Generator, sondern in `data/copy/hubs.json` (Felder `hero_img`, `edu_img`, `leistungsumfang[].img`); Orts-Heroes in `data/copy/orte.json` (`hero_img`); `/start`-Hero in `data/copy/start.json` (`hero_img`). Ein Slug-Tausch heißt also teils: Feld in `data/copy/*.json` ändern, nicht nur konvertieren.
- **Bau-Tracker (ZUERST lesen):** `Blankstein/Website/_BAU-TRACKER.md` — Stand, gelockte Entscheidungen, verbindlicher **BILD-QA-STANDARD** (Z. ~142-143). **Review-Befunde:** `Blankstein/Website/_REVIEW-REPORT.md` (die zwei kritischen Punkte „KI-Bilder als Fake-Referenz/UWG" + „Trust-Lücke", die diese Fotos lösen).
- **Lokal ansehen:** `python -m http.server 8090 --directory website` → http://localhost:8090/

## Die KI-Platzhalter, die ersetzt werden sollen (aktuelle Slugs, gegen `manifest.json` verifiziert)
- **Homepage:** `demo-vorher`, `demo-nachher` (interaktiver Hero-Vorher/Nachher-Slider, clip-path, `sliderJS`) · `gal-einfahrt`, `gal-flaeche`, `gal-gartenweg`, `gal-terrasse`, `gal-treppe`, `gal-weg` (Ergebnis-Galerie, 6 Bilder) · `svc-steinreinigung`, `svc-terrassenreinigung`, `svc-pflasterreinigung`, `svc-steinversiegelung` (4 Leistungskarten).
- **Money-Hubs** (verdrahtet über `data/copy/hubs.json`): `hub-steinreinigung-vn` (= der **echte** Hero-Slot des Steinreinigung-Hubs, V/N-Diagonale) · `hub-steinreinigung-gal1..6`, `hub-steinreinigung-einfahrt`, `hub-steinreinigung-wegetreppen` · `hub-terrasse-heroimg`, `hub-terrasse-gal1/2/4/5` · `hub-pflaster-vn`, `hub-pflaster-gal2/3/5/6` · `hub-versiegelung-hero`, `hub-versiegelung-edu`, `hub-versiegelung-gal1/2`. **ACHTUNG:** `hub-steinreinigung-hero` existiert im Manifest, wird aber **NICHT gerendert** (der Hub nutzt `hub-steinreinigung-vn` als `hero_img`) → ignorieren, kein Foto dafür einplanen.
- **7 Orts-Heroes** (über `data/copy/orte.json`): `ort-falkensee`, `ort-dallgow-doeberitz`, `ort-brieselang`, `ort-schoenwalde-glien`, `ort-wustermark`, `ort-gross-glienicke`, `ort-kladow`. Hinweis: echte Fotos sind nicht ortsspezifisch → kläre mit Maurice, ob generischer (aber materialgerechter) Ersatz ok ist oder die Orts-Heroes anders gelöst werden.
- **Edu-Schadensbild:** `schaden-hochdruck` (zeigt Hochdruck-Schaden, Profil `tall`).
- **Ratgeber-Inline-Bilder:** `rg-*` (z. B. `rg-gruenbelag-moos`, `rg-terrasse-grau`, `rg-pflaster-detail`, `rg-naturstein`, `rg-einfahrt-spuren` …) — prüfen, welche durch echte Problem-/Detailbilder ersetzbar sind.
- **OG/Sharing — SONDERFALL:** `og-default` (1200×630, **kein AVIF**, eine Breite) entspricht KEINEM der fünf Standard-Profile. Falls durch ein echtes Foto ersetzt: eigener 1200×630-Crop nötig (nicht `convert-images.py` mit Standardprofil) — Manifest-Eintrag manuell anpassen.
- **NICHT anfassen:** `logo`, `logo-weiss`, `servicegebiet-karte` (echte OSM-Karte).

## Konkret zu liefern
1. **Bild-Inventar (alle 52 + 4 Videos):** je Datei (UUID) → Flächentyp (Einfahrt/Terrasse/Pflaster/Hof/Weg/Treppe/Gewerbe) · Zustand (vorher-dreckig / nachher-sauber / Arbeit-mittendrin) · Orientierung (Quer/Hoch) · Qualität 1-5 (Auflösung/Licht/Komposition/Störelemente wie Mülltonnen/Schläuche) · Equipment sichtbar (Arbeitsbeweis ja/nein) · Kontext (Wohnhaus/Gewerbe).
2. **Echte Vorher/Nachher-Paare:** identifiziere Paare, die WIRKLICH dieselbe Fläche zeigen. **UWG-kritisch:** nur echte Paare dürfen als Vorher/Nachher gelabelt werden — zwei verschiedene Flächen NIE als ein „Vorher/Nachher" verkaufen. Keine echten Paare → ehrlich melden, dann nur Einzel-„Nachher"-Ergebnisse + Arbeitsbilder nutzen.
3. **Zuordnungs-Plan (Tabelle):** echtes Bild (UUID) → Ziel-Slug → ersetzt welchen KI-Platzhalter → empfohlenes convert-Profil → wo verdrahtet (`data/copy/*.json` oder Generator-Literal) → 1 Zeile Begründung/Trust-Gewinn. Priorität: Hero-Slider (`demo-*`), Home-Galerie (`gal-*`), Hub-Heroes/V-N, Leistungskarten (`svc-*`), Schaden-Bild, OG.
4. **Bild-QA:** welche Bilder NICHT taugen (zu dunkel, Störelemente, falsches Label, dreckig wo „Nachher" gebraucht) — und warum. **BILD-QA-STANDARD** (Tracker, verbindlich): jedes Bild muss (a) seinen Zustand korrekt zeigen (wo „Nachher" gebraucht → sauber) UND (b) exakt sein Label zeigen (Einfahrt = Auto-Zufahrt, Terrasse ≠ Hof, Naturstein ≠ Beton, Treppe = Stufen).
5. **Video-Nutzung:** die 4 MP4 — wofür (echtes Vorher/Nachher-Video auf der Reel-Landing `/start`, Hub, Social)? Format/Länge/Eignung.
6. **Trust-/Conversion-Gewinn:** kurz, was der Wechsel KI → echt strategisch bringt (UWG-Risiko weg, echter Arbeitsbeweis, Reviews + echte Fotos = harter Trust) und wo der Hebel am größten ist.

## Harte Regeln / Constraints
- **Echtheit (UWG):** keine erfundenen Belege, echte Vorher/Nachher nur bei echten Paaren, ehrliche Labels. **Konkrete UWG-Fundstellen aus dem Review, die beim Bild-Tausch mit-korrigiert werden müssen:** Default-Alt `'Ergebnis von Blankstein'` in `scripts/generate.mjs` (~Z. 900) + Alt-Text in `data/copy/start.json` (~Z. 21) — ortsneutral/ehrlich umschreiben (kein erfundener Ort, kein „Ergebnis von Blankstein in <Ort>").
- **Pipeline-Disziplin:** Einbau **nur** über `scripts/convert-images.py` (richtiges Profil) → Manifest → `pic()` / `data/copy/*.json`.
- **Build-Gate (nach jedem Einbau):** `node scripts/validate-data.mjs` → `node scripts/generate.mjs` → `node scripts/gates.mjs` müssen **GRÜN** sein (u. a. `ImgAlt` = alt auf allen `<img>`, `ImgDim` = width+height, `BrokenLink` = 0, `FontCDN`, `H1` = 1).
- **Brand:** Zweiton-Blau, bodenständig, „Richtpreis" nie „Festpreis", echte Umlaute. **KEIN commit/push** (Repo absichtlich uncommitted, Approval-Gate).

## Methodik-Vorschlag
Effizient via **Vision-Workflow**: alle 52 Bilder per Vision-Analyse inventarisieren (parallele Vision-Agenten, je ein Bild → strukturierter Befund), dann Paar-Erkennung + Zuordnung + adversariale QA-Zweitprüfung (passt Bild zu Slug/Label?). Im Tracker referenziert: ein wiederverwendbarer Workflow `blankstein-image-audit` (29-Bild-Vision-Audit, Kandidaten-Kontaktbogen) — als Vorlage nutzbar. Große Bildmengen nicht raten — wirklich ansehen.

## Ablauf
1. `_BAU-TRACKER.md` + `_REVIEW-REPORT.md` lesen → 2. Bild-Ordner + `manifest.json`-Slugs sichten → 3. alle 52 + 4 analysieren (Vision) → 4. Paare + Zuordnungs-Plan + QA + Video-Plan erstellen → 5. **Maurice vorstellen + abnehmen lassen** → 6. nach Abnahme: per convert-Pipeline einbauen (inkl. `data/copy/*.json`-Verdrahtung + UWG-Alt-Texte), Build GRÜN, Screenshots, Tracker aktualisieren. Kein commit/push.
