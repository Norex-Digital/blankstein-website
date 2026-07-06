// Blankstein Static-Site-Generator — Node, zero deps. Run: node scripts/generate.mjs
// Fork der havelland-website-Mechanik (Sanitizer, Schema, Title/Meta-Clamp, pic, Sitemaps), neue Blankstein-Templates
// im Design von design/hero-v3.html. Copy = bau-fakten.md + 02_seitenarchitektur.md (NICHT die veraltete hero-v3-Copy:
// kein Heisswasser, kein "kein Hochdruck", online IMMER Richtpreis statt "Festpreis"). FAQPage-JSON-LD bewusst gesetzt (AEO §5).
import fs from 'fs';
import crypto from 'node:crypto';
// Cache-Busting: kurzer Inhalts-Hash der CSS -> ?v=… am <link>, damit Browser nach jeder CSS-Änderung frisch lädt
const CSS_VER = crypto.createHash('md5').update(fs.readFileSync('assets/css/site.css')).digest('hex').slice(0, 8);

const J = f => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
const services = J('services.json').services;
const loc = J('locations.json'); const orte = loc.orte;
const nap = J('nap.json'); const config = J('config.json'); const proof = J('proof.json');
const reviewsData = fs.existsSync('data/reviews.json') ? J('reviews.json') : { count: 0, rating: null, reviews: [] };
const DOMAIN = config.domain.replace(/\/$/, '');
const P = config.preise;
// Money-Hub-Copy (data/copy/hubs.json) — optional; nur Services mit Eintrag werden als Hub gerendert (Muster-Hub-Phase)
const hubCopyRaw = fs.existsSync('data/copy/hubs.json') ? JSON.parse(fs.readFileSync('data/copy/hubs.json', 'utf8')) : { hubs: [] };
const hubList = Array.isArray(hubCopyRaw) ? hubCopyRaw : (hubCopyRaw.hubs || []);
const hubCopy = Object.fromEntries(hubList.map(h => [h.slug, h]));
// Orts-Hub-Copy (data/copy/orte.json) — optional; nur Orte mit Eintrag werden als lokaler Hub gerendert
const orteCopyRaw = fs.existsSync('data/copy/orte.json') ? JSON.parse(fs.readFileSync('data/copy/orte.json', 'utf8')) : { orte: {} };
const orteCopy = orteCopyRaw.orte || {};
// Ratgeber-Copy (data/copy/ratgeber.json) — optional; Artikel-Template (AEO), bridged zu Money-Hubs
const ratCopyRaw = fs.existsSync('data/copy/ratgeber.json') ? JSON.parse(fs.readFileSync('data/copy/ratgeber.json', 'utf8')) : { ratgeber: [] };
const ratList = Array.isArray(ratCopyRaw) ? ratCopyRaw : (ratCopyRaw.ratgeber || []);

// ---------- Analytics-Gerüst (GA4/GTM + Consent Mode v2) — rendert NUR bei echter GTM-ID ----------
const isReal = v => v && !/\b(TBD|XXXX|G-XXXX|GTM-X|null)\b/i.test(String(v));
const GTM = config.gtm_id; const TRACK = isReal(GTM);
const ANALYTICS_HEAD = TRACK ? `
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${GTM}');</script>` : '';
const ANALYTICS_BODY = TRACK ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : '';
const CONSENT_BANNER = TRACK ? `<div id="consent" class="consent" hidden><div class="consent-in"><p>Wir nutzen Cookies und Tools für anonyme Nutzungsstatistik. Sie entscheiden — mehr in der <a href="/datenschutz/">Datenschutzerklärung</a>.</p><div class="consent-btns"><button type="button" class="btn btn-line" data-c="deny">Ablehnen</button><button type="button" class="btn btn-acc" data-c="allow">Akzeptieren</button></div></div></div>
<script>(function(){var box=document.getElementById('consent');if(!box)return;function gtag(){dataLayer.push(arguments)}var grant={analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'};var s=localStorage.getItem('consent');if(s==='allow'){gtag('consent','update',grant)}else if(!s){box.hidden=false}box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var c=b.getAttribute('data-c');localStorage.setItem('consent',c);if(c==='allow'){gtag('consent','update',grant)}box.hidden=true})})();</script>` : '';
const TRACK_EVENTS = TRACK ? `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a||!a.href)return;if(a.href.indexOf('tel:')===0){dataLayer.push({event:'phone_call'})}else if(a.href.indexOf('wa.me')>-1||a.href.indexOf('api.whatsapp')>-1){dataLayer.push({event:'whatsapp_click'})}});</script>` : '';

// ---------- Sanitizer / Escaping ----------
const decEnt = s => { let p = String(s == null ? '' : s), c; do { c = p; p = p.replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0*39;/gi, "'").replace(/&apos;/gi, "'").replace(/&nbsp;/gi, ' '); } while (p !== c); return p; };
const esc = t => (t == null ? '' : String(t)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sj = v => String(v == null ? '' : decEnt(v)).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\u003c').replace(/[\r\n\t]+/g, ' ');

// ---------- Kontakt-Konstanten ----------
const tel = nap.phone_e164;
const waNum = tel.replace('+', '');
const waHref = q => `https://wa.me/${waNum}?text=${encodeURIComponent(q)}`;
const WA_DEFAULT = 'Hallo Blankstein, ich möchte einen Richtpreis für meine Fläche. Foto und ungefähre Maße schicke ich gleich mit.';
// Formular-Wahrheit (Spec §3.5): Nur mit echtem Web3Forms-Key existiert ein sendbares Formular.
// Ohne Key wird NIRGENDS eines versprochen (kein „Formular mit Foto-Upload"-Link, kein stiller WhatsApp-Redirect) —
// /kontakt/ zeigt dann einen ehrlichen Hinweis + die echten Kanäle.
const FORM_OK = isReal(config.web3forms_key);
// ---------- SLA-Baustein (Spec §3.4, Maurice 06.07.) — SINGLE SOURCE für Antwortzeit. NIE "30 Minuten". ----------
const SLA = 'Antwort < 2 h — werktags 8–18 Uhr';           // Plain (wird durch esc() geschickt)
const SLA_HTML = 'Antwort &lt;&nbsp;2&nbsp;h — werktags 8–18 Uhr'; // Für raw-HTML-Templates (nicht esc-te Slots)
const SLA_CTA = 'Antwort werktags < 2 h';                  // Kurzform an CTAs
const SLA_CTA_HTML = 'Antwort werktags &lt;&nbsp;2&nbsp;h';
// GBP-Review-Deeplink (Fallback-Datenstand; sync-gbp-reviews.mjs kommt in Etappe C)
const GBP_PLACE_ID = 'ChIJFS1vkVJTuWkRmJYCKNBWRcQ';
const GBP_REVIEWS_URL = `https://search.google.com/local/reviews?placeid=${GBP_PLACE_ID}`;

// ---------- Title ≤60 / Meta 150–158 (escape-aware) ----------
const rlen = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').length;
function clampTitle(s) { s = (s || '').replace(/\s+/g, ' ').trim(); while (rlen(s) > 60) { const sp = s.lastIndexOf(' '); if (sp < 30) { s = s.slice(0, s.length - 1); continue; } s = s.slice(0, sp); } return s.replace(/[ ,;:–-]+$/, ''); }
const META_TAIL = ' Blankstein reinigt Stein- und Terrassenflächen im Havelland — Richtpreis ab 7 €/m², Antwort werktags < 2 h.';
const DANGLE = /\s+(per|und|mit|nach|für|im|in|zu|von|der|die|das|ein|eine|einen|am|an|auf|bei|als|wie|oder|aus|über|unter|vor|jetzt|noch|so|dem|den)$/i;
function mkMeta(s) {
  s = (s || '').replace(/\s+/g, ' ').trim();
  let t = rlen(s) < 150 ? s + META_TAIL : s;
  while (rlen(t) > 158) { const sp = t.lastIndexOf(' '); if (sp < 110) break; t = t.slice(0, sp); }
  const cl = Math.max(t.lastIndexOf(', '), t.lastIndexOf('. '));
  if (cl >= 150) t = t.slice(0, cl);
  t = t.replace(/[ ,;:.–-]+$/, '');
  while (DANGLE.test(t)) t = t.replace(DANGLE, '').replace(/[ ,;:.–-]+$/, '');
  return t + '.';
}

// ---------- Bilder: Manifest + <picture> + Provenance (Spec §3.6) ----------
// manifest.json trägt je Slug ein Pflichtfeld source: "echt"|"ki"|"karte"|"neutral" (Wahrheit: previews/ASSET-LISTE.md).
// Badge-Rendering ist OPT-IN via badge:true (bricht keine Alt-Verwendungen); Beweis-Slot-Gates folgen in gates.mjs.
const IMG = JSON.parse(fs.readFileSync('assets/img/manifest.json', 'utf8'));
const KI_LABEL = 'Illustration — beispielhafte Darstellung';
const BADGE_HTML = {
  echt: '<span class="badge b-echt">Echtes Foto · Kundenauftrag</span>',
  ki: `<span class="badge b-ki">${KI_LABEL}</span>`,
  karte: '<span class="badge b-karte">Kartenmaterial © OpenStreetMap</span>'
};
const VIDEO_BADGE = '<span class="badge b-video">Echtes Video · Kundenauftrag</span>';
function pic(slug, { cls = '', alt = '', sizes = '100vw', lcp = false, decorative = false, badge = false } = {}) {
  const m = IMG[slug];
  if (!m) return '';
  // KI-Bilder: Label auch im alt-Text erzwingen, sobald das Badge gerendert wird (UWG-Kennzeichnung)
  if (badge && m.source === 'ki' && alt && !/beispielhafte Darstellung/i.test(alt)) alt = `${alt} (${KI_LABEL})`;
  const ss = ext => m.widths.map(w => `/assets/img/${slug}-${w}.${ext} ${w}w`).join(', ');
  const sources = (m.avif ? `<source type="image/avif" srcset="${ss('avif')}" sizes="${sizes}">` : '') + `<source type="image/webp" srcset="${ss('webp')}" sizes="${sizes}">`;
  const aAttr = decorative ? 'alt="" role="presentation"' : `alt="${esc(alt)}"`;
  const lAttr = lcp ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  const picture = `<picture style="display:contents">${sources}<img${cls ? ` class="${cls}"` : ''} src="/assets/img/${slug}-${m.fb_w}.${m.fb_ext}" width="${m.w}" height="${m.h}" ${aAttr} ${lAttr}></picture>`;
  const badgeHtml = badge ? BADGE_HTML[m.source] : '';
  return badgeHtml ? `<span class="pv-wrap">${badgeHtml}${picture}</span>` : picture;
}
const imgAbs = slug => { const m = IMG[slug]; return m ? `${DOMAIN}/assets/img/${slug}-${m.fb_w}.${m.fb_ext}` : ''; };
function logoImg(slug, cls, h) { const m = IMG[slug]; const w = Math.round(m.w * h / m.h); return `<img src="/assets/img/${slug}.${m.fb_ext}" alt="Blankstein — Steinreinigung im Havelland" width="${w}" height="${h}" class="${cls}">`; }

// ---------- SVG-Icons (inline, currentColor) ----------
const ICON = {
  spray: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l6-6"/><path d="M14 4l-2 2 4 4 2-2a2.83 2.83 0 0 0-4-4z"/><path d="M19 9l1.5 1.5"/><path d="M9 13l1.5 1.5"/><path d="M14 14l1 1"/><path d="M18 13l1 1"/></svg>',
  grid: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  drop: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  vacuum: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 8v8a3 3 0 0 1-3 3H8"/><circle cx="6" cy="19" r="2"/><path d="M8 19h2"/><path d="M19 8a3 3 0 0 0-6 0v4"/><path d="M9 12h8"/></svg>',
  shield: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  clock: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin: '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  wa: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.484 2 12.017c0 1.987.549 3.844 1.504 5.432L2 22l4.657-1.494A9.959 9.959 0 0 0 12 22c5.523 0 10-4.484 10-10.017C22 6.484 17.523 2 12 2zm0 18.175a8.163 8.163 0 0 1-4.162-1.138l-.299-.178-3.093.992.994-3.031-.195-.313A8.174 8.174 0 0 1 3.825 12c0-4.515 3.67-8.175 8.175-8.175 4.506 0 8.175 3.66 8.175 8.175 0 4.514-3.669 8.175-8.175 8.175z"/></svg>',
  mail: '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  camera: '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13.5" r="3.2"/></svg>',
  calendar: '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>',
  phone: '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
};

// ---------- Schema ----------
const ohSpecJson = (nap.openingHours || []).map(s => `{"@type":"OpeningHoursSpecification","dayOfWeek":[${s.dayOfWeek.map(d => `"${d}"`).join(',')}],"opens":"${s.opens}","closes":"${s.closes}"}`).join(',');
function orgSchema() {
  const addr = nap.street ? `,"address":{"@type":"PostalAddress","streetAddress":"${sj(nap.street)}","postalCode":"${sj(nap.zip)}","addressLocality":"${sj(nap.city)}","addressCountry":"DE"}` : '';
  const geo = (nap.geo && nap.geo.lat != null) ? `,"geo":{"@type":"GeoCoordinates","latitude":${nap.geo.lat},"longitude":${nap.geo.lng}}` : '';
  const oh = ohSpecJson ? `,"openingHoursSpecification":[${ohSpecJson}]` : '';
  const legal = nap.rechtstraeger ? `,"legalName":"${sj(nap.rechtstraeger)}"` : '';
  const svcType = `,"serviceType":[${services.map(s => `"${sj(s.name)}"`).join(',')}]`;
  const areaServed = `,"areaServed":[${orte.map(o => `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`).join(',')},{"@type":"AdministrativeArea","name":"Havelland"}]`;
  const offers = `,"hasOfferCatalog":{"@type":"OfferCatalog","name":"Leistungen","itemListElement":[${services.map(s => `{"@type":"Offer","itemOffered":{"@type":"Service","name":"${sj(s.name)}","serviceType":"${sj(s.name)}"}}`).join(',')}]}`;
  // sameAs: Maps-CID-URL + GBP-Review-Deeplink (Spec §4 MUSS: Entity-Verknüpfung Website ↔ GBP).
  // BEWUSST KEIN AggregateRating-Schema: Bewertungen liegen auf dem eigenen GBP (self-serving);
  // Google zeigt seit Dez 2025 keine SERP-Sterne mehr für selbst ausgezeichnete LocalBusiness-Reviews —
  // nur Risiko (Spam-Einstufung), kein Nutzen. Reviews werden sichtbar zitiert + zu Google verlinkt.
  const sameAs = `,"sameAs":["https://maps.google.com/?cid=${reviewsData.cid || '14142805656851355288'}","${GBP_REVIEWS_URL}"]`;
  return `{"@type":"HomeAndConstructionBusiness","@id":"${DOMAIN}/#organization","name":"${sj(nap.name)}"${legal},"description":"Steinreinigung, Terrassenreinigung, Pflasterreinigung und Steinversiegelung im Havelland und am westlichen Berliner Rand.","telephone":"${tel}","email":"${sj(nap.email)}","url":"${DOMAIN}/","image":"${imgAbs('og-default')}","logo":"${DOMAIN}/assets/img/logo.png","priceRange":"€€"${sameAs}${addr}${geo}${oh}${svcType}${areaServed}${offers}}`;
}
// WebSite-Knoten (Spec §4 MUSS) — auf der Startseite ausgegeben, verweist auf die Organization.
const websiteSchema = () => `{"@type":"WebSite","@id":"${DOMAIN}/#website","url":"${DOMAIN}/","name":"Blankstein","inLanguage":"de-DE","publisher":{"@id":"${DOMAIN}/#organization"}}`;
function breadcrumb(items) {
  const li = items.map((it, i) => `{"@type":"ListItem","position":${i + 1},"name":"${sj(it.name)}"${it.url ? `,"item":"${DOMAIN}${it.url}"` : ''}}`).join(',');
  return `{"@type":"BreadcrumbList","itemListElement":[${li}]}`;
}
function faqSchema(url, faqs) {
  if (!faqs || !faqs.length) return '';
  const q = faqs.map(f => `{"@type":"Question","name":"${sj(f.q)}","acceptedAnswer":{"@type":"Answer","text":"${sj(f.a)}"}}`).join(',');
  return `,{"@type":"FAQPage","@id":"${DOMAIN}${url}#faq","mainEntity":[${q}]}`;
}

// ---------- Chrome (head / header / footer / sticky / reveal) ----------
// og:image-Pipeline (Spec §4 MUSS, fixt A7): head() nimmt opts.og = { slug: 'og-datei-slug', motif: 'manifest-slug' }.
// generate sammelt alle Jobs in OG_JOBS -> assets/img/og-jobs.json; scripts/build-og-images.py rendert daraus
// 1200×630-JPGs (echtes Motiv + Seitentitel + Logo) nach assets/img/og/ UND website/assets/img/og/.
// Ohne opts.og: og-default (Legal/404). gates.mjs prueft die Existenz jeder referenzierten og-Datei.
const OG_JOBS = [];
function head(title, desc, canonical, schemaGraph, opts = {}) {
  let ogUrl, ogW = 1200, ogH = 630;
  if (opts.og && opts.og.slug && IMG[opts.og.motif]) {
    OG_JOBS.push({ slug: opts.og.slug, motif: opts.og.motif, title: title.replace(/\s*\|\s*Blankstein\s*$/, '') });
    ogUrl = `${DOMAIN}/assets/img/og/${opts.og.slug}.jpg`;
  } else {
    // Fallback og-default liegt UNsuffigiert als og-default.jpg (Altbestands-Bug og-default-1200.jpg = 404, Befund A7)
    const om = IMG['og-default'];
    ogUrl = `${DOMAIN}/assets/img/og-default.${om.fb_ext}`; ogW = om.w; ogH = om.h;
  }
  const ogImg = `<meta property="og:image" content="${ogUrl}"><meta property="og:image:width" content="${ogW}"><meta property="og:image:height" content="${ogH}"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:card" content="summary_large_image">`;
  // 404: KEIN self-canonical (Spec §4 — die Fehlerseite ist kein kanonisches Dokument) -> opts.nocanon
  const canonTags = opts.nocanon ? '' : `\n<link rel="canonical" href="${DOMAIN}${canonical}">`;
  const ogUrlTag = opts.nocanon ? '' : `<meta property="og:url" content="${DOMAIN}${canonical}">`;
  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${ANALYTICS_HEAD}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${opts.noindex ? '\n<meta name="robots" content="noindex, follow">' : ''}${canonTags}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">${ogUrlTag}<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Blankstein">${ogImg}
<link rel="icon" type="image/png" href="/assets/img/logo.png">
<link rel="preload" href="/assets/fonts/sora-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${CSS_VER}">
<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[${schemaGraph}]}</script>
</head><body${opts.pagetype ? ` data-pagetype="${opts.pagetype}"` : ''}>${ANALYTICS_BODY}<a class="skip" href="#main">Zum Inhalt springen</a>`;
}
// ---------- Chrome: Microbar + Header + Local-Trust-Footer + Sticky-Bar (Spec §2.1/§2.13/§3.2) ----------
const mainWrap = m => `<main id="main">${m}</main>`; // <main>-Landmark + Skip-Link-Ziel (Spec §4 MUSS)
const AMPEL_SPAN = cls => `<span class="status${cls ? ` ${cls}` : ''}" data-ampel><span class="status-tx">Mo–Fr 8–18 · Sa 9–14</span></span>`;
const microbar = `<div class="microbar"><div class="container microbar-in">
<span class="mb-nap"><span class="mb-adr">${esc(nap.street)} · ${esc(nap.zip)} ${esc(nap.city)} · </span><a href="tel:${tel}">${esc(nap.phone_display)}</a></span>
${AMPEL_SPAN('')}
</div></div>`;
const NAV = [['Leistungen', '/#leistungen'], ['Preise', '/preise/'], ['Bewertungen', '/bewertungen/'], ['Über uns', '/ueber-uns/'], ['Servicegebiet', '/servicegebiet/'], ['Ratgeber', '/ratgeber/'], ['Kontakt', '/kontakt/']];
const header = `${microbar}<header class="site-header" id="header"><div class="container nav-row">
<a class="logo" href="/" aria-label="Blankstein — zur Startseite">${logoImg('logo', 'header-logo', 34)}</a>
<nav aria-label="Hauptnavigation"><ul class="nav-links" id="nav-list">${NAV.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}<li class="nav-li-phone"><a class="nav-phone" href="tel:${tel}">${esc(nap.phone_display)}</a></li></ul></nav>
<div class="nav-right"><a class="nav-phone" href="tel:${tel}">${esc(nap.phone_display)}</a>
<a class="btn-wa nav-cta" href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener">${ICON.wa} Richtpreis anfragen</a>
<button class="menu-toggle" id="menu-toggle" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span><span></span></button></div>
</div></header>`;
// Mobile Sticky-Bar: 3 Kanäle + Live-Preis-Slot (data-live-price — wird in Etappe B vom Konfigurator befüllt)
const sctaBar = waText => `<nav class="scta" aria-label="Schnellkontakt"><span class="scta-price mono" data-live-price hidden></span><div class="scta-row"><a class="s-wa" href="${waHref(waText)}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a><a class="s-tel" href="tel:${tel}">${ICON.phone} Anrufen</a>${FORM_OK ? '<a class="s-form" href="/kontakt/#anfrage">Formular</a>' : '<a class="s-form" href="/kontakt/">Kontakt</a>'}</div></nav>`;
const SCTA = sctaBar(WA_DEFAULT);
// Local-Trust-Footer (Spec §2.13): voller NAP, Öffnungszeiten, GBP-Deeplink, Karte, Provenance-Erklärzeile
const footRev = (reviewsData.rating && reviewsData.count) ? ` (${Number(reviewsData.rating).toFixed(1).replace('.', ',')} · ${reviewsData.count})` : '';
const footer = `<footer class="site-footer"><div class="container">
<div class="foot-grid">
<div>
${logoImg('logo-weiss', 'foot-logo', 26)}
<address class="foot-nap">${esc(nap.gbp_name)}<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}<br><a href="tel:${tel}">${esc(nap.phone_display)}</a> · <a href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener">WhatsApp</a><br><a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a></address>
${AMPEL_SPAN('foot-status')}
</div>
<div>
<p class="foot-h">Öffnungszeiten</p>
<table class="hours"><tr><th scope="row">Montag–Freitag</th><td>8–18 Uhr</td></tr><tr><th scope="row">Samstag</th><td>9–14 Uhr</td></tr><tr><th scope="row">Sonntag</th><td>geschlossen</td></tr></table>
<p class="foot-sla">${SLA_HTML}</p>
</div>
<div>
<p class="foot-h">Seiten</p>
<ul><li><a href="/#leistungen">Leistungen</a></li><li><a href="/preise/">Preise</a></li><li><a href="/bewertungen/">Bewertungen</a></li><li><a href="/ueber-uns/">Über uns</a></li><li><a href="/ratgeber/">Ratgeber</a></li><li><a href="/servicegebiet/">Servicegebiet</a></li><li><a href="/kontakt/">Kontakt</a></li><li><a href="/impressum/">Impressum</a></li><li><a href="/datenschutz/">Datenschutz</a></li></ul>
</div>
<div>
<p class="foot-h">Nachweise</p>
<ul><li><a href="${GBP_REVIEWS_URL}" target="_blank" rel="noopener">Google-Bewertungen${footRev} ↗</a></li><li><a href="/bewertungen/">Bewertungen im Überblick</a></li></ul>
<figure class="foot-map">${pic('servicegebiet-karte', { alt: 'Karte des Blankstein-Servicegebiets im Havelland und am westlichen Berliner Rand', sizes: '300px' })}<figcaption>© OpenStreetMap-Mitwirkende</figcaption></figure>
</div>
</div>
<div class="foot-legal"><span>Alle als „Echtes Foto" oder „Echtes Video" gekennzeichneten Medien sind unbearbeitete Aufnahmen aus eigenen Kundenaufträgen. Illustrationen sind als solche gekennzeichnet.</span><span>© 2026 Blankstein · ${esc(nap.rechtstraeger)}</span></div>
</div></footer>`;
// Schlankes Chrome fuer die Reel-Landing /start (distraction-free: Logo + 1 CTA, KEIN Nav-Menue/Hamburger; Footer nur Pflichtlinks).
const leanHeader = wa => `<header class="site-header header-lean" id="header"><div class="container nav-row">
<a class="logo" href="/" aria-label="Blankstein Startseite">${logoImg('logo', 'header-logo', 34)}</a>
<div class="nav-right" style="margin-left:auto"><a href="${waHref(wa)}" class="btn-wa nav-cta" target="_blank" rel="noopener">${ICON.wa} Richtpreis anfragen</a></div>
</div></header>`;
const leanFooter = `<footer class="site-footer"><div class="container">
<address class="foot-nap">${esc(nap.gbp_name)} · ${esc(nap.street)} · ${esc(nap.zip)} ${esc(nap.city)} · <a href="tel:${tel}">${esc(nap.phone_display)}</a></address>
<div class="foot-legal"><span>© 2026 Blankstein · ${esc(nap.rechtstraeger)}</span><span><a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a></span></div>
</div></footer>`;
const navJS = `<script>(function(){var h=document.getElementById('header'),t=document.getElementById('menu-toggle'),n=document.getElementById('nav-list');addEventListener('scroll',function(){h.classList.toggle('scrolled',scrollY>8)},{passive:true});if(t){t.addEventListener('click',function(){var o=h.classList.toggle('nav-open');t.setAttribute('aria-expanded',o)});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){h.classList.remove('nav-open');t.setAttribute('aria-expanded',false)})})}})();</script>`;
const revealJS = `<script>if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)})}else{document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('visible')})}setTimeout(function(){document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('visible')})},2600);</script>`;
const fabChat = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
const fab = `<div class="fab" id="fab"><div class="fab-menu"><a href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener" class="fab-item"><span class="fab-ic">${ICON.wa}</span>WhatsApp</a><a href="tel:${tel}" class="fab-item"><span class="fab-ic">${ICON.phone}</span>Anrufen</a><a href="mailto:${esc(nap.email)}" class="fab-item"><span class="fab-ic">${ICON.mail}</span>E-Mail</a></div><button class="fab-toggle" type="button" aria-label="Schnellkontakt öffnen" aria-expanded="false">${fabChat}</button></div>`;
const fabJS = `<script>(function(){var f=document.getElementById('fab');if(!f)return;var b=f.querySelector('.fab-toggle');b.addEventListener('click',function(e){e.stopPropagation();var o=f.classList.toggle('open');b.setAttribute('aria-expanded',o)});document.addEventListener('click',function(e){if(!f.contains(e.target))f.classList.remove('open')});addEventListener('keydown',function(e){if(e.key==='Escape')f.classList.remove('open')})})();</script>`;
/* tiltJS entfernt (Etappe D, Aufräum-Task): letzter .svc-card-Nutzer war der alte Ratgeber-Index — jetzt rg-card ohne Tilt. */
const rgTocJS = `<script>(function(){var toc=document.querySelector('.rg-toc');if(!toc)return;var links=toc.querySelectorAll('a');var secs=document.querySelectorAll('.rg-section[id]');if(!secs.length)return;var byId={};links.forEach(function(a){byId[a.getAttribute('href').slice(1)]=a});var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.remove('is-active')});var a=byId[e.target.id];if(a)a.classList.add('is-active')}})},{rootMargin:'-15% 0px -75% 0px'});secs.forEach(function(s){io.observe(s)})})();</script>`;
const geoMapJS = `<script>(function(){var m=document.getElementById('svc-map');if(!m)return;function set(slug,on){var p=m.querySelector('.svc-pin[data-slug="'+slug+'"]');var c=document.querySelector('.ort-card[data-slug="'+slug+'"]');if(p)p.classList.toggle('is-active',on);if(c)c.classList.toggle('is-active',on)}function bind(el){var s=el.getAttribute('data-slug');el.addEventListener('mouseenter',function(){set(s,true)});el.addEventListener('mouseleave',function(){set(s,false)});el.addEventListener('focus',function(){set(s,true)});el.addEventListener('blur',function(){set(s,false)})}document.querySelectorAll('.ort-card[data-slug]').forEach(bind);m.querySelectorAll('.svc-pin[data-slug]').forEach(bind)})();</script>`;
// UTM-Erfassung (site-weit): liest utm_* aus URL, persistiert in sessionStorage, pusht in dataLayer (greift bei echter GTM-ID)
// UND reicht die Quelle bis zum Lead durch — haengt sie an alle WhatsApp-Texte + ins Kontakt-Formular. Funktioniert auch OHNE GA4-Key.
const utmJS = `<script>(function(){try{var p=new URLSearchParams(location.search),keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'],u={},has=false;keys.forEach(function(k){var v=p.get(k);if(v){u[k]=v;has=true}});var K='bs_utm';if(has){try{sessionStorage.setItem(K,JSON.stringify(u))}catch(e){}}else{try{u=JSON.parse(sessionStorage.getItem(K)||'{}')}catch(e){u={}}}if(!Object.keys(u).length)return;if(window.dataLayer)dataLayer.push({event:'utm_capture',utm:u});var f=document.querySelector('form#anfrage');if(f&&!f.querySelector('[name="herkunft"]')){var i=document.createElement('input');i.type='hidden';i.name='herkunft';i.value=JSON.stringify(u);f.appendChild(i)}}catch(e){}})();</script>`;
// Erreichbarkeits-Ampel (Spec §3.3) — gelockte Zeiten Mo–Fr 8–18, Sa 9–14; bemalt alle [data-ampel] (Microbar, Footer, später Hero/Kontakt)
const ampelJS = `<script>(function(){var d=new Date(),g=d.getDay(),h=d.getHours()+d.getMinutes()/60;var open=(g>=1&&g<=5)?(h>=8&&h<18):(g===6&&h>=9&&h<14);var nxt;if(g>=1&&g<=5&&h<8){nxt='öffnet heute 8 Uhr'}else if(g===6&&h<9){nxt='öffnet heute 9 Uhr'}else if(g===5&&h>=18){nxt='öffnet morgen 9 Uhr'}else if(g===6&&h>=14){nxt='öffnet Montag 8 Uhr'}else{nxt='öffnet morgen 8 Uhr'}document.querySelectorAll('[data-ampel]').forEach(function(el){var tx=el.querySelector('.status-tx');if(!tx)return;el.classList.add(open?'is-open':'is-closed');tx.textContent=open?'● Jetzt erreichbar · Mo–Fr 8–18, Sa 9–14':'○ Gerade geschlossen · '+nxt+' · WhatsApp geht immer'})})();</script>`;
const FOOT_JS = navJS + revealJS + ampelJS + CONSENT_BANNER + TRACK_EVENTS + fab + fabJS + rgTocJS + geoMapJS + utmJS;
const LEAN_FOOT_JS = navJS + revealJS + ampelJS + CONSENT_BANNER + TRACK_EVENTS + fab + fabJS + utmJS; // /start: nur reale Scripts (kein totes Tilt/Lightbox/Scrollspy/Map)

// ---------- §2.12 FAQ (native details, PROTOKOLL-Formensprache; Schema separat via faqSchema) ----------
function faqBlock(faqs, { title = 'Kurz beantwortet', label = 'Häufige Fragen' } = {}) {
  if (!faqs || !faqs.length) return '';
  const items = faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  return `<section class="faq-section" id="faq"><div class="container"><div class="faq-head"><p class="doc-label">${esc(label)}</p><h2 class="sec-h2">${esc(title)}</h2></div><div class="faq reveal">${items}</div></div></section>`;
}

function write(url, html) {
  const dir = `website${url}`.replace(/\/$/, '');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/index.html`, html);
}
const preiseCopy = fs.existsSync('data/copy/preise.json') ? JSON.parse(fs.readFileSync('data/copy/preise.json', 'utf8')) : null;
const fallCopy = fs.existsSync('data/copy/fallstudien.json') ? JSON.parse(fs.readFileSync('data/copy/fallstudien.json', 'utf8')) : null;
const ueberCopy = fs.existsSync('data/copy/ueber.json') ? JSON.parse(fs.readFileSync('data/copy/ueber.json', 'utf8')) : null;
const gebietCopy = fs.existsSync('data/copy/servicegebiet.json') ? JSON.parse(fs.readFileSync('data/copy/servicegebiet.json', 'utf8')) : null;
const startCopy = fs.existsSync('data/copy/start.json') ? JSON.parse(fs.readFileSync('data/copy/start.json', 'utf8')) : null;
const reelsData = fs.existsSync('data/reels.json') ? JSON.parse(fs.readFileSync('data/reels.json', 'utf8')) : { aktiv: false, reels: [] };
const written = [];

// ====================================================================
// WIEDERVERWENDBARE SEKTIONEN (Home + Money-Hubs)
// ====================================================================
/* Etappe C: USP-Bento/Process/proofVideoBlock geloescht — Hubs/Orte nutzen jetzt die P2-Bibliothek
   (Beweis-Hero, Leistungs-Zeilen, Protokolle, Belagstabelle). K7-KI-Bento damit raus (Geraete-Klaerung offen). */
// ---------- Konfigurator (Spec §3.1 — Navy-Rechnerband; Home + Hubs + Orte + /preise/) ----------
// Guardrails: Ergebnis IMMER exakt m² × 7/8 € (keine Spannen, kein ±12 %) · Bildkacheln NUR echte Fotos
// (manifest source="echt") · WhatsApp-Handoff trägt den kompletten Zustand (Fläche, m², Paket, Ort, Summe, Seiten-Kontext).
const KONF_TILES = [
  ['Einfahrt', 'hub-steinreinigung-einfahrt'],
  ['Terrasse', 'proof-arbeit-2'],
  ['Wege und Treppen', 'hub-steinreinigung-wegetreppen', 'Wege &amp; Treppen'],
  ['Hoffläche', 'proof-ergebnis-1']
];
function konfigSection({ typ = 'Einfahrt', rate = P.satz_basis, ort = '', kontext = '', title = 'Was kostet Ihre Fläche? Rechnen Sie nach.', sub = 'Exakt m² mal 7 oder 8 Euro — mehr Formel gibt es nicht. Ohne Kontaktdaten, ohne Verpflichtung.', kurz = false } = {}) {
  const qm0 = 60, p0 = qm0 * rate;
  // kurz=true (Konfigurator-Kurzform, /start): Text-Kacheln statt Foto-Kacheln, kein Ort-Feld, keine Zusagen-Chips
  const tiles = KONF_TILES.map(([label, slug, html]) => `<button type="button" class="k-tile${kurz ? ' k-tile-txt' : ''}" data-type="${esc(label)}" aria-pressed="${label === typ}">${kurz ? '' : pic(slug, { decorative: true, sizes: '150px' })}<span>${html || esc(label)}</span></button>`).join('');
  return `<section class="konf-band on-dark" id="preise"><div class="container">
<div class="konf-head"><p class="doc-label">Richtpreis-Rechner</p><h2 class="sec-h2">${esc(title)}</h2><p class="sec-sub">${esc(sub)}</p></div>
<div class="konf" id="konf" data-base="${P.satz_basis}" data-impr="${P.satz_impraegnierung}" data-kontext="${esc(kontext)}">
<div class="konf-in">
<fieldset class="k-step"><legend><b>1</b> Welche Fläche?</legend><div class="k-tiles" role="group" aria-label="Flächentyp wählen">${tiles}</div></fieldset>
<fieldset class="k-step"><legend><b>2</b> Wie groß, ungefähr?</legend><div class="k-qmrow"><input type="range" id="k-range" min="5" max="300" step="5" value="${qm0}" aria-label="Fläche in Quadratmetern"><span class="k-qmval mono"><input type="number" id="k-num" min="1" max="2000" value="${qm0}" inputmode="numeric" aria-label="Quadratmeter eingeben"> m²</span></div></fieldset>
<fieldset class="k-step"><legend><b>3</b> Welches Paket?</legend><div class="k-paks" role="group" aria-label="Paket wählen">
<button type="button" class="k-pak" data-rate="${P.satz_basis}" aria-pressed="${rate === P.satz_basis}"><strong class="mono">${P.satz_basis}&nbsp;€<small>/m²</small></strong><span>Reinigung + Neuverfugung mit GaLaBau-Sand</span></button>
<button type="button" class="k-pak" data-rate="${P.satz_impraegnierung}" aria-pressed="${rate === P.satz_impraegnierung}"><strong class="mono">${P.satz_impraegnierung}&nbsp;€<small>/m²</small></strong><span>Zusätzlich Nano-Imprägnierung als Schmutzschutz</span></button>
</div></fieldset>
${kurz ? '' : `<div class="k-ort"><label for="k-ort">Ihr Ort (optional)</label><input type="text" id="k-ort" value="${esc(ort)}" placeholder="z. B. Falkensee" autocomplete="address-level2"></div>`}
</div>
<div class="k-out">
<p class="k-ol mono">${kurz ? 'Dein Richtpreis' : 'Ihr Richtpreis'}</p>
<p class="k-sum mono" aria-live="polite"><span id="k-price">${p0}</span>&nbsp;€</p>
<p class="k-formula mono">gerechnet: <b id="k-meta">${qm0} m² × ${rate} €</b></p>
<p class="k-note">Richtpreis — verbindlich nach Foto-Prüfung, dann Endpreis-Zusage.</p>
<a class="btn-wa k-wa" id="k-wa" href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener">${ICON.wa} Richtpreis per WhatsApp senden</a>
<p class="k-alt">Lieber anders? <a href="tel:${tel}" class="mono">${esc(nap.phone_display)}</a> · ${FORM_OK ? '<a href="/kontakt/#anfrage">Formular mit Foto-Upload</a>' : '<a href="/kontakt/">alle Kontaktwege</a>'}</p>
</div>
</div>
${kurz ? '' : `<ul class="k-chips" aria-label="Unsere Zusagen"><li>Endpreis-Zusage — kein Aufpreis nach dem Angebot</li><li>Kostenlose Besichtigung, keine Anfahrtskosten im Gebiet</li><li>Nacharbeit kostenlos, falls Restbelag bleibt</li></ul>`}
</div></section>`;
}
// Konfigurator-JS: Zustand → Preis (exakt m²×Satz), WhatsApp-Handoff, Sticky-Live-Preis (Spec §3.2).
// [data-live-price] in der .scta wird erst nach der ersten Interaktion sichtbar; scta-WA-Link wandert mit.
const konfigJS = `<script>(function(){var box=document.getElementById('konf');if(!box)return;var fmt=new Intl.NumberFormat('de-DE');var ctx=box.getAttribute('data-kontext')||'';
var t0=box.querySelector('.k-tile[aria-pressed="true"]'),pk0=box.querySelector('.k-pak[aria-pressed="true"]'),oi=document.getElementById('k-ort');
var state={type:t0?t0.getAttribute('data-type'):'Einfahrt',qm:60,rate:pk0?+pk0.getAttribute('data-rate'):${P.satz_basis},ort:oi?oi.value.trim():''};
var touched=false,tracked=false;
function paket(){return state.rate===${P.satz_impraegnierung}?'Reinigung + Neuverfugung + Nano-Imprägnierung (${P.satz_impraegnierung} €/m²)':'Reinigung + Neuverfugung (${P.satz_basis} €/m²)'}
function price(){return state.qm*state.rate}
function waText(){return 'Hallo Blankstein, ich möchte einen Richtpreis für meine '+state.type+' (ca. '+state.qm+' m²'+(state.ort?(', '+state.ort):'')+'). Paket: '+paket()+'. Euer Rechner zeigt '+fmt.format(price())+' €.'+(ctx?(' [Seite: '+ctx+']'):'')+' Foto schicke ich gleich mit.'}
function render(){var p=fmt.format(price());var el=document.getElementById('k-price');if(el)el.textContent=p;
el=document.getElementById('k-meta');if(el)el.textContent=state.qm+' m² × '+state.rate+' €';
var url='https://wa.me/${waNum}?text='+encodeURIComponent(waText());
var wa=document.getElementById('k-wa');if(wa)wa.href=url;
if(touched){try{sessionStorage.setItem('bs_konf',JSON.stringify(state))}catch(e){}var lp=document.querySelector('[data-live-price]');if(lp){lp.textContent=p+' € Richtpreis · '+state.qm+' m² × '+state.rate+' €';lp.hidden=false}var sw=document.querySelector('.scta .s-wa');if(sw)sw.href=url;
if(!tracked){tracked=true;if(window.dataLayer)dataLayer.push({event:'calc_used',flaeche:state.type,qm:state.qm,rate:state.rate})}}
var r=document.getElementById('k-range');if(r){var pc=(Math.min(Math.max(state.qm,+r.min),+r.max)-r.min)/(r.max-r.min)*100;r.style.background='linear-gradient(to right,#6E9BF2 0%,#6E9BF2 '+pc+'%,var(--navy-line) '+pc+'%,var(--navy-line) 100%)'}}
function touch(){touched=true}
box.querySelectorAll('.k-tile').forEach(function(b){b.addEventListener('click',function(){box.querySelectorAll('.k-tile').forEach(function(x){x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','true');state.type=b.getAttribute('data-type');touch();render()})});
box.querySelectorAll('.k-pak').forEach(function(b){b.addEventListener('click',function(){box.querySelectorAll('.k-pak').forEach(function(x){x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','true');state.rate=+b.getAttribute('data-rate')||${P.satz_basis};touch();render()})});
var rng=document.getElementById('k-range'),num=document.getElementById('k-num');
if(rng)rng.addEventListener('input',function(){state.qm=+rng.value||0;if(num)num.value=state.qm;touch();render()});
if(num)num.addEventListener('input',function(){var v=parseInt(num.value,10);if(isNaN(v)||v<1)v=1;if(v>2000)v=2000;state.qm=v;if(rng)rng.value=Math.min(Math.max(v,+rng.min),+rng.max);touch();render()});
if(oi)oi.addEventListener('input',function(){state.ort=oi.value.trim();touch();render()});
var cta=document.getElementById('k-wa');if(cta)cta.addEventListener('click',function(){if(window.dataLayer)dataLayer.push({event:'lead_intent',flaeche:state.type,qm:state.qm,rate:state.rate,summe:price()})});
render()})();</script>`;

// ====================================================================
// SEKTIONS-BIBLIOTHEK P2 (Spec §2 — PROTOKOLL-Mix, V1-Formensprache)
// ====================================================================
// Pflicht-Bausteine als Single Source (Spec §5): Preis-Versprechen + Garantie-Trio.
const PREIS_BOX = `<p class="price-box mono">${P.satz_basis}&nbsp;€/m² Reinigung + Neuverfugung&nbsp;·&nbsp;${P.satz_impraegnierung}&nbsp;€/m² mit Nano-Imprägnierung.<br>Richtpreis, gerechnet exakt m² × Satz — verbindlich nach Foto oder Besichtigung, dann Endpreis-Zusage.</p>`;
const GARANTIE_TRIO = [
  ['Zusage 1', 'Endpreis-Zusage', 'Der bestätigte Preis ist der Rechnungsbetrag. Kein Aufpreis, wenn die Fläche hartnäckiger ist als gedacht — das ist unser Risiko, nicht Ihres.'],
  ['Zusage 2', 'Kostenlose Nacharbeit', 'Bleibt nach der Abnahme sichtbarer Moos- oder Algenbelag zurück, kommen wir noch einmal — ohne Diskussion, ohne Rechnung.'],
  ['Zusage 3', 'Besichtigung + Probefläche', 'Vor-Ort-Termin und Anfahrt kosten im Servicegebiet nichts. Auf Wunsch reinigen wir dabei 1 m² Probefläche — kostenlos.']
];

// §2.2 Beweis-Hero: links Copy + Preis-Kasten + Review-Badge + CTAs + SLA; rechts echtes V/N + Protokoll-Tabelle.
function gbadge() {
  if (!REV_COUNT || !REV_RATING) return '';
  return `<a class="gbadge" href="${REV_URL}" target="_blank" rel="noopener"><span class="gb-stars" aria-hidden="true">★★★★★</span><span class="gb-num mono">${fmtRating(REV_RATING)}</span><span class="gb-sub">· ${REV_COUNT} Bewertungen auf Google</span><span class="gb-link">Auf Google ansehen&nbsp;↗</span></a>`;
}
function protoTable(rows) { return `<table class="proto-table">${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`; }
function beweisHero(o) {
  return `<section class="bw-hero" id="top"><div class="container bw-grid">
<div class="bw-copy">
<p class="doc-label">${esc(o.eyebrow)}</p>
<h1 class="bw-h1">${o.h1}</h1>
<p class="bw-lede">${esc(o.lede)}</p>
${PREIS_BOX}
${gbadge()}
<div class="bw-ctas">
<a class="btn-wa" href="${waHref(o.waText)}" target="_blank" rel="noopener">${ICON.wa} ${esc(o.waLabel || 'Foto senden, Richtpreis erhalten')}</a>
<a class="btn btn-hline" href="tel:${tel}">Anrufen: <span class="mono">${esc(nap.phone_display)}</span></a>
</div>
<p class="bw-sla">${SLA_HTML} ${AMPEL_SPAN('status-light')}</p>
</div>
<div class="bw-visual">
<figure class="vn-card">
${protoMedia(o.media, { lcp: true })}
${o.tabelle ? `<figcaption>${protoTable(o.tabelle)}</figcaption>` : ''}
</figure>
</div>
</div></section>`;
}

// §2.7 Zuletzt-dokumentiert-Leiste: horizontale Medienleiste, NUR echtes Material (Beweis-Slot).
function zuletztLeiste() {
  const posterImg = `<span class="pv-wrap">${VIDEO_BADGE}<img src="/assets/img/reel-einfahrt-vn-poster.jpg" width="768" height="1365" loading="lazy" decoding="async" alt="Echtes Video-Standbild: Einfahrt aus Sechseck-Pflaster, halb gereinigt, halb verschmutzt"></span>`;
  const items = [
    [posterImg, 'Einfahrt, Sechseckpflaster · Video vom Auftrag'],
    [pic('proof-vn-nachher', { badge: true, alt: 'Gereinigte Außentreppe am Hauseingang — echtes Kundenfoto', sizes: '250px' }), 'Außentreppe · nach Reinigung'],
    [pic('hub-steinreinigung-einfahrt', { badge: true, alt: 'Lange Einfahrt aus grauem Betonpflaster nach der Reinigung — echtes Kundenfoto', sizes: '250px' }), 'Einfahrt, Betonpflaster · nach Reinigung'],
    [pic('hub-steinreinigung-vn', { badge: true, alt: 'Pflasterfläche halb gereinigt, halb verschmutzt — echtes Arbeitsfoto', sizes: '250px' }), 'Pflasterfläche · Reinigung läuft'],
    [pic('proof-ergebnis-1', { badge: true, alt: 'Gereinigte Hoffläche aus grauem Pflaster mit hellen Zierstein-Einlagen — echtes Kundenfoto', sizes: '250px' }), 'Hoffläche mit Ziersteinen · nach Reinigung'],
    [pic('hub-pflaster-gal3', { badge: true, alt: 'Gereinigter Gartenweg aus Pflastersteinen entlang einer Klinkerfassade — echtes Kundenfoto', sizes: '250px' }), 'Gartenweg an Klinkerfassade · nach Reinigung']
  ];
  return `<section class="archiv-strip" aria-label="Zuletzt dokumentierte Aufträge"><div class="container">
<div class="strip-head"><p class="doc-label">Zuletzt dokumentiert</p><span class="mono strip-note">Auszug aus dem Auftragsarchiv · nur echtes Material</span></div>
<div class="strip-scroll" tabindex="0" aria-label="Horizontale Bildleiste, scrollbar">${items.map(([media, cap]) => `<figure class="strip-item"><div class="media-frame">${media}</div><figcaption>${esc(cap)}</figcaption></figure>`).join('')}</div>
</div></section>`;
}

// §2.3 Auftrags-Protokolle: alternierende Medien+Mono-Tabellen-Karten + objekt-zugeordnete Review-Zitate + Brücke.
function protoMedia(m, { lcp = false } = {}) {
  if (m.typ === 'video') return `<figure class="media-frame case-frame video-shell">${VIDEO_BADGE}<video controls preload="none" playsinline poster="/assets/img/${m.poster}.jpg" aria-label="${esc(m.aria || '')}"><source src="/assets/video/${m.file}.mp4" type="video/mp4">Ihr Browser kann dieses Video nicht abspielen.</video></figure>`;
  if (m.typ === 'vn') return `<figure class="case-frame"><div class="comparison" role="slider" tabindex="0" aria-label="${esc(m.aria || 'Vorher-Nachher-Vergleich — mit den Pfeiltasten oder dem Regler verschieben')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">${pic(m.vorher, { cls: 'comparison-before', alt: m.alt_vorher, sizes: '(max-width:820px) 92vw, 420px', lcp })}${pic(m.nachher, { cls: 'comparison-after', alt: m.alt_nachher, sizes: '(max-width:820px) 92vw, 420px' })}<span class="badge b-echt">Echtes Foto · Kundenauftrag</span><span class="comparison-label label-before">Vorher</span><span class="comparison-label label-after">Nachher</span><div class="comparison-handle"></div></div></figure>`;
  return `<figure class="media-frame case-frame">${pic(m.slug, { badge: true, alt: m.alt || '', sizes: '(max-width:820px) 92vw, 420px', lcp })}</figure>`;
}
function protokolleSection(fc) {
  if (!fc || !(fc.protokolle || []).length) return '';
  const cases = fc.protokolle.map((p, i) => {
    const quote = (p.review && p.review.text && !REV_BLOCK.some(b => (p.review.author || '').toLowerCase().includes(b.toLowerCase())))
      ? `<blockquote class="case-quote">„${esc(p.review.text)}“</blockquote><p class="quote-src mono">${esc(p.review.author)} · ${esc(p.review.objekt)} · <a href="${REV_URL}" target="_blank" rel="noopener">Bewertung auf Google ansehen ↗</a></p>`
      : (p.hinweis ? `<p class="case-note">${esc(p.hinweis)}</p>` : '');
    return `<article class="case${i % 2 ? ' flip' : ''}">
<div class="case-media">${protoMedia(p.media)}</div>
<div class="case-body">
<p class="case-kicker mono">${esc(p.kicker)}</p>
<h3>${esc(p.titel)}</h3>
${protoTable(p.tabelle)}
${quote}
</div>
</article>`;
  }).join('');
  return `<section class="proto-sec" id="protokolle"><div class="container">
<p class="doc-label">Auftrags-Protokolle</p>
<h2 class="sec-h2">${esc(fc.titel)}</h2>
<p class="sec-sub">${esc(fc.intro)}</p>
<div class="cases">${cases}</div>
<div class="proto-bridge"><p>${esc(fc.bruecke)}</p><a class="btn-wa" href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener">${ICON.wa} Foto per WhatsApp senden</a></div>
</div></section>`;
}

// Einzel-Protokoll (Hub, Spec §4: „1 passendes Auftrags-Protokoll") — greift auf fallstudien.json per id zu.
// hinweis (optional, hub-copy) rendert als ehrliche Einordnung über der Karte (z. B. Versiegelung: Beleg folgt).
function einzelProtokoll(id, { hinweis = '', label = 'Auftrags-Protokoll' } = {}) {
  const p = fallCopy && (fallCopy.protokolle || []).find(x => x.id === id);
  if (!p) return '';
  const quote = (p.review && p.review.text && !REV_BLOCK.some(b => (p.review.author || '').toLowerCase().includes(b.toLowerCase())))
    ? `<blockquote class="case-quote">„${esc(p.review.text)}“</blockquote><p class="quote-src mono">${esc(p.review.author)} · ${esc(p.review.objekt)} · <a href="${REV_URL}" target="_blank" rel="noopener">Bewertung auf Google ansehen ↗</a></p>`
    : (p.hinweis ? `<p class="case-note">${esc(p.hinweis)}</p>` : '');
  return `<section class="proto-sec proto-single"><div class="container">
<p class="doc-label">${esc(label)}</p>
${hinweis ? `<p class="sec-sub">${esc(hinweis)}</p>` : ''}
<div class="cases"><article class="case">
<div class="case-media">${protoMedia(p.media)}</div>
<div class="case-body">
<p class="case-kicker mono">${esc(p.kicker)}</p>
<h3>${esc(p.titel)}</h3>
${protoTable(p.tabelle)}
${quote}
<p class="proto-more"><a href="/#protokolle">Alle dokumentierten Aufträge ansehen →</a></p>
</div>
</article></div>
</div></section>`;
}

// §2.10 Belags-/Eignungstabelle (V2-Referenz, AEO-zitierbar): Belag × typische Fläche × Einschätzung.
function belagSection(b) {
  if (!b || !(b.rows || []).length) return '';
  return `<section class="belag-sec"><div class="container">
<p class="doc-label">Beläge</p>
<h2 class="sec-h2">${esc(b.h2)}</h2>
${b.intro ? `<p class="sec-sub">${esc(b.intro)}</p>` : ''}
<div class="tbl-wrap"><table class="mtbl">
<thead><tr><th scope="col">Belag</th><th scope="col">Typische Fläche</th><th scope="col">Unsere Einschätzung</th></tr></thead>
<tbody>${b.rows.map(r => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody>
</table></div>
${b.note ? `<p class="belag-note">${esc(b.note)}</p>` : ''}
</div></section>`;
}

// Interne Verlinkung (SEO-P1): Schwester-Hubs + 2–3 passende Ratgeber-Artikel (Slugs gegen ratgeber.json geprüft).
function weiterSection(s, c) {
  const sisters = services.filter(x => x.slug !== s.slug && hubCopy[x.slug]).map(x => `<a href="/${x.slug}/">${esc(x.name)} →</a>`).join('');
  const rgs = (c.ratgeber || []).map(slug => ratList.find(r => r.slug === slug)).filter(Boolean)
    .map(r => `<a href="/ratgeber/${r.slug}/">${esc(r.h1)} →</a>`).join('');
  if (!sisters && !rgs) return '';
  return `<section class="weiter-sec"><div class="container weiter-grid">
<div><p class="doc-label">Weitere Leistungen</p><div class="weiter-links">${sisters}</div></div>
<div><p class="doc-label">Aus dem Ratgeber</p><div class="weiter-links">${rgs || `<a href="/ratgeber/">Alle Ratgeber ansehen →</a>`}</div></div>
</div></section>`;
}

// Zwei-Türen-Kurzform (Orte, Spec §4: geteilte Sektionen budgetiert — bewusst knapp gehalten fürs NearDup-Budget).
function zweiTuerenKurz(ortName) {
  const waT = `Hallo Blankstein, ich möchte einen Richtpreis für meine Fläche in ${ortName}. Foto und ungefähre Maße schicke ich gleich mit.`;
  return `<section class="doors-sec doors-mini" id="anfrage-wege"><div class="container">
<p class="doc-label">Anfrage</p>
<h2 class="sec-h2">Foto schicken oder Termin machen — Sie wählen.</h2>
<div class="doors">
<article class="door"><span class="knr mono">Weg 1</span><h3>Foto per WhatsApp</h3><p class="door-p">Foto + ungefähre m², ${SLA_HTML}, verbindliches Angebot im Chat.</p><a class="btn-wa" href="${waHref(waT)}" target="_blank" rel="noopener">${ICON.wa} Chat starten</a></article>
<article class="door door-b"><span class="knr mono">Weg 2</span><h3>Kostenlose Besichtigung</h3><p class="door-p">Wir kommen vorbei, messen nach — auf Wunsch mit 1 m² Probefläche, kostenlos.</p><a class="btn btn-navy2" href="tel:${tel}"><span class="mono">${esc(nap.phone_display)}</span></a></article>
</div>
</div></section>`;
}

// §2.4 Leistungs-Zeilen: nummerierte Zeilen statt Karten-Grid, Mono-Preis-Label rechts.
function leistungsZeilen() {
  const rows = [
    ['01', 'Steinreinigung mit dem Flächenreiniger', 'Rotierende Reinigung unter einer Haube: gleichmäßig, kontrolliert, ohne Spritzfahnen an Fassade und Fenstern. Für Einfahrten, Terrassen, Wege und Treppen.', 'im m²-Preis', 'enthalten', '/steinreinigung/'],
    ['02', 'Schmutz-Absaugung mit dem Nasssauger', 'Gelöster Schmutz und Schmutzwasser werden aufgenommen statt in Beet und Rasen gespült. Die Fläche ist nach dem Termin begehbar, das Grundstück bleibt sauber.', 'im m²-Preis', 'enthalten', null],
    ['03', 'Neuverfugung mit GaLaBau-Sand', 'Ausgespülte Fugen werden mit Fugensand neu verfüllt. Das stabilisiert den Belag und verzögert neuen Bewuchs in den Fugen.', 'Paket 1', `${P.satz_basis} €/m²`, null],
    ['04', 'Nano-Imprägnierung', 'Auf Wunsch versiegeln wir die gereinigte Fläche. Wasser perlt ab, Schmutz haftet schlechter, das Ergebnis hält sichtbar länger.', 'Paket 2', `${P.satz_impraegnierung} €/m²`, '/steinversiegelung/']
  ];
  const hubLinks = services.filter(s => hubCopy[s.slug]).map(s => `<a href="/${s.slug}/">${esc(s.name)}</a>`).join(' · ');
  return `<section class="svcz-sec" id="leistungen"><div class="container">
<p class="doc-label">Leistungen</p>
<h2 class="sec-h2">Vier Arbeitsschritte, ein Preis pro m².</h2>
<div class="svcz">${rows.map(([n, t, d, m1, m2, href]) => `<div class="svc-row">
<span class="svc-num mono">${n}</span>
<div><h3>${href ? `<a href="${href}">${esc(t)}</a>` : esc(t)}</h3><p>${esc(d)}</p></div>
<div class="svc-meta mono">${esc(m1)}<br><strong>${esc(m2)}</strong></div>
</div>`).join('')}</div>
<p class="svcz-links">Nach Fläche: ${hubLinks}</p>
</div></section>`;
}

// §2.8 Zwei-Türen: Foto per WhatsApp / Kostenlose Besichtigung — gleichwertig; Besichtigung trägt das
// Probefläche-Panel (ECHTE Zusage, Maurice 06.07.). Darunter das Garantie-Trio (Single Source).
function zweiTueren({ ortName = '' } = {}) {
  const wo = ortName ? ` in ${esc(ortName)}` : '';
  const waT = ortName ? `Hallo Blankstein, ich möchte einen Richtpreis für meine Fläche in ${ortName}. Foto und ungefähre Maße schicke ich gleich mit.` : WA_DEFAULT;
  return `<section class="doors-sec" id="anfrage-wege"><div class="container">
<p class="doc-label">So kommen wir ins Gespräch</p>
<h2 class="sec-h2">Zwei Wege zum verbindlichen Angebot. Beide kosten nichts.</h2>
<p class="sec-sub">Manche wollen schnell eine Zahl, andere lieber jemanden auf dem Grundstück${wo}. Wir machen beides — Sie wählen.</p>
<div class="doors">
<article class="door">
<span class="knr mono">Weg 1 · Der schnelle</span>
<h3>Foto und Maße per WhatsApp</h3>
<ul>
<li>Foto der Fläche + ungefähre Quadratmeter schicken</li>
<li>Wir prüfen Belag und Zustand am Bild</li>
<li>${SLA_HTML}</li>
<li>Verbindliches Angebot direkt im Chat</li>
</ul>
<a class="btn-wa" href="${waHref(waT)}" target="_blank" rel="noopener">${ICON.wa} Chat starten</a>
</article>
<article class="door door-b">
<span class="knr mono">Weg 2 · Der persönliche</span>
<h3>Kostenlose Besichtigung vor Ort</h3>
<ul>
<li>Einer von uns kommt vorbei und sieht sich die Fläche an</li>
<li>Wir messen gemeinsam nach und beantworten Ihre Fragen</li>
<li>Keine Anfahrtskosten im Servicegebiet, keine Verpflichtung</li>
<li>Verbindliches Angebot direkt im Anschluss</li>
</ul>
<div class="probe"><strong>1 m² Probefläche — kostenlos bei der Besichtigung.</strong><p>Auf Wunsch reinigen wir bei der Besichtigung einen Quadratmeter Probefläche. Sie sehen das Ergebnis auf Ihrem eigenen Stein, bevor Sie sich entscheiden.</p></div>
<a class="btn btn-navy2" href="tel:${tel}"><span class="mono">${esc(nap.phone_display)}</span>&nbsp;— Termin abstimmen</a>
</article>
</div>
<p class="door-alt">Lieber schreiben? ${FORM_OK ? '<a href="/kontakt/#anfrage">Zum Anfrage-Formular</a> — oder per' : 'Per'} <a href="mailto:${esc(nap.email)}">E-Mail</a>${FORM_OK ? '' : ' — alle Wege auf der <a href="/kontakt/">Kontaktseite</a>'}.</p>
<div class="gar-row">${GARANTIE_TRIO.map(([t, h, d]) => `<article class="gar-item"><span class="mono-tag mono">${t}</span><h3>${h}</h3><p>${d}</p></article>`).join('')}</div>
</div></section>`;
}

// §2.9 Inhaberblock „Wer kommt zu Ihnen" (Navy): Equipment-Foto + ehrliche Caption, Geräte-Ledger.
// ⚠️ Gerätenamen generisch (K7/Kränzle-Klärung offen — Kickoff-Guardrail).
function inhaberBlock() {
  return `<section class="owners-sec on-dark" id="inhaber"><div class="container owners">
<figure class="owners-photo">${pic('trust-team', { badge: true, alt: 'Echtes Arbeitsfoto von einem Blankstein-Einsatz im Havelland: Reinigung einer Pflasterfläche', sizes: '(max-width:820px) 92vw, 440px' })}<figcaption>Echtes Foto von einem Einsatz in unserem Gebiet. Ein Porträt von uns beiden folgt — wir zeigen lieber ein echtes Arbeitsbild als ein gestelltes Stockfoto.</figcaption></figure>
<div class="owners-body">
<p class="doc-label">Wer kommt zu Ihnen</p>
<h2 class="sec-h2">Bei uns öffnet kein Subunternehmer das Gartentor.</h2>
<p class="names mono">Noah Telo &amp; Maurice Brehm · Inhaber, ${esc(nap.rechtstraeger)}</p>
<p class="owners-p">Wir sind zwei Unternehmer aus Falkensee und führen Blankstein selbst. Wer anfragt, schreibt mit einem von uns — und sieht denselben Menschen später auf dem Grundstück. Angemeldetes Gewerbe, Firmensitz in der ${esc(nap.street)}, Ergebnisse, die man im Ort besichtigen kann.</p>
<ul class="gear">
<li><strong>Flächenreiniger</strong><span>reinigt rotierend unter einer Haube — gleichmäßig, ohne Streifenbild</span></li>
<li><strong>Nasssauger</strong><span>nimmt das Schmutzwasser direkt auf — Beete und Hauswand bleiben sauber</span></li>
<li><strong>GaLaBau-Fugensand</strong><span>für die Neuverfugung, damit die Fläche stabil bleibt</span></li>
<li><strong>Nano-Imprägnierung</strong><span>optionale Schutzschicht, die neuen Bewuchs deutlich verlangsamt</span></li>
</ul>
</div>
</div></section>`;
}

// §2.11 Orts-Leiste (Navy-Strip): 7 Orte + Anfahrts-Zusage.
function ortsLeiste() {
  const items = orte.map(o => orteCopy[o.slug] ? `<a class="ort" href="/${o.slug}/">${esc(o.name)}</a>` : `<span class="ort">${esc(o.name)}</span>`).join('');
  return `<div class="orte-strip" role="region" aria-label="Servicegebiet"><div class="container orte-in"><span class="lbl mono">Unterwegs in</span>${items}<span class="note">Kostenlose Anfahrt im gesamten Gebiet — <a href="/servicegebiet/">alle Orte im Überblick</a>.</span></div></div>`;
}

// ====================================================================
// HOME
// ====================================================================
// ---------- Reviews (datengetrieben aus data/reviews.json; Empty-State bei 0 = nichts gerendert, kein Fake) ----------
// Blocklist (Spec §3.7): 'Christian Brehm' NIE rendern — doppelt gesichert (Daten + Generator)
const REV_BLOCK = [...(reviewsData.blocklist || []), 'Christian Brehm'];
const REV = (reviewsData.reviews || []).filter(r => r && r.text && r.rating && !REV_BLOCK.some(b => (r.author || '').toLowerCase().includes(b.toLowerCase())));
const REV_COUNT = reviewsData.count || REV.length;
const REV_RATING = reviewsData.rating;
const REV_URL = reviewsData.profile_url || GBP_REVIEWS_URL;
const fmtRating = v => Number(v).toFixed(1).replace('.', ','); // 5 -> "5,0" (Anzeige exakt wie Google)
const STAR = '<svg class="star-ic" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.7L12 17l-6 3.6 1.5-6.7L2.4 8.9l6.8-.6z"/></svg>';
function revStars(n) { let s = ''; for (let i = 1; i <= 5; i++) s += `<span class="star${i <= Math.round(n) ? '' : ' off'}">${STAR}</span>`; return `<span class="star-row">${s}</span>`; }
/* reviewStars()/rev-anchor entfernt (Etappe D, tot seit dem gbadge()-Beweis-Hero) */
// §2.5 Review-Wall: Aggregat-Kopf (Großziffer + Deeplink) + asymmetrische Zitat-Karten, jedes Zitat zu Google verlinkt.
// Empty-State bei 0 Reviews = nichts gerendert (kein Fake-Stern). Anzeige-Zahlen exakt wie auf Google.
function reviewWall() {
  if (!REV.length) return '';
  const gLink = () => `<a href="${REV_URL}" target="_blank" rel="noopener">auf Google ↗</a>`;
  const meta = rv => `<p class="rw-meta mono"><strong>${esc(rv.author)}</strong>${(rv.objekt || rv.ort) ? ` <span class="obj">${esc(rv.objekt || rv.ort)}</span>` : ''} ${gLink()}</p>`;
  const [first, ...rest] = REV;
  const wide = `<article class="rw-card rw-wide"><div>${revStars(first.rating)}<blockquote>„${esc(first.text)}“</blockquote>${meta(first)}</div><p class="rw-side mono">Die Besichtigung ist kostenlos, im Servicegebiet ohne Anfahrtskosten. ${SLA_HTML}.</p></article>`;
  const cards = rest.slice(0, 3).map(rv => `<article class="rw-card"><span class="g-mark mono" aria-hidden="true">G</span>${revStars(rv.rating)}<blockquote>„${esc(rv.text)}“</blockquote>${meta(rv)}</article>`).join('');
  const navyCard = `<article class="rw-card rw-dark"><p class="rw-dark-label mono">Verifizierbar statt behauptet</p><p>Jedes Zitat stammt aus einer öffentlichen Google-Rezension. Der Link führt direkt zum Profil — nicht zu einer eigenen Unterseite.</p><a href="${REV_URL}" target="_blank" rel="noopener">Google-Rezensionen öffnen ↗</a></article>`;
  return `<section class="rw-sec" id="bewertungen"><div class="container">
<div class="rw-head">
<div class="rw-score"><span class="n mono">${fmtRating(REV_RATING || 5)}</span><div>${revStars(REV_RATING || 5)}<p>${REV_COUNT} Bewertungen auf Google.<br>Jede einzelne öffentlich nachlesbar.</p></div></div>
<a class="btn btn-hline" href="${REV_URL}" target="_blank" rel="noopener">Alle ${REV_COUNT} auf Google prüfen ↗</a>
</div>
<div class="rw-grid">${wide}${cards}${navyCard}</div>
</div></section>`;
}
// Review-Snippet (Kurzform für Hubs, Spec §4): Aggregat + 1 Zitat + Deeplink.
// Zitat-Wahl: bevorzugt per Autor (hub-copy review_author), sonst per Objekt-Kategorie, sonst erstes.
function reviewSnippet({ author = '', objekt = '' } = {}) {
  if (!REV.length) return '';
  const rv = REV.find(r => author && r.author === author) || REV.find(r => objekt && r.objekt === objekt) || REV[0];
  return `<section class="rw-snip"><div class="container rw-snip-in">
<div class="rw-score"><span class="n mono">${fmtRating(REV_RATING || 5)}</span><div>${revStars(REV_RATING || 5)}<p>${REV_COUNT} Bewertungen auf Google</p></div></div>
<blockquote class="rw-snip-q">„${esc(rv.text)}“<footer class="rw-meta mono"><strong>${esc(rv.author)}</strong>${rv.objekt ? ` <span class="obj">${esc(rv.objekt)}</span>` : ''}</footer></blockquote>
<a class="btn btn-hline" href="${REV_URL}" target="_blank" rel="noopener">Alle auf Google lesen ↗</a>
</div></section>`;
}

// ====================================================================
// /bewertungen/ (Spec §3.7): Aggregat · Review-Wall komplett · „So entstehen unsere Bewertungen" · CTA.
// BEWUSST KEIN AggregateRating-Schema (self-serving; seit Dez 2025 keine SERP-Sterne für eigene
// LocalBusiness-Reviews — nur Spam-Risiko, kein Nutzen). Zahlen exakt wie auf Google, Zitate verlinkt.
// ====================================================================
function bewertungen() {
  const url = '/bewertungen/';
  const waMsg = 'Hallo Blankstein, ich habe eure Bewertungen gelesen und möchte einen Richtpreis — Foto und ungefähre Maße schicke ich gleich.';
  const entstehung = [
    ['01', 'Wir fragen jeden Kunden.', 'Nach dem Auftrag bitten wir jeden Kunden um eine Bewertung — ohne Vorauswahl, ohne Filter nach erwarteter Sternzahl. Was dabei herauskommt, entscheidet der Kunde.'],
    ['02', 'Bewertet wird auf Google, nicht bei uns.', 'Jede Bewertung liegt im öffentlichen Google-Profil. Wir können dort nichts löschen, nichts umformulieren, nichts sortieren — genau deshalb verlinken wir jedes Zitat dorthin.'],
    ['03', 'Wir zitieren nur, was nachlesbar ist.', `Auf dieser Seite stehen die Bewertungen, die wir einzeln zuordnen können — aktuell ${REV.length} von ${REV_COUNT}. Alle ${REV_COUNT} lesen Sie mit einem Klick im Google-Profil, keine ist hier geschönt oder gekürzt zusammengefasst.`]
  ];
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Bewertungen</div>
<section class="bw-hero o-hero"><div class="container">
<p class="doc-label">Bewertungen · Google-Profil</p>
<h1 class="bw-h1">${fmtRating(REV_RATING || 5)} von 5 — jede einzelne <em>öffentlich nachprüfbar</em>.</h1>
<p class="bw-lede">${REV_COUNT} Bewertungen auf Google, Durchschnitt ${fmtRating(REV_RATING || 5)}. Wir zeigen sie hier im Überblick und verlinken jedes Zitat zur Quelle — prüfen Sie selbst, statt uns zu glauben.</p>
<div class="bw-ctas">
<a class="btn btn-hline" href="${REV_URL}" target="_blank" rel="noopener">Google-Profil öffnen ↗</a>
<a class="btn-wa" href="${waHref(waMsg)}" target="_blank" rel="noopener">${ICON.wa} Eigenen Auftrag anfragen</a>
</div>
</div></section>

${reviewWall()}

<section class="lokal-sec"><div class="container">
<p class="doc-label">Transparenz</p>
<h2 class="sec-h2">So entstehen unsere Bewertungen.</h2>
<div class="svcz">${entstehung.map(([n, t, d]) => `<div class="svc-row svc-row-2col">
<span class="svc-num mono">${n}</span>
<div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>
</div>`).join('')}</div>
<p class="belag-note">Rechtlicher Rahmen ist uns wichtig: Wir kaufen keine Bewertungen, filtern nicht nach Sternen und schreiben keine selbst. Fällt Ihnen trotzdem etwas auf, das nicht stimmt — <a href="/kontakt/">sagen Sie es uns direkt</a>.</p>
</div></section>

<section class="doors-sec" style="padding-top:0"><div class="container">
<div class="proto-bridge"><p><strong>Der nächste dokumentierte Auftrag kann Ihrer sein.</strong> Foto und ungefähre Maße genügen — ${SLA_HTML}.</p><a class="btn-wa" href="${waHref(waMsg)}" target="_blank" rel="noopener">${ICON.wa} Foto per WhatsApp senden</a></div>
</div></section>

${ortsLeiste()}`;
  const schema = `${orgSchema()},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Bewertungen', url }])}`;
  const meta = mkMeta(`Blankstein bei Google: ${fmtRating(REV_RATING || 5)} von 5 aus ${REV_COUNT} Bewertungen. Hier alle zitierten Kundenstimmen zur Steinreinigung im Havelland — jede einzeln zum öffentlichen Google-Profil verlinkt.`);
  write(url, head(clampTitle('Bewertungen — 5,0 auf Google | Blankstein'), meta, url, schema, { pagetype: 'bewertungen', og: { slug: 'bewertungen', motif: 'proof-vn-nachher' } }) + header + mainWrap(main) + footer + sctaBar(waMsg) + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// HOME — komplett neu (Spec §4, Zeile „Home"): Beweis-Hero · Zuletzt-Leiste · Konfigurator ·
// Protokolle · Leistungs-Zeilen · Zwei-Türen · Inhaberblock · Review-Wall · Orts-Leiste · FAQ
// ====================================================================
function home() {
  const faqs = [
    { q: 'Was kostet die Steinreinigung pro Quadratmeter?', a: 'Unser Richtpreis liegt bei 7 €/m² inklusive Reinigung und Neuverfugung mit frischem Fugensand, oder 8 €/m² zusätzlich mit Nano-Imprägnierung. Eine 30 m² große Terrasse liegt damit bei exakt 210 € — mit Imprägnierung bei 240 €. Das ist ein unverbindlicher Richtwert — das verbindliche Angebot erstellen wir nach Fotos und Maßen oder bei einer kostenlosen Besichtigung. Alle Preise sind Endpreise ohne versteckte Kosten.' },
    { q: 'Beschädigt der Hochdruck mein Pflaster oder meine Terrasse?', a: 'Falsch eingesetzter Hochdruck — eine Punkt-Lanze zu nah am Stein — kann Fugen auswaschen und Oberflächen aufrauen. Deshalb arbeiten wir mit rotierenden Flächenreinigern, die den Druck gleichmäßig über die Fläche verteilen, und verfugen anschließend neu. So wird die Fläche gründlich sauber, ohne dass das Material Schaden nimmt.' },
    { q: 'Wie schnell bekomme ich ein Angebot?', a: 'Schicken Sie uns ein, zwei Fotos und die ungefähren Maße Ihrer Fläche per WhatsApp. Antwort < 2 h — werktags 8–18 Uhr. Lässt sich die Fläche aus der Ferne nicht sicher einschätzen, vereinbaren wir eine kostenlose Besichtigung vor Ort — beides unverbindlich.' },
    { q: 'Kann ich das Ergebnis sehen, bevor ich beauftrage?', a: 'Ja. Auf Wunsch reinigen wir bei der kostenlosen Besichtigung 1 m² Probefläche. Sie sehen das Ergebnis direkt auf Ihrem eigenen Stein und entscheiden danach in Ruhe. Auf der Website zeigen wir außerdem nur gekennzeichnetes, echtes Material aus Kundenaufträgen.' },
    { q: 'In welchem Gebiet seid ihr tätig?', a: 'Wir reinigen Stein- und Terrassenflächen im Havelland und am westlichen Berliner Rand — unter anderem in Falkensee, Dallgow-Döberitz, Brieselang, Schönwalde-Glien, Wustermark, Groß Glienicke und Kladow. Falkensee ist unser Sitz, von dort sind die Wege zu Ihnen kurz und die Termine planbar.' },
    { q: 'Was bringt die Nano-Imprägnierung?', a: 'Die Nano-Imprägnierung kostet 1 €/m² Aufpreis und legt einen unsichtbaren Schutzfilm auf den Stein. Wasser perlt ab, Moos und Schmutz finden weniger Halt, die Fläche bleibt nach der Reinigung länger sauber. Sie lohnt sich vor allem bei schattigen oder stark bewachsenen Flächen, die sonst schnell wieder vergrünen.' },
    { q: 'Kommen Anfahrts- oder Besichtigungskosten dazu?', a: 'Nein. Innerhalb unseres Servicegebiets im Havelland und am westlichen Berliner Rand ist die Vor-Ort-Besichtigung kostenlos und unverbindlich, und es fallen keine Anfahrtskosten an. Sie zahlen ausschließlich die vereinbarte Leistung zum genannten Endpreis.' },
    { q: 'Was ist, wenn ich mit dem Ergebnis nicht zufrieden bin?', a: 'Bleibt nach unserer Reinigung sichtbarer Moos- oder Algenbelag zurück, kommen wir kostenlos nach. Und der Preis, den wir Ihnen vorab nennen, ist der Endpreis — ohne Aufpreis und ohne Nachkalkulation. So wissen Sie schon vor dem Termin genau, woran Sie sind.' }
  ];

  const main = `
${beweisHero({
    eyebrow: 'Auftragsarchiv · Falkensee & Havelland',
    h1: 'Steinreinigung, <em>dokumentiert</em>.<br>Nicht versprochen.',
    lede: 'Blankstein reinigt Einfahrten, Terrassen und Wege im Havelland — mit Flächenreiniger, Neuverfugung mit GaLaBau-Sand, auf Wunsch Nano-Imprägnierung. Jedes Ergebnis auf dieser Seite ist ein echter Kundenauftrag. Was kein Foto hat, behaupten wir nicht.',
    waText: WA_DEFAULT,
    media: { typ: 'vn', vorher: 'proof-vn-vorher', nachher: 'proof-vn-nachher', alt_vorher: 'Echtes Kundenfoto: Außentreppe vor der Reinigung, dunkler Schmutzfilm auf allen Stufen', alt_nachher: 'Echtes Kundenfoto: dieselbe Außentreppe nach der Reinigung, gleichmäßig helle Stufen', aria: 'Vorher-Nachher-Vergleich der Außentreppe — mit den Pfeiltasten oder dem Regler verschieben' },
    tabelle: [['Objekt', 'Außentreppe mit Podest, Hauseingang'], ['Zustand vorher', 'Verwitterter Schmutz- und Grünfilm'], ['Maßnahme', 'Flächenreiniger, Absaugung per Nasssauger'], ['Beleg', 'Zwei Aufnahmen, dieselbe Treppe']]
  })}

${zuletztLeiste()}

${konfigSection({ kontext: 'Startseite' })}

${protokolleSection(fallCopy ? { ...fallCopy, protokolle: (fallCopy.protokolle || []).filter(p => p.home !== false) } : null)}

${leistungsZeilen()}

${zweiTueren()}

${inhaberBlock()}

${reviewWall()}

${ortsLeiste()}

${faqBlock(faqs, { title: 'Was Eigenheimbesitzer uns oft fragen' })}`;

  const schema = `${orgSchema()},${websiteSchema()},${breadcrumb([{ name: 'Start', url: '/' }])}${faqSchema('/', faqs)}`;
  const title = clampTitle('Steinreinigung Havelland — Richtpreis 7 €/m² | Blankstein');
  const meta = mkMeta('Steinreinigung im Havelland, dokumentiert mit echten Fotos und Videos: Flächenreiniger, Neuverfugung, Nano-Imprägnierung. Richtpreis 7 €/m² — Foto genügt.');
  write('/', head(title, meta, '/', schema, { pagetype: 'home', og: { slug: 'home', motif: 'proof-vn-nachher' } }) + header + mainWrap(main) + footer + SCTA + sliderJS + konfigJS + FOOT_JS + '</body></html>');
  written.push('/');
}

// Vorher/Nachher-Slider-JS — Touch-Fix (Spec §4 MUSS): touch-action:pan-y (CSS) + Intent-Capture (|dx|>|dy|),
// ARIA konsistent (0–100, valuetext), kein Scroll-Trap mehr auf Mobile.
const sliderJS = `<script>(function(){document.querySelectorAll('.comparison').forEach(function(c){var a=c.querySelector('.comparison-after'),h=c.querySelector('.comparison-handle');if(!a||!h)return;var d=false,cur=50,ti=null,sx=0,sy=0;function set(p){p=Math.min(Math.max(p,0),100);cur=p;a.style.clipPath='inset(0 0 0 '+p+'%)';h.style.left=p+'%';c.setAttribute('aria-valuenow',Math.round(p));c.setAttribute('aria-valuetext','Regler bei '+Math.round(p)+' Prozent — links Vorher, rechts Nachher')}function px(x){var r=c.getBoundingClientRect();return((x-r.left)/r.width)*100}c.addEventListener('mousedown',function(e){d=true;set(px(e.clientX));e.preventDefault()});addEventListener('mousemove',function(e){if(d)set(px(e.clientX))});addEventListener('mouseup',function(){d=false});c.addEventListener('touchstart',function(e){ti=null;sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});c.addEventListener('touchmove',function(e){var dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;if(ti===null){if(Math.abs(dx)<6&&Math.abs(dy)<6)return;ti=Math.abs(dx)>Math.abs(dy)}if(ti){set(px(e.touches[0].clientX));e.preventDefault()}},{passive:false});c.addEventListener('touchend',function(){ti=null});c.addEventListener('keydown',function(e){var k=e.key;if(k==='ArrowLeft'||k==='ArrowDown'){set(cur-4);e.preventDefault()}else if(k==='ArrowRight'||k==='ArrowUp'){set(cur+4);e.preventDefault()}else if(k==='Home'){set(0);e.preventDefault()}else if(k==='End'){set(100);e.preventDefault()}});set(50)})})();</script>`;

// ====================================================================
// MONEY-HUB (Service-Pillar — Template Architektur §2; Copy aus data/copy/hubs.json)
// ====================================================================
// Konfigurator-Vorwahl je Hub (Spec §4: Typ vorgewaehlt; Versiegelung startet im 8-€-Paket)
// og:image-Motive je Hub — NUR echte Fotos (Spec §4: „echtes Motiv+Titel")
const HUB_OG = {
  steinreinigung: 'hub-steinreinigung-einfahrt',
  terrassenreinigung: 'proof-arbeit-2',
  pflasterreinigung: 'hub-pflaster-vn',
  steinversiegelung: 'proof-ergebnis-1'
};
const HUB_KONF = {
  steinreinigung: { typ: 'Einfahrt', kontext: 'Steinreinigung' },
  terrassenreinigung: { typ: 'Terrasse', kontext: 'Terrassenreinigung' },
  pflasterreinigung: { typ: 'Einfahrt', kontext: 'Pflasterreinigung' },
  steinversiegelung: { typ: 'Einfahrt', rate: P.satz_impraegnierung, kontext: 'Steinversiegelung' }
};
// Hub-Aufbau (Spec §4, Zeile „Hub"): Beweis-Hero · Konfigurator (Typ vorgewählt) · Schadens-Edukation ·
// Leistungs-Zeilen · 1 Protokoll · Belagstabelle · Zwei-Türen · Review-Snippet · FAQ · Weiterlesen · Orts-Leiste.
function hub(s, c) {
  const url = `/${s.slug}/`;
  const waMsg = c.wa_text || `Hallo Blankstein, ich möchte einen Richtpreis für ${s.name} — Foto und ungefähre Maße schicke ich gleich mit.`;
  const edu = c.edu || {};

  const main = `
${beweisHero({ eyebrow: c.eyebrow, h1: c.h1, lede: c.lede, waText: waMsg, waLabel: c.wa_label, media: c.hero_media, tabelle: c.hero_tabelle })}

${konfigSection(HUB_KONF[s.slug] || { kontext: s.name })}

<section class="edu2-sec"><div class="container edu2">
<div class="edu2-text">
<p class="doc-label">${esc(edu.label || 'Ehrlich eingeordnet')}</p>
<h2 class="sec-h2">${esc(edu.h2)}</h2>
${(edu.body || []).map(p => `<p class="edu2-p">${esc(p)}</p>`).join('')}
</div>
${edu.img && IMG[edu.img] ? `<figure class="edu2-fig">${pic(edu.img, { badge: true, alt: edu.img_alt || edu.h2, sizes: '(max-width:900px) 92vw, 420px' })}${edu.caption ? `<figcaption>${esc(edu.caption)}</figcaption>` : ''}</figure>` : ''}
</div></section>

${leistungsZeilen()}

${einzelProtokoll(c.protokoll_id, { hinweis: c.protokoll_hinweis })}

${belagSection(c.belag)}

${zweiTueren()}

${reviewSnippet({ author: c.review_author })}

${faqBlock(c.faqs, { title: c.faq_title || `Was Kunden zur ${s.name} fragen` })}

${weiterSection(s, c)}

${ortsLeiste()}`;

  const areaServed = `[${orte.map(o => `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`).join(',')},{"@type":"AdministrativeArea","name":"Havelland"}]`;
  const svcSchema = `{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)}","serviceType":"${sj(s.name)}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed},"description":"${sj(c.meta)}","offers":{"@type":"Offer","priceCurrency":"EUR","price":"${s.slug === 'steinversiegelung' ? P.satz_impraegnierung : P.satz_basis}","description":"${s.slug === 'steinversiegelung' ? 'Richtpreis pro Quadratmeter inkl. Reinigung, Neuverfugung und Nano-Imprägnierung, Endpreis ohne versteckte Kosten.' : 'Richtpreis pro Quadratmeter inkl. Reinigung und Neuverfugung, Endpreis ohne versteckte Kosten.'}"}}`;
  const schema = `${orgSchema()},${svcSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: s.name, url }])}${faqSchema(url, c.faqs)}`;
  write(url, head(clampTitle(c.title), mkMeta(c.meta), url, schema, { pagetype: 'hub', og: { slug: s.slug, motif: HUB_OG[s.slug] || 'proof-vn-nachher' } }) + header + mainWrap(main) + footer + sctaBar(waMsg) + sliderJS + konfigJS + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// ORTS-HUB (lokaler Hub /{ort}/ — Stein + Terrasse als H2-Sektionen; Copy aus data/copy/orte.json)
// ====================================================================
// Orts-Hub (Spec §4, Zeile „Ort" — NearDup-Design): Pflicht-Unique-Slots = Lokal-Intro (echte Lokalfakten),
// orts-eigene FAQ-Varianten, „Zuletzt in [Ort]"-Slot (nur mit echtem Material, sonst ehrliche Zeile),
// eigene Nachbarorte-/Gebietszeile. Geteilt NUR: Konfigurator, Zwei-Türen-Kurzform, Chrome/Footer.
function ort(o, oc) {
  const url = `/${o.slug}/`;
  const waMsg = `Hallo Blankstein, ich möchte einen Richtpreis für meine Fläche in ${o.name}. Foto und ungefähre Maße schicke ich gleich mit.`;
  const nachbarHtml = (oc.nachbarorte || []).map(slug => {
    const n = orte.find(x => x.slug === slug); if (!n) return '';
    return orteCopy[slug] ? `<a href="/${slug}/">${esc(n.name)}</a>` : `<span>${esc(n.name)}</span>`;
  }).filter(Boolean).join(' · ');

  // „Zuletzt in [Ort]": rendert NUR, wenn ein Fallstudien-Protokoll ein ort-Feld mit diesem Ort trägt.
  const zuEintrag = fallCopy && (fallCopy.protokolle || []).find(p => p.ort === o.name || p.ort === o.slug);
  const zuletztSlot = zuEintrag
    ? einzelProtokoll(zuEintrag.id, { label: `Zuletzt in ${o.name}` })
    : `<section class="zuletzt-ort"><div class="container">
<p class="doc-label">Zuletzt in ${esc(o.name)}</p>
<p class="zo-line">Dokumentierte Aufträge aus ${esc(o.name)} folgen — die <a href="/#protokolle">Auftrags-Protokolle auf der Startseite</a> sind echte Aufträge aus dem Havelland.</p>
</div></section>`;

  const main = `
<section class="bw-hero o-hero" id="top"><div class="container bw-grid">
<div class="bw-copy">
<p class="doc-label">${esc(oc.eyebrow)}</p>
<h1 class="bw-h1">${esc(oc.h1.replace(/\s*[—–-]\s*$/, ''))} — <em>${esc(oc.h1_em)}</em></h1>
<p class="bw-lede">${esc(oc.intro)}</p>
${gbadge()}
<div class="bw-ctas">
<a class="btn-wa" href="${waHref(waMsg)}" target="_blank" rel="noopener">${ICON.wa} ${esc(oc.wa_label || `Foto aus ${o.name} senden`)}</a>
<a class="btn btn-hline" href="tel:${tel}">Anrufen: <span class="mono">${esc(nap.phone_display)}</span></a>
</div>
<p class="bw-sla">${SLA_HTML} ${AMPEL_SPAN('status-light')}</p>
</div>
<div class="bw-visual">
<figure class="vn-card">
${protoMedia({ typ: 'img', slug: oc.hero_img, alt: oc.hero_alt }, { lcp: true })}
<figcaption>${protoTable([['Einsatzort', `${o.name} (${o.plz})`], ['Anfahrt', 'kostenlos im Servicegebiet'], ['Besichtigung', 'kostenlos, auf Wunsch 1 m² Probefläche'], ['Rückmeldung', SLA]])}</figcaption>
</figure>
</div>
</div></section>

<section class="lokal-sec"><div class="container">
<p class="doc-label">${esc(o.name)} · Vor Ort</p>
<h2 class="sec-h2">${esc(oc.lokal_title)}</h2>
<div class="lokal-body">${(oc.lokal_body || []).map(p => `<p>${esc(p)}</p>`).join('')}</div>
<div class="lokal-duo">
<article class="lokal-card"><h3><a href="/steinreinigung/">Steinreinigung in ${esc(o.name)}</a></h3><p>${esc(oc.stein_text)}</p></article>
<article class="lokal-card"><h3><a href="/terrassenreinigung/">Terrassenreinigung in ${esc(o.name)}</a></h3><p>${esc(oc.terrasse_text)}</p></article>
</div>
</div></section>

${zuletztSlot}

${konfigSection({ ort: o.name, kontext: `Ort ${o.name}`, title: oc.konf_title || `Was kostet Ihre Fläche in ${o.name}?`, sub: oc.konf_sub })}

${zweiTuerenKurz(o.name)}

<section class="gebiet2-sec"><div class="container">
<p class="doc-label">Gebiet</p>
<h2 class="sec-h2">${esc(oc.gebiet_h2 || `Wo wir in ${o.name} unterwegs sind`)}</h2>
<p class="sec-sub">${esc(oc.gebiet_text)}</p>
${nachbarHtml ? `<p class="ort-nachbar">${esc(oc.nachbar_prefix || `Von ${o.name} aus ebenfalls kurz erreichbar:`)} ${nachbarHtml} · <a href="/servicegebiet/">alle Orte</a></p>` : ''}
</div></section>

${faqBlock(oc.faqs, { title: oc.faq_title || `Fragen aus ${o.name}`, label: 'Lokal gefragt' })}`;

  const areaServed = `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`;
  const svcSchema = `{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"Stein- und Terrassenreinigung in ${sj(o.name)}","serviceType":["Steinreinigung","Terrassenreinigung"],"provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed},"description":"${sj(oc.meta)}"}`;
  const schema = `${orgSchema()},${svcSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: o.name, url }])}${faqSchema(url, oc.faqs)}`;
  write(url, head(clampTitle(oc.title), mkMeta(oc.meta), url, schema, { pagetype: 'ort', og: { slug: o.slug, motif: oc.hero_img } }) + header + mainWrap(main) + footer + sctaBar(waMsg) + sliderJS + konfigJS + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// RATGEBER (Artikel-Template — AEO: Direktantworten, Tabellen, FAQ, Profi-CTA → Money-Hub)
// ====================================================================
function ratgeber(r) {
  const url = `/ratgeber/${r.slug}/`;
  const svc = services.find(s => s.slug === r.cta_service);
  const ctaHubUrl = (svc && hubCopy[svc.slug]) ? `/${svc.slug}/` : '/kontakt/#anfrage';
  const waMsg = `Hallo Blankstein, ich habe euren Ratgeber „${r.h1}" gelesen und möchte ein Angebot — Foto + Maße schicke ich gleich.`;
  const sek = r.sektionen || [];
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const fmtDate = d => { const [y, mo, da] = String(d || '').split('-'); return (da && mo && y) ? `${+da}. ${MONATE[+mo - 1]} ${y}` : (d || ''); };
  const wordCount = [r.lead, ...sek.flatMap(s => [s.antwort, ...(s.body || []), ...(s.steps || []), ...((s.list && s.list.items) || [])])].filter(Boolean).join(' ').split(/\s+/).length;
  const lesezeit = Math.max(2, Math.round(wordCount / 200));
  const toc = sek.length > 2 ? `<nav class="rg-toc" aria-label="Inhalt"><span class="rg-toc-title">Inhalt</span><ol>${sek.map((s, i) => `<li><a href="#sektion-${i + 1}">${esc(s.h2)}</a></li>`).join('')}</ol></nav>` : '';

  const tableHtml = t => { if (!t) return ''; const cc = (t.head || []).map(h => { const x = (h || '').toLowerCase(); return /geeignet|empfohlen/.test(x) ? 'rg-col-ok' : (/meiden|vorsicht|unseri/.test(x) ? 'rg-col-bad' : ''); }); return `<div class="rg-table-wrap"><table class="rg-table">${t.caption ? `<caption>${esc(t.caption)}</caption>` : ''}<thead><tr>${(t.head || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(t.rows || []).map(row => `<tr>${row.map((cell, ci) => ci === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td${cc[ci] ? ` class="${cc[ci]}"` : ''}>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; };

  const stepsHtml = s => (s.steps && s.steps.length) ? `<ol class="rg-steps">${s.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>` : '';
  const listHtml = s => (s.list && s.list.items && s.list.items.length) ? `<div class="rg-list">${s.list.title ? `<p class="rg-list-title">${esc(s.list.title)}</p>` : ''}<ul>${s.list.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul></div>` : '';
  const WARN_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  const warnHtml = s => s.warnung ? `<div class="rg-warn"><span class="rg-warn-ico">${WARN_ICO}</span><p>${esc(s.warnung)}</p></div>` : '';
  // Bild-Label-Sweep (Befund L6/UWG): badge:true rendert bei source:"ki" das sichtbare
  // „Illustration — beispielhafte Darstellung"-Label + erzwingt es im alt-Text.
  const figHtml = s => (s.img && IMG[s.img]) ? `<figure class="rg-figure">${pic(s.img, { badge: true, alt: s.img_alt || s.h2, sizes: '(max-width:820px) 92vw, 720px' })}${s.img_caption ? `<figcaption>${esc(s.img_caption)}</figcaption>` : ''}</figure>` : '';
  const sektionenHtml = sek.map((s, i) => `
<section class="rg-section" id="sektion-${i + 1}">
<h2>${esc(s.h2)}</h2>
${s.antwort ? `<p class="rg-lead">${esc(s.antwort)}</p>` : ''}
${(s.body || []).map(p => `<p>${esc(p)}</p>`).join('')}
${stepsHtml(s)}
${listHtml(s)}
${warnHtml(s)}
${figHtml(s)}
${tableHtml(s.table)}
</section>`).join('');

  const relatedHtml = (r.related && r.related.length) ? `<aside class="rg-related"><h2>Weiterlesen</h2><ul>${r.related.map(l => `<li><a href="${l.url}">${esc(l.label)} →</a></li>`).join('')}</ul></aside>` : '';

  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span><a href="/ratgeber/">Ratgeber</a><span class="sep">›</span>${esc(r.h1)}</div>
<section class="rg-hero"><div class="container"><div class="rg-hero-inner">
<p class="doc-label">Ratgeber</p>
<h1>${esc(r.h1)}</h1>
<p class="lead">${esc(r.lead)}</p>
<p class="rg-meta mono">${ICON.calendar} Aktualisiert am ${esc(fmtDate(r.updated || config.content_stand))} · ${lesezeit} Min Lesezeit · von ${esc(nap.name)} Steinreinigung</p>
</div></div></section>
${r.hero_img && IMG[r.hero_img] ? `<div class="container rg-herofig-wrap"><figure class="rg-herofig">${pic(r.hero_img, { badge: true, alt: r.hero_alt || r.h1, sizes: '(max-width:1180px) 92vw, 1100px', lcp: true })}</figure></div>` : ''}
<section class="rg-body"><div class="container"><div class="rg-layout${toc ? ' has-toc' : ''}">
${toc ? `<aside class="rg-side">${toc}</aside>` : ''}
<div class="rg-col">
${sektionenHtml}
<aside class="rg-protip">
<div class="rg-protip-icon">${ICON.spray}</div>
<div class="rg-protip-body">
<span class="rg-protip-label mono">Profi-Tipp</span>
<h2>${esc(r.cta_title || 'Lieber gleich vom Profi machen lassen?')}</h2>
<p>${esc(r.cta_text || `Wir reinigen Ihre Fläche materialschonend, verfugen neu und imprägnieren auf Wunsch — Richtpreis ab 7 €/m². ${SLA}.`)}</p>
<div class="rg-protip-actions"><a href="${waHref(waMsg)}" class="btn-wa" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto</a><a href="${ctaHubUrl}" class="rg-protip-link">${svc ? esc(svc.name) + ' ansehen' : 'Mehr erfahren'} →</a></div>
</div>
</aside>
${relatedHtml}
</div></div></div></section>
${faqBlock(r.faqs)}`;

  const artSchema = `{"@type":"Article","@id":"${DOMAIN}${url}#article","headline":"${sj(r.h1)}","description":"${sj(r.meta)}","image":"${imgAbs(r.hero_img) || imgAbs('og-default')}","datePublished":"${r.updated || config.content_stand}","dateModified":"${r.updated || config.content_stand}","inLanguage":"de-DE","author":{"@id":"${DOMAIN}/#organization"},"publisher":{"@id":"${DOMAIN}/#organization"},"mainEntityOfPage":"${DOMAIN}${url}"}`;
  const schema = `${orgSchema()},${artSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Ratgeber', url: '/ratgeber/' }, { name: r.h1, url }])}${faqSchema(url, r.faqs)}`;
  // og:image: Ratgeber-Motive rotieren durch den ECHT-Foto-Pool (kein KI-Motiv in Social-Previews)
  const OG_POOL = ['proof-arbeit-1', 'proof-arbeit-2', 'proof-ergebnis-1', 'proof-ergebnis-2', 'hub-steinreinigung-wegetreppen', 'hub-pflaster-gal2', 'hub-steinreinigung-gal5', 'hub-pflaster-gal5'];
  const ogMotif = OG_POOL[ratList.indexOf(r) >= 0 ? ratList.indexOf(r) % OG_POOL.length : 0];
  write(url, head(clampTitle(r.title), mkMeta(r.meta), url, schema, { pagetype: 'ratgeber', og: { slug: `ratgeber-${r.slug}`, motif: ogMotif } }) + header + mainWrap(main) + footer + sctaBar(waMsg) + FOOT_JS + '</body></html>');
  written.push(url);
}

// Ratgeber-Übersicht (/ratgeber/) — CollectionPage, verlinkt alle Artikel.
// P2-Tokens (Etappe D): rg-card-Liste statt svc-card-Grid (Tilt-Abhängigkeit raus),
// KI-Thumbnails sichtbar gelabelt (badge:true), CTA als proto-bridge statt cta-band.
function ratgeberIndex() {
  const url = '/ratgeber/';
  const cards = ratList.map((r, i) => `<a class="rg-card reveal" href="/ratgeber/${r.slug}/" style="transition-delay:${(i % 2) * .06}s">
${r.hero_img && IMG[r.hero_img] ? `<div class="rg-card-img">${pic(r.hero_img, { badge: true, alt: r.hero_alt || r.h1, sizes: '(max-width:980px) 92vw, 400px' })}</div>` : ''}
<div class="rg-card-body"><span class="rg-card-no mono">${String(i + 1).padStart(2, '0')}</span><h3>${esc(r.h1)}</h3><p>${esc(r.lead)}</p><span class="rg-card-go">Zum Ratgeber →</span></div>
</a>`).join('');
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Ratgeber</div>
<section class="bw-hero o-hero"><div class="container">
<p class="doc-label">Ratgeber · ${ratList.length} Anleitungen</p>
<h1 class="bw-h1">Stein &amp; Terrasse: <em>selber machen</em> — und wann besser nicht.</h1>
<p class="bw-lede">Praktische Anleitungen zum Reinigen, Pflegen und Schützen von Pflaster, Einfahrt und Terrasse — inklusive der ehrlichen Einordnung, wo Hausmittel aufhören und der Profi anfängt.</p>
</div></section>
<section class="rgx-sec"><div class="container">
<div class="rgx-grid">${cards}</div>
</div></section>
<section class="doors-sec" style="padding-top:0"><div class="container">
<div class="proto-bridge"><p><strong>Lieber machen lassen?</strong> Foto und ungefähre Maße genügen — Richtpreis exakt m² × 7 €, ${SLA_HTML}.</p><a href="${waHref(WA_DEFAULT)}" class="btn-wa" target="_blank" rel="noopener">${ICON.wa} Angebot per WhatsApp</a></div>
</div></section>`;
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Ratgeber","isPartOf":{"@id":"${DOMAIN}/#organization"}},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Ratgeber', url }])}`;
  write(url, head('Ratgeber: Stein & Terrasse reinigen | Blankstein', mkMeta('Ratgeber von Blankstein: Pflaster, Einfahrt und Terrasse richtig reinigen, Grünbelag entfernen, Fugen sanieren und imprägnieren — praktische Anleitungen aus dem Havelland.'), url, schema, { pagetype: 'ratgeber-index', og: { slug: 'ratgeber', motif: 'hub-pflaster-gal3' } }) + header + mainWrap(main) + footer + SCTA + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// SERVICEGEBIET (Übersicht — verlinkt alle Orts-Hubs; CollectionPage)
// ====================================================================
function servicegebiet() {
  const url = '/servicegebiet/';
  const charBySlug = gebietCopy ? Object.fromEntries((gebietCopy.orte || []).map(o => [o.slug, o.charakter])) : {};
  // Pin-Positionen in % auf dem Kartenbild (servicegebiet-karte, Web-Mercator z12, center 52.535/13.075).
  // Quelle: scripts via website-Tooling projiziert; bei Orts-/Karten-Änderung neu erzeugen.
  const PINPCT = { 'falkensee': [53.24, 37.23], 'dallgow-doeberitz': [46.01, 48.30], 'brieselang': [36.95, 23.09], 'schoenwalde-glien': [61.83, 10.06], 'wustermark': [27.84, 43.61], 'gross-glienicke': [56.06, 85.04], 'kladow': [62.69, 90.56] };
  const REGION = { 'gross-glienicke': 'Potsdam', 'kladow': 'Berlin' }; // Rest = Havelland
  const PINLEFT = new Set(['gross-glienicke']); // Label links statt rechts (Kollision mit Kladow)
  const geoOrte = orte.filter(o => orteCopy[o.slug] && PINPCT[o.slug]);
  const mapPins = geoOrte.map(o => { const [px, py] = PINPCT[o.slug]; return `<a class="svc-pin${PINLEFT.has(o.slug) ? ' svc-pin--left' : ''}" data-slug="${o.slug}" href="/${o.slug}/" style="left:${px}%;top:${py}%" aria-label="${esc(o.name)} — zum Ort"><span class="svc-pin-dot"></span><span class="svc-pin-lbl">${esc(o.name)}</span></a>`; }).join('');
  const ortCards = geoOrte.map((o, i) => { const reg = REGION[o.slug] || 'Havelland'; const ch = charBySlug[o.slug] || ('Stein- und Terrassenreinigung in ' + o.name + '.'); return `<a class="ort-card reveal" data-slug="${o.slug}" href="/${o.slug}/" style="transition-delay:${(i % 3) * .06}s"><span class="ort-plz">${esc(o.plz)} · ${esc(reg)}</span><h3>${esc(o.name)}</h3><p>${esc(ch)}</p><span class="ort-go">Zum Ort →</span></a>`; }).join('');
  const hubLinks = services.filter(s => hubCopy[s.slug]).map(s => `<li><a href="/${s.slug}/">${ICON.pin} ${esc(s.name)}</a></li>`).join('');
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Servicegebiet</div>
<section class="bw-hero o-hero"><div class="container">
<p class="doc-label">Servicegebiet · 7 Orte</p>
<h1 class="bw-h1">Havelland &amp; westlicher Berliner Rand — <em>Anfahrt kostenlos</em>.</h1>
<p class="bw-lede">${esc(gebietCopy && gebietCopy.intro_lead ? gebietCopy.intro_lead : 'Wir reinigen Stein- und Terrassenflächen im Havelland und am westlichen Berliner Rand. Wählen Sie Ihren Ort für die lokalen Details — oder fragen Sie direkt ein Angebot per Foto an.')}</p>
<div class="bw-ctas"><a href="${waHref(WA_DEFAULT)}" class="btn-wa" target="_blank" rel="noopener">${ICON.wa} Angebot per Foto anfragen</a><a href="tel:${tel}" class="btn btn-hline">${ICON.calendar} Besichtigung abstimmen</a></div>
<p class="bw-sla">${SLA_HTML} ${AMPEL_SPAN('status-light')}</p>
</div></section>
<section class="geo-section-wrap"><div class="container"><div class="geo-inner reveal"><div class="section-head center"><p class="doc-label" style="justify-content:center">Übersicht</p><h2 class="sec-h2" style="margin-inline:auto">Unser Gebiet auf einen Blick</h2></div><figure class="svc-map" id="svc-map">${pic('servicegebiet-karte', { alt: 'Karte des Blankstein-Servicegebiets im Havelland und am westlichen Berliner Rand mit allen sieben bedienten Orten', sizes: '(max-width:980px) 92vw, 900px' })}<div class="svc-map-pins">${mapPins}</div><figcaption class="svc-map-attr">Kartendaten © OpenStreetMap-Mitwirkende</figcaption></figure><p class="geo-note mono">Fahren Sie über einen Ort — oder tippen Sie ihn an — für die lokalen Details.</p></div></div></section>
<section class="svc-section"><div class="container">
<div class="section-head"><p class="doc-label">Orte</p><h2 class="sec-h2">Orte, die wir bedienen</h2>
<p class="sec-sub">Sieben Kern-Orte im Havelland und am westlichen Berliner Rand — weitere Orte auf Anfrage.</p></div>
<div class="ort-grid">${ortCards}</div>
</div></section>
<section class="gebiet-section"><div class="container"><div class="gebiet-inner reveal">
<p class="doc-label" style="justify-content:center">Leistungen</p><h2 class="sec-h2" style="margin-inline:auto">Was wir anbieten</h2>
<p class="sec-sub" style="margin-inline:auto">In jedem Ort reinigen wir Pflaster, Einfahrten und Terrassen. Mehr zu den einzelnen Leistungen:</p>
<ul class="gebiet-list">${hubLinks}</ul>
</div></div></section>
<section class="doors-sec" style="padding-top:0" id="kontakt"><div class="container">
<div class="proto-bridge"><p><strong>Ihr Ort ist dabei?</strong> Foto und ungefähre Maße genügen — Richtpreis exakt m² × 7 €, ${SLA_HTML}.</p><a href="${waHref(WA_DEFAULT)}" class="btn-wa" target="_blank" rel="noopener">${ICON.wa} Angebot per WhatsApp</a></div>
</div></section>`;
  const areaServed = `[${orte.map(o => `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`).join(',')},{"@type":"AdministrativeArea","name":"Havelland"}]`;
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Servicegebiet","isPartOf":{"@id":"${DOMAIN}/#organization"},"about":{"@type":"Service","name":"Stein- und Terrassenreinigung","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed}}},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Servicegebiet', url }])}`;
  write(url, head('Servicegebiet | Blankstein', mkMeta('Servicegebiet Blankstein: Stein- und Terrassenreinigung in Falkensee, Dallgow-Döberitz, Brieselang, Schönwalde-Glien, Wustermark, Groß Glienicke und Kladow.'), url, schema, { pagetype: 'servicegebiet', og: { slug: 'servicegebiet', motif: 'servicegebiet-karte' } }) + header + mainWrap(main) + footer + SCTA + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// KONTAKT (echte Konversions-Seite — Web3Forms, Fallback WhatsApp-Bridge)
// ====================================================================
// ====================================================================
// PREISE (Kosten-Transparenz + Richtpreis-Rechner; AEO-Magnet)
// ====================================================================
// /preise/ (Spec §4): Hero kompakt · Preis-Protokoll-Tabelle (exakte m²-Beispiele) · Konfigurator ·
// Selbermachen-vs-Blankstein · Garantie-Trio + Probefläche · FAQ. KEINE Spannen (m² × Satz, Punkt).
function preise(p) {
  const url = '/preise/';
  const waMsg = `Hallo Blankstein, ich möchte einen Richtpreis für meine Fläche. Foto und ungefähre Maße schicke ich gleich mit.`;
  const t = p.kosten_tabelle || {};
  const tableHtml = `<div class="tbl-wrap"><table class="mtbl mtbl-preis">${t.caption ? `<caption>${esc(t.caption)}</caption>` : ''}<thead><tr>${(t.head || []).map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${(t.rows || []).map(row => `<tr>${row.map((cell, ci) => ci === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td class="mono">${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const kf = p.kostenfaktoren || {};
  const kfHtml = (kf.items && kf.items.length) ? `<div class="preis-faktoren"><ul>${kf.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '';
  const re = p.richtpreis_erklaerung || {};
  const v = p.vergleich || {};
  const vergleichHtml = (v.diy && v.pro) ? `<section class="vergleich-section"><div class="container">
<p class="doc-label">Selbst oder Blankstein</p>
<h2 class="sec-h2">${esc(v.title)}</h2>
<p class="sec-sub">${esc(v.intro)}</p>
<div class="vergleich-grid reveal">
<div class="vergleich-col vergleich-diy"><h3>${esc(v.diy_title)}</h3><ul>${v.diy.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
<div class="vergleich-col vergleich-pro"><h3><span class="vergleich-ic">${ICON.shield}</span>${esc(v.pro_title)}</h3><ul>${v.pro.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
</div>
${v.footer ? `<p class="vergleich-footer reveal">${esc(v.footer)}</p>` : ''}
</div></section>` : '';
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Preise</div>
<section class="bw-hero o-hero"><div class="container bw-grid">
<div class="bw-copy">
<p class="doc-label">Preisliste · Stand ${esc(config.content_stand)}</p>
<h1 class="bw-h1">${esc(p.h1)}</h1>
<p class="bw-lede">${esc(p.lead)}</p>
${PREIS_BOX}
${gbadge()}
<div class="bw-ctas">
<a class="btn-wa" href="${waHref(waMsg)}" target="_blank" rel="noopener">${ICON.wa} Foto senden, Preis erhalten</a>
<a class="btn btn-hline" href="tel:${tel}">Anrufen: <span class="mono">${esc(nap.phone_display)}</span></a>
</div>
<p class="bw-sla">${SLA_HTML} ${AMPEL_SPAN('status-light')}</p>
</div>
<div class="bw-visual">
<div class="vn-card preis-karte">
<p class="doc-label">Preis-Protokoll</p>
${tableHtml}
<p class="belag-note">Gerechnet wird exakt m² × Satz. Der Rechner weiter unten übernimmt das für Ihre Fläche.</p>
</div>
</div>
</div></section>
<section class="belag-sec"><div class="container">
<p class="doc-label">Einflussgrößen</p>
<h2 class="sec-h2">${esc(kf.title || 'Was hinter dem Quadratmeterpreis steckt')}</h2>
${kfHtml}
</div></section>
${konfigSection({ kontext: 'Preise', title: 'Rechnen Sie Ihren Richtpreis aus', sub: 'Fläche, Größe, Paket — gerechnet wird exakt m² × 7 € oder 8 €. Verbindlich nach Foto-Prüfung, dann Endpreis-Zusage.' })}
<section class="lokal-sec"><div class="container">
<p class="doc-label">Preislogik</p>
<h2 class="sec-h2">${esc(re.title || 'Warum Richtpreis statt fester Preis aus der Ferne')}</h2>
<div class="lokal-body">${(re.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</div>
</div></section>
${vergleichHtml}
<section class="doors-sec"><div class="container">
<p class="doc-label">Unsere Zusagen</p>
<h2 class="sec-h2">Drei Zusagen, die zum Preis gehören.</h2>
<div class="gar-row">${GARANTIE_TRIO.map(([tt, h, d]) => `<article class="gar-item"><span class="mono-tag mono">${tt}</span><h3>${h}</h3><p>${d}</p></article>`).join('')}</div>
<p class="door-alt">Persönlich klären? <a href="/kontakt/">Zur Kontaktseite</a> — oder <a href="/ratgeber/was-kostet-steinreinigung/">zum Kosten-Ratgeber</a>.</p>
</div></section>
${faqBlock(p.faqs, { title: 'Preisfragen, kurz beantwortet' })}`;
  const areaServed = `[${orte.map(o => `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`).join(',')},{"@type":"AdministrativeArea","name":"Havelland"}]`;
  const svcSchema = `{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"Steinreinigung und Terrassenreinigung","serviceType":"Steinreinigung","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed},"offers":{"@type":"Offer","priceCurrency":"EUR","price":"${P.satz_basis}","description":"Richtpreis pro Quadratmeter inkl. Reinigung und Neuverfugung, Endpreis ohne versteckte Kosten."}}`;
  const schema = `${orgSchema()},${svcSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Preise', url }])}${faqSchema(url, p.faqs)}`;
  write(url, head(clampTitle(p.title), mkMeta(p.meta), url, schema, { pagetype: 'preise', og: { slug: 'preise', motif: 'proof-ergebnis-2' } }) + header + mainWrap(main) + footer + sctaBar(waMsg) + sliderJS + konfigJS + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// UEBER UNS (Spec §4: Inhaberblock groß · Verfahren · Geräte-Ledger generisch · Garantie)
// Jetzt in Nav/Footer/Sitemap (Befund A5). Foto-Ehrlichkeit: echtes Arbeitsfoto + „Porträt folgt"-Caption
// statt Stock/KI. Geräte generisch (K7/Kränzle-Klärung offen). Keine „Hunderte Male"-Claims (UWG).
// ====================================================================
function ueberUns(u) {
  const url = '/ueber-uns/';
  const waMsg = 'Hallo Blankstein, ich habe eure Über-uns-Seite gelesen und möchte einen Richtpreis — Foto und ungefähre Maße schicke ich gleich.';
  const inh = u.inhaber || {}, vf = u.verfahren || {}, eq = u.equipment || {}, se = u.seriositaet || {};
  const schritteHtml = (vf.schritte || []).map((s, i) => `<div class="svc-row">
<span class="svc-num mono">0${i + 1}</span>
<div><h3>${esc(s.titel)}</h3><p>${esc(s.text)}</p></div>
<div class="svc-meta mono">${i === 4 ? `Paket 2<br><strong>${P.satz_impraegnierung} €/m²</strong>` : `im m²-Preis<br><strong>enthalten</strong>`}</div>
</div>`).join('');
  const gearHtml = (eq.items || []).map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('');
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Über uns</div>
<section class="bw-hero o-hero"><div class="container bw-grid">
<div class="bw-copy">
<p class="doc-label">Über uns · Blankstein</p>
<h1 class="bw-h1">${u.h1}</h1>
<p class="bw-lede">${esc(u.lead)}</p>
${gbadge()}
<div class="bw-ctas">
<a class="btn-wa" href="${waHref(waMsg)}" target="_blank" rel="noopener">${ICON.wa} Foto senden, Richtpreis erhalten</a>
<a class="btn btn-hline" href="tel:${tel}">Anrufen: <span class="mono">${esc(nap.phone_display)}</span></a>
</div>
<p class="bw-sla">${SLA_HTML} ${AMPEL_SPAN('status-light')}</p>
</div>
<div class="bw-visual">
<figure class="vn-card">
${protoMedia({ typ: 'img', slug: 'trust-team', alt: 'Echtes Arbeitsfoto von einem Blankstein-Einsatz im Havelland: Reinigung einer Pflasterfläche' }, { lcp: true })}
<figcaption>${protoTable(u.hero_tabelle || [])}</figcaption>
</figure>
</div>
</div></section>

<section class="lokal-sec"><div class="container">
<p class="doc-label">Inhaber</p>
<h2 class="sec-h2">${esc(inh.title)}</h2>
<div class="lokal-body">${(inh.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</div>
<p class="ueber-caption mono">Das Foto oben ist ein echtes Arbeitsbild aus einem Einsatz in unserem Gebiet. Ein Porträt von uns beiden folgt — wir zeigen lieber echte Arbeit als ein gestelltes Stockfoto.</p>
</div></section>

<section class="svcz-sec"><div class="container">
<p class="doc-label">Verfahren</p>
<h2 class="sec-h2">${esc(vf.title)}</h2>
<p class="sec-sub">${esc(vf.intro)}</p>
<div class="svcz">${schritteHtml}</div>
</div></section>

<section class="owners-sec on-dark"><div class="container owners">
<figure class="owners-photo">${pic('proof-arbeit-1', { badge: true, alt: 'Echtes Arbeitsfoto: Flächenreiniger im Einsatz auf einer Pflasterfläche', sizes: '(max-width:820px) 92vw, 440px' })}<figcaption>Echtes Foto aus einem Kundenauftrag — der Flächenreiniger bei der Arbeit.</figcaption></figure>
<div class="owners-body">
<p class="doc-label">${esc(eq.title || 'Geräte-Ledger')}</p>
<h2 class="sec-h2">Was bei Ihnen im Einsatz ist.</h2>
<p class="owners-p">${esc(eq.intro || '')}</p>
<ul class="gear">${gearHtml}</ul>
</div>
</div></section>

<section class="lokal-sec"><div class="container">
<p class="doc-label">Preislogik</p>
<h2 class="sec-h2">${esc(se.title)}</h2>
<div class="lokal-body">${(se.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</div>
</div></section>

<section class="doors-sec" style="padding-top:0"><div class="container">
<p class="doc-label">Unsere Zusagen</p>
<h2 class="sec-h2">Drei Zusagen, schriftlich hier.</h2>
<div class="gar-row">${GARANTIE_TRIO.map(([t, h, d]) => `<article class="gar-item"><span class="mono-tag mono">${t}</span><h3>${h}</h3><p>${d}</p></article>`).join('')}</div>
<div class="proto-bridge" style="margin-top:1.6rem"><p><strong>${esc(u.cta_title)}</strong> ${esc(u.cta_text)}</p><a class="btn-wa" href="${waHref(waMsg)}" target="_blank" rel="noopener">${ICON.wa} Chat mit Foto starten</a></div>
</div></section>

${faqBlock(u.faqs, { title: 'Fragen an uns als Betrieb', label: 'Nachgefragt' })}

${ortsLeiste()}`;
  const aboutSchema = `{"@type":"AboutPage","@id":"${DOMAIN}${url}#page","name":"${sj(u.title)}","isPartOf":{"@id":"${DOMAIN}/#organization"},"about":{"@id":"${DOMAIN}/#organization"}}`;
  const schema = `${orgSchema()},${aboutSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Über uns', url }])}${(u.faqs && u.faqs.length) ? faqSchema(url, u.faqs) : ''}`;
  write(url, head(clampTitle(u.title), mkMeta(u.meta), url, schema, { pagetype: 'ueber', og: { slug: 'ueber-uns', motif: 'trust-team' } }) + header + mainWrap(main) + footer + sctaBar(waMsg) + FOOT_JS + '</body></html>');
  written.push(url);
}

// KONTAKT (Spec §3.5 + §4): zweispaltig — links Formular mit Foto-Dropzone (Web3Forms-Attachments,
// nur bei echtem Key; ohne Key ehrlicher Hinweis + Kanäle, NIE stiller WhatsApp-Redirect),
// rechts NAP-Karte + Öffnungszeiten + Ampel + Gebietskarte. DSGVO-Checkbox mit sauberem Grid-Layout (Befund-Fix).
function kontakt() {
  const url = '/kontakt/';
  const FL_CHIPS = ['Einfahrt', 'Terrasse', 'Wege & Treppen', 'Hoffläche', 'Andere Fläche'];
  const chipsHtml = FL_CHIPS.map((c, i) => `<label class="fchip"><input type="radio" name="flaechentyp" value="${esc(c)}"${i === 0 ? ' checked' : ''}><span>${esc(c)}</span></label>`).join('');
  const formHtml = FORM_OK
    ? `<form id="anfrage" class="kf2" action="https://api.web3forms.com/submit" method="POST" enctype="multipart/form-data" novalidate>
<input type="hidden" name="access_key" value="${esc(config.web3forms_key)}"><input type="hidden" name="subject" value="Neue Anfrage über blankstein-havelland.de"><input type="hidden" name="from_name" value="Blankstein Website"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">
<div class="kf2-row"><label>Name<input name="name" autocomplete="name" required></label><label>Telefon<input name="tel" type="tel" autocomplete="tel" required></label></div>
<div class="kf2-row"><label>Ort / PLZ<input name="ort" id="kf-ort" autocomplete="address-level2" placeholder="z. B. Falkensee"></label><label>Fläche in m² (ungefähr)<input name="qm" id="kf-qm" inputmode="numeric" placeholder="z. B. 60"></label></div>
<fieldset class="fchips"><legend>Was für eine Fläche ist es?</legend><div class="fchip-row">${chipsHtml}</div></fieldset>
<label>Kurz zum Zustand<textarea name="anliegen" rows="4" placeholder="z. B. Betonpflaster, stark vermoost, zuletzt vor 4 Jahren gereinigt" required></textarea></label>
<div class="dz" id="dz" tabindex="0" role="button" aria-label="Fotos auswählen oder hierher ziehen">
<input type="file" id="dz-input" name="attachment" accept="image/jpeg,image/png,image/webp,image/heic" multiple>
<span class="dz-ic">${ICON.camera}</span>
<strong>Fotos der Fläche hierher ziehen oder tippen</strong>
<span class="dz-sub mono">bis zu 5 Bilder · JPG, PNG, WebP, HEIC — mit Fotos steht der Richtpreis schneller</span>
<ul class="dz-list" id="dz-list" aria-live="polite"></ul>
</div>
<label class="chk2"><input type="checkbox" name="dsgvo" value="einverstanden" required><span>Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden. Details in der <a href="/datenschutz/">Datenschutzerklärung</a>.</span></label>
<button class="btn-wa kf2-submit" type="submit">${ICON.mail} Anfrage mit Fotos senden</button>
<p class="kf-alt mono">${SLA_HTML}</p>
</form>`
    : `<div id="anfrage" class="kf2 kf-off">
<p class="kf-off-note"><strong>Das Formular ist noch nicht freigeschaltet.</strong> Wir richten den Versand gerade ein — bis dahin erreichen Sie uns genauso schnell über diese Wege:</p>
<div class="kf-off-ways">
<a class="btn-wa" href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener">${ICON.wa} WhatsApp mit Foto</a>
<a class="btn btn-hline" href="tel:${tel}">${ICON.phone} <span class="mono">${esc(nap.phone_display)}</span></a>
<a class="btn btn-hline" href="mailto:${esc(nap.email)}">${ICON.mail} ${esc(nap.email)}</a>
</div>
<p class="kf-alt mono">${SLA_HTML}</p>
</div>`;
  // Dropzone + Submit-JS: max 5 Bilder, Liste mit Entfernen; generate_lead NUR bei erfolgreichem Versand (Spec §3.8).
  // Vorbefüllung: liest den Konfigurator-Zustand (sessionStorage bs_konf) — m², Flächentyp, Ort wandern mit.
  const kontaktJS = FORM_OK ? `<script>(function(){
var f=document.getElementById('anfrage');if(!f)return;
try{var s=JSON.parse(sessionStorage.getItem('bs_konf')||'null');if(s){var q=document.getElementById('kf-qm');if(q&&!q.value&&s.qm)q.value=s.qm;var o=document.getElementById('kf-ort');if(o&&!o.value&&s.ort)o.value=s.ort;if(s.type){var r=f.querySelector('input[name=flaechentyp][value="'+s.type.replace('Wege und Treppen','Wege & Treppen')+'"]');if(r)r.checked=true}}}catch(e){}
var dz=document.getElementById('dz'),inp=document.getElementById('dz-input'),list=document.getElementById('dz-list'),MAX=5,files=[];
function render(){list.innerHTML='';files.forEach(function(fl,i){var li=document.createElement('li');li.textContent=fl.name+' ('+Math.round(fl.size/1024)+' KB) ';var x=document.createElement('button');x.type='button';x.textContent='entfernen';x.setAttribute('aria-label',fl.name+' entfernen');x.addEventListener('click',function(ev){ev.stopPropagation();files.splice(i,1);sync()});li.appendChild(x);list.appendChild(li)});dz.classList.toggle('has-files',files.length>0)}
function sync(){var dt=new DataTransfer();files.forEach(function(fl){dt.items.add(fl)});inp.files=dt.files;render()}
function add(fl){for(var i=0;i<fl.length;i++){if(files.length>=MAX){alert('Maximal '+MAX+' Fotos — die weiteren schicken Sie am einfachsten per WhatsApp nach.');break}if(fl[i].type.indexOf('image/')===0||/\\.heic$/i.test(fl[i].name))files.push(fl[i])}sync()}
dz.addEventListener('click',function(e){if(e.target.tagName!=='BUTTON')inp.click()});
dz.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click()}});
inp.addEventListener('change',function(){add(inp.files)});
['dragover','dragenter'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.add('drag')})});
['dragleave','drop'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.remove('drag')})});
dz.addEventListener('drop',function(e){if(e.dataTransfer&&e.dataTransfer.files)add(e.dataTransfer.files)});
f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}
var b=f.querySelector('button[type=submit]'),o=b.innerHTML;b.disabled=true;b.textContent='Wird gesendet…';
fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:new FormData(f)}).then(function(r){return r.json()}).then(function(j){
if(j&&j.success){if(window.dataLayer)dataLayer.push({event:'generate_lead',via:'form_kontakt',fotos:files.length});location.href='/danke/'}
else{b.disabled=false;b.innerHTML=o;alert('Das Senden hat nicht geklappt. Bitte versuchen Sie es noch einmal — oder rufen Sie uns kurz an: ${nap.phone_display}.')}
}).catch(function(){b.disabled=false;b.innerHTML=o;alert('Das Senden hat nicht geklappt. Bitte versuchen Sie es noch einmal — oder rufen Sie uns kurz an: ${nap.phone_display}.')})});
})();</script>` : '';
  const side = `<aside class="kt-side">
<div class="kt-card">
<p class="doc-label">Direkt erreichen</p>
${protoTable([['Firma', nap.gbp_name], ['Adresse', `${nap.street}, ${nap.zip} ${nap.city}`], ['Telefon', nap.phone_display], ['E-Mail', nap.email], ['Rückmeldung', SLA]])}
<p class="kt-status">${AMPEL_SPAN('status-light')}</p>
<div class="kt-btns"><a class="btn-wa" href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener">${ICON.wa} WhatsApp öffnen</a><a class="btn btn-hline" href="tel:${tel}"><span class="mono">${esc(nap.phone_display)}</span></a></div>
</div>
<div class="kt-card">
<p class="doc-label">Öffnungszeiten</p>
<table class="hours hours-light"><tr><th scope="row">Montag–Freitag</th><td>8–18 Uhr</td></tr><tr><th scope="row">Samstag</th><td>9–14 Uhr</td></tr><tr><th scope="row">Sonntag</th><td>geschlossen</td></tr></table>
<p class="kt-note mono">WhatsApp geht jederzeit — wir antworten zu den Öffnungszeiten.</p>
</div>
<figure class="kt-map">${pic('servicegebiet-karte', { badge: true, alt: 'Karte des Blankstein-Servicegebiets im Havelland und am westlichen Berliner Rand', sizes: '(max-width:900px) 92vw, 380px' })}<figcaption>Kostenlose Anfahrt im gesamten Gebiet — <a href="/servicegebiet/">alle Orte im Überblick</a>.</figcaption></figure>
</aside>`;
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Kontakt</div>
<section class="bw-hero o-hero"><div class="container">
<p class="doc-label">Kontakt</p>
<h1 class="bw-h1">Ein Foto genügt für den <em>Richtpreis</em>.</h1>
<p class="bw-lede">Schicken Sie Fotos und die ungefähren Maße Ihrer Fläche — per WhatsApp, Formular oder Anruf. ${SLA_HTML}. Wer es lieber persönlich mag: Die Besichtigung vor Ort ist kostenlos, auf Wunsch mit 1 m² Probefläche.</p>
</div></section>
<section class="kt-sec"><div class="container kt-grid">
<div class="kt-form">
<p class="doc-label">${FORM_OK ? 'Anfrage mit Foto-Upload' : 'Anfrage'}</p>
<h2 class="sec-h2">${FORM_OK ? 'Angaben eintragen, Fotos anhängen, absenden.' : 'So erreichen Sie uns.'}</h2>
${formHtml}
</div>
${side}
</div></section>`;
  const schema = `${orgSchema()},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Kontakt', url }])}`;
  const meta = mkMeta(`Kontakt zu Blankstein Steinreinigung in ${nap.city}: Anfrage per WhatsApp, Formular mit Foto-Upload oder Telefon ${nap.phone_display}. Antwort werktags in unter 2 h.`);
  write(url, head('Kontakt — Anfrage per Foto | Blankstein', meta, url, schema, { pagetype: 'kontakt', og: { slug: 'kontakt', motif: 'trust-team' } }) + header + mainWrap(main) + footer + sctaBar(WA_DEFAULT) + kontaktJS + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// RECHT (Impressum / Datenschutz) + Danke + 404
// ====================================================================
function legalShell(t, bodyHtml) {
  return mainWrap(`<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(t)}</div>
<section class="page-hero"><div class="container"><h1>${esc(t)}</h1></div></section>
<section class="section"><div class="container"><div class="prose">${bodyHtml}</div></div></section>`);
}
function impressum() {
  const gesell = (nap.gesellschafter || [nap.inhaber]).join(' und ');
  const body = `<h2>Angaben gemäß § 5 DDG</h2>
<p>${esc(nap.rechtstraeger)}<br>Marke „Blankstein"<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}</p>
<p>Vertreten durch die Gesellschafter: ${esc(gesell)}.</p>
<h2>Kontakt</h2>
<p>Telefon: <a href="tel:${tel}">${esc(nap.phone_display)}</a><br>E-Mail: <a href="mailto:${esc(nap.email)}">${esc(nap.email)}</a></p>
<h2>Umsatzsteuer</h2>
<p>Als Kleinunternehmer im Sinne von § 19 UStG erheben wir keine Umsatzsteuer und weisen diese daher auch nicht aus. Alle genannten Preise sind Endpreise.</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>${esc(nap.inhaber)}, Anschrift wie oben.</p>
<h2>EU-Streitschlichtung</h2>
<p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" rel="nofollow" target="_blank">ec.europa.eu/consumers/odr</a>. Unsere E-Mail-Adresse finden Sie oben.</p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung für Inhalte</h2>
<p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>
<h2>Haftung für Links</h2>
<p>Unser Angebot enthält gegebenenfalls Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.</p>
<h2>Urheberrecht</h2>
<p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.</p>`;
  write('/impressum/', head('Impressum | Blankstein', mkMeta(`Impressum von Blankstein, Marke der ${nap.rechtstraeger} in ${nap.zip} ${nap.city}. Telefon ${nap.phone_display}, E-Mail ${nap.email}.`), '/impressum/', orgSchema(), { og: { slug: 'impressum', motif: 'hub-steinreinigung-einfahrt' } }) + header + legalShell('Impressum', body) + footer + SCTA + FOOT_JS + '</body></html>');
  written.push('/impressum/');
}
// Datenschutz beschreibt NUR real eingebundene Dienste (Spec §3.8/§6.1): Web3Forms-Abschnitt nur bei echtem
// Key, GA4/GTM-Abschnitt nur bei echter GTM-ID. gates.mjs prüft diese Kopplung gegen data/config.json.
function datenschutz() {
  const verantw = `${esc(nap.rechtstraeger)}<br>vertreten durch ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))}<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}<br>Telefon: ${esc(nap.phone_display)}<br>E-Mail: ${esc(nap.email)}`;
  const w3fSec = FORM_OK ? `<h3>Anfrageformular (Web3Forms)</h3>
<p>Für Anfragen über unser Kontaktformular nutzen wir den Dienst Web3Forms (web3forms.com). Beim Absenden werden Ihre Angaben (Name, Telefon, Ort/PLZ, Flächentyp, Quadratmeter, Nachricht sowie freiwillig angehängte Fotos) an Web3Forms übermittelt und als E-Mail an unser Postfach weitergeleitet (Art. 6 Abs. 1 lit. a und b DSGVO). Hinweise unter <a href="https://web3forms.com/privacy" rel="nofollow" target="_blank">web3forms.com/privacy</a>.</p>` : '';
  const gaSec = TRACK ? `<h2>7. Web-Analyse (Google Analytics 4 / Google Tag Manager)</h2>
<p>Zur Reichweitenmessung setzen wir Google Analytics 4 und den Google Tag Manager ein (Google Ireland Limited) — ausschließlich nach Ihrer Einwilligung über den Consent-Banner (Art. 6 Abs. 1 lit. a DSGVO, Google Consent Mode v2, Voreinstellung „abgelehnt"). Ihre Einwilligung können Sie jederzeit widerrufen.</p>
<h2>8. Cookies und Einwilligung</h2>
<p>Ohne Ihre Einwilligung verwenden wir nur technisch notwendige Speicherung (z. B. um Ihre Cookie-Entscheidung zu sichern). Einwilligungspflichtige Dienste werden erst nach Zustimmung aktiviert (§ 25 TDDDG).</p>` : `<h2>7. Keine Web-Analyse, keine Marketing-Cookies</h2>
<p>Diese Website setzt derzeit keine Analyse- oder Marketing-Dienste ein und verwendet keine einwilligungspflichtigen Cookies. Sollte sich das ändern, holen wir Ihre Einwilligung vorab über einen Consent-Banner ein und aktualisieren diese Erklärung.</p>
<h2>8. Lokale Speicherung</h2>
<p>Wir verwenden ausschließlich technisch notwendige lokale Speicherung im Browser (z. B. um Eingaben im Richtpreis-Rechner während Ihres Besuchs zu behalten). Diese Daten verlassen Ihr Gerät nicht und werden von uns nicht ausgelesen.</p>`;
  const body = `<h2>1. Datenschutz auf einen Blick</h2>
<p>Wir nehmen den Schutz Ihrer persönlichen Daten ernst und behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften (DSGVO, BDSG) sowie dieser Datenschutzerklärung.</p>
<h2>2. Verantwortlicher</h2>
<p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p><p>${verantw}</p>
<h2>3. SSL-/TLS-Verschlüsselung</h2>
<p>Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung, erkennbar am „https://" in der Adresszeile.</p>
<h2>4. Hosting</h2>
<p>Diese Website wird bei einem externen Dienstleister gehostet (Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA). Beim Besuch automatisch erfasste Daten werden auf den Servern des Hosters verarbeitet; dabei kann es zu einer Übermittlung in die USA kommen (Grundlage: Standardvertragsklauseln der EU-Kommission). Das Hosting erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b und f DSGVO. Mit dem Hoster besteht ein Vertrag zur Auftragsverarbeitung.</p>
<h2>5. Server-Logfiles</h2>
<p>Der Hoster erhebt und speichert automatisch Informationen in Server-Logfiles (Browsertyp und -version, Betriebssystem, Referrer-URL, Hostname, Uhrzeit der Anfrage, IP-Adresse). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p>
<h2>6. Kontaktaufnahme</h2>
<h3>Telefon und E-Mail</h3>
<p>Wenn Sie uns per Telefon oder E-Mail kontaktieren, werden Ihre Angaben zur Bearbeitung der Anfrage gespeichert (Art. 6 Abs. 1 lit. b und f DSGVO). Eine Weitergabe an Dritte erfolgt nicht ohne Ihre Einwilligung.</p>
${w3fSec}
<h3>WhatsApp</h3>
<p>Über die WhatsApp-Schaltflächen können Sie uns per Messenger kontaktieren. Anbieter ist die WhatsApp Ireland Limited (Meta). Dabei können Daten in die USA übertragen werden. Datenschutzhinweise: <a href="https://www.whatsapp.com/legal/privacy-policy-eea" rel="nofollow" target="_blank">whatsapp.com/legal/privacy-policy-eea</a>. Die Nutzung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Alternativ erreichen Sie uns telefonisch, per E-Mail oder über das Formular.</p>
${gaSec}
<h2>9. Schriftarten</h2>
<p>Diese Website bindet ihre Schriftarten lokal vom eigenen Server ein. Es wird keine Verbindung zu Servern von Google oder Dritten aufgebaut.</p>
<h2>10. Ihre Rechte</h2>
<p>Ihnen stehen nach der DSGVO die Rechte auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) zu sowie das Recht auf Widerruf erteilter Einwilligungen (Art. 7 Abs. 3). Es genügt eine formlose Mitteilung an die oben genannten Kontaktdaten.</p>
<h2>11. Beschwerderecht</h2>
<p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg (LDA), Stahnsdorfer Damm 77, 14532 Kleinmachnow.</p>`;
  write('/datenschutz/', head('Datenschutz | Blankstein', mkMeta(`Datenschutz bei Blankstein in ${nap.city}: Umgang mit Anfragedaten per Telefon, WhatsApp und E-Mail, Hosting, lokale Schriftarten und Ihre Rechte nach DSGVO.`), '/datenschutz/', orgSchema(), { og: { slug: 'datenschutz', motif: 'proof-arbeit-2' } }) + header + legalShell('Datenschutz', body) + footer + SCTA + FOOT_JS + '</body></html>');
  written.push('/datenschutz/');
}
// /danke/ (Spec §4, Befund L5): Foto-Reminder als nächster Schritt + SLA + was jetzt passiert. noindex.
function danke() {
  const waFotos = 'Hallo Blankstein, hier kommen noch Fotos zu meiner Anfrage von eben.';
  const steps = [
    ['01', 'Wir lesen Ihre Anfrage', `Ein Inhaber prüft Belag, Zustand und Maße. ${SLA}.`],
    ['02', 'Sie bekommen den Richtpreis', 'Gerechnet exakt m² × 7 € oder 8 € — verbindlich nach Foto-Prüfung, dann mit Endpreis-Zusage.'],
    ['03', 'Termin nach Ihrem Kalender', 'Passt das Angebot, stimmen wir den Termin ab. Besichtigung vorab jederzeit möglich — kostenlos, auf Wunsch mit 1 m² Probefläche.']
  ];
  const main = `<section class="bw-hero o-hero"><div class="container">
<p class="doc-label">Anfrage eingegangen</p>
<h1 class="bw-h1">Angekommen. <em>Jetzt sind wir dran.</em></h1>
<p class="bw-lede">${SLA_HTML} — bei dringenden Fällen erreichen Sie uns direkt per Telefon.</p>
<div class="danke-foto">
<strong>Noch 30 Sekunden, die den Richtpreis beschleunigen:</strong>
<p>Schicken Sie jetzt noch zwei Fotos Ihrer Fläche per WhatsApp — eines aus der Nähe (Belag und Fugen), eines mit der ganzen Fläche. Damit können wir den Zustand meist ohne Rückfragen einschätzen.</p>
<a class="btn-wa" href="${waHref(waFotos)}" target="_blank" rel="noopener">${ICON.camera} Fotos per WhatsApp nachreichen</a>
</div>
<div class="svcz" style="margin-top:2rem">${steps.map(([n, t, d]) => `<div class="svc-row svc-row-2col"><span class="svc-num mono">${n}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></div>`).join('')}</div>
<p class="danke-back mono"><a href="/">Zurück zur Startseite</a> · <a href="tel:${tel}">${esc(nap.phone_display)}</a></p>
</div></section>`;
  write('/danke/', head('Danke — Anfrage eingegangen | Blankstein', mkMeta('Ihre Anfrage bei Blankstein ist eingegangen — Antwort werktags unter 2 Stunden. Zwei Fotos der Fläche per WhatsApp machen den Richtpreis jetzt schneller.'), '/danke/', orgSchema(), { noindex: true, pagetype: 'danke', og: { slug: 'danke', motif: 'trust-team' } }) + header + mainWrap(main) + footer + SCTA + FOOT_JS + '</body></html>');
  written.push('/danke/');
}
// 404 (Spec §4): neu gesetzt, KEIN self-canonical (opts.nocanon), noindex.
function notFound() {
  const main = `<section class="bw-hero o-hero"><div class="container">
<p class="doc-label">Fehler 404</p>
<h1 class="bw-h1">Diese Seite gibt es <em>nicht mehr</em> — oder gab es nie.</h1>
<p class="bw-lede">Der Link ist vermutlich veraltet oder vertippt. Was Sie wahrscheinlich suchen:</p>
<div class="weiter-links" style="margin-bottom:1.6rem">
<a href="/">Startseite mit allen dokumentierten Aufträgen →</a>
<a href="/preise/">Preise + Richtpreis-Rechner →</a>
<a href="/ratgeber/">Ratgeber: Stein &amp; Terrasse →</a>
<a href="/kontakt/">Kontakt — alle Wege →</a>
</div>
<div class="bw-ctas"><a href="${waHref(WA_DEFAULT)}" class="btn-wa" target="_blank" rel="noopener">${ICON.wa} Direkt anfragen</a><a href="tel:${tel}" class="btn btn-hline"><span class="mono">${esc(nap.phone_display)}</span></a></div>
</div></section>`;
  const doc = head('Seite nicht gefunden | Blankstein', mkMeta('Die aufgerufene Seite wurde nicht gefunden. Hier geht es zur Startseite, zu Preisen und Rechner sowie zum Kontakt von Blankstein Steinreinigung im Havelland.'), '/404.html', orgSchema(), { noindex: true, nocanon: true, pagetype: '404', og: { slug: '404', motif: 'hub-steinreinigung-vn' } }) + header + mainWrap(main) + footer + SCTA + FOOT_JS + '</body></html>';
  fs.writeFileSync('website/404.html', doc);
}

// ====================================================================
// SITEMAPS / robots / llms
// ====================================================================
function sitemaps() {
  const urls = written.filter(u => u !== '/danke/');
  const lm = (config.content_stand && /^\d{4}-\d{2}-\d{2}$/.test(config.content_stand)) ? `<lastmod>${config.content_stand}</lastmod>` : '';
  // Sitemap-Split (Wellen-Indexierung): URLs nach Typ in Teil-Sitemaps, ein Index verweist darauf.
  const svcSet = new Set(services.map(s => `/${s.slug}/`));
  const ortSet = new Set([...orte.map(o => `/${o.slug}/`), '/servicegebiet/']);
  const groups = { services: [], standorte: [], ratgeber: [], core: [] };
  for (const u of urls) {
    if (u.startsWith('/ratgeber')) groups.ratgeber.push(u);
    else if (svcSet.has(u)) groups.services.push(u);
    else if (ortSet.has(u)) groups.standorte.push(u);
    else groups.core.push(u);
  }
  const urlset = us => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${us.map(u => `<url><loc>${DOMAIN}${u}</loc>${lm}</url>`).join('\n')}\n</urlset>\n`;
  const parts = [];
  for (const [name, us] of Object.entries(groups)) {
    if (!us.length) continue; // leere Gruppe (Teilbuild) -> keine Datei, kein Index-Eintrag
    fs.writeFileSync(`website/sitemap-${name}.xml`, urlset(us));
    parts.push(name);
  }
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.map(n => `<sitemap><loc>${DOMAIN}/sitemap-${n}.xml</loc>${lm}</sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync('website/sitemap.xml', index);
  fs.writeFileSync('website/robots.txt', `User-agent: *\nAllow: /\n\n# AI-Crawler erlaubt (AEO/GEO — Architektur §8)\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: Claude-Web\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  const llms = `# Blankstein\n\n> Steinreinigung, Terrassenreinigung, Pflasterreinigung und Steinversiegelung im Havelland und am westlichen Berliner Rand. Verfahren: rotierende Flächenreiniger (kontrollierter Hochdruck), Neuverfugung mit Fugensand, Nano-Imprägnierung, saubere Nass-Absaugung. Richtpreis ${P.satz_basis} €/m² (mit Imprägnierung ${P.satz_impraegnierung} €/m²), Endpreise ohne versteckte Kosten. Anfrage per Foto + Maße über WhatsApp (Antwort < 2 h — werktags 8–18 Uhr) oder kostenlose Vor-Ort-Besichtigung. Sitz: ${nap.city}.\n\n## Leistungen\n${services.map(s => `- ${s.name}`).join('\n')}\n\n## Servicegebiet\n${orte.map(o => `- ${o.name} (${o.plz})`).join('\n')}\n\n## Kontakt\n- Telefon: ${nap.phone_display}\n- WhatsApp: ${waHref('Hallo Blankstein')}\n- Ort: ${nap.street}, ${nap.zip} ${nap.city}\n`;
  fs.writeFileSync('website/llms.txt', llms);
  // IndexNow-Verifikationsdatei (nur bei echtem Key) — Pipeline-Output laut Methodik §1; Platzhalter => übersprungen
  if (isReal(config.indexnow_key)) fs.writeFileSync(`website/${config.indexnow_key}.txt`, config.indexnow_key);
}

// ====================================================================
// START — Reel-Landing (Link-in-Bio, §10). Lean-Chrome, noindex, NICHT in Sitemap/Nav.
// ====================================================================
function reelStrip() {
  if (!reelsData.aktiv || !(reelsData.reels || []).length) return '';
  const items = reelsData.reels.map(r => `<a class="reel-card" href="${esc(r.url || '#')}" target="_blank" rel="noopener" aria-label="${esc(r.alt || 'Reel von Blankstein ansehen')}">${r.thumb && IMG[r.thumb] ? pic(r.thumb, { alt: r.alt || 'Reel von Blankstein', sizes: '220px' }) : ''}<span class="reel-play" aria-hidden="true">▶</span></a>`).join('');
  return `<section class="start-reels"><div class="container"><div class="section-head center"><div class="section-label reveal"><span class="spark"></span>Aus dem Feed</div><h2 class="section-title reveal" style="transition-delay:.08s">Echte Flächen, frisch gereinigt</h2></div><div class="reel-strip reveal">${items}</div></div></section>`;
}
// /start (Spec §4): Lean-Chrome bleibt, P2-Tokens, Konfigurator-KURZFORM statt Flächen-Chips.
// Ohne Web3Forms-Key: ehrlicher Hinweis + Kanäle statt Formular (NIE stiller WhatsApp-Redirect).
function start(c) {
  const url = '/start/';
  const wa = c.wa_text || WA_DEFAULT;
  const heroImg = (c.hero_img && IMG[c.hero_img]) ? `<div class="start-hero-media reveal" style="transition-delay:.16s">${pic(c.hero_img, { badge: true, alt: c.hero_alt || 'Steinreinigung im Havelland durch Blankstein', sizes: '(max-width:760px) 92vw, 520px', lcp: true })}</div>` : '';
  const steps = (c.steps || []).map((s, i) => `<div class="start-step reveal" style="transition-delay:${i * .08}s"><div class="start-step-n mono">${esc(s.n)}</div><div class="start-step-b"><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div></div>`).join('');
  const trust = (c.trust || []).map((t, i) => `<div class="start-trust-card reveal" style="transition-delay:${(i % 2) * .08}s"><h3>${esc(t.t)}</h3><p>${esc(t.d)}</p></div>`).join('');
  const pick = `<div class="hero-actions reveal" style="transition-delay:.18s"><a href="${waHref(wa)}" class="btn-wa" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto</a><a href="#preise" class="btn btn-hline">Richtpreis ausrechnen ↓</a></div>
<div class="flaeche-alts reveal" style="transition-delay:.24s"><a href="tel:${tel}" class="alt-link">${ICON.phone} Anrufen</a><a href="mailto:${esc(nap.email)}" class="alt-link">${ICON.mail} E-Mail</a>${FORM_OK ? '<a href="#anfrage" class="alt-link">Formular</a>' : ''}</div>`;
  const flOpts = (c.flaechen || []).map(fl => `<option value="${esc(fl.label)}">${esc(fl.label)}</option>`).join('') + '<option value="Andere / mehrere">Andere / mehrere</option>';
  const formSection = FORM_OK
    ? `<section class="start-form" id="anfrage-sec"><div class="container narrow"><div class="section-head center"><p class="doc-label" style="justify-content:center">${esc(c.form_title || 'Lieber per Formular?')}</p><p class="sec-sub" style="margin-inline:auto">${esc(c.fallback_lead || '')}</p></div>
<form id="anfrage" class="kf reveal" action="https://api.web3forms.com/submit" method="POST" novalidate><input type="hidden" name="access_key" value="${esc(config.web3forms_key)}"><input type="hidden" name="subject" value="Neue Anfrage über die Reel-Landing (/start)"><input type="hidden" name="from_name" value="Blankstein /start"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">
<div class="kf-row"><label>Name<input name="name" autocomplete="name" required></label><label>Telefon<input name="tel" type="tel" autocomplete="tel" required></label></div>
<div class="kf-row"><label>Fläche<select name="flaeche">${flOpts}</select></label><label>Ort / PLZ<input name="ort" autocomplete="postal-code"></label></div>
<label>Kurz zur Fläche<textarea name="anliegen" rows="3" placeholder="z. B. Einfahrt ca. 40 m², vermoost"></textarea></label>
<label class="chk2"><input type="checkbox" name="dsgvo" value="einverstanden" required><span>Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden — Details in der <a href="/datenschutz/">Datenschutzerklärung</a>.</span></label>
<button type="submit" class="btn-wa">${ICON.camera} Anfrage senden</button>
<p class="kf-hint mono">${SLA_HTML}.</p>
</form>
</div></section>`
    : `<section class="start-form" id="anfrage-sec"><div class="container narrow"><div class="section-head center"><p class="doc-label" style="justify-content:center">Kein WhatsApp?</p><p class="sec-sub" style="margin-inline:auto">Das Online-Formular schalten wir gerade frei. Bis dahin erreichst du uns genauso schnell hier:</p></div>
<div class="kf-off-ways" style="justify-content:center"><a class="btn btn-hline" href="tel:${tel}">${ICON.phone} <span class="mono">${esc(nap.phone_display)}</span></a><a class="btn btn-hline" href="mailto:${esc(nap.email)}">${ICON.mail} ${esc(nap.email)}</a></div>
</div></section>`;
  const main = `<section class="start-hero"><div class="container"><div class="start-hero-grid">
<div class="start-hero-copy">
<p class="doc-label reveal">${esc(c.eyebrow)}</p>
<h1 class="reveal" style="transition-delay:.06s">${esc(c.h1)} <em>${esc(c.h1_em)}</em></h1>
<p class="lead reveal" style="transition-delay:.12s">${esc(c.lead)}</p>
${pick}
</div>
${heroImg}
</div></div></section>
${konfigSection({ kurz: true, kontext: 'Reel-Landing /start', title: 'Rechne deinen Richtpreis aus.', sub: 'Fläche, Größe, Paket — gerechnet wird exakt m² × 7 € oder 8 €. Ohne Kontaktdaten, ohne Verpflichtung.' })}
<section class="start-steps"><div class="container"><div class="section-head center"><h2 class="sec-h2" style="margin-inline:auto;text-align:center">${esc(c.steps_title || 'So einfach gehts')}</h2></div><div class="start-steps-grid">${steps}</div></div></section>
${reelStrip()}
<section class="start-trust"><div class="container"><div class="section-head center"><h2 class="sec-h2" style="margin-inline:auto;text-align:center">${esc(c.trust_title || 'Warum Blankstein')}</h2></div><div class="start-trust-grid">${trust}</div></div></section>
${formSection}
<section class="doors-sec" style="padding-top:0"><div class="container">
<div class="proto-bridge"><p><strong>${esc(c.cta_title)}</strong> ${esc(c.cta_sub)}</p><a href="${waHref(wa)}" class="btn-wa" target="_blank" rel="noopener">${ICON.wa} Angebot per WhatsApp</a></div>
</div></section>`;
  // Mess-Schaerfe: generate_lead NUR bei erfolgreichem Formular-Submit (Spec §3.8); ohne Key kein Formular-JS.
  const startJS = FORM_OK ? `<script>(function(){var dl=window.dataLayer=window.dataLayer||[];function q(){try{return JSON.parse(sessionStorage.getItem('bs_utm')||'{}')}catch(e){return {}}}var f=document.getElementById('anfrage');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}var b=f.querySelector('button[type=submit]'),o=b.innerHTML;b.disabled=true;b.textContent='Wird gesendet…';var fd=new FormData(f),u=q();if(Object.keys(u).length)fd.append('herkunft',JSON.stringify(u));fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:fd}).then(function(r){return r.json()}).then(function(j){if(j&&j.success){dl.push({event:'generate_lead',via:'form_start',utm:u});location.href='/danke/'}else{b.disabled=false;b.innerHTML=o;alert('Es gab ein Problem beim Senden. Bitte ruf uns kurz an.')}}).catch(function(){b.disabled=false;b.innerHTML=o;alert('Es gab ein Problem beim Senden. Bitte ruf uns kurz an.')})})})();</script>` : '';
  const schema = `${orgSchema()},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Angebot per Foto', url }])}`;
  write(url, head(clampTitle(c.title), mkMeta(c.meta), url, schema, { noindex: true, pagetype: 'start', og: { slug: 'start', motif: 'hub-steinreinigung-vn' } }) + leanHeader(wa) + '<main id="main">' + main + '</main>' + leanFooter + sctaBar(wa) + konfigJS + LEAN_FOOT_JS + startJS + '</body></html>');
  // KEIN written.push -> bewusst NICHT in Sitemap/Nav (Funnel-Landing, kein SEO-Ziel)
}

// ====================================================================
// RUN
// ====================================================================
if (fs.existsSync('website')) for (const e of fs.readdirSync('website')) { try { fs.rmSync(`website/${e}`, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 }); } catch (err) { console.warn(`WARN wipe ${e}: ${err.code}`); } }
home();
// Money-Hubs: nur Services mit Copy-Eintrag
for (const s of services) { const c = hubCopy[s.slug]; if (c) hub(s, c); }
// Orts-Hubs: nur Orte mit Copy-Eintrag
for (const o of orte) { const oc = orteCopy[o.slug]; if (oc) ort(o, oc); }
if (Object.keys(orteCopy).length) servicegebiet();
// Ratgeber-Artikel + Übersicht
for (const r of ratList) ratgeber(r);
if (ratList.length) ratgeberIndex();
if (preiseCopy) preise(preiseCopy);
if (ueberCopy) ueberUns(ueberCopy);
bewertungen();
if (startCopy) start(startCopy);
kontakt();
impressum();
datenschutz();
danke();
notFound();
sitemaps();
// og-Jobs für scripts/build-og-images.py (liest assets/img/og-jobs.json, schreibt assets/img/og/ + website/assets/img/og/)
fs.writeFileSync('assets/img/og-jobs.json', JSON.stringify({ _meta: 'Generiert von generate.mjs — Input für scripts/build-og-images.py (og:image 1200×630 je Seite, Spec §4). Nicht von Hand editieren.', jobs: OG_JOBS }, null, 1));
fs.cpSync('assets', 'website/assets', { recursive: true });
// Asset-Budget (Spec §4 MUSS): unreferenzierte Dateien fliegen aus website/assets wieder raus.
// Referenz-Quellen: aller HTML-Output, site.css (Fonts), og-Jobs (Dateien entstehen erst im build-og-Schritt).
{
  const refs = new Set(['assets/css/site.css']);
  const collect = txt => { for (const m of txt.matchAll(/\/assets\/[A-Za-z0-9._/-]+/g)) refs.add(m[0].slice(1)); };
  const walkFiles = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) walkFiles(p, out); else out.push(p); } return out; };
  for (const f of walkFiles('website')) if (f.endsWith('.html')) collect(fs.readFileSync(f, 'utf8'));
  collect(fs.readFileSync('assets/css/site.css', 'utf8'));
  for (const j of OG_JOBS) refs.add(`assets/img/og/${j.slug}.jpg`);
  let removed = 0, kept = 0, bytes = 0;
  for (const f of walkFiles('website/assets')) {
    const rel = f.replace(/^website\//, '');
    if (!refs.has(rel)) { bytes += fs.statSync(f).size; fs.rmSync(f); removed++; } else kept++;
  }
  console.log(`Asset-Cleanup: ${removed} unreferenzierte Dateien entfernt (${(bytes / 1048576).toFixed(1)} MB), ${kept} ausgeliefert`);
}
console.log(`Generiert: ${written.length} Seiten + 404 + sitemap/robots/llms → ${written.join(', ')}`);
