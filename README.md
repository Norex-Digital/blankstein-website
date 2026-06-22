# blankstein-website

Website **Blankstein** (Steinreinigung & Terrassenpflege im Havelland) — Static HTML, zero-dependency Generator, Vercel.
Schwester-Repo zu `havelland-website` (Generator-Mechanik geforkt). Planungs-Quelle: `norex-control-tower/Blankstein/Website/`.

## Bauen
```bash
node scripts/validate-data.mjs   # Daten-Gate (muss GRÜN sein)
node scripts/generate.mjs        # rendert website/
node scripts/gates.mjs           # Post-Build-Qualitätsgates (muss GRÜN sein)
```
Lokal prüfen: `python -m http.server 8099 --directory website` → http://localhost:8099/
(absolute `/assets/`-Pfade brauchen einen Server-Root, `file://` reicht nicht).

## Struktur
- `data/` — Single Source: `nap.json` (Stammdaten), `config.json` (Domain/IDs/Preise/Wellen), `services.json` (4 Money-Hubs), `locations.json` (7 Orte), `proof.json` (Cold-Start-Trust). `data/copy/` = Copy-Phase (noch leer).
- `assets/css/site.css` — Design-System (Fundament: `Blankstein/Website/design/hero-v3.html`; Zweiton-Blau, Cyan sparsam, Sora + Inter).
- `assets/fonts/` — self-hosted Sora + Inter (Variable WOFF2, DSGVO; **OFL-Lizenz-Hinweis im Repo ablegen**).
- `assets/img/` — Logo (freigestellt), Demo-Vorher/Nachher (AVIF/WebP/JPEG), `manifest.json`.
- `scripts/` — `generate.mjs` (Templates + Schema + Sitemap/robots/llms), `gates.mjs`, `validate-data.mjs`.
- `website/` — generierter Output (Vercel `outputDirectory`, committet — kein Build-Step nötig).

## Design-/Copy-Regeln (verbindlich, aus bau-fakten.md + Architektur §)
- Online **immer Richtpreis**, **nie „Festpreis"** (verbindliches Angebot per Foto+Maße oder Besichtigung).
- USP-Kacheln: Flächenreiniger · Neuverfugung mit Sand · Nano-Imprägnierung · saubere Absaugung. **Kein** Heißwasser/0 ppm (war JR, erst Skalierung), **kein** „kein Hochdruck" (wir nutzen ihn kontrolliert mit Flächenreiniger).
- Preise = Endpreise (§19 Kleinunternehmer). Richtpreis 7 €/m² (Basis) · 8 €/m² (mit Imprägnierung).
- Empty-State-Trust: **keine erfundenen Sterne/Reviews** (proof.json count=0 → ehrliche Empty-States, UWG).
- FAQPage-JSON-LD **gesetzt** (AEO-Hebel, Architektur §5 — Abweichung von Havelland).
- WhatsApp echte Nummer aus `nap.phone_e164` (kein Platzhalter).

## Status — Welle 1
- ✅ **Fundament**: Daten-Layer, Design-System, Fonts, Bild-Pipeline, QA-Pipeline (validate + gates GRÜN).
- ✅ **Homepage** (Muster): Hero + Slider, USP, Leistungen, m²-Rechner, 4-Schritt-Ablauf, CTA, FAQ.
- ✅ **Pflicht-Basis**: `/kontakt/` (Web3Forms→WhatsApp-Fallback), `/impressum/`, `/datenschutz/`, `/danke/`, `404`.
- ⬜ **4 Money-Hubs** (`/steinreinigung/` …) — Templates + Copy-Pipeline (seo-web-copy→stop-slop→copy-audit→llm-optimisation).
- ⬜ **7 lokale Orts-Hubs** (`/{ort}/`, Stein+Terrasse als H2-Sektionen — KEINE Service×Ort-Seiten).
- ⬜ **~12 Ratgeber** (Traffic-Motor, Flagship „pflastersteine reinigen") + `/preise/`, `/servicegebiet/`, `/start/` (Reel-Landing).

## Offene Platzhalter (vor Launch, nicht-blockierend)
1. **Garantie-Aussage** final (Bau-Default: Endpreis-Zusage + Zufriedenheits-Nacharbeit) — Noah/Maurice juristisch prüfen.
2. **Web3Forms-Access-Key** in `config.json` (sonst WhatsApp-Bridge-Fallback).
3. **GA4 + GTM-IDs** in `config.json` (sonst kein Analytics, gates bleibt grün).
4. Echte Demo-Fläche-Fotos (ersetzen `demo-vorher/nachher`), GBP anlegen, NAP-Lock bestätigen.
