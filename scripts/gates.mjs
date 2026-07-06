// Deterministische Quality-Gates für den generierten Output (website/). Run: node scripts/gates.mjs
// Fork von havelland-website/scripts/gates.mjs. Blankstein-Abweichungen:
//   • FAQPage-JSON-LD ERLAUBT (Architektur §5: AEO-Hebel) — kein FAQPage-Verbot.
//   • Hamburger-Selektor .menu-toggle (hero-v3), Sticky-CTA .scta.
//   • NearDup gruppiert lokale Orts-Hubs via <body data-pagetype="ort">.
// Exit 0 = alle harten Gates grün; Exit 1 = mindestens ein hartes Gate rot. Warnungen brechen nicht ab.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'node:child_process';

const ROOT = 'website';
const CFG = JSON.parse(fs.readFileSync('data/config.json','utf8'));
const DOMAIN = CFG.domain.replace(/\/$/,'');
// Platzhalter-Erkennung wie generate.mjs: nur echte Keys aktivieren Formular/Tracking
const isReal = v => v && !/\b(TBD|XXXX|G-XXXX|GTM-X|null)\b/i.test(String(v));
const FORM_OK = isReal(CFG.web3forms_key);
const TRACK = isReal(CFG.gtm_id);
const hard = []; const warn = []; const ok = [];
const FAIL = (g,d)=>hard.push(`${g}: ${d}`);
const WARN = (g,d)=>warn.push(`${g}: ${d}`);
const OK = g=>ok.push(g);

function walk(dir){ let out=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) out=out.concat(walk(p)); else if(e.name.endsWith('.html')) out.push(p); } return out; }
const files = walk(ROOT);
const urlOf = f => '/' + path.relative(ROOT,f).replace(/\\/g,'/').replace(/index\.html$/,'');
const exists = u => {
  let p = u.split('#')[0].split('?')[0];
  if(!p.startsWith('/')) return true;
  if(p.endsWith('/')) p = p+'index.html';
  else if(!path.extname(p)) p = p+'/index.html';
  return fs.existsSync(path.join(ROOT, p));
};
const visibleText = h => h.replace(/<script[^>]*>[\s\S]*?<\/script>/g,' ').replace(/<style[^>]*>[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ').trim();

let brokenLinks=0; const brokenSamples=[];
let imgNoAlt=0, imgNoDim=0, noScta=0, noHamb=0, noOg=0; const titles=new Map(); const metas=new Map();
// Blankstein-Translit-Liste: ASCII-Fehlerformen von Umlaut-Wörtern, die in der Copy vorkommen könnten.
const transRe = /\b(fuer|ueber|koennen|koennt|muessen|moechten?|moeglich|schoen|groesse|groesser|qualitaet|naehe|naehere|haeufig|haeufige|natuerlich|persoenlich|zuverlaessig|regelmaessig|gruenbelag|gruen\b|fruehjahr|fruehling|gebaeude|oberflaeche|flaeche|flaechen|flaechenreiniger|impraegnierung|impraegniert|verschmutzt\b.*?flaeche|waehrend|spaeter|draussen|doeberitz|schoenwalde|grossglienicke)\b/i;
const bodyByGroup = {};

// ---- Provenance (Spec §3.6): manifest.json braucht source je Slug; KI hat in Beweis-Slots nichts verloren ----
const IMGM = JSON.parse(fs.readFileSync('assets/img/manifest.json','utf8'));
const VALID_SRC = new Set(['echt','ki','karte','neutral']);
for(const [slug,m] of Object.entries(IMGM)) if(!VALID_SRC.has(m.source)) FAIL('ProvenanceSource', `manifest ${slug}: source fehlt/ungültig (${m.source})`);
const KI_SLUGS = new Set(Object.entries(IMGM).filter(([,m])=>m.source==='ki').map(([s])=>s));
// Beweis-Slot-Container im Output (P2-Sektionen): Beweis-Hero, Zuletzt-Leiste, Protokoll-Frames, Konfigurator-Kacheln
const PROOF_SLOT_RE = [
  ['bw-hero', /<section class="bw-hero[^"]*"[\s\S]*?<\/section>/g],
  ['archiv-strip', /<section class="archiv-strip[^"]*"[\s\S]*?<\/section>/g],
  ['case-frame', /<figure class="[^"]*case-frame[^"]*"[\s\S]*?<\/figure>/g],
  ['k-tile', /<button[^>]*class="k-tile"[\s\S]*?<\/button>/g]
];
const imgSlugsIn = html => { const out=new Set(); for(const m of html.matchAll(/\/assets\/img\/([a-z0-9-]+?)-\d+\.(?:avif|webp|jpe?g|png)/g)) out.add(m[1]); for(const m of html.matchAll(/poster="\/assets\/img\/([a-z0-9-]+)\.jpg"/g)) out.add(m[1]); return out; };
let kiInProof=0; const kiSamples=[];
// ---- Blocklist + verbotene Phrasen (Spec §6.1) ----
const BLOCK_NAME = /Christian Brehm/i;
const FORBIDDEN = [
  [/Festpreis/i, 'Festpreis (online immer Richtpreis)'],
  [/Heißwasser|Heisswasser/i, 'Heißwasser (war JR, nicht Blankstein)'],
  [/30 Minuten|30-Minuten|30 Min\b/i, '30 Minuten (SLA ist "Antwort < 2 h — werktags 8–18 Uhr")'],
  [/kein(?:en)? Hochdruck\b/i, '"kein Hochdruck" (wir nutzen Hochdruck korrekt via Flächenreiniger)'],
  // Eigene Geld-zurück-Zusage verboten (Garantie ist Endpreis + Nacharbeit). Der Ratgeber WARNT legitim
  // vor "Geld-zurück-Garantien/-Versprechen" Dritter — genau diese Komposita bleiben erlaubt (Lookahead).
  [/Geld[- ]zurück(?!-Versprechen|-Garantie)/i, 'eigenes Geld-zurück-Versprechen (Garantie = Endpreis-Zusage + kostenlose Nacharbeit)'],
  // Geräte-Marken-Namedropping (Kickoff-Guardrail, K7/Kränzle-Klärung offen) — Geräte generisch benennen.
  // "Kärcher" als Gattungsbegriff im DIY-Ratgeber bleibt erlaubt; unsere eigenen Marken-Nennungen nicht.
  [/Kränzle|Kraenzle|Stihl\b/i, 'Geräte-Marke (generisch benennen: Flächenreiniger, Nasssauger, Bläser — Klärung offen)']
];

for(const f of files){
  const h = fs.readFileSync(f,'utf8');
  const url = urlOf(f);

  const h1s = (h.match(/<h1\b/g)||[]).length;
  if(h1s!==1) FAIL('H1', `${url} hat ${h1s} H1`);
  if(!/<html lang="de"/.test(h)) FAIL('lang', `${url} ohne lang="de"`);

  for(const m of h.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)){ if(!exists(m[1])){ brokenLinks++; if(brokenSamples.length<15) brokenSamples.push(`${url} → ${m[1]}`);} }

  for(const m of h.matchAll(/<img\b[^>]*>/g)){ const tag=m[0]; if(!/alt="[^"]*"/.test(tag)) imgNoAlt++; if(!/width="\d+"/.test(tag)||!/height="\d+"/.test(tag)) imgNoDim++; }

  const t=(h.match(/<title>([^<]*)<\/title>/)||[])[1]||'';
  const d=(h.match(/<meta name="description" content="([^"]*)"/)||[])[1]||'';
  titles.set(url, t); metas.set(url, d);
  if(t.length>60) WARN('TitleLen', `${url} Title ${t.length}>60`);
  if(d.length<150||d.length>158) WARN('MetaLen', `${url} Meta ${d.length} (Soll 150–158)`);

  const visEarly = visibleText(h);
  if(/cdn\.tailwindcss\.com/.test(h)) FAIL('CDN', `${url} nutzt cdn.tailwindcss.com`);
  if(/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(h)) FAIL('FontCDN', `${url} lädt externe Google-Fonts (DSGVO)`);
  if(/\{\{|\}\}/.test(visEarly)) FAIL('Mustache', `${url} enthält {{ }} im Text`);
  const tok = visEarly.match(/\{(ort|plz|nachbarorte|service|qm|preis|[a-z_]{2,})\}/);
  if(tok) FAIL('Token', `${url} unausgefüllter Platzhalter ${tok[0]}`);
  if(/GTM-X|G-XXXX|G-XXXXX|WF3|TBD-P\d|TBD\b/.test(h)) FAIL('PlatzhalterID', `${url} enthält Platzhalter-ID`);
  if(/"item":"\/[a-z]/.test(h)) FAIL('SchemaRelURL', `${url} relative Schema-URL`);
  if(/&amp;amp;/.test(h)) FAIL('DoppelEntity', `${url} enthält &amp;amp; (Doppel-Escape)`);
  if(/&lt;\/?em&gt;/.test(h)) FAIL('EscapedEm', `${url} escaptes <em> als sichtbarer Text`);
  if(/491234567890/.test(h)) FAIL('WaPlatzhalter', `${url} enthält WhatsApp-Platzhalter 491234567890`);
  if(!/class="scta"/.test(h)) noScta++;
  if(!/class="menu-toggle"/.test(h) && !/data-pagetype="start"/.test(h)) noHamb++; // /start = bewusste Reel-Landing ohne Nav-Menue
  if(!/property="og:image"/.test(h)) noOg++;
  if(/srcset="\s*"/.test(h)) FAIL('LeeresSrcset', `${url} hat leeres srcset (Bild fehlt im Manifest)`);

  const vis = visibleText(h);
  const tm = vis.match(transRe);
  if(tm) FAIL('Translit', `${url} sichtbar "${tm[0]}"`);

  // Blocklist (Spec §3.7): "Christian Brehm" darf NIRGENDS im Output auftauchen (auch nicht in Schema/alt)
  if(BLOCK_NAME.test(h)) FAIL('Blocklist', `${url} enthält "Christian Brehm"`);
  // Blocklist im Review-Rendering: KEIN "Brehm" als Review-Autor (die Inhaber heißen legitim Brehm —
  // deshalb nur die Review-Container prüfen: Review-Wall-Karten, Zitat-Quellen, Review-Snippets)
  for(const re of [/<article class="rw-card[\s\S]*?<\/article>/g, /<p class="quote-src[\s\S]*?<\/p>/g, /<blockquote class="rw-snip-q[\s\S]*?<\/blockquote>/g]){
    for(const seg of h.matchAll(re)) if(/Brehm/i.test(seg[0])) FAIL('ReviewBlocklist', `${url} rendert "Brehm" in einem Review-Slot`);
  }
  // Verbotene Phrasen im Sichttext (Guardrails, gelockt)
  for(const [re,why] of FORBIDDEN){ const m=vis.match(re); if(m) FAIL('Phrase', `${url} sichtbar "${m[0]}" — ${why}`); }
  // og:image-Existenz (Spec §4/A7): jede referenzierte og-Datei muss im Output liegen
  const ogm = h.match(/property="og:image" content="([^"]+)"/);
  if(ogm){ const p = ogm[1].replace(DOMAIN,''); if(p.startsWith('/') && !fs.existsSync(path.join(ROOT, p))) FAIL('OgImageFile', `${url} og:image fehlt im Output: ${p}`); }
  // Provenance-Pflicht (Spec §3.6a): jeder gerenderte Manifest-Slug braucht einen Manifest-Eintrag mit source
  for(const slug of imgSlugsIn(h)){
    if(/-poster$/.test(slug)) continue; // Video-Poster laufen ausserhalb der <picture>-Pipeline (VIDEO_BADGE deckt Kennzeichnung)
    if(!IMGM[slug]) FAIL('ProvenanceSlug', `${url} rendert ${slug} ohne Manifest-Eintrag (source unbekannt)`);
  }
  // Analytics/Consent (Spec §3.8): mit echter GTM-ID muss GTM+Consent-Banner auf jeder Seite liegen,
  // mit Platzhalter darf NIRGENDS googletagmanager geladen werden. generate_lead nur auf Formular-Seiten.
  if(TRACK){
    if(!h.includes('googletagmanager.com/gtm.js')) FAIL('GTM', `${url} ohne GTM-Snippet trotz echter GTM-ID`);
    if(!h.includes('id="consent"')) FAIL('Consent', `${url} ohne Consent-Banner trotz aktivem Tracking`);
    if(!h.includes("ad_storage:'denied'")) FAIL('ConsentDefault', `${url} Consent-Default ist nicht deny`);
  } else if(h.includes('googletagmanager.com')) FAIL('GTMPlatzhalter', `${url} lädt GTM ohne echte ID`);
  if(h.includes('generate_lead') && !/<form\b/.test(h)) FAIL('LeadEvent', `${url} pusht generate_lead ohne Formular (Event darf nur an echten Submit gebunden sein)`);
  // KI-Bilder in Beweis-Slots (Spec §3.6b) = ROT
  for(const [slot,re] of PROOF_SLOT_RE){
    for(const seg of h.matchAll(re)){
      for(const slug of imgSlugsIn(seg[0])){
        if(KI_SLUGS.has(slug)){ kiInProof++; if(kiSamples.length<8) kiSamples.push(`${url} ${slot}:${slug}`); }
      }
    }
  }

  for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    try{ const j=JSON.parse(m[1]);
      const s=JSON.stringify(j);
      for(const idm of s.matchAll(/"@id":"([^"]+)"/g)){ if(!/^https?:\/\//.test(idm[1])) FAIL('SchemaAbsId', `${url} @id nicht absolut: ${idm[1]}`); }
    }catch(e){ FAIL('SchemaJSON', `${url} JSON-LD nicht parsebar: ${e.message}`); }
  }

  const can=(h.match(/<link rel="canonical" href="([^"]+)"/)||[])[1];
  const og=(h.match(/<meta property="og:url" content="([^"]+)"/)||[])[1];
  if(can&&og&&can!==og) FAIL('CanonOG', `${url} canonical≠og:url`);
  if(can && can!==`${DOMAIN}${url}`) WARN('CanonSelf', `${url} canonical=${can}`);

  // Near-Duplicate: lokale Orts-Hubs (Generator markiert via data-pagetype="ort").
  // Verglichen wird NUR <main> (Sichttext-Content) — Microbar/Header/Footer/Sticky sind site-weit
  // identisches Boilerplate und wuerden die Content-Aehnlichkeit kuenstlich aufblasen (P2-Chrome, 2026-07-06).
  if(/<body[^>]*data-pagetype="ort"/.test(h)){
    const mainM = h.match(/<main id="main">([\s\S]*?)<\/main>/);
    const bodyText = mainM ? visibleText(mainM[1]) : vis;
    const words = bodyText.toLowerCase().replace(/[^a-zäöüß ]/g,' ').split(/\s+/).filter(w=>w.length>2);
    const sh=new Set(); for(let i=0;i<words.length-2;i++) sh.add(words[i]+' '+words[i+1]+' '+words[i+2]);
    if(sh.size>5) (bodyByGroup['ort']=bodyByGroup['ort']||[]).push({url, sh});
  }
}

if(brokenLinks===0) OK('Broken-Link = 0'); else FAIL('BrokenLink', `${brokenLinks} kaputte interne Links, z.B. ${brokenSamples.slice(0,8).join(' | ')}`);
if(imgNoAlt===0) OK('alt auf allen <img>'); else FAIL('ImgAlt', `${imgNoAlt} <img> ohne alt`);
if(imgNoDim===0) OK('width+height auf allen <img>'); else FAIL('ImgDim', `${imgNoDim} <img> ohne width/height`);
if(noScta===0) OK('Sticky-Mobile-CTA (.scta) auf allen Seiten'); else FAIL('StickyCTA', `${noScta} Seiten ohne .scta`);
if(noHamb===0) OK('Mobile-Hamburger (.menu-toggle) auf allen Seiten'); else FAIL('Hamburger', `${noHamb} Seiten ohne .menu-toggle`);
if(noOg===0) OK('og:image auf allen Seiten'); else FAIL('OgImage', `${noOg} Seiten ohne og:image`);
// Kontakt-Wahrheit (Spec §3.5): mit Key echtes Web3Forms-Formular + Foto-Dropzone; ohne Key
// ehrlicher Hinweis (.kf-off) — und NIE ein Submit-Handler, der still zu WhatsApp umleitet.
{
  const kf = files.find(f=>urlOf(f)==='/kontakt/');
  const kh = kf ? fs.readFileSync(kf,'utf8') : '';
  if(!kf) FAIL('KontaktForm','/kontakt/ fehlt im Output');
  else if(FORM_OK){
    if(!/<form id="anfrage"[^>]*web3forms/.test(kh)) FAIL('KontaktForm','/kontakt/ ohne Web3Forms-Formular trotz echtem Key');
    else if(!/id="dz-input"[^>]*name="attachment"/.test(kh)) FAIL('KontaktDropzone','/kontakt/ Formular ohne Foto-Upload (attachment)');
    else OK('Kontakt-Formular mit Foto-Dropzone (Web3Forms)');
  } else {
    if(!kh.includes('kf-off')) FAIL('KontaktEhrlich','/kontakt/ ohne ehrlichen Kein-Key-Hinweis (.kf-off)');
    else OK('Kontakt ehrlich ohne Formular (kein Web3Forms-Key)');
  }
  // Stiller WhatsApp-Redirect beim Formular-Submit ist site-weit verboten (Befund A1)
  for(const f of files){ const x=fs.readFileSync(f,'utf8'); if(/addEventListener\('submit'[\s\S]{0,600}?wa\.me/.test(x)) FAIL('WaRedirect', `${urlOf(f)} leitet Formular-Submit still zu WhatsApp um`); }
}
// Datenschutz beschreibt NUR reale Dienste (Spec §3.8/§6.1)
{
  const dsF = files.find(f=>urlOf(f)==='/datenschutz/');
  if(dsF){
    const ds = fs.readFileSync(dsF,'utf8');
    if(FORM_OK !== ds.includes('Web3Forms')) FAIL('DatenschutzDienste', `/datenschutz/ ${FORM_OK?'beschreibt Web3Forms nicht':'beschreibt Web3Forms, obwohl kein Formular sendet'}`);
    else if(TRACK !== ds.includes('Google Analytics')) FAIL('DatenschutzDienste', `/datenschutz/ ${TRACK?'beschreibt GA4/GTM nicht':'beschreibt GA4/GTM, obwohl kein Tracking eingebunden ist'}`);
    else OK('Datenschutz deckungsgleich mit realen Diensten (Web3Forms/GA4 je nach Config)');
  }
}
if(kiInProof===0) OK('Beweis-Slots frei von KI-Bildern (Provenance §3.6)'); else FAIL('KiInBeweis', `${kiInProof} KI-Bilder in Beweis-Slots: ${kiSamples.join(' | ')}`);

const tvals=[...titles.values()]; const tdup=tvals.filter((v,i)=>tvals.indexOf(v)!==i);
if(tdup.length===0) OK('Titles unique'); else FAIL('TitleDup', `${[...new Set(tdup)].length} doppelte Titles, z.B. "${tdup[0]}"`);
const mvals=[...metas.values()]; const mdup=mvals.filter((v,i)=>mvals.indexOf(v)!==i);
if(mdup.length===0) OK('Metas unique'); else WARN('MetaDup', `${[...new Set(mdup)].length} doppelte Metas`);

function jac(a,b){ let inter=0; const small=a.size<b.size?a:b, big=a.size<b.size?b:a; for(const x of small) if(big.has(x)) inter++; return inter/(a.size+b.size-inter); }
let dupPairs=0; let maxSim=0; const dupSamples=[]; let comparedFamilies=0;
for(const g in bodyByGroup){ const arr=bodyByGroup[g]; if(arr.length<2) continue; comparedFamilies++;
  for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++){ const s=jac(arr[i].sh,arr[j].sh); if(s>maxSim) maxSim=s; if(s>0.40){ dupPairs++; if(dupSamples.length<6) dupSamples.push(`${arr[i].url}~${arr[j].url}=${(s*100).toFixed(0)}%`);} }
}
if(comparedFamilies===0) WARN('NearDup', 'keine Orts-Hub-Gruppe mit ≥2 Seiten im Output (Home/Basis-only Build?)');
else if(dupPairs===0) OK(`Near-Duplicate <40% (max ${(maxSim*100).toFixed(0)}% Ähnlichkeit, ${comparedFamilies} Gruppen)`);
else FAIL('NearDup', `${dupPairs} Orts-Hub-Paare ≥40% ähnlich (max ${(maxSim*100).toFixed(0)}%), z.B. ${dupSamples.join(' | ')}`);

// Sichttext-NearDup, sequenzielle Metrik (Spec §6.1): difflib-Skript aus Etappe C als hartes Gate.
// Ergänzt das 3-Gramm-Jaccard oben — beide müssen < 40 % bleiben. Ohne Python: WARN statt stiller Skip.
try {
  const out = execFileSync('python', ['scripts/check-neardup-sichttext.py'], { encoding: 'utf8' });
  const mx = out.match(/Max: ([\d.,]+%)/);
  OK(`Sichttext-NearDup difflib <40% (${mx ? 'max ' + mx[1] : 'ok'})`);
} catch (e) {
  if (e.status === 1 && e.stdout) FAIL('NearDupDifflib', `difflib-Gate rot:\n${String(e.stdout).split('\n').filter(l=>l.includes('✗')||l.startsWith('Max')).join(' | ')}`);
  else WARN('NearDupDifflib', `Python-Lauf nicht möglich (${e.message.split('\n')[0]}) — scripts/check-neardup-sichttext.py manuell laufen lassen`);
}

console.log(`\n=== GATES Blankstein (${files.length} Seiten) ===`);
console.log('GRÜN:'); ok.forEach(g=>console.log('  ✓ '+g));
if(warn.length){ console.log(`WARN (${warn.length}):`); warn.slice(0,25).forEach(w=>console.log('  ! '+w)); if(warn.length>25) console.log(`  … +${warn.length-25}`); }
if(hard.length){ console.log(`\nROT (${hard.length}):`); hard.slice(0,40).forEach(h=>console.log('  ✗ '+h)); if(hard.length>40) console.log(`  … +${hard.length-40}`); console.log('\nERGEBNIS: ROT'); process.exit(1); }
console.log('\nERGEBNIS: GRÜN (alle harten Gates bestanden)'); process.exit(0);
