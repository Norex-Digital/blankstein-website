# Vorlagen-Report Blankstein — Handwerker-/Reinigungs-Websites (2026-06-22)

> Multi-Agent-Recherche (GitHub + 21st.dev + Web), 5 Such-Achsen → 44 Roh-Kandidaten → dedupliziert + kritisch gefiltert + nach Eignung für eine statische Vanilla-HTML-Site mit Vertrauens-Fokus gerankt.

**Verworfen:** Tailwind Plus (kommerziell), 21st.dev/Tailark/Cosmic (React/paid → nur Layout-Vorbild), Paul-Browne-Slider (keine Lizenz) → ersetzt durch MIT-lizenzierten sneas-Slider.

---

## A) Full-Templates zum direkten Anlehnen

**CleanMe – Cleaning Service** ★★★★★ · https://github.com/sujansince2003/cleaning-service-website · [Demo](https://cleaning-service-website-five.vercel.app/) · HTML/CSS+Vanilla+Bootstrap · Lizenz: Attribution-Pflicht
Komplette Reinigungs-Architektur als Bauplan (Hero+Quote, Service-Grid, Why-Choose, Team, FAQ, Pricing, Testimonials). Mitnehmen: Sektions-Reihenfolge als Skelett, Blau + echte Gesichter statt KI. Achtung Attribution — abzeichnen statt 1:1.

**ThemeWagon Pressure Washing** ★★★★★ · https://github.com/themewagon/pressure-washing · [Demo](https://themewagon.github.io/pressure-washing/) · HTML/CSS Bootstrap4 · Lizenz: frei kommerziell
Branchen-exakt für Druckreinigung, reines statisches HTML. Hero+CTA, Testimonial-Carousel, Fun-Fact-Counter, Galerie-Modal, Maps. Mitnehmen: Sektions-Gerüst direkt; Counter („500+ gereinigte Flächen") als Trust-Ersatz solange keine Reviews.

**ScrewFast** ★★★★★ · https://github.com/mearashadowfax/ScrewFast · [Demo](https://screwfast.uk) · Astro+Tailwind (statisches HTML) · MIT
Bau-Dienstleistung. Mehrseiten-IA, Testimonial-/Statistics-Arrays, fertiges **LocalBusiness-JSON-LD**, Sitemap. Mitnehmen: schema.org-Markup (LocalBusiness/areaServed) abschauen, Statistics als Zahlen-Trust.

**Accessible Astro Starter** ★★★★★ · https://github.com/incluud/accessible-astro-starter · [Demo](https://accessible-astro-starter.incluud.dev/) · Astro (statisch) · MIT
WCAG-2.2-AA, **validierte Anfrage-Form** mit Inline-Fehlern + Thank-you-Seite. Mitnehmen: Formular-Markup für den Conversion-Pfad. Barrierefreiheit = echter Conversion-Hebel bei älteren Eigenheimbesitzern.

**HTML5 UP – Forty / Spectral** ★★★★ · [Forty](https://html5up.net/forty) · [Spectral](https://html5up.net/spectral) · HTML/CSS+Vanilla · CC-Attribution
Designstärker als Bootstrap. Forty: Tiles-Grid als Vorher/Nachher-Galerie + Spotlight-„Problem→Ergebnis". Spectral: dominantes Hero→Statement→Features→CTA-Gerüst.

**StartBootstrap – Agency / Small Business / Grayscale / Landing / Creative** ★★★★ (alle MIT)
[Agency](https://startbootstrap.github.io/startbootstrap-agency/) (Portfolio-Lightbox + Team-Gesichter) · [Small Business](https://startbootstrap.github.io/startbootstrap-small-business/) (nüchternes Trust-Skelett, CTA-Card über Service-Grid — tonal exakt Blankstein) · [Grayscale](https://startbootstrap.github.io/startbootstrap-grayscale/) (alternierende Showcases) · [Landing](https://startbootstrap.github.io/startbootstrap-landing-page/) (Hero-Lead-Form) · [Creative](https://startbootstrap.github.io/startbootstrap-creative/) (Lightbox + Form). Frei klaubar.

**Static-Gen (falls je Umzug):** [Venture/11ty](https://github.com/CloudCannon/small-business-template-eleventy) · [Bigspring/Hugo](https://bigspring-light-hugo.vercel.app/) · [AstroWind](https://astrowind.vercel.app/) — alle MIT, einzelne Widgets (Steps, FAQ, Stats, Testimonial-Carousel) als HTML klaubar.

---

## B) Echte Vorbild-Sites (Pressure-Washing / Cleaning) — was im Markt konvertiert

**Saving Paving (UK)** ★★★★★ · https://www.savingpaving.co.uk — **der nächste Nachbar zu Blankstein** (Driveway/Patio, Black-Spot, Versiegelung). Mitnehmen: Preis-Versprechen „keine versteckten Kosten" + qm-Startpreis prominent; WhatsApp neben Tel; Black-Spot-Vorher/Nachher; Ortsliste; Vier-Wort-Versprechen „reinigen·reparieren·schützen·pflegen".

**The Driveway Doctor (UK)** ★★★★★ · https://drivewaydoctor.co/ — bodenständig, vertrauens-erst, kein Luxus = Blanksteins Ton. Mitnehmen: Drag-Vorher/Nachher-Slider; Reviews **immer mit Name + Ort**; „familiengeführt + voll versichert".

**Revive (US)** ★★★★★ · https://revivepowerwash.com — Mitnehmen: ultrakurzes Quote-Formular im Hero („Angebot in 7 Sek."); Review-Zahl als Headline; „schonende Reinigung, beschädigt den Stein nicht".

**Ace (US)** ★★★★★ · https://washwithace.com/ — Garantie-Badge neben JEDEM CTA; Versicherungs-/Gewerbe-Zeile; Service-Area als Ortsliste statt Map; tel: dreifach.

**Weitere:** [Rinse Prince](https://callrinseprince.com) (Geld-zurück ausformuliert, Vorbereitungs-Checkliste) · [Perfect Power Wash](https://perfectpowerwash.com) (Quote mit Checkboxen, Vorher/Nachher-Video) · [Clean Fellas](https://cleanfellasinc.com) (Navy/Weiß, CTA-Anker je Sektion) · [Texas Premier](https://texaspremierpw.com) (3-Schritt-Prozess, konkrete Versicherungssumme) · [Alpha](https://alphapressurewash.com/) (Zahl-statt-Bild-Trust) · [Pressure Wash Carolina](https://pressurewashcarolina.com) (Credibility-Badge-Wand).

---

## C) Einzel-Bausteine / Features zum Nachbauen

**img-comparison-slider (sneas)** ★★★★★ · https://github.com/sneas/img-comparison-slider · [Demo](https://img-comparison-slider.sneas.io/) · Vanilla Web-Component · MIT — **DAS Before/After-Feature.** `<img-comparison-slider>`, Maus+Tastatur, kein Build. 1:1 per script-Tag einbindbar. Echter Arbeits-Beweis statt KI-Foto.

**HyperUI** ★★★★★ · https://hyperui.dev/components/marketing/ · Plain HTML+Tailwind, copy-paste · MIT — Stats/Trust-Band, Service-Grid, FAQ, Sticky-CTA. Tailwind-Klassen ins Vanilla-CSS übersetzen.

**Conversion-Set** ★★★★★ — Sticky-Mobile-CTA, Click-to-WhatsApp (`wa.me` vorbefüllt), tel:, 5-Sek-Hero-Regel. Stack-unabhängig.

**Trust-Signal-Set** ★★★★★ — Gewerbe-/Versicherungs-Badge, NAP konsistent, Maps-Havelland. Kernregel: **Reviews neben jeden CTA, nicht auf eine einsame Testimonials-Seite.**

**Preline / Flowbite** ★★★★ · [Preline](https://preline.co/blocks/) · [Flowbite Cards](https://flowbite.com/docs/components/card/) · MIT — Anfrage-Form mit **Foto-Upload der Fläche**, FAQ-Accordion, Service-Card-Grid.

---

## Empfehlung

**3 passendste Gesamt-Vorbilder:**
1. **Saving Paving** — gleiche Nische, gleicher Markt. Bestes Vorbild für **WAS** auf die Seite muss (Inhalt/Strategie).
2. **ThemeWagon Pressure Washing** — branchen-exakt, frei lizenziert, reines statisches HTML. Bestes Vorbild für **WIE** (technisches Gerüst).
3. **The Driveway Doctor** — Tonalität punktgenau + Before/After-Slider + Named+Ort-Reviews.

**4-5 Features als nächster Schritt:**
1. **Before/After-Slider** (img-comparison-slider, MIT) mit ECHTEN Job-Fotos — heilt Bild-Lastigkeit + Trust-Lücke + KI-Foto-Problem in einem Zug. Höchste Prio.
2. **Stats/Trust-Band unter dem Hero** — „X Flächen · Y Jahre · voll versichert · Region Havelland". Zahlen statt Bilder.
3. **Dominanter Conversion-Pfad** — Quote-Form im Hero + Sticky-Mobile-CTA mit tel: + Click-to-WhatsApp.
4. **Trust-Zeile + Garantie-Badge neben jedem CTA** — Versicherung/Gewerbe + ausformulierte Garantie + Havelland-Ortsliste.
5. **3-Schritt-Prozess** („Angebot → Termin → saubere Terrasse") + **LocalBusiness-JSON-LD** (areaServed = Havelland).

Optional (bei Wachstum über One-Pager): programmatische Havelland-Standort-Seiten.
