# Doppel-Review Blankstein (CEO + Design) — 2026-06-22

> Multi-Agent-Workflow: 12 Seitentypen × {CEO-Lens, Design-Lens} = 24 Finder → 87 CEO- + 105 Design-Roh-Findings → adversarial dedupliziert/gesiebt auf 16 CEO- + 18 Design-systemische → Merge mit Completeness-Check. Modelle lasen das gerenderte HTML + `site.css` direkt.

---

Handwerklich ist die Site sauber gebaut (Vanilla, geteilte Tokens, konsistente Komponenten, JSON-LD vorhanden). Die Probleme sind keine Bugs, sondern strategisch: Geo, Trust und der Conversion-Pfad. Reihenfolge unten = Bauen, nicht Lesen.

## CEO-Achse — priorisiert

**[kritisch] Geo-Conversion-Gap nie above-the-fold abgefangen**
Reel-Reichweite ist national, Geschäft ist Havelland + westl. Berliner Rand. Auf keiner Seite filtert ein Geo-Gate oben. Ortsliste/Karte erst Sektion 8+. NRW-Lead kann Rechner + WhatsApp bedienen ohne je gefiltert zu werden → tote Leads in der Inbox, „antwortet schnell" leidet. Verschärft auf /servicegebiet/: H1 „Havelland", aber Kladow/Groß Glienicke liegen nicht im Havelland → Spandau/Berliner-Rand-Lead schließt sich selbst aus.
Fix: Konkrete Kernorte statt Region-Label im Hero/Eyebrow; Anker-Satz „Aus Falkensee für Falkensee, Dallgow, Kladow & Umgebung". Servicegebiet-H1 → „Von Falkensee bis Kladow". Optional PLZ-Check.
Seiten: alle Money-Seiten + /servicegebiet/, /ratgeber/*.

**[kritisch] KI-Bilder als echte Referenzen geframt — UWG-Risiko**
Galerien/Hero/Schadensbilder durchgängig KI, aber als reale Aufträge gerahmt („So sehen unsere Flächen danach aus", Alt „Ergebnis von Blankstein … in Falkensee"). Laut Brand-Status existieren noch KEINE echten Fotos = erfundenes Vorher/Nachher als eigene Referenz (§5 UWG) + Trust-Killer, weil Stammkundschaft die echten Straßen kennt. Kennzeichnung inkonsistent (Schadensbilder teils „Beispielhaft", Ergebnis-Galerien nicht).
Fix: Alt-Texte entkonkretisieren (kein Ort, kein „Ergebnis von Blankstein"). Sichtbares „Beispielbild" an JEDES als Resultat lesbare KI-Bild. Erstes echtes Vorher/Nachher ersetzt sechs KI-Bilder.
Seiten: /, /steinreinigung/, /terrassenreinigung/, /falkensee/, /kladow/, /ratgeber/pflastersteine-reinigen/, /preise/, /start/.

**[kritisch] Null menschliches/lokales Trust-Signal — Inhaber-Gesicht fehlt überall**
Ohne Reviews ist das Gesicht (Noah & Maurice, Falkensee) der stärkste Trust-Ersatz — und es fehlt auf jeder Money-Seite. Kein Foto, kein Name, kein GBP-Link, kein Versicherungs-/Gewerbenachweis. /ueber-uns/ ist von keiner Money-Seite verlinkt (nicht Nav, nicht Footer) und zeigt selbst nur „Foto folgt" — erfüllt ihre einzige Aufgabe zu 0 %. Ein Fremder soll einem anonymen WhatsApp-Funnel ein Grundstücksfoto schicken. Lead-Killer Nr. 1.
Fix: Schlanker „Wer reinigt bei Ihnen"-Block vor Preis/FAQ auf jeder Money-Seite (echtes Foto + Vorname + Nähe-Satz). /ueber-uns/ in Nav UND Footer. Hard-Trust ergänzen (Gewerbe angemeldet, haftpflichtversichert). /ueber-uns/ erst live, wenn echtes Foto existiert.
Seiten: alle Money-Seiten + /servicegebiet/, /kontakt/, /ratgeber/*, /ueber-uns/.

**[kritisch] Formular ist getarnter WhatsApp-Trigger ohne Foto-Prompt**
/start/ + /kontakt/: „Lieber per Formular?" ist keine Server-Anfrage, sondern `location.href=wa.me`. Drei Folgen: (1) Wer WhatsApp meidet / auf Desktop ist / es nicht installiert hat → kein funktionierender Weg, oft die besten (zahlungskräftigen, planenden) Leads gehen still verloren. (2) Generierte Nachricht enthält keinen Foto-Prompt obwohl H1 „Angebot per Foto" verspricht → leere Leads + Rückfrage-Schleifen. (3) Sie/Du inkonsistent.
Fix: Echtes Backend (Web3Forms-Key eintragen) oder mind. sichtbarer mailto-Fallback statt wa.me. Bleibt WhatsApp: Fallback + Foto-CTA an Message anhängen.
Seiten: /start/, /kontakt/.

**[hoch] Zwei gleichwertige Hero-CTAs schicken in den langsamen Pfad**
„Angebot per Foto" (primary) optisch gleichgewichtig neben „Kostenlose Besichtigung" (outline → /kontakt/#anfrage). Strategie: WhatsApp ist Hauptkanal, Besichtigung Fallback. Zwei gleich große Buttons = Reibung + reißen Nutzer auf andere Seite WEG vom Money-Hub — auf /falkensee/, /kladow/ sogar bevor der eingebaute Rechner gesehen wurde.
Fix: WhatsApp dominant; Besichtigung als ruhiger Textlink nachordnen, ebenfalls per vorbefüllter WhatsApp statt Seitensprung.

**[hoch] „~30 Min Antwortzeit" ungequalifiziert wiederholt**
Stärkstes Versprechen steht als unbedingte Zusage an Badges/Steps/CTA-Bändern, aber Öffnungszeiten sind Mo–Fr 8–18 / Sa 9–14. Abend-/Sonntags-Reel-Klick ohne Antwort = gebrochenes Versprechen, direktester Trust-Killer ohne Bewertungs-Polster. FAQ schränkt korrekt ein, die Badges nicht.
Fix: „werktags meist in ~30 Min, sonst am nächsten Morgen". Optional Auto-Eingangsbestätigung außerhalb der Zeiten.

**[hoch] Rechner ist Conversion-Sackgasse**
Voller Punktpreis („210 €") ohne Foto/Kontakt beantwortet „was kostet das?" final → Interessent geht zufrieden ohne Anfrage. Auf /preise/ fließen qm/Imprägnierung NICHT in die WhatsApp-Nachricht (generischer Text wie überall). Größter Hebel (Kaufabsicht → fertige Anfrage) verschenkt.
Fix: Spannweite statt Punktwert („ca. 210–260 €") + Naturstein-Hinweis + Cliffhanger („exakter Preis in ~30 Min nach 2 Fotos"). Rechner-CTA dynamisch befüllen.

**[hoch] Ratgeber kannibalisiert den eigenen Lead**
Hub + Artikel verkaufen aktiv DIY (komplette Anleitung, Mietpreis-Tabelle, „mit Soda oft erstaunlich weit"). Profi-Hook immer zu spät/zu schwach. Hub = 11 gleichgewichtete Kacheln, erster CTA ganz unten. Im Artikel kein Inline-CTA am Conversion-Peak (direkt nach Kostentabelle).
Fix: Loss-Aversion-Frame in Teasern, Reibungs-Vergleich („verlorener Wochenend-Tag + Miete + Risiko vs ~280 € fertig inkl. Neuverfugung"). Inline-CTA nach der Kostentabelle. Hub clustern: „Bevor Sie beauftragen" oben / „Selbst Hand anlegen" unten.

**[mittel]** WhatsApp-Pre-Fill ohne Geo-Qualifier + zu hohe erste Hürde (Maße verlangt) + hardcodierte Reel-Herkunft („komme von einem eurer Videos" auch bei GBP-Traffic falsch). Fix: Geo-Platzhalter, erste Hürde auf reines Foto, Maße optional im Chat, Reel-Herkunft via UTM.
**[mittel]** Drei Always-On-Widgets (Sticky-Bar, FAB, Header-CTA) überlagern sich mobil, doppelte WhatsApp/Anruf-Buttons, FAB-E-Mail splittet Kanäle. Fix: eine Mobile-Mechanik, E-Mail raus.
**[mittel]** „Nano-Imprägnierung" (Tech-Jargon, Anti-Luxus-Verstoß) + /kladow/ „Hochdruck" 2× positiv (bricht „kein Hochdruck"-Regel). Fix: Nutzen statt Tech; „kontrollierter Flächendruck statt Punktstrahl".
**[mittel]** Garantie als reine Selbstaussage ohne harten Anker; auf /ueber-uns/ im Fließtext vergraben. Fix: Garantie als Trust-Box mit mind. einem prüfbaren Fakt.
**[mittel]** Marquee wiederholt nur Hero-Badges. Fix: streichen oder mit Servicegebiet-Orten füllen (Geo + Trust doppelt).
**[mittel]** Preis-Seite begründet Wert nicht, Einwand „warum nicht selbst mit Baumarkt-Gerät?" unbeantwortet. Fix: „Warum der Richtpreis fair ist"-Block.
**[niedrig]** /ueber-uns/: „Hunderte Male gefahren" (erfundene Historie, UWG-Nähe), Namens-Wechsel nahbar→behördlich, Adresse nur im Schema versteckt.
**[niedrig]** og:image/Schema-Bild physisch fehlend → kaputte Share-Vorschau in WhatsApp-Gruppen (genau dem Verbreitungsweg). Fix: neutrales Marken-Asset 1200×630, KEIN fotorealistisches „Ergebnis".

## Design-Achse — priorisiert

**[kritisch] Cyan (#19C3D6) als Textfarbe auf Hell (~2.0:1)**
Trifft die wichtigsten Elemente: H1-em „wie neu" auf /start (Schlüsselwort verschwindet) und Schritt-Nummern 01/02/03 (weiß auf Cyan-Kreis, 2.14:1) der zentralen Funnel-Mechanik. Auch .svc-card .no, .ort-plz.
Fix: Cyan nie als Text auf hell. H1-em → --blue (~11:1), Betonung über vorhandenen Cyan-Unterstrich. Schritt-Kreise --blue füllen (11.2:1), Cyan nur als Ring.

**[hoch] --muted (#7A8FA0) verfehlt WCAG-AA site-weit (~3.0–3.4:1)**
Trägt fast den gesamten Sekundär-Lesetext: .section-sub, .usp-card-text, .svc-card p, .calc-note, .cta-subtitle, .alt-link, DSGVO-Consent, .breadcrumb. Auf Money-Seiten ist ausgerechnet der Verkaufs-/Trust-Text am schwersten lesbar, bei Sonnenlicht auf Mobile praktisch unlesbar.
Fix: --muted-text:#5A6B7A für alle Fließtext-/Klick-Rollen einführen, helles #7A8FA0 nur für bold Eyebrows. Eine Änderung wirkt site-weit.

**[hoch] Touch-Targets <44px auf primären Elementen**
.btn-header (~33px), .menu-toggle (~22–26px), Mobile-Nav-Links ohne Padding, Slider-Thumb (26px), und am gravierendsten /servicegebiet/-Pins schrumpfen ≤560px auf 15px-Dots (Label hidden) obwohl geo-note zum Antippen auffordert.
Fix: min-height:44px durchziehen; auf /servicegebiet/ Karte mobil zu Trust-Bild, ort-grid-Liste als Primär-Navigation, Tap-Aufforderung mobil entfernen.

**[hoch] Heading-Struktur defekt auf /start (H1→H3-Sprung) + fehlender main-Landmark**
Nach H1 sieben H3 ohne H2; Sektions-Titel nur als <div class=section-label>, das einzige H2 ganz unten im CTA-Band. Screenreader-Outline + SEO kaputt. /kontakt: kein <main>, Breadcrumb loses <div> trotz BreadcrumbList-JSON-LD.
Fix: „So einfach geht's"/„Warum Blankstein" als echte <h2>. /kontakt in <main>, Skip-Link, Breadcrumb als <nav><ol>.

**[hoch] Doppelte Schritt-Nummerierung auf /ueber-uns (sichtbarer Bug)**
Markup-„1. Reinigen" + CSS-Counter-Kreis → „① 1. Reinigen" pro Schritt. Copy-Paste-Look auf der Trust-Seite. Fix: eine Quelle der Wahrheit.

**[mittel]** Slate-Fremdpalette hardcodiert (#94a3b8, #64748b…) statt Brand-Tokens im Geo-/Noah-Block; .geo-note ~2.4:1 Fail. Fix: auf Tokens mappen.
**[mittel]** Breakpoint-Versatz: Nav kollabiert bei 920px, Layout bei 980px → 60px-Fenster mit Desktop-Nav im Mobil-Layout. Fix: Nav-Collapse auf 980px.
**[mittel]** Fokus-Indikator entfernt auf Formular-/Slider-Elementen (outline:none ohne Ersatz). Fix: box-shadow-Ring an :focus-visible.
**[mittel]** /start trägt totes Voll-Template-JS (Tilt/Lightbox/Scrollspy/Map-Pins, alle no-op); CSS für Reel-Strip vorhanden, aber kein Reel im HTML — obwohl der ganze Funnel auf Reels beruht. Fix: pro Seitentyp nur reale Scripts; echten Reel-Strip einbauen ODER tote .reel-Regeln streichen.
**[mittel]** Eyebrow = H1 wortgleich auf Orts-Seiten (Template-Befüll-Tell). Fix: kürzeres Geo-/Kategorie-Label, Hero-Sub auf Differenzierung.
**[mittel]** WhatsApp-Pfad verliert mobile Dominanz (beide CTAs full-width gestapelt); /ratgeber/ + /ueber-uns/ ohne Primary-CTA above the fold; /preise/-Rechner unter der Falz. Fix: Sekundär-Button zurücknehmen, Primary in page-hero, Rechner hochziehen.
**[mittel]** „Foto folgt"-Platzhalter live auf /ueber-uns. Fix: KI-Brand-Bild bis echtes Foto, Seite erst dann verlinken.
**[niedrig]** Reveal-Animation gated Kerninhalt mit 2600ms-Fallback; Box-nach-Box-Karten-Monotonie; Status-Farben ohne Token + „Festpreis"-CSS-Kommentar (bricht Brand-Regel); Du/Sie-Tonbruch im /start-kf-hint; Footer-Text rgba(255,255,255,.4) auf Navy unter AA; Hochformat-Assets in Landscape-Box gequetscht (/ratgeber/).

## Gemeinsame Wurzel — von BEIDEN Lenses unabhängig getroffen (höchste Priorität)

1. **WhatsApp-Foto-Pfad ist nicht der eine dominante Klick.** CEO: zwei gleichwertige Hero-CTAs + Formular routet falsch. Design: beide CTAs mobil full-width gleichgewichtig, Sekundärpfad gleichrangig, Rechner/Primary unter der Falz. → Beide: WhatsApp visuell dominant, Sekundär als Textlink, above-the-fold.
2. **Inhaber-Trust fehlt physisch und ist unauffindbar.** CEO: kein Gesicht auf Money-Seiten, /ueber-uns/ unverlinkt = Lead-Killer Nr. 1. Design: „Foto folgt"-Dummy live + doppelte Nummerierung auf genau dieser Seite. → Beide: echtes Foto ist Voraussetzung, /ueber-uns/ verlinken, Seite erst dann live.
3. **Geo-Gap zieht durch jede Seite** — CEO systemisch-kritisch, Design beim CTA-Befund + Servicegebiet-Pin-Handling. → Beide: Geo nach oben, /servicegebiet/ mobil als Orientierung statt fummelige Pins.

Sekundär doppelt: **/start/ als halbfertige Reel-Landing** (CEO: falsche Reel-Herkunft im Pre-Fill; Design: totes Template-JS + Reel-CSS ohne Reel-HTML) und **Kontrast auf Money-Text** (CEO: Verkaufstext leidet; Design: --muted/Cyan-Fails treffen genau diesen Text).

## Completeness-Check — was beide übersehen haben

- **Navigation/Discovery generell:** ob Money-Seiten untereinander + vom Hub sauber erreichbar sind, ob die Nav den Geo-Kern führt, und ob /start in einem Klick zu Ort + Leistung führt — nicht geprüft.
- **Closed-Loop nach dem Klick:** keine Erfolgs-/Bestätigungsseite, kein Fallback wenn WhatsApp fehlt, keine echte Conversion-Messung des wichtigsten Events. Ohne UTM→Lead-Attribution nicht messbar, ob der Funnel trägt.
- **Cross-Page-Konsistenz der Kern-Claims:** ob Richtpreis-Zahl, m²-Preis, Garantie-Wortlaut über alle Seiten identisch sind — nicht geprüft. Abweichungen untergraben die „fairer Richtpreis"-Klammer.
- **Geo-Gate als aktiver Filter, nicht nur Label:** echter PLZ-/Ort-Filter, der Out-of-Area VOR dem WhatsApp-Klick abfängt — bei nationalem Reel-Traffic der eigentliche Hebel gegen tote Leads.
- **Empty-State-Strategie als System:** die eine Regel — solange keine Reviews/Fotos, ersetzt jeder Trust-Block einen prüfbaren Fakt (Gewerbe, Versicherung, Gesicht, GBP) — + Reihenfolge, in der echte Assets KI-Assets ablösen.
- **Sitemap/robots/Canonical bei programmatischen Orts-Seiten** — sobald mehr Orts-Seiten nach gleichem Template entstehen.

## Top 5 nächste Schritte (Wirkung × Aufwand)

1. **WhatsApp-Pfad zum einen dominanten Klick** — Sekundär-CTA zu Textlink (mobil+desktop), Formular auf echtes Backend/mailto statt wa.me, Foto-Prompt + Geo-Platzhalter + dynamische Rechner-Werte in den Pre-Fill. Höchste Wirkung. ~0,5–1 Tag.
2. **UWG-Entschärfung KI-Bilder** — Alt-Texte entkonkretisieren, sichtbares „Beispielbild" konsistent, og:image als neutrales Marken-Asset. Eliminiert rechtliches Risiko. ~0,5 Tag.
3. **Kontrast-Sweep (zwei Token-Edits)** — --muted-text:#5A6B7A für Fließtext, Cyan nie als Text (H1-em + Schritt-Kreise auf --blue), Slate-Hardcodes auf Tokens, Footer-Opacity, .geo-note. Eine zentrale CSS-Änderung site-weit. ~0,5 Tag.
4. **Geo nach oben + Servicegebiet-H1 fixen** — Kernorte-Ankersatz in Hero/Eyebrow aller Money-Seiten, H1 „Von Falkensee bis Kladow", Servicegebiet-Pins mobil zu Trust-Bild + ort-grid als Navigation, optional PLZ-Check. Trifft die gefährlichste Markenannahme. ~1 Tag.
5. **Inhaber-Trust live** — echtes Foto (Voraussetzung), „Wer reinigt bei Ihnen"-Block vor Preis/FAQ, /ueber-uns/ in Nav+Footer, doppelte Nummerierung + „Foto folgt" + „Hunderte Male"-Claim entfernen, Garantie als Trust-Box. Foto-abhängig. ~1 Tag Code.

Touch-Target-Fixes (44px) + Heading-/main-Landmark-Korrekturen laufen als Hygiene-Pass in Schritt 3/4 mit.
