/**
 * Fetches all stations, sites, webcams, soundings, and landings from the
 * Zephyr API and generates a sitemap.xml in public/.
 *
 * Usage:  node scripts/generate-sitemap.mjs
 *     or: npm run sitemap-update
 *
 * Reads VITE_API_PREFIX from .env (or falls back to production API).
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Read API prefix from .env file (simple parser, no dependency needed)
// ---------------------------------------------------------------------------
function loadApiPrefix() {
  try {
    const envPath = resolve(ROOT, '.env');
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/^VITE_API_PREFIX\s*=\s*['"]?(.+?)['"]?\s*$/m);
    if (match) return match[1];
  } catch {
    // .env may not exist
  }
  return 'https://api.zephyrapp.nz';
}

const API = loadApiPrefix();
const SITE_URL = 'https://www.zephyrapp.nz';

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function fetchJson(path) {
  const url = `${API}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ⚠  ${url} returned ${res.status}`);
    return [];
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Build sitemap XML
// ---------------------------------------------------------------------------
function urlEntry(loc, changefreq = 'daily', priority = '0.5') {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n');
}

async function main() {
  console.log(`Fetching data from ${API} …\n`);

  const [stations, sites, webcams, soundings, landings] = await Promise.all([
    fetchJson('/stations'),
    fetchJson('/sites'),
    fetchJson('/cams'),
    fetchJson('/soundings'),
    fetchJson('/landings')
  ]);

  console.log(`  Stations:  ${stations.length}`);
  console.log(`  Sites:     ${sites.length}`);
  console.log(`  Webcams:   ${webcams.length}`);
  console.log(`  Soundings: ${soundings.length}`);
  console.log(`  Landings:  ${landings.length}`);

  const entries = [];

  // Static pages
  entries.push(urlEntry(`${SITE_URL}/`, 'always', '1.0'));

  // Stations (live data changes constantly)
  for (const s of stations) {
    entries.push(urlEntry(`${SITE_URL}/stations/${s._id}`, 'always', '0.8'));
  }

  // Sites
  for (const s of sites) {
    entries.push(urlEntry(`${SITE_URL}/sites/${s._id}`, 'weekly', '0.7'));
  }

  // Webcams
  for (const w of webcams) {
    entries.push(urlEntry(`${SITE_URL}/webcams/${w._id}`, 'always', '0.6'));
  }

  // Soundings
  for (const s of soundings) {
    entries.push(urlEntry(`${SITE_URL}/soundings/${s._id}`, 'daily', '0.5'));
  }

  // Landings
  for (const l of landings) {
    entries.push(urlEntry(`${SITE_URL}/landings/${l._id}`, 'weekly', '0.5'));
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    ''
  ].join('\n');

  const outPath = resolve(ROOT, 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');

  const totalUrls = entries.length;
  console.log(`\n✓ Wrote ${totalUrls} URLs to ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to generate sitemap:', err);
  process.exit(1);
});
