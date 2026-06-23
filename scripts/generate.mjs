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
const WA_DEFAULT = 'Hallo Blankstein, ich möchte ein Angebot für meine Fläche. Ich schicke gleich ein, zwei Fotos, die ungefähren Maße und meinen Ort.';

// ---------- Title ≤60 / Meta 150–158 (escape-aware) ----------
const rlen = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').length;
function clampTitle(s) { s = (s || '').replace(/\s+/g, ' ').trim(); while (rlen(s) > 60) { const sp = s.lastIndexOf(' '); if (sp < 30) { s = s.slice(0, s.length - 1); continue; } s = s.slice(0, sp); } return s.replace(/[ ,;:–-]+$/, ''); }
const META_TAIL = ' Blankstein reinigt Stein- und Terrassenflächen im Havelland — Richtpreis ab 7 €/m², Angebot per Foto in rund 30 Minuten.';
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

// ---------- Bilder: Manifest + <picture> ----------
const IMG = JSON.parse(fs.readFileSync('assets/img/manifest.json', 'utf8'));
function pic(slug, { cls = '', alt = '', sizes = '100vw', lcp = false, decorative = false } = {}) {
  const m = IMG[slug];
  if (!m) return '';
  const ss = ext => m.widths.map(w => `/assets/img/${slug}-${w}.${ext} ${w}w`).join(', ');
  const sources = (m.avif ? `<source type="image/avif" srcset="${ss('avif')}" sizes="${sizes}">` : '') + `<source type="image/webp" srcset="${ss('webp')}" sizes="${sizes}">`;
  const aAttr = decorative ? 'alt="" role="presentation"' : `alt="${esc(alt)}"`;
  const lAttr = lcp ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  return `<picture style="display:contents">${sources}<img${cls ? ` class="${cls}"` : ''} src="/assets/img/${slug}-${m.fb_w}.${m.fb_ext}" width="${m.w}" height="${m.h}" ${aAttr} ${lAttr}></picture>`;
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
  return `{"@type":"HomeAndConstructionBusiness","@id":"${DOMAIN}/#organization","name":"${sj(nap.name)}"${legal},"description":"Steinreinigung, Terrassenreinigung, Pflasterreinigung und Steinversiegelung im Havelland und am westlichen Berliner Rand.","telephone":"${tel}","email":"${sj(nap.email)}","url":"${DOMAIN}/","image":"${imgAbs('og-default')}","logo":"${DOMAIN}/assets/img/logo.png","priceRange":"€€"${addr}${geo}${oh}${svcType}${areaServed}${offers}}`;
}
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
function head(title, desc, canonical, schemaGraph, opts = {}) {
  const om = IMG['og-default'];
  const ogImg = `<meta property="og:image" content="${DOMAIN}/assets/img/og-default-${om.fb_w}.${om.fb_ext}"><meta property="og:image:width" content="${om.w}"><meta property="og:image:height" content="${om.h}"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:card" content="summary_large_image">`;
  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${ANALYTICS_HEAD}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${opts.noindex ? '\n<meta name="robots" content="noindex, follow">' : ''}
<link rel="canonical" href="${DOMAIN}${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${DOMAIN}${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Blankstein">${ogImg}
<link rel="icon" type="image/png" href="/assets/img/logo.png">
<link rel="preload" href="/assets/fonts/sora-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${CSS_VER}">
<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[${schemaGraph}]}</script>
</head><body${opts.pagetype ? ` data-pagetype="${opts.pagetype}"` : ''}>${ANALYTICS_BODY}`;
}
const NAV = [['Leistungen', '/#leistungen'], ['Servicegebiet', '/servicegebiet/'], ['Ratgeber', '/ratgeber/'], ['Preise', '/preise/'], ['Kontakt', '/kontakt/']];
const header = `<header class="header" id="header"><div class="container"><div class="header-inner">
<a href="/" aria-label="Blankstein Startseite">${logoImg('logo', 'header-logo', 34)}</a>
<nav><ul class="header-nav" id="nav-list">${NAV.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></nav>
<div class="header-right"><a href="${waHref(WA_DEFAULT)}" class="btn-header header-cta" target="_blank" rel="noopener">Angebot per Foto</a>
<button class="menu-toggle" id="menu-toggle" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span><span></span></button></div>
</div></div></header>`;
const sctaBar = waText => `<nav class="scta" aria-label="Schnellkontakt"><a class="call" href="tel:${tel}">${ICON.phone} Anrufen</a><a class="wa" href="${waHref(waText)}" target="_blank" rel="noopener">WhatsApp</a></nav>`;
const SCTA = sctaBar(WA_DEFAULT);
const footer = `<footer class="footer"><div class="container"><div class="footer-inner">
${logoImg('logo-weiss', 'footer-logo', 26)}
<span class="footer-copy">© 2026 Blankstein · ${esc(nap.rechtstraeger)} · ${esc(nap.city)} · ${esc(nap.phone_display)}</span>
<ul class="footer-links"><li><a href="/servicegebiet/">Servicegebiet</a></li><li><a href="/ratgeber/">Ratgeber</a></li><li><a href="/preise/">Preise</a></li><li><a href="/kontakt/">Kontakt</a></li><li><a href="/impressum/">Impressum</a></li><li><a href="/datenschutz/">Datenschutz</a></li></ul>
</div></div></footer>`;
// Schlankes Chrome fuer die Reel-Landing /start (distraction-free: Logo + 1 CTA, KEIN Nav-Menue/Hamburger; Footer nur Pflichtlinks).
const leanHeader = wa => `<header class="header header-lean" id="header"><div class="container"><div class="header-inner">
<a href="/" aria-label="Blankstein Startseite">${logoImg('logo', 'header-logo', 34)}</a>
<a href="${waHref(wa)}" class="btn-header header-cta" target="_blank" rel="noopener">${ICON.wa} Angebot per Foto</a>
</div></div></header>`;
const leanFooter = `<footer class="footer"><div class="container"><div class="footer-inner">
${logoImg('logo-weiss', 'footer-logo', 26)}
<span class="footer-copy">© 2026 Blankstein · ${esc(nap.rechtstraeger)} · ${esc(nap.city)} · ${esc(nap.phone_display)}</span>
<ul class="footer-links"><li><a href="/impressum/">Impressum</a></li><li><a href="/datenschutz/">Datenschutz</a></li></ul>
</div></div></footer>`;
const navJS = `<script>(function(){var h=document.getElementById('header'),t=document.getElementById('menu-toggle'),n=document.getElementById('nav-list');addEventListener('scroll',function(){h.classList.toggle('scrolled',scrollY>8)},{passive:true});if(t){t.addEventListener('click',function(){var o=h.classList.toggle('nav-open');t.setAttribute('aria-expanded',o)});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){h.classList.remove('nav-open');t.setAttribute('aria-expanded',false)})})}})();</script>`;
const revealJS = `<script>if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)})}else{document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('visible')})}setTimeout(function(){document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('visible')})},2600);</script>`;
const fabChat = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
const fab = `<div class="fab" id="fab"><div class="fab-menu"><a href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener" class="fab-item"><span class="fab-ic">${ICON.wa}</span>WhatsApp</a><a href="tel:${tel}" class="fab-item"><span class="fab-ic">${ICON.phone}</span>Anrufen</a><a href="mailto:${esc(nap.email)}" class="fab-item"><span class="fab-ic">${ICON.mail}</span>E-Mail</a></div><button class="fab-toggle" type="button" aria-label="Schnellkontakt öffnen" aria-expanded="false">${fabChat}</button></div>`;
const fabJS = `<script>(function(){var f=document.getElementById('fab');if(!f)return;var b=f.querySelector('.fab-toggle');b.addEventListener('click',function(e){e.stopPropagation();var o=f.classList.toggle('open');b.setAttribute('aria-expanded',o)});document.addEventListener('click',function(e){if(!f.contains(e.target))f.classList.remove('open')});addEventListener('keydown',function(e){if(e.key==='Escape')f.classList.remove('open')})})();</script>`;
const tiltJS = `<script>(function(){if(!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.documentElement.classList.add('has-tilt');document.querySelectorAll('.svc-card').forEach(function(c){var raf=0;c.addEventListener('pointermove',function(e){if(raf)return;raf=requestAnimationFrame(function(){raf=0;var r=c.getBoundingClientRect();var px=(e.clientX-r.left)/r.width-.5;var py=(e.clientY-r.top)/r.height-.5;c.style.setProperty('--ry',(px*5).toFixed(2)+'deg');c.style.setProperty('--rx',(-py*5).toFixed(2)+'deg');c.classList.add('is-tilting')})});c.addEventListener('pointerleave',function(){c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg');c.classList.remove('is-tilting')})})})();</script>`;
const lbJS = `<script>(function(){var items=[].slice.call(document.querySelectorAll('[data-lb]'));if(!items.length)return;var ov=document.createElement('div');ov.className='lightbox';ov.setAttribute('aria-hidden','true');ov.innerHTML='<button class="lb-close" type="button" aria-label="Schliessen">&times;</button><button class="lb-nav lb-prev" type="button" aria-label="Vorheriges Bild">&#8249;</button><button class="lb-nav lb-next" type="button" aria-label="Naechstes Bild">&#8250;</button>';document.body.appendChild(ov);var im=document.createElement('img');im.className='lb-img';im.alt='';ov.insertBefore(im,ov.querySelector('.lb-next'));var cur=0;function srcOf(el){var i=el.querySelector('img');return i?(i.currentSrc||i.src):''}function show(i){cur=(i+items.length)%items.length;im.src=srcOf(items[cur]);var a=items[cur].querySelector('img');im.alt=a?a.alt:''}function open(i){show(i);ov.classList.add('open');ov.setAttribute('aria-hidden','false')}function close(){ov.classList.remove('open');ov.setAttribute('aria-hidden','true')}items.forEach(function(el,i){el.addEventListener('click',function(e){e.preventDefault();open(i)})});ov.querySelector('.lb-close').addEventListener('click',close);ov.querySelector('.lb-prev').addEventListener('click',function(e){e.stopPropagation();show(cur-1)});ov.querySelector('.lb-next').addEventListener('click',function(e){e.stopPropagation();show(cur+1)});ov.addEventListener('click',function(e){if(e.target===ov)close()});addEventListener('keydown',function(e){if(!ov.classList.contains('open'))return;if(e.key==='Escape')close();else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='ArrowRight')show(cur+1)})})();</script>`;
const rgTocJS = `<script>(function(){var toc=document.querySelector('.rg-toc');if(!toc)return;var links=toc.querySelectorAll('a');var secs=document.querySelectorAll('.rg-section[id]');if(!secs.length)return;var byId={};links.forEach(function(a){byId[a.getAttribute('href').slice(1)]=a});var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.remove('is-active')});var a=byId[e.target.id];if(a)a.classList.add('is-active')}})},{rootMargin:'-15% 0px -75% 0px'});secs.forEach(function(s){io.observe(s)})})();</script>`;
const geoMapJS = `<script>(function(){var m=document.getElementById('svc-map');if(!m)return;function set(slug,on){var p=m.querySelector('.svc-pin[data-slug="'+slug+'"]');var c=document.querySelector('.ort-card[data-slug="'+slug+'"]');if(p)p.classList.toggle('is-active',on);if(c)c.classList.toggle('is-active',on)}function bind(el){var s=el.getAttribute('data-slug');el.addEventListener('mouseenter',function(){set(s,true)});el.addEventListener('mouseleave',function(){set(s,false)});el.addEventListener('focus',function(){set(s,true)});el.addEventListener('blur',function(){set(s,false)})}document.querySelectorAll('.ort-card[data-slug]').forEach(bind);m.querySelectorAll('.svc-pin[data-slug]').forEach(bind)})();</script>`;
// UTM-Erfassung (site-weit): liest utm_* aus URL, persistiert in sessionStorage, pusht in dataLayer (greift bei echter GTM-ID)
// UND reicht die Quelle bis zum Lead durch — haengt sie an alle WhatsApp-Texte + ins Kontakt-Formular. Funktioniert auch OHNE GA4-Key.
const utmJS = `<script>(function(){try{var p=new URLSearchParams(location.search),keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'],u={},has=false;keys.forEach(function(k){var v=p.get(k);if(v){u[k]=v;has=true}});var K='bs_utm';if(has){try{sessionStorage.setItem(K,JSON.stringify(u))}catch(e){}}else{try{u=JSON.parse(sessionStorage.getItem(K)||'{}')}catch(e){u={}}}if(!Object.keys(u).length)return;if(window.dataLayer)dataLayer.push({event:'utm_capture',utm:u});var f=document.querySelector('form#anfrage');if(f&&!f.querySelector('[name="herkunft"]')){var i=document.createElement('input');i.type='hidden';i.name='herkunft';i.value=JSON.stringify(u);f.appendChild(i)}}catch(e){}})();</script>`;
const FOOT_JS = navJS + revealJS + CONSENT_BANNER + TRACK_EVENTS + fab + fabJS + tiltJS + lbJS + rgTocJS + geoMapJS + utmJS;
const LEAN_FOOT_JS = navJS + revealJS + CONSENT_BANNER + TRACK_EVENTS + fab + fabJS + utmJS; // /start: nur reale Scripts (kein totes Tilt/Lightbox/Scrollspy/Map)

// ---------- FAQ-Block (native details; Schema separat via faqSchema) ----------
function faqBlock(faqs) {
  if (!faqs || !faqs.length) return '';
  const items = faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  return `<section class="faq-section" id="faq"><div class="container"><div class="section-head center"><div class="section-label"><span class="spark"></span>Häufige Fragen</div><h2 class="section-title">Was Eigenheimbesitzer uns oft fragen</h2></div><div class="faq reveal">${items}</div></div></section>`;
}

function write(url, html) {
  const dir = `website${url}`.replace(/\/$/, '');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/index.html`, html);
}
const preiseCopy = fs.existsSync('data/copy/preise.json') ? JSON.parse(fs.readFileSync('data/copy/preise.json', 'utf8')) : null;
const ueberCopy = fs.existsSync('data/copy/ueber.json') ? JSON.parse(fs.readFileSync('data/copy/ueber.json', 'utf8')) : null;
const gebietCopy = fs.existsSync('data/copy/servicegebiet.json') ? JSON.parse(fs.readFileSync('data/copy/servicegebiet.json', 'utf8')) : null;
const startCopy = fs.existsSync('data/copy/start.json') ? JSON.parse(fs.readFileSync('data/copy/start.json', 'utf8')) : null;
const reelsData = fs.existsSync('data/reels.json') ? JSON.parse(fs.readFileSync('data/reels.json', 'utf8')) : { aktiv: false, reels: [] };
const written = [];

// ====================================================================
// WIEDERVERWENDBARE SEKTIONEN (Home + Money-Hubs)
// ====================================================================
// Globale USP-Kacheln (bau-fakten, gelten fuer alle Hubs)
const USP = [
  [ICON.spray, 'Flächenreiniger statt Lanze', 'Wir reinigen mit rotierenden Flächenreinigern — gleichmäßiger Abtrag, keine Streifen, keine ausgewaschenen Fugen. Hochdruck, aber kontrolliert eingesetzt.', 'usp-flaechenreiniger', 'Rotierender Flächenreiniger an einem Hochdruckreiniger reinigt graue Pflastersteine', 'Gleichmäßiger Abtrag — ohne Streifen und ausgewaschene Fugen.'],
  [ICON.grid, 'Neuverfugung mit Sand', 'Nach der Reinigung füllen wir die Fugen mit frischem GaLaBau-Sand auf. Das hält das Pflaster stabil und bremst Unkraut aus.', 'usp-verfugung', 'Fugensand wird mit einem Besen in die Fugen von Pflastersteinen eingekehrt', 'Frischer GaLaBau-Sand hält das Pflaster stabil und bremst Unkraut.'],
  [ICON.drop, 'Nano-Imprägnierung', 'Auf Wunsch versiegeln wir die Fläche. Wasser perlt ab, Moos und Schmutz finden weniger Halt — die Fläche bleibt länger sauber.', 'usp-impraegnierung', 'Wasser perlt auf einer frisch imprägnierten Steinfläche ab', 'Auf Wunsch: Wasser perlt ab, die Fläche bleibt länger sauber.'],
  [ICON.vacuum, 'Saubere Absaugung', 'Den gelösten Schmutz saugen wir nass ab. Keine Matsch-Sauerei in Beeten, auf dem Rasen oder an der Hauswand.', 'usp-absaugung', 'Ein Nass-Sauger nimmt Schmutzwasser von einer Pflasterfläche auf', 'Schmutzwasser wird abgesaugt — keine Sauerei in den Beeten.']
];
const PROZ = [
  ['01', 'Richtpreis berechnen', 'Fläche grob schätzen, Regler ziehen — Sie sehen sofort den Rahmen. Ohne Kontaktdaten, ohne Verpflichtung.', '1 Minute'],
  ['02', 'Foto + Maße schicken', 'Ein, zwei Fotos Ihrer Fläche und die ungefähren m² per WhatsApp. Daraus kalkulieren wir Ihr konkretes Angebot.', 'per WhatsApp'],
  ['03', 'Angebot in ~30 Min', 'Reichen die Infos, bekommen Sie zeitnah ein verbindliches Angebot. Unklar oder groß? Wir kommen kostenlos vorbei.', 'in ~30 Min'],
  ['04', 'Blitzsauber', 'Zum Termin reinigen wir, verfugen neu und imprägnieren auf Wunsch — und räumen hinter uns auf.', 'Ergebnis']
];
function uspSection({ id = '', label = 'Womit wir arbeiten', title, sub, items }) {
  const cards = (items && items.length) ? items.map((it, i) => Array.isArray(it) ? it : [USP[i % USP.length][0], it.title, it.sub]) : USP;
  const bento = cards.length === 4 && cards.every(c => c[3] && IMG[c[3]]);
  let grid;
  if (bento) {
    const span = [' bento-hero', '', '', ' bento-wide'];
    grid = `<div class="bento-grid reveal">${cards.map(([ic, t, d, img, alt, lead], i) => {
      const hero = i === 0;
      const ov = `<span class="bento-eyebrow">0${i + 1}</span><h3>${t}</h3>${hero ? `<p>${lead || ''}</p>` : ''}`;
      const sz = (hero || i === 3) ? '(max-width:760px) 92vw, 480px' : '(max-width:760px) 46vw, 240px';
      return `<figure class="bento-tile${span[i]}">${pic(img, { alt: alt || t, sizes: sz })}<div class="bento-ov">${ov}</div></figure>`;
    }).join('')}</div>`;
  } else {
    grid = `<div class="usp-grid">${cards.map(([ic, t, d], i) => `<div class="usp-card reveal" style="transition-delay:${i * .08}s"><div class="usp-icon">${ic}</div><div class="usp-card-title">${t}</div><p class="usp-card-text">${d}</p></div>`).join('')}</div>`;
  }
  return `<section class="usp-section"${id ? ` id="${id}"` : ''}><div class="container">
<div class="section-head"><div class="section-label reveal"><span class="spark"></span>${esc(label)}</div>
<h2 class="section-title reveal" style="transition-delay:.08s">${esc(title)}</h2>
<p class="section-sub reveal" style="transition-delay:.16s">${esc(sub)}</p></div>
${grid}
</div></section>`;
}
function processSection({ id = 'ablauf', title, sub }) {
  return `<section class="process-section"${id ? ` id="${id}"` : ''}><div class="container">
<div class="section-head"><div class="section-label reveal"><span class="spark"></span>So läuft es ab</div>
<h2 class="section-title reveal" style="transition-delay:.08s">${esc(title)}</h2>
<p class="section-sub reveal" style="transition-delay:.16s">${esc(sub)}</p></div>
<div class="process-steps">${PROZ.map(([n, t, d, hl]) => `<div class="process-step reveal"><div class="step-number">${n}</div><div class="step-title">${t}</div><p class="step-text">${d}</p><span class="step-highlight">${hl}</span></div>`).join('')}</div>
</div></section>`;
}
function calcSection({ title = 'Was kostet Ihre Fläche?', sub = 'Fläche schätzen, Imprägnierung wählen — Sie sehen sofort den Rahmen. Ohne Kontaktdaten, ohne Verpflichtung.', range = false } = {}) {
  const exQm = 30, exBasis = exQm * P.satz_basis, exImpr = exQm * P.satz_impraegnierung;
  const exLo = Math.round(exBasis * 0.88), exHi = Math.round(exBasis * 1.12);
  return `<section class="calc-section" id="preise"><div class="container">
<div class="section-head center"><div class="section-label"><span class="spark"></span>Richtpreis-Rechner</div>
<h2 class="section-title">${esc(title)}</h2>
<p class="section-sub">${esc(sub)}</p></div>
<div class="calc-card reveal" id="calc" data-base="${P.satz_basis}" data-impr="${P.satz_impraegnierung}"${range ? ' data-range="1"' : ''}>
<div class="calc-row"><label for="calc-qm">Fläche</label><span class="calc-qm"><span id="calc-qm-val">${exQm}</span> m²</span></div>
<input type="range" min="10" max="200" step="5" value="${exQm}" class="calc-slider" id="calc-slider" aria-label="Fläche in Quadratmetern">
<div class="calc-scale"><span>10 m²</span><span>200 m²</span></div>
<div class="calc-toggle"><div><span class="lbl">Mit Nano-Imprägnierung</span><div class="sub">Langzeit-Schutz, +${P.satz_impraegnierung - P.satz_basis} €/m²</div></div>
<label class="switch"><input type="checkbox" id="calc-impr" aria-label="Mit Nano-Imprägnierung"><span class="track"></span></label></div>
<div class="calc-result"><div class="price"><span id="calc-price">${range ? `ca. ${exLo}–${exHi}` : exBasis}</span> €<small id="calc-detail">${range ? 'Spanne je nach Zustand · genauer Preis nach 2 Fotos' : `${exQm} m² × ${P.satz_basis} €/m² · inkl. Reinigung &amp; Neuverfugung`}</small></div>
<a href="${waHref(WA_DEFAULT)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.mail} ${range ? 'Genauen Preis per Foto' : 'Angebot per Foto'}</a></div>
<p class="calc-note">${range ? '<strong>Unverbindliche Spanne.</strong> Der genaue Endpreis hängt vom Zustand der Fläche ab — schicken Sie ein, zwei Fotos und die Maße, dann rechnen wir ihn exakt aus, meist in rund 30 Minuten. Alle Preise sind Endpreise.' : `<strong>Unverbindlicher Richtpreis.</strong> Das verbindliche Angebot erstellen wir nach Fotos und Maßen per WhatsApp oder bei einer kostenlosen Besichtigung. Beispiel: ${exQm} m² ≈ ${exBasis} € (Basis) bzw. ${exImpr} € (mit Imprägnierung). Alle Preise sind Endpreise.`}</p>
</div></div></section>`;
}
function gallerySection({ id = '', label = 'Ergebnisse', title, sub, items }) {
  return `<section class="gallery-section"${id ? ` id="${id}"` : ''}><div class="container">
<div class="section-head center"><div class="section-label"><span class="spark"></span>${esc(label)}</div>
<h2 class="section-title">${esc(title)}</h2>
<p class="section-sub">${esc(sub)}</p></div>
<div class="gallery-grid reveal">${items.map(([slug, alt]) => `<button type="button" class="gallery-item" data-lb aria-label="${esc(alt)} vergrößern">${pic(slug, { alt, sizes: '(max-width:560px) 92vw, (max-width:900px) 46vw, 360px' })}</button>`).join('')}</div>
</div></section>`;
}

// ---------- Echte-Beleg-Bausteine (Fotos/Videos aus echten Auftraegen) ----------
function videoEl(file, poster, label) {
  return `<video class="proof-video-el" preload="none" muted loop playsinline controls poster="/assets/img/${poster}.jpg" aria-label="Video: ${esc(label)}"><source src="/assets/video/${file}.mp4" type="video/mp4">Ihr Browser kann dieses Video nicht abspielen.</video>`;
}
function proofVideoBlock(v) { // optionaler Video-Beleg auf Hubs (data/copy/hubs.json -> proof_video)
  if (!v || !v.file) return '';
  return `<section class="proofvid-section"><div class="container"><div class="proofvid-card reveal">
<div class="proofvid-text">
<div class="section-label"><span class="spark"></span>${esc(v.label || 'Echte Arbeit')}</div>
<h2 class="section-title">${esc(v.title || 'So sieht das in echt aus.')}</h2>
<p class="section-sub">${esc(v.sub || '')}</p>
<ul class="proofvid-points">
<li>${ICON.spray} Rotierender Flächenreiniger statt Punktstrahl</li>
<li>${ICON.grid} Gleichmäßig sauber, ohne ausgewaschene Fugen</li>
<li>${ICON.shield} Echtes Equipment, echtes Ergebnis — kein Stock-Material</li>
</ul>
</div>
<figure class="proofvid-phone"><div class="proofvid-frame">${videoEl(v.file, v.poster, v.caption || v.title || '')}</div>${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ''}</figure>
</div></div></section>`;
}
function proofSection() {
  return `<section class="proof-section" id="ergebnisse"><div class="container">
<div class="proof-head reveal"><div class="section-label"><span class="spark"></span>Echte Aufträge</div>
<h2 class="section-title">Unsere Arbeit im Havelland.</h2>
<p class="section-sub">Echte Flächen, echtes Equipment, echtes Vorher-Nachher — nichts gestellt, nichts geliehen. Ziehen Sie am Regler. Es kommt laufend mehr dazu.</p></div>
<div class="proof-feature reveal">
<figure class="proof-vn"><div class="comparison" role="slider" tabindex="0" aria-label="Vorher-Nachher Eingangstreppe — mit den Pfeiltasten oder dem Regler verschieben" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">${pic('proof-vn-vorher', { cls: 'comparison-before', alt: 'Eingangstreppe vor der Reinigung — vermoost und verschmutzt', sizes: '(max-width:860px) 92vw, 540px' })}${pic('proof-vn-nachher', { cls: 'comparison-after', alt: 'Dieselbe Eingangstreppe nach der Reinigung — sauber', sizes: '(max-width:860px) 92vw, 540px' })}<span class="comparison-label label-before">Vorher</span><span class="comparison-label label-after">Nachher</span><div class="comparison-handle"></div></div><figcaption>Eingangstreppe — dieselbe Treppe vorher und nachher. Regler ziehen.</figcaption></figure>
<figure class="proof-vid"><div class="proof-vid-media">${videoEl('reel-einfahrt-vn', 'reel-einfahrt-vn-poster', 'Einfahrt im Zeitraffer — vorne vermoost, hinten gereinigt')}<span class="proof-vid-badge">${ICON.camera} Echtes Video</span></div><figcaption>Wabenpflaster-Einfahrt im Zeitraffer — vorne noch vermoost, hinten porentief gereinigt.</figcaption></figure>
</div>
<div class="proof-strip reveal">
<figure class="proof-cell">${pic('proof-arbeit-1', { alt: 'Mitarbeiter reinigt eine Hoffläche mit dem rotierenden Flächenreiniger', sizes: '(max-width:480px) 92vw, (max-width:860px) 46vw, 280px' })}<figcaption><span class="proof-tag">Mitten in der Arbeit</span>Hof-Reinigung mit dem Flächenreiniger.</figcaption></figure>
<figure class="proof-cell">${pic('proof-ergebnis-1', { alt: 'Frisch gereinigte anthrazitfarbene Pflasterfläche', sizes: '(max-width:480px) 92vw, (max-width:860px) 46vw, 280px' })}<figcaption><span class="proof-tag">Ergebnis</span>Frisch gereinigte Pflasterfläche.</figcaption></figure>
<figure class="proof-cell">${pic('proof-arbeit-2', { alt: 'Reinigung einer Terrasse mit dem Flächenreiniger', sizes: '(max-width:480px) 92vw, (max-width:860px) 46vw, 280px' })}<figcaption><span class="proof-tag">Mitten in der Arbeit</span>Reinigung einer Terrasse.</figcaption></figure>
<figure class="proof-cell">${pic('proof-ergebnis-2', { alt: 'Saubere, neu verfugte Hoffläche aus Betonpflaster', sizes: '(max-width:480px) 92vw, (max-width:860px) 46vw, 280px' })}<figcaption><span class="proof-tag">Ergebnis</span>Saubere Hoffläche, neu verfugt.</figcaption></figure>
</div>
<p class="proof-note reveal">Echte Fotos und Videos von unseren Flächen. Vorher-Nachher zeigen wir nur, wo es dieselbe Fläche ist.</p>
</div></section>`;
}
function trustStrip() {
  return `<section class="trust-strip"><div class="container"><div class="trust-inner reveal">
<figure class="trust-photo">${pic('trust-team', { alt: 'Blankstein bei der Steinreinigung mit dem Flächenreiniger vor Ort', sizes: '(max-width:760px) 92vw, 320px' })}<figcaption class="trust-photo-cap">Echtes Foto der Inhaber folgt in Kürze</figcaption></figure>
<div class="trust-body">
<div class="section-label"><span class="spark"></span>Wer bei Ihnen reinigt</div>
<h2 class="trust-h">Noah &amp; Maurice aus Falkensee.</h2>
<p>Hinter Blankstein stehen zwei Leute aus dem Havelland — kein anonymer Vermittler. Wir reinigen selbst, mit eigenem Flächenreiniger, vor Ort in Ihrer Nachbarschaft.</p>
<ul class="trust-facts">
<li>${ICON.shield} Gewerbe angemeldet, Sitz in Falkensee</li>
<li>${ICON.pin} Kurze Wege im Havelland &amp; am westlichen Berliner Rand</li>
<li>${ICON.camera} Echtes Equipment, echte Arbeit — keine Vermittlung</li>
</ul>
</div></div></div></section>`;
}

// ====================================================================
// HOME
// ====================================================================
function marqueeSection() {
  const items = [
    [ICON.camera, 'Angebot per Foto in rund 30 Minuten'],
    [ICON.shield, 'Endpreis-Zusage — kein Aufpreis'],
    [ICON.pin, 'Keine Anfahrtskosten im Servicegebiet'],
    [ICON.grid, 'Neuverfugung mit frischem Fugensand'],
    [ICON.drop, 'Nano-Imprägnierung auf Wunsch'],
    [ICON.spray, 'Havelland und westlicher Berlin-Rand']
  ];
  const run = items.map(([ic, t]) => `<span class="marquee-item">${ic} ${esc(t)}</span><span class="marquee-item marquee-sep">•</span>`).join('');
  return `<section class="marquee" aria-label="Unsere Zusagen"><div class="marquee-track">${run}${run}</div></section>`;
}
// ---------- Reviews (datengetrieben aus data/reviews.json; Empty-State bei 0 = nichts gerendert, kein Fake) ----------
const REV = (reviewsData.reviews || []).filter(r => r && r.text && r.rating);
const REV_COUNT = reviewsData.count || REV.length;
const REV_RATING = reviewsData.rating;
const REV_URL = reviewsData.profile_url || '';
const STAR = '<svg class="star-ic" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.7L12 17l-6 3.6 1.5-6.7L2.4 8.9l6.8-.6z"/></svg>';
const GOOGLE_G = '<svg class="g-ic" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.7-.06-1.4-.18-2.1H12v4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-7.9z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1-3.6 1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.5 3.2-4.4 6-4.4z"/></svg>';
function revStars(n) { let s = ''; for (let i = 1; i <= 5; i++) s += `<span class="star${i <= Math.round(n) ? '' : ' off'}">${STAR}</span>`; return `<span class="star-row">${s}</span>`; }
function reviewStars() { // kompakter Aggregat-Anker am CTA (rendert nur bei echten Reviews)
  if (!REV_COUNT) return '';
  const r = REV_RATING ? String(REV_RATING).replace('.', ',') : '';
  return `<a class="rev-anchor reveal" style="transition-delay:.3s" href="${REV_URL || '/#bewertungen'}"${REV_URL ? ' target="_blank" rel="noopener"' : ''}>${GOOGLE_G}${revStars(REV_RATING || 5)}<span class="rev-anchor-tx">${r ? r + ' · ' : ''}${REV_COUNT} Google-Bewertung${REV_COUNT === 1 ? '' : 'en'}</span></a>`;
}
function reviewsBlock() { // sichtbare Review-Cards (Empty-State bei 0)
  if (!REV.length) return '';
  const cards = REV.slice(0, 6).map(rv => `<figure class="rev-card reveal"><div class="rev-card-top">${revStars(rv.rating)}${GOOGLE_G}</div><blockquote>${esc(rv.text)}</blockquote><figcaption><span class="rev-author">${esc(rv.author)}</span>${rv.ort ? `<span class="rev-ort">${ICON.pin} ${esc(rv.ort)}</span>` : ''}${(rv.relative || rv.date) ? `<span class="rev-date">${esc(rv.relative || rv.date)}</span>` : ''}</figcaption></figure>`).join('');
  const agg = REV_RATING ? `${String(REV_RATING).replace('.', ',')} von 5 Sternen aus ${REV_COUNT} Google-Bewertungen` : `${REV_COUNT} Google-Bewertungen`;
  return `<section class="reviews-section" id="bewertungen"><div class="container"><div class="section-head center"><div class="section-label reveal"><span class="spark"></span>Bewertungen</div><h2 class="section-title reveal" style="transition-delay:.08s">Das sagen unsere Kundinnen und Kunden</h2><p class="section-sub reveal" style="transition-delay:.16s">${esc(agg)}.</p></div><div class="rev-grid">${cards}</div>${REV_URL ? `<p class="rev-more reveal"><a href="${REV_URL}" target="_blank" rel="noopener">Alle Bewertungen auf Google ansehen →</a></p>` : ''}</div></section>`;
}
function home() {
  const SVC_ALT = {
    steinreinigung: 'Frisch gereinigte Pflaster-Einfahrt vor einem Wohnhaus im Havelland',
    terrassenreinigung: 'Gereinigte Terrasse, beispielhafte Darstellung',
    pflasterreinigung: 'Frisch gereinigte helle Pflaster-Hoffläche im Havelland',
    steinversiegelung: 'Versiegelte Steinfläche mit Abperleffekt, beispielhafte Darstellung'
  };
  const GAL = [
    ['gal-weg', 'Frisch gereinigter Plattenweg entlang einer Gartenhecke im Havelland'],
    ['gal-treppe', 'Gereinigte Eingangstreppe und Vorplatz eines modernen Wohnhauses'],
    ['gal-terrasse', 'Gereinigte Terrasse mit Gartenmöbeln nach der Behandlung'],
    ['gal-flaeche', 'Frisch gereinigte großflächige Pflasterfläche vor einem Einfamilienhaus'],
    ['gal-einfahrt', 'Gereinigte Einfahrt mit Garagenzufahrt im Havelland'],
    ['gal-gartenweg', 'Frisch gereinigter roter Klinker-Gartenweg vor einem Wohnhaus']
  ];
  const faqs = [
    { q: 'Was kostet die Steinreinigung pro Quadratmeter?', a: 'Unser Richtpreis liegt bei 7 €/m² inklusive Reinigung und Neuverfugung mit frischem Fugensand, oder 8 €/m² zusätzlich mit Nano-Imprägnierung. Eine 30 m² große Terrasse liegt damit bei rund 210 bis 240 €. Das ist ein unverbindlicher Richtwert — das verbindliche Angebot erstellen wir nach Fotos und Maßen oder bei einer kostenlosen Besichtigung. Alle Preise sind Endpreise ohne versteckte Kosten.' },
    { q: 'Beschädigt der Hochdruck mein Pflaster oder meine Terrasse?', a: 'Falsch eingesetzter Hochdruck — eine Punkt-Lanze zu nah am Stein — kann Fugen auswaschen und Oberflächen aufrauen. Genau deshalb arbeiten wir mit rotierenden Flächenreinigern, die den Druck gleichmäßig über die Fläche verteilen, und verfugen anschließend neu. So wird die Fläche porentief sauber, ohne dass das Material Schaden nimmt.' },
    { q: 'Wie schnell bekomme ich ein Angebot?', a: 'Schicken Sie uns tagsüber ein, zwei Fotos und die ungefähren Maße Ihrer Fläche per WhatsApp, erhalten Sie in der Regel innerhalb von rund 30 Minuten ein konkretes Angebot. Lässt sich die Fläche aus der Ferne nicht sicher einschätzen, vereinbaren wir eine kostenlose Besichtigung vor Ort — beides unverbindlich.' },
    { q: 'In welchem Gebiet seid ihr tätig?', a: 'Wir reinigen Stein- und Terrassenflächen im Havelland und am westlichen Berliner Rand — unter anderem in Falkensee, Dallgow-Döberitz, Brieselang, Schönwalde-Glien, Wustermark, Groß Glienicke und Kladow. Falkensee ist unser Sitz, von dort sind die Wege zu Ihnen kurz und die Termine planbar.' },
    { q: 'Was bringt die Nano-Imprägnierung?', a: 'Die Imprägnierung legt einen unsichtbaren Schutzfilm auf den Stein. Wasser perlt ab, Moos und Schmutz finden weniger Halt, und die Fläche bleibt nach der Reinigung deutlich länger sauber. Sie kostet 1 €/m² mehr und lohnt sich vor allem bei schattigen oder stark bewachsenen Flächen, die sonst schnell wieder vergrünen.' },
    { q: 'Kommen Anfahrts- oder Besichtigungskosten dazu?', a: 'Nein. Innerhalb unseres Servicegebiets im Havelland und am westlichen Berliner Rand ist die Vor-Ort-Besichtigung kostenlos und unverbindlich, und es fallen keine Anfahrtskosten an. Sie zahlen ausschließlich die vereinbarte Leistung zum genannten Endpreis.' },
    { q: 'Was ist, wenn ich mit dem Ergebnis nicht zufrieden bin?', a: 'Bleibt nach unserer Reinigung sichtbarer Moos- oder Algenbelag zurück, kommen wir kostenlos nach. Und der Preis, den wir Ihnen vorab nennen, ist der Endpreis — ohne Aufpreis und ohne Nachkalkulation. So wissen Sie schon vor dem Termin genau, woran Sie sind.' }
  ];

  const main = `
<section class="hero" id="top"><div class="container"><div class="hero-grid">
<div class="hero-content">
<div class="eyebrow reveal">Steinreinigung &amp; Terrassenpflege im Havelland</div>
<h1 class="hero-headline reveal" style="transition-delay:.08s">Pflaster &amp; Terrasse —<br><em>wieder wie neu</em>.</h1>
<p class="hero-sub reveal" style="transition-delay:.16s">Pflaster, Terrasse und Einfahrt in Falkensee, Dallgow, Kladow und im ganzen Havelland — porentief gereinigt und neu verfugt.</p>
<div class="hero-actions reveal" style="transition-delay:.24s">
<a href="${waHref(WA_DEFAULT)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto anfragen</a>
<a href="/kontakt/#anfrage" class="btn btn-outline">${ICON.calendar} Kostenlose Besichtigung</a>
</div>
${reviewStars()}<div class="hero-anchor reveal" style="transition-delay:.32s">
<div class="anchor-badge"><span class="anchor-badge-icon">${ICON.shield}</span><span class="anchor-badge-text"><strong>Endpreis-Zusage</strong><span>kein Aufpreis nach dem Angebot</span></span></div>
<div class="anchor-badge"><span class="anchor-badge-icon">${ICON.clock}</span><span class="anchor-badge-text"><strong>Antwort in ~30 Min</strong><span>Foto + Maße genügen</span></span></div>
<div class="anchor-region">${ICON.pin} Havelland &amp; westlicher Berlin-Rand</div>
</div>
</div>
<div class="hero-visual reveal" style="transition-delay:.2s">
<div class="hero-slider">
<span class="hero-chip"><span class="spark"></span>Beispiel — Regler ziehen</span>
<div class="comparison" id="comparison" role="slider" tabindex="0" aria-label="Vorher-Nachher-Vergleich — mit den Pfeiltasten verschieben" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
${pic('demo-vorher', { cls: 'comparison-before', alt: 'Pflasterfläche vor der Reinigung, beispielhafte Darstellung', sizes: '(max-width:980px) 92vw, 480px', lcp: true })}
${pic('demo-nachher', { cls: 'comparison-after', alt: 'Pflasterfläche nach der Reinigung, beispielhafte Darstellung', sizes: '(max-width:980px) 92vw, 480px' })}
<span class="comparison-label label-before">Vorher</span>
<span class="comparison-label label-after">Nachher</span>
<div class="comparison-handle" id="comparison-handle"></div>
</div>
</div>
<div class="hero-slider-caption"><span class="txt">Pflasterstein-Einfahrt, Havelland — Reinigung, Neuverfugung &amp; Imprägnierung.</span><span class="tag">${esc(proof.vorher_nachher.platzhalter_label)}</span></div>
</div>
</div></div></section>

${marqueeSection()}

${uspSection({ title: 'Materialschonend — weil die Methode stimmt.', sub: 'Nicht der Hochdruck schadet dem Stein, sondern die falsche Anwendung. Wir setzen ihn kontrolliert ein und arbeiten in vier Schritten, die das Material schonen.' })}

<section class="svc-section" id="leistungen"><div class="container">
<div class="section-head"><div class="section-label reveal"><span class="spark"></span>Unsere Leistungen</div>
<h2 class="section-title reveal" style="transition-delay:.08s">Vier Flächen, ein Verfahren.</h2>
<p class="section-sub reveal" style="transition-delay:.16s">Ob Terrasse, Einfahrt oder Gehweg — wir reinigen, verfugen und versiegeln. Wählen Sie eine Leistung oder berechnen Sie den Richtpreis in einer Minute.</p></div>
<div class="svc-grid">${services.map((s, i) => { const hubUrl = hubCopy[s.slug] ? `/${s.slug}/` : '/#preise'; return `<a class="svc-card reveal" href="${hubUrl}" style="transition-delay:${(i % 2) * .08}s"><div class="svc-img">${pic('svc-' + s.slug, { alt: SVC_ALT[s.slug] || (s.name + ' im Havelland'), sizes: '(max-width:980px) 92vw, 560px' })}</div><div class="svc-body"><span class="no">0${i + 1}</span><h3>${esc(s.name)}</h3><p>${esc((s.sektionen || []).slice(0, 4).join(' · '))}</p><span class="go">${hubCopy[s.slug] ? 'Mehr erfahren' : 'Richtpreis berechnen'} →</span></div></a>`; }).join('')}</div>
</div></section>

${proofSection()}

${trustStrip()}

${calcSection()}

<div class="container guarantee"><div class="guarantee-card reveal"><span class="guarantee-icon">${ICON.shield}</span><span class="guarantee-text"><strong>Bleibt Moos oder Algen zurück, kommen wir kostenlos nach.</strong><span>Der Preis aus dem Angebot ist der Endpreis — kein Aufpreis, keine Nachkalkulation.</span></span></div></div>

${processSection({ title: 'In vier Schritten zur sauberen Fläche.', sub: 'Der schnellste Weg führt über ein Foto. Reicht das nicht, kommen wir kostenlos vorbei — Sie entscheiden nicht allein, die Info-Lage entscheidet.' })}

<section class="cta-band" id="kontakt"><div class="container"><div class="cta-card reveal">
<div class="cta-text"><div class="cta-eyebrow"><span class="spark"></span>Jetzt anfragen</div>
<h2 class="cta-title">Bereit für eine saubere Fläche?</h2>
<p class="cta-subtitle">Foto + Maße genügen — Angebot in rund 30 Minuten. Havelland &amp; westlicher Berlin-Rand.</p></div>
<div class="cta-actions">
<a href="${waHref(WA_DEFAULT)}" class="btn btn-primary" target="_blank" rel="noopener"><span class="wa-icon">${ICON.wa}</span> Angebot per WhatsApp</a>
<a href="/kontakt/#anfrage" class="btn btn-outline">Zum Kontaktformular</a></div>
</div></div></section>

${faqBlock(faqs)}`;

  const schema = `${orgSchema()},${breadcrumb([{ name: 'Start', url: '/' }])}${faqSchema('/', faqs)}`;
  const title = clampTitle('Steinreinigung & Terrassenpflege Havelland | Blankstein');
  const meta = mkMeta('Steinreinigung, Terrassen- und Pflasterreinigung im Havelland: Flächenreiniger, Neuverfugung und Nano-Imprägnierung. Richtpreis ab 7 €/m², Angebot per Foto.');
  write('/', head(title, meta, '/', schema, { pagetype: 'home' }) + header + main + footer + SCTA + sliderJS + calcJS + FOOT_JS + '</body></html>');
  written.push('/');
}

// Vorher/Nachher-Slider-JS
const sliderJS = `<script>(function(){document.querySelectorAll('.comparison').forEach(function(c){var a=c.querySelector('.comparison-after'),h=c.querySelector('.comparison-handle');if(!a||!h)return;var d=false,cur=50;function set(p){p=Math.min(Math.max(p,2),98);cur=p;a.style.clipPath='inset(0 0 0 '+p+'%)';h.style.left=p+'%';c.setAttribute('aria-valuenow',Math.round(p))}function px(x){var r=c.getBoundingClientRect();return((x-r.left)/r.width)*100}c.addEventListener('mousedown',function(e){d=true;set(px(e.clientX));e.preventDefault()});addEventListener('mousemove',function(e){if(d)set(px(e.clientX))});addEventListener('mouseup',function(){d=false});c.addEventListener('touchstart',function(e){d=true;set(px(e.touches[0].clientX))},{passive:true});c.addEventListener('touchmove',function(e){if(d){set(px(e.touches[0].clientX));e.preventDefault()}},{passive:false});c.addEventListener('touchend',function(){d=false});c.addEventListener('keydown',function(e){var k=e.key;if(k==='ArrowLeft'||k==='ArrowDown'){set(cur-4);e.preventDefault()}else if(k==='ArrowRight'||k==='ArrowUp'){set(cur+4);e.preventDefault()}else if(k==='Home'){set(0);e.preventDefault()}else if(k==='End'){set(100);e.preventDefault()}});set(50)})})();</script>`;
// m²-Rechner-JS
const calcJS = `<script>(function(){var box=document.getElementById('calc');if(!box)return;var b=+box.dataset.base,im=+box.dataset.impr,sl=document.getElementById('calc-slider'),qv=document.getElementById('calc-qm-val'),pr=document.getElementById('calc-price'),dt=document.getElementById('calc-detail'),cb=document.getElementById('calc-impr');function upd(){var q=+sl.value,rate=cb.checked?im:b;qv.textContent=q;if(box.dataset.range){pr.textContent='ca. '+Math.round(q*rate*0.88)+'–'+Math.round(q*rate*1.12);dt.textContent='Spanne je nach Zustand · genauer Preis nach 2 Fotos';}else{pr.textContent=q*rate;dt.innerHTML=q+' m² × '+rate+' €/m² · '+(cb.checked?'inkl. Reinigung, Neuverfugung & Imprägnierung':'inkl. Reinigung & Neuverfugung');}var pct=(q-10)/(200-10)*100;sl.style.background='linear-gradient(to right,var(--blue) 0%,var(--blue) '+pct+'%,var(--stone) '+pct+'%,var(--stone) 100%)'}sl.addEventListener('input',upd);cb.addEventListener('change',upd);upd()})();</script>`;

// ====================================================================
// MONEY-HUB (Service-Pillar — Template Architektur §2; Copy aus data/copy/hubs.json)
// ====================================================================
function hub(s, c) {
  const url = `/${s.slug}/`;
  const waMsg = `Hallo Blankstein, ich möchte ein Angebot für ${s.name} — ich schicke gleich ein, zwei Fotos und die ungefähren Maße.`;
  // Optionale, service-spezifische Felder mit Default = Steinreinigung-Master
  const eduImg = (c.edu_img && IMG[c.edu_img]) ? c.edu_img : 'schaden-hochdruck';
  const eduAlt = c.edu_alt || 'Ausgewaschene Fugen und lose Pflastersteine nach falsch eingesetztem Hochdruck';
  const eduCaption = c.edu_caption || 'Typischer Schaden durch eine falsch eingesetzte Punkt-Lanze.';

  const main = `
<section class="hero" id="top"><div class="container"><div class="hero-grid">
<div class="hero-content">
<div class="eyebrow reveal">${esc(c.eyebrow)}</div>
<h1 class="hero-headline reveal" style="transition-delay:.08s">${esc(c.h1)}<br><em>${esc(c.h1_em)}</em></h1>
<p class="hero-sub reveal" style="transition-delay:.16s">${esc(c.intro)}</p>
<div class="hero-actions reveal" style="transition-delay:.24s">
<a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto anfragen</a>
<a href="/kontakt/#anfrage" class="btn btn-outline">${ICON.calendar} Kostenlose Besichtigung</a>
</div>
${reviewStars()}<div class="hero-anchor reveal" style="transition-delay:.32s">
<div class="anchor-badge"><span class="anchor-badge-icon">${ICON.shield}</span><span class="anchor-badge-text"><strong>Endpreis-Zusage</strong><span>kein Aufpreis nach dem Angebot</span></span></div>
<div class="anchor-badge"><span class="anchor-badge-icon">${ICON.clock}</span><span class="anchor-badge-text"><strong>Antwort in ~30 Min</strong><span>Foto + Maße genügen</span></span></div>
<div class="anchor-region">${ICON.pin} Havelland &amp; westlicher Berlin-Rand</div>
</div>
</div>
<div class="hero-visual reveal" style="transition-delay:.2s">
<div class="hero-slider hero-static">${pic(c.hero_img, { cls: 'hero-img', alt: c.hero_alt || (s.name + ' im Havelland'), sizes: '(max-width:980px) 92vw, 480px', lcp: true })}</div>
</div>
</div></div></section>

<section class="edu-section"><div class="container"><div class="edu-grid">
<div class="edu-text">
<div class="section-label reveal"><span class="spark"></span>Ehrlich gesagt</div>
<h2 class="section-title reveal" style="transition-delay:.08s">${esc(c.schaden_title)}</h2>
${(c.schaden_body || []).map((p, i) => `<p class="edu-p reveal" style="transition-delay:${(.16 + i * .06).toFixed(2)}s">${esc(p)}</p>`).join('')}
</div>
<figure class="edu-visual reveal">${pic(eduImg, { alt: eduAlt, sizes: '(max-width:900px) 92vw, 420px' })}<figcaption>${esc(eduCaption)} <span class="tag">${esc(proof.vorher_nachher.platzhalter_label)}</span></figcaption></figure>
</div></div></section>

${proofVideoBlock(c.proof_video)}

${uspSection({ title: c.usp_title, sub: c.usp_sub, items: c.usp_items })}

<section class="svc-section"><div class="container">
<div class="section-head"><div class="section-label reveal"><span class="spark"></span>Leistungsumfang</div>
<h2 class="section-title reveal" style="transition-delay:.08s">${esc(c.leistung_title)}</h2>
<p class="section-sub reveal" style="transition-delay:.16s">${esc(c.leistung_sub)}</p></div>
<div class="svc-grid">${(c.leistungsumfang || []).map((l, i) => `<div class="svc-card reveal" style="transition-delay:${(i % 2) * .08}s">${l.img && IMG[l.img] ? `<div class="svc-img">${pic(l.img, { alt: l.alt || (l.h + ' im Havelland'), sizes: '(max-width:980px) 92vw, 560px' })}</div>` : ''}<div class="svc-body"><h3>${esc(l.h)}</h3><p>${esc(l.t)}</p></div></div>`).join('')}</div>
</div></section>

${calcSection()}

${processSection({ title: 'In vier Schritten zur sauberen Fläche.', sub: 'Der schnellste Weg führt über ein Foto. Reicht das nicht, kommen wir kostenlos vorbei — Sie entscheiden nicht allein, die Info-Lage entscheidet.' })}

${reviewsBlock()}

${faqBlock(c.faqs)}

<section class="gebiet-section"><div class="container"><div class="gebiet-inner reveal">
<div class="section-label"><span class="spark"></span>Servicegebiet</div>
<h2 class="section-title">Wo wir reinigen</h2>
<p class="section-sub">${esc(c.gebiet_text)}</p>
<ul class="gebiet-list">${orte.map(o => orteCopy[o.slug] ? `<li><a href="/${o.slug}/">${ICON.pin} ${esc(o.name)}</a></li>` : `<li>${ICON.pin} ${esc(o.name)}</li>`).join('')}</ul>
<p class="gebiet-more"><a href="/servicegebiet/">Alle Orte im Servicegebiet →</a></p>
</div></div></section>

<section class="cta-band" id="kontakt"><div class="container"><div class="cta-card reveal">
<div class="cta-text"><div class="cta-eyebrow"><span class="spark"></span>Jetzt anfragen</div>
<h2 class="cta-title">${esc(c.cta_title)}</h2>
<p class="cta-subtitle">${esc(c.cta_sub)}</p>
<p class="cta-garantie">${ICON.shield} ${esc(c.garantie_text)}</p></div>
<div class="cta-actions">
<a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener"><span class="wa-icon">${ICON.wa}</span> Angebot per WhatsApp</a>
<a href="/kontakt/#anfrage" class="btn btn-outline">Zum Kontaktformular</a></div>
</div></div></section>`;

  const areaServed = `[${orte.map(o => `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`).join(',')},{"@type":"AdministrativeArea","name":"Havelland"}]`;
  const svcSchema = `{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"${sj(s.name)}","serviceType":"${sj(s.name)}","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed},"description":"${sj(c.meta)}","offers":{"@type":"Offer","priceCurrency":"EUR","price":"${s.slug === 'steinversiegelung' ? P.satz_impraegnierung : P.satz_basis}","description":"${s.slug === 'steinversiegelung' ? 'Richtpreis pro Quadratmeter inkl. Reinigung, Neuverfugung und Nano-Imprägnierung, Endpreis ohne versteckte Kosten.' : 'Richtpreis pro Quadratmeter inkl. Reinigung und Neuverfugung, Endpreis ohne versteckte Kosten.'}"}}`;
  const schema = `${orgSchema()},${svcSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: s.name, url }])}${faqSchema(url, c.faqs)}`;
  write(url, head(clampTitle(c.title), mkMeta(c.meta), url, schema, { pagetype: 'hub' }) + header + main + footer + sctaBar(waMsg) + calcJS + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// ORTS-HUB (lokaler Hub /{ort}/ — Stein + Terrasse als H2-Sektionen; Copy aus data/copy/orte.json)
// ====================================================================
function ort(o, oc) {
  const url = `/${o.slug}/`;
  const waMsg = `Hallo Blankstein, ich möchte ein Angebot für meine Fläche in ${o.name}. Ich schicke gleich ein, zwei Fotos und die ungefähren Maße.`;
  const nachbarHtml = (oc.nachbarorte || []).map(slug => {
    const n = orte.find(x => x.slug === slug); if (!n) return '';
    return orteCopy[slug] ? `<a href="/${slug}/">${esc(n.name)}</a>` : `<span>${esc(n.name)}</span>`;
  }).filter(Boolean).join(' · ');

  const main = `
<section class="hero" id="top"><div class="container"><div class="hero-grid">
<div class="hero-content">
<div class="eyebrow reveal">${esc(oc.eyebrow)}</div>
<h1 class="hero-headline reveal" style="transition-delay:.08s">${esc(oc.h1.replace(/\s*[—–-]\s*$/, ''))}<br><em>${esc(oc.h1_em)}</em></h1>
<p class="hero-sub reveal" style="transition-delay:.16s">${esc(oc.intro)}</p>
<div class="hero-actions reveal" style="transition-delay:.24s">
<a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto anfragen</a>
<a href="/kontakt/#anfrage" class="btn btn-outline">${ICON.calendar} Kostenlose Besichtigung</a>
</div>
${reviewStars()}<div class="hero-anchor reveal" style="transition-delay:.32s">
<div class="anchor-badge"><span class="anchor-badge-icon">${ICON.shield}</span><span class="anchor-badge-text"><strong>Endpreis-Zusage</strong><span>kein Aufpreis nach dem Angebot</span></span></div>
<div class="anchor-badge"><span class="anchor-badge-icon">${ICON.pin}</span><span class="anchor-badge-text"><strong>${esc(o.name)} &amp; Umgebung</strong><span>kurze Wege, keine Anfahrtskosten</span></span></div>
</div>
</div>
<div class="hero-visual reveal" style="transition-delay:.2s">
<div class="hero-slider hero-static">${pic(oc.hero_img, { cls: 'hero-img', alt: oc.hero_alt || (o.name + ' — Blankstein'), sizes: '(max-width:980px) 92vw, 480px', lcp: true })}</div>
</div>
</div></div></section>

<section class="edu-section"><div class="container"><div class="ort-intro reveal">
<div class="section-label"><span class="spark"></span>${esc(o.name)} im Havelland</div>
<h2 class="section-title">${esc(oc.lokal_title)}</h2>
${(oc.lokal_body || []).map(p => `<p class="edu-p">${esc(p)}</p>`).join('')}
</div></div></section>

${uspSection({ title: 'Materialschonend — weil die Methode stimmt.', sub: `Vier Schritte, die wir bei jeder Fläche in ${o.name} gleich sauber durchziehen — vom ersten Strahl bis zur fertig verfugten, geschützten Fläche.` })}

<section class="svc-section"><div class="container"><div class="edu-grid">
<div class="edu-text">
<div class="section-label reveal"><span class="spark"></span>Steinreinigung in ${esc(o.name)}</div>
<h2 class="section-title reveal" style="transition-delay:.08s">Pflaster, Einfahrt &amp; Hof in ${esc(o.name)}</h2>
<p class="edu-p reveal" style="transition-delay:.16s">${esc(oc.stein_text)}</p>
<a class="go" href="/steinreinigung/">Mehr zur Steinreinigung →</a>
</div>
<figure class="edu-visual reveal">${pic('hub-steinreinigung-gal5', { alt: `Frisch gereinigte Pflasterfläche in ${o.name}`, sizes: '(max-width:900px) 92vw, 420px' })}</figure>
</div></div></section>

<section class="usp-section"><div class="container"><div class="edu-grid">
<div class="edu-text">
<div class="section-label reveal"><span class="spark"></span>Terrassenreinigung in ${esc(o.name)}</div>
<h2 class="section-title reveal" style="transition-delay:.08s">Terrasse reinigen in ${esc(o.name)}</h2>
<p class="edu-p reveal" style="transition-delay:.16s">${esc(oc.terrasse_text)}</p>
<a class="go" href="/terrassenreinigung/">Mehr zur Terrassenreinigung →</a>
</div>
<figure class="edu-visual reveal">${pic('hub-terrasse-heroimg', { alt: `Gereinigte Terrasse in ${o.name}`, sizes: '(max-width:900px) 92vw, 420px' })}</figure>
</div></div></section>

${calcSection()}

${processSection({ title: 'In vier Schritten zur sauberen Fläche.', sub: `Der schnellste Weg führt über ein Foto. Reicht das nicht, kommen wir kostenlos vorbei — in ${o.name} sind die Wege kurz.` })}

<section class="gebiet-section"><div class="container"><div class="gebiet-inner reveal">
<div class="section-label"><span class="spark"></span>Servicegebiet</div>
<h2 class="section-title">Wo wir in ${esc(o.name)} reinigen</h2>
<p class="section-sub">${esc(oc.gebiet_text)}</p>
${(oc.stadtteile && oc.stadtteile.length) ? `<ul class="gebiet-list">${oc.stadtteile.map(t => `<li>${ICON.pin} ${esc(t)}</li>`).join('')}</ul>` : ''}
${nachbarHtml ? `<p class="ort-nachbar">Auch in der Nähe: ${nachbarHtml}</p>` : ''}
</div></div></section>

${faqBlock(oc.faqs)}

<section class="cta-band" id="kontakt"><div class="container"><div class="cta-card reveal">
<div class="cta-text"><div class="cta-eyebrow"><span class="spark"></span>Jetzt anfragen</div>
<h2 class="cta-title">${esc(oc.cta_title)}</h2>
<p class="cta-subtitle">${esc(oc.cta_sub)}</p></div>
<div class="cta-actions">
<a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener"><span class="wa-icon">${ICON.wa}</span> Angebot per WhatsApp</a>
<a href="/kontakt/#anfrage" class="btn btn-outline">Zum Kontaktformular</a></div>
</div></div></section>`;

  const areaServed = `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`;
  const svcSchema = `{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"Stein- und Terrassenreinigung in ${sj(o.name)}","serviceType":["Steinreinigung","Terrassenreinigung"],"provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed},"description":"${sj(oc.meta)}"}`;
  const schema = `${orgSchema()},${svcSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: o.name, url }])}${faqSchema(url, oc.faqs)}`;
  write(url, head(clampTitle(oc.title), mkMeta(oc.meta), url, schema, { pagetype: 'ort' }) + header + main + footer + sctaBar(waMsg) + calcJS + FOOT_JS + '</body></html>');
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
  const figHtml = s => (s.img && IMG[s.img]) ? `<figure class="rg-figure">${pic(s.img, { alt: s.img_alt || s.h2, sizes: '(max-width:820px) 92vw, 720px' })}${s.img_caption ? `<figcaption>${esc(s.img_caption)}</figcaption>` : ''}</figure>` : '';
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
<div class="eyebrow">Ratgeber</div>
<h1>${esc(r.h1)}</h1>
<p class="lead">${esc(r.lead)}</p>
<p class="rg-meta">${ICON.calendar} Aktualisiert am ${esc(fmtDate(r.updated || config.content_stand))} · ${lesezeit} Min Lesezeit · von ${esc(nap.name)} Steinreinigung</p>
</div></div></section>
${r.hero_img && IMG[r.hero_img] ? `<div class="container rg-herofig-wrap"><figure class="rg-herofig">${pic(r.hero_img, { alt: r.hero_alt || r.h1, sizes: '(max-width:1180px) 92vw, 1100px', lcp: true })}</figure></div>` : ''}
<section class="rg-body"><div class="container"><div class="rg-layout${toc ? ' has-toc' : ''}">
${toc ? `<aside class="rg-side">${toc}</aside>` : ''}
<div class="rg-col">
${sektionenHtml}
<aside class="rg-protip">
<div class="rg-protip-icon">${ICON.spray}</div>
<div class="rg-protip-body">
<span class="rg-protip-label">Profi-Tipp</span>
<h2>${esc(r.cta_title || 'Lieber gleich vom Profi machen lassen?')}</h2>
<p>${esc(r.cta_text || 'Wir reinigen Ihre Fläche materialschonend, verfugen neu und imprägnieren auf Wunsch — Richtpreis ab 7 €/m², Angebot per Foto in rund 30 Minuten.')}</p>
<div class="rg-protip-actions"><a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto</a><a href="${ctaHubUrl}" class="rg-protip-link">${svc ? esc(svc.name) + ' ansehen' : 'Mehr erfahren'} →</a></div>
</div>
</aside>
${relatedHtml}
</div></div></div></section>
${faqBlock(r.faqs)}`;

  const artSchema = `{"@type":"Article","@id":"${DOMAIN}${url}#article","headline":"${sj(r.h1)}","description":"${sj(r.meta)}","image":"${imgAbs(r.hero_img) || imgAbs('og-default')}","datePublished":"${r.updated || config.content_stand}","dateModified":"${r.updated || config.content_stand}","inLanguage":"de-DE","author":{"@id":"${DOMAIN}/#organization"},"publisher":{"@id":"${DOMAIN}/#organization"},"mainEntityOfPage":"${DOMAIN}${url}"}`;
  const schema = `${orgSchema()},${artSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Ratgeber', url: '/ratgeber/' }, { name: r.h1, url }])}${faqSchema(url, r.faqs)}`;
  write(url, head(clampTitle(r.title), mkMeta(r.meta), url, schema, { pagetype: 'ratgeber' }) + header + main + footer + sctaBar(waMsg) + FOOT_JS + '</body></html>');
  written.push(url);
}

// Ratgeber-Übersicht (/ratgeber/) — CollectionPage, verlinkt alle Artikel
function ratgeberIndex() {
  const url = '/ratgeber/';
  const cards = ratList.map((r, i) => `<a class="svc-card reveal" href="/ratgeber/${r.slug}/" style="transition-delay:${(i % 2) * .08}s">${r.hero_img && IMG[r.hero_img] ? `<div class="svc-img">${pic(r.hero_img, { alt: r.hero_alt || r.h1, sizes: '(max-width:980px) 92vw, 560px' })}</div>` : ''}<div class="svc-body"><h3>${esc(r.h1)}</h3><p>${esc(r.lead)}</p><span class="go">Zum Ratgeber →</span></div></a>`).join('');
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Ratgeber</div>
<section class="page-hero"><div class="container"><div class="eyebrow">Ratgeber</div>
<h1>Ratgeber rund um <em>Stein &amp; Terrasse</em></h1>
<p class="lead">Praktische Anleitungen zum Reinigen, Pflegen und Schützen von Pflaster, Einfahrt und Terrasse — und ehrlich dazu, wann sich der Profi lohnt.</p></div></section>
<section class="svc-section"><div class="container">
<div class="section-head"><div class="section-label reveal"><span class="spark"></span>Alle Ratgeber</div><h2 class="section-title reveal" style="transition-delay:.08s">Anleitungen &amp; Tipps</h2></div>
<div class="svc-grid">${cards}</div>
</div></section>
<section class="cta-band" id="kontakt"><div class="container"><div class="cta-card reveal">
<div class="cta-text"><div class="cta-eyebrow"><span class="spark"></span>Lieber machen lassen?</div>
<h2 class="cta-title">Wir reinigen Ihre Fläche</h2>
<p class="cta-subtitle">Foto + Maße genügen — Richtpreis ab 7 €/m², Angebot in rund 30 Minuten.</p></div>
<div class="cta-actions"><a href="${waHref(WA_DEFAULT)}" class="btn btn-primary" target="_blank" rel="noopener"><span class="wa-icon">${ICON.wa}</span> Angebot per WhatsApp</a><a href="/servicegebiet/" class="btn btn-outline">Servicegebiet</a></div>
</div></div></section>`;
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Ratgeber","isPartOf":{"@id":"${DOMAIN}/#organization"}},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Ratgeber', url }])}`;
  write(url, head('Ratgeber: Stein & Terrasse reinigen | Blankstein', mkMeta('Ratgeber von Blankstein: Pflaster, Einfahrt und Terrasse richtig reinigen, Grünbelag entfernen, Fugen und Imprägnierung — praktische Anleitungen aus dem Havelland.'), url, schema) + header + main + footer + SCTA + FOOT_JS + '</body></html>');
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
<section class="page-hero"><div class="container"><div class="eyebrow">Servicegebiet</div>
<h1>Unser Servicegebiet im Havelland <em>&amp; am Berliner Rand</em></h1>
<p class="lead">${esc(gebietCopy && gebietCopy.intro_lead ? gebietCopy.intro_lead : 'Wir reinigen Stein- und Terrassenflächen im Havelland und am westlichen Berliner Rand. Wählen Sie Ihren Ort für die lokalen Details — oder fragen Sie direkt ein Angebot per Foto an.')}</p>
<div class="hero-actions" style="margin-top:24px"><a href="${waHref(WA_DEFAULT)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto anfragen</a><a href="/kontakt/#anfrage" class="btn btn-outline">${ICON.calendar} Kostenlose Besichtigung</a></div>
</div></section>
<section class="geo-section-wrap"><div class="container"><div class="geo-inner reveal"><div class="section-head center"><div class="section-label"><span class="spark"></span>Übersicht</div><h2 class="section-title">Unser Gebiet auf einen Blick</h2></div><figure class="svc-map" id="svc-map">${pic('servicegebiet-karte', { alt: 'Karte des Blankstein-Servicegebiets im Havelland und am westlichen Berliner Rand mit allen sieben bedienten Orten', sizes: '(max-width:980px) 92vw, 900px' })}<div class="svc-map-pins">${mapPins}</div><figcaption class="svc-map-attr">Kartendaten © OpenStreetMap-Mitwirkende</figcaption></figure><p class="geo-note">Fahren Sie über einen Ort — oder tippen Sie ihn an — für die lokalen Details.</p></div></div></section>
<section class="svc-section"><div class="container">
<div class="section-head"><div class="section-label reveal"><span class="spark"></span>Orte</div><h2 class="section-title reveal" style="transition-delay:.08s">Orte, die wir bedienen</h2>
<p class="section-sub reveal" style="transition-delay:.16s">Sieben Kern-Orte im Havelland und am westlichen Berliner Rand — weitere Orte auf Anfrage.</p></div>
<div class="ort-grid">${ortCards}</div>
</div></section>
<section class="gebiet-section"><div class="container"><div class="gebiet-inner reveal">
<div class="section-label"><span class="spark"></span>Leistungen</div><h2 class="section-title">Was wir anbieten</h2>
<p class="section-sub">In jedem Ort reinigen wir Pflaster, Einfahrten und Terrassen. Mehr zu den einzelnen Leistungen:</p>
<ul class="gebiet-list">${hubLinks}</ul>
</div></div></section>
<section class="cta-band" id="kontakt"><div class="container"><div class="cta-card reveal">
<div class="cta-text"><div class="cta-eyebrow"><span class="spark"></span>Jetzt anfragen</div>
<h2 class="cta-title">Ihr Ort ist dabei?</h2>
<p class="cta-subtitle">Foto + Maße genügen — Richtpreis sofort, verbindliches Angebot in rund 30 Minuten.</p></div>
<div class="cta-actions"><a href="${waHref(WA_DEFAULT)}" class="btn btn-primary" target="_blank" rel="noopener"><span class="wa-icon">${ICON.wa}</span> Angebot per WhatsApp</a><a href="/kontakt/#anfrage" class="btn btn-outline">Zum Kontaktformular</a></div>
</div></div></section>`;
  const areaServed = `[${orte.map(o => `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`).join(',')},{"@type":"AdministrativeArea","name":"Havelland"}]`;
  const schema = `${orgSchema()},{"@type":"CollectionPage","@id":"${DOMAIN}${url}#page","name":"Servicegebiet","isPartOf":{"@id":"${DOMAIN}/#organization"},"about":{"@type":"Service","name":"Stein- und Terrassenreinigung","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed}}},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Servicegebiet', url }])}`;
  write(url, head('Servicegebiet | Blankstein', mkMeta('Servicegebiet von Blankstein: Stein- und Terrassenreinigung in Falkensee, Dallgow-Döberitz, Brieselang, Schönwalde-Glien, Wustermark, Groß Glienicke und Kladow.'), url, schema) + header + main + footer + SCTA + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// KONTAKT (echte Konversions-Seite — Web3Forms, Fallback WhatsApp-Bridge)
// ====================================================================
// ====================================================================
// PREISE (Kosten-Transparenz + Richtpreis-Rechner; AEO-Magnet)
// ====================================================================
function preise(p) {
  const url = '/preise/';
  const waMsg = `Hallo Blankstein, ich möchte ein Angebot für meine Fläche. Ich schicke gleich ein, zwei Fotos und die ungefähren Maße.`;
  const t = p.kosten_tabelle || {};
  const tableHtml = `<div class="rg-table-wrap"><table class="rg-table">${t.caption ? `<caption>${esc(t.caption)}</caption>` : ''}<thead><tr>${(t.head || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(t.rows || []).map(row => `<tr>${row.map((cell, ci) => ci === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const kf = p.kostenfaktoren || {};
  const kfHtml = (kf.items && kf.items.length) ? `<div class="rg-list"><p class="rg-list-title">${esc(kf.title || 'Was den Preis beeinflusst')}</p><ul>${kf.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '';
  const re = p.richtpreis_erklaerung || {};
  const cv = p.conversion || {};
  const v = p.vergleich || {};
  const vnHtml = `<section class="preise-proof"><div class="container"><div class="preise-proof-inner reveal">
<figure class="proof-vn"><div class="comparison" role="slider" tabindex="0" aria-label="Vorher-Nachher Eingangstreppe — mit den Pfeiltasten oder dem Regler verschieben" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">${pic('proof-vn-vorher', { cls: 'comparison-before', alt: 'Eingangstreppe vor der Reinigung — vermoost und verschmutzt', sizes: '(max-width:860px) 92vw, 460px' })}${pic('proof-vn-nachher', { cls: 'comparison-after', alt: 'Dieselbe Eingangstreppe nach der Reinigung — sauber', sizes: '(max-width:860px) 92vw, 460px' })}<span class="comparison-label label-before">Vorher</span><span class="comparison-label label-after">Nachher</span><div class="comparison-handle"></div></div><figcaption>Echte Eingangstreppe aus dem Havelland — Regler ziehen.</figcaption></figure>
<div class="preise-proof-text"><div class="section-label"><span class="spark"></span>Echtes Ergebnis</div>
<h2 class="section-title">Das bekommen Sie für Ihren Richtpreis.</h2>
<p class="section-sub">Kein Stock-Foto, kein gestelltes Vorher-Nachher — eine echte Fläche aus unserem Havelland-Alltag.</p>
<ul class="trust-facts"><li>${ICON.grid} Reinigung und Neuverfugung im Richtpreis</li><li>${ICON.shield} Endpreis-Zusage, Nacharbeit kostenlos</li><li>${ICON.pin} Havelland und westlicher Berliner Rand</li></ul></div>
</div></div></section>`;
  const vergleichHtml = (v.diy && v.pro) ? `<section class="vergleich-section"><div class="container">
<div class="section-head center"><div class="section-label reveal"><span class="spark"></span>Selbst oder Profi</div>
<h2 class="section-title reveal" style="transition-delay:.08s">${esc(v.title)}</h2>
<p class="section-sub reveal" style="transition-delay:.16s">${esc(v.intro)}</p></div>
<div class="vergleich-grid reveal">
<div class="vergleich-col vergleich-diy"><h3>${esc(v.diy_title)}</h3><ul>${v.diy.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
<div class="vergleich-col vergleich-pro"><h3><span class="vergleich-ic">${ICON.shield}</span>${esc(v.pro_title)}</h3><ul>${v.pro.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
</div>
${v.footer ? `<p class="vergleich-footer reveal">${esc(v.footer)}</p>` : ''}
</div></section>` : '';
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Preise</div>
<section class="page-hero"><div class="container"><div class="eyebrow">Preise</div>
<h1>${esc(p.h1)}</h1>
<p class="lead">${esc(p.lead)}</p>
<div class="hero-actions" style="margin-top:24px"><a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto</a></div>
<p class="hero-alt-link"><a href="/kontakt/#anfrage">oder kostenlose Vor-Ort-Besichtigung →</a></p>
</div></section>
${vnHtml}
${vergleichHtml}
<section class="rg-body"><div class="container"><div class="rg-col">
<section class="rg-section"><h2>Preise im Überblick</h2>${tableHtml}${kfHtml}</section>
<section class="rg-section"><h2>${esc(re.title || 'Warum Richtpreis statt fester Preis')}</h2>${(re.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</section>
</div></div></section>
${calcSection({ title: 'Rechnen Sie Ihren Richtpreis aus', sub: 'Fläche schätzen, Imprägnierung wählen — Sie sehen sofort die Spanne. Den exakten Endpreis nennen wir nach zwei Fotos.', range: true })}
<section class="rg-body"><div class="container"><div class="rg-col">
<section class="rg-section"><h2>${esc(cv.title || 'So bekommen Sie Ihren Preis')}</h2>${(cv.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</section>
<aside class="rg-protip"><div class="rg-protip-icon">${ICON.shield}</div><div class="rg-protip-body"><span class="rg-protip-label">Endpreis-Zusage</span><h2>${esc(p.cta_title || 'Foto schicken, Preis erhalten')}</h2><p>${esc(p.garantie_text || '')}</p><div class="rg-protip-actions"><a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto</a><a href="/pflasterreinigung/" class="rg-protip-link">Pflasterreinigung ansehen →</a></div></div></aside>
<aside class="rg-related"><h2>Weiterlesen</h2><ul><li><a href="/ratgeber/was-kostet-steinreinigung/">Was kostet Steinreinigung? Ratgeber →</a></li><li><a href="/steinreinigung/">Steinreinigung — alle Flächen →</a></li><li><a href="/servicegebiet/">Unser Servicegebiet →</a></li></ul></aside>
</div></div></section>
${faqBlock(p.faqs)}`;
  const areaServed = `[${orte.map(o => `{"@type":"City","name":"${sj(o.name)}"${o.plz ? `,"postalCode":"${sj(o.plz)}"` : ''}}`).join(',')},{"@type":"AdministrativeArea","name":"Havelland"}]`;
  const svcSchema = `{"@type":"Service","@id":"${DOMAIN}${url}#service","name":"Steinreinigung und Terrassenreinigung","serviceType":"Steinreinigung","provider":{"@id":"${DOMAIN}/#organization"},"areaServed":${areaServed},"offers":{"@type":"Offer","priceCurrency":"EUR","price":"${P.satz_basis}","description":"Richtpreis pro Quadratmeter inkl. Reinigung und Neuverfugung, Endpreis ohne versteckte Kosten."}}`;
  const schema = `${orgSchema()},${svcSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Preise', url }])}${faqSchema(url, p.faqs)}`;
  write(url, head(clampTitle(p.title), mkMeta(p.meta), url, schema, { pagetype: 'preise' }) + header + main + footer + sctaBar(waMsg) + sliderJS + calcJS + FOOT_JS + '</body></html>');
  written.push(url);
}

// ====================================================================
// UEBER UNS (Trust: Inhaber + Verfahren/Equipment + Seriositaet)
// HINWEIS: kein written.push -> bewusst NICHT in Nav/Footer/Sitemap, bis echtes Inhaber-Foto vorliegt (UWG/Trust).
// ====================================================================
function ueberUns(u) {
  const url = '/ueber-uns/';
  const waMsg = `Hallo Blankstein, ich habe eine Frage zu eurer Arbeit und möchte ein Angebot.`;
  const inh = u.inhaber || {}, vf = u.verfahren || {}, eq = u.equipment || {}, se = u.seriositaet || {}, df = u.differenzierung || {};
  const schritteHtml = (vf.schritte && vf.schritte.length) ? `<ol class="rg-steps">${vf.schritte.map(s => `<li><strong>${esc(s.titel)}:</strong> ${esc(s.text)}</li>`).join('')}</ol>` : '';
  const eqHtml = (eq.items && eq.items.length) ? `<div class="rg-list"><p class="rg-list-title">${esc(eq.title || 'Unser Equipment')}</p><ul>${eq.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '';
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Über uns</div>
<section class="page-hero"><div class="container"><div class="eyebrow">Über uns</div>
<h1>${esc(u.h1)}</h1>
<p class="lead">${esc(u.lead)}</p></div></section>
<section class="rg-body"><div class="container"><div class="rg-col">
<section class="rg-section"><h2>${esc(inh.title || 'Wer hinter Blankstein steht')}</h2><figure class="ueber-foto"><div class="ueber-foto-ph">${ICON.camera}<span>Foto folgt</span></div></figure>${(inh.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</section>
<section class="rg-section"><h2>${esc(vf.title || 'So arbeiten wir')}</h2>${vf.intro ? `<p>${esc(vf.intro)}</p>` : ''}${schritteHtml}${eqHtml}</section>
<section class="rg-section"><h2>${esc(se.title || 'Worauf Sie sich verlassen können')}</h2>${(se.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</section>
<section class="rg-section"><h2>${esc(df.title || 'Was uns unterscheidet')}</h2>${(df.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</section>
<aside class="rg-protip"><div class="rg-protip-icon">${ICON.spray}</div><div class="rg-protip-body"><span class="rg-protip-label">Anfragen</span><h2>${esc(u.cta_title || 'Saubere Fläche gewünscht?')}</h2><p>${esc(u.cta_text || '')}</p><div class="rg-protip-actions"><a href="${waHref(waMsg)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto</a><a href="/preise/" class="rg-protip-link">Preise ansehen →</a></div></div></aside>
</div></div></section>
${(u.faqs && u.faqs.length) ? faqBlock(u.faqs) : ''}`;
  const aboutSchema = `{"@type":"AboutPage","@id":"${DOMAIN}${url}#page","name":"${sj(u.title)}","isPartOf":{"@id":"${DOMAIN}/#organization"},"about":{"@id":"${DOMAIN}/#organization"}}`;
  const schema = `${orgSchema()},${aboutSchema},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Über uns', url }])}${(u.faqs && u.faqs.length) ? faqSchema(url, u.faqs) : ''}`;
  write(url, head(clampTitle(u.title), mkMeta(u.meta), url, schema, { pagetype: 'ueber' }) + header + main + footer + sctaBar(waMsg) + FOOT_JS + '</body></html>');
  // bewusst KEIN written.push(url) — siehe Hinweis oben.
}

function kontakt() {
  const W3F = isReal(config.web3forms_key);
  const formIntro = W3F
    ? 'Ein paar Angaben genügen — wir melden uns schnell zurück, meist innerhalb von rund 30 Minuten.'
    : 'Ein paar Angaben genügen. Beim Absenden öffnet sich WhatsApp mit Ihrer vorbereiteten Nachricht — oder rufen Sie direkt an.';
  const formOpen = W3F
    ? `<form id="anfrage" class="kf reveal" action="https://api.web3forms.com/submit" method="POST" novalidate><input type="hidden" name="access_key" value="${esc(config.web3forms_key)}"><input type="hidden" name="subject" value="Neue Anfrage über blankstein-havelland.de"><input type="hidden" name="from_name" value="Blankstein Website"><input type="hidden" name="redirect" value="${DOMAIN}/danke/"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">`
    : `<form id="anfrage" class="kf reveal" novalidate>`;
  const formScript = W3F
    ? `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}var b=f.querySelector('button[type=submit]'),o=b.textContent;b.disabled=true;b.textContent='Wird gesendet…';fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:new FormData(f)}).then(function(r){return r.json()}).then(function(j){if(j&&j.success){if(window.dataLayer){dataLayer.push({event:'generate_lead'})}location.href='/danke/'}else{b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder versuchen Sie es noch einmal.')}}).catch(function(){b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an oder versuchen Sie es noch einmal.')})})})();</script>`
    : `<script>(function(){var f=document.getElementById('anfrage');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}var g=function(n){var el=f.elements[n];return el?String(el.value).trim():''};var msg='Anfrage über die Website. Name: '+g('name')+', Telefon: '+g('tel')+', Ort/PLZ: '+g('ort')+', Fläche: '+g('flaeche')+', Anliegen: '+g('anliegen');if(window.dataLayer){dataLayer.push({event:'generate_lead'})}location.href='https://wa.me/${waNum}?text='+encodeURIComponent(msg)})})();</script>`;
  const main = `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>Kontakt</div>
<section class="page-hero"><div class="container"><div class="eyebrow">Kontakt</div>
<h1>Angebot per Foto oder <em>kostenlose Besichtigung</em></h1>
<p class="lead">Schicken Sie uns Fotos und die ungefähren Maße Ihrer Fläche — wir melden uns schnell, meist innerhalb von rund 30 Minuten. Lieber persönlich? Wir kommen kostenlos vorbei.</p>
<div class="chips"><span>${esc(nap.phone_display)}</span><span>${esc(nap.city)} &amp; Havelland</span><span>WhatsApp &amp; Telefon</span></div>
<div class="hero-actions" style="margin-top:24px"><a href="${waHref(WA_DEFAULT)}" class="btn btn-primary" target="_blank" rel="noopener"><span class="wa-icon">${ICON.wa}</span> Per WhatsApp anfragen</a><a href="tel:${tel}" class="btn btn-outline">${ICON.phone} ${esc(nap.phone_display)}</a></div>
</div></section>
<section class="section"><div class="container"><div class="section-head"><h2 class="section-title">Anfrage senden</h2><p class="section-sub">${formIntro}</p></div>
${formOpen}
<label>Name<input name="name" autocomplete="name" required></label>
<label>Telefon<input name="tel" type="tel" autocomplete="tel" required></label>
<label>Ort / PLZ<input name="ort" autocomplete="address-level2"></label>
<label>Fläche (ungefähre m²)<input name="flaeche" inputmode="numeric"></label>
<label>Was steht an?<textarea name="anliegen" rows="4" placeholder="z. B. Terrasse 25 m², Naturstein, viel Grünbelag" required></textarea></label>
<label class="chk"><input type="checkbox" name="dsgvo" required> Ich bin mit der Verarbeitung meiner Angaben zur Kontaktaufnahme einverstanden (siehe <a href="/datenschutz/">Datenschutz</a>).</label>
<button class="btn btn-primary" type="submit">Anfrage absenden</button>
<p class="kf-alt">Lieber direkt? <a href="tel:${tel}">Anrufen: ${esc(nap.phone_display)}</a> · <a href="${waHref(WA_DEFAULT)}" target="_blank" rel="noopener">WhatsApp schreiben</a></p>
</form>${formScript}</div></section>`;
  const schema = `${orgSchema()},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Kontakt', url: '/kontakt/' }])}`;
  write('/kontakt/', head('Kontakt | Blankstein', mkMeta(`Kontakt zu Blankstein Steinreinigung in ${nap.city}: Angebot per Foto in rund 30 Minuten über WhatsApp ${nap.phone_display} oder kostenlose Vor-Ort-Besichtigung im Havelland.`), '/kontakt/', schema) + header + main + footer + sctaBar(WA_DEFAULT) + FOOT_JS + '</body></html>');
  written.push('/kontakt/');
}

// ====================================================================
// RECHT (Impressum / Datenschutz) + Danke + 404
// ====================================================================
function legalShell(t, bodyHtml) {
  return `<div class="container breadcrumb"><a href="/">Start</a><span class="sep">›</span>${esc(t)}</div>
<section class="page-hero"><div class="container"><h1>${esc(t)}</h1></div></section>
<section class="section"><div class="container"><div class="prose">${bodyHtml}</div></div></section>`;
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
  write('/impressum/', head('Impressum | Blankstein', mkMeta(`Impressum von Blankstein, Marke der ${nap.rechtstraeger} in ${nap.zip} ${nap.city}. Telefon ${nap.phone_display}, E-Mail ${nap.email}.`), '/impressum/', orgSchema()) + header + legalShell('Impressum', body) + footer + SCTA + FOOT_JS + '</body></html>');
  written.push('/impressum/');
}
function datenschutz() {
  const verantw = `${esc(nap.rechtstraeger)}<br>vertreten durch ${esc((nap.gesellschafter || [nap.inhaber]).join(' und '))}<br>${esc(nap.street)}<br>${esc(nap.zip)} ${esc(nap.city)}<br>Telefon: ${esc(nap.phone_display)}<br>E-Mail: ${esc(nap.email)}`;
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
<h3>Anfrageformular (Web3Forms)</h3>
<p>Für Anfragen über unser Kontaktformular nutzen wir den Dienst Web3Forms (web3forms.com). Beim Absenden werden Ihre Angaben (Name, Telefon, Ort/PLZ, Fläche, Anliegen) an Web3Forms übermittelt und als E-Mail an unser Postfach weitergeleitet (Art. 6 Abs. 1 lit. a und b DSGVO). Hinweise unter <a href="https://web3forms.com/privacy" rel="nofollow" target="_blank">web3forms.com/privacy</a>.</p>
<h3>WhatsApp</h3>
<p>Über die WhatsApp-Schaltflächen können Sie uns per Messenger kontaktieren. Anbieter ist die WhatsApp Ireland Limited (Meta). Dabei können Daten in die USA übertragen werden. Datenschutzhinweise: <a href="https://www.whatsapp.com/legal/privacy-policy-eea" rel="nofollow" target="_blank">whatsapp.com/legal/privacy-policy-eea</a>. Die Nutzung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Alternativ erreichen Sie uns telefonisch, per E-Mail oder über das Formular.</p>
<h2>7. Web-Analyse (Google Analytics 4 / Google Tag Manager)</h2>
<p>Zur Reichweitenmessung setzen wir Google Analytics 4 und den Google Tag Manager ein (Google Ireland Limited) — ausschließlich nach Ihrer Einwilligung über den Consent-Banner (Art. 6 Abs. 1 lit. a DSGVO, Google Consent Mode v2, Voreinstellung „abgelehnt"). Ihre Einwilligung können Sie jederzeit widerrufen.</p>
<h2>8. Cookies und Einwilligung</h2>
<p>Ohne Ihre Einwilligung verwenden wir nur technisch notwendige Speicherung (z. B. um Ihre Cookie-Entscheidung zu sichern). Einwilligungspflichtige Dienste werden erst nach Zustimmung aktiviert (§ 25 TDDDG).</p>
<h2>9. Schriftarten</h2>
<p>Diese Website bindet ihre Schriftarten lokal vom eigenen Server ein. Es wird keine Verbindung zu Servern von Google oder Dritten aufgebaut.</p>
<h2>10. Ihre Rechte</h2>
<p>Ihnen stehen nach der DSGVO die Rechte auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) zu sowie das Recht auf Widerruf erteilter Einwilligungen (Art. 7 Abs. 3). Es genügt eine formlose Mitteilung an die oben genannten Kontaktdaten.</p>
<h2>11. Beschwerderecht</h2>
<p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg (LDA), Stahnsdorfer Damm 77, 14532 Kleinmachnow.</p>`;
  write('/datenschutz/', head('Datenschutz | Blankstein', mkMeta(`Datenschutzhinweise von Blankstein in ${nap.city}: Umgang mit Ihren Angaben bei Anfragen per Telefon, WhatsApp und Formular nach DSGVO, mit Hosting und Web-Analyse.`), '/datenschutz/', orgSchema()) + header + legalShell('Datenschutz', body) + footer + SCTA + FOOT_JS + '</body></html>');
  written.push('/datenschutz/');
}
function danke() {
  const main = `<section class="page-hero" style="padding-bottom:clamp(56px,8vw,90px)"><div class="container" style="text-align:center">
<div class="eyebrow" style="justify-content:center;display:inline-flex">Anfrage eingegangen</div>
<h1 style="margin-inline:auto">Danke für Ihre <em>Anfrage</em></h1>
<p class="lead" style="margin-inline:auto">Wir haben Ihre Anfrage erhalten und melden uns schnell, meist innerhalb von rund 30 Minuten. Bei dringenden Fällen erreichen Sie uns direkt.</p>
<div class="hero-actions" style="justify-content:center;margin-top:28px"><a href="tel:${tel}" class="btn btn-primary">${ICON.phone} ${esc(nap.phone_display)}</a><a href="${waHref(WA_DEFAULT)}" class="btn btn-outline" target="_blank" rel="noopener">WhatsApp</a></div>
<p style="margin-top:24px"><a href="/" style="color:var(--blue)">Zurück zur Startseite</a></p>
</div></section>`;
  write('/danke/', head('Danke | Blankstein', 'Danke für Ihre Anfrage bei Blankstein. Wir melden uns schnell, meist innerhalb von rund 30 Minuten.', '/danke/', orgSchema(), { noindex: true }) + header + main + footer + SCTA + FOOT_JS + '</body></html>');
  written.push('/danke/');
}
function notFound() {
  const main = `<section class="page-hero" style="padding-bottom:clamp(56px,8vw,90px)"><div class="container" style="text-align:center">
<div class="eyebrow" style="justify-content:center;display:inline-flex">Fehler 404</div>
<h1 style="margin-inline:auto">Diese Seite gibt es <em>nicht (mehr)</em></h1>
<p class="lead" style="margin-inline:auto">Der Link ist vielleicht veraltet oder vertippt. Hier kommen Sie weiter:</p>
<div class="hero-actions" style="justify-content:center;margin-top:28px"><a href="/" class="btn btn-primary">Zur Startseite</a><a href="/kontakt/" class="btn btn-outline">Kontakt</a></div>
</div></section>`;
  const doc = head('Seite nicht gefunden | Blankstein', 'Die aufgerufene Seite wurde nicht gefunden. Zurück zur Startseite von Blankstein Steinreinigung im Havelland.', '/404.html', orgSchema(), { noindex: true }) + header + main + footer + SCTA + FOOT_JS + '</body></html>';
  fs.writeFileSync('website/404.html', doc);
}

// ====================================================================
// SITEMAPS / robots / llms
// ====================================================================
function sitemaps() {
  const urls = written.filter(u => u !== '/danke/');
  const lm = (config.content_stand && /^\d{4}-\d{2}-\d{2}$/.test(config.content_stand)) ? `<lastmod>${config.content_stand}</lastmod>` : '';
  const sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${DOMAIN}${u}</loc>${lm}</url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync('website/sitemap.xml', sm);
  fs.writeFileSync('website/robots.txt', `User-agent: *\nAllow: /\n\n# AI-Crawler erlaubt (AEO/GEO — Architektur §8)\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: Claude-Web\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  const llms = `# Blankstein\n\n> Steinreinigung, Terrassenreinigung, Pflasterreinigung und Steinversiegelung im Havelland und am westlichen Berliner Rand. Verfahren: rotierende Flächenreiniger (kontrollierter Hochdruck), Neuverfugung mit Fugensand, Nano-Imprägnierung, saubere Nass-Absaugung. Richtpreis ${P.satz_basis} €/m² (mit Imprägnierung ${P.satz_impraegnierung} €/m²), Endpreise ohne versteckte Kosten. Angebot per Foto + Maße über WhatsApp in rund 30 Minuten oder kostenlose Vor-Ort-Besichtigung. Sitz: ${nap.city}.\n\n## Leistungen\n${services.map(s => `- ${s.name}`).join('\n')}\n\n## Servicegebiet\n${orte.map(o => `- ${o.name} (${o.plz})`).join('\n')}\n\n## Kontakt\n- Telefon: ${nap.phone_display}\n- WhatsApp: ${waHref('Hallo Blankstein')}\n- Ort: ${nap.street}, ${nap.zip} ${nap.city}\n`;
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
function start(c) {
  const url = '/start/';
  const wa = c.wa_text || WA_DEFAULT;
  const W3F = isReal(config.web3forms_key);
  const heroImg = (c.hero_img && IMG[c.hero_img]) ? `<div class="start-hero-media reveal" style="transition-delay:.16s">${pic(c.hero_img, { alt: c.hero_alt || 'Steinreinigung im Havelland durch Blankstein', sizes: '(max-width:760px) 92vw, 520px', lcp: true })}</div>` : '';
  const steps = (c.steps || []).map((s, i) => `<div class="start-step reveal" style="transition-delay:${i * .08}s"><div class="start-step-n">${esc(s.n)}</div><div class="start-step-b"><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div></div>`).join('');
  const trust = (c.trust || []).map((t, i) => `<div class="start-trust-card reveal" style="transition-delay:${(i % 2) * .08}s"><h3>${esc(t.t)}</h3><p>${esc(t.d)}</p></div>`).join('');
  // Friktion senken: Flaechentyp-Chips -> WhatsApp mit spezifischem Text (1 Tap = qualifizierter Lead)
  const chips = (c.flaechen || []).map(fl => `<a class="flaeche-chip" data-flaeche="${esc(fl.key)}" href="${waHref(fl.wa)}" target="_blank" rel="noopener">${esc(fl.label)}</a>`).join('');
  const pick = chips
    ? `<div class="flaeche-pick reveal" style="transition-delay:.18s"><span class="flaeche-q">${esc(c.flaechen_title || 'Was sollen wir reinigen?')}</span><div class="flaeche-chips">${chips}</div></div>
<div class="flaeche-alts reveal" style="transition-delay:.24s"><a href="tel:${tel}" class="alt-link">${ICON.phone} Anrufen</a><a href="mailto:${esc(nap.email)}" class="alt-link">${ICON.mail} E-Mail</a><a href="#anfrage" class="alt-link">Formular</a></div>`
    : `<div class="hero-actions reveal" style="transition-delay:.18s"><a href="${waHref(wa)}" class="btn btn-primary" target="_blank" rel="noopener">${ICON.camera} Angebot per Foto</a><a href="tel:${tel}" class="btn btn-outline">${ICON.phone} Anrufen</a></div>`;
  // WhatsApp-Robustheit: Fallback-Formular (Web3Forms-ready; ohne Key -> WhatsApp-Fallback wie /kontakt/)
  const flOpts = (c.flaechen || []).map(fl => `<option value="${esc(fl.label)}">${esc(fl.label)}</option>`).join('') + '<option value="Andere / mehrere">Andere / mehrere</option>';
  const formOpen = W3F
    ? `<form id="anfrage" class="kf reveal" action="https://api.web3forms.com/submit" method="POST" novalidate><input type="hidden" name="access_key" value="${esc(config.web3forms_key)}"><input type="hidden" name="subject" value="Neue Anfrage über die Reel-Landing (/start)"><input type="hidden" name="from_name" value="Blankstein /start"><input type="hidden" name="redirect" value="${DOMAIN}/danke/"><input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">`
    : `<form id="anfrage" class="kf reveal" novalidate>`;
  const formSection = `<section class="start-form" id="anfrage-sec"><div class="container narrow"><div class="section-head center"><h2 class="section-label reveal"><span class="spark"></span>${esc(c.form_title || 'Lieber per Formular?')}</h2><p class="section-sub reveal">${esc(c.fallback_lead || '')}</p></div>
${formOpen}
<div class="kf-row"><label>Name<input name="name" autocomplete="name" required></label><label>Telefon<input name="tel" type="tel" autocomplete="tel" required></label></div>
<div class="kf-row"><label>Fläche<select name="flaeche">${flOpts}</select></label><label>Ort / PLZ<input name="ort" autocomplete="postal-code"></label></div>
<label>Kurz zur Fläche<textarea name="anliegen" rows="3" placeholder="z. B. Einfahrt ca. 40 m², vermoost"></textarea></label>
<button type="submit" class="btn btn-primary">${ICON.camera} Anfrage senden</button>
<p class="kf-hint">${W3F ? 'Wir melden uns meist innerhalb von rund 30 Minuten.' : 'Beim Absenden öffnet sich WhatsApp mit deiner vorbereiteten Nachricht — oder ruf direkt an.'}</p>
</form>
</div></section>`;
  const main = `<section class="start-hero"><div class="container"><div class="start-hero-grid">
<div class="start-hero-copy">
<div class="eyebrow reveal">${esc(c.eyebrow)}</div>
<h1 class="reveal" style="transition-delay:.06s">${esc(c.h1)} <em>${esc(c.h1_em)}</em></h1>
<p class="lead reveal" style="transition-delay:.12s">${esc(c.lead)}</p>
${pick}
</div>
${heroImg}
</div></div></section>
<section class="start-steps"><div class="container"><div class="section-head center"><h2 class="section-label reveal"><span class="spark"></span>${esc(c.steps_title || 'So einfach gehts')}</h2></div><div class="start-steps-grid">${steps}</div></div></section>
${reelStrip()}
<section class="start-trust"><div class="container"><div class="section-head center"><h2 class="section-label reveal"><span class="spark"></span>${esc(c.trust_title || 'Warum Blankstein')}</h2></div><div class="start-trust-grid">${trust}</div></div></section>
${formSection}
<section class="cta-band"><div class="container"><div class="cta-card reveal">
<div class="cta-text"><div class="cta-eyebrow"><span class="spark"></span>Jetzt anfragen</div>
<h2 class="cta-title">${esc(c.cta_title)}</h2>
<p class="cta-subtitle">${esc(c.cta_sub)}</p></div>
<div class="cta-actions"><a href="${waHref(wa)}" class="btn btn-primary" target="_blank" rel="noopener"><span class="wa-icon">${ICON.wa}</span> Angebot per WhatsApp</a><a href="tel:${tel}" class="btn btn-outline">${ICON.phone} ${esc(nap.phone_display)}</a></div>
</div></div></section>`;
  // Mess-Schaerfe: lead_intent bei Chip-Klick (Flaeche+Quelle) + generate_lead beim Formular. window.dataLayer auch ohne GTM -> GA4-ready.
  const fsubmit = W3F
    ? `f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}var b=f.querySelector('button[type=submit]'),o=b.textContent;b.disabled=true;b.textContent='Wird gesendet…';var fd=new FormData(f),u=q();if(Object.keys(u).length)fd.append('herkunft',JSON.stringify(u));fetch('https://api.web3forms.com/submit',{method:'POST',headers:{Accept:'application/json'},body:fd}).then(function(r){return r.json()}).then(function(j){if(j&&j.success){dl.push({event:'generate_lead',via:'form_start',utm:u});location.href='/danke/'}else{b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an.')}}).catch(function(){b.disabled=false;b.textContent=o;alert('Es gab ein Problem beim Senden. Bitte rufen Sie uns kurz an.')})})`
    : `f.addEventListener('submit',function(e){e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}var g=function(n){var el=f.elements[n];return el?String(el.value).trim():''};var u=q();var msg='Anfrage über die Website (/start). Name: '+g('name')+', Telefon: '+g('tel')+', Fläche: '+g('flaeche')+', Ort: '+g('ort')+', Anliegen: '+g('anliegen');dl.push({event:'generate_lead',via:'form_start_wa',utm:u});location.href='https://wa.me/${waNum}?text='+encodeURIComponent(msg)})`;
  const startJS = `<script>(function(){var dl=window.dataLayer=window.dataLayer||[];function q(){try{return JSON.parse(sessionStorage.getItem('bs_utm')||'{}')}catch(e){return {}}}document.querySelectorAll('.flaeche-chip[data-flaeche]').forEach(function(a){a.addEventListener('click',function(){dl.push({event:'lead_intent',flaeche:a.getAttribute('data-flaeche'),utm:q()})})});var f=document.getElementById('anfrage');if(f){${fsubmit}}})();</script>`;
  const schema = `${orgSchema()},${breadcrumb([{ name: 'Start', url: '/' }, { name: 'Angebot per Foto', url }])}`;
  write(url, head(clampTitle(c.title), mkMeta(c.meta), url, schema, { noindex: true, pagetype: 'start' }) + leanHeader(wa) + '<main id="main">' + main + '</main>' + leanFooter + sctaBar(wa) + LEAN_FOOT_JS + startJS + '</body></html>');
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
if (startCopy) start(startCopy);
kontakt();
impressum();
datenschutz();
danke();
notFound();
sitemaps();
fs.cpSync('assets', 'website/assets', { recursive: true });
console.log(`Generiert: ${written.length} Seiten + 404 + sitemap/robots/llms → ${written.join(', ')}`);
