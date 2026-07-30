/* global URL, console */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const entryMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
if (!entryMatch) throw new Error('Unable to resolve the module entry from dist/index.html');
const entryName = basename(new URL(entryMatch[1], 'https://bundle.invalid/').pathname);
const assetsDir = new URL('assets/', dist);
const assets = readdirSync(assetsDir);
const asset = (pattern) => assets.find((name) => pattern.test(name));
const size = (name) => name ? statSync(new URL(`assets/${name}`, dist)).size : 0;
const entryBytes = size(entryName);
const gzipBytes = gzipSync(readFileSync(new URL(`assets/${entryName}`, dist))).byteLength;
const sw = readFileSync(new URL('sw.js', dist), 'utf8');
const precacheUrls = [...sw.matchAll(/url:\s*"([^"]+)"/g)].map((match) => match[1]);
const precacheBytes = precacheUrls.reduce((total, url) => {
  const relative = url.replace(/^\.\//, '');
  try { return total + statSync(new URL(relative, dist)).size; } catch { return total; }
}, 0);
const report = [
  ['main entry', entryName, entryBytes],
  ['main entry gzip', entryName, gzipBytes],
  ['legacy', asset(/^LegacyCircleRoutes-.*\.js$/), size(asset(/^LegacyCircleRoutes-.*\.js$/))],
  ['Wrapped', asset(/^WrappedPage-.*\.js$/), size(asset(/^WrappedPage-.*\.js$/))],
  ['Mobile Pulse', asset(/^MobilePulsePage-.*\.js$/), size(asset(/^MobilePulsePage-.*\.js$/))],
  ['MapLibre', asset(/^maplibre-gl-.*\.js$/), size(asset(/^maplibre-gl-.*\.js$/))],
  ['PWA precache', `${precacheUrls.length} files`, precacheBytes],
];
for (const [label, name, bytes] of report) console.log(`[bundle] ${label}: ${name} — ${(bytes / 1000).toFixed(2)} kB`);
const failures = [];
if (entryBytes >= 360_000) failures.push(`main entry ${entryBytes} bytes exceeds 360000`);
if (gzipBytes >= 120_000) failures.push(`main gzip ${gzipBytes} bytes exceeds 120000`);
if (failures.length) throw new Error(`Bundle budget failed: ${failures.join('; ')}`);
