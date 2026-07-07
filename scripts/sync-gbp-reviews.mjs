// sync-gbp-reviews.mjs — synct echte Google-Business-Profile-Reviews nach data/reviews.json (Spec §3.7).
// Run: node scripts/sync-gbp-reviews.mjs
//
// TOKEN-PFAD (wie gbp-MCP): env GBP_TOKEN_PATH, sonst ~/.norex-ct/sessions/gbp-token.json.
// Der Token liegt aktuell NUR auf dem Mac (Maurice-To-Do) — ohne Token ist dieser Lauf ein
// bewusster NO-OP mit klarer Meldung und Exit 0 (Build-Pipelines brechen nicht).
//
// ABLAUF: (1) Token-Datei lesen, bei Bedarf via refresh_token gegen oauth2.googleapis.com/token
// refreshen (Scope https://www.googleapis.com/auth/business.manage), (2) Account + Location
// discovern (Account Management v1 + Business Information v1), (3) Reviews via My-Business v4
// accounts/{a}/locations/{l}/reviews (paginierend) ziehen — Reviews existieren NUR in v4,
// (4) idempotent nach data/reviews.json schreiben: gleiche Daten => byte-identische Datei,
// _meta/place_id/cid/profile_url/blocklist bleiben erhalten.
//
// BLOCKLIST (Spec §3.7, doppelt gesichert — hier UND im Generator): Autoren, deren Name einen
// Blocklist-Eintrag enthaelt ("Brehm" — Verwandtschaft), werden NIE in reviews[] geschrieben;
// sie zaehlen aber im Google-Aggregat (count/rating bleiben die echten Google-Zahlen).
//
// UWG/Google-Policy: nur echte Reviews, Anzeige-Zahlen exakt wie Google sie liefert
// (averageRating/totalReviewCount aus der API) — nichts runden, nichts filtern ausser Blocklist.
import fs from 'fs';
import os from 'os';
import path from 'path';

const TOKEN_PATH = process.env.GBP_TOKEN_PATH || path.join(os.homedir(), '.norex-ct', 'sessions', 'gbp-token.json');
const OUT = 'data/reviews.json';
const BLOCK = ['Brehm']; // Nachname reicht — "Christian Brehm" u. ä. werden nie geschrieben

if (!fs.existsSync(TOKEN_PATH)) {
  console.log(`NO-OP: kein GBP-Token unter ${TOKEN_PATH}`);
  console.log('Der OAuth-Token liegt nur auf dem Mac (~/.norex-ct/sessions/gbp-token.json, wie gbp-MCP).');
  console.log('data/reviews.json bleibt auf dem manuell inventarisierten Fallback-Stand — kein Fehler.');
  process.exit(0);
}

const tokenFile = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
// Token-Datei defensiv lesen (gbp-MCP-Format bzw. Google-OAuth-Standardfelder)
// tokenFile.token ist bei diesem Format der access_token-STRING (nicht verschachtelt);
// refresh_token/client_id/client_secret/token_uri liegen auf Top-Level (wie gbp-MCP).
const tk = (tokenFile.token && typeof tokenFile.token === 'object') ? tokenFile.token : tokenFile;
let accessToken = (typeof tokenFile.token === 'string' ? tokenFile.token : null) || tk.access_token || tk.accessToken || null;
const refreshToken = tokenFile.refresh_token || tk.refresh_token || tk.refreshToken;
const clientId = tokenFile.client_id || tk.client_id || tk.clientId;
const clientSecret = tokenFile.client_secret || tk.client_secret || tk.clientSecret;
const tokenUri = tokenFile.token_uri || tk.token_uri || 'https://oauth2.googleapis.com/token';
const expiry = Date.parse(tk.expiry || tk.expiry_date || tokenFile.expiry || 0) || 0;

async function refresh() {
  if (!refreshToken || !clientId || !clientSecret) throw new Error('Token abgelaufen und kein refresh_token/client_id/client_secret in der Token-Datei');
  const r = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret })
  });
  if (!r.ok) throw new Error(`Token-Refresh fehlgeschlagen: HTTP ${r.status} ${await r.text()}`);
  const j = await r.json();
  accessToken = j.access_token;
  // refreshten Token zurueckschreiben (naechster Lauf spart den Roundtrip); Struktur erhalten
  try {
    if (typeof tokenFile.token === 'string') tokenFile.token = j.access_token; else tk.access_token = j.access_token;
    tokenFile.expiry = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString();
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenFile, null, 2));
  } catch { /* Token-Datei read-only? egal — Sync läuft mit frischem Token weiter */ }
}

async function api(url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (r.status === 401 && refreshToken) { await refresh(); return api(url); }
  if (!r.ok) throw new Error(`GBP-API ${url} -> HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

const STARS = { STAR_RATING_UNSPECIFIED: null, ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

async function main() {
  if (!accessToken || (expiry && expiry < Date.now() + 60000)) await refresh();

  // 1) Account
  const acc = await api('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
  const account = (acc.accounts || [])[0];
  if (!account) throw new Error('Kein GBP-Account für diesen Token sichtbar');

  // 2) Location (Business Information v1 — v4-Location-Listing ist abgeschaltet)
  const locs = await api(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`);
  const location = (locs.locations || [])[0];
  if (!location) throw new Error(`Keine Location unter ${account.name}`);
  const locId = location.name.split('/').pop();          // locations/{id} -> {id}
  const accId = account.name.split('/').pop();           // accounts/{id} -> {id}

  // 3) Reviews (My Business v4 — einziger Reviews-Endpoint), paginierend
  let pageToken = '', all = [], aggregate = { averageRating: null, totalReviewCount: 0 };
  do {
    const j = await api(`https://mybusiness.googleapis.com/v4/accounts/${accId}/locations/${locId}/reviews?pageSize=50${pageToken ? `&pageToken=${pageToken}` : ''}`);
    all = all.concat(j.reviews || []);
    if (j.averageRating != null) aggregate.averageRating = j.averageRating;
    if (j.totalReviewCount != null) aggregate.totalReviewCount = j.totalReviewCount;
    pageToken = j.nextPageToken || '';
  } while (pageToken);

  const blocked = n => BLOCK.some(b => (n || '').toLowerCase().includes(b.toLowerCase()));
  // Google wrappt fremdsprachige Kommentare als "(Translated by Google) <EN>\n\n(Original)\n<DE>".
  // Wir wollen das deutsche Original — also den Teil NACH "(Original)"; sonst den Kommentar roh.
  const cleanComment = c => {
    if (!c) return '';
    const m = c.match(/\(Original\)\s*([\s\S]*)$/i);
    return (m ? m[1] : c.replace(/^\s*\(Translated by Google\)\s*/i, '')).trim();
  };
  const reviews = all
    .filter(r => !blocked(r.reviewer && r.reviewer.displayName))
    .map(r => ({
      author: (r.reviewer && r.reviewer.displayName) || 'Google-Nutzer',
      rating: STARS[r.starRating] ?? null,
      text: cleanComment(r.comment),
      date: (r.createTime || '').slice(0, 10),
      review_id: r.reviewId || (r.name || '').split('/').pop()
    }))
    .filter(r => r.rating); // Reviews ohne Sterne gibt es nicht — Schutz vor API-Sonderfaellen

  // 4) idempotent schreiben: bestehende Meta-Felder erhalten, nur Daten-Felder ersetzen
  const cur = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const next = {
    ...cur,
    source: 'gbp-api',
    rating: aggregate.averageRating ?? cur.rating,
    count: aggregate.totalReviewCount || cur.count,
    verified: `gbp-api ${new Date().toISOString().slice(0, 10)}`,
    blocklist: Array.from(new Set([...(cur.blocklist || []), 'Christian Brehm'])),
    reviews
  };
  const out = JSON.stringify(next, null, 2) + '\n';
  if (fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === out) {
    console.log(`Unverändert: ${OUT} ist bereits auf API-Stand (${reviews.length} Reviews, Aggregat ${next.rating} · ${next.count})`);
    return;
  }
  fs.writeFileSync(OUT, out);
  console.log(`Geschrieben: ${OUT} — ${reviews.length} Reviews (nach Blocklist), Aggregat ${next.rating} · ${next.count}`);
  console.log('Danach: node scripts/generate.mjs && python scripts/build-og-images.py && node scripts/gates.mjs');
}

main().catch(e => { console.error(`FEHLER: ${e.message}`); process.exit(1); });
