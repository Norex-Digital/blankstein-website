// Pre-Build-Daten-Gate (Blankstein). Run: node scripts/validate-data.mjs
// Prüft data/*.json + data/copy/*.json VOR dem Render. Exit 1 bei hartem Fehler; WARN bricht nicht ab.
// Fork von havelland-website/scripts/validate-data.mjs — Blankstein: nur B2C, eigene Archetypen (heimat/premium).
import fs from 'fs';

const hard = [], warn = [];
const FAIL = m => hard.push(m), WARN = m => warn.push(m);
const J = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { FAIL(`${f}: JSON ungültig — ${e.message}`); return null; } };
// Optional-Loader: data/copy/* entsteht erst in der Copy-Phase. Fehlt die Datei -> null (kein Fehler); kaputtes JSON -> FAIL.
const Jopt = f => { if (!fs.existsSync(f)) return null; try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { FAIL(`${f}: JSON ungültig — ${e.message}`); return null; } };
const ASCII = /^[a-z0-9-]+$/;
const isPH = v => v == null || /\b(TBD|XXXX|G-XXXX|GTM-X|null)\b/i.test(String(v));
const SEG = new Set(['B2C', 'B2B', 'Ferien']);
const ARCHETYPES = ['heimat', 'premium']; // Blankstein: Falkensee-Kern + Premium-Berlin-Rand

const config = J('data/config.json'), nap = J('data/nap.json'), proof = J('data/proof.json');
const svc = J('data/services.json'), loc = J('data/locations.json');
const hubs = Jopt('data/copy/hubs.json'), arch = Jopt('data/copy/archetypes.json'), rat = Jopt('data/copy/ratgeber.json'), orteCp = Jopt('data/copy/orte.json');

// --- config ---
if (config) {
  if (!config.domain || !/^https:\/\//.test(config.domain)) FAIL('config.domain fehlt/kein https');
  for (const k of ['ga4_id', 'gtm_id', 'web3forms_key']) if (isPH(config[k])) WARN(`config.${k} ist Platzhalter (Mensch-Blocker, Build ok)`);
  if (!config.preise || config.preise.satz_basis == null || config.preise.satz_impraegnierung == null) FAIL('config.preise.satz_basis/satz_impraegnierung fehlt (Rechner braucht beide)');
}
// --- nap (build-kritisch) ---
if (nap) {
  for (const k of ['name', 'street', 'zip', 'city', 'phone_e164', 'phone_display']) if (isPH(nap[k])) FAIL(`nap.${k} fehlt/Platzhalter (build-kritisch)`);
  if (nap.zip && !/^\d{5}$/.test(nap.zip)) FAIL(`nap.zip kein 5-stelliger PLZ: ${nap.zip}`);
  if (isPH(nap.rechtstraeger)) WARN('nap.rechtstraeger fehlt (Impressum nutzt Fallback name)');
  for (const k of ['email']) if (nap[k] == null) WARN(`nap.${k}=null (konditional weggelassen — Mensch ergänzt)`);
  if (nap.openingHours == null) WARN('nap.openingHours=null (kein OpeningHours-Schema — Service-Area-Business)');
  if (!nap.geo || nap.geo.lat == null) WARN('nap.geo=null (Geo-Schema weggelassen — Mensch ergänzt)');
}
// --- services ---
const svcSlugs = new Set();
if (svc && svc.services) {
  for (const s of svc.services) {
    if (!s.slug || !ASCII.test(s.slug)) FAIL(`service slug nicht ASCII: ${JSON.stringify(s.slug)}`);
    if (svcSlugs.has(s.slug)) FAIL(`service slug doppelt: ${s.slug}`); svcSlugs.add(s.slug);
    if (!s.name) FAIL(`service ${s.slug}: name fehlt`);
    if (!Array.isArray(s.segment) || !s.segment.length) FAIL(`service ${s.slug}: segment fehlt/leer`);
    else for (const seg of s.segment) if (!SEG.has(seg)) FAIL(`service ${s.slug}: unbekanntes segment "${seg}"`);
  }
} else FAIL('services.json: services[] fehlt');
// --- locations ---
const locSlugs = new Set();
if (loc && loc.orte) {
  for (const o of loc.orte) {
    if (!o.slug || !ASCII.test(o.slug)) FAIL(`ort slug nicht ASCII: ${JSON.stringify(o.slug)}`);
    if (locSlugs.has(o.slug)) FAIL(`ort slug doppelt: ${o.slug}`); locSlugs.add(o.slug);
    if (!o.name) FAIL(`ort ${o.slug}: name fehlt`);
    if (!o.plz || !/^\d{5}$/.test(o.plz)) FAIL(`ort ${o.slug}: PLZ ungültig (${o.plz})`);
    if (!['A', 'B', 'LT'].includes(o.geo)) FAIL(`ort ${o.slug}: geo ∉ {A,B,LT} (${o.geo})`);
    if (!Array.isArray(o.typ) || !o.typ.length) FAIL(`ort ${o.slug}: typ fehlt/leer`);
    else for (const t of o.typ) if (!SEG.has(t)) FAIL(`ort ${o.slug}: unbekannter typ "${t}"`);
    if (/\b(doeberitz|schoenwalde|gross |grossglienicke)\b/i.test(o.name)) WARN(`ort ${o.slug}: name evtl. ASCII-transliteriert: "${o.name}"`);
  }
} else FAIL('locations.json: orte[] fehlt');
// --- Copy-Drift (greift erst wenn Copy-Dateien existieren) ---
const arr = x => Array.isArray(x) ? x : (x ? (x.hubs || x.archetypes || x.ratgeber || []) : []);
if (hubs) for (const h of arr(hubs)) if (!svcSlugs.has(h.slug)) FAIL(`copy/hubs: Slug "${h.slug}" nicht in services`);
if (rat) for (const r of arr(rat)) if (r.cta_service && !svcSlugs.has(r.cta_service)) FAIL(`copy/ratgeber ${r.slug}: cta_service "${r.cta_service}" nicht in services`);
if (orteCp && orteCp.orte) for (const k of Object.keys(orteCp.orte)) if (!locSlugs.has(k)) FAIL(`copy/orte: Slug "${k}" nicht in locations`);
if (arch) { const keys = arr(arch).map(a => a.key); for (const need of ARCHETYPES) if (!keys.includes(need)) WARN(`copy/archetypes: Archetyp "${need}" fehlt`); }
// --- Translit in sichtbarer Copy (WARN) ---
const tre = /\b(fuer|ueber|grundstuck\w*|hauser|mussen|straucher|grunbelag|fruhjahr|naturlich|naturstein\b.*?fuer|personlich|zuverlassig|regelmassig|gebaude|impragnierung|flache|flachenreiniger|fugensand\b.*?fuer)\b/i;
for (const [name, data] of [['hubs', hubs], ['archetypes', arch], ['ratgeber', rat]]) {
  if (data) { const m = JSON.stringify(data, (k, v) => k === '_meta' ? undefined : v).match(tre); if (m) WARN(`copy/${name}: mögliche ASCII-Transliteration "${m[0]}"`); }
}

// --- Report ---
console.log(`\n=== validate-data (Blankstein · ${svcSlugs.size} Services · ${locSlugs.size} Orte) ===`);
if (warn.length) { console.log(`WARN (${warn.length}):`); warn.forEach(w => console.log('  ! ' + w)); }
if (hard.length) { console.log(`\nROT (${hard.length}):`); hard.forEach(h => console.log('  ✗ ' + h)); console.log('\nERGEBNIS: ROT — Build blockiert'); process.exit(1); }
console.log('\nERGEBNIS: GRÜN (Daten valide, Build freigegeben)');
