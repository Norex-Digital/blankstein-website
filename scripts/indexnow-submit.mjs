// IndexNow-Submit (Bing/Yandex). Run nach dem Build: node scripts/indexnow-submit.mjs  (--dry = nicht senden)
// Löst den Sitemap-Index auf, sammelt alle <loc>-URLs der Sub-Sitemaps und meldet sie gebündelt an IndexNow.
// Wirkt nur auf Bing/Yandex — für Google bleiben Sitemap + GSC der Hebel. Key + Domain kommen aus data/config.json.
import fs from 'fs';

const cfg = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
const KEY = cfg.indexnow_key;
const DOMAIN = cfg.domain.replace(/\/$/, '');
const HOST = DOMAIN.replace(/^https?:\/\//, '');
const DRY = process.argv.includes('--dry');

if (!KEY || /\b(TBD|XXXX|null)\b/i.test(KEY)) { console.error('IndexNow: kein gültiger indexnow_key in config.json — abgebrochen.'); process.exit(1); }

// Key-Verifikationsdatei ins website/-Root legen, falls sie fehlt (der Generator schreibt sie normalerweise mit)
const keyFile = `website/${KEY}.txt`;
if (!fs.existsSync(keyFile)) { fs.writeFileSync(keyFile, KEY); console.log(`Key-Datei angelegt: ${keyFile}`); }

const locs = (file) => { const p = `website/${file}`; return fs.existsSync(p) ? [...fs.readFileSync(p, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]) : []; };

// sitemap.xml ist ein Index — erst die Sub-Sitemaps auflösen, dann deren URLs sammeln.
// Nur indexierbare Seiten stehen in den Sitemaps → Wellen-Gate-konform. Bewusst nicht hart
// verdrahtet: eine neue Sub-Sitemap darf nicht stillschweigend aus dem Submit fallen.
const subs = locs('sitemap.xml').map(u => u.split('/').pop()).filter(f => f.endsWith('.xml'));
const urls = [...new Set(subs.flatMap(locs))];

if (!urls.length) { console.log('IndexNow: keine URLs in den Sitemaps — nichts zu senden.'); process.exit(0); }

const body = { host: HOST, key: KEY, keyLocation: `${DOMAIN}/${KEY}.txt`, urlList: urls };
if (DRY) { console.log(`IndexNow (dry): ${urls.length} URLs aus ${subs.length} Sub-Sitemaps bereit für ${HOST}.`); process.exit(0); }

const res = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
console.log(`IndexNow: ${urls.length} URLs gesendet an api.indexnow.org → HTTP ${res.status} ${res.statusText}`);
process.exit(res.ok || res.status === 202 ? 0 : 1);
