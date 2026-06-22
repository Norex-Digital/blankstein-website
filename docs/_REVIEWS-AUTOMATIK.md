# Google-Reviews automatisch einbinden — Entscheidungs-Report (2026-06-22)

> Multi-Agent-Recherche (32 Kandidaten): Places-API-Build-Time · Self-Hosted-Serverless · externe Widgets · Platzierung + Schema. Kontext: statische Vercel-Site, generate.mjs, DSGVO-streng, GBP mit 2 echten Reviews, täglich mehr.

## 1. Die Wege im Vergleich

| Kriterium | **Places-API Build-Time** | **Self-Hosted / Scraper** | **Externes Widget** (Elfsight/Trustindex/Featurable-Free) |
|---|---|---|---|
| Automatik | voll (Build-Hook + Cron täglich) | voll (Cron), Token-/Scraper-Pflege | voll, null Pflege |
| **DSGVO** | **sauber** (0 Client-Call, 0 Cookie) | sauber (nur Build) | **problematisch** (fremdes JS, IP an Dritte, Cookies → Consent-Pflicht) |
| Kosten | 0 € (Free-Tier), Billing-Account Pflicht | 0 € | Free-Tier mit Branding; saubere API ab 79 $/Mon |
| Limits | **max ~5 Reviews, Google-kuratiert** | alle Reviews (GBP-API 2-4 Wo Approval) | alle Reviews, aber DSGVO-untragbar |
| Aufwand | niedrig (Node-fetch + JSON + Env-Key) | mittel-hoch | sehr niedrig (aber Consent frisst Vorteil) |
| **Eignung** | **5/5 — Default** | 4/5 (Roadmap ab >5) | 1/5 (raus) |

**DSGVO brutal ehrlich:** Die „kostenlosen Google-Reviews-Widgets" (Elfsight, Trustindex, EmbedSocial, auch Featurable-Free-Widget) lösen das Problem nicht — sie erzeugen es. Jedes lädt im Browser fremdes JS, überträgt die Besucher-IP (teils USA), setzt teils Cookies → opt-in-consent-pflichtig, bricht Blanksteins Linie. „DSGVO-konform" + „externes Widget" gleichzeitig ist ein Widerspruch. Sauber wird es nur, wenn die Daten **serverseitig zur Build-Zeit** gezogen und selbst als HTML gerendert werden.

## 2. Empfehlung: Google Places API (New), Build-Time → `reviews.json` → statisch gerendert

**Warum:** Einzige Option, die die DSGVO-Linie zu 100 % hält (Live-Seite = 0 externer Call), 0 € real, offizielle API (kein Scraping/ToS-Risiko), passt exakt zum Stack (Node-fetch in generate.mjs). Bei 2 Reviews ist das 5-Limit egal.

**Schritte:** (1) Place-ID holen (Google Place-ID-Finder). (2) Places API (New) in Google Cloud aktivieren, Key erzeugen, auf Build einschränken, NUR als Vercel-Env-Var, Billing-Account hinterlegen (Kreditkarte, kostet 0 €). (3) Fetch in generate.mjs auf `places.googleapis.com/v1/places/{PLACE_ID}` mit FieldMask `reviews,rating,userRatingCount`. (4) Antwort als `data/reviews.json` **ins Repo committen** (Fallback wenn API mal nicht erreichbar). (5) Statisch Review-Cards rendern (Name/Sterne/Text/Datum), **Avatare lokal nach /public spiegeln** (sonst Google-CDN-Request = DSGVO-Leck). (6) Vercel Build-Hook + Cron 1×/Tag → Rebuild → frische Reviews.

**Ehrliche Haken:** max ~5 Reviews (Google-kuratiert, keine Auswahl) → ab >5 auf GBP-API umsteigen (alle Reviews, aber 2-4 Wo Approval + OAuth). Billing-Account Pflicht trotz 0 €. Cron-Setup als Extra-Teil. Avatare lokal spiegeln = Handarbeit.

## 3. Platzierung (alle aus derselben reviews.json, automatisch synchron)

1. **Hero-Stern-Anker** (above the fold, am Primär-CTA): `★ 5,0 · X Google-Bewertungen`. Bei 2 Reviews dezent, Zahl erst prominent ab >5.
2. **Trust-Band unter Hero:** Google-Logo (als **lokales SVG**, nie vom CDN), Schnitt, Anzahl, optional rotierendes Zitat via Vanilla-JS über eingebettete Daten.
3. **Echte Review-Cards direkt UNTER dem Haupt-CTA:** 2-3 echte Reviews mit Havelland-Ortsbezug. Eigene /bewertungen-Seite erst ab ~8 Reviews.

**Conversion-Regel:** Echte Bewertung **direkt am CTA** (im Klick-Moment „kann ich denen vertrauen?"). Nicht im Footer vergraben. Aggregat-Stern + echte Cards immer paaren.

## 4. Schema / SERP-Sterne — WICHTIG

**Sterne in der Google-Suche für eure Firma kommen NICHT von der Website** — seit Google-Update Dez 2025 sind „self-serving" Reviews im eigenen LocalBusiness/Organization-Schema **nicht mehr SERP-Sterne-berechtigt**. Die Suche-Sterne liefert euer **GBP-Profil selbst** (Maps/Local Pack). Also: LocalBusiness-Schema pflegen, aber **ohne** aggregateRating/review darin. Das einzige legitime Vehikel für eventuelle Sterne ist aggregateRating + review an einer **Service-Entität** mit echten sichtbaren Reviews — kann erscheinen, nicht garantiert, realistisch erst ab mehr Reviews. **Goldene Regel:** nur echte Reviews, Schema-Zahlen müssen EXAKT den sichtbaren entsprechen (build-time aus derselben reviews.json → Match automatisch).

## 5. Fallback (wenn Automatik-Setup gerade zu viel)

**Manuelle `reviews.json` + dependency-freies Vanilla-Karussell** — gleichwertig DSGVO-sauber, kein Key/Cron/Billing. Vorbild: Raynoxwsh/google-review-widget (MIT, reines HTML/CSS/Vanilla, 0 externe Requests). Pro neuer Review 30 Sek eintragen → Vercel baut neu. Bei 2 Reviews + langsam wachsend völlig vertretbar. Sobald Volumen nervt → auf Places-API umsteigen; **Anzeige-Schicht + Schema bleiben identisch, nur die Datenquelle wird automatisiert.** Externes Widget ist KEIN Fallback (consent-pflichtig).

**Kurz:** Places-API-Build-Time ist das Ziel. Manuelle reviews.json + Vanilla-Karussell ist der gleichwertig-saubere Startpunkt. Externe Widgets sind raus.
