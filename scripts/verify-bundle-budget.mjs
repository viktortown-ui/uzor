/* global URL, console */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const entryMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
if (!entryMatch) throw new Error('Unable to resolve the module entry from dist/index.html');
const entryName = basename(new URL(entryMatch[1], 'https://bundle.invalid/').pathname);
const assets = readdirSync(new URL('assets/', dist));
const requireAsset = (label, pattern) => {
  const matches = assets.filter((name) => pattern.test(name));
  if (matches.length !== 1) throw new Error(`Expected exactly one ${label} asset, found ${matches.length}: ${matches.join(', ') || 'none'}`);
  return matches[0];
};
const bytes = (name) => readFileSync(new URL(`assets/${name}`, dist));
const measurement = (label, name) => {
  const content = bytes(name);
  return { label, name, raw: content.byteLength, gzip: gzipSync(content).byteLength };
};
const entry = measurement('main entry', entryName);
const legacyJs = measurement('LegacyCircleRoutes JS', requireAsset('LegacyCircleRoutes JS', /^LegacyCircleRoutes-.*\.js$/));
const legacyCss = measurement('legacy CSS', requireAsset('legacy CSS', /^LegacyCircleRoutes-.*\.css$/));
const motion = measurement('use-reduced-motion JS', requireAsset('use-reduced-motion JS', /^use-reduced-motion-.*\.js$/));
const wrapped = measurement('Wrapped JS', requireAsset('Wrapped JS', /^WrappedPage-.*\.js$/));
const mobilePulse = measurement('Mobile Pulse JS', requireAsset('Mobile Pulse JS', /^MobilePulsePage-.*\.js$/));
const maplibre = measurement('MapLibre JS', requireAsset('MapLibre JS', /^maplibre-gl-.*\.js$/));
const sw = readFileSync(new URL('sw.js', dist), 'utf8');
const precacheUrls = [...sw.matchAll(/url:\s*"([^"]+)"/g)].map((match) => match[1]);
if (!precacheUrls.length) throw new Error('No Workbox precache entries found in dist/sw.js');
const precacheBytes = precacheUrls.reduce((total, url) => {
  const relative = url.replace(/^\.\//, '');
  const file = new URL(relative, dist);
  try { return total + statSync(file).size; }
  catch { throw new Error(`Precache asset is missing from dist: ${relative}`); }
}, 0);
for (const item of [entry, legacyJs, legacyCss, motion, wrapped, mobilePulse, maplibre]) {
  console.log(`[bundle] ${item.label}: ${item.name} — ${(item.raw / 1000).toFixed(2)} kB raw / ${(item.gzip / 1000).toFixed(2)} kB gzip`);
}
const coldLegacyRaw = legacyJs.raw + legacyCss.raw + motion.raw;
const coldLegacyGzip = legacyJs.gzip + legacyCss.gzip + motion.gzip;
console.log(`[bundle] total cold legacy route: ${(coldLegacyRaw / 1000).toFixed(2)} kB raw / ${(coldLegacyGzip / 1000).toFixed(2)} kB gzip`);
console.log(`[bundle] PWA precache: ${precacheUrls.length} files — ${(precacheBytes / 1000).toFixed(2)} kB`);
const failures = [];
if (entry.raw >= 360_000) failures.push(`main entry ${entry.raw} bytes exceeds 360000`);
if (entry.gzip >= 120_000) failures.push(`main gzip ${entry.gzip} bytes exceeds 120000`);
if (failures.length) throw new Error(`Bundle budget failed: ${failures.join('; ')}`);
