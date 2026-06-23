// seo-drift Baseline — erfasst SEO-kritische Elemente der Tier-1-Seiten (Money-Seiten).
// Run:  node scripts/seo-drift-baseline.mjs            -> schreibt seo-drift-baseline.json
//       node scripts/seo-drift-baseline.mjs --check    -> vergleicht website/ gegen die Baseline (Exit 1 bei Regression)
// Zweck: Regressions-Schutz fuer die wichtigsten Seiten VOR dem DNS-Switch. Vor Go-Live einmal die Baseline schreiben,
//        danach bei jeder Aenderung --check laufen lassen (oder in den Build haengen) -> Drift wird sichtbar, bevor er live geht.
// Tier-1 = Home + alle gerenderten Money-Hubs + Orts-Hubs + /servicegebiet/ /preise/ /ratgeber/ + Ratgeber-Flagship.
// Dynamisch aus dem Daten-Layer: neue Hubs/Orte wachsen automatisch in die Baseline (kein Hardcode).
import fs from 'fs';

const J = f => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
const services = J('services.json').services;
const orte = J('locations.json').orte;

// Kandidaten in Prioritaets-Reihenfolge; nur tatsaechlich gebaute Seiten (website/.../index.html) kommen in die Baseline.
const CANDIDATES = [
  '/',
  ...services.map(s => `/${s.slug}/`),
  ...orte.map(o => `/${o.slug}/`),
  '/servicegebiet/', '/preise/', '/ratgeber/', '/ratgeber/pflastersteine-reinigen/',
];
const TIER1 = CANDIDATES.filter(u => fs.existsSync(`website${u}index.html`));

const grab = (h, re) => { const m = h.match(re); return m ? m[1].trim() : null; };
const stripTags = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function snapshot(url) {
  const f = `website${url}index.html`;
  if (!fs.existsSync(f)) return { error: 'fehlt' };
  const h = fs.readFileSync(f, 'utf8');
  let schemaTypes = [];
  const sm = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (sm) { try { schemaTypes = (JSON.parse(sm[1])['@graph'] || []).map(x => x['@type']).flat(); } catch {} }
  const title = grab(h, /<title>([^<]*)<\/title>/);
  const meta = grab(h, /<meta name="description" content="([^"]*)"/);
  return {
    title, title_len: (title || '').length,
    meta, meta_len: (meta || '').length,
    h1: stripTags(grab(h, /<h1[^>]*>([\s\S]*?)<\/h1>/)),
    h1_count: (h.match(/<h1\b/g) || []).length,
    h2_count: (h.match(/<h2\b/g) || []).length,
    canonical: grab(h, /<link rel="canonical" href="([^"]*)"/),
    og_image: grab(h, /<meta property="og:image" content="([^"]*)"/),
    noindex: /<meta name="robots" content="noindex/.test(h),
    schema_types: [...new Set(schemaTypes)].sort(),
    faq_count: (h.match(/<details><summary>/g) || []).length,
    internal_links: (h.match(/href="\/[^"]*"/g) || []).length,
    word_count: h.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length,
  };
}

const BASE = 'seo-drift-baseline.json';

// ---- WRITE ----
if (!process.argv.includes('--check')) {
  const baseline = {
    _meta: 'seo-drift Baseline (Money-Seiten). Erneut mit --check laufen -> Regressionserkennung vor DNS-Switch.',
    captured_at: 'lokal', pages: {},
  };
  for (const url of TIER1) baseline.pages[url] = snapshot(url);
  fs.writeFileSync(BASE, JSON.stringify(baseline, null, 2));
  console.log(`seo-drift Baseline geschrieben: ${TIER1.length} Tier-1-Seiten -> ${BASE}`);
  process.exit(0);
}

// ---- CHECK ----
if (!fs.existsSync(BASE)) { console.error(`seo-drift: keine Baseline (${BASE}) — erst ohne --check laufen.`); process.exit(1); }
const baseline = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const drift = []; const warn = [];
// Strukturelle Felder = harte Regression (Exit 1). title/meta/word_count-Aenderungen = Warnung (gewollte Edits sind normal).
const HARD = ['h1', 'h1_count', 'canonical', 'noindex'];
const SOFT = ['title', 'meta', 'title_len', 'meta_len', 'h2_count', 'faq_count', 'internal_links', 'word_count', 'og_image'];

for (const url of Object.keys(baseline.pages)) {
  const was = baseline.pages[url];
  const now = snapshot(url);
  if (now.error) { drift.push(`${url}: Seite FEHLT (war in Baseline)`); continue; }
  if (was.error) continue;
  for (const k of HARD) if (JSON.stringify(was[k]) !== JSON.stringify(now[k])) drift.push(`${url}.${k}: "${was[k]}" -> "${now[k]}"`);
  const wS = JSON.stringify(was.schema_types), nS = JSON.stringify(now.schema_types);
  if (wS !== nS) drift.push(`${url}.schema_types: ${wS} -> ${nS}`);
  for (const k of SOFT) if (JSON.stringify(was[k]) !== JSON.stringify(now[k])) warn.push(`${url}.${k}: ${JSON.stringify(was[k])} -> ${JSON.stringify(now[k])}`);
}

console.log(`\n=== seo-drift CHECK (${Object.keys(baseline.pages).length} Tier-1-Seiten) ===`);
if (warn.length) { console.log(`WARN (${warn.length}) — gewollte Edits sind ok:`); warn.slice(0, 30).forEach(w => console.log('  ! ' + w)); if (warn.length > 30) console.log(`  … +${warn.length - 30}`); }
if (drift.length) { console.log(`\nROT (${drift.length}) — strukturelle Regression:`); drift.forEach(d => console.log('  ✗ ' + d)); console.log('\nERGEBNIS: ROT'); process.exit(1); }
console.log('\nERGEBNIS: GRÜN (keine strukturelle Regression auf den Money-Seiten)'); process.exit(0);
