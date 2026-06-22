#!/usr/bin/env node
// fetch-reviews.mjs — zieht Google-Reviews per Places API (New) -> data/reviews.json.
// DSGVO: laeuft NUR zur Build-Zeit (Server), die Live-Seite macht keinen externen Call. Avatare werden NICHT
// uebernommen (nur Name + Sterne + Text), damit kein Google-CDN-Request im Browser entsteht.
//
// AKTIVIEREN:
//  (1) Place-ID des GBP "Blankstein Steinreinigung & Terrassenpflege" holen (Google Place-ID-Finder)
//      und in data/reviews.json -> "place_id" eintragen (oder als PLACE_ID env uebergeben).
//  (2) Google Cloud: Places API (New) aktivieren, API-Key erzeugen (auf Places API einschraenken),
//      Billing-Account hinterlegen (Pflicht, kostet im Free-Tier 0 EUR). Key als GOOGLE_PLACES_KEY
//      setzen — auf Vercel: Project Settings > Environment Variables; lokal: export GOOGLE_PLACES_KEY=...
//  (3) VOR generate.mjs laufen lassen, z.B. package.json build: "node scripts/fetch-reviews.mjs && node scripts/generate.mjs".
//  (4) Auto-Refresh: Vercel-Cron / Build-Hook 1x/Tag pingen -> Rebuild zieht frische Reviews.
//
// OHNE Key/place_id: no-op — die von Hand gepflegte data/reviews.json bleibt unveraendert.
// HAKEN: Places API liefert max ~5 Reviews (Google-kuratiert). Ab >5 echten Reviews auf die
//        Google-Business-Profile-API umsteigen (alle eigenen Reviews, aber OAuth + 2-4 Wochen Freischaltung).
import fs from 'fs';

const FILE = 'data/reviews.json';
const KEY = process.env.GOOGLE_PLACES_KEY;
const cur = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
const PLACE = process.env.PLACE_ID || cur.place_id;

if (!KEY || !PLACE) {
  console.log('[reviews] kein GOOGLE_PLACES_KEY/place_id gesetzt -> manuelle reviews.json bleibt (no-op).');
  process.exit(0);
}

try {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE)}?languageCode=de`;
  const res = await fetch(url, {
    headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  const reviews = (d.reviews || []).map(r => ({
    author: (r.authorAttribution && r.authorAttribution.displayName) || 'Google-Nutzer',
    ort: '',
    rating: r.rating,
    text: (r.text && r.text.text) || (r.originalText && r.originalText.text) || '',
    date: (r.publishTime || '').slice(0, 10),
    relative: r.relativePublishTimeDescription || ''
  })).filter(r => r.text && r.rating);
  const out = {
    ...cur, source: 'places-api', place_id: PLACE,
    profile_url: d.googleMapsUri || cur.profile_url || null,
    rating: d.rating ?? null, count: d.userRatingCount ?? reviews.length, reviews
  };
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2));
  console.log(`[reviews] ${reviews.length} Reviews gezogen (rating ${out.rating}, count ${out.count}) -> ${FILE}`);
} catch (e) {
  console.warn(`[reviews] Fetch fehlgeschlagen, behalte bestehende reviews.json: ${e.message}`);
  process.exit(0); // Fallback: alte reviews.json bleibt, Build bricht NICHT ab
}
